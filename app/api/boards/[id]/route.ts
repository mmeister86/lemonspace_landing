/**
 * The above functions handle PUT and GET requests to update and retrieve board data, respectively,
 * with proper validation, authentication, and authorization checks.
 * @param {NextRequest} request - The `request` parameter in the functions `PUT` and `GET` represents
 * the incoming HTTP request object containing information about the request such as headers, body,
 * URL, query parameters, etc. It is used to extract data from the request and interact with the client
 * making the request.
 * @param  - The code you provided is a Next.js API route handler that handles PUT and GET requests for
 * updating and retrieving board data, respectively. Here's a breakdown of the main functionalities in
 * the code:
 * @returns The code snippet contains two main handlers: PUT and GET.
 */

import { NextRequest } from "next/server";
import type { Board } from "@/lib/types/board";
import type { BoardResponse } from "@/lib/types/board-api";
import {
  createSupabaseUserContext
} from "@/lib/services/auth-service";
import { getBoard, getBoardByUsernameAndSlug, getBoardByUserIdAndSlug } from "@/lib/services/board-service";
import { isUUID } from "@/lib/utils";
import {
  createSuccessResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createDatabaseErrorResponse,
} from "@/lib/api/api-responses";
import {
  handleError,
  validateBoardId,
  createContextualNotFoundResponse,
  handleAuthError
} from "@/lib/api/error-handlers";
import {
  updateBoardSchema,
  type UpdateBoardData
} from "@/lib/validation/board-validation-schemas";
import {
  transformDBBoardToMeta
} from "@/lib/transformers/board-transformers";
import { updateBoard, deleteBoard } from "@/lib/services/board-service";

// ===========================================
// Main PUT Handler
// ===========================================

