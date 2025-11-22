
import { jest } from "@jest/globals";
import { syncBoardElements } from "./board-service";
import { SupabaseClient } from "@supabase/supabase-js";

describe("board-service", () => {
    describe("syncBoardElements", () => {
        let mockSupabase: any;
        let mockFrom: any;
        let mockSelect: any;
        let mockEq: any;
        let mockDelete: any;
        let mockIn: any;
        let mockUpsert: any;

        beforeEach(() => {
            mockUpsert = jest.fn().mockResolvedValue({ error: null });
            mockIn = jest.fn().mockResolvedValue({ error: null });
            mockDelete = jest.fn().mockReturnValue({ in: mockIn });
            mockEq = jest.fn().mockReturnValue({
                data: [],
                error: null,
            });
            mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
            mockFrom = jest.fn().mockReturnValue({
                select: mockSelect,
                delete: mockDelete,
                upsert: mockUpsert,
            });

            mockSupabase = {
                from: mockFrom,
            } as unknown as SupabaseClient;
        });

        it("should assign z_index based on array order", async () => {
            const boardId = "test-board-id";
            const blocks = [
                { id: "block-1", type: "text", data: {} },
                { id: "block-2", type: "image", data: {} },
                { id: "block-3", type: "button", data: {} },
            ] as any[];

            await syncBoardElements(mockSupabase, boardId, blocks);

            expect(mockUpsert).toHaveBeenCalledTimes(1);
            const upsertedData = mockUpsert.mock.calls[0][0];

            expect(upsertedData).toHaveLength(3);
            expect(upsertedData[0].id).toBe("block-1");
            expect(upsertedData[0].z_index).toBe(0);

            expect(upsertedData[1].id).toBe("block-2");
            expect(upsertedData[1].z_index).toBe(1);

            expect(upsertedData[2].id).toBe("block-3");
            expect(upsertedData[2].z_index).toBe(2);
        });
    });
});
