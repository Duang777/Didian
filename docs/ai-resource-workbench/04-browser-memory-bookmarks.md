# 浏览器收藏记忆与搜索召回功能方案

## 1. 结论

该功能可行，且和 Didian 的“浏览器到云盘 AI 资源工作台”定位高度一致。它不应该只做一个网页收藏夹，而应该做成“收藏时理解、搜索时召回”的个人网页记忆层：用户收藏页面后，Didian 生成摘要和可检索记忆；用户以后在浏览器搜索相似问题时，插件提示“你曾经收藏过相关页面”。

推荐第一版采用 **Didian 扩展按钮收藏当前页**，不直接拦截浏览器原生收藏星标。原生书签事件可以作为第二阶段增强，因为它需要更重的 `bookmarks` 权限，而且通常只能拿到 URL/title，无法稳定补抓页面正文、选区、链接和页面快照。

第一版不要把完整页面 payload 塞进 `issue.metadata`。当前前端 API schema 对 `Issue.metadata` 的兼容约束是 primitive-only map，无法安全承载页面链接数组、摘要对象、召回证据和后续 embedding 元数据。应新增 `captured_source` / `page_memory` 领域表，`issue` 或 Mission 只引用 capture id。

Karakeep 是当前最值得对标的开源实现，但应采用“能力复用、实现重写”的策略。Karakeep 自身是 AGPL-3.0，而 Didian 当前是修改版 Apache-2.0 许可证；除非项目明确接受 AGPL 传染义务或单独取得授权，否则不要复制、改写、内嵌 Karakeep 源代码。可以复用它验证过的功能分层、字段语义、状态机、规则模型和用户体验，并在 Didian 的 Go + sqlc + Chi + PostgreSQL 架构中重新实现。

## 2. 目标体验

### 收藏时

1. 用户在网页上点击 Didian 浏览器扩展里的“收藏到 Didian”。
2. 扩展采集当前页标题、URL、favicon、选区、正文、主要链接和采集时间。
3. 后端保存原始采集记录，并创建后台摘要任务。
4. 摘要完成后，页面进入可搜索的 `PageMemory` 状态。
5. AI Inbox / Atlas 中出现该收藏页面，可继续创建 Mission 做整理、对比、入库。

### 搜索时

1. 用户开启插件的“搜索时提醒相关收藏”。
2. 用户在 Google、Bing、百度、GitHub 等搜索页面输入 query。
3. 内容脚本读取搜索 query 和可见搜索结果标题、URL、摘要片段。
4. 扩展调用后端召回接口。
5. 搜索页侧边或顶部出现轻量提示：

```text
Didian
你曾经收藏过 3 个相关页面

1. browser-use GitHub
   收藏于 6 月 12 日。一个让 AI agent 控制浏览器的开源项目。

2. Stagehand Docs
   收藏于 5 月 30 日。用于可靠浏览器自动化的框架文档。
```

## 3. 官方能力调研

### 3.1 页面注入和主动采集

可行。WebExtension/Chrome 扩展可以在有权限的页面中注入 content script 来读取 DOM。MDN 对 `tabs.executeScript` 的说明明确：它可以向页面注入 JavaScript；Manifest V3 应使用 `scripting.executeScript()`；扩展必须拥有页面 URL 的 host permission，或通过 `activeTab` 获得临时权限；部分特殊页面不能注入，例如浏览器内置页面、PDF viewer、reader view、`view-source` 等。

设计影响：MVP 应使用用户点击扩展按钮触发的 `activeTab` 采集。这样权限更小，也符合用户预期。不能承诺所有页面都能采集，特殊页面要显示“此页面无法采集”。

### 3.2 原生浏览器书签监听

部分可行，但不适合作为第一版主路径。MDN 对 `bookmarks.onCreated` 的说明是：当书签或文件夹被创建时触发。这可以监听用户新建书签，但事件本身不是完整页面采集能力，只能围绕书签项处理。Chrome/Firefox 实现还需要 `bookmarks` 权限，权限感知较强。

