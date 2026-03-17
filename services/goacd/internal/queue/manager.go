package queue

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

const queuePrefix = "goacd:queue:"

// Manager manages call queues backed by Redis sorted sets.
type Manager struct {
	rdb    *redis.Client
	logger *slog.Logger
}

func NewManager(rdb *redis.Client, logger *slog.Logger) *Manager {
	return &Manager{rdb: rdb, logger: logger}
}

// Enqueue adds an interaction to a queue. Lower score = higher priority.
func (m *Manager) Enqueue(ctx context.Context, queueName, interactionID string, priority int) error {
	score := float64(time.Now().UnixMilli()) - float64(priority)*100000
	key := queuePrefix + queueName
	err := m.rdb.ZAdd(ctx, key, redis.Z{Score: score, Member: interactionID}).Err()
	if err != nil {
		return err
	}
	m.logger.Info("Enqueued", "queue", queueName, "interaction", interactionID, "score", score)
	return nil
}

// Dequeue pops the highest-priority (lowest score) item.
func (m *Manager) Dequeue(ctx context.Context, queueName string) (string, error) {
	key := queuePrefix + queueName
	items, err := m.rdb.ZRange(ctx, key, 0, 0).Result()
	if err != nil || len(items) == 0 {
		return "", err
	}
	id := items[0]
	m.rdb.ZRem(ctx, key, id)
	return id, nil
}

// Peek returns the next item without removing it.
func (m *Manager) Peek(ctx context.Context, queueName string) (string, error) {
	key := queuePrefix + queueName
	items, err := m.rdb.ZRange(ctx, key, 0, 0).Result()
	if err != nil || len(items) == 0 {
		return "", err
	}
	return items[0], nil
}

// Size returns number of items in queue.
func (m *Manager) Size(ctx context.Context, queueName string) (int64, error) {
	return m.rdb.ZCard(ctx, queuePrefix+queueName).Result()
}

// GetAll returns all items in queue with scores.
func (m *Manager) GetAll(ctx context.Context, queueName string) ([]redis.Z, error) {
	return m.rdb.ZRangeWithScores(ctx, queuePrefix+queueName, 0, -1).Result()
}

// CheckSLA scans queues for SLA breaches.
func (m *Manager) CheckSLA(ctx context.Context, queueName string, slaMs int64) []string {
	var breached []string
	items, err := m.GetAll(ctx, queueName)
	if err != nil {
		return nil
	}

	now := float64(time.Now().UnixMilli())
	for _, item := range items {
		waitMs := now - item.Score
		if waitMs > float64(slaMs) {
			id := fmt.Sprintf("%v", item.Member)
			breached = append(breached, id)
			m.logger.Warn("SLA breach", "queue", queueName, "interaction", id, "waitMs", waitMs)
		}
	}
	return breached
}
