import type { Board, GridConfig, Block } from "@/lib/types/board";

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

      try {
        const errorData = await response.json();

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

      throw new Error(errorMessage);
    }

    try {
      const board = await response.json();
      return board;
    } catch (parseError) {
      console.error("Error parsing API response:", parseError);
      throw new Error("Invalid response received from server");
    }
  } catch (error) {
    // Handle AbortController timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    // Clear the timeout regardless of outcome
    clearTimeout(timeoutId);
  }
}
