# Requirements Document: Phase 1 - Core MVP

## Introduction

Phase 1 delivers the Core MVP of the TPB CRM Platform Agent Desktop with real backend integration. This phase replaces all mock data in the existing React frontend with live API calls to 6 core microservices, enabling agents to authenticate, manage their status, handle interactions across voice/email/chat channels, manage tickets, view customer information, and receive real-time notifications.

**Phase Goal:** Agent Desktop với real data - không còn mock data cho core flows.

**Go-Live 1 Milestone:** Agents can log in with real credentials, view live interaction queues, manage tickets, access customer data, and receive real-time notifications via WebSocket.

**Baseline:** Phase 0 (Foundation Setup) in progress - monorepo structure, Docker Compose configuration, and NestJS service scaffolds are being established.

**Duration:** 12 weeks (Sprint 1-6)

**Exit Criteria:**
- Agent login with JWT + MFA authentication
- Interaction queue displays real data from PostgreSQL
- Ticket CRUD fully functional with real-time updates
- Customer information panel shows live data
- Notifications work via WebSocket push
- Agent status syncs with server and persists across sessions
- All mock data replaced for MS-1 through MS-6
- Unit test coverage ≥ 70% per service
- API response time P99 < 500ms @ 100 concurrent users
- Zero critical security vulnerabilities (OWASP scan)

## Glossary

- **Agent**: Customer service representative using the Agent Desktop application
- **Identity_Service**: MS-1, handles authentication, authorization, RBAC, and session management
- **Agent_Service**: MS-2, manages agent profiles, per-channel status, and presence
- **Interaction_Service**: MS-3, manages interaction lifecycle, queue, and SLA tracking
- **Ticket_Service**: MS-4, handles ticket CRUD, workflow states, and comments
- **Customer_Service**: MS-5, manages customer profiles, notes, and interaction history
- **Notification_Service**: MS-6, delivers multi-channel notifications with state management
- **JWT**: JSON Web Token, used for stateless authentication (15-minute access token)
- **Refresh_Token**: Long-lived token (7 days) for obtaining new access tokens
- **MFA**: Multi-Factor Authentication using TOTP (Time-based One-Time Password)
- **RBAC**: Role-Based Access Control, permission model based on user roles
- **Interaction**: A customer contact event (voice call, email, or chat session)
- **SLA**: Service Level Agreement, defines response time thresholds
- **CIF**: Customer Information File, unique customer identifier in core banking
- **WebSocket**: Bidirectional communication protocol for real-time updates
- **STOMP**: Simple Text Oriented Messaging Protocol, used over WebSocket
- **Kafka**: Event streaming platform for asynchronous service communication
- **Redis**: In-memory data store for caching, sessions, and pub/sub
- **PostgreSQL**: Primary relational database, one instance per microservice
- **API_Gateway**: Kong gateway handling mTLS termination, JWT validation, and rate limiting
- **SeaweedFS**: S3-compatible object storage for attachments and media files (MinIO archived December 2025)


## Requirements

### Requirement 1: Agent Authentication and Session Management

**User Story:** As an agent, I want to securely log in with my credentials and multi-factor authentication, so that I can access the Agent Desktop with proper authorization and my session remains secure.

#### Acceptance Criteria

1. WHEN an agent submits valid username and password, THE Identity_Service SHALL return a JWT access token with 15-minute expiration and a refresh token with 7-day expiration
2. WHEN an agent has MFA enabled, THE Identity_Service SHALL require TOTP verification before issuing tokens
3. IF an agent submits invalid credentials, THEN THE Identity_Service SHALL increment failed login attempts and return error with remaining attempts count
4. WHEN an agent exceeds 5 failed login attempts within 15 minutes, THE Identity_Service SHALL lock the account for 15 minutes
5. WHEN an agent's access token expires, THE Agent_Desktop SHALL automatically request a new access token using the refresh token
6. WHEN a refresh token is used, THE Identity_Service SHALL rotate the refresh token and invalidate the previous one
7. WHEN an agent logs out, THE Identity_Service SHALL revoke the refresh token and add it to Redis blacklist
8. THE Identity_Service SHALL store session metadata including IP address, user agent, and login timestamp
9. WHEN an agent requests their profile, THE Identity_Service SHALL return user details including roles, permissions, and agent ID
10. THE Identity_Service SHALL hash passwords using bcrypt with cost factor 12

### Requirement 2: Role-Based Access Control

**User Story:** As a system administrator, I want to enforce role-based permissions on all API endpoints, so that agents can only access resources they are authorized to use.

#### Acceptance Criteria

1. THE Identity_Service SHALL define roles including agent, supervisor, admin, and auditor with distinct permission sets
2. WHEN an API request is received, THE API_Gateway SHALL validate the JWT signature using RS256 algorithm
3. WHEN a JWT is invalid or expired, THE API_Gateway SHALL reject the request with 401 Unauthorized status
4. THE Identity_Service SHALL include roles and permissions in JWT claims
5. WHEN an agent attempts to access a protected endpoint, THE target service SHALL verify the required permission exists in JWT claims
6. IF an agent lacks required permissions, THEN THE service SHALL return 403 Forbidden status
7. THE Identity_Service SHALL support permission scopes including own, team, department, and all
8. WHEN permissions are updated for a role, THE Identity_Service SHALL publish a schema update event via Kafka
9. THE Identity_Service SHALL provide an endpoint to evaluate ABAC policies for complex authorization rules
10. THE Identity_Service SHALL log all authorization failures to the Audit_Service

### Requirement 3: Agent Status Management

**User Story:** As an agent, I want to set my readiness status per channel (voice, email, chat) with reasons, so that the system routes interactions appropriately and tracks my availability.

#### Acceptance Criteria

1. THE Agent_Service SHALL maintain per-channel status for each agent with values ready, not-ready, or disconnected
2. WHEN an agent sets channel status to not-ready, THE Agent_Service SHALL require a reason from the predefined list
3. THE Agent_Service SHALL support not-ready reasons including break, lunch, training, meeting, technical-issue, system-maintenance, toilet, and other
4. WHEN reason is other, THE Agent_Service SHALL require a custom reason text with maximum 200 characters
5. WHEN an agent changes channel status, THE Agent_Service SHALL publish agent.status.changed event to Kafka
6. THE Agent_Service SHALL calculate and return duration in current status in seconds
7. WHEN an agent sets all channels to ready, THE Agent_Service SHALL update all three channel statuses atomically
8. THE Agent_Service SHALL expose WebSocket channel for real-time status updates at /ws/agent/{agentId}/status
9. WHEN an agent's status changes, THE Agent_Service SHALL push status update to subscribed WebSocket clients within 1 second
10. THE Agent_Service SHALL persist status changes to PostgreSQL for historical reporting


### Requirement 4: Agent Presence and Heartbeat

**User Story:** As a supervisor, I want to see real-time agent presence status, so that I can monitor team availability and identify disconnected agents.

#### Acceptance Criteria

1. WHEN an agent logs in, THE Agent_Service SHALL create a session record with connection status connected
2. THE Agent_Desktop SHALL send heartbeat requests to Agent_Service every 30 seconds
3. WHEN a heartbeat is received, THE Agent_Service SHALL update lastHeartbeatAt timestamp
4. IF no heartbeat is received for 60 seconds, THEN THE Agent_Service SHALL mark connection status as disconnected
5. WHEN connection status changes to disconnected, THE Agent_Service SHALL publish agent.session.ended event to Kafka
6. THE Agent_Service SHALL expose WebSocket channel for presence updates at /ws/agent/{agentId}/presence
7. WHEN an agent queries available agents for transfer, THE Agent_Service SHALL return only agents with connected status and ready channel status
8. THE Agent_Service SHALL include current load per channel in agent availability response
9. THE Agent_Service SHALL filter agents by skills and department for transfer queries
10. WHEN an agent session ends, THE Agent_Service SHALL record logout timestamp and session duration

### Requirement 5: Interaction Queue Management

**User Story:** As an agent, I want to view a filtered list of interactions assigned to me or available in the queue, so that I can prioritize and handle customer contacts efficiently.

#### Acceptance Criteria

1. THE Interaction_Service SHALL support filtering interactions by channel with values voice, email, or chat
2. THE Interaction_Service SHALL support filtering by status tab with values all, queue, closed, or assigned
3. THE Interaction_Service SHALL support filtering by priority with values urgent, high, medium, or low
4. THE Interaction_Service SHALL support case-insensitive substring search on customer name and subject fields
5. WHEN an agent requests interactions, THE Interaction_Service SHALL return paginated results with page size 50
6. THE Interaction_Service SHALL return aggregate statistics including total counts per channel, status, and priority
7. THE Interaction_Service SHALL sort interactions by updatedAt timestamp in descending order by default
8. WHEN a new interaction is created, THE Interaction_Service SHALL publish interaction.created event to Kafka
9. THE Interaction_Service SHALL expose WebSocket channel for queue updates at /ws/interactions/{agentId}/queue
10. WHEN an interaction status changes, THE Interaction_Service SHALL push update to subscribed agents within 2 seconds

### Requirement 6: Interaction Lifecycle Management

**User Story:** As an agent, I want to update interaction status and add notes, so that I can track progress and document customer communications.

#### Acceptance Criteria

1. THE Interaction_Service SHALL enforce state machine transitions: new → assigned → in-progress → resolved → closed
2. WHEN an interaction is assigned to an agent, THE Interaction_Service SHALL set assignedAgentId and publish interaction.assigned event
3. WHEN an agent updates interaction status, THE Interaction_Service SHALL validate the transition is allowed
4. IF an invalid status transition is attempted, THEN THE Interaction_Service SHALL return 400 Bad Request with error message
5. THE Interaction_Service SHALL allow agents to add notes with content up to 5000 characters
6. WHEN a note is added, THE Interaction_Service SHALL record agent ID, agent name, and creation timestamp
7. THE Interaction_Service SHALL support note tags including customer-info, callback, complaint, technical, payment, and general
8. THE Interaction_Service SHALL allow agents to pin notes for visibility
9. WHEN an interaction is resolved, THE Interaction_Service SHALL record resolvedAt timestamp
10. THE Interaction_Service SHALL store interaction events in timeline including queue, ring, answer, hold, resume, transfer, and end events


### Requirement 7: SLA Tracking and Breach Detection

**User Story:** As an agent, I want to see SLA countdown timers for chat interactions, so that I can prioritize responses and avoid SLA breaches.

#### Acceptance Criteria

