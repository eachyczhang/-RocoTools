const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { AsyncLocalStorage } = require('async_hooks');

const router = express.Router();
const context = new AsyncLocalStorage();
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_STAGE_ROOT = path.join(REPO_ROOT, 'data', 'wiki-staging');
const BATCHES_ROOT = path.join(DEFAULT_STAGE_ROOT, 'batches');
const RELEASES_ROOT = path.join(REPO_ROOT, 'data', 'wiki-releases');
const DEFAULT_DB_PATH = path.join(REPO_ROOT, 'app', 'server', 'data', 'roco.db');
const LEGACY_STAGE_ROOT = path.resolve(process.env.WIKI_STAGING_ROOT || DEFAULT_STAGE_ROOT);
const PYTHON_EXECUTABLE = process.env.ROCO_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const JOB_LOG_LIMIT = 200;
const jobs = new Map();
const ENTITY_FOLDERS = { skill: 'skills', ability: 'abilities', pet: 'pets' };

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function safeId(value, label = 'ID') {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(id) || id === '.' || id === '..') {
    throw new Error(`${label} 只能包含字母、数字、点、下划线和短横线`);
  }
  return id;
}

function resolveUnder(root, child) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, child);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('路径超出允许范围');
  }
  return resolved;
}

function getBatchRoot(batchId, requireExisting = true) {
  const root = resolveUnder(BATCHES_ROOT, safeId(batchId, 'Batch ID'));
  if (requireExisting && (!fs.existsSync(root) || !fs.statSync(root).isDirectory())) {
    throw new Error('Batch 不存在');
  }
  return root;
}

function getReleaseRoot(releaseId, requireExisting = false) {
  const root = resolveUnder(RELEASES_ROOT, safeId(releaseId, '发布包 ID'));
  if (requireExisting && (!fs.existsSync(root) || !fs.statSync(root).isDirectory())) {
    throw new Error('发布包不存在');
  }
  return root;
}

function currentStageRoot() {
  return context.getStore()?.stageRoot || LEGACY_STAGE_ROOT;
}

