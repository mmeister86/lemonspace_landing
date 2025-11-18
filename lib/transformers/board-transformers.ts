/**
 * The provided TypeScript code includes functions to transform database elements and connections to a
 * builder-compatible format, as well as determine user permissions for a board based on ownership and
 * collaborator status.
 * @param {DBBoardElement} dbElement - The `dbElement` parameter represents a database board element in
 * the `transformDBElementToBuilder` function. It contains information about a specific element on a
 * board, such as its type, content, position, size, zIndex, styles, and timestamps (createdAt and
 * updatedAt). The function transforms this database
 * @returns The code provided contains functions that transform database entities (board elements,
 * element connections, and boards) into formats compatible with a builder application. Additionally,
 * there is a function `determinePermissions` that determines user permissions for a board based on
 * ownership and collaborator status.
 */

import type {
  DBBoardWithMeta,
  DBBoardElement,
  DBElementConnection,
  DBBoardCollaborator,
  BoardElement,
  ElementConnection,
  BoardMeta,
  BoardPermissions,
} from "@/lib/types/board-api";

/**
 * Transforms a database board element to the builder-compatible format
 */
export function transformDBElementToBuilder(dbElement: DBBoardElement): BoardElement {
  return {
    id: dbElement.id,
    type: dbElement.type,
    content: dbElement.content,
    position: {
      x: Number(dbElement.position_x) || 0,
      y: Number(dbElement.position_y) || 0,
    },
    size: {
      width: Number(dbElement.width) || 100,
      height: Number(dbElement.height) || 100,
    },
    zIndex: dbElement.z_index,
    styles: dbElement.styles,
    createdAt: dbElement.created_at,
    updatedAt: dbElement.updated_at,
  };
}

/**
 * Transforms a database element connection to the builder-compatible format
 */
export function transformDBConnectionToBuilder(
  dbConnection: DBElementConnection
): ElementConnection {
  return {
    id: dbConnection.id,
    sourceElementId: dbConnection.source_element_id,
    targetElementId: dbConnection.target_element_id,
    connectionType: dbConnection.connection_type,
    createdAt: dbConnection.created_at,
  };
}

/**
 * Transforms a database board to the builder-compatible metadata format
 */
export function transformDBBoardToMeta(dbBoard: DBBoardWithMeta): BoardMeta {
  return {
    id: dbBoard.id,
    title: dbBoard.title,
    description: dbBoard.description || null,
    slug: dbBoard.slug,
    visibility: dbBoard.visibility || 'private',
    thumbnailUrl: dbBoard.thumbnail_url || null,
    // user_id is canonical, owner_id is deprecated fallback; one must exist for valid board
    ownerId: (dbBoard.user_id || dbBoard.owner_id) as string,
    gridConfig: dbBoard.grid_config,
    isTemplate: dbBoard.is_template || false,
    publishedAt: dbBoard.published_at || null,
    createdAt: dbBoard.created_at,
    updatedAt: dbBoard.updated_at,
  };
}

/**
 * Determines user permissions for a board based on ownership and collaborator status
 */
export function determinePermissions(
  userId: string,
  board: DBBoardWithMeta,
  collaborator?: DBBoardCollaborator
): BoardPermissions {
  // user_id is canonical, owner_id is deprecated fallback; one must exist for valid board
  const ownerId = (board.user_id || board.owner_id) as string;
  const isOwner = ownerId === userId;

  if (isOwner) {
    return {
      canEdit: true,
      canShare: true,
      canDelete: true,
      isOwner: true,
      role: "owner",
    };
  }

  if (collaborator) {
    switch (collaborator.role) {
      case "admin":
        return {
          canEdit: true,
          canShare: true,
          canDelete: false,
          isOwner: false,
          role: "admin",
        };
      case "editor":
        return {
          canEdit: true,
          canShare: false,
          canDelete: false,
          isOwner: false,
          role: "editor",
        };
      case "viewer":
        return {
          canEdit: false,
          canShare: false,
          canDelete: false,
          isOwner: false,
          role: "viewer",
        };
    }
  }

  // No access
  return {
    canEdit: false,
    canShare: false,
    canDelete: false,
    isOwner: false,
    role: "viewer",
  };
}
