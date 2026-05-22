
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

module.exports = router;
