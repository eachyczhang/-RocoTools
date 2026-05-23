# 管理端业务规则

本文档定义了 RocoTools 管理端的业务规则、配置规范、操作约束和技术实现细节。

---

## 一、API 缓存策略

### 后端内存缓存

用户端 API 使用 `apiCache` 中间件进行内存缓存，减少数据库查询：

| 路由 | 缓存时长 | 说明 |
|------|----------|------|
| `/api/pets` | 300s (5min) | 精灵列表/详情 |
| `/api/skills` | 300s (5min) | 技能列表/详情 |
| `/api/eggs` | 600s (10min) | 蛋组数据 |
| `/api/elements` | 600s (10min) | 属性数据 |
| `/api/natures` | 600s (10min) | 性格数据 |
| `/api/seasons` | 300s (5min) | 赛季数据 |
| `/api/events` | 300s (5min) | 活动数据 |
| `/api/pika-monthlies` | 300s (5min) | 皮卡月刊 |

### 自动缓存清除机制

管理端路由 (`/api/admin/*`) 配置了全局中间件，**所有非 GET 请求成功后自动调用 `clearCache()`**：

```javascript
// admin.js 全局中间件
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode < 400 && data && data.success !== false) {
      clearCache();
    }
    return originalJson(data);
  };
  next();
});
```

**规则**：
- 管理端任何写操作（PUT/POST/DELETE）成功后，用户端缓存立即失效
- 蛋组路由 (`/api/eggs`) 的 POST/DELETE 操作也会调用 `clearCache()`
- 前端请求层已设置 `{ cache: 'no-store' }`，浏览器端无缓存

---

## 二、技能管理规则

### UID 命名规范

| 规则 | 说明 |
|------|------|
| 格式 | `skill_{数字}`，如 `skill_1`、`skill_470` |
| 分配方式 | 自动递增，取当前最大编号 +1 |
| 可编辑性 | **不可手动修改**，新建时自动生成并设为只读 |
| 唯一性 | 后端接口保证不重复 |

### 名称校验

- **不可重复**：新建技能时，前后端双重校验名称唯一性
- 前端：保存前调用 `searchSkills` 接口精确匹配
- 后端：`POST /api/admin/data/skills` 时检查 `name` 字段唯一性
- 重复时返回 409 错误，提示已存在的技能 UID

### 分类类型

技能分类为**下拉选择**，不可自由输入：

| 可选值 | 说明 |
|--------|------|
| 物攻 | 物理攻击技能 |
| 魔攻 | 魔法攻击技能 |
| 防御 | 防御类技能 |
| 状态 | 状态类技能 |

### 图标上传

- 图标**非必填**
- 新建模式下支持暂存图标文件，创建技能后一并上传
- 支持本地上传和从素材库选取两种方式

---

## 三、精灵管理规则

### 技能配置

#### 布局规范

技能列表采用**表格式固定宽度列布局**：

| 列 | 宽度 | 内容 |
|----|------|------|
| 等级 | w-20 (5rem) | `LV` 前缀 + 数字输入框(w-12) |
| 图标 | w-6 | 技能图标（从 skills 表 JOIN 获取） |
| 名称 | flex-1 | 技能名称（自适应宽度） |
| 属性 | w-14 | 属性标签（带颜色） |
| 分类 | w-14 | 分类标签（带颜色） |
| 能耗 | w-12 | 数字 |
| 威力 | w-12 | 数字 |
| 操作 | w-5 | 删除按钮 |

#### 等级输入

- `LV` 前缀**固定写死**，不可编辑
- 只需输入数字（type="number"）
- 仅"精灵技能"类型显示等级列，血脉技能和技能石不显示

#### 技能图标

- 技能列表每条记录前显示技能图标
- 后端 `GET /api/admin/pet-skills/:uid` 通过 `LEFT JOIN skills` 返回 `skill_icon` 字段
- 导入技能时同步保存 `icon_url` 到 `skill_icon` 字段
- 保存时 `clean` 函数过滤掉 `skill_icon`（不发送到后端）

