/**
 * Batch sync all evolution chains across all pets.
 *
 * This script:
 * 1. Reads all pet_details with non-empty evolution_chain
 * 2. Normalizes each chain to 2D array format
 * 3. Groups pets by shared evolution chain (pets that appear in each other's chains)
 * 4. Merges all routes within each group (deduplicates by route signature)
 * 5. Writes the merged result back to all pets in the group
 *
 * Usage: node app/server/scripts/sync-evolution-chains.js [--dry-run]
 *
 * Options:
 *   --dry-run   Preview changes without writing to database
 */

const path = require('path');
const { getWriteDb } = require(path.resolve(__dirname, '..', 'src', 'db', 'connection'));

const dryRun = process.argv.includes('--dry-run');

console.log('=== Evolution Chain Batch Sync ===');
console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (will write to DB)'}`);
console.log('');

const db = getWriteDb();

// ============================================================
// Step 1: Read all evolution chains from pet_details
// ============================================================
const allDetails = db.prepare(`
  SELECT pd.pet_uid, pd.evolution_chain, p.name
  FROM pet_details pd
  JOIN pets p ON p.uid = pd.pet_uid
  WHERE pd.evolution_chain IS NOT NULL AND pd.evolution_chain != '' AND pd.evolution_chain != '[]'
`).all();

console.log(`Found ${allDetails.length} pets with evolution_chain data.`);

// ============================================================
// Step 2: Normalize all chains to 2D format
// ============================================================

/**
 * Normalize raw evolution_chain JSON to 2D array of route objects.
 * Supports: string[], object[], and 2D array formats.
 */
function normalize(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  let routes;
  if (Array.isArray(raw[0])) {
    routes = raw; // Already 2D
  } else {
    routes = [raw]; // Wrap 1D as single route
  }

  return routes.map(route => {
    if (!Array.isArray(route)) return [];
    return route.map(stage => {
      if (typeof stage === 'string') {
        return { name: stage, evolve_level: null, evolve_condition: null };
      }
      return {
        name: stage.name || '',
        evolve_level: stage.evolve_level || null,
        evolve_condition: stage.evolve_condition || null,
      };
    }).filter(s => s.name); // Remove empty stages
  }).filter(r => r.length > 0);
}

/** Get route signature for deduplication (ordered names) */
function routeSignature(route) {
  return route.map(s => s.name).join('→');
}

// Build a map: pet_uid → normalized routes
const petRoutesMap = new Map(); // pet_uid → [[{name, evolve_level, evolve_condition}, ...], ...]
const petNameMap = new Map(); // name → uid
const petUidNameMap = new Map(); // uid → name

// Build name→uid lookup from all pets
const allPets = db.prepare('SELECT uid, name FROM pets').all();
for (const p of allPets) {
  petNameMap.set(p.name, p.uid);
  petUidNameMap.set(p.uid, p.name);
}

for (const detail of allDetails) {
  let parsed;
  try {
    parsed = JSON.parse(detail.evolution_chain);
  } catch {
    console.warn(`  [WARN] Failed to parse evolution_chain for ${detail.name} (${detail.pet_uid}), skipping.`);
    continue;
  }

  const routes = normalize(parsed);
  if (routes.length > 0) {
    petRoutesMap.set(detail.pet_uid, routes);
  }
}

console.log(`Parsed ${petRoutesMap.size} valid evolution chains.`);
console.log('');

// ============================================================
// Step 3: Group pets by shared evolution chain (connected components)
// ============================================================

// Build adjacency: for each pet, find all other pets mentioned in its routes
const adjacency = new Map(); // pet_uid → Set<pet_uid>

for (const [uid, routes] of petRoutesMap) {
  if (!adjacency.has(uid)) adjacency.set(uid, new Set());

  for (const route of routes) {
    for (const stage of route) {
      const otherUid = petNameMap.get(stage.name);
      if (otherUid && otherUid !== uid) {
        adjacency.get(uid).add(otherUid);
        if (!adjacency.has(otherUid)) adjacency.set(otherUid, new Set());
        adjacency.get(otherUid).add(uid);
      }
    }
  }
}

// BFS to find connected components
const visited = new Set();
const groups = []; // Array of Set<pet_uid>

for (const uid of adjacency.keys()) {
  if (visited.has(uid)) continue;
  const group = new Set();
  const queue = [uid];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    group.add(current);
    const neighbors = adjacency.get(current);
    if (neighbors) {
      for (const n of neighbors) {
        if (!visited.has(n)) queue.push(n);
      }
    }
  }
  groups.push(group);
}

