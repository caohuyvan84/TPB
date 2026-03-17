package agent

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	StateOffline  = "offline"
	StateReady    = "ready"
	StateNotReady = "not_ready"
	StateRinging  = "ringing"
	StateOnCall   = "on_call"
	StateACW      = "acw"
)

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

// GetAvailableAgents returns agent IDs in the available set for a channel.
func (m *StateManager) GetAvailableAgents(ctx context.Context, channel string) ([]string, error) {
	return m.rdb.SMembers(ctx, availablePrefix+channel).Result()
}

// GetState returns an agent's full state hash.
func (m *StateManager) GetState(ctx context.Context, agentID string) (map[string]string, error) {
	return m.rdb.HGetAll(ctx, hashPrefix+agentID).Result()
}

// SetStatus updates agent status.
func (m *StateManager) SetStatus(ctx context.Context, agentID, status string) error {
	pipe := m.rdb.Pipeline()
	key := hashPrefix + agentID
	pipe.HSet(ctx, key, "status", status, "status_changed_at", fmt.Sprintf("%d", time.Now().UnixMilli()))
	if status == StateReady {
		pipe.SAdd(ctx, availablePrefix+"voice", agentID)
	} else {
		pipe.SRem(ctx, availablePrefix+"voice", agentID)
	}
	_, err := pipe.Exec(ctx)
	return err
}
