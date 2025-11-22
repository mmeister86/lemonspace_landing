"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { BlockSelectionDialog } from "./BlockSelectionDialog";
import type { Block, BlockType } from "@/lib/types/board";

export function DropArea() {
    const t = useTranslations("dropArea");
    const blocks = useCanvasStore((state) => state.blocks);
    const addBlock = useCanvasStore((state) => state.addBlock);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { setNodeRef, isOver } = useDroppable({
        id: "canvas-drop-area",
    });

    const hasBlocks = blocks.length > 0;

    const handleBlockSelect = (type: BlockType, data: Record<string, unknown>) => {
        const newBlock: Block = {
            id: crypto.randomUUID(),
            type,
            data,
        };
        addBlock(newBlock);
        setIsDialogOpen(false);
    };

    return (
        <>
            <div
                ref={setNodeRef}
                onClick={() => setIsDialogOpen(true)}
                className={cn(
                    "w-[90%] mx-auto rounded-lg border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-4 cursor-pointer",
                    hasBlocks ? "min-h-[120px] p-4 mt-4" : "min-h-[300px] p-8",
                    isOver
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-muted-foreground/30 bg-muted/20 hover:border-muted-foreground/50 hover:bg-muted/30 hover:scale-[1.01]"
                )}
            >
                <div
                    className={cn(
                        "rounded-full transition-colors",
                        hasBlocks ? "p-2" : "p-4",
                        isOver ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                >
                    <Plus className={hasBlocks ? "h-5 w-5" : "h-8 w-8"} />
                </div>
                <div className="text-center">
                    <h3
                        className={cn(
                            "font-semibold mb-2",
                            hasBlocks ? "text-base" : "text-lg"
                        )}
                    >
                        {isOver ? t("dropHere") : hasBlocks ? t("addMore") : t("dropContent")}
                    </h3>
                    {!hasBlocks && (
                        <p className="text-sm text-muted-foreground">{t("instructions")}</p>
                    )}
                </div>
            </div>

            <BlockSelectionDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSelect={handleBlockSelect}
            />
        </>
    );
}
