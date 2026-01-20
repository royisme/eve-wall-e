# Phase 5.1, 5.3, 5.5 Task Breakdown

> Detailed implementation tasks for Offline Support, Error Handling, and Settings & Preferences.

---

## 5.1 Offline Support

### Task 5.1.1: Install and Configure idb Library

**Goal**: Add the `idb` library and create TypeScript types for IndexedDB schema.

**Size**: S (Small)

**Files**:
- `package.json` - Add `idb` dependency
- `src/lib/db/schema.ts` - Create (IndexedDB schema types)

**Implementation**:
1. Run `bun add idb`
2. Define schema types:
   - `jobs` store: `{ id, title, company, location, url, status, matchScore, source, jdMarkdown, createdAt, appliedAt, starred, syncedAt }`
   - `resumes` store: `{ id, name, content, isDefault, useCount, source, parseStatus, parseErrors, createdAt, updatedAt, syncedAt }`
   - `tailoredResumes` store: `{ id, jobId, resumeId, content, suggestions, version, isNew, createdAt, syncedAt }`
   - `actionQueue` store: `{ id, action, payload, createdAt, status, retryCount }`

**Acceptance**:
- [ ] `idb` package installed and visible in package.json
- [ ] `schema.ts` exports all store types with proper TypeScript definitions
- [ ] Types match existing `Job`, `Resume`, `TailoredResume` from `src/lib/api.ts`

---

### Task 5.1.2: Create IndexedDB Database Module

**Goal**: Implement database initialization and CRUD operations using `idb`.

**Size**: M (Medium)

**Files**:
- `src/lib/db/index.ts` - Create (main DB module with open, CRUD operations)
- `src/lib/db/migrations.ts` - Create (version upgrade handlers)

**Implementation**:
1. Create `openDB` wrapper with versioning (start at v1)
2. Implement generic CRUD helpers:
   - `getAll(storeName)` - Retrieve all records
   - `get(storeName, id)` - Get single record
   - `put(storeName, data)` - Upsert record
   - `delete(storeName, id)` - Remove record
   - `clear(storeName)` - Clear store
3. Add index on `syncedAt` for efficient sync queries
4. Handle upgrade paths in migrations.ts

**Acceptance**:
- [ ] Database opens without errors in extension context
- [ ] All CRUD operations work correctly
- [ ] Schema version is tracked and upgrades execute
- [ ] Console shows no IndexedDB errors

---

### Task 5.1.3: Create Sync Service Core

**Goal**: Build the synchronization service that manages offline/online data flow.

**Size**: L (Large)

**Files**:
- `src/lib/sync/syncService.ts` - Create (main sync orchestrator)
- `src/lib/sync/actionQueue.ts` - Create (pending action management)
- `src/lib/sync/types.ts` - Create (sync-related types)

**Implementation**:
1. Define `QueuedAction` type:
   ```typescript
   type QueuedAction = {
     id: string;
     action: 'CREATE_JOB' | 'UPDATE_JOB' | 'DELETE_JOB' | 'UPDATE_RESUME' | 'UPDATE_TAILORED';
     payload: unknown;
     createdAt: Date;
     status: 'pending' | 'syncing' | 'failed';
     retryCount: number;
   };
   ```
2. Implement `queueAction(action)` - Add to IndexedDB queue
3. Implement `processQueue()` - Execute pending actions when online
4. Implement `syncFromServer()` - Pull latest data from Eve API
5. Add retry logic with exponential backoff (max 3 retries)
6. Handle conflict resolution (server wins for now)

**Acceptance**:
- [ ] Actions queue to IndexedDB when offline
- [ ] Queue processes automatically when connection restored
- [ ] Failed actions retry with backoff
- [ ] Sync pulls fresh data from server

---

### Task 5.1.4: Create Connection Status Hook

**Goal**: Create React hook to monitor Eve backend connection status.

**Size**: S (Small)

**Files**:
- `src/hooks/useConnectionStatus.ts` - Create

**Implementation**:
1. Use `navigator.onLine` for basic network detection
2. Periodically ping `/health` endpoint (every 30s when online)
3. Track connection state: `'online' | 'offline' | 'reconnecting'`
4. Expose `lastChecked` timestamp
5. Provide `checkNow()` function for manual refresh

**Acceptance**:
- [ ] Hook returns correct status when Eve is running/stopped
- [ ] Status updates within 5 seconds of network change
- [ ] Manual check triggers immediate status update
- [ ] Works in Chrome extension context

---

### Task 5.1.5: Create Offline Banner Component

