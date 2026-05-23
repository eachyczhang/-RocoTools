const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb, getWriteDb } = require('../../db/connection');
const { EDITABLE_TABLES, safeReadJSON } = require('./utils');

// ============================================================
// 数据审查（冲突处理）
// ============================================================

const CONFLICTS_PATH = path.join(__dirname, '..', '..', '..', 'data', 'pending_conflicts.json');

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

  const fields = Object.keys(c.newData);
  const setClauses = [...fields.map(k => `${k} = ?`), 'manual_edit = 0'].join(', ');
  const values = fields.map(k => c.newData[k]);

  const db = getWriteDb();
  db.prepare(`UPDATE ${c.table} SET ${setClauses} WHERE ${config.primaryKey} = ?`).run(...values, c.id);
  db.close();

  conflicts.splice(idx, 1);
  saveConflicts(conflicts);
  res.json({ success: true, remaining: conflicts.length });
});

// POST /api/admin/conflicts/:index/reject — 保留当前数据（忽略爬虫数据）
router.post('/conflicts/:index/reject', (req, res) => {
  const conflicts = loadConflicts();
  const idx = parseInt(req.params.index);
  if (idx < 0 || idx >= conflicts.length) return res.status(400).json({ error: '无效索引' });

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

module.exports = router;
