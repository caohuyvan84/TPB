# Design Document: Phase 2 Advanced Features

## Overview

Phase 2 extends the TPB CRM Platform with 8 new microservices that transform the system from a core MVP into a feature-rich enterprise CRM. This phase introduces knowledge management with Elasticsearch full-text search, BFSI core banking integration, AI-powered agent assistance, media storage and call recording streaming, comprehensive immutable audit trails with tamper detection, dynamic object schema management supporting 22 field types, flexible UI layout configuration across 9 contexts, and multi-vendor CTI integration supporting 4 PBX systems.

**Phase 1 Foundation (Complete):**
- 6 operational services with 112/112 tests passing
- Database schemas: 17 tables, 29 indexes across 6 databases
- Kong API Gateway with rate limiting and CORS
- Agent Desktop with real backend APIs

**Phase 2 Services:**
1. **MS-7: Knowledge Service** - Elasticsearch-powered knowledge base with full-text search, hierarchical folders, bookmarks, and ratings
2. **MS-8: BFSI Core Banking Service** - Integration with Core Banking System for product queries (accounts, savings, loans, cards) with field-level encryption and circuit breaker pattern
3. **MS-9: AI Service** - LLM-powered response suggestions, summarization, sentiment analysis, and ticket classification with Redis caching
4. **MS-10: Media Service** - SeaweedFS-based file storage with call recording streaming, thumbnail generation, and lifecycle policies
5. **MS-11: Audit Service** - Immutable audit logs with hash chaining for tamper detection, consuming events from all Kafka topics
6. **MS-13: Object Schema Service** - Dynamic schema management with 22 field types, validation rules, versioning, and Redis caching
7. **MS-14: Layout Service** - Flexible UI layout configuration across 9 contexts with drag-and-drop designer and conditional visibility
8. **MS-19: CTI Adapter Service** - Multi-vendor telephony integration supporting Cisco Webex Contact Center, Cisco PCCE, FreeSwitch, and Portsip

**Key Architectural Patterns:**
- **Progressive Loading**: Local data displays immediately (<200ms), enrichment fields load asynchronously (<5s) with WebSocket updates
- **Dynamic Fields**: JSONB columns in existing services (MS-3, MS-4, MS-5, MS-7, MS-8) enable custom fields without schema migrations
- **Circuit Breaker**: BFSI service protects against Core Banking System failures with 5-failure threshold and 30-second timeout
- **Hash Chaining**: Audit logs implement tamper detection with SHA-256 hash chains linking each entry to the previous
- **Adapter Pattern**: CTI service abstracts vendor-specific SDKs behind a unified interface
- **Schema Versioning**: Object schemas track versions, publish Kafka events on changes, and invalidate Redis cache

**Technology Stack:**
- Backend: NestJS, TypeScript, PostgreSQL 18, TypeORM
- Search: Elasticsearch 9.3.0 with Kibana
- Cache: Redis 8.6 (5-minute TTL for schemas/layouts)
- Storage: SeaweedFS (S3-compatible)
- Events: Kafka 4.2.0 (KRaft mode)
- AI: OpenAI API + local LLM adapter
- Frontend: React 19.2.x, TanStack Query, shadcn/ui


## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Kong API Gateway (Port 8000)                         │
│                    JWT Validation, Rate Limiting, CORS                       │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────┐            ┌─────────┐            ┌─────────┐
   │  MS-7   │            │  MS-8   │            │  MS-9   │
   │Knowledge│            │  BFSI   │            │   AI    │
   │ :3007   │            │ :3008   │            │ :3009   │
   └────┬────┘            └────┬────┘            └────┬────┘
        │                      │                      │
        │                      │                      │
        ▼                      ▼                      ▼
   ┌─────────┐            ┌─────────┐            ┌─────────┐
   │  MS-10  │            │  MS-11  │            │  MS-13  │
   │  Media  │            │  Audit  │            │ Schema  │
   │ :3010   │            │ :3011   │            │ :3013   │
   └────┬────┘            └────┬────┘            └────┬────┘
        │                      │                      │
        │                      │                      │
        ▼                      ▼                      ▼
   ┌─────────┐            ┌─────────┐            ┌─────────┐
   │  MS-14  │            │  MS-19  │            │ Phase 1 │
   │ Layout  │            │   CTI   │            │Services │
   │ :3014   │            │ :3019   │            │ (6 svcs)│
   └────┬────┘            └────┬────┘            └────┬────┘
        │                      │                      │
        └──────────────────────┴──────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────────────┐
        │         Kafka Event Bus (KRaft Mode)               │
        │  Topics: kb-events, ai-events, media-events,       │
        │  schema-events, layout-events, cti-events          │
        └────────────────────────────────────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────────────┐
        │              Infrastructure Services                │
        │  PostgreSQL 18 (8 new DBs) | Redis 8.6             │
        │  Elasticsearch 9.3.0 | SeaweedFS | Temporal        │
        └────────────────────────────────────────────────────┘
```

### Service Communication Patterns

**Synchronous (REST over mTLS):**
- Frontend → Kong → Services (all API calls)
- Object Services → Object_Schema_Service (schema validation)
- Object Services → Layout_Service (layout retrieval)
- BFSI_Service → Core Banking System (product queries)
- AI_Service → OpenAI API / Local LLM (generation)
- Media_Service → SeaweedFS (file operations)

**Asynchronous (Kafka Events):**
- All Services → Audit_Service (audit events)
- Object_Schema_Service → Object Services (schema.updated)
- Layout_Service → Frontend (layout.updated)
- CTI_Adapter_Service → Interaction_Service (call.incoming)
- CTI_Adapter_Service → Agent_Service (agent.status.changed)

**Real-Time (WebSocket):**
- `/ws/objects/{objectType}/{objectId}/fields` - Progressive loading updates
- `/ws/cti/{agentId}/call` - Bidirectional call control
- `/ws/notifications/{agentId}` - Push notifications (Phase 1)

**Caching Strategy (Redis):**
- Object schemas: 5-minute TTL, invalidate on schema.updated event
- Layouts: 5-minute TTL, invalidate on layout.updated event
- AI responses: 5-minute TTL, keyed by request hash
- BFSI products: 5-minute TTL, fallback on Core Banking failure
- CTI call state: No TTL, cleared on call.ended



## Components and Interfaces

### MS-7: Knowledge Service

**Purpose:** Elasticsearch-powered knowledge base with full-text search, hierarchical folders, bookmarks, and ratings.

**Core Components:**
- `KnowledgeController` - REST API endpoints for articles, folders, bookmarks
- `KnowledgeService` - Business logic for article management
- `ElasticsearchService` - Full-text search indexing and querying
- `ArticleRepository` - PostgreSQL data access
- `FolderRepository` - Hierarchical folder management
- `BookmarkRepository` - User bookmark associations

**API Endpoints:**
```typescript
// Article Management
GET    /api/v1/kb/articles              // Search with filters
GET    /api/v1/kb/articles/:id          // Get article detail
POST   /api/v1/kb/articles              // Create article
PATCH  /api/v1/kb/articles/:id          // Update article
DELETE /api/v1/kb/articles/:id          // Soft delete article
GET    /api/v1/kb/articles/:id/related  // Get related articles

// Folder Management
GET    /api/v1/kb/folders               // Get folder tree
POST   /api/v1/kb/folders               // Create folder
PATCH  /api/v1/kb/folders/:id           // Update folder
DELETE /api/v1/kb/folders/:id           // Delete folder

// Bookmarks
GET    /api/v1/kb/bookmarks             // List user bookmarks
POST   /api/v1/kb/bookmarks             // Add bookmark
DELETE /api/v1/kb/bookmarks/:id         // Remove bookmark

// Ratings
POST   /api/v1/kb/articles/:id/rate    // Rate article (1-5)
```

**Request/Response Schemas:**
```typescript
interface KBArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  category: string;
  folderId: string;
  viewCount: number;
  rating: number;
  dynamicFields: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface SearchArticlesRequest {
  query: string;
  tags?: string[];
  category?: string;
  folderId?: string;
  limit?: number;
  offset?: number;
}

interface SearchArticlesResponse {
  articles: KBArticle[];
  total: number;
  took: number; // Elasticsearch query time in ms
}
```

**Elasticsearch Integration:**
```typescript
// Index mapping
const articleIndexMapping = {
  properties: {
    title: { type: 'text', analyzer: 'standard' },
    summary: { type: 'text', analyzer: 'standard' },
    content: { type: 'text', analyzer: 'standard' },
    tags: { type: 'keyword' },
    category: { type: 'keyword' },
    folderId: { type: 'keyword' },
    viewCount: { type: 'integer' },
    rating: { type: 'float' },
    createdAt: { type: 'date' }
  }
};

// Search query with relevance scoring
const searchQuery = {
  bool: {
    must: [
      {
        multi_match: {
          query: searchTerm,
          fields: ['title^3', 'summary^2', 'content'],
          type: 'best_fields'
        }
      }
    ],
    filter: [
      { terms: { tags: filterTags } },
      { term: { category: filterCategory } }
    ]
  }
};
```

### MS-8: BFSI Core Banking Service

**Purpose:** Integration with Core Banking System for product queries with field-level encryption and circuit breaker.

**Core Components:**
- `BFSIController` - REST API endpoints for banking products
- `BFSIService` - Business logic with circuit breaker
- `CoreBankingAdapter` - Abstract interface for CBS integration
- `MockCoreBankingAdapter` - Development/testing adapter
- `EncryptionService` - AES-256-GCM field-level encryption
- `ProductRepository` - Cached product data

**API Endpoints:**
```typescript
GET /api/v1/bfsi/customers/:cif/accounts        // Account products
GET /api/v1/bfsi/customers/:cif/savings         // Savings products
GET /api/v1/bfsi/customers/:cif/loans           // Loan products
GET /api/v1/bfsi/customers/:cif/cards           // Card products
GET /api/v1/bfsi/customers/:cif/transactions    // Transaction history
POST /api/v1/bfsi/query                         // General CBS query
```

**Request/Response Schemas:**
```typescript
interface BankProduct {
  id: string;
  customerId: string;
  type: 'account' | 'savings' | 'loan' | 'card' | 'digital_banking' | 
        'payments' | 'investments' | 'merchant_services';
  accountNumber: string;      // Encrypted at rest, masked in response
  balance: number;            // Encrypted at rest
  status: 'active' | 'inactive' | 'closed';
  openedDate: string;
  dynamicFields: Record<string, any>;
  _cached?: boolean;          // Indicates if data is from cache
  _cacheAge?: number;         // Cache age in seconds
}

