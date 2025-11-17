# Public Board Slug Resolution - Implementation Plan

## Executive Summary

This plan addresses non-deterministic public board slug resolution in [`app/api/boards/[id]/route.ts`](app/api/boards/[id]/route.ts:88-96) by implementing username-based disambiguation following Next.js and Supabase best practices.

**Problem**: Multiple public boards with identical slugs cause non-deterministic resolution.
**Solution**: Username-based slug resolution (`/api/boards/[slug]?username=johndoe`) with stable fallback.
**Impact**: Zero breaking changes, improved UX, deterministic behavior.

---

## Problem Statement

### Current Implementation (Lines 88-96)

```typescript
} else {
  // Unauthenticated user: Nur öffentliche Boards durchsuchen und das Neuste nehmen
  query = query
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(1);
}
```

**Issues**:

1. Non-deterministic when multiple public boards share the same slug
2. `created_at` ordering is arbitrary if timestamps are identical
3. No way to specify which user's board to retrieve
4. Missing `visibility` column in database schema

### Architecture Requirements

Per product specification:

- **Public URL Format**: `https://link.lemonspace.io/[username]/[slug]`
- **Slug Uniqueness**: Per-user only (constraint: `UNIQUE(user_id, slug)`)
- **Multi-tenancy**: Multiple users can have boards with identical slug names
- **Builder Access**: Authenticated users only, scoped to their own boards
- **Public Access**: View-only, no edit capabilities

---

## Solution Architecture

### Approach: Username-Based Resolution + Stable Fallback

Following **Next.js API Route patterns** and **Supabase multi-tenant best practices**:

#### 1. Primary: Username-Based Lookup (New Feature)

```typescript
GET /api/boards/my-board?username=johndoe
→ Returns johndoe's public board "my-board"
```

#### 2. Fallback: Stable Tiebreaker (Backward Compatibility)

```typescript
GET /api/boards/my-board
→ Returns public board via stable ordering: user_id ASC, created_at DESC
→ Logs deprecation warning
```

### Why This Approach?

✅ **Follows Next.js Patterns**: Query parameter extraction via `searchParams`
✅ **Supabase Best Practice**: Multi-tenant isolation via `user_id`
✅ **Zero Breaking Changes**: Existing URLs continue working
✅ **Deterministic**: Same inputs always produce same outputs
✅ **Clear Migration Path**: Deprecation warnings guide users to new format
✅ **Type-Safe**: Full TypeScript support with proper error handling

---

## Implementation Details

### Phase 1: Database Schema Updates

#### Migration: Add `visibility` Column

**File**: `docs/migrations/002-add-visibility-column.sql`

```sql
-- ============================================
-- Add visibility column to boards table
-- ============================================
-- This migration adds a visibility field to support
-- public/private/shared board access control

BEGIN;

-- Add visibility column with default 'private'
ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'private';

-- Add check constraint for valid values
ALTER TABLE public.boards
ADD CONSTRAINT boards_visibility_check
CHECK (visibility IN ('private', 'public', 'shared'));

-- Create index for public board queries (performance optimization)
CREATE INDEX IF NOT EXISTS boards_visibility_idx
ON public.boards(visibility)
WHERE visibility = 'public';

-- Create composite index for username + slug lookups
-- This enables fast resolution of public URLs: /[username]/[slug]
CREATE INDEX IF NOT EXISTS boards_user_slug_visibility_idx
ON public.boards(user_id, slug, visibility);

-- Update existing boards to 'private' (safe default)
UPDATE public.boards
SET visibility = 'private'
WHERE visibility IS NULL;

-- Add documentation
COMMENT ON COLUMN public.boards.visibility IS
'Board visibility: private (owner only), public (view-only via public link), shared (view-only with direct link)';

COMMIT;
```

**Rationale**:

- Partial index `WHERE visibility = 'public'` reduces index size (Postgres best practice)
- Composite index `(user_id, slug, visibility)` supports primary query pattern
- Default `'private'` ensures security-by-default
- No data loss risk - only adds column

