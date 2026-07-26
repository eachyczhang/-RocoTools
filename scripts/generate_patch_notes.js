/**
 * Season Patch Notes Generator
 *
 * Compare two season database snapshots and generate a formatted patch notes document.
 * Focuses on gameplay-relevant changes: skill balance, pet stats, abilities, new content.
 *
 * Usage:
 *   node scripts/generate_patch_notes.js <old_db_path> <new_db_path> [--output <path>]
 *
 * Example:
 *   node scripts/generate_patch_notes.js temp/seasons/season_S1_20260521.db temp/seasons/season_S2_20260524.db
 *   node scripts/generate_patch_notes.js temp/seasons/season_S1_20260521.db temp/seasons/season_S2_20260524.db --output temp/patch_S2.md
 */

const path = require('path');
const fs = require('fs');

// Resolve better-sqlite3 from app/server
const PROJECT_ROOT = path.resolve(__dirname, '..');
const Database = require(path.join(PROJECT_ROOT, 'app/server/node_modules/better-sqlite3'));
const { ELEMENT_SORT_ORDER } = require(path.join(PROJECT_ROOT, 'app/server/src/constants/elementOrder'));

// ============ CLI Args ============
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/generate_patch_notes.js <old_db> <new_db> [--output <path>]');
  process.exit(1);
}

const oldDbPath = path.resolve(PROJECT_ROOT, args[0]);
const newDbPath = path.resolve(PROJECT_ROOT, args[1]);
const outputIdx = args.indexOf('--output');
const stdoutOnly = args.includes('--stdout');
const outputPath = outputIdx !== -1 && args[outputIdx + 1]
  ? path.resolve(PROJECT_ROOT, args[outputIdx + 1])
  : path.resolve(PROJECT_ROOT, 'temp', `patch_notes_${path.basename(newDbPath, '.db')}.md`);

if (!fs.existsSync(oldDbPath)) { console.error(`File not found: ${oldDbPath}`); process.exit(1); }
if (!fs.existsSync(newDbPath)) { console.error(`File not found: ${newDbPath}`); process.exit(1); }

const db1 = new Database(oldDbPath, { readonly: true });
const db2 = new Database(newDbPath, { readonly: true });

// ============ Helpers ============
function getRows(db, table, keyCols) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  const map = new Map();
  for (const row of rows) {
    const key = keyCols.map(c => row[c] ?? '').join('|');
    map.set(key, row);
  }
  return map;
}

