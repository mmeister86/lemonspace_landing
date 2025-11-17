-- ============================================
-- Add visibility column to boards table
-- ============================================
-- This migration adds a visibility field to support
-- public/private/shared board access control

BEGIN;

-- Add visibility column with default 'private'
ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'private';

-- Add check constraint for valid values (only if it doesn't exist)
DO $$
BEGIN
    ALTER TABLE public.boards
    ADD CONSTRAINT IF NOT EXISTS boards_visibility_check
    CHECK (visibility IN ('private', 'public', 'shared'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create index for public board queries (performance optimization)
CREATE INDEX IF NOT EXISTS boards_visibility_idx
ON public.boards(visibility)
WHERE visibility = 'public';

-- Create composite index for username + slug lookups
-- This enables fast resolution of public URLs: /[username]/[slug]
CREATE INDEX IF NOT EXISTS boards_user_slug_visibility_idx
ON public.boards(user_id, slug, visibility);

-- Update existing boards to 'private' (safe default)
UPDATE public.boards
SET visibility = 'private'
WHERE visibility IS NULL;

-- Add documentation
COMMENT ON COLUMN public.boards.visibility IS
'Board visibility: private (owner only), public (view-only via public link), shared (view-only with direct link)';

COMMIT;
