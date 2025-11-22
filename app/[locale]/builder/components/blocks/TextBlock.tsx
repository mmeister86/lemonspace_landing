"use client";

import { createEditor } from "prosekit/core";
import { ProseKit, useDocChange } from "prosekit/react";
import { Block } from "@/lib/types/board";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { EditorToolbar } from "./EditorToolbar";
import { defineExtension } from "./editor-extension";
import { useCanvasStore } from "@/lib/stores/canvas-store";
// import "prosekit/basic/style.css";

interface TextBlockProps {
    block: Block;
    isSelected?: boolean;
    isPreviewMode?: boolean;
}

export function TextBlock({ block, isSelected, isPreviewMode = false }: TextBlockProps) {
    const updateBlock = useCanvasStore((state) => state.updateBlock);

    const extension = useMemo(() => {
        return defineExtension();
    }, []);

    const editor = useMemo(() => {
        return createEditor({
            extension,
            defaultContent: (block.data.content as string) || undefined,
        });
    }, [extension, block.data.content]);

    // 🆕 Listen to document changes and update the store
    // Best Practice: useDocChange accepts callback directly, no useCallback needed
    useDocChange((doc) => {
        if (!isPreviewMode) {
            const json = editor.getDocJSON();
            updateBlock(block.id, {
                data: {
                    ...block.data,
                    content: json,
                },
            });
        }
    }, { editor });

    return (
        <ProseKit editor={editor}>
            <div
                className={cn(
                    "w-full h-full min-h-[50px] flex flex-col overflow-hidden",
                    !isPreviewMode && "border rounded-md bg-background",
                    !isPreviewMode &&
                        isSelected &&
                        "ring-2 ring-primary ring-offset-2 border-primary"
                )}
            >
                {/* Toolbar nur im Builder-Modus und wenn selektiert */}
                {!isPreviewMode && isSelected && <EditorToolbar blockId={block.id} />}

                <div
                    className={cn(
                        "prose dark:prose-invert max-w-none flex-1 overflow-y-auto",
                        !isPreviewMode && "p-4"
                    )}
                >
                    <div
                        ref={editor.mount}
                        className={cn(
                            "min-h-[50px] h-full",
                            !isPreviewMode && "outline-none"
                        )}
                        contentEditable={!isPreviewMode}
                    />
                </div>
            </div>
        </ProseKit>
    );
}