设计影响：第二阶段可以做“监听原生书签新增 -> 匹配当前活动 tab -> 尝试补抓”。如果页面已关闭或不是当前活动页，则只能降级保存 URL/title，并排队做服务器端 URL 抓取或提示用户重新打开页面补抓。

### 3.3 完整页面快照

可行但需要单独复核和降级。Chrome 有 `pageCapture` API，可把页面保存为 MHTML；这适合“整个页面归档”。但该能力是 Chrome 特有方向，权限更重，跨浏览器兼容性和商店审核文案需要单独处理。

设计影响：MVP 不依赖 MHTML 成功。第一版先保存“可检索文本层 + provenance”，MHTML/HTML/screenshot 作为可选附件能力。若用户开启“离线归档”，再申请并解释 `pageCapture` 权限。

### 3.4 搜索页内提示

可行。扩展可以对指定搜索引擎域名声明 content script，在页面中读取 query、搜索结果 DOM，并插入 Didian 提示 UI。

设计影响：MVP 只支持明确列出的搜索页面，不使用 `<all_urls>`。建议先支持 Google、Bing、百度和 GitHub search，各写一个 extractor。搜索页 DOM 经常变化，extractor 必须可降级：至少读取 URL query 参数中的搜索词，搜索结果解析失败时仍可用 query 召回。

### 3.5 调研限制

当前网络环境下 Chrome 官方文档页面多次超时，已用 MDN WebExtension 文档和项目现状做交叉判断。实现前需要再次复核以下官方页面：

- Chrome activeTab: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- Chrome scripting API: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Chrome pageCapture API: https://developer.chrome.com/docs/extensions/reference/api/pageCapture
- Chrome bookmarks API: https://developer.chrome.com/docs/extensions/reference/api/bookmarks
- Chrome sidePanel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- MDN tabs.executeScript: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/executeScript
- MDN bookmarks.onCreated: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks/onCreated

## 4. 产品边界与 Karakeep 复用策略

### 4.1 可直接借鉴的功能

Karakeep 的 README 和源码显示，它把收藏系统做成了“多入口采集 + 后台 enrichment + 搜索/规则/归档”的完整链路。Didian 应优先吸收以下能力：

| Karakeep 能力 | 对 Didian 的价值 | Didian 实现方式 |
| --- | --- | --- |
| Link / Text / Asset 三类 bookmark | 避免把系统限制成 URL 收藏夹 | `captured_source.source_type` 支持 `link`、`text`、`asset`、`selection`、`rss_item`、`imported_bookmark`。 |
| 自动抓取标题、描述、图片、正文 | 收藏后立即可读、可搜索 | Go 后台 enrichment job：HTTP fetch + HTML metadata parser + readability。 |
| AI 自动标签和摘要 | 给搜索召回和 Atlas 聚类提供结构化记忆 | `page_memory` 保存 summary、topics、entities、keywords、status。 |
| Full text search | 用户可以手动找回旧收藏 | MVP 用 PostgreSQL `pg_trgm` / `LIKE`，后续再引入外部搜索或向量库。 |
| Full page archival | 防止原网页消失或变化 | 先支持扩展侧 SingleFile HTML 归档，后续增加服务端 Playwright/Chromedp 归档。 |
| Highlights / notes | 让“为什么收藏”可搜索、可召回 | 新增 `capture_note` / `capture_highlight`，作为搜索召回强证据。 |
| Archive / favourite | 控制首页噪音和召回权重 | 用 `memory_state` 表达 `active`、`muted`、`pinned`、`archived`。 |
| Rule engine | 自动整理收藏，连接后续 Autopilot | 用 Go 实现轻量 `memory_rule`，后续基于真实行为映射到 Autopilot 策略建议。 |
| RSS / importers | 把旧收藏夹和订阅源带进来 | Phase 3 做 Chrome bookmarks import、RSS feed import，不进入 MVP。 |
| API / CLI / extension 多入口 source | 召回解释更可信 | 保存 `source`：`web`、`extension`、`api`、`cli`、`rss`、`import`、`singlefile`。 |

