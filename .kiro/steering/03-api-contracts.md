---
inclusion: auto
---

# API Contracts Registry

**Project:** TPB CRM Platform
**Last Updated:** 2026-03-08
**Purpose:** Track implemented API endpoints across all microservices

## 📋 Overview

This document tracks:
- ✅ Implemented endpoints
- 🟡 In progress
- ⚪ Planned (from spec)
- 🔴 Deprecated

**Total Endpoints:** 142 (from FullStack-RequirementsV3.md)
**Implemented:** 0
**In Progress:** 0

---

## MS-1: Identity Service

**Base URL:** `/api/v1/auth`, `/api/v1/users`, `/api/v1/roles`
**Database:** `identity`
**Status:** ⚪ Not Started

### Authentication Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | ⚪ | Phase 1 | JWT + refresh token, MFA trigger |
| POST | `/api/v1/auth/refresh` | ⚪ | Phase 1 | Rotate refresh token |
| POST | `/api/v1/auth/logout` | ⚪ | Phase 1 | Invalidate refresh token |
| POST | `/api/v1/auth/mfa/verify` | ⚪ | Phase 1 | TOTP verification |
| GET | `/api/v1/auth/sessions` | ⚪ | Phase 1 | List active sessions |
| DELETE | `/api/v1/auth/sessions/{sessionId}` | ⚪ | Phase 1 | Revoke session |

### User Management Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/users/me` | ⚪ | Phase 1 | Current user profile |
| GET | `/api/v1/users/{userId}` | ⚪ | Phase 1 | Get user by ID |
| GET | `/api/v1/roles` | ⚪ | Phase 1 | List all roles |
| POST | `/api/v1/auth/policy/evaluate` | ⚪ | Phase 1 | ABAC policy evaluation (internal) |

### Request/Response Schemas

**POST `/api/v1/auth/login`**
```typescript
// Request
interface LoginRequest {
  username: string;
  password: string;
  clientFingerprint: string;
}

// Response 200
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  user: {
    id: string;
    agentId: string;
    fullName: string;
    roles: string[];
    permissions: string[];
  };
  requiresMfa: boolean;
}
```

---

## MS-2: Agent Service

**Base URL:** `/api/v1/agents`
**Database:** `agent`
**Status:** ⚪ Not Started

### Agent Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/agents/me` | ⚪ | Phase 1 | Current agent profile + status |
| GET | `/api/v1/agents/me/status` | ⚪ | Phase 1 | Per-channel status |
| PUT | `/api/v1/agents/me/status/{channel}` | ⚪ | Phase 1 | Set status for channel |
| PUT | `/api/v1/agents/me/status/all` | ⚪ | Phase 1 | Set all channels |
| GET | `/api/v1/agents/me/session` | ⚪ | Phase 1 | Current session stats |
| POST | `/api/v1/agents/me/heartbeat` | ⚪ | Phase 1 | Connection keep-alive |
| GET | `/api/v1/agents` | ⚪ | Phase 1 | List agents (for transfer) |
| GET | `/api/v1/agents/{agentId}` | ⚪ | Phase 1 | Get agent by ID |
| GET | `/api/v1/agents/{agentId}/availability` | ⚪ | Phase 1 | Check availability |
| GET | `/api/v1/agents/me/settings` | ⚪ | Phase 1 | Get settings |
| PUT | `/api/v1/agents/me/settings` | ⚪ | Phase 1 | Update settings |

### WebSocket Channels

| Channel | Direction | Status | Phase |
|---|---|---|---|
| `/ws/agent/{agentId}/status` | Bidirectional | ⚪ | Phase 1 |
| `/ws/agent/{agentId}/presence` | Server→Client | ⚪ | Phase 1 |

---

## MS-3: Interaction Service

**Base URL:** `/api/v1/interactions`
**Database:** `interaction`
**Status:** ⚪ Not Started

