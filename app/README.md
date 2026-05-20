# App - 洛克王国世界数据应用

Express 后台 + Vue3 前端，service 层独立可复用。

🌐 **在线体验**：[https://eachz.cn/rocotools/](https://eachz.cn/rocotools/)

## 架构

```
app/
├── server/                     # 后台服务
│   ├── package.json
│   ├── sync_db.js              # 一键同步（缩略图 + WebP + 建表 + 导入）
│   ├── gen_thumbnails.js       # 缩略图生成（128px WebP）
│   ├── gen_webp.js             # 全量 WebP 副本生成
│   ├── root-static/            # 根路径静态文件（robots.txt 等）
│   ├── src/
│   │   ├── index.js            # Express 入口
│   │   ├── middleware/
│   │   │   └── apiCache.js     # API 内存缓存中间件
│   │   ├── services/           # 数据查询层（核心，环境无关）
│   │   ├── routes/             # Express 路由
│   │   └── db/                 # SQLite 管理
│   ├── data/                   # SQLite 数据库（运行时生成）
│   └── public/                 # 前端构建产物（build 后生成）
│
└── client/                     # 前端工程
    ├── package.json
    ├── index.html              # 入口（字体预加载 + 内联关键 CSS）
    ├── vite.config.js          # 构建配置（base: /rocotools/）
    ├── tailwind.config.js      # 主题色 + 系统字体
    ├── RESPONSIVE.md           # 响应式适配规范
    └── src/
        ├── main.js             # Vue 入口 + v-lazy-src 指令注册
        ├── App.vue             # 布局（导航 + 内容区 + 底部）
        ├── api/index.js        # API 封装
        ├── router/index.js     # 路由（base: /rocotools/）
        ├── composables/
        │   ├── useTheme.js     # 暗色模式
        │   └── useLazyImage.js # 图片懒加载 + 并发队列
        ├── styles/main.scss    # Tailwind + 全局组件类
        ├── views/              # 页面视图
        └── components/         # 可复用组件
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 + Vue Router |
| 构建工具 | Vite（代码分割，Vue 独立 chunk） |
| CSS | TailwindCSS + Sass（三端断点适配） |
| 后台 | Express + API 内存缓存 |
| 数据库 | SQLite3 (better-sqlite3) |
| 部署 | Nginx (HTTP/2) + PM2 cluster |

## 快速启动

### 开发模式

```bash
# 终端 1: 后台
cd app/server
npm install
node sync_db.js      # 首次需要：缩略图 + WebP + 建库
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
| `GET /api/pets?page&limit&search&element_id&sort_by&order` | 精灵列表 | 5 分钟 |
| `GET /api/pets/:uid` | 精灵详情 | 5 分钟 |
| `GET /api/pets/shiny` | 异色列表 | 5 分钟 |

## 性能优化

- **图片懒加载**：IntersectionObserver + 并发队列（最多 6 张同时加载）
- **WebP 自动返回**：Nginx 检测浏览器 Accept 头，透明返回 WebP
- **API 缓存**：内存缓存中间件，响应头 `X-Cache: HIT/MISS`
- **代码分割**：Vue/Vue Router 独立 chunk，业务更新不重载框架
- **系统字体**：正文用 PingFang SC / 微软雅黑，零网络请求
- **HTTP/2**：多路复用消除并发连接瓶颈
