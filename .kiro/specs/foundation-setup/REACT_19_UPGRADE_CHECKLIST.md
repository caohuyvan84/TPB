# React 19 Upgrade Checklist

## Overview

This checklist provides detailed guidance for upgrading from React 18 to React 19.2.x in the agent-desktop application. Follow each step carefully to ensure a safe migration.

**Estimated Time:** 4-6 hours  
**Risk Level:** HIGH  
**Rollback Plan:** Restore from backup if critical issues found

---

## Pre-Upgrade Preparation

### Backup and Documentation

- [ ] Create full backup of /src directory
  ```bash
  cp -r src src.backup.$(date +%Y%m%d_%H%M%S)
  ```

- [ ] Document current React version
  ```bash
  npm list react react-dom
  ```

- [ ] Take screenshots of critical UI components
  - Main dashboard
  - Interaction list
  - Customer info panel
  - Call widget
  - AI assistant chat

- [ ] List all React-dependent packages
  ```bash
  npm list | grep react
  ```

---

## Phase 1: Move Files to Monorepo Structure

### File Migration

- [ ] Move /src to apps/agent-desktop/src
  ```bash
  mkdir -p apps/agent-desktop
  mv src apps/agent-desktop/src
  ```

- [ ] Verify all files copied successfully
  ```bash
  ls -la apps/agent-desktop/src
  ```

- [ ] Check file count matches
  ```bash
  # Original count
  find src.backup.* -type f | wc -l
  # New location count
  find apps/agent-desktop/src -type f | wc -l
  ```

- [ ] Preserve index.css (5,048 lines) - DO NOT MODIFY
  ```bash
  wc -l apps/agent-desktop/src/index.css
  # Should output: 5048
  ```

---

## Phase 2: Update Dependencies

### Core React Packages

- [ ] Update React and ReactDOM
  ```bash
  npm install react@19.2.x react-dom@19.2.x
  ```

- [ ] Update React type definitions
  ```bash
  npm install -D @types/react@^19.0.0 @types/react-dom@^19.0.0
  ```

- [ ] Verify versions installed
  ```bash
  npm list react react-dom @types/react @types/react-dom
  ```

### React Ecosystem Packages

- [ ] Update React Router (if < v6.28)
  ```bash
  npm install react-router-dom@^6.28.0
  ```

- [ ] Update Testing Library
  ```bash
  npm install -D @testing-library/react@^16.0.0
  ```

- [ ] Update TanStack Query (verify v5+)
  ```bash
  npm list @tanstack/react-query
  # Should be v5.x or higher
  ```

- [ ] Check other React-dependent packages
  - [ ] react-hook-form (if used)
  - [ ] react-error-boundary (if used)
  - [ ] Any other react-* packages

### Verify No Conflicts

- [ ] Run npm install to resolve dependencies
  ```bash
  npm install
  ```

- [ ] Check for peer dependency warnings
  ```bash
  npm list --depth=0 2>&1 | grep -i "peer"
  ```

- [ ] Resolve any peer dependency issues before proceeding

---

## Phase 3: Update Import Paths

### Automated Path Updates

- [ ] Update relative imports to use @/ alias
  ```bash
  # In apps/agent-desktop/src directory
  find . -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|from '\./|from '@/|g"
  find . -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|from "\./|from "@/|g'
  ```

- [ ] Update parent directory imports
  ```bash
  # Review and update manually - more complex patterns
  grep -r "from '\.\." apps/agent-desktop/src
  ```

### Manual Verification

- [ ] Check for broken imports
  ```bash
  npx tsc --noEmit
  ```

- [ ] Fix any import errors found

- [ ] Verify all @/ alias imports resolve correctly

---

## Phase 4: React 19 Breaking Changes

### 1. ref as Prop

**What Changed:** React 19 supports `ref` as a regular prop, making `forwardRef` optional in many cases.

- [ ] Find all forwardRef usage
  ```bash
  grep -r "forwardRef" apps/agent-desktop/src
  ```

- [ ] Review each forwardRef usage:
  - [ ] Can it be removed? (if component only forwards ref)
  - [ ] Does it need to stay? (if component uses ref internally)

