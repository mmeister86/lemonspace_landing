import type { Board, BoardData, GridConfig, Block } from "@/lib/types/board";
import { getUserByUsername } from "./user-service";
import type { SupabaseClient } from "@supabase/supabase-js";
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
 * Validiert Grid Config mit Fallback
 */
function validateGridConfig(value: unknown): GridConfig {
    try {
        return gridConfigSchema.parse(value);
    } catch (error) {
        console.error("[board-service] Invalid grid_config, using fallback", {
            error: error instanceof z.ZodError ? error.issues : error,
            value,
        });
        return { columns: 4, gap: 16 };
    }
}

/**
 * Validiert Blocks mit Fallback
 */
function validateBlocks(value: unknown): Block[] {
    try {
        return blocksArraySchema.parse(value);
    } catch (error) {
        console.error("[board-service] Invalid blocks, using fallback", {
            error: error instanceof z.ZodError ? error.issues : error,
            value,
        });
        return [];
    }
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
    supabase: SupabaseClient,
    userId: string,
    slug: string,
    excludeBoardId?: string
): Promise<boolean> {
    try {
        let query = supabase
            .from("boards")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("slug", slug);

        if (excludeBoardId) {
            query = query.neq("id", excludeBoardId);
        }

        const { count, error } = await query;

        if (error) {
            throw error;
        }

        return (count ?? 0) > 0;
    } catch (error) {
        console.error("Fehler beim Prüfen des Slugs:", error);
        // Return true (treat slug as taken) to avoid crashes/duplicates
        return true;
    }
}

/**
 * Generiert einen eindeutigen Slug für einen User
 * Falls der Slug bereits existiert, wird ein Suffix hinzugefügt
 */
export async function generateUniqueSlugForUser(
    supabase: SupabaseClient,
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
        (await checkSlugExistsForUser(supabase, userId, slug)) &&
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
    supabase: SupabaseClient,
    userId: string,
    boardData: Partial<Board>
): Promise<Board> {
    try {
        // Generiere Slug falls nicht vorhanden
        let slug = boardData.slug;
        if (!slug && boardData.title) {
            const baseSlug = generateSlug(boardData.title);
            slug = await generateUniqueSlugForUser(supabase, userId, baseSlug);
        } else if (slug) {
            // Validiere Slug-Format
            if (!validateSlug(slug)) {
                throw new Error("Ungültiger Slug-Format");
            }

            // Prüfe Eindeutigkeit
            if (await checkSlugExistsForUser(supabase, userId, slug)) {
                slug = await generateUniqueSlugForUser(supabase, userId, slug);
            }
        } else {
            throw new Error("Slug oder Titel muss angegeben werden");
        }

        const insertData: BoardData = {
            user_id: userId,
            title: boardData.title || "Untitled",
            slug: slug,
            grid_config: validateGridConfig(boardData.grid_config),
            blocks: validateBlocks(boardData.blocks),
            template_id: boardData.template_id,
            is_template: boardData.is_template,
            password_hash: boardData.password_hash,
            expires_at: boardData.expires_at,
            published_at: boardData.published_at,
        };

        const { data, error } = await supabase
            .from("boards")
            .insert(insertData)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error("Fehler beim Erstellen des Boards:", error);
        throw error;
    }
}

/**
 * Lädt ein Board anhand der ID
 */
export async function getBoard(supabase: SupabaseClient, boardId: string): Promise<Board> {
    try {
        const { data, error } = await supabase
            .from("boards")
            .select("*")
            .eq("id", boardId)
            .single();

        if (error) {
            throw error;
        }

        // Validiere JSONB-Felder
        return {
            ...data,
            grid_config: validateGridConfig(data.grid_config),
            blocks: validateBlocks(data.blocks),
        };
    } catch (error) {
        console.error(`[board-service] Failed to get board ${boardId}`, error);
        throw error;
    }
}

/**
 * Aktualisiert ein Board
 */
