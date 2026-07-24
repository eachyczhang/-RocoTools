# RocoTools 当前交接

> 更新时间：2026-07-24
> 交接状态：committed

## 基准

- 仓库：`F:\roco`
- 当前分支：`eachzhang/codex/docs-drift`
- 分支基准：`848207a9561c43146c9cf6223c6f4829b22eec88`
- `main` / `origin/main`：`848207a`
- 产品代码基准：`419a62a`
- 文档一致性实现提交：`7735ecb284871a0e7ef382d4ad0656427b6947dc`
- 文档目录整理基准：`3c22a7aab13bdecfd6d0d5680e9efd68d952c91b`
- 文档目录整理实现提交：`4ff7ac4531bd9dac18670e32d151e4d80ba595ad`
- stash：无

## 当前目标

完成第一批文档目录整理：集中权威正文、保留旧路径兼容入口并验证引用；不改业务逻辑、数据结构或运行数据。

## 已完成

1. 清除 `SCRIPTS.md` 仅由行尾/文件状态造成的修改标记，工作区与索引哈希一致。
2. 将上下文分支提交 `848207a` 推送，并 fast-forward 合并、推送到 `main`。
3. 从最新 `main` 创建 `eachzhang/codex/docs-drift`。
4. 统一当前 SQLite 口径：374 个去重精灵、494 个形态、495 个技能、18 个属性、15 个蛋组、30 个性格。
5. 校准 `sync_db.js`：默认生成图片衍生物并建表/补列但不导入 JSON；`--full` 才完整导入和后处理。
6. 区分爬虫自动 init/import、完整导入、服务器数据拉取与代码部署。
7. 新增受 Git 管理的脱敏 `docs/operations/DEPLOY.md`，并在 `.gitignore` 中仅对此文件取消忽略。
8. 记录服务器脚本按前后端差异构建、每个新提交 reload PM2、不执行数据库操作的实际行为。
9. 将反馈文档从待开发设计稿重写为 deployed 实现、真实 API、存储与风险说明。
10. 更新 README、架构、app/scripts/crawler README、CHANGELOG、DOC_RULES、AI memory 和已跟踪开发 Skills。
11. 从 `.ai-memory.md` 移除真实源站 IP；历史 CHANGELOG 和生成报告保留并标明其口径。
12. 更新 STATUS、TODO 和 RISK_REGISTER；M-06 文档漂移标记为 mitigated。
13. 新增 `docs/README.md` 文档中心。
14. 将架构、独立功能、提交规范和展示标准共 7 份正文移动到分类目录。
15. 旧路径保留兼容入口，仓库内部权威引用改为新路径。
16. 更新 README、DOC_RULES、AI memory、开发 Skills 和 AI 上下文中的文档路径。

## 验证记录

- `scripts/verify-context.ps1`：启动时通过；本地 SQLite `integrity_check=ok`，统计口径一致。
- Markdown 本地链接检查：通过。
- 受维护文档敏感 IP、反馈旧 API/状态、已删除脚本和“push 即部署”扫描：通过。
- `git diff --check`：通过。
- 产品源码、数据库 schema 和运行数据 diff：无。
- 7 份迁移正文内容保持一致；架构文档仅清理 1 行既有尾随空格。
- 受 Git 管理及本轮新增 Markdown 本地链接检查通过。
- 固定 AI 上下文路径验证通过；旧路径兼容入口可解析。
- 服务器只读 SSH：认证仍失败，本轮未执行远程命令、部署、PM2/Nginx reload 或数据库操作。

## 下一步

1. 审核 `eachzhang/codex/docs-drift`，决定是否合并到 `main`。
2. 合并后从新任务验证 `docs/README.md`、根 `AGENTS.md` 和仓库 Skill 自动生效。
3. 文档稳定后进入精灵对比功能定义与实现。
4. 配置可用 SSH 公钥后补取生产 SHA、PM2 状态和精确构建证据。

## 未确定/外部依赖

- 生产服务器实际 commit SHA。
- PM2 实际进程状态和线上构建的精确 commit。
- 生产 Nginx 配置与仓库模板差异。
- 最新依赖 advisory 数量。

## 结束话术

> RocoTools 结束指向：`docs/ai/HANDOFF.md`（下一步）→ `docs/ai/STATUS.md`（功能状态）→ `docs/ai/RISK_REGISTER.md`（风险与剩余事项）。
