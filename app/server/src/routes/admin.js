const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Database = require('better-sqlite3');

// Optional sharp for image compression (thumbnail + WebP generation)
let sharp;
try { sharp = require('sharp'); } catch (e) { /* sharp not available */ }

const { authAdmin, signAdminToken } = require('../middleware/authAdmin');
const { clearCache } = require('../middleware/apiCache');
const { DB_PATH, DATA_DIR, getDb, getWriteDb } = require('../db/connection');

const PUBLIC_DIR = path.join(DATA_DIR, 'public');
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');

// 管理员密码（环境变量，缺失时警告）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) console.warn('[WARN] ADMIN_PASSWORD 未设置，使用默认密码（仅开发环境）');
const _password = ADMIN_PASSWORD || 'roco2026';

// ============================================================
// 安全工具函数
// ============================================================

/** 校验文件名/uid：只允许字母、数字、下划线、连字符、点 */
function isSafeFilename(name) {
  return /^[a-zA-Z0-9_\-.]+$/.test(name) && !name.includes('..');
}

// Auto-clear API cache after successful write operations (non-GET)
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

/** 校验路径是否在预期目录内（防止路径遍历） */
function isPathWithin(filepath, allowedDir) {
  const resolved = path.resolve(filepath);
  const dir = path.resolve(allowedDir);
  return resolved.startsWith(dir + path.sep) || resolved === dir;
}

