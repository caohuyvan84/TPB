<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.4 GoACD Architecture

## 18.4.1 Module Structure

```
goacd/
├── cmd/
│   └── goacd/
│       └── main.go                    # Entry point
├── internal/
│   ├── esl/
│   │   ├── connection.go              # ESL connection management (percipia/eslgo)
│   │   ├── outbound_server.go         # TCP server for outbound ESL (FS → GoACD)
│   │   ├── inbound_client.go          # Persistent connection GoACD → FS (monitoring)
│   │   └── commands.go                # Typed ESL command builders
│   ├── ivr/
│   │   ├── engine.go                  # IVR flow executor (reads FlowDefinition from DB)
│   │   ├── nodes.go                   # IVR node handlers (play, collect, menu, http, condition)
│   │   └── session.go                 # Per-call IVR session state
│   ├── queue/
│   │   ├── manager.go                 # Queue CRUD, Redis sorted sets
│   │   ├── entry.go                   # Queue entry lifecycle (enqueue → assign → dequeue)
│   │   ├── moh.go                     # Music on hold orchestration (via ESL playback)
│   │   ├── sla.go                     # SLA timer, breach detection, overflow
│   │   └── overflow.go                # Overflow handler (priority escalation, voicemail, callback)
│   ├── routing/
│   │   ├── engine.go                  # Routing engine (§7.2 scoring algorithm)
│   │   ├── scorer.go                  # Agent scoring: skill × load × idle × group × affinity
│   │   ├── candidates.go              # Top-N candidate list management
│   │   └── delivery.go               # Call delivery: bridge to agent, no-answer timer, re-route
│   ├── agent/
│   │   ├── state.go                   # Agent state machine (Redis HASH)
│   │   ├── registry.go                # Agent ↔ Extension mapping
│   │   ├── sync.go                    # State sync with Omnichannel Agent Service
│   │   └── heartbeat.go              # SIP registration tracking, WS heartbeat, reconciliation
│   ├── call/
│   │   ├── session.go                 # Active call session tracking
│   │   ├── transfer.go                # Blind/attended transfer via ESL
│   │   ├── conference.go              # 3-way conference via ESL
│   │   ├── recording.go               # Call recording control via ESL
│   │   └── cdr.go                     # CDR generation from call events
│   ├── event/
│   │   ├── publisher.go               # Kafka event publisher
│   │   ├── consumer.go                # Kafka consumer (agent.created, agent.updated, etc.)
│   │   └── websocket.go               # WebSocket events → Omnichannel gateway
│   ├── api/
│   │   ├── grpc_server.go             # gRPC server for Omnichannel services
│   │   ├── rest_server.go             # REST API for admin/monitoring
│   │   └── proto/                     # Protobuf definitions
│   └── config/
│       └── config.go                  # Configuration (env vars, YAML)
├── go.mod
└── go.sum
```

## 18.4.2 Key Dependencies

```go
// go.mod
module github.com/tpb/goacd

go 1.22

require (
    github.com/percipia/eslgo v0.9.0       // FreeSWITCH ESL library
    github.com/redis/go-redis/v9 v9.5.0    // Redis client
    github.com/segmentio/kafka-go v0.4.47  // Kafka producer/consumer
    google.golang.org/grpc v1.62.0         // gRPC server
    google.golang.org/protobuf v1.33.0     // Protobuf
    github.com/jackc/pgx/v5 v5.5.0        // PostgreSQL (config, CDR persistence)
    github.com/gorilla/websocket v1.5.0    // WebSocket for event streaming
    go.uber.org/zap v1.27.0               // Structured logging
    github.com/prometheus/client_golang    // Metrics
)
```

## 18.4.3 ESL Connection Model

```
┌─────────────────────────────────────────────────────────┐
│                    GoACD Server                          │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │ Outbound ESL Server  │  │ Inbound ESL Client   │    │
│  │ (TCP :9090)          │  │ (→ FS :8021)         │    │
│  │                      │  │                      │    │
│  │ FS connects here     │  │ GoACD connects to FS │    │
│  │ when call arrives    │  │ for monitoring &      │    │
│  │                      │  │ global commands       │    │
│  │ 1 goroutine/call     │  │                      │    │
│  │ Full call control    │  │ Subscribe to events:  │    │
│  │                      │  │ CHANNEL_CREATE        │    │
│  │ Commands:            │  │ CHANNEL_ANSWER        │    │
│  │ • playback           │  │ CHANNEL_HANGUP        │    │
│  │ • play_and_get_digits│  │ CUSTOM sofia::register│    │
│  │ • bridge             │  │ CUSTOM sofia::expire  │    │
│  │ • uuid_transfer      │  │                      │    │
│  │ • record_session     │  │ Commands:            │    │
│  │ • hangup             │  │ • uuid_bridge        │    │
│  │                      │  │ • uuid_transfer      │    │
│  └──────────────────────┘  │ • uuid_kill          │    │
│                             │ • originate          │    │
│                             └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Outbound ESL** (per-call control):
- FreeSWITCH dialplan routes call to `socket goacd-server:9090 async full`
- GoACD accepts TCP connection, spawns goroutine for that call
- Goroutine has full ESL control: play prompts, collect DTMF, bridge, transfer, hangup
- Connection lifetime = call lifetime
- Natural fit for Go concurrency: 5,000 concurrent calls = 5,000 goroutines (~50MB RAM)

**Inbound ESL** (global monitoring):
- GoACD maintains persistent connection to FreeSWITCH ESL port (8021)
- Subscribes to events: `sofia::register`, `sofia::expire`, `CHANNEL_*`, `DTMF`, `RECORD_*`
- Used for: SIP registration tracking (agent online/offline), global call monitoring, originating outbound calls
- Reconnects automatically on connection loss

## 18.4.4 gRPC Interface (GoACD <-> Omnichannel)

```protobuf
// proto/goacd.proto

service GoACDService {
  // Agent state management
  rpc SetAgentState(SetAgentStateRequest) returns (SetAgentStateResponse);
  rpc GetAgentState(GetAgentStateRequest) returns (AgentState);
  rpc ListAgentStates(ListAgentStatesRequest) returns (AgentStateList);

  // Call control (from Agent Desktop via CTI Adapter)
  rpc MakeCall(MakeCallRequest) returns (CallSession);
  rpc AnswerCall(AnswerCallRequest) returns (Empty);
  rpc HangupCall(HangupCallRequest) returns (Empty);
  rpc HoldCall(HoldCallRequest) returns (Empty);
  rpc UnholdCall(UnholdCallRequest) returns (Empty);
  rpc TransferCall(TransferCallRequest) returns (Empty);
  rpc CancelTransfer(CancelTransferRequest) returns (Empty);  // V2.2: abort attended transfer
  rpc ConferenceCall(ConferenceCallRequest) returns (ConferenceSession);

  // Queue management
  rpc GetQueueStats(GetQueueStatsRequest) returns (QueueStats);
  rpc ListQueues(ListQueuesRequest) returns (QueueList);

  // IVR flow sync
  rpc SyncFlowDefinition(FlowDefinition) returns (SyncResponse);

  // Agent registration (Omnichannel → GoACD)
  rpc RegisterAgent(RegisterAgentRequest) returns (AgentRegistration);
  rpc UnregisterAgent(UnregisterAgentRequest) returns (Empty);

  // Event stream (GoACD → Omnichannel)
  rpc StreamEvents(StreamEventsRequest) returns (stream CallEvent);
}
```

## 18.4.5 Complete Protobuf Message Definitions

```protobuf
syntax = "proto3";
package goacd;

import "google/protobuf/timestamp.proto";

