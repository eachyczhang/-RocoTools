/**
 * 技能使用课题拉取 & 写入（两阶段分离）
 *
 * 阶段1 crawl：从 BWIKI 抓取所有最终形态精灵的技能课题 → 存入缓存 JSON
 * 阶段2 apply：从缓存 JSON 读取 → 关联 skills 表 → 写入 pet_achievements
 *
 * 这样 crawl 只跑一次，apply 可反复执行、调参，不重复请求 BWIKI。
 *
 * 使用方式：
 *   # 阶段1：爬取并缓存（不写库）
 *   node scripts/crawl-skill-achievements.js crawl
 *   node scripts/crawl-skill-achievements.js crawl --filter=pet_004_1
 *   node scripts/crawl-skill-achievements.js crawl --delay=5000
 *
 *   # 阶段2：从缓存写入数据库
 *   node scripts/crawl-skill-achievements.js apply
 *   node scripts/crawl-skill-achievements.js apply --force
 *   node scripts/crawl-skill-achievements.js apply --filter=pet_004_1
 *
 *   # 兼容旧用法（crawl + apply 一步完成）
 *   node scripts/crawl-skill-achievements.js --dry-run
 *   node scripts/crawl-skill-achievements.js
 *
 * 缓存文件：app/server/scripts/_cache_skill_achievements.json
 */

const path = require('path');
const fs = require('fs');
const { getWriteDb, getDb } = require(path.resolve(__dirname, '..', 'src', 'db', 'connection'));

// ============================================================
// Args
// ============================================================
const args = process.argv.slice(2);
const command = ['crawl', 'apply'].includes(args[0]) ? args[0] : null;
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const filterArg = args.find(a => a.startsWith('--filter'));
const filterUids = filterArg ? filterArg.split('=')[1]?.split(',').map(s => s.trim()) : null;
const delayArg = args.find(a => a.startsWith('--delay'));
const REQUEST_DELAY = delayArg ? parseInt(delayArg.split('=')[1]) : 3000;

const CACHE_PATH = path.resolve(__dirname, '_cache_skill_achievements.json');

// ============================================================
// BWIKI Config — 防封禁处理
// ============================================================
const BWIKI_API_URL = 'https://wiki.biligame.com/rocom/api.php';
const REFERER = 'https://wiki.biligame.com/rocom/';

// UA 池（随机轮换，模拟不同浏览器）
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

let cheerio;
try {
  cheerio = require('cheerio');
} catch (e) {
  console.error('❌ cheerio 未安装，请运行: cd app/server && npm install cheerio');
  process.exit(1);
}

// ============================================================
// Helpers
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 随机延迟（带抖动）
function randomDelay(baseMs) {
  const jitter = baseMs * 0.5; // ±50% 抖动
  const delay = baseMs + (Math.random() - 0.5) * jitter;
  return sleep(Math.max(1000, delay));
}

