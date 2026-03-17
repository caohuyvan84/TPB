<!-- Part of: docs/omnichannel-upgrade/09-channel-designs/ — See ../INDEX.md for navigation -->

# 9.2 Email Channel

> **Source:** V1 Section 9.2
> **Last updated:** 2026-03-17

The email channel supports three integration modes: **Gmail** (Google API + Pub/Sub push), **Microsoft 365** (Graph API + Webhooks), and **Generic IMAP** (polling). All modes normalize inbound emails into the common `ChannelMessage` format via their respective adapters.

---

## 9.2.1 Gmail Integration

**Protocol:** Google Gmail API (REST + Push Notifications)

**Setup:**

1. Admin configures Google OAuth2 (service account or user consent)
2. Create Gmail watch on configured labels (inbox, specific labels)
3. Google Cloud Pub/Sub delivers push notifications on new emails
4. Adapter fetches full email via Gmail API

**Flow:**

```
Gmail Inbox --> Google Pub/Sub --> Webhook --> GmailAdapter --> ChannelMessage
                                                                      |
                                                                      v
Agent reply --> GmailAdapter.sendMessage() --> Gmail API (send with threading)
```

**Key Implementation Details:**

- OAuth2 token refresh handled automatically with retry logic
- Gmail watch subscriptions expire after 7 days; BullMQ cron job renews them
- Email threading preserved via `threadId` and `In-Reply-To` / `References` headers
- Attachments downloaded and stored in MinIO (S3-compatible), referenced by URL in `ChannelMessage`
- HTML email body sanitized before display in Agent Desktop

---

## 9.2.2 Microsoft 365 Integration

**Protocol:** Microsoft Graph API (REST + Webhooks)

**Setup:**

1. Admin configures Azure AD app registration (client ID, client secret, tenant ID)
2. Subscribe to `/me/mailFolders/inbox/messages` change notifications
3. Graph API webhook delivers notification on new emails
4. Adapter fetches email content via Graph API

**Key Implementation Details:**

- Azure AD app requires `Mail.Read` and `Mail.Send` permissions (delegated or application)
- Webhook subscriptions expire after 3 days (max for mail); auto-renewed via BullMQ cron
- Change notification includes `resourceData` with message ID; adapter fetches full message
- Reply preserves `conversationId` for threading
- Supports shared mailboxes via application permissions

---

## 9.2.3 Generic IMAP

**Protocol:** IMAP (polling) + SMTP (sending)

**Polling Strategy:** BullMQ job runs every 30 seconds per mailbox, checks for new messages since last UID.

**Key Implementation Details:**

- IMAP connection pooling (one persistent connection per configured mailbox)
- `IDLE` command used where supported (real-time push instead of polling)
- Fallback to UID-based polling for servers that do not support IDLE
- SMTP used for outbound replies; configured per mailbox (host, port, TLS, credentials)
- Supports STARTTLS and implicit TLS
- Email parsing via `mailparser` library (handles MIME, multipart, attachments, inline images)

---

## Email Flow Designer Integration

Inbound emails can be routed through the Email Flow Designer (see [../10-flow-designer-engine.md](../10-flow-designer-engine.md)) before agent assignment. Email flow nodes support:

- **Auto-categorization** — branch on subject, sender, body keywords, attachment count
- **Auto-reply** — send template-based response
- **Priority setting** — set interaction priority based on rules
- **Tag assignment** — add tags for routing
- **AI classification** — ML-based category detection
- **Queue routing** — assign to specific queue with skill requirements

---

## Related Files

- [./README.md](./README.md) — Channel designs overview
- [../06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) — `IChannelAdapter` interface that `GmailAdapter`, `Microsoft365Adapter`, and `ImapAdapter` implement
- [../10-flow-designer-engine.md](../10-flow-designer-engine.md) — Email flow node types (`email_start`, `email_condition`, `email_auto_reply`, etc.)
- [../11-type-system.md](../11-type-system.md) — `ChannelMessage` interface, `ChannelType.EMAIL` enum value
- [../13-admin-ui-requirements.md](../13-admin-ui-requirements.md) — Admin pages for email account configuration
- [../16-risk-assessment.md](../16-risk-assessment.md) — Risk R5: Email OAuth token refresh
