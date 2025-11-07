import { Client, Account, Databases, Storage } from 'appwrite';

// Lazy Appwrite Client-Initialisierung
// Verhindert Fehler während des Build-Prozesses (SSR) wenn Umgebungsvariablen nicht gesetzt sind
let clientInstance: Client | null = null;

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
      clientInstance = new Client().setEndpoint('https://cloud.appwrite.io/v1').setProject('build-placeholder');
    } else {
      clientInstance = new Client().setEndpoint(endpoint).setProject(projectId);
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
    return (accountInstance as unknown as Record<string | symbol, unknown>)[prop];
  },
}) as Account;

export const databases = new Proxy({} as Databases, {
  get(_target, prop) {
    if (!databasesInstance) {
      databasesInstance = new Databases(getClient());
    }
    return (databasesInstance as unknown as Record<string | symbol, unknown>)[prop];
  },
}) as Databases;

export const storage = new Proxy({} as Storage, {
  get(_target, prop) {
    if (!storageInstance) {
      storageInstance = new Storage(getClient());
    }
    return (storageInstance as unknown as Record<string | symbol, unknown>)[prop];
  },
}) as Storage;

// Export als Funktion, damit der Client nicht sofort initialisiert wird
export default getClient;
