import type { Board, GridConfig, Block } from "@/lib/types/board";

export class APIError extends Error {
  constructor(message: string, public statusCode?: number, public details?: unknown) {
    super(message);
    this.name = 'APIError';
  }
}

export interface CreateBoardAPIRequest {
  title: string;
  slug?: string;
  grid_config?: GridConfig;
  blocks?: Block[];
  template_id?: string;
  is_template?: boolean;
}

/**
 * Erstellt ein neues Board über die API-Route
 */
export async function createBoardViaAPI(
  data: CreateBoardAPIRequest
): Promise<Board> {
  // Create an AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

  try {
    const response = await fetch("/api/new-board", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = "createBoard.error.createFailed";

      let errorDetails = undefined;
      try {
        const errorData = await response.json();
        errorDetails = errorData?.details;

        if (errorData.error) {
          errorMessage = errorData.error;
        }

        // Bei Validierungsfehlern, zeige Details
        if (errorData.details && typeof errorData.details === 'object') {
          const details = Object.entries(errorData.details)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return `${field}: ${messages.join(', ')}`;
              }
              return `${field}: ${String(messages)}`;
            })
            .join('; ');
          errorMessage += ` (${details})`;
        }
      } catch (parseError) {
        // Wenn das Parsen der Fehlerantwort fehlschlägt, verwende Standardmeldung
        console.error("Error parsing API error response:", parseError);
      }

      throw new APIError(errorMessage, response.status, errorDetails);
    }

    try {
      const board = await response.json();
      return board;
    } catch (parseError) {
      console.error("Error parsing API response:", parseError);
      throw new APIError("Invalid response received from server");
    }
  } catch (error) {
    // Handle AbortController timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError("Request timed out. Please try again.", 408);
    }
    throw error;
  } finally {
    // Clear the timeout regardless of outcome
    clearTimeout(timeoutId);
  }
}

/**
 * Aktualisiert ein Board über die API-Route
 */
export async function updateBoardViaAPI(
  boardId: string,
  data: Partial<Board>
): Promise<Board> {
  // Create an AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

  try {
    const response = await fetch(`/api/boards/${boardId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = "updateBoard.error.updateFailed";

      let errorDetails = undefined;
      try {
        const errorData = await response.json();
        errorDetails = errorData?.details;

        if (errorData.error) {
          errorMessage = errorData.error;
        }

        // Bei Validierungsfehlern, zeige Details
        if (errorData.details && typeof errorData.details === 'object') {
          const details = Object.entries(errorData.details)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return `${field}: ${messages.join(', ')}`;
              }
              return `${field}: ${String(messages)}`;
            })
            .join('; ');
          errorMessage += ` (${details})`;
        }
      } catch (parseError) {
        // Wenn das Parsen der Fehlerantwort fehlschlägt, verwende Standardmeldung
        console.error("Error parsing API error response:", parseError);
      }

      throw new APIError(errorMessage, response.status, errorDetails);
    }

    try {
      const result = await response.json();
      // The API returns { boardMeta, changedFields, savedAt }
      // We need to construct a full Board object
      // If blocks were sent, use them; otherwise we'll need to fetch the board
      const boardMeta = result.data?.boardMeta;
      if (!boardMeta) {
        throw new APIError("Invalid response: missing boardMeta");
      }

      // Construct a Board object from boardMeta and the blocks we sent
      // Note: The blocks might have been transformed by syncBoardElements,
      // but for now we'll use the blocks we sent since they're already in the store
      const board: Board = {
        id: boardMeta.id,
        user_id: boardMeta.ownerId,
        title: boardMeta.title,
        slug: boardMeta.slug,
        grid_config: boardMeta.gridConfig,
        visibility: boardMeta.visibility,
        blocks: data.blocks || [], // Use the blocks we sent
        template_id: boardMeta.isTemplate ? boardMeta.id : undefined,
        is_template: boardMeta.isTemplate || false,
        created_at: boardMeta.createdAt,
        updated_at: boardMeta.updatedAt,
        published_at: boardMeta.publishedAt || undefined,
      };

      return board;
    } catch (parseError) {
      console.error("Error parsing API response:", parseError);
      throw new APIError("Invalid response received from server");
    }
  } catch (error) {
    // Handle AbortController timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError("Request timed out. Please try again.", 408);
    }
    throw error;
  } finally {
    // Clear the timeout regardless of outcome
    clearTimeout(timeoutId);
  }
}
