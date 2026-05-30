const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authAdmin } = require('../../middleware/authAdmin');
const { getDb, getWriteDb, DATA_DIR } = require('../../db/connection');
const { handleUpload } = require('./utils');
const { elementOrderSql } = require('../../constants/elementOrder');

/**
 * Normalize level field: extract pure number from "LV15", "Lv.20" etc.
 */
function normalizeLevel(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (/^\d+$/.test(str)) return str;
  const match = str.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num > 0 && num <= 100) return String(num);
  }
  return null;
}

/**
 * GET /api/admin/abilities
 * Aggregate abilities from pets table for autocomplete
 */
router.get('/abilities', authAdmin, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        p.ability_name AS name,
        p.ability_desc AS description,
        pd.ability_icon AS icon,
        COUNT(*) AS pet_count
      FROM pets p
      LEFT JOIN pet_details pd ON pd.pet_uid = p.uid
      WHERE p.ability_name IS NOT NULL AND p.ability_name != ''
      GROUP BY p.ability_name
      ORDER BY pet_count DESC, p.ability_name ASC
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('[Abilities]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/abilities/:name
 * Get ability detail with all pets that have this ability
 */
router.get('/abilities/:name', authAdmin, (req, res) => {
  try {
    const db = getDb();
    const abilityName = decodeURIComponent(req.params.name);
    const pets = db.prepare(`
      SELECT p.uid, p.name, p.pet_id, p.element_id, p.ability_name, p.ability_desc,
             pd.ability_icon, p.thumb_url, p.image_url,
             e.name AS element_name, e.icon AS element_icon
      FROM pets p
      LEFT JOIN pet_details pd ON pd.pet_uid = p.uid
      LEFT JOIN elements e ON e.id = p.element_id
      WHERE p.ability_name = ?
      ORDER BY p.name ASC
    `).all(abilityName);

    if (pets.length === 0) {
      return res.status(404).json({ error: '特性不存在' });
    }

    const first = pets[0];
    res.json({
      name: abilityName,
      description: first.ability_desc || '',
      icon: first.ability_icon || '',
      pet_count: pets.length,
      pets: pets.map(p => ({
        uid: p.uid,
        name: p.name,
        pet_id: p.pet_id,
        element_name: p.element_name,
        element_icon: p.element_icon,
        thumb_url: p.thumb_url || p.image_url,
      })),
    });
  } catch (err) {
    console.error('[Abilities Detail]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/abilities/:name
 * Update ability: rename, change description, change icon
 */
router.put('/abilities/:name', authAdmin, (req, res) => {
  try {
    const db = getWriteDb();
    const abilityName = decodeURIComponent(req.params.name);
    const { newName, description, icon } = req.body;

    const exists = db.prepare(`SELECT COUNT(*) AS cnt FROM pets WHERE ability_name = ?`).get(abilityName);
    if (!exists || exists.cnt === 0) {
      return res.status(404).json({ error: '特性不存在' });
    }

    const updates = [];

    if (newName && newName !== abilityName) {
      const conflict = db.prepare(`SELECT COUNT(*) AS cnt FROM pets WHERE ability_name = ?`).get(newName);
      if (conflict && conflict.cnt > 0) {
        return res.status(409).json({ error: '目标特性名称已存在，请使用合并功能或选择其他名称' });
      }
      db.prepare(`UPDATE pets SET ability_name = ?, manual_edit = 1 WHERE ability_name = ?`).run(newName, abilityName);
      updates.push('name');
    }

    if (description !== undefined) {
      const targetName = (newName && newName !== abilityName) ? newName : abilityName;
      db.prepare(`UPDATE pets SET ability_desc = ?, manual_edit = 1 WHERE ability_name = ?`).run(description, targetName);
      updates.push('description');
    }

    if (icon !== undefined) {
      const targetName = (newName && newName !== abilityName) ? newName : abilityName;
      const petUids = db.prepare(`SELECT uid FROM pets WHERE ability_name = ?`).all(targetName).map(r => r.uid);
      for (const uid of petUids) {
        const detail = db.prepare(`SELECT pet_uid FROM pet_details WHERE pet_uid = ?`).get(uid);
        if (detail) {
          db.prepare(`UPDATE pet_details SET ability_icon = ?, manual_edit = 1 WHERE pet_uid = ?`).run(icon, uid);
        } else {
          db.prepare(`INSERT INTO pet_details (pet_uid, ability_icon, manual_edit) VALUES (?, ?, 1)`).run(uid, icon);
        }
      }
      updates.push('icon');
    }

    res.json({ success: true, updated: updates });
  } catch (err) {
    console.error('[Abilities Update]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/abilities/upload-icon
 * Upload ability icon image
 */
router.post('/abilities/upload-icon', authAdmin, handleUpload('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未选择文件' });

    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const filename = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
    const destDir = path.join(DATA_DIR, 'public', 'pets', 'abilities');
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, filename);
    fs.writeFileSync(destPath, req.file.buffer);

    const publicPath = `/public/pets/abilities/${filename}`;
    res.json({ path: publicPath });
  } catch (err) {
    console.error('[Abilities Upload Icon]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 精灵技能管理（pet_skills）
// ============================================================

/**
 * GET /api/admin/pet-skills/:uid
 * Get all skills for a pet (grouped by type)
 */
router.get('/pet-skills/:uid', authAdmin, (req, res) => {
  const { uid } = req.params;
  try {
    const db = getDb();
    const skillOrder = elementOrderSql('sk.element_id');
    const skillIdOrder = "CAST(SUBSTR(ps.skill_ref_uid, 7) AS INTEGER)";
    const skills = db.prepare(`
      SELECT ps.*, sk.icon_url as skill_icon
      FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
      WHERE ps.pet_uid = ?
      ORDER BY ps.skill_type, CAST(ps.level AS INTEGER), ${skillOrder}, ${skillIdOrder}
    `).all(uid);

    const result = {
      skills: skills.filter(s => s.skill_type === 'skills'),
      bloodline_skills: skills.filter(s => s.skill_type === 'bloodline_skills'),
      learnable_stones: skills.filter(s => s.skill_type === 'learnable_stones'),
    };
    res.json(result);
  } catch (err) {
    console.error('[PetSkills GET]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/pet-skills/:uid
 * Save all skills for a pet (delete-then-insert strategy)
 */
router.put('/pet-skills/:uid', authAdmin, (req, res) => {
  const { uid } = req.params;
  const { skills = [], bloodline_skills = [], learnable_stones = [] } = req.body;

  const db = getWriteDb();
  try {
    const deleteAll = db.prepare('DELETE FROM pet_skills WHERE pet_uid = ?');
    const insert = db.prepare(`
      INSERT INTO pet_skills (pet_uid, skill_type, level, name, element, type, cost, power, description, skill_ref_uid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      deleteAll.run(uid);

      for (const s of skills) {
        insert.run(uid, 'skills', normalizeLevel(s.level), s.name || null, s.element || null, s.type || null, s.cost || 0, s.power || 0, s.description || null, s.skill_ref_uid || null);
      }
      for (const s of bloodline_skills) {
        insert.run(uid, 'bloodline_skills', normalizeLevel(s.level), s.name || null, s.element || null, s.type || null, s.cost || 0, s.power || 0, s.description || null, s.skill_ref_uid || null);
      }
      for (const s of learnable_stones) {
        insert.run(uid, 'learnable_stones', normalizeLevel(s.level), s.name || null, s.element || null, s.type || null, s.cost || 0, s.power || 0, s.description || null, s.skill_ref_uid || null);
      }
    });

    tx();
    db.close();

    const total = skills.length + bloodline_skills.length + learnable_stones.length;
    res.json({ success: true, total });
  } catch (err) {
    db.close();
    console.error('[PetSkills PUT]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/pet-egg-groups/:uid
 * Get all egg groups for a pet
 */
router.get('/pet-egg-groups/:uid', authAdmin, (req, res) => {
  const { uid } = req.params;
  try {
    const db = getDb();
    const groups = db.prepare(`
      SELECT eg.id, eg.name FROM pet_egg_groups peg
      JOIN egg_groups eg ON peg.egg_group_id = eg.id
      WHERE peg.pet_uid = ?
    `).all(uid);
    res.json({ egg_groups: groups });
  } catch (err) {
    console.error('[PetEggGroups GET]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/pet-egg-groups/:uid
 * Save egg groups for a pet (delete-then-insert strategy)
 */
router.put('/pet-egg-groups/:uid', authAdmin, (req, res) => {
  const { uid } = req.params;
  const { egg_group_ids = [] } = req.body;

  const db = getWriteDb();
  try {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM pet_egg_groups WHERE pet_uid = ?').run(uid);
      const insert = db.prepare('INSERT INTO pet_egg_groups (pet_uid, egg_group_id, manual_edit) VALUES (?, ?, 1)');
      for (const groupId of egg_group_ids) {
        insert.run(uid, groupId);
      }
    });
    tx();
    db.close();
    res.json({ success: true, total: egg_group_ids.length });
  } catch (err) {
    db.close();
    console.error('[PetEggGroups PUT]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/skills-search?q=xxx
 * Quick search skills by name (for autocomplete in pet skill editor)
 */
router.get('/skills-search', authAdmin, (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    const db = getDb();
    const results = db.prepare(`
      SELECT s.uid, s.name, s.category, s.cost, s.power, s.description,
        e.name as element_name, e.color as element_color, e.icon as element_icon
      FROM skills s LEFT JOIN elements e ON s.element_id = e.id
      WHERE s.name LIKE ? ORDER BY s.name LIMIT 20
    `).all(`%${q}%`);
    res.json(results);
  } catch (err) {
    console.error('[SkillsSearch]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/skills-next-uid
 * Get the next available skill UID (auto-increment, no duplicates)
 */
router.get('/skills-next-uid', authAdmin, (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT MAX(CAST(SUBSTR(uid, 7) AS INTEGER)) as max_num FROM skills WHERE uid LIKE 'skill_%'
    `).get();
    const nextNum = (row?.max_num || 0) + 1;
    res.json({ uid: `skill_${nextNum}` });
  } catch (err) {
    console.error('[SkillsNextUid]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 精灵图鉴课题管理（pet_achievements）
// ============================================================

/**
 * GET /api/admin/achievements-list
 * Batch list pets with achievement summaries (paginated)
 */
router.get('/achievements-list', authAdmin, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = (req.query.search || '').trim();
  const elementId = req.query.element_id ? parseInt(req.query.element_id) : null;
  const achievementFilter = req.query.achievement_filter || 'all';

  try {
    const db = getDb();

    // Build WHERE conditions
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.uid LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (elementId) {
      conditions.push('(p.element_id = ? OR p.sub_element_id = ?)');
      params.push(elementId, elementId);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // For achievement_filter, we need subquery
    let havingClause = '';
    if (achievementFilter === 'default_only') {
      havingClause = 'HAVING custom_count = 0 AND default_count > 0';
    } else if (achievementFilter === 'has_custom') {
      havingClause = 'HAVING custom_count > 0';
    } else if (achievementFilter === 'no_achievements') {
      havingClause = 'HAVING default_count = 0 AND custom_count = 0';
    }

    // Count total (with filter)
    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT p.uid,
          COALESCE(SUM(CASE WHEN pa.is_default = 1 THEN 1 ELSE 0 END), 0) as default_count,
          COALESCE(SUM(CASE WHEN pa.is_default = 0 OR pa.is_default IS NULL THEN 1 ELSE 0 END), 0) as custom_count
        FROM pets p
        LEFT JOIN pet_achievements pa ON pa.pet_uid = p.uid
        ${whereClause}
        GROUP BY p.uid
        ${havingClause}
      )
    `;
    const totalRow = db.prepare(countSql).get(...params);
    const total = totalRow ? totalRow.total : 0;

    // Fetch paginated pets
    const listSql = `
      SELECT p.uid, p.name, p.pet_id, p.thumb_url, p.element_id, p.sub_element_id,
        p.is_final_form, p.is_boss_form, p.has_boss_form,
        e.icon as element_icon, se.icon as sub_element_icon,
        COALESCE(SUM(CASE WHEN pa.is_default = 1 THEN 1 ELSE 0 END), 0) as default_count,
        COALESCE(SUM(CASE WHEN (pa.is_default = 0 OR pa.is_default IS NULL) AND pa.id IS NOT NULL THEN 1 ELSE 0 END), 0) as custom_count,
        COALESCE(SUM(CASE WHEN pa.hidden = 1 THEN 1 ELSE 0 END), 0) as hidden_count
      FROM pets p
      LEFT JOIN elements e ON e.id = p.element_id
      LEFT JOIN elements se ON se.id = p.sub_element_id
      LEFT JOIN pet_achievements pa ON pa.pet_uid = p.uid
      ${whereClause}
      GROUP BY p.uid
      ${havingClause}
      ORDER BY CAST(p.pet_id AS INTEGER), p.uid
      LIMIT ? OFFSET ?
    `;
    const pets = db.prepare(listSql).all(...params, limit, offset);

    // Fetch achievements for these pets
    if (pets.length > 0) {
      const uids = pets.map(p => p.uid);
      const placeholders = uids.map(() => '?').join(',');
      const achievements = db.prepare(`
        SELECT pa.*, sk.icon_url as skill_icon, el.icon as skill_element_icon
        FROM pet_achievements pa
        LEFT JOIN skills sk ON pa.skill_ref_uid = sk.uid
        LEFT JOIN elements el ON sk.element_id = el.id
        WHERE pa.pet_uid IN (${placeholders})
        ORDER BY pa.sort_order, pa.id
      `).all(...uids);

      // Group by pet_uid
      const achievementMap = {};
      for (const a of achievements) {
        if (!achievementMap[a.pet_uid]) achievementMap[a.pet_uid] = [];
        achievementMap[a.pet_uid].push(a);
      }
      for (const pet of pets) {
        pet.achievements = achievementMap[pet.uid] || [];
      }
    } else {
      for (const pet of pets) {
        pet.achievements = [];
      }
    }

    res.json({ pets, total });
  } catch (err) {
    console.error('[AchievementsList GET]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/pet-achievements/:uid
 * Get all achievements for a pet
 */
router.get('/pet-achievements/:uid', authAdmin, (req, res) => {
  const { uid } = req.params;
  try {
    const db = getDb();
    const achievements = db.prepare(`
      SELECT pa.*, sk.icon_url as skill_icon, e.icon as element_icon
      FROM pet_achievements pa
      LEFT JOIN skills sk ON pa.skill_ref_uid = sk.uid
      LEFT JOIN elements e ON sk.element_id = e.id
      WHERE pa.pet_uid = ?
      ORDER BY pa.sort_order, pa.id
    `).all(uid);
    res.json({ achievements });
  } catch (err) {
    console.error('[PetAchievements GET]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/pet-achievements/:uid
 * Save all achievements for a pet (delete-then-insert strategy)
 */
router.put('/pet-achievements/:uid', authAdmin, (req, res) => {
  const { uid } = req.params;
  const { achievements = [] } = req.body;

  const db = getWriteDb();
  try {
    // Only delete non-default achievements; defaults are managed by syncDefaultAchievements
    const deleteNonDefaults = db.prepare('DELETE FROM pet_achievements WHERE pet_uid = ? AND (is_default = 0 OR is_default IS NULL)');
    const insert = db.prepare(`
      INSERT INTO pet_achievements (pet_uid, type, title, skill_ref_uid, skill_name, use_count, reward_desc, sort_order, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      deleteNonDefaults.run(uid);
      // Only insert non-default achievements; defaults are managed by syncDefaultAchievements
      achievements.filter(a => !a.is_default).forEach((a, idx) => {
        insert.run(
          uid,
          a.type || 'text',
          a.title || null,
          a.skill_ref_uid || null,
          a.skill_name || null,
          a.use_count || 0,
          a.reward_desc || null,
          a.sort_order ?? idx,
          a.is_default || 0
        );
      });
    });

    tx();
    db.close();
    res.json({ success: true, total: achievements.length });
  } catch (err) {
    db.close();
    console.error('[PetAchievements PUT]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/pet-achievements/:id/toggle-hidden
 * Toggle the hidden state of a default achievement
 */
router.patch('/pet-achievements/:id/toggle-hidden', authAdmin, (req, res) => {
  const { id } = req.params;
  const db = getWriteDb();
  try {
    const row = db.prepare('SELECT id, hidden FROM pet_achievements WHERE id = ? AND is_default = 1').get(id);
    if (!row) {
      db.close();
      return res.status(404).json({ error: '课题不存在或非默认课题' });
    }
    const newHidden = row.hidden ? 0 : 1;
    db.prepare('UPDATE pet_achievements SET hidden = ? WHERE id = ?').run(newHidden, id);
    db.close();
    res.json({ success: true, hidden: newHidden });
  } catch (err) {
    db.close();
    console.error('[PetAchievements PATCH toggle-hidden]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
