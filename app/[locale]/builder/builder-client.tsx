"use client";

import { useState, useEffect } from "react";
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
import { ID } from "@/lib/appwrite";
import type { Block, BlockType } from "@/lib/types/board";
import { BlockDeleteDialog } from "./components/BlockDeleteDialog";

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
  const [currentViewport, setCurrentViewport] =
    useState<ViewportSize>("desktop");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const addBlock = useCanvasStore((state) => state.addBlock);
  const selectedBlockId = useCanvasStore((state) => state.selectedBlockId);

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
        id: ID.unique(),
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
