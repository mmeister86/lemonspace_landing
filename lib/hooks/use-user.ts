import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserByAuthId,
  getUserByUsername,
  createUser,
  updateUsername,
} from "../services/user-service";

/**
 * Lädt einen User anhand der Auth User-ID
 */
export function useUserByAuthId(authUserId: string | null) {
  return useQuery({
    queryKey: ["user", "auth", authUserId],
    queryFn: () => getUserByAuthId(authUserId!),
    enabled: !!authUserId,
  });
}

/**
 * Lädt einen User anhand des Usernames
 */
export function useUserByUsername(username: string | null) {
  return useQuery({
    queryKey: ["user", "username", username],
    queryFn: () => getUserByUsername(username!),
    enabled: !!username,
  });
}

/**
 * Mutation für User-Erstellung
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      authUserId,
      username,
      displayName,
    }: {
      authUserId: string;
      username: string;
      displayName?: string;
    }) => createUser(authUserId, username, displayName),
    onSuccess: (data) => {
      // Setze User in Cache
      queryClient.setQueryData(
        ["user", "auth", data.auth_user_id],
        data
      );
      queryClient.setQueryData(["user", "username", data.username], data);
      // Invalidate alle User-Queries
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

/**
 * Mutation für Username-Update
 */
export function useUpdateUsername() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      newUsername,
    }: {
      userId: string;
      newUsername: string;
    }) => updateUsername(userId, newUsername),
    onSuccess: (data) => {
      // Fetch old user data to get previous username
      const oldUser = queryClient.getQueryData<typeof data>([
        "user",
        "auth",
        data.auth_user_id,
      ]);

      // Update User in Cache
      queryClient.setQueryData(
        ["user", "auth", data.auth_user_id],
        data
      );
      queryClient.setQueryData(["user", "username", data.username], data);
      // Entferne alten Username aus Cache (if it exists and differs)
      if (oldUser?.username && oldUser.username !== data.username) {
        queryClient.removeQueries({
          queryKey: ["user", "username", oldUser.username],
          exact: true,
        });
      }
      // Invalidate alle User-Queries
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
