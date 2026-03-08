# Implementation Tasks: Phase 1 - Core MVP

## Overview

This document contains the complete implementation plan for Phase 1 Core MVP, organized by Sprint (1-6) following the ImplementationPlan.md timeline. Each task is designed to be completable in 1-3 days and includes specific references to requirements and design sections.

**Total Duration:** 12 weeks (Sprint 1-6)  
**Target:** Replace all mock data in Agent Desktop with live backend integration across 6 core microservices

**Sprint Breakdown:**
- Sprint 1-2: Authentication & Identity (MS-1)
- Sprint 2-3: Agent Management (MS-2)
- Sprint 3-4: Interaction Queue (MS-3)
- Sprint 4: Customer Information (MS-5)
- Sprint 5: Ticket Management (MS-4)
- Sprint 6: Notifications (MS-6)

---

## Sprint 1-2: Authentication & Identity (MS-1)

### 1. Database Setup and Core Entities

- [ ] 1.1 Create TypeORM migrations for Identity Service database schema
  - Create migration files for users, roles, permissions, user_roles, refresh_tokens, login_attempts tables
  - Add indexes: idx_users_username, idx_users_email, idx_users_agent_id, idx_refresh_tokens_user_id
  - Add check constraints for user status values
  - Add tenant_id UUID NOT NULL column to all tables for multi-tenancy support
  - Configure auto-run migrations on service startup
  - _Requirements: Req-21, Req-30_
  - _Design: Section 2.1.2, Database Schema_
  - _Effort: M_

- [ ] 1.2 Implement User, Role, Permission, RefreshToken entity models
  - Create User entity with ManyToMany relationship to Role
  - Create Role entity with OneToMany relationship to Permission
  - Create Permission entity with resource, action, scope fields
  - Create RefreshToken entity with user relationship
  - Add TypeORM decorators for columns, relationships, and constraints
  - _Requirements: Req-1, Req-2_
  - _Design: Section 2.1.2_
  - _Effort: M_


- [ ]* 1.3 Write unit tests for entity models
  - Test entity creation and validation
  - Test relationship mappings
  - Test constraint violations
  - _Requirements: Req-28_
  - _Effort: S_

### 2. Authentication Service Implementation

- [ ] 2.1 Implement password hashing with bcrypt
  - Create password hashing utility with cost factor 12
  - Implement password comparison method
  - Add password strength validation
  - _Requirements: Req-1.10, Req-24.5_
  - _Design: Section 2.1.4_
  - _Effort: S_

- [ ] 2.2 Implement JWT token generation with RS256
  - Generate RSA key pair for JWT signing
  - Create JWT service with sign and verify methods
  - Configure access token (15min) and refresh token (7day) expiration
  - Include claims: sub, agentId, tenantId, roles, permissions
  - _Requirements: Req-1.1, Req-2.4_
  - _Design: Section 5.1, 5.2_
  - _Effort: M_

- [ ] 2.3 Implement login endpoint with credential validation
  - Create LoginDto with username and password validation
  - Implement AuthService.login() method
  - Check account lock status before password verification
  - Increment failed login attempts on invalid credentials
  - Lock account after 5 failed attempts in 15 minutes
  - _Requirements: Req-1.1, Req-1.3, Req-1.4_
  - _Design: Section 2.1.4_
  - _Effort: M_

- [ ] 2.4 Implement MFA TOTP setup and verification
  - Add MFA secret generation using speakeasy
  - Create MFA setup endpoint with QR code generation
  - Implement MFA verification endpoint
  - Generate partial token for MFA flow (5min expiration)
  - _Requirements: Req-1.2_
  - _Design: Section 5.4_
  - _Effort: M_


- [ ] 2.5 Implement refresh token rotation flow
  - Create refresh token endpoint
  - Validate refresh token and check Redis blacklist
  - Revoke old refresh token and add to blacklist
  - Generate new access and refresh tokens
  - Store new refresh token in database
  - _Requirements: Req-1.5, Req-1.6_
  - _Design: Section 5.3_
  - _Effort: M_

- [ ] 2.6 Implement logout endpoint with token revocation
  - Create logout endpoint
  - Add refresh token to Redis blacklist with 7-day TTL
  - Update session record with logout timestamp
  - _Requirements: Req-1.7_
  - _Design: Section 2.1.4_
  - _Effort: S_

- [ ]* 2.7 Write unit tests for AuthService
  - Test login with valid/invalid credentials
  - Test account lockout after 5 failed attempts
  - Test MFA flow with valid/invalid codes
  - Test token generation and refresh
  - Mock database and Redis dependencies
  - _Requirements: Req-28_
  - _Effort: M_

### 3. Authorization and RBAC Implementation

- [ ] 3.1 Implement JWT authentication guard
  - Create JwtAuthGuard extending AuthGuard('jwt')
  - Implement JWT strategy with RS256 verification
  - Support @Public() decorator for public endpoints
  - Extract user from JWT and attach to request
  - _Requirements: Req-2.2, Req-2.3_
  - _Design: Section 2.1.5_
  - _Effort: M_


- [ ] 3.2 Implement RBAC permissions guard
  - Create PermissionsGuard with permission checking logic
  - Implement @Permissions() decorator
  - Parse permission format: resource:action:scope
  - Check user permissions from JWT claims
  - Support scope-based filtering (own, team, department, all)
  - _Requirements: Req-2.5, Req-2.6, Req-2.7_
  - _Design: Section 5.5_
  - _Effort: M_

- [ ] 3.3 Seed initial roles and permissions data
  - Create database seed script for roles: agent, supervisor, admin, auditor
  - Define permission sets for each role
  - Create default admin user for testing
  - _Requirements: Req-2.1_
  - _Effort: S_

- [ ]* 3.4 Write integration tests for authentication endpoints
  - Test POST /api/v1/auth/login with valid credentials
  - Test POST /api/v1/auth/login with invalid credentials
  - Test POST /api/v1/auth/mfa/verify flow
  - Test POST /api/v1/auth/refresh token rotation
  - Test POST /api/v1/auth/logout
  - Use Supertest and test database
  - _Requirements: Req-28_
  - _Effort: M_

### 4. User Profile and Session Management

- [ ] 4.1 Implement GET /api/v1/users/me endpoint
  - Create UsersController with getCurrentUser method
  - Return user profile with roles and permissions
  - Include agentId for linking to Agent Service
  - _Requirements: Req-1.9_
  - _Design: API Specifications_
  - _Effort: S_


- [ ] 4.2 Implement session tracking and audit logging
  - Store session metadata (IP, user agent, login timestamp)
  - Create audit log entries for authentication events
  - Implement GET /api/v1/auth/sessions endpoint
  - _Requirements: Req-1.8, Req-2.10_
  - _Effort: M_

- [ ] 4.3 Configure Redis for token blacklist and caching
  - Set up Redis connection with ioredis
  - Implement token blacklist with TTL
  - Cache JWT validation results
  - _Requirements: Req-23.1, Req-23.2_
  - _Design: Section 3, Caching Strategy_
  - _Effort: S_

### 5. API Gateway Integration