interface TransactionHistoryRequest {
  cif: string;
  accountNumber?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface TransactionHistoryResponse {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}
```

**Circuit Breaker Implementation:**
```typescript
@Injectable()
export class BFSIService {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    timeout: 30000, // 30 seconds
    resetTimeout: 30000
  });

  async getCustomerProducts(cif: string): Promise<BankProduct[]> {
    try {
      return await this.circuitBreaker.execute(async () => {
        return await this.coreBankingAdapter.queryProducts(cif);
      });
    } catch (error) {
      // Circuit open, return cached data if available
      const cached = await this.getCachedProducts(cif);
      if (cached && this.isCacheFresh(cached, 300)) { // 5 minutes
        return cached.map(p => ({ ...p, _cached: true, _cacheAge: cached.age }));
      }
      throw error;
    }
  }
}
```

**Field-Level Encryption:**
```typescript
@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
```

### MS-9: AI Service

**Purpose:** LLM-powered response suggestions, summarization, sentiment analysis, and ticket classification.

**Core Components:**
- `AIController` - REST API endpoints for AI operations
- `AIService` - Business logic with caching
- `LLMAdapter` - Abstract interface for LLM providers
- `OpenAIAdapter` - OpenAI API integration
- `LocalLLMAdapter` - Local LLM integration
- `PromptTemplateRepository` - Configurable prompts

**API Endpoints:**
```typescript
POST /api/v1/ai/suggest       // Generate response suggestions
POST /api/v1/ai/summarize     // Summarize interaction
POST /api/v1/ai/sentiment     // Analyze sentiment
POST /api/v1/ai/classify      // Classify ticket
POST /api/v1/ai/generate      // General text generation
```

**Request/Response Schemas:**
```typescript
interface SuggestRequest {
  interactionId: string;
  context: {
    customerMessage: string;
    interactionHistory: string[];
    customerProfile: any;
  };
  tone?: 'professional' | 'friendly' | 'empathetic';
}

interface SuggestResponse {
  suggestions: string[];
  confidence: number;
  cached: boolean;
}

interface SummarizeRequest {
  interactionId: string;
  content: string;
  maxWords?: number;
}

interface SummarizeResponse {
  summary: string;
  wordCount: number;
  keyPoints: string[];
}

interface SentimentRequest {
  text: string;
}

interface SentimentResponse {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  confidence: number;
  scores: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

interface ClassifyRequest {
  ticketTitle: string;
  ticketDescription: string;
}

interface ClassifyResponse {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
}
```

**LLM Adapter Interface:**
```typescript
interface LLMAdapter {
  generateCompletion(prompt: string, options?: LLMOptions): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  isAvailable(): Promise<boolean>;
}

@Injectable()
export class OpenAIAdapter implements LLMAdapter {
  async generateCompletion(prompt: string, options?: LLMOptions): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: options?.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 500
    });
    return response.choices[0].message.content;
  }
}
```

**Redis Caching Strategy:**
```typescript
@Injectable()
export class AIService {
  async generateSuggestion(request: SuggestRequest): Promise<SuggestResponse> {
    // Generate cache key from request hash
    const cacheKey = `ai:suggest:${this.hashRequest(request)}`;
    
    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { ...JSON.parse(cached), cached: true };
    }
    
    // Generate new response
    const suggestions = await this.llmAdapter.generateCompletion(
      this.buildPrompt(request)
    );
    
    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(suggestions));
    
    return { suggestions, cached: false };
  }
}
```

### MS-10: Media Service

**Purpose:** SeaweedFS-based file storage with call recording streaming and thumbnail generation.

**Core Components:**
- `MediaController` - REST API endpoints for file operations
- `MediaService` - Business logic for uploads/downloads
- `SeaweedFSService` - S3-compatible storage integration
- `ThumbnailService` - Image thumbnail generation
- `RecordingRepository` - Call recording metadata

**API Endpoints:**
```typescript
POST   /api/v1/media/upload                    // Upload file
GET    /api/v1/media/:id/url                   // Get pre-signed URL
GET    /api/v1/media/recordings/:interactionId // List recordings
GET    /api/v1/media/recordings/:id/stream     // Stream recording
DELETE /api/v1/media/:id                       // Delete file
```

**Request/Response Schemas:**
```typescript
interface UploadFileRequest {
  file: Buffer;
  filename: string;
  mimeType: string;
  metadata?: {
    interactionId?: string;
    uploadedBy: string;
    tags?: string[];
  };
}

interface UploadFileResponse {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
}

interface CallRecording {
  id: string;
  interactionId: string;
  duration: number;
  quality: 'low' | 'medium' | 'high';
  fileSize: number;
  format: 'mp3' | 'wav' | 'ogg';
  streamUrl: string;
  createdAt: string;
}
```

**SeaweedFS Integration:**
```typescript
@Injectable()
export class SeaweedFSService {
  private s3Client: S3Client;

  async uploadFile(file: Buffer, key: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: mimeType
    });
    
    await this.s3Client.send(command);
    return key;
  }

  async getPresignedUrl(key: string, expiresIn: number = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getStreamingUrl(key: string): Promise<string> {
    // Generate pre-signed URL with range request support
    return await this.getPresignedUrl(key, 300);
  }
}
```

**Thumbnail Generation:**
```typescript
@Injectable()
export class ThumbnailService {
  async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    return await sharp(imageBuffer)
      .resize(200, 200, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
}
```

### MS-11: Audit Service

**Purpose:** Immutable audit logs with hash chaining for tamper detection.

**Core Components:**
- `AuditController` - REST API endpoints for audit queries
- `AuditService` - Business logic for log ingestion
- `KafkaConsumerService` - Consume events from all topics
- `HashChainService` - Compute and verify hash chains
- `AuditRepository` - Append-only data access

**API Endpoints:**
```typescript
GET /api/v1/audit/logs              // Query audit logs (admin only)
GET /api/v1/audit/logs/:id          // Get specific log entry
POST /api/v1/audit/verify           // Verify hash chain integrity
GET /api/v1/audit/export            // Export logs (JSON/CSV)
```

**Request/Response Schemas:**
```typescript
interface AuditLog {
  id: string;
  sequence: number;
  tenantId: string;
  eventType: string;
  actorId: string;
  actorRole: string;
  resourceType: string;
  resourceId: string;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  prevHash: string;
  eventHash: string;
  occurredAt: string;
  createdAt: string;
}

interface QueryAuditLogsRequest {
  eventType?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface VerifyHashChainResponse {
  valid: boolean;
  totalEntries: number;
  brokenLinks: Array<{
    sequence: number;
    expectedHash: string;
    actualHash: string;
  }>;
}
```

**Hash Chain Implementation:**
```typescript
@Injectable()
export class HashChainService {
  computeEventHash(event: AuditLog, prevHash: string): string {
    const data = JSON.stringify({
      sequence: event.sequence,
      eventType: event.eventType,
      actorId: event.actorId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      action: event.action,
      occurredAt: event.occurredAt,
      prevHash
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async verifyChain(startSequence: number, endSequence: number): Promise<VerifyHashChainResponse> {
    const logs = await this.auditRepository.findBySequenceRange(startSequence, endSequence);
    const brokenLinks = [];
    
    for (let i = 1; i < logs.length; i++) {
      const expectedHash = this.computeEventHash(logs[i], logs[i-1].eventHash);
      if (expectedHash !== logs[i].eventHash) {
        brokenLinks.push({
          sequence: logs[i].sequence,
          expectedHash,
          actualHash: logs[i].eventHash
        });
      }
    }
    
    return {
      valid: brokenLinks.length === 0,
      totalEntries: logs.length,
      brokenLinks
    };
  }
}
```

**Kafka Consumer:**
```typescript
@Injectable()
export class KafkaConsumerService implements OnModuleInit {
  private topics = [
    'agent-events',
    'interaction-events',
    'ticket-events',
    'customer-events',
    'notification-events',
    'kb-events',
    'ai-events',
    'media-events',
    'schema-events',
    'layout-events',
    'cti-events'
  ];

  async onModuleInit() {
    await this.consumer.subscribe({ topics: this.topics });
    
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        await this.auditService.createAuditLog(event);
      }
    });
  }
}
```



### MS-13: Object Schema Service

**Purpose:** Dynamic schema management with 22 field types, validation rules, and versioning.

**Core Components:**
- `SchemaController` - REST API endpoints for schema operations
- `SchemaService` - Business logic for schema management
- `ObjectTypeRepository` - Object type definitions
- `FieldDefinitionRepository` - Field metadata
- `SchemaVersionRepository` - Version history
- `SchemaParser` - JSON to entity parsing
- `SchemaPrinter` - Entity to JSON serialization

**API Endpoints:**
```typescript
// Public Schema API
GET /api/v1/schemas/:objectType                    // Get current schema
GET /api/v1/schemas/:objectType/version/:ver       // Get specific version

// Admin Schema Management
GET    /api/v1/admin/object-types                  // List all object types
GET    /api/v1/admin/object-types/:name            // Get object type detail
POST   /api/v1/admin/object-types                  // Create object type
PUT    /api/v1/admin/object-types/:name            // Update object type
DELETE /api/v1/admin/object-types/:name            // Delete object type

// Field Management
GET    /api/v1/admin/object-types/:name/fields     // List fields
POST   /api/v1/admin/object-types/:name/fields     // Add field
PUT    /api/v1/admin/object-types/:name/fields/:id // Update field
DELETE /api/v1/admin/object-types/:name/fields/:id // Remove field

// Impact Analysis
GET /api/v1/admin/object-types/:name/impact        // Analyze field usage
```

**Request/Response Schemas:**
```typescript
interface ObjectType {
  id: string;
  name: string;
  displayName: string;
  displayNamePlural: string;
  icon: string;
  version: number;
  isSystem: boolean;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

interface FieldDefinition {
  id: string;
  objectTypeId: string;
  name: string;
  displayName: string;
  fieldType: FieldType;
  dataSource: 'local' | 'enrichment' | 'computed' | 'reference';
  enrichmentSourceId?: string;
  isRequired: boolean;
  isReadOnly: boolean;
  isSearchable: boolean;
  isSortable: boolean;
  isFilterable: boolean;
  isSensitive: boolean;
  isUnique: boolean;
  isCore: boolean;
  defaultValue?: any;
  validationRules: ValidationRule[];
  displayConfig: DisplayConfig;
  sortOrder: number;
  groupName?: string;
}

type FieldType = 
  | 'text' | 'long_text' | 'rich_text'
  | 'number' | 'decimal' | 'currency'
  | 'date' | 'datetime' | 'boolean'
  | 'enum' | 'multi_enum'
  | 'email' | 'phone' | 'url'
  | 'file' | 'image' | 'json'
  | 'reference' | 'multi_reference'
  | 'rating' | 'color' | 'tag';

interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

interface DisplayConfig {
  placeholder?: string;
  helpText?: string;
  width?: 'quarter' | 'third' | 'half' | 'two-thirds' | 'full';
  renderer?: 'default' | 'badge' | 'link' | 'avatar' | 'progress' | 'sparkline' | 'custom';
  options?: any; // Field-type specific options
}
```

**Schema Parser and Printer:**
```typescript
@Injectable()
export class SchemaParser {
  parse(json: string): ObjectType {
    const data = JSON.parse(json);
    
    // Validate structure
    this.validateSchema(data);
    
    // Convert to entity
    const objectType = new ObjectType();
    objectType.name = data.name;
    objectType.displayName = data.displayName;
    objectType.displayNamePlural = data.displayNamePlural;
    objectType.icon = data.icon;
    objectType.fields = data.fields.map(f => this.parseField(f));
    
    return objectType;
  }
  
