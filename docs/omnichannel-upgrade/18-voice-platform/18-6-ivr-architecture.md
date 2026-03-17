<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.6 IVR Architecture (Full Media Control via ESL)

## 18.6.1 V1 vs V2 IVR Comparison

| Aspect | V1 (PortSIP) | V2 (FreeSWITCH + GoACD) |
|---|---|---|
| IVR execution | PortSIP Virtual Receptionist (built-in, limited) | GoACD controls FreeSWITCH via ESL (fully programmable) |
| Audio playback | Upload .wav to PortSIP admin console | FreeSWITCH `playback` via ESL (any file path, URL, or TTS) |
| DTMF collection | PortSIP collects, sends webhook | FreeSWITCH `play_and_get_digits` via ESL, result returned to GoACD |
| Routing decision | Omnichannel returns destination in webhook response | GoACD makes decision directly (in-process, zero latency) |
| Multi-step IVR | Multiple webhook round-trips (latency) | Sequential ESL commands in same goroutine (fast) |
| External API calls | Webhook handler calls APIs between steps | GoACD goroutine calls gRPC/REST between ESL commands |
| Dynamic TTS | Not supported | FreeSWITCH `speak` via mod_tts_commandline or mod_unimrcp |
| Real-time ASR | Not supported | FreeSWITCH `mod_audio_fork` → WebSocket → ASR engine (Phase 4) |

## 18.6.2 IVR Flow Execution in GoACD

GoACD reads `FlowDefinition` (same schema as §10.2) from PostgreSQL/Redis and executes IVR nodes by sending ESL commands to FreeSWITCH.

```go
// Pseudo-code: IVR execution in GoACD goroutine
func (s *IVRSession) Execute(conn eslgo.Conn, flow FlowDefinition) (*RoutingHints, error) {
    currentNode := findStartNode(flow)
    if currentNode == nil {
        s.logger.Error("IVR flow has no start node", zap.String("flowId", flow.ID))
        return s.fallbackRoute(conn, flow, "no_start_node")
    }

    variables := make(map[string]any)
    nodeCount := 0
    maxNodes  := 50 // Circuit breaker: prevent infinite loops in misconfigured flows

    for currentNode != nil {
        nodeCount++
        if nodeCount > maxNodes {
            s.logger.Error("IVR flow exceeded max node traversals",
                zap.String("flowId", flow.ID), zap.Int("maxNodes", maxNodes))
            return s.fallbackRoute(conn, flow, "max_nodes_exceeded")
        }

        switch node := currentNode.(type) {
        case *IVRPlayAudioNode:
            _, err := conn.Execute("playback", node.AudioPath, false)
            if err != nil {
                s.logger.Warn("IVR playback failed, continuing flow",
                    zap.String("audio", node.AudioPath), zap.Error(err))
                // Non-fatal: skip audio, continue flow (caller hears silence for this step)
            }

        case *IVRCollectDTMFNode:
            result, err := conn.Execute("play_and_get_digits",
                fmt.Sprintf("%d %d 1 %d # %s %s %s",
                    node.MinDigits, node.MaxDigits, node.Timeout,
                    node.PromptAudio, node.InvalidAudio, node.VariableName), false)
            if err != nil {
                s.logger.Warn("IVR DTMF collect failed", zap.Error(err))
                // Treat as timeout — use default option if configured, else fallback
                if node.TimeoutNextNode != "" {
                    currentNode = findNodeByID(flow, node.TimeoutNextNode)
                    continue
                }
                return s.fallbackRoute(conn, flow, "dtmf_collect_error")
            }
            variables[node.VariableName] = result

        case *IVRMenuNode:
            rawDigit, ok := variables[node.InputVariable]
            if !ok {
                s.logger.Warn("IVR menu: missing input variable",
                    zap.String("var", node.InputVariable))
                return s.fallbackRoute(conn, flow, "missing_menu_input")
            }
            digit, _ := rawDigit.(string)
            nextNode := findNodeByMenuOption(flow, node, digit)
            if nextNode == nil {
                // Invalid DTMF digit — retry up to MaxRetries, then fallback
                retryKey := fmt.Sprintf("menu_retry_%s", node.ID)
                retries, _ := variables[retryKey].(int)
                if retries < node.MaxRetries {
                    variables[retryKey] = retries + 1
                    conn.Execute("playback", node.InvalidOptionAudio, false)
                    currentNode = node // replay this menu node
                    continue
                }
                s.logger.Warn("IVR menu: max retries exceeded", zap.String("nodeId", node.ID))
                return s.fallbackRoute(conn, flow, "menu_max_retries")
            }
            currentNode = nextNode
            continue

        case *IVRHTTPRequestNode:
            ctx, cancel := context.WithTimeout(s.ctx, 5*time.Second)
            resp, err := s.httpClient.Do(node.BuildRequest(variables).WithContext(ctx))
            cancel()
            if err != nil {
                s.logger.Warn("IVR HTTP request failed (circuit breaker or timeout)",
                    zap.String("url", node.URL), zap.Error(err))
                // Play error prompt, skip this node's data, continue flow
                conn.Execute("playback", "/audio/vi/service_unavailable.wav", false)
                // Set response variable to nil — downstream nodes must handle nil
                variables[node.ResponseVariable] = nil
            } else {
                variables[node.ResponseVariable] = parseResponse(resp)
            }

        case *IVRQueueNode:
            // IVR complete — validate queue exists before returning
            if !s.queueManager.Exists(node.QueueID) {
                s.logger.Error("IVR references non-existent queue",
                    zap.String("queueId", node.QueueID))
                return s.fallbackRoute(conn, flow, "invalid_queue")
            }
            return &RoutingHints{
                QueueID:  node.QueueID,
                Priority: node.Priority,
                Skills:   node.RequiredSkills,
                Tags:     evaluateTags(node.Tags, variables),
                Customer: variables["customer"],
            }, nil

        default:
            s.logger.Error("IVR: unknown node type", zap.String("type", fmt.Sprintf("%T", currentNode)))
            // Skip unknown node, continue to next
        }

        currentNode = getNextNode(flow, currentNode)
    }

    // Flow ended without reaching a QueueNode — this is a design error in the IVR flow
    s.logger.Error("IVR flow ended without routing — missing QueueNode at end of path",
        zap.String("flowId", flow.ID), zap.Int("nodesTraversed", nodeCount))
    return s.fallbackRoute(conn, flow, "no_queue_node")
}

// fallbackRoute: guarantee every call gets routed, even when IVR breaks
func (s *IVRSession) fallbackRoute(conn eslgo.Conn, flow FlowDefinition, reason string) (*RoutingHints, error) {
    s.logger.Warn("IVR fallback activated",
        zap.String("flowId", flow.ID),
        zap.String("reason", reason),
        zap.String("callId", s.callID))

    // Publish metric for monitoring/alerting
    s.metrics.IVRFallbackTotal.WithLabelValues(flow.ID, reason).Inc()

    // Play apology announcement to caller
    conn.Execute("playback", "/audio/vi/transfer_to_agent.wav", false)
    // "Xin lỗi, hệ thống đang gặp sự cố. Chúng tôi sẽ chuyển bạn đến tổng đài viên."

    // Route to the flow's configured fallback queue, or system-wide default
    fallbackQueueID := flow.FallbackQueueID
    if fallbackQueueID == "" {
        fallbackQueueID = s.config.DefaultFallbackQueueID // system-wide default
    }

    return &RoutingHints{
        QueueID:  fallbackQueueID,
        Priority: PriorityHigh, // Escalated priority — caller already waited through broken IVR
        Skills:   []string{},   // No skill filter — any available agent
        Tags:     map[string]string{"ivr_fallback": reason, "flow_id": flow.ID},
        Customer: s.variables["customer"], // May be nil if identification also failed
    }, nil
}
```

