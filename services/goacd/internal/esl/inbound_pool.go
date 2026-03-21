package esl

import (
	"context"
	"log/slog"
	"sync/atomic"
	"time"
)

// InboundPool maintains multiple InboundClient connections to the same FreeSWITCH host.
// Commands are distributed round-robin across connections to avoid single-mutex bottleneck.
// Includes auto-reconnect: health check every 10s, reconnect dead connections.
type InboundPool struct {
	clients  []*InboundClient
	index    atomic.Uint64
	host     string
	password string
	logger   *slog.Logger
}

// NewInboundPool creates a pool of N InboundClient connections to the same FS host.
func NewInboundPool(host, password string, poolSize int, logger *slog.Logger) *InboundPool {
	if poolSize < 1 {
		poolSize = 1
	}
	clients := make([]*InboundClient, poolSize)
	for i := 0; i < poolSize; i++ {
		clients[i] = NewInboundClient(host, password, logger)
	}
	return &InboundPool{
		clients:  clients,
		host:     host,
		password: password,
		logger:   logger,
	}
}

// ConnectAll connects all clients in the pool with retry, then starts health monitor.
func (p *InboundPool) ConnectAll(ctx context.Context) {
	for i, c := range p.clients {
		go func(idx int, client *InboundClient) {
			client.ConnectWithRetry(ctx)
			p.logger.Info("ESL pool connection established", "host", p.host, "poolIdx", idx)
		}(i, c)
	}
	// Start health monitor — reconnect dead connections every 10s
	go p.healthMonitor(ctx)
}

// healthMonitor checks pool connections every 10s and reconnects dead ones.
func (p *InboundPool) healthMonitor(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for i, c := range p.clients {
				if !c.IsConnected() {
					p.logger.Warn("ESL pool connection dead, reconnecting",
						"host", p.host, "poolIdx", i)
					// Close stale connection and create fresh one
					c.Close()
					newClient := NewInboundClient(p.host, p.password, p.logger)
					if err := newClient.Connect(ctx); err != nil {
						p.logger.Warn("ESL pool reconnect failed",
							"host", p.host, "poolIdx", i, "err", err)
						// Will retry on next health check
					} else {
						p.clients[i] = newClient
						p.logger.Info("ESL pool connection restored",
							"host", p.host, "poolIdx", i)
					}
				}
			}
		}
	}
}

// pickHealthy returns a connected client, skipping dead ones.
func (p *InboundPool) pickHealthy() *InboundClient {
	n := uint64(len(p.clients))
	start := p.index.Add(1)
	for i := uint64(0); i < n; i++ {
		c := p.clients[(start+i)%n]
		if c.IsConnected() {
			return c
		}
	}
	// All dead — return first one anyway (will get connection error)
	return p.clients[start%n]
}

// API sends a synchronous ESL API command via a round-robin selected connection.
func (p *InboundPool) API(cmd string) (string, error) {
	return p.pickHealthy().API(cmd)
}

// BGApi sends an asynchronous ESL bgapi command.
func (p *InboundPool) BGApi(cmd string) (string, error) {
	return p.pickHealthy().BGApi(cmd)
}

// Originate places an outbound call.
func (p *InboundPool) Originate(dest, callerID, context, extension string) (string, error) {
	return p.pickHealthy().Originate(dest, callerID, context, extension)
}

// UUIDBridge bridges two call legs.
func (p *InboundPool) UUIDBridge(uuid1, uuid2 string) (string, error) {
	return p.pickHealthy().UUIDBridge(uuid1, uuid2)
}

// UUIDKill hangs up a specific call.
func (p *InboundPool) UUIDKill(uuid, cause string) (string, error) {
	return p.pickHealthy().UUIDKill(uuid, cause)
}

// OriginateWithUUID places an outbound call with explicit UUID.
func (p *InboundPool) OriginateWithUUID(uuid, dialString, app, appArg string) (string, error) {
	return p.pickHealthy().OriginateWithUUID(uuid, dialString, app, appArg)
}

// UUIDExists checks if a channel UUID exists.
func (p *InboundPool) UUIDExists(uuid string) (bool, error) {
	return p.pickHealthy().UUIDExists(uuid)
}

// UUIDGetVar gets a channel variable.
func (p *InboundPool) UUIDGetVar(uuid, varName string) (string, error) {
	return p.pickHealthy().UUIDGetVar(uuid, varName)
}

// Subscribe subscribes to ESL events on ALL connections in the pool.
func (p *InboundPool) Subscribe(events string) (string, error) {
	var lastResp string
	var lastErr error
	for _, c := range p.clients {
		lastResp, lastErr = c.Subscribe(events)
	}
	return lastResp, lastErr
}

// Host returns the configured host:port.
func (p *InboundPool) Host() string { return p.host }

// IsConnected returns true if at least one connection in the pool is alive.
func (p *InboundPool) IsConnected() bool {
	for _, c := range p.clients {
		if c.IsConnected() {
			return true
		}
	}
	return false
}

// Close closes all connections in the pool.
func (p *InboundPool) Close() error {
	for _, c := range p.clients {
		c.Close()
	}
	return nil
}

// Size returns the number of connections in the pool.
func (p *InboundPool) Size() int {
	return len(p.clients)
}
