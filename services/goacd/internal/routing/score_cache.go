package routing

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

// ScoreCache maintains a pre-computed cache of agent scores.
// A background goroutine refreshes scores every N seconds, so call handlers
// read from cache (0 Redis ops) instead of scoring per-call (N×HGetAll per call).
// Only includes agents with fresh SIP heartbeat (alive and reachable).
type ScoreCache struct {
	scorer *Scorer
	logger *slog.Logger

	mu              sync.RWMutex
	cachedScores    []ScoredAgent // sorted by score desc
	lastRefresh     time.Time
	refreshInterval time.Duration

	// getAvailable returns agent IDs in the available set
	getAvailable func(ctx context.Context, channel string) ([]string, error)
	// isSipAlive checks if agent has fresh SIP heartbeat
	isSipAlive func(ctx context.Context, agentID string, maxAgeMs int64) bool
}

// NewScoreCache creates a new cache that auto-refreshes agent scores.
func NewScoreCache(
	scorer *Scorer,
	getAvailable func(ctx context.Context, channel string) ([]string, error),
	isSipAlive func(ctx context.Context, agentID string, maxAgeMs int64) bool,
	refreshInterval time.Duration,
	logger *slog.Logger,
) *ScoreCache {
	if refreshInterval < 1*time.Second {
		refreshInterval = 5 * time.Second
	}
	return &ScoreCache{
		scorer:          scorer,
		getAvailable:    getAvailable,
		isSipAlive:      isSipAlive,
		refreshInterval: refreshInterval,
		logger:          logger,
	}
}

// Start runs the background refresh loop. Call in a goroutine.
func (sc *ScoreCache) Start(ctx context.Context) {
	// Initial refresh immediately
	sc.refresh(ctx)

	ticker := time.NewTicker(sc.refreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			sc.refresh(ctx)
		}
	}
}

func (sc *ScoreCache) refresh(ctx context.Context) {
	available, err := sc.getAvailable(ctx, "voice")
	if err != nil {
		sc.logger.Debug("ScoreCache: failed to get available agents", "err", err)
		return
	}

	if len(available) == 0 {
		sc.mu.Lock()
		sc.cachedScores = nil
		sc.lastRefresh = time.Now()
		sc.mu.Unlock()
		return
	}

	// Filter: only include agents with fresh SIP heartbeat (alive within 90s)
	const sipHeartbeatMaxAge = 90_000 // 90 seconds in ms
	alive := make([]string, 0, len(available))
	for _, agentID := range available {
		if sc.isSipAlive != nil && !sc.isSipAlive(ctx, agentID, sipHeartbeatMaxAge) {
			sc.logger.Debug("ScoreCache: agent excluded (no SIP heartbeat)", "agent", agentID)
			continue
		}
		alive = append(alive, agentID)
	}

	// Score only SIP-alive agents
	scored := sc.scorer.ScoreAgents(ctx, alive, nil, "", 0)

	sc.mu.Lock()
	sc.cachedScores = scored
	sc.lastRefresh = time.Now()
	sc.mu.Unlock()

	sc.logger.Debug("ScoreCache: refreshed", "agents", len(scored), "top",
		func() string {
			if len(scored) > 0 {
				return scored[0].AgentID
			}
			return "none"
		}())
}

// GetTopN returns the top N agents from cache (no Redis call).
// queueSkills and queueGroup are used for optional re-filtering.
// For MVP, cache ignores queue-specific skills (all agents scored equally).
// If cache is empty or stale (>30s), falls back to live scoring.
func (sc *ScoreCache) GetTopN(ctx context.Context, topN int) []ScoredAgent {
	sc.mu.RLock()
	scores := sc.cachedScores
	age := time.Since(sc.lastRefresh)
	sc.mu.RUnlock()

	// Cache stale (>30s) or empty — fallback to live scoring
	if age > 30*time.Second || scores == nil {
		available, err := sc.getAvailable(ctx, "voice")
		if err != nil || len(available) == 0 {
			return nil
		}
		scores = sc.scorer.ScoreAgents(ctx, available, nil, "", topN)
		return scores
	}

	if topN > 0 && len(scores) > topN {
		result := make([]ScoredAgent, topN)
		copy(result, scores[:topN])
		return result
	}

	// Return copy to avoid race
	result := make([]ScoredAgent, len(scores))
	copy(result, scores)
	return result
}

// HasAvailable returns true if there are cached available agents (fast check, no Redis).
func (sc *ScoreCache) HasAvailable() bool {
	sc.mu.RLock()
	defer sc.mu.RUnlock()
	return len(sc.cachedScores) > 0
}

// LastRefresh returns when scores were last refreshed.
func (sc *ScoreCache) LastRefresh() time.Time {
	sc.mu.RLock()
	defer sc.mu.RUnlock()
	return sc.lastRefresh
}