// ─── Agent State ───────────────────────────────────────

message SetAgentStateRequest {
  string agent_id = 1;
  string channel = 2;           // "voice"
  string status = 3;            // "ready", "not_ready", "wrap_up"
  string reason = 4;            // not_ready reason: "break", "training", "meeting"
  string request_id = 5;        // idempotency key (UUID)
}

message SetAgentStateResponse {
  bool success = 1;
  string error_message = 2;
  string actual_status = 3;     // confirmed status after server-side validation
  string previous_status = 4;
}

message GetAgentStateRequest {
  string agent_id = 1;
}

message AgentState {
  string agent_id = 1;
  string voice_status = 2;      // "offline", "registered", "ready", "not_ready", "ringing", "originating", "on_call", "wrap_up"
  string voice_reason = 3;
  int32 voice_count = 4;        // current active voice interactions
  int32 max_voice = 5;
  string extension = 6;
  bool sip_registered = 7;
  google.protobuf.Timestamp last_state_change = 8;
  google.protobuf.Timestamp last_sip_register = 9;
  string fs_instance = 10;      // which FreeSWITCH instance agent is on
  repeated string skills = 11;
  repeated string queue_ids = 12;
}

message ListAgentStatesRequest {
  string status_filter = 1;     // optional: "ready", "on_call", etc.
  string queue_filter = 2;      // optional: filter by queue membership
  int32 limit = 3;
  int32 offset = 4;
}

message AgentStateList {
  repeated AgentState agents = 1;
  int32 total = 2;
}

// ─── Call Control ──────────────────────────────────────

message MakeCallRequest {
  string agent_id = 1;
  string from_extension = 2;
  string to_number = 3;          // external number OR internal extension (4 digits)
  string caller_id_number = 4;   // outbound caller ID override (ignored for internal calls)
  map<string, string> metadata = 5;
  // V2.2: GoACD auto-detects call type:
  //   to_number matches ^[0-9]{4}$ → internal call (§18.5.6)
  //   otherwise → outbound call (§18.5.3)
}

message CallSession {
  string call_id = 1;
  string interaction_id = 2;
  string state = 3;             // "initiating", "ringing", "active", "hold", "wrap_up"
  string caller = 4;
  string callee = 5;
  string agent_id = 6;
  string agent_extension = 7;
  string fs_instance = 8;
  string caller_channel_uuid = 9;
  string agent_channel_uuid = 10;
  google.protobuf.Timestamp started_at = 11;
  google.protobuf.Timestamp answered_at = 12;
  bool recording = 13;
  string recording_path = 14;
}

message AnswerCallRequest {
  string call_id = 1;
  string agent_id = 2;
}

message HangupCallRequest {
  string call_id = 1;
  string agent_id = 2;
  string reason = 3;            // "normal", "busy", "no_answer"
}

message HoldCallRequest {
  string call_id = 1;
  string agent_id = 2;
}

message UnholdCallRequest {
  string call_id = 1;
  string agent_id = 2;
}

message TransferCallRequest {
  string call_id = 1;
  string from_agent_id = 2;
  string to_agent_id = 3;       // set if transferring to specific agent
  string to_number = 4;         // set if transferring to external number
  string to_queue_id = 5;       // set if transferring to queue (V2.2)
  string transfer_type = 6;     // "blind", "attended"
  // Exactly ONE of to_agent_id, to_number, to_queue_id must be set.
  // GoACD validates and rejects if zero or multiple targets specified.
}

// V2.2: Cancel an in-progress attended transfer (return to caller)
message CancelTransferRequest {
  string call_id = 1;
  string agent_id = 2;          // the agent who initiated the transfer
}

message ConferenceCallRequest {
  string call_id = 1;
  string initiator_agent_id = 2;
  string target_agent_id = 3;   // empty if conferencing external number
  string target_number = 4;
}

message ConferenceSession {
  string conference_id = 1;
  string call_id = 2;
  repeated string participant_channels = 3;
  string state = 4;             // "initiating", "active"
}

message Empty {}

// ─── Queue Management ──────────────────────────────────

message GetQueueStatsRequest {
  string queue_id = 1;
}

message QueueStats {
  string queue_id = 1;
  string name = 2;
  int32 entries_count = 3;
  int32 agents_available = 4;
  int32 agents_on_call = 5;
  int32 agents_total = 6;
  double avg_wait_time_seconds = 7;
  double max_wait_time_seconds = 8;
  int32 sla_breaches_today = 9;
  int32 calls_handled_today = 10;
  int32 calls_abandoned_today = 11;
}

message ListQueuesRequest {
  int32 limit = 1;
  int32 offset = 2;
}

message QueueList {
  repeated QueueStats queues = 1;
  int32 total = 2;
}

// ─── IVR Flow ──────────────────────────────────────────

message FlowDefinition {
  string flow_id = 1;
  string name = 2;
  string version = 3;
  bytes flow_json = 4;          // JSON-encoded flow nodes (matches §10.2 schema)
  string fallback_queue_id = 5;
  google.protobuf.Timestamp updated_at = 6;
}

message SyncResponse {
  bool success = 1;
  string error_message = 2;
}

// ─── Agent Registration ────────────────────────────────

message RegisterAgentRequest {
  string agent_id = 1;
  string display_name = 2;
  repeated string skills = 3;
  repeated string queue_ids = 4;
  int32 max_voice = 5;         // max concurrent voice interactions (usually 1)
}

message AgentRegistration {
  string agent_id = 1;
  string extension = 2;
  string sip_domain = 3;
  string wss_uri = 4;
  // V2.2: No sip_password field. Agent auth uses ephemeral HMAC tokens
  // obtained via GetAgentSIPCredentials RPC (§18.9.1.3).
}

// V2.2: Ephemeral SIP credentials (replaces static password delivery)
message SIPCredentials {
  string ws_uri = 1;
  string sip_uri = 2;
  string authorization_user = 3;   // "<expiry_unix>:<extension>" — ephemeral
  string password = 4;             // HMAC-SHA1 token — 5 min TTL
  string display_name = 5;
  string extension = 6;            // bare extension for display/routing
  int64  token_expires_at = 7;     // unix timestamp — client schedules refresh
  repeated ICEServer ice_servers = 8;
}

message UnregisterAgentRequest {
  string agent_id = 1;
}

// ─── Event Stream ──────────────────────────────────────

message StreamEventsRequest {
  repeated string event_types = 1;  // filter: ["call.*", "agent.*", "queue.*"]
  string agent_id = 2;             // optional: filter by agent
  string queue_id = 3;             // optional: filter by queue
}

message CallEvent {
  string event_type = 1;       // "call.started", "call.answered", "call.ended", etc.
  string call_id = 2;
  string interaction_id = 3;
  string agent_id = 4;
  string queue_id = 5;
  map<string, string> data = 6;
  google.protobuf.Timestamp timestamp = 7;
  string correlation_id = 8;
}
```

## 18.4.6 Core Go Types & Interfaces

```go
// ─── Main GoACD Struct ─────────────────────────────────

