# Week 2 Plan - Component Integration

**Started:** 2026-03-09  
**Duration:** 5 days  
**Goal:** Replace mock data in core components

## 🎯 Objectives

1. Replace mock data in 3-5 core components
2. Unify type system (remove `as any`)
3. Add error boundaries
4. Improve loading states
5. Test integration

## 📅 Daily Breakdown

### Day 1: CustomerInfo Component (Highest Priority)

**Target:** `CustomerInfoScrollFixed.tsx` (36 mock locations)

**Tasks:**
1. Create `useCustomer(id)` hook integration
2. Replace customer profile mock
3. Replace interaction history mock (10 items)
4. Replace tickets mock (8 items)
5. Replace notes mock (5 items)
6. Add loading states
7. Add error handling

**Estimated Time:** 4-5 hours

**Files to Modify:**
- `components/CustomerInfoScrollFixed.tsx`
- `hooks/useCustomers.ts` (enhance)

---

### Day 2: InteractionDetail Component

**Target:** `InteractionDetail.tsx` (8 mock locations)

**Tasks:**
1. Use `useInteraction(id)` hook
2. Replace interaction detail mock
3. Replace timeline mock
4. Replace notes mock
5. Add loading skeleton
6. Add error handling

**Estimated Time:** 3-4 hours

**Files to Modify:**
- `components/InteractionDetail.tsx`
- `hooks/useInteractions.ts` (add detail hook)

---

### Day 3: NotificationCenter Component

**Target:** `NotificationCenter.tsx` (complex)

**Tasks:**
1. Replace NotificationContext with API
2. Use `useNotifications()` hook
3. Add real-time polling (10s)
4. Handle notification types
5. Add mark as read functionality
6. Test notification flow

**Estimated Time:** 4-5 hours

**Files to Modify:**
- `components/NotificationCenter.tsx`
- `hooks/useNotifications.ts` (enhance)

---

### Day 4: CoreBFSI & KnowledgeBase

**Target 1:** `CoreBFSI.tsx` (10 mocks)
**Target 2:** `KnowledgeBaseSearch.tsx` (7 mocks)

**Tasks:**
1. CoreBFSI:
   - Use `useBFSI(customerId)` hook
   - Replace account data mock
   - Replace loan data mock
   - Replace card data mock
   - Add loading states

2. KnowledgeBase:
   - Use `useKnowledgeSearch(query)` hook
   - Replace articles mock
   - Add search functionality
   - Add loading states

**Estimated Time:** 4-5 hours

**Files to Modify:**
- `components/CoreBFSI.tsx`
- `components/KnowledgeBaseSearch.tsx`
- `hooks/useBFSI.ts` (new)
- `hooks/useKnowledge.ts` (new)

---

### Day 5: Type System & Testing

**Tasks:**
1. Unify API types and component types
2. Remove all `as any` casts
3. Add error boundaries
4. Test all integrated components
5. Update documentation

**Estimated Time:** 3-4 hours

**Files to Modify:**
- `types/api.ts` (unify)
- `components/ErrorBoundary.tsx` (new)
- Multiple component files (remove `as any`)

---

## 🎯 Success Criteria

- [ ] 5 components integrated with API
- [ ] Zero `as any` casts
- [ ] All components have loading states
- [ ] All components have error handling
- [ ] Error boundary implemented
- [ ] Build successful
- [ ] Documentation updated

## 📊 Progress Tracking

| Component | Mock Locations | Status | Time |
|-----------|---------------|--------|------|
| CustomerInfo | 36 | ⚪ Not Started | - |
| InteractionDetail | 8 | ⚪ Not Started | - |
| NotificationCenter | Complex | ⚪ Not Started | - |
| CoreBFSI | 10 | ⚪ Not Started | - |
| KnowledgeBase | 7 | ⚪ Not Started | - |

**Total:** 61+ mock locations to replace

## 🔧 Technical Approach

### Pattern 1: Simple Data Fetch
```typescript
// Before
const [data, setData] = useState(mockData);

// After
const { data, isLoading, error } = useCustomer(customerId);
```

### Pattern 2: List with Filters
```typescript
// Before
const filteredData = mockData.filter(...);

// After
const { data, isLoading } = useCustomerTickets(customerId, { status });
```

### Pattern 3: Mutations
```typescript
// Before
setData(prev => [...prev, newItem]);

// After
const { mutate } = useAddNote();
mutate({ customerId, content });
```

## 📝 Mock Backend Updates Needed

Add endpoints:
1. `GET /api/v1/customers/:id`
2. `GET /api/v1/customers/:id/interactions`
3. `GET /api/v1/customers/:id/tickets`
4. `GET /api/v1/customers/:id/notes`
5. `GET /api/v1/interactions/:id/detail`
6. `GET /api/v1/interactions/:id/timeline`
7. `GET /api/v1/bfsi/customers/:cif/accounts`
8. `GET /api/v1/kb/articles?search=`

## 🚧 Potential Blockers

1. **Complex Data Structures:** Some mocks have nested data
   - Solution: Flatten or create separate endpoints

2. **Real-time Updates:** Notifications need polling
   - Solution: Use TanStack Query refetchInterval

3. **Type Mismatches:** API types vs component types
   - Solution: Create adapter functions

## 💡 Quick Wins

1. Start with CustomerInfo (most mocks)
2. Reuse patterns from Week 1
3. Copy loading/error states from InteractionList
4. Use optimistic updates where needed

## 📚 Documentation to Update

- [ ] WEEK-2-SUMMARY.md (create at end)
- [ ] CURRENT-STATUS.md (daily updates)
- [ ] FRONTEND-INTEGRATION-PROGRESS.md (daily)
- [ ] Component-specific docs (as needed)

---

**Ready to start Day 1!** 🚀
