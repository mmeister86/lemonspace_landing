"use client";

import { ViewportSize } from "@/components/viewport-switcher";
import { DropArea } from "./DropArea";
import { BlockDeleteButton } from "./BlockDeleteButton";
import { GridBlock } from "./blocks/GridBlock";
import { TextBlock } from "./blocks/TextBlock";

import { useCanvasStore } from "@/lib/stores/canvas-store";
import { cn } from "@/lib/utils";

interface CanvasProps {
    currentViewport: ViewportSize;
    zoomLevel?: number;
}

export default function Canvas({ currentViewport, zoomLevel = 100 }: CanvasProps) {
    const blocks = useCanvasStore((state) => state.blocks);
    // Only render root blocks (no parent) in the main canvas
    const rootBlocks = blocks.filter(b => !b.parentId);

    const selectedBlockIds = useCanvasStore((state) => state.selectedBlockIds);
    const selectBlock = useCanvasStore((state) => state.selectBlock);
    const currentBoard = useCanvasStore((state) => state.currentBoard);

    const showGrid = useCanvasStore((state) => state.showGrid);

    const getViewportClasses = (viewport: ViewportSize) => {
        switch (viewport) {
            case "desktop":
                return "w-full max-w-[1200px] mx-auto";
            case "tablet":
                return "w-[768px] mx-auto border-x";
            case "mobile":
                return "w-[375px] mx-auto border-x";
            default:
                return "w-full max-w-[1200px] mx-auto";
        }
    };

    const zoomScale = zoomLevel / 100;

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex flex-1 items-start justify-center rounded-xl border-2 border-dashed border-muted bg-muted/20 min-h-[600px] p-4 w-full max-w-[1200px] mx-auto">
                <div
                    className={`${getViewportClasses(
                        currentViewport
                    )} transition-[width,max-width,transform] duration-300 ease-in-out h-full min-h-[500px] bg-white rounded-lg shadow-lg border`}
                    style={{
                        transform: `scale(${zoomScale})`,
                        transformOrigin: "top center",
                        backgroundImage: showGrid
                            ? "linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)"
                            : "none",
                        backgroundSize: "20px 20px",
                    }}
                >
                    <div
                        className="p-6 h-full flex flex-col"
                        onClick={() => selectBlock(null)}
                    >
                        <div className="flex flex-col gap-4 flex-1">
                            {blocks.length > 0 && (
                                <>
                                    <div className="text-center mb-4">
                                        <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
                                            {currentBoard?.title || "Untitled Board"}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {blocks.length} Block{blocks.length !== 1 ? "s" : ""}{" "}
                                            hinzugefügt
                                        </p>
                                    </div>
                                    {/* Blöcke werden später mit Grid-Layout angezeigt */}
                                    <div className="space-y-4">
                                        {rootBlocks.map((block) => {
                                            const isSelected = selectedBlockIds.includes(block.id);
                                            return (
                                                <div
                                                    key={block.id}
                                                    tabIndex={0}
                                                    role="button"
                                                    className={cn(
                                                        "p-4 border rounded-lg bg-background relative",
                                                        "cursor-pointer transition-all",
                                                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                                        isSelected &&
                                                        "ring-2 ring-primary ring-offset-2 border-primary"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const isModifierKey = e.metaKey || e.ctrlKey;
                                                        selectBlock(block.id, { additive: isModifierKey });
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.stopPropagation();
                                                            if (e.key === " ") {
                                                                e.preventDefault();
                                                            }
                                                            const isModifierKey = e.metaKey || e.ctrlKey;
                                                            selectBlock(block.id, { additive: isModifierKey });
                                                        }
                                                    }}
                                                >

                                                    {isSelected && block.type !== "text" && (
                                                        <BlockDeleteButton blockId={block.id} />
                                                    )}

                                                    {block.type === "grid" ? (
                                                        <GridBlock block={block} isSelected={isSelected} />
                                                    ) : block.type === "text" ? (
                                                        <TextBlock block={block} isSelected={isSelected} />
                                                    ) : (
                                                        <>
                                                            <div className="text-sm font-medium mb-2">
                                                                Block: {block.type}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                ID: {block.id}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                            {/* DropArea immer verfügbar, um weitere Blöcke hinzuzufügen */}
                            <DropArea />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
