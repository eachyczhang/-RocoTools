const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authAdmin } = require('../../middleware/authAdmin');
const { getDb, getWriteDb, DATA_DIR } = require('../../db/connection');
const { sharp, PUBLIC_DIR, LIBRARY_DIR, isSafeFilename, isPathWithin, sortFiles, handleUpload, IMAGE_TYPES } = require('./utils');

/**
 * GET /api/admin/media
 * List all images across all directories (library + uploads + public)
 * Query params: page, pageSize, category
 */
router.get('/media', authAdmin, (req, res) => {
  const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
  const files = [];

  function scanDir(baseDir, urlPrefix) {
    if (!fs.existsSync(baseDir)) return;
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(baseDir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, urlPrefix + '/' + entry.name);
      } else if (IMAGE_EXT.test(entry.name)) {
        try {
          const stat = fs.statSync(fullPath);
          
          let thumbPath = null;
          
          if (urlPrefix.startsWith('/uploads/library')) {
            const thumbFilename = entry.name.replace(/\.[^.]+$/, '.webp');
            const relativePath = fullPath.replace(LIBRARY_DIR, '').replace(/^[\\\/]/, '');
            const thumbFullPath = path.join(LIBRARY_DIR, '.thumbs', relativePath.replace(/\.[^.]+$/, '.webp'));
            if (fs.existsSync(thumbFullPath)) {
              thumbPath = `/uploads/library/.thumbs/${relativePath.replace(/\.[^.]+$/, '.webp')}`;
            }
          } else if (urlPrefix.startsWith('/public/pets/thumbs')) {
            thumbPath = urlPrefix + '/' + entry.name;
          } else if (urlPrefix.startsWith('/public/pets/') && !urlPrefix.includes('/thumbs')) {
            const thumbDir = path.join(PUBLIC_DIR, 'pets', 'thumbs');
            const uid = entry.name.replace(/_.*\.png$/, '');
            const thumbFilename = `${uid}_default.webp`;
            const thumbFullPath = path.join(thumbDir, thumbFilename);
            if (fs.existsSync(thumbFullPath)) {
              thumbPath = `/public/pets/thumbs/${thumbFilename}`;
            }
          } else if (urlPrefix.startsWith('/public/skills/')) {
            const webpPath = fullPath.replace('.png', '.webp');
            if (fs.existsSync(webpPath)) {
              thumbPath = urlPrefix + '/' + entry.name.replace('.png', '.webp');
            }
          } else if (urlPrefix.startsWith('/public/elements/')) {
            const webpPath = fullPath.replace('.png', '.webp');
            if (fs.existsSync(webpPath)) {
              thumbPath = urlPrefix + '/' + entry.name.replace('.png', '.webp');
            }
          } else if (urlPrefix.startsWith('/uploads/') && !urlPrefix.includes('/library')) {
            const webpPath = fullPath.replace(/\.(png|jpe?g|gif)$/i, '.webp');
            if (fs.existsSync(webpPath)) {
              thumbPath = urlPrefix + '/' + entry.name.replace(/\.(png|jpe?g|gif)$/i, '.webp');
            }
          }
          
          files.push({
            filename: entry.name,
            fullPath: urlPrefix + '/' + entry.name,
            url: urlPrefix + '/' + entry.name,
            thumb_path: thumbPath || urlPrefix + '/' + entry.name,
            size: stat.size,
            mtime: stat.mtimeMs,
          });
        } catch (e) { /* skip unreadable files */ }
      }
    }
  }

  const category = req.query.category || 'all';
  const uploadsDir = path.join(DATA_DIR, 'uploads');

  if (category === 'all' || category === 'library' || category === 'pika' || category === 'seasons' || category === 'events') {
    if (category === 'all') {
      scanDir(uploadsDir, '/uploads');
    } else if (category === 'library') {
      const libDir = path.join(uploadsDir, 'library');
      if (fs.existsSync(libDir)) scanDir(libDir, '/uploads/library');
    } else if (category === 'pika') {
      const pikaDir = path.join(uploadsDir, 'pika');
      if (fs.existsSync(pikaDir)) scanDir(pikaDir, '/uploads/pika');
    } else if (category === 'seasons') {
      const seasonsDir = path.join(uploadsDir, 'seasons');
      if (fs.existsSync(seasonsDir)) scanDir(seasonsDir, '/uploads/seasons');
    } else if (category === 'events') {
      const eventsDir = path.join(uploadsDir, 'events');
      if (fs.existsSync(eventsDir)) scanDir(eventsDir, '/uploads/events');
    }
  }

  if (category === 'all' || category === 'pets' || category === 'skills' || category === 'elements') {
    if (category === 'all') {
      scanDir(PUBLIC_DIR, '/public');
    } else if (category === 'pets') {
      const petsDir = path.join(PUBLIC_DIR, 'pets');
      const subCategory = req.query.subCategory || 'all';
      if (subCategory === 'all') {
        if (fs.existsSync(petsDir)) scanDir(petsDir, '/public/pets');
      } else {
        const subDirMap = {
          'default': 'default',
          'thumb': 'thumbs',
          'shiny': 'shiny',
          'fruit': 'fruit',
          'egg': 'egg',
          'ability': 'abilities',
        };
        const subDir = subDirMap[subCategory];
        if (subDir) {
          const targetDir = path.join(petsDir, subDir);
          if (fs.existsSync(targetDir)) scanDir(targetDir, '/public/pets/' + subDir);
        } else {
          if (fs.existsSync(petsDir)) {
            const knownDirs = new Set(['default', 'thumbs', 'shiny', 'fruit', 'egg', 'abilities']);
            const entries = fs.readdirSync(petsDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory() && !knownDirs.has(entry.name)) {
                scanDir(path.join(petsDir, entry.name), '/public/pets/' + entry.name);
              }
            }
            const rootFiles = fs.readdirSync(petsDir, { withFileTypes: true });
            for (const entry of rootFiles) {
              if (!entry.isDirectory() && /\.(png|jpe?g|webp|gif)$/i.test(entry.name)) {
                try {
                  const fullPath = path.join(petsDir, entry.name);
                  const stat = fs.statSync(fullPath);
                  files.push({
                    filename: entry.name,
                    fullPath: '/public/pets/' + entry.name,
                    url: '/public/pets/' + entry.name,
                    thumb_path: '/public/pets/' + entry.name,
                    size: stat.size,
                    mtime: stat.mtimeMs,
                  });
                } catch (e) { /* skip */ }
              }
            }
          }
        }
      }
    } else if (category === 'skills') {
      const skillsDir = path.join(PUBLIC_DIR, 'skills');
      if (fs.existsSync(skillsDir)) scanDir(skillsDir, '/public/skills');
    } else if (category === 'elements') {
      const elementsDir = path.join(PUBLIC_DIR, 'elements');
      if (fs.existsSync(elementsDir)) scanDir(elementsDir, '/public/elements');
    }
  }

  const sortMode = (req.query.sort || 'name_asc').trim();
  sortFiles(files, sortMode);

  let categoryCounts = null;
  if (category !== 'all') {
    categoryCounts = { [category]: files.length };
  }

  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 24;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedFiles = files.slice(startIndex, endIndex);

  res.json({ 
    files: paginatedFiles, 
    total: files.length,
    page,
    pageSize,
    totalPages: Math.ceil(files.length / pageSize),
    categoryCounts
  });
});

