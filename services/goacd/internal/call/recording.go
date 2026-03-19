package call

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/tpb/goacd/internal/esl"
)

// RecordingManager controls call recording via FreeSWITCH ESL.
type RecordingManager struct {
	eslClients   []*esl.InboundClient
	recordingDir string
	logger       *slog.Logger
}

func NewRecordingManager(eslClients []*esl.InboundClient, recordingDir string, logger *slog.Logger) *RecordingManager {
	return &RecordingManager{eslClients: eslClients, recordingDir: recordingDir, logger: logger}
}

func (m *RecordingManager) esl() *esl.InboundClient {
	if len(m.eslClients) == 0 {
		return nil
	}
	return m.eslClients[0]
}

// StartRecording begins recording a call (both legs).
// Returns the recording file path.
func (m *RecordingManager) StartRecording(ctx context.Context, callUUID string) (string, error) {
	client := m.esl()
	if client == nil {
		return "", fmt.Errorf("no ESL connection")
	}

	// Generate unique filename
	ts := time.Now().Format("20060102-150405")
	filename := fmt.Sprintf("%s/%s_%s.wav", m.recordingDir, ts, callUUID[:12])

	// Use record_session to record both sides
	resp, err := client.API(fmt.Sprintf("uuid_record %s start %s", callUUID, filename))
	if err != nil {
		return "", fmt.Errorf("start recording failed: %w", err)
	}

	m.logger.Info("Recording started", "uuid", callUUID, "file", filename, "resp", resp)
	return filename, nil
}

// StopRecording stops an active recording.
func (m *RecordingManager) StopRecording(ctx context.Context, callUUID, filename string) error {
	client := m.esl()
	if client == nil {
		return fmt.Errorf("no ESL connection")
	}

	resp, err := client.API(fmt.Sprintf("uuid_record %s stop %s", callUUID, filename))
	if err != nil {
		return fmt.Errorf("stop recording failed: %w", err)
	}

	m.logger.Info("Recording stopped", "uuid", callUUID, "file", filename, "resp", resp)
	return nil
}

// PauseRecording temporarily pauses recording (for PCI compliance, etc.).
func (m *RecordingManager) PauseRecording(ctx context.Context, callUUID, filename string) error {
	client := m.esl()
	if client == nil {
		return fmt.Errorf("no ESL connection")
	}

	_, err := client.API(fmt.Sprintf("uuid_record %s mask %s", callUUID, filename))
	return err
}

// ResumeRecording resumes a paused recording.
func (m *RecordingManager) ResumeRecording(ctx context.Context, callUUID, filename string) error {
	client := m.esl()
	if client == nil {
		return fmt.Errorf("no ESL connection")
	}

	_, err := client.API(fmt.Sprintf("uuid_record %s unmask %s", callUUID, filename))
	return err
}
