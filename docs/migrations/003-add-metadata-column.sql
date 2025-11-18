-- Migration: Add metadata column to boards table
-- Description: Adds a JSONB metadata column to store additional board metadata

-- Add metadata column to boards table
ALTER TABLE public.boards
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Add comment to describe the column
COMMENT ON COLUMN public.boards.metadata IS 'Additional metadata for the board stored as JSONB';
