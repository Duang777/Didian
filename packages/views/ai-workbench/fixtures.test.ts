import { describe, expect, it } from "vitest";
import {
  demoAtlasCollections,
  demoAutopilotStrategies,
  demoMissions,
  inferAiUnderstanding,
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