#### 技能绑定与 learner 更新

- 精灵绑定技能后，技能详情页的"可学习精灵"列表**实时查询** `pet_skills` 表
- 不存在独立的 `learner` 字段，完全通过 SQL JOIN 动态计算
- 绑定时必须通过"导入技能"功能选择已有技能（填充 `skill_ref_uid`）
- 若 `skill_ref_uid` 为空，精灵不会出现在技能的 learners 列表中

### 蛋组配置

#### 配置方式

- 在**精灵编辑页面**直接配置蛋组（非蛋组管理页面）
- 支持多蛋组选择（1-3 个）
- 保存后自动同步到 `pet_egg_groups` 表
- 使用 delete-then-insert 策略，自动标记 `manual_edit=1`

#### 颜色区分

蛋组标签按 ID 显示不同颜色，方便辨别：

| ID | 蛋组名称 | 颜色 | 色值 |
|----|----------|------|------|
| 0 | 无法孵蛋 | 灰色 | `#9CA3AF` |
| 1 | 动物组 | 琥珀 | `#D97706` |
| 2 | 拟人组 | 粉色 | `#EC4899` |
| 3 | 巨灵组 | 紫色 | `#7C3AED` |
| 4 | 魔力组 | 浅紫 | `#8B5CF6` |
| 5 | 天空组 | 青色 | `#06B6D4` |
| 6 | 两栖组 | 蓝绿 | `#14B8A6` |
| 7 | 植物组 | 绿色 | `#22C55E` |
| 8 | 大地组 | 棕色 | `#A16207` |
| 9 | 妖精组 | 浅粉 | `#F472B6` |
| 10 | 昆虫组 | 黄绿 | `#84CC16` |
| 11 | 软体组 | 淡紫 | `#A78BFA` |
| 12 | 机械组 | 钢灰 | `#6B7280` |
| 13 | 海洋组 | 蓝色 | `#3B82F6` |
| 14 | 龙组 | 红色 | `#EF4444` |

#### 后端接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/pet-egg-groups/:uid` | GET | 获取精灵当前关联的蛋组 |
| `/api/admin/pet-egg-groups/:uid` | PUT | 保存精灵的蛋组关联 |

### 多形态管理（variants_map 自动同步）

精灵支持多形态（如普通形态、异色形态等），通过 `variants_map` 表维护映射关系。

#### 自动同步机制

管理端创建/更新/删除精灵时，后端自动调用 `syncVariantsMap(db, petId)` 函数同步映射：

| 操作 | 触发时机 | 说明 |
|------|----------|------|
| 创建精灵 | `POST /api/admin/data/pets` 成功后 | 同步该 pet_id 的所有形态 |
| 更新精灵 | `PUT /api/admin/data/pets/:id` 成功后 | 同步新旧 pet_id（处理 pet_id 变更） |
| 删除精灵 | `DELETE /api/admin/data/pets/:id` 成功后 | 同步剩余形态 |

#### syncVariantsMap 逻辑

1. 查找同 `pet_id` 下所有 uid（按 uid 自然排序）
2. 删除该 `pet_id` 在 `variants_map` 中的旧记录
3. 重新插入所有 uid 的映射（`sort_order` 从 0 开始递增）

#### 管理端形态切换

精灵编辑页面（`AdminPetEdit.vue`）支持形态切换：
- 标题下方显示形态切换按钮（当 `variants.length > 1` 时）
- 使用 `<router-link>` 跳转到 `/admin/pets/:uid`
- 通过 `watch(() => route.params.uid)` 监听路由变化，自动重新加载数据
- 当前形态高亮使用 `route.params.uid` 响应式判断

### 特性管理

特性（Ability）数据分散在 `pets.ability_name`、`pets.ability_desc`、`pet_details.ability_icon` 中，通过管理端 `/admin/abilities` 页面统一管理。

#### API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/abilities` | GET | 获取所有特性聚合列表（名称、描述、图标、精灵数量） |
| `/api/admin/abilities/:name` | GET | 获取特性详情（含关联精灵列表） |
| `/api/admin/abilities/:name` | PUT | 更新特性（更名/修改描述/修改图标） |
| `/api/admin/abilities/upload-icon` | POST | 上传特性图标 |

