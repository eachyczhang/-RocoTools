const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Database = require('better-sqlite3');

const { authAdmin, signAdminToken } = require('../middleware/authAdmin');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'roco.db');
const DATA_DIR = path.join(__dirname, '..', '..', '..', '..', 'data');
const PUBLIC_DIR = path.join(DATA_DIR, 'public');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups');

// 管理员密码（环境变量）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'roco2026';

// ============================================================
// 登录
// ============================================================
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }
  const token = signAdminToken();
  res.json({ token, expiresIn: '4h' });
});

// 以下接口都需要鉴权
router.use(authAdmin);

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
    editableFields: ['name', 'element_id', 'sub_element_id', 'ability_name', 'ability_desc', 'hp', 'speed', 'atk', 'matk', 'def', 'mdef', 'total', 'version', 'image_url', 'thumb_url'],
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
  pet_details: {
    label: '精灵详情',
    primaryKey: 'pet_uid',
    editableFields: ['ability_icon', 'image_default', 'image_shiny', 'image_fruit', 'image_egg', 'height', 'weight', 'location'],
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
  const offset = (page - 1) * limit;

  const db = new Database(DB_PATH, { readonly: true });

  let whereClause = '';
  const params = [];
  if (search) {
    // 搜索 name 或主键
    whereClause = `WHERE name LIKE ? OR ${config.primaryKey} LIKE ?`;
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM ${table} ${whereClause}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM ${table} ${whereClause} LIMIT ? OFFSET ?`).all(...params, +limit, offset);
  db.close();

  res.json({ total, page: +page, limit: +limit, rows });
});

// GET /api/admin/data/:table/:id — 获取单条记录
router.get('/data/:table/:id', (req, res) => {
  const { table, id } = req.params;
  const config = EDITABLE_TABLES[table];
  if (!config) return res.status(400).json({ error: '无效的表名' });

  const db = new Database(DB_PATH, { readonly: true });
  const row = db.prepare(`SELECT * FROM ${table} WHERE ${config.primaryKey} = ?`).get(id);
  db.close();

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

  const db = new Database(DB_PATH);
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

  const fields = [config.primaryKey, ...config.editableFields].filter(f => req.body[f] !== undefined);
  const values = fields.map(f => req.body[f]);

  if (!req.body[config.primaryKey]) {
    return res.status(400).json({ error: `缺少主键: ${config.primaryKey}` });
  }

  const placeholders = fields.map(() => '?').join(', ');

  const db = new Database(DB_PATH);
  try {
    db.prepare(`INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`).run(...values);
    db.close();
    res.json({ success: true });
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

  const db = new Database(DB_PATH);
  const result = db.prepare(`DELETE FROM ${table} WHERE ${config.primaryKey} = ?`).run(id);
  db.close();

  if (result.changes === 0) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, changes: result.changes });
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
  skill_icon: { dir: 'skills/icons', suffix: '.png' },
  element_icon: { dir: 'elements/icons', suffix: '.png' },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpeg|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PNG/JPEG/WebP/GIF 格式'));
    }
  },
});

/**
 * POST /api/admin/upload
 * body: { type: 'pet_default', uid: 'pet_001' }
 * file: 图片文件
 */
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  const { type, uid } = req.body;
  if (!type || !uid) return res.status(400).json({ error: '缺少 type 或 uid' });

  const imageConfig = IMAGE_TYPES[type];
  if (!imageConfig) return res.status(400).json({ error: `无效的图片类型: ${type}` });

  const dir = path.join(PUBLIC_DIR, imageConfig.dir);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${uid}${imageConfig.suffix}`;
  const filepath = path.join(dir, filename);
  const publicPath = `/public/${imageConfig.dir}/${filename}`;

  fs.writeFileSync(filepath, req.file.buffer);

  // 更新数据库对应字段
  const fieldMap = {
    pet_default: { table: 'pet_details', field: 'image_default', key: 'pet_uid' },
    pet_shiny: { table: 'pet_details', field: 'image_shiny', key: 'pet_uid' },
    pet_fruit: { table: 'pet_details', field: 'image_fruit', key: 'pet_uid' },
    pet_egg: { table: 'pet_details', field: 'image_egg', key: 'pet_uid' },
    pet_thumb: { table: 'pets', field: 'thumb_url', key: 'uid' },
    skill_icon: { table: 'skills', field: 'icon_url', key: 'uid' },
    element_icon: { table: 'elements', field: 'icon', key: 'id' },
  };

  const mapping = fieldMap[type];
  if (mapping) {
    const db = new Database(DB_PATH);
    db.prepare(`UPDATE ${mapping.table} SET ${mapping.field} = ? WHERE ${mapping.key} = ?`).run(publicPath, uid);
    db.close();
  }

  res.json({ success: true, path: publicPath });
});

// ============================================================
// 数据库备份 / 恢复
// ============================================================

// GET /api/admin/backups — 列出备份
router.get('/backups', (req, res) => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stat.size, time: stat.mtimeMs };
    })
    .sort((a, b) => b.time - a.time);
  res.json({ backups: files });
});

// POST /api/admin/backup — 创建备份
router.post('/backup', (req, res) => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const now = new Date();
  const name = `roco_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.db`;
  const backupPath = path.join(BACKUP_DIR, name);

  // 使用 SQLite 内置备份
  const db = new Database(DB_PATH, { readonly: true });
  db.backup(backupPath)
    .then(() => {
      db.close();
      const stat = fs.statSync(backupPath);
      res.json({ success: true, name, size: stat.size });
    })
    .catch(err => {
      db.close();
      res.status(500).json({ error: `备份失败: ${err.message}` });
    });
});

// POST /api/admin/restore — 恢复备份
router.post('/restore', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '缺少备份文件名' });

  const backupPath = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: '备份文件不存在' });
  }

  // 先备份当前数据库
  const autoBackupName = `roco_before_restore_${Date.now()}.db`;
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, autoBackupName));

  // 覆盖当前数据库
  fs.copyFileSync(backupPath, DB_PATH);
  res.json({ success: true, message: `已恢复到 ${name}，恢复前自动备份为 ${autoBackupName}` });
});

// DELETE /api/admin/backups/:name — 删除备份
router.delete('/backups/:name', (req, res) => {
  const backupPath = path.join(BACKUP_DIR, req.params.name);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: '备份文件不存在' });
  }
  fs.unlinkSync(backupPath);
  res.json({ success: true });
});

module.exports = router;
