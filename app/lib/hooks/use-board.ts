import { useQuery } from "@tanstack/react-query";
import type { BoardResponse, APIResponse } from "@/lib/types/board-api";
import type { Board, BlockType } from "@/lib/types/board";

interface UseBoardOptions {
  enabled?: boolean;
  elementsLimit?: number;
  elementsOffset?: number;
}

async function fetchBoard(
  boardId: string,
  options: UseBoardOptions = {}
): Promise<BoardResponse> {
  const params = new URLSearchParams();

  if (options.elementsLimit !== undefined) {
    params.set("elementsLimit", options.elementsLimit.toString());
  }
  if (options.elementsOffset !== undefined) {
    params.set("elementsOffset", options.elementsOffset.toString());
  }

  const url = `/api/boards/${boardId}${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies for auth
  });

  let result: APIResponse<BoardResponse>;
  try {
    result = await response.json();
  } catch (e) {
    const error = new Error(`Failed to parse response: ${response.statusText || 'Unknown error'}`);
    (error as Error & { code: string }).code = "PARSE_ERROR";
    (error as Error & { statusCode: number }).statusCode = response.status;
    throw error;
  }

  if (!result.success) {
    const error = new Error(result.error.message);
    (error as Error & { code: string }).code = result.error.code;
    (error as Error & { statusCode: number }).statusCode = response.status;
    throw error;
  }

  return result.data;
}

export function useBoard(boardId: string | null, options: UseBoardOptions = {}) {
  return useQuery<BoardResponse, Error>({
    queryKey: [
      "board",
      boardId,
      options.elementsLimit,
      options.elementsOffset
    ],
    queryFn: () => fetchBoard(boardId!, options),
    enabled: !!boardId && options.enabled !== false,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth or permission errors
      const code = (error as Error & { code?: string }).code;
      if (
        code === "UNAUTHORIZED" ||
        code === "FORBIDDEN" ||
        code === "NOT_FOUND"
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useBoardWithInitialization(boardId: string | null) {
  const query = useBoard(boardId);

  return {
    ...query,
    // Helper to initialize canvas store
    initializeCanvas: (canvasStore: {
      setCurrentBoard: (board: Board) => void;
    }) => {
      if (query.data) {
        // Transform to legacy Board format for backward compatibility
        const legacyBoard = {
          id: query.data.boardMeta.id,
          user_id: query.data.boardMeta.ownerId,
          title: query.data.boardMeta.title,
          slug: query.data.boardMeta.slug,
          grid_config: query.data.boardMeta.gridConfig,
          blocks: query.data.elements.map((el) => ({
            id: el.id,
            type: el.type as BlockType,
            data: el.content,
            position: el.position,
            size: el.size,
          })),
          is_template: query.data.boardMeta.isTemplate,
          created_at: query.data.boardMeta.createdAt,
          updated_at: query.data.boardMeta.updatedAt,
          published_at: query.data.boardMeta.publishedAt || undefined,
        };
        canvasStore.setCurrentBoard(legacyBoard);
      }
    },
  };
}
