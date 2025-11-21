import React from "react";
import { cn } from "@/lib/utils";
import { Block } from "@/lib/types/board";

import { useDroppable } from "@dnd-kit/core";

interface GridBlockProps {
    block: Block;
    isSelected?: boolean;
}

interface GridColumnProps {
    blockId: string;
    columnIndex: number;
    isSelected?: boolean;
}

function GridColumn({ blockId, columnIndex, isSelected }: GridColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: `${blockId}-col-${columnIndex}`,
        data: {
            type: "column",
            blockId,
            columnIndex,
        },
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/5 flex items-center justify-center min-h-[100px] transition-colors",
                isSelected && "border-primary/20 bg-primary/5",
                isOver && "border-primary bg-primary/10"
            )}
        >
            <span className="text-xs text-muted-foreground">
                Spalte {columnIndex + 1}
            </span>
        </div>
    );
}

export function GridBlock({ block, isSelected }: GridBlockProps) {
    const columns = (block.data.columns as number) || 1;
    const ratios = (block.data.ratios as number[]) || [];

    const getGridTemplateColumns = () => {
        if (ratios.length === columns) {
            return ratios.map((r) => `${r}fr`).join(" ");
        }
        return `repeat(${columns}, 1fr)`;
    };

    return (
        <div className="w-full h-full min-h-[100px]">
            <div
                className="grid gap-4 w-full h-full"
                style={{ gridTemplateColumns: getGridTemplateColumns() }}
            >
                {Array.from({ length: columns }).map((_, index) => (
                    <GridColumn
                        key={index}
                        blockId={block.id}
                        columnIndex={index}
                        isSelected={isSelected}
                    />
                ))}
            </div>
        </div>
    );
}
