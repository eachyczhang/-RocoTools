const { getDb } = require('../db/connection');
const db = getDb();

const eggStmt = db.prepare(`
  SELECT eg.id, eg.name FROM pet_egg_groups peg
  JOIN egg_groups eg ON peg.egg_group_id = eg.id
  WHERE peg.pet_uid = ?
`);

function getShinyList({ includeHidden } = {}) {
  try {
    let sql = `
      SELECT pd.pet_uid, pd.image_shiny FROM pet_details pd
      JOIN pets p ON pd.pet_uid = p.uid
      WHERE pd.image_shiny IS NOT NULL
    `;
    if (!includeHidden) {
      sql += ` AND p.show_shiny = 1`;
    }
    const rows = db.prepare(sql).all();
    return rows.map(r => ({ uid: r.pet_uid, image_shiny: r.image_shiny }));
  } catch (e) {
    // Fallback: show_shiny column may not exist yet
    const rows = db.prepare(`
      SELECT pet_uid, image_shiny FROM pet_details WHERE image_shiny IS NOT NULL
    `).all();
    return rows.map(r => ({ uid: r.pet_uid, image_shiny: r.image_shiny }));
  }
}

/**
 * Normalize evolution_chain from DB into a 2D array (multi-route format).
 * Supports 3 legacy formats:
 *   1. String array: ["喵喵", "喵呜", "魔力猫"]
 *   2. Object array: [{name, evolve_level, evolve_condition}, ...]
 *   3. 2D array (new): [[{name, evolve_level, ...}, ...], [...]]
 * Always returns: [[{name, evolve_level, evolve_condition, uid, thumb_url}, ...], ...]
 */
function normalizeEvolutionChain(database, raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  let routes;

  // Detect format: if first element is an array → already 2D
  if (Array.isArray(raw[0])) {
    routes = raw;
  } else {
    // 1D array (string or object) → wrap as single route
    routes = [raw];
  }

  const evoLookup = database.prepare('SELECT uid, name, thumb_url, image_url FROM pets WHERE name = ? LIMIT 1');

  return routes.map(route => {
    if (!Array.isArray(route)) return [];
    return route.map(stage => {
      const name = typeof stage === 'string' ? stage : stage.name;
      const evolve_level = typeof stage === 'string' ? null : (stage.evolve_level || null);
      // Normalize evolve_condition: string → {type:'text', text:...}, object → pass through, null → null
      let evolve_condition = typeof stage === 'string' ? null : (stage.evolve_condition || null);
      if (typeof evolve_condition === 'string') {
        evolve_condition = { type: 'text', text: evolve_condition };
      }
      const match = evoLookup.get(name);
      return {
        name,
        evolve_level,
        evolve_condition,
        uid: match ? match.uid : null,
        thumb_url: match ? (match.thumb_url || match.image_url) : null,
      };
    });
  }).filter(route => route.length > 0);
}

function list({ page = 1, limit = 50, element_id, egg_group, search, sort_by = 'pet_id', order = 'asc', all_variants, tag, admin } = {}) {
  const safeLimit = Math.min(Math.max(1, +limit), 200);
  const offset = (Math.max(1, +page) - 1) * safeLimit;

  const allowedSort = ['pet_id', 'name', 'total', 'hp', 'speed', 'atk', 'matk', 'def', 'mdef'];
  const sortCol = allowedSort.includes(sort_by) ? sort_by : 'pet_id';
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

  let where = [];
  let params = [];
  let joins = '';

  // 只取每个 pet_id 的第一个形态（uid 最小的），除非指定 all_variants 或筛选特定形态标记
  const variantTags = ['is_boss_form'];
  if (!all_variants && !(tag && variantTags.includes(tag))) {
    where.push(`p.uid = (SELECT MIN(p2.uid) FROM pets p2 WHERE p2.pet_id = p.pet_id)`);
  }

  if (element_id) { where.push('(p.element_id = ? OR p.sub_element_id = ?)'); params.push(+element_id, +element_id); }
  if (search) { where.push('p.name LIKE ?'); params.push(`%${search}%`); }

  // Tag filter: support is_final_form, is_legendary, is_season, is_pass, is_boss_form, has_boss_form, has_shiny
  const allowedTags = ['is_final_form', 'is_legendary', 'is_season', 'is_pass', 'is_boss_form', 'has_boss_form'];
  if (tag && allowedTags.includes(tag)) { where.push(`p.${tag} = 1`); }
  if (tag === 'has_shiny') {
    joins += ' JOIN pet_details pd_shiny ON p.uid = pd_shiny.pet_uid';
    where.push('pd_shiny.image_shiny IS NOT NULL');
    if (!admin) where.push('p.show_shiny = 1');
  }

  if (egg_group) {
    joins += ' JOIN pet_egg_groups peg ON p.uid = peg.pet_uid';
    where.push('peg.egg_group_id = ?');
    params.push(+egg_group);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(DISTINCT p.uid) as c FROM pets p ${joins} ${whereClause}`).get(...params).c;
  const rows = db.prepare(`
    SELECT DISTINCT p.*, e.name as element_name, e.color as element_color, e.icon as element_icon,
           se.name as sub_element_name, se.color as sub_element_color, se.icon as sub_element_icon
    FROM pets p
    LEFT JOIN elements e ON p.element_id = e.id
    LEFT JOIN elements se ON p.sub_element_id = se.id
    ${joins} ${whereClause}
    ORDER BY p.${sortCol} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, safeLimit, offset);

  // 查询每个精灵的形态数量
  const variantCountStmt = db.prepare('SELECT COUNT(*) as c FROM pets WHERE pet_id = ?');

  const pets = rows.map(r => ({
    ...r,
    egg_groups: eggStmt.all(r.uid),
    variant_count: variantCountStmt.get(r.pet_id).c,
  }));

  return { total, page: +page, limit: safeLimit, pets };
}

