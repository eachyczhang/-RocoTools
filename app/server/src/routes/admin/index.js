const express = require('express');
const router = express.Router();
const { authAdmin, signAdminToken } = require('../../middleware/authAdmin');
const { clearCache } = require('../../middleware/apiCache');

// 管理员密码（环境变量，缺失时警告）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) console.warn('[WARN] ADMIN_PASSWORD 未设置，使用默认密码（仅开发环境）');
const _password = ADMIN_PASSWORD || 'roco2026';

// Auto-clear API cache after successful write operations (non-GET)
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode < 400 && data && data.success !== false) {
      try { clearCache(); } catch (e) { console.error('[WARN] clearCache failed:', e.message); }
    }
    return originalJson(data);
  };
  next();
});

// ============================================================
// Sub-routers
// ============================================================
const navTabsRouter = require('./navTabs');
const crudRouter = require('./crud');
const pikaRouter = require('./pika');
const uploadRouter = require('./upload');
const conflictsRouter = require('./conflicts');
const backupRouter = require('./backup');
const libraryRouter = require('./library');
const mediaRouter = require('./media');
const exportRouter = require('./export');
const petSkillsRouter = require('./petSkills');

// ============================================================
// 公开 API（不需要鉴权）
// ============================================================
const { getDb } = require('../../db/connection');

// 用户端导航标签（公开）
router.get('/nav-tabs/public', (req, res) => {
  const db = getDb();
  try {
    const tabs = db.prepare('SELECT id, tab_key, label, route, icon, parent_key, sort_order FROM nav_tabs WHERE is_visible = 1 ORDER BY sort_order DESC').all();
    res.json({ tabs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 站点设置（公开，前端用于读取开关状态）
router.get('/settings/public', (req, res) => {
  const db = getDb();
  try {
    // Ensure table exists
    db.prepare(`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '0', description TEXT)`).run();
    const rows = db.prepare('SELECT key, value FROM site_settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 登录（不需要鉴权）
// ============================================================
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== _password) {
    return res.status(401).json({ error: '密码错误' });
  }
  const token = signAdminToken();
  res.json({ token, expiresIn: '4h' });
});

// ============================================================
// 以下接口都需要鉴权
// ============================================================
router.use(authAdmin);

// 导航标签管理
router.use(navTabsRouter);

// 通用 CRUD
router.use(crudRouter);

// 皮卡月刊
router.use(pikaRouter);

// 图片上传
router.use(uploadRouter);

// 数据审查（冲突处理）
router.use(conflictsRouter);

// 数据库备份 / 恢复
router.use(backupRouter);

// 素材库（含目录管理）
router.use(libraryRouter);

// 统一素材管理
router.use(mediaRouter);

// 数据库导出 Excel
router.use(exportRouter);

// 精灵技能 / 蛋组 / 特性管理
router.use(petSkillsRouter);

// ============================================================
// 站点设置管理
// ============================================================
router.get('/settings', (req, res) => {
  const db = getDb();
  try {
    db.prepare(`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '0', description TEXT)`).run();
    const rows = db.prepare('SELECT key, value, description FROM site_settings').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings/:key', (req, res) => {
  const { key } = req.params;
  const { value, description } = req.body;
  const db = require('../../db/connection').getWriteDb();
  try {
    db.prepare(`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '0', description TEXT)`).run();
    db.prepare(
      `INSERT INTO site_settings (key, value, description) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = COALESCE(excluded.description, description)`
    ).run(key, String(value), description || null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 数据清理工具
// ============================================================
const { cleanupDuplicateDefaultAchievements } = require('./utils');

// 清理重复的默认课题
router.post('/cleanup-duplicate-achievements', (req, res) => {
  const { pet_uid } = req.body;
  const db = require('../../db/connection').getWriteDb();
  
  try {
    cleanupDuplicateDefaultAchievements(db, pet_uid);
    res.json({ success: true, message: '重复默认课题清理完成' });
  } catch (err) {
    console.error('[cleanup-duplicate-achievements] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
