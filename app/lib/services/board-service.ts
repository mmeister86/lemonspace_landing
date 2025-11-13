import {
  databases,
  getDatabaseId,
  getBoardsCollectionId,
  ID,
} from "@/lib/appwrite";
import type {
  Board,
  BoardDocument,
  BoardDocumentData,
} from "@/lib/types/board";
import { Query } from "appwrite";
import { getUserByUsername } from "./user-service";
import { handleAuthError } from "../auth-utils";
import { z } from "zod";

/**
 * HINWEIS zu handleAuthError:
 * handleAuthError gibt nur in Production true zurück (nach Redirect zur Landingpage).
 * In Development gibt sie false zurück, damit manuelle Tests möglich sind.
 * Wenn handleAuthError true zurückgibt, wird ein Redirect durchgeführt und der
 * nachfolgende Code wird nicht erreicht (nur in Production).
 * Caller sollten dieses Verhalten berücksichtigen.
 */

/**
 * Zod-Schemas für Board-Felder
 */
const gridConfigSchema = z.object({
  columns: z.number().int().min(1).max(4),
  gap: z.number().int().min(0),
});

const blockSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text",
    "heading",
    "image",
    "button",
    "spacer",
    "video",
    "form",
    "pricing",
    "testimonial",
    "accordion",
    "code",
  ]),
  data: z.record(z.string(), z.unknown()),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  size: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .optional(),
});

const blocksArraySchema = z.array(blockSchema);

/**
 * Type Guard für Runtime-Validierung
 */
type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Konvertiert Board zu BoardDocumentData (für AppWrite)
 * Gibt nur die Datenfelder zurück (ohne Document-Metadaten wie $id, $createdAt, etc.)
 *
 * Hinweis: grid_config und blocks werden als JSON-Strings serialisiert,
 * da selbstgehostete AppWrite-Installationen keinen JSON-Attribut-Typ unterstützen
 */
function boardToDocument(board: Partial<Board>): Partial<BoardDocumentData> {
  return {
    user_id: board.user_id,
    title: board.title,
    slug: board.slug,
    grid_config: JSON.stringify(board.grid_config || { columns: 4, gap: 16 }),
    blocks: JSON.stringify(board.blocks || []),
    template_id: board.template_id,
    is_template: board.is_template,
    password_hash: board.password_hash,
    expires_at: board.expires_at,
    published_at: board.published_at,
  };
}

/**
 * Hilfsfunktion zum Erstellen sicherer Metadaten für Logging
 */
function createSafeMetadata(value: string): {
  length: number;
  isString: boolean;
  preview?: string;
} {
  const metadata: {
    length: number;
    isString: boolean;
    preview?: string;
  } = {
    length: value.length,
    isString: typeof value === "string",
  };

  // Nur eine abgeschnittene Vorschau (max 50 Zeichen) für Debugging
  if (value.length > 0) {
    metadata.preview = value.slice(0, 50) + (value.length > 50 ? "..." : "");
  }

  return metadata;
}

/**
 * Parst und validiert ein Board-Feld mit Runtime-Validierung
 *
 * @param value - Der JSON-String-Wert aus der Datenbank
 * @param validator - Zod-Schema oder Type-Guard-Funktion für Validierung
 * @param fallback - Fallback-Wert bei Parse- oder Validierungsfehler
 * @param boardId - Board-ID für Logging
 * @param field - Feldname für Logging
 * @returns Den geparsten und validierten Wert oder den Fallback
 */
function parseBoardField<T>(
  value: string,
  validator: z.ZodSchema<T> | TypeGuard<T>,
  fallback: T,
  boardId: string,
  field: string
): T {
  let parsed: unknown;

  // Schritt 1: JSON parsen
  try {
    parsed = JSON.parse(value);
  } catch (parseError) {
    const safeMetadata = createSafeMetadata(value);
    console.error(
      `[board-service] Failed to parse JSON for ${field} on board ${boardId}`,
      {
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
        metadata: safeMetadata,
      }
    );
    return fallback;
  }

  // Schritt 2: Runtime-Validierung
  try {
    if (typeof validator === "function") {
      // Type Guard Funktion
      if (validator(parsed)) {
        return parsed;
      } else {
        throw new Error("Type guard validation failed");
      }
    } else {
      // Zod Schema
      const validated = validator.parse(parsed);
      return validated;
    }
  } catch (validationError) {
    const safeMetadata = createSafeMetadata(value);
    const errorDetails =
      validationError instanceof z.ZodError
        ? {
            issues: validationError.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
              code: issue.code,
            })),
          }
        : {
            message:
              validationError instanceof Error
                ? validationError.message
                : String(validationError),
          };

    console.error(
      `[board-service] Validation failed for ${field} on board ${boardId}`,
      {
        ...errorDetails,
        metadata: safeMetadata,
      }
    );
    return fallback;
  }
}