**Goal**: Persistent banner that shows when user is offline or Eve is unreachable.

**Size**: S (Small)

**Files**:
- `src/components/OfflineBanner.tsx` - Create

**Implementation**:
1. Consume `useConnectionStatus` hook
2. Show banner at top of screen when offline:
   - Yellow background for "reconnecting"
   - Red background for "offline"
3. Display message: "You're offline. Changes will sync when reconnected."
4. Include pending action count if > 0
5. Animate in/out with CSS transitions
6. Dismiss automatically when connection restored

**Acceptance**:
- [ ] Banner appears when Eve backend stops
- [ ] Banner shows pending action count
- [ ] Banner auto-hides when connection restored
- [ ] Smooth animation transitions
- [ ] Does not block content below

---

### Task 5.1.6: Create Toast Notification System

**Goal**: Toast notifications for connection status changes and sync events.

**Size**: M (Medium)

**Files**:
- `src/components/ui/toast.tsx` - Create (Toast component)
- `src/components/ui/toaster.tsx` - Create (Toast container)
- `src/hooks/useToast.ts` - Create (Toast state management)
- `src/lib/toast.ts` - Create (imperative toast API)

**Implementation**:
1. Create toast state with reducer pattern
2. Support toast types: `success`, `error`, `warning`, `info`
3. Auto-dismiss after 4 seconds (configurable)
4. Stack multiple toasts (max 3 visible)
5. Provide imperative API: `toast.success("Message")`
6. Animate with slide-in from top-right

**Acceptance**:
- [ ] Toasts display correctly with all types
- [ ] Auto-dismiss works
- [ ] Multiple toasts stack properly
- [ ] Can be dismissed manually
- [ ] Imperative API works from non-React code

---

### Task 5.1.7: Integrate Caching into API Layer

**Goal**: Add cache-first strategy to API calls with fallback to IndexedDB.

**Size**: L (Large)

**Files**:
- `src/lib/api.ts` - Modify (add caching layer)
- `src/lib/cache/cacheStrategy.ts` - Create (caching logic)

**Implementation**:
1. Create `withCache` wrapper for API functions:
   ```typescript
   async function withCache<T>(
     key: string,
     fetcher: () => Promise<T>,
     options?: { maxAge?: number; fallback?: T }
   ): Promise<T>
   ```
2. Strategy per endpoint:
   - `getJobs`: Cache-first, refresh in background
   - `getResumes`: Cache-first, refresh in background
   - `getJobDetail`: Cache-first with 5min TTL
   - `tailorResume`: Network-only (queue if offline)
   - `updateJob`: Network-first, queue if offline
3. Update `fetchWithAuth` to catch network errors and return cached data
4. Store `lastFetched` metadata with cached items

**Acceptance**:
- [ ] Data loads instantly from cache on page load
- [ ] Background refresh updates cache silently
- [ ] Network errors fall back to cached data
- [ ] Mutations queue when offline
- [ ] No duplicate requests for same resource

---

### Task 5.1.8: Add Toaster and Banner to App Layout

**Goal**: Integrate offline UI components into the main app structure.

**Size**: S (Small)

**Files**:
- `src/App.tsx` - Modify (add Toaster and OfflineBanner)
- `src/workspace/Workspace.tsx` - Modify (add Toaster)

**Implementation**:
1. Import `Toaster` and `OfflineBanner` components
2. Add `<OfflineBanner />` at top of SidePanel layout
3. Add `<Toaster />` as sibling to Routes
4. Add `<OfflineBanner />` to Workspace header
5. Trigger toast on connection state changes

**Acceptance**:
- [ ] Banner visible in both SidePanel and Workspace when offline
- [ ] Toasts appear in correct position
- [ ] No layout shift when banner appears/disappears
- [ ] Toast appears when going offline: "Connection lost"
- [ ] Toast appears when reconnecting: "Connection restored"

---

## 5.3 Error Handling

### Task 5.3.1: Enhance ErrorBoundary Component

**Goal**: Improve existing ErrorBoundary with better UX, reporting, and i18n.

**Size**: M (Medium)

**Files**:
- `src/components/ErrorBoundary.tsx` - Modify
- `src/i18n/locales/en.json` - Modify (add error translations)
- `src/i18n/locales/zh.json` - Modify (add error translations)

**Implementation**:
1. Add i18n support for error messages
2. Add error categorization:
   - `NetworkError` - Show retry button + offline hint
   - `ValidationError` - Show specific field errors
   - `UnknownError` - Show generic message + report option