  private validateSchema(data: any): void {
    if (!data.name || !data.displayName) {
      throw new Error('Schema must have name and displayName');
    }
    
    if (!Array.isArray(data.fields)) {
      throw new Error('Schema must have fields array');
    }
    
    // Validate field names are unique
    const fieldNames = data.fields.map(f => f.name);
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate field names: ${duplicates.join(', ')}`);
    }
  }
}

@Injectable()
export class SchemaPrinter {
  print(objectType: ObjectType): string {
    const data = {
      name: objectType.name,
      displayName: objectType.displayName,
      displayNamePlural: objectType.displayNamePlural,
      icon: objectType.icon,
      version: objectType.version,
      fields: objectType.fields.map(f => this.printField(f))
    };
    
    return JSON.stringify(data, null, 2);
  }
  
  private printField(field: FieldDefinition): any {
    return {
      name: field.name,
      displayName: field.displayName,
      fieldType: field.fieldType,
      dataSource: field.dataSource,
      isRequired: field.isRequired,
      isReadOnly: field.isReadOnly,
      validationRules: field.validationRules,
      displayConfig: field.displayConfig
    };
  }
}
```

**Schema Versioning:**
```typescript
@Injectable()
export class SchemaService {
  async updateObjectType(name: string, updates: Partial<ObjectType>): Promise<ObjectType> {
    const objectType = await this.objectTypeRepository.findByName(name);
    
    // Create version snapshot
    await this.schemaVersionRepository.create({
      objectTypeId: objectType.id,
      version: objectType.version,
      schema: this.schemaPrinter.print(objectType),
      createdAt: new Date()
    });
    
    // Increment version
    objectType.version += 1;
    Object.assign(objectType, updates);
    
    await this.objectTypeRepository.save(objectType);
    
    // Publish schema.updated event
    await this.kafkaService.emit('schema-events', {
      eventType: 'schema.updated',
      objectType: name,
      version: objectType.version,
      changes: this.computeChanges(objectType, updates)
    });
    
    // Invalidate Redis cache
    await this.redis.del(`schema:${name}`);
    
    return objectType;
  }
}
```

### MS-14: Layout Service

**Purpose:** Flexible UI layout configuration across 9 contexts with conditional visibility.

**Core Components:**
- `LayoutController` - REST API endpoints for layout operations
- `LayoutService` - Business logic for layout management
- `LayoutRepository` - Layout configurations
- `LayoutParser` - JSON to entity parsing
- `LayoutPrinter` - Entity to JSON serialization
- `VisibilityEvaluator` - Conditional visibility logic

**API Endpoints:**
```typescript
// Public Layout API
GET /api/v1/layouts/:objectType                    // Get active layouts
GET /api/v1/layouts/:objectType/:context           // Get layout for context

// Admin Layout Management
GET    /api/v1/admin/layouts                       // List all layouts
GET    /api/v1/admin/layouts/:id                   // Get layout detail
POST   /api/v1/admin/layouts                       // Create layout
PUT    /api/v1/admin/layouts/:id                   // Update layout
DELETE /api/v1/admin/layouts/:id                   // Delete layout
POST   /api/v1/admin/layouts/:id/activate          // Set as default
POST   /api/v1/admin/layouts/:id/rollback/:version // Rollback to version
```

**Request/Response Schemas:**
```typescript
interface Layout {
  id: string;
  tenantId: string;
  objectType: string;
  context: LayoutContext;
  name: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  roleRestrictions: string[];
  config: LayoutConfig;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

type LayoutContext = 
  | 'detail_full' | 'detail_compact'
  | 'create' | 'edit' | 'quick_edit'
  | 'list_item' | 'list_table'
  | 'preview' | 'print';

interface LayoutConfig {
  columns: 1 | 2 | 3 | 4;
  sections: LayoutSection[];
}

interface LayoutSection {
  id: string;
  title: string;
  collapsible: boolean;
  defaultCollapsed: boolean;
  fields: LayoutField[];
  visibilityRule?: VisibilityRule;
}

interface LayoutField {
  fieldId: string;
  width: 'quarter' | 'third' | 'half' | 'two-thirds' | 'full';
  renderer?: string;
  visibilityRule?: VisibilityRule;
}

interface VisibilityRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
  value?: any;
}
```

**Layout Parser and Printer:**
```typescript
@Injectable()
export class LayoutParser {
  parse(json: string): Layout {
    const data = JSON.parse(json);
    
    // Validate structure
    this.validateLayout(data);
    
    // Convert to entity
    const layout = new Layout();
    layout.objectType = data.objectType;
    layout.context = data.context;
    layout.name = data.name;
    layout.config = this.parseConfig(data.config);
    
    return layout;
  }
  
  private validateLayout(data: any): void {
    if (!data.objectType || !data.context || !data.name) {
      throw new Error('Layout must have objectType, context, and name');
    }
    
    if (!data.config || !data.config.sections) {
      throw new Error('Layout must have config with sections');
    }
    
    // Validate all field IDs exist in schema
    const fieldIds = this.extractFieldIds(data.config);
    // This would call Object Schema Service to validate
  }
}

@Injectable()
export class LayoutPrinter {
  print(layout: Layout): string {
    const data = {
      objectType: layout.objectType,
      context: layout.context,
      name: layout.name,
      description: layout.description,
      version: layout.version,
      config: this.printConfig(layout.config)
    };
    
    return JSON.stringify(data, null, 2);
  }
}
```

**Visibility Evaluator:**
```typescript
@Injectable()
export class VisibilityEvaluator {
  evaluate(rule: VisibilityRule, data: Record<string, any>): boolean {
    const fieldValue = data[rule.field];
    
    switch (rule.operator) {
      case 'equals':
        return fieldValue === rule.value;
      case 'notEquals':
        return fieldValue !== rule.value;
      case 'contains':
        return String(fieldValue).includes(rule.value);
      case 'greaterThan':
        return Number(fieldValue) > Number(rule.value);
      case 'lessThan':
        return Number(fieldValue) < Number(rule.value);
      case 'isEmpty':
        return !fieldValue || fieldValue === '';
      case 'isNotEmpty':
        return !!fieldValue && fieldValue !== '';
      default:
        return true;
    }
  }
  
  filterVisibleFields(layout: Layout, data: Record<string, any>): Layout {
    const filteredSections = layout.config.sections
      .filter(section => !section.visibilityRule || this.evaluate(section.visibilityRule, data))
      .map(section => ({
        ...section,
        fields: section.fields.filter(field => 
          !field.visibilityRule || this.evaluate(field.visibilityRule, data)
        )
      }));
    
    return {
      ...layout,
      config: {
        ...layout.config,
        sections: filteredSections
      }
    };
  }
}
```

### MS-19: CTI Adapter Service

**Purpose:** Multi-vendor telephony integration with unified interface.

**Core Components:**
- `CTIController` - REST API endpoints for call control
- `CTIService` - Business logic for call management
- `CTIAdapterFactory` - Create vendor-specific adapters
- `CiscoWebexAdapter` - Cisco Webex Contact Center integration
- `CiscoPCCEAdapter` - Cisco PCCE integration
- `FreeSwitchAdapter` - FreeSwitch integration
- `PortsipAdapter` - Portsip integration
- `CTIGateway` - WebSocket gateway for real-time events
- `CallStateRepository` - Active call state in Redis

**API Endpoints:**
```typescript
// Call Control
POST /api/v1/cti/calls/answer          // Answer incoming call
POST /api/v1/cti/calls/hangup          // End call
POST /api/v1/cti/calls/hold            // Hold call
POST /api/v1/cti/calls/resume          // Resume call
POST /api/v1/cti/calls/mute            // Mute microphone
POST /api/v1/cti/calls/unmute          // Unmute microphone
POST /api/v1/cti/calls/transfer        // Transfer call
POST /api/v1/cti/calls/conference      // Conference call
POST /api/v1/cti/calls/dtmf            // Send DTMF tones
POST /api/v1/cti/calls/make            // Make outbound call

// Admin Configuration
GET   /api/v1/admin/cti/config         // Get CTI configuration
PATCH /api/v1/admin/cti/config         // Update CTI configuration
GET   /api/v1/admin/cti/vendors        // List supported vendors
```

**Request/Response Schemas:**
```typescript
interface CTIConfig {
  id: string;
  tenantId: string;
  vendor: 'cisco-webex' | 'cisco-pcce' | 'freeswitch' | 'portsip';
  connectionParams: Record<string, any>;
  extensionMappings: ExtensionMapping[];
  isActive: boolean;
}

interface ExtensionMapping {
  agentId: string;
  extension: string;
  sipUri?: string;
}

interface CallControlRequest {
  callId: string;
  agentId: string;
}

interface TransferRequest extends CallControlRequest {
  targetExtension: string;
  transferType: 'warm' | 'cold';
}

interface MakeCallRequest {
  agentId: string;
  phoneNumber: string;
  customerId?: string;
}

interface CallState {
  callId: string;
  agentId: string;
  direction: 'inbound' | 'outbound';
  callerNumber: string;
  calledNumber: string;
  status: 'ringing' | 'connected' | 'held' | 'ended';
  startTime: string;
  answerTime?: string;
  endTime?: string;
  duration?: number;
}
```

**CTI Adapter Interface:**
```typescript
interface CTIAdapter {
  // Lifecycle
  initialize(config: CTIConfig): Promise<void>;
  login(agentId: string, extension: string): Promise<void>;
  logout(agentId: string): Promise<void>;
  
  // Status Management
  setStatus(agentId: string, status: AgentStatus): Promise<void>;
  
  // Call Control
  answer(callId: string): Promise<void>;
  hangup(callId: string): Promise<void>;
  hold(callId: string): Promise<void>;
  resume(callId: string): Promise<void>;
  mute(callId: string): Promise<void>;
  unmute(callId: string): Promise<void>;
  transfer(callId: string, targetExtension: string, type: 'warm' | 'cold'): Promise<void>;
  conference(callId: string, targetExtension: string): Promise<void>;
  sendDTMF(callId: string, digits: string): Promise<void>;
  makeCall(agentId: string, phoneNumber: string): Promise<string>;
  
  // Event Handling
  on(event: CTIEvent, handler: (data: any) => void): void;
  off(event: CTIEvent, handler: (data: any) => void): void;
  
  // Connection Management
  isConnected(): boolean;
  reconnect(): Promise<void>;
}

type CTIEvent = 
  | 'call.ringing' | 'call.connected' | 'call.held' | 'call.resumed'
  | 'call.ended' | 'call.transferred' | 'call.muted' | 'call.unmuted'
  | 'agent.status.changed' | 'error' | 'connection.state.changed';
```

**Cisco Webex Adapter Implementation:**
```typescript
@Injectable()
export class CiscoWebexAdapter implements CTIAdapter {
  private webexClient: any;
  private eventHandlers = new Map<CTIEvent, Set<Function>>();
  
  async initialize(config: CTIConfig): Promise<void> {
    this.webexClient = new WebexContactCenter({
      apiKey: config.connectionParams.apiKey,
      orgId: config.connectionParams.orgId,
      dataCenter: config.connectionParams.dataCenter
    });
    
    await this.webexClient.connect();
    this.setupEventListeners();
  }
  
  async answer(callId: string): Promise<void> {
    await this.webexClient.voice.answer({ callId });
    this.emit('call.connected', { callId, timestamp: new Date().toISOString() });
  }
  
  async hold(callId: string): Promise<void> {
    await this.webexClient.voice.hold({ callId });
    this.emit('call.held', { callId, timestamp: new Date().toISOString() });
  }
  
  async transfer(callId: string, targetExtension: string, type: 'warm' | 'cold'): Promise<void> {
    if (type === 'warm') {
      await this.webexClient.voice.consultTransfer({ callId, destination: targetExtension });
    } else {
      await this.webexClient.voice.blindTransfer({ callId, destination: targetExtension });
    }
    this.emit('call.transferred', { callId, targetExtension, type });
  }
  
  private setupEventListeners(): void {
    this.webexClient.on('call:incoming', (data) => {
      this.emit('call.ringing', {
        callId: data.callId,
        callerNumber: data.from,
        queueId: data.queueId,
        timestamp: new Date().toISOString()
      });
    });
    
    this.webexClient.on('call:ended', (data) => {
      this.emit('call.ended', {
        callId: data.callId,
        duration: data.duration,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  on(event: CTIEvent, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }
  
  private emit(event: CTIEvent, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}
```

**Reconnection Logic:**
```typescript
@Injectable()
export class CTIService {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff
  
  async handleDisconnection(agentId: string): Promise<void> {
    this.reconnectAttempts = 0;
    await this.attemptReconnect(agentId);
  }
  
  private async attemptReconnect(agentId: string): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`Max reconnection attempts reached for agent ${agentId}`);
      return;
    }
    
    const delay = this.reconnectDelays[this.reconnectAttempts];
    this.logger.log(`Attempting reconnection ${this.reconnectAttempts + 1} in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      const adapter = this.getAdapterForAgent(agentId);
      await adapter.reconnect();
      this.reconnectAttempts = 0;
      this.logger.log(`Successfully reconnected agent ${agentId}`);
    } catch (error) {
      this.reconnectAttempts++;
      await this.attemptReconnect(agentId);
    }
  }
}
```



## Data Models

### Database Schemas

#### knowledge_db (MS-7)

```sql
-- KB Articles
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  folder_id UUID REFERENCES kb_folders(id) ON DELETE SET NULL,
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  dynamic_fields JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_length CHECK (char_length(content) BETWEEN 10 AND 100000)
);

CREATE INDEX idx_kb_articles_tenant ON kb_articles(tenant_id);
CREATE INDEX idx_kb_articles_folder ON kb_articles(folder_id);
CREATE INDEX idx_kb_articles_category ON kb_articles(category);
CREATE INDEX idx_kb_articles_tags ON kb_articles USING GIN(tags);
CREATE INDEX idx_kb_articles_created ON kb_articles(created_at DESC);

-- KB Folders (hierarchical)
CREATE TABLE kb_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES kb_folders(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_folders_tenant ON kb_folders(tenant_id);
CREATE INDEX idx_kb_folders_parent ON kb_folders(parent_id);

-- KB Bookmarks
CREATE TABLE kb_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

CREATE INDEX idx_kb_bookmarks_user ON kb_bookmarks(user_id);
CREATE INDEX idx_kb_bookmarks_article ON kb_bookmarks(article_id);

-- KB Ratings
CREATE TABLE kb_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

CREATE INDEX idx_kb_ratings_article ON kb_ratings(article_id);
```

#### bfsi_db (MS-8)

```sql
-- Bank Products
CREATE TABLE bank_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'account', 'savings', 'loan', 'card', 
    'digital_banking', 'payments', 'investments', 'merchant_services'
  )),
  account_number TEXT NOT NULL,  -- Encrypted at rest
  balance DECIMAL(20,2),         -- Encrypted at rest
  currency TEXT DEFAULT 'VND',
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'closed')),
  opened_date DATE,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_products_tenant ON bank_products(tenant_id);