#### 更名规则

- 更名时批量更新所有拥有该特性的精灵的 `ability_name` 字段
- 检查目标名称是否已存在（409 冲突）
- 自动标记 `manual_edit = 1`

#### 图标更新规则

- 修改图标时批量更新所有关联精灵的 `pet_details.ability_icon`
- 图标存储路径：`/public/pets/abilities/`
- 支持本地上传和从素材库选取（使用 `ImageUploader` 组件）

### 进化链管理（多路线分支进化）

#### ⚠️ 重要标记：数据格式升级

进化链已从**一维数组**升级为**二维数组**（多路线格式），支持分支进化（如书魔虫→古卷匣魔像 / 书魔虫→另一形态）。

#### 数据格式

```
数据库存储格式（evolution_chain 字段，TEXT 类型，JSON 字符串）：

旧格式1（纯字符串数组，爬虫早期数据）：
  ["喵喵", "喵呜", "魔力猫"]

旧格式2（对象数组，爬虫新数据）：
  [{"name": "喵喵", "evolve_level": null}, {"name": "喵呜", "evolve_level": 36}]

新格式（二维数组，管理端保存后）：
  [
    [{"name": "书魔虫", "evolve_level": null}, {"name": "古卷匣魔像", "evolve_level": 36}],
    [{"name": "书魔虫", "evolve_level": null}, {"name": "另一形态", "evolve_level": 40, "evolve_condition": "使用暗之石"}]
  ]
```

#### 后端标准化（normalizeEvolutionChain）

后端 `pets.js` 中的 `normalizeEvolutionChain()` 函数在读取时自动将三种格式统一为二维数组输出：

| 输入格式 | 处理方式 | 输出 |
|----------|----------|------|
| `["A", "B", "C"]` | 包装为单路线 `[["A","B","C"]]`，每个字符串转为对象 | `[[{name:"A",...}, ...]]` |
| `[{name:"A"}, ...]` | 包装为单路线 `[[...]]` | `[[{name:"A",...}, ...]]` |
| `[[{name:"A"}, ...], [...]]` | 直接使用 | `[[{name:"A",...}, ...], [...]]` |

每个阶段对象丰富后的结构：
```json
{
  "name": "精灵名",
  "evolve_level": 36,          // 进化等级（null 表示初始阶段）
  "evolve_condition": "使用火之石",  // 特殊进化条件（可选）
  "uid": "pet_xxx",            // 从 pets 表按 name 查找
  "thumb_url": "/public/..."   // 缩略图 URL
}
```

#### 同步机制（syncEvolutionChain）

保存进化链时，自动同步到所有路线中涉及的精灵：

| 步骤 | 说明 |
|------|------|
| 1. 解析 JSON | 支持一维/二维数组 |
| 2. 收集所有精灵名 | 遍历所有路线的所有阶段 |
| 3. 按名称查找 uid | `SELECT uid FROM pets WHERE name = ?` |
| 4. UPSERT 同步 | 将完整的进化链 JSON 写入每个精灵的 `pet_details.evolution_chain` |
| 5. 标记 manual_edit | 同步的记录自动标记 `manual_edit=1` |

**关键规则**：
- 同步时跳过当前精灵自身（已保存）和数据库中找不到的精灵
- 所有路线中的精灵共享**完全相同**的进化链数据
- 修改任意一只精灵的进化链，整条链上所有精灵都会更新
- `sync_db.js` 末尾自动执行 `sync-evolution-chains.js`，每次数据导入后自动合并进化链

#### ⚠️ 风险预防策略

