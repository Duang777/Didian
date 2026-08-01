import { NextResponse } from "next/server";

const MAX_MARKDOWN_LENGTH = 40_000;
const MAX_SELECTION_LENGTH = 4_000;
const MAX_INSTRUCTION_LENGTH = 2_000;

type AtlasAiEditBody = {
  instruction?: unknown;
  selectedText?: unknown;
  currentMarkdown?: unknown;
  filePath?: unknown;
  workspaceTitle?: unknown;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AtlasAiEditBody | null;
  const instruction = cleanString(body?.instruction, MAX_INSTRUCTION_LENGTH);
  const selectedText = cleanString(body?.selectedText, MAX_SELECTION_LENGTH);
  const currentMarkdown = cleanString(body?.currentMarkdown, MAX_MARKDOWN_LENGTH);
  const filePath = cleanString(body?.filePath, 240) || "current.md";
  const workspaceTitle = cleanString(body?.workspaceTitle, 240) || "Atlas workspace";

  if (!instruction || !selectedText || !currentMarkdown) {
    return NextResponse.json({ error: "instruction, selectedText and currentMarkdown are required" }, { status: 400 });
  }

  const apiKey = cleanEnv(process.env.DIDIAN_LLM_API_KEY) || cleanEnv(process.env.OPENAI_API_KEY);
  const configuredBaseUrl = cleanEnv(process.env.DIDIAN_LLM_BASE_URL) || cleanEnv(process.env.OPENAI_BASE_URL);
  const baseUrl = configuredBaseUrl || "https://api.openai.com/v1";
  const model = cleanEnv(process.env.DIDIAN_LLM_DEFAULT_MODEL) || cleanEnv(process.env.OPENAI_MODEL) || "gpt-4o-mini";

  if (!apiKey && !configuredBaseUrl) {
    return NextResponse.json({ error: "Atlas AI edit is not configured" }, { status: 503 });
  }

  const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You edit a selected span inside a Markdown document.",
            "Return ONLY the replacement Markdown for the selected text.",
            "Do not include code fences, explanations, before/after labels, or surrounding document text.",
            "Preserve the document language unless the user asks otherwise.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `Workspace: ${workspaceTitle}`,
            `File: ${filePath}`,
            "",
            "User edit instruction:",
            instruction,
            "",
            "Selected Markdown text to replace:",
            selectedText,
            "",
            "Full current Markdown document for context:",
            currentMarkdown,
          ].join("\n"),
        },
      ],
    }),
  }).catch(() => null);

  if (!upstream) {
    return NextResponse.json({ error: "Atlas AI edit upstream unavailable" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "Atlas AI edit upstream failed" }, { status: 502 });
  }

  const payload = (await upstream.json()) as ChatCompletionResponse;
  const markdown = stripMarkdownFence(payload.choices?.[0]?.message?.content?.trim() ?? "");
  if (!markdown) {
    return NextResponse.json({ error: "Atlas AI edit returned empty markdown" }, { status: 502 });
  }

  return NextResponse.json({ markdown, provider: "llm", model });
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

function stripMarkdownFence(value: string) {
  const match = value.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);
  return (match?.[1] ?? value).trim();
}
