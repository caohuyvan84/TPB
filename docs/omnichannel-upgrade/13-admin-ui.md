<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# Admin UI Requirements

> **Source:** V1 Section 13

---

## 13.1 Flow Designers (React Flow)

All three flow designers share a common React Flow canvas component with channel-specific node palettes.

**Common Features:**
- Drag-and-drop nodes from palette
- Visual edge connections with labels
- Node configuration panel (right sidebar)
- Flow validation before save
- Version history with diff view
- Test mode (simulate flow execution)
- Import/export as JSON

### 13.1.1 IVR Flow Designer
- Node palette: all `ivr_*` nodes
- Audio file upload/TTS preview
- DTMF input simulation
- Integration with voice queue config

### 13.1.2 Email Flow Designer
- Node palette: all `email_*` nodes
- Email template editor (rich text)
- Condition builder for email attributes
- Test with sample email

### 13.1.3 Chat/Social/SMS Flow Designer
- Node palette: all `chat_*` nodes
- Rich message preview (buttons, cards)
- Chatbot handoff configuration
- Multi-channel preview (how it looks on FB, Zalo, WhatsApp)

## 13.2 Agent Group & Skill Management

**Pages:**

| Page | Features |
|---|---|
| Skill Definitions | CRUD skills with categories, bulk import |
| Agent Groups | CRUD groups with hierarchy, assign agents, set required skills |
| Agent-Skill Assignment | Matrix view: agents x skills with proficiency slider |
| Queue Configuration | CRUD queues, set SLA, overflow rules, link to groups/skills |

## 13.3 Channel Configuration

| Page | Features |
|---|---|
| Channel Overview | Dashboard of all configured channels with health status |
| Voice Config | PBX selection (Webex CC / FreeSWITCH), credentials, WebRTC toggle |
| Email Config | Gmail OAuth, MS365 OAuth, IMAP settings, per-mailbox config |
| Social Config | Facebook Page connect, Zalo OA connect, WhatsApp Business setup |
| SMS Config | Twilio credentials, local carrier API setup |
| Live Chat Config | Widget customization (colors, logo, position, greeting, pre-chat form) |

## 13.4 Live Chat Widget Designer

- Visual editor for widget appearance
- Preview (desktop + mobile)
- Pre-chat form builder
- Offline message config
- Operating hours config
- Embed code generator

---

## Related Files

- [10-flow-designer-engine.md](./10-flow-designer-engine.md) -- Backend flow execution engine and node type catalog that powers these designers
- [14-frontend-changes.md](./14-frontend-changes.md) -- Agent-facing UI that consumes flows configured here
- [11-type-system.md](./11-type-system.md) -- `AgentGroup`, `SkillDefinition` entities managed by these admin pages
- [09-channel-designs.md](./09-channel-designs.md) -- Channel adapter designs configured through these admin pages