CREATE INDEX idx_bank_products_customer ON bank_products(customer_id);
CREATE INDEX idx_bank_products_type ON bank_products(type);
CREATE INDEX idx_bank_products_status ON bank_products(status);

-- Product Transactions
CREATE TABLE product_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES bank_products(id) ON DELETE CASCADE,
  transaction_date TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(20,2) NOT NULL,
  balance_after DECIMAL(20,2),
  description TEXT,
  reference_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_transactions_product ON product_transactions(product_id);
CREATE INDEX idx_product_transactions_date ON product_transactions(transaction_date DESC);

-- Core Banking Cache
CREATE TABLE core_banking_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_core_banking_cache_key ON core_banking_cache(cache_key);
CREATE INDEX idx_core_banking_cache_expires ON core_banking_cache(expires_at);
```

#### ai_db (MS-9)

```sql
-- AI Requests
CREATE TABLE ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN (
    'suggest', 'summarize', 'sentiment', 'classify', 'generate'
  )),
  interaction_id UUID,
  ticket_id UUID,
  prompt_template_id UUID REFERENCES prompt_templates(id),
  input_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_requests_tenant ON ai_requests(tenant_id);
CREATE INDEX idx_ai_requests_agent ON ai_requests(agent_id);
CREATE INDEX idx_ai_requests_type ON ai_requests(request_type);
CREATE INDEX idx_ai_requests_created ON ai_requests(created_at DESC);

