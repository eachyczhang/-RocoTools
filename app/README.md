# App - 洛克王国世界数据应用

Express 后台 + Vue3 前端，service 层独立可复用（后续可移植到 Electron IPC）。

## 架构

```
app/
├── server/                     # 后台服务
│   ├── package.json
│   ├── src/
│   │   ├── index.js            # Express 入口（含前端托管 + SPA fallback）
│   │   ├── services/           # 数据查询层（核心，环境无关）
│   │   │   ├── elements.js
│   │   │   ├── skills.js
│   │   │   ├── eggs.js
│   │   │   └── pets.js
│   │   ├── routes/             # Express 路由（调用 service）
│   │   │   ├── elements.js     # /api/elements
│   │   │   ├── skills.js       # /api/skills
│   │   │   ├── eggs.js         # /api/eggs
│   │   │   └── pets.js         # /api/pets
│   │   └── db/
│   │       ├── schema.sql      # SQLite 表结构
│   │       ├── init.js         # 建库建表
│   │       ├── import.js       # JSON → SQLite 导入
│   │       └── connection.js   # 数据库连接
│   ├── data/                   # SQLite 数据库（运行时生成，不纳入 git）
│   └── public/                 # 前端构建产物（build 后生成，不纳入 git）
│
└── client/                     # 前端工程
    ├── package.json
    ├── vite.config.js          # 构建输出到 server/public/
    ├── tailwind.config.js
    └── src/
        ├── main.js
        ├── App.vue
        ├── api/index.js        # API 封装
        ├── router/index.js
        ├── styles/main.scss    # Tailwind + 自定义样式
        └── views/
            ├── Home.vue        # 首页概览
            ├── Pets.vue        # 精灵图鉴
            ├── PetDetail.vue   # 精灵详情
            ├── Skills.vue      # 技能大全
            └── Elements.vue    # 属性克制
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 + Vue Router |
| 构建工具 | Vite |
| CSS | TailwindCSS + Sass |
| 后台 | Express |
| 数据库 | SQLite3 (better-sqlite3) |
| 接口 | RESTful API |

## 快速启动

### 开发模式（前后端分离，热更新）

```bash
# 终端 1: 后台
cd app/server
npm install
npm run setup
npm run dev          # http://localhost:3000

# 终端 2: 前端
cd app/client
npm install
npm run dev          # http://localhost:5173（代理 API 到 3000）
```

### 生产模式（单服务部署）

```bash
cd app/client
npm run build        # 输出到 app/server/public/

cd ../server
npm run dev          # http://localhost:3000 → 前端 + API 一体
```

## API 接口

| 路由 | 说明 |
|------|------|
| `GET /api/elements` | 属性列表 |
| `GET /api/elements/multipliers` | 伤害倍率 |
| `GET /api/elements/:id` | 单属性详情 |
| `GET /api/skills?page&limit&search&category&element_id` | 技能列表 |
| `GET /api/skills/:uid` | 单技能详情 |
| `GET /api/eggs` | 蛋组列表 |
| `GET /api/eggs/:id` | 蛋组精灵 |
| `GET /api/pets?page&limit&search&element_id&egg_group&sort_by&order` | 精灵列表 |
| `GET /api/pets/:uid` | 精灵完整详情 |
| `GET /public/...` | 图片静态资源 |

## 后续扩展

Service 层已独立，可随时接入 Electron IPC：
1. 安装 `electron`
2. 创建 `ipc/handlers.js` 调用 service
3. 创建 `preload.js` 暴露 `window.roco` API
