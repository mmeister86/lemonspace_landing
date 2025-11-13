import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBoard,
  getBoard,
  updateBoard,
  deleteBoard,
  listBoards,
  getBoardByUsernameAndSlug,
} from "../services/board-service";
import type { Board } from "@/lib/types/board";

/**
 * Lädt ein einzelnes Board
 */
export function useBoard(boardId: string | null) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoard(boardId!),
    enabled: !!boardId,
  });
}

/**
 * Lädt alle Boards eines Users
 */
export function useBoards(userId: string | null) {
  return useQuery({
    queryKey: ["boards", userId],
    queryFn: () => listBoards(userId!),
    enabled: !!userId,
  });
}

/**
 * Mutation für Board-Erstellung
 */
export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      boardData,
    }: {
      userId: string;
      boardData: Partial<Board>;
    }) => createBoard(userId, boardData),
    onSuccess: (data) => {
      // Invalidate boards list
      queryClient.invalidateQueries({ queryKey: ["boards", data.user_id] });
      // Set new board in cache
      queryClient.setQueryData(["board", data.id], data);
    },
  });
}

/**
 * Mutation für Board-Update
 */
export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      boardData,
    }: {
      boardId: string;
      boardData: Partial<Board>;
    }) => updateBoard(boardId, boardData),
    onSuccess: (data) => {
      // Update board in cache
      queryClient.setQueryData(["board", data.id], data);
      // Invalidate boards list
      queryClient.invalidateQueries({ queryKey: ["boards", data.user_id] });
      // Get username from user cache and invalidate username/slug cache
      const user = queryClient.getQueryData<{ username: string }>([
        "user",
        "appwrite",
        data.user_id,
      ]);
      if (user?.username) {
        queryClient.invalidateQueries({
          queryKey: ["board", "username", user.username, "slug", data.slug],
        });
      }
    },
  });
}

/**
 * Mutation für Board-Löschung
 */
export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId }: { boardId: string; userId: string }) =>
      deleteBoard(boardId),
    onSuccess: (_, variables) => {
      const { boardId, userId } = variables;
      // Remove board from cache
      queryClient.removeQueries({ queryKey: ["board", boardId] });
      // Invalidate boards list for specific user
      queryClient.invalidateQueries({ queryKey: ["boards", userId] });
    },
  });
}

/**
 * Lädt ein Board anhand von Username und Slug
 */
export function useBoardByUsernameAndSlug(
  username: string | null,
  slug: string | null
) {
  return useQuery({
    queryKey: ["board", "username", username, "slug", slug],
    queryFn: () => getBoardByUsernameAndSlug(username!, slug!),
    enabled: !!username && !!slug,
  });
}

/**
 * Mutation für Board-Titel-Update
 */
export function useUpdateBoardTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, title }: { boardId: string; title: string }) =>
      updateBoard(boardId, { title }),
    onSuccess: (data) => {
      // Update board in cache
      queryClient.setQueryData(["board", data.id], data);
      // Invalidate boards list
      queryClient.invalidateQueries({ queryKey: ["boards", data.user_id] });
      // Get username from user cache and invalidate username/slug cache
      const user = queryClient.getQueryData<{ username: string }>([
        "user",
        "appwrite",
        data.user_id,
      ]);
      if (user?.username) {
        queryClient.invalidateQueries({
          queryKey: ["board", "username", user.username, "slug", data.slug],
        });
      }
    },
  });
}

/**
 * Mutation für Board-Slug-Update
 */
export function useUpdateBoardSlug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, slug }: { boardId: string; slug: string }) =>
      updateBoard(boardId, { slug }),
    onMutate: async (variables) => {
      // Capture old board from cache before mutation to get previous slug
      const oldBoard = queryClient.getQueryData<Board>([
        "board",
        variables.boardId,
      ]);
      return { previousSlug: oldBoard?.slug };
    },
    onSuccess: (data, variables, context) => {
      const previousSlug = context?.previousSlug;

      // Update board in cache
      queryClient.setQueryData(["board", data.id], data);
      // Invalidate boards list
      queryClient.invalidateQueries({ queryKey: ["boards", data.user_id] });

      // Get username from user cache
      const user = queryClient.getQueryData<{ username: string }>([
        "user",
        "appwrite",
        data.user_id,
      ]);

      if (user?.username) {
        // Invalidate new slug cache
        queryClient.invalidateQueries({
          queryKey: ["board", "username", user.username, "slug", data.slug],
        });
        // Invalidate old slug cache if previous slug exists and differs from new slug
        if (previousSlug && previousSlug !== data.slug) {
          queryClient.invalidateQueries({
            queryKey: [
              "board",
              "username",
              user.username,
              "slug",
              previousSlug,
            ],
          });
        }
      }
    },
  });
}