---

### Phase 2: API Type Updates

#### Update [`lib/types/board-api.ts`](lib/types/board-api.ts:43-68)

```typescript
export interface DBBoardWithMeta {
  id: string;
  user_id: string; // Canonical owner field
  owner_id?: string; // Deprecated, for backward compatibility
  title: string;
  description?: string | null;
  slug: string;
  visibility: "private" | "public" | "shared"; // ← MAKE REQUIRED (was optional)
  thumbnail_url?: string | null;
  grid_config: {
    columns: number;
    gap: number;
  };
  blocks: unknown[];
  template_id?: string | null;
  is_template?: boolean;
  password_hash?: string | null;
  expires_at?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardMeta {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  visibility: "private" | "public" | "shared"; // ← MAKE REQUIRED
  thumbnailUrl?: string | null;
  ownerId: string;
  gridConfig: {
    columns: number;
    gap: number;
  };
  isTemplate?: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### Phase 3: Core API Logic Updates

#### Update [`app/api/boards/[id]/route.ts`](app/api/boards/[id]/route.ts)

##### 3.1 Add Username Resolution Helper

Insert after `isUUID()` function (around line 31):

```typescript
/**
 * Resolves a username to user_id by querying the users table
 * Follows Next.js pattern: async helper with proper error handling
 *
 * @param supabase - Supabase Client instance
 * @param username - Username to resolve
 * @returns user_id (auth_user_id) or null if not found
 */
async function resolveUsername(
  supabase: SupabaseClient,
  username: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("auth_user_id")
      .eq("username", username)
      .single();

    if (error) {
      // Log error but don't throw - return null for not found
      if (error.code !== "PGRST116") {
        console.error(`[API] Error resolving username "${username}":`, error);
      }
      return null;
    }

    return data?.auth_user_id || null;
  } catch (error) {
    console.error(
      `[API] Unexpected error resolving username "${username}":`,
      error
    );
    return null;
  }
}
```

**Best Practices Applied**:

- ✅ Error handling without throwing (Next.js pattern)
- ✅ Logging for debugging
- ✅ Type-safe return value
- ✅ Graceful degradation on failure

##### 3.2 Update `fetchBoardByIdOrSlug` Function

Replace the entire function (lines 39-98) with:

```typescript
/**
 * Fetches a board by UUID or slug with support for username-based resolution
 * Implements multi-tenant slug resolution following Supabase best practices
 *
 * @param supabase - Supabase Client
 * @param identifier - UUID or slug
 * @param userId - Optional: Authenticated user ID (for scoped access)
 * @param username - Optional: Username for public slug resolution
 * @returns Board data or error
 */
