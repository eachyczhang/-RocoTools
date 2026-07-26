const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const router = express.Router();
const PROJECT_ROOT = path.resolve(__dirname, '../../../../..');
const GENERATOR = path.join(PROJECT_ROOT, 'scripts', 'generate_patch_notes.js');
const DEFAULT_DIRECTORY = 'temp/seasons';
const BLOCKED_SEGMENTS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', 'data/public']);

function isInside(target, root) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveDirectory(input = DEFAULT_DIRECTORY) {
  if (typeof input !== 'string') throw new Error('数据库目录必须是字符串');
  const relative = input.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
  if (!relative || path.isAbsolute(relative) || relative.split('/').includes('..')) {
    throw new Error('数据库目录必须是项目内相对路径');
  }
  const lowered = relative.toLowerCase();
  if ([...BLOCKED_SEGMENTS].some(segment => lowered === segment || lowered.startsWith(`${segment}/`) || lowered.includes(`/${segment}/`))) {
    throw new Error('该目录不允许用于版本比对');
  }
  const resolved = path.resolve(PROJECT_ROOT, relative);
  if (!isInside(resolved, PROJECT_ROOT)) throw new Error('数据库目录超出项目范围');
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) throw new Error(`数据库目录不存在：${relative}`);
  return { relative, resolved };
}

function resolveDbFile(directory, filename) {
  if (typeof filename !== 'string' || path.basename(filename) !== filename || !filename.toLowerCase().endsWith('.db')) {
    throw new Error('数据库文件名非法');
  }
  const resolved = path.resolve(directory, filename);
  if (!isInside(resolved, directory) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`数据库文件不存在：${filename}`);
  }
  return resolved;
}

