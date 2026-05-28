# Roco Tools - 洛克王国世界数据工具

洛克王国世界（Roco World）游戏数据查询与分析工具，提供精灵图鉴、技能查询、属性克制、打击面分析等功能。

🌐 **在线体验**：[https://eachz.cn/rocotools/](https://eachz.cn/rocotools/)  
📖 **数据来源**：[洛克王国世界 BWIKI](https://wiki.biligame.com/rocom)

---

## 功能预览

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/rocotools/` | 数据概览（调用 /api/stats）、快速导航、版权声明 |
| 赛季 | `/rocotools/season` | 赛季封面+精灵展示，支持过往赛季切换 |
| 活动日历 | `/rocotools/events` | 当前赛季活跃活动时间轴 |
| 精灵图鉴 | `/rocotools/pets` | 搜索/属性筛选/排序/分页，URL 状态同步（返回保持筛选） |
| 精灵详情 | `/rocotools/pets/:uid` | 立绘切换、种族值雷达图、属性克制、技能列表、进化链（可点击跳转）、特性描述（关键词高亮） |
| 技能列表 | `/rocotools/skills` | 按属性/分类/应对/效果关键词筛选 |
| 技能详情 | `/rocotools/skills/:uid` | 技能数据 + 可学习精灵（按来源分类） |
| 打击面分析 | `/rocotools/coverage` | 选属性组合 → 查匹配精灵（含血脉） |
| 蛋组 | `/rocotools/eggs` | 15 种蛋组及其精灵成员 |
| 性格 | `/rocotools/natures` | 30 种性格属性增减查询 |
| 属性克制 | `/rocotools/elements` | 克制表(18×18)、双属性表、详细查询 |
| 皮卡月刊 | `/rocotools/pika` | 角色时装期刊展示（全屏翻页、精灵切换） |
| 命定花种 | `/rocotools/fate-flower` | 反制推荐（Boss克制精灵+技能搭配） |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 爬虫 | Python 3, requests, BeautifulSoup4, 并发线程池 |
| 后台 | Node.js, Express, better-sqlite3, API 内存缓存 |
| 前端 | Vue 3, Vue Router, Vite, TailwindCSS, Sass |
| 数据库 | SQLite3（轻量单文件） |
| 部署 | Nginx (HTTP/2 + Brotli) + PM2 + Let's Encrypt SSL |

---

## 项目结构

```
-RocoTools/
├── crawler/                # Python 爬虫（并发模式，5-8 分钟全量）
│   ├── run.py              # 总入口（--full / --update）
│   ├── scrapers/           # 各数据源爬虫
│   └── utils/              # 下载工具 + 校验报告
├── data/                   # 爬取数据（JSON + 图片，不纳入 git）
│   ├── elements/           # 属性克制关系（18 种）
│   ├── skills/             # 技能数据（469+）
│   ├── eggs/               # 蛋组数据（15 组）
│   ├── pets/               # 精灵数据（466+）
│   └── public/             # 图片静态资源
├── app/
│   ├── server/             # Express 后台（SQLite + RESTful API）
│   ├── src/
│   │   ├── routes/     # API 路由
│   │   │   └── admin/  # 管理端（模块化：14 个子文件）│   │   │   ├── services/   # 数据查询层
│   │   │   └── db/         # 数据库管理
│   │   ├── scripts/        # 工具脚本（进化链同步等）
│   │   ├── gen_thumbnails.js  # 缩略图生成
│   │   ├── gen_webp.js     # WebP 批量转换
│   │   └── sync_db.js      # 一键同步（缩略图+WebP+建表+导入+进化链）
│   └── client/             # Vue3 前端（Vite + TailwindCSS）
│       ├── RESPONSIVE.md   # 响应式适配规范
│       └── DESIGN.md       # 视觉设计规范
├── docs/                   # 文档
│   ├── ARCHITECTURE.md     # 工程架构设计图（Mermaid）
│   ├── TEXT_HIGHLIGHT_COLORS.md  # 文本高亮颜色规范
│   └── game-notes/         # 游戏设定笔记
├── .dev/skills/            # AI Skills（开发参考）
├── nginx.conf              # Nginx 站点配置（Brotli + 长缓存）
└── deploy.sh               # 一键部署脚本
```

---

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+
- npm

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/eachyczhang/-RocoTools.git
cd -RocoTools

# 2. 爬取数据（首次需要）
pip install -r crawler/requirements.txt
python crawler/run.py --full

# 3. 初始化后台
cd app/server
npm install
node sync_db.js          # 生成缩略图 + WebP + 建库导入 + 进化链同步

# 4. 启动后台
npm run dev              # http://localhost:3000

# 5. 启动前端（另一个终端）
cd ../client
npm install
npm run dev              # http://localhost:5173
```

### 生产部署

```bash
# 构建前端
cd app/client && npm run build

# PM2 启动（零停机）
pm2 start app/server/src/index.js --name roco -i 2
pm2 save && pm2 startup

# 一键更新
./deploy.sh
```

---

## 数据流

```
BWIKI → crawler(采集+清洗) → data/(JSON+图片) → sync_db.js → SQLite → API → 前端
```

---

## 核心特性

### 进化链系统

- 结构化进化条件配置（4 种类型：文本/技能/属性/精灵）
- BFS 图论算法自动发现进化链组，合并多路线分支
- 管理端可视化编辑，用户端可点击跳转精灵/技能详情

### 文本高亮系统

- 技能描述 & 特性描述关键词自动变色
- 18 种属性色系 + 状态/印记/六维属性等 40+ 关键词映射
- 属性系文本（如"火系"）动态匹配对应颜色

### 智能图标 Fallback

- 技能无专属图标时自动显示对应属性图标
- 统一应用于所有技能展示位置

---

## 性能优化

| 优化项 | 说明 |
|--------|------|
| HTTP/2 | 多路复用，消除并发连接限制 |
| Brotli 压缩 | 优先 Brotli (level 6)，Gzip 备用 |
| WebP 自动返回 | Nginx 检测浏览器支持，透明返回 WebP |
| 图片懒加载 | IntersectionObserver + 并发队列（max 6） |
| API 缓存 | 内存缓存 5-10 分钟，减少 DB 查询 |
| 长缓存 | 静态资源 365 天 immutable 缓存 |
| 代码分割 | Vue 框架独立 chunk，路由级懒加载 |
| 系统字体 | 不加载网络字体，零额外请求 |
| 路由滚动恢复 | scrollBehavior 延迟恢复，等待异步数据渲染 |

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [DOC_RULES.md](./DOC_RULES.md) | 文档整理规则（所有 md 文件清单、维护规则、整理记录） |
| [SCRIPTS.md](./SCRIPTS.md) | 脚本执行手册（爬虫/同步/图片/构建的用途、参数和顺序） |
| [DEPLOY.md](./DEPLOY.md) | 服务器部署指南（环境安装/构建/Nginx/自动部署/排查） |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 工程架构设计图（12张 Mermaid 图：系统架构/数据流/ER图/路由/部署等） |
| [docs/TEXT_HIGHLIGHT_COLORS.md](./docs/TEXT_HIGHLIGHT_COLORS.md) | 文本高亮颜色规范（18属性色号+关键词映射表） |
| [app/ADMIN_RULES.md](./app/ADMIN_RULES.md) | 管理端业务规则（缓存/命名/校验/图片/进化条件/Nginx等） |
| [app/client/DESIGN.md](./app/client/DESIGN.md) | 视觉设计规范（色彩体系/组件样式/暗色模式/交互） |
| [app/client/RESPONSIVE.md](./app/client/RESPONSIVE.md) | 响应式适配规范（Mobile-first 三端断点） |
| [data/FIELDS.md](./data/FIELDS.md) | 数据字段对照表 |
| [data/STRUCTURE_RULES.md](./data/STRUCTURE_RULES.md) | 数据结构化规则 |
| [docs/game-notes/](./docs/game-notes/) | 游戏设定笔记（战斗/属性/能量/活动/赛季/技能/精灵/皮卡月刊） |

### AI Skills（.dev/skills/）

供 AI 助手开发时参考的技能文档：

| Skill | 说明 |
|-------|------|
| [rocotools-development.md](./.dev/skills/rocotools-development.md) | 综合开发 Skill（架构/流程/任务/调试） |
| [roco-admin.md](./.dev/skills/roco-admin.md) | 管理端开发规范 |
| [roco-data-spec.md](./.dev/skills/roco-data-spec.md) | 数据结构与命名规范 |
| [roco-deploy.md](./.dev/skills/roco-deploy.md) | 部署相关流程 |
| [roco-evolution.md](./.dev/skills/roco-evolution.md) | 进化链与进化条件配置系统 |
| [roco-text-highlight.md](./.dev/skills/roco-text-highlight.md) | 文本高亮颜色系统 |

---

## 响应式适配

支持手机、平板、桌面三端，采用 Mobile-first 渐进增强：

- `sm:` (640px) — 手机 → 平板过渡
- `md:` (768px) — 导航栏切换
- `lg:` (1024px) — 平板 → 桌面过渡

详见 [app/client/RESPONSIVE.md](./app/client/RESPONSIVE.md)

---

## 视觉设计规范

统一的色彩体系（金色主色）、组件样式、暗色模式、交互规范。

详见 [app/client/DESIGN.md](./app/client/DESIGN.md)

---

## API 接口

| 路由 | 说明 |
|------|------|
| `GET /api/stats` | 统计数据（pets/skills/elements/eggs/natures 数量） |
| `GET /api/elements` | 属性列表 |
| `GET /api/elements/multipliers` | 伤害倍率矩阵 |
| `GET /api/skills?page&limit&search&category&element_id&keyword` | 技能列表 |
| `GET /api/skills/:uid` | 技能详情 + 学习者 |
| `GET /api/eggs` | 蛋组列表 |
| `GET /api/eggs/:id` | 蛋组精灵 |
| `GET /api/pets?page&limit&search&element_id&sort_by&order&all_variants` | 精灵列表 |
| `GET /api/pets/:uid` | 精灵完整详情（含进化链） |
| `GET /api/pets/shiny` | 异色精灵列表 |
| `GET /api/natures` | 性格列表（30种） |
| `GET /api/seasons` | 所有赛季 |
| `GET /api/seasons/current` | 当前赛季 |
| `GET /api/events?season_id&all` | 活动日历（默认仅活跃） |
| `GET /api/pika-monthlies` | 皮卡月刊列表（含关联精灵） |

---

## 版权声明

© 2026 **Roco Tools** — Developed by [@eachzhang](https://github.com/eachyczhang)

- 精灵、技能等基础数据引用自 [洛克王国世界 BWIKI](https://wiki.biligame.com/rocom/)，版权归哔哩哔哩游戏Wiki所有
- 赛季、活动等运营数据部分来源于洛克王国世界官方在 [B站](https://space.bilibili.com/626796832)、[微博](https://weibo.com/u/7476327149)、[TapTap](https://www.taptap.cn/app/188212) 等官方社区平台发布的公告与活动信息
- 部分图片素材来源于游戏官网及官方创作者素材库，相关版权归腾讯/洛克王国世界官方所有
- 洛克王国世界游戏及相关IP版权归腾讯公司所有
- 本项目仅用于学习交流，非官方应用，无任何商业用途

## 协议

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans)