- [ ] Test components after removing forwardRef:
  - [ ] shadcn/ui components (Button, Input, Dialog, etc.)
  - [ ] Custom components with ref forwarding

**Example Change:**
```typescript
// Before (React 18)
const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <button ref={ref} {...props} />;
});

// After (React 19) - ref is just a prop
const Button = ({ ref, ...props }: ButtonProps & { ref?: Ref<HTMLButtonElement> }) => {
  return <button ref={ref} {...props} />;
};
```

### 2. useEffect Timing

**What Changed:** React 19 may have different cleanup timing for effects.

- [ ] Review all useEffect hooks with cleanup functions
  ```bash
  grep -A 10 "useEffect" apps/agent-desktop/src | grep "return () =>"
  ```

- [ ] Test components with subscriptions:
  - [ ] WebSocket connections
  - [ ] Event listeners
  - [ ] Timers/intervals
  - [ ] API polling

- [ ] Verify cleanup happens at correct time:
  - [ ] No memory leaks
  - [ ] No duplicate subscriptions
  - [ ] No race conditions

**Components to Check:**
- [ ] NotificationContext.tsx (WebSocket subscriptions)
- [ ] CallContext.tsx (call state management)
- [ ] AgentStatusContext.tsx (status polling)

### 3. Context API

**What Changed:** Context behavior is more consistent in React 19.

- [ ] Test all context providers:
  - [ ] AgentStatusContext
  - [ ] EnhancedAgentStatusContext
  - [ ] NotificationContext
  - [ ] CallContext

- [ ] Verify context updates propagate correctly:
  - [ ] No unnecessary re-renders
  - [ ] Values update when expected
  - [ ] No stale closures

- [ ] Check for context-related console warnings

**Test Scenarios:**
- [ ] Update agent status → UI reflects change
- [ ] Receive notification → Notification appears
- [ ] Start call → Call widget updates
- [ ] Multiple context updates → All propagate correctly

### 4. Event Handling

**What Changed:** Synthetic event pooling removed, event handling more consistent.

- [ ] Test form submissions:
  - [ ] CreateTicketDialog
  - [ ] EmailReplyDialog
  - [ ] TransferCallDialog
  - [ ] Any other forms

- [ ] Test event handlers:
  - [ ] Click handlers
  - [ ] Keyboard events (Enter, Escape, etc.)
  - [ ] Mouse events (hover, drag, etc.)
  - [ ] Touch events (if applicable)

- [ ] Verify event methods work:
  - [ ] event.preventDefault()
  - [ ] event.stopPropagation()
  - [ ] event.target access

### 5. Suspense Boundaries

**What Changed:** Suspense behavior improved, more consistent.

- [ ] Check if any components use Suspense
  ```bash
  grep -r "Suspense" apps/agent-desktop/src
  ```

- [ ] If Suspense is used:
  - [ ] Test loading states
  - [ ] Test error boundaries
  - [ ] Verify fallback UI displays correctly

- [ ] Test lazy-loaded components (if any)
  ```bash
  grep -r "lazy(" apps/agent-desktop/src
  ```

### 6. Automatic Batching

**What Changed:** React 19 has enhanced automatic batching of state updates.

- [ ] Identify components with multiple setState calls:
  ```bash
  grep -A 5 "setState" apps/agent-desktop/src
  ```

- [ ] Test for unexpected re-renders:
  - [ ] Open React DevTools
  - [ ] Enable "Highlight updates when components render"
  - [ ] Interact with components
  - [ ] Check for excessive re-renders

- [ ] Components to monitor:
  - [ ] InteractionList (frequent updates)
  - [ ] CustomerInfoScrollFixed (data updates)
  - [ ] AIAssistantChat (message updates)

### 7. New Hooks (Optional)

**What's New:** React 19 introduces new hooks (use, useOptimistic, useFormStatus).

- [ ] Note: Existing code should work without these hooks
- [ ] Consider using new hooks in future development:
  - [ ] `use()` for reading promises/context
  - [ ] `useOptimistic()` for optimistic UI updates
  - [ ] `useFormStatus()` for form state management

- [ ] Document opportunities to use new hooks in future

