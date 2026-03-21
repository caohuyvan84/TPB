package agent

import (
	"context"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

// Reconciler periodically checks for stale agent states and fixes desync.
type Reconciler struct {
	rdb      *redis.Client
	state    *StateManager
	interval time.Duration
	logger   *slog.Logger
	stopCh   chan struct{}
}

func NewReconciler(rdb *redis.Client, state *StateManager, logger *slog.Logger) *Reconciler {
	return &Reconciler{
		rdb:      rdb,
		state:    state,
		interval: 2 * time.Minute,
		logger:   logger,
		stopCh:   make(chan struct{}),
	}
}

// Start begins the reconciliation loop.
func (r *Reconciler) Start(ctx context.Context) {
	r.logger.Info("Agent reconciler started", "interval", r.interval)

	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-r.stopCh:
			return
		case <-ticker.C:
			r.reconcile(ctx)
		}
	}
}

func (r *Reconciler) Stop() {
	close(r.stopCh)
}

// StartStaleReaper runs a fast 15s loop to release agents stuck in ringing/originating > 35s.
func (r *Reconciler) StartStaleReaper(ctx context.Context) {
	r.logger.Info("Stale claim reaper started", "interval", "15s", "threshold", "35s")
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-r.stopCh:
			return
		case <-ticker.C:
			r.reapStaleClaims(ctx)
		}
	}
}

func (r *Reconciler) reapStaleClaims(ctx context.Context) {
	// Scan ALL agent keys (not just available set — stuck agents are NOT in available set)
	var cursor uint64
	for {
		keys, nextCursor, err := r.rdb.Scan(ctx, cursor, hashPrefix+"*", 100).Result()
		if err != nil {
			return
		}
		for _, key := range keys {
			state, err := r.rdb.HGetAll(ctx, key).Result()
			if err != nil || len(state) == 0 {
				continue
			}

			status := state["status"]
			if status != StateRinging && status != StateOriginating {
				continue
			}

			changedAt := state["status_changed_at"]
			if changedAt == "" {
				continue
			}

			// status_changed_at is stored as Unix seconds (from Redis TIME[1]) or milliseconds
			ts := parseInt64(changedAt)
			if ts == 0 {
				continue
			}
			// Detect if timestamp is in seconds or milliseconds
			nowMs := time.Now().UnixMilli()
			if ts < 1e12 { // seconds (< year ~33658 in seconds)
				ts = ts * 1000 // convert to ms
			}
			ageSec := float64(nowMs-ts) / 1000.0
			if ageSec > 35 {
				agentID := key[len(hashPrefix):]
				r.logger.Warn("Stale claim reaper: releasing stuck agent",
					"agent", agentID, "status", status, "ageSec", ageSec)
				r.state.ReleaseAgent(ctx, agentID, StateReady, "voice")
			}
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
}

func parseInt64(s string) int64 {
	var n int64
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int64(c-'0')
		}
	}
	return n
}

func (r *Reconciler) reconcile(ctx context.Context) {
	r.logger.Debug("Running agent state reconciliation")

	// Check all agents in available sets
	channels := []string{"voice", "chat", "email"}
	for _, ch := range channels {
		agents, err := r.state.GetAvailableAgents(ctx, ch)
		if err != nil {
			r.logger.Error("Reconciler: failed to get available agents", "channel", ch, "err", err)
			continue
		}

		for _, agentID := range agents {
			state, err := r.state.GetState(ctx, agentID)
			if err != nil {
				continue
			}

			// Check 1: Agent hash doesn't exist → stale entry in available set
			if len(state) == 0 {
				r.logger.Warn("Reconciler: removing stale agent from available set",
					"agent", agentID, "channel", ch)
				r.rdb.SRem(ctx, availablePrefix+ch, agentID)
				continue
			}

			// Check 2: Agent status doesn't match available set membership
			status := state["status"]
			if status != StateReady {
				r.logger.Warn("Reconciler: agent in available set but not ready",
					"agent", agentID, "channel", ch, "status", status)
				r.rdb.SRem(ctx, availablePrefix+ch, agentID)
				continue
			}

			// Check 2.5: Agent is ready AND in available set → OK, skip remaining checks
			// (This agent is healthy)

			// Check 3: SIP heartbeat stale — agent is "ready" but SIP not alive > 90s
			// This catches: browser crashed, tab closed without logout, network died without frontend notify
			if status == StateReady {
				if !r.state.IsSipAlive(ctx, agentID, 90_000) {
					hb := state["sip_heartbeat_at"]
					if hb != "" { // only act if agent ever sent a heartbeat
						r.logger.Warn("Reconciler: agent SIP heartbeat stale, removing from available",
							"agent", agentID, "channel", ch, "lastHeartbeat", hb)
						r.rdb.SRem(ctx, availablePrefix+ch, agentID)
						r.state.SetStatus(ctx, agentID, StateNotReady)
						continue
					}
				}
			}

			// Check 4: Stale claim — agent in "ringing" for > 60 seconds
			if status == StateRinging {
				changedAt := state["status_changed_at"]
				if changedAt != "" {
					ts, _ := time.Parse(time.RFC3339, changedAt)
					if time.Since(ts) > 60*time.Second {
						r.logger.Warn("Reconciler: stale ringing state, releasing agent",
							"agent", agentID, "duration", time.Since(ts))
						r.state.ReleaseAgent(ctx, agentID, StateReady, ch)
					}
				}
			}

			// Check 4: Agent hash TTL expired → cleanup
			ttl, err := r.rdb.TTL(ctx, hashPrefix+agentID).Result()
			if err == nil && ttl < 0 {
				r.logger.Warn("Reconciler: agent hash expired, cleaning up",
					"agent", agentID)
				r.rdb.SRem(ctx, availablePrefix+ch, agentID)
			}
		}
	}

	// REVERSE CHECK: Find agents with status=ready but NOT in available:voice set (desync fix).
	// Catches: partial pipeline failure, race between ACW auto-ready + frontend status update.
	var cursor uint64
	for {
		keys, nextCursor, err := r.rdb.Scan(ctx, cursor, hashPrefix+"*", 100).Result()
		if err != nil {
			break
		}
		for _, key := range keys {
			agentID := key[len(hashPrefix):]
			status, _ := r.rdb.HGet(ctx, key, "status").Result()
			if status == StateReady {
				inSet, _ := r.rdb.SIsMember(ctx, availablePrefix+"voice", agentID).Result()
				if !inSet {
					r.logger.Warn("Reconciler: agent ready but missing from available set, re-adding",
						"agent", agentID)
					r.rdb.SAdd(ctx, availablePrefix+"voice", agentID)
				}
			}
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
}