/** 安全解析 JSON 文件（损坏时返回默认值） */
function safeReadJSON(filepath, fallback = []) {
  try {
    if (!fs.existsSync(filepath)) return fallback;
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (err) {
    console.error(`[ERROR] JSON 解析失败: ${filepath} — ${err.message}`);
    return fallback;
  }
}

// ============================================================
// 公开 API - 用户端导航标签（不需要鉴权）
// ============================================================
router.get('/nav-tabs/public', (req, res) => {
  const db = getDb();
  try {
    const tabs = db.prepare('SELECT id, tab_key, label, route, icon, parent_key, sort_order FROM nav_tabs WHERE is_visible = 1 ORDER BY sort_order DESC').all();
    res.json({ tabs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 以下接口都需要鉴权
// ============================================================

// ============================================================
// 登录
// ============================================================
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== _password) {
    return res.status(401).json({ error: '密码错误' });
  }
  const token = signAdminToken();
  res.json({ token, expiresIn: '4h' });
});

// 以下接口都需要鉴权
router.use(authAdmin);

// ============================================================
// 导航标签管理
// ============================================================
router.get('/nav-tabs', (req, res) => {
  const db = getDb();
  try {
    const tabs = db.prepare('SELECT * FROM nav_tabs ORDER BY sort_order DESC').all();
    res.json({ tabs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/nav-tabs/:id', (req, res) => {
  const { id } = req.params;
  const { tab_key, label, route, icon, parent_key, is_visible, sort_order } = req.body;
  const db = getWriteDb();
  try {
    const result = db.prepare(
      'UPDATE nav_tabs SET tab_key = ?, label = ?, route = ?, icon = ?, parent_key = ?, is_visible = ?, sort_order = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?'
    ).run(tab_key, label, route, icon || '', parent_key || '', is_visible ? 1 : 0, sort_order || 0, id);
    db.close();
    if (result.changes === 0) return res.status(404).json({ error: '记录不存在' });
    res.json({ success: true });
  } catch (err) {
    db.close();
    res.status(400).json({ error: err.message });
  }
});

router.post('/nav-tabs', (req, res) => {
  const { tab_key, label, route, icon, parent_key, is_visible, sort_order } = req.body;
  if (!tab_key || !label) {
    return res.status(400).json({ error: '缺少必填字段: tab_key, label' });
  }
  const db = getWriteDb();
  try {
    const result = db.prepare(
      'INSERT INTO nav_tabs (tab_key, label, route, icon, parent_key, is_visible, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(tab_key, label, route, icon || '', parent_key || '', is_visible ? 1 : 0, sort_order || 0);
    db.close();
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    db.close();
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `标签键「${tab_key}」已存在` });
    }
    res.status(400).json({ error: err.message });
  }
});

router.delete('/nav-tabs/:id', (req, res) => {
  const { id } = req.params;
  const db = getWriteDb();
  try {
    const result = db.prepare('DELETE FROM nav_tabs WHERE id = ?').run(id);
    db.close();
    if (result.changes === 0) return res.status(404).json({ error: '记录不存在' });
    res.json({ success: true });
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

/**
 * 将当前 nav_tabs 数据保存为默认配置（写入 nav_tabs_defaults.json）
 * 换电脑/新服务器运行 node init.js 时会自动读取此文件还原配置
 */
router.post('/nav-tabs/save-defaults', (req, res) => {
  const db = getDb();
  try {
    const tabs = db.prepare(
      'SELECT tab_key, label, route, icon, parent_key, is_visible, sort_order FROM nav_tabs ORDER BY sort_order DESC'
    ).all();

    const defaultsPath = path.join(__dirname, '../db/nav_tabs_defaults.json');
    // 写入格式化 JSON，方便 git diff 查看变更
    fs.writeFileSync(defaultsPath, JSON.stringify(tabs, null, 2), 'utf-8');

    res.json({ success: true, count: tabs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 通用 CRUD
// ============================================================

/**
 * 获取可编辑的表列表及字段
 */
const EDITABLE_TABLES = {
  pets: {
    label: '精灵',
    primaryKey: 'uid',
    editableFields: ['pet_id', 'name', 'element_id', 'sub_element_id', 'ability_name', 'ability_desc', 'hp', 'speed', 'atk', 'matk', 'def', 'mdef', 'total', 'version', 'image_url', 'thumb_url'],
  },
  skills: {
    label: '技能',
    primaryKey: 'uid',
    editableFields: ['name', 'element_id', 'category', 'cost', 'power', 'description', 'version', 'icon_url'],
  },
  elements: {
    label: '属性',
    primaryKey: 'id',
    editableFields: ['name', 'color', 'icon', 'immunity', 'strong_against', 'resisted_by', 'weak_to', 'resistant_to'],
  },
  natures: {
    label: '性格',
    primaryKey: 'id',
    editableFields: ['name', 'stat_up', 'stat_down'],
  },
  season_events: {
    label: '赛季活动',
    primaryKey: 'id',
    autoIncrement: true,
    editableFields: ['season_id', 'category', 'name', 'sub_type', 'pet_uid', 'pet_name', 'pet_icon', 'start_date', 'end_date', 'periods', 'image', 'row_order'],
  },
  pika_monthlies: {
    label: '皮卡月刊',
    primaryKey: 'id',
    autoIncrement: true,
    editableFields: ['period', 'name', 'pet_uid', 'pet_name', 'pet_icon', 'locke_male', 'locke_female', 'concept_male', 'concept_female', 'start_date', 'end_date'],
  },
  pet_details: {
    label: '精灵详情',
    primaryKey: 'pet_uid',
    editableFields: ['ability_icon', 'image_default', 'image_shiny', 'image_fruit', 'image_egg', 'height', 'weight', 'location'],
  },
  egg_groups: {
    label: '蛋组',
    primaryKey: 'id',
    editableFields: ['name'],
  },
  nav_tabs: {
    label: '用户端导航标签',
    primaryKey: 'id',
    autoIncrement: true,
    editableFields: ['tab_key', 'label', 'route', 'icon', 'parent_key', 'is_visible', 'sort_order'],
  },
  seasons: {
    label: '赛季',
    primaryKey: 'id',
    editableFields: ['name', 'is_current', 'image', 'pass_pets', 'legend_pet', 'season_pets', 'shiny_pets', 'start_date', 'end_date', 'note'],
  },
};

// GET /api/admin/tables — 获取可管理的表
router.get('/tables', (req, res) => {
  const tables = Object.entries(EDITABLE_TABLES).map(([key, val]) => ({
    key,
    label: val.label,
    primaryKey: val.primaryKey,
    editableFields: val.editableFields,
  }));
  res.json({ tables });
});

// GET /api/admin/data/:table — 分页查询表数据
router.get('/data/:table', (req, res) => {
  const { table } = req.params;
  const config = EDITABLE_TABLES[table];
  if (!config) return res.status(400).json({ error: '无效的表名' });

  const { page = 1, limit = 50, search = '' } = req.query;
  const safeLimit = Math.min(Math.max(1, +limit || 50), 500);
  const safePage = Math.max(1, +page || 1);
  const offset = (safePage - 1) * safeLimit;

  const db = getDb();

  let whereClause = '';
  const params = [];
  if (search) {
    // 搜索 name 或主键
    whereClause = `WHERE name LIKE ? OR ${config.primaryKey} LIKE ?`;
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM ${table} ${whereClause}`).get(...params).c;
  
  // 皮卡月刊按 period 降序排序（最新的在前面）
  let orderClause = '';
  if (table === 'pika_monthlies') {
    orderClause = 'ORDER BY period DESC';
  }
  
  const rows = db.prepare(`SELECT * FROM ${table} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`).all(...params, safeLimit, offset);
  
  // 对于 pika_monthlies，附带查询关联的 pika_monthly_pets
  if (table === 'pika_monthlies' && rows.length > 0) {
    for (const row of rows) {
      const pets = db.prepare(`SELECT pet_uid, pet_name, pet_icon, locke_male, locke_female, sort_order FROM pika_monthly_pets WHERE monthly_id = ? ORDER BY sort_order`).all(row.id);
      row.pets = JSON.stringify(pets);
    }
  }
  
  res.json({ total, page: safePage, limit: safeLimit, rows });
});

// GET /api/admin/data/:table/:id — 获取单条记录
router.get('/data/:table/:id', (req, res) => {
  const { table, id } = req.params;
  const config = EDITABLE_TABLES[table];
  if (!config) return res.status(400).json({ error: '无效的表名' });

  const db = getDb();
  const row = db.prepare(`SELECT * FROM ${table} WHERE ${config.primaryKey} = ?`).get(id);

  if (!row) return res.status(404).json({ error: '记录不存在' });
  res.json(row);
});

// PUT /api/admin/data/:table/:id — 更新记录
router.put('/data/:table/:id', (req, res) => {
  const { table, id } = req.params;
  const config = EDITABLE_TABLES[table];
  if (!config) return res.status(400).json({ error: '无效的表名' });

  const updates = {};
  for (const field of config.editableFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: '无有效字段' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);

  const db = getWriteDb();

  // 对支持 manual_edit 的表自动标记
  const manualEditTables = ['pets', 'skills', 'pet_details'];
  if (manualEditTables.includes(table)) {
    const fullSet = setClauses + ', manual_edit = 1';
    const result = db.prepare(`UPDATE ${table} SET ${fullSet} WHERE ${config.primaryKey} = ?`).run(...values, id);
    db.close();
    if (result.changes === 0) return res.status(404).json({ error: '记录不存在' });
    return res.json({ success: true, changes: result.changes });
  }

  const result = db.prepare(`UPDATE ${table} SET ${setClauses} WHERE ${config.primaryKey} = ?`).run(...values, id);
  db.close();

  if (result.changes === 0) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, changes: result.changes });
});

// POST /api/admin/data/:table — 新增记录
router.post('/data/:table', (req, res) => {
  const { table } = req.params;
  const config = EDITABLE_TABLES[table];
  if (!config) return res.status(400).json({ error: '无效的表名' });

  // 自增主键表不需要手动提供主键
  const autoIncrement = config.autoIncrement || false;
  let fields, values;

  if (autoIncrement) {
    fields = config.editableFields.filter(f => req.body[f] !== undefined);
    values = fields.map(f => req.body[f]);
  } else {
    fields = [config.primaryKey, ...config.editableFields].filter(f => req.body[f] !== undefined);
    values = fields.map(f => req.body[f]);
    if (!req.body[config.primaryKey]) {
      return res.status(400).json({ error: `缺少主键: ${config.primaryKey}` });
    }
  }

  const placeholders = fields.map(() => '?').join(', ');

  const db = getWriteDb();
  try {
    // 自增主键表不检查重复
    if (!autoIncrement) {
      const exists = db.prepare(`SELECT 1 FROM ${table} WHERE ${config.primaryKey} = ?`).get(req.body[config.primaryKey]);
      if (exists) {
        db.close();
        return res.status(409).json({ error: `${config.label}「${req.body[config.primaryKey]}」已存在，无法重复创建` });
      }
    }
    // skills 表额外检查名称唯一性
    if (table === 'skills' && req.body.name) {
      const nameExists = db.prepare('SELECT uid FROM skills WHERE name = ?').get(req.body.name.trim());
      if (nameExists) {
        db.close();
        return res.status(409).json({ error: `技能名称「${req.body.name}」已存在（${nameExists.uid}），不可重复创建` });
      }
    }
    const result = db.prepare(`INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`).run(...values);
    db.close();
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    db.close();
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// 皮卡月刊 ↔ 活动同步
// ============================================================

/**
 * 自动创建/更新月刊关联的常驻课题活动（命定花种 + 皮卡摄影委托）
 * 通过 name 匹配已有活动（前缀"[月刊]"），存在则更新，不存在则创建
 * 关联精灵：取月刊第一只精灵作为活动展示精灵，所有精灵名写入活动名称
 */
function syncMonthlyEvents(db, { period, name, start_date, end_date, monthlyId }) {
  // 获取当前赛季
  const currentSeason = db.prepare('SELECT id FROM seasons WHERE is_current = 1').get();
  if (!currentSeason) return;
  const seasonId = currentSeason.id;

  // 查询月刊关联的精灵
  const monthlyPets = db.prepare(
    'SELECT pet_uid, pet_name, pet_icon FROM pika_monthly_pets WHERE monthly_id = ? ORDER BY sort_order'
  ).all(monthlyId);

  // 如果 pet_name/pet_icon 为空，从 pets 表补充
  for (const mp of monthlyPets) {
    if (!mp.pet_name || !mp.pet_icon) {
      const pet = db.prepare('SELECT name, thumb_url, image_url FROM pets WHERE uid = ?').get(mp.pet_uid);
      if (pet) {
        if (!mp.pet_name) mp.pet_name = pet.name || '';
        if (!mp.pet_icon) mp.pet_icon = pet.thumb_url || pet.image_url || '';
      }
    }
  }

  // 取第一只精灵 uid，所有精灵名用顿号拼接，所有图标存 JSON 数组
  const firstPet = monthlyPets[0] || {};
  const petNames = monthlyPets.map(p => p.pet_name).filter(Boolean).join('、');
  const petIcons = JSON.stringify(monthlyPets.map(p => ({ uid: p.pet_uid, name: p.pet_name, icon: p.pet_icon })));

  const eventConfigs = [
    { sub_type: 'fate_flower', label: '命定花种' },
    { sub_type: 'pika_photo', label: '皮卡摄影委托' },
  ];

  for (const cfg of eventConfigs) {
    const eventName = `[月刊] ${cfg.label} - ${name}`;
    const periods = JSON.stringify([{ start: start_date, end: end_date }]);

    // 查找是否已存在同名活动
    const existing = db.prepare(
      'SELECT id FROM season_events WHERE season_id = ? AND category = ? AND sub_type = ? AND name = ?'
    ).get(seasonId, 'routine', cfg.sub_type, eventName);

    if (existing) {
      // 更新日期 + 精灵信息
      db.prepare(`UPDATE season_events SET periods = ?, start_date = ?, end_date = ?,
        pet_uid = ?, pet_name = ?, pet_icon = ? WHERE id = ?`)
        .run(periods, start_date, end_date,
          firstPet.pet_uid || '', petNames || '', petIcons,
          existing.id);
    } else {
      // 新建（含精灵信息）
      db.prepare(`
        INSERT INTO season_events (season_id, category, sub_type, name, start_date, end_date, periods, pet_uid, pet_name, pet_icon, row_order)
        VALUES (?, 'routine', ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(seasonId, cfg.sub_type, eventName, start_date, end_date, periods,
        firstPet.pet_uid || '', petNames || '', petIcons);
    }
  }
}

// ============================================================
// 皮卡月刊专用接口（处理关联表 pika_monthly_pets）
// ============================================================

// POST /api/admin/pika-monthlies — 新增皮卡月刊
router.post('/pika-monthlies', (req, res) => {
  const { period, name, start_date, end_date, row_order, concept_male, concept_female, pets } = req.body;
  
  if (!period || !name) {
    return res.status(400).json({ error: '缺少必填字段: period, name' });
  }
  
  const db = getWriteDb();
  try {
    // 插入主表
    const result = db.prepare(`
      INSERT INTO pika_monthlies (period, name, start_date, end_date, row_order, concept_male, concept_female)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(period, name, start_date || '', end_date || '', row_order || 0, concept_male || '', concept_female || '');
    
    const monthlyId = result.lastInsertRowid;
    
    // 解析 pets JSON 并插入关联表
    if (pets && typeof pets === 'string') {
      const petList = JSON.parse(pets);
      for (const pet of petList) {
        db.prepare(`
          INSERT INTO pika_monthly_pets (monthly_id, pet_uid, pet_name, pet_icon, locke_male, locke_female, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(monthlyId, pet.pet_uid, pet.pet_name || '', pet.pet_icon || '', pet.locke_male || '', pet.locke_female || '', pet.sort_order || 0);
      }
    }

    // 自动同步关联活动（命定花种 + 皮卡摄影委托）
    if (req.body.sync_events && start_date && end_date) {
      syncMonthlyEvents(db, { period, name, start_date, end_date, monthlyId });
    }
    
    db.close();
    res.json({ success: true, id: monthlyId });
  } catch (err) {
    db.close();
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/admin/pika-monthlies/:id — 更新皮卡月刊
router.put('/pika-monthlies/:id', (req, res) => {
  const { id } = req.params;
  const { period, name, start_date, end_date, row_order, concept_male, concept_female, pets } = req.body;
  
  const db = getWriteDb();
  try {
    // 更新主表
    const updateFields = [];
    const updateValues = [];
    if (period !== undefined) { updateFields.push('period = ?'); updateValues.push(period); }
    if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
    if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date || ''); }
    if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date || ''); }
    if (row_order !== undefined) { updateFields.push('row_order = ?'); updateValues.push(row_order); }
    if (concept_male !== undefined) { updateFields.push('concept_male = ?'); updateValues.push(concept_male || ''); }
    if (concept_female !== undefined) { updateFields.push('concept_female = ?'); updateValues.push(concept_female || ''); }
    
    if (updateFields.length > 0) {
      db.prepare(`UPDATE pika_monthlies SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues, id);
    }
    
    // 删除旧的关联数据，重新插入
    db.prepare(`DELETE FROM pika_monthly_pets WHERE monthly_id = ?`).run(id);
    
    if (pets && typeof pets === 'string') {
      const petList = JSON.parse(pets);
      for (const pet of petList) {
        db.prepare(`
          INSERT INTO pika_monthly_pets (monthly_id, pet_uid, pet_name, pet_icon, locke_male, locke_female, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, pet.pet_uid, pet.pet_name || '', pet.pet_icon || '', pet.locke_male || '', pet.locke_female || '', pet.sort_order || 0);
      }
    }

    // 自动同步关联活动
    if (req.body.sync_events) {
      const monthly = db.prepare('SELECT * FROM pika_monthlies WHERE id = ?').get(id);
      if (monthly && monthly.start_date && monthly.end_date) {
        syncMonthlyEvents(db, { period: monthly.period, name: monthly.name, start_date: monthly.start_date, end_date: monthly.end_date, monthlyId: +id });
      }
    }
    
    db.close();
    res.json({ success: true });
  } catch (err) {
    db.close();
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/pika-monthlies/:id — 删除皮卡月刊
router.delete('/pika-monthlies/:id', (req, res) => {
  const { id } = req.params;
  const db = getWriteDb();
  const result = db.prepare(`DELETE FROM pika_monthlies WHERE id = ?`).run(id);
  db.close();
  
  if (result.changes === 0) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, changes: result.changes });
});

// DELETE /api/admin/data/:table/:id — 删除记录
router.delete('/data/:table/:id', (req, res) => {
  const { table, id } = req.params;
  const config = EDITABLE_TABLES[table];
  if (!config) return res.status(400).json({ error: '无效的表名' });

  const db = getWriteDb();
  const result = db.prepare(`DELETE FROM ${table} WHERE ${config.primaryKey} = ?`).run(id);
  db.close();

  if (result.changes === 0) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, changes: result.changes });
});

// POST /api/admin/data/:table/batch — 批量更新
router.post('/data/:table/batch', (req, res) => {
  const { table } = req.params;
  const config = EDITABLE_TABLES[table];
  if (!config) return res.status(400).json({ error: '无效的表名' });

  const updates = req.body.updates || [];
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: '缺少 updates 数组' });
  }

  const db = getWriteDb();
  let totalChanges = 0;

  for (const item of updates) {
    const id = item[config.primaryKey];
    if (id == null) continue;

    const setClauses = [];
    const values = [];
    for (const field of config.editableFields) {
      if (item[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(item[field]);
      }
    }

    if (setClauses.length === 0) continue;

    const result = db.prepare(`UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${config.primaryKey} = ?`)
      .run(...values, id);
    totalChanges += result.changes;
  }

  db.close();
  res.json({ success: true, changes: totalChanges });
});

// ============================================================
// 图片上传
// ============================================================

// 图片类型 → 存储目录 + 命名规则
const IMAGE_TYPES = {
  pet_default: { dir: 'pets/default', suffix: '_default.png' },
  pet_shiny: { dir: 'pets/shiny', suffix: '_shiny.png' },
  pet_fruit: { dir: 'pets/fruit', suffix: '_fruit.png' },
  pet_egg: { dir: 'pets/egg', suffix: '_egg.png' },
  pet_thumb: { dir: 'pets/thumbs', suffix: '_default.webp' },
  pet_ability: { dir: 'pets/abilities', suffix: '_ability.png' },
  season_cover: { dir: 'uploads/seasons', suffix: '_cover.png', isUpload: true },
  event_image: { dir: 'uploads/events', suffix: '.png', isUpload: true },
  pika_concept: { dir: 'uploads/pika', suffix: '_concept.png', isUpload: true },
  pika_locke_male: { dir: 'uploads/pika', suffix: '_locke_male.png', isUpload: true },
  pika_locke_female: { dir: 'uploads/pika', suffix: '_locke_female.png', isUpload: true },
  pika_concept_male: { dir: 'uploads/pika', suffix: '_concept_male.png', isUpload: true },
  pika_concept_female: { dir: 'uploads/pika', suffix: '_concept_female.png', isUpload: true },
  skill_icon: { dir: 'skills/icons', suffix: '.png' },
  element_icon: { dir: 'elements/icons', suffix: '.png' },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpeg|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PNG/JPEG/WebP/GIF 格式'));
    }
  },
});

/** Multer error handling wrapper */
function handleUpload(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件过大，最大支持 20MB' });
        }
        return res.status(400).json({ error: err.message || '上传失败' });
      }
      next();
    });
  };
}

/**
 * POST /api/admin/upload
 * body: { type: 'pet_default', uid: 'pet_001' }
 * file: 图片文件
 */
router.post('/upload', handleUpload('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  const { type, uid } = req.body;
  if (!type || !uid) return res.status(400).json({ error: '缺少 type 或 uid' });
  if (!isSafeFilename(uid)) return res.status(400).json({ error: 'uid 包含非法字符' });

  const imageConfig = IMAGE_TYPES[type];
  if (!imageConfig) return res.status(400).json({ error: `无效的图片类型: ${type}` });

  // isUpload 类型存到 data/uploads/，否则存到 data/public/
  const baseDir = imageConfig.isUpload ? DATA_DIR : PUBLIC_DIR;
  const dir = path.join(baseDir, imageConfig.dir);
  fs.mkdirSync(dir, { recursive: true });

  // 文件名：uid + suffix（uid 已经包含了足够的区分信息）
  const filename = `${uid}${imageConfig.suffix}`;
  const filepath = path.join(dir, filename);
  const publicPath = imageConfig.isUpload
    ? `/uploads/${imageConfig.dir.replace('uploads/', '')}/${filename}`
    : `/public/${imageConfig.dir}/${filename}`;

  fs.writeFileSync(filepath, req.file.buffer);

  // Auto-generate WebP for all PNG image types that have WebP counterparts
  const WEBP_TYPES = ['pet_default', 'pet_shiny', 'pet_fruit', 'pet_egg', 'skill_icon', 'element_icon'];
  let thumbPath = null;
  if (sharp && WEBP_TYPES.includes(type) && filepath.endsWith('.png')) {
    try {
      // 1. WebP copy in same directory (same name, .webp extension)
      const webpFilepath = filepath.replace('.png', '.webp');
      await sharp(req.file.buffer).webp({ quality: 80 }).toFile(webpFilepath);

      // 2. Thumbnail (128px WebP) — only for pet_default
      if (type === 'pet_default') {
        const thumbDir = path.join(PUBLIC_DIR, 'pets', 'thumbs');
        fs.mkdirSync(thumbDir, { recursive: true });
        const thumbFilename = `${uid}_default.webp`;
        const thumbFilepath = path.join(thumbDir, thumbFilename);
        await sharp(req.file.buffer)
          .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 60 })
          .toFile(thumbFilepath);
        thumbPath = `/public/pets/thumbs/${thumbFilename}`;
      }
    } catch (imgErr) {
      console.error(`[WARN] Image compression failed for ${uid}:`, imgErr.message);
    }
  }

  // 更新数据库对应字段（仅对非 pika_locke/pika_concept 类型）
  // pika_locke/pika_concept 类型的图片路径存储在 JSON 中，不在这里更新数据库
  const fieldMap = {
    pet_default: { table: 'pet_details', field: 'image_default', key: 'pet_uid' },
    pet_shiny: { table: 'pet_details', field: 'image_shiny', key: 'pet_uid' },
    pet_fruit: { table: 'pet_details', field: 'image_fruit', key: 'pet_uid' },
    pet_egg: { table: 'pet_details', field: 'image_egg', key: 'pet_uid' },
    pet_thumb: { table: 'pets', field: 'thumb_url', key: 'uid' },
    pet_ability: { table: 'pet_details', field: 'ability_icon', key: 'pet_uid' },
    season_cover: { table: 'seasons', field: 'image', key: 'id' },
    skill_icon: { table: 'skills', field: 'icon_url', key: 'uid' },
    element_icon: { table: 'elements', field: 'icon', key: 'id' },
  };

  const mapping = fieldMap[type];
  if (mapping) {
    const db = getWriteDb();
    // For pet_details table, use UPSERT to auto-create record if not exists
    // But only if the pet exists in pets table (new pet may not be created yet)
    if (mapping.table === 'pet_details') {
      const petExists = db.prepare('SELECT 1 FROM pets WHERE uid = ?').get(uid);
      if (petExists) {
        db.prepare(`INSERT INTO pet_details (pet_uid, ${mapping.field}) VALUES (?, ?) ON CONFLICT(pet_uid) DO UPDATE SET ${mapping.field} = excluded.${mapping.field}`).run(uid, publicPath);
      }
      // If pet doesn't exist yet (new pet flow), skip DB write — file is already saved on disk
      // The path will be picked up when pet_details is created after pet creation
    } else {
      db.prepare(`UPDATE ${mapping.table} SET ${mapping.field} = ? WHERE ${mapping.key} = ?`).run(publicPath, uid);
    }
    // Auto-update thumb_url if thumbnail was generated
    if (thumbPath && type === 'pet_default') {
      db.prepare('UPDATE pets SET thumb_url = ? WHERE uid = ?').run(thumbPath, uid);
    }
    db.close();
  } else if (thumbPath && type === 'pet_default') {
    // No fieldMap mapping but we still need to save thumb_url
    const db = getWriteDb();
    db.prepare('UPDATE pets SET thumb_url = ? WHERE uid = ?').run(thumbPath, uid);
    db.close();
  }

  res.json({ success: true, path: publicPath, thumb_path: thumbPath || undefined });
});