| 风险 | 预防措施 | 说明 |
|------|----------|------|
| 旧格式数据被破坏 | `normalizeEvolutionChain` 只读转换 | 旧数据不会被修改，只有管理端重新保存才转为新格式 |
| 分支进化覆盖 | 二维数组保存完整路线 | 配置古卷匣魔像路线不会覆盖古卷执政官路线 |
| 同步导致数据丢失 | 同步写入完整 JSON | 所有精灵持有完整的多路线数据 |
| 爬虫覆盖手动配置 | `manual_edit=1` 保护 | 同步后自动标记，爬虫导入时跳过 |
| JSON 解析失败 | try-catch 静默失败 | 格式异常时函数直接 return，不影响其他功能 |
| 精灵名称变更 | 按名称查找 | 如果精灵改名，旧进化链中的名称将无法匹配（需手动更新） |

#### 进化条件结构化配置（evolve_condition）

进化条件从纯文本升级为**结构化对象**，支持4种类型：

| 类型 | type 值 | 字段 | 展示效果 |
|------|---------|------|----------|
| 纯文本 | `text` | `text` | 直接显示文本（如"使用火之石"） |
| 技能类 | `skill` | `skill_name`, `skill_uid`, `skill_count`, `need_win` | "使用3次火焰冲击(需战胜)" |
| 属性类 | `element` | `element_name`, `element_id`, `element_count` | "击败5只火属性精灵" |
| 精灵类 | `pet` | `pet_name`, `pet_uid`, `pet_count` | "击败3次喵喵" |

**数据格式示例**：

```json
// 纯文本
{ "type": "text", "text": "使用火之石" }

// 技能类
{ "type": "skill", "skill_name": "火焰冲击", "skill_uid": "skill_42", "skill_count": 3, "need_win": true }

// 属性类
{ "type": "element", "element_name": "火", "element_id": 2, "element_count": 5 }

// 精灵类
{ "type": "pet", "pet_name": "喵喵", "pet_uid": "pet_001", "pet_count": 3 }
```

**向后兼容**：
- 旧数据中 `evolve_condition` 为纯字符串 → 后端 `normalizeEvolutionChain` 自动转为 `{ type: "text", text: "..." }`
- 旧数据中 `evolve_condition` 为 `null` → 保持 `null`
- 用户端 `formatEvoCondition` 函数兼容字符串和对象两种格式

**管理端配置组件**：
- 下拉选择条件类型（无条件/文本/技能/属性/精灵）
- 技能类：使用 `SkillPicker` 弹窗选择技能（绑定 `skill_uid`），配置使用次数和是否需要战胜
- 属性类：使用属性下拉选择器（带图标，绑定 `element_id`），配置击败次数
- 精灵类：使用 `PetPicker` 组件选择精灵（绑定 `pet_uid`，启用 `all-variants` 和 `compact`），配置击败次数
- 次数输入框宽度至少 `w-20`（支持3-4位数显示）

#### 管理端配置方式

1. 进入精灵编辑页面
2. 在"进化链"区域点击 **+ 添加进化路线**
3. 每条路线内点击 **+ 添加阶段**，按进化顺序排列
4. 每个阶段可通过 `PetPicker` 选择已有精灵，或手动输入名称
5. 每个阶段可配置进化等级和特殊进化条件（均为选填）
6. 保存后自动同步到所有路线中的精灵

#### 用户端展示规则

| 条件 | 展示方式 |
|------|----------|
| 只有一条路线且阶段 ≥ 2 | 显示进化链，不显示"路线N"标签 |
| 多条路线 | 每条路线前显示"路线 1"、"路线 2"标签 |
| 所有路线阶段都 ≤ 1 | 不显示进化链区域 |
| 当前精灵在链中 | 高亮显示（ring + 背景色） |
| 其他精灵 | 可点击跳转到对应详情页 |

---

### 图片上传与字段同步

上传精灵立绘（`pet_default` 类型）时，自动同步写入以下字段：

| 字段 | 表 | 内容 |
|------|-----|------|
| `image_default` | pet_details | 立绘大图路径 |
| `image_url` | pets | 精灵主图路径（列表/卡片展示） |
| `thumb_url` | pets | 缩略图路径（128px WebP） |

**规则**：所有引用 `image_url` 的地方（如技能详情的可学习精灵列表）使用 `COALESCE(p.thumb_url, p.image_url)` 做 fallback。

