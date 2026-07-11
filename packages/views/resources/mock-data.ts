export type ResourceTaskStatus = "scanning" | "needs_confirmation" | "indexed";

export type ResourceTaskStepState = "done" | "active" | "waiting" | "pending";

export type ResourceTaskStep = {
  label: string;
  state: ResourceTaskStepState;
  description: string;
};

export type ResourceCluster = {
  name: string;
  type: string;
  evidence: string;
  action: string;
};

export type ResourceArtifact = {
  name: string;
  description: string;
  markdown: string;
};

export type ResourceTimelineEvent = {
  time: string;
  title: string;
  description: string;
};

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

export type ResourceTaskDetail = {
  summary: string;
  steps: ResourceTaskStep[];
  clusters: ResourceCluster[];
  proposedActions: string[];
  artifacts: ResourceArtifact[];
  timeline: ResourceTimelineEvent[];
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

export const resourceClusters: ResourceCluster[] = [
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

const agentResearchArtifacts: ResourceArtifact[] = [
  {
    name: "资源索引.md",
    description: "按项目、文档和示例整理的入口索引",
    markdown:
      "# 资源索引\n\n## browser-use\n\n- GitHub 仓库：保留主仓库和文档入口\n- 用途：浏览器自动化 Agent 基线\n\n## Stagehand\n\n- 文档入口：保留 examples 和 API reference\n- 备注：适合做浏览器控制层对比",
  },
  {
    name: "项目对比表.md",
    description: "对比各项目定位、成熟度和接入成本",
    markdown:
      "# 项目对比表\n\n| 项目 | 类型 | 结论 |\n| --- | --- | --- |\n| browser-use | GitHub + Docs | 值得深挖 |\n| Stagehand | Docs + Examples | 适合对比 |\n| 未知压缩包 | Archive | 需要人工确认 |",
  },
  {
    name: "可复用清单.md",
    description: "可直接复用的代码、文档和 Demo 线索",
    markdown:
      "# 可复用清单\n\n- 复用 browser-use 的任务抽象做竞品分析\n- 复用 Stagehand examples 设计浏览器采集 fixture\n- 暂缓未知压缩包，等待人工确认来源",
  },
];

export const resourceTaskDetails: Record<string, ResourceTaskDetail> = {
  "rp-104": {
    summary: "已完成扫描和去重，等待确认后写入 Mock Drive。",
    steps: [
      { label: "扫描标签页", state: "done", description: "读取当前窗口 12 个来源" },
      { label: "提取资源", state: "done", description: "抽取 GitHub、Docs、Archive 线索" },
      { label: "重复匹配", state: "done", description: "合并 3 组重复资源" },
      { label: "生成方案", state: "active", description: "产出写入计划和 artifacts" },
      { label: "确认写入", state: "waiting", description: "等待用户确认安全操作" },
      { label: "入库追问", state: "pending", description: "确认写入后开启资源库问答" },
    ],
    clusters: resourceClusters,
    proposedActions,
    artifacts: agentResearchArtifacts,
    timeline: [
      { time: "10:12", title: "捕获标签组", description: "从浏览器上下文读取标题、URL 和页面摘要。" },
      { time: "10:14", title: "完成重复匹配", description: "识别 3 个重复仓库镜像和旧笔记。" },
      { time: "10:18", title: "生成写入方案", description: "等待用户确认 Mock Drive 写入。" },
    ],
  },
  "rp-103": {
    summary: "正在提取浏览器自动化资料包，尚未进入确认门。",
    steps: [
      { label: "扫描标签页", state: "done", description: "已读取 8 个来源" },
      { label: "提取资源", state: "active", description: "正在提取文档和仓库链接" },
      { label: "重复匹配", state: "pending", description: "等待资源提取完成" },
      { label: "生成方案", state: "pending", description: "尚未生成写入计划" },
      { label: "确认写入", state: "pending", description: "确认门暂未开启" },
      { label: "入库追问", state: "pending", description: "入库后可追问" },
    ],
    clusters: [
      {
        name: "Stagehand",
        type: "Docs + Examples",
        evidence: "文档页和示例仓库互相引用",
        action: "继续提取示例和 API reference",
      },
      {
        name: "nanobrowser",
        type: "GitHub",
        evidence: "repo slug 与标签页标题匹配",
        action: "等待 README 摘要提取完成",
      },
    ],
    proposedActions: [],
    artifacts: [
      {
        name: "提取草稿.md",
        description: "扫描中的临时整理草稿",
        markdown: "# 提取草稿\n\n- Stagehand 文档已读取\n- browser-use 对比资料等待补全\n- nanobrowser README 正在提取",
      },
    ],
    timeline: [
      { time: "10:21", title: "开始扫描", description: "Claude Code runtime 已领取任务。" },
      { time: "10:24", title: "提取文档", description: "正在读取 Stagehand 和 browser-use 页面。" },
    ],
  },
  "rp-099": {
    summary: "截图和说明文档已入库，生成文件可直接预览和追问。",
    steps: [
      { label: "扫描标签页", state: "done", description: "读取 15 个来源" },
      { label: "提取资源", state: "done", description: "提取截图、网页和说明文档" },
      { label: "重复匹配", state: "done", description: "跳过 5 个重复资源" },
      { label: "生成方案", state: "done", description: "写入计划已确认" },
      { label: "确认写入", state: "done", description: "安全操作已执行" },
      { label: "入库完成", state: "done", description: "Mock Drive 已生成 artifacts" },
    ],
    clusters: [
      {
        name: "Demo 截图",
        type: "Images + Notes",
        evidence: "文件名、页面标题和说明文档互相引用",
        action: "已归档到 Demo/竞品截图",
      },
      {
        name: "说明文档",
        type: "Docs",
        evidence: "下载文件与网页正文标题匹配",
        action: "已生成摘要和引用",
      },
    ],
    proposedActions: ["已创建文件夹：Demo/竞品截图", "已写入 Markdown：截图索引、说明摘要", "已跳过重复资源：5 个"],
    artifacts: [
      {
        name: "截图索引.md",
        description: "竞品截图的可追溯索引",
        markdown: "# 截图索引\n\n- 首页：已归档\n- 设置页：已归档\n- 资源页：已归档",
      },
      {
        name: "说明摘要.md",
        description: "说明文档摘要和下一步建议",
        markdown: "# 说明摘要\n\n本批资料已经入库，可直接用于 Demo 对比和后续追问。",
      },
    ],
    timeline: [
      { time: "09:02", title: "捕获截图资料", description: "Cursor Agent runtime 读取下载目录和网页线索。" },
      { time: "09:09", title: "确认写入", description: "用户确认创建文件夹和写入 Markdown。" },
      { time: "09:11", title: "入库完成", description: "Mock Drive 中 artifacts 已可预览。" },
    ],
  },
};
