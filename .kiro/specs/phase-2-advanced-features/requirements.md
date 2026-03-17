# Requirements Document

## Introduction

Phase 2: Advanced Features extends the TPB CRM Platform with 8 new microservices that provide knowledge management, BFSI core banking integration, AI assistance, media handling, comprehensive audit trails, dynamic object schemas, flexible layouts, and multi-vendor CTI integration. This phase transforms the platform from a core MVP to a feature-rich enterprise CRM system.

**Phase 1 Foundation (Complete):**
- 6 operational services: Identity (MS-1), Agent (MS-2), Interaction (MS-3), Customer (MS-5), Ticket (MS-4), Notification (MS-6)
- 112/112 tests passing, all database schemas implemented
- Kong API Gateway configured with rate limiting and CORS
- Agent Desktop working with real backend APIs

**Phase 2 Goal:**
Implement 8 new services to enable knowledge base search, BFSI product queries, AI-powered suggestions, call recording streaming, immutable audit logs, dynamic object customization, flexible UI layouts, and multi-PBX telephony integration.

**Go-Live 2 Milestone:**
Full Agent Desktop with CTI integration, dynamic object support, and Admin Module for configuration management.

## Glossary

- **System**: The TPB CRM Platform comprising 19 microservices and 2 frontend modules
- **Agent**: Customer service representative using the Agent Desktop
- **Admin**: System administrator using the Admin Module
- **KB_Article**: Knowledge base article stored in the Knowledge Service
- **BFSI_Product**: Banking/financial product (account, savings, loan, card) from Core Banking System
- **Dynamic_Field**: Custom field added to an object type without code changes
- **Layout**: UI configuration defining how object fields are displayed
- **Workflow**: Automated business process executed by Temporal
- **Enrichment**: Process of fetching additional data from external sources
- **CTI_Adapter**: Software component that interfaces with a specific PBX vendor
- **Audit_Log**: Immutable record of system events for compliance
- **Schema**: Definition of an object type including its fields, types, and validation rules
- **Widget**: Dashboard component displaying metrics or data visualization
- **Guest_Token**: Short-lived token for embedding Superset reports
- **Progressive_Loading**: UI pattern showing local data immediately while fetching external data asynchronously


## Requirements

### Requirement 1: Knowledge Base Search and Management

**User Story:** As an agent, I want to search and access knowledge base articles with full-text search, so that I can quickly find answers to customer questions.

#### Acceptance Criteria

1. WHEN an agent types a search query in the Knowledge Base panel, THE Knowledge_Service SHALL return relevant articles ranked by relevance score within 500ms
2. THE Knowledge_Service SHALL index all KB_Articles in Elasticsearch with full-text search on title, summary, and content fields
3. WHEN an agent views a KB_Article, THE Knowledge_Service SHALL increment the view_count field
4. WHEN an agent bookmarks a KB_Article, THE Knowledge_Service SHALL persist the bookmark association with the agent's user ID
5. THE Knowledge_Service SHALL organize KB_Articles in a hierarchical folder structure with unlimited nesting depth
6. WHEN an agent creates a KB_Article, THE Knowledge_Service SHALL validate that title is not empty and content length is between 10 and 100000 characters
7. THE Knowledge_Service SHALL support article tags for categorization with a maximum of 20 tags per article
8. WHEN an agent rates a KB_Article, THE Knowledge_Service SHALL store the rating value between 1 and 5 and recalculate the average rating
9. THE Knowledge_Service SHALL return related articles based on tag similarity and content analysis
10. THE Knowledge_Service SHALL support dynamic_fields on KB_Article objects for custom metadata


### Requirement 2: BFSI Core Banking Integration

**User Story:** As an agent, I want to query customer banking products (accounts, savings, loans, cards) from the Core Banking System, so that I can provide accurate financial information during interactions.

#### Acceptance Criteria