async function fetchBoardByIdOrSlug(
  supabase: SupabaseClient,
  identifier: string,
  userId?: string,
  username?: string
) {
  const selectQuery = `
    id,
    user_id,
    owner_id,
    title,
    description,
    slug,
    visibility,
    thumbnail_url,
    grid_config,
    blocks,
    template_id,
    is_template,
    expires_at,
    published_at,
    created_at,
    updated_at
  `;

  // UUID Lookup: Direct ID-based fetch (deterministic by design)
  if (isUUID(identifier)) {
    console.log(`[API] Board lookup: UUID=${identifier}`);
    return await supabase
      .from("boards")
      .select(selectQuery)
      .eq("id", identifier)
      .single();
  }

  // Slug Lookup: Multi-tenant resolution logic
  console.log(
    `[API] Board lookup: Slug=${identifier}` +
      `${userId ? `, UserId=${userId}` : ""}` +
      `${username ? `, Username=${username}` : ""}`
  );

  let query = supabase
    .from("boards")
    .select(selectQuery)
    .eq("slug", identifier);

  // CASE 1: Authenticated User (Builder Mode)
  // Scope to user's own boards - slug is unique per user
  if (userId) {
    console.log(`[API] Authenticated lookup: user_id=${userId}`);
    query = query.eq("user_id", userId);
    return await query.single();
  }

  // CASE 2: Unauthenticated with Username (Public Mode - PRIMARY)
  // Resolve specific user's public board - deterministic by design
  if (username) {
    console.log(`[API] Public lookup with username: ${username}`);

    const targetUserId = await resolveUsername(supabase, username);

    if (!targetUserId) {
      // Return error similar to "not found" for consistency
      return {
        data: null,
        error: {
          code: "USER_NOT_FOUND",
          message: `User "${username}" not found`,
          details: "username",
        },
      };
    }

    query = query.eq("user_id", targetUserId).eq("visibility", "public");

    return await query.single();
  }

  // CASE 3: Unauthenticated without Username (FALLBACK for backward compatibility)
  // Use stable tiebreaker to ensure deterministic resolution
  // This handles old URLs that don't include username
  console.warn(
    `[API] DEPRECATED: Public board accessed without username. ` +
      `Slug="${identifier}". Using fallback ordering. ` +
      `Update frontend to use username-based URLs: GET /api/boards/${identifier}?username=<username>`
  );

  query = query
    .eq("visibility", "public")
    .order("user_id", { ascending: true }) // Primary tiebreaker: lowest user_id
    .order("created_at", { ascending: false }) // Secondary: newest if same user
    .limit(1);

  return await query.maybeSingle();
}
```

**Best Practices Applied**:

- ✅ Clear documentation with JSDoc
- ✅ Explicit case handling with comments
- ✅ Deprecation warnings for migration guidance
- ✅ Deterministic ordering via stable tiebreaker
- ✅ Type-safe error returns
- ✅ Performance-optimized queries (indexed columns)

##### 3.3 Update GET Handler

Update the GET function to extract username parameter (around line 265):

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // 1. Extract board ID from params (Next.js pattern: params is Promise)
    const { id: boardId } = await params;

    if (!boardId || typeof boardId !== "string") {
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: {
            code: "INVALID_PARAMS",
            message: "Board ID is required",
          },
        },
        { status: 400 }
      );
    }

    // 2. Extract query parameters (Next.js pattern: searchParams)
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username") || undefined;

    if (username) {
      console.log(`[API] Public board request with username: ${username}`);
    }

    // 3. Check authentication
    const {
      supabase,
      user,
      error: authError,
    } = await createSupabaseUserContext(request);

    if (authError && authError.message !== "Auth session missing") {
      console.error("[API] Auth error:", authError);
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            details: authError?.message || "No valid session found",
          },
        },
        { status: 401 }
      );
    }

    // 4. Fetch board with username-aware resolution
    const { data: boardData, error: boardError } = await fetchBoardByIdOrSlug(
      supabase,
      boardId,
      user?.id, // Authenticated user context
      username // Public resolution context
    );

    // 5. Enhanced error handling
    if (boardError) {
      if (boardError.code === "PGRST116") {
        // No rows found - provide context-specific error message
        const identifierType = isUUID(boardId) ? "UUID" : "Slug";
        let message: string;
        let details: string;

        if (username) {
          message = `Board not found for user "${username}" with slug "${boardId}"`;
          details = "Board does not exist, is not public, or user not found";
        } else if (user) {
          message = `Board not found (${identifierType}: ${boardId})`;
          details = "Board does not exist or you don't have access";
        } else {
          message = `Board not found (${identifierType}: ${boardId})`;
          details = "Board does not exist or is not public";
        }

        return NextResponse.json<APIResponse<never>>(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message,
              details,
            },
          },
          { status: 404 }
        );
      }

      // Handle custom USER_NOT_FOUND error from resolveUsername
      if (boardError.code === "USER_NOT_FOUND") {
        return NextResponse.json<APIResponse<never>>(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: boardError.message,
              details: "Username does not exist",
            },
          },
          { status: 404 }
        );
      }

      // Handle invalid UUID format
      if (boardError.code === "22P02") {
        return NextResponse.json<APIResponse<never>>(
          {
            success: false,
            error: {
              code: "INVALID_IDENTIFIER",
              message: "Invalid board identifier format",
              details:
                "The board identifier must be either a valid UUID or slug",
            },
          },
          { status: 400 }
        );
      }

      // Generic database error
      console.error("[API] Database error fetching board:", boardError);
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch board",
            details:
              process.env.NODE_ENV === "development"
                ? boardError.message
                : undefined,
          },
        },
        { status: 500 }
      );
    }

    // ... rest of the handler continues as before
    // (permission checks, element fetching, response construction)
  } catch (error) {
    // ... existing error handler
  }
}
```