- [ ] 5.1 Configure Kong API Gateway for Identity Service
  - Add Identity Service route to Kong
  - Configure JWT plugin for token validation
  - Set up rate limiting: 5/min for login, 10/min for refresh
  - Configure CORS policy
  - _Requirements: Req-20.1, Req-20.2, Req-24.9_
  - _Design: Section 1.1_
  - _Effort: M_

- [ ] 5.2 Checkpoint - Verify authentication flow end-to-end
  - Test login flow from Agent Desktop to Identity Service via Kong
  - Verify JWT tokens are generated correctly
  - Verify MFA flow works
  - Verify token refresh works
  - Ensure all tests pass, ask user if questions arise
  - _Effort: S_


---

## Sprint 2-3: Agent Management (MS-2)

### 6. Agent Service Database and Entities

- [ ] 6.1 Create TypeORM migrations for Agent Service schema
  - Create migrations for agent_profiles, agent_channel_status, agent_sessions, agent_status_history tables
  - Add indexes and unique constraints
  - Add check constraints for channel and status values
  - Add tenant_id UUID NOT NULL column to all tables for multi-tenancy support
  - _Requirements: Req-21_
  - _Design: Section 2.2.2_
  - _Effort: M_

- [ ] 6.2 Implement AgentProfile, AgentChannelStatus, AgentSession entities
  - Create AgentProfile entity with skills JSONB field
  - Create AgentChannelStatus entity with unique constraint on (agentId, channel)
  - Create AgentSession entity with heartbeat tracking
  - Add entity relationships
  - _Requirements: Req-3, Req-4_
  - _Design: Section 2.2.2_
  - _Effort: M_

- [ ]* 6.3 Write unit tests for Agent entities
  - Test entity creation and validation
  - Test unique constraints
  - Test JSONB field handling for skills
  - _Requirements: Req-28_
  - _Effort: S_

### 7. Agent Status Management Implementation

- [ ] 7.1 Implement StatusService for per-channel status management
  - Create updateChannelStatus method with reason validation
  - Create updateAllChannelsStatus method for bulk updates
  - Implement status duration calculation
  - Store status changes in database
  - _Requirements: Req-3.1, Req-3.2, Req-3.3, Req-3.4, Req-3.7_
  - _Design: Section 2.2.3_
  - _Effort: M_


- [ ] 7.2 Implement Kafka event publishing for status changes
  - Create AgentEventsProducer service
  - Publish agent.status.changed events to Kafka
  - Include event metadata: eventId, timestamp, tenantId
  - Configure producer with acknowledgment level 'all'
  - _Requirements: Req-3.5, Req-22.2_
  - _Design: Section 7, Event-Driven Architecture_
  - _Effort: M_

- [ ] 7.3 Implement agent status REST endpoints
  - Create GET /api/v1/agents/me/status endpoint
  - Create PUT /api/v1/agents/me/status/{channel} endpoint
  - Create PUT /api/v1/agents/me/status/all endpoint
  - Add DTO validation for status and reason fields
  - _Requirements: Req-3_
  - _Design: API Specifications_
  - _Effort: M_

- [ ]* 7.4 Write unit tests for StatusService
  - Test updateChannelStatus with valid/invalid reasons
  - Test updateAllChannelsStatus atomic operation
  - Test duration calculation
  - Mock Kafka producer
  - _Requirements: Req-28_
  - _Effort: M_

### 8. Agent Presence and Heartbeat

- [ ] 8.1 Implement PresenceService with heartbeat tracking
  - Create createSession method on agent login
  - Create updateHeartbeat method (called every 30 seconds)
  - Implement scheduled job to check for disconnected agents (60s timeout)
  - Publish agent.session.ended events
  - _Requirements: Req-4.1, Req-4.2, Req-4.3, Req-4.4, Req-4.5_
  - _Design: Section 2.2.3_
  - _Effort: M_


- [ ] 8.2 Implement agent availability query for transfers
  - Create getAvailableAgents method with department and skills filtering
  - Filter by connected status and ready channel status
  - Include current load per channel in response
  - _Requirements: Req-4.7, Req-4.8, Req-4.9_
  - _Design: Section 2.2.3_
  - _Effort: M_

- [ ] 8.3 Implement heartbeat REST endpoint
  - Create POST /api/v1/agents/me/heartbeat endpoint
  - Update lastHeartbeatAt timestamp
  - Return success response with timestamp
  - _Requirements: Req-4.2_
  - _Design: API Specifications_
  - _Effort: S_

### 9. WebSocket Real-Time Status Updates

- [ ] 9.1 Implement AgentsGateway for WebSocket connections
  - Create WebSocket gateway with JWT authentication
  - Handle connection/disconnection events
  - Implement agent-specific room subscriptions
  - _Requirements: Req-3.8_
  - _Design: Section 2.2.4, Section 6_
  - _Effort: M_

- [ ] 9.2 Implement real-time status push via WebSocket
  - Create pushStatusUpdate method in gateway
  - Emit status updates to subscribed clients within 1 second
  - Handle status:subscribe message from clients
  - _Requirements: Req-3.9_
  - _Design: Section 6.1_
  - _Effort: M_


- [ ]* 9.3 Write integration tests for WebSocket status updates
  - Test WebSocket connection with JWT authentication
  - Test status subscription and push notifications
  - Test reconnection handling
  - Use Socket.IO client for testing
  - _Requirements: Req-28_
  - _Effort: M_

### 10. Agent Profile and Settings

- [ ] 10.1 Implement agent profile endpoints
  - Create GET /api/v1/agents/me endpoint
  - Create GET /api/v1/agents/{agentId} endpoint
  - Return profile with current status and session info
  - _Requirements: Req-3, Req-4_
  - _Design: API Specifications_
  - _Effort: S_

- [ ] 10.2 Implement Redis caching for agent status
  - Cache agent status with 60-second TTL
  - Invalidate cache on status updates
  - Implement cache-aside pattern
  - _Requirements: Req-23.3_
  - _Design: Caching Strategy_
  - _Effort: M_

- [ ] 10.3 Checkpoint - Verify agent status management end-to-end
  - Test agent status updates via REST API
  - Verify WebSocket push notifications work
  - Test heartbeat mechanism
  - Verify Kafka events are published
  - Ensure all tests pass, ask user if questions arise
  - _Effort: S_


---

## Sprint 3-4: Interaction Queue (MS-3)

### 11. Interaction Service Database and Entities

- [ ] 11.1 Create TypeORM migrations for Interaction Service schema
  - Create migrations for interactions, interaction_notes, interaction_events, email_messages, chat_messages tables
  - Add indexes for customer_id, assigned_agent_id, status, channel, created_at
  - Add composite indexes for common filter combinations
  - Add tenant_id UUID NOT NULL column to all tables for multi-tenancy support
  - _Requirements: Req-21_
  - _Design: Section 2.3, Database Schema_
  - _Effort: M_

- [ ] 11.2 Implement Interaction, InteractionNote, InteractionEvent entities
  - Create Interaction entity with status, priority, channel fields
  - Create InteractionNote entity with tag and pin capability
  - Create InteractionEvent entity for timeline tracking
  - Add entity relationships
  - _Requirements: Req-5, Req-6_
  - _Design: Section 2.3.1_
  - _Effort: M_