1. WHEN an agent requests customer banking products by CIF, THE BFSI_Core_Service SHALL query the Core Banking System and return all associated products within 2 seconds
2. THE BFSI_Core_Service SHALL encrypt sensitive fields (account_number, balance, card_number) at rest using AES-256-GCM
3. THE BFSI_Core_Service SHALL mask account numbers displaying only the last 4 digits in API responses unless the agent has the `bfsi:view-full` permission
4. THE BFSI_Core_Service SHALL support 8 product categories: accounts, savings, loans, cards, digital_banking, payments, investments, merchant_services
5. WHEN the Core Banking System is unavailable, THE BFSI_Core_Service SHALL return cached data with a staleness indicator if cache age is less than 5 minutes
6. THE BFSI_Core_Service SHALL implement a circuit breaker that opens after 5 consecutive failures and remains open for 30 seconds
7. THE BFSI_Core_Service SHALL log all Core Banking System queries to the Audit Service with category `external-system-access`
8. THE BFSI_Core_Service SHALL support dynamic_fields on BFSI_Product objects for bank-specific product attributes
9. WHEN an agent queries transaction history, THE BFSI_Core_Service SHALL return paginated results with a maximum of 100 transactions per page
10. THE BFSI_Core_Service SHALL provide a mock adapter for development and testing that returns realistic sample data


### Requirement 3: AI-Powered Agent Assistance

**User Story:** As an agent, I want AI-generated response suggestions and content summarization, so that I can respond to customers faster and more accurately.

#### Acceptance Criteria

1. WHEN an agent requests a response suggestion for an interaction, THE AI_Service SHALL generate contextually relevant suggestions within 2 seconds
2. THE AI_Service SHALL analyze the interaction history, customer profile, and current message to generate suggestions
3. WHEN an agent requests summarization of an interaction, THE AI_Service SHALL produce a summary of 50-200 words highlighting key points
4. THE AI_Service SHALL support sentiment analysis returning values: positive, neutral, negative, or mixed with confidence scores
5. THE AI_Service SHALL cache AI responses in Redis with a 5-minute TTL to reduce LLM API costs
6. THE AI_Service SHALL provide ticket auto-classification suggesting category and priority based on ticket content
7. WHEN the LLM provider is unavailable, THE AI_Service SHALL return a graceful error message without blocking the agent workflow
8. THE AI_Service SHALL support configurable prompt templates stored in the database
9. THE AI_Service SHALL log all AI requests and responses to the Audit Service with category `ai-assistance`
10. THE AI_Service SHALL support multiple LLM providers (OpenAI, local LLM) through an adapter interface


### Requirement 4: Media Storage and Call Recording Streaming

**User Story:** As an agent, I want to upload files, download attachments, and stream call recordings, so that I can access media content related to customer interactions.

#### Acceptance Criteria

1. THE Media_Service SHALL reject files larger than 100MB with error code `FILE_TOO_LARGE`
2. THE Media_Service SHALL store files in SeaweedFS with S3-compatible API
3. WHEN an agent requests a file download, THE Media_Service SHALL generate a pre-signed URL valid for 5 minutes
4. THE Media_Service SHALL support call recording storage with metadata including interaction_id, duration, quality, and file_size
5. WHEN an agent requests call recording playback, THE Media_Service SHALL return a streaming pre-signed URL supporting HTTP range requests
6. THE Media_Service SHALL implement lifecycle policies moving recordings older than 90 days to cold storage
7. THE Media_Service SHALL support file types: audio (mp3, wav, ogg), video (mp4, webm), documents (pdf, docx, xlsx), images (jpg, png, gif)
8. THE Media_Service SHALL generate thumbnails for image uploads within 5 seconds
9. THE Media_Service SHALL log all file access operations to the Audit Service with category `media-access`


### Requirement 5: Immutable Audit Trail with Tamper Detection

**User Story:** As a compliance auditor, I want to query immutable audit logs with tamper detection, so that I can verify system integrity and meet regulatory requirements.

#### Acceptance Criteria

