# 数据字段对照表

## 精灵列表（data/pets/pet_list.json）

扁平结构，每条记录对应一个形态。同 pet_id 多条记录表示有特殊形态。

| Key | 中文名 | 类型 | 示例 |
|-----|--------|------|------|
| pet_id | 图鉴编号 | string | "001" |
| name | 精灵名称 | string | "迪莫" |
| element | 属性 | string | "光" |
| ability_name | 特性名称 | string | "最好的伙伴" |
| ability_desc | 特性描述 | string | "造成克制伤害后，获得攻防速+20%..." |
| hp | 生命（种族值） | int | 120 |
| speed | 速度（种族值） | int | 92 |
| atk | 物攻（种族值） | int | 80 |
| matk | 魔攻（种族值） | int | 80 |
| def | 物防（种族值） | int | 105 |
| mdef | 魔防（种族值） | int | 105 |
| total | 总种族值 | int | 582 |
| version | 更新版本 | string | "0.6" |
| image_url | 精灵立绘图片 | string | "https://..." |

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

### variants_map 示例

```json
{
  "011": ["pet_011_1", "pet_011_2", "pet_011_3", ...],
  "001": ["pet_001_1", "pet_001_2"]
}
```

仅在 variants_map 中出现的 pet_id 才有多形态，不出现的都是单形态。

### 单个精灵对象

```json
{
  "uid": "pet_002",
  "pet_id": "002",
  "name": "喵喵",
  "element": "草",
  "ability_name": "氧循环",
  "ability_desc": "使用草系技能后，回复10%生命。",
  "hp": 65, "speed": 33, "atk": 66, "matk": 66, "def": 49, "mdef": 91,
  "total": 370,
  "version": "0.6",
  "image_url": "...",
  "detail": { ... }
}
```

### detail 字段（详情页数据）

| Key | 中文名 | 类型 |
|-----|--------|------|
| element | 属性 | string |
| image_url | 高清立绘 | string |
| image_shiny_url | 异色立绘 | string |
| height | 身高 | string |
| weight | 体重 | string |
| location | 精灵分布 | string |
| evolution_chain | 进化链 | list[string] |
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
| immunity | 免疫效果 | string/null | "寄生" |
| strong_against | 克制 | list[{id,key,name}] | 攻击该属性伤害×2 |
| resisted_by | 被抵抗 | list[{id,key,name}] | 攻击该属性伤害×0.5 |
| weak_to | 弱点 | list[{id,key,name}] | 受到该属性伤害×2 |
| resistant_to | 抗性 | list[{id,key,name}] | 受到该属性伤害×0.5 |