- [ ] 11.3 Implement EmailMessage and ChatMessage entities
  - Create EmailMessage entity with thread support
  - Create ChatMessage entity with session tracking
  - Add support for message types and metadata
  - _Requirements: Req-8, Req-9_
  - _Design: Section 2.3.1_
  - _Effort: M_

- [ ]* 11.4 Write unit tests for Interaction entities
  - Test entity creation and validation
  - Test state machine transitions
  - Test relationship mappings
  - _Requirements: Req-28_
  - _Effort: M_


### 12. Interaction Queue Management

- [ ] 12.1 Implement InteractionService with filtering and pagination
  - Create findAll method with channel, status, priority, search filters
  - Implement pagination with page size 50
  - Sort by updatedAt descending
  - Build dynamic WHERE clause based on filters
  - _Requirements: Req-5.1, Req-5.2, Req-5.3, Req-5.4, Req-5.5, Req-5.6, Req-5.7_
  - _Design: Section 2.3.2, Section 4.4_
  - _Effort: M_

- [ ] 12.2 Implement interaction statistics aggregation
  - Calculate counts by channel (voice, email, chat)
  - Calculate counts by status (new, assigned, in-progress, resolved)
  - Calculate counts by priority (low, medium, high, urgent)
  - Return stats with interaction list response
  - _Requirements: Req-5.6_
  - _Design: Section 4.2_
  - _Effort: M_

- [ ] 12.3 Implement interaction detail endpoint
  - Create GET /api/v1/interactions/{id} endpoint
  - Return interaction with notes, events, and timeline
  - Include SLA metadata for chat interactions
  - _Requirements: Req-6_
  - _Design: API Specifications_
  - _Effort: S_

- [ ] 12.4 Implement Kafka event publishing for interactions
  - Publish interaction.created events
  - Publish interaction.assigned events
  - Publish interaction.status.changed events
  - Include full interaction payload in events
  - _Requirements: Req-5.8, Req-22.1_
  - _Design: Section 7_
  - _Effort: M_


### 13. Interaction Lifecycle Management

- [ ] 13.1 Implement interaction state machine validation
  - Define state machine: new → assigned → in-progress → resolved → closed
  - Create validateTransition method
  - Enforce state transitions in updateStatus method
  - Return 400 Bad Request for invalid transitions
  - _Requirements: Req-6.1, Req-6.3, Req-6.4_
  - _Design: Section 2.3.3_
  - _Effort: M_

- [ ] 13.2 Implement interaction assignment and transfer
  - Create PUT /api/v1/interactions/{id}/assign endpoint
  - Create POST /api/v1/interactions/{id}/transfer endpoint
  - Update assignedAgentId and publish events
  - Record assignment in timeline
  - _Requirements: Req-6.2_
  - _Design: API Specifications_
  - _Effort: M_

- [ ] 13.3 Implement interaction notes management
  - Create POST /api/v1/interactions/{id}/notes endpoint
  - Create PUT /api/v1/interactions/{id}/notes/{noteId} endpoint
  - Support note tags and pin capability
  - Limit content to 5000 characters
  - _Requirements: Req-6.5, Req-6.6, Req-6.7, Req-6.8_
  - _Design: Section 2.3.2_
  - _Effort: M_

- [ ]* 13.4 Write unit tests for InteractionService
  - Test state machine transitions
  - Test filtering and pagination logic
  - Test statistics aggregation
  - Mock database and Kafka
  - _Requirements: Req-28_
  - _Effort: M_


### 14. SLA Tracking and Real-Time Updates

- [ ] 14.1 Implement SLAService for chat interactions
  - Calculate SLA deadline (5 minutes from creation)
  - Track SLA status: within-sla, near-breach, breached
  - Update status to near-breach at 1 minute remaining
  - Update status to breached when deadline exceeded
  - _Requirements: Req-7.1, Req-7.2, Req-7.3, Req-7.4_
  - _Design: Section 2.3.2_
  - _Effort: M_

- [ ] 14.2 Implement scheduled SLA breach detection
  - Create scheduled job to check for SLA breaches
  - Publish sla.breached events to Kafka
  - Calculate first response time and waiting time
  - _Requirements: Req-7.4, Req-7.7, Req-7.8, Req-7.9_
  - _Design: Section 2.3.2_
  - _Effort: M_

- [ ] 14.3 Implement WebSocket SLA countdown push
  - Create /ws/interactions/{interactionId}/sla channel
  - Push countdown updates every 1 second for near-breach/breached
  - Include remaining seconds and threshold in updates
  - _Requirements: Req-7.5, Req-7.6_
  - _Design: Section 6.1_
  - _Effort: M_

### 15. Email Thread Management

- [ ] 15.1 Implement EmailService for thread management
  - Create getThread method to retrieve all messages by threadId
  - Sort messages chronologically
  - Include from, to, cc, bcc, subject, body, attachments
  - _Requirements: Req-8.1, Req-8.2, Req-8.3_
  - _Design: Section 2.3.2_
  - _Effort: M_


- [ ] 15.2 Implement email reply and forward endpoints
  - Create POST /api/v1/interactions/{id}/email/reply endpoint
  - Create POST /api/v1/interactions/{id}/email/forward endpoint
  - Validate recipient email addresses
  - Support reply, reply-all, and forward actions
  - Store sent messages in thread
  - _Requirements: Req-8.5, Req-8.6, Req-8.7_
  - _Design: API Specifications_
  - _Effort: M_

- [ ] 15.3 Implement email template support with variable substitution
  - Create email template storage
  - Implement variable substitution engine
  - Support common variables: customerName, agentName, etc.
  - _Requirements: Req-8.8_
  - _Effort: M_

### 16. Chat Session Management

- [ ] 16.1 Implement ChatService for message management
  - Create getMessages method with pagination
  - Create sendMessage method with WebSocket broadcast
  - Support message types: text, image, file, system
  - Calculate chat metrics (total messages, response time)
  - _Requirements: Req-9.1, Req-9.3, Req-9.7, Req-9.10_
  - _Design: Section 2.3.2_
  - _Effort: M_

- [ ] 16.2 Implement WebSocket bidirectional chat messaging
  - Create /ws/interactions/{interactionId}/chat channel
  - Handle incoming messages from agents
  - Broadcast messages to customers via channel gateway
  - Push customer messages to agents within 500ms
  - _Requirements: Req-9.4, Req-9.5, Req-9.6_
  - _Design: Section 6.1_
  - _Effort: M_


- [ ] 16.3 Implement chat session close endpoint
  - Create POST /api/v1/interactions/{id}/chat/close endpoint
  - Update interaction status to resolved
  - Record session end timestamp
  - _Requirements: Req-9.9_
  - _Design: API Specifications_
  - _Effort: S_

### 17. WebSocket Queue Updates

- [ ] 17.1 Implement real-time queue updates via WebSocket
  - Create /ws/interactions/{agentId}/queue channel
  - Push new interaction events
  - Push assignment events
  - Push status change events
  - Deliver updates within 2 seconds
  - _Requirements: Req-5.9, Req-5.10_
  - _Design: Section 6.1_
  - _Effort: M_

- [ ] 17.2 Checkpoint - Verify interaction management end-to-end
  - Test interaction list with filters
  - Test interaction detail retrieval
  - Test status updates and state machine
  - Test SLA tracking for chat
  - Test WebSocket queue updates
  - Ensure all tests pass, ask user if questions arise
  - _Effort: S_