**Best Practices Applied**:

- ✅ Early parameter extraction (Next.js pattern)
- ✅ Comprehensive error messages with context
- ✅ Proper HTTP status codes
- ✅ Development vs production error details
- ✅ Logging for debugging

---

### Phase 4: Board Creation Updates

#### Update [`app/api/new-board/route.ts`](app/api/new-board/route.ts)

Add `visibility` field support:

```typescript
// Update Zod schema (around line 30)
const createBoardRequestSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters"),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers and hyphens"
    )
    .optional(),
  visibility: z
    .enum(["private", "public", "shared"])
    .optional()
    .default("private"), // ← NEW: Visibility field
  grid_config: gridConfigSchema.optional(),
  blocks: z.array(blockSchema).optional(),
  template_id: z.string().uuid().optional(),
  is_template: z.boolean().optional(),
});

// Update board data creation (around line 262)
const boardData: BoardData = {
  user_id: user.id,
  title: validatedData.title,
  slug: finalSlug,
  visibility: validatedData.visibility, // ← NEW: Include visibility
  grid_config: validatedData.grid_config || { columns: 4, gap: 16 },
  blocks: validatedData.blocks || [],
  template_id: validatedData.template_id,
  is_template: validatedData.is_template,
};
```

#### Update [`lib/types/board.ts`](lib/types/board.ts) (if exists)

```typescript
export interface BoardData {
  user_id: string;
  title: string;
  slug: string;
  visibility?: "private" | "public" | "shared"; // ← ADD THIS
  grid_config: GridConfig;
  blocks: Block[];
  template_id?: string;
  is_template?: boolean;
}
```

---

## Testing Strategy

### Test Scenarios

