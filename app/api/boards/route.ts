/**
 * API route for listing and managing boards
 * Handles GET requests to list all boards for the authenticated user
 * with optional filtering for recent boards
 */

import { NextRequest } from "next/server";
import { createSupabaseUserContext } from "@/lib/services/auth-service";
import { listBoards } from "@/lib/services/board-service";
import {
  createSuccessResponse,
  createAuthErrorResponse,
} from "@/lib/api/api-responses";
import { handleError, handleAuthError } from "@/lib/api/error-handlers";

/**
 * GET /api/boards
 * Lists all boards for the authenticated user
 * Query params:
 *   - recent: boolean (optional) - if true, sorts by updated_at desc and limits to 5
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Check authentication
    const {
      supabase,
      user,
      error: authError,
    } = await createSupabaseUserContext(request);

    const authErrorResult = handleAuthError(authError);
    if (authErrorResult) {
      return authErrorResult;
    }

    if (!user) {
      return createAuthErrorResponse("Authentication required to list boards");
    }

    // 2. Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const isRecentOnly = searchParams.get("recent") === "true";

    // 3. Fetch boards using the service layer
    const boards = await listBoards(supabase, user.id);

    // 4. Apply filtering for recent boards if requested
    let filteredBoards = boards;
    if (isRecentOnly) {
      filteredBoards = boards
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);
    }

    // 5. Performance logging
    const duration = Date.now() - startTime;
    console.log(
      `[API] GET /api/boards completed in ${duration}ms (${filteredBoards.length} boards${isRecentOnly ? ", recent only" : ""})`
    );

    return createSuccessResponse(
      {
        boards: filteredBoards,
        totalBoards: filteredBoards.length,
      },
      {
        fetchedAt: new Date().toISOString(),
      }
    );

  } catch (error) {
    console.error("[API] Unexpected error in GET /api/boards:", error);
    return handleError(error);
  }
}
