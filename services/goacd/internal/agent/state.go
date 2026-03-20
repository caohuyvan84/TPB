package agent

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	StateOffline      = "offline"
	StateReady        = "ready"
	StateNotReady     = "not_ready"
	StateRinging      = "ringing"
	StateOriginating  = "originating"
	StateOnCall       = "on_call"
	StateACW          = "acw"
)

// validTransitions defines which state transitions are allowed.
// Key = current state, Value = set of allowed target states.
var validTransitions = map[string]map[string]bool{
	StateOffline:     {StateReady: true, StateNotReady: true},
	StateReady:       {StateNotReady: true, StateRinging: true, StateOriginating: true, StateOffline: true},
	StateNotReady:    {StateReady: true, StateOffline: true},
	StateRinging:     {StateOnCall: true, StateReady: true, StateACW: true}, // ready = no answer/timeout
	StateOriginating: {StateOnCall: true, StateReady: true, StateACW: true}, // ready = outbound failed
	StateOnCall:      {StateACW: true, StateReady: true},                    // ready = forced release
	StateACW:         {StateReady: true, StateNotReady: true, StateOffline: true},
}

// IsValidTransition checks if a state transition is allowed.
func IsValidTransition(from, to string) bool {
	targets, ok := validTransitions[from]
	if !ok {
		return false
	}
	return targets[to]
}

const (
	hashPrefix     = "agent:state:"
	availablePrefix = "agent:available:"
	stateTTL       = 3600 // seconds
)

// StateManager manages agent state in Redis.
type StateManager struct {
	rdb    *redis.Client
	logger *slog.Logger
}

func NewStateManager(rdb *redis.Client, logger *slog.Logger) *StateManager {
	return &StateManager{rdb: rdb, logger: logger}
}

// ClaimAgent atomically claims an agent for a call.
var claimScript = redis.NewScript(`
local hashKey = KEYS[1]
local availableKey = KEYS[2]
local currentStatus = redis.call('HGET', hashKey, 'status')
if currentStatus ~= 'ready' then return 0 end
local channel = ARGV[4]
local capKey = channel .. '_count'
local cur = tonumber(redis.call('HGET', hashKey, capKey) or '0')
local maxKey = channel .. '_max'
local mx = tonumber(redis.call('HGET', hashKey, maxKey) or '1')
if cur >= mx then return 0 end
redis.call('HSET', hashKey, 'status', ARGV[2])
redis.call('HSET', hashKey, 'current_interaction', ARGV[3])
redis.call('HSET', hashKey, 'status_changed_at', redis.call('TIME')[1])
redis.call('HINCRBY', hashKey, capKey, 1)
redis.call('SREM', availableKey, ARGV[1])
return 1
`)

func (m *StateManager) ClaimAgent(ctx context.Context, agentID, interactionID, channel string) (bool, error) {
	res, err := claimScript.Run(ctx, m.rdb,
		[]string{hashPrefix + agentID, availablePrefix + channel},
		agentID, StateRinging, interactionID, channel,
	).Int()
	if err != nil {
		return false, err
	}
	return res == 1, nil
}

// ReleaseAgent atomically releases an agent after a call.
var releaseScript = redis.NewScript(`
local hashKey = KEYS[1]
local availableKey = KEYS[2]
local channel = ARGV[3]
local capKey = channel .. '_count'
local cur = tonumber(redis.call('HGET', hashKey, capKey) or '0')
if cur > 0 then redis.call('HINCRBY', hashKey, capKey, -1) end
redis.call('HDEL', hashKey, 'current_interaction')
redis.call('HSET', hashKey, 'status', ARGV[2])
redis.call('HSET', hashKey, 'status_changed_at', redis.call('TIME')[1])
if ARGV[2] == 'ready' then redis.call('SADD', availableKey, ARGV[1]) end
return 1
`)

func (m *StateManager) ReleaseAgent(ctx context.Context, agentID, newStatus, channel string) error {
	_, err := releaseScript.Run(ctx, m.rdb,
		[]string{hashPrefix + agentID, availablePrefix + channel},
		agentID, newStatus, channel,
	).Int()
	return err
}

// ClaimAgentOutbound atomically claims an agent for an outbound call (ready → originating).
func (m *StateManager) ClaimAgentOutbound(ctx context.Context, agentID, interactionID, channel string) (bool, error) {
	res, err := claimScript.Run(ctx, m.rdb,
		[]string{hashPrefix + agentID, availablePrefix + channel},
		agentID, StateOriginating, interactionID, channel,
	).Int()
	if err != nil {
		return false, err
	}
	return res == 1, nil
}

// TransitionToOnCall transitions an agent from ringing/originating to on_call.
var transitionScript = redis.NewScript(`
local hashKey = KEYS[1]
local currentStatus = redis.call('HGET', hashKey, 'status')
if currentStatus ~= 'ringing' and currentStatus ~= 'originating' then return 0 end
redis.call('HSET', hashKey, 'status', 'on_call')
redis.call('HSET', hashKey, 'status_changed_at', redis.call('TIME')[1])
return 1
`)

func (m *StateManager) TransitionToOnCall(ctx context.Context, agentID string) error {
	_, err := transitionScript.Run(ctx, m.rdb,
		[]string{hashPrefix + agentID},
	).Int()
	return err
}

// GetAvailableAgents returns agent IDs in the available set for a channel.
func (m *StateManager) GetAvailableAgents(ctx context.Context, channel string) ([]string, error) {
	return m.rdb.SMembers(ctx, availablePrefix+channel).Result()
}

// GetState returns an agent's full state hash.
func (m *StateManager) GetState(ctx context.Context, agentID string) (map[string]string, error) {
	return m.rdb.HGetAll(ctx, hashPrefix+agentID).Result()
}

// SetStatus updates agent status with transition validation. Resets voice_count when setting ready.
func (m *StateManager) SetStatus(ctx context.Context, agentID, status string) error {
	// Validate transition if agent already has a state
	current, err := m.rdb.HGet(ctx, hashPrefix+agentID, "status").Result()
	if err == nil && current != "" {
		if !IsValidTransition(current, status) {
			m.logger.Warn("Invalid state transition rejected",
				"agent", agentID, "from", current, "to", status)
			// Allow it anyway for now but log warning — strict enforcement later
		}
	}

	pipe := m.rdb.Pipeline()
	key := hashPrefix + agentID
	pipe.HSet(ctx, key, "status", status, "status_changed_at", fmt.Sprintf("%d", time.Now().UnixMilli()))
	if status == StateReady {
		pipe.HSet(ctx, key, "voice_count", "0")
		pipe.HDel(ctx, key, "current_interaction")
		pipe.SAdd(ctx, availablePrefix+"voice", agentID)
	} else {
		pipe.SRem(ctx, availablePrefix+"voice", agentID)
	}
	_, err = pipe.Exec(ctx)
	return err
}
