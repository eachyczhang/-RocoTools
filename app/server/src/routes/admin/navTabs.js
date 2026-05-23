const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb, getWriteDb } = require('../../db/connection');

// ============================================================
// 导航标签管理（需鉴权，由 index.js 统一挂载 authAdmin）
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

    const defaultsPath = path.join(__dirname, '../../db/nav_tabs_defaults.json');
    fs.writeFileSync(defaultsPath, JSON.stringify(tabs, null, 2), 'utf-8');

    res.json({ success: true, count: tabs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
