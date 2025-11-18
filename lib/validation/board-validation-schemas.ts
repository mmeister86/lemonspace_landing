import { z } from "zod";

/**
 * Zod schema for grid configuration (reusing from existing patterns)
 */
export const gridConfigSchema = z.object({
  columns: z.number().int().min(1).max(4),
  gap: z.number().int().min(0),
});

/**
 * Zod schema for block structure (reusing from existing patterns)
 */
export const blockSchema = z.object({
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

/**
 * Zod schema for validating board update payloads
 * Extends existing schemas from board-service.ts and new-board/route.ts
 * Supports partial updates with all fields optional
 */
export const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['private', 'public', 'shared', 'workspace']).optional(),
  grid_config: gridConfigSchema.optional(),
  blocks: z.array(blockSchema).optional(),
  thumbnail_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Type for validated board update data
 */
export type UpdateBoardData = z.infer<typeof updateBoardSchema>;
