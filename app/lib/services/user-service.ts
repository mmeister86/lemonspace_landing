import {
  databases,
  getDatabaseId,
  getUsersCollectionId,
  ID,
} from "@/lib/appwrite";
import type { User, UserDocument, UserDocumentData } from "@/lib/types/user";
import { Query, AppwriteException } from "appwrite";

/**
 * Konvertiert User zu UserDocumentData (für AppWrite)
 */
function userToDocument(user: Partial<User>): Partial<UserDocumentData> {
  return {
    appwrite_user_id: user.appwrite_user_id || "",
    username: user.username || "",
    display_name: user.display_name,
  };
}

/**
 * Konvertiert UserDocument zu User (von AppWrite)
 */
function documentToUser(doc: UserDocument): User {
  return {
    id: doc.$id,
    appwrite_user_id: doc.appwrite_user_id,
    username: doc.username,
    display_name: doc.display_name,
    created_at: doc.$createdAt,
    updated_at: doc.$updatedAt,
  };
}

/**
 * Validiert Username-Format
 * - Nur Kleinbuchstaben (a-z)
 * - Zahlen (0-9)
 * - Unterstriche (_)
 * - Min 3, Max 30 Zeichen
 * - Muss mit Buchstabe beginnen
 */
export function validateUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 30) {
    return false;
  }

  // Muss mit Buchstabe beginnen
  if (!/^[a-z]/.test(username)) {
    return false;
  }

  // Nur Kleinbuchstaben, Zahlen und Unterstriche
  return /^[a-z0-9_]+$/.test(username);
}

/**
 * Generiert einen Username aus einer E-Mail-Adresse
 */
export function generateUsernameFromEmail(email: string): string {
  // Extrahiere Teil vor @
  const localPart = email.split("@")[0].toLowerCase();

  // Bereinige: Ersetze ungültige Zeichen durch Unterstriche
  let username = localPart
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  // Stelle sicher, dass es mit einem Buchstaben beginnt
  if (username.length > 0 && !/^[a-z]/.test(username)) {
    username = "user_" + username;
  }

  // Stelle sicher, dass es mindestens 3 Zeichen hat
  if (username.length < 3) {
    username = username.padEnd(3, "_");
  }

  // Begrenze auf 30 Zeichen
  return username.slice(0, 30);
}

/**
 * Prüft ob ein Username bereits existiert
 */
export async function checkUsernameExists(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const queries = [Query.equal("username", username)];

  if (excludeUserId) {
    queries.push(Query.notEqual("$id", excludeUserId));
  }

  try {
    const result = await databases.listDocuments<UserDocument>(
      getDatabaseId(),
      getUsersCollectionId(),
      queries
    );

    return result.total > 0;
  } catch (error) {
    // Log error with context
    console.error(
      "Fehler beim Prüfen des Usernames:",
      {
        username,
        excludeUserId,
        error: error instanceof Error ? error.message : String(error),
      },
      error
    );

    // Return true (treat username as taken) to avoid crashes/duplicates
    // This ensures callers will retry with another candidate
    return true;
  }
}

/**
 * Erstellt einen eindeutigen Username
 * Falls der Username bereits existiert, wird ein Suffix hinzugefügt
 */
export async function generateUniqueUsername(
  baseUsername: string
): Promise<string> {
  let username = baseUsername;
  let counter = 1;
  const MAX_ATTEMPTS = 100;

  while (counter <= MAX_ATTEMPTS && (await checkUsernameExists(username))) {
    const suffix = `_${counter}`;
    const maxLength = 30 - suffix.length;
    username = baseUsername.slice(0, maxLength) + suffix;
    counter++;
  }

  if (counter > MAX_ATTEMPTS) {
    throw new Error(
      "Unable to generate unique username after maximum attempts"
    );
  }

  return username;
}

/**
 * Lädt einen User anhand der AppWrite User-ID
 */
export async function getUserByAppwriteId(
  appwriteUserId: string
): Promise<User | null> {
  try {
    const result = await databases.listDocuments<UserDocument>(
      getDatabaseId(),
      getUsersCollectionId(),
      [Query.equal("appwrite_user_id", appwriteUserId)]
    );

    if (result.documents.length === 0) {
      return null;
    }

    return documentToUser(result.documents[0]);
  } catch (error) {
    console.error("Fehler beim Laden des Users:", error);
    return null;
  }
}

/**
 * Lädt einen User anhand des Usernames
 */
