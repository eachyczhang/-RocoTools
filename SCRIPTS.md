# 脚本执行手册

本文档列出项目中所有可手动执行的脚本，包括用途、执行顺序、参数说明和注意事项。

---

## 一、常用操作流程

### 🔄 全量数据更新（爬虫 → 数据库）

当需要从 BWIKI 重新爬取数据并更新数据库时，按以下顺序执行：

```bash
# Step 1: 爬取数据
cd crawler
python run.py --full

# Step 2: 同步到数据库（含缩略图生成 + 进化链合并）
cd ../app/server
node sync_db.js
```

### 🆕 增量更新（仅新增/变更精灵）

```bash
# Step 1: 增量爬取
cd crawler
python run.py --update

# Step 2: 同步到数据库
cd ../app/server
node sync_db.js
```

### 🚀 发布上线

```bash
# 构建前端
cd app/client
npm run build

# 提交并推送（服务器自动拉取部署）
git add -A
git commit -m "描述"
git push
```

> ⚠️ 禁止手动执行部署命令或启动后台服务，服务器会自动拉取 git 代码并部署。

---

## 二、脚本清单

### 爬虫脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| `run.py` | `crawler/run.py` | 爬虫总入口，调度所有子爬虫 |

**用法**：

```bash
cd crawler

python run.py          # 全量爬取（默认）
python run.py --full   # 全量爬取（同上）
python run.py --update # 增量更新（仅爬取新增/版本变更的精灵详情）
```

**执行顺序**（内部自动调度）：
1. 属性克制关系（fetch_element_chart + process_element_chart）
2. 技能列表（fetch_skill_list）
3. 蛋组数据（fetch_egg_group）
4. 性格数据（fetch_nature）
5. 精灵列表（fetch_pet_list）
6. 精灵详情（fetch_pet_detail）— 增量模式下仅处理变更项

**前置条件**：
```bash
pip install -r crawler/requirements.txt
```

---

### 数据同步脚本（一键）

| 脚本 | 路径 | 用途 |
|------|------|------|
| `sync_db.js` | `app/server/sync_db.js` | 一键同步：缩略图 + WebP + 建表 + 导入 + 进化链合并 |

**用法**：

```bash
cd app/server
node sync_db.js
```

**内部执行顺序**：
1. 生成缩略图 + 更新 pet_list.json（需要 sharp）
2. 生成 WebP 副本（全部图片，需要 sharp）
3. 初始化数据库（建表）
4. 导入数据（JSON → SQLite）
5. 迁移 show_shiny 列（默认值1）
6. 规范化身高体重数据
7. 清洗技能等级字段
8. 同步进化链（多路线合并）
9. 同步最终形态标记
10. 同步默认图鉴课题

**前置条件**：
```bash
cd app/server && npm install
```

> 💡 如果 sharp 未安装，步骤 1-2 会自动跳过（仅影响图片优化，不影响数据导入）。

---

### 远程数据同步脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| `sync_from_server.sh` | `scripts/sync_from_server.sh` | 从服务器拉取数据库/图片/赛季备份到本地 |

**前置条件**：

1. 创建配置文件：
   ```bash
   cp scripts/.env.example scripts/.env
   # 编辑填入：REMOTE_USER / REMOTE_HOST / REMOTE_PROJECT
   ```
2. 配置 SSH 免密登录：`ssh-copy-id user@your.server.ip`

**用法**：

```bash
# 仅拉取数据库（自动备份本地旧DB + 完整性校验）
bash scripts/sync_from_server.sh --db

# 仅同步图片（增量，基于上次同步时间戳自动判断）
bash scripts/sync_from_server.sh --images

# 同步图片 - 强制全量
bash scripts/sync_from_server.sh --images --full

# 仅同步赛季备份文件（到 temp/seasons/）
bash scripts/sync_from_server.sh --seasons

# 全部同步（数据库 + 图片 + 赛季备份）
bash scripts/sync_from_server.sh --all
```

**选项说明**：

| 选项 | 说明 |
|------|------|
| `--db` | 下载服务器 `roco.db`，覆盖本地（自动备份 + 完整性校验） |
| `--images` | 增量同步 `data/public/` 和 `data/uploads/` |
| `--seasons` | 同步赛季备份到 `temp/seasons/` |
| `--all` | 以上全部 |
| `--full` | 强制全量同步图片（忽略时间戳） |
| `--since N` | 仅同步最近 N 天内变更的文件 |

**同步机制**：
- 有 rsync → 直接增量同步
- 无 rsync（Windows Git Bash）→ 自动 fallback 到 scp+tar 差异同步
- 每次成功同步后记录时间戳到 `scripts/.last_image_sync`

---

### 图片处理脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| `gen_thumbnails.js` | `app/server/gen_thumbnails.js` | 生成精灵缩略图（128px WebP）+ 更新 pet_list.json |
| `gen_webp.js` | `app/server/gen_webp.js` | 批量将所有图片转换为 WebP 格式 |
| `gen_library_thumbs.js` | `app/server/gen_library_thumbs.js` | 为素材库已有图片补生成缩略图（200px WebP） |