console.log(`Found ${groups.length} evolution chain groups.`);
console.log('');

// ============================================================
// Step 4: For each group, merge all routes and sync to all members
// ============================================================

const upsertStmt = db.prepare(`
  INSERT INTO pet_details (pet_uid, evolution_chain, manual_edit)
  VALUES (?, ?, 1)
  ON CONFLICT(pet_uid) DO UPDATE SET evolution_chain = excluded.evolution_chain, manual_edit = 1
`);

let totalUpdated = 0;
let totalGroups = 0;

for (const group of groups) {
  // Collect all routes from all members of this group
  const allRoutes = [];
  const routeSigs = new Set();

  for (const uid of group) {
    const routes = petRoutesMap.get(uid);
    if (!routes) continue;
    for (const route of routes) {
      const sig = routeSignature(route);
      if (!routeSigs.has(sig)) {
        allRoutes.push(route);
        routeSigs.add(sig);
      }
    }
  }

  if (allRoutes.length === 0) continue;

  totalGroups++;
  const mergedJson = JSON.stringify(allRoutes);

  // Get group member names for logging
  const memberNames = [...group].map(uid => petUidNameMap.get(uid) || uid);

  // Check if any member needs updating
  let needsUpdate = false;
  for (const uid of group) {
    const existing = petRoutesMap.get(uid);
    if (!existing) {
      needsUpdate = true;
      break;
    }
    // Compare: does this pet already have the full merged set?
    const existingSigs = new Set(existing.map(r => routeSignature(r)));
    for (const route of allRoutes) {
      if (!existingSigs.has(routeSignature(route))) {
        needsUpdate = true;
        break;
      }
    }
    if (needsUpdate) break;
  }

  if (!needsUpdate) continue;

  console.log(`Group: ${memberNames.join(', ')}`);
  console.log(`  Routes (${allRoutes.length}):`);
  for (let i = 0; i < allRoutes.length; i++) {
    const routeStr = allRoutes[i].map(s => {
      let str = s.name;
      if (s.evolve_level) str += `(Lv${s.evolve_level})`;
      if (s.evolve_condition) str += `[${s.evolve_condition}]`;
      return str;
    }).join(' → ');
    console.log(`    路线${i + 1}: ${routeStr}`);
  }

  // Write merged chain to all members
  let updatedInGroup = 0;
  for (const uid of group) {
    // Also include pets in the group that don't have pet_details yet
    const existing = petRoutesMap.get(uid);
    const existingSigs = existing ? new Set(existing.map(r => routeSignature(r))) : new Set();
    const allMergedSigs = new Set(allRoutes.map(r => routeSignature(r)));

    // Check if this specific pet needs update
    let petNeedsUpdate = false;
    if (!existing) {
      petNeedsUpdate = true;
    } else if (existing.length !== allRoutes.length) {
      petNeedsUpdate = true;
    } else {
      for (const sig of allMergedSigs) {
        if (!existingSigs.has(sig)) {
          petNeedsUpdate = true;
          break;
        }
      }
    }

    if (petNeedsUpdate) {
      if (!dryRun) {
        upsertStmt.run(uid, mergedJson);
      }
      updatedInGroup++;
      totalUpdated++;
      console.log(`  ✓ Updated: ${petUidNameMap.get(uid) || uid}`);
    }
  }

  // Also sync to pets mentioned in routes but not in the group (no existing chain)
  for (const route of allRoutes) {
    for (const stage of route) {
      const uid = petNameMap.get(stage.name);
      if (uid && !group.has(uid)) {
        // This pet is mentioned but doesn't have a chain yet
        if (!dryRun) {
          upsertStmt.run(uid, mergedJson);
        }
        totalUpdated++;
        console.log(`  ✓ Created: ${stage.name} (${uid})`);
      }
    }
  }

  console.log('');
}

// ============================================================
// Step 5: Summary
// ============================================================
console.log('=== Summary ===');
console.log(`Groups processed: ${totalGroups}`);
console.log(`Pets updated: ${totalUpdated}`);
if (dryRun) {
  console.log('');
  console.log('⚠️  DRY RUN mode — no changes were written to the database.');
  console.log('   Run without --dry-run to apply changes.');
}

db.close();
console.log('Done.');
