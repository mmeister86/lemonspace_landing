import { create } from "zustand";
import { temporal } from "zundo";
import { shallow } from "zustand/shallow";
import type { Board, Block } from "@/lib/types/board";
import type { SaveStatus } from "@/lib/services/save-service";

type BoardLoadingState = 'idle' | 'loading' | 'ready' | 'error';

interface CanvasState {
    currentBoard: Board | null;
    blocks: Block[];
    selectedBlockIds: string[];
    clipboard: Block[] | null;
    selectedColumnIndex: number | null;
    showDropArea: boolean;

    // Navigation state
    isNavigating: boolean;
    lastBoardId: string | null;
    boardLoadingState: BoardLoadingState;

    // Save state
    saveStatus: SaveStatus;
    lastSavedAt: Date | null;
    hasUnsavedChanges: boolean;
    saveError: Error | null;
    isAutosaveEnabled: boolean;
    showGrid: boolean;

    // Actions
    setCurrentBoard: (board: Board | null) => void;
    addBlock: (block: Block) => void;
    removeBlock: (blockId: string) => void;
    updateBlock: (blockId: string, updates: Partial<Block>) => void;
    selectBlock: (blockId: string | null, options?: { columnIndex?: number | null, additive?: boolean }) => void;
    selectAllBlocks: () => void;
    copyBlock: () => void;
    cutBlock: () => void;
    pasteBlock: (target?: { parentId?: string; containerId?: string }) => boolean;
    setShowDropArea: (show: boolean) => void;
    setShowGrid: (show: boolean) => void;
    updateBoardTitle: (title: string) => void;
    updateBoardSlug: (slug: string) => void;
    setNavigating: (isNavigating: boolean) => void;
    setLastBoardId: (id: string | null) => void;
    setBoardLoadingState: (state: BoardLoadingState) => void;

    // Save actions
    setSaveStatus: (status: SaveStatus) => void;
    setLastSavedAt: (date: Date | null) => void;
    setHasUnsavedChanges: (hasChanges: boolean) => void;
    setSaveError: (error: Error | null) => void;
    setAutosaveEnabled: (enabled: boolean) => void;
    resetSaveState: () => void;

    reset: () => void;
}

// Define the state that should be tracked by zundo
interface CanvasHistoryState {
    blocks: Block[];
    currentBoard: Board | null;
    // selectedBlockIds is excluded to prevent undo history from tracking sheet open/close
}

const initialState = {
    currentBoard: null,
    blocks: [],
    selectedBlockIds: [],
    selectedColumnIndex: null,
    clipboard: null,
    showDropArea: true,
    showGrid: false,
    isNavigating: false,
    lastBoardId: null,
    boardLoadingState: 'idle' as const,

    // Save state defaults
    saveStatus: 'idle' as SaveStatus,
    lastSavedAt: null,
    hasUnsavedChanges: false,
    saveError: null,
    isAutosaveEnabled: true,
};

