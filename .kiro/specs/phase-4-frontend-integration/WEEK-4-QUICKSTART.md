# Quick Reference - Phase 4 Week 4

**Current Status:** Week 3 Complete ✅ | Week 4 Ready to Start ⚪

## 🎯 Week 4 Goals (Day 16-21)

Integrate advanced features: Knowledge Base, BFSI, AI, Media, CTI

## 📋 Task Checklist

### Task 4.1: Knowledge Base (MS-7) - Day 16-17
- [ ] Create `src/lib/knowledge-api.ts`
- [ ] Create `src/hooks/useKnowledge.ts`
- [ ] Update KnowledgeBase component
- [ ] Test article search

### Task 4.2: BFSI (MS-8) - Day 17-18
- [ ] Create `src/lib/bfsi-api.ts`
- [ ] Create `src/hooks/useBFSI.ts`
- [ ] Update banking products panel
- [ ] Test account queries

### Task 4.3: AI (MS-9) - Day 18-19
- [ ] Create `src/lib/ai-api.ts`
- [ ] Create `src/hooks/useAI.ts`
- [ ] Update AI suggestion panel
- [ ] Test response suggestions

### Task 4.4: Media (MS-10) - Day 19-20
- [ ] Create `src/lib/media-api.ts`
- [ ] Create `src/hooks/useMedia.ts`
- [ ] Update call recording player
- [ ] Test file uploads

### Task 4.5: CTI (MS-19) - Day 20
- [ ] Create `src/lib/cti-api.ts`
- [ ] Create `src/lib/cti-channel.ts`
- [ ] Create `src/hooks/useCTI.ts`
- [ ] Update call controls

### Task 4.6: Week 4 Testing - Day 21
- [ ] Integration tests
- [ ] Performance tests
- [ ] Bug fixes
- [ ] Documentation

## 🔗 Backend Services (Ports)

- MS-7: Knowledge - http://localhost:3007
- MS-8: BFSI - http://localhost:3008
- MS-9: AI - http://localhost:3009
- MS-10: Media - http://localhost:3010
- MS-19: CTI - http://localhost:3019

## 📁 File Structure Pattern

For each service:
```
src/lib/{service}-api.ts       # API methods
src/hooks/use{Service}.ts      # React Query hooks
src/components/{Feature}.tsx   # Update components
```

## 🔧 Development Commands

```bash
# Build frontend
npm run build

# Start dev server
npm run dev

# Check services
./scripts/check-services.sh

# Start all services
./scripts/start-services.sh
```

## 📊 Progress Tracking

**Week 3 Complete:**
- ✅ Customer API (1 endpoint)
- ✅ Ticket API (5 endpoints)
- ✅ Notification API (4 endpoints)
- ✅ Real-time notifications (Socket.IO)

**Week 4 Target:**
- ⚪ Knowledge API (4 endpoints)
- ⚪ BFSI API (4 endpoints)
- ⚪ AI API (4 endpoints)
- ⚪ Media API (4 endpoints)
- ⚪ CTI API (4 endpoints) + WebSocket

**Total:** 21 new endpoints + 1 WebSocket channel

## 🎯 Success Criteria

- [ ] All 5 services integrated
- [ ] Build successful
- [ ] No TypeScript errors
- [ ] Components updated
- [ ] Real-time features working

## 📝 Notes

- Follow minimal code principle
- Use existing patterns from Week 1-3
- Test incrementally
- Update steering file after each task

---

**Last Updated:** 2026-03-10T13:10:00+07:00
**Next Task:** Task 4.1 - Knowledge Base Integration
