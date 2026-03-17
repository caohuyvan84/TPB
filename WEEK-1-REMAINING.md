# Week 1 Remaining Tasks - Detailed Plan

**Current:** Day 2 Complete  
**Remaining:** Day 3-5 (3 days)

## Day 3: Simple Component Integration

### Task 1: Update InteractionList (Already Done ✅)
- [x] App.tsx uses useInteractions() hook
- [x] Real-time polling (5s)
- [x] Filter by channel

### Task 2: Add Loading States
**File:** `apps/agent-desktop/src/App.tsx`

```typescript
// Show loading spinner while fetching
{interactionsLoading ? (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
) : (
  <InteractionList interactions={interactions as any} />
)}
```

**Estimated Time:** 30 minutes

### Task 3: Add Error Handling
**File:** `apps/agent-desktop/src/App.tsx`

```typescript
const { data: interactions = [], isLoading, error } = useInteractions({
  channel: channelFilter === 'all' ? undefined : channelFilter,
});

// Show error message
{error && (
  <div className="p-4 bg-red-50 text-red-600">
    Failed to load interactions. Retrying...
  </div>
)}
```

**Estimated Time:** 30 minutes

## Day 4: Agent Status Integration

### Task 1: Connect useAgentStatus Hook
**File:** `apps/agent-desktop/src/components/EnhancedAgentStatusContext.tsx`

**Current:** Local state management  
**Target:** Fetch from API

**Approach:**
1. Keep existing context for UI state
2. Add API sync layer
3. Update status via API calls

```typescript
// In EnhancedAgentStatusContext.tsx
const { data: apiStatus } = useAgentStatus();

useEffect(() => {
  if (apiStatus) {
    // Sync API status to local state
    syncStatusFromAPI(apiStatus);
  }
}, [apiStatus]);
```

**Estimated Time:** 2 hours

### Task 2: Update Status API Calls
**File:** `apps/agent-desktop/src/components/EnhancedAgentStatusContext.tsx`

```typescript
const setChannelStatus = async (channel: ChannelType, status: AgentStatus, reason?: string) => {
  // Update local state immediately (optimistic update)
  updateLocalStatus(channel, status, reason);
  
  // Call API
  try {
    await agentsApi.updateChannelStatus(channel, { status, reason });
  } catch (error) {
    // Revert on error
    revertLocalStatus(channel);
    toast.error('Failed to update status');
  }
};
```

**Estimated Time:** 2 hours

## Day 5: Testing & Polish

### Task 1: Setup Mock Backend
**Tool:** json-server or MSW

Create `/tmp/mock-api.json`:
```json
{
  "interactions": [...],
  "agents": [...],
  "notifications": [...]
}
```

Start mock server:
```bash
npx json-server --watch /tmp/mock-api.json --port 8000 --routes /tmp/routes.json
```

**Estimated Time:** 1 hour

### Task 2: Test with Mock Backend
- [ ] Login flow (skip for now, use bypass)
- [ ] Interaction list loads
- [ ] Agent status updates
- [ ] Polling works
- [ ] Error handling works

**Estimated Time:** 2 hours

### Task 3: Document Progress
- [ ] Update FRONTEND-INTEGRATION-PROGRESS.md
- [ ] Create WEEK-1-SUMMARY.md
- [ ] Update CURRENT-STATUS.md

**Estimated Time:** 30 minutes

## Alternative: Minimal Approach (Recommended)

If time is limited, focus on **visual confirmation** only:

### Day 3: Add API Hooks (No UI Changes)
1. ✅ App.tsx uses useInteractions() - DONE
2. Add useAgentStatus() to EnhancedAgentStatusContext (read-only)
3. Add useNotifications() to NotificationContext (read-only)

### Day 4: Add Loading & Error States
1. Show loading spinners
2. Show error messages
3. Add retry buttons

### Day 5: Test & Document
1. Test with mock backend
2. Document what works
3. Document what needs backend

## Success Criteria (Week 1)

- [x] API infrastructure complete
- [x] Authentication system ready
- [x] At least 1 component using real API (InteractionList)
- [ ] Loading states added
- [ ] Error handling added
- [ ] Tested with mock backend
- [ ] Documentation updated

## Blockers to Address

1. **Backend Services:** Not running
   - Solution: Use mock backend (json-server)
   
2. **Type Compatibility:** API vs Component types
   - Solution: Keep using `as any` for now, fix in Week 2

3. **Complex Components:** NotificationCenter, CustomerInfo
   - Solution: Skip for Week 1, focus on simple ones

## Time Estimate

- Day 3: 1-2 hours (loading + error states)
- Day 4: 3-4 hours (agent status integration)
- Day 5: 3-4 hours (testing + documentation)

**Total:** 7-10 hours remaining for Week 1

## Next Week Preview (Week 2)

- Replace mock data in detail components
- Unify type system
- Add proper error boundaries
- Implement retry logic
- Test with real backend services
