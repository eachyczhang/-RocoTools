/**
 * Skill Icon Processor
 * 
 * Extracts rounded-square skill icons from game screenshots.
 * 
 * Screenshot layout (skill detail):
 * - Vertical layout (height > width)
 * - Icon at the TOP CENTER, rounded-square shape
 * - "技能详情" label at top-left corner
 * - Skill name below the icon
 * - Stats and description below
 * - Light/cream colored upper background, dark lower background
 * 
 * Supports two modes:
 * 1. Direct mode: Input is already a cropped icon (roughly square)
 * 2. Extract mode: Input is a full detail-page screenshot
 * 
 * Usage: node process.js
 */

const path = require('path');
const fs = require('fs');

// Use sharp from app/server
const sharp = require(path.resolve(__dirname, '../../app/server/node_modules/sharp'));

const INPUT_DIR = path.join(__dirname, 'input');
const OUTPUT_DIR = path.join(__dirname, 'output');
const ICON_SIZE = 128;
const CORNER_RADIUS = 20;

// Supported image extensions
const SUPPORTED_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];

/**
 * Create a rounded rectangle mask SVG for the given size
 */
function createRoundedRectMask(size, radius) {
  return Buffer.from(
    `<svg width="${size}" height="${size}">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`
  );
}

/**
 * Detect the skill icon region in a skill detail screenshot.
 * 
 * The skill screenshot has:
 * - Vertical layout (taller than wide)
 * - Icon at top center (~top 40% of image, horizontally centered)
 * - Icon is a rounded square, colorful, against light/cream background
 * - "技能详情" label at top-left (ignore it)
 * 
 * Strategy:
 * 1. Focus on the upper 45% of the image, middle 70% horizontally
 * 2. The icon is the most colorful/saturated region against the pale background
 * 3. Use saturation to distinguish icon from the light background
 */
async function detectSkillIconRegion(inputPath) {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  // Focus on upper portion where the icon is
  const searchHeight = Math.floor(height * 0.45);
  // Skip the left edge (where "技能详情" label is) and focus on center
  const marginX = Math.floor(width * 0.15);
  const searchWidth = width - marginX * 2;

  // Extract the search region
  const { data, info } = await image
    .extract({ left: marginX, top: 0, width: searchWidth, height: searchHeight })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;

  // Find rows with high saturation (icon pixels are colorful, background is pale/white)
  const rowColorScore = [];
  for (let y = 0; y < searchHeight; y++) {
    let score = 0;
    for (let x = 0; x < searchWidth; x++) {
      const idx = (y * searchWidth + x) * channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
      // Icon pixels: saturated and not too dark
      if (saturation > 0.2 && maxC > 80) {
        score++;
      }
    }
    rowColorScore.push(score / searchWidth);
  }

  // Find the longest contiguous block of colorful rows
  const rowThreshold = 0.12;
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;

  for (let y = 0; y < searchHeight; y++) {
    if (rowColorScore[y] > rowThreshold) {
      if (curStart === -1) curStart = y;
      curLen++;
    } else {
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
      curStart = -1;
      curLen = 0;
    }
  }
  if (curLen > bestLen) {
    bestStart = curStart;
    bestLen = curLen;
  }

  let topY, bottomY;
  if (bestStart !== -1 && bestLen > 15) {
    topY = bestStart;
    bottomY = bestStart + bestLen - 1;
  } else {
    // Fallback: assume icon is in the middle of upper portion
    const iconSize = Math.min(searchWidth, searchHeight) * 0.4;
    return {
      left: Math.round((width - iconSize) / 2),
      top: Math.round(searchHeight * 0.2),
      width: Math.round(iconSize),
      height: Math.round(iconSize),
    };
  }

  // Find horizontal bounds
  const colColorScore = [];
  for (let x = 0; x < searchWidth; x++) {
    let score = 0;
    for (let y = topY; y <= bottomY; y++) {
      const idx = (y * searchWidth + x) * channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
      if (saturation > 0.2 && maxC > 80) {
        score++;
      }
    }
    colColorScore.push(score / (bottomY - topY + 1));
  }

  const colThreshold = 0.12;
  let cStart = -1, cLen = 0, cBestStart = -1, cBestLen = 0;
  for (let x = 0; x < searchWidth; x++) {
    if (colColorScore[x] > colThreshold) {
      if (cStart === -1) cStart = x;
      cLen++;
    } else {
      if (cLen > cBestLen) {
        cBestStart = cStart;
        cBestLen = cLen;
      }
      cStart = -1;
      cLen = 0;
    }
  }
  if (cLen > cBestLen) {
    cBestStart = cStart;
    cBestLen = cLen;
  }

  let leftX, rightX;
  if (cBestStart !== -1) {
    leftX = cBestStart;
    rightX = cBestStart + cBestLen - 1;
  } else {
    leftX = Math.floor(searchWidth * 0.25);
    rightX = Math.floor(searchWidth * 0.75);
  }

  // Make it square
  const regionW = rightX - leftX;
  const regionH = bottomY - topY;
  const size = Math.max(regionW, regionH);

  const cx = (leftX + rightX) / 2 + marginX; // Add back the margin offset
  const cy = (topY + bottomY) / 2;

  // Add small padding (3%)
  const padding = size * 0.03;
  const finalSize = Math.round(size + padding * 2);

  const result = {
    left: Math.max(0, Math.round(cx - finalSize / 2)),
    top: Math.max(0, Math.round(cy - finalSize / 2)),
    width: finalSize,
    height: finalSize,
  };

  // Ensure bounds
  if (result.left + result.width > width) result.width = width - result.left;
  if (result.top + result.height > height) result.height = height - result.top;

  return result;
}

