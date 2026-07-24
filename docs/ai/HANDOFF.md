# RocoTools 当前交接

> 更新时间：2026-07-24
> 交接状态：committed

## 基准

- 仓库：`F:\roco`
- 分支：`eachzhang/codex/context-handoff`
- 产品基准 commit：`419a62a553b2eab1e72bf9348eb140347707a136`
- 首个上下文实现 commit：`a5f2ba417ca810abba7633635d594d8cb70895b1`
- 本轮提交前 HEAD：`df1e51ff7c4ecde4c7d450b8a63d64708d3dee22`
- 基准时 `origin/main`：同上
- stash：无

## 当前目标

提交并推送生产分支、部署脚本、线上构建旁证与 TODO 更新，随后合并到 `main`。

## 本次已完成

- 新增根目录 `AGENTS.md` 作为 RocoTools 专属 Agent。
- 新增 `.agents/skills/rocotools-context-handoff/` 仓库级 skill。
- 新增 `docs/ai/` 启动、架构、状态、风险和交接文件。
- 新增 `scripts/verify-context.ps1` 只读核验脚本。
- 在 README 和旧 AI memory 增加新入口指向。
- 固定启动与结束话术，并明确分别指向 `START_HERE.md` 与 `HANDOFF.md`。
- 新增 `docs/ai/TODO.md`，记录文档漂移、功能开发及延期的 CI、性能和安全专项。
- 在 `START_HERE.md` 中加入 TODO 阅读入口和同步规则。
- 用户确认生产仓库使用 `main` 分支。
- 审查从服务器下载的 `deploy.sh`：固定拉取 `origin/main`，按前后端目录差异选择安装/构建，每次有效部署 reload PM2，不执行 `sync_db.js` 或 SQLite 校验。
- 确认下载的服务器脚本与仓库根目录本机忽略的 `deploy.sh` 正文一致；该文件已在 `07f830f` 从 Git 追踪移除，因此不会随 `main` 自动更新。
- 按用户要求从 TODO 移除生产 SQLite 完整性和数据量核验；生产数据由用户更新后主动同步回本地。

## 下一步

1. 合并 `eachzhang/codex/context-handoff` 到 `main` 并推送。
2. 从最新 `main` 创建独立文档修复分支，按 TODO 的 P0 顺序解决文档漂移。
3. 为当前电脑配置服务器可用的 SSH 私钥/代理后，补取生产 SHA、PM2 和精确构建证据。
4. 文档稳定后依次实现精灵对比、用户端 Excel 和 PDF 报告。

## 本次不包含

- 不修改产品功能代码。
- 不修复登记的安全风险。
- 不执行数据库写入、迁移、恢复或生产部署。
- 不读取生产 SQLite 完整性或数据量。
- 本轮 Git 合并只更新远程 `main`；不执行服务器部署、PM2 reload 或数据库操作。

## 验证记录

- Skill `quick_validate.py`：通过；在 `C:\tmp\rocotools-skill-validation` 隔离环境安装 PyYAML 后执行，未修改仓库或全局 Python。
- 客户端生产构建：`npm run build` 通过，111 个模块完成转换；仅有既有 Sass legacy API 弃用警告。
- 后端语法：`app/server/src` 下 35 个 JavaScript 文件全部通过 `node --check`。
- `scripts/verify-context.ps1`：通过；SQLite `integrity_check=ok`，374 个宠物、494 个形态、495 个技能、18 个属性、15 个蛋组、30 个性格。
- 上下文探针：未发现双库代码；同步默认模式为安全的“不自动导入”；H-01/H-02/H-03 和未启用 hooks 仍告警。
- `git diff --check`：通过，无输出。
- `git status --short`：实现提交 `a5f2ba4` 完成后工作区干净；本文件与 `STATUS.md` 的 committed 状态更新另行提交。
- 当前分支相对 `main` 实际领先 3 个 Codex 上下文提交：`a5f2ba4`、`3460453`、`df1e51f`；这是同一组工程交接改动，不含产品业务代码。
- 下载的服务器 `deploy.sh` 与 `F:\roco\deploy.sh` 规范化换行后正文一致。
- 只读 SSH 尝试失败：服务器返回 `Permission denied (publickey,password)`；未执行任何远程命令或服务器写操作。
- 公开站点核验：线上首页 Last-Modified 为 2026-06-10 17:00（北京时间），约晚于 `419a62a` 4 分钟；邻居 API 与线上精灵详情构建均包含 `avatar_url`，确认 Q 版头像已部署。
- 线上入口资源哈希与当前本地构建不同；生产 SHA 和逐字节构建对应关系仍未验证。

## 未确定/外部依赖

- 生产服务器实际 commit SHA（生产分支已由用户确认为 `main`）。
- PM2 当前进程状态和线上前端构建对应 commit。
- 生产环境凭据强度与实际 Nginx/PM2 配置。
- 最新依赖 advisory 数量。
- 历史双库未提交代码是否保存在仓库外。

## 结束话术

> RocoTools 结束指向：`docs/ai/HANDOFF.md`（下一步）→ `docs/ai/STATUS.md`（功能状态）→ `docs/ai/RISK_REGISTER.md`（风险与剩余事项）。
