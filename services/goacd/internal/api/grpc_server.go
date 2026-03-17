package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"

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
	eslClients []*esl.InboundClient
	sipDomain  string
	logger     *slog.Logger
}

func NewGRPCServer(port int, agents *agent.StateManager, sessions *call.SessionStore, eslClients []*esl.InboundClient, sipDomain string, logger *slog.Logger) *GRPCServer {
	return &GRPCServer{
		port: port, agents: agents, sessions: sessions,
		eslClients: eslClients, sipDomain: sipDomain, logger: logger,
	}
}

func (s *GRPCServer) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/rpc/SetAgentState", s.handleSetAgentState)
	mux.HandleFunc("/rpc/GetAgentState", s.handleGetAgentState)
	mux.HandleFunc("/rpc/MakeCall", s.handleMakeCall)
	mux.HandleFunc("/rpc/HangupCall", s.handleHangupCall)
	mux.HandleFunc("/rpc/GetSIPCredentials", s.handleGetSIPCredentials)

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

	if len(s.eslClients) == 0 {
		http.Error(w, "no FreeSWITCH connections", 503)
		return
	}

	// Use first available ESL client
	resp, err := s.eslClients[0].Originate(
		fmt.Sprintf("sofia/internal/%s@%s", req.Dest, s.sipDomain),
		req.AgentID,
		"default",
		req.Dest,
	)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "response": resp})
}

func (s *GRPCServer) handleHangupCall(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UUID string `json:"uuid"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if len(s.eslClients) == 0 {
		http.Error(w, "no FreeSWITCH connections", 503)
		return
	}

	resp, err := s.eslClients[0].UUIDKill(req.UUID, "NORMAL_CLEARING")
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "response": resp})
}

func (s *GRPCServer) handleGetSIPCredentials(w http.ResponseWriter, r *http.Request) {
	agentID := r.URL.Query().Get("agentId")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"wsUri":    fmt.Sprintf("wss://%s:5066", s.sipDomain),
		"sipUri":   fmt.Sprintf("sip:%s@%s", agentID, s.sipDomain),
		"domain":   s.sipDomain,
		"iceServers": []map[string]string{
			{"urls": fmt.Sprintf("stun:%s:3478", s.sipDomain)},
			{"urls": fmt.Sprintf("turn:%s:3478", s.sipDomain)},
		},
	})
}