Create test file: `app/api/boards/[id]/route.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";

describe("GET /api/boards/[id] - Public Board Resolution", () => {
  let testUsers: { alice: User; bob: User };
  let testBoards: { aliceBoard: Board; bobBoard: Board };

  beforeEach(async () => {
    // Setup: Create test users and boards
    testUsers = {
      alice: await createTestUser({ username: "alice" }),
      bob: await createTestUser({ username: "bob" }),
    };

    testBoards = {
      aliceBoard: await createTestBoard({
        userId: testUsers.alice.id,
        slug: "shared-slug",
        visibility: "public",
        title: "Alice Board",
      }),
      bobBoard: await createTestBoard({
        userId: testUsers.bob.id,
        slug: "shared-slug",
        visibility: "public",
        title: "Bob Board",
      }),
    };
  });

  describe("Username-based resolution (PRIMARY)", () => {
    it("should return correct board when username provided", async () => {
      const response = await fetch("/api/boards/shared-slug?username=alice");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.boardMeta.title).toBe("Alice Board");
      expect(data.data.boardMeta.ownerId).toBe(testUsers.alice.id);
    });

    it("should return 404 when username not found", async () => {
      const response = await fetch(
        "/api/boards/shared-slug?username=nonexistent"
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toContain("nonexistent");
    });

    it("should return 404 when board not public", async () => {
      await updateBoardVisibility(testBoards.aliceBoard.id, "private");

      const response = await fetch("/api/boards/shared-slug?username=alice");
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 404 when slug does not exist for user", async () => {
      const response = await fetch(
        "/api/boards/nonexistent-slug?username=alice"
      );
      const data = await response.json();

      expect(response.status).toBe(404);
    });
  });

  describe("Stable fallback (BACKWARD COMPATIBILITY)", () => {
    it("should use deterministic tiebreaker when username not provided", async () => {
      // Without username, should always return same board
      const response1 = await fetch("/api/boards/shared-slug");
      const data1 = await response1.json();

      const response2 = await fetch("/api/boards/shared-slug");
      const data2 = await response2.json();

      expect(data1.data.boardMeta.id).toBe(data2.data.boardMeta.id);
      // Should return board with lowest user_id (deterministic)
      const expectedOwnerId = [testUsers.alice.id, testUsers.bob.id].sort()[0];
      expect(data1.data.boardMeta.ownerId).toBe(expectedOwnerId);
    });

    it("should log deprecation warning", async () => {
      const consoleSpy = jest.spyOn(console, "warn");

      await fetch("/api/boards/shared-slug");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("DEPRECATED")
      );
    });
  });

  describe("UUID lookup (EXISTING BEHAVIOR)", () => {
    it("should work with UUID regardless of username", async () => {
      const response = await fetch(
        `/api/boards/${testBoards.aliceBoard.id}?username=bob`
      );
      const data = await response.json();

      // Username ignored for UUID lookups
      expect(response.status).toBe(200);
      expect(data.data.boardMeta.id).toBe(testBoards.aliceBoard.id);
    });
  });

  describe("Authenticated access (BUILDER MODE)", () => {
    it("should scope to authenticated user", async () => {
      const response = await fetch("/api/boards/shared-slug", {
        headers: {
          Authorization: `Bearer ${testUsers.alice.token}`,
        },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.boardMeta.ownerId).toBe(testUsers.alice.id);
    });

    it("should ignore username parameter when authenticated", async () => {
      const response = await fetch("/api/boards/shared-slug?username=bob", {
        headers: {
          Authorization: `Bearer ${testUsers.alice.token}`,
        },
      });
      const data = await response.json();

      // Should return alice's board (authenticated user), not bob's
      expect(data.data.boardMeta.ownerId).toBe(testUsers.alice.id);
    });
  });

  describe("Visibility enforcement", () => {
    it("should not return private boards to unauthenticated users", async () => {
      await updateBoardVisibility(testBoards.aliceBoard.id, "private");

      const response = await fetch("/api/boards/shared-slug?username=alice");

      expect(response.status).toBe(404);
    });

    it("should return public boards to unauthenticated users", async () => {
      const response = await fetch("/api/boards/shared-slug?username=alice");

      expect(response.status).toBe(200);
    });
  });
});
```

---

## Migration & Deployment Plan

### Phase 1: Database Migration (Low Risk)

1. ✅ Run migration to add `visibility` column
2. ✅ Verify all boards have `visibility = 'private'`
3. ✅ Check index creation
4. ✅ No downtime required

**Rollback**: Column can be dropped safely if issues arise

### Phase 2: API Deployment (Zero Downtime)

1. ✅ Deploy updated API code
2. ✅ Old URLs continue working (fallback logic)
3. ✅ New URLs with username work immediately
4. ✅ Monitor logs for deprecation warnings

**Rollback**: Revert code deployment, no data changes needed

### Phase 3: Frontend Updates (Gradual)

1. Update board creation UI to set visibility
2. Update public link generation to include username
3. Update share dialogs to use new URL format: `link.lemonspace.io/[username]/[slug]`

**Timeline**: Can be done gradually over multiple releases

### Phase 4: Monitoring & Cleanup

1. Monitor deprecation warnings in logs
2. Communicate new URL format to users
3. Eventually deprecate username-less public slug access (optional)

---

## Performance Considerations

### Database Query Performance

**Index Strategy**:

```sql
-- Partial index for public boards (reduces index size)
CREATE INDEX boards_visibility_idx
ON boards(visibility) WHERE visibility = 'public';

-- Composite index for username-based lookups
CREATE INDEX boards_user_slug_visibility_idx
ON boards(user_id, slug, visibility);
```