-- AI Responses
CREATE TABLE ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES ai_requests(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT,
  output_data JSONB NOT NULL,
  confidence DECIMAL(3,2),
  tokens_used INTEGER,
  latency_ms INTEGER,
  cached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_responses_request ON ai_responses(request_id);

-- Prompt Templates
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_templates_tenant ON prompt_templates(tenant_id);

-- AI Cache
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  response_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);
```

#### media_db (MS-10)

```sql
-- Media Files
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  storage_bucket TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN (
    'audio', 'video', 'document', 'image'
  )),
  uploaded_by UUID NOT NULL,
  interaction_id UUID,
  ticket_id UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_files_tenant ON media_files(tenant_id);
CREATE INDEX idx_media_files_interaction ON media_files(interaction_id);
CREATE INDEX idx_media_files_ticket ON media_files(ticket_id);
CREATE INDEX idx_media_files_type ON media_files(file_type);
CREATE INDEX idx_media_files_created ON media_files(created_at DESC);

-- File Metadata
CREATE TABLE file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  thumbnail_key TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_file_metadata_file ON file_metadata(file_id);

-- Recording Metadata
CREATE TABLE recording_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
  interaction_id UUID NOT NULL,
  call_id TEXT,
  duration INTEGER NOT NULL,
  quality TEXT CHECK (quality IN ('low', 'medium', 'high')),
  format TEXT NOT NULL,
  agent_id UUID,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recording_metadata_file ON recording_metadata(file_id);
CREATE INDEX idx_recording_metadata_interaction ON recording_metadata(interaction_id);
```

#### audit_db (MS-11)

```sql
-- Audit Logs (append-only, immutable)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence BIGSERIAL,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'authentication', 'authorization', 'data-access', 'data-modification',
    'configuration-change', 'external-system-access', 'ai-assistance', 
    'media-access', 'cti-operation'
  )),
  actor_id UUID,
  actor_role TEXT,
  resource_type TEXT,
  resource_id UUID,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  prev_hash TEXT,
  event_hash TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
) WITH (fillfactor = 100);  -- No updates allowed

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_sequence ON audit_logs(sequence);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_occurred ON audit_logs(occurred_at DESC);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);

-- Row-Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE ROLE audit_writer;
CREATE ROLE audit_reader;

CREATE POLICY audit_insert_only ON audit_logs 
  FOR INSERT TO audit_writer 
  WITH CHECK (true);

CREATE POLICY audit_read_admin ON audit_logs 
  FOR SELECT TO audit_reader 
  USING (true);

-- Prevent updates and deletes
CREATE POLICY audit_no_update ON audit_logs 
  FOR UPDATE 
  USING (false);

CREATE POLICY audit_no_delete ON audit_logs 
  FOR DELETE 
  USING (false);
```

#### object_schema_db (MS-13)

```sql
-- Object Types
CREATE TABLE object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  display_name_plural TEXT NOT NULL,
  icon TEXT,
  version INTEGER DEFAULT 1,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_object_types_tenant ON object_types(tenant_id);
CREATE INDEX idx_object_types_name ON object_types(name);

-- Field Definitions
CREATE TABLE field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type_id UUID REFERENCES object_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'long_text', 'rich_text',
    'number', 'decimal', 'currency',
    'date', 'datetime', 'boolean',
    'enum', 'multi_enum',
    'email', 'phone', 'url',
    'file', 'image', 'json',
    'reference', 'multi_reference',
    'rating', 'color', 'tag'
  )),
  data_source TEXT DEFAULT 'local' CHECK (data_source IN (
    'local', 'enrichment', 'computed', 'reference'
  )),
  enrichment_source_id UUID,
  is_required BOOLEAN DEFAULT false,
  is_read_only BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT false,
  is_sortable BOOLEAN DEFAULT false,
  is_filterable BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  is_unique BOOLEAN DEFAULT false,
  is_core BOOLEAN DEFAULT false,
  default_value JSONB,
  validation_rules JSONB DEFAULT '[]',
  display_config JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  group_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (object_type_id, name)
);

CREATE INDEX idx_field_definitions_object_type ON field_definitions(object_type_id);
CREATE INDEX idx_field_definitions_name ON field_definitions(name);
CREATE INDEX idx_field_definitions_sort ON field_definitions(sort_order);

-- Object Relationships
CREATE TABLE object_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_object_type_id UUID REFERENCES object_types(id) ON DELETE CASCADE,
  target_object_type_id UUID REFERENCES object_types(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'one-to-one', 'one-to-many', 'many-to-many'
  )),
  source_field_name TEXT NOT NULL,
  target_field_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_object_relationships_source ON object_relationships(source_object_type_id);
CREATE INDEX idx_object_relationships_target ON object_relationships(target_object_type_id);

-- Schema Versions
CREATE TABLE schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type_id UUID REFERENCES object_types(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  schema_snapshot JSONB NOT NULL,
  changes JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schema_versions_object_type ON schema_versions(object_type_id);
CREATE INDEX idx_schema_versions_version ON schema_versions(version DESC);

-- Field Validation Rules
CREATE TABLE field_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_definition_id UUID REFERENCES field_definitions(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'required', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'custom'
  )),
  rule_value JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_field_validation_rules_field ON field_validation_rules(field_definition_id);
```

#### layout_db (MS-14)

```sql
-- Layouts
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  object_type TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN (
    'detail_full', 'detail_compact',
    'create', 'edit', 'quick_edit',
    'list_item', 'list_table',
    'preview', 'print'
  )),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  role_restrictions TEXT[] DEFAULT '{}',
  config JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_layouts_tenant ON layouts(tenant_id);
CREATE INDEX idx_layouts_object_type ON layouts(object_type);
CREATE INDEX idx_layouts_context ON layouts(context);
CREATE INDEX idx_layouts_default ON layouts(is_default) WHERE is_default = true;

-- Layout Sections
CREATE TABLE layout_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  collapsible BOOLEAN DEFAULT false,
  default_collapsed BOOLEAN DEFAULT false,
  visibility_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_layout_sections_layout ON layout_sections(layout_id);
CREATE INDEX idx_layout_sections_sort ON layout_sections(sort_order);

-- Layout Fields
CREATE TABLE layout_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES layout_sections(id) ON DELETE CASCADE,
  field_id UUID NOT NULL,
  sort_order INTEGER DEFAULT 0,
  width TEXT DEFAULT 'full' CHECK (width IN (
    'quarter', 'third', 'half', 'two-thirds', 'full'
  )),
  renderer TEXT,
  visibility_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_layout_fields_section ON layout_fields(section_id);
CREATE INDEX idx_layout_fields_sort ON layout_fields(sort_order);

-- Layout Versions
CREATE TABLE layout_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  layout_snapshot JSONB NOT NULL,
  changes JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_layout_versions_layout ON layout_versions(layout_id);
CREATE INDEX idx_layout_versions_version ON layout_versions(version DESC);
```

#### cti_db (MS-19)

```sql
-- CTI Configurations
CREATE TABLE cti_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  vendor TEXT NOT NULL CHECK (vendor IN (
    'cisco-webex', 'cisco-pcce', 'freeswitch', 'portsip'
  )),
  connection_params JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, vendor)
);

CREATE INDEX idx_cti_configs_tenant ON cti_configs(tenant_id);
CREATE INDEX idx_cti_configs_vendor ON cti_configs(vendor);

-- CTI Vendors (reference data)
CREATE TABLE cti_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  required_params JSONB NOT NULL,
  optional_params JSONB DEFAULT '[]',
  is_supported BOOLEAN DEFAULT true
);

-- Extension Mappings
CREATE TABLE extension_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES cti_configs(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  extension TEXT NOT NULL,
  sip_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_id, agent_id)
);

CREATE INDEX idx_extension_mappings_config ON extension_mappings(config_id);
CREATE INDEX idx_extension_mappings_agent ON extension_mappings(agent_id);

-- Call States (stored in Redis, this is for historical reference)
CREATE TABLE call_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT UNIQUE NOT NULL,
  agent_id UUID NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  caller_number TEXT,
  called_number TEXT,
  status TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  answer_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_states_agent ON call_states(agent_id);
CREATE INDEX idx_call_states_start ON call_states(start_time DESC);

-- CTI Events
CREATE TABLE cti_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT,
  agent_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cti_events_call ON cti_events(call_id);
CREATE INDEX idx_cti_events_agent ON cti_events(agent_id);
CREATE INDEX idx_cti_events_occurred ON cti_events(occurred_at DESC);
```

### Dynamic Fields Migration for Existing Services

```sql
-- Add dynamic_fields column to existing tables

-- interaction_db
ALTER TABLE interactions 
ADD COLUMN dynamic_fields JSONB DEFAULT '{}';

CREATE INDEX idx_interactions_dynamic_fields ON interactions USING GIN(dynamic_fields);

-- ticket_db
ALTER TABLE tickets 
ADD COLUMN dynamic_fields JSONB DEFAULT '{}';

CREATE INDEX idx_tickets_dynamic_fields ON tickets USING GIN(dynamic_fields);

-- customer_db
ALTER TABLE customers 
ADD COLUMN dynamic_fields JSONB DEFAULT '{}';

CREATE INDEX idx_customers_dynamic_fields ON customers USING GIN(dynamic_fields);
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

**Redundancy Analysis:**
- Properties for "all services support dynamic_fields" can be consolidated into a single property about JSONB column support
- Multiple caching properties (schemas, layouts, AI responses, BFSI products) follow the same pattern and can be generalized
- Parser/printer round-trip properties for schemas, layouts, and CTI configs follow the same pattern
- Field-level encryption properties can be consolidated
- Audit logging properties across services follow the same pattern

**Consolidated Properties:**
- Combined all round-trip properties into three specific instances (schema, layout, CTI config)
- Consolidated caching behavior into service-specific properties with consistent TTL validation
- Unified dynamic field support across all object services
- Merged audit logging requirements into comprehensive audit trail properties

