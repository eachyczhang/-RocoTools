# 数据结构化规则

本文档定义了项目中各类数据的结构化规范及关联关系。

---

## 一、属性（elements）

### 规则

- 来源：`data/elements/element_chart_structured.json`
- ID 分配：从 `1` 开始递增，共 18 种
- 对象 Key：`elem_{id}` 格式（如 `elem_1`）
- 顶层 `id_map`：`{ 数字id: "中文名" }`

### 对象结构

```json
{
  "id": 3,
  "key": "elem_3",
  "name": "火",
  "color": "#DB5525",
  "icon": "/public/elements/icons/elem_3.png",
  "immunity": "灼烧",
  "strong_against": [{"id": 2, "key": "elem_2", "name": "草"}, ...],
  "resisted_by": [...],
  "weak_to": [...],
  "resistant_to": [...]
}
```

### 被引用方式

其他数据引用属性时，使用精简引用对象：

```json
{
  "id": 3,
  "key": "elem_3",
  "name": "火",
  "color": "#DB5525",
  "icon": "/public/elements/icons/elem_3.png"
}
```

---

## 二、技能（skills）

### 规则

- 来源：`data/skills/skill_list.json`
- UID 格式：`skill_{序号}`（如 `skill_1`、`skill_469`）
- 序号按爬取顺序分配

### 对象结构

```json
{
  "uid": "skill_2",
  "name": "抓挠",
  "element": {"id": 1, "key": "elem_1", "name": "普通", "color": "#3F89B4", "icon": "..."},
  "category": "物攻",
  "cost": 0,
  "power": 35,
  "description": "造成物伤，自己回复1能量。",
  "version": "0.1",
  "icon_url": "/public/skills/icons/skill_2.png"
}
```

### 关联

- `element` → 引用属性结构化对象

### 被引用方式

精灵技能列表中通过 `skill_ref` 引用技能：

```json
{
  "uid": "skill_2",
  "name": "抓挠",
  "icon_url": "/public/skills/icons/skill_2.png"
}
```

---

## 三、蛋组（egg_groups）

### 规则

- 来源：`data/eggs/egg_group.json`
- 页面：蛋组计算器（https://wiki.biligame.com/rocom/蛋组计算器）
- 共 15 种蛋组（含"无法孵蛋"）
- 一只精灵可属于 1-3 个蛋组
- 同 pet_id 的不同形态共享蛋组归属

### 数据结构

```json
{
  "group_names": ["无法孵蛋", "动物组", "拟人组", ...],
  "groups": {
    "动物组": {
      "id": 1,
      "name": "动物组",
      "count": 78,
      "pets": [{"pet_id": "002", "name": "喵喵"}, ...]
    }
  },
  "pet_egg_groups": {
    "002": ["动物组", "拟人组"],
    "001": ["无法孵蛋"]
  }
}
```

### 被引用方式

精灵数据中直接嵌入蛋组名称列表：

```json
{
  "egg_groups": ["动物组", "拟人组"]
}
```

---

## 四、精灵（pets）

### 规则

- 列表来源：`data/pets/pet_list.json`（扁平）
- 详情来源：`data/pets/pet_detail.json`（结构化）
- UID 格式：
  - 单形态：`pet_{pet_id}`（如 `pet_002`）
  - 多形态：`pet_{pet_id}_{序号}`（如 `pet_011_1`）
- 多形态归属：`variants_map` 记录 `{ pet_id: [uid, uid, ...] }`

### 对象结构

```json
{
  "uid": "pet_002",
  "pet_id": "002",
  "name": "喵喵",
  "element": {"id": 2, "key": "elem_2", "name": "草", "color": "#4EBC73", "icon": "..."},
  "egg_groups": ["动物组", "拟人组"],
  "ability_name": "氧循环",
  "ability_desc": "使用草系技能后，回复10%生命。",
  "hp": 65, "speed": 33, "atk": 66, "matk": 66, "def": 49, "mdef": 91,
  "total": 370,
  "version": "0.6",
  "image_url": "/public/pets/thumbnails/pet_002.png",
  "detail": {
    "element": {"id": 2, "key": "elem_2", "name": "草", ...},
    "image_default": "/public/pets/default/pet_002_default.png",
    "image_shiny": null,
    "image_fruit": "/public/pets/fruit/pet_002_fruit.png",
    "image_egg": "/public/pets/egg/pet_002_egg.png",
    "height": "0.53~0.75",
    "weight": "3.62~4.6",
    "location": "风息山口 / ...",
    "evolution_chain": ["喵喵", "喵呜", "魔力猫"],
    "restrain_strong": ["光", "地", "水"],
    "restrain_weak": ["虫", "火", "冰", "毒", "翼"],
    "skills": [...],
    "bloodline_skills": [...],
    "learnable_stones": [...]
  }
}
```

### 关联

