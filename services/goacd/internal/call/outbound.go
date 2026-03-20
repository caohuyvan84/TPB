package call

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/tpb/goacd/internal/agent"
	"github.com/tpb/goacd/internal/esl"
	"github.com/tpb/goacd/internal/event"
)

// OutboundCallManager handles agent-initiated outbound calls.
// Uses single originate + inline bridge: agent → &bridge(customer)
// Agent hears real ringback tone from telco via early media.
type OutboundCallManager struct {
	eslClients  []*esl.InboundClient
	agentState  *agent.StateManager
	sessions    *SessionStore
	publisher   *event.Publisher
	sipDomain   string
	pstnGateway string
	brokers     []string
	logger      *slog.Logger
}

func NewOutboundCallManager(
	eslClients []*esl.InboundClient,
	agentState *agent.StateManager,
	sessions *SessionStore,
	publisher *event.Publisher,
	sipDomain string,
	pstnGateway string,
	brokers []string,
	logger *slog.Logger,
) *OutboundCallManager {
	return &OutboundCallManager{
		eslClients:  eslClients, agentState: agentState, sessions: sessions,
		publisher: publisher, sipDomain: sipDomain, pstnGateway: pstnGateway,
		brokers: brokers, logger: logger,
	}
}

// MakeCall initiates an outbound call with single originate + inline bridge.
// Returns immediately after claim + originate. Monitoring runs in background goroutine.
// HTTP caller gets instant response {callId, status: "initiating"}.
func (m *OutboundCallManager) MakeCall(ctx context.Context, agentID, destination string) (*Session, error) {
	if len(m.eslClients) == 0 {
		return nil, fmt.Errorf("no FreeSWITCH connection")
	}
	client := m.eslClients[0]

	callID := fmt.Sprintf("out-%s-%d", agentID, time.Now().UnixMilli())
	agentLegUUID := uuid.New().String()

	// Step 1: Claim agent → originating (blocks inbound)
	claimed, err := m.agentState.ClaimAgentOutbound(ctx, agentID, callID, "voice")
	if err != nil {
		return nil, fmt.Errorf("claim failed: %w", err)
	}
	if !claimed {
		return nil, fmt.Errorf("agent %s not available", agentID)
	}

	sess := &Session{
		UUID:         callID,
		CallerNumber: agentID,
		DestNumber:   destination,
		AssignedAgent: agentID,
		State:        "originating",
		Direction:    "outbound",
		AgentLegUUID: agentLegUUID,
		StartedAt:    time.Now(),
	}
	m.sessions.Add(sess)

	m.pub(ctx, "call.outbound.initiated", map[string]interface{}{
		"callId": callID, "agentId": agentID, "destination": destination,
	}, agentID)
	m.pub(ctx, "agent.status_changed", map[string]interface{}{
		"agentId": agentID, "oldStatus": "ready", "newStatus": "originating",
		"channel": "voice", "interactionId": callID,
	}, agentID)

	m.logger.Info("Outbound: initiating", "callId", callID, "agent", agentID, "dest", destination)

	// Timeline: outbound call started
	m.pubTimeline(ctx, callID, "call_started", map[string]interface{}{
		"callerNumber": agentID, "destNumber": destination, "direction": "outbound",
	})

	// Step 2: Single originate with inline bridge (async goroutine)
	// Agent receives SIP INVITE → auto-accept → FS bridges to customer → early media (ringback)
	custDial := m.buildCustDial(destination, agentID)
	// Route agent leg via kamailio_proxy gateway (→ Kamailio :5060 → usrloc → SIP.js)
	dialStr := fmt.Sprintf(
		"{origination_uuid=%s,origination_caller_id_number=%s,sip_h_X-Call-Direction=outbound,sip_h_X-GoACD-CallId=%s,sip_h_X-Destination=%s,ignore_early_media=false,call_timeout=60}sofia/gateway/kamailio_proxy/%s",
		agentLegUUID, agentID, callID, destination, agentID,
	)
	bridgeApp := fmt.Sprintf("bridge(%s)", custDial)

	_, err = client.OriginateWithUUID(agentLegUUID, dialStr, bridgeApp, "")
	if err != nil {
		m.fail(ctx, sess, agentID, "originate_failed", "")
		return nil, fmt.Errorf("originate failed: %w", err)
	}

	// Step 3: Start background monitor
	go m.monitorCall(context.Background(), client, sess, agentID)

	return sess, nil
}

