# API Route `/api/boards/[id]` - Implementierungsplan

## Übersicht

Diese API-Route lädt ein bestehendes Board aus der Supabase-Datenbank und bereitet es für den Builder auf. Der Plan umfasst Schema-Erweiterungen, TypeScript-Typen, Authentifizierung, Autorisierung und Error Handling.

---

## 1. Database Schema Extensions

### 1.1 Erweiterte `boards`-Tabelle

```sql
-- Neue Spalten für boards-Tabelle
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'shared')),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Index für owner_id
CREATE INDEX IF NOT EXISTS boards_owner_id_idx ON public.boards(owner_id);

-- Migration: owner_id = user_id für bestehende Boards
UPDATE public.boards SET owner_id = user_id WHERE owner_id IS NULL;

-- Kommentare
COMMENT ON COLUMN public.boards.description IS 'Optionale Beschreibung des Boards';
COMMENT ON COLUMN public.boards.visibility IS 'Sichtbarkeit: private, public, shared';
COMMENT ON COLUMN public.boards.thumbnail_url IS 'URL zum Board-Thumbnail';
COMMENT ON COLUMN public.boards.owner_id IS 'Besitzer des Boards (auth.users.id)';
```

### 1.2 Neue `board_elements`-Tabelle

```sql
CREATE TABLE IF NOT EXISTS public.board_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC NOT NULL DEFAULT 100,
  height NUMERIC NOT NULL DEFAULT 100,
  z_index INTEGER NOT NULL DEFAULT 0,
  styles JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT board_elements_type_check CHECK (type IN (
    'text', 'heading', 'image', 'button', 'spacer', 'video',
    'form', 'pricing', 'testimonial', 'accordion', 'code'
  ))
);

-- Indexe
CREATE INDEX IF NOT EXISTS board_elements_board_id_idx ON public.board_elements(board_id);
CREATE INDEX IF NOT EXISTS board_elements_z_index_idx ON public.board_elements(board_id, z_index);

-- Auto-Update Trigger
CREATE TRIGGER board_elements_updated_at
  BEFORE UPDATE ON public.board_elements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS aktivieren
ALTER TABLE public.board_elements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read elements of their boards"
  ON public.board_elements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = board_elements.board_id
      AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage elements of their boards"
  ON public.board_elements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = board_elements.board_id
      AND boards.owner_id = auth.uid()
    )
  );

COMMENT ON TABLE public.board_elements IS 'Einzelne Elemente/Blöcke innerhalb eines Boards';
```

### 1.3 Neue `element_connections`-Tabelle

```sql
CREATE TABLE IF NOT EXISTS public.element_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  source_element_id UUID NOT NULL REFERENCES public.board_elements(id) ON DELETE CASCADE,
  target_element_id UUID NOT NULL REFERENCES public.board_elements(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'link',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT element_connections_different_elements CHECK (source_element_id != target_element_id)
);

-- Indexe
CREATE INDEX IF NOT EXISTS element_connections_board_id_idx ON public.element_connections(board_id);
CREATE INDEX IF NOT EXISTS element_connections_source_idx ON public.element_connections(source_element_id);
CREATE INDEX IF NOT EXISTS element_connections_target_idx ON public.element_connections(target_element_id);

-- RLS aktivieren
ALTER TABLE public.element_connections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read connections of their boards"
  ON public.element_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = element_connections.board_id
      AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage connections of their boards"
  ON public.element_connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = element_connections.board_id
      AND boards.owner_id = auth.uid()
    )
  );

COMMENT ON TABLE public.element_connections IS 'Verbindungen zwischen Board-Elementen';
```

### 1.4 Neue `board_collaborators`-Tabelle

```sql
CREATE TABLE IF NOT EXISTS public.board_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT board_collaborators_unique UNIQUE (board_id, user_id)
);

-- Indexe
CREATE INDEX IF NOT EXISTS board_collaborators_board_id_idx ON public.board_collaborators(board_id);
CREATE INDEX IF NOT EXISTS board_collaborators_user_id_idx ON public.board_collaborators(user_id);

-- RLS aktivieren
ALTER TABLE public.board_collaborators ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see collaborations they are part of"
  ON public.board_collaborators
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = board_collaborators.board_id
      AND boards.owner_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can manage collaborators"
  ON public.board_collaborators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = board_collaborators.board_id
      AND boards.owner_id = auth.uid()
    )
  );

COMMENT ON TABLE public.board_collaborators IS 'Kollaboratoren für Boards mit Rollen';
```