async function fetchPageHtml(pageTitle, retries = 3) {
  const params = new URLSearchParams({
    action: 'parse',
    page: pageTitle,
    prop: 'text',
    format: 'json',
    utf8: '1',
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${BWIKI_API_URL}?${params}`, {
      headers: {
        'User-Agent': randomUA(),
        'Referer': REFERER,
        'Accept': 'application/json, text/html, */*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });

    if (res.status === 403 || res.status === 429) {
      if (attempt < retries) {
        const wait = 60 * attempt + Math.random() * 10;
        console.log(`\n    ⚠️  被限频(${res.status})，等待 ${wait.toFixed(0)}s 后重试 (${attempt}/${retries})...`);
        await sleep(wait * 1000);
        continue;
      }
      throw new Error('BWIKI_403');
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(`API: ${data.error.info || JSON.stringify(data.error)}`);

    return data.parse.text['*'];
  }
}

/**
 * 从精灵详情页 HTML 中提取技能使用课题
 */
function parseSkillTopics(html) {
  const $ = cheerio.load(html);
  const topics = [];

  const topicList = $('.sprite-topic-list');
  if (!topicList.length) return topics;

  topicList.find('.sprite-topic-item').each((_, item) => {
    const text = $(item).find('.sprite-topic-text').text().trim();

    // 匹配 "使用N次XXX" 格式
    const match = text.match(/^使用(\d+)次(.+)$/);
    if (!match) return;

    const useCount = parseInt(match[1], 10);
    const skillName = match[2].trim();

    topics.push({
      skill_name: skillName,
      use_count: useCount,
    });
  });

  return topics;
}

// ============================================================
// Phase 1: CRAWL — 抓取并缓存
// ============================================================

async function doCrawl() {
  console.log('=== 阶段1：从 BWIKI 抓取技能课题 ===');
  console.log(`延迟: ${REQUEST_DELAY}ms (±50% 随机抖动)`);
  console.log(`UA池: ${USER_AGENTS.length} 个浏览器指纹`);
  if (filterUids) console.log(`过滤: 仅处理 ${filterUids.length} 个 uid`);
  console.log('');

  const db = getDb();

  // 加载目标精灵
  let pets;
  if (filterUids) {
    const placeholders = filterUids.map(() => '?').join(',');
    pets = db.prepare(`SELECT uid, name FROM pets WHERE uid IN (${placeholders})`).all(...filterUids);
  } else {
    pets = db.prepare(`
      SELECT uid, name FROM pets 
      WHERE is_final_form = 1 AND (is_boss_form IS NULL OR is_boss_form = 0)
    `).all();
  }

  console.log(`目标精灵: ${pets.length} 只`);
  console.log('');

  // 加载已有缓存（增量追加）
  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    console.log(`已有缓存: ${Object.keys(cache).length} 只精灵`);
  }

  let fetched = 0;
  let failed = 0;
  let skippedCached = 0;

  for (let i = 0; i < pets.length; i++) {
    const pet = pets[i];

    // 已有缓存则跳过（除非 --force）
    if (cache[pet.uid] && !force) {
      skippedCached++;
      continue;
    }

    fetched++;
    if (fetched > 1) await randomDelay(REQUEST_DELAY);

    try {
      process.stdout.write(`  [${fetched}] ${pet.name} (${pet.uid})... `);

      const html = await fetchPageHtml(pet.name);
      const topics = parseSkillTopics(html);

      cache[pet.uid] = {
        name: pet.name,
        topics,
        crawled_at: new Date().toISOString(),
      };

      if (topics.length === 0) {
        console.log('无技能课题');
      } else {
        console.log(`${topics.length} 个: ${topics.map(t => `${t.skill_name}(${t.use_count}次)`).join(', ')}`);
      }

      // 每 10 只保存一次（断点续传）
      if (fetched % 10 === 0) {
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
      }

    } catch (err) {
      if (err.message === 'BWIKI_403') {
        console.log('❌ 重试后仍被限频，中止后续请求');
        failed++;
        break;
      } else {
        console.log(`❌ ${err.message}`);
        failed++;
      }
    }
  }

  // 最终保存
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');

  console.log('');
  console.log('=== 抓取完成 ===');
  console.log(`新抓取: ${fetched}`);
  console.log(`跳过已缓存: ${skippedCached}`);
  console.log(`失败: ${failed}`);
  console.log(`缓存已保存: ${CACHE_PATH}`);
  console.log('');
  console.log('下一步: node scripts/crawl-skill-achievements.js apply');
}

// ============================================================
// Phase 2: APPLY — 从缓存写入数据库
// ============================================================

function doApply() {
  console.log('=== 阶段2：从缓存写入数据库 ===');
  console.log(`覆盖: ${force ? '是（强制覆盖已有技能课题）' : '否（跳过已有）'}`);
  if (filterUids) console.log(`过滤: 仅处理 ${filterUids.length} 个 uid`);
  console.log('');

  if (!fs.existsSync(CACHE_PATH)) {
    console.error('❌ 缓存文件不存在，请先执行 crawl 阶段：');
    console.error('   node scripts/crawl-skill-achievements.js crawl');
    process.exit(1);
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  console.log(`缓存中: ${Object.keys(cache).length} 只精灵`);

  const db = getWriteDb();

  // 加载 skills 表做名称匹配
  const allSkills = db.prepare('SELECT uid, name FROM skills').all();
  const skillByName = new Map(allSkills.map(s => [s.name, s]));
  console.log(`技能库: ${allSkills.length} 个技能`);
  console.log('');

  // 准备 SQL
  const insertStmt = db.prepare(`
    INSERT INTO pet_achievements (pet_uid, type, title, skill_ref_uid, skill_name, use_count, reward_desc, sort_order, is_default, hidden)
    VALUES (?, 'skill', ?, ?, ?, ?, ?, ?, 0, 0)
  `);
  const checkExisting = db.prepare(`
    SELECT id FROM pet_achievements WHERE pet_uid = ? AND type = 'skill' AND skill_name = ? AND (is_default = 0 OR is_default IS NULL)
  `);
  const deleteExistingSkillTopics = db.prepare(`
    DELETE FROM pet_achievements WHERE pet_uid = ? AND type = 'skill' AND (is_default = 0 OR is_default IS NULL)
  `);

  let inserted = 0;
  let skipped = 0;
  let noMatch = 0;
  let processed = 0;
  const unmatchedSkills = new Set();

  const uidsToProcess = filterUids ? filterUids : Object.keys(cache);

  const tx = db.transaction(() => {
    for (const uid of uidsToProcess) {
      const entry = cache[uid];
      if (!entry || !entry.topics || entry.topics.length === 0) continue;

      processed++;

      if (force) {
        deleteExistingSkillTopics.run(uid);
      }

      for (const topic of entry.topics) {
        const skill = skillByName.get(topic.skill_name);
        const skillRefUid = skill ? skill.uid : null;

        if (!skill) {
          unmatchedSkills.add(topic.skill_name);
          noMatch++;
        }

        if (!force) {
          const existing = checkExisting.get(uid, topic.skill_name);
          if (existing) { skipped++; continue; }
        }

        const title = `使用${topic.use_count}次${topic.skill_name}`;
        // 奖励固定为技能石格式，不使用 BWIKI 原始数据（格式不稳定）
        const rewardDesc = `${topic.skill_name}x1, 配方-${topic.skill_name}x1`;
        insertStmt.run(
          uid,
          title,
          skillRefUid,
          topic.skill_name,
          topic.use_count,
          rewardDesc,
          100 + inserted,
        );
        inserted++;
      }
    }
  });

  if (!dryRun) {
    tx();
  } else {
    // Dry run: 只统计不写
    for (const uid of uidsToProcess) {
      const entry = cache[uid];
      if (!entry || !entry.topics || entry.topics.length === 0) continue;
      processed++;
      for (const topic of entry.topics) {
        const skill = skillByName.get(topic.skill_name);
        if (!skill) { unmatchedSkills.add(topic.skill_name); noMatch++; }
        if (!force) {
          const existing = checkExisting.get(uid, topic.skill_name);
          if (existing) { skipped++; continue; }
        }
        inserted++;
      }
    }
  }

  console.log('=== 写入完成 ===');
  console.log(`处理精灵: ${processed}`);
  console.log(`插入技能课题: ${inserted}`);
  console.log(`跳过已存在: ${skipped}`);
  if (unmatchedSkills.size > 0) {
    console.log(`⚠️  未匹配技能 (${unmatchedSkills.size}): ${[...unmatchedSkills].join(', ')}`);
  }
  if (dryRun) {
    console.log('');
    console.log('🔍 DRY RUN — 未写入数据库。去掉 --dry-run 执行实际写入。');
  }

  db.close();
}

// ============================================================
// Legacy mode (no subcommand) — crawl + apply in one go
// ============================================================

async function doLegacy() {
  console.log('=== 技能使用课题拉取（一步模式） ===');
  console.log(`模式: ${dryRun ? '🔍 DRY RUN（不写入）' : '✏️  LIVE（将写入数据库）'}`);
  console.log('');
  // crawl first
  await doCrawl();
  // then apply
  if (!dryRun) {
    doApply();
  } else {
    console.log('--- dry-run 预览写入 ---');
    doApply(); // doApply respects dryRun flag
  }
}

// ============================================================
// Entry
// ============================================================

async function main() {
  if (command === 'crawl') {
    await doCrawl();
  } else if (command === 'apply') {
    doApply();
  } else {
    await doLegacy();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
