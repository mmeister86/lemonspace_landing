# API Documentation: GET /api/boards/:id

Fetch a board by UUID or slug with optional username-based resolution for public boards.

## Overview

This endpoint implements deterministic public board slug resolution to address the non-deterministic behavior when multiple public boards share the same slug. It supports both traditional UUID lookups and enhanced slug-based lookups with username disambiguation.

## Endpoint

```
GET /api/boards/:id
```

## Parameters

| Name       | Type     | Location | Required | Description                               |
| ---------- | -------- | -------- | -------- | ----------------------------------------- |
| `id`       | `string` | path     | ✅       | Board UUID or slug                        |
| `username` | `string` | query    | ❌       | Username for public board slug resolution |

## Authentication

- **Optional** for public boards
- **Required** for private boards
- Provide via `Authorization: Bearer <token>` header or `x-supabase-auth-token` header

## Request Examples

### 1. UUID Lookup (Always deterministic)

```http
GET /api/boards/123e4567-e89b-12d3-a456-426614174000
```

### 2. Authenticated Slug Lookup (Builder mode)

```http
GET /api/boards/my-board
Authorization: Bearer <token>
```

### 3. Public Slug with Username (✅ RECOMMENDED)

```http
GET /api/boards/my-board?username=johndoe
```

Maps to public URL: `https://link.lemonspace.io/johndoe/my-board`

### 4. Public Slug without Username (⚠️ DEPRECATED)

```http
GET /api/boards/my-board
```

Uses stable fallback ordering. **Warning**: May not return expected board.

## Response Format

### Success (200 OK)

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
      "description": null,
      "thumbnailUrl": null,
      "gridConfig": {
        "columns": 4,
        "gap": 16
      },
      "isTemplate": false,
      "publishedAt": null,
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    },
    "elements": [
      {
        "id": "element-id",
        "type": "text",
        "content": { "text": "Hello World" },
        "position": { "x": 0, "y": 0 },
        "size": { "width": 200, "height": 100 },
        "zIndex": 1,
        "styles": {},
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:00:00Z"
      }
    ],
    "connections": [],
    "permissions": {
      "canEdit": false,
      "canShare": false,
      "canDelete": false,
      "isOwner": false,
      "role": "viewer"
    }
  },
  "metadata": {
    "totalElements": 1,
    "totalConnections": 0,
    "fetchedAt": "2023-01-01T00:00:00Z"
  }
}
```

### Error Responses

| Status | Code                 | Description                   | Example |
| ------ | -------------------- | ----------------------------- | ------- |
| 400    | `INVALID_PARAMS`     | Missing or invalid board ID   |
| 400    | `INVALID_IDENTIFIER` | Invalid UUID format           |
| 401    | `UNAUTHORIZED`       | Authentication failed         |
| 403    | `FORBIDDEN`          | No permission to access board |
| 404    | `NOT_FOUND`          | Board or username not found   |
| 500    | `DATABASE_ERROR`     | Server error                  |

#### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Board not found for user \"johndoe\" with slug \"my-board\"",
    "details": "Board does not exist, is not public, or user not found"
  }
}
```

## Resolution Logic

### UUID Lookup

- Direct database query by primary key
- Always deterministic
- Ignores username parameter

### Authenticated Slug Lookup

- Scoped to authenticated user's boards
- Slug is unique per user (`UNIQUE(user_id, slug)`)
- Ignores username parameter

### Public Slug with Username (Primary)

1. Resolve username to `user_id` via `users` table
2. Query for board with matching `slug`, `user_id`, and `visibility = 'public'`
3. Returns single deterministic result

### Public Slug without Username (Fallback)

- Uses stable tiebreaker: `.order("user_id", { ascending: true }).order("created_at", { ascending: false })`
- Always returns same board for given slug
- Logs deprecation warning
- Maps to oldest registered user with newest board

## URL Structure Mapping

| Context        | URL Pattern                            | API Call                                     | Behavior                             |
| -------------- | -------------------------------------- | -------------------------------------------- | ------------------------------------ |
| Builder (Auth) | `/builder/[boardId]`                   | `GET /api/boards/[slug]` with Auth           | Returns user's own board             |
| Public View    | `link.lemonspace.io/[username]/[slug]` | `GET /api/boards/[slug]?username=[username]` | Returns specific user's public board |
| Direct UUID    | Any context                            | `GET /api/boards/[uuid]`                     | Returns board by ID                  |

## Migration Guide

### For Frontend Developers

1. **Update Public Link Generation**:

   ```javascript
   // OLD (deprecated)
   const publicUrl = `https://link.lemonspace.io/${boardSlug}`;

   // NEW (recommended)
   const publicUrl = `https://link.lemonspace.io/${username}/${boardSlug}`;
   ```

2. **Update API Calls**:

   ```javascript
   // When fetching public boards
   const response = await fetch(`/api/boards/${slug}?username=${username}`);
   ```

3. **Handle Deprecation Warnings**:
   - Monitor console logs for `[API] DEPRECATED` warnings
   - Update old URLs to include username

### For Backend Developers

1. **Run Database Migration**:

   ```sql
   -- Execute docs/migrations/002-add-visibility-column.sql
   ```

2. **Update Board Creation**:
   ```javascript
   // Include visibility field when creating boards
   const boardData = {
     title: "My Board",
     slug: "my-board",
     visibility: "public", // ← Add this field
     // ... other fields
   };
   ```

## Performance

### Database Queries

- **Username resolution**: <5ms via `users.username` index
- **Board lookup**: <10ms via `(user_id, slug, visibility)` composite index
- **Fallback lookup**: <15ms via `visibility` partial index + ordering

### Caching

- **Public boards**: 5-minute cache (`Cache-Control: private, max-age=300`)
- **Private boards**: No cache (`Cache-Control: no-store, max-age=0`)
- **Authenticated users**: No cache

## Security

### Row Level Security (RLS)

- Users can only access their own private boards
- Anyone can access public boards
- Collaborators have scoped access based on role

### Visibility Rules

| Visibility | Authenticated   | Unauthenticated | Owner Access |
| ---------- | --------------- | --------------- | ------------ |
| `private`  | ✅ (owner only) | ❌              | ✅           |
| `public`   | ✅              | ✅              | ✅           |
| `shared`   | ✅ (via link)   | ✅ (via link)   | ✅           |

## Testing

### Test Coverage

- ✅ Username-based resolution
- ✅ Stable fallback behavior
- ✅ UUID lookup (existing behavior)
- ✅ Authenticated access patterns
- ✅ Visibility enforcement
- ✅ Error handling and edge cases
- ✅ Deprecation warning logging

### Running Tests

```bash
# Run all tests
npm test app/api/boards/[id]/route.test.ts

# Run with coverage
npm test -- --coverage
```

## Changelog

### v2.0.0 (Current)

- ✅ Added username-based slug resolution
- ✅ Implemented deterministic fallback ordering
- ✅ Added visibility column support
- ✅ Enhanced error messages with context
- ✅ Added deprecation warnings
- ✅ Comprehensive test coverage

### v1.0.0 (Previous)

- Non-deterministic slug resolution
- Basic UUID/slug lookup
- Limited error context

## Support

For questions or issues, refer to:

- Implementation plan: [`docs/public-board-slug-resolution-plan.md`](../public-board-slug-resolution-plan.md)
- Migration script: [`docs/migrations/002-add-visibility-column.sql`](../migrations/002-add-visibility-column.sql)
- Test suite: [`app/api/boards/[id]/route.test.ts`](../app/api/boards/[id]/route.test.ts)
