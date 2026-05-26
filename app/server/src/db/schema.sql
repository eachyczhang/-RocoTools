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
  is_final_form INTEGER DEFAULT 0,  -- 是否为最终形态（1=是，0=否）
  is_legendary  INTEGER DEFAULT 0,  -- 是否为传说精灵（1=是，0=否）
  is_season     INTEGER DEFAULT 0,  -- 是否为赛季精灵（1=是，0=否）
  is_pass       INTEGER DEFAULT 0,  -- 是否为通行证精灵（1=是，0=否）
  is_boss_form  INTEGER DEFAULT 0,  -- 是否为首领形态（1=是，0=否）
  has_boss_form INTEGER DEFAULT 0,  -- 是否拥有首领形态（1=是，0=否）
  manual_edit   INTEGER DEFAULT 0,
  FOREIGN KEY (element_id) REFERENCES elements(id),
  FOREIGN KEY (sub_element_id) REFERENCES elements(id)
);

-- 精灵-蛋组关联表（多对多）
CREATE TABLE IF NOT EXISTS pet_egg_groups (
  pet_uid       TEXT NOT NULL,
  egg_group_id  INTEGER NOT NULL,
  manual_edit   INTEGER DEFAULT 0,
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
  legend_pet  TEXT,                 -- 传说精灵 (JSON数组，如["pet_295","pet_152"]，兼容旧单值格式)
  season_pets TEXT,                 -- 赛季奇遇精灵 JSON array (8 uid，必有异色)
  shiny_pets  TEXT,                 -- 常态异色精灵 JSON array (8 uid)
  start_date  TEXT,                 -- 赛季开始日期
  end_date    TEXT,                 -- 赛季结束日期
  note        TEXT,                -- 备注
  announcement_url  TEXT,          -- 赛季详情公告链接（赛季页展示）
  announcement_text TEXT,          -- 赛季详情公告文案（赛季页展示）
  announcement_content TEXT,       -- 赛季详情公告正文（Markdown，赛季页展示）
  home_announcement_url  TEXT,     -- 首页公告链接
  home_announcement_text TEXT,     -- 首页公告文案（横幅显示）
  home_announcement_content TEXT   -- 首页公告正文（Markdown，首页弹窗展示）
);

-- 赛季活动日历
CREATE TABLE IF NOT EXISTS season_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id   TEXT NOT NULL,
  category    TEXT NOT NULL,        -- 'version' | 'mass_outbreak' | 'routine'
  name        TEXT NOT NULL,
  sub_type    TEXT,                 -- 常驻课题子类型: 'starlight' | 'destiny' | 'pika'
  pet_uid     TEXT,                 -- 大量出没关联精灵 uid
  pet_name    TEXT,                 -- 大量出没精灵名称（冗余，方便展示）
  pet_icon    TEXT,                 -- 大量出没精灵图标（冗余，方便展示）
  start_date  TEXT,                 -- 版本活动/大量出没单段起始
  end_date    TEXT,                 -- 版本活动/大量出没单段结束
  periods     TEXT,                 -- 常驻课题多段 JSON [{start, end}]
  image       TEXT,                 -- banner图片路径
  row_order   INTEGER DEFAULT 0,
  FOREIGN KEY (season_id) REFERENCES seasons(id)
);

-- 皮卡月刊（角色时装）- 主表
CREATE TABLE IF NOT EXISTS pika_monthlies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  period      TEXT NOT NULL,              -- 期数标识，如 202605
  name        TEXT NOT NULL,              -- 时装名称
  concept_male TEXT,                       -- 期数概念图（男）
  concept_female TEXT,                     -- 期数概念图（女）
  start_date  TEXT,                       -- 上架日期
  end_date    TEXT,                       -- 下架日期
  row_order   INTEGER DEFAULT 0           -- 排序
);

-- 皮卡月刊-精灵关联表（一期月刊可配置多个精灵）
CREATE TABLE IF NOT EXISTS pika_monthly_pets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  monthly_id  INTEGER NOT NULL,          -- 关联 pika_monthlies.id
  pet_uid     TEXT NOT NULL,              -- 精灵 uid
  pet_name    TEXT NOT NULL,              -- 精灵名称（冗余）
  pet_icon    TEXT,                       -- 精灵图标（冗余）
  locke_male  TEXT,                       -- 该精灵的男洛克时装图片
  locke_female TEXT,                      -- 该精灵的女洛克时装图片
  fate_nature TEXT,                       -- 命定花种固定性格名称
  sort_order  INTEGER DEFAULT 0,          -- 精灵排序
  FOREIGN KEY (monthly_id) REFERENCES pika_monthlies(id) ON DELETE CASCADE
);

-- 命定花种精灵技能配置（每只精灵最多4个技能，其中愿力冲击为固定技能）
CREATE TABLE IF NOT EXISTS fate_flower_skills (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  monthly_pet_id  INTEGER NOT NULL,       -- 关联 pika_monthly_pets.id
  skill_ref_uid   TEXT NOT NULL,          -- 关联 skills 表或 pet_skills 的 skill_ref_uid
  skill_name      TEXT,                   -- 技能名称（冗余）
  skill_source    TEXT NOT NULL,          -- 技能来源: 'skills' | 'bloodline_skills' | 'learnable_stones'
  sort_order      INTEGER DEFAULT 0,
  FOREIGN KEY (monthly_pet_id) REFERENCES pika_monthly_pets(id) ON DELETE CASCADE
);

-- 精灵图鉴课题
CREATE TABLE IF NOT EXISTS pet_achievements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_uid     TEXT NOT NULL,
  type        TEXT NOT NULL,        -- 'text' | 'skill'
  title       TEXT,                 -- 课题标题/描述
  skill_ref_uid TEXT,               -- 技能类：关联 skills 表
  skill_name  TEXT,                 -- 技能类：技能名称（冗余）
  use_count   INTEGER DEFAULT 0,    -- 技能类：需要使用次数
  reward_desc TEXT,                 -- 奖励描述（如"获得XX技能石"）
  sort_order  INTEGER DEFAULT 0,
  is_default  INTEGER DEFAULT 0,    -- 是否为系统默认课题（1=是，0=否）
  hidden      INTEGER DEFAULT 0,    -- 是否隐藏（1=隐藏，0=显示，仅对默认课题有效）
  FOREIGN KEY (pet_uid) REFERENCES pets(uid),
  FOREIGN KEY (skill_ref_uid) REFERENCES skills(uid)
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
CREATE INDEX IF NOT EXISTS idx_pet_achievements_pet ON pet_achievements(pet_uid);

-- 用户端导航标签配置
CREATE TABLE IF NOT EXISTS nav_tabs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tab_key     TEXT    NOT NULL UNIQUE,   -- 唯一标识，如 'home', 'season'
  label       TEXT    NOT NULL,            -- 显示名称
  route       TEXT,                      -- 路由路径（父级标签可为空）
  icon        TEXT,                       -- 图标（可选）
  parent_key  TEXT    DEFAULT NULL,       -- 父级 tab_key（NULL 为顶级）
  is_visible   INTEGER DEFAULT 1,         -- 是否显示（1显示/0隐藏）
  sort_order  INTEGER DEFAULT 0,         -- 排序权重（越大越靠前）
  created_at  TEXT    DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- 站点配置（key-value 开关/设置）
CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '0',
  description TEXT
);
