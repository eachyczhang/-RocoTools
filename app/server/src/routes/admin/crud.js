const express = require('express');
const router = express.Router();
const { getDb, getWriteDb } = require('../../db/connection');
const { EDITABLE_TABLES, syncVariantsMap, syncEvolutionChain } = require('./utils');

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

    // Auto-sync variants_map when updating a pet (pet_id might change)
    if (table === 'pets') {
      const pet = db.prepare('SELECT pet_id FROM pets WHERE uid = ?').get(id);
      if (pet) syncVariantsMap(db, pet.pet_id);
      if (updates.pet_id && updates.pet_id !== pet?.pet_id) {
        syncVariantsMap(db, updates.pet_id);
      }
    }

    // Auto-sync evolution_chain to all pets in the chain
    if (table === 'pet_details' && updates.evolution_chain !== undefined) {
      syncEvolutionChain(db, id, updates.evolution_chain);
    }

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

    // Auto-sync variants_map when creating a pet
    if (table === 'pets' && req.body.pet_id) {
      syncVariantsMap(db, req.body.pet_id);
    }

    // Auto-sync evolution_chain to all pets in the chain
    if (table === 'pet_details' && req.body.evolution_chain) {
      const petUid = req.body.pet_uid || req.body[config.primaryKey];
      syncEvolutionChain(db, petUid, req.body.evolution_chain);
    }

    db.close();
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    db.close();
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/data/:table/:id — 删除记录
router.delete('/data/:table/:id', (req, res) => {
  const { table, id } = req.params;
  const config = EDITABLE_TABLES[table];
  if (!config) return res.status(400).json({ error: '无效的表名' });

  const db = getWriteDb();

  // For pets table, get pet_id before deletion to sync variants_map after
  let petId = null;
  if (table === 'pets') {
    const pet = db.prepare('SELECT pet_id FROM pets WHERE uid = ?').get(id);
    if (pet) petId = pet.pet_id;
  }

  const result = db.prepare(`DELETE FROM ${table} WHERE ${config.primaryKey} = ?`).run(id);

  // Sync variants_map after deleting a pet
  if (table === 'pets' && petId) {
    syncVariantsMap(db, petId);
  }

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

module.exports = router;
