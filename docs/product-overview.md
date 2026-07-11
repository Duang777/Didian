# Didian 产品全景文档

> **文档说明**
>
> 这份文档用于让工程、产品、设计和 Demo 协作同学快速理解 Didian 的产品边界、核心对象和端到端工作流。更细的需求以 `../docs/didian-prd.md` 为准，实施拆分以 `tasks/plan.md` 和 `tasks/todo.md` 为准。

## 1. Didian 是什么

Didian 是一个从浏览器到云盘的 AI 资源任务工作台。它帮助用户把浏览器标签页、网页正文、下载链接、收藏夹、云盘链接和本地文件线索整理成结构化、去重、可追问的资源库。

一句话定位：

> Didian 让资料从“随手保存”变成“可管理、可执行、可追问”的本地 Agent 工作流。

## 2. 解决的问题

- 资料保存后来源丢失，不知道文件来自哪个页面或调研上下文。
- 相同资源被多次保存，云盘目录越来越乱。
- 链接、文档、仓库、视频、网盘分享混在一起，缺少统一索引。
- 保存之后很难继续追问、比较和产出下一步行动。
- 浏览器资料发现和云盘归档之间缺少可确认的自动化闭环。

## 3. 核心工作流

```text
浏览器采集
  -> 创建资源任务
  -> 分配本地 Runtime
  -> Agent 执行扫描、提取、匹配、合并、规划
  -> 用户确认 proposed actions
  -> 写入 Mock Drive 或 adapter 云盘工作区
  -> 生成 artifacts
  -> 基于来源继续追问
```

## 4. 核心对象

| 概念 | 定义 |
| --- | --- |
| Resource Task | 一次资源整理任务，包含目标、状态、来源、执行事件和产物。 |
| Captured Source | 浏览器或导入路径捕获的原始来源，例如标签页、链接、正文片段、选中文本。 |
| Resource Item | 系统识别出的资源实体，例如 GitHub 仓库、文档、视频、PDF、云盘链接。 |
| Resource Cluster | 一组重复或相似资源，包含 canonical title、置信度和推荐动作。 |
| Proposed Action | AI 建议执行的操作，例如创建文件夹、保存链接、写 Markdown、跳过重复项。 |
| Artifact | 生成产物，例如资源索引、项目对比表、可复用清单、下一步行动。 |
| CloudDriveAdapter | 云盘能力抽象，MVP 使用 Mock Drive，未来可接本地目录或官方云盘 API。 |
| Runtime / Daemon | 用户本机执行环境，负责检测 Agent CLI、领取任务、运行 agent、回传进度。 |

## 5. 产品模块

### 5.1 资源任务看板

展示待处理、扫描中、待确认、整理中、已入库、阻塞等状态。任务卡片展示目标、来源数、资源数、重复数、风险数、当前步骤和 Runtime。

### 5.2 任务详情

展示任务目标、动态任务图、资源聚类、建议操作、执行时间线、日志、失败原因和 generated artifacts。

### 5.3 本地 Runtime

展示当前机器、已检测到的 Agent CLI、版本、online/offline/busy 状态、最近心跳和正在执行的任务。

### 5.4 浏览器采集

采集当前标签页或当前窗口标签页的标题、URL、favicon、正文、选中文本和链接。采集内容一律视为不可信数据，不能当作 prompt 指令执行。

### 5.5 Mock Drive

MVP 的可演示云盘工作区，包含目录树、文件/链接列表、Markdown artifact 预览和操作日志。

### 5.6 资源库追问

用户可以基于 captured sources 和 generated artifacts 继续提问。回答必须引用来源。

## 6. 安全和边界

- 云盘写入前必须经过显式确认。
- MVP 禁止删除、覆盖、批量移动等 destructive actions。
- LLM 输出必须通过 schema 校验后才能持久化或执行。
- 云盘能力必须通过 `CloudDriveAdapter`，业务逻辑不直接绑定具体云盘。
- 浏览器采集文本是数据，不是系统指令。
- Demo fixtures 必须和生产路径分离。

## 7. MVP 成功标准

- 能从浏览器采集或示例 JSON 创建资源任务。
- 看板能展示任务状态变化。
- 任务详情能展示动态计划、执行日志、建议操作和 artifacts。
- 至少识别三类资源和一组重复/相似资源。
- 写入 Mock Drive 前出现确认面板。
- Mock Drive 中出现目录和 Markdown artifact。
- 用户能对生成资源库进行一次带引用的追问。
- 完整 Demo 不依赖私有云盘 API。
