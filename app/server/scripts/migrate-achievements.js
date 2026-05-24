/**
 * Migration: Add pet achievements system
 * - Add is_final_form column to pets table
 * - Create pet_achievements table
 * 
 * Run: node scripts/migrate-achievements.js
 */
const { getWriteDb } = require('../src/db/connection');

function migrate() {
  const db = getWriteDb();

  try {
    // Check if is_final_form column already exists
    const cols = db.prepare("PRAGMA table_info(pets)").all();
    const hasColumn = cols.some(c => c.name === 'is_final_form');

    if (!hasColumn) {
      db.prepare("ALTER TABLE pets ADD COLUMN is_final_form INTEGER DEFAULT 0").run();
      console.log('✅ Added is_final_form column to pets table');
    } else {
      console.log('ℹ️  is_final_form column already exists');
    }

    // Create pet_achievements table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS pet_achievements (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        pet_uid     TEXT NOT NULL,
        type        TEXT NOT NULL,
        title       TEXT,
        skill_ref_uid TEXT,
        skill_name  TEXT,
        use_count   INTEGER DEFAULT 0,
        reward_desc TEXT,
        sort_order  INTEGER DEFAULT 0,
        FOREIGN KEY (pet_uid) REFERENCES pets(uid),
        FOREIGN KEY (skill_ref_uid) REFERENCES skills(uid)
      )
    `).run();
    console.log('✅ Created pet_achievements table');

    // Create index
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_pet_achievements_pet ON pet_achievements(pet_uid)`).run();
    console.log('✅ Created index on pet_achievements');

    console.log('\n🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
