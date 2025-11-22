import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Block } from "@/lib/types/board";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { BlockDeleteButton } from "../BlockDeleteButton";
import { ResizeHandle } from "./ResizeHandle";



import { useDroppable } from "@dnd-kit/core";

interface GridBlockProps {
    block: Block;
    isSelected?: boolean;
}

interface GridColumnProps {
    blockId: string;
    columnIndex: number;
    isSelected?: boolean;
    onResizeStart: (index: number, e: React.MouseEvent) => void;
    showHandle: boolean;
}

function GridColumn({ blockId, columnIndex, isSelected, onResizeStart, showHandle }: GridColumnProps) {
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
                "border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/5 min-h-[100px] transition-colors p-2 flex flex-col gap-2 relative",
                isSelected && "border-primary/20 bg-primary/5",
                isOver && "border-primary bg-primary/10"
            )}
        >
            {showHandle && <ResizeHandle onMouseDown={(e) => onResizeStart(columnIndex, e)} />}
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
    const containerRef = useRef<HTMLDivElement>(null);
    const resizingStateRef = useRef<{
        handleIndex: number;
        startX: number;
        startRatios: number[];
    } | null>(null);

    const columns = (block.data.columns as number) || 1;
    // Initialize ratios if they don't exist
    const initialRatios = (block.data.ratios as number[]) || Array(columns).fill(1);
    const [currentRatios, setCurrentRatios] = useState(initialRatios);

    const getGridTemplateColumns = useCallback(() => {
        return currentRatios.map((r) => `${r}fr`).join(" ");
    }, [currentRatios]);

    const handleResizeStart = useCallback((handleIndex: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        resizingStateRef.current = {
            handleIndex,
            startX: e.clientX,
            startRatios: [...currentRatios],
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || !resizingStateRef.current) return;

            const deltaX = e.clientX - resizingStateRef.current.startX;
            const { handleIndex, startRatios } = resizingStateRef.current;

            const newRatios = [...startRatios];
            const deltaRatio = deltaX / containerRef.current.offsetWidth * (startRatios[handleIndex] + startRatios[handleIndex + 1]);

            newRatios[handleIndex] = Math.max(0.1, startRatios[handleIndex] + deltaRatio);
            newRatios[handleIndex + 1] = Math.max(0.1, startRatios[handleIndex + 1] - deltaRatio);

            setCurrentRatios(newRatios);
        };

        const handleMouseUp = () => {
            if (!resizingStateRef.current) return;

            updateBlock(block.id, {
                data: {
                    ...block.data,
                    ratios: currentRatios,
                },
            });

            resizingStateRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [currentRatios, block.id, block.data, updateBlock]);

    useEffect(() => {
        // This effect ensures that if the block data changes from outside, we sync it
        const newRatios = (block.data.ratios as number[]) || Array(columns).fill(1);
        if (JSON.stringify(newRatios) !== JSON.stringify(currentRatios)) {
            setCurrentRatios(newRatios);
        }
    }, [block.data.ratios, columns, currentRatios]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', () => {});
            document.removeEventListener('mouseup', () => {});
        };
    }, []);


    // Build grid template that includes gutters for resize handles
    const getGridTemplateColumnsWithGutters = useCallback(() => {
        const columnTemplates = currentRatios.map((r) => `${r}fr`);
        const result: string[] = [];

        columnTemplates.forEach((template, index) => {
            result.push(template);
            // Add gutter between columns (but not after the last one)
            if (index < columnTemplates.length - 1) {
                result.push('16px'); // gap-4 = 1rem = 16px
            }
        });

        return result.join(' ');
    }, [currentRatios]);

    return (
        <div ref={containerRef} className="w-full h-full min-h-[100px]">
            <div
                className="grid w-full h-full"
                style={{ gridTemplateColumns: getGridTemplateColumnsWithGutters() }}
            >
                {Array.from({ length: columns }).map((_, index) => (
                    <React.Fragment key={index}>
                        <GridColumn
                            blockId={block.id}
                            columnIndex={index}
                            isSelected={isSelected}
                            onResizeStart={handleResizeStart}
                            showHandle={false}
                        />
                        {index < columns - 1 && (
                            <div
                                className="flex items-center justify-center cursor-col-resize group relative"
                                onMouseDown={(e) => handleResizeStart(index, e)}
                            >
                                <div
                                    className={cn(
                                        "w-1.5 h-12 rounded-full",
                                        "bg-muted-foreground/30",
                                        "group-hover:bg-primary group-hover:scale-110",
                                        "transition-all duration-200"
                                    )}
                                />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
