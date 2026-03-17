<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# Frontend Agent Desktop Changes

> **Source:** V1 Section 14

---

## 14.1 Expanded Channel Filters

**Current InteractionList filters:** `all | voice | email | chat | missed`
**Chat sub-filters:** `facebook | zalo | livechat`

**New filters:**
```
all | voice | email | chat | social | sms | missed
                              │
                              ├── livechat
                              │
              social ─────────┤
                              ├── facebook
                              ├── zalo
                              └── whatsapp
```

**Implementation:** Extend `useInteractionStats` hook to support `channelType` + `subChannel` filtering.

## 14.2 Unified Chat Panel

The center panel's Chat tab should handle all text-based channels uniformly:

| Feature | Live Chat | Facebook | Zalo | WhatsApp | SMS |
|---|---|---|---|---|---|
| Text messages | Yes | Yes | Yes | Yes | Yes |
| Images | Yes | Yes | Yes | Yes | No |
| Files | Yes | Yes | Yes | Yes | No |
| Rich messages (buttons, cards) | Yes | Yes | Yes | Yes | No |
| Typing indicator | Yes | Yes | No | Yes | No |
| Read receipts | Yes | Yes | No | Yes | Yes |
| Quick replies | Yes | Yes | Yes | Yes | No |

**Component:** Extend `ChatTimeline.tsx` to render channel-specific rich elements (Facebook templates, Zalo interactive messages, WhatsApp buttons).

## 14.3 WebRTC Softphone

Replace mock `FloatingCallWidget` with real softphone:

```
┌─────────────────────────────┐
│  Active Call — 02:34         │
│  Nguyen Van A  0901234567   │
│                              │
│  [Mute] [Hold] [Transfer]   │
│  [Dialpad] [Conference]     │
│  [End Call]                  │
│                              │
│  Audio: Built-in Mic         │
│         Headset              │
└─────────────────────────────┘
```

**Key Features:**
- SIP.js registration on login
- Incoming call alert with caller info (customer lookup)
- Audio device selection
- DTMF dialpad
- Blind + attended transfer
- 3-way conference
- Call recording indicator
- Call quality indicator (MOS score)

## 14.4 WebSocket Consolidation

**Before:** 3 separate channel instances
```typescript
wsClient.connect(token);          // :8000
ctiChannel.connect(agentId, token); // :3019
notificationChannel.connect(agentId, token); // :3006
```

**After:** Single connection, namespace-based
```typescript
class UnifiedSocketClient {
  private socket: Socket;

  connect(token: string) {
    this.socket = io('ws://gateway:8000', {
      auth: { token },
      transports: ['websocket'],
    });
  }

  get agent() { return this.socket.io.socket('/agent'); }
  get interactions() { return this.socket.io.socket('/interactions'); }
  get cti() { return this.socket.io.socket('/cti'); }
  get notifications() { return this.socket.io.socket('/notifications'); }
  get chat() { return this.socket.io.socket('/chat'); }
}
```

## 14.5 Enhanced Agent Status Widget

**Current:** 3 channels (voice, email, chat)
**New:** 5+ channels with per-channel interaction counts

```
┌─────────────────────────────────────┐
│ Agent Status                    ✓   │
│                                     │
│  Voice    [Ready ▼]      0/1       │
│  Email    [Ready ▼]      2/5       │
│  Chat     [Ready ▼]      1/3       │
│  Social   [Ready ▼]      0/3       │
│  SMS      [Not Ready ▼]  0/5       │
│                                     │
│ Overall: Ready (3/17 capacity)      │
│ [Set All Ready] [Set All Not Ready] │
└─────────────────────────────────────┘
```

## 14.6 New React Query Hooks

```typescript
// New hooks needed
useAgentGroups()              // list groups for current agent
useAgentSkills()              // list skills for current agent
useQueueStatus()              // real-time queue metrics
useWebRtcConnection()         // SIP.js lifecycle management
useChatMessages(interactionId) // real-time chat messages
useFlowDesigner(flowId)       // flow CRUD for admin module
useChannelConfig()            // channel configuration for admin
useLiveChatWidget()           // widget customization for admin
```

---

## Related Files

- [voice-platform/webrtc-integration.md](./voice-platform/webrtc-integration.md) -- WebRTC stack details that the softphone in Section 14.3 connects to
- [09-channel-designs.md](./09-channel-designs.md) -- Per-channel backend designs that these frontend changes consume
- [12-performance-architecture.md](./12-performance-architecture.md) -- WebSocket consolidation server-side architecture (Section 12.4)
- [11-type-system.md](./11-type-system.md) -- `ChannelType`, `SubChannel`, `InteractionType` used in filters and display
- [13-admin-ui.md](./13-admin-ui.md) -- Admin UI that configures flows and channels consumed by the agent desktop
