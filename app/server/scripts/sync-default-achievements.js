/**
 * Sync default achievements (图鉴课题) for all pets.
 *
 * Default achievements:
 *   ALL pets:
 *     1. "捕捉1只{精灵名}"
 *     2. "捕捉1只了不起天分的{精灵名}"
 *   NON-final-form pets only:
 *     3. "使{精灵名}成功进化1次"
 *   FINAL-form pets only:
 *     4. "获得【命定勇者】奖牌"
 *     5. "捕捉一只炫彩突变的{精灵名}"
 *   FINAL-form pets WITH shiny variant:
 *     6. "捕捉一只异色突变的{精灵名}"
 *
 * Rules:
 *   - Default achievements are marked with is_default=1
 *   - Manual achievements (is_default=0) are never touched
 *   - If a pet becomes final form, the evolution achievement is removed
 *   - If a pet is no longer final form, the evolution achievement is added
 *   - Final-form-only achievements are added/removed based on is_final_form
 *
 * Usage: node app/server/scripts/sync-default-achievements.js [--dry-run]
 */

const path = require('path');
const { getWriteDb } = require(path.resolve(__dirname, '..', 'src', 'db', 'connection'));

const dryRun = process.argv.includes('--dry-run');

console.log('=== Default Achievements Sync ===');
console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (will write to DB)'}`);
console.log('');

const db = getWriteDb();

// ============================================================
// Step 0: Ensure is_default column exists (migration)
// ============================================================
const cols = db.prepare("PRAGMA table_info(pet_achievements)").all();
const hasIsDefault = cols.some(c => c.name === 'is_default');
if (!hasIsDefault) {
  db.prepare("ALTER TABLE pet_achievements ADD COLUMN is_default INTEGER DEFAULT 0").run();
  console.log('✅ Added is_default column to pet_achievements table');
}

// ============================================================
// Step 1: Load all pets and their details (shiny info)
// ============================================================
const allPets = db.prepare('SELECT uid, name, is_final_form FROM pets').all();
console.log(`Total pets: ${allPets.length}`);

// Load shiny info from pet_details
const shinyPets = new Set();
const detailRows = db.prepare(`SELECT pet_uid, image_shiny FROM pet_details WHERE image_shiny IS NOT NULL AND image_shiny != ''`).all();
for (const row of detailRows) {
  shinyPets.add(row.pet_uid);
}
console.log(`Pets with shiny variant: ${shinyPets.size}`);

// ============================================================
// Step 2: Define default achievement templates
// ============================================================

/**
 * Generate default achievements for a pet.
 * @param {string} name - Pet name
 * @param {boolean} isFinalForm - Whether the pet is a final form
 * @param {boolean} hasShiny - Whether the pet has a shiny variant
 * @returns {Array} Array of achievement objects
 */
function getDefaultAchievements(name, isFinalForm, hasShiny) {
  const achievements = [
    { title: `捕捉1只${name}`, sort_order: -100 },
    { title: `捕捉1只了不起天分的${name}`, sort_order: -99 },
  ];

  if (!isFinalForm) {
    achievements.push({ title: `使${name}成功进化1次`, sort_order: -98 });
  }

  if (isFinalForm) {
    achievements.push({ title: `获得【命定勇者】奖牌`, sort_order: -97 });
    achievements.push({ title: `捕捉一只炫彩突变的${name}`, sort_order: -96 });

    if (hasShiny) {
      achievements.push({ title: `捕捉一只异色突变的${name}`, sort_order: -95 });
    }
  }

  return achievements;
}

// ============================================================
// Step 3: Sync default achievements
// ============================================================

const existingDefaults = db.prepare(`
  SELECT id, pet_uid, title FROM pet_achievements WHERE is_default = 1
`).all();

// Build lookup: pet_uid → Set of existing default titles
const existingMap = new Map(); // pet_uid → Map<title, id>
for (const row of existingDefaults) {
  if (!existingMap.has(row.pet_uid)) existingMap.set(row.pet_uid, new Map());
  existingMap.get(row.pet_uid).set(row.title, row.id);
}

const insertStmt = db.prepare(`
  INSERT INTO pet_achievements (pet_uid, type, title, sort_order, is_default)
  VALUES (?, 'text', ?, ?, 1)
`);
const deleteStmt = db.prepare('DELETE FROM pet_achievements WHERE id = ?');

let inserted = 0;
let removed = 0;

const tx = db.transaction(() => {
  for (const pet of allPets) {
    const isFinalForm = pet.is_final_form === 1;
    const hasShiny = shinyPets.has(pet.uid);
    const expected = getDefaultAchievements(pet.name, isFinalForm, hasShiny);
    const expectedTitles = new Set(expected.map(a => a.title));
    const existing = existingMap.get(pet.uid) || new Map();

    // Insert missing defaults
    for (const ach of expected) {
      if (!existing.has(ach.title)) {
        if (!dryRun) insertStmt.run(pet.uid, ach.title, ach.sort_order);
        inserted++;
      }
    }

    // Remove outdated defaults (e.g. evolution achievement for final forms)
    for (const [title, id] of existing) {
      if (!expectedTitles.has(title)) {
        if (!dryRun) deleteStmt.run(id);
        removed++;
      }
    }
  }
});

tx();

// ============================================================
// Step 4: Summary
// ============================================================
console.log('');
console.log('=== Summary ===');
console.log(`Default achievements inserted: ${inserted}`);
console.log(`Outdated defaults removed: ${removed}`);

if (inserted === 0 && removed === 0) {
  console.log('No changes needed — all default achievements are up to date.');
}

if (dryRun) {
  console.log('');
  console.log('⚠️  DRY RUN mode — no changes were written to the database.');
  console.log('   Run without --dry-run to apply changes.');
}

db.close();
console.log('Done.');
