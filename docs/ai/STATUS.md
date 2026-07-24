# RocoTools 功能状态

> 最近核验：2026-07-24
> 仓库 `main` 已包含文档合并点：`8c37af0d69f6af4f337dfa0f1db6e1904852a2ea`
> 产品代码基准：`419a62a553b2eab1e72bf9348eb140347707a136`
> 文档修复分支原基准：`848207a9561c43146c9cf6223c6f4829b22eec88`
> 状态词：`deployed`、`committed`、`working-tree`、`planned`、`deprecated`

## 已验证状态

| 功能/能力 | 状态 | Git 证据 | 验证方式 | 备注 |
|---|---|---|---|---|
| V1.0 核心站点 | deployed | `7d867be` | 站点 HTTP 200 | 用户端、管理端、爬虫和单库链路 |
| 用户反馈 | deployed | `b5234ca` 等 | `/api/feedbacks/enabled` HTTP 200 | 实现文档已按当前代码修正 |
| Service Worker / PWA | deployed | `343b6d1`、`cf0d63e` | `sw.js`、manifest HTTP 200 | AI memory 已修正 |
| BWIKI 新版适配 | committed | `dd4faea` | Git 与代码 | 线上构建日期匹配，但无生产 SHA |
| 命定花种增强 | committed | `15fc601` | Git 与代码 | 线上页面可访问，未做管理操作 |
| 技能课题抓取 | committed | `b51f526` | Git 与脚本 | 独立两阶段脚本 |
| Q 版头像 | deployed | `419a62a` | 线上邻居 API 返回 `avatar_url`，线上精灵详情构建包含该字段 | 生产 SHA 仍未知 |
| 管理端 Excel 整库导出 | committed | `550eb4a` | 路由与前端代码 | 不等于用户端报告导出 |
| 可移植 Agent 与上下文交接 Skill | committed | `a5f2ba4`～`848207a` | 已合并并推送到 `main`，上下文校验通过 | 尚未通过服务器 SHA 证明部署 |
| 双库隔离与发布 | planned | 无 | 全仓与全 Git 历史无相关符号 | 旧安全报告中的未提交实现不在当前仓库 |
| 精灵对比 | planned | 无 | README/AI memory 待办 | 范围待定义 |
| 用户端 Excel/PDF 报告 | planned | 无 | 待办与现代码对比 | 与管理端整库导出区分 |
| 文档一致性修复 | committed | `7735ecb`、合并点 `8c37af0` | 链接、命令、统计、状态和敏感信息扫描通过 | 已 fast-forward 进入并推送 `main` |
| 文档目录整理 | committed | `4ff7ac4`、合并点 `8c37af0` | 7 份正文归档、旧路径兼容入口、文档中心及链接验证通过 | 已 fast-forward 进入并推送 `main` |

## 当前仓库状态基线

- `main` 与 `origin/main` 均已包含文档合并点 `8c37af0`；产品代码最新提交仍为 `419a62a`。
- 当前工作分支：`main`。
- 文档一致性修复和目录整理已 fast-forward 合并并推送到 `main`，不含产品源码、schema 或运行数据。
- 已删除本地和远端的 `eachzhang/codex/context-handoff`、`eachzhang/codex/docs-drift`；其提交均由 `main` 保留。
- `SCRIPTS.md` 原行尾状态已通过工作区/索引哈希一致性确认并清除。
- 没有 stash；没有包含双库实现的其他可见分支。
- 可移植 Agent 与上下文交接 Skill 已合并并推送到 `main`，状态为 `committed`；生产部署仍未通过服务器 SHA 验证。

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
