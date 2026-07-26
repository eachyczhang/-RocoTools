#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const sharp = require(path.join(PROJECT_ROOT, 'app', 'server', 'node_modules', 'sharp'));

function fail(message) {
  console.error('[ERROR] ' + message);
  process.exit(2);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input' || arg === '--output-dir') {
      if (!argv[index + 1]) fail('参数缺少值：' + arg);
      result[arg.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      fail('未知参数：' + arg);
    }
  }
  if (!result.input || !result['output-dir']) {
    fail('用法：node scripts/generate_image_derivatives.js --input <jobs.json> --output-dir <dir>');
  }
  return result;
}

function isInside(target, root) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function renderJob(job, outputDir) {
  if (!job || typeof job !== 'object') throw new Error('衍生图任务格式错误');
  const source = path.resolve(String(job.source || ''));
  const relative = String(job.output || '').replace(/\\/g, '/');
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error('源图不存在：' + source);
  }
  if (!relative || path.isAbsolute(relative) || relative.split('/').includes('..')) {
    throw new Error('输出路径非法：' + relative);
  }
  const target = path.resolve(outputDir, relative);
  if (!isInside(target, outputDir)) throw new Error('输出路径越界：' + relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = target + '.tmp-' + process.pid;
  let pipeline = sharp(source);
  if (job.mode === 'thumbnail') {
    pipeline = pipeline
      .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 60 });
  } else if (job.mode === 'webp') {
    pipeline = pipeline.webp({ quality: 80 });
  } else {
    throw new Error('不支持的衍生图类型：' + job.mode);
  }
  try {
    await pipeline.toFile(temporary);
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const outputDir = path.resolve(args['output-dir']);
  if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) fail('任务文件不存在：' + inputPath);
  const jobs = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(jobs)) fail('任务文件必须是 JSON 数组');
  fs.mkdirSync(outputDir, { recursive: true });

  const concurrency = 6;
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= jobs.length) return;
      await renderJob(jobs[index], outputDir);
      completed += 1;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(jobs.length, 1)) }, worker));
  process.stdout.write(JSON.stringify({ jobs: jobs.length, completed }) + '\n');
}

main().catch(error => {
  console.error('[ERROR] 衍生图生成失败：' + error.message);
  process.exit(1);
});