### Interaction Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/interactions` | ⚪ | Phase 1 | List with filters |
| GET | `/api/v1/interactions/{id}` | ⚪ | Phase 1 | Detail |
| PUT | `/api/v1/interactions/{id}/status` | ⚪ | Phase 1 | Update status |
| PUT | `/api/v1/interactions/{id}/assign` | ⚪ | Phase 1 | Assign agent |
| POST | `/api/v1/interactions/{id}/transfer` | ⚪ | Phase 1 | Transfer |
| GET | `/api/v1/interactions/{id}/timeline` | ⚪ | Phase 1 | Call timeline |
| GET | `/api/v1/interactions/{id}/notes` | ⚪ | Phase 1 | List notes |
| POST | `/api/v1/interactions/{id}/notes` | ⚪ | Phase 1 | Add note |
| PUT | `/api/v1/interactions/{id}/notes/{noteId}` | ⚪ | Phase 1 | Update note |
| GET | `/api/v1/interactions/{id}/email/thread` | ⚪ | Phase 1 | Email thread |
| POST | `/api/v1/interactions/{id}/email/reply` | ⚪ | Phase 1 | Send reply |
| POST | `/api/v1/interactions/{id}/email/forward` | ⚪ | Phase 1 | Forward email |
| GET | `/api/v1/interactions/{id}/chat/messages` | ⚪ | Phase 1 | Chat messages |
| POST | `/api/v1/interactions/{id}/chat/messages` | ⚪ | Phase 1 | Send message |
| POST | `/api/v1/interactions/{id}/chat/close` | ⚪ | Phase 1 | Close chat |
| GET | `/api/v1/interactions/stats` | ⚪ | Phase 1 | Statistics |

### WebSocket Channels

| Channel | Direction | Status | Phase |
|---|---|---|---|
| `/ws/interactions/{agentId}/queue` | Server→Client | ⚪ | Phase 1 |
| `/ws/interactions/{interactionId}/chat` | Bidirectional | ⚪ | Phase 1 |
| `/ws/interactions/{interactionId}/sla` | Server→Client | ⚪ | Phase 1 |

---

## MS-4: Ticket Service

**Base URL:** `/api/v1/tickets`
**Database:** `ticket`
**Status:** ⚪ Not Started

### Ticket Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/tickets` | ⚪ | Phase 1 | List with filters |
| POST | `/api/v1/tickets` | ⚪ | Phase 1 | Create ticket |
| GET | `/api/v1/tickets/{id}` | ⚪ | Phase 1 | Detail |
| PATCH | `/api/v1/tickets/{id}` | ⚪ | Phase 1 | Update |
| DELETE | `/api/v1/tickets/{id}` | ⚪ | Phase 1 | Soft delete (admin) |
| POST | `/api/v1/tickets/{id}/comments` | ⚪ | Phase 1 | Add comment |
| GET | `/api/v1/tickets/{id}/comments` | ⚪ | Phase 1 | List comments |
| GET | `/api/v1/tickets/{id}/history` | ⚪ | Phase 1 | Change history |

---

## MS-5: Customer Service

**Base URL:** `/api/v1/customers`
**Database:** `customer`
**Status:** ⚪ Not Started

### Customer Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/customers` | ⚪ | Phase 1 | Search customers |
| GET | `/api/v1/customers/{id}` | ⚪ | Phase 1 | Profile |
| GET | `/api/v1/customers/{id}/interactions` | ⚪ | Phase 1 | History |
| GET | `/api/v1/customers/{id}/tickets` | ⚪ | Phase 1 | Tickets |
| POST | `/api/v1/customers/{id}/notes` | ⚪ | Phase 1 | Add note |
| GET | `/api/v1/customers/{id}/notes` | ⚪ | Phase 1 | List notes |
| PATCH | `/api/v1/customers/{id}` | ⚪ | Phase 1 | Update |

---

## MS-6: Notification Service

**Base URL:** `/api/v1/notifications`
**Database:** `notification`
**Status:** ⚪ Not Started

### Notification Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/notifications` | ⚪ | Phase 1 | List (paginated) |
| PATCH | `/api/v1/notifications/{id}/state` | ⚪ | Phase 1 | Update state |
| POST | `/api/v1/notifications/mark-all-read` | ⚪ | Phase 1 | Bulk mark |
| GET | `/api/v1/notifications/unread-count` | ⚪ | Phase 1 | Badge count |

### WebSocket Channels

| Channel | Direction | Status | Phase |
|---|---|---|---|
| `/ws/notifications/{agentId}` | Server→Client | ⚪ | Phase 1 |

---

## MS-7: Knowledge Service

**Base URL:** `/api/v1/kb`
**Database:** `knowledge`
**Status:** ⚪ Not Started