// monitorCall polls the agent leg UUID to detect state transitions and call end.
func (m *OutboundCallManager) monitorCall(ctx context.Context, c *esl.InboundClient, sess *Session, agentID string) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	ringingPublished := false
	answeredPublished := false
	timeout := time.After(90 * time.Second) // max call setup time

	for {
		select {
		case <-timeout:
			m.logger.Warn("Outbound: monitor timeout", "callId", sess.UUID)
			c.UUIDKill(sess.AgentLegUUID, "RECOVERY_ON_TIMER_EXPIRE")
			m.fail(ctx, sess, agentID, "timeout", "NO_ANSWER")
			return

		case <-ctx.Done():
			return

		case <-ticker.C:
			exists, _ := c.UUIDExists(sess.AgentLegUUID)
			if !exists {
				// Call ended — read hangup cause from FS
				m.handleCallEnd(ctx, c, sess, agentID)
				return
			}

			// Debug: log FS channel vars every 5s
			if !answeredPublished {
				bond, _ := c.UUIDGetVar(sess.AgentLegUUID, "signal_bond")
				state, _ := c.UUIDGetVar(sess.AgentLegUUID, "channel_state")
				m.logger.Debug("Outbound: monitor poll", "callId", sess.UUID,
					"signal_bond", strings.TrimSpace(bond), "channel_state", strings.TrimSpace(state))
			}

			// Detect ringing (early media)
			if !ringingPublished {
				if progress, _ := c.UUIDGetVar(sess.AgentLegUUID, "progress_media_time"); progress != "" && !strings.Contains(progress, "0") {
					ringingPublished = true
					sess.State = "ringing"
					m.pub(ctx, "call.outbound.ringing", map[string]interface{}{
						"callId": sess.UUID, "agentId": agentID, "destination": sess.DestNumber,
					}, agentID)
					m.pubTimeline(ctx, sess.UUID, "ringing", map[string]interface{}{
						"destination": sess.DestNumber, "agentId": agentID,
					})
				}
			}

			// Detect answered (bridge complete) — check if B-leg (customer) is bridged
			if !answeredPublished {
				// signal_bond = UUID of bridged partner. Empty = not bridged yet
				if bond, _ := c.UUIDGetVar(sess.AgentLegUUID, "signal_bond"); bond != "" && !strings.Contains(bond, "ERR") && len(strings.TrimSpace(bond)) > 10 {
					answeredPublished = true
					now := time.Now()
					sess.AnsweredAt = &now
					sess.State = "connected"
					m.agentState.TransitionToOnCall(ctx, agentID)
					m.pub(ctx, "agent.status_changed", map[string]interface{}{
						"agentId": agentID, "oldStatus": "originating", "newStatus": "on_call",
						"channel": "voice",
					}, agentID)
					m.pub(ctx, "call.answered", map[string]interface{}{
						"callId": sess.UUID, "agentId": agentID, "destination": sess.DestNumber,
						"direction": "outbound",
					}, agentID)
					m.pubTimeline(ctx, sess.UUID, "answered", map[string]interface{}{
						"agentId": agentID, "destination": sess.DestNumber,
						"waitTimeMs": time.Since(sess.StartedAt).Milliseconds(),
					})
				}
			}
		}
	}
}