// ============================================================
// 数据审查（冲突处理）
// ============================================================

const CONFLICTS_PATH = path.join(__dirname, '..', '..', 'data', 'pending_conflicts.json');

function loadConflicts() {
  return safeReadJSON(CONFLICTS_PATH, []);
}

function saveConflicts(conflicts) {
  if (conflicts.length === 0) {
    if (fs.existsSync(CONFLICTS_PATH)) fs.unlinkSync(CONFLICTS_PATH);
  } else {
    fs.writeFileSync(CONFLICTS_PATH, JSON.stringify(conflicts, null, 2), 'utf-8');
  }
}

// GET /api/admin/conflicts — 获取待审查冲突
router.get('/conflicts', (req, res) => {
  const conflicts = loadConflicts();
  // 附加当前数据库中的值用于对比
  if (conflicts.length === 0) return res.json({ conflicts: [] });

  const db = getDb();
  const result = conflicts.map(c => {
    const config = EDITABLE_TABLES[c.table];
    if (!config) return { ...c, currentData: null };
    const row = db.prepare(`SELECT * FROM ${c.table} WHERE ${config.primaryKey} = ?`).get(c.id);
    return { ...c, currentData: row || null };
  });
  res.json({ conflicts: result });
});

// POST /api/admin/conflicts/:index/accept — 接受爬虫数据（覆盖）
router.post('/conflicts/:index/accept', (req, res) => {
  const conflicts = loadConflicts();
  const idx = parseInt(req.params.index);
  if (idx < 0 || idx >= conflicts.length) return res.status(400).json({ error: '无效索引' });

  const c = conflicts[idx];
  const config = EDITABLE_TABLES[c.table];
  if (!config) return res.status(400).json({ error: '无效表' });

  // 用爬虫数据覆盖，同时清除 manual_edit
  const fields = Object.keys(c.newData);
  const setClauses = [...fields.map(k => `${k} = ?`), 'manual_edit = 0'].join(', ');
  const values = fields.map(k => c.newData[k]);

  const db = getWriteDb();
  db.prepare(`UPDATE ${c.table} SET ${setClauses} WHERE ${config.primaryKey} = ?`).run(...values, c.id);
  db.close();

  // 从冲突列表移除
  conflicts.splice(idx, 1);
  saveConflicts(conflicts);
  res.json({ success: true, remaining: conflicts.length });
});

