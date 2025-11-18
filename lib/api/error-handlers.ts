/**
 * The above functions handle various types of errors and return appropriate NextResponse based on the
 * error type.
 * @param {unknown} error - The `error` parameter in the provided code snippets is used to handle
 * various types of errors that may occur during the execution of an API endpoint. The function
 * `handleError` takes an `error` as input and returns an appropriate response based on the type of
 * error encountered. It checks the type of
 * @returns The code provided contains functions that handle various types of errors and return
 * appropriate NextResponse objects based on the error type. The functions include:
 */

import { isUUID } from "@/lib/utils";
import {
  createValidationErrorResponse,
  createNotFoundResponse,
  createAuthErrorResponse,
  createForbiddenResponse,
  createDatabaseErrorResponse,
  createInternalServerErrorResponse
} from "./api-responses";

/**
 * Handles various types of errors and returns appropriate NextResponse
 */
export function handleError(error: unknown): Response {
  console.error("[API] Error:", error);

  // Handle string errors
  if (typeof error === "string") {
    switch (error) {
      case "INVALID_PARAMS":
        return createValidationErrorResponse([{
          field: "id",
          message: "Board ID is required and must be a string",
        }]);
      case "NOT_FOUND":
        return createNotFoundResponse("Board not found");
      case "USER_NOT_FOUND":
        return createNotFoundResponse("User not found");
      case "FORBIDDEN":
        return createForbiddenResponse();
      case "UNAUTHORIZED":
        return createAuthErrorResponse();
      case "INVALID_JSON":
        return createValidationErrorResponse([{
          field: "body",
          message: "Invalid JSON in request body",
        }]);
      case "NO_CHANGES":
        return createValidationErrorResponse([{
          field: "body",
          message: "No changes detected - all fields match current values",
        }]);
      case "VALIDATION_ERROR":
        return createValidationErrorResponse([{
          field: "body",
          message: "Invalid request payload",
        }]);
      default:
        return createInternalServerErrorResponse(error);
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Handle Supabase errors
    if ("code" in error) {
      const supabaseError = error as { code: string; message: string };
      switch (supabaseError.code) {
        case "PGRST116":
          return createNotFoundResponse("Board not found");
        case "22P02":
          return createValidationErrorResponse([{
            field: "id",
            message: "Invalid board identifier format",
          }]);
        default:
          return createDatabaseErrorResponse(supabaseError.message);
      }
    }

    // Handle custom errors with message
    switch (error.message) {
      case "NO_CHANGES":
        return createValidationErrorResponse([{
          field: "body",
          message: "No changes detected - all fields match current values",
        }]);
      case "FORBIDDEN":
        return createForbiddenResponse();
      default:
        return createInternalServerErrorResponse(error.message);
    }
  }

  // Handle unknown errors
  return createInternalServerErrorResponse("Unknown error occurred");
}

/**
 * Validates board ID parameter
 */
export function validateBoardId(boardId: string | undefined): { isValid: boolean; error?: Response } {
  if (!boardId || typeof boardId !== "string") {
    return {
      isValid: false,
      error: createValidationErrorResponse([{
        field: "id",
        message: "Board ID is required",
      }]),
    };
  }
  return { isValid: true };
}

/**
 * Creates a contextual not found response based on request context
 */
export function createContextualNotFoundResponse(
  boardId: string,
  username?: string,
  userId?: string
): Response {
  const identifierType = isUUID(boardId) ? "UUID" : "Slug";
  let message: string;

  if (username) {
    message = `Board not found for user "${username}" with slug "${boardId}"`;
  } else if (userId) {
    message = `Board not found (${identifierType}: ${boardId})`;
  } else {
    message = `Board not found (${identifierType}: ${boardId})`;
  }

  return createNotFoundResponse(message);
}

/**
 * Handles authentication errors with context
 */
export function handleAuthError(error: unknown): Response | null {
  if (!error) {
    return null; // No error, auth succeeded
  }

  if (typeof error === "object" && "message" in error) {
    const authError = error as { message: string };

    // Don't treat "Auth session missing" as a real error
    if (authError.message === "Auth session missing") {
      return null; // Signal to continue without user
    }

    console.error("[API] Auth error:", authError);
    return createAuthErrorResponse(authError.message);
  }

  return createAuthErrorResponse();
}
