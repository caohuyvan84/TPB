package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/tpb/goacd/internal/agent"
	"github.com/tpb/goacd/internal/api"
	"github.com/tpb/goacd/internal/call"
	"github.com/tpb/goacd/internal/config"
	"github.com/tpb/goacd/internal/esl"
	"github.com/tpb/goacd/internal/event"
	"github.com/tpb/goacd/internal/ivr"
	"github.com/tpb/goacd/internal/queue"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	slog.SetDefault(logger)

	cfg := config.Load()
	logger.Info("GoACD starting", "instance", cfg.InstanceID)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// ── Redis ─────────────────────────────────────────
	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		logger.Error("Invalid Redis URL", "err", err)
		os.Exit(1)
	}
	rdb := redis.NewClient(opt)
	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Warn("Redis not available — running without state persistence", "err", err)
	} else {
		logger.Info("Redis connected")
	}

	// ── Core services ─────────────────────────────────
	agentState := agent.NewStateManager(rdb, logger)
	queueMgr := queue.NewManager(rdb, logger)
	sessions := call.NewSessionStore()
	publisher := event.NewPublisher(cfg.KafkaBrokers, logger)
	defer publisher.Close()

	// ── ESL inbound clients (persistent connections to FreeSWITCH) ──
	var eslClients []*esl.InboundClient
	for _, host := range cfg.FSESLHosts {
		client := esl.NewInboundClient(host, cfg.FSESLPassword, logger)
		go client.ConnectWithRetry(ctx)
		eslClients = append(eslClients, client)
	}

	// ── IVR config ────────────────────────────────────
	ivrConfig := &ivr.SimpleIVR{
		WelcomeFile: "ivr/ivr-welcome_to_company.wav",
		MenuFile:    "ivr/ivr-generic_greeting.wav",
		InvalidFile: "ivr/ivr-that_was_an_invalid_entry.wav",
		Options: []ivr.MenuOption{
			{Digit: "1", Queue: "sales", Label: "Sales"},
			{Digit: "2", Queue: "support", Label: "Technical Support"},
			{Digit: "3", Queue: "billing", Label: "Billing"},
		},
		DefaultQueue: "general",
		Logger:       logger,
	}

	// ── ESL outbound server (FreeSWITCH → GoACD per-call) ──
	eslAddr := fmt.Sprintf("0.0.0.0:%d", cfg.ESLListenPort)
	eslServer := esl.NewOutboundServer(eslAddr, func(callCtx context.Context, conn *esl.OutboundConn) {
		handleInboundCall(callCtx, conn, ivrConfig, agentState, queueMgr, sessions, publisher, cfg, logger)
	}, logger)

	go func() {
		if err := eslServer.Start(ctx); err != nil {
			logger.Error("ESL outbound server failed", "err", err)
		}
	}()

	// ── REST server (health + monitoring) ─────────────
	restServer := api.NewRESTServer(cfg.RESTPort, sessions, logger)
	go func() {
		if err := restServer.Start(); err != nil {
			logger.Error("REST server failed", "err", err)
		}
	}()

	// ── gRPC/HTTP server (CTI Adapter integration) ────
	grpcServer := api.NewGRPCServer(cfg.GRPCPort, agentState, sessions, eslClients, cfg.SIPDomain, logger)
	go func() {
		if err := grpcServer.Start(); err != nil {
			logger.Error("gRPC server failed", "err", err)
		}
	}()

	logger.Info("GoACD fully started",
		"eslOutbound", eslAddr,
		"rest", fmt.Sprintf(":%d", cfg.RESTPort),
		"grpc", fmt.Sprintf(":%d", cfg.GRPCPort),
	)

	// ── Wait for shutdown signal ──────────────────────
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	logger.Info("Shutdown signal received")
	cancel()

	// Wait for ESL connections to drain
	eslServer.Wait()

	// Close ESL inbound clients
	for _, c := range eslClients {
		c.Close()
	}

	rdb.Close()
	logger.Info("GoACD stopped")
}

