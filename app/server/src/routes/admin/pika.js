const express = require('express');
const router = express.Router();
const { getDb, getWriteDb } = require('../../db/connection');

// ============================================================
// 皮卡月刊 ↔ 活动同步
// ============================================================

/**
 * 自动创建/更新月刊关联的常驻课题活动（命定花种 + 皮卡摄影委托）
 */
function syncMonthlyEvents(db, { period, name, start_date, end_date, monthlyId }) {
  const currentSeason = db.prepare('SELECT id FROM seasons WHERE is_current = 1').get();
  if (!currentSeason) return;
  const seasonId = currentSeason.id;

  const monthlyPets = db.prepare(
    'SELECT pet_uid, pet_name, pet_icon FROM pika_monthly_pets WHERE monthly_id = ? ORDER BY sort_order'
  ).all(monthlyId);

  for (const mp of monthlyPets) {
    if (!mp.pet_name || !mp.pet_icon) {
      const pet = db.prepare('SELECT name, thumb_url, image_url FROM pets WHERE uid = ?').get(mp.pet_uid);
      if (pet) {
        if (!mp.pet_name) mp.pet_name = pet.name || '';
        if (!mp.pet_icon) mp.pet_icon = pet.thumb_url || pet.image_url || '';
      }
    }
  }

  const firstPet = monthlyPets[0] || {};
  const petNames = monthlyPets.map(p => p.pet_name).filter(Boolean).join('、');
  const petIcons = JSON.stringify(monthlyPets.map(p => ({ uid: p.pet_uid, name: p.pet_name, icon: p.pet_icon })));

  const eventConfigs = [
    { sub_type: 'fate_flower', label: '命定花种' },
    { sub_type: 'pika_photo', label: '皮卡摄影委托' },
  ];

  for (const cfg of eventConfigs) {
    const eventName = `[月刊] ${cfg.label} - ${name}`;
    const periods = JSON.stringify([{ start: start_date, end: end_date }]);

    const existing = db.prepare(
      'SELECT id FROM season_events WHERE season_id = ? AND category = ? AND sub_type = ? AND name = ?'
    ).get(seasonId, 'routine', cfg.sub_type, eventName);

    if (existing) {
      db.prepare(`UPDATE season_events SET periods = ?, start_date = ?, end_date = ?,
        pet_uid = ?, pet_name = ?, pet_icon = ? WHERE id = ?`)
        .run(periods, start_date, end_date,
          firstPet.pet_uid || '', petNames || '', petIcons,
          existing.id);
    } else {
      db.prepare(`
        INSERT INTO season_events (season_id, category, sub_type, name, start_date, end_date, periods, pet_uid, pet_name, pet_icon, row_order)
        VALUES (?, 'routine', ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(seasonId, cfg.sub_type, eventName, start_date, end_date, periods,
        firstPet.pet_uid || '', petNames || '', petIcons);
    }
  }
}

// ============================================================
// 皮卡月刊专用接口（处理关联表 pika_monthly_pets）
// ============================================================

// POST /api/admin/pika-monthlies — 新增皮卡月刊
router.post('/pika-monthlies', (req, res) => {
  const { period, name, start_date, end_date, row_order, concept_male, concept_female, pets } = req.body;
  
  if (!period || !name) {
    return res.status(400).json({ error: '缺少必填字段: period, name' });
  }
  
  const db = getWriteDb();
  try {
    const result = db.prepare(`
      INSERT INTO pika_monthlies (period, name, start_date, end_date, row_order, concept_male, concept_female)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(period, name, start_date || '', end_date || '', row_order || 0, concept_male || '', concept_female || '');
    
    const monthlyId = result.lastInsertRowid;
    
    if (pets && typeof pets === 'string') {
      const petList = JSON.parse(pets);
      for (const pet of petList) {
        db.prepare(`
          INSERT INTO pika_monthly_pets (monthly_id, pet_uid, pet_name, pet_icon, locke_male, locke_female, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(monthlyId, pet.pet_uid, pet.pet_name || '', pet.pet_icon || '', pet.locke_male || '', pet.locke_female || '', pet.sort_order || 0);
      }
    }

    if (req.body.sync_events && start_date && end_date) {
      syncMonthlyEvents(db, { period, name, start_date, end_date, monthlyId });
    }
    
    db.close();
    res.json({ success: true, id: monthlyId });
  } catch (err) {
    db.close();
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/admin/pika-monthlies/:id — 更新皮卡月刊
router.put('/pika-monthlies/:id', (req, res) => {
  const { id } = req.params;
  const { period, name, start_date, end_date, row_order, concept_male, concept_female, pets } = req.body;
  
  const db = getWriteDb();
  try {
    const updateFields = [];
    const updateValues = [];
    if (period !== undefined) { updateFields.push('period = ?'); updateValues.push(period); }
    if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
    if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date || ''); }
    if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date || ''); }
    if (row_order !== undefined) { updateFields.push('row_order = ?'); updateValues.push(row_order); }
    if (concept_male !== undefined) { updateFields.push('concept_male = ?'); updateValues.push(concept_male || ''); }
    if (concept_female !== undefined) { updateFields.push('concept_female = ?'); updateValues.push(concept_female || ''); }
    
    if (updateFields.length > 0) {
      db.prepare(`UPDATE pika_monthlies SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues, id);
    }
    
    db.prepare(`DELETE FROM pika_monthly_pets WHERE monthly_id = ?`).run(id);
    
    if (pets && typeof pets === 'string') {
      const petList = JSON.parse(pets);
      for (const pet of petList) {
        db.prepare(`
          INSERT INTO pika_monthly_pets (monthly_id, pet_uid, pet_name, pet_icon, locke_male, locke_female, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, pet.pet_uid, pet.pet_name || '', pet.pet_icon || '', pet.locke_male || '', pet.locke_female || '', pet.sort_order || 0);
      }
    }

    if (req.body.sync_events) {
      const monthly = db.prepare('SELECT * FROM pika_monthlies WHERE id = ?').get(id);
      if (monthly && monthly.start_date && monthly.end_date) {
        syncMonthlyEvents(db, { period: monthly.period, name: monthly.name, start_date: monthly.start_date, end_date: monthly.end_date, monthlyId: +id });
      }
    }
    
    db.close();
    res.json({ success: true });
  } catch (err) {
    db.close();
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/pika-monthlies/:id — 删除皮卡月刊
router.delete('/pika-monthlies/:id', (req, res) => {
  const { id } = req.params;
  const db = getWriteDb();
  const result = db.prepare(`DELETE FROM pika_monthlies WHERE id = ?`).run(id);
  db.close();
  
  if (result.changes === 0) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, changes: result.changes });
});

module.exports = router;
