import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  DBBoardWithMeta,
  DBBoardElement,
  DBElementConnection,
  DBBoardCollaborator,
  BoardResponse,
  BoardElement,
  ElementConnection,
  BoardMeta,
  BoardPermissions,
  APIResponse,
} from "@/lib/types/board-api";

// ===========================================
// Helper Functions
// ===========================================

async function createSupabaseUserContext(request: NextRequest) {
  const supabase = await createClient();

  let {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user) {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    const token = bearerToken ?? request.headers.get("x-supabase-auth-token");

    if (token) {
      const {
        data: { user: tokenUser },
        error: tokenError,
      } = await supabase.auth.getUser(token);

      user = tokenUser ?? null;
      error = tokenError;
    }
  }

  return { supabase, user, error };
}

function transformDBElementToBuilder(dbElement: DBBoardElement): BoardElement {
  return {
    id: dbElement.id,
    type: dbElement.type,
    content: dbElement.content,
    position: {
      x: Number(dbElement.position_x) || 0,
      y: Number(dbElement.position_y) || 0,
    },
    size: {
      width: Number(dbElement.width) || 100,
      height: Number(dbElement.height) || 100,
    },
    zIndex: dbElement.z_index,
    styles: dbElement.styles,
    createdAt: dbElement.created_at,
    updatedAt: dbElement.updated_at,
  };
}

function transformDBConnectionToBuilder(
  dbConnection: DBElementConnection
): ElementConnection {
  return {
    id: dbConnection.id,
    sourceElementId: dbConnection.source_element_id,
    targetElementId: dbConnection.target_element_id,
    connectionType: dbConnection.connection_type,
    metadata: dbConnection.metadata,
    createdAt: dbConnection.created_at,
  };
}

function transformDBBoardToMeta(dbBoard: DBBoardWithMeta): BoardMeta {
  return {
    id: dbBoard.id,
    title: dbBoard.title,
    description: dbBoard.description || null,
    slug: dbBoard.slug,
    visibility: dbBoard.visibility || 'private',
    thumbnailUrl: dbBoard.thumbnail_url || null,
    // user_id is canonical, owner_id is deprecated fallback; one must exist for valid board
    ownerId: (dbBoard.user_id || dbBoard.owner_id) as string,
    gridConfig: dbBoard.grid_config,
    isTemplate: dbBoard.is_template || false,
    publishedAt: dbBoard.published_at || null,
    createdAt: dbBoard.created_at,
    updatedAt: dbBoard.updated_at,
  };
}

