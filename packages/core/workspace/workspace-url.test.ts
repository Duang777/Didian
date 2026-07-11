import { describe, expect, it } from "vitest";
import { workspaceUrlHost } from "./workspace-url";

describe("workspaceUrlHost", () => {
  it("returns the host of a full app URL", () => {
    expect(workspaceUrlHost("https://didian.example.com")).toBe(
      "didian.example.com",
    );
  });

  it("ignores scheme, path, and trailing slash", () => {
    expect(workspaceUrlHost("https://didian.example.com/")).toBe(
      "didian.example.com",
    );
    expect(workspaceUrlHost("http://didian.example.com/app/onboarding")).toBe(
      "didian.example.com",
    );
  });

  it("preserves a non-default port", () => {
    expect(workspaceUrlHost("https://my.host:3000")).toBe("my.host:3000");
  });

  it("accepts a bare host without a scheme", () => {
    expect(workspaceUrlHost("didian.example.com")).toBe("didian.example.com");
    expect(workspaceUrlHost("didian.example.com/path")).toBe(
      "didian.example.com",
    );
  });

  it("falls back to the brand host when no app URL is configured", () => {
    expect(workspaceUrlHost("")).toBe("didian.ai");
    expect(workspaceUrlHost("   ")).toBe("didian.ai");
    expect(workspaceUrlHost(null)).toBe("didian.ai");
    expect(workspaceUrlHost(undefined)).toBe("didian.ai");
  });
});
