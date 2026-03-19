package call

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/tpb/goacd/internal/esl"
)

// TransferType defines the kind of transfer.
type TransferType string

const (
	TransferBlind    TransferType = "blind"
	TransferAttended TransferType = "attended"
)

// TransferManager handles blind and attended transfers via ESL.
type TransferManager struct {
	eslClients []*esl.InboundClient
	sipDomain  string
	logger     *slog.Logger
}

func NewTransferManager(eslClients []*esl.InboundClient, sipDomain string, logger *slog.Logger) *TransferManager {
	return &TransferManager{eslClients: eslClients, sipDomain: sipDomain, logger: logger}
}

func (m *TransferManager) esl() *esl.InboundClient {
	if len(m.eslClients) == 0 {
		return nil
	}
	return m.eslClients[0]
}

// BlindTransfer transfers a call to a destination without consultation.
// The original caller is transferred directly.
func (m *TransferManager) BlindTransfer(ctx context.Context, callUUID, destination string) error {
	client := m.esl()
	if client == nil {
		return fmt.Errorf("no ESL connection")
	}

	dest := fmt.Sprintf("sofia/internal/%s@%s", destination, m.sipDomain)
	resp, err := client.API(fmt.Sprintf("uuid_transfer %s %s", callUUID, dest))
	if err != nil {
		return fmt.Errorf("blind transfer failed: %w", err)
	}

	m.logger.Info("Blind transfer executed", "uuid", callUUID, "dest", destination, "resp", resp)
	return nil
}

// AttendedTransfer performs a consult-first transfer:
// 1. Agent A puts caller on hold
// 2. Agent A calls Agent B (consult leg)
// 3. Agent A talks to Agent B
// 4. Agent A completes transfer → caller connected to Agent B
//
// Implementation: originate consult leg, then uuid_bridge caller to consult.
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

	// Step 1: Put caller on hold (park)
	_, err = client.API(fmt.Sprintf("uuid_hold on %s", callerUUID))
	if err != nil {
		return "", fmt.Errorf("hold failed: %w", err)
	}

	// Step 2: Originate consult call from Agent A to Agent B
	consultDest := fmt.Sprintf(
		"{origination_caller_id_number=%s,origination_uuid=consult-%s}sofia/internal/%s@%s",
		agentAExtension, callerUUID[:8], agentBExtension, m.sipDomain,
	)
	resp, err := client.API(fmt.Sprintf("originate %s &park()", consultDest))
	if err != nil {
		// Unhold caller on failure
		client.API(fmt.Sprintf("uuid_hold off %s", callerUUID))
		return "", fmt.Errorf("consult originate failed: %w", err)
	}

	consultID := fmt.Sprintf("consult-%s", callerUUID[:8])
	m.logger.Info("Consult call originated", "caller", callerUUID, "consult", consultID, "agentB", agentBExtension, "resp", resp)

	return consultID, nil
}

// CompleteAttendedTransfer bridges the original caller to Agent B.
func (m *TransferManager) CompleteAttendedTransfer(ctx context.Context, callerUUID, consultUUID string) error {
	client := m.esl()
	if client == nil {
		return fmt.Errorf("no ESL connection")
	}

	// Unhold the original caller
	client.API(fmt.Sprintf("uuid_hold off %s", callerUUID))

	// Bridge caller to consult leg (Agent B)
	resp, err := client.UUIDBridge(callerUUID, consultUUID)
	if err != nil {
		return fmt.Errorf("complete transfer bridge failed: %w", err)
	}

	m.logger.Info("Attended transfer completed", "caller", callerUUID, "consult", consultUUID, "resp", resp)
	return nil
}

// CancelAttendedTransfer cancels the consult and returns to original caller.
func (m *TransferManager) CancelAttendedTransfer(ctx context.Context, callerUUID, consultUUID string) error {
	client := m.esl()
	if client == nil {
		return fmt.Errorf("no ESL connection")
	}

	// Kill consult leg
	client.UUIDKill(consultUUID, "ORIGINATOR_CANCEL")

	// Unhold original caller
	client.API(fmt.Sprintf("uuid_hold off %s", callerUUID))

	m.logger.Info("Attended transfer cancelled", "caller", callerUUID, "consult", consultUUID)
	return nil
}
