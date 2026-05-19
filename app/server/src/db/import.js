const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'roco.db');
const DATA_DIR = path.join(__dirname, '..', '..', '..', '..', 'data');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function loadJSON(relativePath) {
  const fullPath = path.join(DATA_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`[WARN] 文件不存在: ${fullPath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

// ============================================================
// 1. 导入属性
// ============================================================
function importElements() {
  const data = loadJSON('elements/element_chart_structured.json');
  if (!data) return;

  const insertElem = db.prepare(`
    INSERT OR REPLACE INTO elements (id, key, name, color, icon, immunity, strong_against, resisted_by, weak_to, resistant_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMulti = db.prepare(`INSERT OR REPLACE INTO element_multipliers (key, value) VALUES (?, ?)`);

  const tx = db.transaction(() => {
    for (const [, elem] of Object.entries(data.elements)) {
      insertElem.run(
        elem.id, elem.key, elem.name, elem.color || null, elem.icon || null,
        elem.immunity || null,
        JSON.stringify(elem.strong_against || []),
        JSON.stringify(elem.resisted_by || []),
        JSON.stringify(elem.weak_to || []),
        JSON.stringify(elem.resistant_to || [])
      );
    }
    for (const [k, v] of Object.entries(data.multipliers || {})) {
      insertMulti.run(k, v);
    }
  });
  tx();
  console.log(`[OK] 属性: ${Object.keys(data.elements).length} 条`);
}

// ============================================================
// 2. 导入技能
// ============================================================
function importSkills() {
  const data = loadJSON('skills/skill_list.json');
  if (!data) return;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO skills (uid, name, element_id, category, cost, power, description, version, icon_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const skill of data) {
      insert.run(
        skill.uid, skill.name,
        skill.element?.id || null,
        skill.category || null,
        skill.cost || 0, skill.power || 0,
        skill.description || null,
        skill.version || null,
        skill.icon_url || null
      );
    }
  });
  tx();
  console.log(`[OK] 技能: ${data.length} 条`);
}

// ============================================================
// 3. 导入蛋组
// ============================================================
function importEggGroups() {
  const data = loadJSON('eggs/egg_group.json');
  if (!data) return;

  const insert = db.prepare(`INSERT OR REPLACE INTO egg_groups (id, name) VALUES (?, ?)`);

  const tx = db.transaction(() => {
    for (const [, group] of Object.entries(data.groups)) {
      insert.run(group.id, group.name);
    }
  });
  tx();
  console.log(`[OK] 蛋组: ${Object.keys(data.groups).length} 条`);
}

// ============================================================
// 4. 导入精灵列表
// ============================================================
function importPets() {
  const data = loadJSON('pets/pet_list.json');
  if (!data) return;

  const insertPet = db.prepare(`
    INSERT OR REPLACE INTO pets (uid, pet_id, name, element_id, ability_name, ability_desc, hp, speed, atk, matk, def, mdef, total, version, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPetEgg = db.prepare(`INSERT OR REPLACE INTO pet_egg_groups (pet_uid, egg_group_id) VALUES (?, ?)`);

  // 预加载蛋组名称 → id 映射
  const eggGroupMap = {};
  const eggGroups = db.prepare('SELECT id, name FROM egg_groups').all();
  for (const g of eggGroups) eggGroupMap[g.name] = g.id;

  const tx = db.transaction(() => {
    for (const pet of data) {
      insertPet.run(
        pet.uid, pet.pet_id, pet.name,
        pet.element?.id || null,
        pet.ability_name || null, pet.ability_desc || null,
        pet.hp || 0, pet.speed || 0, pet.atk || 0, pet.matk || 0,
        pet.def || 0, pet.mdef || 0, pet.total || 0,
        pet.version || null, pet.image_url || null
      );
      // 蛋组关联
      for (const groupName of (pet.egg_groups || [])) {
        const gid = eggGroupMap[groupName];
        if (gid !== undefined) {
          insertPetEgg.run(pet.uid, gid);
        }
      }
    }
  });
  tx();
  console.log(`[OK] 精灵列表: ${data.length} 条`);
}

// ============================================================
// 5. 导入精灵详情
// ============================================================
function importPetDetails() {
  const data = loadJSON('pets/pet_detail.json');
  if (!data) return;

  const pets = data.pets || {};
  const variantsMap = data.variants_map || {};

  const insertDetail = db.prepare(`
    INSERT OR REPLACE INTO pet_details (pet_uid, element_id, ability_icon, image_default, image_shiny, image_fruit, image_egg, height, weight, location, evolution_chain, restrain_strong, restrain_weak, restrain_resist, restrain_resisted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSkill = db.prepare(`
    INSERT INTO pet_skills (pet_uid, skill_type, level, name, element, type, cost, power, description, skill_ref_uid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertVariant = db.prepare(`
    INSERT OR REPLACE INTO variants_map (pet_id, pet_uid, sort_order) VALUES (?, ?, ?)
  `);

  const tx = db.transaction(() => {
    // 多形态映射
    for (const [petId, uids] of Object.entries(variantsMap)) {
      uids.forEach((uid, i) => insertVariant.run(petId, uid, i));
    }

    // 详情 + 技能
    for (const [uid, pet] of Object.entries(pets)) {
      const d = pet.detail;
      if (d) {
        insertDetail.run(
          uid,
          d.element?.id || null,
          d.ability_icon || null,
          d.image_default || null, d.image_shiny || null,
          d.image_fruit || null, d.image_egg || null,
          d.height || null, d.weight || null,
          d.location || null,
          JSON.stringify(d.evolution_chain || []),
          JSON.stringify(d.restrain_strong || []),
          JSON.stringify(d.restrain_weak || []),
          JSON.stringify(d.restrain_resist || []),
          JSON.stringify(d.restrain_resisted || [])
        );

        // 三类技能
        for (const skillType of ['skills', 'bloodline_skills', 'learnable_stones']) {
          for (const skill of (d[skillType] || [])) {
            insertSkill.run(
              uid, skillType,
              skill.level || null, skill.name || null,
              skill.element || null, skill.type || null,
              skill.cost || 0, skill.power || 0,
              skill.description || null,
              skill.skill_ref?.uid || null
            );
          }
        }
      }
    }
  });
  tx();
  console.log(`[OK] 精灵详情: ${Object.keys(pets).length} 条`);
}

// ============================================================
// 执行
// ============================================================
console.log('========================================');
console.log('数据导入: JSON → SQLite');
console.log('========================================');
console.log(`[INFO] 数据源: ${DATA_DIR}`);
console.log(`[INFO] 数据库: ${DB_PATH}`);
console.log();

importElements();
importSkills();
importEggGroups();
importPets();
importPetDetails();

console.log();
console.log('[DONE] 数据导入完成！');
db.close();
