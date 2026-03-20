package routing

import (
	"context"
	"math/rand"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const hashPrefix = "agent:state:"

// ScoredAgent is an agent with computed routing score.
type ScoredAgent struct {
	AgentID string
	Score   float64
}

// Scorer implements 5-factor agent scoring for inbound call routing.
// Factors: Skill match (40), Capacity (20), Idle time (20), Group bonus (10), Random (10).
type Scorer struct {
	rdb *redis.Client
}

func NewScorer(rdb *redis.Client) *Scorer {
	return &Scorer{rdb: rdb}
}

// ScoreAgents scores available agents for a queue and returns top-N sorted by score desc.
func (s *Scorer) ScoreAgents(ctx context.Context, agents []string, queueSkills []string, queueGroup string, topN int) []ScoredAgent {
	if len(agents) == 0 {
		return nil
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	scored := make([]ScoredAgent, 0, len(agents))

	for _, agentID := range agents {
		state, err := s.rdb.HGetAll(ctx, hashPrefix+agentID).Result()
		if err != nil || len(state) == 0 {
			continue
		}

		score := 0.0

		// Factor 1: Skill match (40 points)
		agentSkills := strings.Split(state["skills"], ",")
		if len(queueSkills) > 0 {
			matched := 0
			for _, qs := range queueSkills {
				for _, as := range agentSkills {
					if strings.TrimSpace(as) == strings.TrimSpace(qs) {
						matched++
						break
					}
				}
			}
			score += float64(matched) / float64(len(queueSkills)) * 40.0
		} else {
			score += 40.0 // no skill requirement → full score
		}

		// Factor 2: Capacity (20 points) — lower voice_count = higher score
		voiceCount, _ := strconv.Atoi(state["voice_count"])
		voiceMax, _ := strconv.Atoi(state["voice_max"])
		if voiceMax <= 0 {
			voiceMax = 1
		}
		remaining := float64(voiceMax-voiceCount) / float64(voiceMax)
		if remaining < 0 {
			remaining = 0
		}
		score += remaining * 20.0

		// Factor 3: Idle time (20 points) — longer idle = higher score (max 5 min)
		if changedAt, ok := state["status_changed_at"]; ok {
			if ts, err := strconv.ParseInt(changedAt, 10, 64); err == nil {
				idleSec := float64(time.Now().UnixMilli()-ts) / 1000.0
				idleFactor := idleSec / 300.0 // normalize to 5 min
				if idleFactor > 1.0 {
					idleFactor = 1.0
				}
				score += idleFactor * 20.0
			}
		}

		// Factor 4: Group bonus (10 points)
		agentGroups := strings.Split(state["groups"], ",")
		if queueGroup != "" {
			for _, g := range agentGroups {
				if strings.TrimSpace(g) == queueGroup {
					score += 10.0
					break
				}
			}
		}

		// Factor 5: Random tiebreaker (0-10 points)
		score += rng.Float64() * 10.0

		scored = append(scored, ScoredAgent{AgentID: agentID, Score: score})
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].Score > scored[j].Score
	})

	if topN > 0 && len(scored) > topN {
		scored = scored[:topN]
	}
	return scored
}
