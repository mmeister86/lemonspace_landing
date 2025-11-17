"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import AuthGuard from "./components/AuthGuard";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  ViewportSwitcher,
  type ViewportSize,
} from "@/components/viewport-switcher";
import Canvas from "./components/Canvas";
import { BuilderMenubar } from "./components/BuilderMenubar";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import type { Block, BlockType } from "@/lib/types/board";
import { BlockDeleteDialog } from "./components/BlockDeleteDialog";
import { useUser } from "@/app/lib/user-context";
import { useBoards, useCreateBoard, useUpdateBoard } from "@/app/lib/hooks/use-boards";
import { toast } from "sonner";

const VALID_BLOCK_TYPES: BlockType[] = [
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
] as const;

export function BuilderClient() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentViewport, setCurrentViewport] =
    useState<ViewportSize>("desktop");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const addBlock = useCanvasStore((state) => state.addBlock);
  const selectedBlockId = useCanvasStore((state) => state.selectedBlockId);
  const currentBoard = useCanvasStore((state) => state.currentBoard);
  const setCurrentBoard = useCanvasStore((state) => state.setCurrentBoard);
  const blocks = useCanvasStore((state) => state.blocks);

  const { user } = useUser();
  const { data: boards, isLoading: boardsLoading } = useBoards(user?.id || null);
  const createBoardMutation = useCreateBoard();
  const updateBoardMutation = useUpdateBoard();

  // Refs to avoid stale closures and infinite loops
  const createBoardMutationRef = useRef(createBoardMutation);
  const updateBoardMutationRef = useRef(updateBoardMutation);
  const lastSavedBlocksRef = useRef<string>("");

  // Keep refs up to date
  useEffect(() => {
    createBoardMutationRef.current = createBoardMutation;
  }, [createBoardMutation]);

  useEffect(() => {
    updateBoardMutationRef.current = updateBoardMutation;
  }, [updateBoardMutation]);

  // Lade oder erstelle ein Board beim Start
  useEffect(() => {
    let isMounted = true;

    async function initializeBoard() {
      // Early return conditions with proper state checking
      if (!user?.id) {
        console.log("[Builder] No user ID available");
        return;
      }

      if (boardsLoading) {
        console.log("[Builder] Boards still loading");
        return;
      }

      if (currentBoard) {
        console.log("[Builder] Board already set:", currentBoard.id);
        return;
      }

      // Wait for boards to be fully loaded
      if (!boards) {
        console.log("[Builder] Boards data not available yet");
        return;
      }

      console.log("[Builder] Initializing board with boards:", boards.length);

      // Wenn der User Boards hat, lade das erste
      if (boards.length > 0) {
        if (isMounted) {
          console.log("[Builder] Setting existing board:", boards[0].id);
          setCurrentBoard(boards[0]);
        }
        return;
      }

      // Sonst erstelle ein neues Board
      if (boards.length === 0) {
        try {
          console.log("[Builder] Creating new board for user:", user.id);
          const newBoard = await createBoardMutationRef.current.mutateAsync({
            title: "Mein erstes Board",
            grid_config: { columns: 4, gap: 16 },
            blocks: [],
          });

          if (isMounted) {
            console.log("[Builder] New board created:", newBoard.id);
            setCurrentBoard(newBoard);
            toast.success("Neues Board erstellt");
          }
        } catch (error) {
          console.error("Fehler beim Erstellen des Boards:", error);
          if (isMounted) {
            toast.error("Fehler beim Erstellen des Boards");
          }
        }
      }
    }

    initializeBoard();

    return () => {
      isMounted = false;
    };
  }, [user?.id, boards, boardsLoading, currentBoard, setCurrentBoard]);

  // URL-Synchronisation bei Board-Wechsel
  useEffect(() => {
    if (!currentBoard?.slug) return;

    const pathSlug = pathname.split('/').filter(Boolean).pop();
    if (pathSlug !== currentBoard.slug) {
      router.replace(`/builder/${currentBoard.slug}`);
    }
  }, [currentBoard, pathname, router]);

  // Auto-Save für Block-Änderungen
  useEffect(() => {
    if (!currentBoard || !user?.id) return;

    const currentBlocksJson = JSON.stringify(blocks);

    // Skip if blocks haven't actually changed
    if (currentBlocksJson === lastSavedBlocksRef.current) {
      return;
    }

    // Speichere Blöcke, wenn sie sich geändert haben
    const saveBlocks = async () => {
      try {
        await updateBoardMutationRef.current.mutateAsync({
          boardId: currentBoard.id,
          boardData: {
            ...currentBoard,
            blocks: blocks,
          },
        });
        lastSavedBlocksRef.current = currentBlocksJson;
      } catch (error) {
        console.error("Fehler beim Speichern der Blöcke:", error);
        // Kein Toast bei Auto-Save, da es störend wäre
      }
    };

    // Debounce, um zu viele Speicherungen zu vermeiden
    const timeoutId = setTimeout(saveBlocks, 1000);

    return () => clearTimeout(timeoutId);
  }, [blocks, currentBoard, user?.id]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over?.id === "canvas-drop-area") {
      if (!active || !active.data) {
        console.warn(
          "[Canvas] Invalid drag event: active or active.data is missing",
          { active }
        );
        return;
      }

      if (!active.data.current) {
        console.warn(
          "[Canvas] Invalid drag event: active.data.current is missing",
          { active }
        );
        return;
      }

      const current = active.data.current;

      let validatedType: BlockType = "text";
      if (
        typeof current.type === "string" &&
        VALID_BLOCK_TYPES.includes(current.type as BlockType)
      ) {
        validatedType = current.type as BlockType;
      } else if (current.type !== undefined) {
        console.warn(
          `[Canvas] Invalid block type "${current.type}", defaulting to "text"`,
          { current }
        );
      }

      let validatedData: Record<string, unknown> = {};
      if (
        current.data !== null &&
        typeof current.data === "object" &&
        !Array.isArray(current.data)
      ) {
        validatedData = current.data as Record<string, unknown>;
      } else if (current.data !== undefined) {
        console.warn(
          `[Canvas] Invalid block data, expected object but got ${typeof current.data}, defaulting to {}`,
          { current }
        );
      }

      const newBlock: Block = {
        id: crypto.randomUUID(),
        type: validatedType,
        data: validatedData,
      };

      addBlock(newBlock);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockId) {
        const target = e.target as HTMLElement | null;
        if (!target) {
          return;
        }

        const tagName = target.tagName.toLowerCase();
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select"
        ) {
          return;
        }

        let element: HTMLElement | null = target;
        while (element) {
          if (
            element.contentEditable === "true" ||
            element.contentEditable === "plaintext-only"
          ) {
            return;
          }
          element = element.parentElement;
        }

        e.preventDefault();
        setDeleteDialogOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedBlockId]);

  return (
    <AuthGuard>
      <DndContext onDragEnd={handleDragEnd}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="border-b bg-background">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                  />
                  <BuilderMenubar zoomLevel={zoomLevel} onZoomChange={setZoomLevel} />
                </div>
                <ViewportSwitcher
                  currentViewport={currentViewport}
                  onViewportChange={setCurrentViewport}
                />
              </div>
            </div>
            <Canvas currentViewport={currentViewport} zoomLevel={zoomLevel} />
          </SidebarInset>
        </SidebarProvider>
        <BlockDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          blockId={selectedBlockId}
        />
      </DndContext>
    </AuthGuard>
  );
}

export default BuilderClient;
