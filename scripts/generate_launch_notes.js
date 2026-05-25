#!/usr/bin/env node
/**
 * Season Launch Notes Generator
 *
 * Read a single season DB snapshot and generate a launch announcement.
 * No diff needed — just show everything in this season.
 *
 * Usage:
 *   node scripts/generate_launch_notes.js <db_path> [--output <path>]
 *
 * Example:
 *   node scripts/generate_launch_notes.js temp/seasons/season_S1_20260521.db
 *   node scripts/generate_launch_notes.js temp/seasons/season_S1_20260521.db --output temp/launch_S1.md
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const Database = require(path.join(PROJECT_ROOT, 'app/server/node_modules/better-sqlite3'));

// ============ CLI Args ============
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node scripts/generate_launch_notes.js <db_path> [--output <path>]');
  process.exit(1);
}

const dbPath = path.resolve(PROJECT_ROOT, args[0]);
const outputIdx = args.indexOf('--output');
const outputPath = outputIdx !== -1 && args[outputIdx + 1]
  ? path.resolve(PROJECT_ROOT, args[outputIdx + 1])
  : path.resolve(PROJECT_ROOT, 'temp', `launch_notes_${path.basename(dbPath, '.db')}.md`);

if (!fs.existsSync(dbPath)) { console.error(`File not found: ${dbPath}`); process.exit(1); }

const db = new Database(dbPath, { readonly: true });

// ============ Helpers ============
const stripPrefix = id => id.replace(/^pet_/, '');


// ============ Data ============
const season = db.prepare('SELECT * FROM seasons WHERE is_current = 1').get()
  || db.prepare('SELECT * FROM seasons ORDER BY id DESC LIMIT 1').get();

const seasonId = season?.id || '?';
const seasonName = season?.name || 'Unknown';

// Parse season lists from seasons table
const parseList = json => { try { return JSON.parse(json || '[]'); } catch { return []; } };
const seasonPetIdsFull = parseList(season?.season_pets);   // ["pet_330", ...]
const passPetIdsFull   = parseList(season?.pass_pets);     // ["pet_312", ...]
const shinyPetIdsFull  = parseList(season?.shiny_pets);    // ["pet_142", ...]
const legendPetId      = season?.legend_pet || null;       // kept for reference

// Sets for quick lookup (both "pet_330" and "330" formats)
const makeIdSet = list => new Set([...list, ...list.map(stripPrefix)]);
const seasonPetIds = makeIdSet(seasonPetIdsFull);
const passPetIds   = makeIdSet(passPetIdsFull);
const shinyPetIds  = makeIdSet(shinyPetIdsFull);

// Lookups
const elementNames = {};
db.prepare('SELECT id, name FROM elements').all().forEach(r => { elementNames[r.id] = r.name; });

// All pets
const allPets = db.prepare('SELECT * FROM pets ORDER BY pet_id, uid').all();

// Distinct pet_id count (one entry per pet, regardless of forms)
const distinctPetIds = new Set(allPets.map(p => p.pet_id));
const regularPetCount = distinctPetIds.size;

// All skills
const allSkills = db.prepare('SELECT * FROM skills').all();

// All distinct ability_names
const allAbilities = db.prepare(
  "SELECT DISTINCT ability_name FROM pets WHERE ability_name IS NOT NULL AND ability_name != ''"
).all().map(r => r.ability_name);

// Ability icon lookup from pet_details
const abilityIcons = {};
try {
  db.prepare('SELECT pet_uid, ability_icon FROM pet_details WHERE ability_icon IS NOT NULL').all()
    .forEach(r => { abilityIcons[r.pet_uid] = r.ability_icon; });
} catch {}

// One representative per pet_id (first uid in sorted order = _1 or main form)
const repPets = [];
const seenPetIds = new Set();
for (const p of allPets) {
  if (!seenPetIds.has(p.pet_id)) { seenPetIds.add(p.pet_id); repPets.push(p); }
}

// Season pets
const seasonPets = repPets.filter(p =>
  seasonPetIds.has(p.pet_id) || seasonPetIds.has('pet_' + p.pet_id)
);

// Pass pets
const passPets = repPets.filter(p =>
  passPetIds.has(p.pet_id) || passPetIds.has('pet_' + p.pet_id)
);

// Shiny pets
const shinyPets = repPets.filter(p =>
  shinyPetIds.has(p.uid) || shinyPetIds.has(p.pet_id) || shinyPetIds.has('pet_' + p.pet_id)
);

// Parse legend_pet: compatible with old single-value "pet_295" and new array ["pet_295","pet_152"]
function parseLegendPet(val) {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch { return [val] }
}
const legendPetIds = parseLegendPet(season?.legend_pet)  // ["pet_295", "pet_152"]

// Legend pets (look up by uid)
const legendPets = legendPetIds
  .map(id => allPets.find(p => p.uid === id))
  .filter(Boolean)
// Group season pets into evolution lines by pet_id
const petLines = {};
for (const p of [...seasonPets, ...passPets]) {
  if (!petLines[p.pet_id]) petLines[p.pet_id] = [];
  if (!petLines[p.pet_id].find(x => x.uid === p.uid)) petLines[p.pet_id].push(p);
}



// ============ Generate Markdown ============
let md = '';
const w = (line = '') => { md += line + '\n'; };

w(`# ${seasonId} ${seasonName} - 赛季开服公告`);
w();
w(`> 赛季：${seasonId} ${seasonName}`);
w(`> 生成时间：${new Date().toISOString().split('T')[0]}`);
w();

// --- Summary ---
w(`## 📊 本赛季概览`);
w();
w(`| 类别 | 数量 |`);
w(`|------|------|`);
w(`| 精灵总数 | ${regularPetCount} 只 |`);
w(`| 技能总数 | ${allSkills.length} 个 |`);
w(`| 特性总数 | ${allAbilities.length} 种 |`);
if (legendPets.length) w(`| 传说精灵 | ${legendPets.length} 只 |`);
w(`| 通行证精灵 | ${passPets.length} 只 |`);
w(`| 赛季奇遇精灵 | ${seasonPets.length} 只 |`);
w(`| 赛季奇遇异色精灵 | ${shinyPets.length} 只 |`);
w();

// --- Legend Pets ---
if (legendPets.length) {
  w(`## ⭐ 传说精灵`);
  w();
  for (const legendPet of legendPets) {
    const elemName = elementNames[legendPet.element_id] || '';
    const subElemName = legendPet.sub_element_id ? `/${elementNames[legendPet.sub_element_id] || ''}` : '';
    w(`### ![pet:${legendPet.uid}] **${legendPet.name}**（${elemName}${subElemName}系）`);
    w();
    if (legendPet.ability_name) {
      const abilityIconStr = abilityIcons[legendPet.uid] ? `![ability:${abilityIcons[legendPet.uid]}] ` : '';
      w(`**特性${abilityIconStr}「${legendPet.ability_name}」**：${legendPet.ability_desc || ''}`);
      w();
    }
    w(`**基础数值**：HP ${legendPet.hp} / 速度 ${legendPet.speed} / 物攻 ${legendPet.atk} / 魔攻 ${legendPet.matk} / 物防 ${legendPet.def} / 魔防 ${legendPet.mdef}　总计 **${legendPet.total}**`);
    w();
    const legendThumb = legendPet.thumb_url || `/public/pets/thumbs/${legendPet.uid}_default.webp`;
    w(`常规：![img:${legendThumb}]　![shiny:${legendPet.uid}]`);
    w();
  }
}

// --- Pass Pets ---
if (passPets.length > 0) {
  w(`## 🎫 通行证精灵（${passPets.length} 只）`);
  w();
  for (const p of passPets) {
    const group = allPets.filter(x => x.pet_id === p.pet_id);
    const elemName = elementNames[p.element_id] || '';
    const subElemName = p.sub_element_id ? `/${elementNames[p.sub_element_id] || ''}` : '';
    const chain = group.map(x => `![pet:${x.uid}] **${x.name}**`).join(' → ');
    w(`### ${chain}（${elemName}${subElemName}系）　\`通行证\``);
    w();
    const finalForm = group.reduce((a, b) => (b.total > a.total ? b : a), group[0]);
    if (finalForm.ability_name) {
      const abilityIconStr = abilityIcons[finalForm.uid] ? `![ability:${abilityIcons[finalForm.uid]}] ` : '';
      w(`**特性${abilityIconStr}「${finalForm.ability_name}」**：${finalForm.ability_desc || ''}`);
      w();
    }
    w(`**基础数值**：HP ${finalForm.hp} / 速度 ${finalForm.speed} / 物攻 ${finalForm.atk} / 魔攻 ${finalForm.matk} / 物防 ${finalForm.def} / 魔防 ${finalForm.mdef}　总计 **${finalForm.total}**`);
    w();
    const defaultThumb = finalForm.thumb_url || `/public/pets/thumbs/${finalForm.uid}_default.webp`;
    w(`常规：![img:${defaultThumb}]　![shiny:${finalForm.uid}]`);
    w();
  }
}

// --- Season Pets ---
if (seasonPets.length > 0) {
  w(`## 🌟 赛季奇遇精灵（${seasonPets.length} 只）`);
  w();
  for (const p of seasonPets) {
    const group = allPets.filter(x => x.pet_id === p.pet_id);
    const elemName = elementNames[p.element_id] || '';
    const subElemName = p.sub_element_id ? `/${elementNames[p.sub_element_id] || ''}` : '';
    const chain = group.map(x => `![pet:${x.uid}] **${x.name}**`).join(' → ');
    w(`### ${chain}（${elemName}${subElemName}系）`);
    w();
    const finalForm = group.reduce((a, b) => (b.total > a.total ? b : a), group[0]);
    if (finalForm.ability_name) {
      const abilityIconStr = abilityIcons[finalForm.uid] ? `![ability:${abilityIcons[finalForm.uid]}] ` : '';
      w(`**特性${abilityIconStr}「${finalForm.ability_name}」**：${finalForm.ability_desc || ''}`);
      w();
    }
    w(`**基础数值**：HP ${finalForm.hp} / 速度 ${finalForm.speed} / 物攻 ${finalForm.atk} / 魔攻 ${finalForm.matk} / 物防 ${finalForm.def} / 魔防 ${finalForm.mdef}　总计 **${finalForm.total}**`);
    w();
    const defaultThumb = finalForm.thumb_url || `/public/pets/thumbs/${finalForm.uid}_default.webp`;
    w(`常规：![img:${defaultThumb}]　![shiny:${finalForm.uid}]`);
    w();
  }
}

// --- Shiny Pets ---
if (shinyPets.length > 0) {
w(`## ✨ 赛季奇遇异色精灵（${shinyPets.length} 只）`);
  w();
  for (const p of shinyPets) {
    const elemName = elementNames[p.element_id] || '';
    const subElemName = p.sub_element_id ? `/${elementNames[p.sub_element_id] || ''}` : '';
    const defaultThumb = p.thumb_url || `/public/pets/thumbs/${p.uid}_default.webp`;
    w(`- ![pet:${p.uid}] **${p.name}**（${elemName}${subElemName}系）　常规：![img:${defaultThumb}]　![shiny:${p.uid}]`);
  }
  w();
}

// --- Footer ---
w(`---`);
w();
w(`**本公告数据来源于 BWIKI、游戏官网及人工补充，如有内容与游戏实际不符，一切以游戏内为准。**`);

// ============ Output ============
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, md, 'utf-8');
console.log(`✅ 开服公告已生成: ${outputPath}`);
console.log(`   文件大小: ${(Buffer.byteLength(md) / 1024).toFixed(1)} KB`);
console.log(`   精灵总数: ${regularPetCount} 只`);
console.log(`   技能总数: ${allSkills.length} 个`);
console.log(`   特性总数: ${allAbilities.length} 种`);
console.log(`   传说精灵: ${legendPets.map(p => p.name).join('、') || '无'}`);
console.log(`   赛季奇遇精灵: ${seasonPets.length} 只`);
console.log(`   通行证精灵: ${passPets.length} 只`);
console.log(`   异色精灵: ${shinyPets.length} 只`);

db.close();
