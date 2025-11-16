-- Migration: Add board extensions for Builder API
-- Description: Extends the boards table and adds new tables for board elements, connections, and collaborators
-- Version: 001

-- Extend the existing boards table with new columns
ALTER TABLE boards
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'workspace')),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create board_elements table for storing individual elements on a board
CREATE TABLE IF NOT EXISTS board_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'text', 'shape', 'image', 'button', etc.
    position_x DECIMAL(10, 2) NOT NULL DEFAULT 0,
    position_y DECIMAL(10, 2) NOT NULL DEFAULT 0,
    width DECIMAL(10, 2) NOT NULL DEFAULT 100,
    height DECIMAL(10, 2) NOT NULL DEFAULT 100,
    z_index INTEGER NOT NULL DEFAULT 1,
    content JSONB, -- Flexible content storage based on element type
    styles JSONB, -- CSS styles and other visual properties
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create element_connections table for storing connections between elements
CREATE TABLE IF NOT EXISTS element_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    source_element_id UUID NOT NULL REFERENCES board_elements(id) ON DELETE CASCADE,
    target_element_id UUID NOT NULL REFERENCES board_elements(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) NOT NULL DEFAULT 'arrow', -- 'arrow', 'line', 'curve', etc.
    source_anchor VARCHAR(20) DEFAULT 'auto', -- 'top', 'right', 'bottom', 'left', 'auto', 'center'
    target_anchor VARCHAR(20) DEFAULT 'auto',
    style JSONB, -- Line style, color, thickness, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_element_id, target_element_id) -- Prevent duplicate connections
);

-- Create board_collaborators table for managing board permissions
CREATE TABLE IF NOT EXISTS board_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(board_id, user_id) -- Prevent duplicate collaborator entries
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_board_elements_board_id ON board_elements(board_id);
CREATE INDEX IF NOT EXISTS idx_board_elements_type ON board_elements(type);
CREATE INDEX IF NOT EXISTS idx_board_elements_position ON board_elements(board_id, position_x, position_y);
CREATE INDEX IF NOT EXISTS idx_element_connections_board_id ON element_connections(board_id);
CREATE INDEX IF NOT EXISTS idx_element_connections_source ON element_connections(source_element_id);
CREATE INDEX IF NOT EXISTS idx_element_connections_target ON element_connections(target_element_id);
CREATE INDEX IF NOT EXISTS idx_board_collaborators_board_id ON board_collaborators(board_id);
CREATE INDEX IF NOT EXISTS idx_board_collaborators_user_id ON board_collaborators(user_id);

-- Create updated_at trigger function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_board_elements_updated_at
    BEFORE UPDATE ON board_elements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_element_connections_updated_at
    BEFORE UPDATE ON element_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_collaborators_updated_at
    BEFORE UPDATE ON board_collaborators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on all new tables
ALTER TABLE board_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS policies for board_elements
-- Users can read elements from boards they have access to
CREATE POLICY "Users can view board elements they have access to" ON board_elements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_elements.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.visibility = 'public'
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                )
            )
        )
    );

-- Users can insert elements for boards they own or can edit
CREATE POLICY "Users can insert board elements they can edit" ON board_elements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_elements.board_id
            AND (
                boards.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

-- Users can update elements for boards they own or can edit
CREATE POLICY "Users can update board elements they can edit" ON board_elements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_elements.board_id
            AND (
                boards.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

-- Users can delete elements for boards they own or can edit
CREATE POLICY "Users can delete board elements they can edit" ON board_elements
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_elements.board_id
            AND (
                boards.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

-- RLS policies for element_connections
-- Users can read connections from boards they have access to
CREATE POLICY "Users can view element connections they have access to" ON element_connections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = element_connections.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.visibility = 'public'
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                )
            )
        )
    );

-- Users can insert connections for boards they own or can edit
CREATE POLICY "Users can insert element connections they can edit" ON element_connections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = element_connections.board_id
            AND (
                boards.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

-- Users can update connections for boards they own or can edit
CREATE POLICY "Users can update element connections they can edit" ON element_connections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = element_connections.board_id
            AND (
                boards.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

-- Users can delete connections for boards they own or can edit
CREATE POLICY "Users can delete element connections they can edit" ON element_connections
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = element_connections.board_id
            AND (
                boards.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM board_collaborators
                    WHERE board_collaborators.board_id = boards.id
                    AND board_collaborators.user_id = auth.uid()
                    AND board_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );

-- RLS policies for board_collaborators
-- Users can view collaborators for boards they have access to
CREATE POLICY "Users can view board collaborators they have access to" ON board_collaborators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_collaborators.board_id
            AND (
                boards.owner_id = auth.uid()
                OR boards.visibility = 'public'
                OR board_collaborators.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM board_collaborators AS bc
                    WHERE bc.board_id = boards.id
                    AND bc.user_id = auth.uid()
                )
            )
        )
    );

-- Users can insert collaborators for boards they own
CREATE POLICY "Users can insert board collaborators they own" ON board_collaborators
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_collaborators.board_id
            AND boards.owner_id = auth.uid()
        )
    );

-- Users can update collaborators for boards they own
CREATE POLICY "Users can update board collaborators they own" ON board_collaborators
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_collaborators.board_id
            AND boards.owner_id = auth.uid()
        )
    );

-- Users can delete collaborators for boards they own
CREATE POLICY "Users can delete board collaborators they own" ON board_collaborators
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = board_collaborators.board_id
            AND boards.owner_id = auth.uid()
        )
    );

-- Users can delete their own collaborator entry
CREATE POLICY "Users can delete their own collaborator entry" ON board_collaborators
    FOR DELETE USING (
        board_collaborators.user_id = auth.uid()
    );

-- Update existing boards to set owner_id from user_id (assuming current boards have user_id)
-- This is a one-time migration step - adjust based on your current schema
DO $$
BEGIN
    -- Check if user_id column exists and owner_id doesn't have data yet
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boards'
        AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM boards
        WHERE owner_id IS NOT NULL
        LIMIT 1
    ) THEN
        -- Update owner_id from user_id for existing records
        UPDATE boards
        SET owner_id = user_id
        WHERE owner_id IS NULL AND user_id IS NOT NULL;

        RAISE NOTICE 'Updated owner_id from user_id for existing boards';
    END IF;
END $$;

-- Set default visibility for existing boards
UPDATE boards
SET visibility = 'private'
WHERE visibility IS NULL;

-- Set default description for existing boards
UPDATE boards
SET description = ''
WHERE description IS NULL;
