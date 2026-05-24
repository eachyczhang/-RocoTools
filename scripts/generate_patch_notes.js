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

// ============ CLI Args ============
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/generate_patch_notes.js <old_db> <new_db> [--output <path>]');
  process.exit(1);
}

const oldDbPath = path.resolve(PROJECT_ROOT, args[0]);
const newDbPath = path.resolve(PROJECT_ROOT, args[1]);
const outputIdx = args.indexOf('--output');
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

// Pet names lookup
const petNames = {};
db2.prepare('SELECT uid, name FROM pets').all().forEach(r => { petNames[r.uid] = r.name; });
const oldPetNames = {};
db1.prepare('SELECT uid, name FROM pets').all().forEach(r => { oldPetNames[r.uid] = r.name; });

// Element names lookup
const elementNames = {};
db2.prepare('SELECT id, name FROM elements').all().forEach(r => { elementNames[r.id] = r.name; });

// Skill icon lookup
const skillIcons = {};
db2.prepare('SELECT uid, icon_url FROM skills WHERE icon_url IS NOT NULL').all().forEach(r => { skillIcons[r.uid] = r.icon_url; });

// Pet thumb lookup
const petThumbs = {};
db2.prepare('SELECT uid, thumb_url FROM pets WHERE thumb_url IS NOT NULL').all().forEach(r => { petThumbs[r.uid] = r.thumb_url; });

// --- Skills ---
const skills1 = getRows(db1, 'skills', ['uid']);
const skills2 = getRows(db2, 'skills', ['uid']);

const newSkills = [];
const modifiedSkills = [];
const SKILL_IGNORE = ['manual_edit', 'version'];
const SKILL_VALUE_FIELDS = ['cost', 'power', 'description', 'type', 'element', 'name'];

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

