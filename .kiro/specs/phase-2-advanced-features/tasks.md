# Implementation Plan: Phase 2 Advanced Features

## Overview

Phase 2 extends the TPB CRM Platform with 8 new microservices over 6 sprints (12 weeks). This phase transforms the system from a core MVP into a feature-rich enterprise CRM with knowledge management, BFSI integration, AI assistance, media handling, comprehensive audit trails, dynamic object schemas, flexible layouts, and multi-vendor CTI integration.

**Phase 1 Foundation (Complete):**
- 6 operational services: Identity (MS-1), Agent (MS-2), Interaction (MS-3), Customer (MS-5), Ticket (MS-4), Notification (MS-6)
- 112/112 tests passing, all database schemas implemented
- Kong API Gateway configured with rate limiting and CORS

**Phase 2 Services:**
- MS-7: Knowledge Service (Elasticsearch full-text search)
- MS-8: BFSI Core Banking Service (circuit breaker, field-level encryption)
- MS-9: AI Service (LLM adapters, Redis caching)
- MS-10: Media Service (SeaweedFS, call recording streaming)
- MS-11: Audit Service (immutable logs, hash chaining)
- MS-13: Object Schema Service (22 field types, versioning)
- MS-14: Layout Service (9 contexts, conditional visibility)
- MS-19: CTI Adapter Service (4 vendors: Cisco Webex, Cisco PCCE, FreeSwitch, Portsip)

**Technology Stack:**
- Backend: NestJS, TypeScript, PostgreSQL 18, TypeORM
- Search: Elasticsearch 9.3.0
- Cache: Redis 8.6
- Storage: SeaweedFS (S3-compatible)
- Events: Kafka 4.2.0
- Frontend: React 19.2.x, TanStack Query, shadcn/ui, dnd-kit

## Tasks


### Sprint 7: Knowledge Base & BFSI Core (MS-7, MS-8) - Weeks 13-14

- [ ] 7.1 MS-7: Knowledge Service - Database and Entities
  - [ ] 7.1.1 Create TypeORM migrations for knowledge_db
    - Create kb_articles table with JSONB dynamic_fields column
    - Create kb_folders table with hierarchical parent_id reference
    - Create kb_bookmarks table with user_id and article_id
    - Create kb_ratings table with rating constraint [1, 5]
    - Add indexes: tenant, folder, category, tags (GIN), created_at
    - Add content length constraint CHECK (char_length(content) BETWEEN 10 AND 100000)
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 1.10_
  
  - [ ] 7.1.2 Implement KBArticle, KBFolder, KBBookmark, KBRating entities
    - Define entity classes with TypeORM decorators
    - Implement relationships: article → folder, bookmark → article, rating → article
    - Add validation decorators for title, content, rating
    - _Requirements: 1.1, 1.3, 1.4, 1.8_
  
  - [ ]* 7.1.3 Write unit tests for Knowledge entities
    - Test entity creation with valid data
    - Test validation constraints (content length, rating range)
    - Test relationships (folder hierarchy, bookmarks, ratings)
    - Target: 3 entity tests passing
    - _Requirements: 1.6, 1.8_

- [ ] 7.2 MS-7: Knowledge Service - Elasticsearch Integration
  - [ ] 7.2.1 Implement ElasticsearchService for article indexing
    - Create index mapping with text analyzers for title, summary, content
    - Implement indexArticle() method called on article creation/update
    - Implement deleteFromIndex() method called on article deletion
    - Configure standard analyzer for full-text search
    - _Requirements: 1.2_
  
  - [ ] 7.2.2 Implement article search with relevance scoring
    - Implement searchArticles() with multi_match query
    - Apply field boosting: title^3, summary^2, content^1
    - Support filters: tags, category, folderId
    - Return results with relevance score and query time
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 7.2.3 Write integration tests for Elasticsearch
    - Test article indexing on creation
    - Test search returns relevant results
    - Test search with filters (tags, category)
    - Test search performance (< 500ms P99)
    - Target: 4 integration tests passing
    - _Requirements: 1.1, 1.2_

- [ ] 7.3 MS-7: Knowledge Service - API Endpoints
  - [ ] 7.3.1 Implement GET /api/v1/kb/articles (search)
    - Accept query, tags, category, folderId, limit, offset parameters
    - Call ElasticsearchService.searchArticles()
    - Return articles with total count and query time
    - _Requirements: 1.1_
  
  - [ ] 7.3.2 Implement GET /api/v1/kb/articles/:id (detail)
    - Fetch article by ID from PostgreSQL
    - Increment view_count field
    - Return article with all fields including dynamic_fields
    - _Requirements: 1.3, 1.10_
  
  - [ ] 7.3.3 Implement POST /api/v1/kb/articles (create)
    - Validate title not empty, content length [10, 100000]
    - Validate tags count ≤ 20
    - Save to PostgreSQL and index in Elasticsearch
    - Publish kb.article.updated event to Kafka
    - _Requirements: 1.6, 1.7_
  
  - [ ] 7.3.4 Implement bookmark and rating endpoints
    - POST /api/v1/kb/bookmarks - create bookmark
    - DELETE /api/v1/kb/bookmarks/:id - remove bookmark
    - GET /api/v1/kb/bookmarks - list user bookmarks
    - POST /api/v1/kb/articles/:id/rate - submit rating [1, 5]
    - Recalculate average rating on new rating submission
    - _Requirements: 1.4, 1.8_
  
  - [ ] 7.3.5 Implement GET /api/v1/kb/articles/:id/related
    - Find articles sharing tags with current article
    - Order by number of shared tags descending
    - Return top 10 related articles
    - _Requirements: 1.9_
  
  - [ ]* 7.3.6 Write unit tests for KnowledgeService
    - Test article creation with validation
    - Test view count increment
    - Test bookmark persistence
    - Test rating validation and average calculation
    - Test related articles by tag similarity
    - Target: 8 service tests passing
    - _Requirements: 1.3, 1.4, 1.6, 1.8, 1.9_


- [ ]* 7.4 MS-7: Knowledge Service - Property-Based Tests
  - **Property 1: Article Search Returns Relevant Results**
  - For any search query and article collection, all returned articles should contain the search term
  - **Validates: Requirements 1.1, 1.2**
  - **Property 2: View Count Increment**
  - For any KB article, viewing should increment view_count by exactly 1
  - **Validates: Requirements 1.3**
  - **Property 3: Bookmark Persistence**
  - For any agent and article, after bookmarking, querying bookmarks should include that article
  - **Validates: Requirements 1.4**
  - **Property 6: Rating Validation and Calculation**
  - For any article rating, reject ratings outside [1, 5], average should equal sum/count
  - **Validates: Requirements 1.8**
  - Target: 4 property tests passing, 100 iterations each
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8_

