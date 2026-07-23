# RocoTools AI 启动入口

此目录是受 Git 管理、可跨电脑携带的工程上下文。它替代仅存在于单机 `.codex/` 中的启动资料。

## 启动话术

开始任何 RocoTools 任务时，第一条进度明确指向：

> RocoTools 启动指向：`docs/ai/START_HERE.md` → `PROJECT_CONTEXT.md` → `STATUS.md` → `RISK_REGISTER.md` → `HANDOFF.md`。当前先验证上下文，尚未修改代码。

## 必读顺序

1. `AGENTS.md`：仓库级行为、权限和完成定义。
2. `docs/ai/PROJECT_CONTEXT.md`：稳定架构、模块、术语和数据流。
3. `docs/ai/STATUS.md`：已上线、已提交、本地开发和规划状态。
4. `docs/ai/RISK_REGISTER.md`：高/中风险、证据与待办。
5. `docs/ai/HANDOFF.md`：最近任务、基准 commit、下一步和阻塞项。
6. 当前任务涉及的正式文档和代码。
7. Git 历史与只读验证结果。

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
2. 检查 `git status --short` 和变更范围。
3. 更新 `HANDOFF.md`；事实或风险变化时同步更新 `STATUS.md`、`RISK_REGISTER.md`。
4. 记录基准 commit、分支、改动、验证、未验证、下一步和阻塞项。
5. 最终答复明确指向：

> RocoTools 结束指向：`docs/ai/HANDOFF.md`（下一步）→ `docs/ai/STATUS.md`（功能状态）→ `docs/ai/RISK_REGISTER.md`（风险与剩余事项）。

如果任务没有改变工程状态，也必须说明上述文件“本次无需更新”，不得假称已经写入。

## 跨电脑要求

- 稳定工作从 `main` 拉取。
- 未完成工作必须使用功能分支、commit 和 push；stash 与未提交文件不会跨电脑。
- `.env`、数据库、上传素材和用户数据不得进入 Git，按受控同步流程单独获取。
- 在新电脑从仓库根目录启动 Codex，使根目录 `AGENTS.md` 自动生效。
