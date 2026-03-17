# Phase 4 - Week 3 Checklist

## ✅ Completed

- [x] Task 3.1: Customer API Integration
  - [x] API methods exist
  - [x] Query hooks exist
  - [x] Added `useAddCustomerNote()` mutation
  
- [x] Task 3.3: Ticket API Integration
  - [x] Created `src/hooks/useTickets.ts`
  - [x] All query hooks implemented
  - [x] All mutation hooks implemented
  - [x] Toast notifications added

## 🟡 In Progress

- [ ] Task 3.2: Update CustomerInfoScrollFixed
  - [x] Import mutation hooks
  - [x] Component uses API hooks
  - [ ] Remove mock data constants
  - [ ] Integrate `useAddCustomerNote` into note form
  - [ ] Integrate `useCreateTicket` into ticket form
  - [ ] Add loading states
  - [ ] Test with backend

## ⚪ Not Started

- [ ] Task 3.4: Update CreateTicketDialog
  - [ ] Import `useCreateTicket` hook
  - [ ] Replace local state with mutation
  - [ ] Add loading state during submission
  - [ ] Add error handling
  - [ ] Add success toast
  - [ ] Clear form on success
  - [ ] Test with backend

- [ ] Task 3.5: Update TicketDetail
  - [ ] Import ticket hooks
  - [ ] Replace mock data with `useTicket`
  - [ ] Update comments with `useTicketComments`
  - [ ] Integrate `useAddTicketComment`
  - [ ] Add loading states
  - [ ] Add error handling
  - [ ] Test with backend

- [ ] Task 3.6: Notification API Integration
  - [ ] Check if `src/lib/api/notifications.ts` exists
  - [ ] Create `src/lib/ws/notifications.ts`
  - [ ] Create `src/hooks/useNotifications.ts`
  - [ ] Implement query hooks
  - [ ] Implement mutation hooks
  - [ ] Update NotificationCenter component
  - [ ] Test WebSocket connection
  - [ ] Test real-time notifications

## 📋 Files to Modify

### High Priority
1. `src/components/CustomerInfoScrollFixed.tsx`
   - Remove mock data (lines 60-230)
   - Integrate mutation hooks
   
2. `src/components/CreateTicketDialog.tsx`
   - Integrate `useCreateTicket`
   
3. `src/components/TicketDetail.tsx`
   - Integrate ticket hooks

### Medium Priority
4. `src/components/NotificationCenter.tsx`
   - Integrate notification hooks

## 🔧 Backend Services Needed

- [ ] Customer Service (MS-5) - port 3005
- [ ] Ticket Service (MS-4) - port 3004
- [ ] Notification Service (MS-6) - port 3006

## 🧪 Testing Checklist

- [ ] Build successful
- [ ] No TypeScript errors
- [ ] Customer info loads from API
- [ ] Customer notes can be added
- [ ] Tickets can be created
- [ ] Ticket comments can be added
- [ ] Notifications load from API
- [ ] Real-time notifications work

## 📝 Notes

- Mock data should be removed completely, not just hidden
- All mutations should show loading states
- All mutations should show success/error toasts
- Query cache should be invalidated after mutations
- WebSocket should auto-reconnect on disconnect

---

**Last Updated:** 2026-03-09T19:50:00+07:00