---

## 2. TypeScript Interfaces

### Datei: `lib/types/board-api.ts`

```typescript
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
  created_at: string;
  updated_at: string;
}

export interface DBElementConnection {
  id: string;
  board_id: string;
  source_element_id: string;
  target_element_id: string;
  connection_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DBBoardCollaborator {
  id: string;
  board_id: string;
  user_id: string;
  role: "viewer" | "editor" | "admin";
  created_at: string;
}

export interface DBBoardWithMeta {
  id: string;
  user_id: string;
  owner_id: string;
  title: string;
  description: string | null;
  slug: string;
  visibility: "private" | "public" | "shared";
  thumbnail_url: string | null;
  grid_config: {
    columns: number;
    gap: number;
  };
  blocks: unknown[]; // Legacy JSONB blocks (backward compatibility)
  template_id: string | null;
  is_template: boolean;
  password_hash: string | null;
  expires_at: string | null;
  published_at: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface ElementConnection {
  id: string;
  sourceElementId: string;
  targetElementId: string;
  connectionType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BoardMeta {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  visibility: "private" | "public" | "shared";
  thumbnailUrl: string | null;
  ownerId: string;
  gridConfig: {
    columns: number;
    gap: number;
  };
  isTemplate: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardPermissions {
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
  isOwner: boolean;
  role: "owner" | "admin" | "editor" | "viewer";
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
    totalElements: number;
    totalConnections: number;
    fetchedAt: string;
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
```

---

## 3. API Route Implementation

### Datei: `app/api/boards/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  DBBoardWithMeta,
  DBBoardElement,
  DBElementConnection,
  DBBoardCollaborator,
  BoardResponse,
  BoardElement,
  ElementConnection,
  BoardMeta,
  BoardPermissions,
  APIResponse,
} from "@/lib/types/board-api";

// ===========================================
// Helper Functions
// ===========================================

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

function transformDBElementToBuilder(dbElement: DBBoardElement): BoardElement {
  return {
    id: dbElement.id,
    type: dbElement.type,
    content: dbElement.content,
    position: {
      x: Number(dbElement.position_x),
      y: Number(dbElement.position_y),
    },
    size: {
      width: Number(dbElement.width),
      height: Number(dbElement.height),
    },
    zIndex: dbElement.z_index,
    styles: dbElement.styles,
    createdAt: dbElement.created_at,
    updatedAt: dbElement.updated_at,
  };
}

function transformDBConnectionToBuilder(
  dbConnection: DBElementConnection
): ElementConnection {
  return {
    id: dbConnection.id,
    sourceElementId: dbConnection.source_element_id,
    targetElementId: dbConnection.target_element_id,
    connectionType: dbConnection.connection_type,
    metadata: dbConnection.metadata,
    createdAt: dbConnection.created_at,
  };
}

function transformDBBoardToMeta(dbBoard: DBBoardWithMeta): BoardMeta {
  return {
    id: dbBoard.id,
    title: dbBoard.title,
    description: dbBoard.description,
    slug: dbBoard.slug,
    visibility: dbBoard.visibility,
    thumbnailUrl: dbBoard.thumbnail_url,
    ownerId: dbBoard.owner_id,
    gridConfig: dbBoard.grid_config,
    isTemplate: dbBoard.is_template,
    publishedAt: dbBoard.published_at,
    createdAt: dbBoard.created_at,
    updatedAt: dbBoard.updated_at,
  };
}

