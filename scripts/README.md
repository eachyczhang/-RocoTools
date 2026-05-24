# RocoTools 脚本命令手册

> 本文档列出项目中所有可执行的脚本及其命令行用法。

---

## 目录

- [一、爬虫（crawler）](#一爬虫)
- [二、远程数据同步（sync_from_server.sh）](#二远程数据同步)
- [三、本地数据同步（sync_db.js）](#三本地数据同步)
- [四、独立迁移/维护脚本](#四独立迁移维护脚本)
- [五、图片处理脚本](#五图片处理脚本)
- [六、赛季公告生成脚本](#六赛季公告生成脚本)

---

## 一、爬虫

**脚本**：`crawler/run.py`

通过 MediaWiki API 从 [洛克王国世界 BWIKI](https://wiki.biligame.com/rocom) 爬取游戏数据。

### 前置条件

```bash
# Python 3.10+
pip install -r crawler/requirements.txt
```

### 命令一览

```bash
# 全量爬取（首次使用，约5-8分钟）
python crawler/run.py --full

# 增量更新（仅爬取 version 变更的精灵详情，日常使用）
python crawler/run.py --update
```

### 单独运行某个爬虫

```bash
# 属性克制关系（18种属性）
python crawler/scrapers/fetch_element_chart.py

# 属性结构化处理（依赖上一步产出）
python crawler/scrapers/process_element_chart.py

# 技能列表 + 图标（469+）
python crawler/scrapers/fetch_skill_list.py

# 蛋组归属数据（15组）
python crawler/scrapers/fetch_egg_group.py

# 性格数据（30种）
python crawler/scrapers/fetch_nature.py

# 精灵列表 + 缩略图
python crawler/scrapers/fetch_pet_list.py

# 精灵详情 + 立绘 + 映射刷新
python crawler/scrapers/fetch_pet_detail.py
```

### 执行顺序（run.py 内部）

| # | 脚本 | 说明 |
|---|------|------|
| 1 | `fetch_element_chart.py` | 属性克制关系 |
| 2 | `process_element_chart.py` | 属性结构化 + 图标本地化 |
| 3 | `fetch_skill_list.py` | 技能列表 + 图标 |
| 4 | `fetch_egg_group.py` | 蛋组归属数据 |
| 5 | `fetch_nature.py` | 性格数据 |
| 6 | `fetch_pet_list.py` | 精灵列表 + 注入 egg_groups |
| 7 | `fetch_pet_detail.py` | 精灵详情 + 立绘 + UID映射 |

### 数据产出

| 数据 | 输出路径 | 格式 |
|------|----------|------|
| 属性 | `data/elements/` | JSON |
| 技能 | `data/skills/` | JSON |
| 蛋组 | `data/eggs/` | JSON |
| 精灵 | `data/pets/` | JSON |
| 图片 | `data/public/` | PNG |

### 自动行为

- 各爬虫运行后自动生成 `*_report.md` 校验报告
- `run.py` 完成后打印全局数据完整性汇总
- 检测到 `app/server/node_modules` 存在时，**自动执行 sync_db 同步数据到 SQLite**

### 限流参数

| 参数 | 值 |
|------|------|
| 详情页并发 | 5 线程，0.5s/线程间隔 |
| 图片下载并发 | 10 线程，0.1s/线程间隔 |
| 限流重试 | 60s × 次数（遇到 567/429） |
| 步骤间冷却 | 2s |

### 故障恢复

```bash
# 检查数据完整性
node -e "const d=require('./data/pets/pet_detail.json'); \
  const p=d.pets; const total=Object.keys(p).length; \
  const hasSkills=Object.values(p).filter(x=>x.detail&&x.detail.skills&&x.detail.skills.length>0).length; \
  console.log('总数:',total,'有技能:',hasSkills)"

# 数据正确但确实减少 → 强制导入
cd app/server && node src/db/import.js --force

# 需要回滚 → 使用自动备份
cp app/server/data/backups/auto_presync_最新.db app/server/data/roco.db
```

---

## 二、远程数据同步

**脚本**：`scripts/sync_from_server.sh`

将服务器上的数据库、图片、赛季备份同步到本地开发环境。

### 前置条件

1. 创建配置文件：
   ```bash
   cp scripts/.env.example scripts/.env
   # 编辑填入服务器信息：REMOTE_USER / REMOTE_HOST / REMOTE_PROJECT
   ```
2. 配置 SSH 免密登录：`ssh-copy-id user@your.server.ip`
3. 推荐安装 `rsync`（有则增量同步，无则自动 fallback 到 scp+tar 差异同步）

### 命令一览

```bash
# 查看帮助
bash scripts/sync_from_server.sh --help

# 仅同步数据库（自动备份本地旧DB + 完整性校验）
bash scripts/sync_from_server.sh --db

# 仅同步图片（增量，基于上次同步时间戳自动判断）
bash scripts/sync_from_server.sh --images

# 同步图片 - 强制全量（忽略时间戳，下载所有文件）
bash scripts/sync_from_server.sh --images --full

# 同步图片 - 指定天数（只同步最近N天的变更）
bash scripts/sync_from_server.sh --images --since 7

# 仅同步赛季备份文件（到 temp/seasons/）
bash scripts/sync_from_server.sh --seasons

# 全部同步（数据库 + 图片 + 赛季备份）
bash scripts/sync_from_server.sh --all

# 全部同步 + 强制全量图片
bash scripts/sync_from_server.sh --all --full
```

### 选项说明

| 选项 | 说明 |
|------|------|
| `--db` | 下载服务器 `roco.db`，覆盖本地（自动备份旧文件 + 完整性校验） |
| `--images` | 增量同步 `data/public/` 和 `data/uploads/` 目录 |
| `--seasons` | 同步赛季备份到 `temp/seasons/` |
| `--all` | 以上全部 |
| `--full` | 强制全量同步图片（忽略 `.last_image_sync` 时间戳） |
| `--since N` | 仅同步最近 N 天内变更的文件 |
| `--help` | 显示帮助信息 |

### 同步机制

- **有 rsync**：直接 rsync 增量同步，最高效
- **无 rsync（Windows Git Bash）**：
  1. 生成本地文件列表
  2. 上传到服务器对比差异
  3. 服务器打包差异文件
  4. scp 下载 + 本地解压
- **时间戳**：每次成功同步后记录到 `scripts/.last_image_sync`，下次自动增量

### 管理端下载（替代方案）

也可通过管理端 Dashboard 页面直接下载：
- **下载当前 DB** 按钮：下载线上数据库
- 各备份列表的 **下载** 按钮：下载指定备份文件

---

## 三、本地数据同步

**脚本**：`app/server/sync_db.js`

一键执行完整的本地数据处理流程：生成缩略图 → 建表 → 导入数据 → 迁移 → 同步。

### 命令

```bash
cd app/server && node sync_db.js
```

### 执行步骤（按顺序）

| # | 步骤 | 需要 sharp |
|---|------|-----------|
| 1 | 生成缩略图 + 更新 pet_list.json | ✅ |
| 2 | 生成 WebP 副本（全部图片） | ✅ |
| 3 | 初始化数据库（建表） | — |
| 4 | 导入数据（JSON → SQLite） | — |
| 5 | 迁移 show_shiny 列 | — |
| 6 | 规范化身高体重数据 | — |
| 7 | 清洗技能等级字段 | — |
| 8 | 同步进化链（多路线合并） | — |
| 9 | 同步最终形态标记 | — |
| 10 | 同步默认图鉴课题 | — |

> 如果未安装 `sharp`，步骤 1-2 会自动跳过。

### 前置条件

```bash
cd app/server && npm install
```

---

## 四、独立迁移/维护脚本

位于 `app/server/scripts/` 目录，可单独执行：

```bash
# 所有脚本均在 app/server 目录下执行
cd app/server
```

### 数据迁移

| 命令 | 说明 | 使用场景 |
|------|------|----------|
| `node scripts/migrate-show-shiny.js` | 添加 `show_shiny` 列到 pets 表（默认值1） | 已集成到 sync_db |
| `node scripts/migrate-height-weight.js` | 规范化身高体重格式（`"1.5~2.15"` → `"1.50-2.15"`） | 已集成到 sync_db |
| `node scripts/migrate-pet-tags.js` | 添加标签列到 pets 表 | 首次部署执行一次 |
| `node scripts/migrate-achievements.js` | 迁移图鉴课题表结构 | 首次部署执行一次 |
| `node scripts/normalize-skill-levels.js` | 清洗技能等级字段（`"LV1"` → `"1"`） | 已集成到 sync_db |

### 数据同步

| 命令 | 说明 | 使用场景 |
|------|------|----------|
| `node scripts/sync-evolution-chains.js` | 同步进化链（多路线合并） | 已集成到 sync_db |
| `node scripts/sync-final-forms.js` | 同步最终形态标记 | 已集成到 sync_db |
| `node scripts/sync-default-achievements.js` | 同步默认图鉴课题 | 已集成到 sync_db |

### 调试模式（dry-run）

```bash
# 预览最终形态检测结果（不写入数据库）
node scripts/sync-final-forms.js --dry-run

# 预览课题同步结果（不写入数据库）
node scripts/sync-default-achievements.js --dry-run
```

---

## 五、图片处理脚本

位于 `app/server/` 目录，需要安装 `sharp`：

```bash
cd app/server
npm install sharp  # 如未安装
```

### gen_thumbnails.js — 生成精灵缩略图

```bash
cd app/server && node gen_thumbnails.js
```

**功能**：
- 将 `data/public/pets/default/` 下的大立绘压缩为 128px WebP 缩略图
- 输出到 `data/public/pets/thumbs/`
- 更新 `data/pets/pet_list.json`，写入 `thumb_url` 字段

**特点**：增量处理，跳过已存在且比源文件新的缩略图

### gen_webp.js — 批量生成 WebP 副本

```bash
cd app/server && node gen_webp.js
```

**功能**：遍历 `data/public/` 下所有 PNG 图片，在同目录生成同名 `.webp` 文件

**处理目录**：
- `public/pets/default/` — 精灵默认立绘
- `public/pets/shiny/` — 异色立绘
- `public/pets/fruit/` — 果实图片
- `public/pets/egg/` — 蛋图片
- `public/skills/icons/` — 技能图标
- `public/elements/icons/` — 属性图标

**参数**：质量 80，并发 10

**特点**：增量处理，跳过已存在且比源文件新的 WebP

> 这两个脚本已集成到 `sync_db.js` 流程中（步骤 1-2），通常不需要单独执行。
> 配合 Nginx 的 WebP 自动返回策略，浏览器支持时自动获取 WebP 版本。

---

## 六、赛季公告生成脚本

**脚本**：`scripts/generate_patch_notes.js`

对比两个赛季的数据库快照，自动生成格式化的赛季更新公告（Markdown）。

### 前置条件

1. 下载赛季数据库备份：
   ```bash
   # 方式一：使用同步脚本
   bash scripts/sync_from_server.sh --seasons

   # 方式二：手动 scp
   scp user@server:/path/to/backups/seasons/season_S1_*.db temp/seasons/
   scp user@server:/path/to/backups/seasons/season_S2_*.db temp/seasons/
   ```

2. 确保 `better-sqlite3` 已安装（`cd app/server && npm install`）

### 命令

```bash
# 基本用法：对比旧版本 → 新版本
node scripts/generate_patch_notes.js <旧版本.db> <新版本.db>

# 指定输出路径
node scripts/generate_patch_notes.js <旧版本.db> <新版本.db> --output <输出路径.md>
```

### 示例

```bash
# 对比 S1 → S2，输出到 temp/patch_S2.md
node scripts/generate_patch_notes.js \
  temp/seasons/season_S1_20260521.db \
  temp/seasons/season_S2_20260524.db \
  --output temp/patch_S2.md

# 不指定输出路径，默认输出到 temp/patch_notes_<新db文件名>.md
node scripts/generate_patch_notes.js \
  temp/seasons/season_S1_20260521.db \
  temp/seasons/season_S2_20260524.db
```

### 输出内容

1. **更新概览** — 各类变更的数量汇总
2. **新增精灵** — 按进化线分组展示
3. **新增技能** — 表格展示
4. **技能调整** — 逐个列出能耗/威力/效果变化
5. **精灵特性调整** — 按相同改动分组，合并进化线
6. **精灵数值调整** — 表格展示六维变化和差值
7. **技能学习面变动** — 已有精灵新增/移除的可学习技能

### 自动过滤

脚本自动忽略以下非游戏性变更：
- `manual_edit`、`version`、标签列（`is_final_form` 等）、`show_shiny`、`level` 格式变化

---

## 快速参考

```bash
# === 爬虫（获取最新游戏数据） ===
python crawler/run.py --full                   # 全量爬取（首次）
python crawler/run.py --update                 # 增量更新（日常）

# === 远程同步（拉取服务器数据到本地） ===
bash scripts/sync_from_server.sh --db          # 拉取最新数据库
bash scripts/sync_from_server.sh --images      # 增量同步图片
bash scripts/sync_from_server.sh --all --full  # 全量同步所有数据

# === 本地数据处理（JSON → SQLite + 图片优化） ===
cd app/server && node sync_db.js               # 一键完整流程
cd app/server && node gen_thumbnails.js        # 仅生成缩略图
cd app/server && node gen_webp.js              # 仅生成 WebP 副本

# === 赛季更新 ===
bash scripts/sync_from_server.sh --seasons     # 下载赛季备份
node scripts/generate_patch_notes.js \         # 生成更新公告
  temp/seasons/old.db temp/seasons/new.db \
  --output temp/patch.md

# === 典型工作流 ===
# 1. 爬取最新数据 → 自动同步到DB
python crawler/run.py --update

# 2. 或者直接从服务器拉取（不需要爬虫）
bash scripts/sync_from_server.sh --db
bash scripts/sync_from_server.sh --images
```