export async function getUserByUsername(
  username: string
): Promise<User | null> {
  try {
    const result = await databases.listDocuments<UserDocument>(
      getDatabaseId(),
      getUsersCollectionId(),
      [Query.equal("username", username)]
    );

    if (result.documents.length === 0) {
      return null;
    }

    return documentToUser(result.documents[0]);
  } catch (error) {
    console.error("Fehler beim Laden des Users:", error);
    return null;
  }
}

/**
 * Erstellt einen neuen User
 * Behandelt Race Conditions durch Retry-Logik mit automatischer Username-Regenerierung
 */
export async function createUser(
  appwriteUserId: string,
  username: string,
  displayName?: string,
  maxRetries: number = 3
): Promise<User> {
  // Validiere Username
  if (!validateUsername(username)) {
    throw new Error("Ungültiger Username-Format");
  }

  // Prüfe ob AppWrite User-ID bereits existiert (nur einmal prüfen, nicht in Retry-Loop)
  const existingUser = await getUserByAppwriteId(appwriteUserId);
  if (existingUser) {
    throw new Error("User mit dieser AppWrite User-ID existiert bereits");
  }

  let currentUsername = username;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Prüfe ob Username bereits existiert (vor jedem Versuch)
      if (await checkUsernameExists(currentUsername)) {
        // Regeneriere Username für nächsten Versuch
        currentUsername = await generateUniqueUsername(currentUsername);
        continue;
      }

      const documentId = ID.unique();
      const permissions = [
        `read("user(\"${appwriteUserId}\")")`,
        `write("user(\"${appwriteUserId}\")")`,
      ];

      const doc = await databases.createDocument<UserDocument>(
        getDatabaseId(),
        getUsersCollectionId(),
        documentId,
        userToDocument({
          appwrite_user_id: appwriteUserId,
          username: currentUsername,
          display_name: displayName,
        }) as UserDocumentData,
        permissions
      );

      return documentToUser(doc);
    } catch (error: unknown) {
      // Prüfe ob es ein Conflict-Fehler ist (409)
      if (
        error instanceof AppwriteException &&
        error.code === 409 &&
        attempt < maxRetries - 1
      ) {
        // Regeneriere Username und retry
        currentUsername = await generateUniqueUsername(currentUsername);
        continue;
      }

      // Bei anderen Fehlern oder nach max Retries: Fehler weiterwerfen
      throw error;
    }
  }

  throw new Error("Fehler beim Erstellen des Users nach maximalen Versuchen");
}

/**
 * Aktualisiert den Username eines Users
 * Behandelt Race Conditions durch Retry-Logik mit automatischer Username-Regenerierung
 */
export async function updateUsername(
  userId: string,
  newUsername: string,
  maxRetries: number = 3
): Promise<User> {
  // Validiere Username
  if (!validateUsername(newUsername)) {
    throw new Error("Ungültiger Username-Format");
  }

  let currentUsername = newUsername;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Prüfe ob Username bereits existiert (ausgenommen aktuellen User)
      if (await checkUsernameExists(currentUsername, userId)) {
        // Regeneriere Username für nächsten Versuch
        currentUsername = await generateUniqueUsername(currentUsername);
        continue;
      }

      const doc = await databases.updateDocument<UserDocument>(
        getDatabaseId(),
        getUsersCollectionId(),
        userId,
        { username: currentUsername } as Partial<UserDocumentData>
      );

      return documentToUser(doc);
    } catch (error: unknown) {
      // Prüfe ob es ein Conflict-Fehler ist (409)
      if (
        error instanceof AppwriteException &&
        error.code === 409 &&
        attempt < maxRetries - 1
      ) {
        // Regeneriere Username und retry
        currentUsername = await generateUniqueUsername(currentUsername);
        continue;
      }

      // Bei anderen Fehlern oder nach max Retries: Fehler weiterwerfen
      throw error;
    }
  }

  throw new Error(
    "Fehler beim Aktualisieren des Usernames nach maximalen Versuchen"
  );
}

/**
 * Erstellt oder lädt einen User für einen AppWrite User
 * Falls der User nicht existiert, wird er mit automatischem Username erstellt
 */
export async function getOrCreateUser(
  appwriteUserId: string,
  email: string,
  displayName?: string
): Promise<User> {
  // Versuche zuerst den User zu laden
  const existingUser = await getUserByAppwriteId(appwriteUserId);
  if (existingUser) {
    return existingUser;
  }

  // Erstelle neuen User mit automatischem Username
  const baseUsername = generateUsernameFromEmail(email);
  const uniqueUsername = await generateUniqueUsername(baseUsername);

  return createUser(appwriteUserId, uniqueUsername, displayName);
}