### Knowledge Base Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/kb/articles` | ⚪ | Phase 2 | List + search |
| GET | `/api/v1/kb/articles/{id}` | ⚪ | Phase 2 | Detail |
| POST | `/api/v1/kb/articles` | ⚪ | Phase 2 | Create |
| PATCH | `/api/v1/kb/articles/{id}` | ⚪ | Phase 2 | Update |
| GET | `/api/v1/kb/folders` | ⚪ | Phase 2 | Folder tree |
| POST | `/api/v1/kb/bookmarks` | ⚪ | Phase 2 | Bookmark |
| GET | `/api/v1/kb/bookmarks` | ⚪ | Phase 2 | List bookmarks |
| GET | `/api/v1/kb/articles/{id}/related` | ⚪ | Phase 2 | Related articles |

---

## MS-8: BFSI Core Banking Service

**Base URL:** `/api/v1/bfsi`
**Database:** `bfsi`
**Status:** ⚪ Not Started

### BFSI Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/bfsi/customers/{cif}/accounts` | ⚪ | Phase 2 | Account summary |
| GET | `/api/v1/bfsi/customers/{cif}/savings` | ⚪ | Phase 2 | Savings products |
| GET | `/api/v1/bfsi/customers/{cif}/loans` | ⚪ | Phase 2 | Loan products |
| GET | `/api/v1/bfsi/customers/{cif}/cards` | ⚪ | Phase 2 | Card products |
| GET | `/api/v1/bfsi/customers/{cif}/transactions` | ⚪ | Phase 2 | Transactions |
| POST | `/api/v1/bfsi/query` | ⚪ | Phase 2 | General query |

---

## MS-9: AI Service

**Base URL:** `/api/v1/ai`
**Database:** `ai`
**Status:** ⚪ Not Started

### AI Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| POST | `/api/v1/ai/suggest` | ⚪ | Phase 2 | Response suggestion |
| POST | `/api/v1/ai/summarize` | ⚪ | Phase 2 | Summarization |
| POST | `/api/v1/ai/classify` | ⚪ | Phase 2 | Classification |
| POST | `/api/v1/ai/sentiment` | ⚪ | Phase 2 | Sentiment analysis |
| POST | `/api/v1/ai/generate` | ⚪ | Phase 2 | Text generation |

---

## MS-10: Media Service

**Base URL:** `/api/v1/media`
**Database:** `media`
**Status:** ⚪ Not Started

### Media Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| POST | `/api/v1/media/upload` | ⚪ | Phase 2 | Upload file |
| GET | `/api/v1/media/{id}/url` | ⚪ | Phase 2 | Pre-signed URL |
| GET | `/api/v1/media/recordings/{interactionId}` | ⚪ | Phase 2 | List recordings |
| GET | `/api/v1/media/recordings/{id}/stream` | ⚪ | Phase 2 | Stream URL |

---

## MS-11: Audit Service

**Base URL:** `/api/v1/audit`
**Database:** `audit`
**Status:** ⚪ Not Started

### Audit Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/audit/logs` | ⚪ | Phase 2 | Query logs (admin) |

---

## MS-13: Object Schema Service

**Base URL:** `/api/v1/schemas`, `/api/v1/admin/object-types`
**Database:** `object_schema`
**Status:** ⚪ Not Started

### Schema Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/schemas/{objectType}` | ⚪ | Phase 2 | Get schema |
| GET | `/api/v1/schemas/{objectType}/version/{ver}` | ⚪ | Phase 2 | Specific version |
| GET | `/api/v1/admin/object-types` | ⚪ | Phase 2 | List types |
| GET | `/api/v1/admin/object-types/{name}` | ⚪ | Phase 2 | Detail |
| POST | `/api/v1/admin/object-types` | ⚪ | Phase 2 | Create type |
| PUT | `/api/v1/admin/object-types/{name}` | ⚪ | Phase 2 | Update type |
| GET | `/api/v1/admin/object-types/{name}/fields` | ⚪ | Phase 2 | List fields |
| POST | `/api/v1/admin/object-types/{name}/fields` | ⚪ | Phase 2 | Add field |
| PUT | `/api/v1/admin/object-types/{name}/fields/{id}` | ⚪ | Phase 2 | Update field |
| DELETE | `/api/v1/admin/object-types/{name}/fields/{id}` | ⚪ | Phase 2 | Remove field |

---

## MS-14: Layout Service

**Base URL:** `/api/v1/layouts`, `/api/v1/admin/layouts`
**Database:** `layout`
**Status:** ⚪ Not Started

