import { Client, Account, Databases, Storage, ID } from "appwrite";

// Debug logging to track module initialization
if (process.env.NODE_ENV === "development") {
  console.log(
    "[Appwrite] Module initialization - checking if this runs during build time"
  );
  console.log("[Appwrite] Environment variables available:", {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: !!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID:
      !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    NEXT_PUBLIC_APPWRITE_DATABASE_ID:
      !!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID:
      !!process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID,
    NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID:
      !!process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  });
}

// Lazy Appwrite Client-Initialisierung
// Verhindert Fehler während des Build-Prozesses (SSR) wenn Umgebungsvariablen nicht gesetzt sind
let clientInstance: Client | null = null;

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
 * Liest eine erforderliche Umgebungsvariable und wirft einen Fehler, wenn sie fehlt.
 *
 * @param envVarName - Der Name der Umgebungsvariable
 * @returns Der bereinigte Wert der Umgebungsvariable
 * @throws Error wenn die Umgebungsvariable fehlt oder leer ist
 */
function getRequiredEnv(envVarName: string): string {
  const rawValue = process.env[envVarName];
  const cleanedValue = stripQuotes(rawValue);

  if (!cleanedValue || cleanedValue.trim() === "") {
    throw new Error(
      `Erforderliche Umgebungsvariable "${envVarName}" ist nicht gesetzt oder leer. ` +
        `Bitte überprüfe deine Umgebungsvariablen-Konfiguration.`
    );
  }

  return cleanedValue;
}

/**
 * Normalisiert die Appwrite Endpoint URL.
 * Stellt sicher, dass die URL mit `/v1` endet, wie von Appwrite erwartet.
 * Entfernt doppelte trailing slashes und normalisiert die URL.
 *
 * @param url - Die zu normalisierende URL
 * @returns Die normalisierte URL mit `/v1` am Ende
 *
 * @example
 * normalizeEndpointUrl("https://backend.lemonspace.io") // "https://backend.lemonspace.io/v1"
 * normalizeEndpointUrl("https://backend.lemonspace.io/") // "https://backend.lemonspace.io/v1"
 * normalizeEndpointUrl("https://backend.lemonspace.io/v1") // "https://backend.lemonspace.io/v1"
 * normalizeEndpointUrl("https://backend.lemonspace.io/v1/") // "https://backend.lemonspace.io/v1"
 */
function normalizeEndpointUrl(url: string): string {
  if (!url) return url;

  let normalized = url.trim();

  // Entferne alle trailing slashes
  normalized = normalized.replace(/\/+$/, "");

  // Stelle sicher, dass die URL mit /v1 endet
  if (!normalized.endsWith("/v1")) {
    normalized = normalized + "/v1";
  }

  return normalized;
}

