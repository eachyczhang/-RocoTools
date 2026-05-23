const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { DB_PATH, BACKUP_DIR, isSafeFilename, isPathWithin, safeReadJSON } = require('./utils');

const SEASON_DIR = path.join(BACKUP_DIR, 'seasons');
const SNAPSHOT_DIR = path.join(BACKUP_DIR, 'snapshots');

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

  if (save_current) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const safeName = save_label
      ? save_label.trim().replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_')
      : 'unnamed';
    const snapshotName = `snapshot_${safeName}_${ts}.db`;
    fs.copyFileSync(DB_PATH, path.join(SNAPSHOT_DIR, snapshotName));

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

  if (!confirm_token) {
    const token = `delete_${name}_${Date.now()}`;
    if (!meta._pending_deletes) meta._pending_deletes = {};
    meta._pending_deletes[token] = { name, expires: Date.now() + 5 * 60 * 1000 };
    saveMeta(meta);
    return res.json({
      confirm_required: true,
      confirm_token: token,
      message: `确定要删除赛季备份「${info?.label || name}」吗？此操作不可恢复。请使用返回的 confirm_token 再次请求确认删除。`,
    });
  }

  const pending = meta._pending_deletes?.[confirm_token];
  if (!pending || pending.name !== name || Date.now() > pending.expires) {
    return res.status(400).json({ error: '确认令牌无效或已过期，请重新操作' });
  }

  fs.unlinkSync(backupPath);
  delete meta[name];
  delete meta._pending_deletes[confirm_token];
  saveMeta(meta);
  res.json({ success: true, message: `赛季备份「${info?.label || name}」已删除` });
});

module.exports = router;