---

### 图标提取工具

| 脚本 | 路径 | 用途 |
|------|------|------|
| `process.js` | `scripts/ability-icon-tool/process.js` | 从截图中提取特性图标（128x128 透明底圆形 PNG） |
| `process.js` | `scripts/skill-icon-tool/process.js` | 从截图中提取技能图标（128x128 圆角方形透明底 PNG） |

**用法**：

```bash
# 特性图标：将截图放入 input/ 目录后执行
cd scripts/ability-icon-tool
node process.js

# 技能图标：将截图放入 input/ 目录后执行
cd scripts/skill-icon-tool
node process.js

# 同时执行两个工具
cd scripts && node ability-icon-tool/process.js && node skill-icon-tool/process.js
```

**智能模式**：
- 近似正方形图片 → 直接模式（缩放 + 蒙版）
- 竖屏截图 → 提取模式（自动检测图标区域 → 裁切 → 缩放 + 蒙版）
- 直接模式自动去除背景色（采样四角 + 透明化处理）

> 详细说明见 `scripts/ability-icon-tool/README.md` 和 `scripts/skill-icon-tool/README.md`

**用法**：

```bash
cd app/server

# 单独生成精灵缩略图
node gen_thumbnails.js

# 单独生成 WebP 副本
node gen_webp.js

# 为素材库补生成缩略图（一次性脚本，已有缩略图会跳过）
node gen_library_thumbs.js
```

> 💡 通常不需要单独执行这些脚本，`sync_db.js` 已包含前两个。`gen_library_thumbs.js` 仅在素材库有历史图片缺少缩略图时使用。

---

### 数据库脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| `init.js` | `app/server/src/db/init.js` | 初始化数据库（建表，幂等操作） |
| `import.js` | `app/server/src/db/import.js` | 将 data/ 目录下的 JSON 导入 SQLite |

**用法**：

```bash
cd app/server

# 单独建表（通常不需要，sync_db.js 已包含）
node src/db/init.js

# 单独导入数据（通常不需要，sync_db.js 已包含）
node src/db/import.js
```

---

### 数据修复脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| `sync-evolution-chains.js` | `app/server/scripts/sync-evolution-chains.js` | 批量合并所有精灵的进化链多路线数据 |
| `sync-final-forms.js` | `app/server/scripts/sync-final-forms.js` | 自动检测并标记最终形态精灵 |
| `sync-default-achievements.js` | `app/server/scripts/sync-default-achievements.js` | 同步默认图鉴课题 |
| `crawl-skill-achievements.js` | `app/server/scripts/crawl-skill-achievements.js` | 从 BWIKI 拉取技能使用课题（关联 skills 表） |
| `crawl-pet-avatars.js` | `app/server/scripts/crawl-pet-avatars.js` | 从 BWIKI 拉取精灵Q版小头像（下载图片+写入 pet_details） |
| `migrate-show-shiny.js` | `app/server/scripts/migrate-show-shiny.js` | 添加 show_shiny 列（已集成到 sync_db） |
| `migrate-height-weight.js` | `app/server/scripts/migrate-height-weight.js` | 规范化身高体重格式（已集成到 sync_db） |
| `migrate-pet-tags.js` | `app/server/scripts/migrate-pet-tags.js` | 添加标签列到 pets 表（首次部署） |
| `migrate-achievements.js` | `app/server/scripts/migrate-achievements.js` | 迁移图鉴课题表结构（首次部署） |
| `normalize-skill-levels.js` | `app/server/scripts/normalize-skill-levels.js` | 清洗技能等级字段（已集成到 sync_db） |

**用法**：

```bash
cd app/server

# 同步进化链（多路线合并）
node scripts/sync-evolution-chains.js

# 同步最终形态标记
node scripts/sync-final-forms.js

# 同步默认图鉴课题
node scripts/sync-default-achievements.js

# 预览模式（不写入数据库）
node scripts/sync-final-forms.js --dry-run
node scripts/sync-default-achievements.js --dry-run

# 技能使用课题拉取（两阶段分离，避免重复请求 BWIKI）

# 阶段1：从 BWIKI 抓取 → 存入缓存 JSON（不写库）
node scripts/crawl-skill-achievements.js crawl
node scripts/crawl-skill-achievements.js crawl --filter=pet_004_1  # 指定精灵
node scripts/crawl-skill-achievements.js crawl --delay=5000        # 自定义间隔

# 阶段2：从缓存写入数据库
node scripts/crawl-skill-achievements.js apply             # 执行写入
node scripts/crawl-skill-achievements.js apply --dry-run   # 预览不写入
node scripts/crawl-skill-achievements.js apply --force     # 强制覆盖已有

# 一步模式（crawl + apply，兼容旧用法）
node scripts/crawl-skill-achievements.js                   # 全量
node scripts/crawl-skill-achievements.js --dry-run         # 预览

# 精灵Q版小头像拉取（进化链中的圆形头像）

# 阶段1：从 BWIKI 抓取头像 URL → 缓存
node scripts/crawl-pet-avatars.js crawl
node scripts/crawl-pet-avatars.js crawl --filter=pet_002   # 指定精灵

# 阶段2：从缓存下载图片 → 写入 pet_details.avatar_url
node scripts/crawl-pet-avatars.js apply
node scripts/crawl-pet-avatars.js apply --dry-run          # 预览
node scripts/crawl-pet-avatars.js apply --force            # 覆盖已有
```

