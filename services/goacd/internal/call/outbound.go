package call

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/tpb/goacd/internal/agent"
	"github.com/tpb/goacd/internal/esl"
	"github.com/tpb/goacd/internal/event"
)

// OutboundCallManager handles agent-initiated outbound calls (click-to-call).
type OutboundCallManager struct {
	eslClients []*esl.InboundClient
	agentState *agent.StateManager
	sessions   *SessionStore
	publisher  *event.Publisher
	sipDomain  string
	brokers    []string
	logger     *slog.Logger
}

func NewOutboundCallManager(
	eslClients []*esl.InboundClient,
	agentState *agent.StateManager,
	sessions *SessionStore,
	publisher *event.Publisher,
	sipDomain string,
	brokers []string,
	logger *slog.Logger,
) *OutboundCallManager {
	return &OutboundCallManager{
		eslClients: eslClients,
		agentState: agentState,
		sessions:   sessions,
		publisher:  publisher,
		sipDomain:  sipDomain,
		brokers:    brokers,
		logger:     logger,
	}
}

// MakeCall initiates an outbound call: claim agent → originate to destination.
func (m *OutboundCallManager) MakeCall(ctx context.Context, agentID, destination string) (*Session, error) {
	if len(m.eslClients) == 0 {
		return nil, fmt.Errorf("no FreeSWITCH connection")
	}

	// Step 1: Atomic claim
	interactionID := fmt.Sprintf("out-%s-%d", agentID[:8], time.Now().UnixMilli())
	claimed, err := m.agentState.ClaimAgent(ctx, agentID, interactionID, "voice")
	if err != nil {
		return nil, fmt.Errorf("claim failed: %w", err)
	}
	if !claimed {
		return nil, fmt.Errorf("agent %s not available", agentID)
	}

	// Step 2: Originate call
	// Bridge agent's extension to the external destination
	originateStr := fmt.Sprintf(
		"{origination_caller_id_number=%s,origination_caller_id_name=%s}sofia/internal/%s@%s",
		agentID, agentID, destination, m.sipDomain,
	)

	client := m.eslClients[0]
	resp, err := client.Originate(originateStr, agentID, "default", destination)
	if err != nil {
		// Release on failure
		m.agentState.ReleaseAgent(ctx, agentID, "ready", "voice")
		return nil, fmt.Errorf("originate failed: %w", err)
	}

	// Step 3: Track session
	now := time.Now()
	sess := &Session{
		UUID:          interactionID,
		CallerNumber:  agentID,
		DestNumber:    destination,
		AssignedAgent: agentID,
		State:         "connected",
		StartedAt:     now,
		AnsweredAt:    &now,
	}
	m.sessions.Add(sess)

	m.logger.Info("Outbound call originated",
		"agent", agentID, "dest", destination, "resp", resp)

	return sess, nil
}
