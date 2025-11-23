"use client";

import { createEditor, nodeFromJSON } from "prosekit/core";
import { ProseKit } from "prosekit/react";
import { Block } from "@/lib/types/board";
import { cn } from "@/lib/utils";
import { useMemo, useEffect, useRef } from "react";
import { defineExtension } from "./editor-extension";
import { BlockDeleteButton } from "../BlockDeleteButton";
import { useCanvasStore } from "@/lib/stores/canvas-store";
// import "prosekit/basic/style.css";

interface TextBlockProps {
  block: Block;
  isSelected?: boolean;
  isPreviewMode?: boolean;
}

export function TextBlock({
  block: blockProp,
  isSelected,
  isPreviewMode = false,
}: TextBlockProps) {
  // Read block and its content directly from store to ensure we always have the latest version
  // Use separate selectors to ensure reactivity
  const storeBlock = useCanvasStore(
    (state) => state.blocks.find((b) => b.id === blockProp.id) || blockProp
  );
  const blockContent = useCanvasStore((state) => {
    const found = state.blocks.find((b) => b.id === blockProp.id);
    return found?.data?.content || blockProp.data?.content;
  });
  const block = storeBlock;

  const extension = useMemo(() => {
    return defineExtension();
  }, []);

  const editor = useMemo(() => {
    return createEditor({
      extension,
      defaultContent: (block.data.content as string) || undefined,
    });
  }, [extension, block.id]); // Nur block.id als Dependency, nicht block.data.content

  // Track the last content we set to avoid unnecessary updates
  const lastContentRef = useRef<string | null>(null);

  // Update editor content when blockContent changes (e.g., from sidebar)
  useEffect(() => {
    // Skip if content hasn't changed
    const contentString = JSON.stringify(blockContent);
    if (lastContentRef.current === contentString) {
      return;
    }

    if (blockContent) {
      try {
        // Use nodeFromJSON to create a new document node
        const doc = nodeFromJSON(editor.schema, blockContent);
        // Update the editor state directly
        const newState = editor.view.state.reconfigure({
          doc: doc,
        });
        editor.view.updateState(newState);
        lastContentRef.current = contentString;
      } catch (error) {
        console.error("Error updating editor content:", error);
        // Fallback: Try setContent if available
        if (typeof (editor as any).setContent === "function") {
          (editor as any).setContent(blockContent);
          lastContentRef.current = contentString;
        } else if (typeof blockContent === "string") {
          // Last resort: try to insert as text
          editor.commands.insertText(blockContent);
          lastContentRef.current = contentString;
        }
      }
    }
  }, [editor, blockContent, blockProp.id]);

  return (
    <ProseKit editor={editor}>
      <div
        className={cn(
          "w-full h-full min-h-[50px] flex flex-col overflow-hidden relative",
          !isPreviewMode && "border rounded-md bg-background",
          !isPreviewMode &&
            isSelected &&
            "ring-2 ring-primary ring-offset-2 border-primary"
        )}
      >
        {!isPreviewMode && isSelected && (
          <BlockDeleteButton blockId={block.id} />
        )}
        <div
          className={cn(
            "prose dark:prose-invert max-w-none flex-1 overflow-y-auto",
            !isPreviewMode && "p-4"
          )}
        >
          <div
            ref={editor.mount}
            className={cn("min-h-[50px] h-full")}
            contentEditable={false}
          />
        </div>
      </div>
    </ProseKit>
  );
}
