import { Client, Account, Databases, Storage } from "appwrite";

// Lazy Appwrite Client-Initialisierung
// Verhindert Fehler während des Build-Prozesses (SSR) wenn Umgebungsvariablen nicht gesetzt sind
let clientInstance: Client | null = null;

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
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

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
          original: endpoint,
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
        console.error(`[Appwrite] Debug Info:`, {
          originalEndpoint: endpoint,
          normalizedEndpoint: normalizedEndpoint,
          endpointType: typeof endpoint,
          normalizedType: typeof normalizedEndpoint,
          isProduction: process.env.NODE_ENV === "production",
          hostname:
            typeof window !== "undefined"
              ? window.location.hostname
              : "server-side",
        });

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

// Export als Funktion, damit der Client nicht sofort initialisiert wird
export default getClient;
