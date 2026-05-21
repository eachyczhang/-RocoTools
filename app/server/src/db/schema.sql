-- 属性表
CREATE TABLE IF NOT EXISTS elements (
  id          INTEGER PRIMARY KEY,
  key         TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  color       TEXT,
  icon        TEXT,
  immunity    TEXT,
  strong_against  TEXT, -- JSON array
  resisted_by     TEXT, -- JSON array
  weak_to         TEXT, -- JSON array
  resistant_to    TEXT  -- JSON array
);

-- 属性倍率
CREATE TABLE IF NOT EXISTS element_multipliers (
  key   TEXT PRIMARY KEY,
  value REAL NOT NULL
);

-- 技能表
CREATE TABLE IF NOT EXISTS skills (
  uid         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  element_id  INTEGER,
  category    TEXT,
  cost        INTEGER DEFAULT 0,
  power       INTEGER DEFAULT 0,
  description TEXT,
  version     TEXT,
  icon_url    TEXT,
  manual_edit INTEGER DEFAULT 0,
  FOREIGN KEY (element_id) REFERENCES elements(id)
);

-- 蛋组表
CREATE TABLE IF NOT EXISTS egg_groups (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

-- 精灵列表
CREATE TABLE IF NOT EXISTS pets (
  uid           TEXT PRIMARY KEY,
  pet_id        TEXT NOT NULL,
  name          TEXT NOT NULL,
  element_id    INTEGER,
  sub_element_id INTEGER,
  ability_name  TEXT,
  ability_desc  TEXT,
  hp            INTEGER DEFAULT 0,
  speed         INTEGER DEFAULT 0,
  atk           INTEGER DEFAULT 0,
  matk          INTEGER DEFAULT 0,
  def           INTEGER DEFAULT 0,
  mdef          INTEGER DEFAULT 0,
  total         INTEGER DEFAULT 0,
  version       TEXT,
  image_url     TEXT,
  thumb_url     TEXT,
  manual_edit   INTEGER DEFAULT 0,
  FOREIGN KEY (element_id) REFERENCES elements(id),
  FOREIGN KEY (sub_element_id) REFERENCES elements(id)
);

-- 精灵-蛋组关联表（多对多）
CREATE TABLE IF NOT EXISTS pet_egg_groups (
  pet_uid       TEXT NOT NULL,
  egg_group_id  INTEGER NOT NULL,
  PRIMARY KEY (pet_uid, egg_group_id),
  FOREIGN KEY (pet_uid) REFERENCES pets(uid),
  FOREIGN KEY (egg_group_id) REFERENCES egg_groups(id)
);

-- 精灵详情
CREATE TABLE IF NOT EXISTS pet_details (
  pet_uid         TEXT PRIMARY KEY,
  element_id      INTEGER,
  ability_icon    TEXT,
  image_default   TEXT,
  image_shiny     TEXT,
  image_fruit     TEXT,
  image_egg       TEXT,
  height          TEXT,
  weight          TEXT,
  location        TEXT,
  evolution_chain  TEXT, -- JSON array
  restrain_strong  TEXT, -- JSON array
  restrain_weak    TEXT, -- JSON array
  restrain_resist  TEXT, -- JSON array
  restrain_resisted TEXT, -- JSON array
  manual_edit     INTEGER DEFAULT 0,
  FOREIGN KEY (pet_uid) REFERENCES pets(uid),
  FOREIGN KEY (element_id) REFERENCES elements(id)
);

-- 精灵技能（精灵详情中的技能列表）
CREATE TABLE IF NOT EXISTS pet_skills (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_uid     TEXT NOT NULL,
  skill_type  TEXT NOT NULL, -- 'skills' | 'bloodline_skills' | 'learnable_stones'
  level       TEXT,
  name        TEXT,
  element     TEXT,
  type        TEXT,
  cost        INTEGER DEFAULT 0,
  power       INTEGER DEFAULT 0,
  description TEXT,
  skill_ref_uid TEXT, -- 关联 skills 表
  FOREIGN KEY (pet_uid) REFERENCES pets(uid),
  FOREIGN KEY (skill_ref_uid) REFERENCES skills(uid)
);

-- 多形态映射
CREATE TABLE IF NOT EXISTS variants_map (
  pet_id  TEXT NOT NULL,
  pet_uid TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (pet_id, pet_uid),
  FOREIGN KEY (pet_uid) REFERENCES pets(uid)
);

-- 性格表
CREATE TABLE IF NOT EXISTS natures (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  stat_up     TEXT NOT NULL,
  stat_down   TEXT NOT NULL,
  sub_natures TEXT  -- JSON array
);

-- 赛季表
CREATE TABLE IF NOT EXISTS seasons (
  id          TEXT PRIMARY KEY,     -- 赛季标识（如 S1、S2）
  name        TEXT NOT NULL,        -- 赛季名称
  is_current  INTEGER DEFAULT 0,    -- 是否为当前赛季
  image       TEXT,                 -- 赛季封面图
  pass_pets   TEXT,                 -- 通行证精灵 JSON array (2 uid)
  legend_pet  TEXT,                 -- 传说精灵 (1 uid，赛季限定)
  season_pets TEXT,                 -- 赛季限定精灵 JSON array (8 uid，必有异色)
  shiny_pets  TEXT,                 -- 常态异色精灵 JSON array (8 uid)
  start_date  TEXT,                 -- 赛季开始日期
  end_date    TEXT,                 -- 赛季结束日期
  note        TEXT                  -- 备注
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pets_pet_id ON pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_element ON pets(element_id);
CREATE INDEX IF NOT EXISTS idx_skills_element ON skills(element_id);
CREATE INDEX IF NOT EXISTS idx_pet_skills_pet ON pet_skills(pet_uid);
CREATE INDEX IF NOT EXISTS idx_pet_skills_type ON pet_skills(skill_type);
CREATE INDEX IF NOT EXISTS idx_pet_egg_groups_pet ON pet_egg_groups(pet_uid);
CREATE INDEX IF NOT EXISTS idx_pet_egg_groups_group ON pet_egg_groups(egg_group_id);
CREATE INDEX IF NOT EXISTS idx_variants_map_pet_id ON variants_map(pet_id);