1. THE Audit_Service SHALL consume audit events from all Kafka topics and store them in an append-only PostgreSQL table
2. THE Audit_Service SHALL implement hash chaining where each audit log entry contains the hash of the previous entry
3. WHEN an audit log is created, THE Audit_Service SHALL compute event_hash as SHA-256(event_data + prev_hash)
4. THE Audit_Service SHALL enforce Row-Level Security preventing UPDATE and DELETE operations on audit_logs table
5. THE Audit_Service SHALL support audit log queries filtered by event_type, actor_id, resource_type, resource_id, and time range
6. THE Audit_Service SHALL mask PII fields in audit log responses showing only last 4 digits of sensitive identifiers
7. THE Audit_Service SHALL implement data retention policies archiving logs older than 7 years to cold storage
8. WHEN tamper detection is requested, THE Audit_Service SHALL verify the hash chain and report any broken links
9. THE Audit_Service SHALL categorize audit events as: authentication, authorization, data-access, data-modification, configuration-change, external-system-access, ai-assistance, media-access
10. THE Audit_Service SHALL support audit log export in JSON and CSV formats for regulatory reporting


### Requirement 6: Dynamic Object Schema Management

**User Story:** As a system administrator, I want to define and modify object schemas (fields, types, validation, relationships) through a visual interface, so that the CRM can be customized without code changes.

#### Acceptance Criteria

1. THE Object_Schema_Service SHALL support 22 field types: text, long_text, rich_text, number, decimal, currency, date, datetime, boolean, enum, multi_enum, email, phone, url, file, image, json, reference, multi_reference, rating, color, tag
2. WHEN an admin creates a new field, THE Object_Schema_Service SHALL validate that the field name is unique within the object type
3. THE Object_Schema_Service SHALL support field validation rules: required, min, max, minLength, maxLength, pattern, custom
4. THE Object_Schema_Service SHALL implement schema versioning incrementing the version number on each change
5. WHEN a schema is updated, THE Object_Schema_Service SHALL publish a `schema.updated` event to Kafka
6. THE Object_Schema_Service SHALL cache schemas in Redis with 5-minute TTL and invalidate cache on schema changes
7. THE Object_Schema_Service SHALL protect core fields with `isCore: true` flag preventing deletion
8. THE Object_Schema_Service SHALL support object relationships: one-to-one, one-to-many, many-to-many
9. WHEN an admin requests impact analysis, THE Object_Schema_Service SHALL identify affected layouts, workflows, and reports
10. THE Object_Schema_Service SHALL support field data sources: local, enrichment, computed, reference
11. THE Object_Schema_Service SHALL mark sensitive fields with `isSensitive: true` flag for PII masking
12. THE Object_Schema_Service SHALL provide default object types: customer, ticket, interaction, kb_article, bank_product


### Requirement 7: Dynamic Layout Configuration

**User Story:** As a system administrator, I want to design layouts for each object type and context through a drag-and-drop interface, so that I can customize how data is displayed for different use cases.

#### Acceptance Criteria

1. THE Layout_Service SHALL support 9 layout contexts: detail_full, detail_compact, create, edit, quick_edit, list_item, list_table, preview, print
2. WHEN an admin creates a layout, THE Layout_Service SHALL validate that all referenced field IDs exist in the object schema
3. THE Layout_Service SHALL support layouts with 1, 2, 3, or 4 columns
4. THE Layout_Service SHALL organize layouts into sections with configurable titles, collapsibility, and default collapsed state
5. THE Layout_Service SHALL support field widths: quarter, third, half, two-thirds, full
6. THE Layout_Service SHALL cache layout configurations in Redis with 5-minute TTL
7. THE Layout_Service SHALL support conditional visibility rules using field-operator-value expressions
8. THE Layout_Service SHALL support role-based layouts restricting layouts to specific roles
9. WHEN an agent requests a layout, THE Layout_Service SHALL return the default layout for their role and the specified context
10. THE Layout_Service SHALL support layout versioning with rollback capability
11. THE Layout_Service SHALL validate that at least one layout exists for each object type and context combination
12. THE Layout_Service SHALL support custom field renderers: default, badge, link, avatar, progress, sparkline, custom


### Requirement 8: Multi-Vendor CTI Integration