/**
 * Handles PUT requests to update a board
 * Supports partial updates with proper validation, authentication, and authorization
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // 1. Extract and validate board ID
    const { id: boardId } = await params;
    const idValidation = validateBoardId(boardId);
    if (!idValidation.isValid) {
      return idValidation.error;
    }

    // 2. Check authentication
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
      return createAuthErrorResponse("Authentication required for board updates");
    }

    // 3. Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createValidationErrorResponse([{
        field: "body",
        message: "Invalid JSON in request body",
      }]);
    }

    // 4. Validate payload using Zod
    const validationResult = updateBoardSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return createValidationErrorResponse(errorDetails);
    }

    const updateData = validationResult.data as UpdateBoardData;

    // 5. Check if at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return createValidationErrorResponse([{
        field: "body",
        message: "At least one field must be provided for update",
      }]);
    }

    // 6. Fetch existing board to verify ownership
    const { data: existingBoard, error: fetchError } = await supabase
      .from("boards")
      .select("id, user_id, owner_id, title, slug, visibility, description, grid_config, blocks, thumbnail_url, metadata, created_at, updated_at")
      .eq("id", boardId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return createNotFoundResponse("Board not found");
      }

      console.error("[API] Database error fetching board:", fetchError);
      return createDatabaseErrorResponse(fetchError.message);
    }

    // 7. Check permissions (only owners can update boards)
    const ownerId = (existingBoard.user_id || existingBoard.owner_id) as string;
    if (ownerId !== user.id) {
      return createForbiddenResponse("You do not have permission to update this board");
    }

    // 8. Update the board with only changed fields
    const { data: updatedBoard, error: updateError } = await supabase
      .from("boards")
      .update(updateData)
      .eq("id", boardId)
      .select()
      .single();

    if (updateError) {
      console.error("[API] Database error updating board:", updateError);
      return createDatabaseErrorResponse(updateError.message);
    }

    // 9. Transform board data for response
    const boardMeta = transformDBBoardToMeta(updatedBoard);

    // 10. Construct response
    const savedAt = new Date().toISOString();
    const response = {
      boardMeta,
      changedFields: Object.keys(updateData),
      savedAt,
    };

    // 11. Performance logging
    const duration = Date.now() - startTime;
    console.log(
      `[API] PUT /api/boards/${boardId} completed in ${duration}ms (${Object.keys(updateData).length} fields changed)`
    );

    return createSuccessResponse(
      response,
      {
        changedFields: Object.keys(updateData).length,
        savedAt,
        updatedAt: updatedBoard.updated_at,
      }
    );

  } catch (error) {
    console.error("[API] Unexpected error in PUT /api/boards/[id]:", error);
    return handleError(error);
  }
}

// ===========================================
// Main GET Handler
// ===========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // 1. Extract and validate board ID
    const { id: boardId } = await params;
    const idValidation = validateBoardId(boardId);
    if (!idValidation.isValid) {
      return idValidation.error;
    }

    // 2. Extract query parameters
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

    const authErrorResult = handleAuthError(authError);
    if (authErrorResult) {
      return authErrorResult;
    }

    // 4. Fetch board with username-aware resolution
    let boardData: Board | null = null;
    let boardError: { message: string; code: string } | Error | null = null;

    if (username) {
      boardData = await getBoardByUsernameAndSlug(supabase, username, boardId);
      if (!boardData) {
        boardError = { code: "PGRST116", message: "Board not found for this user and slug" };
      }
    } else if (isUUID(boardId)) {
      try {
        boardData = await getBoard(supabase, boardId);
      } catch (e) {
        boardError = e as Error | { message: string; code: string };
      }
    } else {
      // Slug without username - fetch for current user if authenticated
      if (user) {
        boardData = await getBoardByUserIdAndSlug(supabase, user.id, boardId);
        if (!boardData) {
          boardError = { code: "PGRST116", message: "Board not found" };
        }
      } else {
        boardError = { message: "Invalid identifier", code: "22P02" };
      }
    }

    if (boardError) {
      if ('code' in boardError) {
        if (boardError.code === "PGRST116") {
          return createContextualNotFoundResponse(boardId, username, user?.id);
        }

        // Handle custom USER_NOT_FOUND error from resolveUsername
        if (boardError.code === "USER_NOT_FOUND") {
          return createNotFoundResponse(boardError.message);
        }

        // Check for UUID syntax error (shouldn't happen anymore, but keep as safety net)
        if (boardError.code === "22P02") {
          return createValidationErrorResponse([{
            field: "id",
            message: "Invalid board identifier format",
          }]);
        }

        console.error("[API] Database error fetching board:", boardError);
        return createDatabaseErrorResponse(boardError.message);
      } else {
        console.error("[API] Unknown error fetching board:", boardError);
        return createDatabaseErrorResponse(boardError.message);
      }
    }

    // Debug logging for boardData
    console.log("[API] DEBUG: boardData before cast:", {
      boardData,
      isNull: boardData === null,
      isUndefined: boardData === undefined,
      type: typeof boardData,
      username: username ? "present" : "absent",
      boardId,
      isUUID: isUUID(boardId)
    });

    const board = boardData as Board;

    // 5. Check collaborator permissions
    let collaboratorRole = null;
    if (user && board.user_id !== user.id) {
      const { data: collaborator } = await supabase
        .from("board_collaborators")
        .select("role")
        .eq("board_id", board.id)
        .eq("user_id", user.id)
        .single();

      collaboratorRole = collaborator?.role || null;
    }

    // 6. Fetch elements and connections for the board
    const [elements, connections] = await Promise.all([
      supabase
        .from("board_elements")
        .select("*")
        .eq("board_id", board.id)
        .order("z_index", { ascending: true }),
      supabase
        .from("element_connections")
        .select("*")
        .eq("board_id", board.id)
        .order("created_at", { ascending: true })
    ]);

    // 7. Transform board to BoardMeta format
    const boardMeta = transformDBBoardToMeta(board);

    // 8. Determine user's role and permissions
    const isOwner = board.user_id === user?.id;
    const role = isOwner ? 'owner' : (collaboratorRole as 'admin' | 'editor' | 'viewer' || 'viewer');

    // 9. Build complete BoardResponse with proper structure
    const response: BoardResponse = {
      boardMeta,
      elements: elements.data || [],
      connections: connections.data || [],
      permissions: {
        canEdit: isOwner || collaboratorRole === 'admin' || collaboratorRole === 'editor',
        canShare: isOwner || collaboratorRole === 'admin',
        canDelete: isOwner,
        isOwner,
        role,
      },
    };

    // 10. Performance logging
    const duration = Date.now() - startTime;
    const identifierType = boardId.includes('-') ? "UUID" : "Slug";
    console.log(
      `[API] GET /api/boards/${boardId} (${identifierType}) completed in ${duration}ms (${response.elements.length} elements, ${response.connections.length} connections)`
    );

    const responseResult = createSuccessResponse(
      response,
      {
        totalElements: response.elements.length,
        totalConnections: response.connections.length,
        fetchedAt: new Date().toISOString(),
      }
    );

    // Add caching headers (consolidated from duplicate code)
    if (!response.permissions.canEdit) {
      // Cache for viewers (5 minutes)
      responseResult.headers.set(
        "Cache-Control",
        "private, max-age=300, stale-while-revalidate=60"
      );
    } else {
      // No cache for editors
      responseResult.headers.set("Cache-Control", "no-store, max-age=0");
    }

    return responseResult;

  } catch (error) {
    console.error("[API] Unexpected error in GET /api/boards/[id]:", error);
    return handleError(error);
  }
}

// ===========================================
// PATCH Handler (for consistency with REST conventions)
// ===========================================

/**
 * Handles PATCH requests to update a board
 * Wrapper around PUT handler for REST API consistency
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // 1. Extract and validate board ID
    const { id: boardId } = await params;
    const idValidation = validateBoardId(boardId);
    if (!idValidation.isValid) {
      return idValidation.error;
    }

    // 2. Check authentication
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
      return createAuthErrorResponse("Authentication required for board updates");
    }

    // 3. Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createValidationErrorResponse([{
        field: "body",
        message: "Invalid JSON in request body",
      }]);
    }

    // 4. Validate payload using Zod
    const validationResult = updateBoardSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return createValidationErrorResponse(errorDetails);
    }

    const updateData = validationResult.data as UpdateBoardData;

    // 5. Verify board exists and check ownership
    const { data: existingBoard, error: fetchError } = await supabase
      .from("boards")
      .select("id, user_id, owner_id")
      .eq("id", boardId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return createNotFoundResponse("Board not found");
      }

      console.error("[API] Database error fetching board:", fetchError);
      return createDatabaseErrorResponse(fetchError.message);
    }

    // Check permissions (only owners can update boards)
    const ownerId = (existingBoard.user_id || existingBoard.owner_id) as string;
    if (ownerId !== user.id) {
      return createForbiddenResponse("You do not have permission to update this board");
    }

    // 6. Update board using service layer
    const updatedBoard = await updateBoard(supabase, boardId, updateData);

    // 6. Transform board data for response
    const boardMeta = transformDBBoardToMeta(updatedBoard);

    // 7. Construct response
    const savedAt = new Date().toISOString();
    const response = {
      boardMeta,
      changedFields: Object.keys(updateData),
      savedAt,
    };

    // 8. Performance logging
    const duration = Date.now() - startTime;
    console.log(
      `[API] PATCH /api/boards/${boardId} completed in ${duration}ms (${Object.keys(updateData).length} fields changed)`
    );

    return createSuccessResponse(
      response,
      {
        changedFields: Object.keys(updateData).length,
        savedAt,
        updatedAt: updatedBoard.updated_at,
      }
    );

  } catch (error) {
    console.error("[API] Unexpected error in PATCH /api/boards/[id]:", error);
    return handleError(error);
  }
}

// ===========================================
// DELETE Handler
// ===========================================

/**
 * Handles DELETE requests to delete a board
 * Verifies ownership before deletion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // 1. Extract and validate board ID
    const { id: boardId } = await params;
    const idValidation = validateBoardId(boardId);
    if (!idValidation.isValid) {
      return idValidation.error;
    }

    // 2. Check authentication
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
      return createAuthErrorResponse("Authentication required to delete boards");
    }

    // 3. Verify board exists and check ownership
    const { data: existingBoard, error: fetchError } = await supabase
      .from("boards")
      .select("id, user_id, owner_id")
      .eq("id", boardId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return createNotFoundResponse("Board not found");
      }

      console.error("[API] Database error fetching board:", fetchError);
      return createDatabaseErrorResponse(fetchError.message);
    }

    // 4. Check permissions (only owners can delete boards)
    const ownerId = (existingBoard.user_id || existingBoard.owner_id) as string;
    if (ownerId !== user.id) {
      return createForbiddenResponse("You do not have permission to delete this board");
    }

    // 5. Delete the board using service layer
    await deleteBoard(supabase, boardId);

    // 6. Performance logging
    const duration = Date.now() - startTime;
    console.log(`[API] DELETE /api/boards/${boardId} completed in ${duration}ms`);

    return createSuccessResponse(
      {
        message: "Board deleted successfully",
        boardId,
        deletedAt: new Date().toISOString(),
      }
    );

  } catch (error) {
    console.error("[API] Unexpected error in DELETE /api/boards/[id]:", error);
    return handleError(error);
  }
}