type GoACD struct {
    config          *Config
    logger          *zap.Logger
    redis           *redis.Client
    pgPool          *pgxpool.Pool
    kafkaWriter     *kafka.Writer
    kafkaReaders    []*kafka.Reader

    // Core modules
    eslManager      *esl.Manager          // ESL connection lifecycle
    ivrEngine       *ivr.Engine           // IVR flow execution
    queueManager    *queue.Manager        // Queue CRUD, MOH, SLA
    routingEngine   *routing.Engine       // Scoring, candidate selection, claims
    agentState      *agent.StateManager   // Redis-backed agent state
    agentRegistry   *agent.Registry       // Agent ↔ Extension mapping
    agentHeartbeat  *agent.HeartbeatMonitor
    callTracker     *call.Tracker         // Active call sessions
    callRecorder    *call.Recorder        // Recording control
    cdrGenerator    *call.CDRGenerator
    recordingSync   *RecordingSyncPipeline
    eventPublisher  *event.Publisher      // Kafka + Redis pub/sub
    grpcServer      *api.GRPCServer
    restServer      *api.RESTServer
    customerCache   *CustomerCache

    // HA
    instanceID      string
    isLeader        atomic.Bool
    leaderCtx       context.Context
    leaderCancel    context.CancelFunc

    // Session tracking
    activeSessions  map[string]*call.Session
    sessionMu       sync.RWMutex

    // Metrics
    metrics         *Metrics

    // Lifecycle
    wg              sync.WaitGroup        // tracks all goroutines
    shutdownCh      chan struct{}
}

// ─── Configuration ─────────────────────────────────────

type Config struct {
    // Instance
    InstanceID          string        `env:"GOACD_INSTANCE_ID" required:"true"`
    LogLevel            string        `env:"GOACD_LOG_LEVEL" default:"info"`
    LogFormat           string        `env:"GOACD_LOG_FORMAT" default:"json"` // "json" or "console"

    // FreeSWITCH ESL
    FSESLHosts          []string      `env:"GOACD_FS_ESL_HOSTS" required:"true"` // comma-separated
    FSESLPassword       string        `env:"GOACD_FS_ESL_PASSWORD" required:"true"`
    FSESLReconnectDelay time.Duration `env:"GOACD_FS_ESL_RECONNECT_DELAY" default:"3s"`
    ESLListenPort       int           `env:"GOACD_ESL_LISTEN_PORT" default:"9090"`
    ESLMaxConnections   int           `env:"GOACD_ESL_MAX_CONNECTIONS" default:"5000"`
    ESLCmdBufferSize    int           `env:"GOACD_ESL_CMD_BUFFER_SIZE" default:"32"`

    // gRPC
    GRPCPort            int           `env:"GOACD_GRPC_PORT" default:"9091"`
    GRPCMaxRecvMsgSize  int           `env:"GOACD_GRPC_MAX_RECV_MSG_SIZE" default:"4194304"` // 4MB
    GRPCKeepaliveTime   time.Duration `env:"GOACD_GRPC_KEEPALIVE_TIME" default:"30s"`

    // REST API
    RESTPort            int           `env:"GOACD_REST_PORT" default:"9092"`

    // Prometheus
    MetricsPort         int           `env:"GOACD_METRICS_PORT" default:"9093"`

    // Redis
    RedisURL            string        `env:"GOACD_REDIS_URL" required:"true"`
    RedisPoolSize       int           `env:"GOACD_REDIS_POOL_SIZE" default:"200"`
    RedisMinIdleConns   int           `env:"GOACD_REDIS_MIN_IDLE_CONNS" default:"50"`
    RedisReadTimeout    time.Duration `env:"GOACD_REDIS_READ_TIMEOUT" default:"3s"`
    RedisWriteTimeout   time.Duration `env:"GOACD_REDIS_WRITE_TIMEOUT" default:"3s"`

    // Kafka
    KafkaBrokers        []string      `env:"GOACD_KAFKA_BROKERS" required:"true"`
    KafkaGroupID        string        `env:"GOACD_KAFKA_GROUP_ID" default:"goacd"`
    KafkaBatchSize      int           `env:"GOACD_KAFKA_BATCH_SIZE" default:"100"`
    KafkaBatchTimeout   time.Duration `env:"GOACD_KAFKA_BATCH_TIMEOUT" default:"100ms"`

    // PostgreSQL
    PGURL               string        `env:"GOACD_PG_URL" required:"true"`
    PGMaxConns          int32         `env:"GOACD_PG_MAX_CONNS" default:"20"`

    // SIP/Voice
    SIPDomain           string        `env:"GOACD_SIP_DOMAIN" required:"true"`
    ExtRangeStart       int           `env:"GOACD_EXT_RANGE_START" default:"1000"`
    ExtRangeEnd         int           `env:"GOACD_EXT_RANGE_END" default:"9999"`

    // Kamailio DB (for SIP trunk credential management + location queries)
    // V2.2: NOT used for agent SIP auth (ephemeral tokens via shared secret)
    KamailioDBHost      string        `env:"GOACD_KAMAILIO_DB_HOST"`
    KamailioDBName      string        `env:"GOACD_KAMAILIO_DB_NAME" default:"kamailio"`
    KamailioDBUser      string        `env:"GOACD_KAMAILIO_DB_USER" default:"kamailio"`
    KamailioDBPassword  string        `env:"GOACD_KAMAILIO_DB_PASSWORD"`

    // V2.2: Ephemeral SIP auth shared secret (must match Kamailio auth_ephemeral config)
    SIPEphemeralSecret  string        `env:"GOACD_SIP_EPHEMERAL_SECRET" required:"true"`

    // Leader Election
    LeaderTTL           time.Duration `env:"GOACD_LEADER_TTL" default:"10s"`
    LeaderRenewInterval time.Duration `env:"GOACD_LEADER_RENEW" default:"3s"`
    LeaderAcquireRetry  time.Duration `env:"GOACD_LEADER_ACQUIRE_RETRY" default:"1s"`

    // Call Handling
    MaxCallDuration     time.Duration `env:"GOACD_MAX_CALL_DURATION" default:"4h"`
    DefaultRingTimeout  int           `env:"GOACD_RING_TIMEOUT" default:"15"` // seconds
    CandidateListSize   int           `env:"GOACD_CANDIDATE_LIST_SIZE" default:"5"`
    ParallelRingCount   int           `env:"GOACD_PARALLEL_RING_COUNT" default:"2"`
    CallSnapshotInterval time.Duration `env:"GOACD_CALL_SNAPSHOT_INTERVAL" default:"2s"`
    DefaultACWTimeout   time.Duration `env:"GOACD_ACW_TIMEOUT" default:"60s"`
    MaxMissedCalls      int           `env:"GOACD_MAX_MISSED_CALLS" default:"2"`

    // IVR
    IVRMaxNodes         int           `env:"GOACD_IVR_MAX_NODES" default:"50"`
    IVRHTTPTimeout      time.Duration `env:"GOACD_IVR_HTTP_TIMEOUT" default:"5s"`
    DefaultFallbackQueueID string     `env:"GOACD_DEFAULT_FALLBACK_QUEUE"`

    // Recording Sync
    RecordingSyncWorkers  int           `env:"GOACD_RECORDING_SYNC_WORKERS" default:"4"`
    RecordingRetryMax     int           `env:"GOACD_RECORDING_RETRY_MAX" default:"5"`
    RecordingRetryBase    time.Duration `env:"GOACD_RECORDING_RETRY_BASE" default:"10s"`
    RecordingDiskLimit    float64       `env:"GOACD_RECORDING_DISK_LIMIT" default:"0.85"`
    RecordingCleanupDelay time.Duration `env:"GOACD_RECORDING_CLEANUP_DELAY" default:"1h"`

    // Customer Cache
    CustomerCacheSize     int           `env:"GOACD_CUSTOMER_CACHE_SIZE" default:"10000"`
    CustomerCacheTTL      time.Duration `env:"GOACD_CUSTOMER_CACHE_TTL" default:"5m"`

    // Session Reaper
    SessionReaperInterval time.Duration `env:"GOACD_SESSION_REAPER_INTERVAL" default:"30s"`
    StaleClaimReaperInterval time.Duration `env:"GOACD_STALE_CLAIM_REAPER_INTERVAL" default:"15s"`
    ReconciliationInterval   time.Duration `env:"GOACD_RECONCILIATION_INTERVAL" default:"60s"`
}
```

```go
// ─── Module Interfaces ─────────────────────────────────

