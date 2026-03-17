---
inclusion: always
---

# Knowledge Service Context (MS-7)

**Database**: `knowledge_db`
**Port**: 3007
**Status**: ✅ Sprint 7 Complete (BASIC)

## Progress
- ✅ Task 7.1: Migrations created
- ✅ Task 7.2: Entities implemented (KbArticle, KbFolder, KbBookmark)
- ✅ Task 7.3: Entity tests (5 passing)
- ✅ Task 7.4-7.7: Service & Controller (all endpoints)
- ✅ Task 7.8: Service tests (8 passing)
- ⚠️ Task 7.9: Elasticsearch integration (SKIPPED - not MVP)
- ✅ Task 7.10-7.11: Kong & Verification

**Total Tests: 13/13 passing** (5 entity + 8 service)

## Endpoints Implemented
- GET /api/v1/kb/articles (search with filters)
- GET /api/v1/kb/articles/:id (detail + view count)
- POST /api/v1/kb/articles (create)
- POST /api/v1/kb/bookmarks (bookmark article)
- GET /api/v1/kb/bookmarks (list bookmarks)
- POST /api/v1/kb/articles/:id/rate (rate article)

## Database Schema

### kb_articles
- id, tenant_id, title, summary, content
- tags (TEXT[]), category, folder_id
- view_count, rating (DECIMAL)
- dynamic_fields (JSONB)
- created_by, timestamps

### kb_folders
- id, tenant_id, name
- parent_id (self-reference for nesting)
- sort_order, created_at

### kb_bookmarks
- id, user_id, article_id
- created_at
- UNIQUE(user_id, article_id)

## Features
- Full-text search (ILIKE - basic, Elasticsearch skipped for MVP)
- View count tracking
- Bookmark management
- Article rating (simple average)
- Hierarchical folder structure
- Dynamic fields support

## Integration Points
- **MS-1 (Identity)**: user_id for bookmarks and created_by
- **MS-13 (Object Schema)**: dynamic_fields for custom metadata (Phase 2)

## Notes
- Elasticsearch integration skipped for MVP (using PostgreSQL ILIKE)
- Simple rating system (average, not individual ratings stored)
- No folder management endpoints yet (can add if needed)
- Ready for Phase 2 Elasticsearch upgrade

## Next: MS-8 BFSI Core Banking Service
