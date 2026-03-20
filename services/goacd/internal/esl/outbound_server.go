package esl

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/textproto"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ESLEvent represents a parsed FreeSWITCH event.
type ESLEvent struct {
	Name    string            // e.g. "CHANNEL_BRIDGE", "CHANNEL_HANGUP_COMPLETE"
	Headers map[string]string // All event headers
	Body    string            // Event body (if any)
}

// CallHandler is invoked for each new outbound ESL connection (one per call).
type CallHandler func(ctx context.Context, conn *OutboundConn)

// OutboundServer listens for FreeSWITCH outbound ESL connections.
type OutboundServer struct {
	addr    string
	handler CallHandler
	ln      net.Listener
	wg      sync.WaitGroup
	logger  *slog.Logger
}

func NewOutboundServer(addr string, handler CallHandler, logger *slog.Logger) *OutboundServer {
	return &OutboundServer{addr: addr, handler: handler, logger: logger}
}

func (s *OutboundServer) Start(ctx context.Context) error {
	ln, err := net.Listen("tcp", s.addr)
	if err != nil {
		return fmt.Errorf("esl outbound listen %s: %w", s.addr, err)
	}
	s.ln = ln
	s.logger.Info("ESL outbound server listening", "addr", s.addr)

	go func() {
		<-ctx.Done()
		ln.Close()
	}()

	for {
		conn, err := ln.Accept()
		if err != nil {
			select {
			case <-ctx.Done():
				return nil
			default:
				s.logger.Error("ESL accept error", "err", err)
				continue
			}
		}

		s.wg.Add(1)
		go func(c net.Conn) {
			defer s.wg.Done()
			s.handleConnection(ctx, c)
		}(conn)
	}
}

func (s *OutboundServer) Wait() {
	s.wg.Wait()
}

func (s *OutboundServer) handleConnection(ctx context.Context, raw net.Conn) {
	defer raw.Close()

	oc := newOutboundConn(raw, s.logger)

	if err := oc.Connect(); err != nil {
		s.logger.Error("ESL connect handshake failed", "err", err)
		return
	}

	// Subscribe to call events BEFORE passing to handler
	if err := oc.SubscribeEvents(); err != nil {
		s.logger.Warn("ESL event subscription failed (non-fatal)", "err", err)
	}

	// Start event reader goroutine
	oc.startEventReader()

	callCtx, cancel := context.WithCancel(ctx)
	// Cancel context when ESL connection closes (event reader detects EOF)
	go func() {
		<-oc.Closed()
		cancel()
	}()

	s.logger.Info("New call via ESL outbound",
		"uuid", oc.ChannelUUID(),
		"caller", oc.CallerNumber(),
		"destination", oc.DestNumber(),
	)

	s.handler(callCtx, oc)
}

// OutboundConn wraps a single FreeSWITCH outbound ESL connection.
type OutboundConn struct {
	conn    net.Conn
	reader  *textproto.Reader
	bufRdr  *bufio.Reader
	logger  *slog.Logger
	headers map[string]string

	mu       sync.Mutex
	cmdReply chan string  // command responses
	events   chan ESLEvent // async events from FS
	closed   chan struct{} // closed when connection dies
	closeOnce sync.Once
}

func newOutboundConn(conn net.Conn, logger *slog.Logger) *OutboundConn {
	br := bufio.NewReader(conn)
	return &OutboundConn{
		conn:     conn,
		bufRdr:   br,
		reader:   textproto.NewReader(br),
		logger:   logger,
		headers:  make(map[string]string),
		cmdReply: make(chan string, 10),
		events:   make(chan ESLEvent, 100),
		closed:   make(chan struct{}),
	}
}

// Closed returns a channel that closes when the ESL connection dies.
func (c *OutboundConn) Closed() <-chan struct{} {
	return c.closed
}

// Events returns the channel for receiving async ESL events.
func (c *OutboundConn) Events() <-chan ESLEvent {
	return c.events
}

// WaitEvent waits for a specific event type with timeout.
func (c *OutboundConn) WaitEvent(eventName string, timeout time.Duration) (ESLEvent, bool) {
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	for {
		select {
		case <-timer.C:
			return ESLEvent{}, false
		case <-c.closed:
			return ESLEvent{}, false
		case evt := <-c.events:
			if evt.Name == eventName {
				return evt, true
			}
			// Put non-matching events back? No — they're consumed.
			// Caller should handle all events in a select loop instead.
		}
	}
}

// Connect sends "connect" command and reads channel data.
func (c *OutboundConn) Connect() error {
	_, err := fmt.Fprintf(c.conn, "connect\n\n")
	if err != nil {
		return err
	}
	return c.readHeaders()
}

// SubscribeEvents subscribes to relevant call events.
func (c *OutboundConn) SubscribeEvents() error {
	c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	_, err := fmt.Fprintf(c.conn, "event plain CHANNEL_BRIDGE CHANNEL_UNBRIDGE CHANNEL_HANGUP CHANNEL_HANGUP_COMPLETE CHANNEL_EXECUTE_COMPLETE\n\n")
	if err != nil {
		return err
	}
	// Read the reply
	c.conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	c.readSingleResponse() // consume "+OK event listener enabled"
	return nil
}

