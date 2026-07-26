const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../db/connection');
const { batchRequestContext, currentStageRoot, DEFAULT_STAGE_ROOT } = require('../../services/wikiBatchManager');

const router = express.Router();

router.use('/wiki-review', batchRequestContext);
const REVIEW_STAGES = [
  { entity: 'skill', folder: 'skills', label: '技能' },
  { entity: 'ability', folder: 'abilities', label: '特性' },
  { entity: 'pet', folder: 'pets', label: '精灵' },
];
const ENTITY_FIELDS = {
  skill: ['name', 'element', 'category', 'cost', 'power', 'description'],
  ability: ['description'],
  pet: ['element', 'sub_element', 'ability_name', 'ability_desc', 'hp', 'speed', 'atk', 'matk', 'def', 'mdef', 'total'],
};
const PET_NEW_FIELDS = ['pet_id', 'name', ...ENTITY_FIELDS.pet];
const ENTITY_ASSET_KEYS = {
  skill: ['icon'],
  ability: ['icon'],
  pet: ['image_default', 'image_shiny', 'image_fruit', 'image_egg', 'ability_icon'],
};
const REVIEW_VIEWS = new Set(['differences', 'confirmed', 'unchanged']);
const DEFAULT_REVIEW_PAGE_SIZE = 1;
const MAX_REVIEW_PAGE_SIZE = 20;
const REVIEW_ENTRY_CACHE_TTL_MS = 60000;
const reviewEntryCache = new Map();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_HOST_SUFFIXES = ['.biligame.com', '.hdslb.com'];
const BWIKI_API_URL = 'https://wiki.biligame.com/rocom/api.php';
const BWIKI_REFERER = 'https://wiki.biligame.com/rocom/';
const BWIKI_USER_AGENT = process.env.ROCO_CRAWLER_USER_AGENT
  || 'RocoTools-BWIKI-Sync/1.0 (respectful MediaWiki client)';
const BWIKI_ACCEPT_LANGUAGE = 'zh-CN,zh;q=0.9,en;q=0.8';
const RESOLVED_DECISIONS = new Set([
  'approved-new', 'approved-fields', 'approved-reference', 'approved-no-change', 'approved-uid-migration', 'ignored',
]);

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function normalizeFilterPageAssets(entity, remote) {
  if (!remote || remote.detail_source || !String(remote.source_url || '').includes('/精灵筛选')) return remote;
  const assets = { ...(remote.assets || {}) };
  if (entity === 'pet') {
    if (!assets.review_avatar?.remote_url && assets.image_default?.remote_url) {
      assets.review_avatar = { ...assets.image_default, review_only: true };
    }
    if (!assets.review_ability_icon?.remote_url && assets.ability_icon?.remote_url) {
      assets.review_ability_icon = { ...assets.ability_icon, review_only: true };
    }
    delete assets.image_default;
    delete assets.ability_icon;
  } else if (entity === 'ability' && assets.icon?.remote_url) {
    assets.review_icon = { ...assets.icon, review_only: true };
    delete assets.icon;
  }
  return { ...remote, assets };
}

function publishableDownloadedAssets(entity, remote, assets) {
  const filtered = { ...(assets || {}) };
  if (entity === 'pet') {
    for (const key of ENTITY_ASSET_KEYS.pet) {
      if (filtered[key] && !petAssetSlotCompatible(key, filtered[key])) delete filtered[key];
    }
  }
  if (remote?.detail_source || !String(remote?.source_url || '').includes('/精灵筛选')) return filtered;
  if (entity === 'pet') {
    delete filtered.image_default;
    delete filtered.ability_icon;
  } else if (entity === 'ability') {
    delete filtered.icon;
  }
  return filtered;
}

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function stageConfig(entity) {
  const config = REVIEW_STAGES.find(item => item.entity === entity);
  if (!config) throw new Error('未知审核类型');
  return config;
}

function entityRoot(entity) {
  return path.join(currentStageRoot(), stageConfig(entity).folder);
}

function entityFolder(entity, folderId) {
  if (!/^[A-Za-z0-9_-]+$/.test(folderId)) throw new Error('无效暂存 ID');
  const root = path.resolve(entityRoot(entity));
  const resolved = path.resolve(root, folderId);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('无效暂存路径');
  return resolved;
}

function abilityPetRefs(remote) {
  const refs = Array.isArray(remote?.data?.pet_refs) ? remote.data.pet_refs.filter(ref => ref?.name) : [];
  if (refs.length) return refs;
  return (remote?.data?.pet_uids || []).map(uid => {
    const petRemote = readJson(path.join(currentStageRoot(), 'pets', uid, 'remote.json'));
    const data = petRemote?.data || {};
    return data.name ? { uid, name: data.name, pet_id: data.pet_id || null } : null;
  }).filter(Boolean);
}

function enrichAbilityRemote(remote) {
  if (remote?.entity !== 'ability') return remote;
  const petRefs = abilityPetRefs(remote);
  return {
    ...remote,
    data: {
      ...(remote.data || {}),
      pet_refs: petRefs,
      representative_pet: remote.data?.representative_pet || petRefs[0] || null,
    },
  };
}

function enrichPetLocal(entity, local) {
  if (entity !== 'pet' || !local?.data?.uid) return local;
  try {
    const row = getDb().prepare(`
      SELECT image_default, image_shiny, image_fruit, image_egg, ability_icon
      FROM pet_details WHERE pet_uid = ?
    `).get(local.data.uid);
    return row ? { ...local, data: { ...local.data, ...row } } : local;
  } catch (error) {
    console.warn('[wiki-review] unable to read local pet assets:', error.message);
    return local;
  }
}

function localPetSnapshot(uid) {
  if (!/^pet_[A-Za-z0-9_-]+$/.test(String(uid || ''))) return null;
  const db = getDb();
  const row = db.prepare(`
    SELECT p.uid, p.pet_id, p.name, p.ability_name, p.ability_desc,
      p.hp, p.speed, p.atk, p.matk, p.def, p.mdef, p.total, p.version,
      e.name AS element, se.name AS sub_element,
      pd.image_default, pd.image_shiny, pd.image_fruit, pd.image_egg, pd.ability_icon,
      pd.height, pd.weight, pd.location
    FROM pets p
    LEFT JOIN elements e ON e.id = p.element_id
    LEFT JOIN elements se ON se.id = p.sub_element_id
    LEFT JOIN pet_details pd ON pd.pet_uid = p.uid
    WHERE p.uid = ?
  `).get(uid);
  if (!row) return null;
  return {
    uid: row.uid, pet_id: row.pet_id, name: row.name, element: row.element,
    sub_element: row.sub_element, ability_name: row.ability_name, ability_desc: row.ability_desc,
    hp: row.hp, speed: row.speed, atk: row.atk, matk: row.matk, def: row.def, mdef: row.mdef,
    total: row.total, version: row.version, image_default: row.image_default,
    image_shiny: row.image_shiny, image_fruit: row.image_fruit, image_egg: row.image_egg,
    ability_icon: row.ability_icon, height: row.height, weight: row.weight, location: row.location,
  };
}

function comparableReviewValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return value.trim();
  return value;
}

function associatePetIdentity(remoteData, localData) {
  const remoteUid = String(remoteData?.uid || '');
  const localUid = String(localData?.uid || '');
  const remotePetId = String(remoteData?.pet_id || '');
  const localPetId = String(localData?.pet_id || '');
  const remoteName = String(remoteData?.name || '').trim();
  const localName = String(localData?.name || '').trim();
  let status = 'matched';
  let basis = 'manual-local-association';
  if (remoteUid !== localUid) {
    if (remoteName && localName && remoteName === localName) {
      status = 'name-match-id-different';
      basis = 'manual-name-match';
    } else if (remotePetId && remotePetId === localPetId) {
      status = 'id-match-name-different';
      basis = 'manual-pet-id-match';
    } else {
      status = 'name-match-id-different';
      basis = 'manual-local-association';
    }
  }
  return {
    status, basis, safe_to_compare: true, safe_to_import: true,
    remote: { uid: remoteUid, pet_id: remotePetId, name: remoteName },
    local: { uid: localUid, pet_id: localPetId, name: localName },
    candidates: [{ uid: localUid, pet_id: localPetId, name: localName }],
  };
}

function buildAssociatedPetDiff(remoteData, localData, identity, id) {
  const fields = {};
  const counts = { same: 0, changed: 0, 'remote-only': 0, 'local-only': 0 };
  for (const field of ENTITY_FIELDS.pet) {
    const remoteValue = comparableReviewValue(remoteData?.[field]);
    const localValue = comparableReviewValue(localData?.[field]);
    const status = remoteValue === localValue ? 'same'
      : (remoteValue === null ? 'local-only' : (localValue === null ? 'remote-only' : 'changed'));
    counts[status] += 1;
    fields[field] = { status, local: localValue, remote: remoteValue };
  }
  return {
    schema_version: 1, entity: 'pet', id, compared_at: new Date().toISOString(), identity,
    summary: { ...counts, has_changes: counts.changed + counts['remote-only'] + counts['local-only'] > 0, local_exists: true, manual_edit: {} },
    fields, collections: {},
  };
}
function loadReview(entity, folderId) {
  const folder = entityFolder(entity, folderId);
  const remote = enrichAbilityRemote(
    normalizeFilterPageAssets(entity, readJson(path.join(folder, 'remote.json'))),
  );
  const local = enrichPetLocal(entity, readJson(path.join(folder, 'local.json')));
  const diff = readJson(path.join(folder, 'diff.json'));
  const plan = readJson(path.join(folder, 'import.json'));
  if (!remote || !diff || !plan || remote.entity !== entity) return null;
  const savedAssets = readJson(path.join(folder, 'assets.json'), entity === 'skill'
    ? { icon: readJson(path.join(folder, 'image.json')) }
    : {});
  return {
    entity,
    folderId,
    remote,
    local,
    diff,
    plan,
    assets: publishableDownloadedAssets(entity, remote, savedAssets),
  };
}

function reviewDecision(review) {
  return review.plan.review?.decision || (review.plan.enabled ? 'approved-fields' : 'pending');
}

function isResolved(review) {
  return review.plan.enabled || RESOLVED_DECISIONS.has(reviewDecision(review));
}

function isAutoUnchanged(review) {
  return review.diff.identity?.status === 'matched' && !hasAllowedChanges(review);
}

function needsReview(review) {
  return !isResolved(review) && !isAutoUnchanged(review);
}

function hasAllowedChanges(review) {
  const fields = review.diff.fields || {};
  return (ENTITY_FIELDS[review.entity] || []).some(
    field => fields[field] && fields[field].status !== 'same',
  );
}

function reviewBucket(review) {
  if (isResolved(review)) return 'confirmed';
  return isAutoUnchanged(review) ? 'unchanged' : 'differences';
}

function reviewSortValue(review) {
  const remoteData = review.remote?.data || review.diff.identity?.remote || {};
  if (review.entity === 'pet') {
    return `${remoteData.pet_id || ''}-${remoteData.uid || review.folderId}`;
  }
  if (review.entity === 'skill') {
    return `${remoteData.source_id || ''}-${remoteData.uid || review.folderId}`;
  }
  return remoteData.name || review.folderId;
}

function loadReviewEntry(entity, folderId) {
  const folder = entityFolder(entity, folderId);
  const diff = readJson(path.join(folder, 'diff.json'));
  const plan = readJson(path.join(folder, 'import.json'));
  if (!diff || !plan || diff.entity !== entity) return null;
  return { entity, folderId, diff, plan };
}

function listReviewEntries(entity) {
  const cacheKey = `${currentStageRoot()}::${entity}`;
  const cached = reviewEntryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.entries;
  const root = entityRoot(entity);
  if (!fs.existsSync(root)) return [];
  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
  const entries = fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => loadReviewEntry(entity, entry.name))
    .filter(Boolean)
    .sort((left, right) => collator.compare(reviewSortValue(left), reviewSortValue(right)));
  reviewEntryCache.set(cacheKey, {
    entries,
    expiresAt: Date.now() + REVIEW_ENTRY_CACHE_TTL_MS,
  });
  return entries;
}

function invalidateReviewEntries(entity) {
  reviewEntryCache.delete(`${currentStageRoot()}::${entity}`);
}

function updateCachedReviewPlan(entity, folderId, plan) {
  const cacheKey = `${currentStageRoot()}::${entity}`;
  const cached = reviewEntryCache.get(cacheKey);
  if (!cached) return;
  const entry = cached.entries.find(item => item.folderId === folderId);
  if (entry) entry.plan = plan;
}

