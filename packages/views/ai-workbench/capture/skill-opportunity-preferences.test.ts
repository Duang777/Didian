import { describe, expect, it, beforeEach } from "vitest";
import {
  addSkillOpportunityMute,
  isSkillOpportunityMuted,
  loadSkillOpportunityMutes,
  saveSkillOpportunityMutes,
  type SkillOpportunityMutes,
} from "./skill-opportunity-preferences";

describe("skill-opportunity-preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns empty mutes when nothing stored", () => {
    expect(loadSkillOpportunityMutes()).toEqual({ pageTypes: [], domains: [] });
  });

  it("addSkillOpportunityMute appends a page_type without duplicates", () => {
    const base: SkillOpportunityMutes = { pageTypes: [], domains: [] };
    const once = addSkillOpportunityMute(base, "page_type", "github_repo");
    expect(once.pageTypes).toEqual(["github_repo"]);
    const twice = addSkillOpportunityMute(once, "page_type", "github_repo");
    expect(twice.pageTypes).toEqual(["github_repo"]);
  });

  it("addSkillOpportunityMute trims and ignores blanks", () => {
    const base: SkillOpportunityMutes = { pageTypes: [], domains: [] };
    const trimmed = addSkillOpportunityMute(base, "domain", "  example.com  ");
    expect(trimmed.domains).toEqual(["example.com"]);
    const blank = addSkillOpportunityMute(base, "domain", "   ");
    expect(blank.domains).toEqual([]);
  });

  it("isSkillOpportunityMuted reflects page_type and domain", () => {
    const mutes: SkillOpportunityMutes = { pageTypes: ["blog"], domains: ["spam.example"] };
    expect(isSkillOpportunityMuted(mutes, "blog", "good.example")).toBe(true);
    expect(isSkillOpportunityMuted(mutes, "tutorial", "spam.example")).toBe(true);
    expect(isSkillOpportunityMuted(mutes, "tutorial", "good.example")).toBe(false);
    expect(isSkillOpportunityMuted(mutes, "tutorial", null)).toBe(false);
  });

  it("save then load round-trips through localStorage", () => {
    const mutes: SkillOpportunityMutes = { pageTypes: ["paper"], domains: ["x.com"] };
    saveSkillOpportunityMutes(mutes);
    expect(loadSkillOpportunityMutes()).toEqual(mutes);
  });

  it("load tolerates corrupt stored JSON", () => {
    window.localStorage.setItem("didian.skill-opportunity.muted", "{not json");
    expect(loadSkillOpportunityMutes()).toEqual({ pageTypes: [], domains: [] });
  });
});