// startEventReader reads ESL messages in background, dispatching events and command replies.
func (c *OutboundConn) startEventReader() {
	go func() {
		defer c.closeOnce.Do(func() { close(c.closed) })
		for {
			contentType, headers, body, err := c.readMessage()
			if err != nil {
				if err != io.EOF {
					c.logger.Debug("ESL outbound read error (connection closing)", "err", err)
				}
				return
			}

			switch {
			case strings.Contains(contentType, "command/reply"),
				strings.Contains(contentType, "api/response"):
				// Command response — send to reply channel
				select {
				case c.cmdReply <- headers + body:
				default:
					c.logger.Warn("ESL command reply dropped (channel full)")
				}

			case strings.Contains(contentType, "text/event-plain"):
				// Parse event
				evt := c.parseEvent(body)
				if evt.Name != "" {
					select {
					case c.events <- evt:
					default:
						c.logger.Warn("ESL event dropped (channel full)", "event", evt.Name)
					}
				}

			case strings.Contains(contentType, "text/disconnect-notice"):
				c.logger.Info("ESL disconnect notice received")
				return

			default:
				// Unknown content type — log and continue
				c.logger.Debug("ESL unknown content-type", "type", contentType)
			}
		}
	}()
}

// readMessage reads a complete ESL message (headers + optional body).
func (c *OutboundConn) readMessage() (contentType string, headers string, body string, err error) {
	c.conn.SetReadDeadline(time.Now().Add(300 * time.Second)) // 5 min idle timeout
	var headerBuf strings.Builder
	contentLength := 0

	for {
		line, readErr := c.reader.ReadLine()
		if readErr != nil {
			return "", "", "", readErr
		}
		if line == "" {
			break // end of headers
		}
		headerBuf.WriteString(line)
		headerBuf.WriteString("\n")

		parts := strings.SplitN(line, ": ", 2)
		if len(parts) == 2 {
			key := parts[0]
			val := parts[1]
			if key == "Content-Type" {
				contentType = val
			}
			if key == "Content-Length" {
				contentLength, _ = strconv.Atoi(val)
			}
		}
	}

	headers = headerBuf.String()

	if contentLength > 0 {
		bodyBuf := make([]byte, contentLength)
		_, err = io.ReadFull(c.bufRdr, bodyBuf)
		if err != nil {
			return contentType, headers, "", err
		}
		body = string(bodyBuf)
	}

	return contentType, headers, body, nil
}

// parseEvent parses event-plain body into ESLEvent struct.
func (c *OutboundConn) parseEvent(body string) ESLEvent {
	evt := ESLEvent{Headers: make(map[string]string)}
	lines := strings.Split(body, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, ": ", 2)
		if len(parts) == 2 {
			evt.Headers[parts[0]] = parts[1]
		}
	}
	evt.Name = evt.Headers["Event-Name"]
	return evt
}

// readSingleResponse reads one ESL response (used during setup).
func (c *OutboundConn) readSingleResponse() string {
	var resp strings.Builder
	for {
		line, err := c.reader.ReadLine()
		if err != nil || line == "" {
			break
		}
		resp.WriteString(line)
		resp.WriteString("\n")
	}
	return resp.String()
}

func (c *OutboundConn) readHeaders() error {
	for {
		line, err := c.reader.ReadLine()
		if err != nil {
			return err
		}
		if line == "" {
			break
		}
		parts := strings.SplitN(line, ": ", 2)
		if len(parts) == 2 {
			c.headers[parts[0]] = parts[1]
		}
	}
	return nil
}

func (c *OutboundConn) ChannelUUID() string     { return c.headers["Channel-Unique-ID"] }
func (c *OutboundConn) CallerNumber() string     { return c.headers["Caller-Caller-ID-Number"] }
func (c *OutboundConn) DestNumber() string       { return c.headers["Caller-Destination-Number"] }
func (c *OutboundConn) CallerName() string       { return c.headers["Caller-Caller-ID-Name"] }
func (c *OutboundConn) Header(key string) string { return c.headers[key] }

// SendCommand sends an ESL command and waits for reply.
func (c *OutboundConn) SendCommand(cmd string) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	_, err := fmt.Fprintf(c.conn, "%s\n\n", cmd)
	if err != nil {
		return "", err
	}

	// Wait for reply from event reader goroutine
	select {
	case reply := <-c.cmdReply:
		return reply, nil
	case <-c.closed:
		return "", fmt.Errorf("connection closed")
	case <-time.After(30 * time.Second):
		return "", fmt.Errorf("command timeout")
	}
}

// Execute runs an ESL "execute" application on this channel.
func (c *OutboundConn) Execute(app, args string) (string, error) {
	cmd := fmt.Sprintf("sendmsg\ncall-command: execute\nexecute-app-name: %s\nexecute-app-arg: %s", app, args)
	return c.SendCommand(cmd)
}

func (c *OutboundConn) Playback(file string) (string, error) {
	return c.Execute("playback", file)
}

func (c *OutboundConn) PlayAndGetDigits(min, max, tries, timeout int, terminators, file, invalidFile, varName string) (string, error) {
	args := fmt.Sprintf("%d %d %d %d %s %s %s %s", min, max, tries, timeout, terminators, file, invalidFile, varName)
	return c.Execute("play_and_get_digits", args)
}

func (c *OutboundConn) Bridge(dest string) (string, error) {
	return c.Execute("bridge", dest)
}

func (c *OutboundConn) Hangup(cause string) (string, error) {
	if cause == "" {
		cause = "NORMAL_CLEARING"
	}
	return c.Execute("hangup", cause)
}

func (c *OutboundConn) Answer() (string, error) {
	return c.Execute("answer", "")
}

func (c *OutboundConn) SetVariable(name, value string) (string, error) {
	return c.Execute("set", fmt.Sprintf("%s=%s", name, value))
}
