package event

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
)

// KafkaEvent is the standard envelope for all events.
type KafkaEvent struct {
	EventID   string      `json:"eventId"`
	Timestamp string      `json:"timestamp"`
	Type      string      `json:"type"`
	Source    string      `json:"source"`
	Data      interface{} `json:"data"`
}

// Publisher publishes events to Kafka.
type Publisher struct {
	writers map[string]*kafka.Writer
	logger  *slog.Logger
}

func NewPublisher(brokers []string, logger *slog.Logger) *Publisher {
	return &Publisher{
		writers: make(map[string]*kafka.Writer),
		logger:  logger,
	}
}

func (p *Publisher) getWriter(topic string, brokers []string) *kafka.Writer {
	if w, ok := p.writers[topic]; ok {
		return w
	}
	// Lazy create — in production use a pool
	return &kafka.Writer{
		Addr:     kafka.TCP(brokers...),
		Topic:    topic,
		Balancer: &kafka.LeastBytes{},
	}
}

// Publish sends a typed event to a Kafka topic.
func (p *Publisher) Publish(ctx context.Context, brokers []string, topic string, data interface{}, key string) error {
	evt := KafkaEvent{
		EventID:   uuid.New().String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Type:      topic,
		Source:    "goacd",
		Data:      data,
	}

	value, err := json.Marshal(evt)
	if err != nil {
		return err
	}

	w := p.getWriter(topic, brokers)
	err = w.WriteMessages(ctx, kafka.Message{
		Key:   []byte(key),
		Value: value,
	})

	if err != nil {
		p.logger.Warn("Kafka publish failed (non-fatal)", "topic", topic, "err", err)
	}
	return err
}

// Close shuts down all writers.
func (p *Publisher) Close() {
	for _, w := range p.writers {
		w.Close()
	}
}