// IRoutingStrategy — pluggable routing strategies
type IRoutingStrategy interface {
    Name() string
    Score(agent AgentCandidate, call RoutingContext) float64
}

// Built-in strategies:
//   SkillBasedStrategy  — score = skill × load × idle × group × affinity (default)
//   RoundRobinStrategy  — equal distribution
//   LongestIdleStrategy — highest idle time wins
//   RingAllStrategy     — parallel ring all available agents

// IQueueDrainer — called when an agent becomes available
type IQueueDrainer interface {
    OnAgentAvailable(agentID string, channel ChannelType) error
}

// IEventSink — abstraction over event destinations
type IEventSink interface {
    Publish(ctx context.Context, topic string, event interface{}) error
    PublishBatch(ctx context.Context, topic string, events []interface{}) error
}

// ICallSessionHandler — lifecycle hooks for call session
type ICallSessionHandler interface {
    OnCallStarted(session *call.Session)
    OnCallAnswered(session *call.Session)
    OnCallEnded(session *call.Session, cause string)
    OnCallTransferred(session *call.Session, toAgent string)
}

// IAgentStateObserver — notified on agent state changes
type IAgentStateObserver interface {
    OnStateChanged(agentID string, oldState, newState string)
}
```

```go
// ─── Key Data Types ────────────────────────────────────

type ChannelType string
const (
    ChannelVoice ChannelType = "voice"
    ChannelChat  ChannelType = "chat"
    ChannelEmail ChannelType = "email"
)

type CallState string
const (
    CallStateIVR      CallState = "ivr"
    CallStateQueued   CallState = "queued"
    CallStateRinging  CallState = "ringing"
    CallStateActive   CallState = "active"
    CallStateHold     CallState = "hold"
    CallStateWrapUp   CallState = "wrap_up"
)

type AgentVoiceStatus string
const (
    AgentOffline    AgentVoiceStatus = "offline"
    AgentRegistered AgentVoiceStatus = "registered"
    AgentReady      AgentVoiceStatus = "ready"
    AgentNotReady   AgentVoiceStatus = "not_ready"
    AgentRinging    AgentVoiceStatus = "ringing"
    AgentOnCall     AgentVoiceStatus = "on_call"
    AgentWrapUp     AgentVoiceStatus = "wrap_up"
)

// RoutingContext — all info needed for routing decision
type RoutingContext struct {
    CallID          string
    InteractionID   string
    QueueID         string
    RequiredSkills  []string
    Priority        int             // 1=low, 2=normal, 3=high, 4=urgent
    CustomerID      string
    CustomerVIP     bool
    CallerNumber    string
    IVRSelections   []string
    Tags            map[string]string
    EnqueuedAt      time.Time
}

// AgentCandidate — agent evaluated during routing
type AgentCandidate struct {
    AgentID       string
    Extension     string
    FSInstance    string
    Skills        map[string]float64  // skill_name → proficiency (0.0-1.0)
    CurrentLoad   float64             // current_interactions / max_interactions
    IdleSeconds   float64             // seconds since last call ended
    GroupMatch    float64             // 1.0 if in same queue group, 0.5 if overflow
    Affinity      float64             // 1.0 if served this customer before, 0.0 otherwise
    Score         float64             // computed score (filled by routing engine)
}

// CallSnapshot — serialized to Redis for HA recovery
type CallSnapshot struct {
    CallID            string    `json:"call_id"`
    InteractionID     string    `json:"interaction_id"`
    CallerChannel     string    `json:"caller_channel"`
    AgentChannel      string    `json:"agent_channel"`
    AgentID           string    `json:"agent_id"`
    AgentExtension    string    `json:"agent_extension"`
    FSInstance        string    `json:"fs_instance"`
    State             CallState `json:"state"`
    QueueID           string    `json:"queue_id"`
    Recording         bool      `json:"recording"`
    RecordingPath     string    `json:"recording_path"`
    StartedAt         time.Time `json:"started_at"`
    AnsweredAt        time.Time `json:"answered_at,omitempty"`
    SnapshotAt        time.Time `json:"snapshot_at"`
    CorrelationID     string    `json:"correlation_id"`
    TransferHistory   []string  `json:"transfer_history,omitempty"`
}

// CDR — Call Detail Record
type CDR struct {
    ID              string            `json:"id"`
    CallID          string            `json:"call_id"`
    InteractionID   string            `json:"interaction_id"`
    Caller          string            `json:"caller"`
    Callee          string            `json:"callee"`
    AgentID         string            `json:"agent_id"`
    AgentExtension  string            `json:"agent_extension"`
    QueueID         string            `json:"queue_id"`
    StartTime       time.Time         `json:"start_time"`
    AnswerTime      *time.Time        `json:"answer_time,omitempty"`
    EndTime         time.Time         `json:"end_time"`
    Duration        int               `json:"duration"`           // total seconds
    TalkTime        int               `json:"talk_time"`          // answer→end seconds
    QueueWaitTime   int               `json:"queue_wait_time"`
    IVRTime         int               `json:"ivr_time"`
    HangupCause     string            `json:"hangup_cause"`
    RecordingPath   string            `json:"recording_path"`
    IVRSelections   []string          `json:"ivr_selections"`
    RoutingData     json.RawMessage   `json:"routing_data"`
    TransferHistory []string          `json:"transfer_history"`
    CorrelationID   string            `json:"correlation_id"`
}

// KafkaEvent types — published to Kafka topics
type CallStartedEvent struct {
    CallID        string    `json:"call_id"`
    InteractionID string    `json:"interaction_id"`
    Caller        string    `json:"caller"`
    CalledDID     string    `json:"called_did"`
    Timestamp     time.Time `json:"timestamp"`
    CorrelationID string    `json:"correlation_id"`
}

type CallAnsweredEvent struct {
    CallID        string    `json:"call_id"`
    AgentID       string    `json:"agent_id"`
    WaitTime      float64   `json:"wait_time_seconds"`
    Timestamp     time.Time `json:"timestamp"`
    CorrelationID string    `json:"correlation_id"`
}

type CallEndedEvent struct {
    CallID        string    `json:"call_id"`
    Duration      int       `json:"duration"`
    HangupCause   string    `json:"hangup_cause"`
    Timestamp     time.Time `json:"timestamp"`
    CorrelationID string    `json:"correlation_id"`
}

