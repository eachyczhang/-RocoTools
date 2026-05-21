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

// 1. 执行 schema（创建不存在的表）
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// 2. 自动补充缺失列
// 从 schema.sql 解析期望的表结构，对比实际表结构，补充缺失列
migrateColumns(db, schema);

console.log(`[DONE] 数据库已初始化: ${DB_PATH}`);
db.close();

/**
 * 自动检测并补充缺失的列
 * 解析 schema.sql 获取期望列 → 对比数据库实际列 → ALTER TABLE ADD COLUMN
 */
function migrateColumns(db, schemaSql) {
  // 解析 schema.sql 中所有表的列定义
  const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi;
  let match;
  let migrated = 0;

  while ((match = tableRegex.exec(schemaSql)) !== null) {
    const tableName = match[1];
    const body = match[2];

    // 获取数据库中该表实际存在的列
    let existingColumns;
    try {
      const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
      existingColumns = new Set(info.map(c => c.name));
    } catch {
      continue; // 表不存在（理论上不会，因为上面已经 CREATE IF NOT EXISTS）
    }

    // 解析期望的列（排除 FOREIGN KEY、PRIMARY KEY 约束行）
    const lines = body.split('\n')
      .map(l => l.replace(/--.*$/, '').trim())  // 去掉行内注释
      .filter(l => l && !l.startsWith('--'))
      .filter(l => !l.toUpperCase().startsWith('FOREIGN KEY'))
      .filter(l => !l.toUpperCase().startsWith('PRIMARY KEY'));

    for (const line of lines) {
      // 去掉尾部逗号
      const cleaned = line.replace(/,\s*$/, '').trim();
      // 匹配列定义：列名 类型 [...约束]
      const colMatch = cleaned.match(/^(\w+)\s+(TEXT|INTEGER|REAL|BLOB|NUMERIC)(.*)$/i);
      if (!colMatch) continue;

      const colName = colMatch[1];
      const colType = colMatch[2].toUpperCase();
      let constraints = colMatch[3].trim();

      // 跳过已存在的列
      if (existingColumns.has(colName)) continue;

      // 构建 ALTER TABLE ADD COLUMN 语句
      // 注意：SQLite ALTER TABLE ADD COLUMN 不支持 NOT NULL（除非有 DEFAULT）
      // 去掉 NOT NULL（如果没有 DEFAULT 值）
      if (constraints.includes('NOT NULL') && !constraints.includes('DEFAULT')) {
        constraints = constraints.replace('NOT NULL', '').trim();
      }

      const alterSql = `ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colType} ${constraints}`.trim();

      try {
        db.exec(alterSql);
        console.log(`[MIGRATE] ${tableName}.${colName} 已补充`);
        migrated++;
      } catch (err) {
        console.log(`[MIGRATE WARN] ${tableName}.${colName}: ${err.message}`);
      }
    }
  }

  if (migrated > 0) {
    console.log(`[MIGRATE] 共补充 ${migrated} 个缺失列`);
  }
}