export const useCanvasStore = create<CanvasState>()(
    temporal(
        (set, get) => ({
            ...initialState,

            clipboard: null,
            selectedColumnIndex: null,

            setCurrentBoard: (board) =>
                set({
                    currentBoard: board,
                    blocks: board?.blocks || [],
                    showDropArea: true, // Always available
                    // Reset save state when switching boards
                    saveStatus: 'idle',
                    lastSavedAt: null,
                    hasUnsavedChanges: false,
                    saveError: null,
                    selectedBlockIds: [],
                    selectedColumnIndex: null,
                    clipboard: null,
                }),

            addBlock: (block) =>
                set((state) => {
                    const newBlocks = [...state.blocks, block];
                    return {
                        blocks: newBlocks,
                        currentBoard: state.currentBoard
                            ? { ...state.currentBoard, blocks: newBlocks }
                            : null,
                        showDropArea: true, // Always available
                    };
                }),

            removeBlock: (blockId) =>
                set((state) => {
                    const newBlocks = state.blocks.filter((b) => b.id !== blockId);
                    return {
                        blocks: newBlocks,
                        currentBoard: state.currentBoard
                            ? { ...state.currentBoard, blocks: newBlocks }
                            : null,
                        selectedBlockIds: state.selectedBlockIds.filter(id => id !== blockId),
                        selectedColumnIndex:
                            state.selectedBlockIds.includes(blockId) && state.selectedBlockIds.length === 1 ? null : state.selectedColumnIndex,
                        showDropArea: true, // Always available
                    };
                }),

            updateBlock: (blockId, updates) =>
                set((state) => {
                    const newBlocks = state.blocks.map((b) =>
                        b.id === blockId ? { ...b, ...updates } : b
                    );
                    return {
                        blocks: newBlocks,
                        currentBoard: state.currentBoard
                            ? { ...state.currentBoard, blocks: newBlocks }
                            : null,
                        showDropArea: true, // Always available
                    };
                }),

            selectBlock: (blockId, options = {}) => set((state) => {
                const { columnIndex = null, additive = false } = options;

                if (blockId === null) {
                    return {
                        selectedBlockIds: [],
                        selectedColumnIndex: null
                    };
                }

                let newSelectedIds = state.selectedBlockIds;

                if (additive) {
                    if (newSelectedIds.includes(blockId)) {
                        // Deselect if already selected
                        newSelectedIds = newSelectedIds.filter(id => id !== blockId);
                    } else {
                        // Add to selection
                        newSelectedIds = [...newSelectedIds, blockId];
                    }
                } else {
                    // Replace selection
                    newSelectedIds = [blockId];
                }

                return {
                    selectedBlockIds: newSelectedIds,
                    selectedColumnIndex: newSelectedIds.length === 1 ? columnIndex : null
                };
            }),

            selectAllBlocks: () => set((state) => ({
                selectedBlockIds: state.blocks.map(b => b.id),
                selectedColumnIndex: null
            })),

            copyBlock: () => set((state) => {
                if (state.selectedBlockIds.length === 0) return {};
                const blocksToCopy = state.blocks.filter(b => state.selectedBlockIds.includes(b.id));
                if (blocksToCopy.length === 0) return {};
                return { clipboard: JSON.parse(JSON.stringify(blocksToCopy)) };
            }),

            cutBlock: () => set((state) => {
                if (state.selectedBlockIds.length === 0) return {};
                const blocksToCut = state.blocks.filter(b => state.selectedBlockIds.includes(b.id));
                if (blocksToCut.length === 0) return {};

                const newBlocks = state.blocks.filter(b => !state.selectedBlockIds.includes(b.id));
                return {
                    clipboard: JSON.parse(JSON.stringify(blocksToCut)),
                    blocks: newBlocks,
                    currentBoard: state.currentBoard
                        ? { ...state.currentBoard, blocks: newBlocks }
                        : null,
                    selectedBlockIds: [],
                    selectedColumnIndex: null,
                };
            }),

            pasteBlock: (target) => {
                const state = get();
                if (!state.clipboard || state.clipboard.length === 0) return false;

                let parentId: string | undefined;
                let containerId: string | undefined;

                if (target) {
                    parentId = target.parentId;
                    containerId = target.containerId;
                } else {
                    // If no explicit target, check selection
                    // Only allow pasting into a column if exactly one block (grid) is selected
                    if (state.selectedBlockIds.length === 1 && state.selectedColumnIndex !== null) {
                        // Pasting into a selected column
                        parentId = state.selectedBlockIds[0];
                        containerId = state.selectedColumnIndex.toString();
                    } else {
                        // Cannot paste if no column selected and no target provided
                        // Or just paste at root? For now, follow existing logic: return false
                        return false;
                    }
                }

                // Create new blocks from clipboard
                const newBlocksToAdd = state.clipboard.map(block => ({
                    ...block,
                    id: crypto.randomUUID(),
                    parentId,
                    containerId,
                }));

                const newBlocks = [...state.blocks, ...newBlocksToAdd];
                set({
                    blocks: newBlocks,
                    currentBoard: state.currentBoard
                        ? { ...state.currentBoard, blocks: newBlocks }
                        : null,
                });
                return true;
            },

            setShowDropArea: (show) => set({ showDropArea: show }),

            setShowGrid: (show) => set({ showGrid: show }),

            updateBoardTitle: (title) =>
                set((state) => ({
                    currentBoard: state.currentBoard
                        ? { ...state.currentBoard, title }
                        : null,
                })),

            updateBoardSlug: (slug) =>
                set((state) => ({
                    currentBoard: state.currentBoard ? { ...state.currentBoard, slug } : null,
                })),

            setNavigating: (isNavigating) => set({ isNavigating }),

            setLastBoardId: (id) => set({ lastBoardId: id }),

            setBoardLoadingState: (boardLoadingState: BoardLoadingState) => set({ boardLoadingState }),

            setSaveStatus: (status) => set({ saveStatus: status }),
            setLastSavedAt: (date) => set({ lastSavedAt: date }),
            setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
            setSaveError: (error) => set({ saveError: error }),
            setAutosaveEnabled: (enabled) => set({ isAutosaveEnabled: enabled }),
            resetSaveState: () => set({
                saveStatus: 'idle',
                lastSavedAt: null,
                hasUnsavedChanges: false,
                saveError: null,
            }),

            reset: () => set(initialState),
        }),
        {
            // Track only the state parts we need for undo/redo
            partialize: (state): CanvasHistoryState => ({
                blocks: state.blocks,
                currentBoard: state.currentBoard,
                // selectedBlockId is excluded to prevent undo history from tracking sheet open/close
            }),
            // No need for onSave handler - the store actions already sync blocks with currentBoard
            // Limit history size to prevent memory issues
            limit: 50,
            // Use shallow equality to prevent excessive history entries
            equality: shallow,
        }
    )
);

// Export the temporal store for undo/redo functionality
export const useCanvasHistory = () => useCanvasStore.temporal.getState();

// Import React if not already imported
import React from 'react';

// Create a reactive hook for accessing temporal state
export const useCanvasTemporal = <T>(
    selector: (state: ReturnType<typeof useCanvasHistory>) => T,
    equality?: (a: T, b: T) => boolean,
): T => {
    const [state, setState] = React.useState<T>(() => {
        const historyState = useCanvasStore.temporal.getState();
        return selector(historyState);
    });

    React.useEffect(() => {
        // Check if React is available
        if (typeof React === 'undefined') {
            console.warn('React is not available. useCanvasTemporal hook requires React.');
            return;
        }

        const unsubscribe = useCanvasStore.temporal.subscribe(() => {
            const historyState = useCanvasStore.temporal.getState();
            const newState = selector(historyState);
            if (!equality || !equality(state, newState)) {
                setState(newState);
            }
        });

        return unsubscribe;
    }, [selector, equality, state]);

    return state;
};
