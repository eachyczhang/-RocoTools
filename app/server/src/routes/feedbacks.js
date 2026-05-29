const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { getDb, getWriteDb, DATA_DIR } = require('../db/connection');

// ============================================================
// Configuration
// ============================================================
const FEEDBACK_UPLOAD_DIR = path.join(DATA_DIR, 'uploads', 'feedbacks');
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB per file
const MAX_FILES = 2;
const MAX_IMAGE_DIMENSION = 1920;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10; // max 10 per hour per IP

// In-memory IP rate limiter
const ipRequests = new Map();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequests.entries()) {
    const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (valid.length === 0) ipRequests.delete(ip);
    else ipRequests.set(ip, valid);
  }
}, 10 * 60 * 1000);

// Multer config: temp directory, file size & count limits
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ============================================================
// Helper: check if feedback feature is enabled
// ============================================================
function isFeedbackEnabled() {
  const db = getDb();
  try {
    const row = db.prepare("SELECT value FROM site_settings WHERE key = 'feedback_enabled'").get();
    // Default to enabled if not set
    return !row || row.value !== '0';
  } catch {
    return true;
  }
}

// ============================================================
// Helper: compress image losslessly
// ============================================================
async function compressImage(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ lossless: true })
    .toFile(outputPath);
}

// ============================================================
// Helper: get client IP
// ============================================================
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.ip;
}

// ============================================================
// Helper: sanitize text (prevent XSS)
// ============================================================
function sanitize(str) {
  if (!str) return '';
  return str.replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ============================================================
// GET /api/feedbacks/enabled - Check if feedback is enabled + config
// ============================================================
router.get('/enabled', (req, res) => {
  const db = getDb();
  let cooldown = 60; // default 60 seconds
  try {
    const row = db.prepare("SELECT value FROM site_settings WHERE key = 'feedback_cooldown'").get();
    if (row) cooldown = Math.max(0, parseInt(row.value) || 60);
  } catch {}
  res.json({ enabled: isFeedbackEnabled(), cooldown });
});

// ============================================================
// POST /api/feedbacks - Submit feedback
// ============================================================
router.post('/', upload.array('images', MAX_FILES), async (req, res) => {
  try {
    // Check if feature is enabled
    if (!isFeedbackEnabled()) {
      return res.status(403).json({ error: 'Feedback is disabled' });
    }

    // Rate limiting
    const ip = getClientIp(req);
    const now = Date.now();
    const timestamps = ipRequests.get(ip) || [];
    const recentRequests = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (recentRequests.length >= RATE_LIMIT_MAX) {
      // Clean up temp files
      if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    recentRequests.push(now);
    ipRequests.set(ip, recentRequests);

    // Validate content
    const { type, content, contact, page_url, page_title, device_type, screen_size, user_agent, dark_mode } = req.body;

    if (!content || content.length < 10 || content.length > 500) {
      if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
      return res.status(400).json({ error: 'Content must be between 10 and 500 characters' });
    }

    const validTypes = ['bug', 'suggestion', 'other'];
    const feedbackType = validTypes.includes(type) ? type : 'other';

    // Process images
    const imageFilenames = [];
    if (req.files && req.files.length > 0) {
      // Ensure upload directory exists (with month subdirectory)
      const monthDir = new Date().toISOString().slice(0, 7); // YYYY-MM
      const targetDir = path.join(FEEDBACK_UPLOAD_DIR, monthDir);
      fs.mkdirSync(targetDir, { recursive: true });

      // We need a temporary feedback ID - insert first, then update images
      // For now, use timestamp-based naming
      const timestamp = Date.now();

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const randomHex = crypto.randomBytes(2).toString('hex');
        const filename = `fb_${timestamp}_${i}_${randomHex}.webp`;
        const outputPath = path.join(targetDir, filename);

        try {
          await compressImage(file.path, outputPath);
          imageFilenames.push(`${monthDir}/${filename}`);
        } catch (imgErr) {
          console.error('[Feedback] Image compression failed:', imgErr.message);
          // Skip failed image, continue with others
        } finally {
          // Always clean up temp file
          fs.unlink(file.path, () => {});
        }
      }
    }

    // Insert into database
    const db = getWriteDb();
    try {
      // Ensure table exists
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

      // Create indexes if not exist
      db.prepare('CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC)').run();

      const stmt = db.prepare(`
        INSERT INTO feedbacks (type, content, contact, images, page_url, page_title, device_type, screen_size, user_agent, ip, dark_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        feedbackType,
        sanitize(content),
        sanitize((contact || '').slice(0, 100)),
        JSON.stringify(imageFilenames),
        (page_url || '').slice(0, 500),
        sanitize((page_title || '').slice(0, 200)),
        (device_type || '').slice(0, 20),
        (screen_size || '').slice(0, 20),
        (user_agent || '').slice(0, 500),
        ip,
        dark_mode === '1' || dark_mode === 1 ? 1 : 0
      );

      res.status(201).json({ success: true, message: 'Feedback submitted successfully' });
    } finally {
      db.close();
    }
  } catch (err) {
    console.error('[Feedback] Submit error:', err);
    // Clean up temp files on error
    if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
