"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser, type Session } from "@supabase/supabase-js";
import { getOrCreateUser } from "./services/user-service";
import { handleAuthError } from "./auth-utils";
import type { User } from "@/lib/types/user";

interface UserContextType {
  user: SupabaseUser | null;
  userData: User | null; // User-Daten aus Users Tabelle
  loading: boolean;
  error: Error | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    async function fetchUser() {
      try {
        // Lade Supabase Auth User
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!isMountedRef.current) return;

        setUser(currentUser);

        // Lade oder erstelle User-Daten aus Users Tabelle
        if (currentUser) {
          try {
            const userData = await getOrCreateUser(
              currentUser.id,
              currentUser.email || "",
              currentUser.user_metadata?.display_name
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
            
            // Detaillierte Fehler-Logging zur Diagnose
            if (userDataError instanceof Error) {
              console.error("Error stack:", userDataError.stack);
              console.error("Error name:", userDataError.name);
              console.error("Error message:", userDataError.message);
            }
            
            // Setze User-Daten auf null, aber lasse Supabase User bestehen
            if (isMountedRef.current) {
              setUserData(null);
              setError(
                userDataError instanceof Error 
                  ? userDataError 
                  : new Error("Fehler beim Laden der User-Daten")
              );
            }
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

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      if (!isMountedRef.current) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const userData = await getOrCreateUser(
            currentUser.id,
            currentUser.email || "",
            currentUser.user_metadata?.display_name
          );

          if (isMountedRef.current) {
            setUserData(userData);
          }
        } catch (userDataError) {
          console.error(
            "Fehler beim Laden/Erstellen der User-Daten:",
            userDataError
          );
          
          // Detaillierte Fehler-Logging zur Diagnose
          if (userDataError instanceof Error) {
            console.error("Error stack:", userDataError.stack);
            console.error("Error name:", userDataError.name);
            console.error("Error message:", userDataError.message);
          }
          
          if (isMountedRef.current) {
            setUserData(null);
            setError(
              userDataError instanceof Error 
                ? userDataError 
                : new Error("Fehler beim Laden der User-Daten")
            );
          }
        }
      } else {
        setUserData(null);
      }

      if (isMountedRef.current) {
        setLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
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