// POST /api/admin/conflicts/:index/reject — 保留当前数据（忽略爬虫数据）
router.post('/conflicts/:index/reject', (req, res) => {
  const conflicts = loadConflicts();
  const idx = parseInt(req.params.index);
  if (idx < 0 || idx >= conflicts.length) return res.status(400).json({ error: '无效索引' });

  // 直接从列表移除（保持 manual_edit = 1）
  conflicts.splice(idx, 1);
  saveConflicts(conflicts);
  res.json({ success: true, remaining: conflicts.length });
});

// POST /api/admin/conflicts/accept-all — 全部接受覆盖
router.post('/conflicts/accept-all', (req, res) => {
  const conflicts = loadConflicts();
  if (conflicts.length === 0) return res.json({ success: true });

  const db = getWriteDb();
  for (const c of conflicts) {
    const config = EDITABLE_TABLES[c.table];
    if (!config) continue;
    const fields = Object.keys(c.newData);
    const setClauses = [...fields.map(k => `${k} = ?`), 'manual_edit = 0'].join(', ');
    const values = fields.map(k => c.newData[k]);
    db.prepare(`UPDATE ${c.table} SET ${setClauses} WHERE ${config.primaryKey} = ?`).run(...values, c.id);
  }
  db.close();
  saveConflicts([]);
  res.json({ success: true, message: `已覆盖 ${conflicts.length} 条` });
});

