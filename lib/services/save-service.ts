import { updateBoardViaAPI } from "./api-board-service";
import type { Board } from "@/lib/types/board";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type SaveState = {
    status: SaveStatus;
    lastSavedAt?: Date;
    error?: Error;
    hasUnsavedChanges: boolean;
};

type SaveListener = (state: SaveState) => void;

export class BoardSaveService {
    private boardId: string;
    private pendingChanges: Partial<Board> = {};
    private status: SaveStatus = "idle";
    private lastSavedAt?: Date;
    private error?: Error;
    private listeners: Set<SaveListener> = new Set();
    private saveTimeout: NodeJS.Timeout | null = null;
    private isRequestInFlight = false;
    private DEBOUNCE_MS = 1000; // 1 second debounce
    private MAX_RETRIES = 3;
    private BACKOFF_BASE = 1000;

    constructor(boardId: string) {
        this.boardId = boardId;
    }

    /**
     * Queue changes to be saved.
     * Merges new changes with existing pending changes.
     * Resets the debounce timer.
     */
    public queueChange(changes: Partial<Board>) {
        this.pendingChanges = { ...this.pendingChanges, ...changes };
        this.status = "idle"; // Reset status to idle (or maybe 'unsaved' if we had that)
        this.error = undefined;
        this.notifyListeners();

        this.scheduleSave();
    }

    /**
     * Force an immediate save of any pending changes.
     * Cancels any pending debounce timer.
     */
    public async flush(): Promise<void> {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        return this.performSave();
    }

    /**
     * Subscribe to state changes.
     * Returns a cleanup function.
     */
    public subscribe(listener: SaveListener): () => void {
        this.listeners.add(listener);
        // Immediately notify with current state
        listener(this.getState());
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Get current state
     */
    public getState(): SaveState {
        return {
            status: this.status,
            lastSavedAt: this.lastSavedAt,
            error: this.error,
            hasUnsavedChanges: Object.keys(this.pendingChanges).length > 0,
        };
    }

    private scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            // Initiate a background save with retry logic
            this.performSave(true, 0);
        }, this.DEBOUNCE_MS);
    }

    private async performSave(isBackground: boolean = true, retryCount: number = 0): Promise<void> {
        // If nothing to save, return
        if (Object.keys(this.pendingChanges).length === 0) {
            return;
        }

        if (this.isRequestInFlight) {
            // If a request is already in flight, we just wait.
            // The pending changes are still there (or new ones added).
            // We should reschedule save to check again later?
            // Or rely on the previous request finishing to trigger a check?
            // Let's reschedule to be safe.
            this.scheduleSave();
            return;
        }

        this.isRequestInFlight = true;
        this.status = "saving";
        this.notifyListeners();

        // Capture changes to save
        // Simplified approach:
        // Take all pending changes. Clear pending changes.
        // If save fails, put them back.
        // If user made NEW changes to same fields while saving, we need to be careful.

        // Let's try:
        // 1. Copy pendingChanges to `changesInFlight`.
        // 2. Clear `pendingChanges`.
        // 3. If user types, `pendingChanges` gets new data.
        // 4. Save `changesInFlight`.
        // 5. If error, merge `changesInFlight` back into `pendingChanges` (careful not to overwrite newer changes).

        const changesInFlight = { ...this.pendingChanges };
        this.pendingChanges = {};

        try {
            await updateBoardViaAPI(this.boardId, changesInFlight);

            this.status = "saved";
            this.lastSavedAt = new Date();
            this.error = undefined;

            // If there are new pending changes that happened while we were saving, schedule another save
            if (Object.keys(this.pendingChanges).length > 0) {
                this.scheduleSave();
            }
        } catch (err) {
            console.error(`Save failed (attempt ${retryCount + 1}):`, err);

            // Restore changes that failed to save, but respect newer changes
            this.pendingChanges = {
                ...changesInFlight, // Old changes
                ...this.pendingChanges, // New changes overwrite old ones
            };

            // Retry logic for background saves
            if (isBackground && retryCount < this.MAX_RETRIES) {
                const delay = this.BACKOFF_BASE * Math.pow(2, retryCount);
                this.isRequestInFlight = false; // Reset flag so retry can run

                // Schedule retry
                this.saveTimeout = setTimeout(() => {
                    this.performSave(true, retryCount + 1);
                }, delay);

                // Status remains 'saving' if retrying.
                return;
            }

            this.status = "error";
            this.error = err instanceof Error ? err : new Error("Unknown error during save");

            // If it's not a background save (e.g., flush), re-throw the error
            if (!isBackground) {
                throw this.error;
            }
        } finally {
            // Only reset flag if we are not retrying (retrying handles it above by returning early)
            // This block runs for success or final failure (max retries reached or not background save).
            this.isRequestInFlight = false;
            this.notifyListeners();
        }
    }

    private notifyListeners() {
        const state = this.getState();
        this.listeners.forEach((listener) => listener(state));
    }
}