---

## 四、素材管理规则

### 存储路径

| 类型 | 存储路径 | 说明 |
|------|----------|------|
| 素材库上传 | `/uploads/library/` | 可指定子目录 |
| 素材库缩略图 | `/uploads/library/.thumbs/` | 自动生成 |
| 精灵图片 | `/public/pets/` | 按类型分子目录 |
| 技能图标 | `/public/skills/icons/` | — |
| 属性图标 | `/public/elements/icons/` | — |
| 皮卡月刊 | `/uploads/pika/` | — |
| 赛季 | `/uploads/seasons/` | — |
| 活动 | `/uploads/events/` | — |

### 图片上传后的自动处理

#### 素材库上传

上传到素材库时，自动生成 **200×200px WebP 缩略图**：

| 参数 | 值 |
|------|-----|
| 尺寸 | 200×200, `fit: 'inside'`, 不放大 |
| 格式 | WebP |
| 质量 | 70 |
| 存储 | `/uploads/library/.thumbs/{同名}.webp` |

#### 精灵立绘上传

上传精灵立绘（`pet_default`）时做双重处理：

| 步骤 | 输出 | 参数 |
|------|------|------|
| WebP 压缩版 | 同目录 `.webp` | quality: 80 |
| 128px 缩略图 | `/public/pets/thumbs/{uid}_default.webp` | 128×128, fit: contain, quality: 60 |

#### 前端加载优化

- 素材管理页面和素材选择器在列表/网格浏览时，**优先加载 `thumb_path`（缩略图）**
- 只有在点击预览或实际使用时才加载原图
- 素材库 GET 接口返回每个文件时附带 `thumb_path` 字段

### 批量操作权限

| 分类 | 全选本页 | 批量删除 | Ctrl+点击选择 |
|------|----------|----------|---------------|
| 素材库（library） | ✅ | ✅ | ✅ |
| 精灵 | ❌ | ❌ | ❌ |
| 皮卡月刊 | ❌ | ❌ | ❌ |
| 赛季 | ❌ | ❌ | ❌ |
| 活动 | ❌ | ❌ | ❌ |
| 技能 | ❌ | ❌ | ❌ |
| 属性 | ❌ | ❌ | ❌ |

**规则**：只有素材库分类（用户自己上传的文件）可以批量操作，其他分类的图片受保护。

### 后端分页

素材管理的所有图片列表接口均采用**后端分页**，前端不再做全量加载后切片：

| 接口 | 分页参数 | 默认值 |
|------|----------|--------|
| `GET /api/admin/library` | `page`, `pageSize` | page=1, pageSize=24 |
| `GET /api/admin/media` | `page`, `pageSize` | page=1, pageSize=24 |

**返回格式**：

```json
{
  "files": [...],
  "total": 150,
  "page": 1,
  "pageSize": 24,
  "totalPages": 7
}
```

**规则**：
- 前端切换分类/页码/每页数量时，重新请求后端获取对应页数据
- 前端 `pageSize` 可选值：36、72、120、全部（0）
- 后端先扫描全部文件并排序（按修改时间倒序），再切片返回
- 切换分类时 `currentPage` 重置为 1

### 缩略图查找策略

`GET /api/admin/media` 接口为所有图片类型自动查找缩略图（`thumb_path` 字段）：

| 图片类型 | 缩略图查找规则 |
|----------|----------------|
| 素材库 (`/uploads/library/`) | 查找 `.thumbs/` 目录下同名 `.webp` 文件 |
| 精灵缩略图 (`/public/pets/thumbs/`) | 直接使用（已是优化后的 WebP） |
| 精灵其他图 (`/public/pets/`) | 查找 `thumbs/{uid}_default.webp` |
| 技能图标 (`/public/skills/`) | 查找同名 `.webp` 版本 |
| 属性图标 (`/public/elements/`) | 查找同名 `.webp` 版本 |
| 上传图片 (`/uploads/` 非 library) | 查找同名 `.webp` 版本 |

### 切换分类行为