---

## Sprint 4: Customer Information (MS-5)

### 18. Customer Service Database and Entities

- [ ] 18.1 Create TypeORM migrations for Customer Service schema
  - Create migrations for customers and customer_notes tables
  - Add indexes for cif, full_name, segment
  - Add tenant_id UUID NOT NULL column to all tables for multi-tenancy support
  - Configure PII field encryption
  - _Requirements: Req-21_
  - _Design: Database Schema_
  - _Effort: M_


- [ ] 18.2 Implement Customer and CustomerNote entities
  - Create Customer entity with encrypted PII fields
  - Create CustomerNote entity with tag and pin capability
  - Add entity relationships
  - _Requirements: Req-13, Req-15_
  - _Design: Section 2.5.1_
  - _Effort: M_

- [ ]* 18.3 Write unit tests for Customer entities
  - Test entity creation and validation
  - Test PII field handling
  - Test note relationships
  - _Requirements: Req-28_
  - _Effort: S_

### 19. PII Encryption Implementation

- [ ] 19.1 Implement EncryptionService with AES-256-GCM
  - Create encrypt method with IV and auth tag
  - Create decrypt method with verification
  - Use encryption key from environment variables
  - Format: iv:authTag:encrypted
  - _Requirements: Req-13.2, Req-24.3, Req-24.4_
  - _Design: Section 2.5.3_
  - _Effort: M_

- [ ] 19.2 Implement TypeORM subscriber for automatic encryption
  - Create CustomerSubscriber for beforeInsert hook
  - Encrypt email, phone, CIF before database insert
  - Decrypt fields in afterLoad hook
  - _Requirements: Req-13.2_
  - _Design: Section 2.5.4_
  - _Effort: M_

- [ ] 19.3 Implement explicit CIF encryption in CustomerSubscriber
  - Ensure CIF field is encrypted before insert/update
  - Ensure CIF field is decrypted after load
  - Add unit tests for CIF encryption round-trip
  - Verify CIF is stored encrypted in database
  - _Requirements: Req-13.2, Req-24.3_
  - _Design: Section 2.5.4_
  - _Effort: S_

- [ ]* 19.4 Write unit tests for EncryptionService
  - Test encrypt/decrypt round-trip
  - Test auth tag verification
  - Test invalid ciphertext handling
  - _Requirements: Req-28_
  - _Effort: S_


### 20. Customer Profile Management

- [ ] 20.1 Implement CustomerService with profile retrieval
  - Create findOne method with PII decryption
  - Calculate relationship length from account creation date
  - Format phone numbers in Vietnamese format (0XXX XXX XXX)
  - Return avatar URL with fallback to default
  - _Requirements: Req-13.1, Req-13.4, Req-13.6, Req-13.9_
  - _Design: Section 2.5.2_
  - _Effort: M_

- [ ] 20.2 Implement customer interaction history retrieval
  - Query Interaction Service for customer interactions
  - Sort by creation date descending
  - Support pagination with page size 20
  - Support filtering by channel and date range
  - Aggregate statistics by channel
  - _Requirements: Req-14.1, Req-14.2, Req-14.3, Req-14.4, Req-14.5, Req-14.6_
  - _Design: Section 2.5.2_
  - _Effort: M_

- [ ] 20.3 Implement customer search endpoint
  - Create GET /api/v1/customers/search endpoint
  - Support search by CIF, name, or phone
  - Use case-insensitive matching
  - Return paginated results
  - _Requirements: Req-15.10_
  - _Design: API Specifications_
  - _Effort: M_

- [ ] 20.4 Implement Redis caching for customer profiles
  - Cache customer profiles with 5-minute TTL
  - Use key format: customer:profile:{id}
  - Invalidate cache on customer updates
  - Implement cache-aside pattern
  - _Requirements: Req-23.4_
  - _Design: Caching Strategy_
  - _Effort: M_


### 21. Customer Notes Management

- [ ] 21.1 Implement customer notes CRUD operations
  - Create POST /api/v1/customers/{id}/notes endpoint
  - Create PUT /api/v1/customers/{id}/notes/{noteId} endpoint
  - Create GET /api/v1/customers/{id}/notes endpoint
  - Support note tags and pin capability
  - Limit content to 2000 characters
  - Limit pinned notes to 3 per customer
  - _Requirements: Req-15.1, Req-15.2, Req-15.3, Req-15.4, Req-15.5_
  - _Design: Section 2.5.2_
  - _Effort: M_

- [ ] 21.2 Implement note sorting and search
  - Sort by pinned status first, then creation date descending
  - Support case-insensitive content search
  - Track note edit history
  - _Requirements: Req-15.6, Req-15.7, Req-15.8, Req-15.10_
  - _Design: Section 2.5.2_
  - _Effort: S_

- [ ]* 21.3 Write integration tests for Customer Service
  - Test customer profile retrieval with decryption
  - Test interaction history aggregation
  - Test customer search
  - Test notes CRUD operations
  - _Requirements: Req-28_
  - _Effort: M_

- [ ] 21.4 Checkpoint - Verify customer information management
  - Test customer profile display with encrypted PII
  - Test interaction history retrieval
  - Test customer notes management
  - Test Redis caching
  - Ensure all tests pass, ask user if questions arise
  - _Effort: S_


---

## Sprint 5: Ticket Management (MS-4)

### 22. Ticket Service Database and Entities

- [ ] 22.1 Create TypeORM migrations for Ticket Service schema
  - Create migrations for tickets, ticket_comments, ticket_history tables
  - Add indexes for customer_id, assigned_agent_id, status, priority, created_at
  - Add unique constraint for display_id
  - Add tenant_id UUID NOT NULL column to all tables for multi-tenancy support
  - _Requirements: Req-21_
  - _Design: Database Schema_
  - _Effort: M_

- [ ] 22.2 Implement Ticket, TicketComment, TicketHistory entities
  - Create Ticket entity with display ID generation
  - Create TicketComment entity with isInternal flag
  - Create TicketHistory entity for change tracking
  - Add entity relationships
  - _Requirements: Req-10, Req-12_
  - _Design: Section 2.4.1_
  - _Effort: M_

- [ ]* 22.3 Write unit tests for Ticket entities
  - Test entity creation and validation
  - Test display ID uniqueness
  - Test state machine transitions
  - _Requirements: Req-28_
  - _Effort: S_

### 23. Ticket Creation and Management

- [ ] 23.1 Implement display ID generation
  - Generate format: TKT-YYYY-NNNNNN
  - Query count of tickets for current year
  - Pad sequence number with leading zeros
  - Ensure uniqueness with database constraint
  - _Requirements: Req-10.1_
  - _Design: Section 2.4.4_
  - _Effort: M_


- [ ] 23.2 Implement ticket creation endpoint
  - Create POST /api/v1/tickets endpoint
  - Validate title (5-200 chars) and description (10-5000 chars)
  - Validate priority: low, medium, high, urgent
  - Validate category: service-complaint, technical-request, info-change, product-warranty, finance-payment, other
  - Link to interaction and customer
  - Publish ticket.created event to Kafka
  - _Requirements: Req-10.2, Req-10.3, Req-10.4, Req-10.5, Req-10.6, Req-10.7, Req-10.8_
  - _Design: Section 2.4.2, API Specifications_
  - _Effort: M_

