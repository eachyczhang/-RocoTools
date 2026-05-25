
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/connection');

// GET /api/pika-monthlies — get all pika monthlies with pets
router.get('/', (req, res) => {
  const db = getDb();

  const monthlies = db.prepare(
    'SELECT * FROM pika_monthlies ORDER BY start_date DESC, period DESC'
  ).all();

  // Attach pets for each monthly, fill missing name/icon from pets table
  for (const m of monthlies) {
    const pets = db.prepare(
      'SELECT pet_uid, pet_name, pet_icon, locke_male, locke_female, sort_order FROM pika_monthly_pets WHERE monthly_id = ? ORDER BY sort_order'
    ).all(m.id);

    for (const pet of pets) {
      if (!pet.pet_name || !pet.pet_icon) {
        const info = db.prepare('SELECT name, thumb_url, image_url FROM pets WHERE uid = ?').get(pet.pet_uid);
        if (info) {
          if (!pet.pet_name) pet.pet_name = info.name || '';
          if (!pet.pet_icon) pet.pet_icon = info.thumb_url || info.image_url || '';
        }
      }
    }

    m.pets = pets;
  }

  res.json({ monthlies });
});

// GET /api/pika-monthlies/fate-flower-skills/:petUid — get fate flower skills for a pet (by pet_uid, returns latest monthly's config)
router.get('/fate-flower-skills/:petUid', (req, res) => {
  const { petUid } = req.params;
  const db = getDb();

  // Find the latest monthly_pet entry for this pet_uid
  const monthlyPet = db.prepare(`
    SELECT pmp.id, pmp.monthly_id, pmp.pet_uid, pmp.fate_nature
    FROM pika_monthly_pets pmp
    JOIN pika_monthlies pm ON pmp.monthly_id = pm.id
    WHERE pmp.pet_uid = ?
    ORDER BY pm.start_date DESC
    LIMIT 1
  `).get(petUid);

  if (!monthlyPet) {
    return res.json({ skills: [], fate_nature: '' });
  }

  const skills = db.prepare(`
    SELECT ffs.skill_ref_uid, ffs.skill_name, ffs.skill_source, ffs.sort_order,
           sk.name as full_name, sk.icon_url as skill_icon, sk.cost, sk.power, sk.description, sk.category as type,
           e.name as element, e.icon as element_icon, e.color as element_color
    FROM fate_flower_skills ffs
    LEFT JOIN skills sk ON ffs.skill_ref_uid = sk.uid
    LEFT JOIN elements e ON sk.element_id = e.id
    WHERE ffs.monthly_pet_id = ?
    ORDER BY ffs.sort_order
  `).all(monthlyPet.id);

  // Also try to get skill info from pet_skills if not found in skills table
  for (const s of skills) {
    if (!s.full_name) {
      const ps = db.prepare(`
        SELECT name, element, type, cost, power, description, skill_ref_uid
        FROM pet_skills WHERE pet_uid = ? AND skill_ref_uid = ?
        LIMIT 1
      `).get(petUid, s.skill_ref_uid);
      if (ps) {
        s.full_name = ps.name;
        s.element = ps.element;
        s.type = ps.type;
        s.cost = ps.cost;
        s.power = ps.power;
        s.description = ps.description;
      }
    }
    // Use full_name from skills table if available
    if (s.full_name) s.skill_name = s.full_name;
    delete s.full_name;
    // Add 'name' field for SkillTable component compatibility
    s.name = s.skill_name;
  }

  res.json({ skills, fate_nature: monthlyPet.fate_nature || '' });
});

module.exports = router;