### Knowledge Base Properties

### Property 1: Article Search Returns Relevant Results

*For any* search query and article collection, all returned articles should contain the search term in title, summary, or content fields, and results should be ordered by relevance score in descending order.

**Validates: Requirements 1.1, 1.2**

### Property 2: View Count Increment

*For any* KB article, viewing the article should increment the view_count field by exactly 1.

**Validates: Requirements 1.3**

### Property 3: Bookmark Persistence

*For any* agent and KB article, after bookmarking the article, querying the agent's bookmarks should include that article.

**Validates: Requirements 1.4**

### Property 4: Hierarchical Folder Support

*For any* folder nesting depth N (where N ≥ 0), the system should support creating and retrieving folders at that depth without errors.

**Validates: Requirements 1.5**

### Property 5: Article Validation

*For any* article creation request, the system should reject articles with empty titles or content length outside the range [10, 100000] characters.

**Validates: Requirements 1.6**

### Property 6: Rating Validation and Calculation

*For any* article rating submission, the system should reject ratings outside [1, 5] range, and after N valid ratings, the average rating should equal the sum of ratings divided by N.

**Validates: Requirements 1.8**

### Property 7: Related Articles by Tag Similarity

*For any* article A with tags T, the related articles endpoint should return articles that share at least one tag with T, ordered by number of shared tags.

**Validates: Requirements 1.9**

### BFSI Core Banking Properties

### Property 8: Product Query Completeness

*For any* customer CIF, querying products should return all products associated with that CIF in the Core Banking System.

**Validates: Requirements 2.1**

### Property 9: Field-Level Encryption Round Trip

*For any* sensitive field value (account_number, balance, card_number), encrypting then decrypting should produce the original value.

**Validates: Requirements 2.2**

### Property 10: Account Number Masking

*For any* account number and agent without `bfsi:view-full` permission, the API response should display only the last 4 digits with other digits masked.

**Validates: Requirements 2.3**

### Property 11: Circuit Breaker Opens After Failures

*For any* sequence of 5 consecutive Core Banking System failures, the circuit breaker should transition to open state and remain open for 30 seconds.

**Validates: Requirements 2.6**

### Property 12: Cached Data Fallback

*For any* Core Banking System query when the system is unavailable and cache age is less than 5 minutes, the response should include cached data with a staleness indicator.

**Validates: Requirements 2.5**

### Property 13: Audit Logging for External Queries

*For any* Core Banking System query, an audit log entry should be created with category `external-system-access`.

**Validates: Requirements 2.7**

### Property 14: Transaction Pagination Limit

*For any* transaction history query, each page should contain at most 100 transactions.

**Validates: Requirements 2.9**

### AI Service Properties

### Property 15: AI Response Caching

*For any* AI request, if an identical request (same hash) is made within 5 minutes, the response should be served from cache without calling the LLM provider.

**Validates: Requirements 3.5**

### Property 16: Summary Word Count Constraint

*For any* summarization request, the generated summary should contain between 50 and 200 words.

**Validates: Requirements 3.3**

### Property 17: Sentiment Classification

*For any* sentiment analysis request, the response sentiment value should be one of: positive, neutral, negative, or mixed.

**Validates: Requirements 3.4**

### Property 18: Graceful LLM Failure

*For any* AI request when the LLM provider is unavailable, the system should return an error response without throwing exceptions or blocking the agent workflow.

**Validates: Requirements 3.7**

### Property 19: AI Audit Logging

*For any* AI request, an audit log entry should be created with category `ai-assistance` and should not contain customer PII.

**Validates: Requirements 3.9**

### Media Service Properties

### Property 20: File Size Validation

*For any* file upload request with file size greater than 100MB, the system should reject the upload with error code `FILE_TOO_LARGE`.

**Validates: Requirements 4.1**

### Property 21: Pre-Signed URL Expiration

*For any* file download request, the generated pre-signed URL should expire after exactly 5 minutes.

**Validates: Requirements 4.3**

### Property 22: Recording Metadata Completeness

*For any* call recording upload, the stored metadata should include interaction_id, duration, quality, and file_size fields.

**Validates: Requirements 4.4**

### Property 23: Thumbnail Generation

*For any* image upload, a thumbnail should be generated and accessible via thumbnailUrl within 5 seconds.

**Validates: Requirements 4.8**

### Property 24: Media Access Audit Logging

*For any* file access operation (upload, download, delete), an audit log entry should be created with category `media-access`.

**Validates: Requirements 4.9**

### Audit Service Properties

### Property 25: Hash Chain Integrity

*For any* sequence of audit log entries [E1, E2, ..., En], each entry Ei (where i > 1) should have prev_hash equal to Ei-1.event_hash.

**Validates: Requirements 5.2**

### Property 26: Event Hash Computation

*For any* audit log entry, the event_hash should equal SHA-256(event_data + prev_hash).

**Validates: Requirements 5.3**

### Property 27: Immutability Enforcement

*For any* audit log entry, attempts to UPDATE or DELETE the entry should fail with a permission denied error.

**Validates: Requirements 5.4**

### Property 28: PII Masking in Audit Logs

*For any* audit log query response containing sensitive identifiers, only the last 4 digits should be displayed.

**Validates: Requirements 5.6**

### Property 29: Tamper Detection

*For any* audit log sequence with a broken hash chain link, the verify endpoint should report the exact sequence number and hash mismatch.

**Validates: Requirements 5.8**

### Object Schema Service Properties

### Property 30: Field Name Uniqueness

*For any* object type, attempting to create two fields with the same name should result in the second creation being rejected.

**Validates: Requirements 6.2**

### Property 31: Schema Versioning Increment

*For any* schema update operation, the version number should increment by exactly 1.

**Validates: Requirements 6.4**

### Property 32: Schema Update Event Publishing

*For any* schema update, a `schema.updated` event should be published to Kafka with the object type and new version number.

**Validates: Requirements 6.5**

### Property 33: Schema Cache Invalidation

*For any* schema update, the Redis cache entry for that schema should be deleted, and subsequent reads should fetch the new version.

**Validates: Requirements 6.6**

### Property 34: Core Field Protection

*For any* field marked with `isCore: true`, attempts to delete the field should be rejected.

**Validates: Requirements 6.7**

### Property 35: Schema Round-Trip Property

*For any* valid ObjectType entity, parse(print(schema)) should equal the original schema.

**Validates: Requirements 12.3**

### Layout Service Properties

### Property 36: Layout Field Validation

*For any* layout creation request, if any referenced field ID does not exist in the object schema, the creation should be rejected.

**Validates: Requirements 7.2**

### Property 37: Layout Cache TTL

*For any* layout query, the result should be cached in Redis for 5 minutes, and subsequent queries within that window should return cached data.

**Validates: Requirements 7.6**

### Property 38: Conditional Visibility Evaluation

*For any* visibility rule and data object, the evaluate function should return true if and only if the rule condition is satisfied by the data.

**Validates: Requirements 7.7**

### Property 39: Role-Based Layout Filtering

*For any* agent with role R requesting a layout, only layouts with no role restrictions or with R in roleRestrictions should be returned.

**Validates: Requirements 7.8**

### Property 40: Default Layout Selection

*For any* agent requesting a layout for object type T and context C, the system should return the layout marked as default for that (T, C, role) combination.

**Validates: Requirements 7.9**

### Property 41: Layout Round-Trip Property

*For any* valid Layout entity, parse(print(layout)) should equal the original layout.

**Validates: Requirements 12.6**

### CTI Adapter Properties

### Property 42: CTI Adapter Interface Compliance

*For any* CTI adapter implementation (Cisco Webex, Cisco PCCE, FreeSwitch, Portsip), the adapter should implement all methods in the CTIAdapter interface.

**Validates: Requirements 8.2**

### Property 43: Call Event Emission

*For any* incoming call through the PBX, the CTI adapter should emit a `call.ringing` event containing callId, callerNumber, queueId, and timestamp fields.

**Validates: Requirements 8.4**

### Property 44: Call State Caching

*For any* active call, the call state should be stored in Redis with agent_id as part of the key.

**Validates: Requirements 8.6**

### Property 45: Exponential Backoff Reconnection

*For any* CTI connection drop, reconnection attempts should occur with delays of 1s, 2s, 4s, 8s, and 16s (max) between attempts.

**Validates: Requirements 8.7**

### Property 46: CTI Operation Audit Logging

*For any* call control operation (answer, hangup, hold, transfer, etc.), an audit log entry should be created with category `cti-operation`.

**Validates: Requirements 8.9**

### Property 47: CTI Config Round-Trip Property

*For any* valid CTIConfig entity, parse(print(config)) should equal the original config.

**Validates: Requirements 12.9**

### Progressive Loading Properties

### Property 48: Local Fields Response Time

*For any* customer profile request, local fields should be returned in less than 200ms.

**Validates: Requirements 9.1**

### Property 49: Enrichment Field Status

*For any* object with enrichment fields, the initial response should mark those fields with status "loading".

**Validates: Requirements 9.2**

### Property 50: Field Update WebSocket Event

*For any* enrichment data arrival, an `object.fields.updated` event should be pushed via WebSocket to subscribed clients.

**Validates: Requirements 9.4**

### Property 51: Dynamic Fields JSONB Support

*For any* object service (Interaction, Ticket, Customer, Knowledge, BFSI), the service should support storing and retrieving arbitrary JSON data in the dynamic_fields column.

**Validates: Requirements 9.9**

### Integration Properties

### Property 52: Schema Update Cache Invalidation

*For any* `schema.updated` event published to Kafka, all object services should invalidate their schema cache within 5 seconds.

**Validates: Requirements 13.5**