type AgentStateChangedEvent struct {
    AgentID       string    `json:"agent_id"`
    Channel       string    `json:"channel"`
    OldStatus     string    `json:"old_status"`
    NewStatus     string    `json:"new_status"`
    Reason        string    `json:"reason,omitempty"`
    Timestamp     time.Time `json:"timestamp"`
}
```

## 18.4.7 Redis Data Model (Consolidated)

All Redis keys used by GoACD, consolidated in one place for implementation reference.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GoACD Redis Data Model                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ── Agent State ──────────────────────────────────────────────────────  │
│                                                                         │
│  HASH  agent:state:{agentId}                    TTL: none (persistent)  │
│    voice_status        = "ready"|"not_ready"|"ringing"|"originating"|"on_call"|"wrap_up"  │
│    voice_reason        = "break"|"training"|""                          │
│    voice_count         = 0|1                     (current active calls) │
│    max_voice           = 1                       (max concurrent voice) │
│    voice_claimed_by    = "{callId}"              (set during ringing)   │
│    voice_claimed_at    = 1710000000              (unix timestamp)       │
│    extension           = "1007"                                         │
│    sip_registered      = "1"|"0"                                        │
│    sip_last_register   = 1710000000              (unix timestamp)       │
│    fs_instance         = "nextgenvoice01.omicx.vn"                                 │
│    last_state_change   = 1710000000                                     │
│    last_call_ended     = 1710000000              (for idle time calc)   │
│    miss_count          = 0                       (consecutive misses)   │
│                                                                         │
│  SET   agent:available:{channel}                TTL: none               │
│    Members: agentId1, agentId2, ...                                     │
│    (agents available for routing on this channel)                        │
│                                                                         │
│  SET   agent:skills:{skillName}                 TTL: none               │
│    Members: agentId1, agentId2, ...                                     │
│    (agents with this skill — used for SINTER with available set)        │
│                                                                         │
│  HASH  agent:skills:proficiency:{agentId}       TTL: none               │
│    {skillName} = "0.9"                           (proficiency 0.0-1.0)  │
│                                                                         │
│  SET   agent:queue:{queueId}                    TTL: none               │
│    Members: agentId1, agentId2, ...                                     │
│    (agents assigned to this queue)                                      │
│                                                                         │
│  HASH  agent:miss_count:{agentId}               TTL: 3600 (1 hour)     │
│    count = 0|1|2                                                        │
│    (consecutive missed calls — resets on successful answer)             │
│                                                                         │
│  ── Queue ────────────────────────────────────────────────────────────  │
│                                                                         │
│  ZSET  queue:{queueId}:entries                  TTL: none               │
│    Score: priority × 1000000 + (MAX_TS - enqueueTimestamp)              │
│    Member: interactionId                                                │
│    (sorted: higher priority + older → higher score → popped first)      │
│                                                                         │
│  HASH  queue:{queueId}:config                   TTL: none               │
│    name, routing_strategy, sla_seconds, moh_stream,                     │
│    overflow_queue_id, max_queue_size, ring_timeout                       │
│    required_skills (JSON array)                                         │
│                                                                         │
│  HASH  queue:{queueId}:stats                    TTL: none (updated live)│
│    entries_count, agents_available, agents_on_call,                      │
│    avg_wait_time, calls_handled_today, sla_breaches_today               │
│                                                                         │
│  ── Routing ──────────────────────────────────────────────────────────  │
│                                                                         │
│  HASH  routing:attempt:{callId}                 TTL: 300s               │
│    call_id, interaction_id, queue_id,                                    │
│    candidates (JSON: ["agentId:score", ...]),                            │
│    current_index, attempts, started_at, status                           │
│                                                                         │
│  ── Active Calls (HA Snapshots) ──────────────────────────────────────  │
│                                                                         │
│  HASH  goacd:active_calls                       TTL: 30s (auto-cleanup) │
│    {callId} = JSON(CallSnapshot)                                        │
│    (snapshotted every 2s by leader — used for failover recovery)        │
│                                                                         │
│  ── Leader Election ──────────────────────────────────────────────────  │
│                                                                         │
│  STRING goacd:leader                            TTL: 10s (renewed 3s)   │
│    Value: instanceId (e.g., "goacd-1")                                  │
│    Set via: SET NX EX (only acquired if key doesn't exist)              │
│                                                                         │
│  ── IVR Flows (Cache) ──────────────────────────────────────────────── │
│                                                                         │
│  STRING ivr:flow:{flowId}                       TTL: 600s (10 min)      │
│    Value: JSON(FlowDefinition)                                          │
│    (cached from PostgreSQL — invalidated on SyncFlowDefinition gRPC)    │
│                                                                         │
│  HASH  ivr:did_mapping                          TTL: none               │
│    {DID_number} = "{flowId}"                                            │
│    (which IVR flow handles which inbound DID)                           │
│                                                                         │
│  ── Idempotency ──────────────────────────────────────────────────────  │
│                                                                         │
│  STRING dedup:{requestId}                       TTL: 60s                │
│    Value: "1"                                                           │
│    (prevents duplicate gRPC request processing)                         │
│                                                                         │
│  ── Customer Affinity ────────────────────────────────────────────────  │
│                                                                         │
│  STRING customer:last_agent:{customerId}        TTL: 86400 (24h)        │
│    Value: agentId                                                       │
│    (last agent who served this customer — for affinity routing)         │
│                                                                         │
│  ── Pub/Sub Channels ─────────────────────────────────────────────────  │
│                                                                         │
│  CHANNEL channel:agent:{agentId}                                        │
│    → Agent-specific events (incoming call, state change)                │
│  CHANNEL channel:queue:{queueId}                                        │
│    → Queue events (new entry, agent assigned)                           │
│  CHANNEL channel:supervisor                                              │
│    → Supervisor events (SLA breach, overflow)                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key sizing estimates (2,000 concurrent agents, 5,000 concurrent calls):**

| Redis Key Pattern | Count | Avg Size | Total RAM |
|---|---|---|---|
| `agent:state:*` | 2,000 | ~500B | ~1MB |
| `agent:available:voice` | 1 set, ~1,000 members | ~20KB | ~20KB |
| `agent:skills:*` | ~50 skill sets | ~10KB each | ~500KB |
| `queue:*:entries` | ~100 queues | ~5KB each | ~500KB |
| `queue:*:config` | ~100 queues | ~1KB each | ~100KB |
| `routing:attempt:*` | 5,000 | ~500B | ~2.5MB |
| `goacd:active_calls` | 1 hash, 5,000 fields | ~1KB each | ~5MB |
| `ivr:flow:*` | ~20 flows | ~10KB each | ~200KB |
| **Total** | | | **~10MB** |

## 18.4.8 Concurrency Model

```
┌────────────────────────────────────────────────────────────────────┐
│                    GoACD Goroutine Architecture                     │
│                                                                     │
│  ┌─ Main Goroutine ────────────────────────────────────────────┐   │
│  │  main() → NewGoACD() → LeaderElection(ctx)                  │   │
│  │  Blocks on leader election loop                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                          │                                          │
│                  (becomes leader)                                    │
│                          ▼                                          │
│  ┌─ Leader Services (started on election) ─────────────────────┐   │
│  │                                                              │   │
│  │  ┌─ gRPC Server Goroutine ──────────────────────────────┐   │   │
│  │  │  grpc.NewServer().Serve(listener)                     │   │   │
│  │  │  → spawns goroutine per gRPC request (managed by gRPC)│   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ REST Server Goroutine ──────────────────────────────┐   │   │
│  │  │  http.Server.ListenAndServe()                         │   │   │
│  │  │  → goroutine per HTTP request (managed by net/http)   │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ Outbound ESL Accept Loop (1 goroutine) ────────────┐   │   │
│  │  │  for { conn := listener.Accept(); go handle(conn) }   │   │   │
│  │  │  → spawns goroutine per call (bounded by semaphore)   │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │       │                                                      │   │
│  │       ├─ Call Session Goroutine #1 ──────────────┐           │   │
│  │       │  handleOutboundESL(conn)                  │           │   │
│  │       │  IVR → Queue → Route → Bridge → CDR      │           │   │
│  │       │   ├─ eslWriter goroutine (1 per session)  │           │   │
│  │       │   └─ queueMonitor goroutine (if queued)   │           │   │
│  │       │  Lifetime: same as call                   │           │   │
│  │       │  Cleanup: defer removeSession + cancel    │           │   │
│  │       ├──────────────────────────────────────────┘           │   │
│  │       ├─ Call Session Goroutine #2 ... #N                    │   │
│  │       └─ (up to ESLMaxConnections=5000)                      │   │
│  │                                                              │   │
│  │  ┌─ Inbound ESL Client Goroutines (1 per FS instance) ─┐   │   │
│  │  │  connectAndSubscribe(fsHost)                          │   │   │
│  │  │  → receives: sofia::register, CHANNEL_*, DTMF, etc.  │   │   │
│  │  │  → dispatches events to appropriate handler           │   │   │
│  │  │  → auto-reconnects on disconnect                      │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ Background Workers (long-lived goroutines) ─────────┐   │   │
│  │  │  • leaderRenewer     — renews Redis lock every 3s     │   │   │
│  │  │  • callSnapshotter   — snapshots active calls / 2s    │   │   │
│  │  │  • sessionReaper     — kills zombie sessions / 30s    │   │   │
│  │  │  • staleClaimReaper  — releases stuck claims / 15s    │   │   │
│  │  │  • reconciliator     — SIP/Redis reconciliation / 60s │   │   │
│  │  │  • queueDrainer      — checks queues on agent-ready   │   │   │
│  │  │  • redisHealthCheck  — pool metrics / 5s              │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ Kafka Consumer Goroutines (1 per topic) ────────────┐   │   │
│  │  │  • agent.created / agent.updated / agent.deleted       │   │   │
│  │  │  • queue.voice.updated / queue.agent.assigned          │   │   │
│  │  │  • agent.ws.disconnected (cross-trigger from WS)       │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ Recording Sync Pool (N=4 worker goroutines) ────────┐   │   │
│  │  │  • uploadWorker #1..4 — upload recordings to SeaweedFS│   │   │
│  │  │  • verificationWorker — verify uploads / 5min         │   │   │
│  │  │  • cleanupWorker      — delete local files / 15min    │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Context Cancellation Tree:                                         │
│    rootCtx (main)                                                   │
│      └─ leaderCtx (cancelled on leadership loss or shutdown)        │
│           ├─ eslAcceptCtx                                           │
│           │   └─ callSessionCtx #1..N (cancelled on call end/4h)    │
│           ├─ inboundESLCtx #1..M (per FS instance)                  │
│           ├─ backgroundWorkerCtx                                     │
│           ├─ kafkaConsumerCtx                                        │
│           ├─ grpcServerCtx                                           │
│           └─ recordingSyncCtx                                        │
│                                                                     │
│  Communication Channels:                                             │
│    • ESLCommand chan (per call session, buffered=32)                 │
│    •  agentReadyCh chan string (agentID → triggers queue drain)      │
│    • recordingUploadCh chan RecordingJob (buffered=1000)             │
│    • eventBus (internal pub/sub for module-to-module events)        │
│                                                                     │
│  Synchronization:                                                    │
│    • sessionMu (RWMutex) — guards activeSessions map                │
│    • Redis Lua scripts — guards agent state (cross-instance safe)   │
│    • wg (WaitGroup) — tracks all goroutines for graceful shutdown   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**Goroutine count estimate (steady state, 2,000 agents, 5,000 calls):**