1. THE Interaction_Service SHALL calculate SLA deadline for chat interactions with default threshold of 5 minutes from creation
2. THE Interaction_Service SHALL track SLA status with values within-sla, near-breach, breached, not-responded, or waiting
3. WHEN SLA remaining time reaches 1 minute, THE Interaction_Service SHALL update status to near-breach
4. WHEN SLA deadline is exceeded, THE Interaction_Service SHALL update status to breached and publish sla.breached event to Kafka
5. THE Interaction_Service SHALL expose WebSocket channel for SLA updates at /ws/interactions/{interactionId}/sla
6. WHEN SLA status is near-breach or breached, THE Interaction_Service SHALL push countdown updates every 1 second
7. THE Interaction_Service SHALL calculate first response time when agent sends first message
8. THE Interaction_Service SHALL store waiting time in seconds for reporting
9. WHEN an SLA breach occurs, THE Notification_Service SHALL send urgent notification to assigned agent and supervisor
10. THE Interaction_Service SHALL include SLA metadata in interaction detail response including threshold, remaining seconds, and breach status

### Requirement 8: Email Thread Management

**User Story:** As an agent, I want to view email threads with full message history and send replies, so that I can handle customer email inquiries effectively.

#### Acceptance Criteria

1. THE Interaction_Service SHALL support email direction values inbound and outbound
2. WHEN an agent sends email reply, THE Interaction_Service SHALL validate recipient email addresses
3. THE Interaction_Service SHALL support reply, reply-all, and forward actions
4. WHEN an email is sent, THE Interaction_Service SHALL store message in thread and update interaction status to in-progress
5. THE Interaction_Service SHALL support email templates with variable substitution
6. THE Interaction_Service SHALL allow attaching files up to 25MB total per email
7. THE Interaction_Service SHALL integrate with SeaweedFS for attachment storage and virus scanning
8. THE Interaction_Service SHALL group email messages by threadId
9. WHEN an agent requests email thread, THE Interaction_Service SHALL return all messages in chronological order
10. THE Interaction_Service SHALL include message metadata: from, to, cc, bcc, subject, body, bodyHtml, and attachments

### Requirement 9: Chat Session Management

**User Story:** As an agent, I want to view chat message history and send real-time messages, so that I can provide immediate support to customers via chat channels.

#### Acceptance Criteria

1. THE Interaction_Service SHALL maintain chat session with unique sessionId
2. THE Interaction_Service SHALL store chat source with values zalo, website-livechat, or facebook-messenger
3. WHEN an agent requests chat messages, THE Interaction_Service SHALL return messages in chronological order with pagination
4. THE Interaction_Service SHALL expose WebSocket channel for chat messaging at /ws/interactions/{interactionId}/chat
5. WHEN an agent sends a chat message, THE Interaction_Service SHALL broadcast message to customer via appropriate channel gateway
6. WHEN a customer sends a message, THE Interaction_Service SHALL push message to agent via WebSocket within 500 milliseconds
7. THE Interaction_Service SHALL include message metadata: sender, content, timestamp, and message type
8. THE Interaction_Service SHALL support message types including text, image, file, and system
9. WHEN an agent closes chat session, THE Interaction_Service SHALL update interaction status to resolved
10. THE Interaction_Service SHALL calculate chat metrics including total messages, agent messages, customer messages, and average response time


### Requirement 10: Ticket Creation and Management

**User Story:** As an agent, I want to create tickets from interactions and manage ticket lifecycle, so that I can track customer issues that require follow-up beyond the initial contact.

#### Acceptance Criteria

1. WHEN an agent creates a ticket, THE Ticket_Service SHALL generate a unique display ID with format TKT-YYYY-NNNNNN
2. THE Ticket_Service SHALL require title with minimum 5 characters and maximum 200 characters
3. THE Ticket_Service SHALL require description with minimum 10 characters and maximum 5000 characters
4. THE Ticket_Service SHALL validate priority is one of low, medium, high, or urgent
5. THE Ticket_Service SHALL validate category is one of service-complaint, technical-request, info-change, product-warranty, finance-payment, or other
6. WHEN a ticket is created, THE Ticket_Service SHALL set status to new and publish ticket.created event to Kafka
7. THE Ticket_Service SHALL link ticket to originating interaction via interactionId
8. THE Ticket_Service SHALL link ticket to customer via customerId
9. THE Ticket_Service SHALL include tenant_id field for multi-tenancy support
10. THE Ticket_Service SHALL support optional due date with validation that dueAt is in the future
11. WHEN a ticket is created, THE Notification_Service SHALL send ticket-assignment notification to assigned agent

### Requirement 11: Ticket Workflow State Management

**User Story:** As an agent, I want to update ticket status through defined workflow states, so that ticket progress is tracked consistently across the team.

#### Acceptance Criteria

1. THE Ticket_Service SHALL enforce state machine: new → in-progress → waiting-response → resolved → closed
2. THE Ticket_Service SHALL allow direct transition from any state to resolved
3. WHEN ticket status changes, THE Ticket_Service SHALL record change in ticket history with old value, new value, agent ID, and timestamp
4. WHEN ticket status changes to resolved, THE Ticket_Service SHALL record resolvedAt timestamp
5. WHEN ticket status changes to closed, THE Ticket_Service SHALL record closedAt timestamp and prevent further status changes
6. IF an invalid state transition is attempted, THEN THE Ticket_Service SHALL return 400 Bad Request with allowed transitions
7. THE Ticket_Service SHALL publish ticket.updated event to Kafka on every status change
8. THE Ticket_Service SHALL calculate ticket age in hours from creation to current time or resolution
9. THE Ticket_Service SHALL support ticket assignment to different agents with assignment history tracking
10. WHEN a ticket is assigned, THE Ticket_Service SHALL publish ticket.assigned event and send notification to new assignee

### Requirement 12: Ticket Comments and Collaboration

**User Story:** As an agent, I want to add comments to tickets and mark some as internal, so that I can collaborate with team members and document resolution steps.

#### Acceptance Criteria

1. THE Ticket_Service SHALL allow agents to add comments with content up to 5000 characters
2. THE Ticket_Service SHALL support comment type with values public or internal
3. WHEN a comment is marked internal, THE Ticket_Service SHALL indicate this with isInternal flag
4. THE Ticket_Service SHALL record comment author ID, author name, and creation timestamp
5. THE Ticket_Service SHALL return comments in chronological order with oldest first
6. THE Ticket_Service SHALL support file attachments on comments with maximum 10 files per comment
7. THE Ticket_Service SHALL validate attachment total size does not exceed 25MB per comment
8. WHEN a comment is added, THE Ticket_Service SHALL update ticket updatedAt timestamp
9. THE Ticket_Service SHALL allow agents to edit their own comments within 15 minutes of creation
10. THE Ticket_Service SHALL track comment edit history with original content and edit timestamp


### Requirement 13: Customer Profile Management

**User Story:** As an agent, I want to view comprehensive customer profiles with contact information and business details, so that I can provide personalized service and understand customer context.

#### Acceptance Criteria

1. THE Customer_Service SHALL store customer CIF (Customer Information File) as unique identifier
2. THE Customer_Service SHALL encrypt CIF field using AES-256-GCM before database storage
3. THE Customer_Service SHALL encrypt PII fields including email and phone using AES-256-GCM before database storage
4. THE Customer_Service SHALL include tenant_id field for multi-tenancy support
5. THE Customer_Service SHALL support customer segments: individual, business, premium, and vip
6. THE Customer_Service SHALL calculate and return relationship length in years and months from account creation date
7. WHEN an agent requests customer profile, THE Customer_Service SHALL return decrypted PII fields only if agent has customer:read permission
8. THE Customer_Service SHALL format phone numbers in Vietnamese format (0XXX XXX XXX)
9. THE Customer_Service SHALL include satisfaction rating as decimal value from 1.0 to 5.0
10. THE Customer_Service SHALL support customer preferences including preferred channel, preferred language, and contact time preference
11. THE Customer_Service SHALL return customer avatar URL with fallback to default avatar if not set
12. THE Customer_Service SHALL cache frequently accessed customer profiles in Redis with 5-minute TTL

### Requirement 14: Customer Interaction History

**User Story:** As an agent, I want to view a customer's interaction history across all channels, so that I can understand previous contacts and provide consistent service.

#### Acceptance Criteria

1. WHEN an agent requests customer interaction history, THE Customer_Service SHALL query Interaction_Service for all interactions linked to customer ID
2. THE Customer_Service SHALL return interactions sorted by creation date in descending order
3. THE Customer_Service SHALL include interaction metadata: type, channel, status, subject, assigned agent, and timestamps
4. THE Customer_Service SHALL support pagination with default page size of 20 interactions
5. THE Customer_Service SHALL support filtering by channel, date range, and interaction type
6. THE Customer_Service SHALL aggregate interaction statistics including total count per channel and average satisfaction rating
7. THE Customer_Service SHALL indicate VIP status prominently in customer profile
8. WHEN customer data is updated, THE Customer_Service SHALL publish customer.updated event to Kafka
9. THE Customer_Service SHALL track last interaction date and display as relative time (e.g., "2 days ago")
10. THE Customer_Service SHALL include ticket count and open ticket count in customer summary

### Requirement 15: Customer Notes Management

**User Story:** As an agent, I want to add and view notes on customer profiles, so that I can document important information and share context with team members.

#### Acceptance Criteria

1. THE Customer_Service SHALL allow agents to add notes with content up to 2000 characters
2. THE Customer_Service SHALL record note author ID, author name, and creation timestamp
3. THE Customer_Service SHALL support note tags for categorization
4. THE Customer_Service SHALL allow agents to pin important notes to display at top of list
5. WHEN a note is pinned, THE Customer_Service SHALL limit maximum pinned notes to 3 per customer
6. THE Customer_Service SHALL return notes sorted by pinned status first, then by creation date descending
7. THE Customer_Service SHALL allow agents to edit their own notes
8. THE Customer_Service SHALL track note edit history with original content and modification timestamp
9. WHEN a note is added, THE Customer_Service SHALL update customer updatedAt timestamp
10. THE Customer_Service SHALL support searching notes by content with case-insensitive matching


### Requirement 16: Real-Time Notification Delivery

**User Story:** As an agent, I want to receive real-time notifications for important events, so that I can respond promptly to missed calls, ticket assignments, and system alerts.

#### Acceptance Criteria

1. THE Notification_Service SHALL support notification types: missed-call, ticket-assignment, ticket-due, system-alert, and schedule-reminder
2. THE Notification_Service SHALL assign priority to each notification: low, medium, high, or urgent
3. WHEN a notification is created, THE Notification_Service SHALL set status to new
4. THE Notification_Service SHALL include tenant_id field for multi-tenancy support
5. THE Notification_Service SHALL expose WebSocket channel at /ws/notifications/{agentId} for real-time push
6. WHEN a new notification is created, THE Notification_Service SHALL push to agent's WebSocket connection within 1 second
7. THE Notification_Service SHALL include notification metadata specific to type (e.g., caller phone for missed-call)
8. THE Notification_Service SHALL support VIP flag to highlight notifications from VIP customers
9. THE Notification_Service SHALL include action buttons with type and label (e.g., callback, view-ticket)
10. THE Notification_Service SHALL auto-expire notifications based on type-specific TTL
11. WHEN a notification expires, THE Notification_Service SHALL update status to dismissed

