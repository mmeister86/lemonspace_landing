import { transformDBElementToBuilder } from "./board-transformers";
import type { DBBoardElement } from "@/lib/types/board-api";

describe("transformDBElementToBuilder", () => {
    it("should transform DB element to builder element including parentId and containerId", () => {
        const dbElement: DBBoardElement = {
            id: "test-id",
            board_id: "board-id",
            type: "text",
            content: { text: "hello" },
            position_x: 10,
            position_y: 20,
            width: 100,
            height: 50,
            z_index: 1,
            styles: {},
            parent_id: "parent-id",
            container_id: "0",
            created_at: "2023-01-01T00:00:00Z",
            updated_at: "2023-01-01T00:00:00Z",
        };

        const result = transformDBElementToBuilder(dbElement);

        expect(result).toEqual({
            id: "test-id",
            type: "text",
            content: { text: "hello" },
            position: { x: 10, y: 20 },
            size: { width: 100, height: 50 },
            zIndex: 1,
            styles: {},
            parentId: "parent-id",
            containerId: "0",
            createdAt: "2023-01-01T00:00:00Z",
            updatedAt: "2023-01-01T00:00:00Z",
        });
    });

    it("should handle missing parentId and containerId", () => {
        const dbElement: DBBoardElement = {
            id: "test-id",
            board_id: "board-id",
            type: "text",
            content: {},
            position_x: 0,
            position_y: 0,
            width: 0,
            height: 0,
            z_index: 0,
            styles: {},
            parent_id: null,
            container_id: null,
            created_at: "2023-01-01T00:00:00Z",
            updated_at: "2023-01-01T00:00:00Z",
        };

        const result = transformDBElementToBuilder(dbElement);

        expect(result.parentId).toBeUndefined();
        expect(result.containerId).toBeUndefined();
    });
});
