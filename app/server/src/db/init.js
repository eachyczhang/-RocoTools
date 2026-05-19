const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'roco.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// 确保目录存在
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// 删除旧数据库
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('[INFO] 已删除旧数据库');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

console.log(`[DONE] 数据库已初始化: ${DB_PATH}`);
db.close();