/**
 * DELETE /api/admin/media
 * Delete an image by its full path
 */
router.delete('/media', authAdmin, (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: '缺少 path 参数' });

  let absolutePath;
  if (filePath.startsWith('/uploads/')) {
    absolutePath = path.join(DATA_DIR, filePath);
  } else if (filePath.startsWith('/public/')) {
    absolutePath = path.join(DATA_DIR, filePath);
  } else {
    return res.status(400).json({ error: '不支持的路径前缀' });
  }

  const resolved = path.resolve(absolutePath);
  const dataResolved = path.resolve(DATA_DIR);
  if (!resolved.startsWith(dataResolved)) {
    return res.status(400).json({ error: '路径非法' });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  fs.unlinkSync(resolved);
  res.json({ success: true });
});

/**
 * POST /api/admin/media/copy-to-business
 * Copy a library image to a business directory with proper naming
 */
router.post('/media/copy-to-business', authAdmin, async (req, res) => {
  const { source, type, uid } = req.body;
  if (!source || !type || !uid) return res.status(400).json({ error: '缺少 source/type/uid 参数' });
  if (!isSafeFilename(uid)) return res.status(400).json({ error: 'uid 包含非法字符' });

  const imageConfig = IMAGE_TYPES[type];
  if (!imageConfig) return res.status(400).json({ error: '无效的图片类型: ' + type });

  let sourcePath;
  if (source.startsWith('/uploads/')) {
    sourcePath = path.join(DATA_DIR, source);
  } else if (source.startsWith('/public/')) {
    sourcePath = path.join(DATA_DIR, source);
  } else {
    return res.status(400).json({ error: '不支持的源路径' });
  }

  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: '源文件不存在' });
  }

  const baseDir = imageConfig.isUpload ? DATA_DIR : PUBLIC_DIR;
  const dir = path.join(baseDir, imageConfig.dir);
  fs.mkdirSync(dir, { recursive: true });

  const filename = uid + imageConfig.suffix;
  const destPath = path.join(dir, filename);
  const publicPath = imageConfig.isUpload
    ? '/uploads/' + imageConfig.dir.replace('uploads/', '') + '/' + filename
    : '/public/' + imageConfig.dir + '/' + filename;

  fs.copyFileSync(sourcePath, destPath);

  const WEBP_TYPES = ['pet_default', 'pet_shiny', 'pet_fruit', 'pet_egg', 'skill_icon', 'element_icon'];
  let thumbPath = null;
  if (sharp && WEBP_TYPES.includes(type) && destPath.endsWith('.png')) {
    try {
      const imgBuffer = fs.readFileSync(destPath);
      const webpPath = destPath.replace('.png', '.webp');
      await sharp(imgBuffer).webp({ quality: 80 }).toFile(webpPath);

      if (type === 'pet_default') {
        const thumbDir = path.join(PUBLIC_DIR, 'pets', 'thumbs');
        fs.mkdirSync(thumbDir, { recursive: true });
        const thumbFilename = uid + '_default.webp';
        const thumbFilepath = path.join(thumbDir, thumbFilename);
        await sharp(imgBuffer)
          .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 60 })
          .toFile(thumbFilepath);
        thumbPath = '/public/pets/thumbs/' + thumbFilename;
      }
    } catch (imgErr) {
      console.error('[WARN] Image compression failed for ' + uid + ':', imgErr.message);
    }
  }

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
        db.prepare('INSERT INTO pet_details (pet_uid, ' + mapping.field + ') VALUES (?, ?) ON CONFLICT(pet_uid) DO UPDATE SET ' + mapping.field + ' = excluded.' + mapping.field).run(uid, publicPath);
      }
    } else {
      db.prepare('UPDATE ' + mapping.table + ' SET ' + mapping.field + ' = ? WHERE ' + mapping.key + ' = ?').run(publicPath, uid);
    }
    if (thumbPath && type === 'pet_default') {
      db.prepare('UPDATE pets SET thumb_url = ? WHERE uid = ?').run(thumbPath, uid);
    }
    db.close();
  } else if (thumbPath && type === 'pet_default') {
    const db = getWriteDb();
    db.prepare('UPDATE pets SET thumb_url = ? WHERE uid = ?').run(thumbPath, uid);
    db.close();
  }

  res.json({ success: true, path: publicPath, thumb_path: thumbPath || undefined });
});

module.exports = router;
