"use client";

import { Block } from "@/lib/types/board";
import { cn } from "@/lib/utils";
import { BlockDeleteButton } from "../BlockDeleteButton";
import { PlateEditor } from "@/components/plate-editor";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useMemo } from "react";

interface TextBlockProps {
    block: Block;
    isSelected?: boolean;
    isPreviewMode?: boolean;
}

const DEFAULT_CONTENT = [
    {
        type: 'p',
        children: [{ text: 'Start typing...' }],
    },
];

export function TextBlock({
    block,
    isSelected,
    isPreviewMode = false,
}: TextBlockProps) {
    const updateBlock = useCanvasStore((state) => state.updateBlock);

    const content = useMemo(() => {
        // Basic migration check: if content is an object (ProseMirror) or string, reset to default
        // Plate expects an array.
        if (Array.isArray(block.data.content)) {
            return block.data.content;
        }
        return DEFAULT_CONTENT;
    }, [block.data.content]);

    const handleChange = (value: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!isPreviewMode) {
            updateBlock(block.id, {
                data: {
                    ...block.data,
                    content: value,
                },
            });
        }
    };

    return (
        <div
            className={cn(
                "w-full min-h-[50px] flex flex-col relative",
                !isPreviewMode && isSelected && "ring-2 ring-primary ring-offset-2 border-primary"
            )}
        >
            {!isPreviewMode && isSelected && (
                <BlockDeleteButton blockId={block.id} />
            )}
            <div
                className={cn(
                    "",
                    !isPreviewMode && "p-4"
                )}
            >
                <PlateEditor
                    key={JSON.stringify(content)}
                    initialValue={content}
                    onChange={handleChange}
                    readOnly={true}
                    className="px-0 py-0 pb-0 min-h-0 sm:px-0"
                />
            </div>
        </div>
    );
}