**User Story:** As an agent, I want to make and receive calls through the CRM regardless of which PBX system my organization uses, so that I have a unified call experience.

#### Acceptance Criteria

1. THE CTI_Adapter_Service SHALL support 4 PBX vendors: Cisco Webex Contact Center, Cisco PCCE (Packaged Contact Center Enterprise), FreeSwitch, and Portsip
2. THE CTI_Adapter_Service SHALL provide an abstract CTI adapter interface with methods: initialize, login, logout, setStatus, answer, hangup, hold, resume, mute, unmute, transfer, conference, sendDTMF, makeCall
3. WHEN an agent logs into the Agent Desktop, THE System SHALL load the configured CTI adapter and initialize it with the agent's extension credentials
4. WHEN a call arrives through the PBX, THE CTI_Adapter SHALL emit a `call.ringing` event with callId, callerNumber, queueId, and timestamp
5. WHEN an agent clicks Hold in the call widget, THE CTI_Adapter SHALL execute the hold operation through the vendor SDK
6. THE CTI_Adapter_Service SHALL cache active call state in Redis with agent_id as key
7. WHEN the CTI connection drops, THE CTI_Adapter SHALL attempt automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, 16s max)
8. THE CTI_Adapter_Service SHALL support warm transfer and cold transfer operations
9. THE CTI_Adapter_Service SHALL log all call control operations to the Audit Service with category `cti-operation`
10. THE CTI_Adapter_Service SHALL provide admin endpoints for CTI configuration including vendor selection, connection parameters, and extension mappings
11. THE CTI_Adapter_Service SHALL support WebSocket channel `/ws/cti/{agentId}/call` for bidirectional call state synchronization
12. THE CTI_Adapter_Service SHALL emit CTI events: call.ringing, call.connected, call.held, call.resumed, call.ended, call.transferred, call.muted, call.unmuted, agent.status.changed, error, connection.state.changed


### Requirement 9: Progressive Loading for Dynamic Fields

**User Story:** As an agent, I want to see customer information that loads progressively, showing available data immediately while fetching missing data from external systems, so that I can start working without waiting.

#### Acceptance Criteria

1. WHEN an agent opens a customer profile, THE Customer_Service SHALL return local fields immediately with response time less than 200ms
2. THE Customer_Service SHALL mark enrichment fields with status: "loading" in the initial response
3. THE Customer_Service SHALL subscribe to WebSocket channel `/ws/objects/customer/{customerId}/fields` for real-time updates
4. WHEN enrichment data arrives, THE Customer_Service SHALL push an `object.fields.updated` event via WebSocket
5. THE Frontend SHALL display skeleton placeholders with shimmer animation for fields with status "loading"
6. THE Frontend SHALL replace skeleton placeholders with actual values without page reload or layout shift
7. WHEN an enrichment source fails, THE System SHALL display an error indicator with a "Thử lại" (retry) button
8. THE System SHALL complete progressive loading within 5 seconds for all enrichment sources
9. THE Interaction_Service, Ticket_Service, Customer_Service, Knowledge_Service, and BFSI_Core_Service SHALL support dynamic_fields JSONB column
10. THE System SHALL support dynamic field rendering in forms with correct field types and validation rules from the schema


### Requirement 10: Admin Module Foundation

**User Story:** As a system administrator, I want a dedicated Admin Module with schema designer, layout designer, and user management, so that I can configure the CRM without developer assistance.

#### Acceptance Criteria

1. THE Admin_Module SHALL be a separate React SPA accessible at `/admin` route
2. THE Admin_Module SHALL require authentication with admin role or specific admin permissions
3. THE Admin_Module SHALL provide a Schema Designer with object type list, field editor, and relationship visualizer
4. THE Schema Designer SHALL support drag-and-drop field reordering within sections
5. THE Admin_Module SHALL provide a Layout Designer with drag-and-drop field placement using dnd-kit library
6. THE Layout Designer SHALL display a live preview of the layout with sample or real data
7. THE Admin_Module SHALL provide User Management with CRUD operations for users and role assignments
8. THE Admin_Module SHALL provide an Audit Viewer displaying paginated audit logs with filtering by event type, actor, resource, and time range
9. THE Admin_Module SHALL provide CTI Configuration screen for vendor selection and connection parameters
10. THE Admin_Module SHALL use the same authentication system as Agent Desktop with JWT tokens
11. THE Admin_Module SHALL implement role-based access control restricting features based on admin permissions
12. THE Admin_Module SHALL provide a navigation sidebar with sections: Dashboard, Schema Designer, Layout Designer, User Management, CTI Config, Audit Viewer