- 切换分类/搜索/子分类时**自动清空已选状态**
- 防止跨分类误删

### 素材排序规则

后端 `GET /api/admin/library` 和 `GET /api/admin/media` 接口支持 `sort` 查询参数，前端通过下拉选择器切换排序方式。

#### 可选排序模式

| 模式 | 参数值 | 说明 |
|------|--------|------|
| 名称升序 | `name_asc` | **默认**，按 displayName 自然排序（中文拼音序 + 数字自然序） |
| 名称降序 | `name_desc` | 按 displayName 自然排序倒序 |
| 最新优先 | `time_desc` | 按文件修改时间倒序 |
| 最早优先 | `time_asc` | 按文件修改时间正序 |
| 最大优先 | `size_desc` | 按文件大小倒序 |
| 最小优先 | `size_asc` | 按文件大小正序 |

#### 自然排序算法（Natural Sort）

名称排序使用自然排序算法 `naturalCompare`，规则如下：

1. **去除时间戳前缀**：文件名格式为 `{timestamp}_{原始名}.ext`，排序前先 strip `^\d+_` 前缀
2. **分段比较**：将文件名拆分为文本段和数字段交替序列
3. **数字段**：按数值大小比较（`2` < `10`，而非字典序 `"10"` < `"2"`）
4. **文本段**：使用 `localeCompare('zh-CN')` 比较，中文按拼音排序
5. **混合段**：数字段优先于文本段

**效果示例**：
```
小丑兔.png → 小丑公爵.png → 小丑豆豆.png → 小丑豆豆的果实.png → 小丑豆豆的蛋.png
概念-1.webp → 概念-2.webp
九幽-1.webp → 九幽-2.webp → 嘟嘟-1.webp → 嘟嘟-2.webp
```

#### 排序触发时机

- 切换排序模式时，自动重新请求后端（watch 监听 `sortMode`）
- 排序在**后端执行**（分页前排序），确保分页结果一致性
- 前端不做额外排序，直接展示后端返回的顺序

---

## 五、管理端页面入口规范

新增管理端页面时，必须在以下**三处**添加入口：

1. **App.vue 桌面端导航** — 侧边栏菜单项
2. **App.vue 移动端导航** — 底部/抽屉菜单项
3. **AdminDashboard.vue** — 仪表盘快捷入口卡片

---

## 六、Vue 前端代码规范

### HTML 标签闭合

- 每次编辑 `.vue` 文件的 `<template>` 部分后，**必须验证所有 HTML 标签正确闭合**
- 特别注意 `<div>` / `</div>` 数量匹配（可用 `grep -c` 快速验证）
- 嵌套结构修改时，确保新增的容器 `<div>` 有对应的 `</div>`
- 编辑完成后应运行 `npx vite build` 验证无编译错误

### Lint 与构建验证

- 编辑 Vue 文件后，使用 `read_lints` 工具检查 lint 错误
- 编辑后端 JS 文件后，确认正则表达式语法正确（如 `/pattern/flags` 中无多余空格）
- 重大修改后运行 `npx vite build --mode development` 确认构建通过

### 导入规范

- Vue 组件中使用 Composition API 必须从 `vue` 完整导入所需函数
- 示例：`import { ref, computed, onMounted, reactive, watch, nextTick, h } from 'vue'`
- API 模块必须完整导入，不可使用解构缩写
- 示例：`import { adminApi } from '@/api/admin'`

### API 导入

- Vue 组件中使用 API 必须**完整导入**，不可使用解构缩写
- 示例：`import { petsApi, elementsApi, skillsApi, eggsApi } from '@/api'`

### 模板属性

- 模板属性中**禁止使用反引号模板字符串**
- 必须改用字符串拼接或 computed 属性
- 错误示例：`:src="`/api/img/${id}`"`
- 正确示例：`:src="'/api/img/' + id"`

### 共享组件

管理端可用的共享组件列表：

