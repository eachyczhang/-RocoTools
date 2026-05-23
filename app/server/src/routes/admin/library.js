const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authAdmin } = require('../../middleware/authAdmin');
const { DATA_DIR } = require('../../db/connection');
const { sharp, LIBRARY_DIR, isSafeFilename, isPathWithin, sortFiles, handleUpload } = require('./utils');

/**
 * POST /api/admin/library/upload
 * 上传图片到素材库，支持 folder 参数指定子目录
 */
router.post('/library/upload', authAdmin, handleUpload('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  let folder = (req.body.folder || '').trim();
  if (folder) {
    folder = folder.replace(/\\/g, '/')
      .replace(/\.\./g, '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim();
  }
  const targetDir = folder ? path.join(LIBRARY_DIR, folder) : LIBRARY_DIR;
  fs.mkdirSync(targetDir, { recursive: true });

  if (!isPathWithin(targetDir, LIBRARY_DIR)) {
    return res.status(400).json({ error: '目标目录非法' });
  }

  const rawName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const ext = path.extname(rawName) || '.png';
  const base = path.basename(rawName, ext).replace(/[^\p{L}\p{N}_\-]/gu, '_');
  
  // Server-side duplicate check
  const existingFiles = fs.readdirSync(targetDir).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
  const duplicateFile = existingFiles.find(f => {
    const existingBase = f.replace(/^\d+_/, '');
    const newBase = `${base}${ext}`;
    return existingBase === newBase;
  });
  
  if (duplicateFile) {
    const existingPath = folder 
      ? `/uploads/library/${folder}/${duplicateFile}`
      : `/uploads/library/${duplicateFile}`;
    return res.json({ 
      success: true, 
      path: existingPath, 
      filename: duplicateFile, 
      skipped: true,
      message: '文件已存在，跳过上传'
    });
  }

  const filename = `${Date.now()}_${base}${ext}`;
  const filepath = path.join(targetDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);

  // Generate thumbnail for library browsing (200px WebP)
  let thumbRelPath = null;
  if (sharp && /\.(png|jpe?g|gif)$/i.test(ext)) {
    try {
      const thumbDir = folder ? path.join(LIBRARY_DIR, '.thumbs', folder) : path.join(LIBRARY_DIR, '.thumbs');
      fs.mkdirSync(thumbDir, { recursive: true });
      const thumbFilename = filename.replace(/\.[^.]+$/, '.webp');
      const thumbPath = path.join(thumbDir, thumbFilename);
      await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(thumbPath);
      thumbRelPath = folder
        ? `/uploads/library/.thumbs/${folder}/${thumbFilename}`
        : `/uploads/library/.thumbs/${thumbFilename}`;
    } catch (e) {
      console.error('[WARN] Library thumbnail generation failed:', e.message);
    }
  }

  const relativePath = folder ? `/uploads/library/${folder}/${filename}` : `/uploads/library/${filename}`;
  res.json({ success: true, path: relativePath, filename, thumb_path: thumbRelPath || relativePath });
});

/**
 * GET /api/admin/library
 * 获取素材库图片列表（递归扫描子目录）
 */
router.get('/library', authAdmin, (req, res) => {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  const files = [];
  const directory = (req.query.directory || '').trim();

  function scanLibrary(dir, prefix) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.thumbs') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanLibrary(fullPath, prefix + entry.name + '/');
      } else if (/\.(png|jpe?g|webp|gif)$/i.test(entry.name)) {
        const stat = fs.statSync(fullPath);
        const thumbFilename = entry.name.replace(/\.[^.]+$/, '.webp');
        const thumbDir = path.join(LIBRARY_DIR, '.thumbs', prefix);
        const thumbFullPath = path.join(thumbDir, thumbFilename);
        const thumbPath = fs.existsSync(thumbFullPath)
          ? `/uploads/library/.thumbs/${prefix}${thumbFilename}`
          : null;
        files.push({
          filename: prefix + entry.name,
          path: `/uploads/library/${prefix}${entry.name}`,
          thumb_path: thumbPath || `/uploads/library/${prefix}${entry.name}`,
          size: stat.size,
          mtime: stat.mtimeMs,
        });
      }
    }
  }

  const recursive = req.query.recursive === 'true';
  
  if (directory) {
    const targetDir = path.join(LIBRARY_DIR, directory);
    if (fs.existsSync(targetDir) && isPathWithin(targetDir, LIBRARY_DIR)) {
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.thumbs') continue;
        if (!entry.isDirectory() && /\.(png|jpe?g|webp|gif)$/i.test(entry.name)) {
          const fullPath = path.join(targetDir, entry.name);
          const stat = fs.statSync(fullPath);
          const prefix = directory + '/';
          const thumbFilename = entry.name.replace(/\.[^.]+$/, '.webp');
          const thumbDir = path.join(LIBRARY_DIR, '.thumbs', prefix);
          const thumbFullPath = path.join(thumbDir, thumbFilename);
          const thumbPath = fs.existsSync(thumbFullPath)
            ? `/uploads/library/.thumbs/${prefix}${thumbFilename}`
            : null;
          files.push({
            filename: prefix + entry.name,
            path: `/uploads/library/${prefix}${entry.name}`,
            thumb_path: thumbPath || `/uploads/library/${prefix}${entry.name}`,
            size: stat.size,
            mtime: stat.mtimeMs,
          });
        }
      }
    }
  } else if (recursive) {
    scanLibrary(LIBRARY_DIR, '');
  } else {
    const entries = fs.readdirSync(LIBRARY_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.thumbs') continue;
      if (!entry.isDirectory() && /\.(png|jpe?g|webp|gif)$/i.test(entry.name)) {
        const fullPath = path.join(LIBRARY_DIR, entry.name);
        const stat = fs.statSync(fullPath);
        const thumbFilename = entry.name.replace(/\.[^.]+$/, '.webp');
        const thumbDir = path.join(LIBRARY_DIR, '.thumbs');
        const thumbFullPath = path.join(thumbDir, thumbFilename);
        const thumbPath = fs.existsSync(thumbFullPath)
          ? `/uploads/library/.thumbs/${thumbFilename}`
          : null;
        files.push({
          filename: entry.name,
          path: `/uploads/library/${entry.name}`,
          thumb_path: thumbPath || `/uploads/library/${entry.name}`,
          size: stat.size,
          mtime: stat.mtimeMs,
        });
      }
    }
  }

  const sortMode = (req.query.sort || 'name_asc').trim();
  sortFiles(files, sortMode);
  
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
    totalPages: Math.ceil(files.length / pageSize)
  });
});

