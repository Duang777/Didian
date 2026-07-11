export type ResourceTaskStatus = "scanning" | "needs_confirmation" | "indexed";

export type ResourceTask = {
  id: string;
  title: string;
  objective: string;
  status: ResourceTaskStatus;
  sourceCount: number;
  resourceCount: number;
  duplicateCount: number;
  riskCount: number;
  runtime: string;
  progress: number;
  currentStep: string;
};

export const resourceTasks: ResourceTask[] = [
  {
    id: "rp-104",
    title: "AI Agent 项目调研",
    objective: "整理当前标签组，生成项目对比表和可复用清单。",
    status: "needs_confirmation",
    sourceCount: 12,
    resourceCount: 18,
    duplicateCount: 3,
    riskCount: 1,
    runtime: "MacBook Pro / Codex",
    progress: 72,
    currentStep: "等待确认写入方案",
  },
  {
    id: "rp-103",
    title: "浏览器自动化资料包",
    objective: "聚类 Stagehand、browser-use、nanobrowser 相关材料。",
    status: "scanning",
    sourceCount: 8,
    resourceCount: 11,
    duplicateCount: 1,
    riskCount: 0,
    runtime: "ThinkPad / Claude Code",
    progress: 46,
    currentStep: "提取文档和仓库链接",
  },
  {
    id: "rp-099",
    title: "竞品功能截图归档",
    objective: "把下载文件、网页截图和说明文档归档到 Demo 目录。",
    status: "indexed",
    sourceCount: 15,
    resourceCount: 22,
    duplicateCount: 5,
    riskCount: 0,
    runtime: "Mac mini / Cursor Agent",
    progress: 100,
    currentStep: "已入库",
  },
];

export const taskSteps = [
  { label: "扫描标签页", state: "done" },
  { label: "提取资源", state: "done" },
  { label: "重复匹配", state: "done" },
  { label: "生成方案", state: "active" },
  { label: "确认写入", state: "waiting" },
  { label: "入库追问", state: "pending" },
] as const;

export const resourceClusters = [
  {
    name: "browser-use",
    type: "GitHub + Docs",
    evidence: "同域名、相同 repo slug、README 标题匹配",
    action: "保存 GitHub 和文档，跳过重复博客摘录",
  },
  {
    name: "Stagehand",
    type: "Docs + Examples",
    evidence: "文档页和示例仓库互相引用",
    action: "保存文档入口，生成示例索引",
  },
  {
    name: "未知压缩包",
    type: "Archive",
    evidence: "下载链接缺少可信来源说明",
    action: "标记为需要人工确认",
  },
];

export const proposedActions = [
  "创建文件夹：参赛项目/AI Agent 调研",
  "保存链接：7 个 GitHub / Docs 资源",
  "写入 Markdown：资源索引、项目对比表、可复用清单、下一步行动",
  "跳过重复资源：2 个相同仓库镜像和 1 个旧笔记",
];

export const artifacts = ["资源索引.md", "项目对比表.md", "可复用清单.md", "下一步行动.md"];
