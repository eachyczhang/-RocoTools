const db = require('../db/connection');

function list({ page = 1, limit = 50, element_id, category, search } = {}) {
  const offset = (Math.max(1, +page) - 1) * +limit;

  let where = [];
  let params = [];

  if (element_id) { where.push('s.element_id = ?'); params.push(+element_id); }
  if (category) { where.push('s.category = ?'); params.push(category); }
  if (search) { where.push('s.name LIKE ?'); params.push(`%${search}%`); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as c FROM skills s ${whereClause}`).get(...params).c;
  const skills = db.prepare(`
    SELECT s.*, e.name as element_name, e.color as element_color, e.icon as element_icon
    FROM skills s LEFT JOIN elements e ON s.element_id = e.id
    ${whereClause} ORDER BY s.uid LIMIT ? OFFSET ?
  `).all(...params, +limit, offset);

  return { total, page: +page, limit: +limit, skills };
}

function getByUid(uid) {
  return db.prepare(`
    SELECT s.*, e.name as element_name, e.color as element_color, e.icon as element_icon
    FROM skills s LEFT JOIN elements e ON s.element_id = e.id
    WHERE s.uid = ?
  `).get(uid) || null;
}

module.exports = { list, getByUid };
