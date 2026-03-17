package call

import "time"

// CDR represents a Call Detail Record.
type CDR struct {
	CallID        string    `json:"callId"`
	CallerNumber  string    `json:"callerNumber"`
	CallerName    string    `json:"callerName"`
	DestNumber    string    `json:"destNumber"`
	Queue         string    `json:"queue"`
	AssignedAgent string    `json:"assignedAgent"`
	IVRSelection  string    `json:"ivrSelection"`
	StartedAt     time.Time `json:"startedAt"`
	AnsweredAt    *time.Time `json:"answeredAt,omitempty"`
	EndedAt       time.Time `json:"endedAt"`
	DurationMs    int64     `json:"durationMs"`
	TalkTimeMs    int64     `json:"talkTimeMs"`
	WaitTimeMs    int64     `json:"waitTimeMs"`
	HangupCause   string    `json:"hangupCause"`
	RecordingPath string    `json:"recordingPath,omitempty"`
	Direction     string    `json:"direction"` // inbound, outbound
}

// BuildCDR creates a CDR from a completed call session.
func BuildCDR(sess *Session) CDR {
	now := time.Now()
	endedAt := now
	if sess.EndedAt != nil {
		endedAt = *sess.EndedAt
	}

	cdr := CDR{
		CallID:        sess.UUID,
		CallerNumber:  sess.CallerNumber,
		CallerName:    sess.CallerName,
		DestNumber:    sess.DestNumber,
		Queue:         sess.Queue,
		AssignedAgent: sess.AssignedAgent,
		IVRSelection:  sess.IVRSelection,
		StartedAt:     sess.StartedAt,
		AnsweredAt:    sess.AnsweredAt,
		EndedAt:       endedAt,
		DurationMs:    endedAt.Sub(sess.StartedAt).Milliseconds(),
		HangupCause:   "NORMAL_CLEARING",
		RecordingPath: sess.RecordingPath,
		Direction:     "inbound",
	}

	if sess.AnsweredAt != nil {
		cdr.TalkTimeMs = endedAt.Sub(*sess.AnsweredAt).Milliseconds()
		cdr.WaitTimeMs = sess.AnsweredAt.Sub(sess.StartedAt).Milliseconds()
	} else {
		cdr.WaitTimeMs = cdr.DurationMs
	}

	return cdr
}