3. Add "Copy Error Details" button for support
4. Add optional `onError` callback prop for logging/analytics
5. Style improvements:
   - Use Card component for consistency
   - Add subtle background pattern
   - Better spacing and typography

**Acceptance**:
- [ ] Error messages display in selected language
- [ ] Different error types show appropriate UI
- [ ] "Copy Error Details" copies stack trace to clipboard
- [ ] Reset button clears error and re-renders children
- [ ] Styling matches application design system

---

### Task 5.3.2: Create Loading State Components

**Goal**: Consistent loading UI components for various contexts.

**Size**: M (Medium)

**Files**:
- `src/components/ui/skeleton.tsx` - Create (skeleton loader)
- `src/components/ui/spinner.tsx` - Create (spinner component)
- `src/components/LoadingStates.tsx` - Create (preset loading states)

**Implementation**:
1. Create `Skeleton` component with shimmer animation:
   - `<Skeleton className="h-4 w-full" />`
   - Support for circle, text, card shapes
2. Create `Spinner` component (wrap existing Loader2):
   - Sizes: sm, md, lg
   - Colors: primary, muted
3. Create preset loading states:
   - `JobCardSkeleton` - For job list items
   - `ResumeCardSkeleton` - For resume list items
   - `WorkspaceSkeleton` - For workspace view
   - `FullPageLoader` - Centered spinner with message

**Acceptance**:
- [ ] Skeletons match the dimensions of real content
- [ ] Shimmer animation is smooth
- [ ] Spinner sizes are consistent
- [ ] Loading states used in JobsList, ResumeLibrary, Workspace

---

### Task 5.3.3: Create API Error Handler Utility

**Goal**: Centralized error handling for API responses with user-friendly messages.

**Size**: S (Small)

**Files**:
- `src/lib/errors.ts` - Create

**Implementation**:
1. Define error types:
   ```typescript
   class ApiError extends Error {
     code: string;
     status: number;
     details?: Record<string, unknown>;
   }
   ```
2. Create error parser for API responses:
   - 400: "Invalid request"
   - 401: "Authentication required"
   - 404: "Resource not found"
   - 500: "Server error"
   - Network error: "Connection failed"
3. Create `handleApiError(error)` that:
   - Logs to console in development
   - Shows appropriate toast notification
   - Returns user-friendly message

**Acceptance**:
- [ ] All API errors map to user-friendly messages
- [ ] Error codes are consistent and documented
- [ ] Toast notifications appear for API errors
- [ ] Development mode shows full error details

---

### Task 5.3.4: Wrap App with ErrorBoundary

**Goal**: Add top-level error boundary to catch unhandled React errors.

**Size**: S (Small)

**Files**:
- `src/App.tsx` - Modify
- `src/main.tsx` - Modify (optional root boundary)

**Implementation**:
1. Wrap `QueryClientProvider` with ErrorBoundary in App.tsx
2. Add reset handler that clears query cache and resets router
3. Consider adding a second boundary at main.tsx for fatal errors
4. Add error logging to console (future: send to analytics)

**Acceptance**:
- [ ] Unhandled errors show ErrorBoundary UI instead of white screen
- [ ] "Try Again" button recovers the application
- [ ] Query cache clears on error recovery
- [ ] Error details logged to console

---

### Task 5.3.5: Wrap Workspace with ErrorBoundary

**Goal**: Isolate Workspace errors from main app for better resilience.

**Size**: S (Small)

**Files**:
- `src/App.tsx` - Modify (wrap Workspace route)
- `src/workspace/Workspace.tsx` - Modify (add internal boundaries)

**Implementation**:
1. Wrap `<Workspace />` route with dedicated ErrorBoundary
2. Add ErrorBoundary around MilkdownEditor (already exists, verify)
3. Add ErrorBoundary around PdfBuilder component
4. Custom fallback for Workspace: show job info + "Return to Jobs" button

**Acceptance**:
- [ ] Workspace errors don't crash main app
- [ ] Editor crash shows fallback textarea (existing behavior)
- [ ] PDF builder crash shows error message
- [ ] "Return to Jobs" navigates back correctly

---

### Task 5.3.6: Add Error Handling to React Query

**Goal**: Configure React Query with global error handling and retry logic.

**Size**: S (Small)

**Files**:
- `src/App.tsx` - Modify (QueryClient configuration)

**Implementation**:
1. Configure `QueryClient` with:
   ```typescript
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         retry: 2,
         retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
         staleTime: 30000,
         onError: (error) => handleApiError(error),
       },
       mutations: {
         retry: 1,
         onError: (error) => handleApiError(error),
       },
     },
   });
   ```