function reviewCounts(reviews) {
  return reviews.reduce((counts, review) => {
    const identity = review.diff.identity?.status || 'unknown';
    const decision = reviewDecision(review);
    counts.total += 1;
    counts[identity] = (counts[identity] || 0) + 1;
    if (needsReview(review)) counts.pending += 1;
    if (decision === 'ignored') counts.ignored += 1;
    if (decision.startsWith('approved') || review.plan.enabled) counts.approved += 1;
    if (review.diff.summary?.has_changes) counts.changed += 1;
    counts[reviewBucket(review)] += 1;
    return counts;
  }, {
    total: 0, pending: 0, approved: 0, ignored: 0, changed: 0,
    differences: 0, confirmed: 0, unchanged: 0,
  });
}

function normalizeReviewView(value) {
  return REVIEW_VIEWS.has(value) ? value : 'differences';
}

function normalizeReviewEntity(value) {
  return REVIEW_STAGES.some(stage => stage.entity === value) ? value : REVIEW_STAGES[0].entity;
}

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function buildStages({
  view = 'differences',
  entity = REVIEW_STAGES[0].entity,
  page = 1,
  pageSize = DEFAULT_REVIEW_PAGE_SIZE,
  includeReviews = true,
} = {}) {
  const selectedView = normalizeReviewView(view);
  const selectedEntity = normalizeReviewEntity(entity);
  const requestedPage = positiveInteger(page, 1);
  const selectedPageSize = positiveInteger(pageSize, DEFAULT_REVIEW_PAGE_SIZE, MAX_REVIEW_PAGE_SIZE);
  let blockedBy = null;
  return REVIEW_STAGES.map((config, index) => {
    const entries = listReviewEntries(config.entity);
    const counts = reviewCounts(entries);
    const filteredEntries = config.entity === selectedEntity
      ? entries.filter(review => reviewBucket(review) === selectedView)
      : [];
    const totalPages = filteredEntries.length === 0
      ? 0
      : Math.ceil(filteredEntries.length / selectedPageSize);
    const selectedPage = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
    const offset = (selectedPage - 1) * selectedPageSize;
    const locked = blockedBy !== null;
    const selector = config.entity === selectedEntity
      ? filteredEntries.map((review, index) => {
        const remote = review.diff.identity?.remote || {};
        const data = review.plan.data || {};
        const name = data.name || remote.name || review.folderId;
        const uid = remote.uid || review.plan.id || review.folderId;
        const petId = data.pet_id || remote.pet_id;
        return {
          folderId: review.folderId,
          page: Math.floor(index / selectedPageSize) + 1,
          label: config.entity === 'pet' && petId
            ? 'No.' + petId + ' ' + name + ' · ' + uid
            : name + ' · ' + uid,
          name,
          uid,
          petId: petId || null,
        };
      })
      : [];
    const stage = {
      ...config,
      order: index + 1,
      locked,
      blockedBy,
      counts,
      pagination: config.entity === selectedEntity
        ? { page: selectedPage, pageSize: selectedPageSize, total: filteredEntries.length, totalPages }
        : null,
      selector,
      reviews: includeReviews && config.entity === selectedEntity && !locked
        ? filteredEntries.slice(offset, offset + selectedPageSize)
          .map(review => loadReview(config.entity, review.folderId))
          .filter(Boolean)
        : [],
    };
    if (blockedBy === null && counts.pending > 0) blockedBy = config.label;
    return stage;
  });
}

function assertStageUnlocked(entity) {
  const stage = buildStages({ entity, includeReviews: false }).find(item => item.entity === entity);
  if (!stage) throw new Error('未知审核类型');
  if (stage.locked) throw new Error(`请先完成“${stage.blockedBy}” Tab 的待审核项`);
}

function clearPlanFields(plan, entity) {
  plan.fields = entity === 'pet'
    ? { pet: [], detail: [], replace_skill_sets: false }
    : [];
}

function setPlanFields(plan, entity, fields) {
  plan.fields = entity === 'pet'
    ? { pet: fields, detail: [], replace_skill_sets: false }
    : fields;
}

function assertAllowedImageUrl(rawUrl) {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();
  const allowed = url.protocol === 'https:' && ALLOWED_IMAGE_HOST_SUFFIXES.some(
    suffix => hostname === suffix.slice(1) || hostname.endsWith(suffix),
  );
  if (!allowed) throw new Error('素材地址不在允许的 BWIKI/CDN 域名范围内');
  return url;
}

function extensionFor(contentType, url) {
  const byType = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }[contentType];
  if (byType) return byType;
  const ext = path.extname(url.pathname).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext) ? ext : '.png';
}

function updateManifestImageCount() {
  const manifestPath = path.join(currentStageRoot(), 'manifest.json');
  const manifest = readJson(manifestPath);
  if (!manifest) return;
  let downloaded = 0;
  for (const { entity } of REVIEW_STAGES) {
    const root = entityRoot(entity);
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const folder = path.join(root, entry.name);
      const remote = readJson(path.join(folder, 'remote.json'), {});
      const assets = publishableDownloadedAssets(entity, remote, readJson(path.join(folder, 'assets.json'), {}));
      downloaded += Object.values(assets).filter(asset => asset?.status?.startsWith('downloaded-after-')).length;
    }
  }
  manifest.images_downloaded = downloaded;
  manifest.image_download_policy = 'confirmed-pet-differences-and-new-entities-only';
  writeJsonAtomic(manifestPath, manifest);
}

