const db = require('../db/connection');

function parseRow(row) {
  return {
    ...row,
    strong_against: JSON.parse(row.strong_against || '[]'),
    resisted_by: JSON.parse(row.resisted_by || '[]'),
    weak_to: JSON.parse(row.weak_to || '[]'),
    resistant_to: JSON.parse(row.resistant_to || '[]'),
  };
}

function getAll() {
  const rows = db.prepare('SELECT * FROM elements ORDER BY id').all();
  const elements = rows.map(parseRow);
  return { total: elements.length, elements };
}

function getMultipliers() {
  const rows = db.prepare('SELECT * FROM element_multipliers').all();
  const multipliers = {};
  for (const r of rows) multipliers[r.key] = r.value;
  return multipliers;
}

function getById(id) {
  const row = db.prepare('SELECT * FROM elements WHERE id = ?').get(id);
  return row ? parseRow(row) : null;
}

module.exports = { getAll, getMultipliers, getById };
