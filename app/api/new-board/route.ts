/**
 * The above function is a TypeScript server-side API endpoint that handles the creation of a new board
 * with validation, slug generation, and database insertion.
 * @param {NextRequest} request - The code snippet you provided is a Next.js API route that handles the
 * creation of a new board. Let me explain the key parts of the code:
 * @returns The code is returning a JSON response with the created board data if the board creation is
 * successful. If there are any errors during the process, appropriate error messages are returned
 * along with the corresponding HTTP status codes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// import type { SupabaseClient } from "@supabase/supabase-js"; // Not used but kept for reference
import { z } from "zod";
import type { BoardData, Block } from "@/lib/types/board";
import { generateSlug, validateSlug, checkSlugExistsForUser, generateUniqueSlugForUser, syncBoardElements } from "@/lib/services/board-service";

// Zod schema for request validation
const gridConfigSchema = z.object({
    columns: z.number().int().min(1).max(4),
    gap: z.number().int().min(0),
});

const blockSchema = z.object({
    id: z.string(),
    type: z.enum([
        "text", "heading", "image", "button", "spacer",
        "video", "form", "pricing", "testimonial", "accordion", "code"
    ]),
    data: z.record(z.string(), z.unknown()),
    position: z.object({
        x: z.number(),
        y: z.number(),
    }).optional(),
    size: z.object({
        width: z.number(),
        height: z.number(),
    }).optional(),
});

const createBoardRequestSchema = z.object({
    title: z
        .string()
        .min(3, "Title must be at least 3 characters")
        .max(100, "Title must be at most 100 characters"),
    slug: z
        .string()
        .min(3)
        .max(50)
        .regex(
            /^[a-z0-9-]+$/,
            "Slug can only contain lowercase letters, numbers and hyphens"
        )
        .optional(),
    visibility: z
        .enum(['private', 'public', 'shared'])
        .optional()
        .default('private'), // ← NEW: Visibility field
    grid_config: gridConfigSchema.optional(),
    blocks: z.array(blockSchema).optional(),
    template_id: z.string().uuid().optional(),
    is_template: z.boolean().optional(),
});

async function createSupabaseUserContext(request: NextRequest) {
    const supabase = await createClient();

    let {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (!user) {
        const authHeader = request.headers.get("authorization");
        const bearerToken = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : null;
        const token = bearerToken ?? request.headers.get("x-supabase-auth-token");

        if (token) {
            const {
                data: { user: tokenUser },
                error: tokenError,
            } = await supabase.auth.getUser(token);

            user = tokenUser ?? null;
            error = tokenError;
        }
    }

    return { supabase, user, error };
}

// Helper functions moved to board-service.ts

export async function POST(request: NextRequest) {
    try {
        // 1. Check authentication
        const {
            supabase,
            user,
            error: authError,
        } = await createSupabaseUserContext(request);

        if (authError || !user) {
            console.error("Auth error:", authError);
            return NextResponse.json(
                {
                    error: "Not authenticated",
                    details: authError?.message || "No valid session found"
                },
                { status: 401 }
            );
        }

        // 2. Validate request body
        const body = await request.json();
        const validationResult = createBoardRequestSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid input data",
                    details: validationResult.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        const validatedData = validationResult.data;

        // 3. Generate/validate slug
        let finalSlug = validatedData.slug;
        if (!finalSlug && validatedData.title) {
            const baseSlug = generateSlug(validatedData.title);
            finalSlug = await generateUniqueSlugForUser(supabase, user.id, baseSlug);
        } else if (finalSlug) {
            // Validate slug format
            if (!validateSlug(finalSlug)) {
                return NextResponse.json(
                    { error: "Invalid slug format" },
                    { status: 400 }
                );
            }

            // Check uniqueness
            if (await checkSlugExistsForUser(supabase, user.id, finalSlug)) {
                finalSlug = await generateUniqueSlugForUser(supabase, user.id, finalSlug);
            }
        }

        // Ensure slug is defined (should always be true since title is required)
        if (!finalSlug) {
            return NextResponse.json(
                { error: "Failed to generate slug" },
                { status: 500 }
            );
        }

        // 4. Create board
        const boardData: BoardData = {
            user_id: user.id,
            title: validatedData.title,
            slug: finalSlug,
            visibility: validatedData.visibility, // ← NEW: Include visibility
            grid_config: validatedData.grid_config || { columns: 4, gap: 16 },
            blocks: validatedData.blocks || [],
            template_id: validatedData.template_id,
            is_template: validatedData.is_template,
        };

        const { data: board, error: insertError } = await supabase
            .from("boards")
            .insert(boardData)
            .select()
            .single();

        if (insertError) {
            console.error("Error creating board:", insertError);
            return NextResponse.json(
                { error: "Failed to create board" },
                { status: 500 }
            );
        }

        // 5. Sync blocks to board_elements
        if (validatedData.blocks && validatedData.blocks.length > 0) {
            // Cast to Block[] because validatedData.blocks is inferred from Zod
            const blocksToSync = validatedData.blocks as Block[];
            await syncBoardElements(supabase, board.id, blocksToSync);
        }

        // 5. Return response
        return NextResponse.json(board, { status: 201 });

    } catch (error) {
        console.error("Unexpected error in /api/new-board:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
