package call

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

// Session tracks an active call.
type Session struct {
	UUID            string
	CallerNumber    string
	CallerName      string
	DestNumber      string
	Queue           string
	AssignedAgent   string
	State           string // "ivr", "queued", "ringing", "originating", "connected", "ended"
	Direction       string // "inbound" or "outbound"
	AgentLegUUID    string // UUID of agent SIP leg (outbound)
	CustomerLegUUID string // UUID of customer PSTN leg (outbound)
	StartedAt       time.Time
	AnsweredAt      *time.Time
	EndedAt         *time.Time
	IVRSelection    string
	RecordingPath   string
}

// HangupFunc is a callback to hangup a specific call.
type HangupFunc func()

// SessionStore is a thread-safe in-memory store of active call sessions.
type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	hangups  map[string]HangupFunc // callId → hangup callback
}

func NewSessionStore() *SessionStore {
	return &SessionStore{
		sessions: make(map[string]*Session),
		hangups:  make(map[string]HangupFunc),
	}
}

func (s *SessionStore) Add(sess *Session) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[sess.UUID] = sess
}

func (s *SessionStore) Get(uuid string) *Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sessions[uuid]
}

func (s *SessionStore) Remove(uuid string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, uuid)
	delete(s.hangups, uuid)
}

// RegisterHangup registers a hangup callback for a call.
func (s *SessionStore) RegisterHangup(uuid string, fn HangupFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.hangups[uuid] = fn
}

// Hangup calls the hangup callback for a specific call (by UUID or agentId).
func (s *SessionStore) Hangup(idOrAgent string) bool {
	s.mu.RLock()
	// Try direct UUID match
	fn, ok := s.hangups[idOrAgent]
	if !ok {
		// Try find by assigned agent
		for uuid, sess := range s.sessions {
			if sess.AssignedAgent == idOrAgent && sess.State == "connected" {
				fn = s.hangups[uuid]
				ok = fn != nil
				break
			}
		}
	}
	s.mu.RUnlock()
	if ok && fn != nil {
		fn()
		return true
	}
	return false
}

func (s *SessionStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.sessions)
}

func (s *SessionStore) All() []*Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*Session, 0, len(s.sessions))
	for _, sess := range s.sessions {
		out = append(out, sess)
	}
	return out
}

// StartStaleSessionReaper periodically removes sessions that have been alive too long.
// Prevents memory leaks from stuck calls that never properly cleaned up.
// - Sessions in "ended" state older than 5 minutes → remove (cleanup missed)
// - Sessions in any state older than 5 hours → force remove (stuck call)
// - Sessions in "queued"/"ivr" older than 30 minutes → remove (abandoned before routing)
func (s *SessionStore) StartStaleSessionReaper(ctx context.Context, logger *slog.Logger) {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			now := time.Now()
			var stale []string

			s.mu.RLock()
			for uuid, sess := range s.sessions {
				age := now.Sub(sess.StartedAt)
				switch {
				case sess.State == "ended" && age > 5*time.Minute:
					stale = append(stale, uuid)
				case (sess.State == "queued" || sess.State == "ivr") && age > 30*time.Minute:
					stale = append(stale, uuid)
				case (sess.State == "ringing" || sess.State == "originating") && age > 3*time.Minute:
					stale = append(stale, uuid) // ringing/originating should resolve in <90s
				case sess.State == "connected" && age > 4*time.Hour:
					stale = append(stale, uuid) // max call duration safety net
				case age > 5*time.Hour:
					stale = append(stale, uuid) // ultimate safety net for any state
				}
			}
			s.mu.RUnlock()

			if len(stale) > 0 {
				s.mu.Lock()
				for _, uuid := range stale {
					delete(s.sessions, uuid)
					delete(s.hangups, uuid)
				}
				s.mu.Unlock()
				logger.Warn("Stale sessions reaped", "count", len(stale), "remaining", s.Count())
			}
		}
	}
}
