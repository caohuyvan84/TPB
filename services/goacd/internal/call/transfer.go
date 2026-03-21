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

type TransferType string

const (
	TransferBlind    TransferType = "blind"
	TransferAttended TransferType = "attended"
)

// TransferManager handles blind and attended transfers with agent state management.
type TransferManager struct {
	eslClients []esl.ESLClient
	agentState *agent.StateManager
	publisher  *event.Publisher
	sipDomain  string
	brokers    []string
	logger     *slog.Logger
}

func NewTransferManager(
	eslClients []esl.ESLClient,
	agentState *agent.StateManager,
	publisher *event.Publisher,
	sipDomain string,
	brokers []string,
	logger *slog.Logger,
) *TransferManager {
	return &TransferManager{
		eslClients: eslClients,
		agentState: agentState,
		publisher:  publisher,
		sipDomain:  sipDomain,
		brokers:    brokers,
		logger:     logger,
	}
}

func (m *TransferManager) esl() esl.ESLClient {
	if len(m.eslClients) == 0 {
		return nil
	}
	return m.eslClients[0]
}

func (m *TransferManager) pub(ctx context.Context, topic string, data interface{}, key string) {
	m.publisher.Publish(ctx, m.brokers, topic, data, key)
}

// BlindTransfer: claim target agent → uuid_transfer → 20s no-answer fallback → reconnect original.
func (m *TransferManager) BlindTransfer(
	ctx context.Context,
	callUUID string,
	targetAgentID string,
	originalAgentID string,
) error {
	client := m.esl()
	if client == nil {
		return fmt.Errorf("no ESL connection")
	}

	// Step 1: Claim target agent
	claimed, err := m.agentState.ClaimAgent(ctx, targetAgentID, callUUID, "voice")
	if err != nil || !claimed {
		return fmt.Errorf("target agent %s not available", targetAgentID)
	}

	// Publish transfer initiated
	m.pub(ctx, "call.transferred", map[string]interface{}{
		"callId": callUUID, "fromAgent": originalAgentID, "toAgent": targetAgentID,
		"transferType": "blind", "status": "initiated",
	}, callUUID)

	// Step 2: uuid_transfer
	dest := fmt.Sprintf("sofia/internal/%s@%s", targetAgentID, m.sipDomain)
	_, err = client.API(fmt.Sprintf("uuid_transfer %s %s", callUUID, dest))
	if err != nil {
		m.agentState.ReleaseAgent(ctx, targetAgentID, "ready", "voice")
		return fmt.Errorf("blind transfer failed: %w", err)
	}

	// Release original agent → ACW
	m.agentState.ReleaseAgent(ctx, originalAgentID, "acw", "voice")

	m.logger.Info("Blind transfer executed", "uuid", callUUID, "from", originalAgentID, "to", targetAgentID)

	// Step 3: Monitor 20s no-answer — fallback to original agent
	go m.monitorBlindTransfer(ctx, client, callUUID, targetAgentID, originalAgentID)

	return nil
}

// monitorBlindTransfer checks if target answers within 20s; if not, reconnects original agent.
func (m *TransferManager) monitorBlindTransfer(
	ctx context.Context,
	client esl.ESLClient,
	callUUID, targetAgentID, originalAgentID string,
) {
	timer := time.NewTimer(20 * time.Second)
	defer timer.Stop()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-timer.C:
			// Timeout — target didn't answer. Reconnect to original agent.
			m.logger.Warn("Blind transfer no-answer, reconnecting original",
				"uuid", callUUID, "target", targetAgentID, "original", originalAgentID)

			m.agentState.ReleaseAgent(ctx, targetAgentID, "ready", "voice")

			// Transfer caller back to original agent
			dest := fmt.Sprintf("sofia/internal/%s@%s", originalAgentID, m.sipDomain)
			client.API(fmt.Sprintf("uuid_transfer %s %s", callUUID, dest))

			// Re-claim original
			m.agentState.ClaimAgent(ctx, originalAgentID, callUUID, "voice")
			m.agentState.TransitionToOnCall(ctx, originalAgentID)

			m.pub(ctx, "call.transferred", map[string]interface{}{
				"callId": callUUID, "fromAgent": targetAgentID, "toAgent": originalAgentID,
				"transferType": "blind", "status": "fallback_no_answer",
			}, callUUID)
			return

		case <-ticker.C:
			// Check if target answered (call still exists + target on_call)
			exists, _ := client.UUIDExists(callUUID)
			if !exists {
				// Call ended during transfer
				m.agentState.ReleaseAgent(ctx, targetAgentID, "ready", "voice")
				return
			}
			state, _ := m.agentState.GetState(ctx, targetAgentID)
			if state["status"] == agent.StateOnCall {
				// Target answered — transfer successful
				m.pub(ctx, "call.transferred", map[string]interface{}{
					"callId": callUUID, "fromAgent": originalAgentID, "toAgent": targetAgentID,
					"transferType": "blind", "status": "completed",
				}, callUUID)
				return
			}

		case <-ctx.Done():
			return
		}
	}
}

