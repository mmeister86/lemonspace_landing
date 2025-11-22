import React from "react";
import { cn } from "@/lib/utils";
import { Block } from "@/lib/types/board";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { BlockDeleteButton } from "../BlockDeleteButton";



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

    const blocks = useCanvasStore((state) => state.blocks);
    const selectBlock = useCanvasStore((state) => state.selectBlock);
    const selectedBlockId = useCanvasStore((state) => state.selectedBlockId);

    const children = blocks.filter(
        (b) => b.parentId === blockId && b.containerId === columnIndex.toString()
    );

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/5 min-h-[100px] transition-colors p-2 flex flex-col gap-2",
                isSelected && "border-primary/20 bg-primary/5",
                isOver && "border-primary bg-primary/10"
            )}
        >
            {children.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                        Spalte {columnIndex + 1}
                    </span>
                </div>
            ) : (
                children.map((child) => {
                    const isChildSelected = selectedBlockId === child.id;
                    return (
                        <div
                            key={child.id}
                            className={cn(
                                "p-4 border rounded-lg bg-background relative cursor-pointer transition-all",
                                isChildSelected &&
                                "ring-2 ring-primary ring-offset-2 border-primary"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                selectBlock(child.id);
                            }}
                        >
                            {isChildSelected && (
                                <BlockDeleteButton blockId={child.id} />
                            )}

                            {/* TODO: Use a shared BlockRenderer component */}
                            {child.type === "grid" ? (
                                <GridBlock block={child} isSelected={isChildSelected} />
                            ) : (
                                <>
                                    <div className="text-sm font-medium mb-2">
                                        Block: {child.type}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        ID: {child.id}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })
            )}
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
