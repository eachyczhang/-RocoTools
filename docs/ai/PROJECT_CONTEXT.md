# RocoTools 工程上下文

> 最近核验：2026-07-24
> 仓库基准提交：`848207a9561c43146c9cf6223c6f4829b22eec88`（产品代码基准仍为 `419a62a`）

## 项目定位

RocoTools 是洛克王国世界游戏数据工具站，包含数据采集、清洗、SQLite 存储、Express API、Vue 用户端、管理端和生产运维。

## 架构与数据流

```text
BWIKI
  → crawler/ Python 爬虫
  → data/ JSON 与图片
  → app/server/src/db/ 导入与迁移
  → app/server/data/roco.db
  → Express REST API
  → Vue 3 SPA 用户端与管理端
  → Nginx + PM2 + CDN + PWA
```

## 主要模块

| 模块 | 位置 | 职责 |
|---|---|---|
| 爬虫 | `crawler/` | 属性、技能、蛋组、性格、精灵列表和详情采集 |
| 数据规范 | `data/FIELDS.md`、`data/STRUCTURE_RULES.md` | UID、字段、JSON、图片路径、导入顺序 |
| 数据库 | `app/server/src/db/` | schema、连接、初始化、迁移和导入 |
| 后端服务 | `app/server/src/` | 公开 API、服务层、缓存、鉴权和静态资源 fallback |
| 管理路由 | `app/server/src/routes/admin/` | CRUD、上传、素材、反馈、备份、Excel、爬取预览 |
| 前端 | `app/client/src/` | 13 个用户路由、登录及 17 个管理业务页面 |
| 运维 | `docs/operations/DEPLOY.md`、`nginx*.conf`、`ecosystem.config.js` | 脱敏部署说明、Nginx、PM2 双实例；服务器 `deploy.sh` 在 Git 外 |
| 工程规则 | `AGENTS.md`、`docs/ai/`、`.agents/skills/` | Agent 行为、状态、风险与跨电脑交接 |

## 核心数据

本地 SQLite 在 2026-07-23 验证：

| 口径 | 数量 |
|---|---:|
| 去重精灵 `COUNT(DISTINCT pet_id)` | 374 |
| 精灵形态 `COUNT(*)` | 494 |
| 技能 | 495 |
| 属性 | 18 |
| 蛋组 | 15 |
| 性格 | 30 |
| 数据表 | 20 |

`PRAGMA integrity_check` 返回 `ok`。

## 关键术语

| 术语 | 含义 |
|---|---|
| UID | 跨爬虫、数据库和前端稳定引用的数据标识 |
| `manual_edit` | 人工编辑保护标记，导入时避免覆盖人工数据 |
| UPSERT | 冲突时只更新明确字段，保留非导入字段 |
| WAL | SQLite 预写日志模式，用于改进读写并发 |
| JWT | 管理端 Bearer Token，当前有效期 4 小时 |
| fail-open | 安全配置缺失时仍使用默认值继续启动 |
| 存储型 XSS | 危险内容写入数据库后通过 HTML 渲染在浏览器执行 |
| 不可变备份 | 创建后不再作为活动库编辑或原地迁移的备份 |
| 原子切换 | 完整生成候选状态后一次性替换指针 |
| PWA / Service Worker | 前端安装、离线和运行时缓存能力 |

## 事实来源优先级

1. 当前代码、Git、实际配置和可复现检查。
2. 本目录中带验证日期和证据的记录。
3. 正式工程文档。
4. `.ai-memory.md`、`.dev/skills`、历史 CodeBuddy 记录。

## 数据与安全边界

- 单一数据库入口为 `app/server/src/db/connection.js`。
- schema 变更先更新 `app/server/src/db/schema.sql`。
- 普通 `node sync_db.js` 默认生成图片衍生物并建表/补列，但不导入 JSON；`--full` 才执行完整导入和后处理。
- 赛季、活动和运营数据由管理端维护。
- `.env`、数据库、上传素材、用户反馈和生产数据不得提交。
- 未经授权不执行生产部署、迁移、恢复、删除、密钥轮换或全量同步。

## 相关正式文档

- `README.md`
- `docs/ARCHITECTURE.md`
- `app/README.md`
- `app/ADMIN_RULES.md`
- `data/FIELDS.md`
- `data/STRUCTURE_RULES.md`
- `SCRIPTS.md`
- `docs/operations/DEPLOY.md`
- `CHANGELOG.md`