- `element` → 引用属性结构化对象
- `egg_groups` → 引用蛋组名称列表（来源 `data/eggs/egg_group.json`）
- `detail.skills[].skill_ref` → 引用技能对象

---

## 五、关联关系总览

```
┌─────────────────────────────────────────────────┐
│                   属性 (elements)                 │
│  elem_1 ~ elem_18                               │
│  字段: id, key, name, color, icon, immunity      │
│  关系: strong_against, weak_to, ...              │
└────────────┬──────────────────────┬──────────────┘
             │ 被引用               │ 被引用
             ▼                      ▼
┌────────────────────┐   ┌─────────────────────────┐
│    技能 (skills)    │   │      精灵 (pets)         │
│  skill_1 ~ skill_N │   │  pet_001 ~ pet_N         │
│                    │   │                          │
│  element → 属性引用 │   │  element → 属性引用       │
│                    │◄──│  detail.skills[].skill_ref│
└────────────────────┘   │  egg_groups → 蛋组名称    │
     ▲ 被引用            └────────────┬────────────┘
     └───────────────────────────────┘│
                                      │ 引用
                                      ▼
                          ┌─────────────────────────┐
                          │    蛋组 (egg_groups)      │
                          │  15 种蛋组               │
                          │  pet_egg_groups[pet_id]  │
                          └─────────────────────────┘
```

### 引用方向

| 源 | 目标 | 字段 | 说明 |
|----|------|------|------|
| 精灵 | 属性 | `element` | 精灵所属属性 |
| 精灵 | 蛋组 | `egg_groups` | 精灵所属蛋组列表 |
| 精灵.技能 | 技能 | `skill_ref` | 技能详情索引 |
| 技能 | 属性 | `element` | 技能所属属性 |
| 属性 | 属性 | `strong_against` 等 | 克制/抵抗关系 |

### 索引方式

| 数据 | 通过什么索引 | 说明 |
|------|-------------|------|
| 属性 | `elem_{id}` 或 `id` | 字典 key / id_map |
| 技能 | `skill_{序号}` 即 uid | 数组遍历或按 name 查找 |
| 精灵 | `pet_{id}` 或 `pet_{id}_{n}` | 字典 key / variants_map |
| 蛋组 | 蛋组名称 或 `pet_egg_groups[pet_id]` | 按 pet_id 查归属 |

---

## 六、通用规则

| 规则 | 说明 |
|------|------|
| 空值 | 使用 `null`，不用空字符串 |
| 空数组 | `[]` |
| 图片路径 | `/public/...` 格式，兼容 Vite |
| 数据保存 | 原始数据和结构化数据分开保存，互不覆盖 |
| 执行顺序 | 属性 → 技能 → 蛋组 → 精灵列表 → 精灵详情（前者为后者依赖） |
| 增量判断 | 通过 `version` 字段检测变更 |

---

## 七、目录结构

```
data/
├── elements/                          # 属性
│   ├── element_chart.json             # 原始数据
│   ├── element_chart_structured.json  # 结构化数据
│   └── element_chart.csv
├── skills/                            # 技能
│   ├── skill_list.json
│   └── skill_list.csv
├── eggs/                              # 蛋组
│   └── egg_group.json                # 蛋组归属数据
├── pets/                              # 精灵
│   ├── pet_list.json                  # 筛选列表（含 egg_groups）
│   ├── pet_list.csv
│   └── pet_detail.json               # 详情（含关联 + egg_groups）
├── public/                            # 图片静态资源
│   ├── elements/icons/                # elem_N.png
│   ├── skills/icons/                  # skill_N.png
│   └── pets/                          # 精灵图片
│       ├── thumbnails/                # {uid}.png
│       ├── default/                   # {uid}_default.png
│       ├── shiny/                     # {uid}_shiny.png
│       ├── fruit/                     # {uid}_fruit.png
│       └── egg/                       # {uid}_egg.png
├── FIELDS.md                          # 字段对照表
└── STRUCTURE_RULES.md                 # 本文档
```

---

## 八、数据安全与风险预防

### UID 稳定性机制

多形态精灵的 UID 分配依赖 BWIKI 表格行顺序，为防止顺序变化导致 UID 错位：

| 机制 | 文件 | 说明 |
|------|------|------|
| UID 映射持久化 | `data/pets/_uid_mapping.json` | 存储 `"pet_id::精灵名" → uid` 映射 |
| 首次分配 | 按表格行顺序编号 `pet_{id}_{1,2,3...}` | 并保存到映射文件 |
| 后续复用 | 优先从映射文件查找 | 即使行顺序变化，UID 不变 |
| 新增精灵 | 顺序分配，避免与已有映射冲突 | 自动跳过已占用的序号 |

**规则**：`_uid_mapping.json` 应纳入版本管理，不可随意删除。删除后等同于重置所有多形态 UID。

### 数据导入保护机制

