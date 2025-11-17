-- Migration: Fix infinite recursion in board_collaborators RLS policy
-- Description: Corrects the RLS policy for board_collaborators to prevent infinite recursion.
-- Version: 002

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view board collaborators they have access to" ON board_collaborators;

-- Create the corrected policy without circular references
CREATE POLICY "Users can view board collaborators they have access to" ON board_collaborators
    FOR SELECT USING (
        -- User is viewing their own collaborator entry
        board_collaborators.user_id = auth.uid()
        OR
        -- User owns the board
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_collaborators.board_id
            AND boards.owner_id = auth.uid()
        )
        OR
        -- Board is public
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_collaborators.board_id
            AND boards.visibility = 'public'
        )
    );
