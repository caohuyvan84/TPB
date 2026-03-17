<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 6. Channel Adapter Plugin Architecture

## 6.1 IChannelAdapter Interface

```typescript
/**
 * Universal channel adapter interface.
 * Every channel (voice, email, social, SMS) implements this.
 */
interface IChannelAdapter {
  /** Unique channel type identifier */
  readonly channelType: ChannelType;

  /** Sub-channel identifier (e.g., 'facebook', 'zalo', 'gmail') */
  readonly subChannel: string;

  /** Initialize adapter with config */
  initialize(config: ChannelAdapterConfig): Promise<void>;

  /** Graceful shutdown */
  shutdown(): Promise<void>;

  /** Check adapter health */
  healthCheck(): Promise<AdapterHealthStatus>;

  /** Send outbound message to customer */
  sendMessage(message: OutboundMessage): Promise<SendResult>;

  /** Register callback for inbound messages */
  onInbound(handler: (message: ChannelMessage) => Promise<void>): void;

  /** Register callback for delivery status updates */
  onDeliveryStatus(handler: (status: DeliveryStatus) => Promise<void>): void;

  /** Get adapter capabilities */
  getCapabilities(): AdapterCapabilities;
}

interface AdapterCapabilities {
  canSendText: boolean;
  canSendAttachments: boolean;
  canSendRichMedia: boolean;   // buttons, cards, carousels
  canReceiveMedia: boolean;     // images, video, audio
  canInitiateOutbound: boolean;
  canTransfer: boolean;
  supportsTypingIndicator: boolean;
  supportsReadReceipts: boolean;
  supportsWebhooks: boolean;
  maxMessageLength?: number;
}

interface ChannelAdapterConfig {
  tenantId: string;
  channelType: ChannelType;
  subChannel: string;
  credentials: Record<string, any>;  // encrypted at rest
  settings: Record<string, any>;
  webhookUrl?: string;
}
```

## 6.2 ChannelMessage (Normalized Lingua Franca)

```typescript
/**
 * Normalized message format — lingua franca between all adapters and the routing engine.
 */
interface ChannelMessage {
  /** Unique message ID (UUID) */
  id: string;

  /** Channel type */
  channelType: ChannelType;

  /** Sub-channel (facebook, zalo, gmail, ms365, freeswitch, etc.) */
  subChannel: string;

  /** Tenant ID */
  tenantId: string;

  /** Direction */
  direction: 'inbound' | 'outbound';

  /** External conversation/thread ID from the channel */
  externalConversationId: string;

  /** Sender info */
  sender: {
    externalId: string;       // phone number, email, social ID
    displayName?: string;
    avatarUrl?: string;
  };

  /** Recipient info */
  recipient: {
    externalId: string;
    displayName?: string;
  };

  /** Message content */
  content: {
    type: 'text' | 'html' | 'rich' | 'media' | 'system';
    text?: string;
    html?: string;
    subject?: string;         // for email
    attachments?: Attachment[];
    richElements?: RichElement[];  // buttons, cards, quick replies
  };

  /** Original raw payload from adapter */
  rawPayload?: Record<string, any>;

  /** Metadata */
  metadata: {
    /** Mapped customer ID (if known) */
    customerId?: string;
    /** Interaction ID (if already assigned) */
    interactionId?: string;
    /** Priority override */
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    /** VIP flag */
    isVip?: boolean;
    /** Tags from IVR or flow */
    tags?: string[];
    /** Custom fields from flow */
    custom?: Record<string, any>;
  };

  /** Timestamps */
  timestamp: string;          // ISO 8601
  receivedAt: string;         // when gateway received it
}

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'voice_message';
  url?: string;               // external URL or SeaweedFS presigned URL
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface RichElement {
  type: 'button' | 'card' | 'carousel' | 'quick_reply' | 'list';
  data: Record<string, any>;
}
```

## 6.3 Adapter Registry

```typescript
/**
 * Runtime adapter registry — supports hot-loading adapters without service restart.
 * Satisfies Requirement R7 (open plugin architecture) and R16 (runtime config changes).
 */
class ChannelAdapterRegistry {
  private adapters = new Map<string, IChannelAdapter>();

  /** Register adapter — key = `${channelType}:${subChannel}:${tenantId}` */
  async register(adapter: IChannelAdapter, config: ChannelAdapterConfig): Promise<void>;

  /** Unregister and shutdown adapter */
  async unregister(key: string): Promise<void>;

  /** Get adapter by key */
  get(channelType: ChannelType, subChannel: string, tenantId: string): IChannelAdapter | undefined;

  /** List all registered adapters with health */
  async listWithHealth(): Promise<AdapterRegistryEntry[]>;

  /** Reload adapter config without restart (R16) */
  async reloadConfig(key: string, newConfig: ChannelAdapterConfig): Promise<void>;
}
```

## 6.4 Built-in Adapters (Phase 1-3)

| Adapter | Channel | Sub-Channel | Protocol | Phase |
|---|---|---|---|---|
| **`FreeSwitchAdapter`** | **voice** | **freeswitch** | **GoACD gRPC** | **Phase 1** |
| `GmailAdapter` | email | gmail | Google Gmail API (push + pull) | Phase 1 |
| `MicrosoftAdapter` | email | ms365 | Microsoft Graph API (webhooks) | Phase 1 |
| `ImapAdapter` | email | imap | IMAP + SMTP | Phase 2 |
| `FacebookAdapter` | social | facebook | Facebook Graph API + Webhooks | Phase 2 |
| `ZaloAdapter` | social | zalo | Zalo OA API + Webhooks | Phase 2 |
| `WhatsAppAdapter` | social | whatsapp | WhatsApp Business Cloud API | Phase 3 |
| `LiveChatAdapter` | chat | livechat | Internal WebSocket | Phase 1 |
| `TwilioSmsAdapter` | sms | twilio | Twilio REST API + Webhooks | Phase 3 |
| `LocalSmsAdapter` | sms | local | Local carrier API | Phase 3 |

**Note:** In V2, `FreeSwitchAdapter` in CTI Adapter Service (MS-19) is a thin gRPC client that delegates all voice operations to GoACD. It implements the same `IChannelAdapter` interface but the actual logic is in GoACD.

```typescript
// CTI Adapter Service: FreeSwitchAdapter
class FreeSwitchAdapter implements IChannelAdapter {
  channelType = 'voice';
  subChannel = 'freeswitch';

  constructor(private goacdClient: GoACDServiceClient) {} // gRPC client

  async sendMessage(msg: ChannelMessage): Promise<SendResult> {
    // Voice: "send" = make outbound call
    return this.goacdClient.makeCall({ from: msg.sender, to: msg.recipient });
  }

  async handleIncoming(msg: ChannelMessage): Promise<void> {
    // GoACD pushes events to CTI Adapter via gRPC stream
    // CTI Adapter normalizes and forwards to Omnichannel services
  }

  // Call control delegated to GoACD
  async holdCall(callId: string) { return this.goacdClient.holdCall({ callId }); }
  async transferCall(callId: string, dest: string) { return this.goacdClient.transferCall({ callId, destination: dest }); }
  // ... etc
}
```

---

## Related Files

- [07-routing-engine.md](./07-routing-engine.md) -- Routing Engine Design (consumes ChannelMessage from adapters)
- [08-agent-state-management.md](./08-agent-state-management.md) -- Agent State Management (agent availability used by routing)
