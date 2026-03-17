<!-- Part of: docs/omnichannel-upgrade/09-channel-designs/ — See ../INDEX.md for navigation -->

# 9.5 Live Chat Channel

> **Source:** V1 Section 9.5
> **Last updated:** 2026-03-17

The Live Chat channel provides an **embeddable JavaScript widget** that customers add to their website. The widget communicates with the Channel Gateway via WebSocket for real-time messaging.

---

## Architecture

```
Website --> tpb-chat-widget.js --> WebSocket --> Channel Gateway (MS-20) --> ChannelMessage
                                                        |
                                                        v
                                              Routing Engine (MS-21) --> Agent Desktop
```

---

## Widget Features

- **Embeddable single JS file** — built via Vite library mode, served from CDN
- **Customizable via admin** — colors, logo, position, greeting message
- **File upload** — images, documents (stored in MinIO)
- **Typing indicators** — bidirectional (customer and agent)
- **Pre-chat form** — configurable fields (name, phone, topic)
- **Chat transcript download** — customer can download conversation history
- **Offline form** — displayed when no agents are available; creates a ticket
- **Mobile responsive** — adapts to viewport size, full-screen on mobile

---

## Widget Initialization

```html
<script src="https://chat.tpb.vn/widget.js"></script>
<script>
  TPBChat.init({
    tenantId: 'xxx',
    position: 'bottom-right',
    theme: { primaryColor: '#1a73e8' },
    preChatForm: true,
  });
</script>
```

### Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `tenantId` | string | (required) | Tenant identifier for multi-tenant routing |
| `position` | `'bottom-right'` \| `'bottom-left'` | `'bottom-right'` | Widget position on page |
| `theme.primaryColor` | string (hex) | `'#1a73e8'` | Primary brand color |
| `theme.logo` | string (URL) | TPB logo | Custom logo URL |
| `preChatForm` | boolean | `true` | Show pre-chat form before conversation starts |
| `greeting` | string | `'Xin chao! ...'` | Initial greeting message |
| `language` | `'vi'` \| `'en'` | `'vi'` | Widget UI language |
| `offlineMessage` | string | — | Message shown when no agents available |

---

## WebSocket Protocol

The widget establishes a WebSocket connection to the Channel Gateway:

```
wss://chat.tpb.vn/ws?tenantId=xxx&sessionId=yyy
```

**Message Types (Client --> Server):**

| Type | Payload | Description |
|---|---|---|
| `chat:message` | `{ text, attachments? }` | Customer sends a message |
| `chat:typing` | `{ isTyping: boolean }` | Customer typing indicator |
| `chat:preChatForm` | `{ name, phone, topic }` | Pre-chat form submission |
| `chat:transcript` | `{}` | Request transcript download |

**Message Types (Server --> Client):**

| Type | Payload | Description |
|---|---|---|
| `chat:message` | `{ text, agentName, timestamp }` | Agent reply |
| `chat:typing` | `{ isTyping: boolean }` | Agent typing indicator |
| `chat:assigned` | `{ agentName, agentAvatar }` | Agent assigned to conversation |
| `chat:queuePosition` | `{ position, estimatedWait }` | Queue position update |
| `chat:ended` | `{ reason }` | Conversation ended |
| `chat:offline` | `{ message }` | No agents available |

---

## Chat Flow Designer Integration

Inbound chat messages can be routed through the Chat/Social/SMS Flow Designer (see [../10-flow-designer-engine.md](../10-flow-designer-engine.md)) before agent assignment. This enables:

- Bot greeting and FAQ handling
- Data collection (account number, issue type)
- External API lookups (customer verification)
- Skill-based routing based on collected data
- Automatic handoff to human agent when bot cannot resolve

---

## Related Files

- [./README.md](./README.md) — Channel designs overview
- [../06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) — `IChannelAdapter` interface that `LiveChatAdapter` implements
- [../10-flow-designer-engine.md](../10-flow-designer-engine.md) — Chat flow node types (`chat_start`, `chat_send_message`, `chat_wait_input`, etc.)
- [../11-type-system.md](../11-type-system.md) — `ChannelType.LIVECHAT` enum value
- [../12-performance-architecture.md](../12-performance-architecture.md) — WebSocket scaling targets (10k+ connections)
- [../13-admin-ui-requirements.md](../13-admin-ui-requirements.md) — Chat widget designer in Admin UI
- [../14-frontend-agent-desktop.md](../14-frontend-agent-desktop.md) — Agent Desktop chat timeline integration
