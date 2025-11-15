import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listBoards, createBoard, updateBoard, deleteBoard } from "../services/board-service";
import { useUser } from "../user-context";
import type { Board } from "@/lib/types/board";
import { toast } from "sonner";

/**
 * Hook to fetch all boards for the current user.
 */
export function useBoards(userId: string | null) {
  return useQuery<Board[], Error>({
    queryKey: ["boards", userId],
    queryFn: () => listBoards(userId!),
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
      const allBoards = await listBoards(user.id);
      // Sort by updated_at in descending order and take the top 5
      return allBoards
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new board.
 */
export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation<Board, Error, { userId: string; boardData: Partial<Board> }>({
    mutationFn: ({ userId, boardData }) => createBoard(userId, boardData),
    onSuccess: (newBoard) => {
      // Invalidate and refetch boards
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["recent-boards"] });
      toast.success(`Board "${newBoard.title}" erstellt`);
    },
    onError: (error) => {
      console.error("Fehler beim Erstellen des Boards:", error);
      toast.error("Fehler beim Erstellen des Boards");
    },
  });
}

/**
 * Hook to update an existing board.
 */
export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation<Board, Error, { boardId: string; boardData: Partial<Board> }>({
    mutationFn: ({ boardId, boardData }) => updateBoard(boardId, boardData),
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
    mutationFn: (boardId) => deleteBoard(boardId),
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