// ============================================================
// 素材库目录管理接口
// ============================================================

/**
 * GET /api/admin/library/directories
 * 获取素材库目录结构
 */
router.get('/library/directories', authAdmin, (req, res) => {
  function scanDirectories(dir, prefix = '') {
    const directories = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== '.thumbs') {
        const fullPath = prefix ? prefix + '/' + entry.name : entry.name;
        const subDir = path.join(dir, entry.name);
        const children = scanDirectories(subDir, fullPath);
        directories.push({
          name: entry.name,
          path: fullPath,
          children: children
        });
      }
    }
    return directories;
  }
  
  const result = scanDirectories(LIBRARY_DIR);
  res.json({ directories: result });
});

/**
 * POST /api/admin/library/directories
 * 创建新目录
 */
router.post('/library/directories', authAdmin, (req, res) => {
  const { path: dirPath } = req.body;
  if (!dirPath) return res.status(400).json({ error: '缺少路径参数' });
  
  const safePath = dirPath.replace(/\\/g, '/')
    .replace(/\.\./g, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
  
  if (!safePath) return res.status(400).json({ error: '路径非法' });
  
  const targetDir = path.join(LIBRARY_DIR, safePath);
  
  if (!isPathWithin(targetDir, LIBRARY_DIR)) {
    return res.status(400).json({ error: '路径非法' });
  }
  
  if (fs.existsSync(targetDir)) {
    return res.status(409).json({ error: '目录已存在' });
  }
  
  fs.mkdirSync(targetDir, { recursive: true });
  res.json({ success: true, path: safePath });
});

/**
 * PUT /api/admin/library/directories
 * 重命名目录
 */
router.put('/library/directories', authAdmin, (req, res) => {
  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) return res.status(400).json({ error: '缺少参数' });
  
  const normalizedOldPath = oldPath.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+|\/+$/g, '');
  const safeNewName = newName.replace(/[\/\\]/g, '_').replace(/\.\./g, '').trim();
  
  if (!normalizedOldPath || !safeNewName) return res.status(400).json({ error: '参数非法' });
  
  const oldDir = path.join(LIBRARY_DIR, normalizedOldPath);
  const parentDir = path.dirname(oldDir);
  const newDir = path.join(parentDir, safeNewName);
  
  if (!isPathWithin(oldDir, LIBRARY_DIR) || !isPathWithin(newDir, LIBRARY_DIR)) {
    return res.status(400).json({ error: '路径非法' });
  }
  
  if (!fs.existsSync(oldDir)) {
    return res.status(404).json({ error: '原目录不存在' });
  }
  
  if (fs.existsSync(newDir)) {
    return res.status(409).json({ error: '新目录名已存在' });
  }
  
  fs.renameSync(oldDir, newDir);
  
  const oldThumbDir = path.join(LIBRARY_DIR, '.thumbs', normalizedOldPath);
  const parentThumbPath = path.dirname(normalizedOldPath);
  const newThumbDir = path.join(LIBRARY_DIR, '.thumbs', parentThumbPath === '.' ? '' : parentThumbPath, safeNewName);
  if (fs.existsSync(oldThumbDir)) {
    fs.mkdirSync(path.dirname(newThumbDir), { recursive: true });
    fs.renameSync(oldThumbDir, newThumbDir);
  }
  
  const newPath = parentThumbPath === '.' ? safeNewName : parentThumbPath + '/' + safeNewName;
  res.json({ success: true, newPath });
});