---

## Phase 5: Component Testing

### Critical Components (Test First)

- [ ] **App.tsx**
  - [ ] App renders without errors
  - [ ] All providers wrap correctly
  - [ ] Routing works
  - [ ] No console errors

- [ ] **EnhancedAgentStatusContext.tsx**
  - [ ] Agent status updates correctly
  - [ ] Status changes propagate to UI
  - [ ] No memory leaks from status polling

- [ ] **NotificationContext.tsx**
  - [ ] Notifications display correctly
  - [ ] Notification actions work
  - [ ] WebSocket connection stable

- [ ] **CallContext.tsx**
  - [ ] Call state management works
  - [ ] Call actions (answer, hold, transfer) work
  - [ ] Call widget updates correctly

- [ ] **InteractionList.tsx**
  - [ ] Interactions load and display
  - [ ] Filtering works
  - [ ] Sorting works
  - [ ] Selection works

- [ ] **CustomerInfoScrollFixed.tsx**
  - [ ] Customer data displays
  - [ ] Scrolling works
  - [ ] Data updates correctly

### UI Components (shadcn/ui)

- [ ] **Dialog Components**
  - [ ] CreateTicketDialog opens/closes
  - [ ] EmailReplyDialog works
  - [ ] TransferCallDialog works
  - [ ] Modal backdrop works
  - [ ] Focus trap works

- [ ] **Form Components**
  - [ ] Input accepts text
  - [ ] Select shows options
  - [ ] Textarea accepts multiline
  - [ ] Checkbox toggles
  - [ ] Radio buttons work
  - [ ] Form validation works

- [ ] **Navigation Components**
  - [ ] Tabs switch correctly
  - [ ] Accordion expands/collapses
  - [ ] Dropdown opens/closes
  - [ ] Menu items clickable

- [ ] **Feedback Components**
  - [ ] Alert displays messages
  - [ ] Toast/Sonner shows notifications
  - [ ] Badge displays correctly
  - [ ] Progress indicators work

### Complex Interactions

- [ ] **AIAssistantChat**
  - [ ] Chat interface renders
  - [ ] Messages send/receive
  - [ ] Suggestions display
  - [ ] Scroll behavior correct

- [ ] **CallTimeline**
  - [ ] Timeline renders
  - [ ] Events display in order
  - [ ] Timeline updates in real-time

- [ ] **EmailThread**
  - [ ] Email thread displays
  - [ ] Reply/forward works
  - [ ] Attachments show

- [ ] **KnowledgeBaseSearch**
  - [ ] Search input works
  - [ ] Results display
  - [ ] Article preview works

- [ ] **FloatingCallWidget**
  - [ ] Widget floats correctly
  - [ ] Drag and drop works
  - [ ] Minimize/maximize works

### Custom Hooks

- [ ] **useInteractionStats**
  - [ ] Hook returns correct data
  - [ ] Statistics calculate correctly
  - [ ] Updates when data changes

- [ ] **Other custom hooks**
  - [ ] Test each custom hook
  - [ ] Verify return values
  - [ ] Check for memory leaks

---

## Phase 6: Build and Runtime Verification

### TypeScript Compilation

- [ ] Run TypeScript compiler
  ```bash
  npx tsc --noEmit
  ```

- [ ] Fix any type errors:
  - [ ] Especially ref-related types
  - [ ] Event handler types
  - [ ] Context types

- [ ] Verify no implicit any errors

### Build Process

- [ ] Build the application
  ```bash
  npx nx build agent-desktop
  ```

- [ ] Check build output:
  - [ ] No errors
  - [ ] No warnings (or document acceptable warnings)
  - [ ] Build completes successfully

- [ ] Verify build artifacts:
  ```bash
  ls -la dist/apps/agent-desktop
  ```

### Development Server

- [ ] Start development server
  ```bash
  npx nx serve agent-desktop
  ```

- [ ] Verify server starts:
  - [ ] No startup errors
  - [ ] Port 3000 accessible
  - [ ] Hot reload works

### Browser Console

- [ ] Open browser console (F12)

- [ ] Check for errors:
  - [ ] No React errors
  - [ ] No type errors
  - [ ] No network errors

