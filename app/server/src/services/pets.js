const { getDb } = require('../db/connection');
const { elementOrderSql } = require('../constants/elementOrder');
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
  const variantTags = ['is_boss_form', 'has_shiny'];
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

  const skillOrderSql = elementOrderSql('sk.element_id');
  const skillIdOrder = "CAST(SUBSTR(ps.skill_ref_uid, 7) AS INTEGER)";
  // Skills: sort by level > element order > skill ID
  pet.skills = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon,
           COALESCE(sk.cost, ps.cost) as cost,
           COALESCE(sk.power, ps.power) as power,
           COALESCE(sk.description, ps.description) as description
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'skills'
    ORDER BY CAST(ps.level AS INTEGER), ${skillOrderSql}, ${skillIdOrder}
  `).all(pet.uid);
  // Bloodline skills: sort by element order > skill ID
  pet.bloodline_skills = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon,
           COALESCE(sk.cost, ps.cost) as cost,
           COALESCE(sk.power, ps.power) as power,
           COALESCE(sk.description, ps.description) as description
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'bloodline_skills'
    ORDER BY ${skillOrderSql}, ${skillIdOrder}
  `).all(pet.uid);
  // Learnable stones: sort by element order > skill ID
  pet.learnable_stones = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon,
           COALESCE(sk.cost, ps.cost) as cost,
           COALESCE(sk.power, ps.power) as power,
           COALESCE(sk.description, ps.description) as description
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'learnable_stones'
    ORDER BY ${skillOrderSql}, ${skillIdOrder}
  `).all(pet.uid);

  const variants = db.prepare(`
    SELECT vm.pet_uid, p.name FROM variants_map vm
    JOIN pets p ON vm.pet_uid = p.uid
    WHERE vm.pet_id = ? ORDER BY vm.sort_order
  `).all(pet.pet_id);
  pet.variants = variants.length > 1 ? variants : [];

  // Achievements (图鉴课题) - exclude hidden ones
  pet.achievements = db.prepare(`
    SELECT type, title, skill_ref_uid, skill_name, use_count, reward_desc, is_default FROM pet_achievements
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

/**
 * Counter-pick recommendation for Fate Flower pets.
 * Analyzes the target pet's attack profile and recommends best defensive pets.
 *
 * Scoring dimensions (multi-factor):
 * 1. Resistance score: element matchup coverage against all attack elements (weight: 3)
 * 2. Counter-status bonus: has skills that counter status moves (weight: 2)
 *    - Extra bonus if counter-status skill also super-effective against target
 * 3. Counter-defense bonus: has skills that counter defense moves (weight: 2)
 *    - Only applies when target pet has defense skills
 * 4. Super-effective high-power bonus: has high-power attack skills that are
 *    super-effective against the target pet's element (weight: 1.5)
 * 5. Defense stat: relevant defense stat as tiebreaker (weight: 1, normalized)
 *
 * @param {string} petUid - The fate flower pet UID
 * @param {string} [natureOverride] - Optional nature name to override
 * @returns {object} { attack_profile, recommended_pets }
 */