- [ ] 7.5 MS-7: Knowledge Service - Kong Configuration
  - Configure Kong route /api/v1/kb/* → knowledge-service:3007
  - Apply rate limiting: 100 req/min for standard endpoints
  - Enable JWT validation on all endpoints except /health
  - Add CORS configuration for agent.tpb.vn
  - _Requirements: 19.1, 19.9, 19.10_

- [ ] 7.6 MS-8: BFSI Core Banking Service - Database and Entities
  - [ ] 7.6.1 Create TypeORM migrations for bfsi_db
    - Create bank_products table with encrypted fields (account_number, balance)
    - Create product_transactions table with foreign key to bank_products
    - Create core_banking_cache table with cache_key, data, expires_at
    - Add indexes: tenant, customer, type, status, transaction_date
    - Add type constraint CHECK for 8 product categories
    - _Requirements: 2.4, 2.8, 17.3_
  
  - [ ] 7.6.2 Implement BankProduct, ProductTransaction, CoreBankingCache entities
    - Define entity classes with TypeORM decorators
    - Add validation for product type and status
    - Implement relationships: product → transactions
    - Add dynamic_fields JSONB column for bank-specific attributes
    - _Requirements: 2.4, 2.8_
  
  - [ ]* 7.6.3 Write unit tests for BFSI entities
    - Test entity creation with valid data
    - Test product type validation
    - Test relationships (product → transactions)
    - Target: 2 entity tests passing
    - _Requirements: 2.4_

- [ ] 7.7 MS-8: BFSI Core Banking Service - Encryption and Security
  - [ ] 7.7.1 Implement EncryptionService with AES-256-GCM
    - Implement encrypt() method with IV and auth tag
    - Implement decrypt() method with tag verification
    - Load encryption key from environment variable
    - Use crypto.randomBytes(16) for IV generation
    - _Requirements: 2.2, 14.1_
  
  - [ ] 7.7.2 Implement field-level encryption for sensitive data
    - Encrypt account_number before saving to database
    - Encrypt balance before saving to database
    - Encrypt card_number before saving to database
    - Decrypt fields when reading from database
    - _Requirements: 2.2, 14.1_
  
  - [ ] 7.7.3 Implement account number masking
    - Check agent permissions for bfsi:view-full
    - If no permission, mask all but last 4 digits with asterisks
    - Return full account number only for authorized agents
    - _Requirements: 2.3_
  
  - [ ]* 7.7.4 Write unit tests for encryption and masking
    - Test encryption round-trip (encrypt then decrypt equals original)
    - Test account number masking for users without permission
    - Test full account number display for authorized users
    - Target: 3 security tests passing
    - _Requirements: 2.2, 2.3_

- [ ] 7.8 MS-8: BFSI Core Banking Service - Circuit Breaker Pattern
  - [ ] 7.8.1 Implement CircuitBreaker class
    - Track failure count and last failure time
    - Implement three states: closed, open, half-open
    - Open circuit after 5 consecutive failures
    - Keep circuit open for 30 seconds
    - Transition to half-open after reset timeout
    - _Requirements: 2.6, 13.11_
  
  - [ ] 7.8.2 Implement CoreBankingAdapter interface
    - Define abstract interface with queryProducts(), queryTransactions() methods
    - Implement MockCoreBankingAdapter for development/testing
    - Return realistic sample data from mock adapter
    - _Requirements: 2.10_
  
  - [ ] 7.8.3 Integrate circuit breaker with BFSI service
    - Wrap all Core Banking System calls with circuit breaker
    - Implement timeout protection (2 seconds)
    - On circuit open, attempt cache fallback
    - Return cached data with _cached flag and _cacheAge
    - _Requirements: 2.5, 2.6_
  
  - [ ]* 7.8.4 Write unit tests for circuit breaker
    - Test circuit opens after 5 consecutive failures
    - Test circuit remains open for 30 seconds
    - Test cached data fallback when CBS unavailable
    - Test circuit transitions to half-open after timeout
    - Target: 4 circuit breaker tests passing
    - _Requirements: 2.5, 2.6_

- [ ] 7.9 MS-8: BFSI Core Banking Service - API Endpoints
  - [ ] 7.9.1 Implement GET /api/v1/bfsi/customers/:cif/accounts
    - Query Core Banking System via circuit breaker
    - Filter products by type 'account'
    - Apply field-level decryption
    - Apply account number masking based on permissions
    - Cache results in Redis for 5 minutes
    - _Requirements: 2.1, 2.3, 2.8_
  
  - [ ] 7.9.2 Implement product query endpoints
    - GET /api/v1/bfsi/customers/:cif/savings
    - GET /api/v1/bfsi/customers/:cif/loans
    - GET /api/v1/bfsi/customers/:cif/cards
    - Each endpoint filters by product type
    - _Requirements: 2.4_
  
  - [ ] 7.9.3 Implement GET /api/v1/bfsi/customers/:cif/transactions
    - Accept accountNumber, startDate, endDate, limit, offset parameters
    - Query transactions with pagination (max 100 per page)
    - Return transactions with hasMore flag
    - _Requirements: 2.9_
  
  - [ ] 7.9.4 Implement audit logging for all CBS queries
    - Publish audit event to Kafka for every CBS query
    - Set category to 'external-system-access'
    - Include CIF, query type, timestamp
    - Do not log sensitive data (account numbers, balances)
    - _Requirements: 2.7, 14.5_
  
  - [ ]* 7.9.5 Write unit tests for BFSIService
    - Test product query completeness
    - Test circuit breaker integration
    - Test cached data fallback
    - Test audit logging for external queries
    - Test transaction pagination limit (max 100)
    - Target: 6 service tests passing
    - _Requirements: 2.1, 2.5, 2.6, 2.7, 2.9_

- [ ]* 7.10 MS-8: BFSI Core Banking Service - Property-Based Tests
  - **Property 9: Field-Level Encryption Round Trip**
  - For any sensitive field value, encrypt then decrypt should produce original
  - **Validates: Requirements 2.2**
  - **Property 10: Account Number Masking**
  - For any account number without permission, display only last 4 digits
  - **Validates: Requirements 2.3**
  - **Property 11: Circuit Breaker Opens After Failures**
  - For any sequence of 5 failures, circuit should open and remain open 30s
  - **Validates: Requirements 2.6**
  - **Property 14: Transaction Pagination Limit**
  - For any transaction query, each page should contain at most 100 transactions
  - **Validates: Requirements 2.9**
  - Target: 4 property tests passing, 100 iterations each
  - _Requirements: 2.2, 2.3, 2.6, 2.9_

- [ ] 7.11 MS-8: BFSI Core Banking Service - Kong Configuration
  - Configure Kong route /api/v1/bfsi/* → bfsi-core-service:3008
  - Apply rate limiting: 100 req/min for standard endpoints
  - Enable JWT validation on all endpoints
  - Add request timeout: 2 seconds
  - _Requirements: 19.2, 19.9_

- [ ] 7.12 Checkpoint - Sprint 7 Verification
  - Verify Elasticsearch cluster running and accessible
  - Verify Knowledge Service can index and search articles
  - Verify BFSI Service circuit breaker opens after 5 failures
  - Verify field-level encryption working for account numbers
  - Run all Sprint 7 tests: expect 30+ tests passing
  - Verify Kong routes for MS-7 and MS-8 configured
  - Ensure all tests pass, ask the user if questions arise



### Sprint 8: AI & Media Services (MS-9, MS-10) - Weeks 15-16

- [ ] 8.1 MS-9: AI Service - Database and Entities
  - [ ] 8.1.1 Create TypeORM migrations for ai_db
    - Create ai_requests table with request_type constraint
    - Create ai_responses table with foreign key to ai_requests
    - Create prompt_templates table with template and variables JSONB
    - Create ai_cache table with cache_key, expires_at
    - Add indexes: tenant, agent, type, created_at, cache_key
    - _Requirements: 3.8, 17.3_
  
  - [ ] 8.1.2 Implement AIRequest, AIResponse, PromptTemplate, AICache entities
    - Define entity classes with TypeORM decorators
    - Add validation for request_type (suggest, summarize, sentiment, classify, generate)
    - Implement relationships: request → response
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.8_
  
  - [ ]* 8.1.3 Write unit tests for AI entities
    - Test entity creation with valid data
    - Test request type validation
    - Test relationships (request → response)
    - Target: 2 entity tests passing
    - _Requirements: 3.1_

- [ ] 8.2 MS-9: AI Service - LLM Adapter Interface
  - [ ] 8.2.1 Define LLMAdapter interface
    - Define generateCompletion() method with prompt and options
    - Define generateEmbedding() method for vector generation
    - Define isAvailable() method for health check
    - _Requirements: 3.10_
  
  - [ ] 8.2.2 Implement OpenAIAdapter
    - Integrate OpenAI API client
    - Implement generateCompletion() using chat.completions.create()
    - Configure model, temperature, max_tokens from options
    - Handle API errors gracefully
    - _Requirements: 3.10_
  
  - [ ] 8.2.3 Implement LocalLLMAdapter
    - Integrate local LLM endpoint (placeholder for future)
    - Implement same interface as OpenAIAdapter
    - Return mock responses for development
    - _Requirements: 3.10_
  
  - [ ]* 8.2.4 Write unit tests for LLM adapters
    - Test OpenAI adapter completion generation
    - Test error handling when LLM unavailable
    - Test adapter interface compliance
    - Target: 3 adapter tests passing
    - _Requirements: 3.7, 3.10_

- [ ] 8.3 MS-9: AI Service - Redis Caching Strategy
  - [ ] 8.3.1 Implement cache key generation
    - Generate hash from request parameters (interaction context, tone, etc.)
    - Use SHA-256 for consistent cache keys
    - Prefix keys with request type: ai:suggest:, ai:summarize:, etc.
    - _Requirements: 3.5_
  
  - [ ] 8.3.2 Implement cache-first request flow
    - Check Redis cache before calling LLM
    - Return cached response with cached: true flag
    - On cache miss, call LLM and cache result
    - Set TTL to 5 minutes (300 seconds)
    - _Requirements: 3.5_
  
  - [ ]* 8.3.3 Write unit tests for caching
    - Test cache hit returns cached response
    - Test cache miss calls LLM and caches result
    - Test cache TTL is 5 minutes
    - Target: 3 caching tests passing
    - _Requirements: 3.5_

- [ ] 8.4 MS-9: AI Service - API Endpoints
  - [ ] 8.4.1 Implement POST /api/v1/ai/suggest
    - Accept interactionId, context (customerMessage, history, profile), tone
    - Build prompt from template with context variables
    - Call LLM adapter with cache-first strategy
    - Return suggestions array with confidence score
    - Response time target: < 2 seconds
    - _Requirements: 3.1, 3.2_
  
  - [ ] 8.4.2 Implement POST /api/v1/ai/summarize
    - Accept interactionId, content, maxWords (default 200)
    - Generate summary of 50-200 words
    - Extract key points from summary
    - Return summary with word count
    - _Requirements: 3.3_
  
  - [ ] 8.4.3 Implement POST /api/v1/ai/sentiment
    - Accept text for sentiment analysis
    - Return sentiment: positive, neutral, negative, or mixed
    - Return confidence score and detailed scores for each sentiment
    - _Requirements: 3.4_
  
  - [ ] 8.4.4 Implement POST /api/v1/ai/classify
    - Accept ticketTitle and ticketDescription
    - Suggest category and priority (low, medium, high, urgent)
    - Return confidence score
    - _Requirements: 3.6_
  
  - [ ] 8.4.5 Implement audit logging for AI requests
    - Publish ai.suggestion.generated event to Kafka
    - Set category to 'ai-assistance'
    - Log request ID and type, NOT customer PII
    - _Requirements: 3.9, 14.5_
  
  - [ ]* 8.4.6 Write unit tests for AIService
    - Test suggestion generation with caching
    - Test summary word count constraint (50-200 words)
    - Test sentiment classification returns valid values
    - Test graceful LLM failure handling
    - Test audit logging without PII
    - Target: 7 service tests passing
    - _Requirements: 3.1, 3.3, 3.4, 3.7, 3.9_

- [ ]* 8.5 MS-9: AI Service - Property-Based Tests
  - **Property 15: AI Response Caching**
  - For any AI request, identical request within 5 minutes should return cached response
  - **Validates: Requirements 3.5**
  - **Property 16: Summary Word Count Constraint**
  - For any summarization request, summary should contain 50-200 words
  - **Validates: Requirements 3.3**
  - **Property 17: Sentiment Classification**
  - For any sentiment request, response should be positive, neutral, negative, or mixed
  - **Validates: Requirements 3.4**
  - **Property 18: Graceful LLM Failure**
  - For any AI request when LLM unavailable, return error without blocking workflow
  - **Validates: Requirements 3.7**
  - Target: 4 property tests passing, 100 iterations each
  - _Requirements: 3.3, 3.4, 3.5, 3.7_

- [ ] 8.6 MS-9: AI Service - Kong Configuration
  - Configure Kong route /api/v1/ai/* → ai-service:3009
  - Apply rate limiting: 10 req/min for AI endpoints (lower due to cost)
  - Enable JWT validation on all endpoints
  - Add request timeout: 3 seconds
  - _Requirements: 19.3, 19.9_

- [ ] 8.7 MS-10: Media Service - Database and Entities
  - [ ] 8.7.1 Create TypeORM migrations for media_db
    - Create media_files table with file_type constraint
    - Create file_metadata table with width, height, duration, thumbnail_key
    - Create recording_metadata table with quality constraint
    - Add indexes: tenant, interaction, ticket, type, created_at
    - _Requirements: 4.4, 4.7, 17.4_
  
  - [ ] 8.7.2 Implement MediaFile, FileMetadata, RecordingMetadata entities
    - Define entity classes with TypeORM decorators
    - Add validation for file_type (audio, video, document, image)
    - Add validation for recording quality (low, medium, high)
    - Implement relationships: file → metadata, file → recording
    - _Requirements: 4.4, 4.7_
  
  - [ ]* 8.7.3 Write unit tests for Media entities
    - Test entity creation with valid data
    - Test file type validation
    - Test relationships (file → metadata)
    - Target: 2 entity tests passing
    - _Requirements: 4.7_

- [ ] 8.8 MS-10: Media Service - SeaweedFS Integration
  - [ ] 8.8.1 Implement SeaweedFSService with S3 client
    - Initialize S3Client with SeaweedFS endpoint
    - Configure bucket name from environment variable
    - Implement uploadFile() using PutObjectCommand
    - Implement getPresignedUrl() with 5-minute expiration
    - Implement getStreamingUrl() with range request support
    - _Requirements: 4.2, 4.3, 4.5_
  
  - [ ] 8.8.2 Implement file upload with validation
    - Validate file size ≤ 100MB, reject with FILE_TOO_LARGE error
    - Validate file type against allowed types
    - Generate unique storage key (UUID + extension)
    - Upload to SeaweedFS and save metadata to PostgreSQL
    - _Requirements: 4.1, 4.7_
  
  - [ ] 8.8.3 Implement ThumbnailService for image processing
    - Use sharp library for image resizing
    - Generate 200x200 thumbnail with fit: 'inside'
    - Save thumbnail to SeaweedFS with -thumb suffix
    - Complete thumbnail generation within 5 seconds
    - _Requirements: 4.8_
  
  - [ ]* 8.8.4 Write integration tests for SeaweedFS
    - Test file upload to SeaweedFS
    - Test pre-signed URL generation
    - Test streaming URL with range requests
    - Test thumbnail generation for images
    - Target: 4 integration tests passing
    - _Requirements: 4.2, 4.3, 4.5, 4.8_

- [ ] 8.9 MS-10: Media Service - API Endpoints
  - [ ] 8.9.1 Implement POST /api/v1/media/upload
    - Accept multipart/form-data file upload
    - Validate file size and type
    - Upload to SeaweedFS
    - Generate thumbnail for images
    - Save metadata to PostgreSQL
    - Return fileId, url, thumbnailUrl
    - _Requirements: 4.1, 4.7, 4.8_
  
  - [ ] 8.9.2 Implement GET /api/v1/media/:id/url
    - Fetch file metadata from PostgreSQL
    - Generate pre-signed URL with 5-minute expiration
    - Return URL with expiration timestamp
    - _Requirements: 4.3_
  
  - [ ] 8.9.3 Implement call recording endpoints
    - GET /api/v1/media/recordings/:interactionId - list recordings
    - GET /api/v1/media/recordings/:id/stream - get streaming URL
    - Return recording metadata: duration, quality, format, fileSize
    - Support HTTP range requests for streaming
    - _Requirements: 4.4, 4.5_
  
  - [ ] 8.9.4 Implement audit logging for media access
    - Publish media.file.uploaded event to Kafka
    - Log all file access operations (upload, download, delete)
    - Set category to 'media-access'
    - _Requirements: 4.9_
  
  - [ ]* 8.9.5 Write unit tests for MediaService
    - Test file size validation (reject > 100MB)
    - Test pre-signed URL expiration (5 minutes)
    - Test recording metadata completeness
    - Test thumbnail generation
    - Test media access audit logging
    - Target: 6 service tests passing
    - _Requirements: 4.1, 4.3, 4.4, 4.8, 4.9_

- [ ]* 8.10 MS-10: Media Service - Property-Based Tests
  - **Property 20: File Size Validation**
  - For any file > 100MB, upload should be rejected with FILE_TOO_LARGE
  - **Validates: Requirements 4.1**
  - **Property 21: Pre-Signed URL Expiration**
  - For any file download, pre-signed URL should expire after exactly 5 minutes
  - **Validates: Requirements 4.3**
  - **Property 22: Recording Metadata Completeness**
  - For any call recording, metadata should include interaction_id, duration, quality, file_size
  - **Validates: Requirements 4.4**
  - **Property 23: Thumbnail Generation**
  - For any image upload, thumbnail should be generated within 5 seconds
  - **Validates: Requirements 4.8**
  - Target: 4 property tests passing, 100 iterations each
  - _Requirements: 4.1, 4.3, 4.4, 4.8_

- [ ] 8.11 MS-10: Media Service - Kong Configuration
  - Configure Kong route /api/v1/media/* → media-service:3010
  - Apply rate limiting: 100 req/min for standard endpoints
  - Enable JWT validation on all endpoints
  - Increase request body size limit to 100MB for uploads
  - _Requirements: 19.4, 19.9_

- [ ] 8.12 Checkpoint - Sprint 8 Verification
  - Verify AI Service can generate suggestions with OpenAI adapter
  - Verify AI responses are cached in Redis for 5 minutes
  - Verify Media Service can upload files to SeaweedFS
  - Verify thumbnail generation works for images
  - Verify call recording streaming with range requests
  - Run all Sprint 8 tests: expect 35+ tests passing
  - Verify Kong routes for MS-9 and MS-10 configured
  - Ensure all tests pass, ask the user if questions arise



### Sprint 9: Audit & CTI Adapter (MS-11, MS-19) - Weeks 17-18

- [ ] 9.1 MS-11: Audit Service - Database and Immutable Schema
  - [ ] 9.1.1 Create TypeORM migrations for audit_db
    - Create audit_logs table with fillfactor=100 (no updates)
    - Add sequence BIGSERIAL for ordering
    - Add prev_hash and event_hash TEXT columns
    - Add category constraint for 9 event categories
    - Add indexes: tenant, sequence, actor, resource, occurred_at, category
    - _Requirements: 5.1, 5.9, 17.5_
  
  - [ ] 9.1.2 Implement Row-Level Security policies
    - Enable RLS on audit_logs table
    - Create audit_writer role with INSERT-only policy
    - Create audit_reader role with SELECT-only policy
    - Create policies preventing UPDATE and DELETE
    - _Requirements: 5.4, 14.2_
  
  - [ ] 9.1.3 Implement AuditLog entity
    - Define entity class with all audit fields
    - Mark as read-only (no update/delete methods)
    - Add validation for category enum
    - _Requirements: 5.1, 5.9_
  
  - [ ]* 9.1.4 Write unit tests for audit entity and RLS
    - Test entity creation with valid data
    - Test UPDATE attempts fail with permission denied
    - Test DELETE attempts fail with permission denied
    - Target: 3 entity tests passing
    - _Requirements: 5.4, 14.2_

- [ ] 9.2 MS-11: Audit Service - Hash Chain Implementation
  - [ ] 9.2.1 Implement HashChainService
    - Implement computeEventHash() using SHA-256
    - Hash input: sequence + eventType + actorId + resourceType + resourceId + action + occurredAt + prevHash
    - Return 64-character hex string
    - _Requirements: 5.3_
  
  - [ ] 9.2.2 Implement hash chain creation on log insertion
    - Fetch previous log entry by sequence
    - Extract prev_hash from previous entry
    - Compute event_hash for new entry
    - Store both prev_hash and event_hash
    - _Requirements: 5.2, 5.3_
  
  - [ ] 9.2.3 Implement verifyHashChain() method
    - Accept startSequence and endSequence parameters
    - Fetch all logs in range
    - Verify each entry's prev_hash matches previous entry's event_hash
    - Return valid flag and array of broken links
    - _Requirements: 5.8_
  
  - [ ]* 9.2.4 Write unit tests for hash chain
    - Test event hash computation is deterministic
    - Test hash chain integrity for valid sequence
    - Test tamper detection for broken chain
    - Target: 4 hash chain tests passing
    - _Requirements: 5.2, 5.3, 5.8_

- [ ] 9.3 MS-11: Audit Service - Kafka Consumer
  - [ ] 9.3.1 Implement KafkaConsumerService
    - Subscribe to 11 Kafka topics: agent-events, interaction-events, ticket-events, customer-events, notification-events, kb-events, ai-events, media-events, schema-events, layout-events, cti-events
    - Implement eachMessage handler
    - Parse event and create audit log entry
    - Handle consumer errors gracefully
    - _Requirements: 5.1, 13.4_
  
  - [ ] 9.3.2 Implement event categorization
    - Map event types to categories: authentication, authorization, data-access, data-modification, configuration-change, external-system-access, ai-assistance, media-access, cti-operation
    - Extract actor, resource, action from event payload
    - _Requirements: 5.9_
  
  - [ ]* 9.3.3 Write integration tests for Kafka consumer
    - Test consumer subscribes to all topics
    - Test audit log created for each event type
    - Test throughput: 1000 events per second
    - Target: 3 integration tests passing
    - _Requirements: 5.1, 15.6_

- [ ] 9.4 MS-11: Audit Service - API Endpoints
  - [ ] 9.4.1 Implement GET /api/v1/audit/logs (admin only)
    - Accept filters: eventType, actorId, resourceType, resourceId, startDate, endDate
    - Support pagination with limit and offset
    - Apply PII masking: show only last 4 digits of sensitive identifiers
    - Require admin role or audit_reader permission
    - _Requirements: 5.5, 5.6, 14.2_
  
  - [ ] 9.4.2 Implement POST /api/v1/audit/verify
    - Accept startSequence and endSequence parameters
    - Call HashChainService.verifyHashChain()
    - Return verification result with broken links
    - _Requirements: 5.8_
  
  - [ ] 9.4.3 Implement GET /api/v1/audit/export
    - Support JSON and CSV formats
    - Apply same filters as query endpoint
    - Stream large exports to avoid memory issues
    - _Requirements: 5.10_
  
  - [ ]* 9.4.4 Write unit tests for AuditService
    - Test audit log query with filters
    - Test PII masking in responses
    - Test hash chain verification
    - Test export in JSON and CSV formats
    - Target: 5 service tests passing
    - _Requirements: 5.5, 5.6, 5.8, 5.10_

- [ ]* 9.5 MS-11: Audit Service - Property-Based Tests
  - **Property 25: Hash Chain Integrity**
  - For any sequence of audit logs, each entry's prev_hash should equal previous event_hash
  - **Validates: Requirements 5.2**
  - **Property 26: Event Hash Computation**
  - For any audit log, event_hash should equal SHA-256(event_data + prev_hash)
  - **Validates: Requirements 5.3**
  - **Property 27: Immutability Enforcement**
  - For any audit log, UPDATE or DELETE attempts should fail
  - **Validates: Requirements 5.4**
  - **Property 29: Tamper Detection**
  - For any broken hash chain, verify should report exact sequence and hash mismatch
  - **Validates: Requirements 5.8**
  - Target: 4 property tests passing, 100 iterations each
  - _Requirements: 5.2, 5.3, 5.4, 5.8_

- [ ] 9.6 MS-11: Audit Service - Kong Configuration
  - Configure Kong route /api/v1/audit/* → audit-service:3011
  - Apply rate limiting: 30 req/min for admin endpoints
  - Enable JWT validation with admin role requirement
  - _Requirements: 19.5, 19.9_

- [ ] 9.7 MS-19: CTI Adapter Service - Database and Entities
  - [ ] 9.7.1 Create TypeORM migrations for cti_db
    - Create cti_configs table with vendor constraint (4 vendors)
    - Create cti_vendors table (reference data)
    - Create extension_mappings table with agent_id, extension, sip_uri
    - Create call_states table for historical reference
    - Create cti_events table for event logging
    - Add indexes: tenant, vendor, agent, call_id, occurred_at
    - _Requirements: 8.1, 8.10, 17.8_
  
  - [ ] 9.7.2 Implement CTIConfig, CTIVendor, ExtensionMapping, CallState entities
    - Define entity classes with TypeORM decorators
    - Add validation for vendor enum (cisco-webex, cisco-pcce, freeswitch, portsip)
    - Implement relationships: config → mappings
    - _Requirements: 8.1, 8.10_
  
  - [ ] 9.7.3 Seed CTI vendor reference data
    - Insert 4 vendor records with required/optional params
    - Cisco Webex Contact Center: apiKey, orgId, dataCenter
    - Cisco PCCE: host, port, username, password
    - FreeSwitch: host, port, password
    - Portsip: host, port, username, password
    - _Requirements: 8.1_
  
  - [ ]* 9.7.4 Write unit tests for CTI entities
    - Test entity creation with valid data
    - Test vendor validation
    - Test relationships (config → mappings)
    - Target: 2 entity tests passing
    - _Requirements: 8.1_

- [ ] 9.8 MS-19: CTI Adapter Service - Adapter Interface
  - [ ] 9.8.1 Define CTIAdapter interface
    - Define lifecycle methods: initialize(), login(), logout()
    - Define status method: setStatus()
    - Define call control methods: answer(), hangup(), hold(), resume(), mute(), unmute(), transfer(), conference(), sendDTMF(), makeCall()
    - Define event methods: on(), off()
    - Define connection method: isConnected(), reconnect()
    - _Requirements: 8.2_
  
  - [ ] 9.8.2 Implement CTIAdapterFactory
    - Create adapter instance based on vendor configuration
    - Return CiscoWebexAdapter, CiscoPCCEAdapter, FreeSwitchAdapter, or PortsipAdapter
    - Throw error for unsupported vendor
    - _Requirements: 8.1, 8.2_
  
  - [ ]* 9.8.3 Write unit tests for adapter interface
    - Test factory creates correct adapter for each vendor
    - Test all adapters implement CTIAdapter interface
    - Target: 2 factory tests passing
    - _Requirements: 8.1, 8.2_

- [ ] 9.9 MS-19: CTI Adapter Service - Vendor Implementations
  - [ ] 9.9.1 Implement CiscoWebexAdapter
    - Initialize Webex Contact Center client
    - Implement all CTIAdapter interface methods
    - Map Webex events to CTI events (call.ringing, call.connected, etc.)
    - Handle warm and cold transfer
    - _Requirements: 8.1, 8.2, 8.4, 8.8_
  
  - [ ] 9.9.2 Implement CiscoPCCEAdapter
    - Initialize Cisco PCCE client
    - Implement all CTIAdapter interface methods
    - Map PCCE events to CTI events
    - Handle warm and cold transfer
    - _Requirements: 8.1, 8.2, 8.4, 8.8_
  
  - [ ] 9.9.3 Implement FreeSwitchAdapter
    - Initialize FreeSwitch ESL client
    - Implement all CTIAdapter interface methods
    - Map FreeSwitch events to CTI events
    - Handle warm and cold transfer
    - _Requirements: 8.1, 8.2, 8.4, 8.8_
  
  - [ ] 9.9.4 Implement PortsipAdapter
    - Initialize Portsip SDK client
    - Implement all CTIAdapter interface methods
    - Map Portsip events to CTI events
    - Handle warm and cold transfer
    - _Requirements: 8.1, 8.2, 8.4, 8.8_
  
  - [ ]* 9.9.5 Write unit tests for vendor adapters
    - Test each adapter implements all interface methods
    - Test event emission for call.ringing, call.connected, call.ended
    - Test warm and cold transfer operations
    - Target: 8 adapter tests passing (2 per vendor)
    - _Requirements: 8.2, 8.4, 8.8_

- [ ] 9.10 MS-19: CTI Adapter Service - Call State Management
  - [ ] 9.10.1 Implement Redis call state caching
    - Store active call state with key: cti:call:{agentId}:{callId}
    - Include callId, agentId, direction, callerNumber, status, startTime
    - Update state on call events (ringing, connected, held, ended)
    - Clear state on call.ended event
    - _Requirements: 8.6_
  
  - [ ] 9.10.2 Implement reconnection logic with exponential backoff
    - Track reconnection attempts (max 5)
    - Use delays: 1s, 2s, 4s, 8s, 16s (max)
    - Reset attempt counter on successful reconnection
    - Emit connection.state.changed events
    - _Requirements: 8.7_
  
  - [ ]* 9.10.3 Write unit tests for call state management
    - Test call state cached in Redis
    - Test exponential backoff reconnection delays
    - Test reconnection attempt limit (5 max)
    - Target: 3 state management tests passing
    - _Requirements: 8.6, 8.7_

- [ ] 9.11 MS-19: CTI Adapter Service - API Endpoints
  - [ ] 9.11.1 Implement call control endpoints
    - POST /api/v1/cti/calls/answer
    - POST /api/v1/cti/calls/hangup
    - POST /api/v1/cti/calls/hold
    - POST /api/v1/cti/calls/resume
    - POST /api/v1/cti/calls/mute
    - POST /api/v1/cti/calls/unmute
    - POST /api/v1/cti/calls/transfer (warm and cold)
    - POST /api/v1/cti/calls/conference
    - POST /api/v1/cti/calls/dtmf
    - POST /api/v1/cti/calls/make
    - Each endpoint calls corresponding adapter method
    - _Requirements: 8.2, 8.5_
  
  - [ ] 9.11.2 Implement admin configuration endpoints
    - GET /api/v1/admin/cti/config - get CTI configuration
    - PATCH /api/v1/admin/cti/config - update configuration
    - GET /api/v1/admin/cti/vendors - list supported vendors
    - Require admin role for all admin endpoints
    - _Requirements: 8.10_
  
  - [ ] 9.11.3 Implement WebSocket gateway for CTI events
    - Create CTIGateway with @WebSocketGateway decorator
    - Handle client connections on /ws/cti/{agentId}/call
    - Emit CTI events to connected clients: call.ringing, call.connected, call.held, call.ended, etc.
    - Handle client commands: answer, hangup, hold, transfer
    - _Requirements: 8.11_
  
  - [ ] 9.11.4 Implement audit logging for CTI operations
    - Publish cti.call.incoming, cti.call.ended, cti.agent.status.changed events to Kafka
    - Log all call control operations with category 'cti-operation'
    - _Requirements: 8.9, 13.7_
  
  - [ ]* 9.11.5 Write unit tests for CTIService
    - Test call control operations
    - Test CTI configuration management
    - Test WebSocket event emission
    - Test audit logging for CTI operations
    - Target: 6 service tests passing
    - _Requirements: 8.2, 8.5, 8.9, 8.10_

- [ ]* 9.12 MS-19: CTI Adapter Service - Property-Based Tests
  - **Property 42: CTI Adapter Interface Compliance**
  - For any CTI adapter, it should implement all methods in CTIAdapter interface
  - **Validates: Requirements 8.2**
  - **Property 43: Call Event Emission**
  - For any incoming call, adapter should emit call.ringing with required fields
  - **Validates: Requirements 8.4**
  - **Property 44: Call State Caching**
  - For any active call, state should be stored in Redis with agent_id in key
  - **Validates: Requirements 8.6**
  - **Property 45: Exponential Backoff Reconnection**
  - For any connection drop, reconnection delays should be 1s, 2s, 4s, 8s, 16s
  - **Validates: Requirements 8.7**
  - Target: 4 property tests passing, 100 iterations each
  - _Requirements: 8.2, 8.4, 8.6, 8.7_

- [ ] 9.13 MS-19: CTI Adapter Service - Kong Configuration
  - Configure Kong route /api/v1/cti/* → cti-adapter-service:3019
  - Configure Kong route /api/v1/admin/cti/* → cti-adapter-service:3019
  - Apply rate limiting: 100 req/min for call control, 30 req/min for admin
  - Enable JWT validation on all endpoints
  - _Requirements: 19.8, 19.9_

- [ ] 9.14 Checkpoint - Sprint 9 Verification
  - Verify Audit Service consumes events from all Kafka topics
  - Verify hash chain integrity for audit logs
  - Verify RLS prevents UPDATE/DELETE on audit_logs
  - Verify CTI adapters for all 4 vendors (Cisco Webex, Cisco PCCE, FreeSwitch, Portsip)
  - Verify CTI WebSocket gateway emits call events
  - Verify exponential backoff reconnection logic
  - Run all Sprint 9 tests: expect 40+ tests passing
  - Verify Kong routes for MS-11 and MS-19 configured
  - Ensure all tests pass, ask the user if questions arise



### Sprint 10-11: Dynamic Object Schema & Layout (MS-13, MS-14) - Weeks 19-22

- [ ] 10.1 MS-13: Object Schema Service - Database and Entities
  - [ ] 10.1.1 Create TypeORM migrations for object_schema_db
    - Create object_types table with version tracking
    - Create field_definitions table with 22 field_type constraint
    - Create object_relationships table with relationship_type constraint
    - Create schema_versions table for version history
    - Create field_validation_rules table with rule_type constraint
    - Add indexes: tenant, name, object_type, version, sort_order
    - Add UNIQUE constraint on (object_type_id, name) for field_definitions
    - _Requirements: 6.1, 6.2, 6.4, 6.8, 17.6_
  
  - [ ] 10.1.2 Implement ObjectType, FieldDefinition, ObjectRelationship, SchemaVersion entities
    - Define entity classes with TypeORM decorators
    - Add validation for field_type enum (22 types)
    - Add validation for data_source enum (local, enrichment, computed, reference)
    - Implement relationships: objectType → fields, objectType → versions
    - _Requirements: 6.1, 6.3, 6.10_
  
  - [ ] 10.1.3 Seed default object types
    - Insert customer, ticket, interaction, kb_article, bank_product object types
    - Mark as system objects with isSystem: true
    - Define core fields for each object type with isCore: true
    - _Requirements: 6.12_
  
  - [ ]* 10.1.4 Write unit tests for Schema entities
    - Test entity creation with valid data
    - Test field type validation (22 types)
    - Test field name uniqueness within object type
    - Test relationships (objectType → fields)
    - Target: 4 entity tests passing
    - _Requirements: 6.1, 6.2_

- [ ] 10.2 MS-13: Object Schema Service - Schema Parser and Printer
  - [ ] 10.2.1 Implement SchemaParser
    - Parse JSON string to ObjectType entity
    - Validate schema structure (name, displayName, fields required)
    - Validate field names are unique
    - Validate field types are supported
    - Return descriptive error messages with line numbers when possible
    - _Requirements: 6.2, 12.1, 12.10_
  
  - [ ] 10.2.2 Implement SchemaPrinter
    - Convert ObjectType entity to formatted JSON string
    - Use JSON.stringify with 2-space indentation
    - Include all fields: name, displayName, version, fields
    - _Requirements: 12.2_
  
  - [ ] 10.2.3 Implement validation rules parser
    - Parse validation rules from JSON: required, min, max, minLength, maxLength, pattern, custom
    - Validate rule values are appropriate for field type
    - _Requirements: 6.3_
  
  - [ ]* 10.2.4 Write unit tests for parser and printer
    - Test parse valid schema JSON
    - Test parse rejects invalid schema (missing required fields)
    - Test parse rejects duplicate field names
    - Test print formats schema correctly
    - Test descriptive parse errors
    - Target: 5 parser tests passing
    - _Requirements: 6.2, 12.1, 12.2, 12.10_

- [ ] 10.3 MS-13: Object Schema Service - Schema Versioning
  - [ ] 10.3.1 Implement schema version tracking
    - On schema update, create snapshot in schema_versions table
    - Increment version number by 1
    - Store schema JSON snapshot using SchemaPrinter
    - Record changes (added fields, removed fields, modified fields)
    - _Requirements: 6.4_
  
  - [ ] 10.3.2 Implement schema update event publishing
    - Publish schema.updated event to Kafka on every schema change
    - Include objectType, version, changes in event payload
    - _Requirements: 6.5, 13.5_
  
  - [ ] 10.3.3 Implement Redis cache invalidation
    - Cache schemas with key: schema:{objectType}
    - Set TTL to 5 minutes (300 seconds)
    - On schema.updated event, delete cache entry
    - _Requirements: 6.6_
  
  - [ ]* 10.3.4 Write unit tests for versioning
    - Test version increments by 1 on update
    - Test schema snapshot created on update
    - Test schema.updated event published
    - Test Redis cache invalidated on update
    - Target: 4 versioning tests passing
    - _Requirements: 6.4, 6.5, 6.6_

- [ ] 10.4 MS-13: Object Schema Service - API Endpoints
  - [ ] 10.4.1 Implement public schema API
    - GET /api/v1/schemas/:objectType - get current schema (cached)
    - GET /api/v1/schemas/:objectType/version/:ver - get specific version
    - Return schema with all fields and validation rules
    - _Requirements: 6.1_
  
  - [ ] 10.4.2 Implement admin object type management
    - GET /api/v1/admin/object-types - list all object types
    - GET /api/v1/admin/object-types/:name - get object type detail
    - POST /api/v1/admin/object-types - create object type
    - PUT /api/v1/admin/object-types/:name - update object type
    - DELETE /api/v1/admin/object-types/:name - delete object type (non-system only)
    - Require admin role for all admin endpoints
    - _Requirements: 6.1_
  
  - [ ] 10.4.3 Implement field management endpoints
    - GET /api/v1/admin/object-types/:name/fields - list fields
    - POST /api/v1/admin/object-types/:name/fields - add field
    - PUT /api/v1/admin/object-types/:name/fields/:id - update field
    - DELETE /api/v1/admin/object-types/:name/fields/:id - remove field
    - Reject deletion of core fields (isCore: true)
    - _Requirements: 6.2, 6.7_
  
  - [ ] 10.4.4 Implement impact analysis endpoint
    - GET /api/v1/admin/object-types/:name/impact
    - Identify layouts using fields from this object type
    - Identify workflows referencing this object type
    - Return list of affected resources
    - _Requirements: 6.9_
  
  - [ ]* 10.4.5 Write unit tests for SchemaService
    - Test field name uniqueness validation
    - Test schema versioning increment
    - Test schema update event publishing
    - Test cache invalidation on update
    - Test core field protection (cannot delete)
    - Target: 7 service tests passing
    - _Requirements: 6.2, 6.4, 6.5, 6.6, 6.7_

- [ ]* 10.5 MS-13: Object Schema Service - Property-Based Tests
  - **Property 30: Field Name Uniqueness**
  - For any object type, creating two fields with same name should reject second
  - **Validates: Requirements 6.2**
  - **Property 31: Schema Versioning Increment**
  - For any schema update, version should increment by exactly 1
  - **Validates: Requirements 6.4**
  - **Property 32: Schema Update Event Publishing**
  - For any schema update, schema.updated event should be published to Kafka
  - **Validates: Requirements 6.5**
  - **Property 34: Core Field Protection**
  - For any field with isCore: true, deletion attempts should be rejected
  - **Validates: Requirements 6.7**
  - **Property 35: Schema Round-Trip Property**
  - For any valid ObjectType, parse(print(schema)) should equal original schema
  - **Validates: Requirements 12.3**
  - Target: 5 property tests passing, 100 iterations each
  - _Requirements: 6.2, 6.4, 6.5, 6.7, 12.3_

- [ ] 10.6 MS-13: Object Schema Service - Kong Configuration
  - Configure Kong route /api/v1/schemas/* → object-schema-service:3013
  - Configure Kong route /api/v1/admin/object-types/* → object-schema-service:3013
  - Apply rate limiting: 100 req/min for public API, 30 req/min for admin
  - Enable JWT validation on all endpoints
  - _Requirements: 19.6, 19.9_

- [ ] 10.7 MS-14: Layout Service - Database and Entities
  - [ ] 10.7.1 Create TypeORM migrations for layout_db
    - Create layouts table with context constraint (9 contexts)
    - Create layout_sections table with sort_order
    - Create layout_fields table with width constraint
    - Create layout_versions table for version history
    - Add indexes: tenant, object_type, context, is_default, sort_order
    - _Requirements: 7.1, 7.4, 17.7_
  
  - [ ] 10.7.2 Implement Layout, LayoutSection, LayoutField, LayoutVersion entities
    - Define entity classes with TypeORM decorators
    - Add validation for context enum (9 contexts)
    - Add validation for width enum (quarter, third, half, two-thirds, full)
    - Implement relationships: layout → sections → fields
    - _Requirements: 7.1, 7.3, 7.5_
  
  - [ ]* 10.7.3 Write unit tests for Layout entities
    - Test entity creation with valid data
    - Test context validation (9 contexts)
    - Test width validation
    - Test relationships (layout → sections → fields)
    - Target: 3 entity tests passing
    - _Requirements: 7.1, 7.3, 7.5_

- [ ] 10.8 MS-14: Layout Service - Layout Parser and Printer
  - [ ] 10.8.1 Implement LayoutParser
    - Parse JSON string to Layout entity
    - Validate layout structure (objectType, context, name, config required)
    - Validate all referenced field IDs exist in schema (call Object Schema Service)
    - Validate sections have fields array
    - Return descriptive error messages with line numbers when possible
    - _Requirements: 7.2, 12.4, 12.10_
  
  - [ ] 10.8.2 Implement LayoutPrinter
    - Convert Layout entity to formatted JSON string
    - Use JSON.stringify with 2-space indentation
    - Include all fields: objectType, context, name, version, config
    - _Requirements: 12.5_
  
  - [ ]* 10.8.3 Write unit tests for layout parser and printer
    - Test parse valid layout JSON
    - Test parse rejects invalid layout (missing required fields)
    - Test parse validates field IDs against schema
    - Test print formats layout correctly
    - Test descriptive parse errors
    - Target: 5 parser tests passing
    - _Requirements: 7.2, 12.4, 12.5, 12.10_

- [ ] 10.9 MS-14: Layout Service - Conditional Visibility
  - [ ] 10.9.1 Implement VisibilityEvaluator
    - Implement evaluate() method for visibility rules
    - Support operators: equals, notEquals, contains, greaterThan, lessThan, isEmpty, isNotEmpty
    - Accept rule and data object, return boolean
    - _Requirements: 7.7_
  
  - [ ] 10.9.2 Implement filterVisibleFields() method
    - Filter sections based on section visibility rules
    - Filter fields within sections based on field visibility rules
    - Return modified layout with only visible sections and fields
    - _Requirements: 7.7_
  
  - [ ]* 10.9.3 Write unit tests for visibility evaluator
    - Test each operator (equals, notEquals, contains, etc.)
    - Test section filtering based on visibility rules
    - Test field filtering based on visibility rules
    - Target: 7 visibility tests passing
    - _Requirements: 7.7_

- [ ] 10.10 MS-14: Layout Service - API Endpoints
  - [ ] 10.10.1 Implement public layout API
    - GET /api/v1/layouts/:objectType - get active layouts (cached)
    - GET /api/v1/layouts/:objectType/:context - get layout for context
    - Apply role-based filtering (roleRestrictions)
    - Return default layout for agent's role
    - Cache layouts in Redis with 5-minute TTL
    - _Requirements: 7.1, 7.6, 7.8, 7.9_
  
  - [ ] 10.10.2 Implement admin layout management
    - GET /api/v1/admin/layouts - list all layouts
    - GET /api/v1/admin/layouts/:id - get layout detail
    - POST /api/v1/admin/layouts - create layout
    - PUT /api/v1/admin/layouts/:id - update layout
    - DELETE /api/v1/admin/layouts/:id - delete layout
    - POST /api/v1/admin/layouts/:id/activate - set as default
    - POST /api/v1/admin/layouts/:id/rollback/:version - rollback to version
    - Require admin role for all admin endpoints
    - _Requirements: 7.1, 7.10_
  
  - [ ] 10.10.3 Implement layout versioning and cache invalidation
    - On layout update, create snapshot in layout_versions table
    - Increment version number by 1
    - Publish layout.updated event to Kafka
    - Invalidate Redis cache on update
    - _Requirements: 7.10, 13.6_
  
  - [ ]* 10.10.4 Write unit tests for LayoutService
    - Test layout field validation against schema
    - Test layout cache TTL (5 minutes)
    - Test conditional visibility evaluation
    - Test role-based layout filtering
    - Test default layout selection
    - Target: 7 service tests passing
    - _Requirements: 7.2, 7.6, 7.7, 7.8, 7.9_

- [ ]* 10.11 MS-14: Layout Service - Property-Based Tests
  - **Property 36: Layout Field Validation**
  - For any layout, if referenced field ID doesn't exist in schema, creation should be rejected
  - **Validates: Requirements 7.2**
  - **Property 37: Layout Cache TTL**
  - For any layout query, result should be cached for 5 minutes
  - **Validates: Requirements 7.6**
  - **Property 38: Conditional Visibility Evaluation**
  - For any visibility rule and data, evaluate should return true iff condition satisfied
  - **Validates: Requirements 7.7**
  - **Property 40: Default Layout Selection**
  - For any agent requesting layout, system should return default for (type, context, role)
  - **Validates: Requirements 7.9**
  - **Property 41: Layout Round-Trip Property**
  - For any valid Layout, parse(print(layout)) should equal original layout
  - **Validates: Requirements 12.6**
  - Target: 5 property tests passing, 100 iterations each
  - _Requirements: 7.2, 7.6, 7.7, 7.9, 12.6_

- [ ] 10.12 MS-14: Layout Service - Kong Configuration
  - Configure Kong route /api/v1/layouts/* → layout-service:3014
  - Configure Kong route /api/v1/admin/layouts/* → layout-service:3014
  - Apply rate limiting: 100 req/min for public API, 30 req/min for admin
  - Enable JWT validation on all endpoints
  - _Requirements: 19.7, 19.9_

- [ ] 10.13 Dynamic Fields Migration for Existing Services
  - [ ] 10.13.1 Add dynamic_fields column to interaction_db
    - ALTER TABLE interactions ADD COLUMN dynamic_fields JSONB DEFAULT '{}'
    - CREATE INDEX idx_interactions_dynamic_fields USING GIN(dynamic_fields)
    - _Requirements: 9.9, 11.1_
  
  - [ ] 10.13.2 Add dynamic_fields column to ticket_db
    - ALTER TABLE tickets ADD COLUMN dynamic_fields JSONB DEFAULT '{}'
    - CREATE INDEX idx_tickets_dynamic_fields USING GIN(dynamic_fields)
    - _Requirements: 9.9, 11.2_
  
  - [ ] 10.13.3 Add dynamic_fields column to customer_db
    - ALTER TABLE customers ADD COLUMN dynamic_fields JSONB DEFAULT '{}'
    - CREATE INDEX idx_customers_dynamic_fields USING GIN(dynamic_fields)
    - _Requirements: 9.9, 11.3_
  
  - [ ] 10.13.4 Update Interaction Service for dynamic fields
    - Add dynamic_fields property to Interaction entity
    - Implement PATCH /api/v1/interactions/:id/fields endpoint
    - Implement GET /api/v1/interactions/:id/fields endpoint
    - Validate dynamic field values against schema from Object Schema Service
    - Cache schema in Redis with 5-minute TTL
    - _Requirements: 9.9, 11.6, 11.7, 11.8, 11.11_
  
  - [ ] 10.13.5 Update Ticket Service for dynamic fields
    - Add dynamic_fields property to Ticket entity
    - Implement PATCH /api/v1/tickets/:id/fields endpoint
    - Implement GET /api/v1/tickets/:id/fields endpoint
    - Validate dynamic field values against schema
    - _Requirements: 9.9, 11.6, 11.7, 11.8_
  
  - [ ] 10.13.6 Update Customer Service for dynamic fields
    - Add dynamic_fields property to Customer entity
    - Implement PATCH /api/v1/customers/:id/fields endpoint
    - Implement GET /api/v1/customers/:id/fields endpoint
    - Validate dynamic field values against schema
    - _Requirements: 9.9, 11.6, 11.7, 11.8_
  
  - [ ]* 10.13.7 Write unit tests for dynamic fields support
    - Test dynamic field storage and retrieval
    - Test dynamic field validation against schema
    - Test schema cache invalidation on schema.updated event
    - Target: 6 dynamic field tests passing (2 per service)
    - _Requirements: 9.9, 11.8, 11.12_

- [ ] 10.14 Checkpoint - Sprint 10-11 Verification
  - Verify Object Schema Service can create and version schemas
  - Verify schema parser round-trip property (parse(print(schema)) equals schema)
  - Verify Layout Service can create layouts with conditional visibility
  - Verify layout parser round-trip property (parse(print(layout)) equals layout)
  - Verify dynamic_fields column added to interactions, tickets, customers tables
  - Verify existing services validate dynamic fields against schemas
  - Verify schema and layout caching in Redis with 5-minute TTL
  - Run all Sprint 10-11 tests: expect 55+ tests passing
  - Verify Kong routes for MS-13 and MS-14 configured
  - Ensure all tests pass, ask the user if questions arise



### Sprint 12: Admin Module Foundation - Weeks 23-24

- [ ] 11.1 Admin Module - Project Setup
  - [ ] 11.1.1 Create Admin Module React SPA with Nx
    - Run: nx generate @nx/react:application admin-module
    - Configure Vite 6.x build tool
    - Set up TypeScript 5.7 with strict mode
    - Configure path alias @/ for src directory
    - _Requirements: 10.1_
  
  - [ ] 11.1.2 Configure authentication and routing
    - Install react-router-dom for routing
    - Create /admin route as entry point
    - Implement JWT authentication check (reuse Identity Service)
    - Redirect to login if not authenticated or missing admin role
    - _Requirements: 10.2, 10.10_
  
  - [ ] 11.1.3 Set up shared UI components
    - Install shadcn/ui components
    - Install dnd-kit for drag-and-drop
    - Configure Tailwind CSS
    - Create AdminLayout component with sidebar navigation
    - _Requirements: 10.5, 10.12_

- [ ] 11.2 Admin Module - Navigation and Layout
  - [ ] 11.2.1 Implement AdminLayout component
    - Create sidebar with navigation sections
    - Sections: Dashboard, Schema Designer, Layout Designer, User Management, CTI Config, Audit Viewer
    - Add user profile dropdown with logout
    - Responsive design for desktop (primary target)
    - _Requirements: 10.12_
  
  - [ ] 11.2.2 Implement route protection
    - Create ProtectedRoute component
    - Check JWT token validity
    - Verify admin role or specific admin permissions
    - Redirect to login if unauthorized
    - _Requirements: 10.2, 10.11_

- [ ] 11.3 Admin Module - Schema Designer
  - [ ] 11.3.1 Implement ObjectTypeList component
    - Fetch object types from GET /api/v1/admin/object-types
    - Display list with name, displayName, version, isSystem
    - Add "Create Object Type" button
    - Click object type to open field editor
    - _Requirements: 10.3_
  
  - [ ] 11.3.2 Implement FieldEditor component
    - Display fields for selected object type
    - Support drag-and-drop field reordering using dnd-kit
    - Add "Add Field" button opening field form
    - Edit field by clicking on it
    - Delete field (disabled for core fields)
    - _Requirements: 10.3, 10.4_
  
  - [ ] 11.3.3 Implement FieldForm component
    - Form fields: name, displayName, fieldType (22 types dropdown), dataSource, isRequired, isReadOnly, isSensitive
    - Validation rules section: add/remove rules (required, min, max, pattern, etc.)
    - Display config section: placeholder, helpText, width, renderer
    - Save button calls POST or PUT /api/v1/admin/object-types/:name/fields
    - _Requirements: 10.3_
  
  - [ ] 11.3.4 Implement RelationshipVisualizer component (optional)
    - Display object relationships as graph
    - Show one-to-one, one-to-many, many-to-many relationships
    - Click relationship to edit
    - _Requirements: 10.3_
  
  - [ ]* 11.3.5 Write E2E tests for Schema Designer
    - Test create new object type
    - Test add field to object type
    - Test drag-and-drop field reordering
    - Test delete field (should fail for core fields)
    - Target: 4 E2E tests passing
    - _Requirements: 10.3, 10.4_

- [ ] 11.4 Admin Module - Layout Designer
  - [ ] 11.4.1 Implement LayoutList component
    - Fetch layouts from GET /api/v1/admin/layouts
    - Filter by object type and context
    - Display list with name, context, isDefault, version
    - Add "Create Layout" button
    - Click layout to open designer
    - _Requirements: 10.5_
  
  - [ ] 11.4.2 Implement LayoutDesigner component
    - Left panel: available fields from schema
    - Center panel: drag-and-drop canvas with sections
    - Right panel: properties (section title, collapsible, field width, renderer)
    - Support drag fields from left to center
    - Support drag to reorder fields within sections
    - Support drag to reorder sections
    - Use dnd-kit library for all drag-and-drop
    - _Requirements: 10.5_
  
  - [ ] 11.4.3 Implement LayoutPreview component
    - Display live preview of layout with sample or real data
    - Update preview in real-time as layout changes
    - Show how layout looks in selected context (detail_full, create, edit, etc.)
    - _Requirements: 10.6_
  
  - [ ] 11.4.4 Implement layout save and versioning
    - Save button calls POST or PUT /api/v1/admin/layouts
    - Display version history
    - Support rollback to previous version
    - Mark layout as default for context
    - _Requirements: 10.5_
  
  - [ ]* 11.4.5 Write E2E tests for Layout Designer
    - Test create new layout
    - Test drag field from palette to canvas
    - Test drag to reorder fields
    - Test live preview updates
    - Target: 4 E2E tests passing
    - _Requirements: 10.5, 10.6_

- [ ] 11.5 Admin Module - User Management
  - [ ] 11.5.1 Implement UserList component
    - Fetch users from GET /api/v1/users (Identity Service)
    - Display table with username, email, fullName, roles, isActive
    - Add "Create User" button
    - Click user to edit
    - _Requirements: 10.7_
  
  - [ ] 11.5.2 Implement UserForm component
    - Form fields: username, email, fullName, password (create only), roles (multi-select)
    - Validate email format
    - Validate password strength (min 8 chars, uppercase, lowercase, number)
    - Save button calls POST or PATCH /api/v1/users
    - _Requirements: 10.7_
  
  - [ ] 11.5.3 Implement role assignment
    - Display available roles from GET /api/v1/roles
    - Multi-select dropdown for role assignment
    - Save role assignments to user_roles table
    - _Requirements: 10.7_
  
  - [ ]* 11.5.4 Write E2E tests for User Management
    - Test create new user
    - Test assign roles to user
    - Test edit user details
    - Target: 3 E2E tests passing
    - _Requirements: 10.7_

- [ ] 11.6 Admin Module - Audit Viewer
  - [ ] 11.6.1 Implement AuditLogList component
    - Fetch audit logs from GET /api/v1/audit/logs
    - Display paginated table with eventType, actor, resource, action, occurredAt
    - Support filtering by eventType, actorId, resourceType, resourceId, date range
    - Display PII-masked values (only last 4 digits)
    - _Requirements: 10.8_
  
  - [ ] 11.6.2 Implement AuditLogDetail component
    - Display full audit log entry
    - Show oldValues and newValues (if present)
    - Show event hash and prev hash
    - Display IP address and user agent
    - _Requirements: 10.8_
  
  - [ ] 11.6.3 Implement audit log export
    - Add "Export" button
    - Support JSON and CSV formats
    - Call GET /api/v1/audit/export with current filters
    - Download file to browser
    - _Requirements: 10.8_
  
  - [ ]* 11.6.4 Write E2E tests for Audit Viewer
    - Test audit log list displays entries
    - Test filtering by event type
    - Test pagination
    - Test export to JSON
    - Target: 4 E2E tests passing
    - _Requirements: 10.8_

- [ ] 11.7 Admin Module - CTI Configuration
  - [ ] 11.7.1 Implement CTIConfigForm component
    - Fetch current config from GET /api/v1/admin/cti/config
    - Vendor selection dropdown (Cisco Webex, Cisco PCCE, FreeSwitch, Portsip)
    - Dynamic form fields based on selected vendor (required/optional params)
    - Connection parameters: apiKey, orgId, dataCenter (Webex), host, port, username, password (others)
    - Test connection button
    - Save button calls PATCH /api/v1/admin/cti/config
    - _Requirements: 10.9_
  
  - [ ] 11.7.2 Implement ExtensionMappingList component
    - Display agent-to-extension mappings
    - Add "Add Mapping" button
    - Edit mapping by clicking
    - Delete mapping
    - _Requirements: 10.9_
  
  - [ ]* 11.7.3 Write E2E tests for CTI Configuration
    - Test select vendor and configure connection params
    - Test add extension mapping
    - Test save configuration
    - Target: 3 E2E tests passing
    - _Requirements: 10.9_

- [ ] 11.8 Admin Module - API Integration with TanStack Query
  - [ ] 11.8.1 Set up TanStack Query client
    - Install @tanstack/react-query
    - Configure QueryClient with default options
    - Set up QueryClientProvider in App component
    - Configure React Query DevTools
    - _Requirements: 18.13_
  
  - [ ] 11.8.2 Implement query hooks for Schema Designer
    - useObjectTypes() - fetch object types
    - useObjectType(name) - fetch single object type with fields
    - useCreateObjectType() - mutation for creating
    - useUpdateObjectType() - mutation for updating
    - useDeleteObjectType() - mutation for deleting
    - useCreateField() - mutation for adding field
    - useUpdateField() - mutation for updating field
    - useDeleteField() - mutation for deleting field
    - _Requirements: 18.13_
  
  - [ ] 11.8.3 Implement query hooks for Layout Designer
    - useLayouts(objectType, context) - fetch layouts
    - useLayout(id) - fetch single layout
    - useCreateLayout() - mutation for creating
    - useUpdateLayout() - mutation for updating
    - useDeleteLayout() - mutation for deleting
    - _Requirements: 18.13_
  
  - [ ] 11.8.4 Implement query hooks for User Management
    - useUsers() - fetch users
    - useUser(id) - fetch single user
    - useRoles() - fetch available roles
    - useCreateUser() - mutation for creating
    - useUpdateUser() - mutation for updating
    - _Requirements: 18.13_
  
  - [ ] 11.8.5 Implement query hooks for Audit Viewer
    - useAuditLogs(filters) - fetch audit logs with pagination
    - useAuditLog(id) - fetch single audit log
    - useExportAuditLogs(filters, format) - export logs
    - _Requirements: 18.13_
  
  - [ ] 11.8.6 Implement cache invalidation strategies
    - Invalidate object types cache on schema.updated event
    - Invalidate layouts cache on layout.updated event
    - Use optimistic updates for mutations
    - _Requirements: 18.13_

- [ ] 11.9 Admin Module - WebSocket Integration
  - [ ] 11.9.1 Set up WebSocket connections
    - Connect to /ws/schemas for schema change notifications
    - Connect to /ws/layouts for layout change notifications
    - Reconnect on connection drop
    - _Requirements: 18.14_
  
  - [ ] 11.9.2 Handle real-time updates
    - On schema.updated event, invalidate React Query cache and refetch
    - On layout.updated event, invalidate React Query cache and refetch
    - Show toast notification when schema or layout changes
    - _Requirements: 18.14_

- [ ] 11.10 Progressive Loading Implementation
  - [ ] 11.10.1 Implement SkeletonPlaceholder component
    - Create shimmer animation effect
    - Support different sizes and shapes
    - Use for fields with status "loading"
    - _Requirements: 9.5_
  
  - [ ] 11.10.2 Implement progressive loading in Customer profile
    - Fetch local fields immediately (< 200ms)
    - Display skeleton placeholders for enrichment fields
    - Subscribe to /ws/objects/customer/:id/fields WebSocket
    - On object.fields.updated event, replace skeleton with actual value
    - No page reload or layout shift
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6_
  
  - [ ] 11.10.3 Implement error handling for enrichment failures
    - Display error indicator with "Thử lại" (retry) button
    - On retry, call enrichment service again
    - Timeout after 5 seconds if enrichment not complete
    - _Requirements: 9.7, 9.8_
  
  - [ ]* 11.10.4 Write E2E tests for progressive loading
    - Test local fields display immediately
    - Test skeleton placeholders shown for enrichment fields
    - Test skeleton replaced with actual value on WebSocket update
    - Test no layout shift during progressive loading
    - Test error indicator and retry button
    - Target: 5 E2E tests passing
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 9.7_

- [ ] 11.11 Dynamic Form Rendering
  - [ ] 11.11.1 Implement SchemaFieldRenderer component
    - Render field based on field type (22 types)
    - Text types: input, textarea, rich text editor
    - Number types: number input, decimal input, currency input
    - Date types: date picker, datetime picker
    - Boolean: checkbox, toggle
    - Enum: select dropdown, multi-select
    - Email, phone, URL: input with validation
    - File, image: file upload
    - JSON: code editor
    - Reference: autocomplete search
    - Rating: star rating
    - Color: color picker
    - Tag: tag input
    - _Requirements: 9.10_
  
  - [ ] 11.11.2 Implement LayoutEngine component
    - Accept layout config and data object
    - Render sections with configured columns
    - Render fields with configured width and renderer
    - Apply conditional visibility rules
    - Support collapsible sections
    - _Requirements: 9.10_
  
  - [ ] 11.11.3 Implement field validation
    - Validate based on validation rules from schema
    - Required, min, max, minLength, maxLength, pattern, custom
    - Display validation errors inline
    - Prevent form submission if validation fails
    - _Requirements: 9.10_
  
  - [ ]* 11.11.4 Write E2E tests for dynamic form rendering
    - Test form renders fields based on schema
    - Test form applies layout configuration
    - Test field validation based on rules
    - Test conditional visibility hides/shows fields
    - Target: 4 E2E tests passing
    - _Requirements: 9.10_

- [ ] 11.12 Checkpoint - Sprint 12 Verification
  - Verify Admin Module accessible at /admin route
  - Verify authentication requires admin role
  - Verify Schema Designer can create and edit object types
  - Verify Layout Designer drag-and-drop works with dnd-kit
  - Verify User Management can create users and assign roles
  - Verify Audit Viewer displays paginated audit logs
  - Verify CTI Configuration can select vendor and configure params
  - Verify progressive loading shows skeleton placeholders
  - Verify dynamic form rendering works for all 22 field types
  - Run all Sprint 12 E2E tests: expect 27+ tests passing
  - Ensure all tests pass, ask the user if questions arise



## Phase 2 Exit Criteria and Final Verification

- [ ] 12.1 Service Operational Verification
  - [ ] 12.1.1 Verify all 8 Phase 2 services operational
    - MS-7: Knowledge Service running on port 3007
    - MS-8: BFSI Core Banking Service running on port 3008
    - MS-9: AI Service running on port 3009
    - MS-10: Media Service running on port 3010
    - MS-11: Audit Service running on port 3011
    - MS-13: Object Schema Service running on port 3013
    - MS-14: Layout Service running on port 3014
    - MS-19: CTI Adapter Service running on port 3019
    - All services respond to /health endpoint
    - _Requirements: 20.1_
  
  - [ ] 12.1.2 Verify database schemas implemented
    - knowledge_db: 4 tables (kb_articles, kb_folders, kb_bookmarks, kb_ratings)
    - bfsi_db: 3 tables (bank_products, product_transactions, core_banking_cache)
    - ai_db: 4 tables (ai_requests, ai_responses, prompt_templates, ai_cache)
    - media_db: 3 tables (media_files, file_metadata, recording_metadata)
    - audit_db: 1 table (audit_logs with RLS)
    - object_schema_db: 5 tables (object_types, field_definitions, object_relationships, schema_versions, field_validation_rules)
    - layout_db: 4 tables (layouts, layout_sections, layout_fields, layout_versions)
    - cti_db: 5 tables (cti_configs, cti_vendors, extension_mappings, call_states, cti_events)
    - Dynamic fields columns added to interactions, tickets, customers tables
    - All indexes and constraints created
    - _Requirements: 20.15, 17.1-17.8_

- [ ] 12.2 Feature Functionality Verification
  - [ ] 12.2.1 Verify Elasticsearch full-text search
    - Create test KB article
    - Search for article by title, summary, content
    - Verify results returned in < 500ms
    - Verify relevance scoring (title boosted 3x, summary 2x)
    - _Requirements: 20.2_
  
  - [ ] 12.2.2 Verify BFSI product queries
    - Configure mock Core Banking adapter
    - Query customer products by CIF
    - Verify realistic sample data returned
    - Verify account number masking for users without permission
    - Verify field-level encryption for sensitive data
    - _Requirements: 20.3, 20.10_
  
  - [ ] 12.2.3 Verify call recording streaming
    - Upload test call recording to SeaweedFS
    - Request streaming URL
    - Verify HTTP range requests supported
    - Verify pre-signed URL expires after 5 minutes
    - _Requirements: 20.4_
  
  - [ ] 12.2.4 Verify AI suggestions
    - Send suggestion request to AI Service
    - Verify response returned in < 2 seconds
    - Verify response cached in Redis for 5 minutes
    - Verify identical request returns cached response
    - _Requirements: 20.5_
  
  - [ ] 12.2.5 Verify CTI call widget
    - Configure FreeSwitch adapter (easiest for testing)
    - Simulate incoming call event
    - Verify call.ringing event emitted via WebSocket
    - Test basic call controls: answer, hold, resume, hangup
    - _Requirements: 20.6_
  
  - [ ] 12.2.6 Verify dynamic fields demonstration
    - Admin adds new field to Ticket schema via Schema Designer
    - Verify schema.updated event published to Kafka
    - Verify Ticket Service cache invalidated
    - Agent opens ticket form
    - Verify new field appears in form within 5 seconds
    - _Requirements: 20.7_
  
  - [ ] 12.2.7 Verify Admin Module operational
    - Access /admin route
    - Verify authentication required
    - Test Schema Designer: create object type, add field
    - Test Layout Designer: create layout, drag-and-drop fields
    - Test User Management: create user, assign roles
    - Test Audit Viewer: view logs, filter, export
    - _Requirements: 20.8_

- [ ] 12.3 Security and Compliance Verification
  - [ ] 12.3.1 Verify audit logs for all operations
    - Perform mutating operations across all services
    - Verify audit logs created in audit_db
    - Verify hash chain integrity
    - Verify RLS prevents UPDATE/DELETE
    - _Requirements: 20.9_
  
  - [ ] 12.3.2 Verify PII field encryption
    - Check database records for encrypted fields
    - Verify phone, email, CIF encrypted in customer_db
    - Verify account_number, balance, card_number encrypted in bfsi_db
    - Verify encryption format: iv:authTag:encrypted
    - _Requirements: 20.10_
  
  - [ ] 12.3.3 Run OWASP ZAP security scan
    - Scan all Phase 2 API endpoints
    - Verify zero critical vulnerabilities
    - Verify zero high vulnerabilities
    - Document medium/low vulnerabilities for future remediation
    - _Requirements: 20.13_

- [ ] 12.4 Testing and Quality Verification
  - [ ] 12.4.1 Verify unit test coverage
    - Run: nx test knowledge-service --coverage
    - Run: nx test bfsi-core-service --coverage
    - Run: nx test ai-service --coverage
    - Run: nx test media-service --coverage
    - Run: nx test audit-service --coverage
    - Run: nx test object-schema-service --coverage
    - Run: nx test layout-service --coverage
    - Run: nx test cti-adapter-service --coverage
    - Verify each service ≥ 70% coverage
    - _Requirements: 20.11, 16.1_
  
  - [ ] 12.4.2 Verify property-based tests
    - Verify 60 property tests implemented (7+7+5+5+5+6+6+6+4+4+5)
    - Run all property tests with 100 iterations each
    - Verify all property tests passing
    - _Requirements: 16.3, 16.4, 16.5_
  
  - [ ] 12.4.3 Verify integration tests
    - Elasticsearch integration tests (Knowledge Service): 4 tests
    - SeaweedFS integration tests (Media Service): 4 tests
    - Redis caching tests (Schema, Layout, AI Services): 6 tests
    - Kafka consumer tests (Audit Service): 3 tests
    - Total: 17+ integration tests passing
    - _Requirements: 16.6, 16.7, 16.8_
  
  - [ ] 12.4.4 Verify E2E tests
    - Progressive loading E2E tests: 5 tests
    - Admin Module E2E tests: 27 tests
    - Total: 32+ E2E tests passing
    - _Requirements: 16.9, 16.10_

- [ ] 12.5 Performance Verification
  - [ ] 12.5.1 Run load tests with 500 concurrent users
    - Use k6 or Artillery for load testing
    - Simulate 500 concurrent agents
    - Test scenarios: search KB, query BFSI, generate AI suggestion, upload file
    - Verify P99 response time < 1 second
    - _Requirements: 20.12, 16.11_
  
  - [ ] 12.5.2 Verify service-specific performance targets
    - Knowledge Service search: P99 < 500ms
    - AI Service suggestions: P99 < 2 seconds
    - Media Service pre-signed URLs: P99 < 100ms
    - Object Schema Service cached schemas: P99 < 50ms
    - Layout Service cached layouts: P99 < 50ms
    - Audit Service event ingestion: ≥ 1000 events/second
    - CTI Adapter call events: P99 < 200ms
    - _Requirements: 15.1-15.7_
  
  - [ ] 12.5.3 Verify caching effectiveness
    - Elasticsearch cluster: 100 concurrent queries, P99 < 500ms
    - Redis cache: 99.9% hit rate for schema and layout queries
    - BFSI Service: 80% reduction in CBS calls due to caching
    - _Requirements: 15.8, 15.10, 15.11_
  
  - [ ] 12.5.4 Verify progressive loading performance
    - Local fields response time: < 200ms
    - Enrichment completion time: < 5 seconds
    - No layout shift during progressive loading
    - _Requirements: 15.12_

- [ ] 12.6 Infrastructure Verification
  - [ ] 12.6.1 Verify Kong API Gateway configuration
    - All 8 Phase 2 services routed correctly
    - Rate limiting applied: 100 req/min standard, 30 req/min admin, 10 req/min AI
    - JWT validation enabled on all endpoints except /health
    - CORS configured for agent.tpb.vn and admin.tpb.vn
    - X-Request-Id header added for distributed tracing
    - _Requirements: 20.14, 19.1-19.12_
  
  - [ ] 12.6.2 Verify Kafka event flows
    - All services publishing events to correct topics
    - Audit Service consuming from all 11 topics
    - Schema.updated events triggering cache invalidation
    - CTI events creating interactions
    - _Requirements: 20.17, 13.1-13.9_
  
  - [ ] 12.6.3 Verify Redis caching
    - Schemas cached with 5-minute TTL
    - Layouts cached with 5-minute TTL
    - AI responses cached with 5-minute TTL
    - BFSI products cached with 5-minute TTL
    - Cache invalidation working on schema/layout updates
    - _Requirements: 20.18_
  
  - [ ] 12.6.4 Verify Elasticsearch cluster
    - Cluster health: green
    - KB articles index created with correct mapping
    - Full-text search working with standard analyzer
    - _Requirements: 20.2_
  
  - [ ] 12.6.5 Verify SeaweedFS storage
    - S3-compatible API accessible
    - File upload working
    - Pre-signed URL generation working
    - Thumbnail generation working for images
    - _Requirements: 20.4_

- [ ] 12.7 Documentation and Handoff
  - [ ] 12.7.1 Update phase-tracker.md
    - Mark Phase 2 as complete
    - Document completion date
    - Update service count: 14 operational (6 Phase 1 + 8 Phase 2)
    - Update test count: 112 Phase 1 + 150+ Phase 2 = 262+ total
    - Document lessons learned
  
  - [ ] 12.7.2 Update API contracts registry
    - Mark all Phase 2 endpoints as implemented
    - Document any deviations from spec
    - Update endpoint count: 73 Phase 1 + 69 Phase 2 = 142 total
  
  - [ ] 12.7.3 Update database schemas registry
    - Mark all Phase 2 databases as implemented
    - Document final table counts and indexes
    - Update database count: 6 Phase 1 + 8 Phase 2 = 14 total
  
  - [ ] 12.7.4 Create Phase 2 verification script
    - Create infra/scripts/verify-phase-2.sh
    - Check all 8 services running
    - Check all databases accessible
    - Check Elasticsearch, SeaweedFS, Redis, Kafka healthy
    - Run subset of critical tests
    - Output verification report

- [ ] 12.8 Final Checkpoint - Phase 2 Complete
  - All 8 Phase 2 services operational ✓
  - All 8 Phase 2 databases implemented ✓
  - Elasticsearch full-text search working ✓
  - BFSI product queries with mock adapter ✓
  - Call recording streaming operational ✓
  - AI suggestions working with caching ✓
  - CTI call widget connected ✓
  - Dynamic fields demonstration successful ✓
  - Admin Module operational ✓
  - Audit logs for all operations ✓
  - PII fields encrypted at rest ✓
  - Unit test coverage ≥ 70% ✓
  - Load testing with 500 users passing ✓
  - Zero critical security vulnerabilities ✓
  - Kong API Gateway configured ✓
  - Progressive loading working ✓
  - Kafka event flows operational ✓
  - Redis caching working ✓
  - **Phase 2 is COMPLETE - Ready for Go-Live 2**

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at end of each sprint
- Property tests validate universal correctness properties with 100 iterations each
- Integration tests verify external system integrations (Elasticsearch, SeaweedFS, Redis, Kafka)
- E2E tests validate complete user flows in Admin Module and progressive loading
- Phase 2 adds 8 services, 8 databases, 69 API endpoints, 150+ tests
- Total system after Phase 2: 14 services, 14 databases, 142 API endpoints, 262+ tests

