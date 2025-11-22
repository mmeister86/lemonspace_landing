"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { BlockSelectionDialog } from "./BlockSelectionDialog";
import type { Block, BlockType } from "@/lib/types/board";

interface DropAreaProps {
    parentId?: string;
    containerId?: string;
    droppableId?: string;
    variant?: "default" | "compact";
    className?: string;
}

export function DropArea({
    parentId,
    containerId,
    droppableId = "canvas-drop-area",
    variant = "default",
    className
}: DropAreaProps) {
    const t = useTranslations("dropArea");
    const blocks = useCanvasStore((state) => state.blocks);
    const addBlock = useCanvasStore((state) => state.addBlock);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { setNodeRef, isOver } = useDroppable({
        id: droppableId,
        data: {
            type: "drop-area",
            parentId,
            containerId,
        }
    });

    // Check if there are blocks in this specific container
    const hasBlocks = parentId
        ? blocks.some(b => b.parentId === parentId && b.containerId === containerId)
        : blocks.some(b => !b.parentId);

    const handleBlockSelect = (type: BlockType, data: Record<string, unknown>) => {
        const newBlock: Block = {
            id: crypto.randomUUID(),
            type,
            data,
            parentId,
            containerId,
        };
        addBlock(newBlock);
        setIsDialogOpen(false);
    };

    const isCompact = variant === "compact";

    return (
        <>
            <div
                ref={setNodeRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsDialogOpen(true);
                }}
                className={cn(
                    "rounded-lg border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center cursor-pointer",
                    isCompact
                        ? "w-full min-h-[80px] p-2 gap-2"
                        : "w-[90%] mx-auto gap-4",
                    !isCompact && (hasBlocks ? "min-h-[120px] p-4 mt-4" : "min-h-[300px] p-8"),
                    isOver
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-muted-foreground/30 bg-muted/20 hover:border-muted-foreground/50 hover:bg-muted/30 hover:scale-[1.01] dark:bg-sidebar dark:border-sidebar-border dark:hover:bg-sidebar-accent dark:hover:border-sidebar-accent",
                    className
                )}
            >
                <div
                    className={cn(
                        "rounded-full transition-colors",
                        isCompact ? "p-1.5" : (hasBlocks ? "p-2" : "p-4"),
                        isOver ? "bg-primary text-primary-foreground" : "bg-muted dark:bg-sidebar-accent"
                    )}
                >
                    <Plus className={isCompact ? "h-4 w-4" : (hasBlocks ? "h-5 w-5" : "h-8 w-8")} />
                </div>
                <div className="text-center">
                    <h3
                        className={cn(
                            "font-semibold",
                            isCompact ? "text-sm mb-0" : (hasBlocks ? "text-base mb-2" : "text-lg mb-2")
                        )}
                    >
                        {isOver ? t("dropHere") : (isCompact ? t("addMore") : (hasBlocks ? t("addMore") : t("dropContent")))}
                    </h3>
                    {!isCompact && !hasBlocks && (
                        <p className="text-sm text-muted-foreground">{t("instructions")}</p>
                    )}
                </div>
            </div>

            <BlockSelectionDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSelect={handleBlockSelect}
                target={{ parentId, containerId }}
            />
        </>
    );
}