### Requirement 17: Notification State Management

**User Story:** As an agent, I want to manage notification states (view, action, dismiss), so that I can track which notifications I have addressed and keep my notification center organized.

#### Acceptance Criteria

1. THE Notification_Service SHALL enforce state machine: new → viewed → actioned OR new → viewed → dismissed
2. WHEN an agent views a notification, THE Notification_Service SHALL update status to viewed and record viewedAt timestamp
3. WHEN an agent clicks an action button, THE Notification_Service SHALL update status to actioned and record actionedAt timestamp
4. WHEN an agent dismisses a notification, THE Notification_Service SHALL update status to dismissed and record dismissedAt timestamp
5. THE Notification_Service SHALL allow bulk operation to mark all notifications as viewed
6. THE Notification_Service SHALL provide endpoint to get unread count for badge display
7. THE Notification_Service SHALL calculate unread count as notifications with status new
8. THE Notification_Service SHALL support filtering notifications by tab: all, calls, tickets, system, schedule
9. THE Notification_Service SHALL return tab-specific counts for each filter category
10. THE Notification_Service SHALL allow agents to clear notifications older than 24 hours

### Requirement 18: Notification Preferences and Settings

**User Story:** As an agent, I want to configure notification preferences including sound and auto-hide duration, so that I can customize notifications to my working style.

#### Acceptance Criteria

1. THE Notification_Service SHALL store agent notification settings including enabled flag and sound enabled flag
2. THE Notification_Service SHALL support auto-hide duration with values 5, 8, 10, or 15 seconds
3. THE Notification_Service SHALL support maximum active notifications with default value 3
4. THE Notification_Service SHALL allow agents to enable or disable notifications per type
5. WHEN notification settings are updated, THE Notification_Service SHALL apply changes immediately to new notifications
6. THE Notification_Service SHALL return current settings when agent requests notification preferences
7. THE Notification_Service SHALL validate auto-hide duration is one of allowed values
8. THE Notification_Service SHALL validate maximum active notifications is between 1 and 10
9. WHEN maximum active notifications is reached, THE Notification_Service SHALL queue additional notifications
10. THE Notification_Service SHALL display queued notifications when active notification count drops below maximum


### Requirement 19: Not-Ready Missed Call Warning

**User Story:** As an agent, I want to see a warning banner when I miss multiple calls while in not-ready status, so that I am aware of missed opportunities and can adjust my availability.

#### Acceptance Criteria

1. THE Notification_Service SHALL track missed calls where agent status was not-ready at time of call
2. WHEN an agent has 3 or more not-ready missed calls within 15-minute window, THE Notification_Service SHALL activate warning banner
3. THE Notification_Service SHALL include warning message with count and time window
4. THE Notification_Service SHALL reset warning counter when 15-minute window expires
5. THE Notification_Service SHALL reset warning counter when agent sets all channels to ready
6. THE Notification_Service SHALL include warning status in notification list response
7. THE Notification_Service SHALL consume agent.status.changed events from Kafka to track status
8. THE Notification_Service SHALL consume call.missed events from Kafka to track missed calls
9. THE Notification_Service SHALL correlate missed call timestamp with agent status at that time
10. THE Notification_Service SHALL provide endpoint to query current warning status

### Requirement 20: API Performance and Rate Limiting

**User Story:** As a system administrator, I want to enforce rate limits and monitor API performance, so that the system remains responsive under load and prevents abuse.

#### Acceptance Criteria

1. THE API_Gateway SHALL enforce rate limit of 100 requests per minute per agent for standard endpoints
2. THE API_Gateway SHALL enforce rate limit of 10 requests per minute per agent for sensitive endpoints
3. WHEN rate limit is exceeded, THE API_Gateway SHALL return 429 Too Many Requests with Retry-After header
4. THE API_Gateway SHALL use Redis for distributed rate limiting across multiple gateway instances
5. THE API_Gateway SHALL include rate limit headers in responses: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
6. THE API_Gateway SHALL generate unique request ID for each request and include in X-Request-Id header
7. THE API_Gateway SHALL propagate request ID to all downstream services for distributed tracing
8. WHEN API response time P99 exceeds 500 milliseconds, THE monitoring system SHALL trigger alert
9. THE API_Gateway SHALL log request and response with redacted PII fields
10. THE API_Gateway SHALL collect metrics including request count, error rate, and latency percentiles

### Requirement 21: Database Schema and Data Integrity

**User Story:** As a database administrator, I want each microservice to have isolated database schema with proper constraints, so that data integrity is maintained and services are independently deployable.

#### Acceptance Criteria

1. THE Identity_Service SHALL use PostgreSQL database named identity_db with schema identity
2. THE Agent_Service SHALL use PostgreSQL database named agent_db with schema agent
3. THE Interaction_Service SHALL use PostgreSQL database named interaction_db with schema interaction
4. THE Ticket_Service SHALL use PostgreSQL database named ticket_db with schema ticket
5. THE Customer_Service SHALL use PostgreSQL database named customer_db with schema customer
6. THE Notification_Service SHALL use PostgreSQL database named notification_db with schema notification
7. WHEN a service starts, THE service SHALL run database migrations automatically using TypeORM migrations
8. THE database SHALL enforce foreign key constraints for referential integrity within service boundaries
9. THE database SHALL use UUID primary keys generated with gen_random_uuid() function
10. THE database SHALL include created_at and updated_at timestamp columns on all entity tables with automatic updates
11. THE database SHALL include tenant_id column on all entity tables for multi-tenancy support


### Requirement 22: Event-Driven Architecture with Kafka

**User Story:** As a system architect, I want services to communicate via Kafka events for state changes, so that services remain loosely coupled and the system supports eventual consistency.

#### Acceptance Criteria

1. THE Interaction_Service SHALL publish events to Kafka topics: interactions, sla-events
2. THE Agent_Service SHALL publish events to Kafka topic: agent-status
3. THE Ticket_Service SHALL publish events to Kafka topic: tickets
4. THE Notification_Service SHALL consume events from topics: interactions, tickets, agent-status
5. WHEN an event is published, THE service SHALL include event metadata: eventId, eventType, timestamp, tenantId, and payload
6. THE service SHALL use Kafka producer with acknowledgment level all for guaranteed delivery
7. THE service SHALL implement idempotent event consumers to handle duplicate events
8. THE service SHALL use consumer groups for parallel event processing
9. WHEN event processing fails, THE service SHALL retry with exponential backoff up to 3 attempts
10. THE service SHALL publish failed events to dead letter queue after max retries exceeded

### Requirement 23: Caching Strategy with Redis

**User Story:** As a performance engineer, I want to cache frequently accessed data in Redis, so that database load is reduced and API response times are improved.

#### Acceptance Criteria

1. THE Identity_Service SHALL cache JWT validation results in Redis with TTL matching token expiration
2. THE Identity_Service SHALL store refresh token blacklist in Redis with 7-day TTL
3. THE Agent_Service SHALL cache agent status in Redis with 60-second TTL
4. THE Customer_Service SHALL cache customer profiles in Redis with 5-minute TTL
5. WHEN cached data is updated, THE service SHALL invalidate cache entry immediately
6. THE service SHALL use Redis key naming convention: {service}:{entity}:{id}
7. THE service SHALL serialize cached objects as JSON
8. THE service SHALL implement cache-aside pattern: check cache first, then database, then populate cache
9. WHEN Redis is unavailable, THE service SHALL fall back to database queries without caching
10. THE service SHALL monitor cache hit rate and alert when hit rate drops below 70%

### Requirement 24: Security and Data Protection

**User Story:** As a security officer, I want sensitive data encrypted and all API requests authenticated, so that customer information is protected and regulatory compliance is maintained.

#### Acceptance Criteria

1. THE API_Gateway SHALL enforce HTTPS for all client connections with TLS 1.3 minimum
2. THE API_Gateway SHALL validate JWT signature on every request using RS256 algorithm
3. THE Customer_Service SHALL encrypt PII fields (email, phone, CIF) using AES-256-GCM before database insert
4. THE Customer_Service SHALL store encryption keys in environment variables, not in code or database
5. THE service SHALL hash passwords using bcrypt with cost factor 12
6. THE service SHALL validate all input using class-validator decorators on DTOs
7. THE service SHALL sanitize error messages to prevent information disclosure
8. WHEN authentication fails, THE service SHALL return generic error message without revealing whether username exists
9. THE service SHALL implement CORS policy allowing only whitelisted origins
10. THE service SHALL log all authentication failures with IP address and timestamp for security monitoring


### Requirement 25: Frontend Integration with React Query

**User Story:** As a frontend developer, I want to integrate backend APIs using React Query, so that server state is cached efficiently and the UI remains responsive with optimistic updates.

#### Acceptance Criteria

1. THE Agent_Desktop SHALL use TanStack Query v5 for all server state management
2. THE Agent_Desktop SHALL configure QueryClient with staleTime of 30 seconds for list queries
3. THE Agent_Desktop SHALL configure QueryClient with staleTime of 5 minutes for detail queries
4. WHEN a mutation succeeds, THE Agent_Desktop SHALL invalidate related queries to trigger refetch
5. THE Agent_Desktop SHALL implement optimistic updates for status changes and note additions
6. THE Agent_Desktop SHALL display loading states using query isLoading flag
7. THE Agent_Desktop SHALL display error states using query error object with user-friendly messages
8. THE Agent_Desktop SHALL implement infinite scroll for interaction list using useInfiniteQuery
9. THE Agent_Desktop SHALL prefetch interaction details on list item hover for faster navigation
10. THE Agent_Desktop SHALL persist query cache to sessionStorage for page refresh resilience

### Requirement 26: WebSocket Connection Management

**User Story:** As a frontend developer, I want to manage WebSocket connections reliably with automatic reconnection, so that real-time updates continue working even after network interruptions.

#### Acceptance Criteria

1. THE Agent_Desktop SHALL establish WebSocket connection using STOMP protocol over WSS
2. THE Agent_Desktop SHALL include JWT access token in WebSocket connection headers
3. WHEN WebSocket connection is lost, THE Agent_Desktop SHALL attempt reconnection with exponential backoff
4. THE Agent_Desktop SHALL limit reconnection attempts to 10 with maximum backoff of 30 seconds
5. WHEN reconnection succeeds, THE Agent_Desktop SHALL resubscribe to all previous channels
6. THE Agent_Desktop SHALL display connection status indicator in header (connected, reconnecting, disconnected)
7. THE Agent_Desktop SHALL buffer outgoing messages during disconnection and send when reconnected
8. THE Agent_Desktop SHALL discard buffered messages older than 5 minutes
9. WHEN WebSocket message is received, THE Agent_Desktop SHALL update React Query cache to trigger UI updates
10. THE Agent_Desktop SHALL close WebSocket connection gracefully on logout or page unload