- [ ] 23.3 Implement ticket retrieval endpoints
  - Create GET /api/v1/tickets/{id} endpoint with comments and history
  - Create GET /api/v1/tickets endpoint with filtering
  - Support filtering by status, priority, assigned agent, customer
  - Support pagination with page size 20
  - _Requirements: Req-10, Req-11_
  - _Design: API Specifications_
  - _Effort: M_

- [ ] 23.4 Implement ticket update endpoint
  - Create PUT /api/v1/tickets/{id} endpoint
  - Support updating title, description, priority, category, due date
  - Validate dueAt is in the future
  - Track changes in ticket history
  - _Requirements: Req-10.9_
  - _Design: Section 2.4.2_
  - _Effort: M_

### 24. Ticket Workflow State Management

- [ ] 24.1 Implement ticket state machine
  - Define transitions: new → in-progress → waiting-response → resolved → closed
  - Allow direct transition to resolved from any state
  - Create validateTransition method
  - Prevent status changes after closed
  - _Requirements: Req-11.1, Req-11.2, Req-11.5_
  - _Design: Section 2.4.3_
  - _Effort: M_


- [ ] 24.2 Implement ticket status update with history tracking
  - Record old value, new value, agent ID, timestamp in history
  - Record resolvedAt timestamp when status changes to resolved
  - Record closedAt timestamp when status changes to closed
  - Return allowed transitions on invalid transition attempt
  - Publish ticket.updated event to Kafka
  - _Requirements: Req-11.3, Req-11.4, Req-11.5, Req-11.6, Req-11.7_
  - _Design: Section 2.4.2_
  - _Effort: M_

- [ ] 24.3 Implement ticket assignment
  - Create PUT /api/v1/tickets/{id}/assign endpoint
  - Update assignedAgentId and assignedAgentName
  - Track assignment in history
  - Publish ticket.assigned event to Kafka
  - Send notification to new assignee
  - _Requirements: Req-11.9, Req-11.10_
  - _Design: API Specifications_
  - _Effort: M_

- [ ] 24.4 Calculate ticket age and metrics
  - Calculate age in hours from creation to current time or resolution
  - Track assignment history
  - Support ticket escalation endpoint
  - _Requirements: Req-11.8_
  - _Design: Section 2.4.2_
  - _Effort: S_

### 25. Ticket Comments and Collaboration

- [ ] 25.1 Implement ticket comments CRUD
  - Create POST /api/v1/tickets/{id}/comments endpoint
  - Create GET /api/v1/tickets/{id}/comments endpoint
  - Support comment type: public or internal
  - Limit content to 5000 characters
  - Record author ID, author name, creation timestamp
  - _Requirements: Req-12.1, Req-12.2, Req-12.3, Req-12.4, Req-12.5_
  - _Design: Section 2.4.2_
  - _Effort: M_


- [ ] 25.2 Implement comment attachments support
  - Support up to 10 files per comment
  - Validate total size does not exceed 25MB
  - Integrate with Media Service for storage
  - _Requirements: Req-12.6, Req-12.7_
  - _Design: Section 2.4.2_
  - _Effort: M_

- [ ] 25.3 Implement comment editing with history
  - Allow agents to edit their own comments within 15 minutes
  - Track original content and edit timestamp
  - Update ticket updatedAt on comment addition
  - _Requirements: Req-12.8, Req-12.9, Req-12.10_
  - _Design: Section 2.4.2_
  - _Effort: M_

- [ ]* 25.4 Write unit tests for TicketService
  - Test display ID generation
  - Test state machine transitions
  - Test history tracking
  - Test comment management
  - Mock database and Kafka
  - _Requirements: Req-28_
  - _Effort: M_

- [ ] 25.5 Checkpoint - Verify ticket management end-to-end
  - Test ticket creation from interaction
  - Test ticket workflow state transitions
  - Test ticket assignment
  - Test comment management
  - Test Kafka event publishing
  - Ensure all tests pass, ask user if questions arise
  - _Effort: S_

---

## Sprint 6: Notifications (MS-6)

### 26. Notification Service Database and Entities

- [ ] 26.1 Create TypeORM migrations for Notification Service schema
  - Create migrations for notifications and notification_settings tables
  - Add indexes for recipient_agent_id, status, type, created_at
  - Add tenant_id UUID NOT NULL column to all tables for multi-tenancy support
  - _Requirements: Req-21_
  - _Design: Database Schema_
  - _Effort: M_


- [ ] 26.2 Implement Notification and NotificationSettings entities
  - Create Notification entity with type, status, priority, metadata
  - Create NotificationSettings entity with agent preferences
  - Add entity relationships
  - _Requirements: Req-16, Req-18_
  - _Design: Section 2.6.1_
  - _Effort: M_

- [ ]* 26.3 Write unit tests for Notification entities
  - Test entity creation and validation
  - Test state machine transitions
  - Test settings validation
  - _Requirements: Req-28_
  - _Effort: S_

### 27. Real-Time Notification Delivery

- [ ] 27.1 Implement NotificationService with creation and delivery
  - Create notification with type, priority, title, message, metadata
  - Set initial status to 'new'
  - Support notification types: missed-call, ticket-assignment, ticket-due, system-alert, schedule-reminder
  - Include VIP flag and action buttons
  - _Requirements: Req-16.1, Req-16.2, Req-16.3, Req-16.6, Req-16.7, Req-16.8_
  - _Design: Section 2.6.2_
  - _Effort: M_

- [ ] 27.2 Implement NotificationsGateway for WebSocket push
  - Create /ws/notifications/{agentId} channel
  - Push new notifications within 1 second of creation
  - Handle agent-specific room subscriptions
  - _Requirements: Req-16.4, Req-16.5_
  - _Design: Section 2.6.4, Section 6.1_
  - _Effort: M_

- [ ] 27.3 Implement notification auto-expiration
  - Set type-specific TTL for notifications
  - Update status to 'dismissed' when expired
  - Implement scheduled job for expiration checks
  - _Requirements: Req-16.9, Req-16.10_
  - _Design: Section 2.6.2_
  - _Effort: M_


### 28. Notification State Management

- [ ] 28.1 Implement notification state machine
  - Define transitions: new → viewed → actioned OR new → viewed → dismissed
  - Create state update endpoints
  - Record viewedAt, actionedAt, dismissedAt timestamps
  - _Requirements: Req-17.1, Req-17.2, Req-17.3, Req-17.4_
  - _Design: Section 2.6.2_
  - _Effort: M_

- [ ] 28.2 Implement notification list and filtering
  - Create GET /api/v1/notifications endpoint
  - Support tab filters: all, calls, tickets, system, schedule
  - Return tab-specific counts
  - Support pagination
  - _Requirements: Req-17.8, Req-17.9_
  - _Design: API Specifications_
  - _Effort: M_