// handleCallEnd reads FS channel variables and publishes CDR + events.
func (m *OutboundCallManager) handleCallEnd(ctx context.Context, c *esl.InboundClient, sess *Session, agentID string) {
	now := time.Now()
	sess.EndedAt = &now
	sess.State = "ended"

	// Try to read hangup cause (may fail if UUID already gone)
	hangupCause := "NORMAL_CLEARING"
	sipCode := ""
	// Use show channels for recently ended calls
	if resp, err := c.API(fmt.Sprintf("uuid_getvar %s hangup_cause", sess.AgentLegUUID)); err == nil && resp != "" {
		cause := strings.TrimSpace(resp)
		if !strings.Contains(cause, "ERR") && cause != "" {
			hangupCause = cause
		}
	}
	if resp, err := c.API(fmt.Sprintf("uuid_getvar %s sip_term_status", sess.AgentLegUUID)); err == nil && resp != "" {
		code := strings.TrimSpace(resp)
		if !strings.Contains(code, "ERR") {
			sipCode = code
		}
	}

	wasConnected := sess.AnsweredAt != nil
	reason := mapHangupCause(hangupCause)

	// Timeline: ended
	talkTimeMs := int64(0)
	if wasConnected && sess.AnsweredAt != nil {
		talkTimeMs = now.Sub(*sess.AnsweredAt).Milliseconds()
	}
	m.pubTimeline(ctx, sess.UUID, "ended", map[string]interface{}{
		"hangupCause":     hangupCause,
		"hangupBy":        "unknown",
		"talkTimeMs":      talkTimeMs,
		"totalDurationMs": now.Sub(sess.StartedAt).Milliseconds(),
		"reason":          reason,
	})

	if wasConnected {
		// Normal call end → ACW → auto-ready after 5s
		m.agentState.ReleaseAgent(ctx, agentID, "acw", "voice")
		m.pub(ctx, "agent.status_changed", map[string]interface{}{
			"agentId": agentID, "oldStatus": "on_call", "newStatus": "acw", "channel": "voice",
		}, agentID)
		// Server-side auto-ready after ACW timeout
		go func() {
			time.Sleep(5 * time.Second)
			m.agentState.SetStatus(ctx, agentID, "ready")
			m.pub(ctx, "agent.status_changed", map[string]interface{}{
				"agentId": agentID, "oldStatus": "acw", "newStatus": "ready", "channel": "voice",
			}, agentID)
			m.logger.Info("Auto-ready after ACW", "agent", agentID)
		}()
	} else {
		// Call failed before connect (busy, no answer, etc)
		m.agentState.ReleaseAgent(ctx, agentID, "ready", "voice")
		m.pub(ctx, "agent.status_changed", map[string]interface{}{
			"agentId": agentID, "oldStatus": "originating", "newStatus": "ready", "channel": "voice",
		}, agentID)
		m.pub(ctx, "call.outbound.failed", map[string]interface{}{
			"callId": sess.UUID, "agentId": agentID, "destination": sess.DestNumber,
			"reason": reason, "hangupCause": hangupCause, "sipCode": sipCode,
		}, agentID)
	}

	cdr := BuildCDR(sess)
	cdr.HangupCause = hangupCause
	m.pub(ctx, "cdr.created", cdr, sess.UUID)
	m.pub(ctx, "call.ended", map[string]interface{}{
		"callId": sess.UUID, "agentId": agentID, "direction": "outbound",
		"hangupCause": hangupCause, "reason": reason,
	}, agentID)

	m.sessions.Remove(sess.UUID)
	m.logger.Info("Outbound: ended", "callId", sess.UUID, "agent", agentID,
		"cause", hangupCause, "reason", reason, "connected", wasConnected)
}

// mapHangupCause maps FreeSWITCH hangup causes to user-facing reasons.
func mapHangupCause(cause string) string {
	switch cause {
	case "USER_BUSY":
		return "busy"
	case "NO_ANSWER", "NO_USER_RESPONSE", "RECOVERY_ON_TIMER_EXPIRE":
		return "no_answer"
	case "UNALLOCATED_NUMBER", "INVALID_NUMBER_FORMAT":
		return "wrong_number"
	case "CALL_REJECTED", "FACILITY_REJECTED":
		return "rejected"
	case "NORMAL_CLEARING", "NORMAL_UNSPECIFIED":
		return "normal"
	case "ORIGINATOR_CANCEL":
		return "cancelled"
	case "NETWORK_OUT_OF_ORDER", "DESTINATION_OUT_OF_ORDER", "NORMAL_TEMPORARY_FAILURE":
		return "network_error"
	default:
		return "error"
	}
}

func (m *OutboundCallManager) buildCustDial(dest, callerID string) string {
	if m.pstnGateway != "" {
		return fmt.Sprintf("{origination_caller_id_number=%s}sofia/gateway/%s/%s",
			callerID, m.pstnGateway, dest)
	}
	return fmt.Sprintf("{origination_caller_id_number=%s}sofia/internal/%s@%s",
		callerID, dest, m.sipDomain)
}

func (m *OutboundCallManager) fail(ctx context.Context, sess *Session, agentID, reason, hangupCause string) {
	now := time.Now()
	sess.EndedAt = &now
	sess.State = "ended"
	m.agentState.ReleaseAgent(ctx, agentID, "ready", "voice")
	m.pub(ctx, "agent.status_changed", map[string]interface{}{
		"agentId": agentID, "oldStatus": "originating", "newStatus": "ready", "channel": "voice",
	}, agentID)
	m.pub(ctx, "call.outbound.failed", map[string]interface{}{
		"callId": sess.UUID, "agentId": agentID, "destination": sess.DestNumber,
		"reason": reason, "hangupCause": hangupCause,
	}, agentID)
	m.sessions.Remove(sess.UUID)
	m.logger.Warn("Outbound: failed", "callId", sess.UUID, "reason", reason)
}

func (m *OutboundCallManager) pub(ctx context.Context, topic string, data interface{}, key string) {
	m.publisher.Publish(ctx, m.brokers, topic, data, key)
}

func (m *OutboundCallManager) pubTimeline(ctx context.Context, callID, eventType string, data map[string]interface{}) {
	m.publisher.Publish(ctx, m.brokers, "call.timeline", map[string]interface{}{
		"callId":    callID,
		"eventType": eventType,
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		"data":      data,
	}, callID)
}
