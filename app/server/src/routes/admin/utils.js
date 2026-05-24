const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { DB_PATH, DATA_DIR, getDb, getWriteDb } = require('../../db/connection');

const PUBLIC_DIR = path.join(DATA_DIR, 'public');
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');
const LIBRARY_DIR = path.join(DATA_DIR, 'uploads', 'library');

// Optional sharp for image compression (thumbnail + WebP generation)
let sharp;
try { sharp = require('sharp'); } catch (e) { /* sharp not available */ }

/** 校验文件名/uid：只允许字母、数字、下划线、连字符、点 */
function isSafeFilename(name) {
  return /^[a-zA-Z0-9_\-.]+$/.test(name) && !name.includes('..');
}

/** 校验路径是否在预期目录内（防止路径遍历） */
function isPathWithin(filepath, allowedDir) {
  const resolved = path.resolve(filepath);
  const dir = path.resolve(allowedDir);
  return resolved.startsWith(dir + path.sep) || resolved === dir;
}

/**
 * Sync variants_map for a given pet_id
 * Rebuilds the mapping by finding all uids with the same pet_id in pets table
 * @param {object} db - writable database instance (caller is responsible for closing)
 * @param {string} petId - the pet_id to sync
 */
function syncVariantsMap(db, petId) {
  const uids = db.prepare('SELECT uid FROM pets WHERE pet_id = ? ORDER BY uid').all(petId).map(r => r.uid);
  db.prepare('DELETE FROM variants_map WHERE pet_id = ?').run(petId);
  if (uids.length > 0) {
    const insert = db.prepare('INSERT INTO variants_map (pet_id, pet_uid, sort_order) VALUES (?, ?, ?)');
    uids.forEach((uid, i) => insert.run(petId, uid, i));
  }
}

/**
 * Sync evolution_chain to all pets in the chain.
 * When one pet's evolution chain is saved, MERGE the new routes into each target pet's existing chain.
 * This prevents overwriting when different routes are saved separately.
 * Supports both 1D (single route) and 2D (multi-route) formats.
 * @param {object} db - writable database connection
 * @param {string} currentPetUid - the pet_uid that triggered the save
 * @param {string|null} evoChainJson - the evolution_chain JSON string (or null to clear)
 */
function syncEvolutionChain(db, currentPetUid, evoChainJson) {
  if (!evoChainJson) return;

  let chain;
  try {
    chain = JSON.parse(evoChainJson);
  } catch { return; }

  if (!Array.isArray(chain) || chain.length === 0) return;

  // Normalize to 2D array
  let newRoutes;
  if (Array.isArray(chain[0])) {
    newRoutes = chain;
  } else {
    newRoutes = [chain];
  }

  // Collect all unique pet names across all routes
  const allNames = new Set();
  for (const route of newRoutes) {
    if (!Array.isArray(route)) continue;
    for (const stage of route) {
      const name = typeof stage === 'string' ? stage : stage.name;
      if (name) allNames.add(name);
    }
  }

  // Helper: get route signature (ordered names) for deduplication
  function routeSignature(route) {
    return route.map(s => (typeof s === 'string' ? s : s.name) || '').join('→');
  }

  // Find all pet uids in the chain and merge
  const findPet = db.prepare('SELECT uid FROM pets WHERE name = ? LIMIT 1');
  const getDetail = db.prepare('SELECT evolution_chain FROM pet_details WHERE pet_uid = ?');
  const upsertDetail = db.prepare(
    `INSERT INTO pet_details (pet_uid, evolution_chain, manual_edit) VALUES (?, ?, 1)
     ON CONFLICT(pet_uid) DO UPDATE SET evolution_chain = excluded.evolution_chain, manual_edit = 1`
  );

  for (const name of allNames) {
    const match = findPet.get(name);
    if (!match || match.uid === currentPetUid) continue;

    const existing = getDetail.get(match.uid);
    let existingRoutes = [];
    if (existing && existing.evolution_chain) {
      try {
        const parsed = JSON.parse(existing.evolution_chain);
        if (Array.isArray(parsed) && parsed.length > 0) {
          existingRoutes = Array.isArray(parsed[0]) ? parsed : [parsed];
        }
      } catch { /* ignore parse errors */ }
    }

    const existingSigs = new Set(existingRoutes.map(r => routeSignature(r)));
    const merged = [...existingRoutes];
    for (const route of newRoutes) {
      const sig = routeSignature(route);
      if (!existingSigs.has(sig)) {
        merged.push(route);
        existingSigs.add(sig);
      }
    }

    upsertDetail.run(match.uid, JSON.stringify(merged));
  }
}

