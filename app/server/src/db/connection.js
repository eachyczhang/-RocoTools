const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'roco.db');
const db = new Database(DB_PATH, { readonly: true });
db.pragma('journal_mode = WAL');

module.exports = db;