**Query Patterns**:

1. **Username lookup**: `O(1)` via primary key index on `users.auth_user_id`
2. **Board lookup**: `O(1)` via composite index `(user_id, slug, visibility)`
3. **Fallback lookup**: `O(log n)` for public boards with `user_id` ordering

**Expected Performance**:

- Username resolution: <5ms (indexed)
- Board fetch: <10ms (indexed)
- Total API latency: <50ms (including auth)

---

## API Documentation

### Endpoint: GET /api/boards/:id

Fetch a board by UUID or slug with optional username-based resolution for public boards.

#### Parameters

| Name       | Type     | Location | Required | Description                               |
| ---------- | -------- | -------- | -------- | ----------------------------------------- |
| `id`       | `string` | path     | ✅       | Board UUID or slug                        |
| `username` | `string` | query    | ❌       | Username for public board slug resolution |

#### Authentication

- **Optional** for public boards
- **Required** for private boards
- Provide via `Authorization: Bearer <token>` header

#### Examples

**1. UUID Lookup** (Always deterministic):

```http
GET /api/boards/123e4567-e89b-12d3-a456-426614174000
```

**2. Authenticated Slug Lookup** (Builder mode):

```http
GET /api/boards/my-board
Authorization: Bearer <token>
```

**3. Public Slug with Username** (✅ RECOMMENDED):

```http
GET /api/boards/my-board?username=johndoe
```

Maps to public URL: `https://link.lemonspace.io/johndoe/my-board`

**4. Public Slug without Username** (⚠️ DEPRECATED):

```http
GET /api/boards/my-board
```

Uses stable fallback ordering. **Warning**: May not return expected board.

#### Response

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "boardMeta": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "My Board",
      "slug": "my-board",
      "visibility": "public",
      "ownerId": "user-id",
      ...
    },
    "elements": [...],
    "connections": [...],
    "permissions": {
      "canEdit": false,
      "canShare": false,
      "canDelete": false,
      "isOwner": false,
      "role": "viewer"
    }
  }
}
```

**Error Responses**:

| Status | Code                 | Description                   |
| ------ | -------------------- | ----------------------------- |
| 400    | `INVALID_PARAMS`     | Missing or invalid board ID   |
| 400    | `INVALID_IDENTIFIER` | Invalid UUID format           |
| 401    | `UNAUTHORIZED`       | Authentication failed         |
| 403    | `FORBIDDEN`          | No permission to access board |
| 404    | `NOT_FOUND`          | Board or username not found   |
| 500    | `DATABASE_ERROR`     | Server error                  |

---

## Summary

### Key Achievements

✅ **Deterministic Resolution**: Same inputs always produce same outputs
✅ **Username-Based Disambiguation**: Implements product URL structure
✅ **Backward Compatible**: Zero breaking changes
✅ **Best Practices**: Follows Next.js and Supabase patterns
✅ **Type-Safe**: Full TypeScript coverage
✅ **Well-Tested**: Comprehensive test suite
✅ **Performance-Optimized**: Proper indexing strategy
✅ **Clear Migration Path**: Deprecation warnings guide users

### URL Structure Compliance

| Context        | URL Pattern                            | API Call                                     |
| -------------- | -------------------------------------- | -------------------------------------------- |
| Builder (Auth) | `/builder/[boardId]`                   | `GET /api/boards/[slug]` with Auth           |
| Public View    | `link.lemonspace.io/[username]/[slug]` | `GET /api/boards/[slug]?username=[username]` |
| Direct UUID    | Any context                            | `GET /api/boards/[uuid]`                     |

### Next Steps

1. ✅ Review and approve this plan
2. ⏳ Switch to Code mode for implementation
3. ⏳ Run database migration
4. ⏳ Deploy API updates
5. ⏳ Update frontend gradually
6. ⏳ Monitor and iterate

**Ready to proceed with implementation?** 🚀
