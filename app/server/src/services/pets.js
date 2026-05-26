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
           COALESCE(sk.power, ps.power) as power
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'skills'
    ORDER BY CAST(ps.level AS INTEGER), ${skillOrderSql}, ${skillIdOrder}
  `).all(pet.uid);
  // Bloodline skills: sort by element order > skill ID
  pet.bloodline_skills = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon,
           COALESCE(sk.cost, ps.cost) as cost,
           COALESCE(sk.power, ps.power) as power
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'bloodline_skills'
    ORDER BY ${skillOrderSql}, ${skillIdOrder}
  `).all(pet.uid);
  // Learnable stones: sort by element order > skill ID
  pet.learnable_stones = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon,
           COALESCE(sk.cost, ps.cost) as cost,
           COALESCE(sk.power, ps.power) as power
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

  // --- Step 2b: Detect target pet's skill types ---
  const hasStatusSkills = db.prepare(`
    SELECT COUNT(*) as c FROM pet_skills WHERE pet_uid = ? AND type = '状态'
  `).get(petUid).c > 0;

  const hasDefenseSkills = db.prepare(`
    SELECT COUNT(*) as c FROM pet_skills WHERE pet_uid = ? AND type = '防御'
  `).get(petUid).c > 0;

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
  const lifestealPets = new Set(); // pet_uid
  const lifestealRows = db.prepare(`
    SELECT DISTINCT pet_uid FROM pet_skills
    WHERE name IN ('蝙蝠', '暗突袭', '撕裂', '等价交换', '抽枝', '气沉丹田')
      AND pet_uid IN (SELECT uid FROM pets WHERE is_final_form = 1)
  `).all();
  for (const row of lifestealRows) {
    lifestealPets.add(row.pet_uid);
  }

  // Batch query: pets that can learn "贪婪" (100% lifesteal - highest priority sustain)
  const greedyPets = new Set(); // pet_uid
  const greedyRows = db.prepare(`
    SELECT DISTINCT pet_uid FROM pet_skills
    WHERE name = '贪婪'
      AND pet_uid IN (SELECT uid FROM pets WHERE is_final_form = 1)
  `).all();
  for (const row of greedyRows) {
    greedyPets.add(row.pet_uid);
  }

  // Batch query: super-effective attack skills with counter-ability detection
  // For each final-form pet, find their best SE attack skill considering stat-type synergy
  // We store ALL SE skills per pet, then pick the best one during scoring (needs pet's atk/matk)
  const superEffectiveSkillsByPet = new Map(); // pet_uid -> [{ power, type, hasCounter }]
  if (targetWeakTo.size > 0) {
    const placeholders = Array.from(targetWeakTo).map(() => '?').join(',');
    const seRows = db.prepare(`
      SELECT pet_uid, power, type, description FROM pet_skills
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
      superEffectiveSkillsByPet.get(row.pet_uid).push({ power: row.power, type: row.type, hasCounter });
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

  // Gather all text to search: boss skill descriptions + ability description
  const bossSkillDescs = db.prepare(
    `SELECT description FROM pet_skills WHERE pet_uid = ? AND description IS NOT NULL`
  ).all(petUid).map(r => r.description);
  const bossAbilityDesc = pet.ability_desc || '';
  const allBossText = [...bossSkillDescs, bossAbilityDesc].join('\n');

  const statusImmunities = new Set(); // element IDs whose status the boss uses (candidates with this MAIN elem excluded)
  for (const { keywords, elementId } of STATUS_KEYWORD_MAP) {
    if (keywords.some(kw => allBossText.includes(kw))) {
      statusImmunities.add(elementId);
    }
  }

  // Weight constants
  const W_SE_ATTACK = 4;       // Core: super-effective attack + counter synergy
  const W_COUNTER_STATUS = 2;  // Counter-status attack skills
  const W_COUNTER_DEFENSE = 1.5; // Counter-defense skills
  const W_COUNTER_ATTACK = 1.5;  // Counter-attack defense skills (survivability)
  const W_DEF_STAT = 1;        // Defense stat
  const W_BOSS_WEAK = 0.5;     // Bonus for matching boss's weaker defense
  const W_LIFESTEAL = 3;       // Lifesteal/drain skills (high sustain)
  const W_GREEDY = 5;          // Can learn "贪婪" (100% lifesteal - highest priority)

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

    // Dimension 1 (Core): Super-effective attack + counter synergy
    // Pick the best TWO SE skills (practical: 1 defense + 1 status + 2 attack slots)
    // Second skill scores at 50% to avoid over-stacking
    let seAttackScore = 0;
    const seSkills = superEffectiveSkillsByPet.get(p.uid);
    if (seSkills && seSkills.length > 0) {
      const petAtk = p.atk;
      const petMatk = p.matk;
      const maxStat = Math.max(petAtk, petMatk, 1);

      // Calculate effective power for each SE skill
      const skillScores = [];
      for (const sk of seSkills) {
        const statRatio = sk.type === '物攻' ? (petAtk / maxStat) : (petMatk / maxStat);
        const effPower = sk.power * statRatio;
        skillScores.push({ effPower, hasCounter: sk.hasCounter });
      }

      // Sort by: prefer counter skills first (if close in power), then by effective power
      skillScores.sort((a, b) => {
        // If both have similar effective power (within 80%), prefer the one with counter
        if (a.hasCounter !== b.hasCounter && Math.min(a.effPower, b.effPower) >= Math.max(a.effPower, b.effPower) * 0.8) {
          return a.hasCounter ? -1 : 1;
        }
        return b.effPower - a.effPower;
      });

      // Score function for a single skill
      function calcSkillScore(effPower, hasCounter) {
        if (effPower >= 120) return hasCounter ? 3 : 2;
        if (effPower >= 80) return hasCounter ? 2.5 : 1.5;
        if (effPower >= 40) return hasCounter ? 2 : 1;
        if (effPower > 0) return hasCounter ? 1 : 0.5;
        return 0;
      }

      // Best skill: full score
      const best = skillScores[0];
      seAttackScore = calcSkillScore(best.effPower, best.hasCounter);

      // Second best skill: 50% score (max 2 skills counted)
      if (skillScores.length >= 2) {
        const second = skillScores[1];
        seAttackScore += calcSkillScore(second.effPower, second.hasCounter) * 0.5;
      }
    }

    // Dimension 2: Counter-status bonus
    let counterStatusBonus = 0;
    if (hasStatusSkills && counterStatusPets.has(p.uid)) {
      counterStatusBonus = counterStatusPets.get(p.uid).score;
    }

    // Dimension 3: Counter-defense bonus
    let counterDefenseBonus = 0;
    if (hasDefenseSkills && counterDefensePets.has(p.uid)) {
      counterDefenseBonus = 1;
    }

    // Dimension 4: Counter-attack bonus (survivability)
    let counterAttackBonus = 0;
    if (counterAttackPets.has(p.uid)) {
      counterAttackBonus = 1;
    }

    // Dimension 5: Defense stat (normalized 0~1)
    const defValue = p[defenseStat];
    const defNormalized = defValue / maxDef;

    // Dimension 6: Boss weakness exploitation bonus
    // If boss has lower physical def, physical attackers get bonus; vice versa
    let bossWeakBonus = 0;
    const petMainAttackType = p.atk >= p.matk ? 'physical' : 'magical';
    if (petMainAttackType === bossWeakerDef) {
      bossWeakBonus = 1;
    }

    // Dimension 7: Lifesteal/drain bonus (high sustain)
    let lifestealBonus = 0;
    if (lifestealPets.has(p.uid)) {
      lifestealBonus = 1;
    }

    // Dimension 8: "贪婪" skill bonus (100% lifesteal - highest priority)
    let greedyBonus = 0;
    if (greedyPets.has(p.uid)) {
      greedyBonus = 1;
    }

    // Total score (within group)
    const totalScore = seAttackScore * W_SE_ATTACK
      + counterStatusBonus * W_COUNTER_STATUS
      + counterDefenseBonus * W_COUNTER_DEFENSE
      + counterAttackBonus * W_COUNTER_ATTACK
      + defNormalized * W_DEF_STAT
      + bossWeakBonus * W_BOSS_WEAK
      + lifestealBonus * W_LIFESTEAL
      + greedyBonus * W_GREEDY;

    return {
      ...p,
      resisted_elements: resistedElements,
      resist_count: resistedElements.length,
      se_attack_score: seAttackScore,
      counter_status_bonus: counterStatusBonus,
      counter_defense_bonus: counterDefenseBonus,
      counter_attack_bonus: counterAttackBonus,
      boss_weak_bonus: bossWeakBonus,
      lifesteal_bonus: lifestealBonus,
      greedy_bonus: greedyBonus,
      def_value: defValue,
      total_score: totalScore,
    };
  }).filter(Boolean); // Remove nulls (pets that resist nothing)

  // Group by resistance pattern
  // Sort key for groups: resist_count desc, then alphabetical element combo
  const groupMap = new Map(); // "水,毒" -> [pets]
  for (const p of scored) {
    const key = p.resisted_elements.sort().join(',');
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(p);
  }

  // Sort groups: more elements resisted first, then alphabetical
  const sortedGroups = Array.from(groupMap.entries())
    .sort((a, b) => {
      const countA = a[0].split(',').length;
      const countB = b[0].split(',').length;
      if (countB !== countA) return countB - countA;
      return a[0].localeCompare(b[0]);
    });

  // Within each group, sort by total_score desc
  const groups = sortedGroups.map(([key, pets]) => {
    pets.sort((a, b) => b.total_score - a.total_score);
    const topPets = pets.slice(0, 10).map(p => ({
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
      se_attack_score: p.se_attack_score,
      counter_status_bonus: p.counter_status_bonus,
      counter_defense_bonus: p.counter_defense_bonus,
      counter_attack_bonus: p.counter_attack_bonus,
      boss_weak_bonus: p.boss_weak_bonus,
      lifesteal_bonus: p.lifesteal_bonus,
      greedy_bonus: p.greedy_bonus,
      def_value: p.def_value,
      total_score: Math.round(p.total_score * 100) / 100,
    }));
    return {
      resisted_elements: key.split(','),
      label: `抵抗 ${key.split(',').join('+')}`,
      count: pets.length,
      pets: topPets,
    };
  });

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
    groups,
  };
}

module.exports = { list, getByUid, getShinyList, findByCoverage, getCounterPicks };