### Requirement 27: Error Handling and User Feedback

**User Story:** As an agent, I want to see clear error messages and loading indicators, so that I understand system status and know when operations are in progress.

#### Acceptance Criteria

1. WHEN an API request fails with 400 status, THE Agent_Desktop SHALL display validation errors next to relevant form fields
2. WHEN an API request fails with 401 status, THE Agent_Desktop SHALL attempt token refresh and retry request once
3. WHEN token refresh fails, THE Agent_Desktop SHALL redirect to login page and clear stored credentials
4. WHEN an API request fails with 403 status, THE Agent_Desktop SHALL display "Access Denied" message with required permission
5. WHEN an API request fails with 429 status, THE Agent_Desktop SHALL display "Too Many Requests" message with retry time
6. WHEN an API request fails with 500 status, THE Agent_Desktop SHALL display generic error message and log details to console
7. THE Agent_Desktop SHALL display toast notifications for success operations with 3-second auto-hide
8. THE Agent_Desktop SHALL display toast notifications for error operations with 5-second auto-hide and manual dismiss
9. THE Agent_Desktop SHALL show skeleton loaders for list items during initial load
10. THE Agent_Desktop SHALL show spinner overlays for form submissions with disabled submit button


### Requirement 28: Testing and Quality Assurance

**User Story:** As a quality assurance engineer, I want comprehensive test coverage for all services, so that bugs are caught early and code quality is maintained.

#### Acceptance Criteria

1. THE service SHALL achieve minimum 70% line coverage for unit tests
2. THE service SHALL include unit tests for all service methods using Jest and NestJS Testing Module
3. THE service SHALL include integration tests for all API endpoints using Supertest
4. THE service SHALL use test database containers for integration tests with automatic cleanup
5. THE service SHALL mock external dependencies (Kafka, Redis) in unit tests
6. THE Agent_Desktop SHALL achieve minimum 70% line coverage for component tests using Vitest
7. THE Agent_Desktop SHALL include component tests for all interactive components using Testing Library
8. THE Agent_Desktop SHALL mock API responses using MSW (Mock Service Worker) in component tests
9. THE project SHALL include E2E tests for critical user journeys using Playwright
10. THE CI pipeline SHALL fail builds when test coverage drops below threshold

### Requirement 29: Monitoring and Observability

**User Story:** As a DevOps engineer, I want comprehensive monitoring and distributed tracing, so that I can diagnose issues quickly and ensure system health.

#### Acceptance Criteria

1. THE service SHALL expose health check endpoint at /health returning status ok when healthy
2. THE service SHALL expose metrics endpoint at /metrics in Prometheus format
3. THE service SHALL emit OpenTelemetry traces for all HTTP requests and database queries
4. THE service SHALL include trace context propagation headers in all service-to-service calls
5. THE service SHALL log structured JSON logs with fields: timestamp, level, message, requestId, userId, and context
6. THE service SHALL use log levels: error for failures, warn for degraded state, info for significant events, debug for detailed diagnostics
7. THE service SHALL never log PII fields in plaintext (mask email, phone, account numbers)
8. THE monitoring system SHALL collect metrics: request rate, error rate, P50/P95/P99 latency, and active connections
9. THE monitoring system SHALL alert when error rate exceeds 1% over 5-minute window
10. THE monitoring system SHALL alert when P99 latency exceeds 500ms over 5-minute window

### Requirement 30: Deployment and Configuration

**User Story:** As a DevOps engineer, I want services to be configurable via environment variables and deployable via Docker Compose, so that deployment is consistent across environments.

#### Acceptance Criteria

1. THE service SHALL read all configuration from environment variables, not hardcoded values
2. THE service SHALL provide .env.example file documenting all required environment variables
3. THE service SHALL validate required environment variables on startup and fail fast if missing
4. THE service SHALL include Dockerfile with multi-stage build for optimized image size
5. THE service SHALL use Node.js 24 LTS as base image
6. THE docker-compose.yml SHALL define all 6 microservices with health checks
7. THE docker-compose.yml SHALL define all infrastructure services: PostgreSQL, Redis, Kafka, Elasticsearch
8. THE docker-compose.yml SHALL use named volumes for data persistence
9. THE docker-compose.yml SHALL define service dependencies using depends_on with health check conditions
10. WHEN docker compose up is executed, THE system SHALL start all services in correct order and report healthy status within 2 minutes


## API Endpoint Specifications

### MS-1: Identity Service

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| POST | /api/v1/auth/login | Authenticate agent, return JWT + refresh token | Public | 5/min/IP |
| POST | /api/v1/auth/refresh | Refresh access token using refresh token | Refresh Token | 10/min/user |
| POST | /api/v1/auth/logout | Revoke session and blacklist tokens | Bearer JWT | 10/min/user |
| POST | /api/v1/auth/mfa/verify | Verify MFA TOTP code | Partial JWT | 5/min/user |
| GET | /api/v1/auth/sessions | List active sessions for current user | Bearer JWT | 30/min |
| DELETE | /api/v1/auth/sessions/{sessionId} | Revoke specific session | Bearer JWT | 10/min |
| GET | /api/v1/users/me | Get current user profile with roles and permissions | Bearer JWT | 60/min |
| GET | /api/v1/users/{userId} | Get user by ID | Bearer JWT + user:read | 60/min |
| GET | /api/v1/roles | List all roles with permissions | Bearer JWT + role:read | 30/min |
| POST | /api/v1/auth/policy/evaluate | Evaluate ABAC policy (internal service-to-service) | mTLS | Unlimited |

### MS-2: Agent Service

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| GET | /api/v1/agents/me | Get current agent profile and status | Bearer JWT | 60/min |
| GET | /api/v1/agents/me/status | Get per-channel status for current agent | Bearer JWT | 120/min |
| PUT | /api/v1/agents/me/status/{channel} | Set status for specific channel (voice/email/chat) | Bearer JWT | 30/min |
| PUT | /api/v1/agents/me/status/all | Set all channels to ready or not-ready | Bearer JWT | 30/min |
| GET | /api/v1/agents/me/session | Get current session statistics | Bearer JWT | 60/min |
| POST | /api/v1/agents/me/heartbeat | Send heartbeat to maintain connection | Bearer JWT | 2/min |
| GET | /api/v1/agents | List agents for transfer dialog | Bearer JWT + agent:read | 30/min |
| GET | /api/v1/agents/{agentId} | Get agent by ID | Bearer JWT + agent:read | 60/min |
| GET | /api/v1/agents/{agentId}/availability | Check agent availability for transfer | Bearer JWT + agent:read | 60/min |
| GET | /api/v1/agents/me/settings | Get agent preferences and settings | Bearer JWT | 30/min |
| PUT | /api/v1/agents/me/settings | Update agent settings | Bearer JWT | 10/min |

### MS-3: Interaction Service

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| GET | /api/v1/interactions | List interactions with filters and pagination | Bearer JWT + interaction:read | 60/min |
| GET | /api/v1/interactions/{id} | Get interaction detail | Bearer JWT + interaction:read | 120/min |
| PUT | /api/v1/interactions/{id}/status | Update interaction status | Bearer JWT + interaction:write | 30/min |
| PUT | /api/v1/interactions/{id}/assign | Assign agent to interaction | Bearer JWT + interaction:assign | 30/min |
| POST | /api/v1/interactions/{id}/transfer | Transfer interaction to another agent | Bearer JWT + interaction:transfer | 10/min |
| GET | /api/v1/interactions/{id}/timeline | Get call timeline events | Bearer JWT + interaction:read | 60/min |
| GET | /api/v1/interactions/{id}/notes | List notes for interaction | Bearer JWT + interaction:read | 60/min |
| POST | /api/v1/interactions/{id}/notes | Add note to interaction | Bearer JWT + interaction:write | 30/min |
| PUT | /api/v1/interactions/{id}/notes/{noteId} | Update note (pin, edit) | Bearer JWT + interaction:write | 30/min |
| GET | /api/v1/interactions/{id}/email/thread | Get email thread with all messages | Bearer JWT + interaction:read | 60/min |
| POST | /api/v1/interactions/{id}/email/reply | Send email reply | Bearer JWT + interaction:write | 10/min |
| POST | /api/v1/interactions/{id}/email/forward | Forward email | Bearer JWT + interaction:write | 10/min |
| GET | /api/v1/interactions/{id}/chat/messages | Get chat messages with pagination | Bearer JWT + interaction:read | 120/min |
| POST | /api/v1/interactions/{id}/chat/messages | Send chat message | Bearer JWT + interaction:write | 60/min |
| POST | /api/v1/interactions/{id}/chat/close | Close chat session | Bearer JWT + interaction:write | 10/min |
| GET | /api/v1/interactions/stats | Get interaction statistics by channel and status | Bearer JWT + interaction:read | 30/min |

### MS-4: Ticket Service

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| POST | /api/v1/tickets | Create new ticket | Bearer JWT + ticket:write | 20/min |
| GET | /api/v1/tickets/{id} | Get ticket detail with comments | Bearer JWT + ticket:read | 60/min |
| PUT | /api/v1/tickets/{id} | Update ticket fields | Bearer JWT + ticket:write | 30/min |
| GET | /api/v1/tickets | List tickets with filters | Bearer JWT + ticket:read | 30/min |
| POST | /api/v1/tickets/{id}/comments | Add comment to ticket | Bearer JWT + ticket:write | 30/min |
| GET | /api/v1/tickets/{id}/comments | List ticket comments | Bearer JWT + ticket:read | 60/min |
| PUT | /api/v1/tickets/{id}/assign | Assign ticket to agent | Bearer JWT + ticket:assign | 10/min |
| PUT | /api/v1/tickets/{id}/escalate | Escalate ticket priority | Bearer JWT + ticket:escalate | 10/min |
| GET | /api/v1/tickets/by-customer/{customerId} | List tickets for specific customer | Bearer JWT + ticket:read | 30/min |
| GET | /api/v1/tickets/{id}/history | Get ticket change history | Bearer JWT + ticket:read | 30/min |