| Goroutine Type | Count | Lifecycle |
|---|---|---|
| Main + leader election | 1 | Process lifetime |
| gRPC server (net/http2) | ~50 | Per-request, short-lived |
| REST server (net/http) | ~10 | Per-request, short-lived |
| ESL accept loop | 1 | Leader lifetime |
| Call session handlers | 5,000 | Per-call (~3 min avg) |
| ESL writers (1 per call) | 5,000 | Per-call |
| Queue monitors (queued calls) | ~500 | Until agent found |
| Inbound ESL clients | 2-3 | Leader lifetime (per FS) |
| Background workers | 7 | Leader lifetime |
| Kafka consumers | 3 | Leader lifetime |
| Recording sync pool | 6 | Leader lifetime |
| **Total** | **~10,580** | |

Memory: ~10,580 goroutines x 8KB stack = **~83MB** (goroutine overhead only, well within limits).

## 18.4.9 Startup & Graceful Shutdown Lifecycle

```go
func main() {
    // ── Phase 1: Load Config & Initialize Dependencies ───────
    cfg := config.Load()                   // parse env vars, validate required fields
    logger := zap.Must(buildLogger(cfg))   // structured logger with instance ID
    defer logger.Sync()

    // ── Phase 2: Connect to External Services ────────────────
    redisClient := connectRedis(cfg)       // with pool sizing from config
    pgPool := connectPostgres(cfg)         // with max conns from config
    kafkaWriter := connectKafkaProducer(cfg)

    // ── Phase 3: Initialize Modules ──────────────────────────
    goacd := NewGoACD(cfg, logger, redisClient, pgPool, kafkaWriter)

    // ── Phase 4: Start Prometheus Metrics Server ─────────────
    // (runs regardless of leader status — standby also exports metrics)
    go goacd.startMetricsServer()

    // ── Phase 5: Start pprof Debug Server ────────────────────
    go func() {
        http.ListenAndServe(":6060", nil) // pprof registered via import
    }()

    // ── Phase 6: Enter Leader Election Loop ──────────────────
    // Blocks until:
    //   a) becomes leader → runs services → loses leadership → re-enters loop
    //   b) shutdown signal received
    rootCtx, rootCancel := context.WithCancel(context.Background())

    // ── Phase 7: Signal Handler ──────────────────────────────
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)

    go func() {
        sig := <-sigCh
        logger.Info("received shutdown signal", zap.String("signal", sig.String()))
        rootCancel()
    }()

    // ── Phase 8: Run ─────────────────────────────────────────
    goacd.LeaderElection(rootCtx)

    // ── Phase 9: Graceful Shutdown ───────────────────────────
    goacd.Shutdown()
    logger.Info("GoACD shutdown complete")
}
```

**Graceful Shutdown Procedure:**

```go
func (g *GoACD) Shutdown() {
    g.logger.Info("initiating graceful shutdown...")
    shutdownStart := time.Now()

    // Step 1: Stop accepting new calls (1s)
    //   Close ESL listener → FreeSWITCH outbound connections refused
    //   FS retries → eventually routes to other GoACD instance (if clustered)
    //   Or FS mod_callcenter takes over (fallback, if configured)
    g.stopESLListener()
    g.logger.Info("ESL listener closed — no new calls accepted")

    // Step 2: Stop gRPC server gracefully (5s)
    //   GracefulStop() waits for in-flight RPCs to complete
    g.grpcServer.GracefulStop()
    g.logger.Info("gRPC server stopped")

    // Step 3: Drain active calls (up to 30s)
    //   Wait for active calls to finish naturally
    //   If call is in IVR/queue: route to fallback immediately
    //   If call is active (bridged): let it continue up to drain timeout
    drainCtx, drainCancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer drainCancel()
    g.drainActiveCalls(drainCtx)
    g.logger.Info("active calls drained", zap.Int("remaining", len(g.activeSessions)))

    // Step 4: Force-cleanup remaining sessions
    //   Any calls still active after 30s: snapshot to Redis for recovery by other instance
    g.sessionMu.Lock()
    for callID, session := range g.activeSessions {
        g.snapshotCallToRedis(callID, session)
        session.Cancel()
    }
    g.sessionMu.Unlock()

    // Step 5: Release leader lock
    //   Explicit DELETE so standby can acquire immediately (vs waiting TTL)
    g.releaseLeaderLock()
    g.logger.Info("leader lock released")

    // Step 6: Flush Kafka producer
    g.kafkaWriter.Close()

    // Step 7: Close connections
    g.redis.Close()
    g.pgPool.Close()

    // Step 8: Wait for all goroutines
    g.wg.Wait()

    g.logger.Info("graceful shutdown complete",
        zap.Duration("duration", time.Since(shutdownStart)))
}

func (g *GoACD) drainActiveCalls(ctx context.Context) {
    ticker := time.NewTicker(500 * time.Millisecond)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return // drain timeout exceeded
        case <-ticker.C:
            g.sessionMu.RLock()
            count := len(g.activeSessions)
            g.sessionMu.RUnlock()

            if count == 0 {
                return // all calls finished
            }

            // Force-route any IVR/queued calls to fallback
            g.sessionMu.RLock()
            for _, session := range g.activeSessions {
                if session.State == CallStateIVR || session.State == CallStateQueued {
                    go g.routeToFallbackQueue(session.Snapshot())
                    session.Cancel()
                }
            }
            g.sessionMu.RUnlock()
        }
    }
}
```