async function downloadAsset(folder, assetKey, rawUrl) {
  const sourceUrl = assertAllowedImageUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let response;
  try {
    response = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'RocoTools-WikiReview/1.0' },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`${assetKey} 下载失败：HTTP ${response.status}`);
  assertAllowedImageUrl(response.url);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') {
    throw new Error(`${assetKey} 响应类型不受支持：${contentType || 'unknown'}`);
  }
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error(`${assetKey} 超过 5MB 限制`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) throw new Error(`${assetKey} 为空或超过 5MB 限制`);

  const imagesDir = path.join(folder, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  const extension = extensionFor(contentType, new URL(response.url));
  const fileName = `${assetKey}${extension}`;
  const targetPath = path.join(imagesDir, fileName);
  const tempPath = `${targetPath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, buffer);
  fs.renameSync(tempPath, targetPath);

  return {
    status: 'downloaded-after-diff-confirmation',
    remote_url: rawUrl,
    resolved_url: response.url,
    local_file: `images/${fileName}`,
    content_type: contentType,
    bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    downloaded_at: new Date().toISOString(),
  };
}

async function downloadConfirmedAssets(entity, folder, remote) {
  const keys = ENTITY_ASSET_KEYS[entity] || [];
  const sources = keys
    .map(key => [key, remote.assets?.[key]?.remote_url])
    .filter(([, rawUrl]) => Boolean(rawUrl));
  if (entity === 'skill' && sources.length === 0) {
    throw new Error('该候选没有图标源地址，请重新抓取技能列表后再确认');
  }
  const assets = {};
  for (const [key, rawUrl] of sources) {
    assets[key] = await downloadAsset(folder, key, rawUrl);
  }
  writeJsonAtomic(path.join(folder, 'assets.json'), assets);
  if (entity === 'skill' && assets.icon) writeJsonAtomic(path.join(folder, 'image.json'), assets.icon);
  updateManifestImageCount();
  return assets;
}

function normalizeName(value) {
  return String(value || '').replace(/\s+/g, '').toLocaleLowerCase('zh-CN');
}

function normalizeWikiUrl(rawUrl) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith('//')) return `https:${rawUrl}`;
  return new URL(rawUrl, 'https://wiki.biligame.com').toString();
}

function explicitDetailDelay() {
  const delay = 2000 + Math.random() * 2000;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function petImageHint($, element) {
  const image = $(element);
  const container = image.closest('li, [data-type], [data-tab], [data-key], [role="tabpanel"], .tab-pane, .swiper-slide');
  return [
    image.attr('alt'),
    image.attr('title'),
    image.attr('class'),
    image.attr('data-type'),
    image.attr('data-tab'),
    image.attr('data-key'),
    image.attr('data-src'),
    image.attr('src'),
    container.attr('data-type'),
    container.attr('data-tab'),
    container.attr('data-key'),
    container.attr('aria-label'),
    container.text(),
  ].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN');
}

function decodedPetImageHint(hint) {
  try {
    return decodeURIComponent(String(hint || '')).toLocaleLowerCase('zh-CN');
  } catch {
    return String(hint || '').toLocaleLowerCase('zh-CN');
  }
}

function isPetUiControlHint(hint) {
  return /界面[\s_-]*宠物[\s_-]*(本体|宠物蛋|果实)|icon[\s_-]*异色/.test(decodedPetImageHint(hint));
}

function classifyPetImageSlot(hint) {
  if (/果实|fruit/.test(hint)) return 'image_fruit';
  if (/精灵蛋|宠物蛋|蛋图|egg/.test(hint)) return 'image_egg';
  if (/异色|闪光|shiny|(^|[\/_.-])yise([\/_.-]|$)/.test(hint)) return 'image_shiny';
  if (/本体|立绘|原图|default|(^|[\/_.-])jl([\/_.-]|$)/.test(hint)) return 'image_default';
  return null;
}

function petAssetSlotCompatible(key, metadata) {
  const hint = decodedPetImageHint([
    metadata?.remote_url,
    metadata?.resolved_url,
  ].filter(Boolean).join(' '));
  if (isPetUiControlHint(hint)) return false;
  const inferred = classifyPetImageSlot(hint);
  return !inferred || inferred === key;
}

function quarantineMisclassifiedPetAssets(assets) {
  const next = { ...(assets || {}) };
  for (const key of ENTITY_ASSET_KEYS.pet) {
    const metadata = next[key];
    if (!metadata || petAssetSlotCompatible(key, metadata)) continue;
    next[key] = {
      ...metadata,
      status: 'quarantined-misclassified',
      classified_as: classifyPetImageSlot([metadata.remote_url, metadata.resolved_url].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN')),
    };
  }
  return next;
}

function extractPetDetailAssets($) {
  const assets = {};
  const section = $('.allImgTab').first();
  // `.imgAll-sprite-img` is only used by some single-image tabs (often fruit).
  // Restricting the scan to that class hides the sibling base/shiny/egg images.
  let elements = section.find('img').toArray();
  if (!elements.length) elements = $('main img, #mw-content-text img, .mw-parser-output img').toArray();
  elements = elements.filter(element => !isPetUiControlHint(petImageHint($, element)) && !/按钮|icon-nav|\btab\b/.test(decodedPetImageHint(petImageHint($, element))));
  if (!elements.length) {
    elements = $('.rocom_sprite_grament_img li img').toArray();
  }
  const unresolved = [];
  for (const element of elements) {
    const image = $(element);
    const rawUrl = image.attr('data-src') || image.attr('src') || '';
    const url = normalizeWikiUrl(rawUrl);
    if (!url) continue;
    const slot = classifyPetImageSlot(decodedPetImageHint(petImageHint($, element)));
    if (slot && !assets[slot]) assets[slot] = url;
    else if (!slot) unresolved.push(url);
  }
  if (!assets.image_default && unresolved.length) assets.image_default = unresolved[0];
  return assets;
}

function skillStageRoots() {
  const roots = new Set([entityRoot('skill'), path.join(DEFAULT_STAGE_ROOT, 'skills')]);
  const batchesRoot = path.join(DEFAULT_STAGE_ROOT, 'batches');
  if (fs.existsSync(batchesRoot)) {
    for (const entry of fs.readdirSync(batchesRoot, { withFileTypes: true }).sort((a, b) => b.name.localeCompare(a.name))) {
      if (entry.isDirectory()) roots.add(path.join(batchesRoot, entry.name, 'skills'));
    }
  }
  return [...roots].filter(root => fs.existsSync(root));
}

function normalizeSkillName(value) {
  return String(value || '').normalize('NFKC').replace(/[\s???]/g, '').trim();
}

function enrichPetSkills(detail) {
  const catalog = new Map();
  try {
    const rows = getDb().prepare(
      'SELECT s.uid, s.name, s.category, s.cost, s.power, s.description, s.icon_url, e.name AS element_name, e.icon AS element_icon FROM skills s LEFT JOIN elements e ON e.id = s.element_id',
    ).all();
    for (const row of rows) catalog.set(normalizeSkillName(row.name), { ...row, source: 'local-skill-list' });
  } catch (error) {
    console.warn('[wiki-review] unable to load local skill catalog:', error.message);
  }
  for (const stagedRoot of skillStageRoots()) {
    for (const entry of fs.readdirSync(stagedRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const remote = readJson(path.join(stagedRoot, entry.name, 'remote.json'));
      const data = remote?.data;
      const key = normalizeSkillName(data?.name);
      if (!key || catalog.has(key)) continue;
      catalog.set(key, {
        uid: data.uid || remote.id || null,
        name: data.name,
        category: data.category || null,
        cost: data.cost ?? null,
        power: data.power ?? null,
        description: data.description || null,
        icon_url: remote.assets?.icon?.remote_url || null,
        element_name: data.element || null,
        element_icon: null,
        source: 'skill-review-staging',
      });
    }
  }
  const enrich = skill => {
    const found = catalog.get(normalizeSkillName(skill.name));
    if (!found) return { ...skill, skill_ref_uid: null, skill_icon: null, _catalog_source: 'wiki-detail' };
    return {
      ...skill,
      skill_ref_uid: found.uid || null,
      skill_icon: found.icon_url || (found.uid ? '/public/skills/icons/' + found.uid + '.png' : null),
      element: found.element_name || skill.element || null,
      category: found.category || skill.category || null,
      cost: found.cost ?? skill.cost ?? null,
      power: found.power ?? skill.power ?? null,
      description: found.description || skill.description || null,
      element_icon: found.element_icon || null,
      _catalog_source: found.source,
    };
  };
  return {
    ...detail,
    skills: (detail.skills || []).map(enrich),
    bloodline_skills: (detail.bloodline_skills || []).map(enrich),
    learnable_stones: (detail.learnable_stones || []).map(enrich),
  };
}

async function fetchPetDetail(pet) {
  await explicitDetailDelay();
  const params = new URLSearchParams({
    action: 'parse',
    page: pet.name,
    prop: 'text',
    format: 'json',
    utf8: '1',
  });
  const response = await fetch(`${BWIKI_API_URL}?${params}`, {
    headers: {
      'User-Agent': BWIKI_USER_AGENT,
      'Referer': BWIKI_REFERER,
      'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.5',
      'Accept-Language': BWIKI_ACCEPT_LANGUAGE,
      'Cache-Control': 'no-cache',
    },
  });
  if ([403, 429, 567].includes(response.status)) throw new Error('BWIKI 请求受限，已停止获取关联精灵详情');
  if (!response.ok) throw new Error(`关联精灵详情请求失败：HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`BWIKI API：${payload.error.info || '未知错误'}`);
  const html = payload.parse?.text?.['*'];
  if (!html) throw new Error('关联精灵详情没有返回 HTML');

  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const abilityName = $('.sprite-trait-name').first().text().trim()
    || $('.rocom_sprite_info_characteristic_content_name').first().text().trim();
  const description = $('.sprite-trait-desc').first().text().trim()
    || $('.rocom_sprite_info_characteristic_content_desc').first().text().trim();
  const iconElement = $('.sprite-trait-icon img').first().length
    ? $('.sprite-trait-icon img').first()
    : $('.rocom_sprite_info_characteristic_content_icon img').first();
  const iconUrl = normalizeWikiUrl(iconElement.attr('data-src') || iconElement.attr('src') || '');
  const assets = { ability_icon: iconUrl, ...extractPetDetailAssets($) };
  const { parseDetail } = require('./crawl');
  const parsed = parseDetail(html, cheerio) || {};
  const pageText = $.root().text().replace(/\s+/g, '');
  const eggGroups = getDb().prepare('SELECT id, name FROM egg_groups').all()
    .filter(group => group.name && pageText.includes(String(group.name).replace(/\s+/g, '')))
    .map(group => ({ id: group.id, name: group.name }));
  const detail = {
    height: parsed.height || null,
    weight: parsed.weight || null,
    stats: {
      hp: parsed.hp ?? null,
      atk: parsed.atk ?? null,
      matk: parsed.matk ?? null,
      def: parsed.def ?? null,
      mdef: parsed.mdef ?? null,
      speed: parsed.speed ?? null,
      total: parsed.total ?? ([parsed.hp, parsed.atk, parsed.matk, parsed.def, parsed.mdef, parsed.speed].some(value => value != null)
        ? [parsed.hp, parsed.atk, parsed.matk, parsed.def, parsed.mdef, parsed.speed].reduce((sum, value) => sum + (Number(value) || 0), 0)
        : null),
    },
    skills: parsed.skills || [],
    bloodline_skills: parsed.bloodline_skills || [],
    learnable_stones: parsed.learnable_stones || [],
    egg_groups: eggGroups,
  };
  return { abilityName, description, iconUrl, assets, detail: enrichPetSkills(detail) };
}
function abilityFolderId(name) {
  return `ability_${crypto.createHash('sha1').update(name, 'utf8').digest('hex').slice(0, 10)}`;
}