- [ ] 28.3 Implement bulk operations and unread count
  - Create PUT /api/v1/notifications/mark-all-read endpoint
  - Create GET /api/v1/notifications/unread-count endpoint
  - Calculate unread count as notifications with status 'new'
  - Create DELETE /api/v1/notifications/clear-old endpoint (24 hours)
  - _Requirements: Req-17.5, Req-17.6, Req-17.7, Req-17.10_
  - _Design: API Specifications_
  - _Effort: M_

### 29. Notification Preferences and Settings

- [ ] 29.1 Implement notification settings management
  - Create GET /api/v1/notifications/settings endpoint
  - Create PUT /api/v1/notifications/settings endpoint
  - Support enabled flag, sound enabled flag
  - Support auto-hide duration: 5, 8, 10, 15 seconds
  - Support max active notifications (1-10, default 3)
  - _Requirements: Req-18.1, Req-18.2, Req-18.3, Req-18.4, Req-18.7, Req-18.8_
  - _Design: Section 2.6.2_
  - _Effort: M_


- [ ] 29.2 Implement per-type notification preferences
  - Allow enabling/disabling notifications per type
  - Apply settings immediately to new notifications
  - Queue notifications when max active reached
  - Display queued notifications when count drops below max
  - _Requirements: Req-18.4, Req-18.5, Req-18.9, Req-18.10_
  - _Design: Section 2.6.2_
  - _Effort: M_

### 30. Kafka Event Consumers

- [ ] 30.1 Implement NotificationEventConsumer for interactions
  - Subscribe to 'interactions' topic
  - Handle interaction.assigned events
  - Handle interaction.transferred events
  - Create notifications for assigned agents
  - _Requirements: Req-22.4_
  - _Design: Section 2.6.3_
  - _Effort: M_

- [ ] 30.2 Implement NotificationEventConsumer for tickets
  - Subscribe to 'tickets' topic
  - Handle ticket.assigned events
  - Handle ticket.escalated events
  - Create notifications with ticket metadata
  - _Requirements: Req-22.4_
  - _Design: Section 2.6.3_
  - _Effort: M_

- [ ] 30.3 Implement NotificationEventConsumer for SLA events
  - Subscribe to 'sla-events' topic
  - Handle sla.warning events
  - Handle sla.breached events
  - Create urgent notifications for breaches
  - _Requirements: Req-7.9, Req-22.4_
  - _Design: Section 2.6.3_
  - _Effort: M_


### 31. Not-Ready Missed Call Warning

- [ ] 31.1 Implement WarningService for missed call tracking
  - Track missed calls where agent status was not-ready
  - Activate warning banner at 3+ missed calls within 15-minute window
  - Reset counter when 15-minute window expires
  - Reset counter when agent sets all channels to ready
  - _Requirements: Req-19.1, Req-19.2, Req-19.3, Req-19.4, Req-19.5_
  - _Design: Section 2.6.2_
  - _Effort: M_

- [ ] 31.2 Implement warning status tracking via Kafka
  - Consume agent.status.changed events
  - Consume call.missed events
  - Correlate missed call timestamp with agent status
  - Create GET /api/v1/notifications/warnings/not-ready endpoint
  - _Requirements: Req-19.6, Req-19.7, Req-19.8, Req-19.9, Req-19.10_
  - _Design: Section 2.6.2_
  - _Effort: M_

- [ ]* 31.3 Write unit tests for NotificationService
  - Test notification creation and delivery
  - Test state machine transitions
  - Test event consumers with mocked Kafka
  - Test warning threshold logic
  - _Requirements: Req-28_
  - _Effort: M_

- [ ] 31.4 Checkpoint - Verify notification system end-to-end
  - Test notification creation from events
  - Test WebSocket push delivery
  - Test notification state management
  - Test preferences and settings
  - Test warning banner activation
  - Ensure all tests pass, ask user if questions arise
  - _Effort: S_


---

## Cross-Cutting Tasks (Throughout Sprints)

### 32. API Gateway Configuration

- [ ] 32.1 Configure Kong routes for all microservices
  - Add routes for MS-1 through MS-6
  - Configure path prefixes: /api/v1/auth, /api/v1/agents, /api/v1/interactions, /api/v1/tickets, /api/v1/customers, /api/v1/notifications
  - Set up upstream targets with health checks
  - _Requirements: Req-20, Req-30_
  - _Design: Section 1.1_
  - _Effort: M_

- [ ] 32.2 Configure Kong JWT validation plugin
  - Enable JWT plugin with RS256 verification
  - Configure public key for token validation
  - Set up token extraction from Authorization header
  - Configure claims validation
  - _Requirements: Req-2.2, Req-24.2_
  - _Design: Section 5.2_
  - _Effort: M_

- [ ] 32.3 Configure Kong rate limiting plugin
  - Set standard endpoints: 100 req/min per user
  - Set sensitive endpoints: 10 req/min per user
  - Set login endpoint: 5 req/min per IP
  - Use Redis for distributed rate limiting
  - Include rate limit headers in responses
  - _Requirements: Req-20.1, Req-20.2, Req-20.3, Req-20.4, Req-20.5_
  - _Design: Section 4.1_
  - _Effort: M_

- [ ] 32.4 Configure Kong CORS plugin
  - Allow origins: https://agent.tpb.vn, https://admin.tpb.vn
  - Allow methods: GET, POST, PUT, PATCH, DELETE
  - Allow headers: Authorization, Content-Type, X-Request-Id
  - Enable credentials
  - _Requirements: Req-24.9_
  - _Design: Security Requirements_
  - _Effort: S_


### 33. Kafka Infrastructure Setup

- [ ] 33.1 Configure Kafka topics for all services
  - Create topic: agent-status-v1 (partitions: 3, replication: 1)
  - Create topic: interactions-v1 (partitions: 5, replication: 1)
  - Create topic: sla-events-v1 (partitions: 3, replication: 1)
  - Create topic: tickets-v1 (partitions: 3, replication: 1)
  - Configure retention: 7 days
  - _Requirements: Req-22_
  - _Design: Section 7_
  - _Effort: M_

- [ ] 33.2 Implement Kafka producer base service
  - Create reusable KafkaProducerService
  - Configure acknowledgment level 'all'
  - Include event metadata: eventId, eventType, timestamp, tenantId
  - Implement retry logic with exponential backoff
  - _Requirements: Req-22.5, Req-22.6, Req-22.9_
  - _Design: Section 7_
  - _Effort: M_

- [ ] 33.3 Implement Kafka consumer base service
  - Create reusable KafkaConsumerService
  - Implement idempotent event handling with eventId deduplication
  - Configure consumer groups for parallel processing
  - Implement retry with exponential backoff (max 3 attempts)
  - Publish failed events to dead letter queue
  - _Requirements: Req-22.7, Req-22.8, Req-22.9, Req-22.10_
  - _Design: Section 7_
  - _Effort: M_

### 34. Redis Infrastructure Setup

- [ ] 34.1 Configure Redis connection for all services
  - Set up ioredis client with cluster support
  - Configure connection pooling
  - Implement fallback to database on Redis unavailability
  - _Requirements: Req-23.9_
  - _Design: Caching Strategy_
  - _Effort: M_


- [ ] 34.2 Implement Redis caching utilities
  - Create cache key naming convention: {service}:{entity}:{id}
  - Implement cache-aside pattern helper
  - Serialize objects as JSON
  - Monitor cache hit rate
  - _Requirements: Req-23.6, Req-23.7, Req-23.8, Req-23.10_
  - _Design: Caching Strategy_
  - _Effort: M_

