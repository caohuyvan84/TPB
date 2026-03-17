<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# Flow Designer Engine

> **Source:** V1 Section 10

---

## 10.1 Overview

Three flow designer types share a common execution engine and React Flow frontend:

| Flow Type | Trigger | Primary Use |
|---|---|---|
| **IVR Flow** | Inbound voice call | Greeting, DTMF menu, data lookup, queue routing |
| **Email Flow** | Inbound email | Auto-categorize, auto-reply, route to queue |
| **Chat/Social/SMS Flow** | Inbound message | Bot greeting, FAQ, data collection, handoff |

## 10.2 Flow Graph Model

```typescript
interface FlowDefinition {
  id: string;
  tenantId: string;
  name: string;
  type: 'ivr' | 'email' | 'chat_social_sms';
  channelTypes: ChannelType[];      // which channels trigger this flow
  version: number;
  isActive: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: FlowVariable[];        // flow-level variables
  createdAt: string;
  updatedAt: string;
}

interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: Record<string, any>;        // node-type-specific config
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;            // for conditional branches
  label?: string;
}
```

## 10.3 Node Types

### IVR Flow Nodes

| Node Type | Description | Config |
|---|---|---|
| `ivr_start` | Entry point | -- |
| `ivr_play_audio` | Play audio file or TTS | `audioUrl \| ttsText`, `language` |
| `ivr_collect_dtmf` | Wait for DTMF input | `maxDigits`, `timeout`, `terminateKey` |
| `ivr_menu` | DTMF-based menu routing | `options: [{digit, label, description}]` |
| `ivr_http_request` | Call external API | `url`, `method`, `headers`, `body`, `responseMapping` |
| `ivr_set_variable` | Set flow variable | `variable`, `value` (expression) |
| `ivr_condition` | Branch based on condition | `condition` (expression), true/false outputs |
| `ivr_queue` | Route to queue | `queueId`, `priority`, `skills`, `tags` |
| `ivr_transfer` | Transfer to extension/number | `destination`, `type` |
| `ivr_voicemail` | Send to voicemail | `mailboxId`, `greeting` |
| `ivr_end` | End flow | `action: 'hangup' \| 'disconnect'` |

### Email Flow Nodes

| Node Type | Description | Config |
|---|---|---|
| `email_start` | Entry point (new email received) | -- |
| `email_condition` | Branch on email attributes | `field: 'subject' \| 'from' \| 'body' \| 'attachment_count'`, `operator`, `value` |
| `email_auto_reply` | Send auto-reply | `templateId`, `variables` |
| `email_set_priority` | Set priority | `priority` |
| `email_add_tags` | Add tags | `tags[]` |
| `email_assign_queue` | Route to queue | `queueId`, `skills` |
| `email_forward` | Forward to external address | `to`, `preserveThread` |
| `email_classify` | AI classification | `model`, `categories[]` |
| `email_end` | End flow | -- |

### Chat/Social/SMS Flow Nodes

| Node Type | Description | Config |
|---|---|---|
| `chat_start` | Entry point | -- |
| `chat_send_message` | Send text/rich message | `text`, `richElements[]` |
| `chat_wait_input` | Wait for user input | `timeout`, `expectedType: 'text' \| 'button' \| 'any'` |
| `chat_condition` | Branch on input/variable | `condition` (expression) |
| `chat_set_variable` | Set variable | `variable`, `value` |
| `chat_http_request` | Call external API | `url`, `method`, `headers`, `body` |
| `chat_bot_handoff` | Hand off to external chatbot | `botEndpoint`, `botId`, `context` |
| `chat_bot_return` | Return from chatbot | `trigger: 'keyword' \| 'intent' \| 'timeout'` |
| `chat_collect_info` | Collect structured data | `fields: [{name, type, required, validation}]` |
| `chat_assign_queue` | Route to human agent | `queueId`, `skills`, `priority` |
| `chat_transfer` | Transfer to different queue/agent | `targetQueueId \| targetAgentId` |
| `chat_end` | End conversation | `closingMessage` |

## 10.4 Flow Execution Engine

**Implementation:** Lightweight state machine (NOT Temporal). Justification:
- Flows are short-lived (seconds to minutes)
- Low complexity compared to business workflows
- Temporal adds latency overhead for simple state transitions
- Hundreds of concurrent flow executions needed

```typescript
class FlowExecutor {
  /**
   * Execute a flow graph for an incoming ChannelMessage.
   * Returns routing hints for the routing engine.
   */
  async execute(
    flow: FlowDefinition,
    message: ChannelMessage,
    context: FlowExecutionContext,
  ): Promise<FlowResult> {
    let currentNodeId = this.findStartNode(flow);
    const variables = new Map<string, any>();

    while (currentNodeId) {
      const node = flow.nodes.find(n => n.id === currentNodeId);
      if (!node) break;

      const result = await this.executeNode(node, message, variables, context);

      if (result.action === 'end') break;
      if (result.action === 'wait') {
        // Persist state, resume on next message
        await this.persistState(flow.id, message, currentNodeId, variables);
        return { status: 'waiting', state: { nodeId: currentNodeId, variables } };
      }

      currentNodeId = this.getNextNode(flow, currentNodeId, result.outputHandle);
    }

    return {
      status: 'complete',
      routingHints: variables.get('__routingHints'),
    };
  }
}
```

---

## Related Files

- [07-routing-engine.md](./07-routing-engine.md) -- Routing engine that consumes the `routingHints` output from flow execution
- [13-admin-ui.md](./13-admin-ui.md) -- Admin UI for designing and managing flows
- [11-type-system.md](./11-type-system.md) -- `ChannelType` used by `FlowDefinition.channelTypes`
- [09-channel-designs.md](./09-channel-designs.md) -- Per-channel designs that trigger flow execution