### Requirement 11: Enhanced Object Services with Dynamic Fields

**User Story:** As a developer, I want existing object services (Interaction, Ticket, Customer, Knowledge, BFSI) to support dynamic fields, so that custom fields can be added without schema migrations.

#### Acceptance Criteria

1. THE Interaction_Service SHALL add a dynamic_fields JSONB column to the interactions table
2. THE Ticket_Service SHALL add a dynamic_fields JSONB column to the tickets table
3. THE Customer_Service SHALL add a dynamic_fields JSONB column to the customers table
4. THE Knowledge_Service SHALL add a dynamic_fields JSONB column to the kb_articles table
5. THE BFSI_Core_Service SHALL add a dynamic_fields JSONB column to the bank_products table
6. WHEN an object is retrieved, THE Service SHALL merge core fields and dynamic_fields into a unified response
7. THE Services SHALL provide PATCH `/api/v1/{objectType}/{id}/fields` endpoint for updating dynamic fields
8. THE Services SHALL provide GET `/api/v1/{objectType}/{id}/fields` endpoint returning all fields with status indicators
9. THE Services SHALL validate dynamic field values against the schema definition from Object_Schema_Service
10. THE Services SHALL support WebSocket channel `/ws/objects/{objectType}/{objectId}/fields` for real-time field updates
11. THE Services SHALL cache object schemas from Object_Schema_Service in Redis with 5-minute TTL
12. WHEN a schema is updated, THE Services SHALL invalidate their schema cache and reload on next request


### Requirement 12: Parser and Serializer Requirements

**User Story:** As a developer, I want robust parsers and serializers for all data formats, so that data integrity is maintained across system boundaries.

#### Acceptance Criteria

1. THE Object_Schema_Service SHALL parse schema definition JSON into ObjectType entities
2. THE Object_Schema_Service SHALL provide a pretty printer formatting ObjectType entities back into valid JSON
3. FOR ALL valid ObjectType entities, THE System SHALL satisfy the round-trip property: parse(print(schema)) equals schema
4. THE Layout_Service SHALL parse layout configuration JSON into Layout entities
5. THE Layout_Service SHALL provide a pretty printer formatting Layout entities back into valid JSON
6. FOR ALL valid Layout entities, THE System SHALL satisfy the round-trip property: parse(print(layout)) equals layout
7. THE CTI_Adapter_Service SHALL parse CTI configuration JSON into CTIConfig entities
8. THE CTI_Adapter_Service SHALL provide a pretty printer formatting CTIConfig entities back into valid JSON
9. FOR ALL valid CTIConfig entities, THE System SHALL satisfy the round-trip property: parse(print(config)) equals config
10. WHEN parsing fails, THE System SHALL return descriptive error messages indicating the line number and nature of the error


### Requirement 13: Integration Points and Event Flows

**User Story:** As a system architect, I want well-defined integration points between Phase 2 services and existing Phase 1 services, so that the system maintains consistency and reliability.

#### Acceptance Criteria

