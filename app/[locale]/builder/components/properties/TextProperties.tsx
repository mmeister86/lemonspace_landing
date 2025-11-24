"use client";

import { Block } from "@/lib/types/board";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useTranslations } from "next-intl";
import { PlateEditor } from "@/components/plate-editor";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface TextPropertiesProps {
    block: Block;
}

const DEFAULT_CONTENT = [
    {
        type: 'p',
        children: [{ text: 'Start typing...' }],
    },
];

export function TextProperties({ block: blockProp }: TextPropertiesProps) {
    // Read block directly from store to ensure we always have the latest version
    const storeBlock = useCanvasStore(
        (state) => state.blocks.find((b) => b.id === blockProp.id) || blockProp
    );
    const block = storeBlock;
    const updateBlock = useCanvasStore((state) => state.updateBlock);
    const t = useTranslations("propertiesPanel");

    const content = useMemo(() => {
        if (Array.isArray(block.data.content)) {
            return block.data.content;
        }
        return DEFAULT_CONTENT;
    }, [block.data.content]);

    const [localContent, setLocalContent] = useState(content);

    // Sync local content when block content changes (e.g. undo/redo or initial load)
    useEffect(() => {
        setLocalContent(content);
    }, [content]);

    const handleChange = (value: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setLocalContent(value);
    };

    const handleSave = () => {
        updateBlock(block.id, {
            data: {
                ...block.data,
                content: localContent,
            },
        });
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{t("content")}</label>
            <div className="border rounded-md bg-background flex flex-col overflow-hidden min-h-[200px]">
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    <PlateEditor
                        initialValue={localContent}
                        onChange={handleChange}
                        className="px-0 py-0 pb-0 min-h-0 sm:px-0"
                    />
                </div>
            </div>
            <Button
                onClick={handleSave}
                className="w-full"
            >
                {t("save")}
            </Button>
        </div>
    );
}
