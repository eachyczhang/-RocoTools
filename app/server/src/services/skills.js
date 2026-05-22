const { getDb } = require('../db/connection');
const db = getDb();

function list({ page = 1, limit = 50, element_id, category, search, counter, keyword } = {}) {
  const safeLimit = Math.min(Math.max(1, +limit), 200);
  const offset = (Math.max(1, +page) - 1) * safeLimit;

  let where = [];
  let params = [];

  if (element_id) { where.push('s.element_id = ?'); params.push(+element_id); }
  if (category) { where.push('s.category = ?'); params.push(category); }
  if (search) { where.push('s.name LIKE ?'); params.push(`%${search}%`); }
  if (counter) {
    if (counter === 'none') {
      where.push('s.description NOT LIKE ?'); params.push('%应对%');
    } else {
      where.push('s.description LIKE ?'); params.push(`%应对${counter}%`);
    }
  }
  if (keyword) { where.push('s.description LIKE ?'); params.push(`%${keyword}%`); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as c FROM skills s ${whereClause}`).get(...params).c;
  const skills = db.prepare(`
    SELECT s.*, e.name as element_name, e.color as element_color, e.icon as element_icon
    FROM skills s LEFT JOIN elements e ON s.element_id = e.id
    ${whereClause} ORDER BY s.element_id, s.uid LIMIT ? OFFSET ?
  `).all(...params, safeLimit, offset);

  return { total, page: +page, limit: safeLimit, skills };
}

function getByUid(uid) {
  const skill = db.prepare(`
    SELECT s.*, e.name as element_name, e.color as element_color, e.icon as element_icon
    FROM skills s LEFT JOIN elements e ON s.element_id = e.id
    WHERE s.uid = ?
  `).get(uid) || null;

  if (!skill) return null;

  // 查找能学此技能的精灵（按 pet_id 去重，只取第一形态）
  const learners = db.prepare(`
    SELECT p.uid, p.name, p.pet_id,
      COALESCE(p.thumb_url, p.image_url) as image_url,
      ps.skill_type,
      e.name as element_name, e.color as element_color, e.icon as element_icon
    FROM pet_skills ps
    JOIN pets p ON ps.pet_uid = p.uid
    LEFT JOIN elements e ON p.element_id = e.id
    WHERE ps.skill_ref_uid = ?
    GROUP BY p.pet_id, ps.skill_type
    ORDER BY p.pet_id
  `).all(uid);

  skill.learners = learners;
  return skill;
}

module.exports = { list, getByUid };