### Property 53: CTI Call to Interaction Creation

*For any* `cti.call.incoming` event, the Interaction Service should create a new interaction record with type 'call' and the call metadata.

**Validates: Requirements 13.8**

### Property 54: Circuit Breaker Threshold

*For any* BFSI Core Banking System integration, after exactly 5 consecutive failures, the circuit breaker should open and reject requests for 30 seconds.

**Validates: Requirements 13.11**

### Security Properties

### Property 55: Field-Level Encryption for PII

*For any* BFSI product record, the account_number, balance, and card_number fields should be encrypted at rest using AES-256-GCM.

**Validates: Requirements 14.1**

### Property 56: Audit Log Row-Level Security

*For any* user without audit_writer role, attempts to INSERT, UPDATE, or DELETE audit_logs should fail.

**Validates: Requirements 14.2**

### Property 57: Schema Modification Audit Logging

*For any* schema modification operation, an audit log entry should be created with category `configuration-change` and sensitivity `high`.

**Validates: Requirements 14.3**

### Property 58: Pre-Signed URL Single Use

*For any* media file, the generated pre-signed URL should expire after 5 minutes and should not be reusable after expiration.

**Validates: Requirements 14.8**

### Property 59: JWT Validation on All Requests

*For any* API request to Phase 2 services, the JWT token should be validated with RS256 signature verification.

**Validates: Requirements 14.11**

### Parser Error Handling Property

### Property 60: Descriptive Parse Errors

*For any* invalid JSON input to schema, layout, or CTI config parsers, the error message should indicate the nature of the error and, when possible, the line number.

**Validates: Requirements 12.10**



## Error Handling

### Error Response Format

All Phase 2 services follow a consistent error response format:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

### Error Categories and Codes

#### Knowledge Service (MS-7)

| Error Code | HTTP Status | Description | Recovery Action |
|---|---|---|---|
| `KB_ARTICLE_NOT_FOUND` | 404 | Article does not exist | Verify article ID |
| `KB_INVALID_CONTENT_LENGTH` | 400 | Content length outside [10, 100000] | Adjust content length |
| `KB_FOLDER_NOT_FOUND` | 404 | Folder does not exist | Verify folder ID |
| `KB_ELASTICSEARCH_UNAVAILABLE` | 503 | Search service unavailable | Retry after delay |
| `KB_INVALID_RATING` | 400 | Rating outside [1, 5] range | Provide valid rating |
| `KB_TOO_MANY_TAGS` | 400 | More than 20 tags | Reduce tag count |

#### BFSI Core Banking Service (MS-8)

| Error Code | HTTP Status | Description | Recovery Action |
|---|---|---|---|
| `BFSI_CUSTOMER_NOT_FOUND` | 404 | Customer CIF not found | Verify CIF |
| `BFSI_CBS_UNAVAILABLE` | 503 | Core Banking System unavailable | Return cached data if available |
| `BFSI_CIRCUIT_OPEN` | 503 | Circuit breaker open | Wait for circuit to close |
| `BFSI_INSUFFICIENT_PERMISSIONS` | 403 | Agent lacks permission to view full data | Request permission or accept masked data |
| `BFSI_ENCRYPTION_FAILED` | 500 | Field encryption failed | Retry or contact support |
| `BFSI_INVALID_PRODUCT_TYPE` | 400 | Invalid product type | Use valid product type |

#### AI Service (MS-9)

| Error Code | HTTP Status | Description | Recovery Action |
|---|---|---|---|
| `AI_LLM_UNAVAILABLE` | 503 | LLM provider unavailable | Retry or continue without AI |
| `AI_INVALID_REQUEST` | 400 | Invalid AI request format | Fix request structure |
| `AI_RATE_LIMIT_EXCEEDED` | 429 | Too many AI requests | Wait before retrying |
| `AI_PROMPT_TOO_LONG` | 400 | Prompt exceeds token limit | Reduce prompt length |
| `AI_GENERATION_FAILED` | 500 | AI generation failed | Retry or use fallback |

#### Media Service (MS-10)

| Error Code | HTTP Status | Description | Recovery Action |
|---|---|---|---|
| `MEDIA_FILE_TOO_LARGE` | 413 | File exceeds 100MB limit | Reduce file size |
| `MEDIA_INVALID_FILE_TYPE` | 400 | Unsupported file type | Use supported file type |
| `MEDIA_UPLOAD_FAILED` | 500 | Upload to SeaweedFS failed | Retry upload |
| `MEDIA_FILE_NOT_FOUND` | 404 | File does not exist | Verify file ID |
| `MEDIA_THUMBNAIL_FAILED` | 500 | Thumbnail generation failed | File still accessible |
| `MEDIA_STORAGE_UNAVAILABLE` | 503 | SeaweedFS unavailable | Retry later |

#### Audit Service (MS-11)

| Error Code | HTTP Status | Description | Recovery Action |
|---|---|---|---|
| `AUDIT_UNAUTHORIZED` | 403 | User lacks audit query permission | Request admin access |
| `AUDIT_INVALID_DATE_RANGE` | 400 | Invalid date range | Provide valid dates |
| `AUDIT_HASH_CHAIN_BROKEN` | 500 | Hash chain integrity violated | Investigate tampering |
| `AUDIT_EXPORT_FAILED` | 500 | Export generation failed | Retry export |

#### Object Schema Service (MS-13)

| Error Code | HTTP Status | Description | Recovery Action |
|---|---|---|---|
| `SCHEMA_OBJECT_TYPE_NOT_FOUND` | 404 | Object type does not exist | Verify object type name |
| `SCHEMA_DUPLICATE_FIELD_NAME` | 400 | Field name already exists | Use unique field name |
| `SCHEMA_INVALID_FIELD_TYPE` | 400 | Invalid field type | Use supported field type |
| `SCHEMA_CORE_FIELD_PROTECTED` | 403 | Cannot delete core field | Core fields are protected |
| `SCHEMA_PARSE_ERROR` | 400 | JSON parsing failed | Fix JSON syntax |
| `SCHEMA_VALIDATION_FAILED` | 400 | Schema validation failed | Fix validation errors |

#### Layout Service (MS-14)

| Error Code | HTTP Status | Description | Recovery Action |
|---|---|---|---|
| `LAYOUT_NOT_FOUND` | 404 | Layout does not exist | Verify layout ID |
| `LAYOUT_INVALID_FIELD_ID` | 400 | Referenced field does not exist in schema | Use valid field ID |
| `LAYOUT_INVALID_CONTEXT` | 400 | Invalid layout context | Use supported context |
| `LAYOUT_PARSE_ERROR` | 400 | JSON parsing failed | Fix JSON syntax |
| `LAYOUT_NO_DEFAULT` | 404 | No default layout for context | Create default layout |

#### CTI Adapter Service (MS-19)

| Error Code | HTTP Status | Description | Recovery Action |
|---|---|---|---|
| `CTI_NOT_CONNECTED` | 503 | CTI adapter not connected | Wait for reconnection |
| `CTI_CALL_NOT_FOUND` | 404 | Call does not exist | Verify call ID |
| `CTI_OPERATION_FAILED` | 500 | Call control operation failed | Retry operation |
| `CTI_INVALID_VENDOR` | 400 | Unsupported CTI vendor | Use supported vendor |
| `CTI_CONFIG_INVALID` | 400 | Invalid CTI configuration | Fix configuration |
| `CTI_RECONNECTION_FAILED` | 503 | Reconnection attempts exhausted | Check PBX connectivity |

### Error Handling Strategies

#### Circuit Breaker Pattern


**Implementation (BFSI Service):**
```typescript
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime: number = 0;
  
  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 30000,
    private resetTimeout: number = 30000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await Promise.race([
        operation(),
        this.timeoutPromise()
      ]);
      
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }
  
  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
  }
  
  private timeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), this.timeout);
    });
  }
}
```

#### Retry with Exponential Backoff

**Implementation (AI Service, CTI Service):**
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 16000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

#### Graceful Degradation

**Implementation (BFSI Service with Cache Fallback):**
```typescript
async getCustomerProducts(cif: string): Promise<BankProduct[]> {
  try {
    // Try primary source
    return await this.circuitBreaker.execute(() => 
      this.coreBankingAdapter.queryProducts(cif)
    );
  } catch (error) {
    // Fallback to cache
    const cached = await this.cache.get(`products:${cif}`);
    
    if (cached && this.isCacheFresh(cached, 300)) {
      this.logger.warn(`Returning cached data for CIF ${cif}`);
      return cached.data.map(p => ({ ...p, _cached: true }));
    }
    
    // No cache available, propagate error
    throw new ServiceUnavailableException('Core Banking System unavailable and no cache available');
  }
}
```

#### Timeout Protection

**Implementation (All External Calls):**
```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// Usage
const products = await withTimeout(
  this.coreBankingAdapter.queryProducts(cif),
  2000,
  'Core Banking System query timeout'
);
```

## Testing Strategy

### Testing Approach

Phase 2 follows a dual testing approach combining unit tests for specific examples and edge cases with property-based tests for universal properties across all inputs.

**Unit Testing:**
- Specific examples demonstrating correct behavior
- Edge cases and boundary conditions
- Error handling scenarios
- Integration points between components

**Property-Based Testing:**
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Minimum 100 iterations per property test
- Each property test references its design document property

### Test Coverage Requirements

| Service | Unit Test Coverage | Property Tests | Integration Tests |
|---|---|---|---|
| MS-7: Knowledge | ≥ 70% | 7 properties | Elasticsearch integration |
| MS-8: BFSI Core | ≥ 70% | 7 properties | Circuit breaker, encryption |
| MS-9: AI | ≥ 70% | 5 properties | LLM adapter, caching |
| MS-10: Media | ≥ 70% | 5 properties | SeaweedFS integration |
| MS-11: Audit | ≥ 70% | 5 properties | Hash chain verification |
| MS-13: Object Schema | ≥ 70% | 6 properties | Parser round-trip |
| MS-14: Layout | ≥ 70% | 6 properties | Parser round-trip |
| MS-19: CTI Adapter | ≥ 70% | 6 properties | Vendor adapters |

