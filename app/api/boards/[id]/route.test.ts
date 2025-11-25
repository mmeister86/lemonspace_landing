/**
 * @jest-environment node
 */

// Set env vars before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

import { jest } from "@jest/globals";

// Mock dependencies using aliases
jest.mock("@/lib/supabase/server", () => ({
    createSupabaseUserContext: jest.fn(),
    createClient: jest.fn(),
}));

jest.mock("@/lib/services/auth-service", () => ({
    createSupabaseUserContext: jest.fn(),
}));

jest.mock("@/lib/services/board-service", () => ({
    getBoard: jest.fn(),
    getBoardByUsernameAndSlug: jest.fn(),
    getBoardByUserIdAndSlug: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
    isUUID: jest.fn().mockReturnValue(true),
    cn: jest.fn(),
}));

jest.mock("@/lib/api/error-handlers", () => ({
    handleError: jest.fn((err) => {
        console.error(err);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }),
    validateBoardId: jest.fn().mockReturnValue({ isValid: true }),
    handleAuthError: jest.fn().mockReturnValue(null),
}));

// Import dependencies using ES6 imports
import { NextRequest } from "next/server";
import { createSupabaseUserContext } from "@/lib/services/auth-service";
import { GET } from "./route";

describe("GET /api/boards/[id]", () => {
    const mockBoardId = "test-board-id";
    const mockUserId = "test-user-id";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSupabase: any = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createSupabaseUserContext as jest.MockedFunction<typeof createSupabaseUserContext>).mockResolvedValue({
            supabase: mockSupabase,
            user: {
                id: mockUserId,
                app_metadata: {},
                user_metadata: {},
                aud: "authenticated",
                created_at: new Date().toISOString(),
                email: "test@example.com",
                phone: "",
                email_confirmed_at: new Date().toISOString(),
                phone_confirmed_at: null,
                role: "authenticated",
                updated_at: new Date().toISOString()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            error: null,
        });
    });

    it("should correctly persist blocks in the first column (containerId 0)", async () => {
        // Mock board data
        const mockBoard = {
            id: mockBoardId,
            user_id: mockUserId,
            title: "Test Board",
            slug: "test-board",
            grid_config: { columns: 12, gap: 4 },
            visibility: "private",
            blocks: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // Mock getBoard to return the board
        const boardServiceMock = jest.requireMock("@/lib/services/board-service") as {
            getBoard: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
        };
        boardServiceMock.getBoard.mockResolvedValue(mockBoard);

        // Mock board elements query response
        const mockElements = [
            {
                id: "block-1",
                board_id: mockBoardId,
                type: "text",
                content: { text: "Hello" },
                position_x: 0,
                position_y: 0,
                width: 100,
                height: 100,
                z_index: 0,
                styles: {},
                parent_id: "layout-block-1",
                container_id: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
        ];

        const mockConnections: unknown[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const elementsChain: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            order: (jest.fn() as any).mockResolvedValue({ data: mockElements }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connectionsChain: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            order: (jest.fn() as any).mockResolvedValue({ data: mockConnections }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === "board_elements") return elementsChain;
            if (table === "element_connections") return connectionsChain;
            return mockSupabase;
        });

        const req = new NextRequest(`http://localhost/api/boards/${mockBoardId}`, {
            method: "GET",
        });

        const res = await GET(req, { params: Promise.resolve({ id: mockBoardId }) });
        expect(res?.status).toBe(200);

        const data = await res?.json();
        const element = data.data.elements[0];

        expect(element).toBeDefined();
        expect(element.id).toBe("block-1");
        expect(element.containerId).toBe("0");
    });
});
