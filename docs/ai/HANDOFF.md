# RocoTools 当前交接

> 更新时间：2026-07-23
> 交接状态：committed

## 基准

- 仓库：`F:\roco`
- 分支：`eachzhang/codex/context-handoff`
- 产品基准 commit：`419a62a553b2eab1e72bf9348eb140347707a136`
- 上下文实现 commit：`a5f2ba417ca810abba7633635d594d8cb70895b1`
- 基准时 `origin/main`：同上
- stash：无

## 当前目标

建立并发布受 Git 管理、可跨电脑自动加载的 RocoTools 专属 Agent、上下文交接 skill、状态/风险文档和只读验证入口。

## 本次已完成

- 新增根目录 `AGENTS.md` 作为 RocoTools 专属 Agent。
- 新增 `.agents/skills/rocotools-context-handoff/` 仓库级 skill。
- 新增 `docs/ai/` 启动、架构、状态、风险和交接文件。
- 新增 `scripts/verify-context.ps1` 只读核验脚本。
- 在 README 和旧 AI memory 增加新入口指向。
- 固定启动与结束话术，并明确分别指向 `START_HERE.md` 与 `HANDOFF.md`。

## 下一步

1. 推送本分支到 `origin/eachzhang/codex/context-handoff`。
2. 新电脑拉取该分支后，从仓库根目录启动 Codex，并先运行 `scripts/verify-context.ps1`。
3. 后续单独处理 `RISK_REGISTER.md` 中的安全与文档漂移事项。

## 本次不包含

- 不修改产品功能代码。
- 不修复登记的安全风险。
- 不执行数据库写入、迁移、恢复或生产部署。
- 不创建 PR，不合并 `main`，不执行生产部署。

## 验证记录

- Skill `quick_validate.py`：通过；在 `C:\tmp\rocotools-skill-validation` 隔离环境安装 PyYAML 后执行，未修改仓库或全局 Python。
- 客户端生产构建：`npm run build` 通过，111 个模块完成转换；仅有既有 Sass legacy API 弃用警告。
- 后端语法：`app/server/src` 下 35 个 JavaScript 文件全部通过 `node --check`。
- `scripts/verify-context.ps1`：通过；SQLite `integrity_check=ok`，374 个宠物、494 个形态、495 个技能、18 个属性、15 个蛋组、30 个性格。
- 上下文探针：未发现双库代码；同步默认模式为安全的“不自动导入”；H-01/H-02/H-03 和未启用 hooks 仍告警。
- `git diff --check`：通过，无输出。
- `git status --short`：实现提交 `a5f2ba4` 完成后工作区干净；本文件与 `STATUS.md` 的 committed 状态更新另行提交。

## 未确定/外部依赖

- 生产服务器实际 commit SHA。
- 生产环境凭据强度与实际 Nginx/PM2 配置。
- 最新依赖 advisory 数量。
- 历史双库未提交代码是否保存在仓库外。

## 结束话术

> RocoTools 结束指向：`docs/ai/HANDOFF.md`（下一步）→ `docs/ai/STATUS.md`（功能状态）→ `docs/ai/RISK_REGISTER.md`（风险与剩余事项）。
