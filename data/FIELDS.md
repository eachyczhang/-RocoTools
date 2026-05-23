# 数据字段对照表

## 精灵列表（data/pets/pet_list.json）

扁平结构，每条记录对应一个形态。同 pet_id 多条记录表示有特殊形态。

| Key | 中文名 | 类型 | 示例 |
|-----|--------|------|------|
| uid | 唯一标识 | string | "pet_002" / "pet_011_1" |
| pet_id | 图鉴编号 | string | "001" |
| name | 精灵名称 | string | "迪莫" |
| element | 属性 | object | `{id, key, name, color, icon}` |
| egg_groups | 蛋组 | list[string] | `["动物组", "拟人组"]` |
| ability_name | 特性名称 | string | "最好的伙伴" |
| ability_desc | 特性描述 | string | "造成克制伤害后..." |
| hp | 生命（种族值） | int | 120 |
| speed | 速度（种族值） | int | 92 |
| atk | 物攻（种族值） | int | 80 |
| matk | 魔攻（种族值） | int | 80 |
| def | 物防（种族值） | int | 105 |
| mdef | 魔防（种族值） | int | 105 |
| total | 总种族值 | int | 582 |
| version | 更新版本 | string | "0.6" |
| image_url | 缩略图 | string | "/public/pets/thumbnails/pet_002.png" |

### element 对象结构

```json
{
  "id": 2,
  "key": "elem_2",
  "name": "草",
  "color": "#4EBC73",
  "icon": "/public/elements/icons/elem_2.png"
}
```

---

## 精灵详情（data/pets/pet_detail.json）

每个形态独立存储为完整对象，通过唯一 uid 索引。

### 顶层结构

| Key | 说明 |
|-----|------|
| pets | 精灵对象字典，key 为 uid |
| variants_map | 多形态归属映射，key 为 pet_id，value 为该 id 下所有 uid 列表 |

### uid 规则

| 情况 | uid 格式 | 示例 |
|------|----------|------|
| 单形态 | pet_{pet_id} | pet_002 |
| 多形态 | pet_{pet_id}_{序号} | pet_011_1, pet_011_2 |