**Shutdown timeline (worst case):**

```
T=0s    SIGTERM received
T=0s    ESL listener closed (instant)
T=1s    gRPC GracefulStop (in-flight RPCs finish)
T=1-31s Active calls draining (IVR/queued forced immediately, bridged wait up to 30s)
T=31s   Remaining sessions snapshot to Redis + force-cancel
T=31s   Leader lock released → standby acquires immediately
T=32s   Kafka flushed, Redis/PG closed
T=33s   All goroutines joined via WaitGroup
T=33s   Process exits cleanly
```

## 18.4.10 Internal Module Interaction

```
┌────────────────────────────────────────────────────────────────────┐
│                  GoACD Internal Module Dependencies                 │
│                                                                     │
│  External Input                    External Output                  │
│  ─────────────                     ───────────────                  │
│  FreeSWITCH ESL ─┐           ┌──→ FreeSWITCH ESL (commands)       │
│  gRPC requests ──┤           ├──→ Kafka (events)                   │
│  Kafka events ───┤           ├──→ Redis Pub/Sub (realtime UI)      │
│  REST requests ──┘           └──→ PostgreSQL (CDR, recording sync) │
│                                                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                   │
│  │  ESL     │────→│  IVR     │────→│  Queue   │                   │
│  │ Manager  │     │  Engine  │     │  Manager │                   │
│  │          │     │          │     │          │                   │
│  │ • accept │     │ • flow   │     │ • enqueue│                   │
│  │ • inbound│     │   exec   │     │ • drain  │                   │
│  │ • events │     │ • DTMF   │     │ • SLA    │                   │
│  │ • reconnect    │ • fallback│     │ • MOH    │                   │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘                   │
│       │                │                │                          │
│       │         RoutingHints      agent available                  │
│       │                │                │                          │
│       │                ▼                ▼                          │
│       │           ┌──────────────────────────┐                    │
│       │           │    Routing Engine         │                    │
│       │           │                          │                    │
│       │           │ • scoring (§7.2)         │                    │
│       │           │ • candidate selection    │                    │
│       │           │ • atomic claim (Lua)     │                    │
│       │           │ • parallel ring          │                    │
│       │           │ • no-answer re-route     │                    │
│       │           └────────┬─────────────────┘                    │
│       │                    │                                       │
│       │               bridge ESL                                   │
│       │                    │                                       │
│       ▼                    ▼                                       │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                   │
│  │  Agent   │←───→│  Call    │────→│  CDR     │                   │
│  │  State   │     │  Tracker │     │ Generator│                   │
│  │ Manager  │     │          │     │          │                   │
│  │          │     │ • session│     │ • collect │                   │
│  │ • Redis  │     │ • transfer│    │   events  │                   │
│  │ • status │     │ • conf   │     │ • publish │                   │
│  │ • sync   │     │ • recording│   │   Kafka   │                   │
│  └────┬─────┘     └────┬─────┘     └──────────┘                   │
│       │                │                                           │
│       │                │                                           │
│       ▼                ▼                                           │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                   │
│  │ Heartbeat│     │ Recording│     │  Event   │                   │
│  │ Monitor  │     │  Sync    │     │ Publisher│                   │
│  │          │     │          │     │          │                   │
│  │ • SIP    │     │ • upload │     │ • Kafka  │                   │
│  │   probe  │     │ • verify │     │ • Redis  │                   │
│  │ • WS     │     │ • cleanup│     │   Pub/Sub│                   │
│  │   cross  │     │ • dead   │     │ • gRPC   │                   │
│  │ • recon  │     │   letter │     │   stream │                   │
│  └──────────┘     └──────────┘     └──────────┘                   │
│                                                                     │
│  ── API Layer ─────────────────────────────────────────────────    │
│                                                                     │
│  ┌──────────┐     ┌──────────┐                                    │
│  │  gRPC    │     │  REST    │                                    │
│  │  Server  │     │  Server  │                                    │
│  │          │     │          │                                    │
│  │ • agent  │     │ • health │                                    │
│  │   state  │     │ • metrics│                                    │
│  │ • call   │     │ • queue  │                                    │
│  │   control│     │   stats  │                                    │
│  │ • queue  │     │ • config │                                    │
│  │ • IVR    │     │ • debug  │                                    │
│  │ • events │     │          │                                    │
│  └──────────┘     └──────────┘                                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**Module dependency rules:**
1. **ESL Manager** -- used by IVR Engine, Routing Engine, Call Tracker (via CallSession.SendESL)
2. **Agent State Manager** -- used by Routing Engine (check available), Heartbeat Monitor (force offline), gRPC Server (set status)
3. **Routing Engine** -- uses Agent State (claim/release), ESL Manager (bridge), Queue Manager (dequeue)
4. **Queue Manager** -- uses Routing Engine (on agent available), ESL Manager (MOH via CallSession)
5. **No circular dependencies** -- Queue->Routing is event-based (agentReadyCh), not direct call

## 18.4.11 Health Check & Admin REST API

```go
// REST API endpoints (port 9092)

// ─── Health ────────────────────────────────────────────
// GET /health                  → 200 {"status":"ok"} or 503
// GET /health/ready            → 200 if leader and all deps connected
// GET /health/live             → 200 always (process alive)

func (r *RESTServer) healthHandler(w http.ResponseWriter, req *http.Request) {
    health := HealthStatus{
        Status:    "ok",
        Instance:  r.goacd.config.InstanceID,
        IsLeader:  r.goacd.isLeader.Load(),
        Uptime:    time.Since(r.startTime).String(),
        Checks: map[string]CheckResult{
            "redis":       r.checkRedis(),
            "postgres":    r.checkPostgres(),
            "kafka":       r.checkKafka(),
            "freeswitch":  r.checkFreeSWITCH(),
        },
    }

    for _, check := range health.Checks {
        if !check.OK {
            health.Status = "degraded"
            w.WriteHeader(http.StatusServiceUnavailable)
            break
        }
    }

    json.NewEncoder(w).Encode(health)
}

type HealthStatus struct {
    Status    string                   `json:"status"`
    Instance  string                   `json:"instance"`
    IsLeader  bool                     `json:"is_leader"`
    Uptime    string                   `json:"uptime"`
    Checks    map[string]CheckResult   `json:"checks"`
}

type CheckResult struct {
    OK       bool          `json:"ok"`
    Latency  string        `json:"latency"`
    Error    string        `json:"error,omitempty"`
}

// ─── Monitoring ────────────────────────────────────────
// GET /api/v1/stats                → system stats summary
// GET /api/v1/agents               → all agent states
// GET /api/v1/agents/:id           → single agent state
// GET /api/v1/queues               → all queue stats
// GET /api/v1/queues/:id           → single queue stats
// GET /api/v1/calls                → active calls
// GET /api/v1/calls/:id            → single call detail