function getByUid(uid) {
  const pet = db.prepare(`
    SELECT p.*, e.name as element_name, e.color as element_color, e.icon as element_icon,
           se.name as sub_element_name, se.color as sub_element_color, se.icon as sub_element_icon
    FROM pets p
    LEFT JOIN elements e ON p.element_id = e.id
    LEFT JOIN elements se ON p.sub_element_id = se.id
    WHERE p.uid = ?
  `).get(uid);

  if (!pet) return null;

  pet.egg_groups = eggStmt.all(pet.uid);

  const detail = db.prepare('SELECT * FROM pet_details WHERE pet_uid = ?').get(pet.uid);
  if (detail) {
    detail.evolution_chain = normalizeEvolutionChain(db, JSON.parse(detail.evolution_chain || '[]'));
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

  // Achievements (图鉴课题) - exclude hidden ones
  pet.achievements = db.prepare(`
    SELECT title, reward_desc, is_default FROM pet_achievements
    WHERE pet_uid = ? AND (hidden IS NULL OR hidden = 0)
    ORDER BY sort_order, id
  `).all(pet.uid);

  return pet;
}

/**
 * 查询能同时拥有指定属性攻击技能的精灵
 * 按具体形态(pet_uid)匹配，返回能凑齐的形态
 * 返回两组：normal（自学+技能石即可凑齐）、bloodline（需要血脉才能凑齐）
 * @param {string[]} elementNames - 属性名称列表
 * @returns {{ normal: Array, bloodline: Array }}
 */
function findByCoverage(elementNames) {
  if (!elementNames || !elementNames.length) return { normal: [], bloodline: [] };

  // 按 pet_uid 精确匹配每个形态
  const allUids = new Set();
  const uidElemSources = {}; // pet_uid -> { elemName -> Set<'normal'|'bloodline'> }

  for (const elemName of elementNames) {
    const rows = db.prepare(`
      SELECT ps.pet_uid, ps.skill_type
      FROM pet_skills ps
      WHERE ps.element = ? AND ps.power > 0
    `).all(elemName);

    for (const row of rows) {
      allUids.add(row.pet_uid);
      if (!uidElemSources[row.pet_uid]) uidElemSources[row.pet_uid] = {};
      if (!uidElemSources[row.pet_uid][elemName]) uidElemSources[row.pet_uid][elemName] = new Set();
      const src = row.skill_type === 'bloodline_skills' ? 'bloodline' : 'normal';
      uidElemSources[row.pet_uid][elemName].add(src);
    }
  }

  // 筛选能凑齐的形态，按 pet_id 去重（同 pet_id 只保留最优形态）
  const normalByPetId = {}; // pet_id -> uid
  const bloodlineByPetId = {}; // pet_id -> { uid, bloodline_elements }

  for (const uid of allUids) {
    const sources = uidElemSources[uid];
    if (!sources) continue;

    const missing = elementNames.filter(name => !sources[name]);
    if (missing.length > 0) continue;

    const bloodlineElems = elementNames.filter(name => {
      const s = sources[name];
      return s && !s.has('normal');
    });

    // 提取 pet_id
    const petId = uid.replace(/^pet_(\d+).*$/, '$1');

    if (bloodlineElems.length === 0) {
      // 自学即可：优先记录（如果同 pet_id 已有则跳过）
      if (!normalByPetId[petId]) normalByPetId[petId] = uid;
    } else if (bloodlineElems.length === 1) {
      // 需要1种血脉：如果同 pet_id 已有自学方案则跳过
      if (!normalByPetId[petId] && !bloodlineByPetId[petId]) {
        bloodlineByPetId[petId] = { uid, bloodline_elements: bloodlineElems };
      }
    }
  }

  // 查询精灵信息
  function getPetInfo(uid) {
    return db.prepare(`
      SELECT p.uid, p.pet_id, p.name, COALESCE(p.thumb_url, p.image_url) as image_url,
        e.name as element_name, e.color as element_color, e.icon as element_icon
      FROM pets p
      LEFT JOIN elements e ON p.element_id = e.id
      WHERE p.uid = ?
    `).get(uid);
  }

  const normalPets = Object.values(normalByPetId).map(uid => getPetInfo(uid)).filter(Boolean);
  normalPets.sort((a, b) => a.pet_id.localeCompare(b.pet_id));

  const bloodlinePets = Object.values(bloodlineByPetId).map(({ uid, bloodline_elements }) => {
    const pet = getPetInfo(uid);
    if (!pet) return null;
    return { ...pet, bloodline_elements };
  }).filter(Boolean);
  bloodlinePets.sort((a, b) => a.pet_id.localeCompare(b.pet_id));

  return { normal: normalPets, bloodline: bloodlinePets };
}

module.exports = { list, getByUid, getShinyList, findByCoverage };