function diffRow(row1, row2, ignoreCols = []) {
  const changes = {};
  for (const key of Object.keys(row2)) {
    if (ignoreCols.includes(key)) continue;
    if (row1[key] !== row2[key]) {
      changes[key] = { old: row1[key], new: row2[key] };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

// ============ Data Collection ============

// Get season info
const season1 = db1.prepare('SELECT * FROM seasons WHERE is_current = 1').get() || db1.prepare('SELECT * FROM seasons LIMIT 1').get();
const season2 = db2.prepare('SELECT * FROM seasons WHERE is_current = 1').get() || db2.prepare('SELECT * FROM seasons ORDER BY id DESC LIMIT 1').get();

const oldSeasonName = season1?.name || 'Unknown';
const newSeasonName = season2?.name || 'Unknown';
const oldSeasonId = season1?.id || '?';
const newSeasonId = season2?.id || '?';

// Parse season2 pet lists (传说/赛季奇遇/通行证/异色)
const parseList = json => { try { return JSON.parse(json || '[]'); } catch { return []; } };
const stripPrefix = id => id.replace(/^pet_/, '');
const makeIdSet = list => new Set([...list, ...list.map(stripPrefix)]);

const s2LegendIds  = makeIdSet((() => {
  const v = season2?.legend_pet;
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : [p]; } catch { return [v]; }
})());
const s2SeasonIds  = makeIdSet(parseList(season2?.season_pets));
const s2PassIds    = makeIdSet(parseList(season2?.pass_pets));
const s2ShinyIds   = makeIdSet(parseList(season2?.shiny_pets));

// Shiny images are rendered dynamically by the frontend (onerror hides if missing)

// Pet names lookup
const petNames = {};
db2.prepare('SELECT uid, name FROM pets').all().forEach(r => { petNames[r.uid] = r.name; });
const oldPetNames = {};
db1.prepare('SELECT uid, name FROM pets').all().forEach(r => { oldPetNames[r.uid] = r.name; });

// Element names & icons lookup
const elementNames = {};
const elementIcons = {};
db2.prepare('SELECT id, name, icon FROM elements').all().forEach(r => { elementNames[r.id] = r.name; if (r.icon) elementIcons[r.id] = r.icon; });

// Skill icon lookup
const skillIcons = {};
db2.prepare('SELECT uid, icon_url FROM skills WHERE icon_url IS NOT NULL').all().forEach(r => { skillIcons[r.uid] = r.icon_url; });

// Helper: render skill icon, fallback to element icon if skill icon missing
function skillIconMd(uid, elementId) {
  if (skillIcons[uid]) return `![skill:${uid}]`;
  if (elementId && elementIcons[elementId]) return `![element:${elementIcons[elementId]}]`;
  return `![skill:${uid}]`; // keep original syntax as last resort
}

// Ability icon lookup from pet_details
const abilityIcons = {};
try {
  db2.prepare('SELECT pet_uid, ability_icon FROM pet_details WHERE ability_icon IS NOT NULL').all()
    .forEach(r => { abilityIcons[r.pet_uid] = r.ability_icon; });
} catch {}

// Pet thumb lookup
const petThumbs = {};
db2.prepare('SELECT uid, thumb_url FROM pets WHERE thumb_url IS NOT NULL').all().forEach(r => { petThumbs[r.uid] = r.thumb_url; });

// Pet artwork lookup. Prefer paths recorded in the compared database because
// imported BWIKI originals may exist before thumbnail/WebP derivatives.
const petArtwork = {};
try {
  db2.prepare('SELECT pet_uid, image_default, image_shiny FROM pet_details').all()
    .forEach(r => { petArtwork[r.pet_uid] = r; });
} catch {}

function petArtworkMd(uid, { shinyOnly = false } = {}) {
  const artwork = petArtwork[uid] || {};
  if (shinyOnly && artwork.image_shiny) return `![img:${artwork.image_shiny}]`;
  const defaultUrl = artwork.image_default || petThumbs[uid];
  return defaultUrl ? `![img:${defaultUrl}]` : `![pet:${uid}]`;
}

// --- Skills ---
const skills1 = getRows(db1, 'skills', ['uid']);
const skills2 = getRows(db2, 'skills', ['uid']);

const newSkills = [];
const modifiedSkills = [];
const SKILL_IGNORE = ['manual_edit', 'version'];
const SKILL_VALUE_FIELDS = ['cost', 'power', 'description', 'category', 'element_id', 'name'];

for (const [key, s2] of skills2) {
  if (!skills1.has(key)) {
    newSkills.push(s2);
  } else {
    const diff = diffRow(skills1.get(key), s2, SKILL_IGNORE);
    if (diff) {
      // Only include if there are gameplay-relevant changes
      const relevant = Object.keys(diff).filter(k => SKILL_VALUE_FIELDS.includes(k));
      if (relevant.length > 0) {
        modifiedSkills.push({ skill: s2, changes: diff, relevantFields: relevant });
      }
    }
  }
}

// --- Pets ---
const pets1 = getRows(db1, 'pets', ['uid']);
const pets2 = getRows(db2, 'pets', ['uid']);

const newPets = [];
const PET_IGNORE = ['manual_edit', 'is_final_form', 'is_legendary', 'is_season', 'is_pass', 'is_boss_form', 'has_boss_form', 'show_shiny'];
const PET_STAT_FIELDS = ['hp', 'speed', 'atk', 'matk', 'def', 'mdef', 'total'];
const PET_ABILITY_FIELDS = ['ability_name', 'ability_desc'];

const statChangedPets = [];
const abilityChangedPets = [];

const statSupplementedPets = []; // pets where all stat changes are from 0 (data fill-in)

for (const [key, p2] of pets2) {
  if (!pets1.has(key)) {
    newPets.push(p2);
  } else {
    const diff = diffRow(pets1.get(key), p2, PET_IGNORE);
    if (diff) {
      const statFields = Object.keys(diff).filter(k => PET_STAT_FIELDS.includes(k));
      const abilityFields = Object.keys(diff).filter(k => PET_ABILITY_FIELDS.includes(k));
      if (statFields.length > 0) {
        // Check if ALL changed stat fields were previously 0 (data fill-in, not balance change)
        const allFromZero = statFields.every(f => (pets1.get(key)[f] === 0 || pets1.get(key)[f] === null));
        if (allFromZero) {
          statSupplementedPets.push({ pet: p2, changes: diff, fields: statFields });
        } else {
          statChangedPets.push({ pet: p2, changes: diff, fields: statFields });
        }
      }
      if (abilityFields.length > 0) {
        abilityChangedPets.push({ pet: p2, changes: diff, fields: abilityFields });
      }
    }
  }
}

// --- Pet Skills (learning changes) ---
const petSkills1 = getRows(db1, 'pet_skills', ['pet_uid', 'skill_type', 'name']);
const petSkills2 = getRows(db2, 'pet_skills', ['pet_uid', 'skill_type', 'name']);

const existingPetUids = new Set(pets1.keys());
const skillsAdded = []; // existing pets gaining new skills
const skillsRemoved = []; // existing pets losing skills

for (const [key, r] of petSkills2) {
  if (!petSkills1.has(key) && existingPetUids.has(r.pet_uid)) {
    skillsAdded.push(r);
  }
}
for (const [key, r] of petSkills1) {
  if (!petSkills2.has(key) && existingPetUids.has(r.pet_uid)) {
    skillsRemoved.push(r);
  }
}

// Group skill learning changes by pet
function groupByPet(records) {
  const grouped = {};
  for (const r of records) {
    if (!grouped[r.pet_uid]) grouped[r.pet_uid] = [];
    grouped[r.pet_uid].push(r);
  }
  return grouped;
}

// Pre-compute new shiny pets (for summary)
// Only count OLD pets that newly gained shiny in S2 (exclude brand-new pets which are shown in their own section)
const oldShinyIds = makeIdSet(parseList(season1?.shiny_pets));
const newPetUidSet = new Set(newPets.map(p => p.uid));
const newPetPetIdSet = new Set(newPets.map(p => p.pet_id));
// Normalize to pet_xxx format, deduplicate, then filter
const _rawShinyNew = [...s2ShinyIds].filter(id => {
  if (oldShinyIds.has(id)) return false;
  const stripped = stripPrefix(id);
  if (newPetUidSet.has(id) || newPetUidSet.has('pet_' + stripped)) return false;
  if (newPetPetIdSet.has(id) || newPetPetIdSet.has(stripped)) return false;
  return true;
});
// Deduplicate: normalize all to pet_xxx format
const _shinySeenNorm = new Set();
const newShinyOnlyIds = [];
for (const id of _rawShinyNew) {
  const norm = id.startsWith('pet_') ? id : 'pet_' + id;
  if (!_shinySeenNorm.has(norm)) {
    _shinySeenNorm.add(norm);
    newShinyOnlyIds.push(norm);
  }
}

// ============ Generate Markdown ============
let md = '';
const w = (line = '') => { md += line + '\n'; };

w(`# ${newSeasonId} ${newSeasonName} - 赛季更新公告`);
w();
w(`> 对比版本：${oldSeasonId} ${oldSeasonName} → ${newSeasonId} ${newSeasonName}`);
w(`> 生成时间：${new Date().toISOString().split('T')[0]}`);
w();

// Pre-classify new pets for summary
// Group by pet_id first, then check if ANY uid in the group matches a category
const _newPetGroupsForSummary = {};
for (const p of newPets) {
  if (!_newPetGroupsForSummary[p.pet_id]) _newPetGroupsForSummary[p.pet_id] = [];
  _newPetGroupsForSummary[p.pet_id].push(p);
}
function groupMatchesSet(group, idSet) {
  return group.some(p =>
    idSet.has(p.uid) || idSet.has(p.pet_id) ||
    idSet.has(stripPrefix(p.uid)) || idSet.has(stripPrefix(p.pet_id))
  );
}
let _summaryLegend = 0, _summarySeason = 0, _summaryPass = 0;
for (const [, group] of Object.entries(_newPetGroupsForSummary)) {
  if (groupMatchesSet(group, s2LegendIds)) _summaryLegend++;
  else if (groupMatchesSet(group, s2PassIds)) _summaryPass++;
  else if (groupMatchesSet(group, s2SeasonIds)) _summarySeason++;
}

// --- Summary ---

// Skill learning changes: count affected pet uids (distinct)
const skillLearningAffectedUids = new Set([
  ...skillsAdded.map(r => r.pet_uid),
  ...skillsRemoved.map(r => r.pet_uid),
]);

// --- Summary ---
w(`## 📊 更新概览`);
w();
w(`| 类别 | 数量 |`);
w(`|------|------|`);
if (newPets.length > 0) w(`| 新增精灵 | ${newPets.length} 只 |`);
if (_summaryLegend > 0) w(`| 　传说精灵 | ${_summaryLegend} 只 |`);
if (_summaryPass > 0) w(`| 　通行证精灵 | ${_summaryPass} 只 |`);
if (_summarySeason > 0) w(`| 　赛季奇遇精灵 | ${_summarySeason} 只 |`);
if (newShinyOnlyIds.length > 0) w(`| 　赛季奇遇异色精灵 | ${newShinyOnlyIds.length} 只 |`);
if (newSkills.length > 0) w(`| 新增技能 | ${newSkills.length} 个 |`);
if (modifiedSkills.length > 0) w(`| 技能调整 | ${modifiedSkills.length} 个 |`);
if (statChangedPets.length > 0) w(`| 精灵数值调整 | ${statChangedPets.length} 只 |`);
if (abilityChangedPets.length > 0) w(`| 精灵特性调整 | ${abilityChangedPets.length} 只 |`);
const SKILL_LEARNING_DETAIL_LIMIT = 80;
const includeSkillLearningDetails = skillsAdded.length + skillsRemoved.length <= SKILL_LEARNING_DETAIL_LIMIT;
if (skillLearningAffectedUids.size > 0 && includeSkillLearningDetails) {
  const addedUids = new Set(skillsAdded.map(r => r.pet_uid));
  const removedUids = new Set(skillsRemoved.map(r => r.pet_uid));
  w(`| 技能学习面变动 | ${skillLearningAffectedUids.size} 只（新增 ${addedUids.size} / 减少 ${removedUids.size}）|`);
}
w();

// --- New Pets (each category is its own ## section, no top-level heading) ---

// Helper: render a section of pets as a compact table
// Each group = one evolution line; renders as one table row per group
function renderNewPetSection(groups, tag) {
  w(`| <div style="min-width:130px;display:inline-block">图鉴</div> | <div style="min-width:360px;display:inline-block">精灵信息</div> |`);
  w(`|------|---------|`);
  for (const group of groups) {
    const first = group[0];
    const elemName = elementNames[first.element_id] || '';
    const elemIcon = first.element_id && elementIcons[first.element_id] ? `![element:${elementIcons[first.element_id]}]` : '';
    const subElemName = first.sub_element_id ? (elementNames[first.sub_element_id] || '') : '';
    const subElemIcon = first.sub_element_id && elementIcons[first.sub_element_id] ? `![element:${elementIcons[first.sub_element_id]}]` : '';
    const elemDisplay = subElemName
      ? `${elemIcon}${elemName} / ${subElemIcon}${subElemName}`
      : `${elemIcon}${elemName}`;
    const tagStr = tag ? ` \`${tag}\`` : '';

    // Final form = highest total
    const finalForm = group.reduce((a, b) => (b.total > a.total ? b : a), group[0]);

    // 进化链名称
    const chain = group.map(p => `**${p.name}**`).join(' → ');

    // 特性
    let abilityStr = '';
    if (finalForm.ability_name) {
      const abilityIconStr = abilityIcons[finalForm.uid] ? `![ability:${abilityIcons[finalForm.uid]}]` : '';
      abilityStr = `**特性** ${abilityIconStr} **「${finalForm.ability_name}」** ${finalForm.ability_desc || ''}`;
    }

    // 数值
    const statsStr = `HP **${finalForm.hp}** / 速度 **${finalForm.speed}** / 物攻 **${finalForm.atk}** / 魔攻 **${finalForm.matk}** / 物防 **${finalForm.def}** / 魔防 **${finalForm.mdef}** 　总计 **${finalForm.total}**`;

    // 图鉴图（常规 + 异色，同一行）
    const thumbCell = petArtworkMd(finalForm.uid);

    // 信息列：名称行 + 特性行 + 数值行（用 <br> 换行）
    const nameRow = `${chain}（${elemDisplay}系）${tagStr}`;
    const infoLines = [nameRow];
    if (abilityStr) infoLines.push(abilityStr);
    infoLines.push(statsStr);

    w(`| ${thumbCell} | ${infoLines.join('<br>')} |`);
  }
  w();
}

// Legacy single-group wrapper (for shiny-only section)
function renderNewPetGroup(group, tag) {
  renderNewPetSection([group], tag);
}

// Group new pets by pet_id (evolution line)
const newPetGroups = {};
for (const p of newPets) {
  if (!newPetGroups[p.pet_id]) newPetGroups[p.pet_id] = [];
  newPetGroups[p.pet_id].push(p);
}

// Classify by season role (check ALL uids in group, not just first)
const legendGroups  = [];
const seasonGroups  = [];
const passGroups    = [];

for (const [, group] of Object.entries(newPetGroups)) {
  if (groupMatchesSet(group, s2LegendIds)) legendGroups.push(group);
  else if (groupMatchesSet(group, s2PassIds)) passGroups.push(group);
  else if (groupMatchesSet(group, s2SeasonIds)) seasonGroups.push(group);
  // else: skip — not shown in detail sections (will appear in 全部新增 list)
}

// Sort all groups by pet_id (numeric)
const sortByPetId = (a, b) => (a[0].pet_id || 0) - (b[0].pet_id || 0);
legendGroups.sort(sortByPetId);
passGroups.sort(sortByPetId);
seasonGroups.sort(sortByPetId);

// --- 传说精灵 ---
if (legendGroups.length) {
  w(`## ⭐ 传说精灵（${legendGroups.length} 只）`);
  w();
  renderNewPetSection(legendGroups, '传说');
}

// --- 通行证精灵 ---
if (passGroups.length) {
  w(`## 🎫 通行证精灵（${passGroups.length} 只）`);
  w();
  renderNewPetSection(passGroups, '通行证');
}

// --- 赛季奇遇精灵 ---
if (seasonGroups.length) {
  w(`## 🌟 赛季奇遇精灵（${seasonGroups.length} 只）`);
  w();
  renderNewPetSection(seasonGroups, null);
}

// --- 赛季奇遇异色精灵（老精灵新增异色）---
if (newShinyOnlyIds.length > 0) {
  // Sort by pet_id (numeric)
  newShinyOnlyIds.sort((a, b) => {
    const petA = db2.prepare('SELECT pet_id FROM pets WHERE uid=? OR pet_id=? LIMIT 1').get(a, stripPrefix(a));
    const petB = db2.prepare('SELECT pet_id FROM pets WHERE uid=? OR pet_id=? LIMIT 1').get(b, stripPrefix(b));
    return ((petA?.pet_id || 0) - (petB?.pet_id || 0));
  });
  w(`## ✨ 赛季奇遇异色精灵（${newShinyOnlyIds.length} 只）`);
  w();
  let _shinyTableStarted = false;
  for (const id of newShinyOnlyIds) {
    const pet = db2.prepare('SELECT * FROM pets WHERE uid=? OR pet_id=? LIMIT 1').get(id, stripPrefix(id));
    if (!pet) continue;
    const elemName = elementNames[pet.element_id] || '';
    const subElemName = pet.sub_element_id ? (elementNames[pet.sub_element_id] || '') : '';
    const elemIcon2 = pet.element_id && elementIcons[pet.element_id] ? `![element:${elementIcons[pet.element_id]}]` : '';
    const subElemIcon2 = pet.sub_element_id && elementIcons[pet.sub_element_id] ? `![element:${elementIcons[pet.sub_element_id]}]` : '';
    const elemDisplay2 = subElemName
      ? `${elemIcon2}${elemName} / ${subElemIcon2}${subElemName}`
      : `${elemIcon2}${elemName}`;
    let abilityStr2 = '';
    if (pet.ability_name) {
      const abilityIconStr = abilityIcons[pet.uid] ? `![ability:${abilityIcons[pet.uid]}]` : '';
      abilityStr2 = `**特性** ${abilityIconStr} **「${pet.ability_name}」** ${pet.ability_desc || ''}`;
    }
    const statsStr2 = `HP **${pet.hp}** / 速度 **${pet.speed}** / 物攻 **${pet.atk}** / 魔攻 **${pet.matk}** / 物防 **${pet.def}** / 魔防 **${pet.mdef}** 　总计 **${pet.total}**`;
    const nameRow2 = `**${pet.name}**（${elemDisplay2}系）`;
    const infoLines2 = [nameRow2];
    if (abilityStr2) infoLines2.push(abilityStr2);
    infoLines2.push(statsStr2);
    // 图鉴列统一格式：常规图 + 异色图（同一行），与其他表格对齐
    const thumbCell2 = petArtworkMd(pet.uid, { shinyOnly: true });
    if (!_shinyTableStarted) {
      w(`| <div style="min-width:130px;display:inline-block">图鉴</div> | <div style="min-width:360px;display:inline-block">精灵信息</div> |`);
      w(`|------|---------|`);
      _shinyTableStarted = true;
    }
    w(`| ${thumbCell2} | ${infoLines2.join('<br>')} |`);
  }
}

// 分类详情已经展示过的进化线不再重复；其余新增精灵只保留文字清单。
const featuredGroups = new Set([...legendGroups, ...passGroups, ...seasonGroups].map(group => group[0].pet_id));
const otherGroups = Object.values(newPetGroups)
  .filter(group => !featuredGroups.has(group[0].pet_id))
  .sort(sortByPetId);
if (otherGroups.length > 0) {
  w(`## 📋 其他新增精灵（${otherGroups.length} 条进化线）`);
  w();
  w(`| 编号 | 进化线 | 属性 |`);
  w(`|------|--------|------|`);
  for (const group of otherGroups) {
    const first = group[0];
    const chain = group.map(p => p.name).join(' → ');
    const elements = [elementNames[first.element_id], elementNames[first.sub_element_id]].filter(Boolean).join(' / ') || '-';
    w(`| ${first.pet_id} | ${chain} | ${elements} |`);
  }
  w();
}

// --- New Skills ---
if (newSkills.length > 0) {
  // Sort by element order → skill ID
  newSkills.sort((a, b) => {
    const elemA = ELEMENT_SORT_ORDER[a.element_id] || 99;
    const elemB = ELEMENT_SORT_ORDER[b.element_id] || 99;
    if (elemA !== elemB) return elemA - elemB;
    const numA = parseInt(a.uid?.replace(/\D/g, '') || '0');
    const numB = parseInt(b.uid?.replace(/\D/g, '') || '0');
    return numA - numB;
  });
  w(`## 🆕 新增技能（${newSkills.length} 个）`);
  w();
  w(`> 以下内容可能包含前赛季遗漏数据的补充，已与游戏实际情况比对，如有出入以官方为准。`);
  w();
  w(`| 技能名 | 属性 | 类型 | 能耗 | 威力 | 描述 |`);
  w(`|--------|------|------|------|------|------|`);
  for (const s of newSkills) {
    const elemName = elementNames[s.element_id] || '-';
    const catName = s.category || '-';
    w(`| ${s.name} | ${elemName} | ${catName} | ${s.cost ?? '-'} | ${s.power ?? '-'} | ${(s.description || '').replace(/\n/g, ' ').substring(0, 60)} |`);
  }
  w();
}

// --- Pet Stat Changes ---
if (statChangedPets.length > 0) {
  // Sort by pet_id (numeric)
  statChangedPets.sort((a, b) => (a.pet.pet_id || 0) - (b.pet.pet_id || 0));
  w(`## 📈 精灵数值调整（${statChangedPets.length} 只）`);
  w();
  w(`> 以下调整可能包含前赛季遗漏的数值修正，已与游戏实际情况比对，如有出入以官方为准。`);
  w();
  w(`| 精灵 | HP | 速度 | 物攻 | 魔攻 | 物防 | 魔防 | 总计 |`);
  w(`|------|----|----|----|----|----|----|------|`);
  for (const { pet, changes } of statChangedPets) {
    const fmt = (field) => {
      if (!changes[field]) return '-';
      const { old: o, new: n } = changes[field];
      const diff = n - o;
      return `${o}→${n}(${diff > 0 ? '+' : ''}${diff})`;
    };
    w(`| ${pet.name} | ${fmt('hp')} | ${fmt('speed')} | ${fmt('atk')} | ${fmt('matk')} | ${fmt('def')} | ${fmt('mdef')} | ${fmt('total')} |`);
  }
  w();
}

// 从空值补齐的个体值属于数据维护，不进入面向用户的更新公告。

// --- Skill Learning Changes ---
if ((skillsAdded.length > 0 || skillsRemoved.length > 0) && includeSkillLearningDetails) {
  w(`## 📚 技能学习面变动`);
  w();
  // Skill detail lookup by name
  const skillDetailByName = {};
  db2.prepare('SELECT * FROM skills').all().forEach(r => { skillDetailByName[r.name] = r; });

  // SKILL_TYPE labels
  const SKILL_TYPE_LABELS = { skills: '精灵技能', bloodline_skills: '血脉技能', learnable_stones: '技能石' };

  // Group by skill name → { skillName, records: [{pet_uid, skill_type, level}] }
  function groupBySkillName(records) {
    const grouped = {};
    for (const r of records) {
      if (!grouped[r.name]) grouped[r.name] = [];
      grouped[r.name].push(r);
    }
    return grouped;
  }

  // Sort skill groups: by element order → skill uid numeric
  function sortSkillGroups(entries) {
    return entries.sort((a, b) => {
      const sA = skillDetailByName[a[0]];
      const sB = skillDetailByName[b[0]];
      const elemA = ELEMENT_SORT_ORDER[sA?.element_id] ?? 99;
      const elemB = ELEMENT_SORT_ORDER[sB?.element_id] ?? 99;
      if (elemA !== elemB) return elemA - elemB;
      const numA = parseInt(sA?.uid?.replace(/\D/g, '') || '0');
      const numB = parseInt(sB?.uid?.replace(/\D/g, '') || '0');
      return numA - numB;
    });
  }

  // Render one skill-group block
  function renderSkillLearningGroup(skillName, records, petNamesFn) {
    const skill = skillDetailByName[skillName];
    const elemId = skill?.element_id;
    const elemName = elemId ? (elementNames[elemId] || '') : '';
    const catName = skill?.category || '-';
    const cost = skill?.cost ?? '-';
    const power = skill?.power ?? '-';
    const desc = (skill?.description || '').replace(/\n/g, ' ');
    // 批量学习面不重复嵌入技能图标，保留文字和数值即可。
    w(`| **${skillName}** | ${elemName || '-'} | ${catName} | ${cost} | ${power} | ${desc} |`);

    // Group pets by skill_type, sort pets by uid numeric
    const byType = {};
    for (const r of records) {
      const t = r.skill_type || 'skills';
      if (!byType[t]) byType[t] = [];
      byType[t].push(r);
    }
    // Output pet list as indented lines below the table row (outside table)
    // We collect all pet lines and output after the table separator trick:
    // Actually we output them as additional table rows with merged first cell
    for (const type of ['skills', 'bloodline_skills', 'learnable_stones']) {
      if (!byType[type]) continue;
      const label = SKILL_TYPE_LABELS[type] || type;
      const sorted = byType[type].sort((a, b) => {
        const numA = parseInt(a.pet_uid.replace(/\D/g, '') || '0');
        const numB = parseInt(b.pet_uid.replace(/\D/g, '') || '0');
        return numA - numB;
      });
      const COLS = 4;
      const petCells = sorted.map(r => {
        const name = petNamesFn(r.pet_uid);
        const lvStr = (type === 'skills' && r.level != null) ? `(Lv${r.level})` : '';
        return `${name}${lvStr}`;
      });
      for (let i = 0; i < petCells.length; i += COLS) {
        const chunk = petCells.slice(i, i + COLS).join('\u3000\u3000');
        const typeCell = i === 0 ? `**${label}**\uff1a` : '';
        w(`| | | | | | ${typeCell}${chunk} |`);
      }
    }  }

  if (skillsAdded.length > 0) {
    w(`### 新增学习`);
    w();
    const grouped = groupBySkillName(skillsAdded);
    const sorted = sortSkillGroups(Object.entries(grouped));
    w(`| 技能 | 属性 | 类型 | 能耗 | 威力 | 效果/精灵 |`);
    w(`|------|------|------|------|------|----------|`);
    for (const [skillName, records] of sorted) {
      renderSkillLearningGroup(skillName, records, uid => petNames[uid] || uid);
    }
    w();
  }

  if (skillsRemoved.length > 0) {
    w(`### 移除学习`);
    w();
    const grouped2 = groupBySkillName(skillsRemoved);
    const sorted2 = sortSkillGroups(Object.entries(grouped2));
    w(`| 技能 | 属性 | 类型 | 能耗 | 威力 | 效果/精灵 |`);
    w(`|------|------|------|------|------|----------|`);
    for (const [skillName, records] of sorted2) {
      renderSkillLearningGroup(skillName, records, uid => oldPetNames[uid] || petNames[uid] || uid);
    }
    w();
  }
}

// --- Skill Balance (6-column table) ---
// Sort by element order → skill ID
if (modifiedSkills.length > 0) {
modifiedSkills.sort((a, b) => {
  const elemA = ELEMENT_SORT_ORDER[a.skill.element_id] || 99;
  const elemB = ELEMENT_SORT_ORDER[b.skill.element_id] || 99;
  if (elemA !== elemB) return elemA - elemB;
  const numA = parseInt(a.skill.uid?.replace(/\D/g, '') || '0');
  const numB = parseInt(b.skill.uid?.replace(/\D/g, '') || '0');
  return numA - numB;
});
w(`## ⚔️ 技能调整（${modifiedSkills.length} 个）`);
w();
w(`| 技能 | 属性 | 类型 | 能耗 | 威力 | 调整内容 |`);
w(`|------|------|------|------|------|----------|`);
for (const { skill, changes, relevantFields } of modifiedSkills) {
  const elemName = elementNames[skill.element_id] || '-';
  const catName = skill.category || '-';
  // Cost/Power columns: show change or current value
  const costCell = changes.cost ? `${changes.cost.old}→${changes.cost.new}` : String(skill.cost ?? '-');
  const powerCell = changes.power ? `${changes.power.old}→${changes.power.new}` : String(skill.power ?? '-');
  // Build adjustment description
  const adjustParts = [];
  for (const field of relevantFields) {
    const { old: oldVal, new: newVal } = changes[field];
    switch (field) {
      case 'cost': break; // shown in cost column
      case 'power': break; // shown in power column
      case 'description':
        adjustParts.push(`${(oldVal || '').replace(/\n/g, ' ')}<br>→ ${(newVal || '').replace(/\n/g, ' ')}`);
        break;
      case 'category':
        adjustParts.push(`类型：${oldVal} → ${newVal}`);
        break;
      case 'element_id':
        adjustParts.push(`属性：${elementNames[oldVal] || oldVal} → ${elementNames[newVal] || newVal}`);
        break;
      case 'name':
        adjustParts.push(`名称：${oldVal} → ${newVal}`);
        break;
    }
  }
  const adjustCell = adjustParts.join('<br>') || '-';
  w(`| **${skill.name}** | ${elemName} | ${catName} | ${costCell} | ${powerCell} | ${adjustCell} |`);
}
w();
}

// --- Pet Ability Changes (2-column table) ---
if (abilityChangedPets.length > 0) {
  // Sort by pet_id (numeric)
  abilityChangedPets.sort((a, b) => (a.pet.pet_id || 0) - (b.pet.pet_id || 0));
  w(`## 🔮 精灵特性调整（${abilityChangedPets.length} 只）`);
  w();
  w(`| 精灵 | 特性调整 |`);
  w(`|------|----------|`);
  // Group by ability_desc to merge evolution lines
  const abilityGroups = {};
  const abilityNameOnlyChanges = [];
  for (const { pet, changes } of abilityChangedPets) {
    const descChange = changes.ability_desc;
    if (descChange) {
      const key = `${descChange.old}|||${descChange.new}`;
      if (!abilityGroups[key]) abilityGroups[key] = { old: descChange.old, new: descChange.new, pets: [], petUids: [], abilityName: pet.ability_name };
      abilityGroups[key].pets.push(pet.name);
      abilityGroups[key].petUids.push(pet.uid);
    } else if (changes.ability_name) {
      abilityNameOnlyChanges.push({ pet, changes });
    }
  }
  // Render name-only changes first
  for (const { pet, changes } of abilityNameOnlyChanges) {
    const abilIcon = abilityIcons[pet.uid] ? `![ability:${abilityIcons[pet.uid]}]` : '';
    w(`| ${pet.name} | ${abilIcon} 特性名：${changes.ability_name.old} → ${changes.ability_name.new} |`);
  }
  // Render grouped desc changes
  for (const group of Object.values(abilityGroups)) {
    const petList = group.pets.join('、');
    // Use first pet's ability icon
    const firstUid = group.petUids[0];
    const abilIcon = abilityIcons[firstUid] ? `![ability:${abilityIcons[firstUid]}]` : '';
    const abilityNameStr = group.abilityName ? `**「${group.abilityName}」** ` : '';
    w(`| ${petList} | ${abilIcon} ${abilityNameStr}${group.old}<br>→ ${group.new} |`);
  }
  w();
}

// --- Footer ---
w(`---`);
w();
w(`**本公告数据来源于 BWIKI、游戏官网及人工补充，通过赛季数据比对脚本自动生成。如有内容与游戏实际不符，一切以游戏内为准。**`);

// ============ Output ============
if (stdoutOnly) {
  process.stdout.write(md);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, md, 'utf-8');
  console.log(`公告已生成: ${outputPath}`);
  console.log(`文件大小: ${(Buffer.byteLength(md) / 1024).toFixed(1)} KB`);
}

db1.close();
db2.close();