- [ ] Check for warnings:
  - [ ] No "React 18" deprecation warnings
  - [ ] No "forwardRef" warnings
  - [ ] Document any acceptable warnings

### React DevTools

- [ ] Install React DevTools (if not installed)

- [ ] Verify React version:
  - [ ] Should show React 19.2.x
  - [ ] Components tree displays correctly

- [ ] Check component profiling:
  - [ ] No excessive re-renders
  - [ ] Performance acceptable

---

## Phase 7: Visual and Functional Testing

### Layout Verification

- [ ] **Main Layout**
  - [ ] Header displays correctly
  - [ ] Sidebar shows/hides
  - [ ] Main content area renders
  - [ ] Footer (if any) displays

- [ ] **Responsive Design**
  - [ ] Desktop view (1920x1080)
  - [ ] Laptop view (1366x768)
  - [ ] Tablet view (768x1024)
  - [ ] Mobile view (375x667) - if supported

- [ ] **Component Positioning**
  - [ ] No layout shifts
  - [ ] No overlapping elements
  - [ ] Spacing consistent

### Navigation Testing

- [ ] **Route Navigation**
  - [ ] All navigation links work
  - [ ] URL updates correctly
  - [ ] Page content changes

- [ ] **Browser Navigation**
  - [ ] Back button works
  - [ ] Forward button works
  - [ ] Refresh preserves state (if expected)

- [ ] **Deep Linking**
  - [ ] Direct URL access works
  - [ ] Query parameters preserved

### Form Testing

- [ ] **Form Submission**
  - [ ] Forms submit correctly
  - [ ] Data sent to backend (or mocked)
  - [ ] Success messages display

- [ ] **Form Validation**
  - [ ] Required fields validated
  - [ ] Format validation works (email, phone, etc.)
  - [ ] Error messages display correctly

- [ ] **Form Reset**
  - [ ] Reset button clears form
  - [ ] Cancel button closes dialog

### Real-time Features

- [ ] **Notification System**
  - [ ] Notifications appear
  - [ ] Notification actions work
  - [ ] Notifications dismiss

- [ ] **Agent Status**
  - [ ] Status updates in real-time
  - [ ] Status changes reflect in UI
  - [ ] Status indicator correct

- [ ] **Call Widget**
  - [ ] Call widget appears on call
  - [ ] Call controls work
  - [ ] Call timer updates

### Performance Check

- [ ] **Load Time**
  - [ ] Initial load < 3 seconds
  - [ ] Subsequent loads faster (caching)

- [ ] **Interaction Responsiveness**
  - [ ] Clicks respond immediately
  - [ ] Forms feel responsive
  - [ ] No lag in UI updates

- [ ] **Memory Usage**
  - [ ] Check browser task manager
  - [ ] No memory leaks over time
  - [ ] Memory usage reasonable

---

## Phase 8: Create Migration Report

### Document Changes

- [ ] Create migration report file
  ```bash
  touch apps/agent-desktop/REACT_19_MIGRATION.md
  ```

- [ ] Document breaking changes encountered:
  - [ ] List each breaking change
  - [ ] How it was resolved
  - [ ] Impact on codebase

- [ ] List modified components:
  - [ ] Component name
  - [ ] What changed
  - [ ] Why it changed

- [ ] Note performance changes:
  - [ ] Improvements observed
  - [ ] Regressions observed
  - [ ] Metrics (if available)

### Follow-up Tasks

- [ ] Create list of follow-up tasks:
  - [ ] Refactoring opportunities
  - [ ] New React 19 features to adopt
  - [ ] Technical debt to address

- [ ] Prioritize follow-up tasks:
  - [ ] High priority (blocking)
  - [ ] Medium priority (important)
  - [ ] Low priority (nice to have)

### Report Template