function determinePermissions(
  userId: string,
  board: DBBoardWithMeta,
  collaborator?: DBBoardCollaborator
): BoardPermissions {
  const isOwner = board.owner_id === userId;

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

// ===========================================
// Main GET Handler
// ===========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // 1. Extract board ID from params
    const { id: boardId } = await params;

    if (!boardId || typeof boardId !== "string") {
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: {
            code: "INVALID_PARAMS",
            message: "Board ID is required",
          },
        },
        { status: 400 }
      );
    }

    // 2. Check authentication
    const {
      supabase,
      user,
      error: authError,
    } = await createSupabaseUserContext(request);

    if (authError || !user) {
      console.error("[API] Auth error:", authError);
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            details: authError?.message || "No valid session found",
          },
        },
        { status: 401 }
      );
    }

    // 3. Fetch board metadata with specific columns (performance optimization)
    const { data: boardData, error: boardError } = await supabase
      .from("boards")
      .select(
        `
        id,
        user_id,
        owner_id,
        title,
        description,
        slug,
        visibility,
        thumbnail_url,
        grid_config,
        blocks,
        template_id,
        is_template,
        password_hash,
        expires_at,
        published_at,
        created_at,
        updated_at
      `
      )
      .eq("id", boardId)
      .single();

    if (boardError) {
      if (boardError.code === "PGRST116") {
        // No rows found
        return NextResponse.json<APIResponse<never>>(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Board not found",
            },
          },
          { status: 404 }
        );
      }

      console.error("[API] Database error fetching board:", boardError);
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch board",
            details:
              process.env.NODE_ENV === "development"
                ? boardError.message
                : undefined,
          },
        },
        { status: 500 }
      );
    }

    const board = boardData as DBBoardWithMeta;

    // 4. Check user permissions (owner or collaborator)
    let collaboratorData: DBBoardCollaborator | undefined;

    // Check if user is owner
    const isOwner = board.owner_id === user.id;

    if (!isOwner) {
      // Check if user is collaborator
      const { data: collabData, error: collabError } = await supabase
        .from("board_collaborators")
        .select("*")
        .eq("board_id", boardId)
        .eq("user_id", user.id)
        .single();

      if (collabError && collabError.code !== "PGRST116") {
        console.error("[API] Error checking collaborator:", collabError);
      }

      if (!collabData) {
        // Check if board is public
        if (board.visibility !== "public") {
          return NextResponse.json<APIResponse<never>>(
            {
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "You do not have permission to access this board",
              },
            },
            { status: 403 }
          );
        }
      } else {
        collaboratorData = collabData as DBBoardCollaborator;
      }
    }

    // 5. Parse query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const elementsLimit = parseInt(searchParams.get("elementsLimit") || "1000");
    const elementsOffset = parseInt(searchParams.get("elementsOffset") || "0");

    // 6. Fetch board elements with pagination
    const { data: elementsData, error: elementsError } = await supabase
      .from("board_elements")
      .select(
        `
        id,
        board_id,
        type,
        content,
        position_x,
        position_y,
        width,
        height,
        z_index,
        styles,
        created_at,
        updated_at
      `
      )
      .eq("board_id", boardId)
      .order("z_index", { ascending: true })
      .range(elementsOffset, elementsOffset + elementsLimit - 1);

    if (elementsError) {
      console.error("[API] Database error fetching elements:", elementsError);
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch board elements",
            details:
              process.env.NODE_ENV === "development"
                ? elementsError.message
                : undefined,
          },
        },
        { status: 500 }
      );
    }

    // 7. Fetch element connections
    const { data: connectionsData, error: connectionsError } = await supabase
      .from("element_connections")
      .select(
        `
        id,
        board_id,
        source_element_id,
        target_element_id,
        connection_type,
        metadata,
        created_at
      `
      )
      .eq("board_id", boardId);

    if (connectionsError) {
      console.error(
        "[API] Database error fetching connections:",
        connectionsError
      );
      return NextResponse.json<APIResponse<never>>(
        {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch element connections",
            details:
              process.env.NODE_ENV === "development"
                ? connectionsError.message
                : undefined,
          },
        },
        { status: 500 }
      );
    }

    // 8. Transform data for Builder
    const elements = (elementsData as DBBoardElement[]).map(
      transformDBElementToBuilder
    );
    const connections = (connectionsData as DBElementConnection[]).map(
      transformDBConnectionToBuilder
    );
    const boardMeta = transformDBBoardToMeta(board);
    const permissions = determinePermissions(user.id, board, collaboratorData);

    // 9. Construct response
    const response: BoardResponse = {
      boardMeta,
      elements,
      connections,
      permissions,
    };

    // 10. Add caching headers (for read-only access)
    const headers = new Headers();
    if (!permissions.canEdit) {
      // Cache for viewers (5 minutes)
      headers.set(
        "Cache-Control",
        "private, max-age=300, stale-while-revalidate=60"
      );
    } else {
      // No cache for editors
      headers.set("Cache-Control", "no-store, max-age=0");
    }

    // Performance logging
    const duration = Date.now() - startTime;
    console.log(
      `[API] GET /api/boards/${boardId} completed in ${duration}ms (${elements.length} elements, ${connections.length} connections)`
    );

    return NextResponse.json<APIResponse<BoardResponse>>(
      {
        success: true,
        data: response,
        metadata: {
          totalElements: elements.length,
          totalConnections: connections.length,
          fetchedAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    // Catch-all error handler
    console.error("[API] Unexpected error in GET /api/boards/[id]:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (process.env.NODE_ENV === "development") {
      console.error("[API] Stack trace:", errorStack);
    }

    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
          details:
            process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
      },
      { status: 500 }
    );
  }
}
```

---

## 4. React Hook für Builder

### Datei: `app/lib/hooks/use-board.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import type { BoardResponse, APIResponse } from "@/lib/types/board-api";

