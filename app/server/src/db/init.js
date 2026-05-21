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

// 3. 初始化 nav_tabs 默认数据
initNavTabs(db);

console.log(`[DONE] 数据库已初始化: ${DB_PATH}`);
db.close();

/**
 * 初始化用户端导航标签默认数据
 * 只在表完全为空时插入，永远不覆盖已有配置
 * 保护逻辑：检查是否已有非默认 tab_key，如有则跳过
 */
function initNavTabs(db) {
  try {
    // 先检查表是否存在（防止 schema.sql 未执行）
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='nav_tabs'"
    ).get();
    if (!tableExists) {
      console.log('[INIT] nav_tabs 表不存在，跳过初始化');
      return;
    }

    const count = db.prepare('SELECT COUNT(*) as c FROM nav_tabs').get().c;
    if (count === 0) {
      console.log('[INIT] nav_tabs 表为空，插入默认数据...');
      const defaultTabs = [
        { tab_key: 'home', label: '首页', route: '/', icon: '', parent_key: '', is_visible: 1, sort_order: 100 },
        { tab_key: 'season', label: '赛季', route: '/season', icon: '', parent_key: '', is_visible: 1, sort_order: 90 },
        { tab_key: 'events', label: '活动', route: '/events', icon: '', parent_key: '', is_visible: 1, sort_order: 80 },
        { tab_key: 'pets', label: '精灵', route: '/pets', icon: '', parent_key: '', is_visible: 1, sort_order: 70 },
        { tab_key: 'skills', label: '技能', route: '/skills', icon: '', parent_key: '', is_visible: 1, sort_order: 60 },
        { tab_key: 'skills_list', label: '技能列表', route: '/skills', icon: '', parent_key: 'skills', is_visible: 1, sort_order: 61 },
        { tab_key: 'coverage', label: '打击面分析', route: '/coverage', icon: '', parent_key: 'skills', is_visible: 1, sort_order: 62 },
        { tab_key: 'eggs', label: '蛋组', route: '/eggs', icon: '', parent_key: '', is_visible: 1, sort_order: 40 },
        { tab_key: 'natures', label: '性格', route: '/natures', icon: '', parent_key: '', is_visible: 1, sort_order: 30 },
        { tab_key: 'elements', label: '属性', route: '/elements', icon: '', parent_key: '', is_visible: 1, sort_order: 20 },
      ];
      const stmt = db.prepare('INSERT INTO nav_tabs (tab_key, label, route, icon, parent_key, is_visible, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const tab of defaultTabs) {
        stmt.run(tab.tab_key, tab.label, tab.route, tab.icon, tab.parent_key || null, tab.is_visible, tab.sort_order);
      }
      console.log(`[INIT] nav_tabs 默认数据已初始化（${defaultTabs.length} 条）`);
    } else {
      // 进一步检查：是否已有非默认的 tab_key（说明用户配置过）
      const defaultKeys = ['home','season','events','pets','skills','skills_list','coverage','eggs','natures','elements'];
      const customCount = db.prepare(
        `SELECT COUNT(*) as c FROM nav_tabs WHERE tab_key NOT IN (${defaultKeys.map(() => '?').join(',')})`
      ).all(...defaultKeys)[0].c;
      if (customCount > 0) {
        console.log(`[INIT] nav_tabs 已有用户自定义标签（${customCount} 条非默认），跳过初始化`);
      } else {
        console.log(`[INIT] nav_tabs 已有 ${count} 条数据（均为默认数据），跳过初始化`);
      }
    }
  } catch (err) {
    console.log(`[INIT] nav_tabs 初始化失败: ${err.message}`);
  }
}

/**
 * 自动检测并同步表结构
 * 1. 补充缺失列：解析 schema.sql → 对比实际列 → ALTER TABLE ADD COLUMN
 * 2. 删除废弃列：对比实际列 → 找出 schema 中不存在的列 → ALTER TABLE DROP COLUMN
 */
function migrateColumns(db, schemaSql) {
  // 解析 schema.sql 中所有表的列定义
  const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi;
  let match;
  let added = 0;
  let removed = 0;

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
      // 支持中文列名：列名由 字母/数字/中文/下划线 组成
      const colMatch = cleaned.match(/^([\w\u4e00-\u9fa5]+)\s+(TEXT|INTEGER|REAL|BLOB|NUMERIC)(.*)$/i);
      if (colMatch) {
        expectedColumns.add(colMatch[1]);
      }
    }

    // 1. 补充缺失列
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

    // 2. 删除废弃列（数据库有但 schema 没有）
    for (const colName of existingColumns) {
      if (!expectedColumns.has(colName)) {
        try {
          db.exec(`ALTER TABLE ${tableName} DROP COLUMN ${colName}`);
          console.log(`[DROP] ${tableName}.${colName}`);
          removed++;
        } catch (err) {
          console.log(`[WARN] ${tableName}.${colName} 无法删除: ${err.message}`);
        }
      }
    }
  }

  if (added > 0 || removed > 0) {
    console.log(`[MIGRATE] 新增 ${added} 列, 删除 ${removed} 列`);
  }
}

/**
 * 从 schema.sql 中提取指定列的完整定义（含类型和约束）
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
    const colMatch = cleaned.match(/^([\w\u4e00-\u9fa5]+)\s+(TEXT|INTEGER|REAL|BLOB|NUMERIC)(.*)$/i);
    if (colMatch && cleaned.startsWith(colName)) {
      // SQLite ADD COLUMN 不支持 NOT NULL 无 DEFAULT，去掉它
      let constraints = colMatch[2].trim();
      if (constraints.includes('NOT NULL') && !constraints.includes('DEFAULT')) {
        constraints = constraints.replace('NOT NULL', '').trim();
      }
      return `${colName} ${colMatch[1].toUpperCase()} ${constraints}`.trim();
    }
  }
  return null;
}
