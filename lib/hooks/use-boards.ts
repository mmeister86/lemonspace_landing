/**
 * The above functions provide hooks for managing boards, including fetching, creating, updating, and
 * deleting boards via API calls.
 * @param {string | null} userId - The `userId` parameter is used to identify the current user for whom
 * the boards are being fetched or updated. It is typically a string representing the unique identifier
 * of the user in the system. This parameter helps in filtering and retrieving boards specific to the
 * logged-in user.
 * @returns The code snippet provided contains several custom hooks for managing boards in a React
 * application. Here is a summary of what each hook is returning:
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBoardViaAPI, type CreateBoardAPIRequest } from "../services/api-board-service";
import { useUser } from "../contexts/user-context";
import type { Board } from "@/lib/types/board";
import { toast } from "sonner";

/**
 * Hook to fetch all boards for the current user.
 */
export function useBoards(userId: string | null) {
  return useQuery<Board[], Error>({
    queryKey: ["boards", userId],
    queryFn: async () => {
      const response = await fetch("/api/boards");
      if (!response.ok) {
        throw new Error("Failed to fetch boards");
      }
      const result = await response.json();
      return result.data.boards;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to fetch the 5 most recently updated boards for the current user.
 */
export function useRecentBoards() {
  const { user } = useUser();

  return useQuery<Board[], Error>({
    queryKey: ["recent-boards", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      const response = await fetch("/api/boards?recent=true");
      if (!response.ok) {
        throw new Error("Failed to fetch recent boards");
      }
      const result = await response.json();
      return result.data.boards;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new board via API.
 */
export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation<Board, Error, CreateBoardAPIRequest>({
    mutationFn: (data) => createBoardViaAPI(data),
    onSuccess: (newBoard) => {
      // Invalidate and refetch boards
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["recent-boards"] });
      toast.success(`Board "${newBoard.title}" created`);
    },
    onError: (error) => {
      console.error("Error creating board:", error);
      toast.error(error.message || "Failed to create board");
    },
  });
}

/**
 * Hook to update an existing board.
 */
export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation<Board, Error, { boardId: string; boardData: Partial<Board> }>({
    mutationFn: async ({ boardId, boardData }) => {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(boardData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update board");
      }

      const result = await response.json();
      return result.data.boardMeta;
    },
    onSuccess: (updatedBoard) => {
      // Update the board in the cache
      queryClient.setQueryData(["boards", updatedBoard.user_id], (oldBoards: Board[] | undefined) =>
        oldBoards?.map((board) => (board.id === updatedBoard.id ? updatedBoard : board))
      );
      // Invalidate recent boards as it might affect the order
      queryClient.invalidateQueries({ queryKey: ["recent-boards"] });
      toast.success(`Board "${updatedBoard.title}" gespeichert`);
    },
    onError: (error) => {
      console.error("Fehler beim Aktualisieren des Boards:", error);
      toast.error("Fehler beim Speichern des Boards");
    },
  });
}

/**
 * Hook to update a board's slug.
 */
export function useUpdateBoardSlug() {
  const queryClient = useQueryClient();
  const updateBoard = useUpdateBoard();
  return useMutation<Board, Error, { boardId: string; slug: string }>({
    mutationFn: ({ boardId, slug }) => updateBoard.mutateAsync({ boardId, boardData: { slug } }),
    onSuccess: () => {
      // Invalidate recent boards as it might affect the order
      queryClient.invalidateQueries({ queryKey: ["recent-boards"] });
    },
  });
}

/**
 * Hook to update a board's title.
 */
export function useUpdateBoardTitle() {
  const queryClient = useQueryClient();
  const updateBoard = useUpdateBoard();
  return useMutation<Board, Error, { boardId: string; title: string }>({
    mutationFn: ({ boardId, title }) => updateBoard.mutateAsync({ boardId, boardData: { title } }),
    onSuccess: () => {
      // Invalidate recent boards as it might affect the order
      queryClient.invalidateQueries({ queryKey: ["recent-boards"] });
    },
  });
}

/**
 * Hook to delete a board.
 */
export function useDeleteBoard() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation<void, Error, string>({
    mutationFn: async (boardId) => {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to delete board");
      }
    },
    onSuccess: (_, boardId) => {
      // Remove the board from the cache
      queryClient.setQueryData(["boards", user?.id], (oldBoards: Board[] | undefined) =>
        oldBoards?.filter((board) => board.id !== boardId)
      );
      // Invalidate recent boards
      queryClient.invalidateQueries({ queryKey: ["recent-boards"] });
      toast.success("Board gelöscht");
    },
    onError: (error) => {
      console.error("Fehler beim Löschen des Boards:", error);
      toast.error("Fehler beim Löschen des Boards");
    },
  });
}