### 35. Frontend Integration with React Query

- [ ] 35.1 Configure TanStack Query client
  - Set up QueryClient with staleTime: 30s for lists, 5min for details
  - Configure retry logic and error handling
  - Enable devtools for development
  - Persist cache to sessionStorage
  - _Requirements: Req-25.1, Req-25.2, Req-25.3, Req-25.10_
  - _Design: Frontend Integration_
  - _Effort: M_

- [ ] 35.2 Replace mock authentication with real API calls
  - Implement login mutation with JWT storage
  - Implement token refresh logic
  - Implement logout mutation
  - Handle 401 responses with automatic token refresh
  - Redirect to login on refresh failure
  - _Requirements: Req-25, Req-27.2, Req-27.3_
  - _Design: Frontend Integration_
  - _Effort: M_

- [ ] 35.3 Replace mock agent status with real API calls
  - Implement useAgentStatus query hook
  - Implement useUpdateStatus mutation hook
  - Implement optimistic updates for status changes
  - Invalidate queries on mutation success
  - _Requirements: Req-25.4, Req-25.5_
  - _Design: Frontend Integration_
  - _Effort: M_


- [ ] 35.4 Replace mock interaction queue with real API calls
  - Implement useInteractions query hook with filters
  - Implement infinite scroll with useInfiniteQuery
  - Prefetch interaction details on hover
  - Implement useUpdateInteraction mutation hook
  - _Requirements: Req-25.8, Req-25.9_
  - _Design: Frontend Integration_
  - _Effort: M_

- [ ] 35.5 Replace mock ticket data with real API calls
  - Implement useTickets query hook
  - Implement useCreateTicket mutation hook
  - Implement useUpdateTicket mutation hook
  - Implement useTicketComments query hook
  - _Requirements: Req-25_
  - _Design: Frontend Integration_
  - _Effort: M_

- [ ] 35.6 Replace mock customer data with real API calls
  - Implement useCustomer query hook
  - Implement useCustomerHistory query hook
  - Implement useCustomerNotes query hook
  - Implement useAddCustomerNote mutation hook
  - _Requirements: Req-25_
  - _Design: Frontend Integration_
  - _Effort: M_

- [ ] 35.7 Replace mock notifications with real API calls
  - Implement useNotifications query hook
  - Implement useUnreadCount query hook
  - Implement useUpdateNotificationStatus mutation hook
  - Implement useNotificationSettings query and mutation hooks
  - _Requirements: Req-25_
  - _Design: Frontend Integration_
  - _Effort: M_


### 36. WebSocket Connection Management

- [ ] 36.1 Implement WebSocket client with STOMP protocol
  - Set up @stomp/stompjs client with SockJS
  - Include JWT in connection headers
  - Implement connection lifecycle management
  - _Requirements: Req-26.1, Req-26.2_
  - _Design: Section 6.1_
  - _Effort: M_

- [ ] 36.2 Implement WebSocket reconnection strategy
  - Implement exponential backoff (max 10 attempts, 30s max delay)
  - Resubscribe to all channels on reconnection
  - Display connection status indicator in header
  - _Requirements: Req-26.3, Req-26.4, Req-26.5, Req-26.6_
  - _Design: Section 6.3_
  - _Effort: M_

- [ ] 36.3 Implement WebSocket message buffering
  - Buffer outgoing messages during disconnection
  - Send buffered messages on reconnection
  - Discard messages older than 5 minutes
  - Close connection gracefully on logout
  - _Requirements: Req-26.7, Req-26.8, Req-26.10_
  - _Design: Section 6.4_
  - _Effort: M_

- [ ] 36.4 Integrate WebSocket updates with React Query cache
  - Update query cache on WebSocket message receipt
  - Trigger UI updates via cache invalidation
  - Handle status updates, queue updates, notifications, SLA updates
  - _Requirements: Req-26.9_
  - _Design: Section 6_
  - _Effort: M_


### 37. Error Handling and User Feedback

- [ ] 37.1 Implement global error handling
  - Handle 400 errors with field-specific validation messages
  - Handle 401 errors with token refresh retry
  - Handle 403 errors with access denied message
  - Handle 429 errors with retry time display
  - Handle 500 errors with generic message and console logging
  - _Requirements: Req-27.1, Req-27.2, Req-27.3, Req-27.4, Req-27.5, Req-27.6_
  - _Design: Frontend Integration_
  - _Effort: M_

- [ ] 37.2 Implement toast notification system
  - Display success toasts with 3-second auto-hide
  - Display error toasts with 5-second auto-hide and manual dismiss
  - Use shadcn/ui Toast component
  - _Requirements: Req-27.7, Req-27.8_
  - _Design: Frontend Integration_
  - _Effort: S_

- [ ] 37.3 Implement loading states
  - Show skeleton loaders for list items during initial load
  - Show spinner overlays for form submissions
  - Disable submit buttons during submission
  - Use React Query loading states
  - _Requirements: Req-25.6, Req-27.9, Req-27.10_
  - _Design: Frontend Integration_
  - _Effort: M_

### 38. Testing and Quality Assurance

- [ ]* 38.1 Write E2E tests for critical user journeys
  - Test agent login flow with MFA
  - Test interaction queue filtering
  - Test ticket creation from interaction
  - Test customer information display
  - Test notification delivery
  - Use Playwright for E2E testing
  - _Requirements: Req-28.9_
  - _Effort: L_


- [ ]* 38.2 Verify unit test coverage across all services
  - Ensure ≥70% line coverage for Identity Service
  - Ensure ≥70% line coverage for Agent Service
  - Ensure ≥70% line coverage for Interaction Service
  - Ensure ≥70% line coverage for Ticket Service
  - Ensure ≥70% line coverage for Customer Service
  - Ensure ≥70% line coverage for Notification Service
  - Configure CI to fail builds below threshold
  - _Requirements: Req-28.1, Req-28.2, Req-28.10_
  - _Effort: M_

- [ ]* 38.3 Verify frontend component test coverage
  - Ensure ≥70% line coverage for Agent Desktop components
  - Test all interactive components with Testing Library
  - Mock API responses using MSW
  - _Requirements: Req-28.6, Req-28.7, Req-28.8_
  - _Effort: M_

### 39. Monitoring and Observability

- [ ] 39.1 Implement health check endpoints for all services
  - Create GET /health endpoint returning status 'ok'
  - Check database connectivity
  - Check Redis connectivity
  - Check Kafka connectivity
  - _Requirements: Req-29.1_
  - _Design: Monitoring and Observability_
  - _Effort: M_

- [ ] 39.2 Implement Prometheus metrics endpoints
  - Create GET /metrics endpoint in Prometheus format
  - Expose request rate, error rate, latency percentiles
  - Expose active connections count
  - Expose database connection pool metrics
  - _Requirements: Req-29.2, Req-29.8_
  - _Design: Monitoring and Observability_
  - _Effort: M_


