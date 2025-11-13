import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserByAppwriteId,
  getUserByUsername,
  createUser,
  updateUsername,
} from "../services/user-service";

/**
 * Lädt einen User anhand der AppWrite User-ID
 */
export function useUserByAppwriteId(appwriteUserId: string | null) {
  return useQuery({
    queryKey: ["user", "appwrite", appwriteUserId],
    queryFn: () => getUserByAppwriteId(appwriteUserId!),
    enabled: !!appwriteUserId,
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
      appwriteUserId,
      username,
      displayName,
    }: {
      appwriteUserId: string;
      username: string;
      displayName?: string;
    }) => createUser(appwriteUserId, username, displayName),
    onSuccess: (data) => {
      // Setze User in Cache
      queryClient.setQueryData(
        ["user", "appwrite", data.appwrite_user_id],
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
        "appwrite",
        data.appwrite_user_id,
      ]);

      // Update User in Cache
      queryClient.setQueryData(
        ["user", "appwrite", data.appwrite_user_id],
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