/**
 * Trim background edges from a direct-mode image.
 * Detects the background color from corners and crops to content.
 */
async function trimBackground(inputPath) {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  const { data } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Sample corner pixels to determine background color
  const corners = [
    [0, 0], [width - 1, 0],
    [0, height - 1], [width - 1, height - 1]
  ];
  let bgR = 0, bgG = 0, bgB = 0;
  for (const [x, y] of corners) {
    const idx = (y * width + x) * 4;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR = Math.round(bgR / 4);
  bgG = Math.round(bgG / 4);
  bgB = Math.round(bgB / 4);

  // Color distance threshold - pixels within this distance from bg are considered background
  const threshold = 35;

  function isBg(x, y) {
    const idx = (y * width + x) * 4;
    const dr = data[idx] - bgR;
    const dg = data[idx + 1] - bgG;
    const db = data[idx + 2] - bgB;
    return Math.sqrt(dr * dr + dg * dg + db * db) < threshold;
  }

  // Find content bounds by scanning from each edge
  let top = 0, bottom = height - 1, left = 0, right = width - 1;

  // Scan from top
  for (let y = 0; y < height; y++) {
    let allBg = true;
    for (let x = 0; x < width; x += 2) {
      if (!isBg(x, y)) { allBg = false; break; }
    }
    if (!allBg) { top = y; break; }
  }

  // Scan from bottom
  for (let y = height - 1; y >= 0; y--) {
    let allBg = true;
    for (let x = 0; x < width; x += 2) {
      if (!isBg(x, y)) { allBg = false; break; }
    }
    if (!allBg) { bottom = y; break; }
  }

  // Scan from left
  for (let x = 0; x < width; x++) {
    let allBg = true;
    for (let y = top; y <= bottom; y += 2) {
      if (!isBg(x, y)) { allBg = false; break; }
    }
    if (!allBg) { left = x; break; }
  }

  // Scan from right
  for (let x = width - 1; x >= 0; x--) {
    let allBg = true;
    for (let y = top; y <= bottom; y += 2) {
      if (!isBg(x, y)) { allBg = false; break; }
    }
    if (!allBg) { right = x; break; }
  }

  // Make it square (use the larger dimension)
  const contentW = right - left + 1;
  const contentH = bottom - top + 1;
  const size = Math.max(contentW, contentH);
  const cx = Math.round((left + right) / 2);
  const cy = Math.round((top + bottom) / 2);

  const extractLeft = Math.max(0, Math.round(cx - size / 2));
  const extractTop = Math.max(0, Math.round(cy - size / 2));
  const extractW = Math.min(size, width - extractLeft);
  const extractH = Math.min(size, height - extractTop);

  return { left: extractLeft, top: extractTop, width: extractW, height: extractH };
}

/**
 * Process a single image file into a rounded-square icon
 */
async function processImage(inputPath, outputPath, mode) {
  const mask = createRoundedRectMask(ICON_SIZE, CORNER_RADIUS);

  if (mode === 'extract') {
    const region = await detectSkillIconRegion(inputPath);
    console.log(`    [extract] region: left=${region.left}, top=${region.top}, ${region.width}x${region.height}`);

    await sharp(inputPath)
      .extract(region)
      .resize(ICON_SIZE, ICON_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .ensureAlpha()
      .composite([{
        input: mask,
        blend: 'dest-in',
      }])
      .png()
      .toFile(outputPath);
  } else {
    // Direct mode: trim background edges first, then make bg pixels transparent
    const trimRegion = await trimBackground(inputPath);
    console.log(`    [trim] region: left=${trimRegion.left}, top=${trimRegion.top}, ${trimRegion.width}x${trimRegion.height}`);

    // Extract and get raw pixels to make background transparent
    const trimmed = sharp(inputPath).extract(trimRegion);
    const { data, info } = await trimmed
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tw = info.width, th = info.height;

    // Sample corners of trimmed image to get residual bg color
    const cPixels = [[0,0],[tw-1,0],[0,th-1],[tw-1,th-1]];
    let bR = 0, bG = 0, bB = 0, validCorners = 0;
    for (const [cx, cy] of cPixels) {
      const ci = (cy * tw + cx) * 4;
      const r = data[ci], g = data[ci+1], b = data[ci+2];
      // Only use light corners (bg is light colored)
      if (r > 180 && g > 180 && b > 180) {
        bR += r; bG += g; bB += b; validCorners++;
      }
    }
    if (validCorners > 0) {
      bR = Math.round(bR / validCorners);
      bG = Math.round(bG / validCorners);
      bB = Math.round(bB / validCorners);

      // Make pixels close to bg color fully transparent (no feather to avoid white halo)
      // Use a more aggressive threshold in corner regions
      const bgThreshold = 45;
      const cornerThreshold = 70; // More aggressive for corners
      const cornerSize = Math.round(tw * 0.18); // ~18% of image is corner zone

      for (let py = 0; py < th; py++) {
        for (let px = 0; px < tw; px++) {
          const i = (py * tw + px) * 4;
          const dr = data[i] - bR;
          const dg = data[i+1] - bG;
          const db = data[i+2] - bB;
          const dist = Math.sqrt(dr*dr + dg*dg + db*db);

          // Check if pixel is in a corner region
          const inCorner = (px < cornerSize && py < cornerSize) ||
                           (px >= tw - cornerSize && py < cornerSize) ||
                           (px < cornerSize && py >= th - cornerSize) ||
                           (px >= tw - cornerSize && py >= th - cornerSize);

          const threshold = inCorner ? cornerThreshold : bgThreshold;
          if (dist < threshold) {
            data[i+3] = 0; // Set alpha to 0 (fully transparent)
          }
        }
      }
    }

    await sharp(data, { raw: { width: tw, height: th, channels: 4 } })
      .resize(ICON_SIZE, ICON_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .composite([{
        input: mask,
        blend: 'dest-in',
      }])
      .png()
      .toFile(outputPath);
  }
}

/**
 * Determine processing mode based on image dimensions
 * Skill screenshots are vertical (height > width)
 */
async function getMode(inputPath) {
  const metadata = await sharp(inputPath).metadata();
  const ratio = metadata.width / metadata.height;
  // If roughly square (0.8~1.2), treat as direct icon
  if (ratio >= 0.8 && ratio <= 1.2) {
    return 'direct';
  }
  return 'extract';
}

async function main() {
  if (!fs.existsSync(INPUT_DIR)) fs.mkdirSync(INPUT_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs.readdirSync(INPUT_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTS.includes(ext) && !f.startsWith('.');
  });

  if (files.length === 0) {
    console.log('No image files found in input/ directory.');
    console.log('Supported formats:', SUPPORTED_EXTS.join(', '));
    console.log('\nUsage:');
    console.log('  - Place cropped icon images (square) → direct resize + rounded mask');
    console.log('  - Place skill detail screenshots → auto-detect & extract icon from top center');
    return;
  }

  console.log(`Found ${files.length} image(s) to process...\n`);

  let success = 0, failed = 0;

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const baseName = path.basename(file, path.extname(file));
    const outputPath = path.join(OUTPUT_DIR, `${baseName}.png`);

    try {
      const mode = await getMode(inputPath);
      console.log(`  [${mode}] ${file}`);
      await processImage(inputPath, outputPath, mode);
      console.log(`  ✓ → ${baseName}.png`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
