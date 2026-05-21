const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'roco.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// 确保目录存在
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// 不删除旧数据库，schema.sql 使用 CREATE TABLE IF NOT EXISTS
// 保留非爬虫数据（seasons 等手动录入的表）

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

console.log(`[DONE] 数据库已初始化: ${DB_PATH}`);
db.close();