function getClient(): Client {
  if (!clientInstance) {
    // Entferne Anführungszeichen aus den Umgebungsvariablen (können durch Docker/Coolify hinzugefügt werden)
    const endpoint = stripQuotes(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
    const projectId = stripQuotes(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

    // Nur initialisieren wenn Umgebungsvariablen vorhanden sind
    // Während des Builds (SSR) werden diese Services nicht verwendet, da sie nur in Client-Komponenten genutzt werden
    if (!endpoint || !projectId) {
      // Fallback für Build-Zeit: Verwende gültige Dummy-Werte
      // Diese werden zur Laufzeit nie verwendet, da useAuth nur clientseitig läuft
      // Appwrite validiert die URL beim setEndpoint, daher müssen wir eine gültige URL verwenden
      clientInstance = new Client()
        .setEndpoint("https://cloud.appwrite.io/v1")
        .setProject("build-placeholder");
    } else {
      // Normalisiere die Endpoint URL (entfernt /v1 falls vorhanden)
      const normalizedEndpoint = normalizeEndpointUrl(endpoint);

      // Debug-Logging nur in Development
      if (process.env.NODE_ENV === "development") {
        console.log(`[Appwrite] Endpoint Konfiguration:`, {
          rawEnv: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
          cleaned: endpoint,
          normalized: normalizedEndpoint,
          projectId: projectId,
        });
        if (endpoint !== normalizedEndpoint) {
          console.log(
            `[Appwrite] Endpoint URL wurde normalisiert: "${endpoint}" -> "${normalizedEndpoint}"`
          );
        }
      }

      try {
        clientInstance = new Client()
          .setEndpoint(normalizedEndpoint)
          .setProject(projectId);

        // Debug-Logging: Überprüfe die tatsächlich verwendete URL
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[Appwrite] Client erfolgreich initialisiert mit Endpoint: "${normalizedEndpoint}"`
          );
        }
      } catch (error) {
        // Verbesserte Fehlerbehandlung für ungültige URLs
        const errorMessage =
          error instanceof Error ? error.message : "Unbekannter Fehler";
        console.error(
          `[Appwrite] Fehler beim Initialisieren des Clients mit Endpoint "${normalizedEndpoint}":`,
          errorMessage
        );

        // Zusätzliches Logging für Debugging
        if (process.env.NODE_ENV === "development") {
          console.error(`[Appwrite] Debug Info:`, {
            rawEnvVar: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
            cleanedEndpoint: endpoint,
            normalizedEndpoint: normalizedEndpoint,
            endpointType: typeof endpoint,
            normalizedType: typeof normalizedEndpoint,
            hostname:
              typeof window !== "undefined"
                ? window.location.hostname
                : "server-side",
            envKeys: Object.keys(process.env).filter((key) =>
              key.includes("APPWRITE")
            ),
          });
        }

        throw new Error(
          `Ungültige Appwrite Endpoint URL: "${normalizedEndpoint}". ` +
            `Bitte überprüfe die Umgebungsvariable NEXT_PUBLIC_APPWRITE_ENDPOINT. ` +
            `Die URL sollte mit /v1 enden (z.B. "https://backend.lemonspace.io/v1"). ` +
            `Original URL: "${endpoint}"`
        );
      }
    }
  }
  return clientInstance;
}

// Appwrite Services - Lazy initialisiert über Proxy
// Dies stellt sicher, dass die Initialisierung erst bei tatsächlicher Verwendung erfolgt
// Während des Builds werden diese Proxies nie aufgerufen, da sie nur in Client-Komponenten verwendet werden
let accountInstance: Account | null = null;
let databasesInstance: Databases | null = null;
let storageInstance: Storage | null = null;

export const account = new Proxy({} as Account, {
  get(_target, prop) {
    if (!accountInstance) {
      accountInstance = new Account(getClient());
    }
    return (accountInstance as unknown as Record<string | symbol, unknown>)[
      prop
    ];
  },
}) as Account;

export const databases = new Proxy({} as Databases, {
  get(_target, prop) {
    if (!databasesInstance) {
      databasesInstance = new Databases(getClient());
    }
    const value = (
      databasesInstance as unknown as Record<string | symbol, unknown>
    )[prop];
    // Binde Funktionen an die Instanz, damit 'this' korrekt gesetzt ist
    if (typeof value === "function") {
      return value.bind(databasesInstance);
    }
    return value;
  },
}) as Databases;

export const storage = new Proxy({} as Storage, {
  get(_target, prop) {
    if (!storageInstance) {
      storageInstance = new Storage(getClient());
    }
    const value = Reflect.get(
      storageInstance as unknown as Record<string | symbol, unknown>,
      prop
    );
    // Binde Funktionen an die Instanz, damit 'this' korrekt gesetzt ist
    if (typeof value === "function") {
      return value.bind(storageInstance);
    }
    return value;
  },
}) as Storage;

export function getDatabaseId(): string {
  try {
    const value = getRequiredEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID");
    // Debug logging to confirm lazy evaluation
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[Appwrite] getDatabaseId(): Successfully resolved environment variable"
      );
    }
    return value;
  } catch (error) {
    // Debug logging to confirm fallback is used
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[Appwrite] getDatabaseId(): Using build-placeholder fallback",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
    return "build-placeholder";
  }
}

export function getBoardsCollectionId(): string {
  try {
    const value = getRequiredEnv("NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID");
    // Debug logging to confirm lazy evaluation
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[Appwrite] getBoardsCollectionId(): Successfully resolved environment variable"
      );
    }
    return value;
  } catch (error) {
    // Debug logging to confirm fallback is used
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[Appwrite] getBoardsCollectionId(): Using build-placeholder fallback",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
    return "build-placeholder";
  }
}

// Cache for lazy evaluation
let usersCollectionIdCache: string | null = null;

export function getUsersCollectionId(): string {
  if (usersCollectionIdCache) {
    return usersCollectionIdCache;
  }

  try {
    const value = getRequiredEnv("NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID");
    // Debug logging to confirm lazy evaluation
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[Appwrite] getUsersCollectionId(): Successfully resolved environment variable"
      );
    }
    usersCollectionIdCache = value;
    return value;
  } catch (error) {
    // Debug logging to confirm fallback is used
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[Appwrite] getUsersCollectionId(): Using build-placeholder fallback",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
    usersCollectionIdCache = "build-placeholder";
    return "build-placeholder";
  }
}

export { ID };

// Export als Funktion, damit der Client nicht sofort initialisiert wird
export default getClient;
