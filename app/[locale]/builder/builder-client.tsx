
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import AuthGuard from "./components/AuthGuard";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
    ViewportSwitcher,
    type ViewportSize,
} from "@/components/viewport-switcher";
import Canvas from "./components/Canvas";
import { BuilderMenubar } from "./components/BuilderMenubar";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { RightSidebar } from "./components/RightSidebar";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import type { Block, BlockType } from "@/lib/types/board";
import { BlockDeleteDialog } from "./components/BlockDeleteDialog";
import { useUser } from "@/lib/contexts/user-context";
import { useBoards, useCreateBoard, useUpdateBoard } from "@/lib/hooks/use-boards";
import { Spinner } from "@/components/ui/spinner";
import { useSaveService } from "@/lib/hooks/use-save-service";
import { toast } from "sonner";

const VALID_BLOCK_TYPES: BlockType[] = [
    "text",
    "heading",
    "image",
    "button",
    "spacer",
    "video",
    "form",
    "pricing",
    "testimonial",
    "accordion",
    "code",
    "grid",
] as const;

export function BuilderClient() {
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations("builder");
    const [currentViewport, setCurrentViewport] =
        useState<ViewportSize>("desktop");
    const [zoomLevel, setZoomLevel] = useState(100);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const addBlock = useCanvasStore((state) => state.addBlock);
    const selectedBlockId = useCanvasStore((state) => state.selectedBlockId);
    const currentBoard = useCanvasStore((state) => state.currentBoard);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _setCurrentBoard = useCanvasStore((state) => state.setCurrentBoard);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const blocks = useCanvasStore((state) => state.blocks);
    const isNavigating = useCanvasStore((state) => state.isNavigating);
    const boardLoadingState = useCanvasStore((state) => state.boardLoadingState);

    const { user } = useUser();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _boards, isLoading: _boardsLoading } = useBoards(user?.id || null);
    const createBoardMutation = useCreateBoard();
    const updateBoardMutation = useUpdateBoard();

    // Initialize save service
    const { flush: flushPendingSave } = useSaveService();

    // Refs to avoid stale closures and infinite loops
    const createBoardMutationRef = useRef(createBoardMutation);
    const updateBoardMutationRef = useRef(updateBoardMutation);

    // Keep refs up to date
    useEffect(() => {
        createBoardMutationRef.current = createBoardMutation;
    }, [createBoardMutation]);

    useEffect(() => {
        updateBoardMutationRef.current = updateBoardMutation;
    }, [updateBoardMutation]);

    // NOTE: Board initialization is now handled by BoardBuilderPage component
    // BuilderClient should only handle the UI and interactions, not board loading

    // URL-Synchronisation bei Board-Wechsel (nur bei Slug-Änderungen)
    const previousSlugRef = useRef<string | null>(null);
    const currentBoardSlug = currentBoard?.slug;

    useEffect(() => {
        if (isNavigating || boardLoadingState === 'loading') {
            console.log('[BuilderClient] Skipping URL sync during navigation/loading', {
                isNavigating,
                boardLoadingState,
                currentBoardSlug
            });
            return;
        }

        // Only update URL if the board's slug itself changed
        // (e.g., user renamed the slug via BoardSlugDialog)
        const pathSlug = pathname.split('/').filter(Boolean).pop();

        // Log for debugging the exact path comparison
        console.log('[BuilderClient] Path comparison debug', {
            pathname,
            extractedPathSlug: pathSlug,
            previousSlug: previousSlugRef.current,
            currentBoardSlug,
            pathSlugIsEmpty: !pathSlug
        });

        // Ensure pathSlug is computed and non-empty
        if (!pathSlug) {
            console.log('[BuilderClient] PathSlug is empty, updating previousSlugRef and skipping');
            previousSlugRef.current = currentBoardSlug || null;
            return;
        }

        // Set slugChanged by comparing previousSlugRef.current === pathSlug
        // and check previousSlugRef.current !== currentBoardSlug
        const slugChanged = previousSlugRef.current === pathSlug &&
            previousSlugRef.current !== currentBoardSlug;

        console.log('[BuilderClient] Slug change determination', {
            slugChanged,
            pathMatchesPrevious: previousSlugRef.current === pathSlug,
            previousDiffersFromCurrent: previousSlugRef.current !== currentBoardSlug
        });
        if (slugChanged) {
            console.log('[BuilderClient] URL sync needed - slug changed', {
                pathSlug,
                currentBoardSlug,
                previousSlug: previousSlugRef.current
            });
            router.replace(`/builder/${currentBoardSlug}`);
        }

        previousSlugRef.current = currentBoardSlug || null;
    }, [currentBoardSlug, pathname, router, isNavigating, boardLoadingState]);

    // Auto-Save is now handled by useSaveService hook

    // Handle retry with save and soft refresh
    const handleRetry = async () => {
        const saveSuccessful = await flushPendingSave();

        if (saveSuccessful) {
            console.log('[BuilderClient] Save successful, performing soft refresh');
            router.refresh();
        } else {
            console.error('[BuilderClient] Save failed, showing error to user');
            // Could show a toast or notification here
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const isOverCanvas = over.id === "canvas-drop-area";
        const isOverColumn = over.data?.current?.type === "column";

        if (isOverCanvas || isOverColumn) {
            if (!active || !active.data) {
                console.warn(
                    "[Canvas] Invalid drag event: active or active.data is missing",
                    { active }
                );
                return;
            }

            if (!active.data.current) {
                console.warn(
                    "[Canvas] Invalid drag event: active.data.current is missing",
                    { active }
                );
                return;
            }

            const current = active.data.current;

            // Determine parentId and containerId based on drop target
            let parentId: string | undefined;
            let containerId: string | undefined;

            if (isOverColumn) {
                parentId = over.data.current?.blockId;
                containerId = over.data.current?.columnIndex?.toString();
            }
            // If isOverCanvas, parentId and containerId remain undefined (root level)

            // Check if we are moving an existing block
            // The active.id for existing blocks is just the block ID
            // The active.id for new blocks from sidebar is "block-type" or similar
            const existingBlock = blocks.find(b => b.id === active.id);

            if (existingBlock) {
                // Move existing block
                // We need to update the block's parentId and containerId
                // We use a custom action or updateBlock
                // Since updateBlock takes Partial<Block>, we can use it
                useCanvasStore.getState().updateBlock(existingBlock.id, {
                    parentId,
                    containerId
                });
            } else {
                // Create new block
                let validatedType: BlockType = "text";
                if (
                    typeof current.type === "string" &&
                    VALID_BLOCK_TYPES.includes(current.type as BlockType)
                ) {
                    validatedType = current.type as BlockType;
                } else if (current.type !== undefined) {
                    console.warn(
                        `[Canvas] Invalid block type "${current.type}", defaulting to "text"`,
                        { current }
                    );
                }

                let validatedData: Record<string, unknown> = {};
                if (
                    current.data !== null &&
                    typeof current.data === "object" &&
                    !Array.isArray(current.data)
                ) {
                    validatedData = current.data as Record<string, unknown>;
                } else if (current.data !== undefined) {
                    console.warn(
                        `[Canvas] Invalid block data, expected object but got ${typeof current.data}, defaulting to {}`,
                        { current }
                    );
                }

                const newBlock: Block = {
                    id: crypto.randomUUID(),
                    type: validatedType,
                    data: validatedData,
                    parentId,
                    containerId,
                };

                addBlock(newBlock);
            }
        }
    };

    const copyBlock = useCanvasStore((state) => state.copyBlock);
    const cutBlock = useCanvasStore((state) => state.cutBlock);
    const pasteBlock = useCanvasStore((state) => state.pasteBlock);
    const clipboard = useCanvasStore((state) => state.clipboard);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            const tagName = target.tagName.toLowerCase();
            const isInput =
                tagName === "input" ||
                tagName === "textarea" ||
                tagName === "select" ||
                target.contentEditable === "true" ||
                target.contentEditable === "plaintext-only";

            if (isInput) return;

            // Delete
            if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockId) {
                e.preventDefault();
                setDeleteDialogOpen(true);
                return;
            }

            // Copy (Cmd/Ctrl + C)
            if ((e.metaKey || e.ctrlKey) && e.key === "c") {
                if (selectedBlockId) {
                    e.preventDefault();
                    copyBlock();
                    toast.success(t("toast.copySuccess"));
                }
                return;
            }

            // Cut (Cmd/Ctrl + X)
            if ((e.metaKey || e.ctrlKey) && e.key === "x") {
                if (selectedBlockId) {
                    e.preventDefault();
                    cutBlock();
                    toast.success(t("toast.cutSuccess"));
                }
                return;
            }

            // Paste (Cmd/Ctrl + V)
            if ((e.metaKey || e.ctrlKey) && e.key === "v") {
                e.preventDefault();
                if (clipboard) {
                    const success = pasteBlock();
                    if (success) {
                        toast.success(t("toast.pasteSuccess"));
                    } else {
                        toast.error(t("toast.pasteError"));
                    }
                }
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedBlockId, clipboard, copyBlock, cutBlock, pasteBlock, t]);

    const renderContent = () => {
        // Show loading state during board transitions
        if (boardLoadingState === 'loading' || isNavigating) {
            return (
                <SidebarInset>
                    <div className="border-b bg-background">
                        <div className="flex items-center justify-between px-4 py-2">
                            <div className="flex items-center gap-2">
                                <SidebarTrigger className="-ml-1" />
                                <Separator
                                    orientation="vertical"
                                    className="mr-2 data-[orientation=vertical]:h-4"
                                />
                                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                            </div>
                            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                        </div>
                    </div>
                    <div className="flex h-[calc(100vh-73px)] items-center justify-center">
                        <div className="text-center space-y-4">
                            <Spinner size="lg" />
                            <p className="text-muted-foreground">{t("loading.board")}</p>
                        </div>
                    </div>
                </SidebarInset>
            );
        }

        // Show error state
        if (boardLoadingState === 'error') {
            return (
                <SidebarInset>
                    <div className="flex h-[calc(100vh-73px)] items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
                                <div className="h-6 w-6 bg-destructive rounded-full" />
                            </div>
                            <p className="text-destructive">{t("error.loadingBoard")}</p>
                            <button
                                onClick={handleRetry}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            >
                                {t("error.retry")}
                            </button>
                        </div>
                    </div>
                </SidebarInset>
            );
        }

        return (
            <SidebarInset className="flex flex-col h-screen overflow-hidden">
                <div className="border-b bg-background shrink-0">
                    <div className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" />
                            <Separator
                                orientation="vertical"
                                className="mr-2 data-[orientation=vertical]:h-4"
                            />
                            <BuilderMenubar
                                zoomLevel={zoomLevel}
                                onZoomChange={setZoomLevel}
                                onSave={flushPendingSave}
                            />
                        </div>
                        <ViewportSwitcher
                            currentViewport={currentViewport}
                            onViewportChange={setCurrentViewport}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={80} minSize={30}>
                            <div className="h-full w-full overflow-auto bg-muted/10">
                                <Canvas currentViewport={currentViewport} zoomLevel={zoomLevel} />
                            </div>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                            <RightSidebar />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </SidebarInset>
        );
    };

    return (
        <AuthGuard>
            <DndContext onDragEnd={handleDragEnd}>
                <SidebarProvider>
                    <AppSidebar />
                    {renderContent()}
                </SidebarProvider>
                <BlockDeleteDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    blockId={selectedBlockId}
                />
            </DndContext>
        </AuthGuard>
    );
}

export default BuilderClient;
