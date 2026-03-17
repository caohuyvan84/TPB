package call

import (
	"sync"
	"time"
)

// Session tracks an active call.
type Session struct {
	UUID          string
	CallerNumber  string
	CallerName    string
	DestNumber    string
	Queue         string
	AssignedAgent string
	State         string // "ivr", "queued", "ringing", "connected", "ended"
	StartedAt     time.Time
	AnsweredAt    *time.Time
	EndedAt       *time.Time
	IVRSelection  string
	RecordingPath string
}

// SessionStore is a thread-safe in-memory store of active call sessions.
type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
}

func NewSessionStore() *SessionStore {
	return &SessionStore{sessions: make(map[string]*Session)}
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
