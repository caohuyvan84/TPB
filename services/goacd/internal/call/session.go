package call

import (
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