### 4.2 不复用 Karakeep 源码

Karakeep 许可证是 AGPL-3.0。Didian 当前许可证不是 AGPL。为避免许可证污染：

- 不复制 Karakeep 的 TypeScript/React/worker/API 源码。
- 不把 Karakeep 作为内嵌服务或子模块随 Didian 分发。
- 不照搬其具体 UI 组件和实现细节。
- 可以阅读公开文档和源码，学习功能边界、状态机、API 形状和用户体验。
- 可以直接使用其也在使用的独立开源依赖，但必须逐个确认依赖许可证和 Go/Node 运行边界。

### 4.3 可复用第三方依赖而不是复用 Karakeep

Karakeep 的依赖选择可以作为技术选型参考。Didian 可选择等价依赖：

| 能力 | Karakeep 使用 | Didian 建议 |
| --- | --- | --- |
| 扩展侧整页保存 | `single-file-core` | 可直接评估 `single-file-core` 用于 `apps/extension`，许可证需实现前复核。 |
| 服务端浏览器抓取 | Playwright / Puppeteer | Go 侧优先用 `chromedp` 或 Playwright driver；也可通过本地 daemon 执行浏览器任务。 |
| 正文抽取 | `@mozilla/readability` | Go 可用 readability 等价库；复杂页面可在 worker/daemon 用 JS Readability。 |
| metadata 抽取 | `metascraper` | Go 实现 OpenGraph/Twitter/meta parser，特殊站点逐步补规则。 |
| OCR | `tesseract.js` | Go 侧可调用 Tesseract CLI 或后续作为可选 worker。MVP 不做。 |
| PDF 解析 | `pdfjs-dist` / `pdf2json` | Go 侧可先只存 PDF 附件，后续用外部解析器或本地 agent 处理。 |
| 全文搜索 | Meilisearch | MVP 用 PostgreSQL；后续可抽象 `MemorySearchIndex` 再接 Meilisearch/OpenSearch。 |
| 向量检索 | Meilisearch vector plugin | 二期再选 pgvector/Meilisearch/vector service。 |

### 4.4 Go 等价实现原则

技术栈不同不阻塞。Karakeep 的后端功能可以一比一用 Go 重写，但不要照搬它的 tRPC/Drizzle/NextAuth 结构。Didian 的等价实现应保持现有边界：

```text
apps/extension
  -> POST /api/browser-captures
  -> server/internal/handler/browser_capture.go
  -> server/pkg/db/queries/browser_capture.sql
  -> server/internal/service/memory_enrichment.go
  -> background job / cron / task queue
  -> page_memory + search index
  -> AI Inbox / Mission / Atlas
  -> Later Autopilot strategy suggestions
```

Go 重写的重点不是语法翻译，而是复刻以下行为契约：

- 创建 capture 必须快，enrichment 异步。
- 抓取失败不影响收藏成功。
- 每个 enrichment 子任务都有独立状态：metadata、archive、summary、tags、embedding。
- 用户可看到状态和失败原因。
- 用户可重新抓取、重新摘要、静音召回、归档记忆。
- 搜索结果必须返回 matched reason。

### 4.5 Didian 相比 Karakeep 的差异化

Karakeep 的中心是 bookmark library。Didian 的中心应该是 AI workflow：

- Karakeep 保存后主要进入列表、标签、搜索。
- Didian 保存后进入 AI Inbox、Mission、Atlas；重复行为成熟后再生成 Autopilot 建议。
- Karakeep 的规则引擎是自动管理收藏。
- Didian 的后续 Autopilot 应把真实重复行为升级成“收藏后自动理解、归类、创建任务、沉淀资源库”。
- Karakeep 计划 semantic search。
- Didian 应优先做“搜索页主动召回旧收藏”，这是更强的浏览器场景差异化。

### 第一版做

- Didian 扩展按钮收藏当前页。
- 采集 URL、title、domain、favicon、selected text、readable text、links、capturedAt。
- 后端保存 captured source。
- 后台生成摘要、关键词、主题、实体和召回用文本。
- 搜索页显示“你曾经收藏过相关页面”。
- 用户可从提示卡打开收藏、加入 AI Inbox、创建 Mission。