- [ ] 39.3 Implement structured logging with PII masking
  - Configure Winston or Pino for structured JSON logging
  - Include fields: timestamp, level, message, requestId, userId, context
  - Mask PII fields: email, phone, account numbers
  - Use log levels: error, warn, info, debug
  - _Requirements: Req-29.5, Req-29.6, Req-29.7_
  - _Design: Logging_
  - _Effort: M_

- [ ] 39.4 Implement request ID propagation
  - Generate unique request ID for each request
  - Include X-Request-Id header in responses
  - Propagate request ID to all downstream services
  - Include request ID in all log entries
  - _Requirements: Req-20.6, Req-20.7, Req-29.4_
  - _Design: Monitoring and Observability_
  - _Effort: M_

- [ ] 39.5 Configure OpenTelemetry distributed tracing
  - Set up OpenTelemetry SDK in all services
  - Emit traces for HTTP requests and database queries
  - Propagate trace context in service-to-service calls
  - Export traces to Jaeger (Phase 3)
  - _Requirements: Req-29.3, Req-29.4_
  - _Design: Monitoring and Observability_
  - _Effort: L_

### 40. Security Hardening

- [ ] 40.1 Implement input validation on all DTOs
  - Use class-validator decorators on all DTOs
  - Validate string lengths, email formats, phone formats
  - Sanitize inputs to prevent XSS
  - Use parameterized queries to prevent SQL injection
  - _Requirements: Req-24.6, Req-24.7_
  - _Design: Security Requirements_
  - _Effort: M_


- [ ] 40.2 Run OWASP ZAP security scan
  - Scan all API endpoints for vulnerabilities
  - Test for SQL injection, XSS, CSRF
  - Test JWT tampering attempts
  - Test authorization bypass attempts
  - Verify no critical vulnerabilities
  - _Requirements: Req-24, Exit Criteria_
  - _Effort: M_

- [ ] 40.3 Run npm audit and fix vulnerabilities
  - Check for vulnerable dependencies
  - Update packages with known vulnerabilities
  - Document any unfixable vulnerabilities
  - _Requirements: Req-24_
  - _Effort: S_

### 41. Performance Testing

- [ ] 41.1 Run load testing with k6
  - Ramp up to 100 concurrent users over 5 minutes
  - Maintain 100 users for 10 minutes
  - Measure P50, P95, P99 response times
  - Verify P99 < 500ms for all endpoints
  - Verify no errors under load
  - _Requirements: Req-20.8, Performance Requirements_
  - _Effort: M_

- [ ] 41.2 Verify database connection pool stability
  - Monitor connection pool usage under load
  - Verify no connection exhaustion
  - Verify query performance within targets
  - _Requirements: Performance Requirements_
  - _Effort: S_


### 42. Docker Compose Configuration

- [ ] 42.1 Update docker-compose.yml with all services
  - Define services: identity-service, agent-service, interaction-service, ticket-service, customer-service, notification-service
  - Define infrastructure: postgres, redis, kafka, elasticsearch, seaweedfs
  - Configure health checks for all services
  - Set resource limits: 512MB memory, 0.5 CPU per service
  - _Requirements: Req-30.6, Req-30.7_
  - _Design: Deployment and Operations_
  - _Effort: M_

- [ ] 42.2 Configure service dependencies with health checks
  - Use depends_on with health check conditions
  - Ensure services start in correct order
  - Configure startup grace period: 60s
  - _Requirements: Req-30.9_
  - _Design: Deployment and Operations_
  - _Effort: M_

- [ ] 42.3 Configure named volumes for data persistence
  - Create volumes for PostgreSQL data
  - Create volumes for Redis data
  - Create volumes for Kafka data
  - Create volumes for Elasticsearch data
  - _Requirements: Req-30.8_
  - _Design: Deployment and Operations_
  - _Effort: S_

- [ ] 42.4 Create .env.example files for all services
  - Document all required environment variables
  - Include database connection strings
  - Include Redis connection strings
  - Include Kafka connection strings
  - Include JWT keys and encryption keys
  - _Requirements: Req-30.1, Req-30.2_
  - _Design: Deployment and Operations_
  - _Effort: M_


- [ ] 42.5 Validate environment variables on service startup
  - Check all required variables are present
  - Fail fast with clear error message if missing
  - Log configuration summary on startup (mask secrets)
  - _Requirements: Req-30.3_
  - _Design: Deployment and Operations_
  - _Effort: S_

### 43. Documentation

- [ ] 43.1 Update API documentation with Swagger/OpenAPI
  - Generate OpenAPI specs for all services
  - Document all endpoints with request/response schemas
  - Include authentication requirements
  - Include rate limit information
  - _Design: API Specifications_
  - _Effort: M_

- [ ] 43.2 Create deployment guide
  - Document prerequisites (Docker, Node.js 24)
  - Document environment setup steps
  - Document docker compose up process
  - Document troubleshooting common issues
  - _Requirements: Req-30_
  - _Effort: M_

- [ ] 43.3 Update README with Phase 1 completion status
  - Document completed features
  - Document API endpoints
  - Document WebSocket channels
  - Document testing instructions
  - _Effort: S_

### 44. Final Integration and Testing

- [ ] 44.1 End-to-end integration testing
  - Test complete agent login flow
  - Test interaction queue with real-time updates
  - Test ticket creation and management
  - Test customer information display
  - Test notification delivery
  - Verify all mock data replaced
  - _Requirements: Exit Criteria_
  - _Effort: L_


- [ ] 44.2 Performance validation
  - Verify API response time P99 < 500ms @ 100 concurrent users
  - Verify WebSocket message delivery < 2 seconds
  - Verify database query performance
  - Verify cache hit rate > 70%
  - _Requirements: Exit Criteria, Performance Requirements_
  - _Effort: M_

- [ ] 44.3 Security validation
  - Verify zero critical vulnerabilities from OWASP scan
  - Verify JWT validation works correctly
  - Verify RBAC enforcement on all protected endpoints
  - Verify PII encryption at rest
  - Verify rate limiting works
  - _Requirements: Exit Criteria, Security Requirements_
  - _Effort: M_

- [ ] 44.4 Final checkpoint - Phase 1 completion verification
  - Verify all 30 requirements implemented
  - Verify all exit criteria met
  - Verify unit test coverage ≥70% per service
  - Verify E2E tests pass for critical journeys
  - Verify all mock data replaced with real backend
  - Verify system runs stable for 1 hour under load
  - Document any known issues or limitations
  - Prepare demo for stakeholders
  - _Requirements: Exit Criteria_
  - _Effort: L_

---

## Task Summary

**Total Tasks:** 78 tasks (58 implementation + 20 optional testing tasks)

**By Sprint:**
- Sprint 1-2 (Authentication & Identity): 15 tasks
- Sprint 2-3 (Agent Management): 13 tasks
- Sprint 3-4 (Interaction Queue): 17 tasks
- Sprint 4 (Customer Information): 10 tasks
- Sprint 5 (Ticket Management): 11 tasks
- Sprint 6 (Notifications): 12 tasks
- Cross-Cutting: 44 tasks (distributed throughout)

**By Effort:**
- Small (S): ~25 tasks (1 day each)
- Medium (M): ~45 tasks (2 days each)
- Large (L): ~8 tasks (3 days each)

**Optional Tasks (marked with *):** 20 tasks focused on testing and quality assurance

