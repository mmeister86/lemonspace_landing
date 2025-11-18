# Save API Implementation Plan

## Original Plan Overview

1. **API Layer**

   - Add a `PUT /api/boards/[id]` handler that follows the existing Next.js App Router route conventions.
   - Use the same `createSupabaseUserContext` pattern for auth and session management.
   - Validate payloads using Zod schemas aligned with the existing `BoardData` structure.
   - Support partial updates (title, slug, grid_config, blocks, visibility, metadata, etc.) while normalizing JSONB fields before persisting to Supabase.
   - Return structured responses with success/error payloads and metadata (e.g., `savedAt`, `changedFields`).

2. **Client Save Service**

   - Introduce a dedicated save service (client-side) responsible for debouncing changes, queueing requests, and calling the new API endpoint.
   - Provide consistent error handling, retries, and cancellation when navigating away.
   - Expose imperative helpers (e.g., `flushPendingSave`) so UI components can force immediate saves.

3. **State Management (Zustand Store)**

   - Extend the canvas store with save state (`isSaving`, `hasUnsavedChanges`, `lastSavedAt`, `error`).
   - Track pending mutations and optimistic updates per board.
   - Offer selectors/actions to toggle manual save indicators and to reset state when switching boards.

4. **UI Integration**

   - Replace the current ad-hoc autosave logic in [`app/[locale]/builder/builder-client.tsx`](app/[locale]/builder/builder-client.tsx) with the new service/store actions.
   - Wire the menubar "Speichern" action (Ctrl/Cmd+S) to trigger `flushPendingSave` and surface toast feedback.
   - Display save status (Saving…, Saved, Error) in the builder header, plus retry affordances when errors occur.

5. **Resilience & UX**

   - Implement optimistic updates with rollback if the API rejects a change.
   - Add an exponential backoff retry strategy for transient failures.
   - Guard against duplicate requests by coalescing identical payloads inside the save queue.
   - Surface detailed error reasons (validation vs network) via Sonner toasts.

6. **Testing & Observability**
   - Add route tests for the new PUT handler (mirroring the existing GET tests).
   - Cover the save service with unit tests (debounce, queue, retry, flush).
   - Add logging for save attempts, successes, failures, and retries to aid debugging.

## Open Bullet Points / Action Items

- [x] Create PUT method in existing `/api/boards/[id]/route.ts` following Next.js App Router patterns.
- [x] Implement comprehensive Zod validation for board updates following existing patterns.
- [x] Create save-api service with proper error handling and debouncing.
- [ ] Extend Zustand store with save state management following async action patterns.
- [ ] Replace existing autosave with unified save system using Zustand async actions.
- [ ] Integrate manual save in `BuilderMenubar` with proper error handling.
- [ ] Add save status indicators using toast notifications and UI feedback.
- [ ] Implement optimistic updates with rollback on save failure.
- [ ] Add retry mechanism with exponential backoff for failed saves.
- [ ] Create comprehensive save queue system for handling rapid changes.

## Step 1 Implementation Notes

### ✅ PUT Method Handler
- Added comprehensive PUT endpoint to `/api/boards/[id]/route.ts`
- Follows Next.js App Router patterns with proper async/await
- Includes parameter validation and error handling

### ✅ Authentication & Authorization
- Uses existing `createSupabaseUserContext` pattern
- Verifies user is authenticated (401 if not)
- Checks board ownership (403 if not owner)
- Supports both `user_id` and `owner_id` for backward compatibility

### ✅ Zod Validation
- Created comprehensive schemas extending existing patterns
- Supports partial updates with all fields optional
- Validates grid_config, blocks, title, slug, visibility, metadata
- Includes proper type checking and constraints
- Returns detailed validation errors with field-level feedback

### ✅ Database Operations
- Uses Supabase client with proper error handling
- Implements partial updates (only updates provided fields)
- Compares existing values to avoid unnecessary database operations
- Normalizes JSONB fields before persisting
- Updates `updated_at` timestamp automatically

### ✅ Response Structure
- Consistent with existing API response patterns
- Returns updated board data with metadata
- Includes `changedFields` array and `savedAt` information
- Proper HTTP status codes for all scenarios

### ✅ Error Handling
- **400** for validation errors, invalid JSON, no changes
- **401** for authentication errors
- **403** for authorization errors
- **404** for board not found
- **500** for database errors with proper logging
- Detailed error messages and stack traces in development

### ✅ Type Safety
- Updated APIResponse types to support new metadata fields
- All TypeScript compilation successful
- Proper typing for request/response payloads

### ✅ Testing Documentation
- Added comprehensive test scenarios to `route.test.ts`
- Covers authentication, authorization, validation
- Includes example request/response formats
- Documents edge cases and error conditions

## Step 2 Implementation Notes

### ✅ Client Save Service
- Created `BoardSaveService` class in `lib/services/save-service.ts`
- Implemented debouncing (1s default) for auto-saving
- Added `flush()` method for immediate saving (manual save)
- Implemented queueing system for pending changes
- Added robust error handling and state management
- Added retry logic with exponential backoff for background saves

### ✅ API Integration
- Updated `lib/services/api-board-service.ts` with `updateBoardViaAPI`
- Handles PUT requests to the new API endpoint
- Includes timeout handling (25s)
- Parses detailed validation errors

### ✅ Testing
- Created unit tests in `lib/services/save-service.test.ts`
- Verified debouncing, flushing, and error handling scenarios
- configured `jest.config.js` for the project
