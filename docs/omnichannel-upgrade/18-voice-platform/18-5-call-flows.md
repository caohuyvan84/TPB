<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.5 Call Flow Designs

## 18.5.1 Inbound PSTN → IVR → Queue → Agent

```
                                                        Time
[1] PSTN Call → SIP Trunk → Kamailio                    0s
    │ Kamailio: authenticate trunk, apply DID routing
    │ dispatcher → FreeSWITCH
    │
[2] FreeSWITCH receives INVITE                          ~50ms
    │ Dialplan match → socket goacd:9090 async full
    │ FreeSWITCH opens TCP connection to GoACD
    │
[3] GoACD receives call (outbound ESL)                   ~100ms
    │ Parse channel vars: caller_id, destination (DID)
    │ Lookup DID → IVR flow ID (Redis/PostgreSQL)
    │ Call Customer Service (gRPC): identify caller
    │   → customer_id, name, VIP status, account info
    │
[4] GoACD executes IVR flow                              ~200ms
    │ ESL → FreeSWITCH: answer
    │ ESL → FreeSWITCH: playback /audio/vi/welcome.wav
    │   "Chào mừng quý khách đến với TPBank"
    │ ESL → FreeSWITCH: play_and_get_digits 1 1 1 5000 # /audio/vi/menu.wav
    │   "Nhấn 1: Tiết kiệm, Nhấn 2: Vay vốn, Nhấn 0: Gặp tổng đài viên"
    │ FreeSWITCH collects DTMF → returns digit to GoACD
    │
[5] GoACD processes IVR result                           ~5-10s
    │ DTMF = "2" → Vay vốn
    │ IVR flow → set routing hints: skills=["loan"], priority="high"
    │ IVR flow → HTTP node: call BFSI service (check customer loan status)
    │ IVR flow → end node: route to queue "loan_processing"
    │
[6] GoACD: Queue Selection                               ~10-12s
    │ Find queue "loan_processing" in Redis
    │ Create queue entry (ZADD queue:{id}:entries)
    │ Set SLA timer (loan_processing.sla = 60s)
    │
[7] GoACD: Agent Scoring & Selection                     ~10-12s
    │ Query Redis: agent:available:voice ∩ agent:skills:loan
    │ Score candidates using §7.2 algorithm:
    │   agent-007: skill=0.9 × load=0.8 × idle=0.7 × group=1.0 × affinity=1.0 = 0.88
    │   agent-003: skill=0.7 × load=0.9 × idle=0.5 × group=1.0 × affinity=0.0 = 0.67
    │   agent-012: skill=0.8 × load=0.6 × idle=0.9 × group=0.5 × affinity=0.0 = 0.62
    │ Top-3 candidates stored in Redis: routing:attempt:{callId}
    │
[8] GoACD: Deliver call to agent-007                     ~12s
    │ Atomic claim: validateAndClaim(agent-007, voice) → true
    │ ESL → FreeSWITCH: playback /audio/vi/connecting.wav (once)
    │ ESL → FreeSWITCH: bridge sofia/internal/1007@${domain}
    │   (1007 = agent-007's extension, registered via Kamailio)
    │ Start no-answer timer: 20s
    │
    │ ── Meanwhile: ──
    │ Publish Kafka: call.routing { callId, agentId, interactionId }
    │ gRPC → Omnichannel: send call metadata to Agent Desktop
    │   { caller: "0901234567", customer: "Nguyễn Văn A", product: "Loan",
    │     ivr_selections: ["2"], queue: "loan_processing", wait_time: "12s" }
    │
[9a] Agent-007 answers                                   ~15-25s
    │ FreeSWITCH: CHANNEL_ANSWER event → GoACD
    │ GoACD: update agent state → on-call
    │ GoACD: update interaction status → active
    │ GoACD: start recording (ESL → record_session)
    │ Publish Kafka: call.answered { callId, agentId, waitTime }
    │
[9b] Agent-007 does NOT answer (20s timeout)             ~32s
    │ GoACD: no-answer timer fires
    │ → See §18.8.3 for re-routing flow
    │
[10] Call ends                                            Variable
    │ FreeSWITCH: CHANNEL_HANGUP event → GoACD
    │ GoACD: stop recording
    │ GoACD: set agent state → wrap-up (if auto-ACW enabled)
    │ GoACD: generate CDR → publish Kafka: call.cdr
    │ GoACD: dequeue interaction
    │ After ACW timer (configurable) → set agent state → ready
```

## 18.5.2 WebRTC Agent Registration & Incoming Call

