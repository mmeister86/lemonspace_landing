"use client";

import { createEditor } from "prosekit/core";
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
    const isInitialMountRef = useRef(true);

    // Update editor content when blockContent changes (e.g., from sidebar or after save)
    useEffect(() => {
        // Skip on initial mount - the editor is already initialized with defaultContent
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            // Store the initial content for comparison
            if (blockContent) {
                lastContentRef.current = JSON.stringify(blockContent);
            }
            return;
        }

        // Skip if content hasn't changed
        const contentString = blockContent ? JSON.stringify(blockContent) : null;
        if (lastContentRef.current === contentString) {
            return;
        }

        // Only update if we have content
        if (blockContent) {
            try {
                editor.setContent(blockContent as any);
                lastContentRef.current = contentString;
            } catch (error) {
                console.error("Error updating editor content:", error);
                // Fallback: If content is a string, try to set it as plain text
                if (typeof blockContent === "string") {
                    editor.commands.insertText({ text: blockContent });
                    lastContentRef.current = contentString;
                }
            }
        } else if (contentString === null && lastContentRef.current !== null) {
            // Content was cleared, reset editor to empty state
            try {
                editor.setContent({
                    type: "doc",
                    content: [],
                });
                lastContentRef.current = null;
            } catch (error) {
                console.error("Error clearing editor content:", error);
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
                    onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const link = target.closest("a");
                        if (link && link.href) {
                            // In preview mode: always open
                            // In edit mode: open only with Ctrl/Cmd key to avoid interfering with editing
                            if (isPreviewMode || e.metaKey || e.ctrlKey) {
                                window.open(link.href, "_blank");
                            }
                        }
                    }}
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
