import { describe, expect, it, vi, beforeEach } from "vitest";

const mockListSkills = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  api: {
    listSkills: mockListSkills,
  },
}));

import { skillListOptions } from "./queries";

describe("skillListOptions", () => {
  beforeEach(() => {
    mockListSkills.mockReset();
  });

  it("passes the query workspace id to the skills API", async () => {
    mockListSkills.mockResolvedValue([]);

    const options = skillListOptions("ws-a");
    const queryFn = options.queryFn;
    if (!queryFn) throw new Error("skillListOptions must provide a queryFn");
    await queryFn({} as never);

    expect(mockListSkills).toHaveBeenCalledWith({ workspace_id: "ws-a" });
  });
});