```
[1] Agent login (Agent Desktop)
    │ Frontend: SIP.js UserAgent.start()
    │ SIP REGISTER → WSS (port 5066) → Kamailio
    │ Kamailio: authenticate, store in usrloc
    │ rtpengine: not involved (REGISTER has no media)
    │
    │ GoACD (inbound ESL): receives sofia::register event
    │   → Agent extension 1007 registered
    │   → Check: is agent-007 mapped to ext 1007? Yes
    │   → Agent-007 SIP = registered
    │
[2] Agent sets "Ready" in Agent Desktop
    │ WebSocket → Agent Service → Kafka: agent.status.changed
    │ GoACD (Kafka consumer): receives event
    │   → Set voice_status = ready in Redis
    │   → SADD agent:available:voice agent-007
    │   → Agent-007 is now available for calls
    │
[3] Incoming call routed to agent-007 (from §18.5.1 step [8])
    │ GoACD (outbound ESL for the inbound call):
    │   ESL → bridge sofia/internal/1007@${domain}
    │
[4] Kamailio receives INVITE for 1007
    │ Lookup usrloc → 1007 is registered via WSS from Agent Desktop
    │ Proxy INVITE to Agent Desktop's WSS connection
    │ rtpengine: insert into media path (SDP rewrite)
    │   Offer side: RTP → SRTP+ICE (for WebRTC)
    │
[5] Agent Desktop receives INVITE via SIP.js
    │ SIP.js: incoming call event
    │ Agent Desktop UI: show incoming call popup
    │   (with metadata pushed via WebSocket from GoACD)
    │ Agent clicks "Answer"
    │ SIP.js: send 200 OK
    │
[6] Media established
    │ rtpengine: bridge RTP (FS) ↔ SRTP (Browser)
    │ Caller audio → FS → rtpengine → Browser
    │ Agent audio → Browser → rtpengine → FS → Caller
```

## 18.5.3 Outbound Call (Agent → Customer)

> **V2.1 Update:** Added atomic claim BEFORE originate to prevent race condition.
> Without this, during the 10-30s window between MakeCall validation and customer
> answer, the agent remains in `agent:available:voice` with `voice_status = ready`,
> allowing the routing engine to assign an inbound call to the same agent.
> The fix mirrors the inbound claim pattern (§18.7.5): atomically set status +
> remove from available set before initiating the outbound leg.

```
[1] Agent clicks "Make Call" in Agent Desktop
    │ REST/gRPC → CTI Adapter → GoACD: MakeCall(from=1007, to=0901234567)
    │
[2] GoACD: Atomic Claim (MUST happen before originate)
    │ Run outbound_claim.lua (see below):
    │   Check: voice_status = ready, voice_count < max_voice
    │   Atomic set: voice_status = "originating"
    │   Atomic: voice_count += 1
    │   SREM agent:available:voice agent-007
    │ If claim fails → return error to Agent Desktop ("agent not available")
    │
[3] GoACD: Create call session + originate
    │ ESL (inbound) → FreeSWITCH: originate
    │   {origination_caller_id_number=18001234}
    │   sofia/gateway/pstn_trunk/0901234567
    │   &socket(goacd:9090 async full)
    │
[4] FreeSWITCH:
    │ Send INVITE to PSTN via Kamailio → SIP trunk
    │ Also connect to GoACD via outbound ESL
    │
[5] GoACD (outbound ESL):
    │ Wait for CHANNEL_ANSWER or timeout (configurable, default 60s)
    │
    ├─ [5a] Customer answers:
    │   │ Bridge to agent's extension:
    │   │   ESL → bridge sofia/internal/1007@${domain}
    │   │ Update agent state: voice_status → on_call
    │   │ Start recording (ESL → record_session)
    │   │ Publish Kafka: call.outbound.answered { callId, agentId, destination }
    │
    ├─ [5b] Customer does NOT answer (timeout / busy / rejected):
    │   │ Run outbound_release.lua:
    │   │   voice_count -= 1
    │   │   voice_status → ready
    │   │   SADD agent:available:voice agent-007
    │   │ Publish Kafka: call.outbound.failed { callId, agentId, cause }
    │   │ Notify Agent Desktop: "Call failed — {cause}"
    │
    └─ [5c] Originate itself fails (FS error, trunk down):
        │ Same as [5b] — release claim, notify agent
        │ Log error for ops alerting
```

**Lua script: outbound_claim.lua**

```lua
-- Redis Lua script: outbound_claim.lua
-- Atomically claims agent for outbound call, preventing inbound routing
-- KEYS[1] = agent:available:voice
-- KEYS[2] = agent:state:{agentId}
-- ARGV[1] = agentId
-- ARGV[2] = callId
--
-- Returns: 1 = claimed, 0 = rejected (agent not ready or at capacity)

local availableKey = KEYS[1]
local stateKey     = KEYS[2]
local agentId      = ARGV[1]
local callId       = ARGV[2]

-- Check 1: status must be "ready"
local status = redis.call('HGET', stateKey, 'voice_status')
if status ~= 'ready' then
    return 0
end

-- Check 2: current count < max capacity
local count    = tonumber(redis.call('HGET', stateKey, 'voice_count') or '0')
local maxCount = tonumber(redis.call('HGET', stateKey, 'max_voice') or '1')
if count >= maxCount then
    return 0
end

-- All checks passed — atomic claim for outbound
redis.call('HINCRBY', stateKey, 'voice_count', 1)
redis.call('HSET', stateKey, 'voice_status', 'originating')
redis.call('HSET', stateKey, 'voice_claimed_by', callId)
redis.call('HSET', stateKey, 'voice_claimed_at', redis.call('TIME')[1])

-- Remove from available set — agent is now busy
redis.call('SREM', availableKey, agentId)

return 1
```

**Lua script: outbound_release.lua**