### IVR Node Types

| Node Type | ESL Command | Description |
|---|---|---|
| `IVRPlayAudioNode` | `playback` | Play audio file (non-fatal on failure) |
| `IVRCollectDTMFNode` | `play_and_get_digits` | Collect DTMF input with prompt |
| `IVRMenuNode` | (logic only) | Route based on collected DTMF digit |
| `IVRHTTPRequestNode` | (HTTP call) | Call external API, store response in variables |
| `IVRQueueNode` | (terminal) | End IVR, return routing hints to queue |

### IVR Fallback Design Rules

1. **Every IVR flow MUST have a `FallbackQueueID`** configured in the Admin UI. Flows without one are rejected at save time.
2. **System-wide default queue** (`GOACD_DEFAULT_FALLBACK_QUEUE`) is the last resort — always exists, always has agents assigned.
3. **Fallback calls get `PriorityHigh`** — they've already had a degraded experience.
4. **Monitoring:** `ivr_fallback_total` Prometheus counter with labels `{flow_id, reason}` triggers alerts when > 0.
5. **Audio errors are non-fatal:** If a `playback` fails (file missing), the IVR continues — silence is better than a dropped call.
6. **DTMF collection failures** try the timeout path first, then fallback.
7. **HTTP node failures** (external API down) play an error prompt, set response to nil, and continue — downstream nodes handle nil gracefully.
8. **Max node traversal** (50) prevents infinite loops from circular flow configurations.

## 18.6.3 IVR Audio Management