// AttendedTransfer: hold caller → originate consult to target → 300s timeout.
func (m *TransferManager) AttendedTransfer(
	ctx context.Context,
	callerUUID string,
	agentAExtension string,
	agentBExtension string,
) (consultUUID string, err error) {
	client := m.esl()
	if client == nil {
		return "", fmt.Errorf("no ESL connection")
	}

	// Claim target agent
	claimed, claimErr := m.agentState.ClaimAgent(ctx, agentBExtension, callerUUID, "voice")
	if claimErr != nil || !claimed {
		return "", fmt.Errorf("target agent %s not available", agentBExtension)
	}

	// Hold caller
	if _, err = client.API(fmt.Sprintf("uuid_hold on %s", callerUUID)); err != nil {
		m.agentState.ReleaseAgent(ctx, agentBExtension, "ready", "voice")
		return "", fmt.Errorf("hold failed: %w", err)
	}

	// Originate consult
	consultID := fmt.Sprintf("consult-%s", callerUUID[:8])
	consultDest := fmt.Sprintf(
		"{origination_caller_id_number=%s,origination_uuid=%s}sofia/internal/%s@%s",
		agentAExtension, consultID, agentBExtension, m.sipDomain,
	)
	if _, err = client.API(fmt.Sprintf("originate %s &park()", consultDest)); err != nil {
		client.API(fmt.Sprintf("uuid_hold off %s", callerUUID))
		m.agentState.ReleaseAgent(ctx, agentBExtension, "ready", "voice")
		return "", fmt.Errorf("consult originate failed: %w", err)
	}

	m.pub(ctx, "call.transferred", map[string]interface{}{
		"callId": callerUUID, "fromAgent": agentAExtension, "toAgent": agentBExtension,
		"transferType": "attended", "status": "consulting",
	}, callerUUID)

	m.logger.Info("Attended transfer: consulting", "caller", callerUUID, "consult", consultID, "agentB", agentBExtension)

	// 300s consultation timeout
	go func() {
		select {
		case <-time.After(300 * time.Second):
			m.logger.Warn("Attended transfer consultation timeout, auto-completing",
				"caller", callerUUID, "consult", consultID)
			m.CompleteAttendedTransfer(ctx, callerUUID, consultID, agentAExtension, agentBExtension)
		case <-ctx.Done():
		}
	}()

	return consultID, nil
}

// CompleteAttendedTransfer bridges caller to Agent B, releases Agent A.
func (m *TransferManager) CompleteAttendedTransfer(
	ctx context.Context,
	callerUUID, consultUUID, agentAID, agentBID string,
) error {
	client := m.esl()
	if client == nil {
		return fmt.Errorf("no ESL connection")
	}

	client.API(fmt.Sprintf("uuid_hold off %s", callerUUID))

	if _, err := client.UUIDBridge(callerUUID, consultUUID); err != nil {
		return fmt.Errorf("complete transfer bridge failed: %w", err)
	}

	// Release Agent A → ACW, Agent B stays on_call
	m.agentState.ReleaseAgent(ctx, agentAID, "acw", "voice")
	m.agentState.TransitionToOnCall(ctx, agentBID)

	m.pub(ctx, "call.transferred", map[string]interface{}{
		"callId": callerUUID, "fromAgent": agentAID, "toAgent": agentBID,
		"transferType": "attended", "status": "completed",
	}, callerUUID)

	m.logger.Info("Attended transfer completed", "caller", callerUUID, "consult", consultUUID)
	return nil
}

// CancelAttendedTransfer cancels consult and returns to original call.
func (m *TransferManager) CancelAttendedTransfer(
	ctx context.Context,
	callerUUID, consultUUID, agentBID string,
) error {
	client := m.esl()
	if client == nil {
		return fmt.Errorf("no ESL connection")
	}

	client.UUIDKill(consultUUID, "ORIGINATOR_CANCEL")
	client.API(fmt.Sprintf("uuid_hold off %s", callerUUID))

	m.agentState.ReleaseAgent(ctx, agentBID, "ready", "voice")

	m.pub(ctx, "call.transferred", map[string]interface{}{
		"callId": callerUUID, "fromAgent": "", "toAgent": agentBID,
		"transferType": "attended", "status": "cancelled",
	}, callerUUID)

	m.logger.Info("Attended transfer cancelled", "caller", callerUUID, "consult", consultUUID)
	return nil
}