for (const [key, p2] of pets2) {
  if (!pets1.has(key)) {
    newPets.push(p2);
  } else {
    const diff = diffRow(pets1.get(key), p2, PET_IGNORE);
    if (diff) {
      const statFields = Object.keys(diff).filter(k => PET_STAT_FIELDS.includes(k));
      const abilityFields = Object.keys(diff).filter(k => PET_ABILITY_FIELDS.includes(k));
      if (statFields.length > 0) {
        statChangedPets.push({ pet: p2, changes: diff, fields: statFields });
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

// ============ Generate Markdown ============
let md = '';
const w = (line = '') => { md += line + '\n'; };

w(`# ${newSeasonId} ${newSeasonName} - 赛季更新公告`);
w();
w(`> 对比版本：${oldSeasonId} ${oldSeasonName} → ${newSeasonId} ${newSeasonName}`);
w(`> 生成时间：${new Date().toISOString().split('T')[0]}`);
w();

// --- Summary ---
w(`## 📊 更新概览`);
w();
w(`| 类别 | 数量 |`);
w(`|------|------|`);
w(`| 新增精灵 | ${newPets.length} 只 |`);
if (newSkills.length > 0) w(`| 新增技能 | ${newSkills.length} 个 |`);
w(`| 技能调整 | ${modifiedSkills.length} 个 |`);
w(`| 精灵数值调整 | ${statChangedPets.length} 只 |`);
w(`| 精灵特性调整 | ${abilityChangedPets.length} 只 |`);
if (skillsAdded.length > 0 || skillsRemoved.length > 0) {
  w(`| 技能学习面变动 | +${skillsAdded.length} / -${skillsRemoved.length} |`);
}
w();

// --- New Pets ---
w(`## 🆕 新增精灵（${newPets.length} 只）`);
w();
// Group by evolution line (pet_id)
const petGroups = {};
for (const p of newPets) {
  const baseId = p.pet_id || p.uid.replace(/_\d+$/, '');
  if (!petGroups[baseId]) petGroups[baseId] = [];
  petGroups[baseId].push(p);
}
for (const [, group] of Object.entries(petGroups)) {
  const names = group.map(p => `![pet:${p.uid}] **${p.name}**`).join(' → ');
  const first = group[0];
  const elemName = elementNames[first.element_id] || '';
  const subElemName = first.sub_element_id ? `/${elementNames[first.sub_element_id] || ''}` : '';
  w(`- ${names}（${elemName}${subElemName}系）`);
}
w();

// --- New Skills ---
if (newSkills.length > 0) {
  w(`## 🆕 新增技能（${newSkills.length} 个）`);
  w();
  w(`| 技能名 | 属性 | 类型 | 能耗 | 威力 | 描述 |`);
  w(`|--------|------|------|------|------|------|`);
  for (const s of newSkills) {
    w(`| ![skill:${s.uid}] ${s.name} | ${s.element || '-'} | ${s.type || '-'} | ${s.cost ?? '-'} | ${s.power ?? '-'} | ${(s.description || '').replace(/\n/g, ' ').substring(0, 60)} |`);
  }
  w();
}

// --- Skill Balance ---
w(`## ⚔️ 技能调整（${modifiedSkills.length} 个）`);
w();
for (const { skill, changes, relevantFields } of modifiedSkills) {
  w(`### ![skill:${skill.uid}] ${skill.name}`);
  w();
  for (const field of relevantFields) {
    const { old: oldVal, new: newVal } = changes[field];
    switch (field) {
      case 'cost':
        w(`- **能耗**：${oldVal} → ${newVal}`);
        break;
      case 'power':
        w(`- **威力**：${oldVal} → ${newVal}`);
        break;
      case 'description':
        w(`- **效果**：${oldVal}`);
        w(`- **→**：${newVal}`);
        break;
      case 'type':
        w(`- **类型**：${oldVal} → ${newVal}`);
        break;
      case 'element':
        w(`- **属性**：${oldVal} → ${newVal}`);
        break;
      case 'name':
        w(`- **名称**：${oldVal} → ${newVal}`);
        break;
    }
  }
  w();
}

// --- Pet Ability Changes ---
if (abilityChangedPets.length > 0) {
  w(`## 🔮 精灵特性调整（${abilityChangedPets.length} 只）`);
  w();
  // Group by ability_desc to merge evolution lines
  const abilityGroups = {};
  for (const { pet, changes } of abilityChangedPets) {
    const descChange = changes.ability_desc;
    if (descChange) {
      const key = `${descChange.old}|||${descChange.new}`;
      if (!abilityGroups[key]) abilityGroups[key] = { old: descChange.old, new: descChange.new, pets: [], petUids: [] };
      abilityGroups[key].pets.push(pet.name);
      abilityGroups[key].petUids.push(pet.uid);
    } else if (changes.ability_name) {
      w(`- ![pet:${pet.uid}] **${pet.name}**：特性名 ${changes.ability_name.old} → ${changes.ability_name.new}`);
    }
  }
  w();
  for (const group of Object.values(abilityGroups)) {
    const names = group.pets.length <= 3 ? group.pets.join('、') : `${group.pets.slice(0, 3).join('、')}等${group.pets.length}只`;
    // Add pet icons for the group
    const icons = group.petUids.slice(0, 3).map(uid => `![pet:${uid}]`).join(' ');
    w(`${icons} **${names}**`);
    w(`- 旧：${group.old}`);
    w(`- 新：${group.new}`);
    w();
  }
}

// --- Pet Stat Changes ---
if (statChangedPets.length > 0) {
  w(`## 📈 精灵数值调整（${statChangedPets.length} 只）`);
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
    w(`| ![pet:${pet.uid}] ${pet.name} | ${fmt('hp')} | ${fmt('speed')} | ${fmt('atk')} | ${fmt('matk')} | ${fmt('def')} | ${fmt('mdef')} | ${fmt('total')} |`);
  }
  w();
}

// --- Skill Learning Changes ---
if (skillsAdded.length > 0 || skillsRemoved.length > 0) {
  w(`## 📚 技能学习面变动`);
  w();
  
  if (skillsAdded.length > 0) {
    w(`### 新增学习`);
    w();
    const grouped = groupByPet(skillsAdded);
    for (const [uid, skills] of Object.entries(grouped)) {
      const name = petNames[uid] || uid;
      w(`- ![pet:${uid}] **${name}**：${skills.map(s => `${s.name}(Lv${s.level})`).join('、')}`);
    }
    w();
  }
  
  if (skillsRemoved.length > 0) {
    w(`### 移除学习`);
    w();
    const grouped = groupByPet(skillsRemoved);
    for (const [uid, skills] of Object.entries(grouped)) {
      const name = oldPetNames[uid] || petNames[uid] || uid;
      w(`- ![pet:${uid}] **${name}**：${skills.map(s => s.name).join('、')}`);
    }
    w();
  }
}

// --- Footer ---
w(`---`);
w();
w(`*本公告数据来源于 BWIKI 及游戏官网，通过赛季数据比对脚本自动生成。如有内容与游戏实际不符，一切以游戏内为准。*`);

// ============ Output ============
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, md, 'utf-8');
console.log(`✅ 公告已生成: ${outputPath}`);
console.log(`   文件大小: ${(Buffer.byteLength(md) / 1024).toFixed(1)} KB`);

db1.close();
db2.close();