```markdown
# React 19 Migration Report

## Summary
- **Migration Date:** [Date]
- **React Version:** 18.x → 19.2.x
- **Duration:** [Hours]
- **Status:** [Success/Partial/Failed]

## Breaking Changes Encountered
1. [Breaking change 1]
   - **Impact:** [Description]
   - **Resolution:** [How fixed]
   
2. [Breaking change 2]
   - **Impact:** [Description]
   - **Resolution:** [How fixed]

## Modified Components
- [Component 1]: [Changes made]
- [Component 2]: [Changes made]

## Performance Impact
- **Load Time:** [Before] → [After]
- **Memory Usage:** [Before] → [After]
- **Re-renders:** [Observations]

## Follow-up Tasks
- [ ] [Task 1]
- [ ] [Task 2]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

---

## Phase 9: Final Verification

### Test Suite

- [ ] Run full test suite (if tests exist)
  ```bash
  npx nx test agent-desktop
  ```

- [ ] All tests pass:
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] Component tests

- [ ] Fix any failing tests:
  - [ ] Update test expectations if needed
  - [ ] Fix broken functionality

### Functionality Checklist

- [ ] **Core Features Work**
  - [ ] User can log in (if auth implemented)
  - [ ] Dashboard displays data
  - [ ] Interactions can be viewed
  - [ ] Customer info displays
  - [ ] Forms can be submitted

- [ ] **No Regressions**
  - [ ] All features that worked before still work
  - [ ] No new bugs introduced
  - [ ] Performance not degraded

### Stakeholder Approval

- [ ] Demo to team/stakeholder:
  - [ ] Show key features working
  - [ ] Explain changes made
  - [ ] Address any concerns

- [ ] Get approval to proceed:
  - [ ] Written approval (email/Slack)
  - [ ] Document approval in migration report

### Commit Changes

- [ ] Stage all changes
  ```bash
  git add .
  ```

- [ ] Create detailed commit message:
  ```bash
  git commit -m "feat(agent-desktop): upgrade React 18 to React 19.2.x

  - Migrated /src to apps/agent-desktop/src
  - Updated React and ReactDOM to 19.2.x
  - Updated @types/react and @types/react-dom
  - Updated import paths to use @/ alias
  - Fixed ref forwarding in [components]
  - Updated useEffect cleanup in [components]
  - Tested all critical components
  - Verified no regressions
  
  Breaking changes:
  - [List breaking changes]
  
  See REACT_19_MIGRATION.md for full details.
  
  Closes #[issue-number]"
  ```

- [ ] Push to feature branch
  ```bash
  git push origin feature/react-19-upgrade
  ```

---

## Rollback Plan

### If Critical Issues Found

- [ ] **Stop immediately** if:
  - [ ] App won't build
  - [ ] App won't start
  - [ ] Critical features broken
  - [ ] Data loss risk

- [ ] **Restore from backup:**
  ```bash
  # Remove new directory
  rm -rf apps/agent-desktop/src
  
  # Restore backup
  cp -r src.backup.[timestamp] src
  
  # Revert package.json
  git checkout package.json package-lock.json
  
  # Reinstall old dependencies
  npm install
  ```

- [ ] **Document issues:**
  - [ ] What went wrong
  - [ ] Why rollback needed
  - [ ] What needs to be fixed

- [ ] **Plan retry:**
  - [ ] Address issues found
  - [ ] Update checklist
  - [ ] Schedule new attempt

---

## Success Criteria

### Migration is Successful When:

- [x] All files moved to apps/agent-desktop/src
- [x] React 19.2.x installed and verified
- [x] All imports updated to use @/ alias
- [x] No TypeScript errors
- [x] App builds successfully
- [x] App runs without errors
- [x] All critical components work
- [x] No visual regressions
- [x] No functional regressions
- [x] Performance acceptable
- [x] Migration report created
- [x] Stakeholder approval received
- [x] Changes committed

---

## Additional Resources

### React 19 Documentation
- [React 19 Release Notes](https://react.dev/blog/2024/04/25/react-19)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React 19 Breaking Changes](https://react.dev/blog/2024/04/25/react-19-breaking-changes)

### Tools
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Can I Use](https://caniuse.com/) - Browser compatibility

### Support
- React Discord: https://discord.gg/react
- Stack Overflow: [react] tag
- GitHub Issues: React repository

---

**Last Updated:** 2026-03-08  
**Version:** 1.0  
**Status:** Ready for Use