```lua
-- Redis Lua script: outbound_release.lua
-- Releases agent claim when outbound call fails or is not answered
-- KEYS[1] = agent:available:voice
-- KEYS[2] = agent:state:{agentId}
-- ARGV[1] = agentId
--
-- Returns: 1 = released, 0 = agent was not in originating state (unexpected)

local availableKey = KEYS[1]
local stateKey     = KEYS[2]
local agentId      = ARGV[1]

local status = redis.call('HGET', stateKey, 'voice_status')
if status ~= 'originating' then
    -- Agent already transitioned (e.g., manually went not-ready) — don't override
    return 0
end

local count = tonumber(redis.call('HINCRBY', stateKey, 'voice_count', -1))
if count < 0 then
    redis.call('HSET', stateKey, 'voice_count', 0)
    count = 0
end

redis.call('HSET', stateKey, 'voice_status', 'ready')
redis.call('HDEL', stateKey, 'voice_claimed_by')
redis.call('HDEL', stateKey, 'voice_claimed_at')
redis.call('HSET', stateKey, 'last_state_change', redis.call('TIME')[1])

-- Re-add to available set
redis.call('SADD', availableKey, agentId)

return 1
```

**Agent state diagram update** — new `originating` state:

```
                  MakeCall (outbound_claim.lua)
    READY ──────────────────────────────────────► ORIGINATING
      ▲                                              │
      │  outbound_release.lua                        │ Customer answers
      │  (fail/no-answer/timeout)                    │ (voice_status → on_call)
      │                                              ▼
      └──────────── WRAP-UP ◄─────────────────── ON-CALL
                       │                          (hangup)
                       │ ACW timer expires
                       ▼
                     READY
```

## 18.5.4 Call Transfer (Comprehensive — V2.2)

> **V2.2 Update:** Expanded from basic agent-to-agent transfer to cover all transfer
> scenarios: agent-to-agent, agent-to-queue, agent-to-external, attended transfer
> cancel/abort, and transfer no-answer re-routing. Each scenario includes full
> state management and error handling.

**Transfer target resolution:**

```
TransferCallRequest received by GoACD:
  ├─ to_agent_id set  → §18.5.4.1 Transfer to Agent
  ├─ to_queue_id set  → §18.5.4.2 Transfer to Queue
  └─ to_number set    → §18.5.4.3 Transfer to External Number
  (exactly ONE must be set — GoACD validates, rejects otherwise)
```

### 18.5.4.1 Transfer to Agent (Blind)

```
[1] Agent-007 clicks "Transfer" → selects agent-003
    │ Agent Desktop → CTI Adapter → gRPC → GoACD:
    │   TransferCall(call_id, from=agent-007, to_agent_id=agent-003, type="blind")
    │
[2] GoACD: Validate + Claim
    │ Check: agent-007 is on-call with this call_id (prevent spoofing)
    │ Check: agent-003 exists and voice_status = ready
    │ Atomic claim: validateAndClaim(agent-003, voice, call_id)
    │   → agent-003: voice_status → ringing, SREM from available set
    │ If claim fails → return error "target agent not available"
    │
[3] GoACD: Execute transfer
    │ Check: isLocalTransfer(agent-007, agent-003)? (same FS instance?)
    │ ── Same FS: ──
    │   ESL → uuid_transfer {caller_uuid} sofia/internal/1003@${domain}
    │   FreeSWITCH: BYE agent-007 leg, INVITE agent-003
    │ ── Cross-FS: ──
    │   See §18.5.5 (Cross-FreeSWITCH Transfer)
    │
[4] GoACD: Start no-answer timer (20s, configurable per queue)
    │
    ├─ [4a] Agent-003 answers (CHANNEL_ANSWER):
    │   │ Update states:
    │   │   agent-003: voice_status → on_call
    │   │   agent-007: voice_status → wrap_up, start ACW timer
    │   │ Transfer call session ownership: session.AgentID = agent-003
    │   │ Update: session.TransferHistory append agent-007
    │   │ Continue recording (new segment with agent-003 metadata)
    │   │ Publish Kafka: call.transferred {
    │   │   callId, fromAgent: agent-007, toAgent: agent-003,
    │   │   type: "blind", success: true
    │   │ }
    │   │ Push to Agent Desktop (agent-003): incoming call screen with
    │   │   caller info + transfer context (who transferred, why)
    │
    └─ [4b] Agent-003 does NOT answer (20s timeout / reject):
        │ GoACD: cancel ringing on agent-003
        │   ESL → uuid_kill {agent003_uuid} (stop ringing)
        │ Release claim: releaseClaim(agent-003, voice)
        │   → agent-003: voice_status → ready, SADD back to available set
        │   → agent-003: miss_count++ (if ≥ 2 → voice_status → not_ready)
        │
        │ *** Re-route caller back to agent-007: ***
        │   Check: agent-007 still connected? (voice_status = wrap_up, not offline)
        │   ── Agent-007 still connected: ──
        │     ESL → uuid_bridge {caller_uuid} {agent007_uuid}
        │     agent-007: voice_status → on_call (cancel wrap-up timer)
        │     Notify Agent Desktop (agent-007): "Transfer failed — agent-003 unavailable"
        │   ── Agent-007 disconnected: ──
        │     Play MOH to caller
        │     Re-queue call with HIGH priority (see §18.5.4.2 transfer-to-queue logic)
        │     Publish Kafka: call.transfer_failed { callId, reason: "no_answer" }
```

