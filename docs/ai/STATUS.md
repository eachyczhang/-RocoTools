# RocoTools 功能状态

> 最近核验：2026-07-23
> 本地 HEAD：`419a62a553b2eab1e72bf9348eb140347707a136`
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
| Q 版头像 | committed | `419a62a` | Git、schema、构建日期 | 线上 SHA 未知 |
| 管理端 Excel 整库导出 | committed | `550eb4a` | 路由与前端代码 | 不等于用户端报告导出 |
| 双库隔离与发布 | planned | 无 | 全仓与全 Git 历史无相关符号 | 旧安全报告中的未提交实现不在当前仓库 |
| 精灵对比 | planned | 无 | README/AI memory 待办 | 范围待定义 |
| 用户端 Excel/PDF 报告 | planned | 无 | 待办与现代码对比 | 与管理端整库导出区分 |

## 当前仓库状态基线

- 分支：`main`
- 本地与 `origin/main` 基准一致：`419a62a`
- 2026-07-23 上下文核验开始时工作区干净。
- 没有 stash。
- 没有包含双库实现的其他可见分支。
- 本轮“可移植 Agent 与 skill”文件处于 `working-tree`，提交前不会出现在其他电脑。

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
