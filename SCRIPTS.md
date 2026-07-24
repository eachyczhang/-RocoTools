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
node sync_db.js --full
```

> `crawler/run.py` 在后端依赖已安装时会先备份并直接执行 init + import；随后运行 `sync_db.js --full` 会再次导入，以补齐图片衍生物和全部后处理。

### 🆕 增量更新（仅新增/变更精灵）

```bash
# Step 1: 增量爬取
cd crawler
python run.py --update

# Step 2: 同步到数据库
cd ../app/server
node sync_db.js --full
```

### 🚀 代码发布

```bash
# 本地验证前端（有前端改动时）
cd app/client
npm run build

# 提交并推送代码
git add -A
git commit -m "描述"
git push
```

`git push` 只更新远程仓库。当前服务器由 Git 外的独立 `deploy.sh` 在实际执行时拉取 `origin/main`；是否定时触发需以服务器 crontab 为准。服务器脚本行为和只读核验方法见 [`docs/operations/DEPLOY.md`](./docs/operations/DEPLOY.md)。

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
| `sync_db.js` | `app/server/sync_db.js` | 默认生成图片衍生物并建表/补列；`--full` 另执行导入和后处理 |

**用法**：

```bash
cd app/server
node sync_db.js          # 安全默认：生成图片衍生物 + 建表/补列，不导入 JSON
node sync_db.js --full   # 完整流程：导入 JSON，并执行所有迁移与后处理
```

**默认模式**：

1. 检测 `sharp`；可用时生成缩略图和 WebP 衍生物。
2. 初始化数据库，执行 `CREATE IF NOT EXISTS` 和缺失列迁移。
3. 跳过 JSON 导入、数据修复、进化链、最终形态和默认课题同步。

**`--full` 模式**：在默认步骤后执行 JSON 导入、show_shiny/身高体重/技能等级处理、进化链、最终形态和默认图鉴课题同步。导入可能更新运行数据，执行前应确认备份和 `manual_edit` 保护范围。

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

# 单独导入数据（通常不需要，sync_db.js --full 已包含）
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

### 首次本地数据准备

```
1. pip install -r crawler/requirements.txt
2. python crawler/run.py --full
3. cd app/server && npm install
4. node sync_db.js --full
5. cd ../client && npm install
6. npm run build
```

### 日常数据更新

```
1. python crawler/run.py --update   (或 --full)
2. cd app/server && node sync_db.js --full
3. 按受控流程同步运行数据；数据库和图片不进入 Git
```

### 仅修改前端代码

```
1. cd app/client && npm run build
2. 提交并推送代码
3. 服务器执行 deploy.sh 后，检测到 app/client/ 差异才会重新构建
```

### 仅修改后端代码

```
1. 运行语法/接口验证后提交并推送代码
2. 服务器执行 deploy.sh 后安装生产依赖并 reload PM2
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
3. **manual_edit 保护**：只有 `node sync_db.js --full` 会导入；导入时跳过 `manual_edit=1` 的记录
4. **后处理边界**：进化链、最终形态和默认课题同步仅在 `--full` 模式执行
5. **发布流程**：`git push` 不等于已部署；以服务器实际执行 `deploy.sh` 和只读线上验证为准
6. **数据库边界**：当前服务器部署脚本不运行备份、完整性检查或 `sync_db.js`
7. **图标工具**：`scripts/ability-icon-tool/` 和 `scripts/skill-icon-tool/` 的 input/output 目录中的图片文件不跟随 git（已配置 .gitignore），但目录本身保留
