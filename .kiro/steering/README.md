---
inclusion: manual
---

# Steering Files - Context Management System

**Project:** TPB CRM Platform
**Purpose:** Maintain context continuity across all development phases
**Last Updated:** 2026-03-08

## 📚 Overview

Hệ thống steering files này được thiết kế để đảm bảo context liền mạch qua tất cả các phase triển khai của TPB CRM Platform. Mỗi file có vai trò cụ thể trong việc lưu trữ và cung cấp thông tin quan trọng.

## 📁 File Structure

```
.kiro/steering/
├── README.md                      # File này - hướng dẫn sử dụng
├── 00-project-context.md          # Tổng quan dự án, tech stack, decisions
├── 01-phase-tracker.md            # Tracking progress qua các phase
├── 02-architecture-decisions.md   # ADR (Architecture Decision Records)
├── 03-api-contracts.md            # API contracts đã implement
├── 04-database-schemas.md         # Database schemas
└── 05-integration-points.md       # Integration points giữa services
```

## 🎯 Mục Đích Từng File

### 00-project-context.md
**Inclusion:** `auto` (luôn được load)
**Mục đích:** 
- Cung cấp overview tổng thể về dự án
- Liệt kê key documents và references
- Document architecture decisions không thay đổi
- Tech stack và versions (2026 latest)
- Repository structure
- Security requirements (BFSI)
- Coding conventions

**Khi nào cần update:**
- Khi có architecture decision mới
- Khi thay đổi tech stack
- Khi cập nhật coding conventions
- Khi thêm/xóa key documents

### 01-phase-tracker.md
**Inclusion:** `auto` (luôn được load)
**Mục đích:**
- Track progress của từng phase
- Document task completion status
- Ghi lại key decisions made trong mỗi phase
- Track blockers và risks
- Exit criteria checklist

**Khi nào cần update:**
- Sau khi hoàn thành mỗi task group
- Khi có blocker mới
- Khi complete một phase
- Khi bắt đầu phase mới
- Daily/weekly progress updates

### 02-architecture-decisions.md
**Inclusion:** `auto` (luôn được load)
**Mục đích:**
- Document tất cả architecture decisions (ADR)
- Explain context, decision, và consequences
- Provide rationale cho future reference
- Track deprecated decisions

**Khi nào cần update:**
- Khi có architecture decision mới
- Khi supersede một decision cũ
- Khi deprecate một approach
- Khi có lessons learned về một decision

### 03-api-contracts.md
**Inclusion:** `auto` (luôn được load)
**Mục đích:**
- Registry của tất cả API endpoints
- Track implementation status
- Document request/response schemas
- WebSocket channels
- Rate limits và authentication

**Khi nào cần update:**
- Khi implement một endpoint mới
- Khi thay đổi API contract
- Khi deprecate một endpoint
- Khi có breaking changes

### 04-database-schemas.md
**Inclusion:** `auto` (luôn được load)
**Mục đích:**
- Registry của tất cả database schemas
- Track table structures
- Document indexes và constraints
- Migration history

**Khi nào cần update:**
- Khi tạo database mới
- Khi thêm/sửa/xóa table
- Khi thêm index
- Khi có migration

### 05-integration-points.md
**Inclusion:** `auto` (luôn được load)
**Mục đích:**
- Document service-to-service communication
- Event flows (Kafka topics)
- WebSocket channels
- External system integrations
- Shared data contracts

**Khi nào cần update:**
- Khi implement integration mới
- Khi thêm Kafka topic
- Khi thêm WebSocket channel
- Khi integrate external system

## 🔄 Workflow: Sử Dụng Steering Files

### Khi Bắt Đầu Phase Mới

1. **Đọc `00-project-context.md`** - Refresh understanding về dự án
2. **Đọc `01-phase-tracker.md`** - Xem current phase và tasks
3. **Đọc `02-architecture-decisions.md`** - Review relevant ADRs
4. **Update `01-phase-tracker.md`** - Mark phase as "In Progress"

### Khi Implement Feature Mới

1. **Check `03-api-contracts.md`** - Xem API specs
2. **Check `04-database-schemas.md`** - Xem database schema
3. **Check `05-integration-points.md`** - Xem integration requirements
4. **Implement feature**
5. **Update all relevant files** với implementation details

### Khi Complete Task

1. **Update `01-phase-tracker.md`** - Mark task as complete
2. **Update `03-api-contracts.md`** - Mark endpoints as implemented
3. **Update `04-database-schemas.md`** - Mark schemas as implemented
4. **Update `05-integration-points.md`** - Mark integrations as implemented
5. **Document any deviations** từ original spec