/**
 * POST /api/admin/library/directories/delete
 * 删除目录
 */
router.post('/library/directories/delete', authAdmin, async (req, res) => {
  try {
    const { path: dirPath } = req.body || {};
    if (!dirPath) return res.status(400).json({ error: '缺少路径参数' });
    
    const normalizedPath = dirPath.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+|\/+$/g, '');
    if (!normalizedPath) return res.status(400).json({ error: '路径非法' });
    
    let targetDir = path.join(LIBRARY_DIR, normalizedPath);
    
    if (!isPathWithin(targetDir, LIBRARY_DIR)) {
      return res.status(400).json({ error: '路径非法' });
    }
    
    if (!fs.existsSync(targetDir)) {
      const parts = normalizedPath.split('/');
      const dirName = parts.pop();
      const parentPath = parts.length > 0 ? path.join(LIBRARY_DIR, parts.join('/')) : LIBRARY_DIR;
      
      if (!fs.existsSync(parentPath)) {
        return res.status(404).json({ error: '父目录不存在' });
      }
      
      const entries = fs.readdirSync(parentPath, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory() && e.name !== '.thumbs');
      
      const found = dirs.find(e => 
        e.name === dirName ||
        e.name.normalize('NFC') === dirName.normalize('NFC') ||
        e.name.normalize('NFD') === dirName.normalize('NFD') ||
        e.name.trim() === dirName.trim()
      );
      
      if (found) {
        targetDir = path.join(parentPath, found.name);
      } else {
        return res.status(404).json({ error: '目录不存在' });
      }
    }
    
    if (!isPathWithin(targetDir, LIBRARY_DIR)) {
      return res.status(400).json({ error: '路径非法(安全检查)' });
    }
    
    await fs.promises.rm(targetDir, { recursive: true, force: true });
    
    const thumbDir = path.join(LIBRARY_DIR, '.thumbs', normalizedPath);
    if (fs.existsSync(thumbDir)) {
      await fs.promises.rm(thumbDir, { recursive: true, force: true });
    }
    
    res.json({ success: true });
  } catch (error) {
    const safeMsg = (error.code || '') + ' ' + (error.message || '').replace(/[^\x20-\x7E]/g, '?');
    res.status(500).json({ error: '删除目录失败：' + safeMsg });
  }
});

