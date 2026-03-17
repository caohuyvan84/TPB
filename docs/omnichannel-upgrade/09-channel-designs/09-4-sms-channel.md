<!-- Part of: docs/omnichannel-upgrade/09-channel-designs/ — See ../INDEX.md for navigation -->

# 9.4 SMS Channel

> **Source:** V1 Section 9.4
> **Last updated:** 2026-03-17

The SMS channel supports two provider modes: **Twilio** (primary, international) and a **local Vietnamese carrier API** (secondary, for domestic SMS with local number formatting).

---

## Overview

**Protocol:** Twilio REST API (primary) + local carrier API (secondary)

**Capabilities:**

- Send/receive SMS
- Delivery status webhooks
- Long SMS (concatenated — messages over 160 characters split and reassembled)
- Unicode support (Vietnamese characters — diacritics, special characters)

---

## Twilio Integration (Primary)

**Inbound Flow:**

```
Customer SMS --> Twilio --> Webhook (POST /channels/sms/twilio/webhook) --> SmsAdapter --> ChannelMessage
```

**Outbound Flow:**

```
Agent reply --> SmsAdapter.sendMessage() --> Twilio REST API (POST /Messages) --> Customer phone
```

**Webhook Payload (Inbound):**

```
POST /channels/sms/twilio/webhook
Content-Type: application/x-www-form-urlencoded

MessageSid=SM...&From=%2B84912345678&To=%2B84901234567&Body=Hello+I+need+help&NumMedia=0
```

**Key Implementation Details:**

- Twilio webhook signature validation (`X-Twilio-Signature` header) for security
- Delivery status callbacks (`StatusCallback` URL) provide real-time delivery tracking
- Status values: `queued`, `sent`, `delivered`, `undelivered`, `failed`
- Phone number formatting: E.164 format (`+84912345678` for Vietnam)
- Concatenated SMS: Twilio handles segmentation automatically; adapter receives full message
- MMS support available (images, media) where carrier supports it
- Rate limiting: Twilio queue handles throughput; adapter respects per-second limits

---

## Local Carrier API (Secondary)

For domestic Vietnamese SMS where Twilio is cost-prohibitive or local number presentation is required:

- Carrier-specific REST API (varies by provider — e.g., VNPT, Viettel, FPT)
- Same `IChannelAdapter` interface; adapter implementation wraps carrier SDK
- Delivery receipt polling (some carriers do not support webhooks)
- Vietnamese character encoding (UTF-8) verified per carrier

---

## Related Files

- [./README.md](./README.md) — Channel designs overview
- [../06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) — `IChannelAdapter` interface that `TwilioSmsAdapter` and `LocalCarrierSmsAdapter` implement
- [../10-flow-designer-engine.md](../10-flow-designer-engine.md) — Chat/Social/SMS flow node types (shared with social channels)
- [../11-type-system.md](../11-type-system.md) — `ChannelType.SMS` enum value
- [../13-admin-ui-requirements.md](../13-admin-ui-requirements.md) — Admin pages for SMS provider configuration
