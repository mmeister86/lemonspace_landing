import React, { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Block } from "@/lib/types/board";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { BlockDeleteButton } from "../BlockDeleteButton";
import { useDroppable } from "@dnd-kit/core";
import { ResizeHandle } from "./ResizeHandle";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

interface GridBlockProps {
    block: Block;
    isSelected?: boolean;
}

interface GridColumnProps {
    blockId: string;
    columnIndex: number;
    isSelected?: boolean;
}

function GridColumn({ blockId, columnIndex }: GridColumnProps) {
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
    const selectedColumnIndex = useCanvasStore((state) => state.selectedColumnIndex);

    const isBlockSelected = selectedBlockId === blockId;
    const isColumnSelected = isBlockSelected && selectedColumnIndex === columnIndex;
    // Also show selection if the whole block is selected (no specific column)
    const isParentSelected = isBlockSelected && selectedColumnIndex === null;

    const children = blocks.filter(
        (b) => b.parentId === blockId && b.containerId === columnIndex.toString()
    );

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "h-full border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/5 min-h-[100px] transition-colors p-2 flex flex-col gap-2 relative",
                (isColumnSelected || isParentSelected) && "border-primary/20 bg-primary/5",
                isColumnSelected && "ring-2 ring-primary/50 ring-inset",
                isOver && "border-primary bg-primary/10"
            )}
            onClick={(e) => {
                e.stopPropagation();
                selectBlock(blockId, columnIndex);
            }}
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
    const updateBlock = useCanvasStore((state) => state.updateBlock);

    const columns = (block.data.columns as number) || 1;
    // Initialize ratios if they don't exist
    const initialRatios = (block.data.ratios as number[]) || Array(columns).fill(1);
    const [currentRatios, setCurrentRatios] = useState(initialRatios);

    const onLayout = useCallback((sizes: number[]) => {
        setCurrentRatios(sizes);
        updateBlock(block.id, {
            data: {
                ...block.data,
                ratios: sizes,
            },
        });
    }, [block.id, block.data, updateBlock]);

    useEffect(() => {
        // This effect ensures that if the block data changes from outside, we sync it
        const savedRatios = (block.data.ratios as number[]) || [];

        // If we have saved ratios and they match the column count, use them
        if (savedRatios.length === columns) {
            if (JSON.stringify(savedRatios) !== JSON.stringify(currentRatios)) {
                setCurrentRatios(savedRatios);
            }
        } else {
            // Column count changed or no ratios yet
            // If we have fewer ratios than columns, pad with 1s
            // If we have more, slice (or just reset to equal if that's better UX)
            // For now, let's try to preserve existing and add 1s for new columns
            //const newRatios = Array(columns).fill(1);

            // If we have existing ratios, try to map them to percentages if they aren't already
            // But since we are switching to percentages, we might want to normalize first time
            // For now, just filling with equal shares if count changes is safest
            const equalShare = 100 / columns;
            const normalizedRatios = Array(columns).fill(equalShare);

            if (JSON.stringify(normalizedRatios) !== JSON.stringify(currentRatios)) {
                setCurrentRatios(normalizedRatios);
                // Update block data immediately to persist the fix
                updateBlock(block.id, {
                    data: {
                        ...block.data,
                        ratios: normalizedRatios,
                    },
                });
            }
        }
    }, [block.data.ratios, columns, currentRatios, block.id, block.data, updateBlock]);

    return (
        <div className="w-full h-full min-h-[100px]">
            <PanelGroup direction="horizontal" onLayout={onLayout}>
                {Array.from({ length: columns }).map((_, index) => (
                    <React.Fragment key={index}>
                        <Panel defaultSize={currentRatios[index]}>
                            <GridColumn
                                blockId={block.id}
                                columnIndex={index}
                            />
                        </Panel>
                        {index < columns - 1 && (
                            <PanelResizeHandle className="w-4 flex items-center justify-center z-10 outline-none group cursor-col-resize">
                                <ResizeHandle />
                            </PanelResizeHandle>
                        )}
                    </React.Fragment>
                ))}
            </PanelGroup>
        </div>
    );
}
