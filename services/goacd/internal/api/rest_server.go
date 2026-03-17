package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/tpb/goacd/internal/call"
)

// RESTServer provides admin/monitoring REST endpoints and health check.
type RESTServer struct {
	port     int
	sessions *call.SessionStore
	logger   *slog.Logger
	startedAt time.Time
}

func NewRESTServer(port int, sessions *call.SessionStore, logger *slog.Logger) *RESTServer {
	return &RESTServer{port: port, sessions: sessions, logger: logger, startedAt: time.Now()}
}

func (s *RESTServer) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleHealth)
	mux.HandleFunc("/api/calls", s.handleCalls)
	mux.HandleFunc("/api/stats", s.handleStats)

	addr := fmt.Sprintf(":%d", s.port)
	s.logger.Info("REST server listening", "addr", addr)
	return http.ListenAndServe(addr, mux)
}

func (s *RESTServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "ok",
		"service":   "goacd",
		"uptime":    time.Since(s.startedAt).String(),
		"activeCalls": s.sessions.Count(),
	})
}

func (s *RESTServer) handleCalls(w http.ResponseWriter, r *http.Request) {
	sessions := s.sessions.All()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"count": len(sessions),
		"calls": sessions,
	})
}

func (s *RESTServer) handleStats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{
		"activeCalls": s.sessions.Count(),
		"uptime":      time.Since(s.startedAt).String(),
	})
}