1. WHEN a KB_Article is created or updated, THE Knowledge_Service SHALL publish a `kb.article.updated` event to Kafka
2. WHEN an AI suggestion is generated, THE AI_Service SHALL publish an `ai.suggestion.generated` event to Kafka for analytics
3. WHEN a file is uploaded, THE Media_Service SHALL publish a `media.file.uploaded` event to Kafka
4. WHEN an audit log is created, THE Audit_Service SHALL consume events from all Kafka topics: agent-events, interaction-events, ticket-events, customer-events, notification-events, kb-events, ai-events, media-events, schema-events, layout-events, cti-events
5. WHEN a schema is updated, THE Object_Schema_Service SHALL publish a `schema.updated` event causing all object services to invalidate their schema cache
6. WHEN a layout is updated, THE Layout_Service SHALL publish a `layout.updated` event to Kafka
7. THE CTI_Adapter_Service SHALL publish `cti.call.incoming`, `cti.call.ended`, `cti.agent.status.changed` events to Kafka
8. THE Interaction_Service SHALL consume `cti.call.incoming` events to create new call interactions
9. THE Agent_Service SHALL consume `cti.agent.status.changed` events to sync agent status with PBX state
10. THE Customer_Service SHALL call Data_Enrichment_Service via internal mTLS for progressive loading
11. THE BFSI_Core_Service SHALL implement circuit breaker pattern for Core Banking System calls with 5 failure threshold and 30 second timeout
12. THE AI_Service SHALL implement retry logic with exponential backoff for LLM provider calls: 1s, 2s, 4s, 8s, 16s max


### Requirement 14: Security and Compliance for Phase 2 Services

**User Story:** As a security officer, I want Phase 2 services to meet BFSI security standards, so that the platform maintains regulatory compliance.

#### Acceptance Criteria

1. THE BFSI_Core_Service SHALL encrypt account_number, balance, and card_number fields at rest using AES-256-GCM
2. THE Audit_Service SHALL implement Row-Level Security preventing any UPDATE or DELETE operations on audit_logs table
3. THE Object_Schema_Service SHALL log all schema modifications to the Audit Service with category `configuration-change` and sensitivity `high`
4. THE CTI_Adapter_Service SHALL store CTI credentials in HashiCorp Vault, never in the database
5. THE AI_Service SHALL not log customer PII in AI request/response logs, only interaction IDs
6. THE Knowledge_Service SHALL support role-based access control restricting article visibility by department
7. THE Layout_Service SHALL validate that admins cannot create layouts exposing fields the role lacks permission to view
8. THE Media_Service SHALL generate pre-signed URLs with 5-minute expiration and single-use tokens
9. THE System SHALL enforce mTLS for all inter-service communication in Phase 2 services
10. THE System SHALL implement rate limiting on all Phase 2 API endpoints: 100 req/min default, 30 req/min for admin endpoints, 10 req/min for sensitive operations
11. THE System SHALL validate JWT tokens on every request to Phase 2 services with RS256 signature verification


### Requirement 15: Performance and Scalability

**User Story:** As a platform engineer, I want Phase 2 services to meet performance targets under load, so that the system remains responsive for all users.

#### Acceptance Criteria

1. THE Knowledge_Service SHALL return search results with P99 latency less than 500ms at 100 concurrent users
2. THE AI_Service SHALL generate response suggestions with P99 latency less than 2 seconds at 50 concurrent requests
3. THE Media_Service SHALL generate pre-signed URLs with P99 latency less than 100ms
4. THE Object_Schema_Service SHALL return cached schemas with P99 latency less than 50ms
5. THE Layout_Service SHALL return cached layouts with P99 latency less than 50ms
6. THE Audit_Service SHALL ingest audit events from Kafka with throughput of at least 1000 events per second
7. THE CTI_Adapter_Service SHALL process call events with P99 latency less than 200ms
8. THE BFSI_Core_Service SHALL cache Core Banking responses in Redis for 5 minutes reducing external API calls by 80%
9. THE System SHALL support 500 concurrent agents in Phase 2 with P99 API response time less than 1 second
10. THE Elasticsearch cluster SHALL handle 100 concurrent search queries with P99 latency less than 500ms
11. THE Redis cache SHALL maintain 99.9% hit rate for schema and layout queries
12. THE System SHALL complete progressive loading for all enrichment fields within 5 seconds


### Requirement 16: Testing and Quality Assurance

**User Story:** As a QA engineer, I want comprehensive test coverage for Phase 2 services, so that we can confidently deploy to production.

#### Acceptance Criteria

