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
| 精灵图鉴 | `/rocotools/pets` | 搜索/属性筛选/排序/分页，支持异色预览 |
| 精灵详情 | `/rocotools/pets/:uid` | 立绘切换、种族值雷达图、属性克制、技能列表 |
| 技能列表 | `/rocotools/skills` | 按属性/分类/应对/效果关键词筛选 |
| 技能详情 | `/rocotools/skills/:uid` | 技能数据 + 可学习精灵（按来源分类） |
| 打击面分析 | `/rocotools/coverage` | 选属性组合 → 查匹配精灵（含血脉） |
| 蛋组 | `/rocotools/eggs` | 15 种蛋组及其精灵成员 |
| 性格 | `/rocotools/natures` | 30 种性格属性增减查询 |
| 属性克制 | `/rocotools/elements` | 克制表(18×18)、双属性表、详细查询 |
| 皮卡月刊 | `/rocotools/pika` | 角色时装期刊展示（全屏翻页、精灵切换） |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 爬虫 | Python 3, requests, BeautifulSoup4, 并发线程池 |
| 后台 | Node.js, Express, better-sqlite3, API 内存缓存 |
| 前端 | Vue 3, Vue Router, Vite, TailwindCSS, Sass |
| 数据库 | SQLite3（轻量单文件） |
| 部署 | Nginx (HTTP/2) + PM2 + Let's Encrypt SSL |

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
│   │   ├── src/            # 路由、Service、数据库
│   │   ├── gen_thumbnails.js  # 缩略图生成
│   │   ├── gen_webp.js     # WebP 批量转换
│   │   └── sync_db.js      # 一键同步（缩略图+WebP+建表+导入）
│   └── client/             # Vue3 前端（Vite + TailwindCSS）
│       ├── RESPONSIVE.md   # 响应式适配规范
│       └── DESIGN.md       # 视觉设计规范
├── nginx.conf              # Nginx 站点配置
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
node sync_db.js          # 生成缩略图 + WebP + 建库导入

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

## 性能优化

| 优化项 | 说明 |
|--------|------|
| HTTP/2 | 多路复用，消除并发连接限制 |
| WebP 自动返回 | Nginx 检测浏览器支持，透明返回 WebP |
| 图片懒加载 | IntersectionObserver + 并发队列（max 6） |
| API 缓存 | 内存缓存 5-10 分钟，减少 DB 查询 |
| Gzip 压缩 | 文本资源全量压缩 |
| 长缓存 | Vite 带 hash 的 assets 缓存 1 年 |
| 代码分割 | Vue 框架独立 chunk |
| 系统字体 | 不加载网络字体，零额外请求 |

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
| `GET /api/pets?page&limit&search&element_id&sort_by&order` | 精灵列表 |
| `GET /api/pets/:uid` | 精灵完整详情 |
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
