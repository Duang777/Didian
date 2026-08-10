// Lightweight i18n for the Didian popup. No framework, zero deps.
// Default locale is Chinese; the user can toggle to English.
// UI text lives in `data-i18n` attributes (set by applyI18n) or is produced
// through `t()` for dynamic strings (status, tags, badges, history toggle).

export type Lang = "zh" | "en";

type Vars = Record<string, string | number>;
type Table = Record<string, string>;

const zh: Table = {
  "brand.tagline": "浏览器采集",
  "theme.toggle": "切换主题",
  "lang.toggle": "切换语言",
  "connect.title": "连接 Didian",
  "connect.desc": "设置工作区，即可把网页采集进记忆。",
  "connect.action": "打开设置",
  "capture.label": "采集当前页面",
  "history.title": "最近",
  "history.hide": "收起",
  "history.show": "展开",
  "history.empty": "还没有采集记录。",
  "settings.api": "API 地址",
  "settings.workspace": "工作区",
  "settings.save": "保存设置",
  "settings.toggle": "设置",
  "status.loadError": "加载设置失败",
  "status.saveError": "保存设置失败",
  "status.saved": "设置已保存",
  "status.capturing": "采集中…",
  "status.initError": "初始化失败",
  "capture.base.saved": "已保存。",
  "capture.base.captured": "已采集。",
  "capture.ready": "{base} AI 富化已完成。",
  "capture.processing": "{base} AI 正在整理。",
  "capture.pending": "{base} 等待 AI 处理。",
  "capture.failed": "{base} 失败。",
  "capture.failedReason": "{base} 失败：{reason}",
  "capture.default.duplicate": "已存入 Didian。",
  "capture.default.normal": "已采集并存入 Didian。",
  "tag.selection": "选区",
  "tag.page": "整页",
  "tag.links": "{n} 个链接",
  "badge.saved": "已存",
  "badge.ready": "完成",
  "badge.processing": "处理中",
  "badge.pending": "等待",
  "badge.failed": "失败",
  "badge.done": "完成",
};

const en: Table = {
  "brand.tagline": "Browser Capture",
  "theme.toggle": "Toggle theme",
  "lang.toggle": "Switch language",
  "connect.title": "Connect Didian",
  "connect.desc": "Set your workspace to start capturing pages into memory.",
  "connect.action": "Open settings",
  "capture.label": "Capture Current Page",
  "history.title": "Recent",
  "history.hide": "Hide",
  "history.show": "Show",
  "history.empty": "No captures yet.",
  "settings.api": "API URL",
  "settings.workspace": "Workspace",
  "settings.save": "Save settings",
  "settings.toggle": "Settings",
  "status.loadError": "Failed to load settings",
  "status.saveError": "Failed to save settings",
  "status.saved": "Settings saved",
  "status.capturing": "Capturing…",
  "status.initError": "Initialization failed",
  "capture.base.saved": "Already saved.",
  "capture.base.captured": "Captured.",
  "capture.ready": "{base} AI enrichment ready.",
  "capture.processing": "{base} AI is organizing it.",
  "capture.pending": "{base} Waiting for AI.",
  "capture.failed": "{base} Failed.",
  "capture.failedReason": "{base} Failed: {reason}",
  "capture.default.duplicate": "Already saved in Didian.",
  "capture.default.normal": "Captured in Didian.",
  "tag.selection": "Selection",
  "tag.page": "Page",
  "tag.links": "{n} links",
  "badge.saved": "Saved",
  "badge.ready": "Ready",
  "badge.processing": "Processing",
  "badge.pending": "Pending",
  "badge.failed": "Failed",
  "badge.done": "Done",
};

const tables: Record<Lang, Table> = { zh, en };

let current: Lang = "zh";

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
}

export function t(key: string, vars?: Vars): string {
  const table = tables[current] ?? en;
  let s = table[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}