// POST /api/admin/conflicts/reject-all — 全部保留
router.post('/conflicts/reject-all', (req, res) => {
  saveConflicts([]);
  res.json({ success: true });
});

// ============================================================
// 数据库备份 / 恢复
// ============================================================

const SEASON_DIR = path.join(BACKUP_DIR, 'seasons');

// 备份元数据文件
function getMetaPath() { return path.join(BACKUP_DIR, '_meta.json'); }
function loadMeta() {
  return safeReadJSON(getMetaPath(), {});
}
function saveMeta(meta) {
  fs.writeFileSync(getMetaPath(), JSON.stringify(meta, null, 2), 'utf-8');
}

function listBackupFiles(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(dir, f));
      return { name: f, size: stat.size, time: stat.mtimeMs };
    })
    .sort((a, b) => b.time - a.time);
}

// GET /api/admin/backups — 列出所有备份（临时 + 赛季 + 快照）
router.get('/backups', (req, res) => {
  const meta = loadMeta();
  const tempBackups = listBackupFiles(BACKUP_DIR).map(b => ({
    ...b, type: 'temp', label: meta[b.name]?.label || null,
  }));
  const seasonBackups = listBackupFiles(SEASON_DIR).map(b => ({
    ...b, type: 'season',
    label: meta[b.name]?.label || b.name.replace('.db', ''),
    note: meta[b.name]?.note || null,
  }));
  const snapshotBackups = listBackupFiles(SNAPSHOT_DIR).map(b => ({
    ...b, type: 'snapshot',
    label: meta[b.name]?.label || b.name.replace('.db', ''),
    note: meta[b.name]?.note || null,
  }));
  res.json({ temp: tempBackups, seasons: seasonBackups, snapshots: snapshotBackups });
});

// POST /api/admin/backup — 创建临时备份
router.post('/backup', (req, res) => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const now = new Date();
  const name = `roco_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.db`;
  const backupPath = path.join(BACKUP_DIR, name);

  const db = new Database(DB_PATH, { readonly: true });
  db.backup(backupPath)
    .then(() => {
      db.close();
      const stat = fs.statSync(backupPath);
      res.json({ success: true, name, size: stat.size, type: 'temp' });
    })
    .catch(err => {
      db.close();
      res.status(500).json({ error: `备份失败: ${err.message}` });
    });
});

// POST /api/admin/backup/season — 创建赛季备份（需命名）
router.post('/backup/season', (req, res) => {
  const { label, note } = req.body;
  if (!label || !label.trim()) return res.status(400).json({ error: '请输入赛季名称（如 S1、S2）' });

  fs.mkdirSync(SEASON_DIR, { recursive: true });

  const safeName = label.trim().replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_');
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const name = `season_${safeName}_${ts}.db`;
  const backupPath = path.join(SEASON_DIR, name);

  if (fs.existsSync(backupPath)) {
    return res.status(400).json({ error: `备份 ${name} 已存在` });
  }

  const db = new Database(DB_PATH, { readonly: true });
  db.backup(backupPath)
    .then(() => {
      db.close();
      const stat = fs.statSync(backupPath);
      // 写入元数据
      const meta = loadMeta();
      meta[name] = { label: label.trim(), note: note || null, createdAt: now.toISOString(), protected: true };
      saveMeta(meta);
      res.json({ success: true, name, size: stat.size, type: 'season', label: label.trim() });
    })
    .catch(err => {
      db.close();
      res.status(500).json({ error: `备份失败: ${err.message}` });
    });
});

const SNAPSHOT_DIR = path.join(BACKUP_DIR, 'snapshots');

// POST /api/admin/restore — 恢复备份
router.post('/restore', (req, res) => {
  const { name, type, save_current, save_label } = req.body;
  if (!name) return res.status(400).json({ error: '缺少备份文件名' });
  if (!isSafeFilename(name)) return res.status(400).json({ error: '非法文件名' });

  const dir = type === 'season' ? SEASON_DIR : type === 'snapshot' ? SNAPSHOT_DIR : BACKUP_DIR;
  const backupPath = path.join(dir, name);
  if (!isPathWithin(backupPath, dir)) return res.status(400).json({ error: '路径非法' });
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: '备份文件不存在' });
  }

  let savedAs = null;

  // 恢复前保存当前数据
  if (save_current) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const safeName = save_label
      ? save_label.trim().replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_')
      : 'unnamed';
    const snapshotName = `snapshot_${safeName}_${ts}.db`;
    fs.copyFileSync(DB_PATH, path.join(SNAPSHOT_DIR, snapshotName));

    // 写入元数据
    const meta = loadMeta();
    meta[snapshotName] = {
      label: save_label?.trim() || '恢复前快照',
      note: `恢复到 ${name} 前保存`,
      createdAt: now.toISOString(),
      restoreTo: name,
    };
    saveMeta(meta);
    savedAs = snapshotName;
  }

  // 执行恢复
  try {
    fs.copyFileSync(backupPath, DB_PATH);
  } catch (err) {
    return res.status(500).json({ error: `恢复失败: ${err.message}` });
  }

  const msg = savedAs
    ? `已恢复到 ${name}，当前数据已保存为「${savedAs}」`
    : `已恢复到 ${name}`;
  res.json({ success: true, message: msg, savedAs });
});

// GET /api/admin/backups/snapshots — 列出恢复前快照
router.get('/backups/snapshots', (req, res) => {
  const meta = loadMeta();
  const snapshots = listBackupFiles(SNAPSHOT_DIR).map(b => ({
    ...b, type: 'snapshot',
    label: meta[b.name]?.label || b.name.replace('.db', ''),
    note: meta[b.name]?.note || null,
  }));
  res.json({ snapshots });
});

// DELETE /api/admin/backups/snapshots/:name — 删除快照
router.delete('/backups/snapshots/:name', (req, res) => {
  if (!isSafeFilename(req.params.name)) return res.status(400).json({ error: '非法文件名' });
  const snapshotPath = path.join(SNAPSHOT_DIR, req.params.name);
  if (!isPathWithin(snapshotPath, SNAPSHOT_DIR)) return res.status(400).json({ error: '路径非法' });
  if (!fs.existsSync(snapshotPath)) {
    return res.status(404).json({ error: '快照不存在' });
  }
  fs.unlinkSync(snapshotPath);
  const meta = loadMeta();
  delete meta[req.params.name];
  saveMeta(meta);
  res.json({ success: true });
});

// DELETE /api/admin/backups/:name — 删除临时备份
router.delete('/backups/:name', (req, res) => {
  if (!isSafeFilename(req.params.name)) return res.status(400).json({ error: '非法文件名' });
  const backupPath = path.join(BACKUP_DIR, req.params.name);
  if (!isPathWithin(backupPath, BACKUP_DIR)) return res.status(400).json({ error: '路径非法' });
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: '备份文件不存在' });
  }
  fs.unlinkSync(backupPath);
  res.json({ success: true });
});

// DELETE /api/admin/backups/season/:name — 删除赛季备份（需 confirm_token）
router.delete('/backups/season/:name', (req, res) => {
  const { name } = req.params;
  const { confirm_token } = req.body || {};
  const backupPath = path.join(SEASON_DIR, name);

  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: '备份文件不存在' });
  }

  const meta = loadMeta();
  const info = meta[name];

  // 赛季备份需要二次确认：第一次请求返回 confirm_token，第二次带 token 才真删
  if (!confirm_token) {
    const token = `delete_${name}_${Date.now()}`;
    // 临时存 token（5分钟有效）
    if (!meta._pending_deletes) meta._pending_deletes = {};
    meta._pending_deletes[token] = { name, expires: Date.now() + 5 * 60 * 1000 };
    saveMeta(meta);
    return res.json({
      confirm_required: true,
      confirm_token: token,
      message: `确定要删除赛季备份「${info?.label || name}」吗？此操作不可恢复。请使用返回的 confirm_token 再次请求确认删除。`,
    });
  }

  // 验证 confirm_token
  const pending = meta._pending_deletes?.[confirm_token];
  if (!pending || pending.name !== name || Date.now() > pending.expires) {
    return res.status(400).json({ error: '确认令牌无效或已过期，请重新操作' });
  }

  // 删除
  fs.unlinkSync(backupPath);
  delete meta[name];
  delete meta._pending_deletes[confirm_token];
  saveMeta(meta);
  res.json({ success: true, message: `赛季备份「${info?.label || name}」已删除` });
});

