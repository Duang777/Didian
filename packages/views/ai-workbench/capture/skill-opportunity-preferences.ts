import type { SkillOpportunityPageType } from "@didian/core/browser-memory";

/**
 * 本地降噪偏好（PRD 6.4）。
 * 第一版只落 localStorage，不写库 —— 新增迁移属于 PRD 12.2 的 Ask First 范畴。
 */
const STORAGE_KEY = "didian.skill-opportunity.muted";

export type SkillOpportunityMuteScope = "page_type" | "domain";

export interface SkillOpportunityMutes {
  pageTypes: string[];
  domains: string[];
}

const EMPTY_MUTES: SkillOpportunityMutes = { pageTypes: [], domains: [] };

function readStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    // Safari 隐私模式下访问 localStorage 会直接抛错
    return null;
  }
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function loadSkillOpportunityMutes(): SkillOpportunityMutes {
  const storage = readStorage();
  if (!storage) return EMPTY_MUTES;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_MUTES;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_MUTES;
    const record = parsed as Record<string, unknown>;
    return {
      pageTypes: normalizeList(record.pageTypes),
      domains: normalizeList(record.domains),
    };
  } catch {
    // 存储内容被外部写坏时按未静音处理，不要让详情页崩掉
    return EMPTY_MUTES;
  }
}

export function saveSkillOpportunityMutes(mutes: SkillOpportunityMutes): void {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(mutes));
  } catch {
    // 配额满或被禁用时静默降级，静音只是体验优化，不该阻断主流程
  }
}

export function addSkillOpportunityMute(
  mutes: SkillOpportunityMutes,
  scope: SkillOpportunityMuteScope,
  value: string,
): SkillOpportunityMutes {
  const trimmed = value.trim();
  if (!trimmed) return mutes;
  const key = scope === "page_type" ? "pageTypes" : "domains";
  const current = mutes[key];
  if (current.includes(trimmed)) return mutes;
  return { ...mutes, [key]: [...current, trimmed] };
}

export function isSkillOpportunityMuted(
  mutes: SkillOpportunityMutes,
  pageType: SkillOpportunityPageType | string,
  domain?: string | null,
): boolean {
  if (mutes.pageTypes.includes(pageType)) return true;
  if (domain && mutes.domains.includes(domain)) return true;
  return false;
}
