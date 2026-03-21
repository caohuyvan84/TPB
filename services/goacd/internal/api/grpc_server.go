package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/tpb/goacd/internal/agent"
	"github.com/tpb/goacd/internal/call"
	"github.com/tpb/goacd/internal/esl"
)

// GRPCServer provides the gRPC/HTTP API for CTI Adapter integration.
// For MVP, we use a simple JSON-over-HTTP API on the gRPC port.
// Full protobuf gRPC will be added in Sprint 4.
type GRPCServer struct {
	port       int
	agents     *agent.StateManager
	sessions   *call.SessionStore
	eslClients []esl.ESLClient
	outbound   *call.OutboundCallManager
	sipDomain     string
	turnSecret    string
	turnTTL       int
	sipAuthSecret string
	sipAuthTTL    int
	logger        *slog.Logger
	startedAt     time.Time
}

func NewGRPCServer(port int, agents *agent.StateManager, sessions *call.SessionStore, eslClients []esl.ESLClient, outbound *call.OutboundCallManager, sipDomain, turnSecret string, turnTTL int, sipAuthSecret string, sipAuthTTL int, logger *slog.Logger) *GRPCServer {
	return &GRPCServer{
		port: port, agents: agents, sessions: sessions,
		eslClients: eslClients, outbound: outbound,
		sipDomain: sipDomain,
		turnSecret: turnSecret, turnTTL: turnTTL,
		sipAuthSecret: sipAuthSecret, sipAuthTTL: sipAuthTTL,
		logger: logger, startedAt: time.Now(),
	}
}

func (s *GRPCServer) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleHealthz)
	mux.HandleFunc("/rpc/SetAgentState", s.handleSetAgentState)
	mux.HandleFunc("/rpc/GetAgentState", s.handleGetAgentState)
	mux.HandleFunc("/rpc/MakeCall", s.handleMakeCall)
	mux.HandleFunc("/rpc/HangupCall", s.handleHangupCall)
	mux.HandleFunc("/rpc/GetSIPCredentials", s.handleGetSIPCredentials)
	mux.HandleFunc("/rpc/SipHeartbeat", s.handleSipHeartbeat)

	addr := fmt.Sprintf(":%d", s.port)
	s.logger.Info("gRPC/HTTP server listening", "addr", addr)

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	return http.Serve(ln, mux)
}

func (s *GRPCServer) handleSetAgentState(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AgentID string `json:"agentId"`
		Status  string `json:"status"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	err := s.agents.SetStatus(context.Background(), req.AgentID, req.Status)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *GRPCServer) handleGetAgentState(w http.ResponseWriter, r *http.Request) {
	agentID := r.URL.Query().Get("agentId")
	state, err := s.agents.GetState(context.Background(), agentID)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	json.NewEncoder(w).Encode(state)
}

func (s *GRPCServer) handleMakeCall(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AgentID string `json:"agentId"`
		Dest    string `json:"destination"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	sess, err := s.outbound.MakeCall(r.Context(), req.AgentID, req.Dest)
	if err != nil {
		s.logger.Error("MakeCall failed", "agent", req.AgentID, "dest", req.Dest, "err", err)
		http.Error(w, err.Error(), 500)
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "initiating",
		"callId":       sess.UUID,
		"agentLegUUID": sess.AgentLegUUID,
		"destination":  req.Dest,
	})
}

