/**
 * 精灵Q版小头像拉取（两阶段分离）
 *
 * 阶段1 crawl：从 BWIKI 精灵详情页进化链区域提取头像 URL → 存入缓存 JSON
 * 阶段2 apply：从缓存下载图片 → 保存到 data/public/pets/avatars/ → 写入 pet_details.avatar_url
 *
 * 头像来源：.sprite-evolve-section 中当前精灵对应的 .sprite-evolve-head img
 * 文件命名：{uid}_avatar.png（如 pet_002_avatar.png）
 * 本地路径：/public/pets/avatars/{uid}_avatar.png
 *
 * 使用方式：
 *   # 阶段1：抓取头像 URL → 缓存
 *   node scripts/crawl-pet-avatars.js crawl
 *   node scripts/crawl-pet-avatars.js crawl --filter=pet_004_1
 *   node scripts/crawl-pet-avatars.js crawl --delay=3000
 *
 *   # 阶段2：从缓存下载图片并写入数据库
 *   node scripts/crawl-pet-avatars.js apply
 *   node scripts/crawl-pet-avatars.js apply --dry-run
 *   node scripts/crawl-pet-avatars.js apply --force
 *
 * 缓存文件：app/server/scripts/_cache_pet_avatars.json
 */

const path = require('path');
const fs = require('fs');
const { getWriteDb, getDb, DATA_DIR } = require(path.resolve(__dirname, '..', 'src', 'db', 'connection'));

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

const CACHE_PATH = path.resolve(__dirname, '_cache_pet_avatars.json');
const AVATAR_DIR = path.join(DATA_DIR, 'public', 'pets', 'avatars');

// ============================================================
// BWIKI Config
// ============================================================
const BWIKI_API_URL = 'https://wiki.biligame.com/rocom/api.php';
const REFERER = 'https://wiki.biligame.com/rocom/';

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
  console.error('❌ cheerio 未安装');
  process.exit(1);
}

// ============================================================
// Helpers
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(baseMs) {
  const jitter = baseMs * 0.5;
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
        console.log(`\n    ⚠️  限频(${res.status})，等待 ${wait.toFixed(0)}s (${attempt}/${retries})...`);
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
 * 从详情页中提取当前精灵的头像 URL
 * 策略：从进化链中找到与精灵名匹配的 section，取其 .sprite-evolve-head img
 */
function parseAvatarUrl(html, petName) {
  const $ = cheerio.load(html);

  // 方法1：从进化链中匹配精灵名
  let avatarUrl = null;
  $('.sprite-evolve-section').each((_, section) => {
    if (avatarUrl) return;
    const nameEl = $(section).find('.sprite-evolve-name');
    const name = nameEl.text().trim();
    // 名称可能含形态后缀，用 includes 匹配
    if (name === petName || name.includes(petName)) {
      const img = $(section).find('.sprite-evolve-head img');
      const src = img.attr('src') || '';
      if (src) avatarUrl = fixUrl(src);
    }
  });

  // 方法2：如果进化链没找到（单形态无进化的），取第一个 .sprite-evolve-head img
  if (!avatarUrl) {
    const firstHead = $('.sprite-evolve-head img').first();
    if (firstHead.length) {
      const src = firstHead.attr('src') || '';
      if (src) avatarUrl = fixUrl(src);
    }
  }

  return avatarUrl;
}

function fixUrl(url) {
  if (!url) return '';
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://wiki.biligame.com' + url;
  return url;
}

async function downloadImage(url, savePath) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': randomUA(),
      'Referer': REFERER,
    },
  });
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(savePath), { recursive: true });
  fs.writeFileSync(savePath, buffer);
  return buffer.length;
}

// ============================================================
// Phase 1: CRAWL
// ============================================================

async function doCrawl() {
  console.log('=== 阶段1：从 BWIKI 抓取精灵头像 URL ===');
  console.log(`延迟: ${REQUEST_DELAY}ms (±50% 抖动)`);
  if (filterUids) console.log(`过滤: ${filterUids.length} 个 uid`);
  console.log('');

  const db = getDb();

  let pets;
  if (filterUids) {
    const placeholders = filterUids.map(() => '?').join(',');
    pets = db.prepare(`SELECT uid, name FROM pets WHERE uid IN (${placeholders})`).all(...filterUids);
  } else {
    // 所有精灵（不限最终形态）
    pets = db.prepare(`SELECT uid, name FROM pets WHERE (is_boss_form IS NULL OR is_boss_form = 0)`).all();
  }

  console.log(`目标精灵: ${pets.length} 只`);

  // 加载已有缓存
  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    console.log(`已有缓存: ${Object.keys(cache).length} 只`);
  }
  console.log('');

  let fetched = 0;
  let found = 0;
  let failed = 0;
  let skippedCached = 0;

  // 按精灵名去重（同 pet_id 多形态共用一个详情页）
  const nameToUids = new Map(); // name → [uid1, uid2, ...]
  for (const pet of pets) {
    if (!nameToUids.has(pet.name)) nameToUids.set(pet.name, []);
    nameToUids.get(pet.name).push(pet.uid);
  }

  const namesToFetch = [];
  for (const [name, uids] of nameToUids) {
    // 任一 uid 已缓存则跳过该名称
    const allCached = uids.every(uid => cache[uid] && !force);
    if (allCached) {
      skippedCached += uids.length;
    } else {
      namesToFetch.push({ name, uids });
    }
  }

  console.log(`需抓取: ${namesToFetch.length} 个详情页`);
  console.log('');

  for (let i = 0; i < namesToFetch.length; i++) {
    const { name, uids } = namesToFetch[i];
    fetched++;
    if (fetched > 1) await randomDelay(REQUEST_DELAY);

    try {
      process.stdout.write(`  [${fetched}/${namesToFetch.length}] ${name}... `);

      const html = await fetchPageHtml(name);
      const avatarUrl = parseAvatarUrl(html, name);

      for (const uid of uids) {
        cache[uid] = {
          name,
          avatar_url: avatarUrl || null,
          crawled_at: new Date().toISOString(),
        };
      }

      if (avatarUrl) {
        found += uids.length;
        console.log(`✓ (${uids.length} 形态)`);
      } else {
        console.log('无头像');
      }

      // 断点续传
      if (fetched % 10 === 0) {
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
      }

    } catch (err) {
      if (err.message === 'BWIKI_403') {
        console.log('❌ 限频中止');
        failed++;
        break;
      } else {
        console.log(`❌ ${err.message}`);
        failed++;
      }
    }
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');

  console.log('');
  console.log('=== 抓取完成 ===');
  console.log(`请求页面: ${fetched}`);
  console.log(`找到头像: ${found}`);
  console.log(`跳过已缓存: ${skippedCached}`);
  console.log(`失败: ${failed}`);
  console.log(`缓存已保存: ${CACHE_PATH}`);
  console.log('');
  console.log('下一步: node scripts/crawl-pet-avatars.js apply');
}

