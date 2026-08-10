# Didian 浏览器扩展 · Popup 重做设计文档

> 单一事实来源。所有改动以本文为准，完成后在「实施状态」打勾并对应提交。
> 分支：`buddy/captured-source-skill-opportunity`

## 1. 背景与目标

扩展是 Didian 的**采集入口**（见 `apps/extension/CLAUDE.md` / `AGENTS.md`），当前 popup 是一个 320px 的极简面板：标题 + 状态 pill、常驻的 API/Workspace 设置表单、一个 Capture 按钮、一行消息文字。功能性达标，但：

- **美观度**：纯扁平浅色，无主题、无动效、无品牌感、无微交互。
- **易用性**：设置常年占用主版面；采集后只有一行文字，看不到「采集了什么」；无历史回溯；首次未配置时按钮会静默失败，没有引导。

本次目标：在不改变既有采集协议语义的前提下，把 popup 重做成**紧凑、精致、有反馈**的体验——可视化采集结果、本地历史、折叠设置、空状态引导、light/dark/system 主题。

## 2. 架构与前后端逻辑

保持现有三层职责，**仅扩展 `capture-current-tab` 的返回**（附加页面摘要），不新增消息类型、不改 content script 协议、不改 manifest 权限。

```
┌──────────────┐  load-settings / save-settings / capture-current-tab
│   popup      │ ───────────────────────────────────────────────────┐
│ (视图层)     │                                                      │
└──────────────┘                                                      ▼
                                                                  ┌──────────────────┐
                                                                  │   background     │ (消息中枢 + 扩展后端)
                                                                  │ (service worker) │
                                                                  └──────────────────┘
                                                                         │ 注入/调用
                                                                         ▼
                                                              ┌──────────────────┐
                                                              │  content script  │ 提取页面元数据 → BrowserCapturePayload
                                                              │  (采集层)        │
                                                              └──────────────────┘
                                                                         │ POST /api/browser-captures (CSRF + workspace)
                                                                         ▼
                                                                 Didian Server
```

| 层 | 职责 | 本次改动 |
|---|---|---|
| popup | 渲染 UI、收集设置、发起采集、展示结果与历史 | 结构/样式/逻辑全面重做 |
| background | 接收消息 → 调用 content 采集 → 读 CSRF → POST → 回收结果 | `capture-current-tab` 返回回填 `summary` |
| content script | 提取页面 title/url/正文/链接/favicon/选区 | 不改 |

### 消息协议（向后兼容）

- `load-settings` → `{ ok, settings? }`：不变。
- `save-settings` → `{ ok, settings? }`：不变。
- `capture-current-tab` → `CaptureResult`（新增可选 `summary` 字段）。

## 3. 数据模型扩展（`src/shared/types.ts`）

```ts
export interface CaptureSummary {
  title: string;
  url?: string;             // 页面地址，供历史条目点击跳回原页
  domain?: string;
  faviconUrl?: string;
  previewImageUrl?: string;
  scope: CaptureScope;      // "page" | "selection"
  linkCount?: number;
  capturedAt: string;
}

export interface CaptureResult {
  ok: boolean;
  captureId?: string;
  duplicate?: boolean;
  memoryStatus?: "pending" | "processing" | "failed" | "ready" | string;
  failureReason?: string | null;
  error?: string;
  summary?: CaptureSummary;   // 新增：background 在采集链路回填
}

export interface HistoryItem {  // 本地历史，持久化于 chrome.storage.local
  id: string;
  captureId?: string;
  title: string;
  url?: string;             // 页面地址，点击在新标签打开
  domain?: string;
  faviconUrl?: string;
  previewImageUrl?: string;
  scope: CaptureScope;
  memoryStatus?: string;
  duplicate?: boolean;
  capturedAt: string;
}
```

`background.ts` 的 `captureCurrentTab()` 在 `postCapture` 成功后，用 content 返回的 `payload` 构造 `summary` 一并附上返回。

