# RocoTools AI 启动入口

此目录是受 Git 管理、可跨电脑携带的工程上下文。它替代仅存在于单机 `.codex/` 中的启动资料。

完整启动只在新任务、恢复/交接、分支或外部状态变化以及高风险任务中执行。同一 Codex 任务内的连续追问和小范围修改复用最近一次验证结果，不重复启动话术、本文档链和 `verify-context.ps1`。

快速通道下：

- 普通问答直接回答；
- 小改动只读相关文件并做一次定向验证；
- 不重复全量 Git 状态、构建和 AI 文档更新；
- 用户未要求时不 commit 或 push。

## 启动话术

需要完整启动时，第一条进度明确指向：

> RocoTools 启动指向：`docs/ai/START_HERE.md` → `PROJECT_CONTEXT.md` → `STATUS.md` → `RISK_REGISTER.md` → `HANDOFF.md`。当前先验证上下文，尚未修改代码。

## 必读顺序

1. `AGENTS.md`：仓库级行为、权限和完成定义。
2. `docs/ai/PROJECT_CONTEXT.md`：稳定架构、模块、术语和数据流。
3. `docs/ai/STATUS.md`：已上线、已提交、本地开发和规划状态。
4. `docs/ai/RISK_REGISTER.md`：高/中风险、证据与待办。
5. `docs/ai/TODO.md`：当前优先级、待办范围和完成定义。
6. `docs/ai/HANDOFF.md`：最近任务、基准 commit、下一步和阻塞项。
7. 当前任务涉及的正式文档和代码。
8. Git 历史与只读验证结果。

不要为了“建立上下文”默认重读所有游戏规则、所有历史 AI 文件或无关代码。先使用本目录路由，再按任务范围渐进读取。

## 启动检查

从仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-context.ps1
```

最低检查：

- 当前分支、HEAD、工作区状态。
- 本目录要求的文件是否存在。
- 本地 SQLite 完整性与统计口径（数据库存在时）。
- 双库代码是否真实存在。
- 已登记的认证、公告、反馈附件和部署风险是否仍能在代码中复现。
- Git hooks 是否实际启用。

## 修改前输出

修改代码前向用户总结：

- 项目架构和主要模块。
- 当前任务涉及的专业术语。
- `deployed`、`committed`、`working-tree`、`planned` 内容。
- 必须遵守的开发规范。
- 相关高风险、中风险和 TODO。
- 尚未确定、需从代码或环境验证的内容。

## 结束流程

1. 运行相关测试、构建或只读检查。
2. 完整开发、审查、发布或交接任务检查 `git status --short` 和变更范围；连续追问不重复检查。
3. 只有产生需跨任务恢复的重要状态、事实、风险或明确交接点时更新 AI 文档。
4. 必要时记录基准 commit、分支、改动、验证、未验证、下一步和阻塞项。
5. 完整任务的最终答复明确指向：

> RocoTools 结束指向：`docs/ai/HANDOFF.md`（下一步）→ `docs/ai/STATUS.md`（功能状态）→ `docs/ai/RISK_REGISTER.md`（风险与剩余事项）。

普通问答、连续追问和未改变工程事实的小改动无需更新上述文件。

## 跨电脑要求

- 稳定工作从 `main` 拉取。
- 只有需要跨电脑恢复的未完成工作才必须使用功能分支、commit 和 push；stash 与未提交文件不会跨电脑。
- `.env`、数据库、上传素材和用户数据不得进入 Git，按受控同步流程单独获取。
- 在新电脑从仓库根目录启动 Codex，使根目录 `AGENTS.md` 自动生效。
