package esl

import (
	"bufio"
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/textproto"
	"strings"
	"sync"
	"time"
)

// InboundClient maintains a persistent ESL connection to FreeSWITCH port 8021.
type InboundClient struct {
	host     string
	password string
	logger   *slog.Logger

	mu   sync.Mutex
	conn net.Conn
	rdr  *textproto.Reader
}

func NewInboundClient(host, password string, logger *slog.Logger) *InboundClient {
	return &InboundClient{host: host, password: password, logger: logger}
}

// Connect establishes and authenticates an ESL inbound connection.
func (c *InboundClient) Connect(ctx context.Context) error {
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", c.host)
	if err != nil {
		return fmt.Errorf("esl inbound dial %s: %w", c.host, err)
	}

	c.mu.Lock()
	c.conn = conn
	c.rdr = textproto.NewReader(bufio.NewReader(conn))
	c.mu.Unlock()

	// Read welcome header
	if _, err := c.readResponse(); err != nil {
		conn.Close()
		return fmt.Errorf("esl inbound welcome: %w", err)
	}

	// Authenticate
	authResp, err := c.sendCmd(fmt.Sprintf("auth %s", c.password))
	if err != nil {
		conn.Close()
		return fmt.Errorf("esl inbound auth: %w", err)
	}

	if strings.Contains(authResp, "-ERR") {
		conn.Close()
		return fmt.Errorf("esl inbound auth rejected")
	}

	c.logger.Info("ESL inbound connected", "host", c.host)
	return nil
}

// ConnectWithRetry tries to connect in a loop.
func (c *InboundClient) ConnectWithRetry(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		if err := c.Connect(ctx); err != nil {
			c.logger.Warn("ESL inbound connect failed, retrying in 5s", "host", c.host, "err", err)
			time.Sleep(5 * time.Second)
			continue
		}
		return
	}
}

// API sends an "api" command (synchronous).
func (c *InboundClient) API(cmd string) (string, error) {
	return c.sendCmd(fmt.Sprintf("api %s", cmd))
}

// BGApi sends a "bgapi" command (asynchronous).
func (c *InboundClient) BGApi(cmd string) (string, error) {
	return c.sendCmd(fmt.Sprintf("bgapi %s", cmd))
}

// Originate places an outbound call.
func (c *InboundClient) Originate(dest, callerID, context, extension string) (string, error) {
	cmd := fmt.Sprintf("originate {origination_caller_id_number=%s}%s %s XML %s", callerID, dest, extension, context)
	return c.API(cmd)
}

// UUIDBridge bridges two call legs.
func (c *InboundClient) UUIDBridge(uuid1, uuid2 string) (string, error) {
	return c.API(fmt.Sprintf("uuid_bridge %s %s", uuid1, uuid2))
}

// UUIDKill hangs up a specific call.
func (c *InboundClient) UUIDKill(uuid, cause string) (string, error) {
	if cause == "" {
		cause = "NORMAL_CLEARING"
	}
	return c.API(fmt.Sprintf("uuid_kill %s %s", uuid, cause))
}

// Subscribe subscribes to ESL events.
func (c *InboundClient) Subscribe(events string) (string, error) {
	return c.sendCmd(fmt.Sprintf("event plain %s", events))
}

// Close closes the connection.
func (c *InboundClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

func (c *InboundClient) sendCmd(cmd string) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return "", fmt.Errorf("not connected")
	}

	c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	_, err := fmt.Fprintf(c.conn, "%s\n\n", cmd)
	if err != nil {
		return "", err
	}

	return c.readResponse()
}

func (c *InboundClient) readResponse() (string, error) {
	c.conn.SetReadDeadline(time.Now().Add(10 * time.Second))
	var resp strings.Builder
	for {
		line, err := c.rdr.ReadLine()
		if err != nil {
			return resp.String(), err
		}
		if line == "" {
			break
		}
		resp.WriteString(line)
		resp.WriteString("\n")
	}
	return resp.String(), nil
}
