# App - 洛克王国世界数据应用

Express 后台 + Vue3 前端，service 层独立可复用。

🌐 **在线体验**：[https://eachz.cn/rocotools/](https://eachz.cn/rocotools/)

## 架构

```
app/
├── server/                     # 后台服务
│   ├── package.json
│   ├── sync_db.js              # 一键同步（缩略图 + WebP + 建表 + 导入 + 进化链）
│   ├── gen_thumbnails.js       # 缩略图生成（128px WebP）
│   ├── gen_webp.js             # 全量 WebP 副本生成
│   ├── gen_library_thumbs.js   # 素材库缩略图生成
│   ├── scripts/
│   │   └── sync-evolution-chains.js  # 进化链批量同步（BFS图论算法）
│   ├── root-static/            # 根路径静态文件（robots.txt 等）
│   ├── src/
│   │   ├── index.js            # Express 入口
│   │   ├── middleware/
│   │   │   ├── apiCache.js     # API 内存缓存中间件
│   │   │   └── authAdmin.js    # JWT 管理端鉴权
│   │   ├── services/           # 数据查询层（核心，环境无关）
│   │   ├── routes/             # Express 路由
│   │   │   ├── admin/          # 管理端路由（模块化拆分）
│   │   │   │   ├── index.js    # 主入口（登录 + 鉴权 + 子路由挂载）
│   │   │   │   ├── utils.js    # 公共工具函数 + 配置常量
│   │   │   │   ├── crud.js     # 通用表 CRUD
│   │   │   │   ├── navTabs.js  # 导航标签管理
│   │   │   │   ├── pika.js     # 皮卡月刊 + 活动同步
│   │   │   │   ├── upload.js   # 图片上传（WebP/缩略图生成）
│   │   │   │   ├── conflicts.js # 数据审查（爬虫冲突）
│   │   │   │   ├── backup.js   # 数据库备份/恢复/快照
│   │   │   │   ├── library.js  # 素材库（上传/目录/重命名）
│   │   │   │   ├── media.js    # 统一素材管理（全局浏览/删除）
│   │   │   │   ├── export.js   # Excel 导出
│   │   │   │   ├── petSkills.js # 精灵技能/蛋组/特性管理
│   │   │   │   └── crawl.js    # BWIKI爬取（预览+应用，cheerio解析）
│   │   │   ├── pets.js         # 精灵 API
│   │   │   ├── skills.js       # 技能 API
│   │   │   ├── elements.js     # 属性 API
│   │   │   ├── eggs.js         # 蛋组 API
│   │   │   ├── natures.js      # 性格 API
│   │   │   ├── seasons.js      # 赛季 API
│   │   │   ├── events.js       # 活动 API
│   │   │   └── pika.js         # 皮卡月刊 API
│   │   └── db/                 # SQLite 管理（schema + import + init）
│   ├── data/                   # SQLite 数据库 + 备份（运行时生成）
│   └── public/                 # 前端构建产物（build 后生成）
│
└── client/                     # 前端工程
    ├── package.json
    ├── index.html              # 入口（字体预加载 + 内联关键 CSS）
    ├── vite.config.js          # 构建配置（base: /rocotools/）
    ├── tailwind.config.js      # 主题色 + 系统字体
    ├── RESPONSIVE.md           # 响应式适配规范
    ├── DESIGN.md               # 视觉设计规范
    └── src/
        ├── main.js             # Vue 入口 + v-lazy-src / v-click-outside 指令
        ├── App.vue             # 布局（导航 + 内容区 + 底部）
        ├── api/index.js        # API 封装（20s 超时）
        ├── router/index.js     # 路由（scrollBehavior 滚动恢复）
        ├── composables/
        │   ├── useTheme.js     # 暗色模式
        │   ├── useLazyImage.js # 图片懒加载 + 并发队列
        │   ├── useModal.js     # 全局弹窗状态
        │   ├── useAdmin.js     # 管理端请求封装（30s 超时）
        │   ├── useImagePreview.js  # 图片预览
        │   ├── useCrawlPreview.js  # BWIKI爬取预览全局状态（最小化/恢复/跨页面持久化）
        │   └── usePageVisibility.js # 页面可见性恢复（5分钟后台切回刷新）
        ├── styles/main.scss    # Tailwind + 全局组件类
        ├── views/
        │   ├── user/           # 用户端 12 个页面
│   └── admin/          # 管理端 16 个页面
        └── components/
            └── shared/         # 可复用组件
                ├── DatePicker.vue      # 日期选择器
                ├── ElementMatchup.vue  # 属性克制展示
                ├── ImagePreview.vue    # 图片预览弹窗
                ├── ImageUploader.vue   # 图片上传（本地+素材库）
                ├── ModalDialog.vue     # 通用弹窗
                ├── PetCard.vue         # 精灵卡片
                ├── PetPicker.vue       # 精灵选择器（支持全形态）
                ├── SearchSelect.vue    # 搜索下拉选择
                ├── SkillPicker.vue     # 技能选择器（弹窗+多维筛选）
                └── StatsRadar.vue      # 种族值雷达图
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 + Vue Router（scrollBehavior 滚动恢复） |
| 构建工具 | Vite（代码分割，Vue 独立 chunk） |
| CSS | TailwindCSS + Sass（三端断点适配） |
| 后台 | Express + API 内存缓存 |
| 数据库 | SQLite3 (better-sqlite3) |
| 部署 | Nginx (HTTP/2 + Brotli) + PM2 cluster |

## 快速启动

### 开发模式

```bash
# 终端 1: 后台
cd app/server
npm install
node sync_db.js      # 首次需要：缩略图 + WebP + 建库 + 进化链同步
npm run dev          # http://localhost:3000

# 终端 2: 前端
cd app/client
npm install
npm run dev          # http://localhost:5173
```

### 生产部署

```bash
cd app/client && npm run build
pm2 start app/server/src/index.js --name roco -i 2
```

## API 接口

| 路由 | 说明 | 缓存 |
|------|------|------|
| `GET /api/elements` | 属性列表 | 10 分钟 |
| `GET /api/elements/multipliers` | 伤害倍率 | 10 分钟 |
| `GET /api/skills?page&limit&search&category&element_id&keyword` | 技能列表 | 5 分钟 |
| `GET /api/skills/:uid` | 技能详情 | 5 分钟 |
| `GET /api/eggs` | 蛋组列表 | 10 分钟 |
| `GET /api/eggs/:id` | 蛋组精灵 | 10 分钟 |
| `GET /api/pets?page&limit&search&element_id&sort_by&order&all_variants` | 精灵列表 | 5 分钟 |
| `GET /api/pets/:uid` | 精灵详情（含进化链） | 5 分钟 |
| `GET /api/pets/shiny` | 异色列表 | 5 分钟 |
| `GET /api/natures` | 性格列表 | 10 分钟 |
| `GET /api/seasons` | 赛季列表 | 5 分钟 |
| `GET /api/seasons/current` | 当前赛季 | 5 分钟 |
| `GET /api/events?season_id&all` | 活动日历 | 5 分钟 |
| `GET /api/pika-monthlies` | 皮卡月刊列表（含关联精灵） | 5 分钟 |

## 性能优化

- **图片懒加载**：IntersectionObserver + 并发队列（最多 6 张同时加载）
- **WebP 自动返回**：Nginx 检测浏览器 Accept 头，透明返回 WebP
- **Brotli 压缩**：优先 Brotli (level 6)，Gzip 备用
- **API 缓存**：内存缓存中间件，响应头 `X-Cache: HIT/MISS`
- **代码分割**：Vue/Vue Router 独立 chunk，业务更新不重载框架
- **系统字体**：正文用 PingFang SC / 微软雅黑，零网络请求
- **HTTP/2**：多路复用消除并发连接瓶颈
- **长缓存**：静态资源 365 天 immutable 缓存
- **路由滚动恢复**：scrollBehavior 延迟 300ms 恢复，等待异步数据渲染

## 前端特性

### 文本高亮系统

技能描述和特性描述中的关键词自动变色，支持 40+ 关键词映射到 18 种属性色系。详见 [docs/TEXT_HIGHLIGHT_COLORS.md](../docs/TEXT_HIGHLIGHT_COLORS.md)。

### 进化链展示

用户端进化条件支持富文本展示（EvoConditionTag 组件）：
- 技能类条件：显示技能图标，可点击跳转技能详情
- 精灵类条件：显示精灵缩略图+属性图标，可点击跳转精灵详情
- 属性类条件：显示属性图标+属性名

### 技能图标 Fallback

所有技能展示位置，当技能没有专属图标时自动显示对应属性图标。

### URL 状态同步

精灵列表页筛选状态（页码/搜索词/属性/排序）同步到 URL query 参数，返回时自动恢复。