### 单个精灵对象

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
  "detail": { ... }
}
```

### detail 字段

| Key | 中文名 | 类型 |
|-----|--------|------|
| element | 属性 | object `{id,key,name,color,icon}` |
| image_default | 本体立绘 | string/null | `/public/pets/default/{uid}_default.png` |
| image_shiny | 异色立绘 | string/null | `/public/pets/shiny/{uid}_shiny.png` |
| image_fruit | 果实图片 | string/null | `/public/pets/fruit/{uid}_fruit.png` |
| image_egg | 精灵蛋图片 | string/null | `/public/pets/egg/{uid}_egg.png` |
| height | 身高 | string |
| weight | 体重 | string |
| location | 精灵分布 | string |
| evolution_chain | 进化链 | list[list[object]] | ⚠️ 二维数组（多路线），每个对象含 name/evolve_level/evolve_condition；旧数据可能是 list[string] 或 list[object]，后端读取时自动标准化 |
| restrain_strong | 克制 | list[string] |
| restrain_weak | 被克制 | list[string] |
| restrain_resist | 抵抗 | list[string] |
| restrain_resisted | 被抵抗 | list[string] |
| skills | 精灵技能 | list[Skill] |
| bloodline_skills | 血脉技能 | list[Skill] |
| learnable_stones | 可学技能石 | list[Skill] |

### Skill 结构

| Key | 中文名 | 类型 | 示例 |
|-----|--------|------|------|
| level | 习得等级 | string | "LV1" |
| name | 技能名称 | string | "猛烈撞击" |
| element | 技能属性 | string | "普通" |
| type | 技能类别 | string | "物攻"/"魔攻"/"防御"/"状态" |
| cost | 能量消耗 | int | 1 |
| power | 威力 | int | 65 |
| description | 技能描述 | string | "对敌方精灵造成物理伤害。" |
| skill_ref | 技能关联 | object/null | `{uid, name, icon_url}` |

#### skill_ref 结构

```json
{
  "uid": "skill_2",
  "name": "抓挠",
  "icon_url": "/public/skills/icons/skill_2.png"
}
```

---

## 技能列表（data/skills/skill_list.json）

| Key | 中文名 | 类型 | 示例 |
|-----|--------|------|------|
| uid | 唯一标识 | string | "skill_1" |
| name | 技能名称 | string | "冰锋横扫" |
| element | 技能属性 | object | `{id, key, name, color, icon}` |
| category | 技能分类 | string | "物攻"/"魔攻"/"防御"/"状态" |
| cost | 能量消耗 | int | 4 |
| power | 威力 | int | 0 |
| description | 技能效果 | string | "造成魔伤，本技能威力等于..." |
| version | 更新版本 | string | "0.1" |
| icon_url | 技能图标 | string | "/public/skills/icons/skill_1.png" |

---

## 属性克制关系（data/elements/element_chart_structured.json）

### 顶层结构

| Key | 说明 |
|-----|------|
| id_map | 数字 id → 中文属性名 映射 |
| multipliers | 伤害倍率（strong/resist 等） |
| elements | 属性对象字典，key 为 elem_N |

### 单个属性对象

| Key | 中文名 | 类型 | 示例 |
|-----|--------|------|------|
| id | 属性编号 | int | 2 |
| key | 索引 key | string | "elem_2" |
| name | 属性名称 | string | "草" |
| color | 属性颜色 | string | "#4EBC73" |
| icon | 属性图标 | string | "/public/elements/icons/elem_2.png" |
| immunity | 免疫效果 | string/null | "寄生" |
| strong_against | 克制 | list[{id,key,name}] | 攻击该属性伤害×2 |
| resisted_by | 被抵抗 | list[{id,key,name}] | 攻击该属性伤害×0.5 |
| weak_to | 弱点 | list[{id,key,name}] | 受到该属性伤害×2 |
| resistant_to | 抗性 | list[{id,key,name}] | 受到该属性伤害×0.5 |

---

## 蛋组数据（data/eggs/egg_group.json）

### 顶层结构

| Key | 说明 |
|-----|------|
| group_names | 蛋组名称列表（按 ID 排序） |
| groups | 蛋组对象字典，key 为蛋组名称 |
| pet_egg_groups | pet_id → 所属蛋组列表映射 |

### 单个蛋组对象

| Key | 中文名 | 类型 | 示例 |
|-----|--------|------|------|
| id | 蛋组编号 | int | 1 |
| name | 蛋组名称 | string | "动物组" |
| count | 精灵数 | int | 78 |
| pets | 精灵列表 | list[{pet_id, name}] | `[{"pet_id":"002","name":"喵喵"}]` |

### 蛋组名称（共 15 种）

| ID | 名称 |
|----|------|
| 0 | 无法孵蛋 |
| 1 | 动物组 |
| 2 | 拟人组 |
| 3 | 巨灵组 |
| 4 | 魔力组 |
| 5 | 天空组 |
| 6 | 两栖组 |
| 7 | 植物组 |
| 8 | 大地组 |
| 9 | 妖精组 |
| 10 | 昆虫组 |
| 11 | 软体组 |
| 12 | 机械组 |
| 13 | 海洋组 |
| 14 | 龙组 |

### pet_egg_groups 结构

```json
{
  "002": ["动物组", "拟人组"],
  "005": ["巨灵组", "魔力组"],
  "001": ["无法孵蛋"]
}
```

注：一只精灵可属于 1-3 个蛋组；同 pet_id 的不同形态共享蛋组归属。

---

## 性格数据（data/natures/nature_list.json）

### 顶层结构

| Key | 说明 |
|-----|------|
| total | 性格总数（30） |
| natures | 性格对象数组 |

### 单个性格对象

| Key | 中文名 | 类型 | 示例 |
|-----|--------|------|------|
| id | 编号 | int | 1 |
| name | 性格名称 | string | "大胆" |
| stat_up | 增加属性 | string | "物攻" |
| stat_down | 减少属性 | string | "物防" |
| sub_natures | 子性格描述 | list[string] | `["喜欢独处","警惕性强","有些敏感","独立自主","似乎有点黏人"]` |

### 属性维度（共 6 种）

物攻、物防、魔攻、魔防、速度、生命

### 规则

- 共 30 种性格 = 6 种属性增加 × 5 种属性减少（排除增减相同）
- 每种性格有 5 个等概率子性格描述（纯文本，不影响数值）
- 增加属性和减少属性不会相同