// ============================================================
// 素材库接口
// ============================================================
const LIBRARY_DIR = path.join(DATA_DIR, 'uploads', 'library');

/**
 * POST /api/admin/library/upload
 * 上传图片到素材库，支持 folder 参数指定子目录
 */
router.post('/library/upload', authAdmin, handleUpload('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  // Support optional sub-folder (sanitize to prevent path traversal)
  let folder = (req.body.folder || '').trim();
  if (folder) {
    // Normalize slashes, allow unicode letters/digits/underscore/hyphen/slash (supports Chinese)
    folder = folder.replace(/\\/g, '/').replace(/[^\p{L}\p{N}_\-\/]/gu, '_');
    // Remove leading/trailing slashes and prevent path traversal
    folder = folder.replace(/^\/+|\/+$/g, '').replace(/\.\./g, '');
  }

  const targetDir = folder ? path.join(LIBRARY_DIR, folder) : LIBRARY_DIR;
  fs.mkdirSync(targetDir, { recursive: true });

  // Verify target is within LIBRARY_DIR
  if (!isPathWithin(targetDir, LIBRARY_DIR)) {
    return res.status(400).json({ error: '目标目录非法' });
  }

  // 用时间戳+原始文件名避免冲突
  // multer uses latin1 for originalname; decode to utf8 for Chinese filenames
  const rawName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const ext = path.extname(rawName) || '.png';
  const base = path.basename(rawName, ext).replace(/[^\p{L}\p{N}_\-]/gu, '_');
  const filename = `${Date.now()}_${base}${ext}`;
  const filepath = path.join(targetDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);

  // Generate thumbnail for library browsing (200px WebP)
  let thumbRelPath = null;
  if (sharp && /\.(png|jpe?g|gif)$/i.test(ext)) {
    try {
      const thumbDir = folder ? path.join(LIBRARY_DIR, '.thumbs', folder) : path.join(LIBRARY_DIR, '.thumbs');
      fs.mkdirSync(thumbDir, { recursive: true });
      const thumbFilename = filename.replace(/\.[^.]+$/, '.webp');
      const thumbPath = path.join(thumbDir, thumbFilename);
      await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(thumbPath);
      thumbRelPath = folder
        ? `/uploads/library/.thumbs/${folder}/${thumbFilename}`
        : `/uploads/library/.thumbs/${thumbFilename}`;
    } catch (e) {
      console.error('[WARN] Library thumbnail generation failed:', e.message);
    }
  }

  const relativePath = folder ? `/uploads/library/${folder}/${filename}` : `/uploads/library/${filename}`;
  res.json({ success: true, path: relativePath, filename, thumb_path: thumbRelPath || relativePath });
});

/**
 * GET /api/admin/library
 * 获取素材库图片列表（递归扫描子目录）
 */
router.get('/library', authAdmin, (req, res) => {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  const files = [];

  function scanLibrary(dir, prefix) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.thumbs') continue; // Skip thumbs directory
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanLibrary(fullPath, prefix + entry.name + '/');
      } else if (/\.(png|jpe?g|webp|gif)$/i.test(entry.name)) {
        const stat = fs.statSync(fullPath);
        // Check if thumbnail exists
        const thumbFilename = entry.name.replace(/\.[^.]+$/, '.webp');
        const thumbDir = path.join(LIBRARY_DIR, '.thumbs', prefix);
        const thumbFullPath = path.join(thumbDir, thumbFilename);
        const thumbPath = fs.existsSync(thumbFullPath)
          ? `/uploads/library/.thumbs/${prefix}${thumbFilename}`
          : null;
        files.push({
          filename: prefix + entry.name,
          path: `/uploads/library/${prefix}${entry.name}`,
          thumb_path: thumbPath || `/uploads/library/${prefix}${entry.name}`,
          size: stat.size,
          mtime: stat.mtimeMs,
        });
      }
    }
  }

  scanLibrary(LIBRARY_DIR, '');
  files.sort((a, b) => b.mtime - a.mtime);
  res.json({ files });
});

/**
 * DELETE /api/admin/library/:filename
 * 删除素材库图片
 */
router.delete('/library/:filename', authAdmin, (req, res) => {
  const { filename } = req.params;
  if (!isSafeFilename(filename)) return res.status(400).json({ error: '非法文件名' });
  const filepath = path.join(LIBRARY_DIR, filename);
  if (!isPathWithin(filepath, LIBRARY_DIR)) return res.status(400).json({ error: '路径非法' });
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: '文件不存在' });
  fs.unlinkSync(filepath);

  // Also delete corresponding thumbnail
  const thumbFilename = filename.replace(/\.[^.]+$/, '.webp');
  const thumbPath = path.join(LIBRARY_DIR, '.thumbs', thumbFilename);
  if (fs.existsSync(thumbPath)) {
    try { fs.unlinkSync(thumbPath); } catch (e) { /* ignore */ }
  }

  res.json({ success: true });
});

// ============================================================
// 统一素材管理接口
// ============================================================

/**
 * GET /api/admin/media
 * List all images across all directories (library + uploads + public)
 */
router.get('/media', authAdmin, (req, res) => {
  const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
  const files = [];

  // Scan directories recursively
  function scanDir(baseDir, urlPrefix) {
    if (!fs.existsSync(baseDir)) return;
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(baseDir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, urlPrefix + '/' + entry.name);
      } else if (IMAGE_EXT.test(entry.name)) {
        try {
          const stat = fs.statSync(fullPath);
          files.push({
            filename: entry.name,
            fullPath: urlPrefix + '/' + entry.name,
            url: urlPrefix + '/' + entry.name,
            size: stat.size,
            mtime: stat.mtimeMs,
          });
        } catch (e) { /* skip unreadable files */ }
      }
    }
  }

  // Scan uploads directory (library, pika, seasons, events)
  const uploadsDir = path.join(DATA_DIR, 'uploads');
  scanDir(uploadsDir, '/uploads');

  // Scan public directory (pets, skills, elements)
  scanDir(PUBLIC_DIR, '/public');

  // Sort by modification time (newest first)
  files.sort((a, b) => b.mtime - a.mtime);

  res.json({ files, total: files.length });
});

/**
 * DELETE /api/admin/media
 * Delete an image by its full path (e.g. /uploads/library/xxx.png or /public/pets/default/xxx.png)
 * body: { path: '/uploads/library/xxx.png' }
 */
router.delete('/media', authAdmin, (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: '缺少 path 参数' });

  let absolutePath;
  if (filePath.startsWith('/uploads/')) {
    absolutePath = path.join(DATA_DIR, filePath);
  } else if (filePath.startsWith('/public/')) {
    absolutePath = path.join(DATA_DIR, filePath);
  } else {
    return res.status(400).json({ error: '不支持的路径前缀' });
  }

  // Security: ensure path is within DATA_DIR
  const resolved = path.resolve(absolutePath);
  const dataResolved = path.resolve(DATA_DIR);
  if (!resolved.startsWith(dataResolved)) {
    return res.status(400).json({ error: '路径非法' });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  fs.unlinkSync(resolved);
  res.json({ success: true });
});

/**
 * POST /api/admin/media/copy-to-business
 * Copy a library image to a business directory with proper naming
 * body: { source: '/uploads/library/xxx.png', type: 'pika_concept_male', uid: '202605' }
 */
