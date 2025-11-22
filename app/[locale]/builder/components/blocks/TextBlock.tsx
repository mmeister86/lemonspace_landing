"use client";

import { createEditor } from "prosekit/core";
import { ProseKit } from "prosekit/react";
import { useTranslations } from "next-intl";
import { Block } from "@/lib/types/board";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { EditorToolbar } from "./EditorToolbar";
import { defineExtension } from "./editor-extension";
import "prosekit/basic/style.css";

interface TextBlockProps {
    block: Block;
    isSelected?: boolean;
}

export function TextBlock({ block, isSelected }: TextBlockProps) {
    const t = useTranslations("Builder");

    const extension = useMemo(() => {
        return defineExtension();
    }, []);

    const editor = useMemo(() => {
        return createEditor({
            extension,
            defaultContent: (block.data.content as any) || undefined,
        });
    }, [extension, block.data.content]);

    return (
        <ProseKit editor={editor}>
            <div
                className={cn(
                    "w-full h-full min-h-[50px] flex flex-col border rounded-md overflow-hidden bg-background",
                    isSelected && "ring-2 ring-primary ring-offset-2 border-primary"
                )}
            >
                {isSelected && <EditorToolbar blockId={block.id} />}
                <div className="p-4 prose dark:prose-invert max-w-none flex-1 overflow-y-auto">
                    <div ref={editor.mount} className="min-h-[50px] outline-none h-full" />
                </div>
            </div>
        </ProseKit>
    );
}
