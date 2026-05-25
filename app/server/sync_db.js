#!/usr/bin/env node
/**
 * 数据同步脚本 - 生成缩略图 + 导入 JSON 到 SQLite
 *
 * 用法：
 *   node sync_db.js           # 默认：只建表/补列，不导入数据（安全，不覆盖手动改动）
 *   node sync_db.js --full    # 完整流程：建表 + 导入数据 + 所有后处理步骤
 *
 * 流程：
 *   1. 生成缩略图（WebP）+ 更新 pet_list.json
 *   2. 初始化数据库（建表/补列）
 *   3. 导入数据（JSON → SQLite）  ← 仅 --full 时执行
 *
 * 前置条件：
 *   npm install
 */

const path = require('path');
const { execSync } = require('child_process');

const SERVER_DIR = __dirname;
const THUMB_SCRIPT = path.join(SERVER_DIR, 'gen_thumbnails.js');
const WEBP_SCRIPT = path.join(SERVER_DIR, 'gen_webp.js');
const INIT_SCRIPT = path.join(SERVER_DIR, 'src', 'db', 'init.js');
const IMPORT_SCRIPT = path.join(SERVER_DIR, 'src', 'db', 'import.js');
const EVOLUTION_SCRIPT = path.join(SERVER_DIR, 'scripts', 'sync-evolution-chains.js');
const NORMALIZE_LEVELS_SCRIPT = path.join(SERVER_DIR, 'scripts', 'normalize-skill-levels.js');
const FINAL_FORMS_SCRIPT = path.join(SERVER_DIR, 'scripts', 'sync-final-forms.js');
const DEFAULT_ACHIEVEMENTS_SCRIPT = path.join(SERVER_DIR, 'scripts', 'sync-default-achievements.js');
const MIGRATE_HEIGHT_WEIGHT_SCRIPT = path.join(SERVER_DIR, 'scripts', 'migrate-height-weight.js');
const MIGRATE_SHOW_SHINY_SCRIPT = path.join(SERVER_DIR, 'scripts', 'migrate-show-shiny.js');

// CLI flags
// 默认跳过导入，只有显式传 --full 才执行完整流程
const WITH_IMPORT = process.argv.includes('--full');

console.log('============================================================');
console.log('[SYNC] 数据同步（缩略图 + SQLite）');
console.log(`[SYNC] 模式: ${WITH_IMPORT ? '--full（完整导入）' : '默认（只建表/补列，不导入数据）'}`);
console.log('============================================================');
console.log();

// 检查 sharp 是否可用
let hasSharp = false;
try {
  require.resolve('sharp');
  hasSharp = true;
} catch (e) {
  // sharp 不可用
}

const steps = [];

if (hasSharp) {
  steps.push({ label: '生成缩略图 + 更新 JSON', script: THUMB_SCRIPT });
  steps.push({ label: '生成 WebP 副本（全部图片）', script: WEBP_SCRIPT });
} else {
  console.log('[WARN] sharp 未安装，跳过缩略图和 WebP 生成（npm install sharp）');
  console.log();
}

steps.push(
  { label: '初始化数据库（建表）', script: INIT_SCRIPT },
  { label: '导入数据', script: IMPORT_SCRIPT, skipOnNoImport: true },
  { label: '迁移 show_shiny 列', script: MIGRATE_SHOW_SHINY_SCRIPT, skipOnNoImport: true },
  { label: '规范化身高体重数据', script: MIGRATE_HEIGHT_WEIGHT_SCRIPT, skipOnNoImport: true },
  { label: '清洗技能等级字段', script: NORMALIZE_LEVELS_SCRIPT, skipOnNoImport: true },
  { label: '同步进化链（多路线合并）', script: EVOLUTION_SCRIPT, skipOnNoImport: true },
  { label: '同步最终形态标记', script: FINAL_FORMS_SCRIPT, skipOnNoImport: true },
  { label: '同步默认图鉴课题', script: DEFAULT_ACHIEVEMENTS_SCRIPT, skipOnNoImport: true },
);

for (const { label, script, skipOnNoImport } of steps) {
  if (!WITH_IMPORT && skipOnNoImport) {
    console.log(`[SKIP] ${label}`);
    continue;
  }
  console.log(`[SYNC] ${label}...`);
  try {
    execSync(`node "${script}"`, { cwd: SERVER_DIR, stdio: 'inherit' });
  } catch (err) {
    console.error(`[SYNC] ${label} 失败`);
    process.exit(1);
  }
  console.log();
}

console.log('[SYNC] 全部完成！');
console.log(`[SYNC] 数据库位置: ${path.join(SERVER_DIR, 'data', 'roco.db')}`);