/** 安全解析 JSON 文件（损坏时返回默认值） */
function safeReadJSON(filepath, fallback = []) {
  try {
    if (!fs.existsSync(filepath)) return fallback;
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (err) {
    console.error(`[ERROR] JSON 解析失败: ${filepath} — ${err.message}`);
    return fallback;
  }
}

/**
 * Natural sort comparator for filenames
 * Handles: Chinese characters (pinyin order), numbers (natural order), suffixes like -1/-2
 */
function naturalCompare(a, b) {
  const re = /(\d+)|(\D+)/g;
  const aParts = a.match(re) || [];
  const bParts = b.match(re) || [];
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    if (i >= aParts.length) return -1;
    if (i >= bParts.length) return 1;
    
    const aIsNum = /^\d+$/.test(aParts[i]);
    const bIsNum = /^\d+$/.test(bParts[i]);
    
    if (aIsNum && bIsNum) {
      const diff = parseInt(aParts[i]) - parseInt(bParts[i]);
      if (diff !== 0) return diff;
    } else if (aIsNum !== bIsNum) {
      return aIsNum ? -1 : 1;
    } else {
      const cmp = aParts[i].localeCompare(bParts[i], 'zh-CN');
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

/**
 * Get the display name from a file entry (strip path prefix and timestamp)
 */
function getDisplayName(file) {
  const basename = (file.filename || '').split('/').pop() || file.filename || '';
  return basename.replace(/^\d+_/, '');
}

/**
 * Sort files array in-place based on sort mode
 * Supported modes: name_asc, name_desc, time_desc, time_asc, size_desc, size_asc
 */
function sortFiles(files, mode) {
  switch (mode) {
    case 'name_asc':
      files.sort((a, b) => naturalCompare(getDisplayName(a), getDisplayName(b)));
      break;
    case 'name_desc':
      files.sort((a, b) => naturalCompare(getDisplayName(b), getDisplayName(a)));
      break;
    case 'time_desc':
      files.sort((a, b) => b.mtime - a.mtime);
      break;
    case 'time_asc':
      files.sort((a, b) => a.mtime - b.mtime);
      break;
    case 'size_desc':
      files.sort((a, b) => (b.size || 0) - (a.size || 0));
      break;
    case 'size_asc':
      files.sort((a, b) => (a.size || 0) - (b.size || 0));
      break;
    default:
      files.sort((a, b) => naturalCompare(getDisplayName(a), getDisplayName(b)));
  }
}

// Multer upload instance
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpeg|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PNG/JPEG/WebP/GIF 格式'));
    }
  },
});

/** Multer error handling wrapper */
function handleUpload(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件过大，最大支持 20MB' });
        }
        return res.status(400).json({ error: err.message || '上传失败' });
      }
      next();
    });
  };
}

