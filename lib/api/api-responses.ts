import { NextResponse } from "next/server";
import type { APIResponse } from "@/lib/types/board-api";

/**
 * Creates a standardized success response for API endpoints
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: {
    totalElements?: number;
    totalConnections?: number;
    fetchedAt?: string;
    changedFields?: number;
    savedAt?: string;
    updatedAt?: string;
  },
  status: number = 200
) {
  return NextResponse.json<APIResponse<T>>(
    {
      success: true,
      data,
      metadata,
    },
    { status }
  );
}

/**
 * Creates a standardized error response for API endpoints
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  status: number = 400
) {
  return NextResponse.json<APIResponse<never>>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

/**
 * Creates a validation error response
 */
export function createValidationErrorResponse(validationErrors: Array<{
  field: string;
  message: string;
}>) {
  return createErrorResponse(
    "VALIDATION_ERROR",
    "Invalid request payload",
    validationErrors,
    400
  );
}

/**
 * Creates an authentication error response
 */
export function createAuthErrorResponse(message?: string) {
  return createErrorResponse(
    "UNAUTHORIZED",
    message || "Authentication required",
    undefined,
    401
  );
}

/**
 * Creates an authorization error response
 */
export function createForbiddenResponse(message?: string) {
  return createErrorResponse(
    "FORBIDDEN",
    message || "You do not have permission to perform this action",
    undefined,
    403
  );
}

/**
 * Creates a not found error response
 */
export function createNotFoundResponse(message?: string) {
  return createErrorResponse(
    "NOT_FOUND",
    message || "Resource not found",
    undefined,
    404
  );
}

/**
 * Creates a database error response
 */
export function createDatabaseErrorResponse(details?: string) {
  return createErrorResponse(
    "DATABASE_ERROR",
    "Database operation failed",
    process.env.NODE_ENV === "development" ? details : undefined,
    500
  );
}

/**
 * Creates an internal server error response
 */
export function createInternalServerErrorResponse(details?: string) {
  return createErrorResponse(
    "INTERNAL_SERVER_ERROR",
    "An unexpected error occurred",
    process.env.NODE_ENV === "development" ? details : undefined,
    500
  );
}