## 4. UI 结构（`src/popup/index.html` 组件树）

```
shell
├─ header
│  ├─ brand (logo 渐变 + "Didian" + "Browser Capture")
│  └─ theme-toggle (sun/moon/auto)
├─ empty-state        (未配置 workspace 时显示「连接 Didian」引导，隐藏主操作)
├─ capture-zone       (已配置时)
│  ├─ capture-button   (主操作，整页/选区自动判断)
│  └─ capture-hint    (当有选区时提示「将捕获选中内容」)
├─ result-card        (采集后动态插入：标题/域名/favicon/预览图/状态徽章/整页·选区)
├─ history
│  ├─ history-header  (标题 + 折叠开关)
│  └─ history-list    (最近 8 条：favicon+标题+域名+状态点+时间)
├─ settings-drawer    (齿轮触发，折叠面板：API URL + Workspace + Save)
└─ status-bar         (状态点 + 文案，替代原 pill)
```

## 5. 设计系统（`src/popup/popup.css`）

- **主题**：`[data-theme="light"|"dark"|"system"]` + CSS 变量；`system` 用 `matchMedia('(prefers-color-scheme: dark)')` 解析。持久化到 `chrome.storage.local` 的 `theme`。
- **Design tokens**：语义色（bg / surface / border / text / muted / accent / 状态色）、间距、圆角（12–20px）、阴影、动效曲线（`cubic-bezier(.16,1,.3,1)`）。
- **质感**：玻璃拟态卡片（`backdrop-filter: blur + saturate`）、柔和阴影、渐变品牌头。
- **状态色**：pending=琥珀、processing=蓝、ready=绿、failed=红、duplicate=灰。
- **动效**：按钮 hover scale + focus ring；卡片淡入上移；spinner 旋转；成功对勾描边动画。
- **约束**：宽度 320–360px；所有动效 `transform/opacity` 走合成层，目标 60fps。

## 6. 交互流程

1. **首启（未配置 workspace）**：显示 empty-state「连接 Didian」引导，Capture 弱化/禁用；点「去设置」展开 settings-drawer。
2. **已配置采集**：点 Capture → 按钮 spinner → 成功后插入 result-card（标题/域名/图标/预览/状态徽章/整页·选区标签）→ 同时写入本地历史（最新在前，最多 8 条）。
3. **历史**：可折叠；点条目在新标签打开原 URL（如有 captureId 可深链到工作台，后续接入）。
4. **设置**：齿轮抽屉折叠，保存后 `status-bar` 短暂提示「已保存」。
5. **主题**：右上切换 light/dark/system，即时生效并持久化。

## 7. 文件改动清单

| 文件 | 改动 |
|---|---|
| `src/shared/types.ts` | +`CaptureSummary`、+`HistoryItem`、`CaptureResult.summary` |
| `src/background.ts` | `captureCurrentTab` 回填 `summary` |
| `src/popup/index.html` | 结构重做（见 §4） |
| `src/popup/popup.css` | 设计系统（见 §5） |
| `src/popup/popup.ts` | 主题持久化/切换、设置折叠、空状态、结果卡片渲染、本地历史读写、i18n 切换 |
| `src/popup/dom.ts` | 新增：安全的 DOM 构建 helper（防 XSS，统一用 `textContent`/属性，禁止 `innerHTML` 拼接用户数据） |
| `src/popup/i18n.ts` | 新增：双语字典 + `t()` 插值函数（默认中文，可切英文） |
| `src/content/capture-page.test.ts` | 不动（协议不变） |

## 8. 安全与规范

- **XSS**：所有来自页面的字段（title/description/selectedText/link/domain）一律经 `textContent` 或安全属性设置，绝不用 `innerHTML` 拼接。图标 URL 仅作 `<img src>`，失败时回退到首字母头像。
- **最小权限**：不改 `manifest.json` 的 `permissions` / `host_permissions`。
- **不存 secret**：CSRF 走 cookie，设置只存 `apiBaseUrl` / `workspaceSlug`，不存 token。
- **紧凑 side panel**：宽度 ≤ 360px。
- **借鉴不复制**：体验参考 Karakeep 的一键收藏/重复检测，但不复制其 AGPL 源码。