router.post('/media/copy-to-business', authAdmin, async (req, res) => {
  const { source, type, uid } = req.body;
  if (!source || !type || !uid) return res.status(400).json({ error: '缺少 source/type/uid 参数' });
  if (!isSafeFilename(uid)) return res.status(400).json({ error: 'uid 包含非法字符' });

  const imageConfig = IMAGE_TYPES[type];
  if (!imageConfig) return res.status(400).json({ error: '无效的图片类型: ' + type });

  // Resolve source path
  let sourcePath;
  if (source.startsWith('/uploads/')) {
    sourcePath = path.join(DATA_DIR, source);
  } else if (source.startsWith('/public/')) {
    sourcePath = path.join(DATA_DIR, source);
  } else {
    return res.status(400).json({ error: '不支持的源路径' });
  }

  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: '源文件不存在' });
  }

  // Determine destination
  const baseDir = imageConfig.isUpload ? DATA_DIR : PUBLIC_DIR;
  const dir = path.join(baseDir, imageConfig.dir);
  fs.mkdirSync(dir, { recursive: true });

  const filename = uid + imageConfig.suffix;
  const destPath = path.join(dir, filename);
  const publicPath = imageConfig.isUpload
    ? '/uploads/' + imageConfig.dir.replace('uploads/', '') + '/' + filename
    : '/public/' + imageConfig.dir + '/' + filename;

  // Copy file
  fs.copyFileSync(sourcePath, destPath);

  // Auto-generate WebP for all PNG image types that have WebP counterparts
  const WEBP_TYPES = ['pet_default', 'pet_shiny', 'pet_fruit', 'pet_egg', 'skill_icon', 'element_icon'];
  let thumbPath = null;
  if (sharp && WEBP_TYPES.includes(type) && destPath.endsWith('.png')) {
    try {
      const imgBuffer = fs.readFileSync(destPath);
      // 1. WebP copy in same directory
      const webpPath = destPath.replace('.png', '.webp');
      await sharp(imgBuffer).webp({ quality: 80 }).toFile(webpPath);

      // 2. Thumbnail (128px WebP) — only for pet_default
      if (type === 'pet_default') {
        const thumbDir = path.join(PUBLIC_DIR, 'pets', 'thumbs');
        fs.mkdirSync(thumbDir, { recursive: true });
        const thumbFilename = uid + '_default.webp';
        const thumbFilepath = path.join(thumbDir, thumbFilename);
        await sharp(imgBuffer)
          .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 60 })
          .toFile(thumbFilepath);
        thumbPath = '/public/pets/thumbs/' + thumbFilename;
      }
    } catch (imgErr) {
      console.error('[WARN] Image compression failed for ' + uid + ':', imgErr.message);
    }
  }

  // Update database if applicable
  const fieldMap = {
    pet_default: { table: 'pet_details', field: 'image_default', key: 'pet_uid' },
    pet_shiny: { table: 'pet_details', field: 'image_shiny', key: 'pet_uid' },
    pet_fruit: { table: 'pet_details', field: 'image_fruit', key: 'pet_uid' },
    pet_egg: { table: 'pet_details', field: 'image_egg', key: 'pet_uid' },
    pet_thumb: { table: 'pets', field: 'thumb_url', key: 'uid' },
    pet_ability: { table: 'pet_details', field: 'ability_icon', key: 'pet_uid' },
    season_cover: { table: 'seasons', field: 'image', key: 'id' },
    skill_icon: { table: 'skills', field: 'icon_url', key: 'uid' },
    element_icon: { table: 'elements', field: 'icon', key: 'id' },
  };

  const mapping = fieldMap[type];
  if (mapping) {
    const db = getWriteDb();
    // For pet_details table, use UPSERT to auto-create record if not exists
    // But only if the pet exists in pets table (foreign key constraint)
    if (mapping.table === 'pet_details') {
      const petExists = db.prepare('SELECT 1 FROM pets WHERE uid = ?').get(uid);
      if (petExists) {
        db.prepare('INSERT INTO pet_details (pet_uid, ' + mapping.field + ') VALUES (?, ?) ON CONFLICT(pet_uid) DO UPDATE SET ' + mapping.field + ' = excluded.' + mapping.field).run(uid, publicPath);
      }
      // If pet doesn't exist yet, skip DB write — file is already copied on disk
    } else {
      db.prepare('UPDATE ' + mapping.table + ' SET ' + mapping.field + ' = ? WHERE ' + mapping.key + ' = ?').run(publicPath, uid);
    }
    // Auto-update thumb_url if thumbnail was generated
    if (thumbPath && type === 'pet_default') {
      db.prepare('UPDATE pets SET thumb_url = ? WHERE uid = ?').run(thumbPath, uid);
    }
    db.close();
  } else if (thumbPath && type === 'pet_default') {
    // No fieldMap mapping but we still need to save thumb_url
    const db = getWriteDb();
    db.prepare('UPDATE pets SET thumb_url = ? WHERE uid = ?').run(thumbPath, uid);
    db.close();
  }

  res.json({ success: true, path: publicPath, thumb_path: thumbPath || undefined });
});