### 18.5.4.2 Transfer to Queue

> **V2.2 Addition:** Allows agent to transfer a call to a different queue
> (e.g., "general" → "loan_processing"). The caller is placed in the target
> queue with elevated priority and hears MOH while waiting.

```
[1] Agent-007 clicks "Transfer to Queue" → selects queue "loan_processing"
    │ Agent Desktop → CTI Adapter → gRPC → GoACD:
    │   TransferCall(call_id, from=agent-007, to_queue_id="loan_processing", type="blind")
    │
[2] GoACD: Validate
    │ Check: agent-007 is on-call with this call_id
    │ Check: target queue exists in Redis (queue:{queueId}:config)
    │ Check: target queue not full (entries_count < max_queue_size)
    │ If validation fails → return error to Agent Desktop
    │
[3] GoACD: Park caller + play MOH
    │ ESL → uuid_hold {caller_uuid}
    │ ESL → uuid_kill {agent007_uuid}  (disconnect agent-007 leg)
    │ ESL → uuid_setvar {caller_uuid} park_after_bridge=true
    │ ESL → playback {caller_uuid} /audio/vi/transfer_please_wait.wav (once)
    │ ESL → endless_playback {caller_uuid} local_stream://moh  (MOH loop)
    │
[4] GoACD: Enqueue in target queue with ELEVATED priority
    │ ZADD queue:loan_processing:entries
    │   Score = (original_priority + 1) × 1000000 + (MAX_TS - now)
    │   Member = interactionId
    │ Note: priority + 1 ensures transferred calls are served before
    │   new callers at the same base priority level.
    │
    │ Update interaction metadata:
    │   interaction.transferred_from_queue = original_queue_id
    │   interaction.transferred_by = agent-007
    │   interaction.transfer_reason = agent-provided reason (optional)
    │
[5] GoACD: Update agent-007 state
    │ agent-007: voice_status → wrap_up, start ACW timer
    │ voice_count -= 1
    │ Publish Kafka: call.transferred {
    │   callId, fromAgent: agent-007, toQueue: "loan_processing",
    │   type: "queue_transfer"
    │ }
    │
[6] GoACD: Normal queue routing takes over
    │ Queue router detects new entry in loan_processing queue
    │ Score candidates from agent:available:voice ∩ agent:skills:loan
    │ Route to best available agent (§18.5.1 steps [7]-[10])
    │
[7] SLA timer
    │ If original call already consumed part of SLA:
    │   new_sla = max(target_queue.sla - elapsed_time, 30s)
    │   (minimum 30s to give target queue a chance)
    │ SLA breach → escalate per target queue's overflow rules
```

### 18.5.4.3 Transfer to External Number