function documentToBoard(doc: BoardDocument): Board {
  const boardId = doc.$id || "<unknown>";
  const gridConfig = parseBoardField(
    doc.grid_config,
    gridConfigSchema,
    { columns: 4, gap: 16 },
    boardId,
    "grid_config"
  );
  const blocks = parseBoardField(
    doc.blocks,
    blocksArraySchema,
    [],
    boardId,
    "blocks"
  );

  return {
    id: doc.$id,
    user_id: doc.user_id,
    title: doc.title,
    slug: doc.slug,
    grid_config: gridConfig,
    blocks: blocks,
    template_id: doc.template_id,
    is_template: doc.is_template,
    password_hash: doc.password_hash,
    expires_at: doc.expires_at,
    created_at: doc.$createdAt,
    updated_at: doc.$updatedAt,
    published_at: doc.published_at,
  };
}

/**
 * Validiert Slug-Format
 * - Nur Kleinbuchstaben (a-z)
 * - Zahlen (0-9)
 * - Bindestriche (-)
 * - Min 3, Max 50 Zeichen
 */
export function validateSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 50) {
    return false;
  }

  // Nur Kleinbuchstaben, Zahlen und Bindestriche
  return /^[a-z0-9-]+$/.test(slug);
}

/**
 * Generiert einen Slug aus einem Titel
 */
export function generateSlug(title: string): string {
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  if (validateSlug(normalized)) {
    return normalized;
  }

  let fallback = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 50);

  if (fallback.length < 3) {
    const token = Date.now().toString(36);
    fallback = fallback.length > 0 ? `${fallback}-${token}` : token;
  }

  fallback = fallback.slice(0, 50);

  if (!validateSlug(fallback)) {
    const token = Date.now().toString(36);
    fallback = `board-${token}`.slice(0, 50);
  }

  return fallback;
}

/**
 * Prüft ob ein Slug für einen bestimmten User bereits existiert
 */
export async function checkSlugExistsForUser(
  userId: string,
  slug: string,
  excludeBoardId?: string
): Promise<boolean> {
  const queries = [Query.equal("user_id", userId), Query.equal("slug", slug)];

  if (excludeBoardId) {
    queries.push(Query.notEqual("$id", excludeBoardId));
  }

  const result = await databases.listDocuments<BoardDocument>(
    getDatabaseId(),
    getBoardsCollectionId(),
    queries
  );

  return result.total > 0;
}

/**
 * Generiert einen eindeutigen Slug für einen User
 * Falls der Slug bereits existiert, wird ein Suffix hinzugefügt
 */
export async function generateUniqueSlugForUser(
  userId: string,
  baseSlug: string
): Promise<string> {
  // Validate baseSlug
  const trimmedSlug = baseSlug?.trim() || "";
  if (!trimmedSlug || trimmedSlug.length < 3) {
    throw new Error("Base slug must be at least 3 characters");
  }

  // Validate slug format: lowercase letters and numbers separated by single hyphens
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(trimmedSlug)) {
    throw new Error(
      "Base slug must be a lowercase alphanumeric slug and may contain single hyphens"
    );
  }

  let slug = trimmedSlug;
  let counter = 1;
  const MAX_ATTEMPTS = 100;

  while (
    (await checkSlugExistsForUser(userId, slug)) &&
    counter <= MAX_ATTEMPTS
  ) {
    const suffix = `-${counter}`;
    const maxLength = 50 - suffix.length;
    slug = trimmedSlug.slice(0, maxLength) + suffix;
    counter++;
  }

  if (counter > MAX_ATTEMPTS) {
    throw new Error("Unable to generate unique slug after maximum attempts");
  }

  return slug;
}

/**
 * Erstellt ein neues Board
 * Generiert automatisch einen eindeutigen Slug, falls nicht angegeben
 */