/**
 * DELETE /api/admin/library/:filename
 * 删除素材库图片
 */
router.delete('/library/:filename', authAdmin, (req, res) => {
  const { filename } = req.params;
  if (!isSafeFilename(filename)) return res.status(400).json({ error: '非法文件名' });
  const filepath = path.join(LIBRARY_DIR, filename);
  if (!isPathWithin(filepath, LIBRARY_DIR)) return res.status(400).json({ error: '路径非法' });
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: '文件不存在' });
  fs.unlinkSync(filepath);

  const thumbFilename = filename.replace(/\.[^.]+$/, '.webp');
  const thumbPath = path.join(LIBRARY_DIR, '.thumbs', thumbFilename);
  if (fs.existsSync(thumbPath)) {
    try { fs.unlinkSync(thumbPath); } catch (e) { /* ignore */ }
  }

  res.json({ success: true });
});

/**
 * POST /api/admin/library/batch-rename
 * 批量重命名文件
 */
router.post('/library/batch-rename', authAdmin, (req, res) => {
  const { operations } = req.body;
  if (!Array.isArray(operations) || operations.length === 0) {
    return res.status(400).json({ error: '缺少重命名操作列表' });
  }
  
  const results = [];
  
  for (const op of operations) {
    const { oldPath, newName } = op;
    if (!oldPath || !newName) {
      results.push({ oldPath, success: false, error: '缺少参数' });
      continue;
    }
    
    const safeOldPath = oldPath.replace(/\\/g, '/').replace(/[^\p{L}\p{N}_\-\/\.]/gu, '_');
    const safeNewName = newName.replace(/[^\p{L}\p{N}_\-\.]/gu, '_');
    
    const oldFilePath = path.join(LIBRARY_DIR, safeOldPath);
    const parentDir = path.dirname(oldFilePath);
    const newFilePath = path.join(parentDir, safeNewName);
    
    if (!isPathWithin(oldFilePath, LIBRARY_DIR) || !isPathWithin(newFilePath, LIBRARY_DIR)) {
      results.push({ oldPath, success: false, error: '路径非法' });
      continue;
    }
    
    if (!fs.existsSync(oldFilePath)) {
      results.push({ oldPath, success: false, error: '文件不存在' });
      continue;
    }
    
    if (fs.existsSync(newFilePath)) {
      results.push({ oldPath, success: false, error: '新文件名已存在' });
      continue;
    }
    
    try {
      fs.renameSync(oldFilePath, newFilePath);
      
      const oldThumbPath = oldFilePath.replace(LIBRARY_DIR, path.join(LIBRARY_DIR, '.thumbs')).replace(/\.[^.]+$/, '.webp');
      const newThumbPath = newFilePath.replace(LIBRARY_DIR, path.join(LIBRARY_DIR, '.thumbs')).replace(/\.[^.]+$/, '.webp');
      if (fs.existsSync(oldThumbPath)) {
        fs.renameSync(oldThumbPath, newThumbPath);
      }
      
      results.push({ oldPath, success: true, newPath: path.join(path.dirname(safeOldPath), safeNewName) });
    } catch (error) {
      results.push({ oldPath, success: false, error: error.message });
    }
  }
  
  res.json({ results });
});

module.exports = router;
