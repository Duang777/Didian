# 环境记录

这个工作区用于实现 Didian 资源工作台。

## 当前状态

- 工作区位于 `multica-resource-workbench/`。
- 已添加根级和模块级 `AGENTS.md` / `CLAUDE.md` 指南文件。
- 实施计划已写入 `tasks/plan.md`。
- 任务清单已写入 `tasks/todo.md`。

## 尚未运行的验证

开始实现前应先运行：

```bash
pnpm install
pnpm typecheck
make test
```

如果缺少前置条件，请在修改应用代码前，把准确失败信息和需要的本地配置记录到这里。