function determinePermissions(
  userId: string,
  board: DBBoardWithMeta,
  collaborator?: DBBoardCollaborator
): BoardPermissions {
  // user_id is canonical, owner_id is deprecated fallback; one must exist for valid board
  const ownerId = (board.user_id || board.owner_id) as string;
  const isOwner = ownerId === userId;

  if (isOwner) {
    return {
      canEdit: true,
      canShare: true,
      canDelete: true,
      isOwner: true,
      role: "owner",
    };
  }

  if (collaborator) {
    switch (collaborator.role) {
      case "admin":
        return {
          canEdit: true,
          canShare: true,
          canDelete: false,
          isOwner: false,
          role: "admin",
        };
      case "editor":
        return {
          canEdit: true,
          canShare: false,
          canDelete: false,
          isOwner: false,
          role: "editor",
        };
      case "viewer":
        return {
          canEdit: false,
          canShare: false,
          canDelete: false,
          isOwner: false,
          role: "viewer",
        };
    }
  }

  // No access
  return {
    canEdit: false,
    canShare: false,
    canDelete: false,
    isOwner: false,
    role: "viewer",
  };
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
    // 1. Extract board ID from params
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

    // 2. Check authentication
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

    // user can be null for public boards; check permissions later
    // 3. Fetch board metadata with specific columns (performance optimization)
    // Try to fetch with new schema first, fallback to old schema if needed
    const { data: boardData, error: boardError } = await supabase
      .from("boards")
      .select(
        `
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
      `
      )
      .eq("id", boardId)
      .single();

    if (boardError) {
      if (boardError.code === "PGRST116") {
        // No rows found
        return NextResponse.json<APIResponse<never>>(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Board not found",
            },
          },
          { status: 404 }
        );
      }

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

    const board = boardData as DBBoardWithMeta;

    // Handle backward compatibility: user_id is canonical, owner_id is deprecated
    // One must exist for valid board; normalize to ensure both are set
    const ownerId = (board.user_id || board.owner_id) as string;
    const boardWithMeta: DBBoardWithMeta = {
      ...board,
      owner_id: ownerId, // Normalize: ensure owner_id matches user_id for backwards compatibility
    };

    // 4. Check user permissions (owner or collaborator)
    let collaboratorData: DBBoardCollaborator | undefined;

    // Check if user is owner
    const isOwner = user && ownerId === user.id;

    if (!isOwner) {
      // Skip collaborator check for unauthenticated users
      if (!user) {
        // Check if board is public (fallback to old schema: treat as private if visibility doesn't exist)
        const visibility = board.visibility || "private";
        if (visibility !== "public") {
          return NextResponse.json<APIResponse<never>>(
            {
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "You do not have permission to access this board",
              },
            },
            { status: 403 }
          );
        }
      } else {
        // Check if user is collaborator (only if board_collaborators table exists)
        try {
          const { data: collabData, error: collabError } = await supabase
            .from("board_collaborators")
            .select("*")
            .eq("board_id", boardId)
            .eq("user_id", user.id)
            .single();

          if (collabError && collabError.code !== "PGRST116") {
            console.error("[API] Error checking collaborator:", collabError);
          }

          if (!collabData) {
            // Check if board is public (fallback to old schema: treat as private if visibility doesn't exist)
            const visibility = board.visibility || "private";
            if (visibility !== "public") {
              return NextResponse.json<APIResponse<never>>(
                {
                  success: false,
                  error: {
                    code: "FORBIDDEN",
                    message: "You do not have permission to access this board",
                  },
                },
                { status: 403 }
              );
            }
          } else {
            collaboratorData = collabData as DBBoardCollaborator;
          }
        } catch (error) {
          // board_collaborators table might not exist yet, fallback to basic permission check
          console.log("[API] board_collaborators table not available, using basic permission check");
          const visibility = board.visibility || "private";
          if (visibility !== "public") {
            return NextResponse.json<APIResponse<never>>(
              {
                success: false,
                error: {
                  code: "FORBIDDEN",
                  message: "You do not have permission to access this board",
                },
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // 5. Parse query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const elementsLimit = parseInt(searchParams.get("elementsLimit") || "1000");
    const elementsOffset = parseInt(searchParams.get("elementsOffset") || "0");

    // 6. Fetch board elements with pagination (fallback to blocks if board_elements doesn't exist)
    let elementsData: DBBoardElement[] = [];
    let elementsError: Error | null = null;

    try {
      const result = await supabase
        .from("board_elements")
        .select(
          `
          id,
          board_id,
          type,
          content,
          position_x,
          position_y,
          width,
          height,
          z_index,
          styles,
          created_at,
          updated_at
        `
        )
        .eq("board_id", boardId)
        .order("z_index", { ascending: true })
        .range(elementsOffset, elementsOffset + elementsLimit - 1);

      elementsData = result.data || [];
      elementsError = result.error;
    } catch (error) {
      console.log("[API] board_elements table not available, falling back to blocks");
      elementsError = error as Error;
    }

    if (elementsError) {
      // Fallback: Convert existing blocks to elements format with proper validation
      console.log("[API] Converting blocks to elements format");
      const blocks = (board.blocks as unknown[]) || [];

      try {
        elementsData = blocks.map((block: unknown, index: number) => {
          // Validate block structure
          if (!block || typeof block !== 'object') {
            console.warn(`[API] Invalid block at index ${index}: not an object`, block);
            return createFallbackElement(index, boardId, board);
          }

          const blockRecord = block as Record<string, unknown>;

          // Validate required fields
          const id = typeof blockRecord.id === 'string' ? blockRecord.id : `fallback-${index}`;
          const type = typeof blockRecord.type === 'string' ? blockRecord.type : 'unknown';

          // Validate and extract position with fallbacks
          let positionX = 0;
          let positionY = 0;

          if (blockRecord.position && typeof blockRecord.position === 'object') {
            const position = blockRecord.position as Record<string, unknown>;
            positionX = typeof position.x === 'number' ? position.x : Number(position.x) || 0;
            positionY = typeof position.y === 'number' ? position.y : Number(position.y) || 0;
          }

          // Validate and extract size with fallbacks
          let width = 200;
          let height = 100;

          if (blockRecord.size && typeof blockRecord.size === 'object') {
            const size = blockRecord.size as Record<string, unknown>;
            width = typeof size.width === 'number' ? size.width : Number(size.width) || 200;
            height = typeof size.height === 'number' ? size.height : Number(size.height) || 100;
          }

          // Validate content
          const content = blockRecord.data && typeof blockRecord.data === 'object'
            ? blockRecord.data as Record<string, unknown>
            : {};

          // Safely set timestamps
          const now = new Date().toISOString();
          const createdAt = board.created_at || now;
          const updatedAt = board.updated_at || now;

          return {
            id,
            board_id: boardId,
            type,
            content,
            position_x: positionX,
            position_y: positionY,
            width,
            height,
            z_index: index + 1,
            styles: {},
            created_at: createdAt,
            updated_at: updatedAt,
          };
        });
      } catch (error) {
        console.error("[API] Error in blocks-to-elements conversion:", error);
        // If the entire conversion fails, create an empty array
        elementsData = [];
      }
    }

    // Helper function to create a fallback element
    function createFallbackElement(index: number, boardId: string, board: DBBoardWithMeta): DBBoardElement {
      const now = new Date().toISOString();
      const createdAt = board.created_at || now;
      const updatedAt = board.updated_at || now;

      return {
        id: `fallback-${index}`,
        board_id: boardId,
        type: "unknown",
        content: {},
        position_x: 0,
        position_y: 0,
        width: 200,
        height: 100,
        z_index: index + 1,
        styles: {},
        created_at: createdAt,
        updated_at: updatedAt,
      };
    }
    // 7. Fetch element connections (fallback to empty array if table doesn't exist)
    let connectionsData: DBElementConnection[] = [];
    let connectionsError: Error | null = null;

    try {
      const result = await supabase
        .from("element_connections")
        .select(
          `
          id,
          board_id,
          source_element_id,
          target_element_id,
          connection_type,
          metadata,
          created_at
        `
        )
        .eq("board_id", boardId);

      connectionsData = result.data || [];
      connectionsError = result.error;
    } catch (error) {
      console.log("[API] element_connections table not available, using empty array");
      connectionsError = null; // Don't treat this as an error
    }

    if (connectionsError) {
      console.error(
        "[API] Database error fetching connections:",
        connectionsError
      );
      // Don't fail the whole request if connections fail, just use empty array
      connectionsData = [];
    }

    // 8. Transform data for Builder
    const elements = (elementsData as DBBoardElement[]).map(
      transformDBElementToBuilder
    );
    const connections = (connectionsData as DBElementConnection[]).map(
      transformDBConnectionToBuilder
    );
    const boardMeta = transformDBBoardToMeta(boardWithMeta);
    const permissions = user
      ? determinePermissions(user.id, boardWithMeta, collaboratorData)
      : { canEdit: false, canShare: false, canDelete: false, isOwner: false, role: "viewer" as const };

    // 9. Construct response
    const response: BoardResponse = {
      boardMeta,
      elements,
      connections,
      permissions,
    };

    // 10. Add caching headers (for read-only access)
    const headers = new Headers();
    if (!permissions.canEdit) {
      // Cache for viewers (5 minutes)
      headers.set(
        "Cache-Control",
        "private, max-age=300, stale-while-revalidate=60"
      );
    } else {
      // No cache for editors
      headers.set("Cache-Control", "no-store, max-age=0");
    }

    // Performance logging
    const duration = Date.now() - startTime;
    console.log(
      `[API] GET /api/boards/${boardId} completed in ${duration}ms (${elements.length} elements, ${connections.length} connections)`
    );

    return NextResponse.json<APIResponse<BoardResponse>>(
      {
        success: true,
        data: response,
        metadata: {
          totalElements: elements.length,
          totalConnections: connections.length,
          fetchedAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    // Catch-all error handler
    console.error("[API] Unexpected error in GET /api/boards/[id]:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (process.env.NODE_ENV === "development") {
      console.error("[API] Stack trace:", errorStack);
    }

    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
          details:
            process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
      },
      { status: 500 }
    );
  }
}
