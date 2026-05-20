#!/usr/bin/env node
/**
 * 生成精灵缩略图 + 更新 pet_list.json
 *
 * 功能：
 *   1. 将 data/public/pets/default/ 下的大立绘压缩为 128px WebP 缩略图
 *   2. 输出到 data/public/pets/thumbs/
 *   3. 更新 data/pets/pet_list.json，为每个精灵写入 thumb_url 字段
 *
 * 用法：
 *   cd app/server && node gen_thumbnails.js
 *
 * 依赖：
 *   npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SRC_DIR = path.join(DATA_DIR, 'public', 'pets', 'default');
const OUT_DIR = path.join(DATA_DIR, 'public', 'pets', 'thumbs');
const PET_LIST_PATH = path.join(DATA_DIR, 'pets', 'pet_list.json');

const THUMB_SIZE = 128;
const QUALITY = 60;

async function main() {
  console.log('============================================================');
  console.log('[THUMB] 生成精灵缩略图');
  console.log('============================================================');

  if (!fs.existsSync(SRC_DIR)) {
    console.error(`[ERROR] 源目录不存在: ${SRC_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.png'));
  console.log(`[INFO] 共 ${files.length} 张原图`);

  // ---- 1. 生成缩略图 ----
  let done = 0, skipped = 0, failed = 0;
  const thumbMap = {}; // uid -> thumb_url

  for (const file of files) {
    const src = path.join(SRC_DIR, file);
    const outName = file.replace('.png', '.webp');
    const out = path.join(OUT_DIR, outName);

    // uid: pet_002_default.png -> pet_002
    const uid = file.replace('_default.png', '');
    thumbMap[uid] = `/public/pets/thumbs/${outName}`;

    // 增量：跳过已生成且未过期的
    if (fs.existsSync(out)) {
      const srcStat = fs.statSync(src);
      const outStat = fs.statSync(out);
      if (outStat.mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        continue;
      }
    }

    try {
      await sharp(src)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: QUALITY })
        .toFile(out);
      done++;
    } catch (err) {
      console.error(`[FAIL] ${file}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[THUMB] 生成: ${done}, 跳过(已存在): ${skipped}, 失败: ${failed}`);

  // 大小统计
  const srcTotal = files.reduce((sum, f) => sum + fs.statSync(path.join(SRC_DIR, f)).size, 0);
  const outFiles = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webp'));
  const outTotal = outFiles.reduce((sum, f) => sum + fs.statSync(path.join(OUT_DIR, f)).size, 0);
  console.log(`[THUMB] 原图: ${(srcTotal / 1024 / 1024).toFixed(1)}MB → 缩略图: ${(outTotal / 1024 / 1024).toFixed(1)}MB (${((1 - outTotal / srcTotal) * 100).toFixed(0)}% 压缩)`);

  // ---- 2. 更新 pet_list.json ----
  if (!fs.existsSync(PET_LIST_PATH)) {
    console.log('[WARN] pet_list.json 不存在，跳过更新');
    return;
  }

  const petList = JSON.parse(fs.readFileSync(PET_LIST_PATH, 'utf-8'));
  let updated = 0;

  for (const pet of petList) {
    const thumbUrl = thumbMap[pet.uid];
    if (thumbUrl && pet.thumb_url !== thumbUrl) {
      pet.thumb_url = thumbUrl;
      updated++;
    }
  }

  fs.writeFileSync(PET_LIST_PATH, JSON.stringify(petList, null, 2), 'utf-8');
  console.log(`[THUMB] 更新 pet_list.json: ${updated} 条写入 thumb_url`);
  console.log('[THUMB] 完成！');
}

main().catch(console.error);
