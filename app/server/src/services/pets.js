const db = require('../db/connection');

const eggStmt = db.prepare(`
  SELECT eg.id, eg.name FROM pet_egg_groups peg
  JOIN egg_groups eg ON peg.egg_group_id = eg.id
  WHERE peg.pet_uid = ?
`);

function list({ page = 1, limit = 50, element_id, egg_group, search, sort_by = 'pet_id', order = 'asc' } = {}) {
  const offset = (Math.max(1, +page) - 1) * +limit;

  const allowedSort = ['pet_id', 'name', 'total', 'hp', 'speed', 'atk', 'matk', 'def', 'mdef'];
  const sortCol = allowedSort.includes(sort_by) ? sort_by : 'pet_id';
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

  let where = [];
  let params = [];
  let joins = '';

  // 只取每个 pet_id 的第一个形态（uid 最小的）
  where.push(`p.uid = (SELECT MIN(p2.uid) FROM pets p2 WHERE p2.pet_id = p.pet_id)`);

  if (element_id) { where.push('p.element_id = ?'); params.push(+element_id); }
  if (search) { where.push('p.name LIKE ?'); params.push(`%${search}%`); }
  if (egg_group) {
    joins += ' JOIN pet_egg_groups peg ON p.uid = peg.pet_uid';
    where.push('peg.egg_group_id = ?');
    params.push(+egg_group);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(DISTINCT p.uid) as c FROM pets p ${joins} ${whereClause}`).get(...params).c;
  const rows = db.prepare(`
    SELECT DISTINCT p.*, e.name as element_name, e.color as element_color, e.icon as element_icon
    FROM pets p
    LEFT JOIN elements e ON p.element_id = e.id
    ${joins} ${whereClause}
    ORDER BY p.${sortCol} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, +limit, offset);

  // 查询每个精灵的形态数量
  const variantCountStmt = db.prepare('SELECT COUNT(*) as c FROM pets WHERE pet_id = ?');

  const pets = rows.map(r => ({
    ...r,
    egg_groups: eggStmt.all(r.uid),
    variant_count: variantCountStmt.get(r.pet_id).c,
  }));

  return { total, page: +page, limit: +limit, pets };
}

function getByUid(uid) {
  const pet = db.prepare(`
    SELECT p.*, e.name as element_name, e.color as element_color, e.icon as element_icon
    FROM pets p LEFT JOIN elements e ON p.element_id = e.id
    WHERE p.uid = ?
  `).get(uid);

  if (!pet) return null;

  pet.egg_groups = eggStmt.all(pet.uid);

  const detail = db.prepare('SELECT * FROM pet_details WHERE pet_uid = ?').get(pet.uid);
  if (detail) {
    detail.evolution_chain = JSON.parse(detail.evolution_chain || '[]');
    detail.restrain_strong = JSON.parse(detail.restrain_strong || '[]');
    detail.restrain_weak = JSON.parse(detail.restrain_weak || '[]');
    detail.restrain_resist = JSON.parse(detail.restrain_resist || '[]');
    detail.restrain_resisted = JSON.parse(detail.restrain_resisted || '[]');
  }
  pet.detail = detail || null;

  pet.skills = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'skills' ORDER BY ps.id
  `).all(pet.uid);
  pet.bloodline_skills = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'bloodline_skills' ORDER BY ps.id
  `).all(pet.uid);
  pet.learnable_stones = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'learnable_stones' ORDER BY ps.id
  `).all(pet.uid);

  const variants = db.prepare(`
    SELECT vm.pet_uid, p.name FROM variants_map vm
    JOIN pets p ON vm.pet_uid = p.uid
    WHERE vm.pet_id = ? ORDER BY vm.sort_order
  `).all(pet.pet_id);
  pet.variants = variants.length > 1 ? variants : [];

  return pet;
}

module.exports = { list, getByUid };
