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

### 图片处理脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| `gen_thumbnails.js` | `app/server/gen_thumbnails.js` | 生成精灵缩略图（128px WebP）+ 更新 pet_list.json |
| `gen_webp.js` | `app/server/gen_webp.js` | 批量将所有图片转换为 WebP 格式 |
| `gen_library_thumbs.js` | `app/server/gen_library_thumbs.js` | 为素材库已有图片补生成缩略图（200px WebP） |

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
```

**说明**：
- 以上同步脚本已集成到 `sync_db.js`，通常无需单独执行
- 扫描所有精灵的进化链数据，将分支进化路线合并为完整的二维数组
- 跳过 `manual_edit=1` 的记录（不覆盖手动配置）

**需要单独执行的场景**：
- 直接操作了数据库而没有走管理端保存流程
- 怀疑进化链数据不一致，需要全量校验修复
- 批量导入了新的爬虫数据后想单独验证

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

---

## 六、注意事项

1. **所有脚本的工作目录**：必须 `cd` 到对应目录后再执行，脚本内部使用 `__dirname` 定位文件
2. **sharp 依赖**：图片处理脚本依赖 `sharp` 包，首次安装可能需要编译原生模块
3. **manual_edit 保护**：`sync_db.js` 导入数据时会跳过 `manual_edit=1` 的记录，手动配置不会被覆盖
4. **进化链自动同步**：`sync_db.js` 末尾自动执行进化链合并，无需额外手动操作
5. **发布流程**：只需 `git push`，服务器自动拉取代码并部署，禁止手动执行部署命令