interface UseBoardOptions {
  enabled?: boolean;
  elementsLimit?: number;
  elementsOffset?: number;
}

async function fetchBoard(
  boardId: string,
  options: UseBoardOptions = {}
): Promise<BoardResponse> {
  const params = new URLSearchParams();

  if (options.elementsLimit) {
    params.set("elementsLimit", options.elementsLimit.toString());
  }
  if (options.elementsOffset) {
    params.set("elementsOffset", options.elementsOffset.toString());
  }

  const url = `/api/boards/${boardId}${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies for auth
  });

  const result: APIResponse<BoardResponse> = await response.json();

  if (!result.success) {
    const error = new Error(result.error.message);
    (error as Error & { code: string }).code = result.error.code;
    (error as Error & { statusCode: number }).statusCode = response.status;
    throw error;
  }

  return result.data;
}

export function useBoard(
  boardId: string | null,
  options: UseBoardOptions = {}
) {
  return useQuery<BoardResponse, Error>({
    queryKey: ["board", boardId, options],
    queryFn: () => fetchBoard(boardId!, options),
    enabled: !!boardId && options.enabled !== false,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth or permission errors
      const code = (error as Error & { code?: string }).code;
      if (
        code === "UNAUTHORIZED" ||
        code === "FORBIDDEN" ||
        code === "NOT_FOUND"
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useBoardWithInitialization(boardId: string | null) {
  const query = useBoard(boardId);

  return {
    ...query,
    // Helper to initialize canvas store
    initializeCanvas: (canvasStore: {
      setCurrentBoard: (board: unknown) => void;
    }) => {
      if (query.data) {
        // Transform to legacy Board format for backward compatibility
        const legacyBoard = {
          id: query.data.boardMeta.id,
          user_id: query.data.boardMeta.ownerId,
          title: query.data.boardMeta.title,
          slug: query.data.boardMeta.slug,
          grid_config: query.data.boardMeta.gridConfig,
          blocks: query.data.elements.map((el) => ({
            id: el.id,
            type: el.type,
            data: el.content,
            position: el.position,
            size: el.size,
          })),
          is_template: query.data.boardMeta.isTemplate,
          created_at: query.data.boardMeta.createdAt,
          updated_at: query.data.boardMeta.updatedAt,
          published_at: query.data.boardMeta.publishedAt,
        };
        canvasStore.setCurrentBoard(legacyBoard);
      }
    },
  };
}
```

---

## 5. Beispiel: Builder-Integration

### Datei: `app/[locale]/builder/[boardId]/page.tsx`

```typescript
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBoardWithInitialization } from "@/app/lib/hooks/use-board";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { BuilderClient } from "../builder-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock, FileQuestion } from "lucide-react";

export default function BoardBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const {
    data: boardData,
    isLoading,
    error,
    initializeCanvas,
  } = useBoardWithInitialization(boardId);

  const canvasStore = useCanvasStore();

  // Initialize canvas when data loads
  useEffect(() => {
    if (boardData) {
      initializeCanvas(canvasStore);
    }
  }, [boardData, initializeCanvas, canvasStore]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // Error handling
  if (error) {
    const errorCode = (error as Error & { code?: string }).code;
    const statusCode = (error as Error & { statusCode?: number }).statusCode;

    // Unauthorized
    if (statusCode === 401 || errorCode === "UNAUTHORIZED") {
      return (
        <div className="flex h-screen items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertTitle>Nicht authentifiziert</AlertTitle>
            <AlertDescription>
              Bitte melde dich an, um dieses Board zu bearbeiten.
            </AlertDescription>
            <Button className="mt-4" onClick={() => router.push("/signin")}>
              Zur Anmeldung
            </Button>
          </Alert>
        </div>
      );
    }

    // Forbidden
    if (statusCode === 403 || errorCode === "FORBIDDEN") {
      return (
        <div className="flex h-screen items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertTitle>Keine Berechtigung</AlertTitle>
            <AlertDescription>
              Du hast keine Berechtigung, dieses Board zu bearbeiten.
            </AlertDescription>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/builder")}
            >
              Zurück zum Builder
            </Button>
          </Alert>
        </div>
      );
    }

    // Not found
    if (statusCode === 404 || errorCode === "NOT_FOUND") {
      return (
        <div className="flex h-screen items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <FileQuestion className="h-4 w-4" />
            <AlertTitle>Board nicht gefunden</AlertTitle>
            <AlertDescription>
              Das angeforderte Board existiert nicht oder wurde gelöscht.
            </AlertDescription>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/builder")}
            >
              Neues Board erstellen
            </Button>
          </Alert>
        </div>
      );
    }

    // Generic error
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler beim Laden</AlertTitle>
          <AlertDescription>
            {error.message || "Ein unerwarteter Fehler ist aufgetreten."}
          </AlertDescription>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Erneut versuchen
          </Button>
        </Alert>
      </div>
    );
  }

  // Check permissions
  if (boardData && !boardData.permissions.canEdit) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertTitle>Nur Lesezugriff</AlertTitle>
          <AlertDescription>
            Du kannst dieses Board ansehen, aber nicht bearbeiten.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render builder
  return <BuilderClient />;
}
```

---

## 6. Dateistruktur

```
app/
├── api/
│   └── boards/
│       └── [id]/
│           └── route.ts              # GET handler für Board-Daten
├── lib/
│   ├── hooks/
│   │   └── use-board.ts              # React Query hook für Board-Loading
│   └── services/
│       └── board-api-service.ts      # (Optional) Service Layer
├── [locale]/
│   └── builder/
│       └── [boardId]/
│           └── page.tsx              # Builder-Page mit Board-ID
lib/
├── types/
│   └── board-api.ts                  # TypeScript Interfaces
docs/
├── migrations/
│   └── add-board-elements.sql        # Database migration script
```

---

## 7. Zusammenfassung der Features

### ✅ Implementiert

1. **Authentifizierung**: Session Token aus Cookies oder Authorization Header
2. **Autorisierung**: Owner- und Collaborator-Prüfung mit Rollen
3. **Board-Metadaten**: Erweitert um description, visibility, thumbnail_url
4. **Separate Element-Tabellen**: board_elements und element_connections
5. **Error Handling**: Spezifische HTTP-Statuscodes (401, 403, 404, 500)
6. **Performance**: Spezifische SELECT-Spalten, Pagination, Caching Headers
7. **TypeScript Types**: Strikte Interfaces für alle Datenstrukturen
8. **Builder-Integration**: React Hook mit Canvas Store Initialisierung

### 🔄 Migration erforderlich

1. Supabase Schema-Migration ausführen
2. Bestehende JSONB-Blocks zu board_elements migrieren (optional)
3. owner_id für bestehende Boards setzen

### 📈 Zukünftige Erweiterungen

- WebSocket/Realtime für kollaboratives Editing
- Versioning/History für Board-Änderungen
- Bulk-Export/Import von Elementen
- Advanced Caching mit Redis

---

## 8. Next Steps

1. [ ] Schema-Migration in Supabase ausführen
2. [ ] TypeScript Types in `lib/types/board-api.ts` erstellen
3. [ ] API Route in `app/api/boards/[id]/route.ts` implementieren
4. [ ] React Hook in `app/lib/hooks/use-board.ts` erstellen
5. [ ] Builder-Page mit Board-ID Parameter erstellen
6. [ ] Tests schreiben (Unit + Integration)
7. [ ] Dokumentation aktualisieren

---

_Plan erstellt am: 2024-11-16_
_Autor: Claude (Architect Mode)_