func (s *GRPCServer) handleHangupCall(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UUID string `json:"uuid"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// Try session hangup callback first (direct ESL outbound conn)
	if s.sessions.Hangup(req.UUID) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "method": "session_hangup"})
		return
	}

	// Fallback: try all ESL inbound clients
	if len(s.eslClients) == 0 {
		http.Error(w, "no FreeSWITCH connections", 503)
		return
	}

	var resp string
	var err error
	for _, client := range s.eslClients {
		resp, err = client.UUIDKill(req.UUID, "NORMAL_CLEARING")
		if err == nil {
			break
		}
	}
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "response": resp})
}

func (s *GRPCServer) handleHealthz(w http.ResponseWriter, r *http.Request) {
	// ESL connection status
	eslConns := make([]map[string]interface{}, 0, len(s.eslClients))
	for _, c := range s.eslClients {
		eslConns = append(eslConns, map[string]interface{}{
			"host":      c.Host(),
			"connected": c.IsConnected(),
		})
	}

	// Active calls summary
	calls := s.sessions.All()
	callSummary := make([]map[string]interface{}, 0, len(calls))
	for _, sess := range calls {
		cs := map[string]interface{}{
			"callId":    sess.UUID,
			"state":     sess.State,
			"direction": sess.Direction,
			"agent":     sess.AssignedAgent,
			"duration":  time.Since(sess.StartedAt).String(),
		}
		callSummary = append(callSummary, cs)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":         "ok",
		"service":        "goacd",
		"uptimeSeconds":  int(time.Since(s.startedAt).Seconds()),
		"uptime":         time.Since(s.startedAt).String(),
		"activeCalls":    s.sessions.Count(),
		"calls":          callSummary,
		"eslConnections": eslConns,
	})
}

// generateTURNCredentials creates ephemeral TURN credentials per RFC 5389.
// coturn validates: username = "<expiry_timestamp>:<user>", credential = HMAC-SHA1(secret, username)
func (s *GRPCServer) generateTURNCredentials(agentID string) (username, credential string) {
	expiry := time.Now().Unix() + int64(s.turnTTL)
	username = fmt.Sprintf("%d:%s", expiry, agentID)
	mac := hmac.New(sha1.New, []byte(s.turnSecret))
	mac.Write([]byte(username))
	credential = base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return
}

// generateSIPAuthToken creates an ephemeral SIP credential for Kamailio auth_ephemeral.
// Kamailio validates: username = "<expiry_unix>:<extension>", password = HMAC-SHA1(shared_secret, username).
// No DB lookup required — pure CPU verification on Kamailio side.
// Shared secret must match GOACD_SIP_AUTH_SECRET env var and Kamailio auth_ephemeral secret.
func (s *GRPCServer) generateSIPAuthToken(agentID string) (authUser, authPassword string, expiresAt int64) {
	expiresAt = time.Now().Unix() + int64(s.sipAuthTTL)
	authUser = fmt.Sprintf("%d:%s", expiresAt, agentID)
	mac := hmac.New(sha1.New, []byte(s.sipAuthSecret))
	mac.Write([]byte(authUser))
	authPassword = base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return
}

func (s *GRPCServer) handleGetSIPCredentials(w http.ResponseWriter, r *http.Request) {
	agentID := r.URL.Query().Get("agentId")
	turnUser, turnCred := s.generateTURNCredentials(agentID)
	sipAuthUser, sipAuthPass, sipAuthExpires := s.generateSIPAuthToken(agentID)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"wsUri":                 fmt.Sprintf("wss://%s/wss-sip/", s.sipDomain),
		"sipUri":                fmt.Sprintf("sip:%s@%s", agentID, s.sipDomain),
		"domain":                s.sipDomain,
		"authorizationUser":     sipAuthUser,
		"authorizationPassword": sipAuthPass,
		"tokenExpiresAt":        sipAuthExpires,
		"iceServers": []map[string]string{
			{"urls": fmt.Sprintf("stun:%s:3478", s.sipDomain)},
			{"urls": fmt.Sprintf("turn:%s:3478", s.sipDomain), "username": turnUser, "credential": turnCred},
			{"urls": fmt.Sprintf("turns:%s:5349", s.sipDomain), "username": turnUser, "credential": turnCred},
		},
	})
}

func (s *GRPCServer) handleSipHeartbeat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AgentID       string `json:"agentId"`
		SipRegistered bool   `json:"sipRegistered"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.AgentID == "" {
		http.Error(w, "agentId required", 400)
		return
	}
	err := s.agents.UpdateSipHeartbeat(r.Context(), req.AgentID, req.SipRegistered)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
