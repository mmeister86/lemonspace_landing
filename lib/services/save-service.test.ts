/*import { BoardSaveService } from "./save-service";
import { updateBoardViaAPI } from "./api-board-service";
import { jest } from "@jest/globals";

// Mock the API service
jest.mock("./api-board-service", () => ({
  updateBoardViaAPI: jest.fn(),
}));

describe("BoardSaveService", () => {
  let service: BoardSaveService;
  const boardId = "test-board-id";

  beforeEach(() => {
    jest.useFakeTimers();
    service = new BoardSaveService(boardId);
    (updateBoardViaAPI as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should queue changes and debounce save", () => {
    service.queueChange({ title: "New Title" });

    expect(service.getState().hasUnsavedChanges).toBe(true);
    expect(updateBoardViaAPI).not.toHaveBeenCalled();

    // Fast forward time but not enough to trigger debounce
    jest.advanceTimersByTime(500);
    expect(updateBoardViaAPI).not.toHaveBeenCalled();

    // Trigger another change
    service.queueChange({ slug: "new-slug" });

    // Fast forward past the first debounce time, but should be reset by second change
    jest.advanceTimersByTime(600);
    expect(updateBoardViaAPI).not.toHaveBeenCalled();

    // Fast forward to complete debounce
    jest.advanceTimersByTime(500);
    expect(updateBoardViaAPI).toHaveBeenCalledTimes(1);
    expect(updateBoardViaAPI).toHaveBeenCalledWith(boardId, {
      title: "New Title",
      slug: "new-slug",
    });
  });

  it("should flush pending changes immediately", async () => {
    service.queueChange({ title: "Immediate Save" });

    const flushPromise = service.flush();

    expect(service.getState().status).toBe("saving");

    await flushPromise;

    expect(updateBoardViaAPI).toHaveBeenCalledWith(boardId, {
      title: "Immediate Save",
    });
    expect(service.getState().status).toBe("saved");
  });

  it("should handle save errors and retry", async () => {
    // Mock API failure
    (updateBoardViaAPI as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    service.queueChange({ title: "Retry Test" });

    // Trigger save
    jest.advanceTimersByTime(1000);

    // Wait for the async operation in the timeout callback
    await Promise.resolve();

    expect(updateBoardViaAPI).toHaveBeenCalledTimes(1);

    // Should be in saving state (waiting for retry)
    // Note: The service implementation keeps status as 'saving' during retries

    // Fast forward for retry backoff (1s)
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(updateBoardViaAPI).toHaveBeenCalledTimes(2);
  });

  it("should rollback state after max retries", async () => {
    // Mock persistent API failure
    (updateBoardViaAPI as jest.Mock).mockRejectedValue(new Error("Persistent error"));

    const initialState = { title: "Original Title" };
    service.initializeState(initialState);

    service.queueChange({ title: "New Title" });

    // Trigger save
    jest.advanceTimersByTime(1000);
    await Promise.resolve(); // Attempt 1

    // Retry 1 (1s)
    jest.advanceTimersByTime(1000);
    await Promise.resolve(); // Attempt 2

    // Retry 2 (2s)
    jest.advanceTimersByTime(2000);
    await Promise.resolve(); // Attempt 3

    // Retry 3 (4s)
    jest.advanceTimersByTime(4000);
    await Promise.resolve(); // Attempt 4 (Max retries reached)

    expect(service.getState().status).toBe("error");
    expect(service.getState().lastSavedState).toEqual(initialState);
  });
});
*/
