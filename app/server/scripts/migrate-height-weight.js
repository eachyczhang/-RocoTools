/**
 * Migrate height/weight data to normalized "min-max" format.
 *
 * Handles existing formats:
 *   - "1.5~2.15"  → "1.50-2.15"
 *   - "1.5-2.15"  → "1.50-2.15"
 *   - "1.5"       → "1.50-1.50"
 *   - Invalid     → cleared (set to NULL)
 *
 * Usage: node app/server/scripts/migrate-height-weight.js [--dry-run]
 */

const path = require('path');
const { getWriteDb } = require(path.resolve(__dirname, '..', 'src', 'db', 'connection'));

const dryRun = process.argv.includes('--dry-run');

console.log('=== Height/Weight Migration ===');
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
console.log('');

const db = getWriteDb();

/**
 * Parse a range string and return normalized "min-max" format.
 * @param {string} str - Raw value like "1.5~2.15" or "1.5-2.15" or "1.5"
 * @returns {string|null} Normalized string or null if invalid
 */
function normalizeRange(str) {
  if (!str || !str.trim()) return null;
  const s = str.trim();

  // Try range format: "1.5~2.15" or "1.5-2.15" (with possible spaces)
  const rangeMatch = s.match(/^([\d.]+)\s*[~\-～—]\s*([\d.]+)$/);
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1]);
    const b = parseFloat(rangeMatch[2]);
    if (isNaN(a) || isNaN(b)) return null;
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    return min.toFixed(2) + '-' + max.toFixed(2);
  }

  // Try single value: "1.5"
  const singleMatch = s.match(/^([\d.]+)$/);
  if (singleMatch) {
    const v = parseFloat(singleMatch[1]);
    if (isNaN(v)) return null;
    return v.toFixed(2) + '-' + v.toFixed(2);
  }

  // Cannot parse
  return null;
}

// Load all pet_details with height or weight
const rows = db.prepare(`
  SELECT pet_uid, height, weight FROM pet_details
  WHERE height IS NOT NULL OR weight IS NOT NULL
`).all();

console.log(`Records to process: ${rows.length}`);

const updateStmt = db.prepare(`
  UPDATE pet_details SET height = ?, weight = ? WHERE pet_uid = ?
`);

let updated = 0;
let cleared = 0;
let unchanged = 0;

const tx = db.transaction(() => {
  for (const row of rows) {
    const newHeight = normalizeRange(row.height);
    const newWeight = normalizeRange(row.weight);

    const heightChanged = row.height !== newHeight;
    const weightChanged = row.weight !== newWeight;

    if (!heightChanged && !weightChanged) {
      unchanged++;
      continue;
    }

    if (!dryRun) {
      updateStmt.run(newHeight, newWeight, row.pet_uid);
    }

    if ((row.height && !newHeight) || (row.weight && !newWeight)) {
      cleared++;
      if (row.height && !newHeight) {
        console.log(`  ⚠️  ${row.pet_uid}: height "${row.height}" → cleared`);
      }
      if (row.weight && !newWeight) {
        console.log(`  ⚠️  ${row.pet_uid}: weight "${row.weight}" → cleared`);
      }
    } else {
      updated++;
    }
  }
});

tx();

console.log('');
console.log('=== Summary ===');
console.log(`Updated: ${updated}`);
console.log(`Cleared (invalid): ${cleared}`);
console.log(`Unchanged: ${unchanged}`);

if (dryRun) {
  console.log('');
  console.log('⚠️  DRY RUN — no changes written. Run without --dry-run to apply.');
}

db.close();
console.log('Done.');
