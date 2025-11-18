# API Route Refactoring Documentation

## Overview

The `/api/boards/[id]/route.ts` has been refactored to improve maintainability, testability, and code organization. The original 600+ line file has been broken down into focused, single-responsibility modules.

## Refactored Architecture

### 1. Service Layer (`lib/services/`)

#### `auth-service.ts`
- **Purpose**: Handles authentication and user context creation
- **Key Functions**:
  - `createSupabaseUserContext(request)` - Creates Supabase client with user authentication
- **Responsibilities**:
  - Cookie-based authentication
  - Token-based authentication (Bearer token, x-supabase-auth-token)
  - Session management

#### `user-service.ts`
- **Purpose**: User-related utilities and validations
- **Key Functions**:
  - `resolveUsername(supabase, username)` - Maps username to user_id
  - `isUUID(str)` - Validates UUID format
- **Responsibilities**:
  - Username resolution
  - UUID validation
  - User ID mapping

#### `board-service.ts`
- **Purpose**: Core board business logic and database operations
- **Key Functions**:
  - `fetchBoardByIdOrSlug()` - Retrieves boards by ID or slug
  - `fetchBoardElements()` - Gets board elements with fallback
  - `fetchElementConnections()` - Retrieves element connections
  - `checkBoardPermissions()` - Validates user access
  - `buildBoardResponse()` - Constructs complete board response
  - `updateBoard()` - Handles board updates with change tracking
- **Responsibilities**:
  - Multi-tenant board resolution
  - Permission checking
  - Element/connection fetching with fallbacks
  - Partial updates with change detection

### 2. Transformation Layer (`lib/transformers/`)

#### `board-transformers.ts`
- **Purpose**: Converts database models to API-compatible formats
- **Key Functions**:
  - `transformDBElementToBuilder()` - Element transformation
  - `transformDBConnectionToBuilder()` - Connection transformation
  - `transformDBBoardToMeta()` - Board metadata transformation
  - `determinePermissions()` - Permission calculation
- **Responsibilities**:
  - Data format conversion
  - Field mapping (snake_case to camelCase)
  - Permission logic

### 3. API Utilities (`lib/api/`)

#### `api-responses.ts`
- **Purpose**: Standardized HTTP response creation
- **Key Functions**:
  - `createSuccessResponse()` - Success responses with metadata
  - `createErrorResponse()` - Generic error responses
  - `createValidationErrorResponse()` - Field validation errors
  - `createAuthErrorResponse()` - Authentication errors
  - `createForbiddenResponse()` - Authorization errors
  - `createNotFoundResponse()` - Not found errors
  - `createDatabaseErrorResponse()` - Database operation errors
  - `createInternalServerErrorResponse()` - Server errors
- **Responsibilities**:
  - Consistent response formatting
  - HTTP status code management
  - Error detail handling

#### `error-handlers.ts`
- **Purpose**: Common error handling patterns
- **Key Functions**:
  - `handleError()` - Central error processing
  - `validateBoardId()` - Board ID validation
  - `createContextualNotFoundResponse()` - Context-aware 404s
  - `handleAuthError()` - Authentication error processing
- **Responsibilities**:
  - Error type detection
  - Contextual error messages
  - Supabase error mapping

### 4. Validation (`lib/validation/`)

#### `board-validation-schemas.ts`
- **Purpose**: Zod validation schemas for board operations
- **Key Schemas**:
  - `gridConfigSchema` - Grid configuration validation
  - `blockSchema` - Block structure validation
  - `updateBoardSchema` - Board update payload validation
- **Types**:
  - `UpdateBoardData` - Type for validated board updates
- **Responsibilities**:
  - Input validation
  - Type safety
  - Field constraint enforcement

## Refactored Route Handler

The main `route.ts` file is now focused solely on HTTP handling:

### GET Handler Flow
1. Extract and validate board ID
2. Parse query parameters
3. Authenticate user
4. Fetch board with multi-tenant resolution
5. Build complete board response (elements, connections, permissions)
6. Add caching headers
7. Return standardized response

### PUT Handler Flow
1. Extract and validate board ID
2. Authenticate and authorize user
3. Parse and validate request body
4. Fetch existing board
5. Perform partial update with change tracking
6. Transform and return updated board

## Benefits of Refactoring

### 1. Separation of Concerns
- Business logic separated from HTTP handling
- Data transformations isolated
- Authentication/authorization centralized
- Validation schemas reusable

### 2. Improved Testability
- Each service can be unit tested independently
- Mock-friendly architecture
- Clear function boundaries

### 3. Maintainability
- Smaller, focused files
- Single responsibility principle
- Easier to locate and modify specific functionality

### 4. Reusability
- Services can be shared across multiple API endpoints
- Validation schemas reusable in frontend
- Response utilities consistent across APIs

### 5. Type Safety
- Comprehensive TypeScript types
- Zod schema validation
- Clear interfaces between modules

## File Structure After Refactoring

```
app/api/boards/[id]/route.ts (~290 lines, simplified from 600+)
lib/
├── services/
│   ├── auth-service.ts
│   ├── user-service.ts
│   └── board-service.ts
├── transformers/
│   └── board-transformers.ts
├── api/
│   ├── api-responses.ts
│   └── error-handlers.ts
└── validation/
    └── board-validation-schemas.ts
```

## Migration Guide

### For New API Endpoints
1. Use `createSupabaseUserContext()` for authentication
2. Import appropriate services from `lib/services/`
3. Use `api-responses.ts` for standardized responses
4. Handle errors with `error-handlers.ts` utilities

### For Frontend Integration
1. Import validation schemas from `lib/validation/`
2. Use the same TypeScript types from `lib/types/`
3. Expect consistent error response format

## Performance Considerations

1. **Lazy Loading**: Services are only loaded when needed
2. **Batch Operations**: Database operations optimized in service layer
3. **Caching Strategy**: Implemented at response level
4. **Error Handling**: Centralized to reduce overhead

## Future Enhancements

1. **Caching Service**: Extract caching logic to dedicated service
2. **Middleware**: Create authentication middleware for reuse
3. **Database Layer**: Add repository pattern for data access
4. **Event System**: Implement events for board updates

## Testing Strategy

Each module should have its own test suite:
- Service tests (with mocked Supabase)
- Transformer tests (input/output verification)
- Validation tests (schema validation)
- Response utility tests (format verification)
- Integration tests (full API endpoint)
