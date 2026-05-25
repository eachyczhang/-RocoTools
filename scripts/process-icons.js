/**
 * Icon Processor - Unified Entry
 * 
 * Runs both ability-icon-tool and skill-icon-tool in one command.
 * 
 * Usage: node scripts/process-icons.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = path.join(__dirname);
const ABILITY_DIR = path.join(SCRIPTS_DIR, 'ability-icon-tool');
const SKILL_DIR = path.join(SCRIPTS_DIR, 'skill-icon-tool');

function hasInputFiles(dir) {
  const inputDir = path.join(dir, 'input');
  if (!fs.existsSync(inputDir)) return false;
  const files = fs.readdirSync(inputDir).filter(f => 
    !f.startsWith('.') && /\.(png|jpg|jpeg|webp|bmp|tiff)$/i.test(f)
  );
  return files.length > 0;
}

console.log('=== Icon Processor ===\n');

const hasAbility = hasInputFiles(ABILITY_DIR);
const hasSkill = hasInputFiles(SKILL_DIR);

if (!hasAbility && !hasSkill) {
  console.log('No input files found in either tool.\n');
  console.log('Place images in:');
  console.log(`  • ${path.join(ABILITY_DIR, 'input')}/ → for ability icons (circular)`);
  console.log(`  • ${path.join(SKILL_DIR, 'input')}/ → for skill icons (rounded-square)`);
  process.exit(0);
}

if (hasAbility) {
  console.log('── Ability Icons (circular) ──\n');
  try {
    const output = execSync('node process.js', { cwd: ABILITY_DIR, encoding: 'utf-8' });
    console.log(output);
  } catch (err) {
    console.error('Ability icon processing failed:', err.message);
  }
}

if (hasSkill) {
  console.log('── Skill Icons (rounded-square) ──\n');
  try {
    const output = execSync('node process.js', { cwd: SKILL_DIR, encoding: 'utf-8' });
    console.log(output);
  } catch (err) {
    console.error('Skill icon processing failed:', err.message);
  }
}

console.log('\n=== All Done ===');