export async function updateBoard(
    supabase: SupabaseClient,
    boardId: string,
    boardData: Partial<Board>
): Promise<Board> {
    const updateData: Partial<BoardData> = {
        title: boardData.title,
        slug: boardData.slug,
        grid_config: boardData.grid_config
            ? validateGridConfig(boardData.grid_config)
            : undefined,
        blocks: boardData.blocks ? validateBlocks(boardData.blocks) : undefined,
        template_id: boardData.template_id,
        is_template: boardData.is_template,
        password_hash: boardData.password_hash,
        expires_at: boardData.expires_at,
        published_at: boardData.published_at,
    };

    // Entferne undefined Werte
    Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof BoardData] === undefined) {
            delete updateData[key as keyof BoardData];
        }
    });

    const { data, error } = await supabase
        .from("boards")
        .update(updateData)
        .eq("id", boardId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return {
        ...data,
        grid_config: validateGridConfig(data.grid_config),
        blocks: validateBlocks(data.blocks),
    };
}

/**
 * Löscht ein Board
 */
export async function deleteBoard(supabase: SupabaseClient, boardId: string): Promise<void> {
    try {
        const { error } = await supabase.from("boards").delete().eq("id", boardId);

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error(`[board-service] Failed to delete board ${boardId}`, error);
        throw error;
    }
}

/**
 * Lädt alle Boards eines Users
 */
export async function listBoards(supabase: SupabaseClient, userId: string): Promise<Board[]> {
    try {
        const { data, error } = await supabase
            .from("boards")
            .select("*")
            .eq("user_id", userId);

        if (error) {
            throw error;
        }

        return data.map((board: Board) => ({
            ...board,
            grid_config: validateGridConfig(board.grid_config),
            blocks: validateBlocks(board.blocks),
        }));
    } catch (error) {
        console.error("Fehler beim Laden der Boards:", error);
        throw error;
    }
}

/**
 * Lädt ein Board anhand von User ID und Slug
 */
export async function getBoardByUserIdAndSlug(
    supabase: SupabaseClient,
    userId: string,
    slug: string
): Promise<Board | null> {
    try {
        const { data, error } = await supabase
            .from("boards")
            .select("*")
            .eq("user_id", userId)
            .eq("slug", slug)
            .single();

        if (error) {
            // 'PGRST116' = No rows found
            if (error.code === "PGRST116") {
                return null;
            }
            throw error;
        }

        return {
            ...data,
            grid_config: validateGridConfig(data.grid_config),
            blocks: validateBlocks(data.blocks),
        };
    } catch (error) {
        console.error("Fehler beim Laden des Boards:", error);
        return null;
    }
}

/**
 * Lädt ein Board anhand von Username und Slug
 */
export async function getBoardByUsernameAndSlug(
    supabase: SupabaseClient,
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
        return getBoardByUserIdAndSlug(supabase, user.auth_user_id, slug);
    } catch (error) {
        console.error("Fehler beim Laden des Boards:", error);
        return null;
    }
}

/**
 * Synchronisiert Blocks mit der board_elements Tabelle
 */
export async function syncBoardElements(
    supabase: SupabaseClient,
    boardId: string,
    blocks: Block[]
) {
    if (!blocks) return;

    // 1. Get existing elements to identify deletions
    const { data: existingElements } = await supabase
        .from("board_elements")
        .select("id")
        .eq("board_id", boardId);

    const existingIds = new Set(existingElements?.map((e) => e.id) || []);
    const incomingIds = new Set(blocks.map((b) => b.id));

    // 2. Identify elements to delete
    const idsToDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id));

    if (idsToDelete.length > 0) {
        await supabase.from("board_elements").delete().in("id", idsToDelete);
    }

    // 3. Upsert elements
    const elementsToUpsert = blocks.map((block) => ({
        id: block.id,
        board_id: boardId,
        type: block.type,
        content: block.data || {},
        position_x: block.position?.x || 0,
        position_y: block.position?.y || 0,
        width: block.size?.width || 100,
        height: block.size?.height || 100,
        z_index: 0,
        styles: {},
        updated_at: new Date().toISOString(),
    }));

    if (elementsToUpsert.length > 0) {
        const { error } = await supabase
            .from("board_elements")
            .upsert(elementsToUpsert);

        if (error) {
            console.error("[board-service] Error syncing board elements:", error);
            throw error;
        }
    }
}
