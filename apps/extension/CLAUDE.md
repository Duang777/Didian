# apps/extension 指南

扩展是采集入口，不是主要 Agent runtime。

## 规则

- 默认做被动采集：标题、URL、正文、链接、favicon、选中文本。
- 添加 downloads、bookmarks 或宽泛 host permissions 等强权限前必须先确认。
- 向工作台发送结构化 payload；不要在扩展里让 LLM 解释原始 DOM。
- UI 要适合紧凑 side panel。
- 除非后续 browser-assisted adapter 明确需要并经过确认，否则不要执行会修改用户页面的脚本。
- 借鉴 Karakeep（https://github.com/karakeep-app/karakeep）的 capture/enrichment/recall 分层，但不要复制 AGPL-3.0 源码。
- 第一版目标是把 capture 送入 AI Inbox / Mission / Atlas；Autopilot 只作为后续基于真实重复行为的策略建议。

## 采集 Payload 形状

包含稳定字段：source tab ID、URL、title、domain、capturedAt、text、links、selection、favicon、capture scope。
