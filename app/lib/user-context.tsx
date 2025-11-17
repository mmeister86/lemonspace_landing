"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser, type Session, type UserResponse } from "@supabase/supabase-js";
import { getOrCreateUser } from "./services/user-service";
import { handleAuthError } from "./auth-utils";
import type { User } from "@/lib/types/user";

// Custom error class for auth redirect control flow
export class AuthRedirectError extends Error {
  constructor() {
    super("Auth redirect in progress");
    this.name = "AuthRedirectError";
  }
}

interface UserContextType {
  user: SupabaseUser | null;
  userData: User | null; // User-Daten aus Users Tabelle
  loading: boolean;
  error: Error | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Timeout for loading states (10 seconds)
const LOADING_TIMEOUT = 10000;

// Timeout for Supabase auth operations (8 seconds)
const SUPABASE_AUTH_TIMEOUT_MS = 8000;

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(false);

  const authStateChangeHandledRef = useRef(false);
  const loadingRef = useRef(true);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isAuthRedirectingRef = useRef(false);

  // Helper function to safely set loading state
  const safeSetLoading = useCallback((isLoading: boolean) => {
    if (isMountedRef.current) {
      setLoading(isLoading);
      loadingRef.current = isLoading;

      // Clear timeout when loading completes successfully
      if (!isLoading && timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
        console.log("[UserProvider] Loading completed, timeout cleared");
      }
    }
  }, []);

  // Helper function to safely set error state
  const safeSetError = useCallback((err: Error | null) => {
    if (isMountedRef.current) {
      setError(err);
    }
  }, []);

  // Helper function to safely set user state
  const safeSetUser = useCallback((currentUser: SupabaseUser | null) => {
    if (isMountedRef.current) {
      setUser(currentUser);
    }
  }, []);

  // Helper function to safely set user data state
  const safeSetUserData = useCallback((data: User | null) => {
    if (isMountedRef.current) {
      setUserData(data);
    }
  }, []);

  // Timeout mechanism to prevent infinite loading
  const setupLoadingTimeout = useCallback(() => {
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        // Skip timeout error if auth redirect is in progress
        if (isAuthRedirectingRef.current) {
          console.log("[UserProvider] Loading timeout skipped - auth redirect in progress");
          return;
        }
        console.warn("[UserProvider] Loading timeout reached, forcing loading to false");
        safeSetLoading(false);
        safeSetError(new Error("Ladevorgang hat zu lange gedauert. Bitte versuchen Sie es erneut."));
      }
    }, LOADING_TIMEOUT);

    timeoutIdRef.current = timeoutId;
  }, [safeSetLoading, safeSetError]);

  // Function to load or create user data
  const loadUserData = useCallback(async (currentUser: SupabaseUser): Promise<User | null> => {
    try {
      const userData = await getOrCreateUser(
        currentUser.id,
        currentUser.email || "",
        currentUser.user_metadata?.display_name
      );
      return userData;
    } catch (userDataError) {
      // Check if it's an auth error
      if (handleAuthError(userDataError, "UserContext.getOrCreateUser")) {
        throw new AuthRedirectError();
      }

      console.error("Fehler beim Laden/Erstellen der User-Daten:", userDataError);

      // Detailed error logging for diagnosis
      if (userDataError instanceof Error) {
        console.error("Error stack:", userDataError.stack);
        console.error("Error name:", userDataError.name);
        console.error("Error message:", userDataError.message);
      }

      throw userDataError;
    }
  }, []);

  // Main user fetching function
  const fetchUser = useCallback(async (): Promise<void> => {
    try {
      // Load Supabase Auth User with timeout
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Supabase auth timeout")), SUPABASE_AUTH_TIMEOUT_MS)
      );

      const result = await Promise.race([userPromise, timeoutPromise]);

      // Type guard: if we reach here, result is UserResponse (timeout would have thrown)
      const userResponse = result as UserResponse;
      const currentUser = userResponse.data?.user ?? null;

      if (!isMountedRef.current) return;

      safeSetUser(currentUser);

      // Load or create User data from Users table
      if (currentUser) {
        try {
          const userData = await loadUserData(currentUser);
          safeSetUserData(userData);
        } catch (userDataError: unknown) {
          if (userDataError instanceof AuthRedirectError) {
            // Auth redirect in progress, set guard and clear timeout
            isAuthRedirectingRef.current = true;
            if (timeoutIdRef.current) {
              clearTimeout(timeoutIdRef.current);
              timeoutIdRef.current = null;
            }
            console.log("[UserProvider] Auth redirect detected, timeout cleared");
            return;
          }
          // Set user data to null, but keep Supabase user
          safeSetUserData(null);
          safeSetError(
            userDataError instanceof Error
              ? userDataError
              : new Error("Fehler beim Laden der User-Daten")
          );
        }
      }

      // Only set loading to false if auth state change hasn't already handled it
      if (!authStateChangeHandledRef.current) {
        safeSetLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        safeSetUser(null);
        safeSetUserData(null);
        safeSetLoading(false);
        safeSetError(
          err instanceof Error ? err : new Error("Failed to fetch user")
        );
      }
    }
  }, [loadUserData, safeSetUser, safeSetUserData, safeSetLoading, safeSetError]);

  useEffect(() => {
    isMountedRef.current = true;
    authStateChangeHandledRef.current = false;

    // Setup loading timeout
    setupLoadingTimeout();

    // Start fetching user
    fetchUser();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      if (!isMountedRef.current) return;

      authStateChangeHandledRef.current = true;
      const currentUser = session?.user ?? null;
      safeSetUser(currentUser);

      if (currentUser) {
        try {
          const userData = await loadUserData(currentUser);
          safeSetUserData(userData);
        } catch (userDataError: unknown) {
          if (userDataError instanceof AuthRedirectError) {
            // Auth redirect in progress, set guard and clear timeout
            isAuthRedirectingRef.current = true;
            if (timeoutIdRef.current) {
              clearTimeout(timeoutIdRef.current);
              timeoutIdRef.current = null;
            }
            console.log("[UserProvider] Auth redirect detected in onAuthStateChange, timeout cleared");
            return;
          }

          console.error("Fehler beim Laden/Erstellen der User-Daten:", userDataError);

          // Detailed error logging for diagnosis
          if (userDataError instanceof Error) {
            console.error("Error stack:", userDataError.stack);
            console.error("Error name:", userDataError.name);
            console.error("Error message:", userDataError.message);
          }

          safeSetUserData(null);
          safeSetError(
            userDataError instanceof Error
              ? userDataError
              : new Error("Fehler beim Laden der User-Daten")
          );
          return; // Don't set loading to false for auth redirect
        }
      } else {
        safeSetUserData(null);
      }

      safeSetLoading(false);
    });

    return () => {
      isMountedRef.current = false;
      authStateChangeHandledRef.current = false;
      isAuthRedirectingRef.current = false;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [setupLoadingTimeout, fetchUser, loadUserData, safeSetUser, safeSetUserData, safeSetLoading, safeSetError]);

  return (
    <UserContext.Provider value={{ user, userData, loading, error }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
