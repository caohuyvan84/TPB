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

	// Step 1: send "connect" to get channel info
	if err := oc.Connect(); err != nil {
		s.logger.Error("ESL connect handshake failed", "err", err)
		return
	}

	callCtx, cancel := context.WithCancel(ctx)
	defer cancel()

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
	logger  *slog.Logger
	headers map[string]string
}

func newOutboundConn(conn net.Conn, logger *slog.Logger) *OutboundConn {
	return &OutboundConn{
		conn:    conn,
		reader:  textproto.NewReader(bufio.NewReader(conn)),
		logger:  logger,
		headers: make(map[string]string),
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
	// Read Content-Length body if present
	if cl := c.headers["Content-Length"]; cl != "" {
		// skip body for now
	}
	return nil
}

func (c *OutboundConn) ChannelUUID() string   { return c.headers["Channel-Unique-ID"] }
func (c *OutboundConn) CallerNumber() string   { return c.headers["Caller-Caller-ID-Number"] }
func (c *OutboundConn) DestNumber() string     { return c.headers["Caller-Destination-Number"] }
func (c *OutboundConn) CallerName() string     { return c.headers["Caller-Caller-ID-Name"] }
func (c *OutboundConn) Header(key string) string { return c.headers[key] }

// SendCommand sends an ESL command and returns the response.
func (c *OutboundConn) SendCommand(cmd string) (string, error) {
	c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	_, err := fmt.Fprintf(c.conn, "%s\n\n", cmd)
	if err != nil {
		return "", err
	}
	c.conn.SetReadDeadline(time.Now().Add(30 * time.Second))
	// Read response headers
	var resp strings.Builder
	for {
		line, err := c.reader.ReadLine()
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

// Execute runs an ESL "execute" application on this channel.
func (c *OutboundConn) Execute(app, args string) (string, error) {
	cmd := fmt.Sprintf("sendmsg\ncall-command: execute\nexecute-app-name: %s\nexecute-app-arg: %s", app, args)
	return c.SendCommand(cmd)
}

// Playback plays an audio file.
func (c *OutboundConn) Playback(file string) (string, error) {
	return c.Execute("playback", file)
}

// PlayAndGetDigits collects DTMF.
func (c *OutboundConn) PlayAndGetDigits(min, max, tries, timeout int, terminators, file, invalidFile, varName string) (string, error) {
	args := fmt.Sprintf("%d %d %d %d %s %s %s %s", min, max, tries, timeout, terminators, file, invalidFile, varName)
	return c.Execute("play_and_get_digits", args)
}

// Bridge bridges the call to a destination.
func (c *OutboundConn) Bridge(dest string) (string, error) {
	return c.Execute("bridge", dest)
}

// Hangup hangs up the call.
func (c *OutboundConn) Hangup(cause string) (string, error) {
	if cause == "" {
		cause = "NORMAL_CLEARING"
	}
	return c.Execute("hangup", cause)
}

// Answer answers the call.
func (c *OutboundConn) Answer() (string, error) {
	return c.Execute("answer", "")
}

// SetVariable sets a channel variable.
func (c *OutboundConn) SetVariable(name, value string) (string, error) {
	return c.Execute("set", fmt.Sprintf("%s=%s", name, value))
}
