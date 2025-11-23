"use client";

import { Block } from "@/lib/types/board";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useTranslations } from "next-intl";
import { PlateEditor } from "@/components/plate-editor";
import { useMemo } from "react";

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

    const handleChange = (value: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        updateBlock(block.id, {
            data: {
                ...block.data,
                content: value,
            },
        });
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{t("content")}</label>
            <div className="border rounded-md bg-background flex flex-col overflow-hidden min-h-[200px]">
                <div className="flex-1 overflow-y-auto p-4">
                    <PlateEditor
                        initialValue={content}
                        onChange={handleChange}
                    />
                </div>
            </div>
        </div>
    );
}