// Image type configurations
const IMAGE_TYPES = {
  pet_default: { dir: 'pets/default', suffix: '_default.png' },
  pet_shiny: { dir: 'pets/shiny', suffix: '_shiny.png' },
  pet_fruit: { dir: 'pets/fruit', suffix: '_fruit.png' },
  pet_egg: { dir: 'pets/egg', suffix: '_egg.png' },
  pet_thumb: { dir: 'pets/thumbs', suffix: '_default.webp' },
  pet_ability: { dir: 'pets/abilities', suffix: '_ability.png' },
  season_cover: { dir: 'uploads/seasons', suffix: '_cover.png', isUpload: true },
  event_image: { dir: 'uploads/events', suffix: '.png', isUpload: true },
  pika_concept: { dir: 'uploads/pika', suffix: '_concept.png', isUpload: true },
  pika_locke_male: { dir: 'uploads/pika', suffix: '_locke_male.png', isUpload: true },
  pika_locke_female: { dir: 'uploads/pika', suffix: '_locke_female.png', isUpload: true },
  pika_concept_male: { dir: 'uploads/pika', suffix: '_concept_male.png', isUpload: true },
  pika_concept_female: { dir: 'uploads/pika', suffix: '_concept_female.png', isUpload: true },
  skill_icon: { dir: 'skills/icons', suffix: '.png' },
  element_icon: { dir: 'elements/icons', suffix: '.png' },
};

// Editable tables configuration
const EDITABLE_TABLES = {
  pets: {
    label: '精灵',
    primaryKey: 'uid',
    editableFields: ['pet_id', 'name', 'element_id', 'sub_element_id', 'ability_name', 'ability_desc', 'hp', 'speed', 'atk', 'matk', 'def', 'mdef', 'total', 'version', 'image_url', 'thumb_url', 'is_final_form'],
  },
  skills: {
    label: '技能',
    primaryKey: 'uid',
    editableFields: ['name', 'element_id', 'category', 'cost', 'power', 'description', 'version', 'icon_url'],
  },
  elements: {
    label: '属性',
    primaryKey: 'id',
    editableFields: ['name', 'color', 'icon', 'immunity', 'strong_against', 'resisted_by', 'weak_to', 'resistant_to'],
  },
  natures: {
    label: '性格',
    primaryKey: 'id',
    editableFields: ['name', 'stat_up', 'stat_down'],
  },
  season_events: {
    label: '赛季活动',
    primaryKey: 'id',
    autoIncrement: true,
    editableFields: ['season_id', 'category', 'name', 'sub_type', 'pet_uid', 'pet_name', 'pet_icon', 'start_date', 'end_date', 'periods', 'image', 'row_order'],
  },
  pika_monthlies: {
    label: '皮卡月刊',
    primaryKey: 'id',
    autoIncrement: true,
    editableFields: ['period', 'name', 'pet_uid', 'pet_name', 'pet_icon', 'locke_male', 'locke_female', 'concept_male', 'concept_female', 'start_date', 'end_date'],
  },
  pet_details: {
    label: '精灵详情',
    primaryKey: 'pet_uid',
    editableFields: ['ability_icon', 'image_default', 'image_shiny', 'image_fruit', 'image_egg', 'height', 'weight', 'location', 'evolution_chain'],
  },
  egg_groups: {
    label: '蛋组',
    primaryKey: 'id',
    editableFields: ['name'],
  },
  nav_tabs: {
    label: '用户端导航标签',
    primaryKey: 'id',
    autoIncrement: true,
    editableFields: ['tab_key', 'label', 'route', 'icon', 'parent_key', 'is_visible', 'sort_order'],
  },
  seasons: {
    label: '赛季',
    primaryKey: 'id',
    editableFields: ['name', 'is_current', 'image', 'pass_pets', 'legend_pet', 'season_pets', 'shiny_pets', 'start_date', 'end_date', 'note'],
  },
};

module.exports = {
  sharp,
  PUBLIC_DIR,
  BACKUP_DIR,
  LIBRARY_DIR,
  DB_PATH,
  DATA_DIR,
  getDb,
  getWriteDb,
  isSafeFilename,
  isPathWithin,
  syncVariantsMap,
  syncEvolutionChain,
  safeReadJSON,
  naturalCompare,
  getDisplayName,
  sortFiles,
  handleUpload,
  IMAGE_TYPES,
  EDITABLE_TABLES,
};