| 机制 | 保护范围 | 实现位置 |
|------|----------|----------|
| `manual_edit` 标记 | pets / skills / pet_details | `import.js` 导入时跳过 |
| 冲突审查 | 被跳过的记录 | `pending_conflicts.json` → 管理端审查 |
| 完整性校验 | pet_skills / pet_details | 新数据为空或降幅>50% 时中止 |
| 增量技能更新 | pet_skills | 按 `pet_uid` 逐个删除再插入 |
| 自动备份 | 全库 | 同步前自动备份到 `backups/auto_presync_*.db` |
| `--force` 跳过 | 完整性校验 | `node import.js --force` 强制导入 |

### 完整性校验规则

导入前自动检测以下条件，不满足时中止并输出排查指引：

| 检测项 | 条件 | 触发行为 |
|--------|------|----------|
| 技能数据为空 | 旧数据有记录 && 新数据 skills 全为空 | ABORT + 指引 |
| 数据大幅下降 | 旧详情 > 10 条 && 新数据 < 旧数据 × 50% | ABORT + 指引 |

中止后的恢复路径：

1. **检查数据文件** — 运行指引中提供的检查命令
2. **重新爬取** — `python crawler/run.py --full`
3. **强制导入** — `node src/db/import.js --force`（确认数据正确时）
4. **回滚** — 使用 `backups/auto_presync_*.db` 或管理端备份恢复

### 关联关系安全

| 关联表 | 外键约束 | 级联行为 | 说明 |
|--------|----------|----------|------|
| `pet_egg_groups` | FK → pets(uid) | 无级联删除 | 精灵删除不自动清理 |
| `pet_skills` | FK → pets(uid) | 无级联删除 | 增量更新，不全表清空 |
| `pet_details` | FK → pets(uid) | 无级联删除 | manual_edit 保护 |
| `pika_monthly_pets` | 无 FK 约束 | 无 | 冗余存储 name/icon |
| `season_events` | 无 FK 约束 | 无 | 冗余存储 name/icon |

**规则**：月刊和活动的精灵关联使用冗余字段（`pet_name`、`pet_icon`），即使精灵数据变化，展示不受影响。

### 备份体系

```
app/server/data/backups/
├── auto_presync_*.db        # 爬虫同步前自动备份（保留最近5份）
├── roco_YYYYMMDD_HHMMSS.db  # 管理端手动临时备份
├── seasons/
│   └── season_*.db          # 赛季备份（带保护标记）
└── snapshots/
    └── snapshot_*.db        # 恢复操作前自动快照
```

| 备份类型 | 触发方式 | 保留策略 | 恢复方式 |
|----------|----------|----------|----------|
| 自动同步前备份 | 爬虫 `run.py` 同步时 | 最近 5 份 | 手动复制覆盖 |
| 临时备份 | 管理端 Dashboard 按钮 | 手动删除 | 管理端恢复 |
| 赛季备份 | 管理端命名备份 | 需确认才能删除 | 管理端恢复 |
| 恢复前快照 | 恢复操作自动触发 | 手动删除 | 管理端恢复 |

### 图片安全与隔离

爬虫同步（`run.py --full` / `--update`）对图片文件的影响：

| 目录 | 用途 | 爬虫是否涉及 | 覆盖行为 |
|------|------|-------------|----------|
| `/uploads/` | 管理端上传的业务图片 | ❌ 完全不涉及 | — |
| `/uploads/library/` | 素材库图片 | ❌ 完全不涉及 | — |
| `data/public/pets/` | 爬虫下载的精灵图片 | ✅ | `skip_existing=True`，不覆盖 |
| `data/public/skills/icons/` | 爬虫下载的技能图标 | ✅ | `skip_existing=True`，不覆盖 |
| `data/public/elements/icons/` | 爬虫下载的属性图标 | ✅ | `skip_existing=True`，不覆盖 |
| `data/public/pets/thumbs/` | 缩略图（WebP） | ✅ gen_thumbnails.js | 仅源 PNG 更新时重新生成 |

**规则**：

1. `batch_download()` 默认 `skip_existing=True`：文件已存在时直接跳过，不重新下载
2. `gen_thumbnails.js` / `gen_webp.js`：比较源文件与输出文件的 mtime，源文件未变则跳过
3. `import.js`：仅操作数据库（写入路径字符串），不触碰文件系统
4. 爬虫代码中无任何对 `/uploads/` 目录的引用，管理端上传的图片与爬虫完全隔离
5. 如需强制重新下载某图片：手动删除对应文件后重新执行爬虫即可

**同名文件场景**：

| 场景 | 结果 |
|------|------|
| 爬虫下载时目标文件已存在 | 跳过，不覆盖 |
| 手动替换了爬虫图片后重新爬取 | 跳过，保留手动替换的版本 |
| 删除文件后重新爬取 | 重新从 BWIKI 下载 |
| BWIKI 图片更新但文件名不变 | 不会自动更新（需手动删除后重爬） |
