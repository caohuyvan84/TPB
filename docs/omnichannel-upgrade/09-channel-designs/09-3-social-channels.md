<!-- Part of: docs/omnichannel-upgrade/09-channel-designs/ — See ../INDEX.md for navigation -->

# 9.3 Social Channels

> **Source:** V1 Section 9.3
> **Last updated:** 2026-03-17

Three social messaging platforms are supported: **Facebook Fanpage** (Messenger), **Zalo OA** (Official Account), and **WhatsApp Business**. Each has a dedicated adapter that normalizes platform-specific webhook payloads into the common `ChannelMessage` format.

---

## 9.3.1 Facebook Fanpage

**Protocol:** Facebook Graph API + Webhooks

**Setup:**

1. Admin connects Facebook Page via OAuth (Page Access Token)
2. Subscribe to `messages`, `messaging_postbacks`, `message_deliveries` webhooks
3. Adapter receives webhook events, normalizes to `ChannelMessage`

**Capabilities:**

- Text messages, images, video, files
- Quick replies, buttons, templates (generic, button, media)
- Handover protocol (bot --> human agent)
- Seen/delivery receipts

**Webhook Payload (Inbound Message):**

```json
{
  "object": "page",
  "entry": [{
    "id": "<PAGE_ID>",
    "time": 1711929600000,
    "messaging": [{
      "sender": { "id": "<PSID>" },
      "recipient": { "id": "<PAGE_ID>" },
      "timestamp": 1711929600000,
      "message": {
        "mid": "<MESSAGE_ID>",
        "text": "Hello, I need help with my account",
        "attachments": []
      }
    }]
  }]
}
```

**Key Implementation Details:**

- Page Access Token stored encrypted (AES-256-GCM) in Channel Gateway config
- Webhook verification via `hub.verify_token` challenge
- PSID (Page-Scoped User ID) used to identify conversations; mapped to customer record
- Rich message sending supports templates, quick replies, and persistent menus
- Handover protocol enables bot-to-agent escalation without losing conversation context
- Rate limits: 200 calls per hour per user, 200 calls per hour per Page

---

## 9.3.2 Zalo OA (Official Account)

**Protocol:** Zalo OA API v3 + Webhooks

**Setup:**

1. Admin configures Zalo OA app ID + secret key
2. Register webhook URL with Zalo Developer portal
3. Receive `user_send_text`, `user_send_image`, `user_send_file`, etc. events

**Capabilities:**

- Text, image, file, sticker, GIF
- List/interactive messages
- User info lookup (with consent)
- Vietnam-specific: most popular chat platform, critical for TPBank

**Webhook Payload (Inbound Message):**

```json
{
  "event_name": "user_send_text",
  "app_id": "<APP_ID>",
  "sender": {
    "id": "<USER_ID>"
  },
  "recipient": {
    "id": "<OA_ID>"
  },
  "message": {
    "msg_id": "<MSG_ID>",
    "text": "Toi can ho tro ve tai khoan"
  },
  "timestamp": "1711929600000"
}
```

**Key Implementation Details:**

- Zalo OA requires business verification (start immediately; can take 1-2 weeks)
- User consent required before accessing profile info (name, avatar)
- Message types: text, image, file, sticker, list, request_user_info
- Interactive messages support list templates with buttons
- API rate limits: 500 messages/minute per OA, 2000 individual messages/day per user
- Zalo webhook uses HMAC-SHA256 signature verification

---

## 9.3.3 WhatsApp Business

**Protocol:** WhatsApp Business Cloud API (Meta)

**Setup:**

1. Admin configures WhatsApp Business account (via Meta Business Suite)
2. Register webhook for messages
3. Send messages via templates (first 24h rule) or session messages

**Capabilities:**

- Text, image, document, video, audio, location, contacts
- Interactive messages (list, reply buttons)
- Message templates (pre-approved by Meta)
- Read receipts

**Webhook Payload (Inbound Message):**

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "<WABA_ID>",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "phone_number_id": "<PHONE_ID>" },
        "messages": [{
          "id": "<MSG_ID>",
          "from": "84912345678",
          "timestamp": "1711929600",
          "type": "text",
          "text": { "body": "I need help" }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

**Key Implementation Details:**

- 24-hour messaging window: free-form messages only within 24h of last customer message
- Outside 24h window: must use pre-approved message templates (with parameters)
- Templates require Meta approval (1-2 business days)
- Phone number verification required during setup
- Webhook verification via `hub.verify_token` challenge (same as Facebook)
- Media messages: download URL provided in webhook; adapter downloads and stores in MinIO
- End-to-end encryption handled by WhatsApp platform

---

## Related Files

- [./README.md](./README.md) — Channel designs overview
- [../06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) — `IChannelAdapter` interface that `FacebookAdapter`, `ZaloAdapter`, and `WhatsAppAdapter` implement
- [../10-flow-designer-engine.md](../10-flow-designer-engine.md) — Chat/Social flow node types (`chat_start`, `chat_send_message`, `chat_wait_input`, etc.)
- [../11-type-system.md](../11-type-system.md) — `ChannelType.FACEBOOK`, `ChannelType.ZALO`, `ChannelType.WHATSAPP` enum values
- [../13-admin-ui-requirements.md](../13-admin-ui-requirements.md) — Admin pages for social channel configuration
- [../16-risk-assessment.md](../16-risk-assessment.md) — Risk R2: Social API changes; Risk R9: Zalo API access verification
