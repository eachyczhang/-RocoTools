const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb, getWriteDb, DATA_DIR } = require('../../db/connection');

const FEEDBACK_UPLOAD_DIR = path.join(DATA_DIR, 'uploads', 'feedbacks');

// ============================================================
// Helper: ensure feedbacks table exists (uses write db)
// ============================================================
function ensureTable() {
  const db = getWriteDb();
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL DEFAULT 'other',
        content TEXT NOT NULL,
        contact TEXT DEFAULT '',
        images TEXT DEFAULT '[]',
        page_url TEXT DEFAULT '',
        page_title TEXT DEFAULT '',
        device_type TEXT DEFAULT '',
        screen_size TEXT DEFAULT '',
        user_agent TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        dark_mode INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_note TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } finally {
    db.close();
  }
}

// Ensure table on module load
ensureTable();

// ============================================================
// GET /api/admin/feedbacks - List feedbacks with pagination & filters
// ============================================================
router.get('/feedbacks', (req, res) => {
  const db = getDb();
  try {

    const { status, type, page = 1, page_size = 10 } = req.query;
    const limit = Math.min(Math.max(parseInt(page_size) || 10, 1), 50);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    let where = [];
    let params = [];

    if (status && status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }
    if (type && type !== 'all') {
      where.push('type = ?');
      params.push(type);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const total = db.prepare(`SELECT COUNT(*) as c FROM feedbacks ${whereClause}`).get(...params).c;
    const items = db.prepare(`SELECT * FROM feedbacks ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    // Get status counts for tabs
    const counts = db.prepare(`
      SELECT status, COUNT(*) as count FROM feedbacks GROUP BY status
    `).all();
    const statusCounts = { pending: 0, read: 0, resolved: 0, ignored: 0 };
    counts.forEach(r => { statusCounts[r.status] = r.count; });

    res.json({
      items,
      total,
      page: Math.max(parseInt(page) || 1, 1),
      page_size: limit,
      status_counts: statusCounts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/feedbacks/stats - Quick stats for dashboard
// ============================================================
router.get('/feedbacks/stats', (req, res) => {
  const db = getDb();
  try {

    const pending = db.prepare("SELECT COUNT(*) as c FROM feedbacks WHERE status = 'pending'").get().c;

    // This week's new feedbacks
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekNew = db.prepare("SELECT COUNT(*) as c FROM feedbacks WHERE created_at >= ?").get(weekStart.toISOString()).c;

    const total = db.prepare("SELECT COUNT(*) as c FROM feedbacks").get().c;

    res.json({ pending, week_new: weekNew, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/feedbacks/:id - Get single feedback detail
// ============================================================
router.get('/feedbacks/:id', (req, res) => {
  const db = getDb();
  try {
    const item = db.prepare('SELECT * FROM feedbacks WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Feedback not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATCH /api/admin/feedbacks/:id - Update status / admin note
// ============================================================
router.patch('/feedbacks/:id', (req, res) => {
  const db = getWriteDb();
  try {

    const { status, admin_note } = req.body;
    const id = req.params.id;

    const existing = db.prepare('SELECT id FROM feedbacks WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const updates = [];
    const params = [];

    if (status) {
      const validStatuses = ['pending', 'read', 'resolved', 'ignored'];
      if (!validStatuses.includes(status)) {
        db.close();
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (admin_note !== undefined) {
      updates.push('admin_note = ?');
      params.push(admin_note);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(id);
      db.prepare(`UPDATE feedbacks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    db.close();
    res.json({ success: true });
  } catch (err) {
    try { db.close(); } catch {}
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/admin/feedbacks/:id - Delete feedback + cleanup images
// ============================================================
router.delete('/feedbacks/:id', (req, res) => {
  const db = getWriteDb();
  try {

    const item = db.prepare('SELECT images FROM feedbacks WHERE id = ?').get(req.params.id);
    if (!item) {
      db.close();
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Delete associated image files
    try {
      const images = JSON.parse(item.images || '[]');
      for (const filename of images) {
        const filePath = path.join(FEEDBACK_UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (imgErr) {
      console.error('[Feedback] Image cleanup error:', imgErr.message);
    }

    db.prepare('DELETE FROM feedbacks WHERE id = ?').run(req.params.id);
    db.close();
    res.json({ success: true });
  } catch (err) {
    try { db.close(); } catch {}
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
