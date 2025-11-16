import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Board, BoardData, GridConfig, Block } from "@/lib/types/board";

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

/**
 * Generiert einen Slug aus einem Titel
 */
function generateSlug(title: string): string {
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
 * Validiert Slug-Format
 */
function validateSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 50) {
    return false;
  }

  // Only lowercase letters, numbers and hyphens
  return /^[a-z0-9-]+$/.test(slug);
}

/**
 * Prüft ob ein Slug für einen bestimmten User bereits existiert
 */
async function checkSlugExistsForUser(
  supabase: any,
  userId: string,
  slug: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("boards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("slug", slug);

    if (error) {
      throw error;
    }

    return (count ?? 0) > 0;
  } catch (error) {
    console.error("Error checking slug:", error);
    // Return true (treat slug as taken) to avoid crashes/duplicates
    return true;
  }
}

/**
 * Generiert einen eindeutigen Slug für einen User
 */
async function generateUniqueSlugForUser(
  supabase: any,
  userId: string,
  baseSlug: string
): Promise<string> {
  // Validate baseSlug
  const trimmedSlug = baseSlug?.trim() || "";
  if (!trimmedSlug || trimmedSlug.length < 3) {
    throw new Error("Base slug must be at least 3 characters");
  }

  // Validate slug format: lowercase letters and numbers separated by single hyphens
  // Validate slug format: lowercase letters, numbers, and hyphens
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slugPattern.test(trimmedSlug)) {
    throw new Error(
      "Base slug must contain only lowercase letters, numbers, and hyphens"
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