### Property-Based Testing Configuration

**Framework:** fast-check (TypeScript property-based testing library)

**Configuration:**
```typescript
import * as fc from 'fast-check';

// Minimum 100 iterations per property test
const propertyTestConfig = {
  numRuns: 100,
  verbose: true,
  seed: Date.now()
};

// Example property test
describe('Schema Parser Round-Trip Property', () => {
  it('Property 35: parse(print(schema)) equals schema', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          displayName: fc.string({ minLength: 1, maxLength: 100 }),
          displayNamePlural: fc.string({ minLength: 1, maxLength: 100 }),
          icon: fc.string(),
          fields: fc.array(generateFieldDefinition(), { minLength: 1, maxLength: 20 })
        }),
        (schema) => {
          const printed = schemaPrinter.print(schema);
          const parsed = schemaParser.parse(printed);
          expect(parsed).toEqual(schema);
        }
      ),
      propertyTestConfig
    );
  });
});
```

**Tag Format:**
```typescript
/**
 * Feature: phase-2-advanced-features
 * Property 35: For any valid ObjectType entity, parse(print(schema)) equals schema
 */
```

### Unit Test Examples

#### Knowledge Service Tests

```typescript
describe('KnowledgeService', () => {
  describe('Article Creation', () => {
    it('should reject articles with empty title', async () => {
      await expect(
        service.createArticle({ title: '', content: 'Valid content' })
      ).rejects.toThrow('KB_INVALID_TITLE');
    });
    
    it('should reject articles with content too short', async () => {
      await expect(
        service.createArticle({ title: 'Valid', content: 'Short' })
      ).rejects.toThrow('KB_INVALID_CONTENT_LENGTH');
    });
    
    it('should increment view count on article view', async () => {
      const article = await service.createArticle(validArticle);
      const initialCount = article.viewCount;
      
      await service.viewArticle(article.id);
      
      const updated = await service.getArticle(article.id);
      expect(updated.viewCount).toBe(initialCount + 1);
    });
  });
  
  describe('Search', () => {
    it('should return articles matching search term', async () => {
      await service.createArticle({ title: 'TypeScript Guide', content: 'Learn TypeScript' });
      await service.createArticle({ title: 'JavaScript Basics', content: 'Learn JavaScript' });
      
      const results = await service.searchArticles({ query: 'TypeScript' });
      
      expect(results.articles).toHaveLength(1);
      expect(results.articles[0].title).toContain('TypeScript');
    });
  });
});
```

#### BFSI Service Tests

```typescript
describe('BFSIService', () => {
  describe('Circuit Breaker', () => {
    it('should open circuit after 5 consecutive failures', async () => {
      // Mock 5 failures
      for (let i = 0; i < 5; i++) {
        await expect(service.getCustomerProducts('CIF123')).rejects.toThrow();
      }
      
      // 6th call should fail immediately with circuit open
      const start = Date.now();
      await expect(service.getCustomerProducts('CIF123')).rejects.toThrow('Circuit breaker is open');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should fail fast
    });
    
    it('should return cached data when CBS unavailable', async () => {
      // Populate cache
      await service.getCustomerProducts('CIF123');
      
      // Simulate CBS failure
      mockCoreBanking.mockRejectedValue(new Error('CBS unavailable'));
      
      const products = await service.getCustomerProducts('CIF123');
      
      expect(products[0]._cached).toBe(true);
    });
  });
  
  describe('Field Encryption', () => {
    it('should encrypt sensitive fields at rest', async () => {
      const product = await service.createProduct({
        accountNumber: '1234567890',
        balance: 1000000
      });
      
      const dbRecord = await repository.findOne(product.id);
      
      expect(dbRecord.accountNumber).not.toBe('1234567890');
      expect(dbRecord.accountNumber).toContain(':'); // Encrypted format
    });
    
    it('should mask account numbers for users without permission', async () => {
      const product = await service.getProduct('PROD123', { permissions: [] });
      
      expect(product.accountNumber).toMatch(/\*+\d{4}$/);
    });
  });
});
```

#### Audit Service Tests

```typescript
describe('AuditService', () => {
  describe('Hash Chain', () => {
    it('should compute correct event hash', () => {
      const prevHash = 'abc123';
      const event = createMockAuditLog();
      
      const hash = hashChainService.computeEventHash(event, prevHash);
      
      expect(hash).toHaveLength(64); // SHA-256 hex length
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
    
    it('should detect broken hash chain', async () => {
      // Create valid chain
      await service.createAuditLog(event1);
      await service.createAuditLog(event2);
      
      // Tamper with event2
      await repository.update(event2.id, { action: 'tampered' });
      
      const verification = await service.verifyHashChain(1, 2);
      
      expect(verification.valid).toBe(false);
      expect(verification.brokenLinks).toHaveLength(1);
    });
  });
  
  describe('Immutability', () => {
    it('should prevent updates to audit logs', async () => {
      const log = await service.createAuditLog(event);
      
      await expect(
        repository.update(log.id, { action: 'modified' })
      ).rejects.toThrow('Permission denied');
    });
    
    it('should prevent deletes of audit logs', async () => {
      const log = await service.createAuditLog(event);
      
      await expect(
        repository.delete(log.id)
      ).rejects.toThrow('Permission denied');
    });
  });
});
```

### Integration Tests

#### Elasticsearch Integration (Knowledge Service)

```typescript
describe('Elasticsearch Integration', () => {
  beforeAll(async () => {
    await elasticsearchService.createIndex('kb_articles');
  });
  
  afterAll(async () => {
    await elasticsearchService.deleteIndex('kb_articles');
  });
  
  it('should index article on creation', async () => {
    const article = await service.createArticle(validArticle);
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const searchResults = await elasticsearchService.search({
      index: 'kb_articles',
      body: {
        query: { match: { title: article.title } }
      }
    });
    
    expect(searchResults.hits.total.value).toBe(1);
  });
});
```

#### SeaweedFS Integration (Media Service)

```typescript
describe('SeaweedFS Integration', () => {
  it('should upload file to SeaweedFS', async () => {
    const file = Buffer.from('test file content');
    
    const result = await service.uploadFile({
      file,
      filename: 'test.txt',
      mimeType: 'text/plain'
    });
    
    expect(result.fileId).toBeDefined();
    expect(result.url).toContain('localhost:8333');
  });
  
  it('should generate pre-signed URL for download', async () => {
    const file = await service.uploadFile(testFile);
    
    const url = await service.getDownloadUrl(file.fileId);
    
    expect(url).toContain('X-Amz-Signature');
    expect(url).toContain('X-Amz-Expires=300');
  });
});
```

### End-to-End Tests

#### Progressive Loading Flow

```typescript
describe('Progressive Loading E2E', () => {
  it('should load local fields immediately and enrichment fields asynchronously', async () => {
    const ws = new WebSocket(`ws://localhost:3005/ws/objects/customer/${customerId}/fields`);
    const updates = [];
    
    ws.on('message', (data) => {
      updates.push(JSON.parse(data));
    });
    
    // Request customer profile
    const start = Date.now();
    const response = await request(app)
      .get(`/api/v1/customers/${customerId}`)
      .expect(200);
    const localLoadTime = Date.now() - start;
    
    // Local fields should load fast
    expect(localLoadTime).toBeLessThan(200);
    expect(response.body.fullName).toBeDefined();
    expect(response.body.enrichmentField).toEqual({ status: 'loading' });
    
    // Wait for enrichment
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Should receive WebSocket update
    expect(updates).toHaveLength(1);
    expect(updates[0].eventType).toBe('object.fields.updated');
    expect(updates[0].fields.enrichmentField).toBeDefined();
  });
});
```

#### Admin Module Schema Designer

```typescript
describe('Schema Designer E2E', () => {
  it('should create field and see it in Agent Desktop within 5 seconds', async () => {
    // Admin creates field
    await request(adminApp)
      .post('/api/v1/admin/object-types/ticket/fields')
      .send({
        name: 'customPriority',
        displayName: 'Custom Priority',
        fieldType: 'enum',
        options: ['low', 'medium', 'high']
      })
      .expect(201);
    
    // Wait for cache invalidation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Agent fetches schema
    const schema = await request(agentApp)
      .get('/api/v1/schemas/ticket')
      .expect(200);
    
    const field = schema.body.fields.find(f => f.name === 'customPriority');
    expect(field).toBeDefined();
    expect(field.fieldType).toBe('enum');
  });
});
```

### Load Testing

**Tool:** k6 (load testing tool)

**Scenarios:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<1000'], // P99 < 1s
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

export default function () {
  // Knowledge Base search
  const searchRes = http.get('http://localhost:8000/api/v1/kb/articles?query=test');
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  // BFSI product query
  const bfsiRes = http.get('http://localhost:8000/api/v1/bfsi/customers/CIF123/accounts');
  check(bfsiRes, {
    'bfsi status is 200': (r) => r.status === 200,
    'bfsi response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);
}
```

### Security Testing

**Tool:** OWASP ZAP (security scanner)

**Test Cases:**
- SQL injection attempts on all endpoints
- XSS attempts in user inputs
- JWT token manipulation
- Unauthorized access attempts
- Rate limiting bypass attempts
- PII exposure in logs and responses

**Exit Criteria:**
- Zero critical vulnerabilities
- Zero high vulnerabilities
- All medium vulnerabilities documented with mitigation plans

