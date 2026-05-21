const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'roco.db');

// GET /api/seasons — 获取所有赛季
router.get('/', (req, res) => {
  const db = new Database(DB_PATH, { readonly: true });
  const seasons = db.prepare('SELECT * FROM seasons ORDER BY id DESC').all();
  db.close();
  res.json({ seasons: seasons.map(s => ({
    ...s,
    pass_pets: JSON.parse(s.pass_pets || '[]'),
    season_pets: JSON.parse(s.season_pets || '[]'),
    shiny_pets: JSON.parse(s.shiny_pets || '[]'),
  })) });
});

// GET /api/seasons/current — 获取当前赛季
router.get('/current', (req, res) => {
  const db = new Database(DB_PATH, { readonly: true });
  const season = db.prepare('SELECT * FROM seasons WHERE is_current = 1').get();
  db.close();
  if (!season) return res.json({ season: null });
  res.json({ season: {
    ...season,
    pass_pets: JSON.parse(season.pass_pets || '[]'),
    season_pets: JSON.parse(season.season_pets || '[]'),
    shiny_pets: JSON.parse(season.shiny_pets || '[]'),
  } });
});

module.exports = router;
