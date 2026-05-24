/**
 * Auto-detect and set is_final_form based on evolution chains.
 *
 * Logic:
 * - A pet is a "final form" if it appears at the END of any evolution route
 *   AND does NOT appear as a non-final stage in any route.
 * - Pets without any evolution chain data are left unchanged.
 *
 * Usage: node app/server/scripts/sync-final-forms.js [--dry-run]
 *
 * Options:
 *   --dry-run   Preview changes without writing to database
 */

const path = require('path');
const { getWriteDb } = require(path.resolve(__dirname, '..', 'src', 'db', 'connection'));

const dryRun = process.argv.includes('--dry-run');

console.log('=== Final Form Auto-Detection ===');
console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (will write to DB)'}`);
console.log('');

const db = getWriteDb();

// ============================================================
// Step 1: Read all evolution chains
// ============================================================
const allDetails = db.prepare(`
  SELECT pd.pet_uid, pd.evolution_chain
  FROM pet_details pd
  WHERE pd.evolution_chain IS NOT NULL AND pd.evolution_chain != '' AND pd.evolution_chain != '[]'
`).all();

// Build name→uid lookup
const allPets = db.prepare('SELECT uid, name, is_final_form FROM pets').all();
const nameToUid = new Map();
const uidToName = new Map();
const currentFinalForm = new Map(); // uid → current is_final_form value

for (const p of allPets) {
  nameToUid.set(p.name, p.uid);
  uidToName.set(p.uid, p.name);
  currentFinalForm.set(p.uid, p.is_final_form || 0);
}

console.log(`Found ${allDetails.length} pets with evolution chain data.`);
console.log(`Total pets in database: ${allPets.length}`);
console.log('');

// ============================================================
// Step 2: Normalize chains and find final forms
// ============================================================

/**
 * Normalize raw evolution_chain JSON to 2D array format.
 */
function normalize(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  let routes;
  if (Array.isArray(raw[0])) {
    routes = raw;
  } else {
    routes = [raw];
  }

  return routes.map(route => {
    if (!Array.isArray(route)) return [];
    return route.map(stage => {
      if (typeof stage === 'string') return { name: stage };
      return { name: stage.name || '' };
    }).filter(s => s.name);
  }).filter(r => r.length > 0);
}

// Track which pets appear as final stages and which appear as non-final stages
const finalStageNames = new Set();    // Names that appear at the end of a route
const nonFinalStageNames = new Set(); // Names that appear NOT at the end

for (const detail of allDetails) {
  let parsed;
  try {
    parsed = JSON.parse(detail.evolution_chain);
  } catch {
    continue;
  }

  const routes = normalize(parsed);

  for (const route of routes) {
    if (route.length === 0) continue;

    // Last stage is the final form
    const lastStage = route[route.length - 1];
    finalStageNames.add(lastStage.name);

    // All other stages are non-final
    for (let i = 0; i < route.length - 1; i++) {
      nonFinalStageNames.add(route[i].name);
    }
  }
}

// ============================================================
// Step 3: Determine final forms
// A pet is final form if:
// - It appears as a final stage in at least one route
// - It does NOT appear as a non-final stage in any route
//   (handles branching: if a pet can still evolve in another route, it's not truly final)
// ============================================================

const detectedFinalForms = new Set();

for (const name of finalStageNames) {
  // If this pet also appears as a non-final stage in some route, skip it
  if (nonFinalStageNames.has(name)) continue;

  const uid = nameToUid.get(name);
  if (uid) {
    detectedFinalForms.add(uid);
  }
}

console.log(`Detected ${detectedFinalForms.size} final form pets from evolution chains.`);
console.log('');

// ============================================================
// Step 4: Apply changes
// ============================================================

const setFinal = db.prepare('UPDATE pets SET is_final_form = 1 WHERE uid = ?');
const unsetFinal = db.prepare('UPDATE pets SET is_final_form = 0 WHERE uid = ?');

// Pets that are in evolution chains but NOT detected as final forms
// → should have is_final_form = 0
const petsInChains = new Set();
for (const name of finalStageNames) {
  const uid = nameToUid.get(name);
  if (uid) petsInChains.add(uid);
}
for (const name of nonFinalStageNames) {
  const uid = nameToUid.get(name);
  if (uid) petsInChains.add(uid);
}

let promoted = 0;  // 0 → 1
let demoted = 0;   // 1 → 0
const promotedList = [];
const demotedList = [];

for (const uid of petsInChains) {
  const isFinal = detectedFinalForms.has(uid);
  const current = currentFinalForm.get(uid);

  if (isFinal && current !== 1) {
    // Should be final form but isn't marked
    if (!dryRun) setFinal.run(uid);
    promoted++;
    promotedList.push(uidToName.get(uid) || uid);
  } else if (!isFinal && current === 1) {
    // Marked as final form but shouldn't be
    if (!dryRun) unsetFinal.run(uid);
    demoted++;
    demotedList.push(uidToName.get(uid) || uid);
  }
}

// ============================================================
// Step 5: Summary
// ============================================================
console.log('=== Changes ===');

if (promotedList.length > 0) {
  console.log(`\n✓ Set as final form (${promoted}):`);
  for (const name of promotedList) {
    console.log(`  + ${name}`);
  }
}

if (demotedList.length > 0) {
  console.log(`\n✗ Unset final form (${demoted}):`);
  for (const name of demotedList) {
    console.log(`  - ${name}`);
  }
}

if (promoted === 0 && demoted === 0) {
  console.log('No changes needed — all final forms are already correct.');
}

console.log('');
console.log('=== Summary ===');
console.log(`Pets in evolution chains: ${petsInChains.size}`);
console.log(`Detected final forms: ${detectedFinalForms.size}`);
console.log(`Promoted to final form: ${promoted}`);
console.log(`Demoted from final form: ${demoted}`);

if (dryRun) {
  console.log('');
  console.log('⚠️  DRY RUN mode — no changes were written to the database.');
  console.log('   Run without --dry-run to apply changes.');
}

db.close();
console.log('Done.');