### 第一版不做

- 不默认监听浏览器原生书签星标。
- 不默认申请 `bookmarks`、`pageCapture`、`downloads`、`<all_urls>` 等强权限。
- 不在扩展中调用 LLM 理解页面。
- 不在用户未开启时读取搜索 query。
- 不尝试修改用户页面内容或执行云盘写入。
- 不承诺完整离线归档所有页面。

## 5. 数据模型建议

### 5.1 captured_source

保存一次浏览器采集的原始事实和 provenance。

```sql
CREATE TABLE captured_source (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'extension',
  capture_scope TEXT NOT NULL,
  source_tab_id TEXT,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  favicon_url TEXT,
  selected_text TEXT,
  readable_text TEXT,
  links JSONB NOT NULL DEFAULT '[]',
  snapshot_attachment_id UUID,
  screenshot_attachment_id UUID,
  text_hash TEXT,
  page_hash TEXT,
  status TEXT NOT NULL DEFAULT 'captured',
  metadata_status TEXT NOT NULL DEFAULT 'pending',
  archive_status TEXT NOT NULL DEFAULT 'pending',
  summary_status TEXT NOT NULL DEFAULT 'pending',
  embedding_status TEXT NOT NULL DEFAULT 'pending',
  memory_state TEXT NOT NULL DEFAULT 'active',
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

索引建议：

```sql
CREATE INDEX idx_captured_source_workspace_created
  ON captured_source (workspace_id, created_at DESC);

CREATE INDEX idx_captured_source_workspace_state
  ON captured_source (workspace_id, memory_state, created_at DESC);

CREATE UNIQUE INDEX idx_captured_source_workspace_url_hash
  ON captured_source (workspace_id, normalized_url, text_hash)
  WHERE text_hash IS NOT NULL;

CREATE INDEX idx_captured_source_title_trgm
  ON captured_source USING gin (LOWER(title) gin_trgm_ops);
