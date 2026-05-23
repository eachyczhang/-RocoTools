const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb, getWriteDb } = require('../../db/connection');
const { sharp, PUBLIC_DIR, DATA_DIR, isSafeFilename, handleUpload, IMAGE_TYPES } = require('./utils');

/**
 * POST /api/admin/upload
 * body: { type: 'pet_default', uid: 'pet_001' }
 * file: 图片文件
 */
router.post('/upload', handleUpload('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  const { type, uid } = req.body;
  if (!type || !uid) return res.status(400).json({ error: '缺少 type 或 uid' });
  if (!isSafeFilename(uid)) return res.status(400).json({ error: 'uid 包含非法字符' });

  const imageConfig = IMAGE_TYPES[type];
  if (!imageConfig) return res.status(400).json({ error: `无效的图片类型: ${type}` });

  const baseDir = imageConfig.isUpload ? DATA_DIR : PUBLIC_DIR;
  const dir = path.join(baseDir, imageConfig.dir);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${uid}${imageConfig.suffix}`;
  const filepath = path.join(dir, filename);
  const publicPath = imageConfig.isUpload
    ? `/uploads/${imageConfig.dir.replace('uploads/', '')}/${filename}`
    : `/public/${imageConfig.dir}/${filename}`;

  fs.writeFileSync(filepath, req.file.buffer);

  // Auto-generate WebP for all PNG image types that have WebP counterparts
  const WEBP_TYPES = ['pet_default', 'pet_shiny', 'pet_fruit', 'pet_egg', 'skill_icon', 'element_icon'];
  let thumbPath = null;
  if (sharp && WEBP_TYPES.includes(type) && filepath.endsWith('.png')) {
    try {
      const webpFilepath = filepath.replace('.png', '.webp');
      await sharp(req.file.buffer).webp({ quality: 80 }).toFile(webpFilepath);

      if (type === 'pet_default') {
        const thumbDir = path.join(PUBLIC_DIR, 'pets', 'thumbs');
        fs.mkdirSync(thumbDir, { recursive: true });
        const thumbFilename = `${uid}_default.webp`;
        const thumbFilepath = path.join(thumbDir, thumbFilename);
        await sharp(req.file.buffer)
          .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 60 })
          .toFile(thumbFilepath);
        thumbPath = `/public/pets/thumbs/${thumbFilename}`;
      }
    } catch (imgErr) {
      console.error(`[WARN] Image compression failed for ${uid}:`, imgErr.message);
    }
  }

  // 更新数据库对应字段
  const fieldMap = {
    pet_default: { table: 'pet_details', field: 'image_default', key: 'pet_uid' },
    pet_shiny: { table: 'pet_details', field: 'image_shiny', key: 'pet_uid' },
    pet_fruit: { table: 'pet_details', field: 'image_fruit', key: 'pet_uid' },
    pet_egg: { table: 'pet_details', field: 'image_egg', key: 'pet_uid' },
    pet_thumb: { table: 'pets', field: 'thumb_url', key: 'uid' },
    pet_ability: { table: 'pet_details', field: 'ability_icon', key: 'pet_uid' },
    season_cover: { table: 'seasons', field: 'image', key: 'id' },
    skill_icon: { table: 'skills', field: 'icon_url', key: 'uid' },
    element_icon: { table: 'elements', field: 'icon', key: 'id' },
  };

  const mapping = fieldMap[type];
  if (mapping) {
    const db = getWriteDb();
    if (mapping.table === 'pet_details') {
      const petExists = db.prepare('SELECT 1 FROM pets WHERE uid = ?').get(uid);
      if (petExists) {
        db.prepare(`INSERT INTO pet_details (pet_uid, ${mapping.field}) VALUES (?, ?) ON CONFLICT(pet_uid) DO UPDATE SET ${mapping.field} = excluded.${mapping.field}`).run(uid, publicPath);
      }
    } else {
      db.prepare(`UPDATE ${mapping.table} SET ${mapping.field} = ? WHERE ${mapping.key} = ?`).run(publicPath, uid);
    }
    if (type === 'pet_default') {
      db.prepare('UPDATE pets SET image_url = ? WHERE uid = ?').run(publicPath, uid);
      if (thumbPath) {
        db.prepare('UPDATE pets SET thumb_url = ? WHERE uid = ?').run(thumbPath, uid);
      }
    }
    db.close();
  } else if (thumbPath && type === 'pet_default') {
    const db = getWriteDb();
    db.prepare('UPDATE pets SET image_url = ?, thumb_url = ? WHERE uid = ?').run(publicPath, thumbPath, uid);
    db.close();
  }

  res.json({ success: true, path: publicPath, thumb_path: thumbPath || undefined });
});

module.exports = router;
