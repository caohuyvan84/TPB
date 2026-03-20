package ivr

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/tpb/goacd/internal/esl"
)

// MenuOption maps a DTMF digit to a queue name.
type MenuOption struct {
	Digit string
	Queue string
	Label string
}

// SimpleIVR implements a basic IVR: answer → play welcome → collect digit → route to queue.
type SimpleIVR struct {
	WelcomeFile  string
	MenuFile     string
	InvalidFile  string
	Options      []MenuOption
	DefaultQueue string
	Logger       *slog.Logger

	// OnDigit is called when a DTMF digit is collected. Used for call timeline events.
	OnDigit func(digit string, menuLabel string, attempts int)
}

// Run executes the IVR flow on an outbound ESL connection.
// Returns the selected queue name.
func (ivr *SimpleIVR) Run(ctx context.Context, conn *esl.OutboundConn) (string, error) {
	// Step 1: Answer the call
	if _, err := conn.Answer(); err != nil {
		return "", fmt.Errorf("ivr answer: %w", err)
	}

	// Step 2: Play welcome message
	if ivr.WelcomeFile != "" {
		conn.Playback(ivr.WelcomeFile)
	}

	// Step 3: Collect DTMF digit (menu)
	menuFile := ivr.MenuFile
	if menuFile == "" {
		menuFile = "ivr/ivr-welcome_to_company.wav"
	}
	invalidFile := ivr.InvalidFile
	if invalidFile == "" {
		invalidFile = "ivr/ivr-that_was_an_invalid_entry.wav"
	}

	// play_and_get_digits: min=1, max=1, tries=3, timeout=5000ms, terminators=#
	resp, err := conn.PlayAndGetDigits(1, 1, 3, 5000, "#", menuFile, invalidFile, "ivr_selection")
	if err != nil {
		ivr.Logger.Warn("IVR digit collection failed", "err", err)
	}

	digit := parseDigitFromResponse(resp)
	ivr.Logger.Info("IVR selection", "digit", digit, "caller", conn.CallerNumber())

	// Step 4: Map digit to queue + notify callback
	for _, opt := range ivr.Options {
		if opt.Digit == digit {
			if ivr.OnDigit != nil {
				ivr.OnDigit(digit, opt.Label, 1)
			}
			return opt.Queue, nil
		}
	}

	// Default queue — digit didn't match any option
	if ivr.OnDigit != nil {
		ivr.OnDigit(digit, "default", 1)
	}

	if ivr.DefaultQueue != "" {
		return ivr.DefaultQueue, nil
	}

	return "default", nil
}

func parseDigitFromResponse(resp string) string {
	for _, c := range resp {
		if c >= '1' && c <= '9' {
			return string(c)
		}
	}
	return "1"
}