## 9. 验证策略

- `npm run typecheck`（`tsc --noEmit`）必须通过。
- `npm run build`（esbuild）必须产出 `dist/`。
- 纯函数（如有抽取）补单测。
- 手动：Chrome 加载 `dist/`，验证 采集 / 历史 / 主题 / 设置 / 空状态 五条路径。

## 10. 国际化（i18n）

默认中文，支持一键切换英文，语言偏好持久化于 `chrome.storage.local`（key `lang`）。

**设计约束**
- 零依赖、零框架：独立于项目其余代码（不引 React/i18n 库），与扩展「原生 TS」风格一致。
- 静态文案走 `data-i18n` / `data-i18n-aria` 标记，`popup.ts` 的 `applyI18n()` 统一刷新；动态文案（状态、标签、徽章、历史开关）走 `t(key, vars)` 插值函数。
- 字典集中在 `src/popup/i18n.ts`（`zh` / `en` 两张表），新增语言只需加一张表。
- 切换语言时：刷新 `document.documentElement.lang`、所有 `[data-i18n]` 文本、`[data-i18n-aria]` 无障碍标签，并重绘历史开关文案；语言选择写入 storage，下次打开直接恢复。
- 品牌名 `Didian` 始终不翻译；占位文案（如 `go.dev · 2h ago`）属演示数据，不进入字典。

**文件改动**
| 文件 | 改动 |
|---|---|
| `src/popup/i18n.ts` | 新增：双语字典 + `t()` / `getLang()` / `setLang()` |
| `src/popup/index.html` | 静态文案加 `data-i18n`；头部新增 `#lang-toggle` 语言切换按钮（包进 `.header-actions`） |
| `src/popup/popup.ts` | `initLang()` 读/写 `lang`；`applyI18n()` 刷新文案；动态文本全部改为 `t()`；头部加 `.header-actions` 容器样式 |
| `src/popup/popup.css` | 新增 `.header-actions` 与 `#lang-toggle` 样式 |

## 11. 实施状态

- [x] 数据层增强（`types.ts` 加 `CaptureSummary`/`HistoryItem`/`url`，`background.ts` 回填 `summary`）
- [x] 新增 `dom.ts` 安全 helper（XSS 防护，`http(s)` 图标校验 + 首字母回退）
- [x] `index.html` 结构重做（品牌头/主题/空状态/主操作/结果卡/历史/设置抽屉/状态栏）
- [x] `popup.css` 设计系统（light·dark·system 三主题 token、暖中性面 + 深炭灰主按钮 + 品牌蓝点缀、克制留白、状态色 tinted pill、动效曲线）
- [x] `popup.ts` 逻辑（主题持久化与切换、设置折叠、空状态引导、结果卡片渲染、本地历史读写与跳回）
- [x] `chrome.d.ts` 补齐 `storage.local` 与 `tabs.create` 声明
- [x] `i18n.ts` 双语字典 + 默认中文、可切英文、持久化于 `chrome.storage.local`
- [x] `index.html` 加 `data-i18n` 标记与 `#lang-toggle` 按钮；`popup.ts` 接 `applyI18n()`，动态文案改为 `t()`
- [x] **采集前选区检测提示**：popup 打开时通过 `detect-selection` 消息（background 用 `chrome.scripting.executeScript` 注入选区判断）查询当前页面是否含选区，在主按钮上方显示「将捕获整页 / 将捕获选中内容」；`chrome.d.ts` 扩展 `executeScript` 以支持 `func` 重载；中英双语文案走 i18n
- [x] typecheck（`tsc --noEmit`）+ build（esbuild → `dist/`）验证通过
- [x] 提交到 `buddy/captured-source-skill-opportunity` 分支（含本设计文档更新）