// handleInboundCall is the per-call handler for outbound ESL connections.
func handleInboundCall(
	ctx context.Context,
	conn *esl.OutboundConn,
	ivrCfg *ivr.SimpleIVR,
	agentState *agent.StateManager,
	queueMgr *queue.Manager,
	sessions *call.SessionStore,
	publisher *event.Publisher,
	cfg *config.Config,
	logger *slog.Logger,
) {
	sess := &call.Session{
		UUID:         conn.ChannelUUID(),
		CallerNumber: conn.CallerNumber(),
		CallerName:   conn.CallerName(),
		DestNumber:   conn.DestNumber(),
		State:        "ivr",
		StartedAt:    time.Now(),
	}
	sessions.Add(sess)
	defer func() {
		now := time.Now()
		sess.EndedAt = &now
		sess.State = "ended"

		// Generate and publish CDR
		cdr := call.BuildCDR(sess)
		publisher.Publish(ctx, cfg.KafkaBrokers, "cdr.created", cdr, sess.UUID)

		sessions.Remove(sess.UUID)
		logger.Info("Call ended", "uuid", sess.UUID, "duration", now.Sub(sess.StartedAt))
	}()

	// Phase 1: IVR
	selectedQueue, err := ivrCfg.Run(ctx, conn)
	if err != nil {
		logger.Error("IVR failed", "uuid", sess.UUID, "err", err)
		conn.Hangup("NORMAL_TEMPORARY_FAILURE")
		return
	}

	sess.Queue = selectedQueue
	sess.IVRSelection = selectedQueue
	sess.State = "queued"

	// Phase 2: Queue + find agent
	queueMgr.Enqueue(ctx, selectedQueue, sess.UUID, 0)

	// Play MOH while waiting
	go conn.Playback("local_stream://moh")

	// Try to find an available agent (poll every 2s, max 60s)
	var assignedAgent string
	for i := 0; i < 30; i++ {
		select {
		case <-ctx.Done():
			return
		case <-time.After(2 * time.Second):
		}

		agents, err := agentState.GetAvailableAgents(ctx, "voice")
		if err != nil || len(agents) == 0 {
			continue
		}

		// Try to claim first available agent
		for _, agentID := range agents {
			claimed, err := agentState.ClaimAgent(ctx, agentID, sess.UUID, "voice")
			if err == nil && claimed {
				assignedAgent = agentID
				break
			}
		}

		if assignedAgent != "" {
			break
		}
	}

	if assignedAgent == "" {
		logger.Warn("No agent available, hanging up", "uuid", sess.UUID, "queue", selectedQueue)
		conn.Playback("ivr/ivr-call_back_later.wav")
		conn.Hangup("NO_USER_RESPONSE")
		return
	}

	// Phase 3: Ring agent
	sess.AssignedAgent = assignedAgent
	sess.State = "ringing"

	logger.Info("Bridging call to agent", "uuid", sess.UUID, "agent", assignedAgent)

	// Bridge to agent's SIP extension
	bridgeDest := fmt.Sprintf("sofia/internal/%s@%s", assignedAgent, cfg.SIPDomain)
	conn.SetVariable("call_timeout", "20")
	resp, err := conn.Bridge(bridgeDest)
	if err != nil {
		logger.Error("Bridge failed", "uuid", sess.UUID, "err", err)
		agentState.ReleaseAgent(ctx, assignedAgent, "ready", "voice")
		conn.Hangup("NORMAL_TEMPORARY_FAILURE")
		return
	}

	// If bridge succeeded, call is connected
	now := time.Now()
	sess.AnsweredAt = &now
	sess.State = "connected"

	logger.Info("Call connected", "uuid", sess.UUID, "agent", assignedAgent, "response", resp)

	// Wait for call to end (connection closes when call ends)
	<-ctx.Done()

	// Release agent
	agentState.ReleaseAgent(ctx, assignedAgent, "acw", "voice")
}