// ============================================================
// Phase 2: APPLY — 下载图片 + 写入数据库
// ============================================================

async function doApply() {
  console.log('=== 阶段2：下载头像图片 + 写入数据库 ===');
  console.log(`覆盖: ${force ? '是' : '否（跳过已有）'}`);
  if (filterUids) console.log(`过滤: ${filterUids.length} 个 uid`);
  console.log(`图片目录: ${AVATAR_DIR}`);
  console.log('');

  if (!fs.existsSync(CACHE_PATH)) {
    console.error('❌ 缓存不存在，请先执行: node scripts/crawl-pet-avatars.js crawl');
    process.exit(1);
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  console.log(`缓存中: ${Object.keys(cache).length} 只精灵`);

  const db = getWriteDb();

  // 确保 avatar_url 列存在
  const cols = db.prepare("PRAGMA table_info(pet_details)").all();
  if (!cols.some(c => c.name === 'avatar_url')) {
    db.prepare("ALTER TABLE pet_details ADD COLUMN avatar_url TEXT").run();
    console.log('✅ 已添加 avatar_url 列');
  }

  const updateStmt = db.prepare(`UPDATE pet_details SET avatar_url = ? WHERE pet_uid = ?`);
  const insertStmt = db.prepare(`INSERT OR IGNORE INTO pet_details (pet_uid, avatar_url) VALUES (?, ?)`);
  const checkStmt = db.prepare(`SELECT pet_uid, avatar_url FROM pet_details WHERE pet_uid = ?`);

  const uidsToProcess = filterUids || Object.keys(cache);
  let downloaded = 0;
  let skipped = 0;
  let updated = 0;
  let noUrl = 0;

  fs.mkdirSync(AVATAR_DIR, { recursive: true });

  for (const uid of uidsToProcess) {
    const entry = cache[uid];
    if (!entry || !entry.avatar_url) { noUrl++; continue; }

    const localPath = path.join(AVATAR_DIR, `${uid}_avatar.png`);
    const dbPath = `/public/pets/avatars/${uid}_avatar.png`;

    // 检查是否已有
    if (!force) {
      const existing = checkStmt.get(uid);
      if (existing && existing.avatar_url && fs.existsSync(localPath)) {
        skipped++;
        continue;
      }
    }

    if (!dryRun) {
      try {
        // 下载图片
        const bytes = await downloadImage(entry.avatar_url, localPath);
        downloaded++;

        // 写入 DB
        const existing = checkStmt.get(uid);
        if (existing) {
          updateStmt.run(dbPath, uid);
        } else {
          insertStmt.run(uid, dbPath);
        }
        updated++;

        if (downloaded % 20 === 0) {
          process.stdout.write(`  已下载 ${downloaded}...\r`);
        }

        // 下载间不需要太长延迟（图片 CDN 不限流）
        if (downloaded % 5 === 0) await sleep(500);
      } catch (err) {
        console.log(`  ⚠️ ${uid}: ${err.message}`);
      }
    } else {
      downloaded++;
      updated++;
    }
  }

  console.log('');
  console.log('=== 完成 ===');
  console.log(`下载图片: ${downloaded}`);
  console.log(`写入数据库: ${updated}`);
  console.log(`跳过已有: ${skipped}`);
  console.log(`无头像URL: ${noUrl}`);
  if (dryRun) console.log('\n🔍 DRY RUN — 未实际操作。');

  db.close();
}

// ============================================================
// Entry
// ============================================================

async function main() {
  if (command === 'crawl') {
    await doCrawl();
  } else if (command === 'apply') {
    await doApply();
  } else {
    // 无子命令：crawl + apply
    await doCrawl();
    if (!dryRun) {
      await doApply();
    } else {
      console.log('--- dry-run 预览 apply ---');
      await doApply();
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