2. Add `useQueryErrorResetBoundary` support for ErrorBoundary
3. Show loading states during retries

**Acceptance**:
- [ ] Failed queries retry automatically
- [ ] Error toast appears after all retries fail
- [ ] Retry uses exponential backoff
- [ ] Error boundary can reset query state

---

## 5.5 Settings & Preferences

### Task 5.5.1: Add Connection Test Button

**Goal**: Allow users to test Eve backend connection from Settings.

**Size**: S (Small)

**Files**:
- `src/components/Settings.tsx` - Modify

**Implementation**:
1. Add "Test Connection" button next to server port input
2. On click:
   - Show loading spinner
   - Call `/health` endpoint
   - On success: Show green checkmark + "Connected" message
   - On failure: Show red X + error message
3. Display Eve version from health response on success
4. Disable button while test is in progress

**Acceptance**:
- [ ] Button triggers connection test
- [ ] Success shows Eve version
- [ ] Failure shows error message
- [ ] Loading state prevents double-click

---

### Task 5.5.2: Add Data Management Section

**Goal**: Section for managing local cache and synced data.

**Size**: M (Medium)

**Files**:
- `src/components/Settings.tsx` - Modify
- `src/components/SettingsDataSection.tsx` - Create (extracted component)

**Implementation**:
1. Create "Data Management" section in Settings:
   - Display cache size (approximate from IndexedDB)
   - Display last sync time
   - Display pending actions count
2. Add "Clear Cache" button with confirmation dialog:
   - Clears all IndexedDB data
   - Preserves settings in chrome.storage
3. Add "Force Sync" button:
   - Triggers immediate full sync
   - Shows progress indicator
4. Add "Export Data" button (future enhancement placeholder)

**Acceptance**:
- [ ] Cache size displays correctly
- [ ] "Clear Cache" removes IndexedDB data with confirmation
- [ ] "Force Sync" triggers sync and shows progress
- [ ] Settings persist after cache clear
- [ ] Toast confirms each action

---

### Task 5.5.3: Enhance Language Preference

**Goal**: Improve language selection UX and persistence.

**Size**: S (Small)

**Files**:
- `src/components/Settings.tsx` - Modify
- `src/i18n/index.ts` - Modify

**Implementation**:
1. Load language from chrome.storage on app init (before render)
2. Add language preview: "Preview: Hello / ..."
3. Apply language change immediately without save button
4. Sync language preference with IndexedDB for offline access
5. Add more language options placeholder (disabled items)

**Acceptance**:
- [ ] Language loads correctly on app startup
- [ ] Language change applies immediately
- [ ] Selected language persists across sessions
- [ ] Works offline (reads from IndexedDB)

---

### Task 5.5.4: Add Settings Sections Layout

**Goal**: Reorganize Settings into clear sections with better visual hierarchy.

**Size**: M (Medium)

**Files**:
- `src/components/Settings.tsx` - Modify (major refactor)
- `src/components/SettingsSection.tsx` - Create (reusable section wrapper)

**Implementation**:
1. Create `SettingsSection` component:
   - Icon + Title header
   - Description text
   - Content slot
2. Organize into sections:
   - **Connection**: Server port, test button
   - **Language**: Language selector
   - **Data**: Cache management, sync
   - **About**: Version info, links
3. Add dividers between sections
4. Improve mobile responsiveness

**Acceptance**:
- [ ] Settings organized into clear sections
- [ ] Each section has icon, title, description
- [ ] Visual hierarchy is clear
- [ ] Mobile layout works well

---

### Task 5.5.5: Add About Section

**Goal**: Display app version, build info, and helpful links.

**Size**: S (Small)

**Files**:
- `src/components/Settings.tsx` - Modify
- `src/components/SettingsAboutSection.tsx` - Create

**Implementation**:
1. Create "About" section with:
   - App name: "Wall-E"
   - Version from package.json (injected at build time)
   - Build date/commit (from Vite define)
2. Add links:
   - "Report Issue" - GitHub issues link
   - "Documentation" - Docs link
   - "Privacy Policy" - Privacy link (placeholder)
3. Add Eve connection status indicator

**Acceptance**:
- [ ] Version displays correctly
- [ ] Links open in new tab
- [ ] Eve status shows current connection state
- [ ] Matches design system styling

---

### Task 5.5.6: Settings State Persistence

**Goal**: Ensure all settings persist correctly across sessions and offline.

