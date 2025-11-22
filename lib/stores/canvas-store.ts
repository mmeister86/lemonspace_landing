import { create } from "zustand";
import { temporal } from "zundo";
import { shallow } from "zustand/shallow";
import type { Board, Block } from "@/lib/types/board";
import type { SaveStatus } from "@/lib/services/save-service";

type BoardLoadingState = 'idle' | 'loading' | 'ready' | 'error';

interface CanvasState {
    currentBoard: Board | null;
    blocks: Block[];
    selectedBlockId: string | null;
    clipboard: Block | null;
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
    selectBlock: (blockId: string | null, columnIndex?: number | null) => void;
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
    // selectedBlockId is excluded to prevent undo history from tracking sheet open/close
}

const initialState = {
    currentBoard: null,
    blocks: [],
    selectedBlockId: null,
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
                    selectedBlockId: null,
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
                        selectedBlockId:
                            state.selectedBlockId === blockId ? null : state.selectedBlockId,
                        selectedColumnIndex:
                            state.selectedBlockId === blockId ? null : state.selectedColumnIndex,
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

            selectBlock: (blockId, columnIndex = null) => set({
                selectedBlockId: blockId,
                selectedColumnIndex: columnIndex
            }),

            copyBlock: () => set((state) => {
                if (!state.selectedBlockId) return {};
                const blockToCopy = state.blocks.find(b => b.id === state.selectedBlockId);
                if (!blockToCopy) return {};
                return { clipboard: JSON.parse(JSON.stringify(blockToCopy)) };
            }),

            cutBlock: () => set((state) => {
                if (!state.selectedBlockId) return {};
                const blockToCut = state.blocks.find(b => b.id === state.selectedBlockId);
                if (!blockToCut) return {};

                const newBlocks = state.blocks.filter(b => b.id !== state.selectedBlockId);
                return {
                    clipboard: JSON.parse(JSON.stringify(blockToCut)),
                    blocks: newBlocks,
                    currentBoard: state.currentBoard
                        ? { ...state.currentBoard, blocks: newBlocks }
                        : null,
                    selectedBlockId: null,
                    selectedColumnIndex: null,
                };
            }),

            pasteBlock: (target) => {
                const state = get();
                if (!state.clipboard) return false;

                let parentId: string | undefined;
                let containerId: string | undefined;

                if (target) {
                    parentId = target.parentId;
                    containerId = target.containerId;
                } else {
                    // If no explicit target, check selection
                    if (state.selectedBlockId && state.selectedColumnIndex !== null) {
                        // Pasting into a selected column
                        parentId = state.selectedBlockId;
                        containerId = state.selectedColumnIndex.toString();
                    } else {
                        // Cannot paste if no column selected and no target provided
                        return false;
                    }
                }

                // Create new block from clipboard
                const newBlock: Block = {
                    ...JSON.parse(JSON.stringify(state.clipboard)),
                    id: crypto.randomUUID(),
                    parentId,
                    containerId,
                };

                const newBlocks = [...state.blocks, newBlock];
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
