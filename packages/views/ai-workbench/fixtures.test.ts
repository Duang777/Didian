import { describe, expect, it } from "vitest";
import {
  demoAtlasCollections,
  demoAtlasWorkspaces,
  demoAutopilotStrategies,
  demoMissions,
  inferAiUnderstanding,
  missionToAtlasWorkspace,
} from "./fixtures";
import {
  AtlasCollectionSchema,
  AutopilotStrategySchema,
  MissionViewSchema,
} from "./schemas";

describe("inferAiUnderstanding", () => {
  it("classifies learning-oriented resource input as a learning plan", () => {
    const result = inferAiUnderstanding("https://docs.example.com 帮我整理 AI Agent 教程和学习路线");

    expect(result.intent).toBe("learning_plan");
    expect(result.suggestedMissionTitle).toBe("整理学习资料路线");
  });

  it("classifies failed resource input as diagnosis", () => {
    const result = inferAiUnderstanding("这些链接失败了，帮我诊断错误原因");

    expect(result.intent).toBe("diagnose");
  });

  it("does not classify a short greeting as an AI Agent resource pack", () => {
    const result = inferAiUnderstanding("你好");

    expect(result.intent).toBe("collect");
    expect(result.suggestedMissionTitle).toBe("记录输入");
    expect(result.suggestedMissionTitle).not.toContain("AI Agent 资源包");
  });
});

describe("missionToAtlasWorkspace", () => {
  it("creates a Flowix-style Markdown workspace for a resource mission", () => {
    const workspace = missionToAtlasWorkspace(demoMissions[0]!);

    expect(workspace.rootPath).toBe("AI Agent 项目调研");
    expect(workspace.missionId).toBe("mission-ai-agent-pack");
    expect(workspace.files.map((file) => file.path)).toEqual([
      "mission.md",
      "sources/karakeep.md",
      "sources/browser-use.md",
      "sources/stagehand.md",
      "sources/用户目标.md",
      "evidence.md",
      "decisions.md",
      "agent-log.md",
    ]);
    expect(workspace.files.some((file) => file.path.startsWith("outputs/"))).toBe(false);
    expect(workspace.files.find((file) => file.path === "mission.md")?.content).toContain("## Agent 工作目标");
    expect(workspace.files.find((file) => file.path === "sources/browser-use.md")?.content).toContain("github.com/browser-use/browser-use");
    expect(workspace.files.find((file) => file.path === "evidence.md")?.content).toContain("browser-use 和 Stagehand 均属于工具/实战主题");
    expect(workspace.contextScopes.map((scope) => scope.id)).toEqual([
      "current_document",
      "current_workspace",
      "captured_sources",
      "workspace_outputs",
      "entire_atlas",
      "local_downloads",
      "cloud_drive_resources",
    ]);
    expect(workspace.contextScopes.filter((scope) => scope.enabled).map((scope) => scope.id)).toEqual([
      "current_document",
      "current_workspace",
      "captured_sources",
    ]);
  });

  it("exposes demo Atlas workspaces keyed by Mission", () => {
    expect(demoAtlasWorkspaces).toHaveLength(1);
    expect(demoAtlasWorkspaces[0]?.missionId).toBe(demoAtlasCollections[0]?.sourceMissionId);
  });
});

describe("ai workbench fixtures", () => {
  it("match the mission schema", () => {
    for (const mission of demoMissions) {
      expect(MissionViewSchema.safeParse(mission).success).toBe(true);
    }
  });

  it("match the atlas schema", () => {
    for (const collection of demoAtlasCollections) {
      expect(AtlasCollectionSchema.safeParse(collection).success).toBe(true);
    }
  });

  it("match the autopilot strategy schema", () => {
    for (const strategy of demoAutopilotStrategies) {
      expect(AutopilotStrategySchema.safeParse(strategy).success).toBe(true);
    }
  });
});