| 组件 | 路径 | 用途 |
|------|------|------|
| DatePicker | `components/shared/DatePicker.vue` | 日期选择器 |
| SearchSelect | `components/shared/SearchSelect.vue` | 搜索下拉选择 |
| PetPicker | `components/shared/PetPicker.vue` | 精灵选择器（支持 `allVariants`/`compact` props） |
| ModalDialog | `components/shared/ModalDialog.vue` | 模态弹窗 |
| ImagePreview | `components/shared/ImagePreview.vue` | 图片预览 |
| ImageUploader | `components/shared/ImageUploader.vue` | 图片上传（支持本地+素材库） |
| PetCard | `components/shared/PetCard.vue` | 精灵卡片 |
| StatsRadar | `components/shared/StatsRadar.vue` | 种族值雷达图 |

#### PetPicker 组件 Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | String | `''` | 绑定的精灵 uid（v-model） |
| `placeholder` | String | `'搜索精灵（名称/编号）'` | 输入框占位文本 |
| `allVariants` | Boolean | `false` | 是否返回所有形态（传递 `all_variants` 参数给后端） |
| `compact` | Boolean | `false` | 紧凑模式（已选中状态：6×6图标+单行名称，适用于行内嵌入场景） |

**使用场景**：
- 进化链阶段选择精灵：默认模式
- 进化条件中选择精灵：启用 `all-variants` + `compact`（需要选择所有形态，且行高不能过大）
### 用户端 API 参数

#### `GET /api/pets` 精灵列表

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `limit` | number | 50 | 每页数量（最大200） |
| `element_id` | number | — | 按属性筛选 |
| `egg_group` | number | — | 按蛋组筛选 |
| `search` | string | — | 名称模糊搜索 |
| `sort_by` | string | `pet_id` | 排序字段（pet_id/name/total/hp/speed/atk/matk/def/mdef） |
| `order` | string | `asc` | 排序方向（asc/desc） |
| `all_variants` | any | — | **传入任意值时返回所有形态**，不传则只返回每个 pet_id 的第一形态 |

**`all_variants` 使用场景**：
- 进化条件中的精灵选择器需要选择所有形态（如异色形态）
- `PetPicker` 组件通过 `allVariants` prop 控制是否传递此参数

### 管理端专用接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/data/:table` | POST | 通用创建记录 |
| `/api/admin/data/:table/:id` | PUT | 通用更新记录 |
| `/api/admin/data/:table/:id` | DELETE | 通用删除记录 |
| `/api/admin/pet-skills/:uid` | GET/PUT | 精灵技能管理 |
| `/api/admin/pet-egg-groups/:uid` | GET/PUT | 精灵蛋组管理 |
| `/api/admin/abilities` | GET | 特性聚合列表 |
| `/api/admin/abilities/:name` | GET | 特性详情（含关联精灵） |
| `/api/admin/abilities/:name` | PUT | 更新特性（更名/描述/图标） |
| `/api/admin/abilities/upload-icon` | POST | 上传特性图标 |
| `/api/admin/skills-next-uid` | GET | 获取下一个技能 UID |
| `/api/admin/skills-search?q=` | GET | 技能名称搜索（自动补全） |
| `/api/admin/library/upload` | POST | 素材库上传 |
| `/api/admin/library` | GET | 素材库列表（支持 `page`/`pageSize` 分页） |
| `/api/admin/library/:filename` | DELETE | 素材库删除 |
| `/api/admin/media` | GET | 所有图片列表（支持 `page`/`pageSize` 分页） |
| `/api/admin/media` | DELETE | 按路径删除图片 |
| `/api/admin/media/copy-to-business` | POST | 素材库复制到业务目录 |

### 鉴权

- 所有 `/api/admin/*` 接口使用 `authAdmin` 中间件
- JWT Token 鉴权
- 前端通过 `adminRequest()` 统一附加 Authorization header

---

## 八、Nginx 性能优化配置

### 压缩策略

| 压缩方式 | 优先级 | 适用内容 |
|----------|--------|----------|
| Brotli | 优先 | 文本类资源（JS/CSS/JSON/HTML/SVG/字体/WASM） |
| Gzip | 备用 | 同上（不支持 Brotli 的客户端回退） |