```
Audio files stored in SeaweedFS (MinIO):
  /audio/vi/welcome.wav
  /audio/vi/menu_main.wav
  /audio/vi/menu_loan.wav
  /audio/vi/connecting.wav
  /audio/vi/queue_position.wav
  /audio/vi/callback_offer.wav
  /audio/vi/moh/*.wav (music on hold playlist)

FreeSWITCH accesses via:
  Option A: Local filesystem (synced from SeaweedFS via cron)
  Option B: HTTP URL (FreeSWITCH mod_httapi / mod_shout)
    playback http://minio:9000/audio/vi/welcome.wav

Admin uploads audio via Omnichannel Admin UI → SeaweedFS → sync to FS.
```

## 18.6.4 Dynamic TTS (Phase 2+)

```
GoACD can instruct FreeSWITCH to use TTS for dynamic messages:
ESL → speak flite|kal|"Xin chào anh Nguyễn Văn A, số tài khoản của anh là 1234567"

Hoặc sử dụng Google TTS / Azure TTS qua mod_tts_commandline:
  - GoACD gọi TTS API → nhận audio file → save to temp path
  - ESL → playback /tmp/tts_{session_id}.wav
  - Cleanup after call

Phase 4: mod_audio_fork → stream audio to AI service → real-time conversation
```

## 18.6.5 Music on Hold (Queue Waiting)

> **V2.1 Update:** The original MOH design had a **critical data race** — `PlayMOH()` held the ESL `conn` in one goroutine while the queue monitor goroutine also called `conn.Execute("break")` to stop MOH. Two goroutines writing to the same TCP socket = data corruption. Fixed by introducing a **serialized ESL command channel** per call session.

### ESL Command Serialization (mandatory for all call sessions)

```go
// Every call session has a single ESL writer goroutine.
// All other goroutines must send commands through the channel.
// This eliminates all data races on the ESL TCP connection.

type ESLCommand struct {
    App        string
    Args       string
    Block      bool
    ResultChan chan ESLResult
}

type ESLResult struct {
    Result string
    Err    error
}

type CallSession struct {
    callID   string
    conn     eslgo.Conn
    cmdChan  chan ESLCommand  // buffered, size=32
    ctx      context.Context
    cancel   context.CancelFunc
}

// eslWriter is the ONLY goroutine that writes to conn.
// Spawned once per call session.
func (s *CallSession) eslWriter() {
    for {
        select {
        case cmd := <-s.cmdChan:
            result, err := s.conn.Execute(cmd.App, cmd.Args, cmd.Block)
            cmd.ResultChan <- ESLResult{Result: result, Err: err}
        case <-s.ctx.Done():
            return
        }
    }
}

// SendESL is safe to call from any goroutine.
func (s *CallSession) SendESL(app, args string, block bool) (string, error) {
    resultChan := make(chan ESLResult, 1)
    select {
    case s.cmdChan <- ESLCommand{App: app, Args: args, Block: block, ResultChan: resultChan}:
        select {
        case result := <-resultChan:
            return result.Result, result.Err
        case <-s.ctx.Done():
            return "", fmt.Errorf("session cancelled")
        }
    case <-s.ctx.Done():
        return "", fmt.Errorf("session cancelled")
    }
}
```

### MOH Implementation (data-race-free)

```go
// GoACD: khi caller được enqueue
func (q *QueueManager) PlayMOH(session *CallSession, queueConfig QueueConfig, position int) {
    // Play position announcement first
    session.SendESL("playback", "/audio/vi/queue_position.wav", false)
    session.SendESL("speak", fmt.Sprintf("flite|kal|Bạn đang ở vị trí %d", position), false)

    // Loop music on hold until agent available
    // local_stream is a FreeSWITCH feature that loops audio files continuously
    session.SendESL("playback", fmt.Sprintf("local_stream://%s", queueConfig.MOHStream), false)

    // Queue monitor goroutine can safely call:
    //   session.SendESL("break", "", false)
    // This goes through cmdChan → serialized → no data race
}

// Queue drain goroutine (separate from IVR goroutine):
func (q *QueueManager) monitorQueue(session *CallSession, queueID string) {
    ticker := time.NewTicker(500 * time.Millisecond)
    defer ticker.Stop()

    for {
        select {
        case <-session.ctx.Done():
            return
        case <-ticker.C:
            agent, found := q.findAvailableAgent(queueID)
            if found {
                // Stop MOH — safe because SendESL serializes through channel
                session.SendESL("break", "", false)
                // Bridge to agent
                q.deliverToAgent(session, agent)
                return
            }
        }
    }
}
```

**Rule: ALL ESL commands in GoACD MUST go through `session.SendESL()`.** Direct `conn.Execute()` calls are forbidden outside `eslWriter()`. This is enforced by making `conn` unexported in `CallSession`.

---

## Related Files

- [18-7-agent-state-antisync.md](./18-7-agent-state-antisync.md) — Agent State Management & Anti-Desync
- [README.md](./README.md) — Section 18 navigation and overview
