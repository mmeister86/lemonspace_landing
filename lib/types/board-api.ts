/**
 * Board API Types für Builder-Integration
 */

// ===========================================
// Database Types (Raw from Supabase)
// ===========================================

export interface DBBoardElement {
    id: string;
    board_id: string;
    type: string;
    content: Record<string, unknown>;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    z_index: number;
    styles: Record<string, unknown>;
    parent_id?: string | null;
    container_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface DBElementConnection {
    id: string;
    board_id: string;
    source_element_id: string;
    target_element_id: string;
    connection_type: string;
    created_at: string;
}

export interface DBBoardCollaborator {
    id: string;
    board_id: string;
    user_id: string;
    // Note: 'owner' is not a valid collaborator role - ownership is determined
    // by checking board.owner_id, not from the collaborators table
    role: 'viewer' | 'editor' | 'admin';
    created_at: string;
}

export interface DBBoardWithMeta {
    id: string;
    // CANONICAL OWNER FIELD: user_id is the primary owner identifier
    user_id: string;
    // DEPRECATED: owner_id exists only for backwards compatibility with older schema
    // When both fields are present, they MUST be equal (validate/fix at ingest)
    // Mapping rule: BoardMeta.ownerId = user_id (preferred) || owner_id (fallback)
    owner_id?: string;
    title: string;
    description?: string | null; // Optional for backward compatibility
    slug: string;
    visibility: 'private' | 'public' | 'shared' | 'workspace'; // Required field
    thumbnail_url?: string | null; // Optional for backward compatibility
    grid_config: {
        columns: number;
        gap: number;
    };
    blocks: unknown[]; // Legacy JSONB blocks (backward compatibility)
    metadata?: Record<string, unknown>; // Additional metadata for the board
    template_id?: string | null;
    is_template?: boolean;
    password_hash?: string | null;
    expires_at?: string | null;
    published_at?: string | null;
    created_at: string;
    updated_at: string;
}

// ===========================================
// Builder-Compatible Types (Transformed)
// ===========================================

export interface BoardElement {
    id: string;
    type: string;
    content: Record<string, unknown>;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    zIndex: number;
    styles: Record<string, unknown>;
    parentId?: string;
    containerId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ElementConnection {
    id: string;
    sourceElementId: string;
    targetElementId: string;
    connectionType: string;
    createdAt: string;
}

export interface BoardMeta {
    id: string;
    title: string;
    description?: string | null;
    slug: string;
    visibility: 'private' | 'public' | 'shared' | 'workspace';
    thumbnailUrl?: string | null;
    ownerId: string;
    gridConfig: {
        columns: number;
        gap: number;
    };
    isTemplate?: boolean;
    publishedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BoardPermissions {
    canEdit: boolean;
    canShare: boolean;
    canDelete: boolean;
    isOwner: boolean;
    // Note: 'owner' role is computed from board.owner_id check, not stored in
    // DBBoardCollaborator. The determinePermissions function checks ownership
    // first, then falls back to collaborator roles (admin/editor/viewer).
    role: 'owner' | 'admin' | 'editor' | 'viewer';
}

export interface BoardResponse {
    boardMeta: BoardMeta;
    elements: BoardElement[];
    connections: ElementConnection[];
    permissions: BoardPermissions;
}

// ===========================================
// API Response Types
// ===========================================

export interface APISuccessResponse<T> {
    success: true;
    data: T;
    metadata?: {
        totalElements?: number;
        totalConnections?: number;
        fetchedAt?: string;
        changedFields?: number;
        savedAt?: string;
        updatedAt?: string;
    };
}

export interface APIErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;

// ===========================================
// Request Types
// ===========================================

export interface GetBoardParams {
    id: string;
    includeLegacyBlocks?: boolean; // For backward compatibility
    elementsLimit?: number; // Pagination for large boards
    elementsOffset?: number;
}
