# Skill: roco-evolution

> RocoTools 进化链与进化条件配置系统。涉及进化链管理时参考。

---

## 进化链数据格式

进化链存储在 `pet_details.evolution_chain` 字段中，使用 **二维数组（多路线格式）**：

```json
// 单路线
[
  [{"name": "喵喵", "evolve_level": null}, {"name": "喵呜", "evolve_level": 36}, {"name": "魔力猫", "evolve_level": 60}]
]

// 多路线（分支进化）
[
  [{"name": "书魔虫", "evolve_level": null}, {"name": "古卷匣魔像", "evolve_level": 36}],
  [{"name": "书魔虫", "evolve_level": null}, {"name": "另一形态", "evolve_level": 40, "evolve_condition": {...}}]
]
```

---

## 三种历史格式兼容

后端 `normalizeEvolutionChain()` 函数（`app/server/src/services/pets.js`）自动兼容：

| 格式 | 示例 | 来源 |
|------|------|------|
| 字符串数组 | `["喵喵", "喵呜"]` | 最早的爬虫数据 |
| 对象数组 | `[{name:"喵喵"}, {name:"喵呜", evolve_level:36}]` | 新爬虫数据 |
| 二维数组 | `[[{...}, {...}], [{...}]]` | 管理端新保存 |

**统一输出**：始终返回二维数组 `[[{name, evolve_level, evolve_condition, uid, thumb_url}, ...], ...]`

---

## 进化条件结构化配置（evolve_condition）

`evolve_condition` 从纯文本升级为**结构化对象**，支持4种类型：

### 类型定义

| 类型 | type 值 | 字段 | 展示效果 |
|------|---------|------|----------|
| 纯文本 | `text` | `text` | 直接显示文本（如"使用火之石"） |
| 技能类 | `skill` | `skill_name`, `skill_uid`, `skill_count`, `need_win` | "使用3次火焰冲击(需战胜)" |
| 属性类 | `element` | `element_name`, `element_id`, `element_count` | "击败5只火属性精灵" |
| 精灵类 | `pet` | `pet_name`, `pet_uid`, `pet_count` | "击败3次喵喵" |

### 数据格式示例

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

### 向后兼容

- 旧数据中 `evolve_condition` 为纯字符串 → 后端自动转为 `{ type: "text", text: "..." }`
- 旧数据中 `evolve_condition` 为 `null` → 保持 `null`
- 用户端 `formatEvoCondition()` 函数兼容字符串和对象两种格式

---

## 管理端配置组件

### 进化链配置 UI（AdminPetEdit.vue）

- 多路线配置：每条路线独立卡片，支持添加/删除路线
- 每条路线内支持添加/删除/排序阶段
- 每个阶段：
  - `PetPicker` 选择精灵（支持 `allVariants`）或手动输入名称
  - 进化等级输入（选填）
  - 进化条件类型选择 + 对应配置组件

### 进化条件配置组件

- **下拉选择**条件类型（无条件/文本/技能/属性/精灵）
- **技能类**：使用 `SkillPicker` 弹窗选择技能（绑定 `skill_uid`），配置使用次数和是否需要战胜
- **属性类**：使用属性下拉选择器（带图标，绑定 `element_id`），配置击败次数
- **精灵类**：使用 `PetPicker` 组件选择精灵（绑定 `pet_uid`，启用 `all-variants` + `compact`），配置击败次数
- **次数输入框**：宽度至少 `w-20`（支持3-4位数显示）

---

## 用户端展示

### PetDetail.vue 进化链展示

- 多路线时显示"路线 1"、"路线 2"标签
- 单路线时不显示路线标签
- 显示条件：至少有一条路线包含2个以上阶段
- 进化条件展示逻辑：
  - 只有等级：显示 `Lv.36`
  - 只有条件（无等级）：显示条件文本，代替"特殊"
  - 等级+条件都有：上方 `Lv.36`，箭头下方小字显示条件
  - 都没有：显示"特殊"
- 精灵可点击跳转详情页（非当前精灵时）
- 技能/精灵条件带小图标

### formatEvoCondition() 函数

```js
function formatEvoCondition(cond) {
  if (!cond) return ''
  if (typeof cond === 'string') return cond // legacy
  if (cond.type === 'text') return cond.text || ''
  if (cond.type === 'skill') {
    let s = `使用${cond.skill_count || 1}次${cond.skill_name || '?'}`
    if (cond.need_win) s += '(需战胜)'
    return s
  }
  if (cond.type === 'element') return `击败${cond.element_count || 1}只${cond.element_name || '?'}属性精灵`
  if (cond.type === 'pet') return `击败${cond.pet_count || 1}次${cond.pet_name || '?'}`
  return ''
}
```

---

## 进化链自动同步

### syncEvolutionChain（admin.js）

当一只精灵的进化链被保存时，自动同步到链中所有其他精灵：

1. 解析保存的 JSON（支持1D和2D格式）
2. 收集所有路线中的精灵名称
3. 通过名称查找对应的 `pet_uid`
4. 将完整的进化链 JSON 写入所有关联精灵的 `pet_details.evolution_chain`
5. 跳过当前精灵自身（已保存）和未入库精灵

### sync-evolution-chains.js 批量脚本

路径：`app/server/scripts/sync-evolution-chains.js`

- 扫描所有精灵的进化链数据
- 将分支进化路线合并为完整的二维数组
- 跳过 `manual_edit=1` 的记录
- `sync_db.js --full` 已包含此步骤；默认模式不会执行

---

## 关键文件

| 文件 | 职责 |
|------|------|
| `app/server/src/services/pets.js` | `normalizeEvolutionChain()` 格式标准化 |
| `app/server/src/routes/admin.js` | `syncEvolutionChain()` 自动同步 |
| `app/server/scripts/sync-evolution-chains.js` | 批量合并脚本 |
| `app/client/src/views/admin/AdminPetEdit.vue` | 管理端进化链配置 UI |
| `app/client/src/views/user/PetDetail.vue` | 用户端进化链展示 |

---

## PetPicker 组件 Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | String | `''` | 绑定的精灵 uid（v-model） |
| `placeholder` | String | `'搜索精灵'` | 输入框占位文本 |
| `allVariants` | Boolean | `false` | 是否返回所有形态 |
| `compact` | Boolean | `false` | 紧凑模式（6×6图标+单行名称） |

**使用场景**：
- 进化链阶段选择精灵：默认模式
- 进化条件中选择精灵：启用 `all-variants` + `compact`

---

**最后更新：2026-05-24**
