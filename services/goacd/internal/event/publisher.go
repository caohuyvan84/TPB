package event

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
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

// pendingMsg is a message waiting to be published (for retry buffer).
type pendingMsg struct {
	topic   string
	key     string
	value   []byte
	retries int
}

// Publisher publishes events to Kafka asynchronously.
// Events are queued and published in background goroutine to avoid blocking call flow.
// Failed events are retried up to 3 times with exponential backoff.
type Publisher struct {
	writers  map[string]*kafka.Writer
	mu       sync.Mutex
	logger   *slog.Logger
	brokers  []string
	queue    chan pendingMsg
	wg       sync.WaitGroup
	closed   chan struct{}
}

const (
	publishQueueSize = 10000  // buffer up to 10K events
	maxRetries       = 3
	workerCount      = 4      // parallel publish workers
)

func NewPublisher(brokers []string, logger *slog.Logger) *Publisher {
	p := &Publisher{
		writers: make(map[string]*kafka.Writer),
		logger:  logger,
		brokers: brokers,
		queue:   make(chan pendingMsg, publishQueueSize),
		closed:  make(chan struct{}),
	}
	// Start background publish workers
	for i := 0; i < workerCount; i++ {
		p.wg.Add(1)
		go p.publishWorker(i)
	}
	return p
}

func (p *Publisher) getWriter(topic string) *kafka.Writer {
	p.mu.Lock()
	defer p.mu.Unlock()
	if w, ok := p.writers[topic]; ok {
		return w
	}
	w := &kafka.Writer{
		Addr:         kafka.TCP(p.brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		BatchTimeout: 50 * time.Millisecond,
		WriteTimeout: 5 * time.Second,
	}
	p.writers[topic] = w
	p.logger.Info("Kafka writer created", "topic", topic)
	return w
}

// Publish queues an event for async publishing. Never blocks the caller.
// Returns nil immediately. Errors are logged by background worker.
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
		p.logger.Error("Kafka marshal failed", "topic", topic, "err", err)
		return err
	}

	// Non-blocking enqueue
	select {
	case p.queue <- pendingMsg{topic: topic, key: key, value: value, retries: 0}:
		// queued successfully
	default:
		// Queue full — drop event and log (better than blocking call flow)
		p.logger.Error("Kafka publish queue FULL, event dropped",
			"topic", topic, "key", key, "queueSize", len(p.queue))
	}
	return nil
}

// publishWorker processes events from the queue.
func (p *Publisher) publishWorker(id int) {
	defer p.wg.Done()
	for {
		select {
		case <-p.closed:
			// Drain remaining events on shutdown
			for {
				select {
				case msg := <-p.queue:
					p.doPublish(msg)
				default:
					return
				}
			}
		case msg := <-p.queue:
			p.doPublish(msg)
		}
	}
}

func (p *Publisher) doPublish(msg pendingMsg) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	w := p.getWriter(msg.topic)
	err := w.WriteMessages(ctx, kafka.Message{
		Key:   []byte(msg.key),
		Value: msg.value,
	})

	if err != nil {
		if msg.retries < maxRetries {
			// Retry with backoff
			backoff := time.Duration(1<<uint(msg.retries)) * time.Second // 1s, 2s, 4s
			p.logger.Warn("Kafka publish failed, retrying",
				"topic", msg.topic, "retry", msg.retries+1, "backoff", backoff, "err", err)
			time.Sleep(backoff)
			msg.retries++
			select {
			case p.queue <- msg:
			default:
				p.logger.Error("Kafka retry queue full, event lost",
					"topic", msg.topic, "key", msg.key)
			}
		} else {
			p.logger.Error("Kafka publish FAILED after retries, event LOST",
				"topic", msg.topic, "key", msg.key, "retries", msg.retries, "err", err)
		}
	}
}

// Close shuts down workers and all writers. Drains pending events (5s max).
func (p *Publisher) Close() {
	close(p.closed)

	// Wait for workers to drain (max 5s)
	done := make(chan struct{})
	go func() { p.wg.Wait(); close(done) }()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		p.logger.Warn("Kafka publisher drain timeout, some events may be lost",
			"remaining", len(p.queue))
	}

	p.mu.Lock()
	defer p.mu.Unlock()
	for _, w := range p.writers {
		w.Close()
	}
}

// QueueSize returns current pending event count (for monitoring).
func (p *Publisher) QueueSize() int {
	return len(p.queue)
}