### MS-5: Customer Service

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| GET | /api/v1/customers/{id} | Get customer profile with decrypted PII | Bearer JWT + customer:read | 60/min |
| GET | /api/v1/customers/{id}/history | Get customer interaction history | Bearer JWT + customer:read | 30/min |
| GET | /api/v1/customers/{id}/tickets | Get customer tickets | Bearer JWT + customer:read | 30/min |
| GET | /api/v1/customers/{id}/notes | Get customer notes | Bearer JWT + customer:read | 30/min |
| POST | /api/v1/customers/{id}/notes | Add customer note | Bearer JWT + customer:write | 20/min |
| PUT | /api/v1/customers/{id}/notes/{noteId} | Update note (pin, edit) | Bearer JWT + customer:write | 20/min |
| GET | /api/v1/customers/search | Search customers by CIF, name, or phone | Bearer JWT + customer:read | 30/min |
| PATCH | /api/v1/customers/{id} | Update customer editable fields | Bearer JWT + customer:write | 10/min |

### MS-6: Notification Service

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| GET | /api/v1/notifications | List notifications with tab filters | Bearer JWT | 60/min |
| GET | /api/v1/notifications/unread-count | Get unread notification count for badge | Bearer JWT | 120/min |
| PUT | /api/v1/notifications/{id}/status | Update notification status (viewed/actioned/dismissed) | Bearer JWT | 60/min |
| PUT | /api/v1/notifications/mark-all-read | Mark all notifications as viewed | Bearer JWT | 10/min |
| DELETE | /api/v1/notifications/clear-old | Clear notifications older than 24 hours | Bearer JWT | 5/min |
| GET | /api/v1/notifications/settings | Get notification preferences | Bearer JWT | 30/min |
| PUT | /api/v1/notifications/settings | Update notification preferences | Bearer JWT | 10/min |
| GET | /api/v1/notifications/warnings/not-ready | Get not-ready missed calls warning status | Bearer JWT | 30/min |


## WebSocket Channel Specifications

### Real-Time Communication Channels

| Service | Channel Path | Direction | Purpose | Message Format |
|---------|--------------|-----------|---------|----------------|
| Agent Service | /ws/agent/{agentId}/status | Bidirectional | Real-time agent status sync and heartbeat | JSON: {channel, status, reason, duration, timestamp} |
| Agent Service | /ws/agent/{agentId}/presence | Server→Client | Presence updates for transfer dialog | JSON: {agentId, connectionStatus, lastHeartbeat} |
| Interaction Service | /ws/interactions/{agentId}/queue | Server→Client | Real-time queue updates (new, assigned, status changes) | JSON: {eventType, interaction, timestamp} |
| Interaction Service | /ws/interactions/{interactionId}/chat | Bidirectional | Real-time chat messaging | JSON: {messageId, sender, content, timestamp, type} |
| Interaction Service | /ws/interactions/{interactionId}/sla | Server→Client | SLA countdown ticks (every second for at-risk chats) | JSON: {interactionId, slaStatus, remainingSeconds, threshold} |
| Notification Service | /ws/notifications/{agentId} | Server→Client | Push new notifications to agent | JSON: {notificationId, type, priority, title, message, metadata, actions} |

### WebSocket Connection Requirements

1. **Protocol**: STOMP (Simple Text Oriented Messaging Protocol) over WebSocket Secure (WSS)
2. **Authentication**: JWT access token included in connection headers
3. **Reconnection**: Exponential backoff with maximum 10 attempts, max backoff 30 seconds
4. **Heartbeat**: Client sends heartbeat every 30 seconds, server timeout after 60 seconds
5. **Message Format**: All messages use JSON serialization
6. **Error Handling**: Connection errors trigger reconnection, message errors logged to console
7. **Subscription Management**: Client resubscribes to all channels after reconnection
8. **Message Buffering**: Client buffers outgoing messages during disconnection, discards after 5 minutes


## Database Schema Requirements

### MS-1: Identity Service (identity_db)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL,
  conditions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_fingerprint TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Login attempts table
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_agent_id ON users(agent_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_login_attempts_user_id ON login_attempts(user_id);
```

### MS-2: Agent Service (agent_db)

```sql
-- Agent profiles table
CREATE TABLE agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  department TEXT NOT NULL,
  team TEXT,
  skills JSONB DEFAULT '[]',
  max_concurrent_chats INTEGER DEFAULT 3,
  max_concurrent_emails INTEGER DEFAULT 5,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent channel status table
CREATE TABLE agent_channel_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agent_profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  custom_reason TEXT,
  duration INTEGER DEFAULT 0,
  is_timer_active BOOLEAN DEFAULT false,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, channel)
);

-- Agent sessions table
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agent_profiles(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  connection_status TEXT NOT NULL DEFAULT 'connected',
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent status history table
CREATE TABLE agent_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agent_profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_profiles_user_id ON agent_profiles(user_id);
CREATE INDEX idx_agent_profiles_agent_id ON agent_profiles(agent_id);
CREATE INDEX idx_agent_channel_status_agent_id ON agent_channel_status(agent_id);
CREATE INDEX idx_agent_sessions_agent_id ON agent_sessions(agent_id);
CREATE INDEX idx_agent_status_history_agent_id ON agent_status_history(agent_id);
```

### MS-3: Interaction Service (interaction_db)

```sql
-- Interactions table
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT UNIQUE NOT NULL,
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  customer_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  assigned_agent_id UUID,
  assigned_agent_name TEXT,
  subject TEXT,
  tags TEXT[] DEFAULT '{}',
  is_vip BOOLEAN DEFAULT false,
  direction TEXT NOT NULL,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interaction notes table
CREATE TABLE interaction_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  content TEXT NOT NULL,
  tag TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interaction events table (timeline)
CREATE TABLE interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER,
  description TEXT NOT NULL,
  agent_id UUID,
  metadata JSONB DEFAULT '{}'
);

-- Email messages table
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL,
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  body_html TEXT,
  direction TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX idx_interactions_assigned_agent_id ON interactions(assigned_agent_id);
CREATE INDEX idx_interactions_status ON interactions(status);
CREATE INDEX idx_interactions_channel ON interactions(channel);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX idx_interaction_notes_interaction_id ON interaction_notes(interaction_id);
CREATE INDEX idx_interaction_events_interaction_id ON interaction_events(interaction_id);
CREATE INDEX idx_email_messages_interaction_id ON email_messages(interaction_id);
CREATE INDEX idx_chat_messages_interaction_id ON chat_messages(interaction_id);
```


### MS-4: Ticket Service (ticket_db)

```sql
-- Tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL,
  department TEXT NOT NULL,
  assigned_agent_id UUID,
  assigned_agent_name TEXT,
  customer_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  is_vip BOOLEAN DEFAULT false,
  interaction_id UUID,
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket comments table
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket history table
CREATE TABLE ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_assigned_agent_id ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);
```

### MS-5: Customer Service (customer_db)

```sql
-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cif TEXT UNIQUE NOT NULL,           -- encrypted at rest with AES-256-GCM
  full_name TEXT NOT NULL,
  email TEXT,                         -- encrypted at rest with AES-256-GCM
  phone TEXT,                         -- encrypted at rest with AES-256-GCM
  segment TEXT NOT NULL,
  is_vip BOOLEAN DEFAULT false,
  avatar_url TEXT,
  satisfaction_rating DECIMAL(3,2),
  preferences JSONB DEFAULT '{}',
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer notes table
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  content TEXT NOT NULL,
  tag TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_cif ON customers(cif);
