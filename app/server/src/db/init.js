const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const { DB_PATH } = require('./connection');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const NAV_TABS_DEFAULTS_PATH = path.join(__dirname, 'nav_tabs_defaults.json');

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

// 3. 初始化 nav_tabs 默认数据
initNavTabs(db);

console.log(`[DONE] 数据库已初始化: ${DB_PATH}`);
db.close();

/**
 * 初始化用户端导航标签默认数据
 * 默认配置从 nav_tabs_defaults.json 读取（由管理端「保存为默认配置」按钮维护）
 * 使用 INSERT OR IGNORE 逐条插入：
 *   - 新环境（表为空）：全量插入所有默认标签
 *   - 已有环境：已存在的 tab_key 自动跳过（不覆盖用户在管理端的修改），新增的 tab_key 自动补充
 */
function initNavTabs(db) {
  try {
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='nav_tabs'"
    ).get();
    if (!tableExists) {
      console.log('[INIT] nav_tabs 表不存在，跳过初始化');
      return;
    }

    // 从 JSON 文件读取默认配置
    if (!fs.existsSync(NAV_TABS_DEFAULTS_PATH)) {
      console.log('[INIT] nav_tabs_defaults.json 不存在，跳过初始化');
      return;
    }
    const DEFAULT_TABS = JSON.parse(fs.readFileSync(NAV_TABS_DEFAULTS_PATH, 'utf-8'));
    if (!Array.isArray(DEFAULT_TABS) || DEFAULT_TABS.length === 0) {
      console.log('[INIT] nav_tabs_defaults.json 为空或格式错误，跳过初始化');
      return;
    }

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO nav_tabs (tab_key, label, route, icon, parent_key, is_visible, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    for (const tab of DEFAULT_TABS) {
      const result = stmt.run(
        tab.tab_key, tab.label, tab.route ?? null,
        tab.icon || '', tab.parent_key ?? null,
        tab.is_visible ?? 1, tab.sort_order ?? 0
      );
      if (result.changes > 0) inserted++;
    }

    if (inserted > 0) {
      console.log(`[INIT] nav_tabs 已补充 ${inserted} 条默认标签`);
    } else {
      console.log('[INIT] nav_tabs 无需更新（所有默认标签已存在）');
    }
  } catch (err) {
    console.log(`[INIT] nav_tabs 初始化失败: ${err.message}`);
  }
}

/**
 * 自动检测并补充缺失列
 * 解析 schema.sql → 对比实际列 → ALTER TABLE ADD COLUMN
 * 注意：只做加法，绝不自动删列（防止误删数据）
 */
function migrateColumns(db, schemaSql) {
  const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi;
  let match;
  let added = 0;

  while ((match = tableRegex.exec(schemaSql)) !== null) {
    const tableName = match[1];
    const body = match[2];

    // 获取数据库中该表实际存在的列
    let existingColumns;
    try {
      const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
      existingColumns = new Set(info.map(c => c.name));
    } catch {
      continue;
    }

    // 解析 schema.sql 期望的列
    const expectedColumns = new Set();
    const cleanedBody = body
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    const lines = cleanedBody
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('--'))
      .filter(l => !l.toUpperCase().startsWith('FOREIGN KEY'))
      .filter(l => !l.toUpperCase().startsWith('PRIMARY KEY'));

    for (const line of lines) {
      const cleaned = line.replace(/,\s*$/, '').trim();
      const colMatch = cleaned.match(/^(\w+)\s+(TEXT|INTEGER|REAL|BLOB|NUMERIC)(.*)$/i);
      if (colMatch) {
        expectedColumns.add(colMatch[1]);
      }
    }

    // 补充缺失列
    for (const colName of expectedColumns) {
      if (!existingColumns.has(colName)) {
        const colDef = getColumnType(body, colName);
        if (colDef) {
          try {
            db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colDef}`);
            console.log(`[ADD] ${tableName}.${colName}`);
            added++;
          } catch (err) {
            console.log(`[WARN] ${tableName}.${colName}: ${err.message}`);
          }
        }
      }
    }
  }

  if (added > 0) {
    console.log(`[MIGRATE] 共补充 ${added} 个缺失列`);
  }
}

/**
 * 从 schema.sql 中提取指定列的完整定义（含类型和约束）
 * 返回格式：colName TYPE [CONSTRAINTS]（用于 ALTER TABLE ADD COLUMN）
 */
function getColumnType(body, colName) {
  const cleanedBody = body
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const lines = cleanedBody
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('--'))
    .filter(l => !l.toUpperCase().startsWith('FOREIGN KEY'))
    .filter(l => !l.toUpperCase().startsWith('PRIMARY KEY'));

  for (const line of lines) {
    const cleaned = line.replace(/,\s*$/, '').trim();
    const colMatch = cleaned.match(/^(\w+)\s+(TEXT|INTEGER|REAL|BLOB|NUMERIC)(.*)$/i);
    if (colMatch && colMatch[1] === colName) {
      const colType = colMatch[2].toUpperCase();
      let constraints = (colMatch[3] || '').trim();
      // SQLite ADD COLUMN 不支持 NOT NULL 无 DEFAULT，去掉它
      if (constraints.includes('NOT NULL') && !constraints.includes('DEFAULT')) {
        constraints = constraints.replace(/NOT\s+NULL/i, '').trim();
      }
      return `${colName} ${colType}${constraints ? ' ' + constraints : ''}`;
    }
  }
  return null;
}