function getCounterPicks(petUid, natureOverride) {
  const pet = db.prepare(`
    SELECT p.*, e.name as element_name, e.id as element_id,
           se.name as sub_element_name, se.id as sub_element_id
    FROM pets p
    LEFT JOIN elements e ON p.element_id = e.id
    LEFT JOIN elements se ON p.sub_element_id = se.id
    WHERE p.uid = ?
  `).get(petUid);

  if (!pet) return null;

  // --- Step 1: Determine attack tendency ---
  let atk = pet.atk;
  let matk = pet.matk;

  if (natureOverride) {
    const nature = db.prepare('SELECT stat_up, stat_down FROM natures WHERE name = ?').get(natureOverride);
    if (nature) {
      const applyBonus = (stat, field) => {
        if (nature.stat_up === field) return Math.floor(stat * 1.1);
        if (nature.stat_down === field) return Math.floor(stat * 0.9);
        return stat;
      };
      atk = applyBonus(atk, '物攻');
      matk = applyBonus(matk, '魔攻');
    }
  }

  const attackTendency = atk >= matk ? '物攻' : '魔攻';
  const defenseStat = attackTendency === '物攻' ? 'def' : 'mdef';

  // --- Step 2: Collect attack elements ---
  const attackElements = new Set();
  attackElements.add(pet.element_name);

  const fateSkills = db.prepare(`
    SELECT ffs.skill_ref_uid, ps.element, ps.type, ps.power
    FROM fate_flower_skills ffs
    JOIN pika_monthly_pets pmp ON ffs.monthly_pet_id = pmp.id
    LEFT JOIN pet_skills ps ON ps.skill_ref_uid = ffs.skill_ref_uid AND ps.pet_uid = ?
    WHERE pmp.pet_uid = ?
  `).all(petUid, petUid);

  for (const fs of fateSkills) {
    if (fs.element && fs.power > 0 && (fs.type === '物攻' || fs.type === '魔攻')) {
      attackElements.add(fs.element);
    }
  }

  if (fateSkills.length === 0) {
    const ownSkills = db.prepare(`
      SELECT element, type, power FROM pet_skills
      WHERE pet_uid = ? AND power > 0 AND (type = '物攻' OR type = '魔攻')
    `).all(petUid);
    for (const s of ownSkills) {
      if (s.element) attackElements.add(s.element);
    }
  }

  const attackElementList = Array.from(attackElements);

  // --- Step 2b: Detect target pet's skill types (based on fate flower skills if configured) ---
  let hasStatusSkills = false;
  let hasDefenseSkills = false;
  if (fateSkills.length > 0) {
    // Only check the configured fate flower skills
    const fateSkillUidsForType = fateSkills.map(fs => fs.skill_ref_uid).filter(Boolean);
    if (fateSkillUidsForType.length > 0) {
      const ph = fateSkillUidsForType.map(() => '?').join(',');
      hasStatusSkills = db.prepare(
        `SELECT COUNT(*) as c FROM pet_skills WHERE pet_uid = ? AND skill_ref_uid IN (${ph}) AND type = '状态'`
      ).get(petUid, ...fateSkillUidsForType).c > 0;
      hasDefenseSkills = db.prepare(
        `SELECT COUNT(*) as c FROM pet_skills WHERE pet_uid = ? AND skill_ref_uid IN (${ph}) AND type = '防御'`
      ).get(petUid, ...fateSkillUidsForType).c > 0;
    }
  } else {
    // Fallback: check all skills
    hasStatusSkills = db.prepare(
      `SELECT COUNT(*) as c FROM pet_skills WHERE pet_uid = ? AND type = '状态'`
    ).get(petUid).c > 0;
    hasDefenseSkills = db.prepare(
      `SELECT COUNT(*) as c FROM pet_skills WHERE pet_uid = ? AND type = '防御'`
    ).get(petUid).c > 0;
  }

  // --- Step 3: Load element matchup data ---
  const elements = db.prepare('SELECT * FROM elements').all().map(row => ({
    ...row,
    strong_against: JSON.parse(row.strong_against || '[]'),
    resisted_by: JSON.parse(row.resisted_by || '[]'),
    weak_to: JSON.parse(row.weak_to || '[]'),
    resistant_to: JSON.parse(row.resistant_to || '[]'),
  }));

  const elemByName = {};
  const elemById = {};
  for (const e of elements) {
    elemByName[e.name] = e;
    elemById[e.id] = e;
  }

  // Determine which elements are super-effective against the target pet
  const targetWeakTo = new Set();
  const targetElemIds = [pet.element_id];
  if (pet.sub_element_id) targetElemIds.push(pet.sub_element_id);
  for (const defId of targetElemIds) {
    const defElem = elemById[defId];
    if (!defElem) continue;
    // Elements that are strong against this defender element
    for (const e of elements) {
      if (e.strong_against?.some(sa => sa.id === defId || sa.name === defElem.name)) {
        targetWeakTo.add(e.name);
      }
    }
  }

  function calcResistanceScore(defElemIds) {
    let score = 0;
    for (const atkElemName of attackElementList) {
      const atkElem = elemByName[atkElemName];
      if (!atkElem) continue;

      let mult = 1;
      for (const defId of defElemIds) {
        const defElem = elemById[defId];
        if (!defElem) continue;
        if (atkElem.strong_against?.some(e => e.id === defId || e.name === defElem.name)) {
          mult *= 2;
        } else if (defElem.resistant_to?.some(e => e.id === atkElem.id || e.name === atkElem.name)) {
          mult *= 0.5;
        }
      }
      if (defElemIds.length === 2) {
        if (mult === 4) mult = 3;
      }
      score += (1 - mult);
    }
    return score;
  }

  // --- Step 4: Get all final-form pets and score them ---
  const finalPets = db.prepare(`
    SELECT p.uid, p.pet_id, p.name, p.element_id, p.sub_element_id,
           p.hp, p.atk, p.matk, p.def, p.mdef, p.speed, p.total,
           COALESCE(p.thumb_url, p.image_url) as image_url,
           e.name as element_name, e.icon as element_icon, e.color as element_color,
           se.name as sub_element_name, se.icon as sub_element_icon, se.color as sub_element_color
    FROM pets p
    LEFT JOIN elements e ON p.element_id = e.id
    LEFT JOIN elements se ON p.sub_element_id = se.id
    WHERE p.is_final_form = 1
  `).all();

  // --- Deduplicate multi-form pets ---
  // If a pet_id has multiple forms with identical stats + element + skills, keep only one.
  // Forms with different stats/elements/skills are all kept (they matter for counter-pick).
  const petIdGroups = new Map(); // pet_id -> [pets]
  for (const p of finalPets) {
    if (!petIdGroups.has(p.pet_id)) petIdGroups.set(p.pet_id, []);
    petIdGroups.get(p.pet_id).push(p);
  }

  const deduped = [];
  for (const [, forms] of petIdGroups) {
    if (forms.length === 1) {
      deduped.push(forms[0]);
      continue;
    }
    // Compare stats + element for each form against the first
    const kept = [forms[0]];
    const statKeys = ['hp', 'atk', 'matk', 'def', 'mdef', 'speed', 'element_id', 'sub_element_id'];
    for (let i = 1; i < forms.length; i++) {
      const f = forms[i];
      const hasDiff = statKeys.some(k => f[k] !== forms[0][k]);
      if (hasDiff) {
        kept.push(f);
      } else {
        // Stats identical → check if skill sets differ (attack skills only, relevant for counter-pick)
        const getSkillSet = (uid) => db.prepare(
          `SELECT skill_ref_uid FROM pet_skills WHERE pet_uid = ? AND power > 0 AND (type = '物攻' OR type = '魔攻') ORDER BY skill_ref_uid`
        ).all(uid).map(r => r.skill_ref_uid).join(',');
        if (getSkillSet(f.uid) !== getSkillSet(forms[0].uid)) {
          kept.push(f);
        }
        // else: identical stats + skills → skip this form
      }
    }
    deduped.push(...kept);
  }

  // Replace finalPets with deduplicated list
  const finalPetsDeduped = deduped;

  // Pre-fetch counter-status and counter-defense skills for all final-form pets
  const counterStatusPets = new Map(); // pet_uid -> best counter-status skill info
  const counterDefensePets = new Set(); // pet_uid set
  const counterAttackPets = new Set(); // pet_uid set (has defense skills that counter attacks)

  // Batch query: counter-status attack skills (type=物攻/魔攻 with "应对状态")
  if (hasStatusSkills) {
    const csRows = db.prepare(`
      SELECT pet_uid, element, power FROM pet_skills
      WHERE description LIKE '%应对状态%' AND pet_uid IN (SELECT uid FROM pets WHERE is_final_form = 1)
    `).all();
    for (const row of csRows) {
      const existing = counterStatusPets.get(row.pet_uid);
      const isSE = targetWeakTo.has(row.element);
      const score = isSE ? 2 : 1;
      if (!existing || score > existing.score || (score === existing.score && row.power > existing.power)) {
        counterStatusPets.set(row.pet_uid, { score, power: row.power, element: row.element, isSE });
      }
    }
  }

  // Batch query: counter-defense skills (description contains "应对防御")
  if (hasDefenseSkills) {
    const cdRows = db.prepare(`
      SELECT DISTINCT pet_uid FROM pet_skills
      WHERE description LIKE '%应对防御%' AND pet_uid IN (SELECT uid FROM pets WHERE is_final_form = 1)
    `).all();
    for (const row of cdRows) {
      counterDefensePets.add(row.pet_uid);
    }
  }

  // Batch query: counter-attack defense skills (defense skills with "应对攻击")
  const caRows = db.prepare(`
    SELECT DISTINCT pet_uid FROM pet_skills
    WHERE description LIKE '%应对攻击%' AND pet_uid IN (SELECT uid FROM pets WHERE is_final_form = 1)
  `).all();
  for (const row of caRows) {
    counterAttackPets.add(row.pet_uid);
  }

  // Batch query: lifesteal/sustain skills (high sustain)
  // Only these specific skills count: 蝙蝠, 暗突袭, 撕裂, 等价交换, 抽枝, 气沉丹田
  // 撕裂/抽枝/暗突袭 are "应对状态" type - only count as sustain when boss has status skills
  // Store element info to determine if the skill counters boss or is resisted by boss
  const COUNTER_STATUS_LIFESTEAL = new Set(['撕裂', '抽枝', '暗突袭']); // Only effective when boss has status skills
  const lifestealPetSkills = new Map(); // pet_uid -> [{ element, name, needsStatus }]
  const lifestealRows = db.prepare(`
    SELECT pet_uid, element, name FROM pet_skills
    WHERE name IN ('蝙蝠', '暗突袭', '撕裂', '等价交换', '抽枝', '气沉丹田')
      AND pet_uid IN (SELECT uid FROM pets WHERE is_final_form = 1)
  `).all();
  for (const row of lifestealRows) {
    if (!lifestealPetSkills.has(row.pet_uid)) {
      lifestealPetSkills.set(row.pet_uid, []);
    }
    lifestealPetSkills.get(row.pet_uid).push({
      element: row.element,
      name: row.name,
      needsStatus: COUNTER_STATUS_LIFESTEAL.has(row.name),
    });
  }

  // Batch query: pets that can learn "贪婪" (100% lifesteal - highest priority sustain)
  // Track whether each pet can learn it via non-bloodline (skills/stones) or only bloodline
  const greedyPets = new Map(); // pet_uid -> { hasNonBloodline: boolean }
  const greedyRows = db.prepare(`
    SELECT pet_uid, skill_type FROM pet_skills
    WHERE name = '贪婪'
      AND pet_uid IN (SELECT uid FROM pets WHERE is_final_form = 1)
  `).all();
  for (const row of greedyRows) {
    const existing = greedyPets.get(row.pet_uid);
    const isNonBloodline = row.skill_type !== 'bloodline_skills';
    if (!existing) {
      greedyPets.set(row.pet_uid, { hasNonBloodline: isNonBloodline });
    } else if (isNonBloodline) {
      existing.hasNonBloodline = true;
    }
  }

  // Batch query: pets that can learn self-debuff cleanse skills (驱散自己减益)
  // Queried unconditionally here; bossHasBurnOrPoison check is applied during scoring
  // Track whether each pet can learn it via non-bloodline or only bloodline
  // Skills: 除厄, 洗礼, 生日蛋糕, 清洗
  const cleansePets = new Map(); // pet_uid -> { hasNonBloodline: boolean }
  const cleanseRows = db.prepare(`
    SELECT pet_uid, skill_type FROM pet_skills
    WHERE name IN ('除厄', '洗礼', '生日蛋糕', '清洗')
      AND pet_uid IN (SELECT uid FROM pets WHERE is_final_form = 1)
  `).all();
  for (const row of cleanseRows) {
    const existing = cleansePets.get(row.pet_uid);
    const isNonBloodline = row.skill_type !== 'bloodline_skills';
    if (!existing) {
      cleansePets.set(row.pet_uid, { hasNonBloodline: isNonBloodline });
    } else if (isNonBloodline) {
      existing.hasNonBloodline = true;
    }
  }

  // Batch query: super-effective attack skills with counter-ability detection
  // For each final-form pet, find their best SE attack skill considering stat-type synergy
  // We store ALL SE skills per pet, then pick the best one during scoring (needs pet's atk/matk)
  const superEffectiveSkillsByPet = new Map(); // pet_uid -> [{ power, type, hasCounter, cost }]
  if (targetWeakTo.size > 0) {
    const placeholders = Array.from(targetWeakTo).map(() => '?').join(',');
    const seRows = db.prepare(`
      SELECT pet_uid, power, type, cost, description FROM pet_skills
      WHERE element IN (${placeholders}) AND power > 0 AND (type = '物攻' OR type = '魔攻')
        AND skill_type != 'bloodline_skills'
        AND pet_uid IN (SELECT uid FROM pets WHERE is_final_form = 1)
      ORDER BY power DESC
    `).all(...Array.from(targetWeakTo));
    for (const row of seRows) {
      const hasCounter = row.description && (row.description.includes('应对状态') || row.description.includes('应对防御'));
      if (!superEffectiveSkillsByPet.has(row.pet_uid)) {
        superEffectiveSkillsByPet.set(row.pet_uid, []);
      }
      superEffectiveSkillsByPet.get(row.pet_uid).push({ power: row.power, type: row.type, hasCounter, cost: row.cost || 0 });
    }
  }

  // --- Step 5: Score and rank by resistance groups ---
  // Core idea: group candidates by how many of the boss's attack elements they resist
  // Group 1: Resists ALL attack elements (best)
  // Group 2..N: Resists some subset (sorted by count desc, then by specific combos)
  // Pets that resist NONE of the attack elements are excluded entirely

  // Determine which attack elements each candidate pet resists
  function getResistElements(defElemIds) {
    const resisted = [];
    for (const atkElemName of attackElementList) {
      const atkElem = elemByName[atkElemName];
      if (!atkElem) continue;
      let mult = 1;
      for (const defId of defElemIds) {
        const defElem = elemById[defId];
        if (!defElem) continue;
        if (atkElem.strong_against?.some(e => e.id === defId || e.name === defElem.name)) {
          mult *= 2; // Weak to this attack
        } else if (defElem.resistant_to?.some(e => e.id === atkElem.id || e.name === atkElem.name)) {
          mult *= 0.5; // Resists this attack
        }
      }
      if (mult < 1) resisted.push(atkElemName); // Any reduction counts as resistance
    }
    return resisted;
  }

  // Determine which attack elements the candidate pet is WEAK to (takes super-effective damage)
  function getWeakElements(defElemIds) {
    const weak = [];
    for (const atkElemName of attackElementList) {
      const atkElem = elemByName[atkElemName];
      if (!atkElem) continue;
      let mult = 1;
      for (const defId of defElemIds) {
        const defElem = elemById[defId];
        if (!defElem) continue;
        if (atkElem.strong_against?.some(e => e.id === defId || e.name === defElem.name)) {
          mult *= 2;
        } else if (defElem.resistant_to?.some(e => e.id === atkElem.id || e.name === atkElem.name)) {
          mult *= 0.5;
        }
      }
      if (mult > 1) weak.push(atkElemName); // Takes super-effective damage
    }
    return weak;
  }

  // Analyze boss's own weaknesses to determine attacker preference
  // If boss has low physical def, prefer physical attackers; if low magic def, prefer magic attackers
  const bossDefStat = pet.def;
  const bossMdefStat = pet.mdef;
  // Attacker preference: which type of attacker is more effective against the boss
  // This gives a bonus to candidates whose attack type matches the boss's weaker defense
  const bossWeakerDef = bossDefStat <= bossMdefStat ? 'physical' : 'magical';

  // --- Determine which status effects the boss uses (from skills/ability descriptions) ---
  // If the boss's skills or ability mention status keywords, candidates whose MAIN element
  // matches that status type should be excluded (they likely rely on that status to fight,
  // but the boss is immune to it). Sub-element candidates are kept (they can fight with main element).
  //   "灼烧" → Fire(3), "寄生" → Grass(2), "中毒" → Poison(10), "冰冻/冻结" → Ice(7)
  const STATUS_KEYWORD_MAP = [
    { keywords: ['灼烧'], elementId: 3 },   // Fire → burn
    { keywords: ['寄生'], elementId: 2 },   // Grass → leech
    { keywords: ['中毒'], elementId: 10 },  // Poison → poison
    { keywords: ['冰冻', '冻结'], elementId: 7 }, // Ice → freeze
  ];

  // Gather all text to search: boss's ACTUAL battle skills + ability description
  // If fate flower skills are configured, only use those (they represent what the boss actually uses)
  // Otherwise fallback to all skills
  let bossSkillDescs;
  if (fateSkills.length > 0) {
    // Only query descriptions for the configured fate flower skills
    const fateSkillUids = fateSkills.map(fs => fs.skill_ref_uid).filter(Boolean);
    if (fateSkillUids.length > 0) {
      const ph = fateSkillUids.map(() => '?').join(',');
      bossSkillDescs = db.prepare(
        `SELECT COALESCE(sk.description, ps.description) as description
         FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
         WHERE ps.pet_uid = ? AND ps.skill_ref_uid IN (${ph}) AND ps.description IS NOT NULL`
      ).all(petUid, ...fateSkillUids).map(r => r.description);
    } else {
      bossSkillDescs = [];
    }
  } else {
    // Fallback: use all skills
    bossSkillDescs = db.prepare(
      `SELECT COALESCE(sk.description, ps.description) as description
       FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
       WHERE ps.pet_uid = ? AND ps.description IS NOT NULL`
    ).all(petUid).map(r => r.description);
  }
  const bossAbilityDesc = pet.ability_desc || '';
  const allBossText = [...bossSkillDescs, bossAbilityDesc].join('\n');

  const statusImmunities = new Set(); // element IDs whose status the boss uses (candidates with this MAIN elem excluded)
  for (const { keywords, elementId } of STATUS_KEYWORD_MAP) {
    if (keywords.some(kw => allBossText.includes(kw))) {
      statusImmunities.add(elementId);
    }
  }

  // Detect if boss has burn (灼烧) or poison (中毒) in skills/ability
  // If so, pets that can cleanse their own debuffs get a high-priority bonus
  const bossHasBurnOrPoison = allBossText.includes('灼烧') || allBossText.includes('中毒') || allBossText.includes('中毒印记');

  // Determine which elements the boss RESISTS (for lifesteal skill evaluation)
  const bossResists = new Set(); // element names that the boss resists
  for (const defId of targetElemIds) {
    const defElem = elemById[defId];
    if (!defElem || !defElem.resistant_to) continue;
    for (const r of defElem.resistant_to) {
      bossResists.add(r.name);
    }
  }

  // Weight constants - new priority system:
  // 贪婪 = 净化(对抗中毒灼烧) > 克制boss的吸血续航 > 大威力应对克制(boss有状态时) > 大威力克制 > 抵抗 > 不被抵抗的吸血续航 > 普通应对克制 > 其他 > 被抵抗的吸血续航
  const W_GREEDY = 10;          // Can learn "贪婪" (100% lifesteal - highest priority)
  const W_CLEANSE = 10;         // Can learn self-debuff cleanse (only when boss has burn/poison)
  const W_LIFESTEAL_SE = 8;    // Lifesteal skill that counters boss (element in targetWeakTo)
  const W_SE_ATTACK = 6;       // Core: super-effective attack (high power)
  const W_RESIST = 3;          // Resists boss attack elements (per element resisted)
  const W_LIFESTEAL_NEUTRAL = 2; // Lifesteal skill not resisted by boss
  const W_COUNTER_DEFENSE = 0.5; // Counter-defense skills (very low priority)
  const W_DEF_STAT = 0.5;      // Defense stat (minor tiebreaker)
  const W_LIFESTEAL_RESISTED = -1; // Lifesteal skill resisted by boss (penalty)
  const W_METEOR_RABBIT = 999; // 落陨星兔: passive prevents end-of-turn effects (burn/poison immune)

  // Find max defense stat for normalization
  let maxDef = 1;
  for (const p of finalPetsDeduped) {
    if (p[defenseStat] > maxDef) maxDef = p[defenseStat];
  }

  // Score each pet
  const scored = finalPetsDeduped.map(p => {
    const defElemIds = [p.element_id];
    if (p.sub_element_id) defElemIds.push(p.sub_element_id);

    // Determine which attack elements this pet resists
    const resistedElements = getResistElements(defElemIds);

    // Skip pets that don't resist any attack element
    if (resistedElements.length === 0) return null;

    // Determine which attack elements this pet is WEAK to → EXCLUDE entirely
    const weakElements = getWeakElements(defElemIds);
    if (weakElements.length > 0) return null; // Being weak to ANY boss attack = not recommended

    // Exclude pets whose MAIN element relies on status effects the boss uses
    // e.g. main element is Poison but boss uses poison status (immune to it)
    // Sub-element pets are kept: they can fight with their main element
    if (statusImmunities.has(p.element_id)) return null;

    // === NEW SCORING SYSTEM ===
    // Priority: 贪婪=净化(对抗中毒灼烧) > 克制boss的吸血续航 > boss有状态时大威力应对克制 > 大威力克制 > 抵抗 > 不被抵抗的吸血续航 > 普通应对克制 > 其他 > 被抵抗的吸血续航

    // --- SE Attack Score ---
    // hasCounter bonus only applies when boss has status skills
    let seAttackScore = 0;
    const seSkills = superEffectiveSkillsByPet.get(p.uid);
    if (seSkills && seSkills.length > 0) {
      const petAtk = p.atk;
      const petMatk = p.matk;
      const maxStat = Math.max(petAtk, petMatk, 1);

      const skillScores = [];
      for (const sk of seSkills) {
        // Cost > 5: skip entirely (not counted for scoring)
        if (sk.cost > 5) continue;
        const statRatio = sk.type === '物攻' ? (petAtk / maxStat) : (petMatk / maxStat);
        const effPower = sk.power * statRatio;
        // hasCounter only matters when boss has status skills
        const counterBonus = (sk.hasCounter && hasStatusSkills) ? true : false;
        // Cost > 4: downgrade (only for high-power skills with power > 80)
        const costPenalty = (sk.cost > 4 && sk.power >= 70) ? true : false;
        skillScores.push({ effPower, hasCounter: counterBonus, costPenalty });
      }

      skillScores.sort((a, b) => {
        if (a.hasCounter !== b.hasCounter && Math.min(a.effPower, b.effPower) >= Math.max(a.effPower, b.effPower) * 0.8) {
          return a.hasCounter ? -1 : 1;
        }
        return b.effPower - a.effPower;
      });

      function calcSkillScore(effPower, hasCounter, costPenalty) {
        // High power (>=70): big bonus; hasCounter adds extra when boss has status
        // costPenalty: cost > 4 for high-power skills → downgrade one tier
        let score;
        if (effPower >= 120) score = hasCounter ? 3 : 2;
        else if (effPower >= 70) score = hasCounter ? 2.5 : 1.5;
        else if (effPower >= 40) score = hasCounter ? 2 : 1;
        else if (effPower > 0) score = hasCounter ? 1 : 0.5;
        else return 0;
        // Downgrade by 0.5 if cost > 4 (only affects high-power skills power >= 70)
        if (costPenalty) score = Math.max(0.5, score - 0.5);
        return score;
      }

      if (skillScores.length === 0) {
        seAttackScore = 0;
      } else {
        const best = skillScores[0];
        seAttackScore = calcSkillScore(best.effPower, best.hasCounter, best.costPenalty);

        if (skillScores.length >= 2) {
          const second = skillScores[1];
          seAttackScore += calcSkillScore(second.effPower, second.hasCounter, second.costPenalty) * 0.5;
        }
      }
    }

    // --- Counter-defense bonus (very low priority, only when boss has defense skills) ---
    let counterDefenseBonus = 0;
    if (hasDefenseSkills && counterDefensePets.has(p.uid)) {
      counterDefenseBonus = 1;
    }

    // --- Counter-attack bonus (NO score, only icon display) ---
    let counterAttackBonus = 0;
    if (counterAttackPets.has(p.uid)) {
      counterAttackBonus = 1; // Only for display, weight is 0
    }

    // --- Counter-status bonus (NO score when boss has no status skills, only icon display) ---
    let counterStatusBonus = 0;
    if (hasStatusSkills && counterStatusPets.has(p.uid)) {
      counterStatusBonus = counterStatusPets.get(p.uid).score; // Only for display when boss has no status
    }

    // --- Resistance score: bonus per resisted element ---
    const resistScore = resistedElements.length;

    // --- Defense stat (minor tiebreaker, normalized 0~1) ---
    const defValue = p[defenseStat];
    const defNormalized = defValue / maxDef;

    // --- Lifesteal evaluation: categorize as SE / neutral / resisted ---
    // 撕裂/抽枝/暗突袭 are "应对状态" type - only count when boss has status skills
    let lifestealBonus = 0; // Will hold the weighted score
    let lifestealCategory = ''; // 'se', 'neutral', 'resisted', or ''
    const petLifestealSkills = lifestealPetSkills.get(p.uid);
    if (petLifestealSkills && petLifestealSkills.length > 0) {
      // Filter out counter-status lifesteal skills when boss has no status skills
      const effectiveSkills = petLifestealSkills.filter(ls => !ls.needsStatus || hasStatusSkills);
      if (effectiveSkills.length > 0) {
        // Find the best category among all effective lifesteal skills
        let bestCat = 'resisted'; // worst case
        for (const ls of effectiveSkills) {
          if (!ls.element) {
            // No element (e.g. 等价交换 is 防御 type) → treat as neutral
            if (bestCat === 'resisted') bestCat = 'neutral';
          } else if (targetWeakTo.has(ls.element)) {
            bestCat = 'se'; // Counters boss
            break; // Can't get better than this
          } else if (!bossResists.has(ls.element)) {
            if (bestCat !== 'se') bestCat = 'neutral';
          }
          // else: resisted, keep current bestCat
        }
        lifestealCategory = bestCat;
        if (bestCat === 'se') lifestealBonus = 1;
        else if (bestCat === 'neutral') lifestealBonus = 1;
        else lifestealBonus = 1; // resisted: will use negative weight
      }
    }

    // --- Greedy & Cleanse (highest priority, same level) ---
    let greedyBonus = 0;
    let cleanseBonus = 0;
    const hasGreedy = greedyPets.has(p.uid);
    const hasCleanse = bossHasBurnOrPoison && cleansePets.has(p.uid);

    if (hasGreedy && hasCleanse) {
      const greedyInfo = greedyPets.get(p.uid);
      const cleanseInfo = cleansePets.get(p.uid);
      if (!greedyInfo.hasNonBloodline && !cleanseInfo.hasNonBloodline) {
        greedyBonus = 1;
        cleanseBonus = 0;
      } else {
        greedyBonus = 1;
        cleanseBonus = 1;
      }
    } else {
      if (hasGreedy) greedyBonus = 1;
      if (hasCleanse) cleanseBonus = 1;
    }

    // --- 落陨星兔 special bonus ---
    const meteorRabbitBonus = (bossHasBurnOrPoison && p.uid === 'pet_337') ? 1 : 0;

    // --- Total score ---
    const lifestealWeight = lifestealCategory === 'se' ? W_LIFESTEAL_SE
      : lifestealCategory === 'neutral' ? W_LIFESTEAL_NEUTRAL
      : lifestealCategory === 'resisted' ? W_LIFESTEAL_RESISTED : 0;

    const totalScore = greedyBonus * W_GREEDY
      + cleanseBonus * W_CLEANSE
      + lifestealBonus * lifestealWeight
      + seAttackScore * W_SE_ATTACK
      + resistScore * W_RESIST
      + counterDefenseBonus * W_COUNTER_DEFENSE
      + defNormalized * W_DEF_STAT
      + meteorRabbitBonus * W_METEOR_RABBIT;

    return {
      ...p,
      resisted_elements: resistedElements,
      resist_count: resistedElements.length,
      se_attack_score: seAttackScore,
      counter_status_bonus: counterStatusBonus,
      counter_defense_bonus: counterDefenseBonus,
      counter_attack_bonus: counterAttackBonus,
      lifesteal_bonus: lifestealBonus,
      lifesteal_category: lifestealCategory,
      greedy_bonus: greedyBonus,
      cleanse_bonus: cleanseBonus,
      meteor_rabbit_bonus: meteorRabbitBonus,
      def_value: defValue,
      total_score: totalScore,
    };
  }).filter(Boolean); // Remove nulls (pets that resist nothing)

  // Sort all scored pets by total_score desc (flat list, no grouping)
  scored.sort((a, b) => b.total_score - a.total_score);

  // Take top 20 pets
  const topPets = scored.slice(0, 20).map(p => ({
    uid: p.uid,
    name: p.name,
    image_url: p.image_url,
    element_name: p.element_name,
    element_icon: p.element_icon,
    element_color: p.element_color,
    sub_element_name: p.sub_element_name,
    sub_element_icon: p.sub_element_icon,
    sub_element_color: p.sub_element_color,
    hp: p.hp,
    atk: p.atk,
    matk: p.matk,
    def: p.def,
    mdef: p.mdef,
    speed: p.speed,
    total: p.total,
    resisted_elements: p.resisted_elements,
    se_attack_score: p.se_attack_score,
    counter_status_bonus: p.counter_status_bonus,
    counter_defense_bonus: p.counter_defense_bonus,
    counter_attack_bonus: p.counter_attack_bonus,
    lifesteal_bonus: p.lifesteal_bonus,
    lifesteal_category: p.lifesteal_category,
    greedy_bonus: p.greedy_bonus,
    cleanse_bonus: p.cleanse_bonus,
    meteor_rabbit_bonus: p.meteor_rabbit_bonus,
    def_value: p.def_value,
    total_score: Math.round(p.total_score * 100) / 100,
  }));

  return {
    attack_profile: {
      tendency: attackTendency,
      tendency_values: { atk, matk },
      elements: attackElementList,
      defense_stat_used: defenseStat,
      has_status_skills: hasStatusSkills,
      has_defense_skills: hasDefenseSkills,
      has_attack_skills: true,
      target_weak_to: Array.from(targetWeakTo),
      boss_weaker_def: bossWeakerDef,
      boss_def: bossDefStat,
      boss_mdef: bossMdefStat,
    },
    pets: topPets,
  };
}

module.exports = { list, getByUid, getShinyList, findByCoverage, getCounterPicks };
