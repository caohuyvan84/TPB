package esl

import (
	"bufio"
	"context"
	"fmt"
	"io"
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

// OriginateWithUUID places an outbound call with explicit UUID and application.
// Uses bgapi (async) to avoid blocking on slow originate.
func (c *InboundClient) OriginateWithUUID(uuid, dialString, app, appArg string) (string, error) {
	appStr := app
	if appArg != "" {
		appStr = fmt.Sprintf("%s(%s)", app, appArg)
	}
	cmd := fmt.Sprintf("originate {origination_uuid=%s}%s &%s", uuid, dialString, appStr)
	return c.BGApi(cmd)
}

// UUIDExists checks if a channel UUID exists.
func (c *InboundClient) UUIDExists(uuid string) (bool, error) {
	resp, err := c.API(fmt.Sprintf("uuid_exists %s", uuid))
	if err != nil {
		return false, err
	}
	// Extract body from ESL response
	body := resp
	if idx := strings.Index(resp, "\n\n"); idx >= 0 {
		body = resp[idx+2:]
	}
	return strings.Contains(strings.TrimSpace(body), "true"), nil
}

// UUIDGetVar gets a channel variable. Returns only the value (strips ESL headers).
func (c *InboundClient) UUIDGetVar(uuid, varName string) (string, error) {
	resp, err := c.API(fmt.Sprintf("uuid_getvar %s %s", uuid, varName))
	if err != nil {
		return "", err
	}
	// ESL response: "Content-Type: api/response\nContent-Length: N\n\nVALUE"
	// Extract just the body after the blank line
	if idx := strings.Index(resp, "\n\n"); idx >= 0 {
		return strings.TrimSpace(resp[idx+2:]), nil
	}
	// Or after last newline in headers
	lines := strings.Split(strings.TrimSpace(resp), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		line := strings.TrimSpace(lines[i])
		if line != "" && !strings.HasPrefix(line, "Content-") {
			return line, nil
		}
	}
	return strings.TrimSpace(resp), nil
}

// Subscribe subscribes to ESL events.
func (c *InboundClient) Subscribe(events string) (string, error) {
	return c.sendCmd(fmt.Sprintf("event plain %s", events))
}

// Host returns the configured host:port.
func (c *InboundClient) Host() string { return c.host }

// IsConnected returns true if the ESL connection is alive.
func (c *InboundClient) IsConnected() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn != nil
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

	c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	_, err := fmt.Fprintf(c.conn, "%s\n\n", cmd)
	if err != nil {
		return "", err
	}

	return c.readResponse()
}

func (c *InboundClient) readResponse() (string, error) {
	c.conn.SetReadDeadline(time.Now().Add(30 * time.Second))
	var headers strings.Builder
	contentLength := 0
	for {
		line, err := c.rdr.ReadLine()
		if err != nil {
			return headers.String(), err
		}
		if line == "" {
			break // end of headers
		}
		headers.WriteString(line)
		headers.WriteString("\n")
		// Parse Content-Length header
		if strings.HasPrefix(line, "Content-Length:") {
			parts := strings.TrimSpace(strings.TrimPrefix(line, "Content-Length:"))
			fmt.Sscanf(parts, "%d", &contentLength)
		}
	}
	// Read body if Content-Length > 0
	if contentLength > 0 {
		body := make([]byte, contentLength)
		_, err := io.ReadFull(c.rdr.R, body)
		if err != nil {
			return headers.String(), err
		}
		headers.WriteString(string(body))
	}
	return headers.String(), nil
}
