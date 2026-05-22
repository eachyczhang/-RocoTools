# RocoTools 开发 Skill

> 本 Skill 供 AI 助手（Claude/CodeBuddy/Cursor 等）在开发 RocoTools 项目时参考。
> 包含项目架构、开发流程、常见任务、调试技巧等。

---

## 项目概述

**RocoTools** 是洛克王国世界（Roco World）游戏数据工具站，提供精灵图鉴、技能查询、属性克制、打击面分析等功能。

- **在线地址**：https://eachz.cn/rocotools/
- **数据来源**：[BWIKI](https://wiki.biligame.com/rocom)
- **协议**：CC BY-NC-SA 4.0（非商用）
- **仓库**：https://github.com/eachyczhang/-RocoTools

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

## 项目架构

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
│   │   └── sync_db.js      # 一键同步（缩略图+WebP+建表+导入）
│   └── client/             # Vue3 前端（Vite + TailwindCSS）
│       └── src/
│           ├── views/user/    # 用户端页面
│           ├── views/admin/   # 管理端页面
│           ├── components/shared/  # 公用组件
│           ├── composables/       # 组合式函数
│           └── api/               # API 封装
├── docs/game-notes/      # 游戏设定笔记
├── .dev/skills/          # AI 技能文档（本文件）
├── nginx.conf            # Nginx 配置模板（占位符）
└── README.md
```

---

## 核心数据模型

7 层数据：**属性(18) → 技能(469+) → 蛋组(15) → 精灵(466+) → 性格(30) → 赛季 → 活动日历**

附加数据：**皮卡月刊**（角色时装，多精灵绑定、男女概念图各一张）

| 数据 | UID/PK | 存储 |
|------|--------|------|
| 属性 | `elem_{id}` | data/elements/ |
| 技能 | `skill_{N}` | data/skills/ |
| 蛋组 | 按名称 | data/eggs/ |
| 精灵 | `pet_{id}` 或 `pet_{id}_{N}` | data/pets/ |
| 性格 | id (1-30) | data/natures/ |
| 赛季 | S1/S2... | 管理端配置（仅数据库） |
| 活动 | 自增 id | season_events 表（管理端配置） |
| 皮卡月刊 | 自增 id | pika_monthlies + pika_monthly_pets 表（管理端配置） |

---

## 视觉设计规范

项目统一的视觉设计系统详见 `app/client/DESIGN.md`，核心要点：

- **主色**：金色系 `#D69F23`，禁止使用 indigo/紫色
- **暗色模式**：所有组件必须同时提供亮色和暗色样式
- **组件规范**：卡片 rounded-xl、按钮 active:scale-95、Tab 金色激活态
- **CSS 变量 Fallback**：必须使用项目实际的 primary 色值（如 `#D69F23`），禁止使用 `#6366f1`

---

## 开发流程

### 1. 环境搭建

```bash
# 克隆仓库
git clone https://github.com/eachyczhang/-RocoTools.git
cd -RocoTools

# 安装 Python 依赖（爬虫）
pip install -r crawler/requirements.txt

# 安装 Node.js 依赖（后台）
cd app/server
npm install

# 安装 Node.js 依赖（前端）
cd ../client
npm install
```

### 2. 数据初始化

```bash
# 爬取数据（首次需要）
python crawler/run.py --full

# 同步到数据库
cd app/server
node sync_db.js          # 生成缩略图 + WebP + 建库导入
```

### 3. 本地开发

```bash
# 终端 1: 后台
cd app/server
npm run dev              # http://localhost:3000

# 终端 2: 前端
cd app/client
npm run dev              # http://localhost:5173
```

### 4. 生产部署

```bash
# 构建前端
cd app/client
npm run build

# PM2 启动（零停机）
pm2 start app/server/src/index.js --name roco -i 2
pm2 save && pm2 startup

# 一键更新
./deploy.sh
```

---

## 常见任务

### 任务 1：添加新功能页面

1. 在 `app/client/src/views/` 下创建新页面组件
2. 在 `app/client/src/router/index.js` 中添加路由
3. 如果是对用户端页面，在 `App.vue` 的导航栏添加入口
4. 如果是对管理端页面，在三处添加入口：
   - `App.vue` 桌面导航栏（顶栏）
   - `App.vue` 移动端导航（汉堡菜单）
   - `AdminDashboard.vue` 的 `navCards` 数组（Dashboard 卡片）

### 任务 2：修改数据库表结构

1. 修改 `app/server/src/db/schema.sql`，添加/修改字段
2. 运行 `node sync_db.js`，自动迁移缺失列（无需删库重建）

### 任务 3：添加图片预览功能

1. 导入 `useImagePreview` composable：
   ```js
   import { useImagePreview } from '@/composables/useImagePreview'
   const { openPreview } = useImagePreview()
   ```
2. 在图片点击事件中调用 `openPreview(imageUrl)`
3. 无需手动挂载 `ImagePreview` 组件（已在 `App.vue` 中全局挂载）

### 任务 4：添加 API 接口

1. 在 `app/server/src/routes/` 下创建/修改路由文件
2. 在 `app/server/src/services/` 下创建/修改服务文件
3. 如果是对用户端 API，在 `app/client/src/api/index.js` 中添加封装
4. 如果是对管理端 API，在 `app/client/src/api/admin.js` 中添加封装

### 任务 5：修改爬虫

1. 修改 `crawler/scrapers/` 下的对应爬虫文件
2. 运行 `python crawler/run.py --update` 进行增量更新
3. 运行 `python crawler/run.py --full` 进行全量更新

---

## 调试技巧

### 1. 数据库问题

- **数据库列缺失**：修改 `schema.sql` 后运行 `sync_db.js` 自动迁移
- **手动编辑的数据被覆盖**：检查 `manual_edit` 字段是否为 1
- **数据冲突**：查看 `pending_conflicts.json`，在管理端「数据审查」页面处理

### 2. 图片问题

- **图片不显示**：检查 `data/public/` 是否有图片，运行 `gen_thumbnails.js`
- **图片路径错误**：参考 `.ai-memory.md` 中的「图片路径规范」部分
- **图片预览无响应**：检查是否正确导入 `useImagePreview` 并调用 `openPreview()`

### 3. 前端问题

- **Vue 运行时错误**：检查是否完整导入 Vue API（如 `computed`, `onMounted` 等）
- **指令未注册**：检查是否在 `main.js` 中全局注册指令
- **样式不生效**：检查是否错误使用了 `scoped` 样式（如 Teleport 到 body 的组件）
- **路由守卫问题**：检查 JWT 是否过期，是否在 `.env` 中正确配置 `ADMIN_SECRET`

### 4. 后台问题

- **API 缓存问题**：重启后台服务，或等待缓存过期（5-10 分钟）
- **静态资源 404**：检查 `data/public/` 和 `data/uploads/` 是否存在
- **JWT 鉴权失败**：检查 `.env` 中的 `ADMIN_PASSWORD` 和 `ADMIN_SECRET`

---

## 代码规范

### 1. 数据库命名规范

- 列名必须使用英文（snake_case），禁止使用中文列名
- 表名使用英文（snake_case）
- 文件命名使用英文（kebab-case）
- 前端代码中所有数据库字段引用必须使用英文列名

### 2. Vue 组合式 API 导入规范

- 使用生命周期钩子时必须完整导入：
  ```js
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  ```
- **禁止**只导入 `onMounted` 而使用 `onUnmounted`（或其他组合）
- 需要清理的副作用（如事件监听）必须使用 `onUnmounted` 清理

### 3. Vue 自定义指令注册规范

- 全局指令在 `main.js` 中通过 `app.directive('指令名', 指令定义)` 注册
- 指令定义包含 `mounted(el, binding)` 和 `unmounted(el)` 生命周期
- 示例：`v-click-outside` 指令用于检测点击元素外部的事件

### 4. 前端 API 导入规范

- `@/api` → `src/api/index.js`（用户端 API）
- `@/api/admin` → `src/api/admin.js`（管理端 API）
- **禁止**在 `api/index.js` 中使用但未添加重导出

### 5. Git 忽略规则

- `data/` 不入 git（含图片和生成数据）
- `data/uploads/` 不入 git（手动上传图片，不被爬虫覆盖）
- `deploy.sh`、`setup-nginx.sh`、`.env` 不入 git
- `nginx.conf` 入 git 但用占位符（`<YOUR_DOMAIN>`/`<PROJECT_DIR>`）
- `app/server/data/` 不入 git（数据库文件）
- `app/server/public/` 不入 git（前端构建产物）
- `node_modules/` 不入 git

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

## 常见问题

### Q1: 数据库列缺失怎么办？

**A**: 修改 `app/server/src/db/schema.sql`，添加缺失的字段，然后运行 `node sync_db.js` 自动迁移。

### Q2: 图片不显示怎么办？

**A**: 检查 `data/public/` 是否有图片，如果没有，运行 `python crawler/run.py --full` 爬取图片，然后运行 `node gen_thumbnails.js` 生成缩略图。

### Q3: 管理端登录失败怎么办？

**A**: 检查 `.env` 中的 `ADMIN_PASSWORD` 和 `ADMIN_SECRET` 是否正确配置。

### Q4: 如何添加新的管理端页面？

**A**: 参考 `.ai-memory.md` 中的「前端页面开发规范」部分，在三处添加入口。

### Q5: 如何修改游戏规则？

**A**: 查看 `docs/game-notes/` 目录下的文件，判断规则应补充到哪个文件。若无对应文件，新建 `.md` 文件并更新 `docs/game-notes/README.md` 索引。

---

## 相关文档

| 文档 | 说明 |
|------|------|
| `.ai-memory.md` | 项目完整记忆（开发规范、数据模型、注意事项） |
| `README.md` | 用户视角的项目介绍 |
| `app/README.md` | App 目录说明（架构、技术栈、快速启动） |
| `data/FIELDS.md` | 数据字段对照表 |
| `data/STRUCTURE_RULES.md` | 数据结构化规则 |
| `app/client/RESPONSIVE.md` | 响应式适配规范 |
| `app/client/DESIGN.md` | 视觉设计规范（色彩/组件/暗色模式/交互） |
| `docs/game-notes/*.md` | 游戏设定笔记 |

---

## 待办/计划

- [ ] 反馈功能
- [ ] CDN 加速图片
- [ ] 精灵对比功能
- [ ] 队伍构建器
- [x] 皮卡月刊管理端 + 用户端展示页面 2026-05-22
- [x] 视觉设计规范文档 (DESIGN.md) 2026-05-22
- [x] 统一素材管理模块 (AdminMedia + 后端接口 + ImageUploader增强) 2026-05-23

---

**最后更新：2026-05-23**
