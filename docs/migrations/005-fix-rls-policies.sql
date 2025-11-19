-- Migration: Fix RLS policies to support user_id
-- Description: Updates RLS policies for board_elements and element_connections to check user_id as well as owner_id
-- Version: 005

-- Drop existing policies for board_elements
DROP POLICY IF EXISTS "Users can view board elements they have access to" ON board_elements;
DROP POLICY IF EXISTS "Users can insert board elements they can edit" ON board_elements;
DROP POLICY IF EXISTS "Users can update board elements they can edit" ON board_elements;
DROP POLICY IF EXISTS "Users can delete board elements they can edit" ON board_elements;

-- Recreate policies for board_elements with user_id check
CREATE POLICY "Users can view board elements they have access to" ON board_elements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_elements.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.user_id = auth.uid() -- Added user_id check
                OR boards.visibility = 'public'
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can insert board elements they can edit" ON board_elements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_elements.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.user_id = auth.uid() -- Added user_id check
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

CREATE POLICY "Users can update board elements they can edit" ON board_elements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_elements.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.user_id = auth.uid() -- Added user_id check
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

CREATE POLICY "Users can delete board elements they can edit" ON board_elements
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_elements.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.user_id = auth.uid() -- Added user_id check
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

-- Drop existing policies for element_connections
DROP POLICY IF EXISTS "Users can view element connections they have access to" ON element_connections;
DROP POLICY IF EXISTS "Users can insert element connections they can edit" ON element_connections;
DROP POLICY IF EXISTS "Users can update element connections they can edit" ON element_connections;
DROP POLICY IF EXISTS "Users can delete element connections they can edit" ON element_connections;

-- Recreate policies for element_connections with user_id check
CREATE POLICY "Users can view element connections they have access to" ON element_connections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = element_connections.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.user_id = auth.uid() -- Added user_id check
                OR boards.visibility = 'public'
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can insert element connections they can edit" ON element_connections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = element_connections.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.user_id = auth.uid() -- Added user_id check
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

CREATE POLICY "Users can update element connections they can edit" ON element_connections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = element_connections.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.user_id = auth.uid() -- Added user_id check
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

CREATE POLICY "Users can delete element connections they can edit" ON element_connections
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = element_connections.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.user_id = auth.uid() -- Added user_id check
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );
