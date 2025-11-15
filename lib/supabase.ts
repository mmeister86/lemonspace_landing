import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Entfernt Anführungszeichen am Anfang und Ende eines Strings.
 * Diese können durch Docker/Coolify oder andere Umgebungstools hinzugefügt werden.
 *
 * @param value - Der zu bereinigende String
 * @returns Der bereinigte String ohne Anführungszeichen
 *
 * @example
 * stripQuotes('"value"') // "value"
 * stripQuotes("'value'") // "value"
 * stripQuotes("value") // "value"
 */
function stripQuotes(value: string | undefined): string | undefined {
  return value?.replace(/^["']|["']$/g, "");
}

/**
 * Gibt den initialisierten Supabase Browser Client zurück.
 * Verwendet @supabase/ssr für korrektes Cookie-Handling in Next.js.
 */
function getClient(): SupabaseClient {
  // Prüfe ob wir im Browser sind
  if (typeof window === "undefined") {
    throw new Error(
      "Supabase client kann nur im Browser initialisiert werden. Verwende lib/supabase/server.ts für Server-Komponenten."
    );
  }

  // Entferne Anführungszeichen aus den Umgebungsvariablen
  const url = stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY müssen gesetzt sein."
    );
  }

  // Debug-Logging nur in Development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Supabase] Browser Client Konfiguration:`, {
      url: url,
      hasAnonKey: !!anonKey,
    });
  }

  return createBrowserClient(url, anonKey);
}

// Supabase Client - Lazy initialisiert für Browser
// Verwendet createBrowserClient aus @supabase/ssr für korrektes Cookie-Handling
let clientInstance: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!clientInstance) {
      clientInstance = getClient();
    }
    const value = (clientInstance as unknown as Record<string | symbol, unknown>)[
      prop
    ];
    // Binde Funktionen an die Instanz, damit 'this' korrekt gesetzt ist
    if (typeof value === "function") {
      return value.bind(clientInstance);
    }
    return value;
  },
}) as SupabaseClient;

// Export als Funktion, damit der Client nicht sofort initialisiert wird
export default getClient;