```

项目已有 `pg_bigm` / `pg_trgm` 搜索迁移，MVP 可以沿用 trigram/LIKE 路线。不要在第一版强依赖 `pgvector`，因为当前仓库没有 pgvector 迁移或依赖。

字段说明：

- `source_type` 表示内容形态：`link`、`text`、`asset`、`selection`、`rss_item`、`imported_bookmark`。
- `source` 表示入口：`web`、`extension`、`api`、`cli`、`rss`、`import`、`singlefile`。
- `memory_state` 表示召回策略：`active`、`muted`、`pinned`、`archived`。
- `*_status` 使用 `pending`、`success`、`failure`，便于独立重试 enrichment 子任务。

### 5.2 page_memory

保存 AI 处理后的可召回记忆。也可以先合并进 `captured_source` 的 nullable 字段；独立表更利于区分采集事实和 AI 派生结果。

```sql
CREATE TABLE page_memory (
  captured_source_id UUID PRIMARY KEY REFERENCES captured_source(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  summary TEXT NOT NULL,
  one_line_takeaway TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]',
  topics JSONB NOT NULL DEFAULT '[]',
  entities JSONB NOT NULL DEFAULT '[]',
  keywords JSONB NOT NULL DEFAULT '[]',
  search_text TEXT NOT NULL,
  model_provider TEXT,
  model_name TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

索引建议：

```sql
CREATE INDEX idx_page_memory_workspace
  ON page_memory (workspace_id, generated_at DESC);

CREATE INDEX idx_page_memory_search_text_trgm
  ON page_memory USING gin (LOWER(search_text) gin_trgm_ops);
```

### 5.3 capture_note / capture_highlight

Karakeep 的 notes/highlights 对召回质量很有价值。Didian 应把用户主动写下的备注和高亮作为强证据。

```sql
CREATE TABLE capture_note (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  captured_source_id UUID NOT NULL REFERENCES captured_source(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE capture_highlight (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  captured_source_id UUID NOT NULL REFERENCES captured_source(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  text TEXT NOT NULL,
  note TEXT,
  source_url TEXT,
  selector JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

MVP 可以只建 note，highlight 等阅读器/插件选区体验稳定后再加。

### 5.4 memory_rule

规则引擎不需要照搬 Karakeep，但可以复用事件/条件/动作模型。第一版规则可以先是后端 JSON contract，UI 后续在 Autopilot 成为真实后台策略时再承载。

```sql
CREATE TABLE memory_rule (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  event JSONB NOT NULL,
  condition JSONB NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

规则 contract 建议：

```json
{
  "event": { "type": "captureCreated" },
  "condition": {
    "type": "and",
    "conditions": [
      { "type": "urlContains", "value": "github.com" },
      { "type": "titleContains", "value": "agent" }
    ]
  },
  "actions": [
    { "type": "pinMemory" },
    { "type": "addTopic", "topic": "AI Agent" },
    { "type": "enqueueSummary" },
    { "type": "addToAtlasCollection", "collectionId": "..." }
  ]
}
```

### 5.5 未来 embedding

第二阶段再加 embedding，选项有三种：

1. PostgreSQL + pgvector：简单直连，但需要自托管/云数据库支持扩展。
2. 外部向量服务：检索能力强，但新增基础设施和租户隔离复杂度。
3. 本地 embedding cache：适合 desktop/local-first，但 Web 搜索召回需要同步策略。

MVP 先把摘要、关键词、实体和 `search_text` 存好，后续可以无损回填 embedding。

## 6. API 设计

### 6.1 创建采集

```http
POST /api/browser-captures
```

请求：

```json
{
  "captureScope": "current_tab",
  "sourceTabId": "123",
  "url": "https://github.com/browser-use/browser-use",
  "title": "browser-use/browser-use",
  "domain": "github.com",
  "faviconUrl": "https://github.com/favicon.ico",
  "selectedText": "",
  "readableText": "...",
  "links": [
    { "url": "https://docs.browser-use.com", "text": "Docs" }
  ],
  "capturedAt": "2026-07-14T10:00:00Z"
}
```

响应：

```json
{
  "captureId": "019f...",
  "status": "captured",
  "memoryStatus": "summarizing",
  "dedupe": {
    "isDuplicate": false,
    "existingCaptureId": null
  }
}
```

边界规则：

- 请求必须经过 workspace membership gate。
- `readableText` 和 `links` 要限制大小，超限截断并标记 `isTruncated`。
- 页面内容是未受信任数据，只能作为数据进入 prompt，不能作为指令。
- 归一化 URL 时去掉常见 tracking 参数，例如 `utm_*`、`spm`、`fbclid`。

### 6.2 查询搜索关联

```http
POST /api/browser-memory/search-matches
```

请求：

```json
{
  "query": "browser agent automation",
  "searchEngine": "google",
  "pageUrl": "https://www.google.com/search?q=browser+agent+automation",
  "results": [
    {
      "title": "browser-use GitHub",
      "url": "https://github.com/browser-use/browser-use",
      "snippet": "Make websites accessible for AI agents"
    }
  ],
  "limit": 5
}
```

响应：

```json
{
  "matches": [
    {
      "captureId": "019f...",
      "title": "browser-use GitHub",
      "url": "https://github.com/browser-use/browser-use",
      "summary": "一个让 AI agent 控制浏览器的开源项目。",
      "matchedReason": "搜索结果 URL 与已收藏页面相同",
      "score": 0.94,
      "capturedAt": "2026-06-12T10:00:00Z"
    }
  ]
}
```

### 6.3 列表、状态和重试

Karakeep 的 archive/favourite/status 模型说明，收藏系统必须让用户和系统都能处理失败、降噪和高价值内容。Didian 的 API 应从第一版预留这些操作：

```http
GET   /api/browser-captures?page=1&pageSize=20&state=active&source=extension
GET   /api/browser-captures/{id}
PATCH /api/browser-captures/{id}
POST  /api/browser-captures/{id}/retry-enrichment
POST  /api/browser-captures/{id}/archive
POST  /api/browser-captures/{id}/mute
POST  /api/browser-captures/{id}/pin
POST  /api/browser-captures/{id}/notes
GET   /api/browser-captures/{id}/notes
POST  /api/browser-captures/{id}/highlights
GET   /api/browser-captures/{id}/highlights
```

`PATCH` 只接受用户可编辑字段，例如 `title`、`note`、`memoryState`、`topics`。不要允许客户端直接写 `summary_status`、`embedding_status` 这类系统状态。

### 6.4 附件和归档

完整页面归档建议复用现有 attachment/upload 体系，不为浏览器记忆单独造对象存储接口：

```http
POST /api/upload-file
POST /api/browser-captures/{id}/attachments
GET  /api/browser-captures/{id}/attachments
```

附件类型沿用 Karakeep 的资产语义，但用 Didian 命名：

- `readable_html`
- `singlefile_html`
- `screenshot`
- `pdf`
- `video`
- `user_uploaded`
- `unknown`

### 6.5 规则与 Autopilot

规则接口可以先是内部 API 或 owner/admin 可见 API，后续在 Autopilot 成为真实后台策略时再暴露到 UI：

```http
GET    /api/memory-rules
POST   /api/memory-rules
GET    /api/memory-rules/{id}
PATCH  /api/memory-rules/{id}
DELETE /api/memory-rules/{id}
POST   /api/memory-rules/{id}/dry-run
```

`dry-run` 返回将匹配哪些 capture、会执行哪些 action、是否需要确认。任何会创建 Mission、写 Atlas、写云盘的动作都必须能被用户预览。

## 7. 召回策略

### MVP 混合召回

第一版使用 PostgreSQL 能直接支持的混合策略：

1. URL 精确匹配：搜索结果 URL 归一化后与收藏 URL 相同。
2. URL 同源匹配：同域名、同路径前缀或同 GitHub repo。
3. 标题 trigram 相似：搜索结果标题与收藏标题相似。
4. 关键词命中：query 命中 `keywords/topics/entities/search_text`。
5. 时间加权：近期收藏略微加分。

示例评分：

```text
score =
  exactUrlMatch * 1.00
  + sameResourceMatch * 0.75
  + titleSimilarity * 0.35
  + keywordOverlap * 0.30
  + domainMatch * 0.10
  + recencyBoost * 0.10
```

弹出阈值建议：

- `score >= 0.80`：显示高置信卡片。
- `0.55 <= score < 0.80`：折叠到“可能相关”。
- `< 0.55`：不显示，避免打扰。

### 二期语义召回

引入 embedding 后，把 query、搜索结果 snippet、页面 summary 做向量召回。embedding 只能作为召回信号之一，不能替代 URL/标题证据。UI 必须展示 matched reason，否则用户会觉得提示很玄。

## 8. 扩展架构

建议新增真实扩展工程：

```text
apps/extension/
  package.json
  manifest.json
  src/background.ts
  src/content/capture-page.ts
  src/content/search-overlay.ts
  src/search/extractors/google.ts
  src/search/extractors/bing.ts
  src/search/extractors/baidu.ts
  src/sidepanel/sidepanel.tsx
  src/shared/schema.ts
```

### 权限策略

MVP manifest 建议最小化：

```json
{
  "permissions": ["activeTab", "scripting", "storage", "sidePanel"],
  "host_permissions": [
    "https://www.google.com/search*",
    "https://www.bing.com/search*",
    "https://www.baidu.com/s*",
    "https://github.com/search*"
  ]
}
```

后续按功能增量申请：

- `bookmarks`：监听原生浏览器收藏。
- `pageCapture`：保存 MHTML 离线归档。
- 更广 host permissions：支持更多搜索站点或自动页面采集。

### 搜索页 UI 原则

- 不遮挡搜索框和第一个自然结果。
- 默认折叠，只有高置信匹配才展开。
- 明确显示“为什么匹配”：URL 相同、标题相似、关键词命中等。
- 每条卡片提供 `打开`、`加入 AI Inbox`、`本次忽略`、`不再在此站点提示`。
- 用户关闭后当前 query 不再弹出。

## 9. 摘要任务

### 输入

- 标题、URL、domain。
- 选区优先，其次 readable text。
- 页面 links 的 top N。
- 采集时间和来源。

### 输出 schema

LLM 输出必须经过 Go schema 或 zod 校验后才能持久化。

```json
{
  "summary": "3-5 句摘要",
  "oneLineTakeaway": "一句话说明这个页面为什么值得保存",
  "keyPoints": ["..."],
  "topics": ["browser automation", "AI agent"],
  "entities": ["browser-use", "GitHub"],
  "keywords": ["agent", "automation", "browser"]
}
```

### 失败处理

- 摘要失败不影响收藏成功。
- `captured_source.status = captured`，`page_memory.status = failed` 或不创建 memory。
- 搜索召回可先用 title/url/readableText fallback。
- AI Inbox 卡片显示“摘要生成失败，可重试”。

## 10. 隐私与安全

该功能会触碰用户搜索行为，必须比普通收藏功能更克制。

必须满足：

- 搜索召回默认关闭，由用户显式开启。
- 只在声明的搜索页面读取 query 和搜索结果。
- 不读取普通网页输入框。
- 不上传用户访问的所有页面，只上传用户点击收藏的页面，以及启用后搜索页 query/结果摘要。
- 搜索 query 请求做 debounce 和去重。
- 提供站点级关闭和全局关闭。
- 页面内容和搜索结果都是不可信数据，不能作为系统指令进入 prompt。
- 对企业/内网页面提供“不上传正文，仅保存标题 URL”的模式。

## 11. 和现有代码的落点

### 已有基础

- `apps/extension/CLAUDE.md` 已定义扩展职责和采集 payload 边界。
- `packages/views/ai-workbench/types.ts` 已有 `browser_capture` 输入类型。
- `packages/views/ai-workbench/schemas.ts` 已有 AI workbench fixture schema。
- `server/pkg/db/queries/issue.sql` 已有 issue metadata，但不适合保存完整嵌套 capture。
- `server/migrations/137_search_index_pg_trgm_extension.up.sql` 已安装 `pg_trgm`，可复用 trigram 搜索。
- `server/cmd/server/router.go` 已有 authenticated workspace-scoped API 分组，可新增 browser capture route。

### 建议新增文件

```text
server/migrations/143_browser_captures.up.sql
server/migrations/143_browser_captures.down.sql
server/pkg/db/queries/browser_capture.sql
server/internal/handler/browser_capture.go
server/internal/service/memory_enrichment.go
server/internal/service/memory_rule.go
server/internal/service/memory_search.go
server/internal/service/page_metadata.go
packages/core/browser-memory/types.ts
packages/core/browser-memory/queries.ts
packages/core/browser-memory/mutations.ts
packages/core/api/schemas.ts
apps/extension/*
```

### Go 等价模块

Karakeep 的 workers 能力在 Didian 中建议拆成以下 Go 服务：

| Go 模块 | 等价能力 | 说明 |
| --- | --- | --- |
| `page_metadata.go` | metascraper | 抽取 title、description、image、favicon、author、publisher、publishedAt。 |
| `readability.go` | Readability | 抽取正文。MVP 可先用简单 DOM/text parser，复杂版本再接外部库或 daemon。 |
| `memory_enrichment.go` | crawler worker / AI worker | 调度 metadata、archive、summary、tagging、embedding 子任务。 |
| `memory_search.go` | Meilisearch search | 用 PostgreSQL trigram/LIKE 和 URL 规则做混合召回。 |
| `memory_rule.go` | rule engine | 事件、条件、动作执行器；后续接 Autopilot UI。 |
| `archive_capture.go` | full page archive | 处理 SingleFile HTML、MHTML、服务端 Playwright/chromedp 归档。 |

MVP 可以先把 enrichment job 做成服务端 goroutine/cron 风格，后续再接现有 task queue 或本地 daemon runtime。不要为这条功能先引入一套独立 worker 基础设施。

## 12. 实施拆分

### Phase 0：技术验证

- 新建最小 Chrome MV3 扩展。
- 用 `activeTab` + `scripting.executeScript` 抽取当前页 title/url/selection/text。
- 在 Google/Bing 搜索页插入静态 Didian overlay。
- 验证特殊页面、PDF、GitHub、Docs、百度搜索页的失败表现。
- 用 Go 写一个最小 metadata/readability 原型：输入 URL 和 HTML，输出 title、description、readableText、links。
- 验证 PostgreSQL trigram 查询能覆盖 `url/title/keyword` 召回。

### Phase 1：收藏闭环

- 新增 `captured_source` / `page_memory` schema 和 sqlc queries。
- 新增 `POST /api/browser-captures`。
- 扩展按钮把当前页保存到 Didian。
- AI Inbox 展示最近收藏。
- 摘要任务先用后台 Go enrichment job；LLM 失败不影响收藏成功。
- 增加 `memory_state`：`active`、`muted`、`pinned`、`archived`。

### Phase 2：搜索召回

- 新增 `POST /api/browser-memory/search-matches`。
- 支持 Google/Bing/百度/GitHub search extractor。
- 实现 URL/title/keyword/trigram 混合召回。
- 搜索页 overlay 展示匹配卡片和 matched reason。
- 插件 badge 显示当前页是否已收藏，支持打开 Didian 详情。

### Phase 3：增强归档和原生书签

- 可选开启 SingleFile HTML 归档，作为第一优先完整页面保存方案。
- 可选开启 `pageCapture` 保存 MHTML。
- 可选开启 `bookmarks` 监听原生书签新增。
- 增加 notes/highlights 作为召回证据。
- 增加 Chrome bookmarks 导入。

### Phase 4：自动整理和深度处理

- 增加 memory rule engine，并在后续 Autopilot 中以 dry-run 策略建议展示。
- 增加 RSS feed import。
- 增加 PDF/OCR/video 解析。
- 增加 embedding 召回和 Atlas 关系沉淀。

## 13. 风险与降级

| 风险 | 影响 | 降级 |
| --- | --- | --- |
| 搜索页 DOM 变化 | 提示卡不出现或结果解析少 | 至少用 URL query 读取搜索词；extractor 失败不上报致命错误。 |
| 权限过重影响安装 | 用户不愿安装 | MVP 只用 `activeTab` 和指定搜索站点权限；高级功能按需开启。 |
| 摘要成本高 | 收藏延迟或成本不可控 | 收藏先成功，摘要异步；限制正文长度；失败可重试。 |
| 召回太吵 | 用户关闭功能 | 高阈值、折叠展示、站点级关闭、明确 matched reason。 |
| 页面内容敏感 | 隐私风险 | 默认用户点击才上传；提供“仅 URL/title”模式；企业/内网站点默认不传正文。 |
| MHTML 不兼容 | 离线归档失败 | 可检索文本层仍然可用；MHTML 作为可选附件。 |

## 14. 验收标准

MVP 通过标准：

- 用户能在普通网页点击 Didian 扩展按钮收藏页面。
- 平台能显示收藏页面标题、URL、摘要状态和采集时间。
- 摘要成功后生成 `summary/topics/entities/keywords`。
- 用户在支持的搜索引擎搜索相似主题时，能看到至少一条相关收藏提示。
- 提示卡展示匹配原因。
- 用户能关闭当前 query、当前站点或全局搜索召回。
- 特殊页面无法采集时有明确失败提示，不崩溃。

## 15. 决策记录

- 接受：第一版使用 Didian 扩展按钮作为收藏入口。
- 接受：第一版不默认监听原生浏览器书签。
- 接受：第一版不强依赖 MHTML 和 pgvector。
- 接受：页面采集事实和 AI 派生记忆使用独立领域模型，不塞进 `issue.metadata`。
- 待复核：Chrome `pageCapture`、`sidePanel` 和商店审核权限文案。
