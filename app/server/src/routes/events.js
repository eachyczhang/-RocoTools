const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'roco.db');

function parseEvent(e) {
  return {
    ...e,
    periods: JSON.parse(e.periods || '[]'),
  };
}

// GET /api/events?season_id=S1 — 获取指定赛季的活动
router.get('/', (req, res) => {
  const { season_id } = req.query;
  const db = new Database(DB_PATH, { readonly: true });

  let events;
  if (season_id) {
    events = db.prepare('SELECT * FROM season_events WHERE season_id = ? ORDER BY category, row_order').all(season_id);
  } else {
    // 默认返回当前赛季的活动
    const current = db.prepare('SELECT id FROM seasons WHERE is_current = 1').get();
    if (current) {
      events = db.prepare('SELECT * FROM season_events WHERE season_id = ? ORDER BY category, row_order').all(current.id);
    } else {
      events = [];
    }
  }
  db.close();

  res.json({
    season_id: season_id || null,
    events: events.map(parseEvent),
  });
});

module.exports = router;