### Khi Complete Phase

1. **Verify exit criteria** trong `01-phase-tracker.md`
2. **Update phase status** to "Complete"
3. **Document lessons learned**
4. **Update next phase status** to "In Progress"
5. **Create summary** của phase vừa complete

### Khi Có Architecture Decision Mới

1. **Create new ADR** trong `02-architecture-decisions.md`
2. **Follow ADR template**
3. **Document context, decision, consequences**
4. **Update `00-project-context.md`** nếu cần

## 📝 Update Guidelines

### Status Symbols

Sử dụng consistent symbols across all files:
- ⚪ Not Started / Planned
- 🟡 In Progress
- ✅ Complete / Implemented
- 🔴 Blocked / Deprecated
- ⚠️ At Risk / Breaking Change

### Date Format

Luôn sử dụng ISO 8601 format: `YYYY-MM-DD`

Example: `2026-03-08`

### Version Control

- Commit steering file updates cùng với code changes
- Use meaningful commit messages
- Reference task IDs trong commits

Example commit message:
```
feat(identity): implement JWT authentication (P1-1.1)

- Implement POST /auth/login endpoint
- Add JWT token generation
- Update 03-api-contracts.md
- Update 01-phase-tracker.md
```

## 🎯 Best Practices

### 1. Keep Files Updated

- Update steering files **immediately** after completing work
- Don't wait until end of day/week
- Fresh context = accurate documentation

### 2. Be Specific

- Document actual implementation, not just plans
- Note deviations from specs
- Include code snippets when helpful

### 3. Cross-Reference

- Link between steering files when relevant
- Reference spec documents
- Link to code files

### 4. Use Consistent Terminology

- Follow glossary trong requirements docs
- Use same service names (MS-1, MS-2, etc.)
- Consistent status symbols

### 5. Document Decisions

- Explain WHY, not just WHAT
- Include context for future developers
- Note alternatives considered

## 🔍 Quick Reference

### Find Information About...

**Tech Stack & Versions:**
→ `00-project-context.md` - Architecture Decisions section

**Current Progress:**
→ `01-phase-tracker.md` - Phase status and task completion

**Why We Chose X:**
→ `02-architecture-decisions.md` - Find relevant ADR

**API Endpoint Specs:**
→ `03-api-contracts.md` - Find service section

**Database Table Structure:**
→ `04-database-schemas.md` - Find service database

**How Services Communicate:**
→ `05-integration-points.md` - Find integration pattern

**Coding Conventions:**
→ `00-project-context.md` - Coding Conventions section

**Exit Criteria:**
→ `01-phase-tracker.md` - Each phase has exit criteria

## 🚀 Getting Started

### For New Developers

1. Read `00-project-context.md` first - understand the big picture
2. Read `01-phase-tracker.md` - see where we are
3. Read `02-architecture-decisions.md` - understand key decisions
4. Refer to other files as needed during development

### For AI Agents (Kiro)

All steering files with `inclusion: auto` are automatically loaded into context. Use them to:
- Understand project state
- Make consistent decisions
- Avoid repeating past mistakes
- Maintain continuity across sessions

### For Project Managers

- `01-phase-tracker.md` - Primary file for progress tracking
- Check task completion percentages
- Review blockers and risks
- Verify exit criteria before phase transitions

## 📚 Related Documents

- **FullStack-RequirementsV2.md** - Complete API specifications (MS-1 to MS-11)
- **FullStack-RequirementsV3.md** - Extended specifications (MS-13 to MS-19)
- **ImplementationPlan.md** - Detailed task breakdown for all phases
- **CLAUDE.md** - AI agent guidance document
- **.kiro/specs/foundation-setup/** - Phase 0 specifications

## 🆘 Troubleshooting

### "I don't know where we are in the project"
→ Read `01-phase-tracker.md`

### "I don't understand why we chose X"
→ Read `02-architecture-decisions.md`

### "What's the API contract for endpoint Y?"
→ Read `03-api-contracts.md`

### "What's the database schema for service Z?"
→ Read `04-database-schemas.md`

### "How do services communicate?"
→ Read `05-integration-points.md`

### "What are the coding conventions?"
→ Read `00-project-context.md`

## 📞 Support

For questions about steering files:
1. Check this README first
2. Review the specific steering file
3. Check related spec documents
4. Ask team lead if still unclear

---

**Remember:** These steering files are living documents. Keep them updated, and they will keep your context clear! 🎯