1. THE System SHALL achieve unit test coverage of at least 70% for all Phase 2 services
2. THE System SHALL include integration tests for all API endpoints in Phase 2 services
3. THE System SHALL include round-trip property tests for all parsers: schema parser, layout parser, CTI config parser
4. THE System SHALL include property tests verifying that schema versioning maintains backward compatibility
5. THE System SHALL include property tests verifying that audit log hash chains remain unbroken
6. THE System SHALL include integration tests for Elasticsearch indexing and search in Knowledge_Service
7. THE System SHALL include integration tests for SeaweedFS file upload and download in Media_Service
8. THE System SHALL include integration tests for Redis caching in Object_Schema_Service and Layout_Service
9. THE System SHALL include E2E tests for the complete progressive loading flow
10. THE System SHALL include E2E tests for the Admin Module schema designer and layout designer
11. THE System SHALL include load tests demonstrating 500 concurrent users with acceptable performance
12. THE System SHALL include security tests scanning for OWASP Top 10 vulnerabilities with zero critical findings


### Requirement 17: Database Schemas for Phase 2 Services

**User Story:** As a database administrator, I want well-designed database schemas for Phase 2 services, so that data integrity and performance are maintained.

#### Acceptance Criteria

1. THE Knowledge_Service SHALL create knowledge_db with tables: kb_articles, kb_folders, kb_bookmarks, kb_ratings
2. THE BFSI_Core_Service SHALL create bfsi_db with tables: bank_products, product_transactions, core_banking_cache
3. THE AI_Service SHALL create ai_db with tables: ai_requests, ai_responses, prompt_templates, ai_cache
4. THE Media_Service SHALL create media_db with tables: media_files, file_metadata, recording_metadata
5. THE Audit_Service SHALL create audit_db with table: audit_logs (append-only with fillfactor=100)
6. THE Object_Schema_Service SHALL create object_schema_db with tables: object_types, field_definitions, object_relationships, schema_versions, field_validation_rules
7. THE Layout_Service SHALL create layout_db with tables: layouts, layout_sections, layout_fields, layout_versions
8. THE CTI_Adapter_Service SHALL create cti_db with tables: cti_configs, cti_vendors, call_states, cti_events
9. THE System SHALL create appropriate indexes on all foreign keys and frequently queried columns
10. THE System SHALL implement database migrations using TypeORM for all Phase 2 services
11. THE Audit_Service SHALL implement Row-Level Security policies preventing modifications to audit_logs
12. THE System SHALL use JSONB columns for dynamic_fields in interaction, ticket, customer, kb_article, and bank_product tables


### Requirement 18: Frontend Integration for Phase 2 Features

**User Story:** As a frontend developer, I want clear integration points for Phase 2 features in the Agent Desktop and Admin Module, so that I can build the UI efficiently.

#### Acceptance Criteria

1. THE Agent_Desktop SHALL integrate Knowledge Base search panel calling GET /api/v1/kb/articles with Elasticsearch full-text search
2. THE Agent_Desktop SHALL integrate BFSI product query panel calling GET /api/v1/bfsi/customers/{cif}/accounts and related endpoints
3. THE Agent_Desktop SHALL integrate AI Assistant panel calling POST /api/v1/ai/suggest and POST /api/v1/ai/summarize
4. THE Agent_Desktop SHALL integrate call recording player calling GET /api/v1/media/recordings/{id}/stream
5. THE Agent_Desktop SHALL integrate CTI call widget using CTIProvider and CTIAdapter interface
6. THE Agent_Desktop SHALL integrate progressive loading with skeleton placeholders for enrichment fields
7. THE Agent_Desktop SHALL integrate dynamic form rendering using SchemaFieldRenderer and LayoutEngine components
8. THE Admin_Module SHALL integrate Schema Designer with drag-and-drop field management
9. THE Admin_Module SHALL integrate Layout Designer with drag-and-drop field placement using dnd-kit
10. THE Admin_Module SHALL integrate User Management with CRUD operations for users and roles
11. THE Admin_Module SHALL integrate Audit Viewer with paginated audit log display and filtering
12. THE Admin_Module SHALL integrate CTI Configuration screen for vendor selection and connection parameters
13. THE System SHALL use TanStack Query for all API calls with appropriate cache invalidation strategies
14. THE System SHALL use WebSocket connections for real-time updates: schema changes, layout changes, field enrichment, CTI events


