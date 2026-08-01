import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("Atlas AI edit route", () => {
  it("does not invent AI output when no model endpoint is configured", async () => {
    delete process.env.DIDIAN_LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DIDIAN_LLM_BASE_URL;
    delete process.env.OPENAI_BASE_URL;

    const response = await POST(jsonRequest({ instruction: "改短", selectedText: "旧标题", currentMarkdown: "# 旧标题" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Atlas AI edit is not configured" });
  });

  it("returns Markdown from the configured OpenAI-compatible chat endpoint", async () => {
    process.env.DIDIAN_LLM_API_KEY = "test-key";
    process.env.DIDIAN_LLM_BASE_URL = "https://llm.example/v1";
    process.env.DIDIAN_LLM_DEFAULT_MODEL = "test-model";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "```markdown\n## 新标题\n```" } }],
        }),
        { status: 200 },
      ),
    );

    const response = await POST(
      jsonRequest({
        instruction: "改标题",
        selectedText: "旧标题",
        currentMarkdown: "# 旧标题\n\n正文",
        filePath: "mission.md",
        workspaceTitle: "资料包",
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://llm.example/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ markdown: "## 新标题", provider: "llm", model: "test-model" });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/atlas-preview/ai-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