**说明**：
- `sync-*` 脚本已集成到 `sync_db.js`，通常无需单独执行
- `crawl-skill-achievements.js` 是独立的 BWIKI 爬取脚本，**不**集成到 sync_db（需要网络请求）
- 扫描所有精灵的进化链数据，将分支进化路线合并为完整的二维数组
- 跳过 `manual_edit=1` 的记录（不覆盖手动配置）

**需要单独执行的场景**：
- 直接操作了数据库而没有走管理端保存流程
- 怀疑进化链数据不一致，需要全量校验修复
- 批量导入了新的爬虫数据后想单独验证
- 需要补全技能使用课题数据（运行 `crawl-skill-achievements.js`）

---

### 赛季公告脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| `generate_launch_notes.js` | `scripts/generate_launch_notes.js` | 开服公告：读取单个DB快照，展示赛季全量内容 |
| `generate_patch_notes.js` | `scripts/generate_patch_notes.js` | 更新公告：对比两个DB快照，展示差异变更 |

**用法**：

```bash
# 开服公告（S1 开服）
node scripts/generate_launch_notes.js temp/seasons/season_S1_20260521.db

# 更新公告（S1 → S2 对比）
node scripts/generate_patch_notes.js \
  temp/seasons/season_S1_20260521.db \
  temp/seasons/season_S2_20260525.db
```

**展示顺序**（两个脚本统一）：传说精灵 → 通行证精灵 → 赛季奇遇精灵 → 赛季奇遇异色精灵

**排序规则**：所有列表（精灵/技能/赛季奇遇等）按编号自然排序（从 uid 提取数字）

**自定义语法**：输出 Markdown 使用 `![pet:uid]`、`![skill:uid]`、`![ability:path]`、`![element:path]`、`![shiny:uid]` 等自定义语法，由前端动态渲染

> 详细说明见 `scripts/README.md` 第六节。

---

### 测试/调试脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| `test_api.js` | `app/server/test_api.js` | API 接口测试（开发调试用） |

**用法**：

```bash
cd app/server
node test_api.js
```

> ⚠️ 仅开发环境使用，不要在生产环境执行。

---

## 三、前端构建

| 命令 | 路径 | 用途 |
|------|------|------|
| `npm run dev` | `app/client/` | 启动开发服务器（HMR） |
| `npm run build` | `app/client/` | 生产构建（输出到 `app/server/public/`） |

```bash
cd app/client

# 开发
npm run dev

# 构建
npm run build
```

---

## 四、后端服务

| 命令 | 路径 | 用途 |
|------|------|------|
| `npm run dev` | `app/server/` | 启动开发服务器（端口 3000） |

```bash
cd app/server
npm run dev
```

> ⚠️ 生产环境由 PM2 管理，禁止手动启动。

---

## 五、执行顺序速查表

以下是各场景下的完整执行顺序：

### 首次部署

```
1. pip install -r crawler/requirements.txt
2. python crawler/run.py --full
3. cd app/server && npm install
4. node sync_db.js
5. cd ../client && npm install
6. npm run build
7. git push（服务器自动部署）
```

### 日常数据更新

```
1. python crawler/run.py --update   (或 --full)
2. cd app/server && node sync_db.js
3. cd ../client && npm run build
4. git push
```

### 仅修改前端代码

```
1. cd app/client && npm run build
2. git push
```

### 仅修改后端代码

```
1. git push（PM2 自动重启）
```

### 素材库缩略图补全

```
1. cd app/server && node gen_library_thumbs.js
```

### 从服务器拉取最新数据

```
1. bash scripts/sync_from_server.sh --db       (拉取数据库)
2. bash scripts/sync_from_server.sh --images   (拉取图片，增量)
3. bash scripts/sync_from_server.sh --all      (全部拉取)
```

---

## 六、注意事项

1. **所有脚本的工作目录**：必须 `cd` 到对应目录后再执行，脚本内部使用 `__dirname` 定位文件
2. **sharp 依赖**：图片处理脚本依赖 `sharp` 包，首次安装可能需要编译原生模块
3. **manual_edit 保护**：`sync_db.js` 导入数据时会跳过 `manual_edit=1` 的记录，手动配置不会被覆盖
4. **进化链自动同步**：`sync_db.js` 末尾自动执行进化链合并，无需额外手动操作
5. **发布流程**：只需 `git push`，服务器自动拉取代码并部署，禁止手动执行部署命令
6. **图标工具**：`scripts/ability-icon-tool/` 和 `scripts/skill-icon-tool/` 的 input/output 目录中的图片文件不跟随 git（已配置 .gitignore），但目录本身保留