**Brotli 参数**：`brotli_comp_level 6`，`brotli_min_length 512`

### 静态资源缓存

| 资源路径 | 缓存时长 | Cache-Control |
|----------|----------|---------------|
| `/public/` | 365天 | `public, immutable, max-age=31536000` |
| `/uploads/` | 365天 | `public, immutable, max-age=31536000` |
| `*.webp/jpg/jpeg/png/gif/svg` | 365天 | `public, immutable, max-age=31536000` |

**规则**：
- 图片资源关闭 gzip（已是压缩格式，gzip 无收益）
- 启用 `brotli_static on` 和 `gzip_static on`（优先使用预压缩文件）
- 启用 `sendfile`、`tcp_nopush`、`tcp_nodelay` 优化传输
- 所有图片响应添加 `Vary: Accept` 头（支持内容协商）

### 配置文件

- Nginx 配置模板：项目根目录 `nginx.conf`
- 占位符 `<PROJECT_DIR>` 需替换为服务器实际部署路径
- Brotli 模块需服务器额外安装（`nginx-module-brotli`）

---

## 九、前端稳定性机制

### 页面可见性恢复（usePageVisibility）

解决 SPA 页面切到后台一段时间后变成"无响应"的问题。

**组件**：`composables/usePageVisibility.js`

**机制**：
- 监听 `document.visibilitychange` 事件
- 记录页面隐藏时间戳
- 页面重新可见时，如果隐藏时长 ≥ 5 分钟（`STALE_THRESHOLD`）：
  - 管理端：检查 JWT token 是否过期，过期则 `window.location.reload()` 触发重新登录
  - 自动 `router.replace(route.fullPath)` 刷新当前页面数据
- 提供全局事件总线 `onPageResume(callback)` 供组件订阅恢复事件

**集成位置**：`App.vue` 中调用 `usePageVisibility()`

### 请求超时机制

防止 fetch 请求在页面后台时永远挂起（Promise 不 resolve 也不 reject）。

| API 层 | 超时时长 | 文件 |
|--------|----------|------|
| 管理端 `adminRequest` | 30 秒 | `api/admin.js` |
| 用户端 `request` | 20 秒 | `api/index.js` |

**实现**：使用 `AbortController` + `setTimeout`，超时后 `abort()` 请求，抛出"请求超时"错误。

---

## 十、Express 中间件顺序规范

**核心原则**：API 路由必须注册在静态文件中间件之前，确保 API 请求不被图片 I/O 阻塞。

```
1. cors() + morgan() + express.json()   ← 核心中间件
2. /api/* 路由                            ← API 优先处理
3. express.static('/public')             ← 静态文件（仅开发环境/fallback）
4. express.static('/uploads')            ← 上传文件（仅开发环境/fallback）
```

**原因**：3M 带宽服务器上，并发图片下载会占满 Node.js 事件循环，导致 API 请求排队。生产环境由 Nginx 直接提供静态文件（`location ^~ /public/` 和 `location ^~ /uploads/`），Express 的 static 中间件仅作为开发环境 fallback。

### Nginx location 优先级

- `/public/` 和 `/uploads/` 使用 `^~` 修饰符，确保优先于正则 location
- 正则 `~* \.(webp|jpg|...)$` 仅匹配未被 `^~` 捕获的图片请求（如 `/rocotools/assets/` 中的构建产物图片）

---

## 十一、manual_edit 保护机制

| 表 | 字段 | 说明 |
|----|------|------|
| pets | manual_edit | 管理端编辑后标记为 1 |
| skills | manual_edit | 管理端编辑后标记为 1 |
| pet_details | manual_edit | 管理端编辑后标记为 1 |
| pet_egg_groups | manual_edit | 管理端配置蛋组后标记为 1 |

**规则**：
- 管理端编辑自动标记 `manual_edit=1`
- 爬虫导入时跳过 `manual_edit=1` 的记录
- 冲突数据存入 `pending_conflicts.json`，通过管理端审查页面处理
