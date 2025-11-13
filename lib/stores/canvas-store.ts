import { create } from "zustand";
import type { Board, Block } from "@/lib/types/board";

interface CanvasState {
  currentBoard: Board | null;
  blocks: Block[];
  selectedBlockId: string | null;
  showDropArea: boolean;

  // Actions
  setCurrentBoard: (board: Board | null) => void;
  addBlock: (block: Block) => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, updates: Partial<Block>) => void;
  selectBlock: (blockId: string | null) => void;
  setShowDropArea: (show: boolean) => void;
  updateBoardTitle: (title: string) => void;
  updateBoardSlug: (slug: string) => void;
  reset: () => void;
}

const initialState = {
  currentBoard: null,
  blocks: [],
  selectedBlockId: null,
  showDropArea: true,
};

export const useCanvasStore = create<CanvasState>((set) => ({
  ...initialState,

  setCurrentBoard: (board) =>
    set({
      currentBoard: board,
      blocks: board?.blocks || [],
      showDropArea: true, // Always available
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

  selectBlock: (blockId) => set({ selectedBlockId: blockId }),

  setShowDropArea: (show) => set({ showDropArea: show }),

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

  reset: () => set(initialState),
}));