**Size**: S (Small)

**Files**:
- `src/lib/settings.ts` - Create (settings management)
- `src/hooks/useSettings.ts` - Create (React hook for settings)

**Implementation**:
1. Create settings manager:
   ```typescript
   interface Settings {
     serverPort: string;
     language: string;
     theme?: 'light' | 'dark' | 'system';
     lastSyncTime?: number;
   }
   ```
2. Primary storage: chrome.storage.local
3. Backup to IndexedDB for offline access
4. Create `useSettings` hook:
   - Load settings on mount
   - Provide update function
   - Sync changes to both storages
5. Handle migration from old settings format

**Acceptance**:
- [ ] Settings load on app startup
- [ ] Changes persist immediately
- [ ] Works in both extension and dev mode
- [ ] Offline access from IndexedDB backup

---

## Integration Tasks

### Task INT-1: End-to-End Offline Test

**Goal**: Verify complete offline workflow.

**Size**: M (Medium)

**Files**: None (testing only)

**Implementation**:
1. Load app with Eve running
2. Browse jobs and resumes (populates cache)
3. Stop Eve backend
4. Verify:
   - Banner appears
   - Data still visible from cache
   - Mutations queue
5. Start Eve backend
6. Verify:
   - Banner disappears
   - Toast shows "Connected"
   - Queued actions sync

**Acceptance**:
- [ ] All data accessible offline
- [ ] No errors when Eve is down
- [ ] Sync completes on reconnection
- [ ] UI indicates offline status

---

### Task INT-2: Error Recovery Test

**Goal**: Verify error handling and recovery flows.

**Size**: S (Small)

**Files**: None (testing only)

**Implementation**:
1. Trigger various errors:
   - Network timeout (slow Eve response)
   - Invalid API response
   - React component crash
2. Verify ErrorBoundary displays
3. Verify recovery via "Try Again"
4. Verify toast notifications appear

**Acceptance**:
- [ ] All error types handled gracefully
- [ ] User can recover from errors
- [ ] No data loss on recovery
- [ ] Errors logged to console

---

## Task Summary

| ID | Task | Size | Status |
|----|------|------|--------|
| 5.1.1 | Install idb Library | S | [ ] |
| 5.1.2 | Create IndexedDB Module | M | [ ] |
| 5.1.3 | Create Sync Service | L | [ ] |
| 5.1.4 | Connection Status Hook | S | [ ] |
| 5.1.5 | Offline Banner | S | [ ] |
| 5.1.6 | Toast System | M | [ ] |
| 5.1.7 | Cache Integration | L | [ ] |
| 5.1.8 | Add to App Layout | S | [ ] |
| 5.3.1 | Enhance ErrorBoundary | M | [ ] |
| 5.3.2 | Loading States | M | [ ] |
| 5.3.3 | API Error Handler | S | [ ] |
| 5.3.4 | Wrap App | S | [ ] |
| 5.3.5 | Wrap Workspace | S | [ ] |
| 5.3.6 | React Query Config | S | [ ] |
| 5.5.1 | Connection Test | S | [ ] |
| 5.5.2 | Data Management | M | [ ] |
| 5.5.3 | Language Preference | S | [ ] |
| 5.5.4 | Settings Layout | M | [ ] |
| 5.5.5 | About Section | S | [ ] |
| 5.5.6 | Settings Persistence | S | [ ] |
| INT-1 | Offline E2E Test | M | [ ] |
| INT-2 | Error Recovery Test | S | [ ] |

---

## Recommended Build Order

### Phase A: Foundation (Tasks: 5.1.1, 5.1.2, 5.3.3, 5.5.6)
Build the core infrastructure: IndexedDB, error utilities, settings management.

### Phase B: Connection Layer (Tasks: 5.1.4, 5.1.6, 5.5.1)
Establish connection monitoring and notification systems.

### Phase C: Offline UI (Tasks: 5.1.5, 5.1.8, 5.3.1, 5.3.2)
Build user-facing offline indicators and loading states.

### Phase D: Sync Engine (Tasks: 5.1.3, 5.1.7)
Implement the core sync service and cache integration.

### Phase E: Error Handling (Tasks: 5.3.4, 5.3.5, 5.3.6)
Wrap app with error boundaries and configure React Query.

### Phase F: Settings Enhancement (Tasks: 5.5.2, 5.5.3, 5.5.4, 5.5.5)
Polish the settings panel with all new features.

### Phase G: Integration Testing (Tasks: INT-1, INT-2)
End-to-end testing of complete flows.
