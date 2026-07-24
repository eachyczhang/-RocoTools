# RocoTools 功能状态

> 最近核验：2026-07-24
> 产品基准 main：`419a62a553b2eab1e72bf9348eb140347707a136`
> 当前上下文提交基准：`df1e51ff7c4ecde4c7d450b8a63d64708d3dee22`（后续提交以 Git 历史为准）
> 状态词：`deployed`、`committed`、`working-tree`、`planned`、`deprecated`

## 已验证状态

| 功能/能力 | 状态 | Git 证据 | 验证方式 | 备注 |
|---|---|---|---|---|
| V1.0 核心站点 | deployed | `7d867be` | 站点 HTTP 200 | 用户端、管理端、爬虫和单库链路 |
| 用户反馈 | deployed | `3772d83` 等 | `/api/feedbacks/enabled` HTTP 200 | 文档仍错误标记“待开发” |
| Service Worker / PWA | deployed | `343b6d1`、`cf0d63e` | `sw.js`、manifest HTTP 200 | AI memory 待办已过期 |
| BWIKI 新版适配 | committed | `dd4faea` | Git 与代码 | 线上构建日期匹配，但无生产 SHA |
| 命定花种增强 | committed | `15fc601` | Git 与代码 | 线上页面可访问，未做管理操作 |
| 技能课题抓取 | committed | `b51f526` | Git 与脚本 | 独立两阶段脚本 |
| Q 版头像 | deployed | `419a62a` | 线上邻居 API 返回 `avatar_url`，线上精灵详情构建包含该字段 | 生产 SHA 仍未知 |
| 管理端 Excel 整库导出 | committed | `550eb4a` | 路由与前端代码 | 不等于用户端报告导出 |
| 可移植 Agent 与上下文交接 Skill | committed | `a5f2ba4` | Agent/Skill 校验、客户端构建、后端语法、SQLite 核验 | 位于功能分支，未合并或部署 |
| 双库隔离与发布 | planned | 无 | 全仓与全 Git 历史无相关符号 | 旧安全报告中的未提交实现不在当前仓库 |
| 精灵对比 | planned | 无 | README/AI memory 待办 | 范围待定义 |
| 用户端 Excel/PDF 报告 | planned | 无 | 待办与现代码对比 | 与管理端整库导出区分 |

## 当前仓库状态基线

- 产品基准分支：`main`，本地 `main` 与 `origin/main` 均为 `419a62a`。
- 当前工作分支：`eachzhang/codex/context-handoff`，HEAD 为 `df1e51f`，相对 `main` 领先 3 个同组 Codex 上下文提交。
- TODO 及生产事实文档已整理到 `eachzhang/codex/context-handoff`，状态为 `committed`。
- 2026-07-23 上下文核验开始时工作区干净；当前 `SCRIPTS.md` 仍有既有行尾状态。
- 没有 stash。
- 没有包含双库实现的其他可见分支。
- “可移植 Agent 与上下文交接 Skill”位于当前功能分支，状态为 `committed`；尚未合并或部署。

## 线上只读证据

2026-07-23 验证：

- `/rocotools/`：HTTP 200
- `/rocotools/sw.js`：HTTP 200
- `/rocotools/manifest.webmanifest`：HTTP 200
- `/api/seasons`：HTTP 200
- `/api/feedbacks/enabled`：HTTP 200
- `/api/stats`：374 精灵、495 技能、18 属性、15 蛋组、30 性格
- 线上首页与 `sw.js` Last-Modified：2026-06-10

没有读取生产 commit SHA，因此不能把“构建日期一致”提升为“生产代码逐字节等于 HEAD”。

2026-07-24 补充：

- 用户根据服务器现状确认生产仓库使用 `main` 分支。
- 从服务器下载的 `deploy.sh` 固定执行 `git pull origin main`；该脚本不运行数据库同步或校验。
- 只读 SSH 认证仍被服务器拒绝，因此生产 commit SHA、PM2 实际状态及线上构建与 commit 的精确对应关系仍未验证。
- 线上首页 Last-Modified 为 2026-06-10 17:00（北京时间），约晚于 `419a62a` 提交 4 分钟。
- 公开邻居 API 已返回 `avatar_url`，线上精灵详情构建也包含该字段，因此 Q 版头像可确认已部署；该证据只能证明线上包含 `419a62a` 引入的功能，不能替代服务器 `git rev-parse HEAD`。
- 线上入口资源哈希与当前本地构建不同，不能据此宣称生产构建与本地 HEAD 逐字节一致。