// ============================================================
// 数据库导出 Excel
// ============================================================
router.get('/export-excel', (req, res) => {
  const XLSX = require('xlsx');
  const db = getDb();

  try {
    const wb = XLSX.utils.book_new();

    // Column name → Chinese label mapping
    const FIELD_LABELS = {
      id: 'ID',
      uid: 'UID',
      key: '标识键',
      name: '名称',
      color: '颜色',
      immunity: '免疫效果',
      strong_against: '克制属性',
      resisted_by: '被抵抗属性',
      weak_to: '弱点属性',
      resistant_to: '抗性属性',
      element_id: '属性ID',
      sub_element_id: '副属性ID',
      category: '分类',
      cost: '能量消耗',
      power: '威力',
      description: '描述',
      version: '版本',
      manual_edit: '手动编辑',
      pet_id: '图鉴编号',
      ability_name: '特性名称',
      ability_desc: '特性描述',
      hp: '生命',
      speed: '速度',
      atk: '物攻',
      matk: '魔攻',
      def: '物防',
      mdef: '魔防',
      total: '总种族值',
      pet_uid: '精灵UID',
      egg_group_id: '蛋组ID',
      egg_group_name: '蛋组名称',
      height: '身高',
      weight: '体重',
      location: '分布地点',
      evolution_chain: '进化链',
      restrain_strong: '克制',
      restrain_weak: '被克制',
      restrain_resist: '抵抗',
      restrain_resisted: '被抵抗',
      skill_type: '技能类型',
      level: '习得等级',
      element: '属性',
      type: '类别',
      skill_ref_uid: '关联技能UID',
      sort_order: '排序',
      stat_up: '增加属性',
      stat_down: '减少属性',
      sub_natures: '子性格',
      is_current: '当前赛季',
      pass_pets: '通行证精灵',
      legend_pet: '传说精灵',
      season_pets: '赛季限定精灵',
      shiny_pets: '异色精灵',
      start_date: '开始日期',
      end_date: '结束日期',
      note: '备注',
      season_id: '赛季ID',
      sub_type: '子类型',
      pet_name: '精灵名称',
      periods: '时间段',
      row_order: '排序',
      period: '期数',
      monthly_id: '月刊ID',
      tab_key: '标签键',
      label: '显示名称',
      route: '路由路径',
      parent_key: '父级键',
      is_visible: '是否显示',
      created_at: '创建时间',
      updated_at: '更新时间',
    };

    // Format header: "中文名(key)" or just "key" if no label
    function formatHeader(key) {
      const label = FIELD_LABELS[key];
      return label ? `${label}(${key})` : key;
    }

    // Parse JSON array to readable comma-separated string
    function formatJsonArray(val) {
      if (val === null || val === undefined || val === '') return '';
      try {
        const arr = JSON.parse(val);
        if (!Array.isArray(arr)) return val;
        // Handle array of objects (e.g. evolution_chain: [{name, evolve_level}])
        return arr.map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            // evolution_chain: [{name, evolve_level}]
            if (item.name && 'evolve_level' in item) {
              return item.evolve_level ? `${item.name}(Lv${item.evolve_level})` : item.name;
            }
            // periods: [{start, end}]
            if (item.start && item.end) {
              return `${item.start}~${item.end}`;
            }
            // Generic: {id, key, name} → name
            if (item.name) return item.name;
            return JSON.stringify(item);
          }
          return String(item);
        }).join('、');
      } catch {
        return val;
      }
    }

    // JSON array fields that should be expanded
    const JSON_FIELDS = new Set([
      'strong_against', 'resisted_by', 'weak_to', 'resistant_to',
      'evolution_chain', 'restrain_strong', 'restrain_weak', 'restrain_resist', 'restrain_resisted',
      'sub_natures', 'pass_pets', 'season_pets', 'shiny_pets', 'periods',
    ]);

    // Build egg_group id→name map for pet_egg_groups enrichment
    const eggGroupMap = {};
    db.prepare('SELECT id, name FROM egg_groups').all().forEach(g => { eggGroupMap[g.id] = g.name; });

    // Build element id→name map
    const elementMap = {};
    db.prepare('SELECT id, name FROM elements').all().forEach(e => { elementMap[e.id] = e.name; });

    const exportConfig = [
      { table: 'elements', label: '属性', exclude: ['icon'] },
      { table: 'skills', label: '技能', exclude: ['icon_url'] },
      { table: 'egg_groups', label: '蛋组', exclude: [] },
      { table: 'pets', label: '精灵', exclude: ['image_url', 'thumb_url'] },
      { table: 'pet_details', label: '精灵详情', exclude: ['ability_icon', 'image_default', 'image_shiny', 'image_fruit', 'image_egg'] },
      { table: 'pet_skills', label: '精灵技能', exclude: [] },
      { table: 'pet_egg_groups', label: '精灵蛋组关联', exclude: [] },
      { table: 'natures', label: '性格', exclude: [] },
      { table: 'seasons', label: '赛季', exclude: ['image'] },
      { table: 'season_events', label: '赛季活动', exclude: ['image', 'pet_icon'] },
      { table: 'pika_monthlies', label: '皮卡月刊', exclude: ['concept_male', 'concept_female'] },
      { table: 'pika_monthly_pets', label: '月刊精灵', exclude: ['pet_icon', 'locke_male', 'locke_female'] },
      { table: 'variants_map', label: '多形态映射', exclude: [] },
      { table: 'nav_tabs', label: '导航标签', exclude: ['icon'] },
    ];

    for (const cfg of exportConfig) {
      let rows = db.prepare(`SELECT * FROM ${cfg.table}`).all();

      // Enrich pet_egg_groups with group name
      if (cfg.table === 'pet_egg_groups') {
        rows = rows.map(r => ({
          ...r,
          egg_group_name: eggGroupMap[r.egg_group_id] || '',
        }));
      }

      // Get column order
      let colKeys;
      if (rows.length === 0) {
        const cols = db.prepare(`PRAGMA table_info(${cfg.table})`).all();
        colKeys = cols.map(c => c.name).filter(n => !cfg.exclude.includes(n));
        if (cfg.table === 'pet_egg_groups') colKeys.push('egg_group_name');
      } else {
        colKeys = Object.keys(rows[0]).filter(n => !cfg.exclude.includes(n));
      }

      // Build header row with Chinese labels
      const headers = colKeys.map(formatHeader);

      // Build data rows with JSON formatting
      const dataRows = rows.map(row => {
        return colKeys.map(key => {
          let val = row[key];
          if (val === null || val === undefined) return '';
          // Format JSON array fields
          if (JSON_FIELDS.has(key) && typeof val === 'string') {
            return formatJsonArray(val);
          }
          // Translate element_id / sub_element_id to name for readability
          if ((key === 'element_id' || key === 'sub_element_id') && val && elementMap[val]) {
            return `${elementMap[val]}(${val})`;
          }
          return val;
        });
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      // Auto-adjust column widths
      const colWidths = colKeys.map((key, i) => {
        let maxLen = headers[i].length;
        dataRows.forEach(row => {
          const cellLen = String(row[i]).length;
          if (cellLen > maxLen) maxLen = cellLen;
        });
        return { wch: Math.min(maxLen + 2, 50) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, cfg.label);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `roco_data_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) {
    console.error('[Export Excel]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/abilities
 * Aggregate abilities from pets table for autocomplete
 * Returns: [{ name, description, icon, pet_count }]
 */
router.get('/abilities', authAdmin, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        p.ability_name AS name,
        p.ability_desc AS description,
        pd.ability_icon AS icon,
        COUNT(*) AS pet_count
      FROM pets p
      LEFT JOIN pet_details pd ON pd.pet_uid = p.uid
      WHERE p.ability_name IS NOT NULL AND p.ability_name != ''
      GROUP BY p.ability_name
      ORDER BY pet_count DESC, p.ability_name ASC
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('[Abilities]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 精灵技能管理（pet_skills）
// ============================================================

/**
 * GET /api/admin/pet-skills/:uid
 * Get all skills for a pet (grouped by type)
 */
router.get('/pet-skills/:uid', authAdmin, (req, res) => {
  const { uid } = req.params;
  try {
    const db = getDb();
    const skills = db.prepare(`
      SELECT ps.*, sk.icon_url as skill_icon
      FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
      WHERE ps.pet_uid = ? ORDER BY ps.id
    `).all(uid);

    const result = {
      skills: skills.filter(s => s.skill_type === 'skills'),
      bloodline_skills: skills.filter(s => s.skill_type === 'bloodline_skills'),
      learnable_stones: skills.filter(s => s.skill_type === 'learnable_stones'),
    };
    res.json(result);
  } catch (err) {
    console.error('[PetSkills GET]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/pet-skills/:uid
 * Save all skills for a pet (delete-then-insert strategy)
 * Body: { skills: [...], bloodline_skills: [...], learnable_stones: [...] }
 * Each skill item: { level, name, element, type, cost, power, description, skill_ref_uid }
 */
router.put('/pet-skills/:uid', authAdmin, (req, res) => {
  const { uid } = req.params;
  const { skills = [], bloodline_skills = [], learnable_stones = [] } = req.body;

  const db = getWriteDb();
  try {
    const deleteAll = db.prepare('DELETE FROM pet_skills WHERE pet_uid = ?');
    const insert = db.prepare(`
      INSERT INTO pet_skills (pet_uid, skill_type, level, name, element, type, cost, power, description, skill_ref_uid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      deleteAll.run(uid);

      for (const s of skills) {
        insert.run(uid, 'skills', s.level || null, s.name || null, s.element || null, s.type || null, s.cost || 0, s.power || 0, s.description || null, s.skill_ref_uid || null);
      }
      for (const s of bloodline_skills) {
        insert.run(uid, 'bloodline_skills', s.level || null, s.name || null, s.element || null, s.type || null, s.cost || 0, s.power || 0, s.description || null, s.skill_ref_uid || null);
      }
      for (const s of learnable_stones) {
        insert.run(uid, 'learnable_stones', s.level || null, s.name || null, s.element || null, s.type || null, s.cost || 0, s.power || 0, s.description || null, s.skill_ref_uid || null);
      }
    });

    tx();
    db.close();

    const total = skills.length + bloodline_skills.length + learnable_stones.length;
    res.json({ success: true, total });
  } catch (err) {
    db.close();
    console.error('[PetSkills PUT]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/skills-search?q=xxx
 * Quick search skills by name (for autocomplete in pet skill editor)
 */
router.get('/skills-search', authAdmin, (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    const db = getDb();
    const results = db.prepare(`
      SELECT s.uid, s.name, s.category, s.cost, s.power, s.description,
        e.name as element_name, e.color as element_color, e.icon as element_icon
      FROM skills s LEFT JOIN elements e ON s.element_id = e.id
      WHERE s.name LIKE ? ORDER BY s.name LIMIT 20
    `).all(`%${q}%`);
    res.json(results);
  } catch (err) {
    console.error('[SkillsSearch]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/skills-next-uid
 * Get the next available skill UID (auto-increment, no duplicates)
 */
router.get('/skills-next-uid', authAdmin, (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT MAX(CAST(SUBSTR(uid, 7) AS INTEGER)) as max_num FROM skills WHERE uid LIKE 'skill_%'
    `).get();
    const nextNum = (row?.max_num || 0) + 1;
    res.json({ uid: `skill_${nextNum}` });
  } catch (err) {
    console.error('[SkillsNextUid]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

