-- Migration: Fix visibility enum inconsistency
-- Description: Updates the visibility enum to include 'shared' and maintain 'workspace' for backward compatibility

-- First, update existing 'workspace' values to 'shared' (if any exist)
UPDATE public.boards
SET visibility = 'shared'
WHERE visibility = 'workspace';

-- Drop the existing check constraint
ALTER TABLE public.boards DROP CONSTRAINT IF EXISTS boards_visibility_check;

-- Add the updated check constraint that includes both 'shared' and 'workspace' for backward compatibility
ALTER TABLE public.boards
ADD CONSTRAINT boards_visibility_check
CHECK (visibility::text = ANY (ARRAY['public'::character varying, 'private'::character varying, 'shared'::character varying, 'workspace'::character varying]::text[]));

-- Add comment to describe the change
COMMENT ON COLUMN public.boards.visibility IS 'Board visibility: public (anyone can view), private (only owner), shared (with collaborators), workspace (deprecated, use shared instead)';