function batchRequestContext(req, res, next) {
  const requested = req.get('x-wiki-batch') || req.query.batch || req.body?.batch;
  try {
    const stageRoot = requested ? getBatchRoot(requested) : LEGACY_STAGE_ROOT;
    context.run({ stageRoot, batchId: requested || null }, next);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function batchMetadata(root, fallbackId) {
  const stat = fs.statSync(root);
  return readJson(path.join(root, '.batch.json'), {
    schema_version: 1,
    id: fallbackId,
    name: fallbackId,
    created_at: stat.birthtime.toISOString(),
    updated_at: stat.mtime.toISOString(),
  });
}

function writeBatchMetadata(root, metadata) {
  writeJsonAtomic(path.join(root, '.batch.json'), {
    schema_version: 1,
    id: metadata.id,
    name: String(metadata.name || metadata.id).trim(),
    created_at: metadata.created_at,
    updated_at: new Date().toISOString(),
  });
}

function entityCounts(root) {
  return Object.fromEntries(Object.entries(ENTITY_FOLDERS).map(([entity, folder]) => {
    const entityRoot = path.join(root, folder);
    const count = fs.existsSync(entityRoot)
      ? fs.readdirSync(entityRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).length
      : 0;
    return [entity, count];
  }));
}

function listBatches() {
  if (!fs.existsSync(BATCHES_ROOT)) return [];
  return fs.readdirSync(BATCHES_ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(entry.name))
    .map(entry => {
      const root = path.join(BATCHES_ROOT, entry.name);
      const metadata = batchMetadata(root, entry.name);
      const running = [...jobs.values()].find(job => job.batchId === entry.name && job.status === 'running');
      return {
        id: entry.name,
        name: metadata.name || entry.name,
        createdAt: metadata.created_at,
        updatedAt: metadata.updated_at,
        counts: entityCounts(root),
        runningJobId: running?.id || null,
      };
    })
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function slugify(value) {
  const slug = String(value || '').trim().toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'batch';
}

function createBatchId(name) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const base = `${slugify(name)}-${stamp}`;
  let candidate = base;
  let suffix = 2;
  while (fs.existsSync(getBatchRoot(candidate, false))) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function appendLog(job, stream, chunk) {
  const lines = String(chunk || '').replace(/\r/g, '').split('\n').filter(Boolean);
  for (const line of lines) job.logs.push({ at: new Date().toISOString(), stream, line });
  if (job.logs.length > JOB_LOG_LIMIT) job.logs.splice(0, job.logs.length - JOB_LOG_LIMIT);
}

function publicJob(job) {
  return {
    id: job.id,
    batchId: job.batchId,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    currentStep: job.currentStep,
    totalSteps: job.commands.length,
    logs: job.logs,
    error: job.error,
    result: job.result,
  };
}

function runCommand(job, command, index) {
  return new Promise((resolve, reject) => {
    job.currentStep = index + 1;
    appendLog(job, 'system', `开始：${command.label}`);
    const child = spawn(PYTHON_EXECUTABLE, command.args, {
      cwd: REPO_ROOT,
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', chunk => appendLog(job, 'stdout', chunk));
    child.stderr.on('data', chunk => appendLog(job, 'stderr', chunk));
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        appendLog(job, 'system', `完成：${command.label}`);
        resolve();
      } else {
        reject(new Error(`${command.label}失败（退出码 ${code}）`));
      }
    });
  });
}

function startJob({ batchId, type, commands, result = null }) {
  const running = [...jobs.values()].find(job => job.batchId === batchId && job.status === 'running');
  if (running) throw new Error(`该 Batch 正在执行“${running.type}”，请等待任务完成`);
  const now = new Date().toISOString();
  const job = {
    id: crypto.randomUUID(), batchId, type, status: 'running', createdAt: now, startedAt: now,
    finishedAt: null, currentStep: 0, commands, logs: [], error: null, result,
  };
  jobs.set(job.id, job);
  (async () => {
    try {
      for (let index = 0; index < commands.length; index += 1) await runCommand(job, commands[index], index);
      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      appendLog(job, 'stderr', error.message);
    } finally {
      job.finishedAt = new Date().toISOString();
    }
  })();
  return publicJob(job);
}

function scriptArgs(...args) {
  return [path.join(REPO_ROOT, 'scripts', 'wiki_staging.py'), ...args];
}

router.get('/wiki-batches', (req, res) => {
  try {
    res.json({ batches: listBatches() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/wiki-batches', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 100) return res.status(400).json({ error: '请输入 1～100 个字符的 Batch 名称' });
    fs.mkdirSync(BATCHES_ROOT, { recursive: true });
    const id = createBatchId(name);
    const root = getBatchRoot(id, false);
    fs.mkdirSync(root, { recursive: false });
    const createdAt = new Date().toISOString();
    writeBatchMetadata(root, { id, name, created_at: createdAt });
    res.status(201).json({ batch: { id, name, createdAt, updatedAt: createdAt, counts: entityCounts(root) } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/wiki-batches/:batchId', (req, res) => {
  try {
    const id = safeId(req.params.batchId, 'Batch ID');
    const root = getBatchRoot(id);
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 100) return res.status(400).json({ error: '请输入 1～100 个字符的 Batch 名称' });
    const metadata = batchMetadata(root, id);
    writeBatchMetadata(root, { ...metadata, id, name });
    res.json({ success: true, batch: { id, name } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/wiki-batches/:batchId/fetch', (req, res) => {
  try {
    const batchId = safeId(req.params.batchId, 'Batch ID');
    const root = getBatchRoot(batchId);
    const scope = String(req.body?.scope || 'all');
    if (!['all', 'skills', 'pets'].includes(scope)) return res.status(400).json({ error: '未知拉取范围' });
    const common = ['--output', root, '--db', DEFAULT_DB_PATH];
    const commands = [];
    if (scope === 'all' || scope === 'skills') {
      commands.push({ label: '拉取技能列表', args: scriptArgs('fetch', '--all-skills', ...common) });
    }
    if (scope === 'all' || scope === 'pets') {
      commands.push({ label: '拉取精灵基础数据与特性', args: scriptArgs('fetch', '--all-pets', ...common) });
    }
    res.status(202).json({ job: startJob({ batchId, type: `fetch-${scope}`, commands }) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/wiki-batches/:batchId/package', (req, res) => {
  try {
    const batchId = safeId(req.params.batchId, 'Batch ID');
    const root = getBatchRoot(batchId);
    const releaseId = safeId(req.body?.releaseId || `${batchId}-release`, '发布包 ID');
    const output = getReleaseRoot(releaseId, false);
    if (fs.existsSync(output) || fs.existsSync(`${output}.zip`)) {
      return res.status(409).json({ error: '同名发布包已存在，请修改发布包名称' });
    }
    fs.mkdirSync(RELEASES_ROOT, { recursive: true });
    const commands = [{
      label: '校验审核结果并生成发布压缩包',
      args: scriptArgs('package', '--input', root, '--output', output),
    }];
    res.status(202).json({
      job: startJob({ batchId, type: 'package', commands, result: { releaseId, downloadReady: false } }),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/wiki-batches/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: '任务不存在或服务已重启' });
  const result = publicJob(job);
  if (result.status === 'completed' && result.result?.releaseId) result.result.downloadReady = true;
  return res.json({ job: result });
});

router.get('/wiki-batches/releases/:releaseId/download', (req, res) => {
  try {
    const output = getReleaseRoot(req.params.releaseId, false);
    const zipPath = `${output}.zip`;
    if (!fs.existsSync(zipPath) || !fs.statSync(zipPath).isFile()) {
      return res.status(404).json({ error: '发布压缩包不存在' });
    }
    return res.download(zipPath, path.basename(zipPath));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = {
  router,
  batchRequestContext,
  currentStageRoot,
  DEFAULT_STAGE_ROOT,
};