### Layout Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/layouts/{objectType}` | ⚪ | Phase 2 | Active layouts |
| GET | `/api/v1/layouts/{objectType}/{context}` | ⚪ | Phase 2 | Layout for context |
| GET | `/api/v1/admin/layouts` | ⚪ | Phase 2 | List all |
| GET | `/api/v1/admin/layouts/{id}` | ⚪ | Phase 2 | Detail |
| POST | `/api/v1/admin/layouts` | ⚪ | Phase 2 | Create |
| PUT | `/api/v1/admin/layouts/{id}` | ⚪ | Phase 2 | Update |
| DELETE | `/api/v1/admin/layouts/{id}` | ⚪ | Phase 2 | Delete |

---

## MS-15: Workflow Service

**Base URL:** `/api/v1/workflows`, `/api/v1/admin/workflows`
**Database:** `workflow`
**Status:** ⚪ Not Started

### Workflow Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/admin/workflows` | ⚪ | Phase 3 | List workflows |
| GET | `/api/v1/admin/workflows/{id}` | ⚪ | Phase 3 | Detail |
| POST | `/api/v1/admin/workflows` | ⚪ | Phase 3 | Create |
| PUT | `/api/v1/admin/workflows/{id}` | ⚪ | Phase 3 | Update |
| DELETE | `/api/v1/admin/workflows/{id}` | ⚪ | Phase 3 | Delete |
| POST | `/api/v1/admin/workflows/{id}/activate` | ⚪ | Phase 3 | Activate |
| POST | `/api/v1/admin/workflows/{id}/deactivate` | ⚪ | Phase 3 | Deactivate |

---

## MS-16: Data Enrichment Service

**Base URL:** `/api/v1/enrichment`
**Database:** `enrichment`
**Status:** ⚪ Not Started

### Enrichment Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| POST | `/api/v1/enrichment/request` | ⚪ | Phase 3 | Request enrichment |
| GET | `/api/v1/enrichment/status/{requestId}` | ⚪ | Phase 3 | Check status |

---

## MS-17: Dashboard Service

**Base URL:** `/api/v1/dashboards`
**Database:** `dashboard`
**Status:** ⚪ Not Started

### Dashboard Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/dashboards` | ⚪ | Phase 3 | List dashboards |
| GET | `/api/v1/dashboards/{id}` | ⚪ | Phase 3 | Detail |
| GET | `/api/v1/dashboards/{id}/widgets/{widgetId}/data` | ⚪ | Phase 3 | Widget data |

---

## MS-18: Report Service

**Base URL:** `/api/v1/reports`
**Database:** `report`
**Status:** ⚪ Not Started

### Report Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| GET | `/api/v1/reports` | ⚪ | Phase 3 | List reports |
| GET | `/api/v1/reports/{id}` | ⚪ | Phase 3 | Detail |
| POST | `/api/v1/reports/{id}/embed-token` | ⚪ | Phase 3 | Guest token |

---

## MS-19: CTI Adapter Service

**Base URL:** `/api/v1/cti`, `/api/v1/admin/cti`
**Database:** `cti`
**Status:** ⚪ Not Started

### CTI Endpoints

| Method | Path | Status | Phase | Notes |
|---|---|---|---|---|
| POST | `/api/v1/cti/calls/answer` | ⚪ | Phase 2 | Answer call |
| POST | `/api/v1/cti/calls/hangup` | ⚪ | Phase 2 | End call |
| POST | `/api/v1/cti/calls/transfer` | ⚪ | Phase 2 | Transfer |
| POST | `/api/v1/cti/calls/hold` | ⚪ | Phase 2 | Hold/resume |
| GET | `/api/v1/admin/cti/config` | ⚪ | Phase 2 | Get config |
| PATCH | `/api/v1/admin/cti/config` | ⚪ | Phase 2 | Update config |

### WebSocket Channels

| Channel | Direction | Status | Phase |
|---|---|---|---|
| `/ws/cti/{agentId}/call` | Bidirectional | ⚪ | Phase 2 |

---

## 📝 Update Instructions

**When implementing an endpoint:**
1. Change status from ⚪ to 🟡 (in progress)
2. When complete, change to ✅
3. Add implementation notes
4. Document any deviations from spec
5. Update "Last Updated" date

**Status Legend:**
- ⚪ Planned (from spec)
- 🟡 In Progress
- ✅ Implemented
- 🔴 Deprecated
- ⚠️ Breaking Change

---

## 📚 References

- **FullStack-RequirementsV2.md** - MS-1 to MS-11 specifications
- **FullStack-RequirementsV3.md** - MS-13 to MS-19 specifications
- **Postman Collection:** (to be created in Phase 1)
- **OpenAPI Spec:** (to be generated from NestJS decorators)