export async function createBoard(
  userId: string,
  boardData: Partial<Board>
): Promise<Board> {
  try {
    // Generiere Slug falls nicht vorhanden
    let slug = boardData.slug;
    if (!slug && boardData.title) {
      const baseSlug = generateSlug(boardData.title);
      slug = await generateUniqueSlugForUser(userId, baseSlug);
    } else if (slug) {
      // Validiere Slug-Format
      if (!validateSlug(slug)) {
        throw new Error("Ungültiger Slug-Format");
      }

      // Prüfe Eindeutigkeit
      if (await checkSlugExistsForUser(userId, slug)) {
        slug = await generateUniqueSlugForUser(userId, slug);
      }
    } else {
      throw new Error("Slug oder Titel muss angegeben werden");
    }

    const documentId = boardData.id || ID.unique();
    const permissions = [`read("user:${userId}")`, `write("user:${userId}")`];

    const doc = await databases.createDocument<BoardDocument>(
      getDatabaseId(),
      getBoardsCollectionId(),
      documentId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      boardToDocument({ ...boardData, user_id: userId, slug }) as any,
      permissions
    );

    return documentToBoard(doc);
  } catch (error) {
    // handleAuthError gibt true zurück, wenn ein Auth-Fehler erkannt wurde
    // und ein Redirect zur Landingpage durchgeführt wurde (nur in Production).
    // In diesem Fall wird der throw nicht erreicht, da die Seite bereits
    // weitergeleitet wurde. In Development wird false zurückgegeben.
    if (handleAuthError(error, "BoardService.createBoard")) {
      throw error;
    }
    throw error;
  }
}

/**
 * Lädt ein Board anhand der ID
 */
export async function getBoard(boardId: string): Promise<Board> {
  try {
    const doc = await databases.getDocument<BoardDocument>(
      getDatabaseId(),
      getBoardsCollectionId(),
      boardId
    );

    return documentToBoard(doc);
  } catch (error) {
    // handleAuthError gibt true zurück, wenn ein Auth-Fehler erkannt wurde
    // und ein Redirect zur Landingpage durchgeführt wurde (nur in Production).
    // In diesem Fall wird der throw nicht erreicht, da die Seite bereits
    // weitergeleitet wurde. In Development wird false zurückgegeben.
    if (handleAuthError(error, "BoardService.getBoard")) {
      throw error;
    }
    console.error(
      `[board-service] Failed to get board ${boardId} from collection ${getBoardsCollectionId()}`,
      error
    );
    throw error;
  }
}

/**
 * Aktualisiert ein Board
 */
export async function updateBoard(
  boardId: string,
  boardData: Partial<Board>
): Promise<Board> {
  const doc = await databases.updateDocument<BoardDocument>(
    getDatabaseId(),
    getBoardsCollectionId(),
    boardId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boardToDocument(boardData) as any
  );

  return documentToBoard(doc);
}

/**
 * Löscht ein Board
 */
export async function deleteBoard(boardId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      getDatabaseId(),
      getBoardsCollectionId(),
      boardId
    );
  } catch (error) {
    // handleAuthError gibt true zurück, wenn ein Auth-Fehler erkannt wurde
    // und ein Redirect zur Landingpage durchgeführt wurde (nur in Production).
    // In diesem Fall wird der throw nicht erreicht, da die Seite bereits
    // weitergeleitet wurde. In Development wird false zurückgegeben.
    if (handleAuthError(error, "BoardService.deleteBoard")) {
      throw error;
    }
    console.error(
      `[board-service] Failed to delete board ${boardId} from collection ${getBoardsCollectionId()}`,
      error
    );
    throw error;
  }
}

/**
 * Lädt alle Boards eines Users
 */
export async function listBoards(userId: string): Promise<Board[]> {
  try {
    const response = await databases.listDocuments<BoardDocument>(
      getDatabaseId(),
      getBoardsCollectionId(),
      [Query.equal("user_id", userId)]
    );

    return response.documents.map(documentToBoard);
  } catch (error) {
    // handleAuthError gibt true zurück, wenn ein Auth-Fehler erkannt wurde
    // und ein Redirect zur Landingpage durchgeführt wurde (nur in Production).
    // In diesem Fall wird der throw nicht erreicht, da die Seite bereits
    // weitergeleitet wurde. In Development wird false zurückgegeben.
    if (handleAuthError(error, "BoardService.listBoards")) {
      throw error;
    }
    throw error;
  }
}

/**
 * Lädt ein Board anhand von Username und Slug
 */
export async function getBoardByUsernameAndSlug(
  username: string,
  slug: string
): Promise<Board | null> {
  try {
    // Lade zuerst den User per Username
    const user = await getUserByUsername(username);
    if (!user) {
      return null;
    }

    // Lade dann das Board per user_id und slug
    const result = await databases.listDocuments<BoardDocument>(
      getDatabaseId(),
      getBoardsCollectionId(),
      [Query.equal("user_id", user.appwrite_user_id), Query.equal("slug", slug)]
    );

    if (result.documents.length === 0) {
      return null;
    }

    return documentToBoard(result.documents[0]);
  } catch (error) {
    if (handleAuthError(error, "BoardService.getBoardByUsernameAndSlug")) {
      return null; // Redirect erfolgt, aber wir geben null zurück
    }
    console.error("Fehler beim Laden des Boards:", error);
    return null;
  }
}