CREATE INDEX idx_customers_full_name ON customers(full_name);
CREATE INDEX idx_customers_segment ON customers(segment);
CREATE INDEX idx_customer_notes_customer_id ON customer_notes(customer_id);
```

### MS-6: Notification Service (notification_db)

```sql
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  recipient_agent_id UUID NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_vip BOOLEAN DEFAULT false,
  action_url TEXT,
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification settings table
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  enable_sound BOOLEAN DEFAULT true,
  auto_hide_after INTEGER DEFAULT 8,
  max_active_notifications INTEGER DEFAULT 3,
  type_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_recipient_agent_id ON notifications(recipient_agent_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notification_settings_agent_id ON notification_settings(agent_id);
```


## Kafka Event Specifications

### Event Topics and Schemas

#### Topic: agent-status

**Published by:** Agent Service  
**Consumed by:** Interaction Service, Notification Service

```json
{
  "eventId": "uuid",
  "eventType": "agent.status.changed",
  "timestamp": "2026-03-06T10:00:00Z",
  "tenantId": "uuid",
  "payload": {
    "agentId": "uuid",
    "channel": "voice",
    "fromStatus": "ready",
    "toStatus": "not-ready",
    "reason": "lunch",
    "customReason": null,
    "duration": 0
  }
}
```

#### Topic: interactions

**Published by:** Interaction Service  
**Consumed by:** Notification Service, Customer Service

```json
{
  "eventId": "uuid",
  "eventType": "interaction.created | interaction.assigned | interaction.status.changed | interaction.transferred",
  "timestamp": "2026-03-06T10:00:00Z",
  "tenantId": "uuid",
  "payload": {
    "interactionId": "uuid",
    "type": "call",
    "channel": "voice",
    "status": "assigned",
    "customerId": "uuid",
    "assignedAgentId": "uuid",
    "priority": "high",
    "isVIP": false
  }
}
```

#### Topic: sla-events

**Published by:** Interaction Service  
**Consumed by:** Notification Service

```json
{
  "eventId": "uuid",
  "eventType": "sla.warning | sla.breached",
  "timestamp": "2026-03-06T10:00:00Z",
  "tenantId": "uuid",
  "payload": {
    "interactionId": "uuid",
    "chatSessionId": "uuid",
    "thresholdMinutes": 5,
    "actualSeconds": 320,
    "slaStatus": "breached",
    "assignedAgentId": "uuid",
    "customerId": "uuid"
  }
}
```

#### Topic: tickets

**Published by:** Ticket Service  
**Consumed by:** Notification Service, Customer Service

```json
{
  "eventId": "uuid",
  "eventType": "ticket.created | ticket.updated | ticket.assigned | ticket.escalated",
  "timestamp": "2026-03-06T10:00:00Z",
  "tenantId": "uuid",
  "payload": {
    "ticketId": "uuid",
    "displayId": "TKT-2026-000001",
    "title": "Technical issue",
    "status": "new",
    "priority": "high",
    "customerId": "uuid",
    "assignedAgentId": "uuid",
    "interactionId": "uuid"
  }
}
```

### Event Processing Requirements

1. **Idempotency**: All event consumers must handle duplicate events using eventId deduplication
2. **Ordering**: Events within same partition maintain order, use customerId or agentId as partition key
3. **Retry Policy**: Failed events retry with exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 attempts)
4. **Dead Letter Queue**: Events failing after max retries move to DLQ topic for manual investigation
5. **Schema Validation**: All events validated against JSON schema before publishing
6. **Monitoring**: Track event lag, processing time, and error rate per consumer group


## Security Requirements

### Authentication and Authorization

1. **JWT Token Structure**:
   - Algorithm: RS256 (asymmetric signing)
   - Access token expiration: 15 minutes
   - Refresh token expiration: 7 days
   - Claims: sub (userId), agentId, tenantId, roles, permissions, channelPermissions, departmentId, teamId, iss, aud, iat, exp, jti

2. **Password Security**:
   - Hashing: bcrypt with cost factor 12
   - Minimum length: 12 characters
   - Complexity: Must include uppercase, lowercase, number, and special character
   - Password history: Prevent reuse of last 5 passwords

3. **MFA Requirements**:
   - TOTP algorithm: SHA-1 with 6-digit codes
   - Time step: 30 seconds
   - Secret storage: Encrypted with AES-256-GCM
   - Backup codes: 10 single-use codes generated on MFA setup

4. **Session Management**:
   - Concurrent sessions: Maximum 1 active session per agent
   - Session timeout: 8 hours of inactivity
   - Token rotation: Refresh token rotated on every use
   - Blacklist: Revoked tokens stored in Redis with TTL

### Data Protection

1. **Encryption at Rest**:
   - Algorithm: AES-256-GCM
   - PII fields: email, phone, CIF, account numbers
   - Key management: Environment variables (Phase 1), HashiCorp Vault (Phase 3)
   - Key rotation: Manual (Phase 1), automated quarterly (Phase 3)

2. **Encryption in Transit**:
   - Client to API Gateway: TLS 1.3 minimum
   - Service to service: mTLS via Istio service mesh
   - WebSocket: WSS (WebSocket Secure)
   - Database connections: SSL/TLS enabled

3. **Data Masking**:
   - Account numbers: Show last 4 digits (****1234)
   - Phone numbers: Show first 4 and last 3 digits (0901***567)
   - Email: Show first 2 characters and domain (ng***@email.com)
   - Masking applied in API responses unless sensitiveDataVisible=true with special permission

### Input Validation and Sanitization

1. **Request Validation**:
   - All DTOs use class-validator decorators
   - String length limits enforced
   - Email format validation using RFC 5322
   - Phone format validation for Vietnamese numbers
   - SQL injection prevention via parameterized queries
   - XSS prevention via input sanitization

2. **Rate Limiting**:
   - Standard endpoints: 100 requests/minute per user
   - Sensitive endpoints: 10 requests/minute per user
   - Login endpoint: 5 requests/minute per IP
   - Implementation: Redis-based sliding window

3. **CORS Policy**:
   - Allowed origins: https://agent.tpb.vn, https://admin.tpb.vn
   - Allowed methods: GET, POST, PUT, PATCH, DELETE
   - Allowed headers: Authorization, Content-Type, X-Request-Id
   - Credentials: true (cookies and authorization headers)

### Audit and Compliance

1. **Audit Logging**:
   - All authentication events (login, logout, MFA)
   - All authorization failures
   - All data mutations (create, update, delete)
   - All PII access events
   - Log format: Structured JSON with timestamp, userId, action, resource, result

2. **Security Monitoring**:
   - Failed login attempts tracked per user and IP
   - Account lockout after 5 failed attempts in 15 minutes
   - Suspicious activity alerts (multiple IPs, unusual hours)
   - Token validation failures logged

3. **Compliance Requirements**:
   - OWASP Top 10 2026 compliance
   - BFSI security standards adherence
   - Data retention: 7 years for audit logs
   - Right to erasure: Customer data deletion on request (Phase 3)


## Performance Requirements

### Response Time Targets

| Operation Type | Target P50 | Target P95 | Target P99 | Max Timeout |
|----------------|------------|------------|------------|-------------|
| GET (list) | < 100ms | < 200ms | < 500ms | 5s |
| GET (detail) | < 50ms | < 150ms | < 300ms | 3s |
| POST/PUT | < 200ms | < 500ms | < 1000ms | 10s |
| WebSocket message | < 100ms | < 500ms | < 1000ms | 5s |
| Database query | < 20ms | < 50ms | < 100ms | 1s |
| Cache read | < 5ms | < 10ms | < 20ms | 100ms |

### Throughput Requirements

1. **Concurrent Users**: Support 100 concurrent agents in Phase 1
2. **Requests per Second**: 500 RPS aggregate across all services
3. **WebSocket Connections**: 100 concurrent connections per service
4. **Database Connections**: Pool size 20 per service
5. **Kafka Throughput**: 1000 events/second per topic

### Scalability

1. **Horizontal Scaling**: All services stateless, scale via container replication
2. **Database**: PostgreSQL with read replicas (Phase 3)
3. **Cache**: Redis cluster with replication (Phase 3)
4. **Load Balancing**: API Gateway distributes requests round-robin
5. **Auto-scaling**: Based on CPU > 70% or memory > 80% (Phase 3)

### Resource Limits

1. **API Request Size**: Maximum 10MB per request
2. **File Upload**: Maximum 25MB per file, 10 files per request
3. **Pagination**: Default page size 20, maximum 100
4. **Query Timeout**: 30 seconds for complex queries
5. **WebSocket Message Size**: Maximum 1MB per message

### Caching Strategy

1. **Redis TTL**:
   - JWT validation: Token expiration time
   - Agent status: 60 seconds
   - Customer profiles: 5 minutes
   - Interaction lists: 30 seconds
   - Static data (roles, permissions): 1 hour

2. **Cache Invalidation**:
   - On data mutation: Immediate invalidation
   - On schema change: Broadcast invalidation via Kafka
   - Stale data: Background refresh before expiration

3. **Cache Warming**:
   - Frequently accessed customers: Pre-load on agent login
   - Agent profiles: Pre-load on service startup
   - Roles and permissions: Pre-load on service startup


## Testing Requirements

### Unit Testing

**Coverage Target**: ≥ 70% line coverage per service

**Backend (NestJS + Jest)**:
1. Service layer: Test all business logic methods with mocked repositories
2. Controller layer: Test request/response handling with mocked services
3. Repository layer: Test database queries with in-memory database
4. DTO validation: Test all validation rules with valid and invalid inputs
5. Guards and interceptors: Test authentication and authorization logic
6. Event handlers: Test Kafka consumer logic with mocked events

**Frontend (React + Vitest)**:
1. Components: Test rendering, user interactions, and state changes
2. Hooks: Test custom hooks with React Testing Library
3. Contexts: Test context providers and consumers
4. Utils: Test utility functions with edge cases
5. API client: Test request/response handling with MSW

### Integration Testing

**Backend (Supertest + Test Containers)**:
1. API endpoints: Test full request/response cycle with test database
2. Authentication flow: Test login, token refresh, logout
3. Authorization: Test RBAC enforcement on protected endpoints
4. Database transactions: Test ACID properties and rollback
5. Kafka integration: Test event publishing and consumption
6. Redis integration: Test caching and session management
7. WebSocket: Test connection, subscription, and message delivery

**Test Data**:
1. Seed test database with realistic data
2. Use factories for generating test entities
3. Clean up test data after each test
4. Isolate tests to prevent interference

### End-to-End Testing

**Critical User Journeys (Playwright)**:

1. **Agent Login Flow**:
   - Navigate to login page
   - Enter valid credentials
   - Complete MFA verification
   - Verify redirect to agent desktop
   - Verify agent header displays correct name

2. **Interaction Queue Flow**:
   - Login as agent
   - View interaction list
   - Apply channel filter
   - Apply status filter
   - Search by customer name
   - Verify filtered results

3. **Ticket Creation Flow**:
   - Login as agent
   - Open interaction detail
   - Click create ticket button
   - Fill ticket form
   - Submit ticket
   - Verify ticket appears in customer panel

4. **Customer Information Flow**:
   - Login as agent
   - Open customer panel
   - View customer profile
   - Add customer note
   - Verify note appears in list

5. **Notification Flow**:
   - Login as agent
   - Trigger notification event
   - Verify notification appears in center
   - Mark notification as viewed
   - Verify unread count updates

### Performance Testing

**Load Testing (k6)**:
1. Ramp up to 100 concurrent users over 5 minutes
2. Maintain 100 users for 10 minutes
3. Ramp down over 2 minutes
4. Measure P50, P95, P99 response times
5. Verify no errors under load
6. Verify database connection pool stable

**Stress Testing (k6)**:
1. Ramp up to 200 concurrent users (2x capacity)
2. Identify breaking point
3. Verify graceful degradation
4. Verify error messages appropriate
5. Verify system recovers after load reduction

### Security Testing

**Automated Security Scanning**:
1. OWASP ZAP: Scan all API endpoints for vulnerabilities
2. npm audit: Check for vulnerable dependencies
3. Trivy: Scan Docker images for CVEs
4. SonarQube: Static code analysis for security issues

**Manual Security Testing**:
1. SQL injection attempts on all input fields
2. XSS attempts on text inputs
3. CSRF token validation
4. JWT tampering attempts
5. Authorization bypass attempts
6. Rate limit enforcement verification

### Test Automation

**CI Pipeline**:
1. Run unit tests on every commit
2. Run integration tests on PR
3. Run E2E tests on merge to main
4. Run security scans nightly
5. Generate coverage reports
6. Fail build if coverage < 70%

**Test Reporting**:
1. JUnit XML format for CI integration
2. HTML coverage reports
3. Playwright HTML reports with screenshots
4. k6 performance dashboards
5. Security scan reports


## Technology Stack (2026 Versions)

### Backend

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| Node.js | 24.13.x LTS | Runtime environment | Latest LTS with support until April 2028 |
| NestJS | 10.x | Backend framework | Mature TypeScript framework with DI and modular architecture |
| TypeScript | 5.7.x | Programming language | Latest with improved type inference and performance |
| TypeORM | 0.3.x | ORM | Native TypeScript support, migrations, and PostgreSQL features |
| class-validator | 0.14.x | DTO validation | Decorator-based validation with TypeScript |
| @nestjs/jwt | 10.x | JWT handling | Official NestJS JWT module |
| bcrypt | 5.x | Password hashing | Industry standard with configurable cost factor |
| @nestjs/websockets | 10.x | WebSocket support | Official NestJS WebSocket module with Socket.IO |
| kafkajs | 2.x | Kafka client | Modern Kafka client for Node.js |
| ioredis | 5.x | Redis client | High-performance Redis client with cluster support |
| Jest | 29.x | Testing framework | Mature testing framework with excellent TypeScript support |
| Supertest | 7.x | API testing | HTTP assertion library for integration tests |

### Frontend

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| React | 19.2.x | UI framework | Latest with improved concurrent features and compiler |
| TypeScript | 5.7.x | Programming language | Same as backend for consistency |
| Vite | 6.3.x | Build tool | Fast HMR and optimized production builds |
| TanStack Query | 5.x | Server state | Modern data fetching with caching and optimistic updates |
| React Router | 7.x | Routing | Latest with improved data loading patterns |
| Tailwind CSS | 4.x | Styling | Latest with improved performance and new features |
| shadcn/ui | Latest | Component library | Accessible components built on Radix UI |
| Radix UI | Latest | Headless components | Accessible primitives for custom components |
| Recharts | 2.x | Charts | Composable charting library for dashboards |
| Vitest | 3.x | Testing framework | Fast unit testing with Vite integration |
| Testing Library | 16.x | Component testing | User-centric testing utilities |
| Playwright | 1.50.x | E2E testing | Modern E2E testing with excellent debugging |
| MSW | 2.x | API mocking | Mock Service Worker for realistic API mocking |

### Infrastructure

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| PostgreSQL | 18.3 | Primary database | Latest with async I/O improvements and performance gains |
| Redis | 8.x | Cache and sessions | Latest with improved memory efficiency |
| Apache Kafka | 4.2.0 | Event streaming | KRaft mode (ZooKeeper removed), improved performance |
| Elasticsearch | 9.x | Full-text search | Latest with improved relevance and performance |
| SeaweedFS | Latest | Object storage | S3-compatible, chosen over MinIO (archived Dec 2025) |
| Kong | 3.x | API Gateway | Mature gateway with plugin ecosystem |
| Docker | 27.x | Containerization | Latest stable with improved build performance |
| Docker Compose | 2.x | Local orchestration | Multi-container application management |

### Development Tools

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| Nx | 21.x | Monorepo management | Latest with improved caching and task orchestration |
| ESLint | 9.x | Linting | Latest with flat config format |
| Prettier | 3.x | Code formatting | Consistent code style |
| Husky | 9.x | Git hooks | Pre-commit hooks for quality gates |
| lint-staged | 15.x | Staged file linting | Run linters on staged files only |

### Monitoring and Observability

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| OpenTelemetry | 1.x | Distributed tracing | Vendor-neutral observability standard |
| Prometheus | 3.x | Metrics collection | Industry standard for metrics |
| Grafana | 11.x | Metrics visualization | Powerful dashboarding and alerting |
| Jaeger | 2.x | Trace visualization | Distributed tracing UI |
| ELK Stack | 8.x | Log aggregation | Elasticsearch, Logstash, Kibana for logs |


## Deployment and Operations

### Environment Configuration

**Development Environment**:
- Local Docker Compose with all services
- Hot reload enabled for frontend and backend
- Debug logging level
- Test data seeded automatically
- No TLS required for local services

**Staging Environment** (Phase 3):
- Docker Compose on dedicated server
- Production-like configuration
- TLS enabled
- Anonymized production data
- Performance monitoring enabled

**Production Environment** (Phase 3):
- Kubernetes cluster (future)
- High availability with replicas
- TLS everywhere with valid certificates
- Real-time monitoring and alerting
- Automated backups

### Docker Compose Configuration

**Services Defined**:
1. identity-service (port 3001)
2. agent-service (port 3002)
3. interaction-service (port 3003)
4. ticket-service (port 3004)
5. customer-service (port 3005)
6. notification-service (port 3006)
7. api-gateway (port 8000)
8. agent-desktop (port 3000)
9. postgres (port 5432)
10. redis (port 6379)
11. kafka (port 9092)
12. elasticsearch (port 9200)
13. seaweedfs (port 8333)

**Health Checks**:
- All services expose /health endpoint
- Docker health check interval: 30s
- Unhealthy threshold: 3 consecutive failures
- Startup grace period: 60s

**Resource Limits** (Development):
- Services: 512MB memory, 0.5 CPU
- PostgreSQL: 1GB memory, 1 CPU
- Redis: 256MB memory, 0.25 CPU
- Kafka: 1GB memory, 1 CPU
- Elasticsearch: 2GB memory, 1 CPU

### Database Management

**Migrations**:
- TypeORM migrations in each service
- Automatic migration on service startup (dev)
- Manual migration approval (production)
- Rollback scripts for each migration
- Migration history tracked in database

**Backups**:
- Development: No automated backups
- Staging: Daily backups, 7-day retention
- Production: Hourly backups, 30-day retention, offsite storage

**Connection Pooling**:
- Pool size: 20 connections per service
- Idle timeout: 10 seconds
- Connection timeout: 5 seconds
- Max lifetime: 30 minutes

### Monitoring and Alerting

**Health Monitoring**:
- Service health checks every 30 seconds
- Database connection pool monitoring
- Redis connection monitoring
- Kafka consumer lag monitoring

**Performance Monitoring**:
- Request rate per endpoint
- Response time percentiles (P50, P95, P99)
- Error rate per endpoint
- Database query performance
- Cache hit rate

**Alerts** (Phase 3):
- Service down > 1 minute
- Error rate > 1% for 5 minutes
- P99 latency > 500ms for 5 minutes
- Database connection pool exhausted
- Kafka consumer lag > 1000 messages
- Disk usage > 80%
- Memory usage > 90%

### Logging

**Log Levels**:
- ERROR: Service failures, unhandled exceptions
- WARN: Degraded performance, deprecated API usage
- INFO: Significant events (login, logout, status changes)
- DEBUG: Detailed diagnostics (dev only)

**Log Format**:
```json
{
  "timestamp": "2026-03-06T10:00:00.000Z",
  "level": "INFO",
  "service": "identity-service",
  "requestId": "uuid",
  "userId": "uuid",
  "message": "User logged in successfully",
  "context": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Log Aggregation**:
- Development: Console output
- Staging/Production: ELK Stack (Phase 3)
- Retention: 30 days
- PII masking: Automatic for email, phone, account numbers

### Disaster Recovery

**Backup Strategy** (Phase 3):
- Database: Point-in-time recovery with 30-day retention
- Files: Replicated to secondary storage
- Configuration: Version controlled in Git
- Secrets: Backed up in HashiCorp Vault

**Recovery Objectives**:
- RTO (Recovery Time Objective): 30 minutes
- RPO (Recovery Point Objective): 1 hour
- Data loss tolerance: Maximum 1 hour of transactions

**Failover Procedures**:
- Database: Promote read replica to primary
- Services: Restart on healthy node
- Cache: Rebuild from database
- Message queue: Resume from last committed offset


## Constraints and Assumptions

### Technical Constraints

1. **Phase 0 Completion**: All Phase 1 work assumes Phase 0 (Foundation Setup) is 100% complete with all infrastructure services running
2. **Monorepo Structure**: All code must reside in Nx monorepo with shared packages for types and DTOs
3. **Database Isolation**: Each microservice must have its own PostgreSQL database, no shared databases
4. **Stateless Services**: All services must be stateless to support horizontal scaling
5. **Existing Frontend**: Must preserve all existing UI components and layouts, only replace data sources
6. **No Breaking Changes**: Frontend changes must not break existing component APIs or context providers
7. **TypeScript Strict Mode**: All code must compile with TypeScript strict mode enabled
8. **Test Coverage**: Cannot merge code with < 70% test coverage

### Business Constraints

1. **Vietnamese Language**: All user-facing text must be in Vietnamese (vi-VN)
2. **Banking Hours**: System must support 24/7 operation for customer service
3. **Data Residency**: All data must remain in Vietnam (on-premise deployment)
4. **Audit Requirements**: All data mutations must be auditable for 7 years
5. **PII Protection**: Customer PII must be encrypted at rest per BFSI regulations
6. **Session Limits**: Agents can only have 1 active session at a time
7. **MFA Enforcement**: MFA will be optional in Phase 1, mandatory in Phase 3

### Assumptions

1. **Team Size**: 1-3 developers working on Phase 1
2. **Duration**: 12 weeks (Sprint 1-6) for Phase 1 completion
3. **Core Banking API**: Mock adapter sufficient for Phase 1, real integration in Phase 3
4. **CTI Integration**: Not required for Phase 1, deferred to Phase 2
5. **Load**: 100 concurrent agents maximum in Phase 1
6. **Data Volume**: < 1 million interactions, < 100,000 tickets, < 50,000 customers in Phase 1
7. **Network**: Reliable network with < 50ms latency between services
8. **Browser Support**: Chrome 120+, Edge 120+, Firefox 120+ (latest versions only)
9. **Mobile Support**: Not required in Phase 1, desktop only
10. **Internationalization**: Vietnamese only in Phase 1, English admin UI in Phase 2

### Dependencies

**External Dependencies**:
1. Phase 0 completion (all infrastructure services operational)
2. Docker and Docker Compose installed on developer machines
3. Node.js 24 LTS installed
4. Git repository initialized
5. Environment variables configured per .env.example

**Service Dependencies**:
1. All services depend on Identity Service for authentication
2. Interaction Service depends on Customer Service for customer data
3. Ticket Service depends on Interaction Service and Customer Service
4. Notification Service depends on all other services for events
5. All services depend on PostgreSQL, Redis, and Kafka

**Frontend Dependencies**:
1. Backend APIs must be available for integration
2. WebSocket endpoints must be operational
3. JWT tokens must be valid and refreshable
4. CORS must be configured to allow frontend origin

### Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| React 19 breaking changes | High | Medium | Detailed upgrade checklist, component-by-component testing |
| Team size too small | High | High | Ruthless prioritization, defer non-critical features |
| Database performance | Medium | Low | Proper indexing, connection pooling, caching strategy |
| WebSocket reliability | Medium | Medium | Automatic reconnection, message buffering, fallback to polling |
| Kafka operational complexity | Medium | Medium | Use managed Kafka in dev, comprehensive documentation |
| Test coverage slippage | Medium | Medium | CI enforcement, coverage gates, regular reviews |
| Security vulnerabilities | High | Low | Automated scanning, security reviews, penetration testing |
| Scope creep | High | High | Strict adherence to requirements, change control process |


## Acceptance Testing Scenarios

### Scenario 1: Agent Login and Authentication

**Given**: Agent has valid credentials and MFA enabled  
**When**: Agent navigates to login page and enters username and password  
**Then**: System prompts for MFA code  
**And**: Agent enters valid TOTP code  
**Then**: System redirects to Agent Desktop  
**And**: Agent header displays agent name and ID  
**And**: JWT access token is stored with 15-minute expiration  
**And**: Refresh token is stored with 7-day expiration

**Verification**:
- Login request returns 200 with tokens
- JWT contains correct claims (agentId, roles, permissions)
- Session record created in database
- Login event logged to audit service

### Scenario 2: Agent Status Management

**Given**: Agent is logged in and on Agent Desktop  
**When**: Agent clicks status dropdown and selects "Not Ready" with reason "Lunch"  
**Then**: Status updates to "Not Ready" for all channels  
**And**: Timer starts counting duration  
**And**: Status persists across page refresh  
**And**: Other agents see updated status in transfer dialog

**Verification**:
- PUT /api/v1/agents/me/status/all returns 200
- agent.status.changed event published to Kafka
- WebSocket push received by subscribed clients
- Database record updated with new status and timestamp

### Scenario 3: Interaction Queue Filtering

**Given**: Agent is logged in with 50 interactions in queue  
**When**: Agent selects "Voice" channel filter  
**Then**: List shows only voice interactions  
**And**: Statistics update to show voice-only counts  
**When**: Agent enters "Nguyen" in search box  
**Then**: List filters to voice interactions with "Nguyen" in customer name  
**And**: Total count updates to match filtered results

**Verification**:
- GET /api/v1/interactions with filters returns correct subset
- Response includes updated statistics
- UI updates without full page reload
- Filter state persists in URL query parameters

### Scenario 4: Ticket Creation from Interaction

**Given**: Agent is viewing an interaction detail  
**When**: Agent clicks "Create Ticket" button  
**Then**: Ticket creation dialog opens  
**And**: Customer and interaction fields are pre-filled  
**When**: Agent fills title, description, priority, and category  
**And**: Agent clicks "Create"  
**Then**: Ticket is created with unique display ID  
**And**: Ticket appears in customer panel ticket list  
**And**: Success notification is displayed

**Verification**:
- POST /api/v1/tickets returns 201 with ticket data
- ticket.created event published to Kafka
- Notification sent to assigned agent
- Ticket linked to interaction and customer

### Scenario 5: Real-Time Notification Delivery

**Given**: Agent is logged in with notification center closed  
**When**: Another agent assigns a ticket to this agent  
**Then**: Toast notification appears in top-right corner  
**And**: Notification bell badge shows unread count  
**And**: Notification includes ticket title and action button  
**When**: Agent clicks notification  
**Then**: Ticket detail opens  
**And**: Notification status updates to "actioned"

**Verification**:
- WebSocket message received within 1 second
- Notification stored in database with status "new"
- Toast auto-hides after configured duration
- Badge count updates immediately

### Scenario 6: Customer Information Display

**Given**: Agent is viewing an interaction  
**When**: Customer panel loads  
**Then**: Customer profile displays with name, CIF, segment  
**And**: Contact information shows formatted phone and email  
**And**: Interaction history shows last 20 interactions  
**And**: Ticket list shows open and closed tickets  
**When**: Agent clicks "Add Note" button  
**And**: Agent enters note content and clicks "Save"  
**Then**: Note appears at top of notes list  
**And**: Note shows agent name and timestamp

**Verification**:
- GET /api/v1/customers/{id} returns decrypted PII
- GET /api/v1/customers/{id}/history returns interactions
- POST /api/v1/customers/{id}/notes returns 201
- Note persists in database with correct agent ID

### Scenario 7: Chat SLA Countdown

**Given**: Agent has active chat interaction with 5-minute SLA  
**When**: 4 minutes have elapsed since chat started  
**Then**: SLA status shows "near-breach" with orange indicator  
**And**: Countdown timer shows "1:00" remaining  
**And**: Timer updates every second  
**When**: 5 minutes elapse without agent response  
**Then**: SLA status changes to "breached" with red indicator  
**And**: Urgent notification sent to agent and supervisor

**Verification**:
- WebSocket SLA updates received every second
- sla.breached event published to Kafka at 5:00
- Notification created with priority "urgent"
- Interaction metadata updated with breach flag

### Scenario 8: Token Refresh Flow

**Given**: Agent is logged in with access token expiring in 30 seconds  
**When**: Agent makes API request after token expires  
**Then**: Frontend automatically requests new access token using refresh token  
**And**: New access token is received and stored  
**And**: Original API request is retried with new token  
**And**: User experiences no interruption

**Verification**:
- POST /api/v1/auth/refresh returns 200 with new tokens
- Old refresh token is revoked
- New refresh token is stored
- Original request succeeds with 200

### Scenario 9: WebSocket Reconnection

**Given**: Agent is logged in with active WebSocket connection  
**When**: Network connection is lost for 10 seconds  
**Then**: Connection status indicator shows "reconnecting"  
**And**: Frontend attempts reconnection with exponential backoff  
**When**: Network connection is restored  
**Then**: WebSocket reconnects successfully  
**And**: All previous subscriptions are restored  
**And**: Connection status shows "connected"

**Verification**:
- Reconnection attempts logged to console
- Subscriptions re-established after reconnection
- Buffered messages sent after reconnection
- No data loss during disconnection

### Scenario 10: Multi-Channel Status Management

**Given**: Agent is logged in with all channels ready  
**When**: Agent sets voice channel to "Not Ready" with reason "Break"  
**Then**: Voice channel shows "Not Ready" status  
**And**: Email and chat channels remain "Ready"  
**And**: Agent can still receive email and chat interactions  
**And**: Voice interactions are not routed to this agent

**Verification**:
- PUT /api/v1/agents/me/status/voice returns 200
- Only voice channel status updated in database
- agent.status.changed event specifies channel "voice"
- Interaction routing respects per-channel status


## Success Criteria and Exit Conditions

### Functional Completeness

**Authentication and Authorization**:
- [x] Agent can log in with username and password
- [x] MFA verification works with TOTP codes
- [x] JWT tokens issued with correct claims and expiration
- [x] Refresh token rotation works automatically
- [x] Logout revokes tokens and clears session
- [x] RBAC enforced on all protected endpoints
- [x] Permission checks work for all operations

**Agent Management**:
- [x] Agent can set per-channel status (ready/not-ready)
- [x] Status changes persist across page refresh
- [x] Status duration timer counts correctly
- [x] Heartbeat maintains connection status
- [x] Presence updates visible to other agents
- [x] Agent list for transfer shows availability

**Interaction Management**:
- [x] Interaction queue displays real data from database
- [x] Filters work for channel, status, priority
- [x] Search works for customer name and subject
- [x] Interaction detail shows complete information
- [x] Notes can be added and pinned
- [x] Email threads display correctly
- [x] Chat messages work real-time via WebSocket
- [x] SLA countdown works for chat interactions

**Ticket Management**:
- [x] Tickets can be created with all required fields
- [x] Ticket status transitions follow state machine
- [x] Comments can be added (public and internal)
- [x] Ticket history tracks all changes
- [x] Tickets linked to interactions and customers
- [x] Ticket list filters work correctly

**Customer Management**:
- [x] Customer profiles display with decrypted PII
- [x] Interaction history shows all customer contacts
- [x] Ticket list shows customer tickets
- [x] Notes can be added and pinned
- [x] Customer search works by CIF, name, phone

**Notifications**:
- [x] Notifications delivered via WebSocket push
- [x] Toast notifications appear and auto-hide
- [x] Notification center shows all notifications
- [x] Status updates work (viewed/actioned/dismissed)
- [x] Unread count badge updates correctly
- [x] Not-ready warning works for missed calls

### Technical Quality

**Performance**:
- [x] API response time P99 < 500ms @ 100 concurrent users
- [x] WebSocket messages delivered within 1 second
- [x] Database queries execute in < 100ms P99
- [x] Cache hit rate > 70%
- [x] No memory leaks in 8-hour test run

**Reliability**:
- [x] Services restart automatically on failure
- [x] WebSocket reconnects after network interruption
- [x] Database transactions rollback on error
- [x] Kafka consumers handle duplicate events
- [x] No data loss during service restart

**Security**:
- [x] All API requests require valid JWT
- [x] PII fields encrypted in database
- [x] Passwords hashed with bcrypt cost 12
- [x] Rate limiting enforced on all endpoints
- [x] OWASP ZAP scan shows zero critical vulnerabilities
- [x] SQL injection attempts blocked
- [x] XSS attempts sanitized

**Testing**:
- [x] Unit test coverage ≥ 70% per service
- [x] Integration tests pass for all API endpoints
- [x] E2E tests pass for 10 critical user journeys
- [x] Load test passes at 100 concurrent users
- [x] Security scans pass with no critical issues

**Code Quality**:
- [x] TypeScript strict mode enabled, no errors
- [x] ESLint passes with no errors
- [x] Prettier formatting applied consistently
- [x] No console.log in production code
- [x] All TODOs resolved or documented

### Operational Readiness

**Deployment**:
- [x] docker compose up starts all services successfully
- [x] All services report healthy status within 2 minutes
- [x] Database migrations run automatically
- [x] Environment variables documented in .env.example
- [x] README includes setup instructions

**Monitoring**:
- [x] Health check endpoints work for all services
- [x] Metrics exposed in Prometheus format
- [x] Structured JSON logs emitted
- [x] Request IDs propagated across services
- [x] PII masked in all logs

**Documentation**:
- [x] API documentation complete for all endpoints
- [x] Database schema documented
- [x] WebSocket channels documented
- [x] Kafka events documented
- [x] Setup guide for new developers
- [x] Troubleshooting guide for common issues

### Go-Live Checklist

**Pre-Launch** (1 week before):
- [ ] All exit criteria met
- [ ] Load testing completed successfully
- [ ] Security scan passed
- [ ] Backup and restore tested
- [ ] Rollback plan documented
- [ ] Monitoring dashboards configured
- [ ] Alert rules configured
- [ ] On-call rotation established

**Launch Day**:
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify all services healthy
- [ ] Run smoke tests on production
- [ ] Monitor error rates for 1 hour
- [ ] Verify no critical alerts

**Post-Launch** (1 week after):
- [ ] Monitor performance metrics daily
- [ ] Review error logs daily
- [ ] Collect user feedback
- [ ] Address critical bugs within 24 hours
- [ ] Document lessons learned
- [ ] Plan Phase 2 kickoff

### Acceptance Sign-Off

**Stakeholder Approval Required**:
1. **Product Owner**: Functional requirements met, user stories complete
2. **Tech Lead**: Technical quality standards met, architecture sound
3. **QA Lead**: All tests passing, no critical bugs
4. **Security Officer**: Security requirements met, vulnerabilities addressed
5. **DevOps Lead**: Deployment successful, monitoring operational

**Sign-Off Criteria**:
- All functional completeness items checked
- All technical quality items checked
- All operational readiness items checked
- Zero critical bugs outstanding
- Zero high-priority bugs > 7 days old
- Performance targets met under load
- Security scan passed
- Documentation complete

---

## Appendix: Reference Documents

1. **FullStack-RequirementsV2.md**: Detailed service specifications for MS-1 through MS-6
2. **FullStack-RequirementsV3.md**: Extended platform requirements and future phases
3. **ImplementationPlan.md**: Sprint-by-sprint task breakdown for Phase 1
4. **CLAUDE.md**: Current codebase state and architecture overview
5. **.kiro/steering/01-phase-tracker.md**: Phase tracking and exit criteria
6. **.kiro/specs/foundation-setup/tasks.md**: Completed Phase 0 tasks

---

**Document Version**: 1.0  
**Created**: 2026-03-08  
**Status**: Draft - Awaiting Review  
**Next Phase**: Phase 1 Implementation (Sprint 1-6)

