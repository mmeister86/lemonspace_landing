import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { BoardSaveService } from "@/lib/services/save-service";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function useSaveService() {
    const t = useTranslations("builder");
    const currentBoard = useCanvasStore((state) => state.currentBoard);
    const blocks = useCanvasStore((state) => state.blocks);

    // Store actions
    const setSaveStatus = useCanvasStore((state) => state.setSaveStatus);
    const setLastSavedAt = useCanvasStore((state) => state.setLastSavedAt);
    const setHasUnsavedChanges = useCanvasStore((state) => state.setHasUnsavedChanges);
    const setSaveError = useCanvasStore((state) => state.setSaveError);

    // Service instance ref
    const saveServiceRef = useRef<BoardSaveService | null>(null);

    // Track previous blocks to detect changes
    const prevBlocksRef = useRef<string>("");

    const queryClient = useQueryClient();

    // Initialize service when board changes
    useEffect(() => {
        if (!currentBoard?.id) {
            saveServiceRef.current = null;
            return;
        }

        // Create new service instance for this board
        const service = new BoardSaveService(currentBoard.id);

        // Initialize with current state for rollback
        service.initializeState({ blocks: blocks });

        saveServiceRef.current = service;

        // Initialize prevBlocks with current blocks to avoid immediate save on load
        prevBlocksRef.current = JSON.stringify(blocks);

        // Subscribe to service state changes
        const unsubscribe = service.subscribe((state) => {
            setSaveStatus(state.status);
            setLastSavedAt(state.lastSavedAt || null);
            setHasUnsavedChanges(state.hasUnsavedChanges);
            setSaveError(state.error || null);

            // Invalidate query on successful save so that subsequent loads fetch fresh data
            if (state.status === "saved") {
                const latestBoard = useCanvasStore.getState().currentBoard;
                if (latestBoard) {
                    // Invalidate both ID and Slug based queries since we don't know which one was used
                    // queryClient.invalidateQueries({ queryKey: ["board", latestBoard.id] });
                    // if (latestBoard.slug) {
                    //    queryClient.invalidateQueries({ queryKey: ["board", latestBoard.slug] });
                    // }

                    // Also invalidate lists as metadata might have changed
                    // queryClient.invalidateQueries({ queryKey: ["boards"] });
                    // queryClient.invalidateQueries({ queryKey: ["recent-boards"] });
                }
            }

            // Show toast on error
            if (state.status === "error" && state.error) {
                toast.error(t("error.saveFailed"), {
                    description: state.error.message,
                    action: {
                        label: t("error.rollback"),
                        onClick: () => {
                            const currentBoardState = useCanvasStore.getState().currentBoard;
                            if (state.lastSavedState && currentBoardState) {
                                // Revert to last saved state
                                useCanvasStore.getState().setCurrentBoard({
                                    ...currentBoardState,
                                    ...state.lastSavedState,
                                });
                                // Also update blocks if they are part of the state
                                // Note: setCurrentBoard updates blocks too if they are in the board object
                                toast.info(t("info.rollbackComplete"));
                            }
                        }
                    }
                });
            }
        });

        return () => {
            unsubscribe();
            // Attempt to flush pending changes when unmounting/switching boards?
            // Ideally yes, but we need to be careful about async operations during unmount.
            // For now, we rely on the service's internal state.
        };
    }, [currentBoard?.id, setSaveStatus, setLastSavedAt, setHasUnsavedChanges, setSaveError, t, queryClient]);

    const isAutosaveEnabled = useCanvasStore((state) => state.isAutosaveEnabled);

    // Watch for changes in blocks and queue them
    useEffect(() => {
        if (!saveServiceRef.current || !currentBoard || !isAutosaveEnabled) return;

        const currentBlocksJson = JSON.stringify(blocks);

        // Only queue if blocks actually changed
        if (currentBlocksJson !== prevBlocksRef.current) {
            saveServiceRef.current.queueChange({ blocks });
            prevBlocksRef.current = currentBlocksJson;
        }
    }, [blocks, currentBoard, isAutosaveEnabled]);

    // Expose flush method
    const flush = async () => {
        if (saveServiceRef.current) {
            try {
                // Force queue current state to ensure it's saved even if autosave is disabled
                // or if no changes were detected yet (e.g. "Always Save" requirement)
                saveServiceRef.current.queueChange({ blocks });

                // Update prevBlocksRef to avoid double-save if autosave is re-enabled
                prevBlocksRef.current = JSON.stringify(blocks);

                await saveServiceRef.current.flush();
                return true;
            } catch (error) {
                // Error is already handled by the subscription
                return false;
            }
        }
        return true;
    };

    return {
        flush,
    };
}
