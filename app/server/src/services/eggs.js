const db = require('../db/connection');

function getAll() {
  const groups = db.prepare('SELECT * FROM egg_groups ORDER BY id').all();
  const countStmt = db.prepare('SELECT COUNT(*) as c FROM pet_egg_groups WHERE egg_group_id = ?');
  const egg_groups = groups.map(g => ({
    ...g,
    pet_count: countStmt.get(g.id).c,
  }));
  return { total: egg_groups.length, egg_groups };
}

function getById(id) {
  const group = db.prepare('SELECT * FROM egg_groups WHERE id = ?').get(id);
  if (!group) return null;

  const pets = db.prepare(`
    SELECT p.uid, p.pet_id, p.name, p.image_url,
           e.name as element_name, e.color as element_color
    FROM pet_egg_groups peg
    JOIN pets p ON peg.pet_uid = p.uid
    LEFT JOIN elements e ON p.element_id = e.id
    WHERE peg.egg_group_id = ?
    ORDER BY p.pet_id
  `).all(id);

  return { ...group, pets };
}

module.exports = { getAll, getById };
