"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { account } from "@/lib/appwrite";
import { Models } from "appwrite";
import { getOrCreateUser } from "./services/user-service";
import { handleAuthError } from "./auth-utils";
import type { User } from "@/lib/types/user";

interface UserContextType {
  user: Models.User<Models.Preferences> | null;
  userData: User | null; // User-Daten aus Users Collection
  loading: boolean;
  error: Error | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    async function fetchUser() {
      try {
        // Lade AppWrite User
        const currentUser = await account.get();

        if (!isMountedRef.current) return;

        setUser(currentUser);

        // Lade oder erstelle User-Daten aus Users Collection
        try {
          const userData = await getOrCreateUser(
            currentUser.$id,
            currentUser.email,
            currentUser.name
          );

          if (isMountedRef.current) {
            setUserData(userData);
          }
        } catch (userDataError) {
          // Prüfe ob es ein Auth-Fehler ist
          if (handleAuthError(userDataError, "UserContext.getOrCreateUser")) {
            return; // Redirect wurde durchgeführt
          }

          console.error(
            "Fehler beim Laden/Erstellen der User-Daten:",
            userDataError
          );
          // Setze User-Daten auf null, aber lasse AppWrite User bestehen
          if (isMountedRef.current) {
            setUserData(null);
          }
        }

        if (isMountedRef.current) {
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setUser(null);
          setUserData(null);
          setLoading(false);
          setError(
            err instanceof Error ? err : new Error("Failed to fetch user")
          );
        }
      }
    }

    fetchUser();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
