<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# Appendix A: File Changes Summary

> **Source:** V1 Appendix A (updated for V2 FreeSWITCH/GoACD architecture)
> **Last updated:** 2026-03-17

## Backend — Modified Services

| Service | Files Changed | Key Changes |
|---|---|---|
| Interaction Service (MS-3) | entity, service, controller, DTOs | Add `channelType`, `subChannel`, `createInteraction`, `transfer`, `timeline`, Kafka publishing |
| Agent Service (MS-2) | entity, service, controller, gateway | Structured skills, groups CRUD, Redis integration, capacity tracking |
| CTI Adapter (MS-19) | adapter interface, service, FreeSWITCH module | FreeSWITCH/GoACD integration, `IPbxProvider` abstraction, WebRTC credential provisioning, gRPC client to GoACD |
| Notification Service (MS-6) | Add WebSocket gateway | Real-time push via WS namespace |

## Backend — New Services

| Service | Port | Est. Files |
|---|---|---|
| Channel Gateway (MS-20) | 3020 | ~25 files (entities, adapters, service, controller, Kafka) |
| Routing Engine (MS-21) | 3021 | ~30 files (entities, scoring, queue, flow engine, Kafka) |

## Backend — New Files in CTI Adapter Service (MS-19)

| Path | Purpose |
|---|---|
| `adapters/pbx-provider.interface.ts` | `IPbxProvider` + sub-interfaces (`IPbxExtensionManager`, `IPbxQueueManager`, `IPbxCallControl`, `IPbxAgentStateManager`, `IPbxCdrProvider`, `IPbxEventSubscriber`) |
| `adapters/freeswitch/freeswitch-grpc-client.ts` | gRPC client for GoACD communication |
| `adapters/freeswitch/freeswitch-extension-manager.ts` | Extension CRUD via GoACD gRPC (Kamailio subscriber provisioning) |
| `adapters/freeswitch/freeswitch-queue-manager.ts` | Queue CRUD via GoACD gRPC (Redis-backed queues) |
| `adapters/freeswitch/freeswitch-call-control.ts` | Call control (make, answer, hold, transfer, conference) via GoACD gRPC |
| `adapters/freeswitch/freeswitch-agent-state.ts` | Agent state sync — GoACD is single authority; state read via gRPC |
| `adapters/freeswitch/freeswitch-cdr-provider.ts` | CDR fetch from GoACD Kafka events + mapping to interaction format |
| `adapters/freeswitch/freeswitch-event-subscriber.ts` | Kafka consumer for GoACD-published events (call state, agent state, CDR) |
| `adapters/freeswitch/freeswitch-mapper.ts` | Data mapping (GoACD/FreeSWITCH <-> Omnichannel entities) |
| `adapters/freeswitch/freeswitch.adapter.ts` | `FreeSwitchAdapter` — implements `IChannelAdapter` + `IPbxProvider` |
| `sync/agent-sync.service.ts` | Kafka-driven agent <-> extension sync + reconciliation |
| `sync/queue-sync.service.ts` | Omnichannel queue -> GoACD queue sync via gRPC |
| `sync/state-sync.service.ts` | Agent state sync — GoACD is authority, Omnichannel subscribes via Kafka |
| `sync/cdr-sync.service.ts` | CDR Kafka consumer -> Interaction Service |
| `sync/recording-sync.service.ts` | BullMQ job: FreeSWITCH recordings -> SeaweedFS |
| `entities/pbx-extension-mapping.entity.ts` | `agentId <-> extension_number` mapping |
| `entities/pbx-queue-mapping.entity.ts` | `omniQueueId <-> goAcdQueueId` mapping |
| `entities/pbx-cdr-record.entity.ts` | CDR records synced from GoACD |
| `webrtc/webrtc-credential.service.ts` | Credential provisioning for SIP.js (Kamailio WSS endpoint + TURN credentials) |

## Backend — GoACD Service (New, Go)

| Path | Purpose |
|---|---|
| `cmd/goacd/main.go` | Entry point, config loading, service initialization |
| `internal/esl/connection.go` | ESL connection management (outbound server + inbound client) |
| `internal/esl/commands.go` | ESL command builders (bridge, playback, play_and_get_digits, etc.) |
| `internal/agent/registry.go` | Agent registry: extension allocation, state machine |
| `internal/agent/state.go` | Agent state machine (Redis-backed) |
| `internal/queue/manager.go` | Queue manager: Redis sorted sets, enqueue/dequeue, SLA timer |
| `internal/routing/engine.go` | Routing engine: scoring algorithm, TOP-3 candidates, atomic claim |
| `internal/routing/delivery.go` | Call delivery: bridge via ESL, no-answer timer, re-routing |
| `internal/ivr/engine.go` | IVR flow executor |
| `internal/ivr/nodes.go` | IVR node implementations (play, collect, menu, HTTP) |
| `internal/cdr/generator.go` | CDR generation from call events |
| `internal/grpc/server.go` | gRPC server (SetAgentState, GetAgentState, MakeCall, HangupCall, etc.) |
| `internal/kafka/producer.go` | Kafka event publishing (call events, CDR, agent state) |
| `internal/kafka/consumer.go` | Kafka consumer (agent.created/updated/deleted) |
| `api/rest/server.go` | REST API for admin/monitoring |
| `api/metrics/prometheus.go` | Prometheus metrics exporter |
| `proto/goacd.proto` | gRPC service definition |

## Frontend — Modified

| Component | Change |
|---|---|
| `websocket-client.ts` + `cti-channel.ts` + `notification-channel.ts` | Replace with `UnifiedSocketClient` |
| `InteractionList.tsx` | Expand channel filters for `social`, `sms`, sub-channels |
| `FloatingCallWidget.tsx` | Replace with `WebRtcSoftphone` |
| `ChatTimeline.tsx` | Add rich element rendering per channel |
| `AgentStatusWidget.tsx` | Add social + SMS channels |
| `useInteractionStats.tsx` | Support new channel/sub-channel types |
| `EnhancedAgentStatusContext.tsx` | Add social + SMS status management |

## Frontend — New

| Component | Purpose |
|---|---|
| `WebRtcSoftphone.tsx` | SIP.js-based browser calling (registers to Kamailio WSS) |
| `RichMessageRenderer.tsx` | Render channel-specific rich messages |
| `QueueStatusPanel.tsx` | Real-time queue metrics display |
| Admin: `IvrFlowDesigner.tsx` | IVR flow builder (React Flow) |
| Admin: `EmailFlowDesigner.tsx` | Email flow builder |
| Admin: `ChatFlowDesigner.tsx` | Chat/social flow builder |
| Admin: `SkillManagement.tsx` | Skill CRUD |
| Admin: `GroupManagement.tsx` | Agent group CRUD |
| Admin: `QueueConfiguration.tsx` | Queue CRUD |
| Admin: `ChannelConfiguration.tsx` | Channel adapter config |
| Admin: `LiveChatWidgetDesigner.tsx` | Widget customization |
| `tpb-chat-widget/` | Embeddable live chat widget project |

---

## Related Files

- [15-implementation-plan.md](../15-implementation-plan.md) — phase/sprint assignments for these file changes
- [05-new-services.md](../05-new-services.md) — service architecture for Channel Gateway (MS-20) and Routing Engine (MS-21)
- [appendix-d-docker-ports.md](./appendix-d-docker-ports.md) — port mapping for all infrastructure components