// ─── Admin Operations ──────────────────────────────────
// POST /api/v1/agents/:id/force-offline  → force agent offline
// POST /api/v1/calls/:id/force-hangup    → force hangup a call
// POST /api/v1/queues/:id/drain          → drain queue to overflow
// POST /api/v1/ivr/reload                → reload IVR flows from DB
// POST /api/v1/reconcile                 → trigger manual reconciliation

// ─── Debug ─────────────────────────────────────────────
// GET /api/v1/debug/sessions       → active session details (dev only)
// GET /api/v1/debug/goroutines     → goroutine dump
// GET /api/v1/debug/redis-keys     → Redis key scan (dev only)
```

## 18.4.12 Logging & Distributed Tracing

```go
// Structured logging with zap — all log entries include:
// - instance_id: which GoACD instance
// - correlation_id: traces a call across all log lines
// - component: which module (esl, ivr, routing, queue, agent, call, recording)

// Log levels per component (configurable via env):
//   GOACD_LOG_LEVEL=info (default)
//   GOACD_LOG_LEVEL_ESL=debug       (verbose ESL for troubleshooting)
//   GOACD_LOG_LEVEL_ROUTING=info
//   GOACD_LOG_LEVEL_IVR=info

// Example log output:
// {"level":"info","ts":"2024-03-17T10:30:15Z","caller":"routing/engine.go:142",
//  "msg":"agent claimed","instance":"goacd-1","correlation_id":"abc-123",
//  "component":"routing","agent_id":"agent-007","call_id":"fs-uuid-456",
//  "claim_latency_ms":0.8}

// Distributed tracing:
// correlation_id is generated at call start and propagated to:
//   1. All GoACD log lines for this call
//   2. SIP header X-GoACD-Correlation-ID (→ Kamailio → Agent Desktop)
//   3. Kafka events (correlation_id field)
//   4. gRPC metadata (x-correlation-id)
//   5. CDR record (correlation_id column)
//   6. Recording sync metadata (x-amz-meta-correlation-id in SeaweedFS)
//
// This allows tracing a single call from PSTN ingress through IVR, queue,
// routing, bridge, recording, CDR, audit — across all services.

func (g *GoACD) newCallLogger(callID, correlationID string) *zap.Logger {
    return g.logger.With(
        zap.String("call_id", callID),
        zap.String("correlation_id", correlationID),
        zap.String("component", "call"),
    )
}
```

## 18.4.13 Testing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    GoACD Testing Pyramid                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1 — Unit Tests (go test, ~70% coverage target)           │
│  ─────────────────────────────────────────────────               │
│  • Routing scoring algorithm (deterministic, no I/O)             │
│  • Agent state machine transitions (mock Redis)                  │
│  • IVR flow parser & node traversal (mock ESL conn)              │
│  • CDR generation from call events                               │
│  • Config parsing & validation                                   │
│  • Queue entry scoring formula                                   │
│  • Customer cache TTL & eviction                                 │
│  • CallSnapshot serialization/deserialization                    │
│                                                                  │
│  Tools: Go standard testing, testify/assert, gomock              │
│  Run: `go test ./internal/... -short`                            │
│                                                                  │
│  Layer 2 — Integration Tests (docker-compose, ~20%)              │
│  ────────────────────────────────────────────────                 │
│  • Redis Lua scripts (real Redis in Docker)                      │
│    - Atomic claim: concurrent goroutines claiming same agent     │
│    - Release: verify state after release                         │
│    - Stale claim: verify reaper cleanup                          │
│  • Kafka event publish/consume round-trip                        │
│  • PostgreSQL CDR insert/query                                   │
│  • gRPC server: SetAgentState, MakeCall end-to-end               │
│  • Leader election: simulate failover (kill leader process)      │
│                                                                  │
│  Tools: testcontainers-go (Redis, PG, Kafka in Docker)           │
│  Run: `go test ./internal/... -tags=integration`                 │
│                                                                  │
│  Layer 3 — ESL Integration Tests (~5%)                           │
│  ─────────────────────────────────────                            │
│  • Real FreeSWITCH in Docker + GoACD                             │
│  • Test: outbound ESL connection, playback, bridge               │
│  • Test: inbound ESL events (sofia::register simulation)         │
│  • Test: IVR flow execution with actual DTMF simulation          │
│    (FS originate → socket → GoACD → play_and_get_digits)         │
│                                                                  │
│  Tools: docker-compose with FS, SIPp for SIP load generation     │
│  Run: `go test ./test/esl_integration/... -tags=esl`             │
│                                                                  │
│  Layer 4 — End-to-End / Load Tests (~5%)                         │
│  ────────────────────────────────────────                         │
│  • Full stack: Kamailio + rtpengine + FS + GoACD + Redis         │
│  • SIPp: generate 1,000 concurrent calls                         │
│  • Verify: calls routed, answered, CDR generated, recording saved│
│  • Measure: call setup time < 3s, claim latency < 5ms            │
│  • Stress: 5,000 concurrent calls, verify no goroutine leaks     │
│  • Failover: kill GoACD leader, verify standby takes over < 10s  │
│                                                                  │
│  Tools: SIPp, k6 (for gRPC load), custom Go test harness         │
│  Run: `make e2e-test` (requires full docker-compose up)          │
│                                                                  │
│  Key Test Scenarios (must-pass before production):                │
│  ──────────────────────────────────────────────                   │
│  ✓ Concurrent claim: 100 goroutines claim same agent → exactly 1 │
│  ✓ No-answer re-route: agent-1 timeout → agent-2 rings → answers │
│  ✓ Browser crash: SIP.js killed → agent marked offline < 30s     │
│  ✓ GoACD failover: kill leader → standby takes over → active     │
│    calls continue (bridged audio not interrupted)                 │
│  ✓ IVR fallback: invalid flow → caller routed to default queue   │
│  ✓ Recording sync: upload failure → retry → success → cleanup    │
│  ✓ Parallel ring: 2 agents ring → 1 answers → other released    │
│  ✓ Cross-FS transfer: agent on FS-1 → transfer to agent on FS-2 │
│  ✓ Memory stability: 4-hour soak test, no goroutine growth       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 18.4.14 Build & Dockerfile

```dockerfile
# services/goacd/Dockerfile

# ── Stage 1: Build ────────────────────────────────────
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w -X main.version=$(git describe --tags --always)" \
    -o /goacd ./cmd/goacd/main.go

# ── Stage 2: Runtime ──────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata curl

# Non-root user
RUN addgroup -S goacd && adduser -S goacd -G goacd
USER goacd

COPY --from=builder /goacd /usr/local/bin/goacd

# Health check
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:9092/health/live || exit 1

EXPOSE 9090 9091 9092 9093

ENTRYPOINT ["goacd"]
```

```makefile
# services/goacd/Makefile

.PHONY: build test lint run docker

build:
	go build -o bin/goacd ./cmd/goacd/

test:
	go test ./internal/... -short -race -count=1

test-integration:
	go test ./internal/... -tags=integration -race -count=1

test-esl:
	go test ./test/esl_integration/... -tags=esl -count=1 -timeout=5m

lint:
	golangci-lint run ./...

run:
	go run ./cmd/goacd/

docker:
	docker build -t goacd:latest .

proto:
	protoc --go_out=. --go-grpc_out=. internal/api/proto/goacd.proto
```

---

## Related Files

- [18-3-acd-evaluation.md](./18-3-acd-evaluation.md) -- ACD/Queue Server Evaluation & Decision (Options A-F comparison, decision rationale)
