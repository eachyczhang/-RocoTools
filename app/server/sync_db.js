#!/usr/bin/env node
/**
 * 数据同步脚本 - 生成缩略图 + 导入 JSON 到 SQLite
 *
 * 用法：
 *   cd app/server && node sync_db.js
 *
 * 流程：
 *   1. 生成缩略图（WebP）+ 更新 pet_list.json
 *   2. 初始化数据库（建表）
 *   3. 导入数据（JSON → SQLite）
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

console.log('============================================================');
console.log('[SYNC] 数据同步（缩略图 + SQLite）');
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
  { label: '导入数据', script: IMPORT_SCRIPT },
  { label: '清洗技能等级字段', script: NORMALIZE_LEVELS_SCRIPT },
  { label: '同步进化链（多路线合并）', script: EVOLUTION_SCRIPT },
  { label: '同步最终形态标记', script: FINAL_FORMS_SCRIPT },
  { label: '同步默认图鉴课题', script: DEFAULT_ACHIEVEMENTS_SCRIPT },
);

for (const { label, script } of steps) {
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