### Requirement 19: API Gateway Configuration for Phase 2

**User Story:** As a DevOps engineer, I want Kong API Gateway configured for Phase 2 services, so that routing, rate limiting, and security are properly enforced.

#### Acceptance Criteria

1. THE Kong_Gateway SHALL route /api/v1/kb/* requests to Knowledge_Service on port 3007
2. THE Kong_Gateway SHALL route /api/v1/bfsi/* requests to BFSI_Core_Service on port 3008
3. THE Kong_Gateway SHALL route /api/v1/ai/* requests to AI_Service on port 3009
4. THE Kong_Gateway SHALL route /api/v1/media/* requests to Media_Service on port 3010
5. THE Kong_Gateway SHALL route /api/v1/audit/* requests to Audit_Service on port 3011
6. THE Kong_Gateway SHALL route /api/v1/schemas/* and /api/v1/admin/object-types/* requests to Object_Schema_Service on port 3013
7. THE Kong_Gateway SHALL route /api/v1/layouts/* and /api/v1/admin/layouts/* requests to Layout_Service on port 3014
8. THE Kong_Gateway SHALL route /api/v1/cti/* and /api/v1/admin/cti/* requests to CTI_Adapter_Service on port 3019
9. THE Kong_Gateway SHALL enforce rate limiting: 100 req/min for standard endpoints, 30 req/min for admin endpoints, 10 req/min for AI endpoints
10. THE Kong_Gateway SHALL validate JWT tokens on all requests except health check endpoints
11. THE Kong_Gateway SHALL add X-Request-Id header for distributed tracing across all Phase 2 services
12. THE Kong_Gateway SHALL configure CORS allowing requests from https://agent.tpb.vn and https://admin.tpb.vn


### Requirement 20: Phase 2 Exit Criteria and Go-Live 2

**User Story:** As a project manager, I want clear exit criteria for Phase 2, so that we can confidently proceed to Go-Live 2.

#### Acceptance Criteria

1. THE System SHALL have all 8 Phase 2 services operational: MS-7, MS-8, MS-9, MS-10, MS-11, MS-13, MS-14, MS-19
2. THE System SHALL have Elasticsearch full-text search working for Knowledge Base with response time less than 500ms
3. THE System SHALL have BFSI product queries working with mock Core Banking adapter returning realistic data
4. THE System SHALL have call recording streaming operational with SeaweedFS
5. THE System SHALL have AI suggestions working in interaction panel with response time less than 2 seconds
6. THE System SHALL have CTI call widget connected to Asterisk adapter with basic call controls working
7. THE System SHALL demonstrate dynamic fields: admin adds field to Ticket schema, agent sees new field in less than 5 seconds
8. THE System SHALL have Admin Module operational with Schema Designer, Layout Designer, User Management, and Audit Viewer
9. THE System SHALL have audit logs for all mutating operations across all services
10. THE System SHALL have PII fields encrypted at rest: phone, email, CIF, account_number, balance, card_number
11. THE System SHALL achieve unit test coverage of at least 70% for all Phase 2 services
12. THE System SHALL pass load testing with 500 concurrent users and P99 response time less than 1 second
13. THE System SHALL have zero critical security vulnerabilities in OWASP ZAP scan
14. THE System SHALL have all Phase 2 services integrated with Kong API Gateway with proper routing and rate limiting
15. THE System SHALL have all Phase 2 database schemas implemented with appropriate indexes and constraints
16. THE System SHALL have progressive loading working: local data displays immediately, enrichment completes within 5 seconds
17. THE System SHALL have all Phase 2 services publishing events to Kafka and Audit Service consuming them
18. THE System SHALL have Redis caching working for schemas and layouts with 5-minute TTL and cache invalidation on updates

