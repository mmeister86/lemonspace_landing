/**
 * @jest-environment node

import { PUT } from "./route";
import { createSupabaseUserContext } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { jest } from "@jest/globals";

// Mock dependencies
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseUserContext: jest.fn(),
}));

describe("PUT /api/boards/[id]", () => {
  const mockBoardId = "test-board-id";
  const mockUserId = "test-user-id";

  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    update: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createSupabaseUserContext as jest.Mock).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: mockUserId },
    });
  });

  it("should return 401 if user is not authenticated", async () => {
    (createSupabaseUserContext as jest.Mock).mockResolvedValue({
      supabase: mockSupabase,
      user: null,
    });

    const req = new NextRequest(`http://localhost/api/boards/${mockBoardId}`, {
      method: "PUT",
      body: JSON.stringify({ title: "New Title" }),
    });

    const res = await PUT(req, { params: { id: mockBoardId } });
    expect(res.status).toBe(401);
  });

  it("should return 403 if user is not the owner", async () => {
    // Mock board lookup returning a board owned by someone else
    mockSupabase.single.mockResolvedValue({
      data: { user_id: "other-user" },
      error: null,
    });

    const req = new NextRequest(`http://localhost/api/boards/${mockBoardId}`, {
      method: "PUT",
      body: JSON.stringify({ title: "New Title" }),
    });

    const res = await PUT(req, { params: { id: mockBoardId } });
    expect(res.status).toBe(403);
  });

  it("should update the board successfully", async () => {
    // Mock board lookup success
    mockSupabase.single.mockResolvedValue({
      data: { user_id: mockUserId, title: "Old Title" },
      error: null,
    });

    // Mock update success
    mockSupabase.single.mockResolvedValueOnce({
      data: { user_id: mockUserId, title: "New Title" },
      error: null,
    });

    const req = new NextRequest(`http://localhost/api/boards/${mockBoardId}`, {
      method: "PUT",
      body: JSON.stringify({ title: "New Title" }),
    });

    const res = await PUT(req, { params: { id: mockBoardId } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.data.title).toBe("New Title");
  });

  it("should validate input payload", async () => {
    // Mock board lookup success
    mockSupabase.single.mockResolvedValue({
      data: { user_id: mockUserId },
      error: null,
    });

    const req = new NextRequest(`http://localhost/api/boards/${mockBoardId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: "", // Invalid: empty title
      }),
    });

    const res = await PUT(req, { params: { id: mockBoardId } });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Validation error");
  });
});
*/
