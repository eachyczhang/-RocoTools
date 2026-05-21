# Skill: roco-data-spec

> RocoTools 数据结构与命名规范。新增/修改任何数据时必须遵循。

---

## UID 格式

| 数据类型 | 格式 | 示例 |
|---------|------|------|
| 属性 | `elem_{id}` | `elem_1`, `elem_18` |
| 技能 | `skill_{序号}` | `skill_1`, `skill_469` |
| 精灵（单形态） | `pet_{编号}` | `pet_001`, `pet_466` |
| 精灵（多形态） | `pet_{编号}_{形态序号}` | `pet_040_1`, `pet_040_7` |

- 编号 3 位补零（`001`~`999`）
- 形态序号从 1 开始

---

## 图片路径规范

所有图片统一 `/public/` 前缀，存储在 `data/public/` 目录。

| 类型 | 路径 | 后缀 |
|------|------|------|
| 属性图标 | `/public/elements/icons/elem_{id}.png` | `.png` |
| 技能图标 | `/public/skills/icons/skill_{N}.png` | `.png` |
| 精灵立绘 | `/public/pets/default/{uid}_default.png` | `_default.png` |
| 异色立绘 | `/public/pets/shiny/{uid}_shiny.png` | `_shiny.png` |
| 果实图片 | `/public/pets/fruit/{uid}_fruit.png` | `_fruit.png` |
| 精灵蛋 | `/public/pets/egg/{uid}_egg.png` | `_egg.png` |
| 缩略图 | `/public/pets/thumbs/{uid}_default.webp` | `_default.webp` |
| 特性图标 | `/public/pets/abilities/{uid}_ability.png` | `_ability.png` |

---

## JSON 字段规范

- **空值**：使用 `null`，不用空字符串
- **空数组**：使用 `[]`
- **属性引用**：结构化对象 `{ id, key, name, color, icon }`
- **技能引用**：`{ uid, name, icon_url }`
- **精灵双属性**：`element`（主属性）+ `sub_element`（副属性，可为 null）

---

## 精灵数据模型（pet_list.json）

```json
{
  "uid": "pet_001",
  "pet_id": "001",
  "name": "精灵名",
  "element": { "id": 1, "key": "elem_1", "name": "火", "color": "#...", "icon": "/public/..." },
  "sub_element": null,
  "ability_name": "特性名",
  "ability_desc": "特性描述",
  "hp": 100, "atk": 80, "def": 70, "matk": 90, "mdef": 60, "speed": 85,
  "total": 485,
  "version": "1.0",
  "image_url": "/public/pets/thumbnails/pet_001.png",
  "thumb_url": "/public/pets/thumbs/pet_001_default.webp",
  "egg_groups": ["陆地", "植物"]
}
```

---

## 技能数据模型（skill_list.json）

```json
{
  "uid": "skill_1",
  "name": "技能名",
  "element": { "id": 1, "key": "elem_1", "name": "火" },
  "category": "物攻",
  "cost": 20,
  "power": 80,
  "description": "技能描述文本",
  "version": "1.0",
  "icon_url": "/public/skills/icons/skill_1.png"
}
```

---

## 属性数据模型（element_chart_structured.json）

```json
{
  "id_map": { "1": "火", "2": "水", ... },
  "elements": {
    "elem_1": {
      "id": 1, "key": "elem_1", "name": "火",
      "color": "#E85D3A", "icon": "/public/elements/icons/elem_1.png",
      "immunity": null,
      "strong_against": [{ "id": 2, "key": "elem_2", "name": "草" }],
      "resisted_by": [{ "id": 3, "key": "elem_3", "name": "水" }],
      "weak_to": [...],
      "resistant_to": [...]
    }
  },
  "multipliers": { "strong": 2.0, "resist": 0.5, "double_strong": 3.0, "double_resist": 0.25 }
}
```

---

## 数据库字段对照

### pets 表
`uid(PK)`, `pet_id`, `name`, `element_id`, `sub_element_id`, `ability_name`, `ability_desc`, `hp`, `speed`, `atk`, `matk`, `def`, `mdef`, `total`, `version`, `image_url`, `thumb_url`

### pet_details 表
`pet_uid(PK)`, `element_id`, `ability_icon`, `image_default`, `image_shiny`, `image_fruit`, `image_egg`, `height`, `weight`, `location`, `evolution_chain(JSON)`, `restrain_strong(JSON)`, `restrain_weak(JSON)`, `restrain_resist(JSON)`, `restrain_resisted(JSON)`

### skills 表
`uid(PK)`, `name`, `element_id`, `category`, `cost`, `power`, `description`, `version`, `icon_url`

### elements 表
`id(PK)`, `key`, `name`, `color`, `icon`, `immunity`, `strong_against(JSON)`, `resisted_by(JSON)`, `weak_to(JSON)`, `resistant_to(JSON)`

### natures 表
`id(PK)`, `name`, `stat_up`, `stat_down`

---

## 增量判断

- 通过 `version` 字段判断是否需要重新爬取
- 映射关系（egg_groups/element/skill_ref）每次都刷新，不依赖 version

---

## 执行顺序（严格依赖关系）

属性 → 技能 → 蛋组 → 性格 → 精灵列表 → 精灵详情
