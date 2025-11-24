"use client";

import { Block } from "@/lib/types/board";
import { cn } from "@/lib/utils";
import { BlockDeleteButton } from "../BlockDeleteButton";
import { PlateEditor } from "@/components/plate-editor";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useMemo } from "react";

import { useTranslations } from "next-intl";

interface TextBlockProps {
    block: Block;
    isSelected?: boolean;
    isPreviewMode?: boolean;
}

const createDefaultContent = () => [
    {
        type: 'p',
        children: [{ text: '' }],
    },
];

export function TextBlock({
    block,
    isSelected,
    isPreviewMode = false,
}: TextBlockProps) {
    const updateBlock = useCanvasStore((state) => state.updateBlock);
    const t = useTranslations("propertiesPanel");

    const content = useMemo(() => {
        // Basic migration check: if content is an object (ProseMirror) or string, reset to default
        // Plate expects an array.
        if (Array.isArray(block.data.content) && block.data.content.length > 0) {
            return block.data.content;
        }
        return createDefaultContent();
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

    const isEmpty = useMemo(() => {
        if (!content || content.length === 0) return true;
        if (content.length === 1 && content[0].children?.length === 1 && content[0].children[0].text === '') return true;
        return false;
    }, [content]);

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
                    "relative",
                    !isPreviewMode && "p-4"
                )}
            >
                {isEmpty && (
                    <div className="absolute inset-0 p-4 pointer-events-none text-muted-foreground/50">
                        {t("startTyping")}
                    </div>
                )}
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