function compactLabel(markdown) {
  return markdown
    .replace(/!\[(?:pet|skill|element|ability|img|shiny):[^\]]+\]/gi, '[图片]')
    .replace(/!\[[^\]]*\](?:\([^)]*\))?/g, '[图片]')
    .replace(/<br\s*\/?\s*>/gi, '；')
    .replace(/<[^>]+>/g, '')
    .replace(/[|*_`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160) || '公告条目';
}

const IMAGE_LABELS = {
  pet: '精灵',
  skill: '技能',
  element: '属性',
  ability: '特性',
  img: '图片',
  shiny: '异色',
};

function safePreviewUrl(value) {
  const url = String(value || '').trim();
  if (url.startsWith('/public/') || url.startsWith('/uploads/')) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return '';
}

function previewLabel(type, url) {
  if (type !== 'img') return IMAGE_LABELS[type];
  if (/\/pets\/(?:default|thumbs|thumbnails)\//i.test(url)) return '本体';
  if (/\/pets\/shiny\//i.test(url)) return '异色';
  if (/\/pets\/fruit\//i.test(url)) return '果实';
  if (/\/pets\/egg\//i.test(url)) return '精灵蛋';
  if (/\/pets\/abilities\//i.test(url)) return '特性';
  if (/\/skills\//i.test(url)) return '技能';
  if (/\/elements\//i.test(url)) return '属性';
  return IMAGE_LABELS.img;
}

function extractPreviewImages(markdown) {
  const images = [];
  const seen = new Set();
  const add = (url, label) => {
    const safeUrl = safePreviewUrl(url);
    if (!safeUrl || seen.has(safeUrl)) return;
    seen.add(safeUrl);
    images.push({ url: safeUrl, label });
  };
  String(markdown || '').replace(/!\[(pet|skill|element|ability|img|shiny):([^\]]+)\]/gi, (_, typeValue, value) => {
    const type = typeValue.toLowerCase();
    if (type === 'pet') add(`/public/pets/thumbs/${value}_default.webp`, IMAGE_LABELS[type]);
    else if (type === 'skill') add(`/public/skills/icons/${value}.png`, IMAGE_LABELS[type]);
    else if (type === 'shiny') add(`/public/pets/shiny/${value}_shiny.webp`, IMAGE_LABELS[type]);
    else add(value, previewLabel(type, value));
    return '';
  });
  String(markdown || '').replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    add(url, alt || '图片');
    return '';
  });
  return images;
}

function isTableSeparator(line) {
  return /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}

function parsePatchNotes(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const firstSection = lines.findIndex(line => /^##\s+/.test(line));
  if (firstSection < 0) throw new Error('生成结果中没有可识别的公告模块');
  let footerStart = -1;
  for (let index = lines.length - 1; index > firstSection; index -= 1) {
    if (lines[index].trim() === '---') { footerStart = index; break; }
  }
  const contentEnd = footerStart >= 0 ? footerStart : lines.length;
  const sections = [];
  let cursor = firstSection;
  let entrySequence = 0;
  while (cursor < contentEnd) {
    if (!/^##\s+/.test(lines[cursor])) { cursor += 1; continue; }
    const start = cursor;
    cursor += 1;
    while (cursor < contentEnd && !/^##\s+/.test(lines[cursor])) cursor += 1;
    const sectionLines = lines.slice(start + 1, cursor);
    const sectionIndex = sections.length;
    const blocks = [];
    const pushFixed = value => {
      if (blocks.length && blocks[blocks.length - 1].type === 'fixed') {
        blocks[blocks.length - 1].markdown += `\n${value}`;
      } else {
        blocks.push({ type: 'fixed', markdown: value });
      }
    };
    for (let index = 0; index < sectionLines.length;) {
      const line = sectionLines[index];
      if (line.startsWith('|') && index + 1 < sectionLines.length && isTableSeparator(sectionLines[index + 1])) {
        pushFixed(`${line}\n${sectionLines[index + 1]}`);
        index += 2;
        let previousEntry = null;
        while (index < sectionLines.length && sectionLines[index].startsWith('|')) {
          const row = sectionLines[index];
          if (/^\|\s*\|/.test(row) && previousEntry) {
            previousEntry.markdown += `\n${row}`;
          } else {
            const entry = {
              type: 'entry',
              id: `section-${sectionIndex}-entry-${entrySequence++}`,
              label: compactLabel(row),
              markdown: row,
            };
            blocks.push(entry);
            previousEntry = entry;
          }
          index += 1;
        }
        continue;
      }
      pushFixed(line);
      index += 1;
    }
    for (const block of blocks) {
      if (block.type === 'entry') block.images = extractPreviewImages(block.markdown);
    }
    sections.push({
      id: `section-${sectionIndex}`,
      heading: lines[start],
      title: lines[start].replace(/^##\s+/, ''),
      blocks,
      entryCount: blocks.filter(block => block.type === 'entry').length,
    });
  }
  return {
    header: lines.slice(0, firstSection).join('\n'),
    sections,
    footer: footerStart >= 0 ? lines.slice(footerStart).join('\n') : '',
    markdown: String(markdown || ''),
  };
}

router.get('/patch-notes/databases', (req, res) => {
  try {
    const directory = resolveDirectory(req.query.directory || DEFAULT_DIRECTORY);
    const databases = fs.readdirSync(directory.resolved, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.db'))
      .map(entry => {
        const stat = fs.statSync(path.join(directory.resolved, entry.name));
        return { name: entry.name, size: stat.size, modifiedAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    res.json({ directory: directory.relative, databases });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/patch-notes/compare', (req, res) => {
  try {
    const directory = resolveDirectory(req.body?.directory || DEFAULT_DIRECTORY);
    const oldPath = resolveDbFile(directory.resolved, req.body?.oldDatabase);
    const newPath = resolveDbFile(directory.resolved, req.body?.newDatabase);
    if (oldPath === newPath) return res.status(400).json({ error: '新旧数据库不能选择同一个文件' });
    const markdown = execFileSync(process.execPath, [GENERATOR, oldPath, newPath, '--stdout'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    const parsed = parsePatchNotes(markdown);
    res.json({
      directory: directory.relative,
      oldDatabase: path.basename(oldPath),
      newDatabase: path.basename(newPath),
      ...parsed,
    });
  } catch (error) {
    console.error('[patch-notes] compare failed:', error.message);
    res.status(400).json({ error: `版本比对失败：${error.message}` });
  }
});

module.exports = router;
module.exports.parsePatchNotes = parsePatchNotes;
module.exports.resolveDirectory = resolveDirectory;
module.exports.extractPreviewImages = extractPreviewImages;