function reuseConfirmedAbilityIcon(review, petFolder, savedAssets) {
  const abilityName = review.remote?.data?.ability_name;
  if (!abilityName || review.local?.data?.ability_icon || savedAssets.ability_icon) return savedAssets;
  const abilityFolder = path.join(currentStageRoot(), 'abilities', abilityFolderId(abilityName));
  const abilityAssets = readJson(path.join(abilityFolder, 'assets.json'), {}) || {};
  const icon = abilityAssets.icon;
  if (!icon?.local_file) return savedAssets;
  const source = path.resolve(abilityFolder, icon.local_file);
  if (!source.startsWith(`${path.resolve(abilityFolder)}${path.sep}`) || !fs.existsSync(source)) return savedAssets;
  const extension = path.extname(source) || '.png';
  const imagesDir = path.join(petFolder, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  const target = path.join(imagesDir, `ability_icon${extension}`);
  fs.copyFileSync(source, target);
  return {
    ...savedAssets,
    ability_icon: {
      ...icon,
      status: 'downloaded-after-ability-confirmation',
      local_file: `images/ability_icon${extension}`,
      reused_from: `abilities/${abilityFolderId(abilityName)}/${icon.local_file}`,
    },
  };
}

async function hydratePetAssets(review, { ignoreLocalAssets = false } = {}) {
  const folder = entityFolder('pet', review.folderId);
  let savedAssets = quarantineMisclassifiedPetAssets(readJson(path.join(folder, 'assets.json'), {}) || {});
  savedAssets = reuseConfirmedAbilityIcon(review, folder, savedAssets);
  const keys = ENTITY_ASSET_KEYS.pet;
  const missing = keys.filter(key => (ignoreLocalAssets || !review.local?.data?.[key]) && (!savedAssets[key]?.local_file || !petAssetSlotCompatible(key, savedAssets[key])));
  // A confirmation/backfill action explicitly refreshes the detail page, even when all images already exist.

  const pet = { uid: review.remote?.data?.uid || review.folderId, name: review.remote?.data?.name };
  if (!pet.name) throw new Error('当前精灵没有名称，无法获取详情素材');
  const detail = await fetchPetDetail(pet);
  const remoteAssets = { ...(review.remote.assets || {}) };
  for (const key of missing) {
    const rawUrl = detail.assets?.[key];
    if (!rawUrl) continue;
    remoteAssets[key] = { remote_url: rawUrl };
    savedAssets[key] = await downloadAsset(folder, key, rawUrl);
  }
  const enhancedRemote = {
    ...review.remote,
    assets: remoteAssets,
    detail: detail.detail,
    detail_source: {
      pet,
      source_url: 'https://wiki.biligame.com/rocom/' + encodeURIComponent(pet.name),
      fetched_at: new Date().toISOString(),
    },
  };
  review.plan.detail = detail.detail;
  writeJsonAtomic(path.join(folder, 'remote.json'), enhancedRemote);
  writeJsonAtomic(path.join(folder, 'import.json'), review.plan);
  writeJsonAtomic(path.join(folder, 'assets.json'), savedAssets);
  return savedAssets;
}

function updateAbilityDiffAfterDetail(review, description, sourcePet) {
  const diff = { ...(review.diff || {}), fields: { ...(review.diff?.fields || {}) } };
  if (review.diff.identity?.safe_to_compare) {
    const localDescription = review.local?.data?.description;
    const same = typeof localDescription === 'string' && localDescription.trim() === description;
    diff.fields.description = {
      status: same ? 'same' : 'changed',
      local: localDescription,
      remote: description,
      source_pet: sourcePet,
    };
    diff.summary = {
      ...(diff.summary || {}),
      same: same ? 1 : 0,
      changed: same ? 0 : 1,
      'remote-only': 0,
      'local-only': 0,
      has_changes: !same,
    };
  }
  return diff;
}

function propagateNewAbilityDescription(remote, description) {
  for (const pet of remote.data?.pet_refs || []) {
    const folder = path.join(currentStageRoot(), 'pets', pet.uid);
    const petRemotePath = path.join(folder, 'remote.json');
    const petPlanPath = path.join(folder, 'import.json');
    const petRemote = readJson(petRemotePath);
    const petPlan = readJson(petPlanPath);
    if (!petRemote || !petPlan || petPlan.identity?.status !== 'unmatched') continue;
    if (normalizeName(petRemote.data?.ability_name) !== normalizeName(remote.data?.name)) continue;
    petRemote.data.ability_desc = description;
    petPlan.data.ability_desc = description;
    writeJsonAtomic(petRemotePath, petRemote);
    writeJsonAtomic(petPlanPath, petPlan);
  }
}

async function hydrateAbilityReview(review) {
  const folder = entityFolder('ability', review.folderId);
  const remote = enrichAbilityRemote(review.remote);
  const sourcePet = remote.data?.representative_pet || remote.data?.pet_refs?.[0];
  if (!sourcePet?.name) throw new Error('该特性没有可用的关联精灵，无法获取详情');

  const detail = await fetchPetDetail(sourcePet);
  if (normalizeName(detail.abilityName) !== normalizeName(remote.data?.name)) {
    throw new Error(`关联精灵“${sourcePet.name}”详情中的特性是“${detail.abilityName || '未知'}”，与当前候选不一致`);
  }
  if (!detail.description) throw new Error(`关联精灵“${sourcePet.name}”详情中没有特性描述`);
  if (!detail.iconUrl) throw new Error(`关联精灵“${sourcePet.name}”详情中没有正式特性图标`);

  const icon = await downloadAsset(folder, 'icon', detail.iconUrl);
  const assets = {
    ...(readJson(path.join(folder, 'assets.json'), {}) || {}),
    icon,
  };
  writeJsonAtomic(path.join(folder, 'assets.json'), assets);

  const enhancedRemote = {
    ...remote,
    data: {
      ...(remote.data || {}),
      description: detail.description,
      source_pet: sourcePet,
    },
    assets: {
      ...(remote.assets || {}),
      icon: { remote_url: detail.iconUrl },
    },
    detail_source: {
      pet: sourcePet,
      source_url: `https://wiki.biligame.com/rocom/${encodeURIComponent(sourcePet.name)}`,
      fetched_at: new Date().toISOString(),
    },
  };
  const diff = updateAbilityDiffAfterDetail(review, detail.description, sourcePet);
  writeJsonAtomic(path.join(folder, 'remote.json'), enhancedRemote);
  writeJsonAtomic(path.join(folder, 'diff.json'), diff);
  updateManifestImageCount();
  return { remote: enhancedRemote, diff, assets, sourcePet };
}

router.get('/wiki-review', (req, res) => {
  try {
    const view = normalizeReviewView(req.query.view);
    const entity = normalizeReviewEntity(req.query.entity);
    const page = positiveInteger(req.query.page, 1);
    const pageSize = positiveInteger(req.query.pageSize, DEFAULT_REVIEW_PAGE_SIZE, MAX_REVIEW_PAGE_SIZE);
    if (req.query.refresh === '1') {
      REVIEW_STAGES.forEach(stage => invalidateReviewEntries(stage.entity));
    }
    res.json({
      order: REVIEW_STAGES.map(item => item.entity),
      view,
      entity,
      stages: buildStages({ view, entity, page, pageSize }),
      batchId: path.basename(currentStageRoot()),
      stageRoot: currentStageRoot(),
    });
  } catch (error) {
    console.error('[wiki-review] list failed:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/wiki-review/:entity/:folderId/assets/:assetKey', (req, res) => {
  try {
    const { entity, folderId, assetKey } = req.params;
    stageConfig(entity);
    if (!(ENTITY_ASSET_KEYS[entity] || []).includes(assetKey)) {
      return res.status(404).json({ error: '暂存图片不存在'});
    }
    const folder = entityFolder(entity, folderId);
    const assets = readJson(path.join(folder, 'assets.json'), entity === 'skill'
      ? { icon: readJson(path.join(folder, 'image.json')) }
      : {});
    const metadata = assets[assetKey];
    if (!metadata?.local_file || !/^images\/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/i.test(metadata.local_file)) {
      return res.status(404).json({ error: '暂存图片尚未下载' });
    }
    const filePath = path.resolve(folder, metadata.local_file);
    const imagesRoot = path.resolve(folder, 'images');
    if (!filePath.startsWith(`${imagesRoot}${path.sep}`) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: '暂存图片文件不存在'});
    }
    res.type(metadata.content_type || path.extname(filePath));
    return res.sendFile(filePath);
  } catch (error) {
    console.error('[wiki-review] asset failed:', error);
    return res.status(400).json({ error: error.message });
  }
});

router.post('/wiki-review/:entity/:folderId/decision', async (req, res) => {
  try {
    const { entity, folderId } = req.params;
    stageConfig(entity);
    assertStageUnlocked(entity);
    const review = loadReview(entity, folderId);
    if (!review) return res.status(404).json({ error: '暂存候选不存在' });

    const decision = req.body?.decision;
    const planPath = path.join(entityFolder(entity, folderId), 'import.json');
    const identityStatus = review.diff.identity?.status;
    const decidedAt = new Date().toISOString();

    if (decision === 'associate-local-pet') {
      if (entity !== 'pet' || !['unmatched', 'ambiguous', 'name-match-id-different', 'id-match-name-different'].includes(identityStatus) || isResolved(review)) {
        return res.status(400).json({ error: '只允许为待审核精灵重新关联本地精灵' });
      }
      const localUid = String(req.body?.local_uid || '').trim();
      const localData = localPetSnapshot(localUid);
      if (!localData) return res.status(400).json({ error: '本地精灵不存在或 UID 无效' });
      const folder = entityFolder(entity, folderId);
      const remoteData = review.remote.data || {};
      const identity = associatePetIdentity(remoteData, localData);
      const localDocument = {
        schema_version: 1, entity: 'pet', id: localUid, captured_at: decidedAt,
        exists: true, data: localData, manual_edit: {}, identity,
      };
      const diff = buildAssociatedPetDiff(remoteData, localData, identity, review.diff.id || folderId);
      review.plan = {
        ...review.plan,
        id: localUid,
        identity,
        identity_confirmed: true,
        enabled: false,
        uid_migration: null,
        fields: [],
        review: { decision: 'pending', associated_local_pet: { uid: localUid, name: localData.name, at: decidedAt } },
      };
      writeJsonAtomic(path.join(folder, 'local.json'), localDocument);
      writeJsonAtomic(path.join(folder, 'diff.json'), diff);
      writeJsonAtomic(planPath, review.plan);
      invalidateReviewEntries(entity);
      return res.json({ success: true, local_pet: { uid: localUid, name: localData.name } });
    }
    if (decision === 'approve-new-form') {
      const remoteUid = String(review.remote?.data?.uid || review.diff.identity?.remote?.uid || '').trim();
      const localUid = String(review.local?.data?.uid || review.diff.identity?.local?.uid || '').trim();
      if (entity !== 'pet' || !['name-match-id-different', 'id-match-name-different'].includes(identityStatus) || review.plan.uid_migration || isResolved(review) || !remoteUid || !localUid || remoteUid === localUid) {
        return res.status(400).json({ error: '当前候选不能作为独立新形态新增' });
      }
      if (localPetSnapshot(remoteUid)) return res.status(400).json({ error: '远程 UID ' + remoteUid + ' 已存在，不能重复新增' });
      review.plan.id = remoteUid;
      review.plan.identity_confirmed = true;
      review.plan.uid_migration = null;
      const assets = await hydratePetAssets(review, { ignoreLocalAssets: true });
      review.plan.enabled = true;
      setPlanFields(review.plan, entity, PET_NEW_FIELDS);
      review.plan.assets = assets;
      review.plan.review = { decision: 'approved-new', decided_at: decidedAt, identity_resolution: 'create-new-form', compared_local_uid: localUid, remote_uid: remoteUid };
      writeJsonAtomic(planPath, review.plan);
      updateCachedReviewPlan(entity, folderId, review.plan);
      return res.json({ success: true });
    }
    if (decision === 'approve-new') {
      if (identityStatus !== 'unmatched') {
        return res.status(400).json({ error: '只有 unmatched 候选可以确认为新增' });
      }
      review.plan.identity_confirmed = true;
      if (entity === 'ability') {
        const hydrated = await hydrateAbilityReview(review);
        review.plan = {
          ...review.plan,
          data: hydrated.remote.data,
          assets: hydrated.assets,
          enabled: false,
          fields: [],
          review: {
            decision: 'approved-reference',
            decided_at: decidedAt,
            source_pet: hydrated.sourcePet,
            note: '已从关联精灵详情获取正式图标和描述；特性随关联精灵基础数据导入',
          },
        };
        propagateNewAbilityDescription(hydrated.remote, hydrated.remote.data.description);
        writeJsonAtomic(planPath, review.plan);
        invalidateReviewEntries(entity);
        return res.json({ success: true });
      }
      const assets = entity === 'pet' ? await hydratePetAssets(review) : await downloadConfirmedAssets(entity, entityFolder(entity, folderId), review.remote);
      if (entity === 'skill') {
        review.plan.enabled = true;
        setPlanFields(review.plan, entity, ENTITY_FIELDS.skill);
        review.plan.assets = assets;
        review.plan.review = { decision: 'approved-new', decided_at: decidedAt };
      } else if (entity === 'pet') {
        review.plan.enabled = true;
        setPlanFields(review.plan, entity, PET_NEW_FIELDS);
        review.plan.assets = assets;
        review.plan.review = { decision: 'approved-new', decided_at: decidedAt };
      } else {
        review.plan.enabled = false;
        clearPlanFields(review.plan, entity);
        review.plan.assets = assets;
        review.plan.review = {
          decision: 'approved-reference',
          decided_at: decidedAt,
          note: '特性无独立数据表，将随关联精灵的基础字段导入',
        };
      }
      writeJsonAtomic(planPath, review.plan);
      updateCachedReviewPlan(entity, folderId, review.plan);
      return res.json({ success: true });
    }

    if (decision === 'backfill-pet-assets') {
      if (entity !== 'pet' || !isResolved(review)) {
        return res.status(400).json({ error: '只有已确认精灵可以补全缺失图片'});
      }
      const assets = await hydratePetAssets(review);
      review.plan.assets = assets;
      review.plan.review = {
        ...(review.plan.review || {}),
        assets_completed_at: new Date().toISOString(),
      };
      writeJsonAtomic(planPath, review.plan);
      invalidateReviewEntries(entity);
      return res.json({ success: true });
    }

    if (decision === 'approve-pet-assets-only') {
      if (entity !== 'pet'
          || !['matched', 'name-match-id-different', 'id-match-name-different'].includes(identityStatus)
          || hasAllowedChanges(review)
          || review.plan.uid_migration) {
        return res.status(400).json({ error: '只有基础字段无差异的已匹配精灵可以只拉取缺失图片' });
      }
      const assets = await hydratePetAssets(review);
      review.plan.enabled = false;
      review.plan.identity_confirmed = true;
      clearPlanFields(review.plan, entity);
      review.plan.assets = assets;
      review.plan.review = {
        decision: 'approved-reference',
        decided_at: decidedAt,
        assets_completed_at: decidedAt,
        note: '基础字段无变化；仅补全本地缺失的正式图片',
      };
      writeJsonAtomic(planPath, review.plan);
      invalidateReviewEntries(entity);
      return res.json({ success: true });
    }

    if (decision === 'approve-uid-migration') {
      const migration = review.plan.uid_migration;
      if (entity !== 'pet'
          || identityStatus !== 'name-match-id-different'
          || !migration?.from
          || !migration?.to
          || migration.to !== review.plan.id
          || hasAllowedChanges(review)) {
        return res.status(400).json({ error: '当前候选不能单独确认 UID 更新' });
      }
      review.plan.enabled = true;
      review.plan.identity_confirmed = true;
      clearPlanFields(review.plan, entity);
      review.plan.review = {
        decision: 'approved-uid-migration',
        decided_at: decidedAt,
        note: `UID 更新：${migration.from} -> ${migration.to}`,
      };
      writeJsonAtomic(planPath, review.plan);
      updateCachedReviewPlan(entity, folderId, review.plan);
      return res.json({ success: true });
    }

    if (decision === 'confirm-ability-detail') {
      if (entity !== 'ability' || identityStatus !== 'matched'
          || review.diff.fields?.description?.reason !== 'local-description-missing') {
        return res.status(400).json({ error: '当前候选不能执行特性详情确认'});
      }
      const hydrated = await hydrateAbilityReview(review);
      review.plan = {
        ...review.plan,
        data: hydrated.remote.data,
        assets: hydrated.assets,
        enabled: true,
        identity_confirmed: true,
        fields: ['description'],
        review: {
          decision: 'approved-fields',
          decided_at: decidedAt,
          source_pet: hydrated.sourcePet,
          note: '已从关联精灵详情获取正式图标和描述',
        },
      };
      writeJsonAtomic(planPath, review.plan);
      invalidateReviewEntries(entity);
      return res.json({ success: true });
    }

    if (decision === 'accept-fields') {
      if (!['matched', 'name-match-id-different', 'id-match-name-different'].includes(identityStatus)) {
        return res.status(400).json({ error: '当前身份状态不能接受字段更新'});
      }
      if (entity === 'pet' && ['name-match-id-different', 'id-match-name-different'].includes(identityStatus) && !review.plan.uid_migration && req.body?.identity_resolution !== 'update-existing') {
        return res.status(400).json({ error: '请先明确选择更新现有精灵或作为新形态新增' });
      }
      const requestedFields = Array.isArray(req.body?.fields) ? req.body.fields : [];
      const allowedFields = ENTITY_FIELDS[entity];
      const fields = [...new Set(requestedFields)].filter(
        field => allowedFields.includes(field)
          && review.diff.fields?.[field]?.selectable !== false,
      );
      if (fields.length === 0) return res.status(400).json({ error: '至少选择一个允许字段'});
      if (entity === 'pet') {
        if (req.body?.identity_resolution === 'update-existing') {
          review.plan.id = review.local?.data?.uid || review.diff.identity?.local?.uid || review.plan.id;
        }
        const assets = await hydratePetAssets(review);
        review.plan.assets = assets;
      }
      review.plan.enabled = true;
      review.plan.identity_confirmed = true;
      setPlanFields(review.plan, entity, fields);
      review.plan.review = {
        decision: 'approved-fields',
        decided_at: decidedAt,
        ...(req.body?.identity_resolution === 'update-existing' ? {
          identity_resolution: 'update-existing',
          local_uid: review.local?.data?.uid || review.diff.identity?.local?.uid || review.plan.id,
          remote_uid: review.remote?.data?.uid || review.diff.identity?.remote?.uid || null,
        } : {}),
      };
      writeJsonAtomic(planPath, review.plan);
      updateCachedReviewPlan(entity, folderId, review.plan);
      return res.json({ success: true });
    }

    if (decision === 'approve-no-change') {
      if (hasAllowedChanges(review) || review.plan.uid_migration) {
        return res.status(400).json({ error: '该候选仍有字段差异，不能标记为无变化' });
      }
      if (entity === 'pet' && ['name-match-id-different', 'id-match-name-different'].includes(identityStatus) && req.body?.identity_resolution !== 'update-existing') {
        return res.status(400).json({ error: '请先明确选择更新现有精灵或作为新形态新增' });
      }
      if (entity === 'pet' && req.body?.identity_resolution === 'update-existing') {
        review.plan.id = review.local?.data?.uid || review.diff.identity?.local?.uid || review.plan.id;
      }
      review.plan.enabled = false;
      review.plan.identity_confirmed = ['matched', 'name-match-id-different', 'id-match-name-different'].includes(identityStatus);
      clearPlanFields(review.plan, entity);
      review.plan.review = {
        decision: 'approved-no-change',
        decided_at: decidedAt,
        ...(req.body?.identity_resolution === 'update-existing' ? {
          identity_resolution: 'update-existing',
          local_uid: review.local?.data?.uid || review.diff.identity?.local?.uid || review.plan.id,
          remote_uid: review.remote?.data?.uid || review.diff.identity?.remote?.uid || null,
        } : {}),
      };
      writeJsonAtomic(planPath, review.plan);
      updateCachedReviewPlan(entity, folderId, review.plan);
      return res.json({ success: true });
    }

    if (decision === 'ignore' || decision === 'pending') {
      review.plan.enabled = false;
      review.plan.identity_confirmed = false;
      clearPlanFields(review.plan, entity);
      review.plan.review = { decision: decision === 'ignore' ? 'ignored' : 'pending', decided_at: decidedAt };
      writeJsonAtomic(planPath, review.plan);
      updateCachedReviewPlan(entity, folderId, review.plan);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: '未知审核决定' });
  } catch (error) {
    console.error('[wiki-review] decision failed:', error);
    const status = error.name === 'AbortError' ? 504 : 400;
    res.status(status).json({ error: error.name === 'AbortError' ? '图片下载超时' : error.message });
  }
});

module.exports = router;
