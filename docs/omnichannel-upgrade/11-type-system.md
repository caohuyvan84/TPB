<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# Expanded Type System

> **Source:** V1 Section 11

---

## 11.1 Channel Types (Before -> After)

**Before:**
```typescript
type Channel = 'voice' | 'email' | 'chat';
type InteractionType = 'call' | 'missed-call' | 'email' | 'chat';
```

**After:**
```typescript
type ChannelType = 'voice' | 'email' | 'chat' | 'social' | 'sms';

type SubChannel =
  // Voice
  | 'webex_cc' | 'freeswitch' | 'webrtc'
  // Email
  | 'gmail' | 'ms365' | 'imap'
  // Chat
  | 'livechat'
  // Social
  | 'facebook' | 'zalo' | 'whatsapp'
  // SMS
  | 'twilio' | 'local_carrier';

type InteractionType =
  | 'voice_inbound' | 'voice_outbound' | 'voice_missed' | 'voice_callback'
  | 'email_inbound' | 'email_outbound'
  | 'chat_livechat'
  | 'social_facebook' | 'social_zalo' | 'social_whatsapp'
  | 'sms_inbound' | 'sms_outbound';

type InteractionStatus =
  | 'queued'        // In queue, waiting for agent
  | 'ringing'       // Offered to agent, waiting for accept
  | 'active'        // Agent is handling
  | 'on-hold'       // Voice: on hold
  | 'wrap-up'       // Agent doing after-interaction work
  | 'transferred'   // Being transferred
  | 'resolved'      // Resolved by agent
  | 'closed'        // Closed (final state)
  | 'abandoned';    // Customer abandoned before agent answered

type AgentChannelState =
  | 'ready'
  | 'not-ready'
  | 'on-interaction'  // actively handling
  | 'ringing'         // interaction offered, pending accept
  | 'after-work'      // wrap-up / ACW
  | 'disconnected'
  | 'offline';
```

## 11.2 Updated Interaction Entity

```typescript
// New/changed fields on Interaction entity
@Column()
channelType!: ChannelType;           // was: channel: 'voice' | 'email' | 'chat'

@Column()
subChannel!: SubChannel;             // NEW: specific channel adapter

@Column()
interactionType!: InteractionType;   // was: type: 'call' | 'missed-call' | 'email' | 'chat'

@Column({ nullable: true })
queueId?: string;                    // NEW: which queue it came from

@Column({ nullable: true })
routingFlowId?: string;              // NEW: which flow processed it

@Column({ nullable: true })
externalConversationId?: string;     // NEW: thread ID from channel

@Column({ type: 'jsonb', default: {} })
routingData!: Record<string, any>;   // NEW: scoring data, queue history

@Column({ type: 'jsonb', default: [] })
transferHistory!: TransferRecord[];  // NEW: transfer audit trail
```

## 11.3 Updated Agent Profile Entity

```typescript
// New/changed fields
@Column({ type: 'jsonb', default: [] })
skills!: AgentSkill[];              // was: string[]

// New type:
interface AgentSkill {
  skillId: string;
  name: string;
  proficiency: number;  // 1-10
  category: string;     // e.g., 'product', 'language', 'technical'
}

@Column({ type: 'jsonb', default: [] })
groupIds!: string[];                 // NEW: agent group memberships

@Column({ default: 1 })
maxConcurrentVoice!: number;         // NEW: was implicit (always 1)

@Column({ default: 3 })
maxConcurrentSocial!: number;        // NEW

@Column({ default: 5 })
maxConcurrentSms!: number;           // NEW
```

## 11.4 New Entities

```typescript
// Agent Group
interface AgentGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentGroupId?: string;            // hierarchy
  requiredSkills: string[];          // skills needed for this group
  defaultQueueIds: string[];         // queues this group serves
  supervisorIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Skill Definition
interface SkillDefinition {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
}
```

---

## Related Files

- [06-channel-adapter-architecture.md](./06-channel-adapter-architecture.md) -- `ChannelMessage` type that uses `ChannelType` and `SubChannel`
- [09-channel-designs.md](./09-channel-designs.md) -- Channel-specific designs that these types support
- [08-agent-state-management.md](./08-agent-state-management.md) -- Redis structures that store `AgentChannelState`
- [10-flow-designer-engine.md](./10-flow-designer-engine.md) -- Flow definitions reference `ChannelType`
- [14-frontend-changes.md](./14-frontend-changes.md) -- Frontend uses these types for filtering and display