> **V2.2 Addition:** Agent transfers caller to an external phone number
> (e.g., customer's mobile, branch office, partner company).

```
[1] Agent-007 clicks "Transfer" → enters external number 0901234567
    │ Agent Desktop → CTI Adapter → gRPC → GoACD:
    │   TransferCall(call_id, from=agent-007, to_number="0901234567", type="blind")
    │
[2] GoACD: Validate
    │ Check: agent-007 is on-call with this call_id
    │ Check: to_number matches allowed patterns (prevent toll fraud):
    │   - Vietnam mobile: ^0[3-9]\d{8}$
    │   - Vietnam landline: ^0[2]\d{9}$
    │   - Internal extensions: ^[0-9]{4}$
    │   - Whitelist: configurable per tenant (international, premium, etc.)
    │ If pattern not allowed → return error "number not permitted"
    │
[3] GoACD: Originate outbound leg to external number
    │ ESL (inbound) → FreeSWITCH: originate
    │   {origination_caller_id_number=18001234}
    │   sofia/gateway/pstn_trunk/0901234567
    │   &park()
    │
[4] Wait for external party to answer
    │
    ├─ [4a] External party answers:
    │   │ ESL → uuid_bridge {caller_uuid} {external_uuid}
    │   │ ESL → uuid_kill {agent007_uuid}  (disconnect agent)
    │   │ agent-007: voice_status → wrap_up
    │   │ Start recording new segment (caller ↔ external)
    │   │ Note: GoACD continues monitoring the call for CDR/hangup
    │   │ Publish Kafka: call.transferred {
    │   │   callId, fromAgent: agent-007, toNumber: "0901234567",
    │   │   type: "external_transfer"
    │   │ }
    │
    └─ [4b] External party does NOT answer (30s timeout / busy):
        │ Cancel originate: ESL → uuid_kill {external_uuid}
        │ Agent-007 remains connected to caller (no state change)
        │ Notify Agent Desktop: "Transfer failed — number not reachable"

──────────────────────────────────────────────────────────

Attended Transfer to External:
    │ Same attended flow as §18.5.4.4 below, except:
    │ Step 2: originate to external number instead of agent extension
    │ Step 3: agent-007 talks to external party (consultation)
    │ Step 4: agent-007 confirms → bridge caller ↔ external, disconnect agent
```

### 18.5.4.4 Attended Transfer (Full Lifecycle — V2.2)

> **V2.2 Update:** Added cancel/abort flow, consultation timeout, and
> target no-answer handling. Attended transfer has 4 distinct phases,
> each with its own failure handling.

```
Phase 1: INITIATE — Hold caller + ring target
──────────────────────────────────────────────

[1] Agent-007 clicks "Attended Transfer" → selects agent-003
    │ Agent Desktop → gRPC → GoACD:
    │   TransferCall(call_id, from=agent-007, to_agent_id=agent-003, type="attended")
    │
[2] GoACD: Validate + Claim target
    │ Same validation as blind transfer (§18.5.4.1 step [2])
    │ Atomic claim: validateAndClaim(agent-003, voice, call_id)
    │
[3] GoACD: Hold caller + originate consultation
    │ ESL → uuid_hold {caller_uuid}
    │   → Caller hears MOH (local_stream://moh)
    │ ESL → originate sofia/internal/1003@${domain} &park()
    │   → Agent-003 phone rings
    │ GoACD: set transfer_state = "ringing" in call session
    │ Start no-answer timer: 20s
    │
    ├─ [3a] Agent-003 answers → go to Phase 2
    │
    └─ [3b] Agent-003 does NOT answer (20s timeout):
        │ ESL → uuid_kill {agent003_uuid}
        │ Release claim: releaseClaim(agent-003, voice)
        │ ESL → uuid_unhold {caller_uuid}
        │   → Caller reconnected to agent-007
        │ GoACD: clear transfer_state
        │ Notify Agent Desktop (agent-007): "Agent-003 did not answer"
        │ agent-007 remains on-call with caller (no state change)


Phase 2: CONSULTATION — Agent-007 talks to Agent-003
─────────────────────────────────────────────────────

[4] Agent-003 answers (CHANNEL_ANSWER):
    │ ESL → uuid_bridge {agent007_uuid} {agent003_uuid}
    │   → Agent-007 and agent-003 can now talk
    │   → Caller still on hold, hearing MOH
    │ GoACD: set transfer_state = "consulting"
    │ agent-003: voice_status → on_call (consultation)
    │ Start consultation timeout: 300s (5 min, configurable)
    │   → Prevents indefinite hold of caller
    │
    │ Agent Desktop (agent-007) shows 3 buttons:
    │   [Complete Transfer]  [Cancel Transfer]  [Conference]


Phase 3a: COMPLETE — Agent-007 confirms transfer
─────────────────────────────────────────────────

[5] Agent-007 clicks "Complete Transfer"
    │ Agent Desktop → gRPC → GoACD: confirm transfer
    │
    │ ESL → uuid_bridge {caller_uuid} {agent003_uuid}
    │   → Caller now connected to agent-003
    │ ESL → uuid_kill {agent007_uuid}
    │   → Agent-007 disconnected
    │
    │ Update states:
    │   agent-007: voice_status → wrap_up, start ACW timer
    │   agent-003: voice_status remains on_call (new call owner)
    │ Transfer session ownership: session.AgentID = agent-003
    │ session.TransferHistory append agent-007
    │ GoACD: clear transfer_state
    │ Publish Kafka: call.transferred { type: "attended", success: true }


Phase 3b: CANCEL — Agent-007 aborts transfer (V2.2)
────────────────────────────────────────────────────

[5] Agent-007 clicks "Cancel Transfer"
    │ Agent Desktop → gRPC → GoACD:
    │   CancelTransfer(call_id, agent_id=agent-007)
    │
[6] GoACD: Abort transfer
    │ Check: transfer_state = "consulting" (can only cancel during consultation)
    │
    │ ESL → uuid_kill {agent003_uuid}
    │   → Disconnect agent-003 (BYE)
    │ ESL → uuid_unhold {caller_uuid}
    │   → Stop MOH
    │ ESL → uuid_bridge {caller_uuid} {agent007_uuid}
    │   → Caller reconnected to agent-007
    │
    │ Release claim: releaseClaim(agent-003, voice)
    │   → agent-003: voice_status → ready, SADD back to available set
    │ GoACD: clear transfer_state
    │ agent-007: remains on_call (no state change)
    │ Publish Kafka: call.transfer_cancelled {
    │   callId, agent: agent-007, cancelled_target: agent-003
    │ }


Phase 3c: CONFERENCE — Merge all 3 parties (optional)
──────────────────────────────────────────────────────

[5] Agent-007 clicks "Conference" (3-way call)
    │ Agent Desktop → gRPC → GoACD:
    │   ConferenceCall(call_id, initiator=agent-007, target=agent-003)
    │
[6] GoACD: Create conference
    │ ESL → conference {conf_id} (create conference room)
    │ ESL → uuid_transfer {caller_uuid} conference:{conf_id}
    │ ESL → uuid_transfer {agent007_uuid} conference:{conf_id}
    │ ESL → uuid_transfer {agent003_uuid} conference:{conf_id}
    │   → All 3 parties now in conference
    │ GoACD: set transfer_state = "conference"
    │
    │ Agent Desktop shows: [Drop Agent-003] [Leave Conference]
    │ From conference, agent-007 can:
    │   - Drop agent-003 → caller ↔ agent-007 (back to normal call)
    │   - Leave conference → caller ↔ agent-003 (transfer complete)


Consultation Timeout (safety net):
──────────────────────────────────

[7] 300s consultation timeout fires
    │ GoACD: auto-complete transfer (same as Phase 3a)
    │ Rationale: caller has been on hold too long
    │ ESL → uuid_bridge {caller_uuid} {agent003_uuid}
    │ ESL → uuid_kill {agent007_uuid}
    │ Notify Agent Desktop (agent-007): "Consultation timed out — transfer completed"
    │ Publish Kafka: call.transferred { type: "attended", reason: "consultation_timeout" }
```

**Transfer state machine (per call session):**

```
                           TransferCall(attended)
    (none) ─────────────────────────────────────────► RINGING
                                                        │
                               target no-answer         │ target answers
                               → cancel, reconnect      │
                               caller to agent          │
                                 ┌──────────────────────┘
                                 ▼
                             CONSULTING
                            /    │     \
                  Cancel   /     │      \ Conference
                  transfer/      │       \
                         ▼       │        ▼
                      (none)     │    CONFERENCE
                   agent back    │      /     \
                   to caller     │     /       \
                                 │  Drop      Leave
                    Complete     │  target    conf
                    transfer     │    │         │
                         ┌───────┘    │         │
                         ▼            ▼         ▼
                      (none)       (none)    (none)
                   caller ↔       caller ↔  caller ↔
                   target         agent     target
```

### 18.5.4.5 Transfer No-Answer Re-routing Strategy (V2.2)

> **V2.2 Addition:** Defines what happens when transfer target doesn't answer,
> for all transfer types.

```go
// GoACD: transfer/reroute.go

func (t *TransferManager) handleTransferNoAnswer(session *CallSession, attempt *TransferAttempt) {
    // Release claim on target agent
    t.routing.ReleaseClaim(attempt.TargetAgentID, ChannelVoice)

    switch attempt.Type {
    case TransferBlind:
        // Try to reconnect to original agent first
        origAgent := attempt.FromAgentID
        origState := t.state.GetAgentState(origAgent)

        if origState.VoiceStatus == "wrap_up" && origState.SIPRegistered {
            // Original agent still connected — reconnect caller
            t.esl.Bridge(session.CallerUUID, session.GetAgentUUID(origAgent))
            t.state.SetAgentState(origAgent, ChannelVoice, "on_call")
            t.notify.Send(origAgent, "transfer_failed", "Target agent unavailable")
        } else {
            // Original agent gone — re-queue with high priority
            t.requeue(session, attempt.OriginalQueueID, PriorityHigh)
        }

    case TransferAttended:
        // Consultation phase — just reconnect agent to caller
        t.esl.Unhold(session.CallerUUID)
        t.esl.Bridge(session.CallerUUID, session.GetAgentUUID(attempt.FromAgentID))
        t.notify.Send(attempt.FromAgentID, "transfer_failed", "Target agent unavailable")

    case TransferToQueue:
        // Already in queue — this case doesn't apply (queue handles routing)
        // No-answer on queue-routed agent is handled by normal routing logic (§18.8.3)
    }
}

func (t *TransferManager) requeue(session *CallSession, queueID string, priority int) {
    // Play MOH to caller while waiting
    t.esl.Playback(session.CallerUUID, "local_stream://moh")

    // Re-enqueue with elevated priority
    score := float64(priority+1)*1000000 + float64(maxTimestamp-time.Now().Unix())
    t.redis.ZAdd(ctx, fmt.Sprintf("queue:%s:entries", queueID), &redis.Z{
        Score:  score,
        Member: session.InteractionID,
    })

    t.kafka.Publish("call.requeued", map[string]interface{}{
        "callId":     session.CallID,
        "queueId":    queueID,
        "reason":     "transfer_no_answer",
        "priority":   priority + 1,
    })
}
```

## 18.5.5 Cross-FreeSWITCH Transfer (Multi-FS Pool)

> **V2.1 Addition:** `uuid_transfer` and `uuid_bridge` only work within a single FreeSWITCH instance. When agents are on different FS instances (e.g., agent-007 on FS-1, agent-003 on FS-2), a different mechanism is needed.

```
GoACD receives transfer request: agent-007 (FS-1) → agent-003 (FS-2)

[1] GoACD: lookup agent FS instance
    agent-007 → FS-1 (from agent registry: agent_id → fs_host mapping)
    agent-003 → FS-2

[2] GoACD: detect cross-FS transfer (fs_host differs)

[3] Cross-FS Blind Transfer:
    │ a. ESL (FS-1): uuid_setvar {caller_uuid} park_after_bridge=true
    │ b. ESL (FS-1): uuid_kill {agent007_uuid}
    │    → Agent-007 leg BYE'd, caller leg parked (audio silence briefly)
    │ c. ESL (FS-2): originate {origination_uuid=NEW_UUID}sofia/internal/1003@domain &park()
    │    → Ring agent-003 on FS-2
    │ d. Agent-003 answers → FS-2 has agent leg
    │ e. GoACD: create media bridge via Kamailio
    │    → ESL (FS-1): uuid_bridge {caller_uuid} sofia/internal/proxy_bridge@kamailio
    │    → Kamailio routes RTP between FS-1 (caller) ↔ FS-2 (agent-003)
    │    → rtpengine: bridge both RTP streams
    │ f. Update states: agent-007 → wrap-up, agent-003 → on-call

[4] Cross-FS Attended Transfer:
    │ Same as within-FS attended transfer (§18.5.4.4), except:
    │ Step 2: originate call to agent-003 on FS-2 (not FS-1)
    │ Step 3: consultation bridge agent-007 (FS-1) ↔ agent-003 (FS-2)
    │   → Bridged via Kamailio + rtpengine (cross-FS media path)
    │ Step 4: final bridge caller (FS-1) ↔ agent-003 (FS-2)
    │   → Same cross-FS bridge mechanism
    │ Cancel: disconnect agent-003 leg on FS-2, unhold caller on FS-1
    │   → Same cancel flow as §18.5.4.4 Phase 3b
```

**Agent → FS Instance Mapping:**

```go
// GoACD maintains agent→FS mapping based on SIP registration
// When sofia::register event arrives for ext 1007 on FS-1:
//   agentRegistry[agent-007].FSHost = "freeswitch-1"
//   agentRegistry[agent-007].Extension = "1007"

func (r *AgentRegistry) GetFSInstance(agentID string) string {
    agent := r.agents[agentID]
    return agent.FSHost // "freeswitch-1" or "freeswitch-2"
}

func (d *Delivery) isLocalTransfer(fromAgent, toAgent string) bool {
    return d.registry.GetFSInstance(fromAgent) == d.registry.GetFSInstance(toAgent)
}
```

**Kamailio cross-FS bridge configuration:**

```
# Kamailio routing script: handle cross-FS bridge requests
# GoACD sends a special SIP INVITE with X-Cross-FS-Bridge header
if (is_present_hf("X-Cross-FS-Bridge")) {
    # Route media through rtpengine between two FS instances
    rtpengine_manage("trust-address replace-origin replace-session-connection");
    # Forward to target FS based on X-Target-FS header
    $du = "sip:" + $hdr(X-Target-FS);
    route(RELAY);
}
```

**Alternative: FS Affinity Routing (simpler, less flexible)**

For simpler deployments, assign agents to FS instances based on extension range:
```
Extensions 1000-4999 → FS-1
Extensions 5000-9999 → FS-2

Kamailio dispatcher: route based on destination extension:
  if ($rU >= 1000 && $rU <= 4999) { ds_select_dst(1, 0); }  # FS-1 group
  if ($rU >= 5000 && $rU <= 9999) { ds_select_dst(2, 0); }  # FS-2 group
```
This ensures transfers between agents in the same range stay on the same FS.
Tradeoff: less flexible load balancing, but avoids cross-FS complexity entirely.

## 18.5.6 Internal Call — Agent-to-Agent Direct Call (V2.2)

> **V2.2 Addition:** Agent-to-agent direct calls (not transfer) must go through
> GoACD to ensure both agents' states are tracked. Without this, GoACD would
> not know the agents are on-call and could route inbound calls to them.
>
> **Critical rule:** SIP.js on Agent Desktop MUST NOT send direct SIP INVITE
> to another extension. All calls go through: Agent Desktop → CTI Adapter →
> GoACD (gRPC) → FreeSWITCH (ESL). Kamailio blocks direct agent→agent INVITE
> with 403 (see route[REQUESTS]).

```
[1] Agent-007 clicks "Call Agent" → selects agent-003 from directory
    │ Agent Desktop → CTI Adapter → gRPC → GoACD:
    │   MakeCall(from=1007, to=1003, call_type="internal")
    │
[2] GoACD: Validate + Claim BOTH agents
    │ a. Claim caller (agent-007):
    │   Run outbound_claim.lua (§18.5.3):
    │     voice_status → originating
    │     voice_count += 1
    │     SREM agent:available:voice agent-007
    │   If fail → return error "you are not available"
    │
    │ b. Claim callee (agent-003):
    │   Run agent_claim.lua (§18.7.5):
    │     voice_status → ringing
    │     voice_count += 1
    │     SREM agent:available:voice agent-003
    │   If fail → release agent-007 claim, return error "agent-003 not available"
    │
[3] GoACD: Create internal call session
    │ session.Type = "internal"
    │ session.CallerAgentID = agent-007
    │ session.CalleeAgentID = agent-003
    │ (no external caller leg — both legs are agent extensions)
    │
[4] GoACD: Ring callee via FreeSWITCH
    │ ESL (inbound) → FreeSWITCH: originate
    │   sofia/internal/1003@${domain}
    │   &park()
    │ Start no-answer timer: 20s
    │
    │ Push to Agent Desktop (agent-003): incoming internal call screen
    │   { caller: "Agent Nguyễn Văn A (1007)", type: "internal" }
    │
    ├─ [4a] Agent-003 answers (CHANNEL_ANSWER):
    │   │ ESL → bridge {agent007_uuid} {agent003_uuid}
    │   │ Update states:
    │   │   agent-007: voice_status → on_call
    │   │   agent-003: voice_status → on_call
    │   │ Start recording (internal calls recorded per compliance policy)
    │   │ Publish Kafka: call.internal.started {
    │   │   callId, caller: agent-007, callee: agent-003
    │   │ }
    │
    ├─ [4b] Agent-003 does NOT answer (20s timeout):
    │   │ ESL → uuid_kill {agent003_uuid}
    │   │ Release claims for BOTH agents:
    │   │   agent-007: run outbound_release.lua → voice_status → ready
    │   │   agent-003: run agent_release.lua → voice_status → ready
    │   │     miss_count++ (if ≥ 2 → voice_status → not_ready)
    │   │ Notify Agent Desktop (agent-007): "Agent-003 did not answer"
    │
    └─ [4c] Agent-003 rejects call (CHANNEL_HANGUP with cause USER_BUSY):
        │ Same as [4b] but different notification:
        │ Notify Agent Desktop (agent-007): "Agent-003 declined the call"
        │ agent-003: miss_count NOT incremented (intentional reject ≠ miss)

[5] Call ends (either agent hangs up)
    │ FreeSWITCH: CHANNEL_HANGUP → GoACD
    │ GoACD: disconnect both legs
    │ Update states:
    │   Both agents: voice_status → wrap_up (if ACW enabled)
    │                 OR voice_status → ready (if ACW disabled for internal calls)
    │   voice_count -= 1 for both
    │ Stop recording
    │ Publish Kafka: call.internal.ended { callId, duration }
    │ Generate CDR (internal call CDR, separate from customer call CDR)
```

**Internal call vs Outbound call comparison:**

| Aspect | Outbound (§18.5.3) | Internal (§18.5.6) |
|---|---|---|
| Caller agent claim | outbound_claim.lua | outbound_claim.lua (same) |
| Target claim | N/A (external number) | agent_claim.lua (claim callee agent) |
| Originate target | sofia/gateway/pstn_trunk/... | sofia/internal/{ext}@domain |
| Recording | Always | Per compliance policy (configurable) |
| ACW after hangup | Always | Configurable (typically disabled for internal) |
| CDR type | outbound | internal |
| Both agents busy? | Only caller | Both caller AND callee |

**GoACD implementation:**

```go
// GoACD: call/internal.go

func (c *CallControl) MakeInternalCall(ctx context.Context, req *MakeCallRequest) (*CallSession, error) {
    // Detect internal call: target is 4-digit extension
    if !isExtension(req.To) {
        return c.MakeOutboundCall(ctx, req) // delegate to outbound flow
    }

    callerAgentID := c.registry.GetAgentByExtension(req.From)
    calleeAgentID := c.registry.GetAgentByExtension(req.To)
    if calleeAgentID == "" {
        return nil, fmt.Errorf("extension %s not assigned to any agent", req.To)
    }

    callID := uuid.New().String()

    // Step 1: Claim caller (outbound_claim)
    claimed, err := c.routing.OutboundClaim(callerAgentID, callID)
    if err != nil || !claimed {
        return nil, fmt.Errorf("caller agent not available: %w", err)
    }

    // Step 2: Claim callee (agent_claim) — rollback caller on failure
    claimed, err = c.routing.ValidateAndClaim(calleeAgentID, ChannelVoice, callID)
    if err != nil || !claimed {
        c.routing.OutboundRelease(callerAgentID) // rollback
        return nil, fmt.Errorf("target agent not available: %w", err)
    }

    // Step 3: Create session + originate
    session := c.newInternalSession(callID, callerAgentID, calleeAgentID)

    eslCmd := fmt.Sprintf("sofia/internal/%s@%s", req.To, c.domain)
    originateUUID, err := c.esl.Originate(eslCmd, "&park()")
    if err != nil {
        // Rollback both claims
        c.routing.OutboundRelease(callerAgentID)
        c.routing.ReleaseClaim(calleeAgentID, ChannelVoice)
        return nil, fmt.Errorf("originate failed: %w", err)
    }

    session.CalleeUUID = originateUUID
    c.startNoAnswerTimer(session, 20*time.Second, func() {
        c.handleInternalNoAnswer(session)
    })

    return session, nil
}

func (c *CallControl) handleInternalNoAnswer(session *CallSession) {
    c.esl.Kill(session.CalleeUUID)
    c.routing.OutboundRelease(session.CallerAgentID)
    c.routing.ReleaseClaim(session.CalleeAgentID, ChannelVoice)
    c.notify.Send(session.CallerAgentID, "internal_call_failed", "Agent did not answer")
}
```

---

## Related Files

| File | Description |
|---|---|
| [18-1-architecture-overview.md](./18-1-architecture-overview.md) | Voice platform architecture overview |
| [18-2-component-roles.md](./18-2-component-roles.md) | Component roles (Kamailio, FreeSWITCH, rtpengine, GoACD) |
| [18-2a-kamailio-config.md](./18-2a-kamailio-config.md) | Kamailio SIP proxy configuration |
| [18-2b-rtpengine-config.md](./18-2b-rtpengine-config.md) | rtpengine media proxy configuration |
| [18-2c-freeswitch-config.md](./18-2c-freeswitch-config.md) | FreeSWITCH media server configuration |
| [18-3-acd-evaluation.md](./18-3-acd-evaluation.md) | ACD engine evaluation and selection |
| [18-4-goacd-architecture.md](./18-4-goacd-architecture.md) | GoACD custom ACD architecture |
| [README.md](./README.md) | Section 18 navigation index |
