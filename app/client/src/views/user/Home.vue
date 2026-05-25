<template>
  <div>
    <!-- 标题 -->
    <h1 class="page-title">洛克王国世界 数据工具</h1>

    <!-- 赛季更新公告 -->
    <div v-if="announcement.text" @click="showAnnouncement = true"
      class="block mb-4 sm:mb-5 lg:mb-6 card !py-3 !px-4 border-l-4 border-l-primary-500 hover:border-primary-500/50 transition-colors group cursor-pointer">
      <div class="flex items-center gap-2">
        <span class="text-base">📢</span>
        <span class="text-sm sm:text-base font-medium group-hover:text-primary-500 transition-colors">{{ announcement.text }}</span>
        <span class="text-xs text-muted ml-auto flex-shrink-0">查看详情 →</span>
      </div>
    </div>

    <!-- 公告弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAnnouncement" class="fixed inset-0 z-[300] flex items-center justify-center p-4" @click.self="showAnnouncement = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
<div class="relative w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            :class="isDark ? 'bg-gray-800' : 'bg-white'">
            <!-- 顶部 -->
            <div class="flex items-center justify-between px-5 py-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
              <h3 class="font-roco text-base text-primary-500">📢 赛季更新公告</h3>
              <button @click="showAnnouncement = false" class="text-muted hover:text-primary-500 text-xl leading-none">&times;</button>
            </div>
            <!-- 正文 -->
            <div class="flex-1 overflow-y-auto px-5 py-4 prose-announcement" :class="isDark ? 'prose-dark' : 'prose-light'" v-html="announcementHtml"></div>
            <!-- 底部 -->
            <div class="px-5 py-3 border-t flex items-center justify-between" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
              <a v-if="announcement.url" :href="announcement.url" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium border border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white transition-colors">
                📋 查看官方公告
              </a>
              <span v-else></span>
              <button @click="showAnnouncement = false" class="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 官方链接 -->
    <div class="flex flex-wrap gap-3 sm:gap-4 section-gap">
      <a href="https://rocom.qq.com/" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">🎮 洛克王国世界官网</span>
      </a>
      <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">📖 BWIKI 百科</span>
      </a>
      <a href="https://space.bilibili.com/626796832" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">📺 官方B站</span>
      </a>
      <a href="https://weibo.com/u/7476327149" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">🐦 官方微博</span>
      </a>
      <a href="https://www.taptap.cn/app/188212" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">🎯 TapTap</span>
      </a>
    </div>

    <!-- 数据概览 -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 section-gap">
      <div class="card text-center" v-for="stat in stats" :key="stat.label">
        <div class="font-roco text-2xl sm:text-3xl lg:text-4xl text-primary-500">{{ stat.value }}</div>
        <div class="text-muted text-xs sm:text-sm mt-1">{{ stat.label }}</div>
      </div>
    </div>

    <!-- 快速导航 -->
    <h2 class="font-roco text-lg sm:text-xl lg:text-2xl text-primary-500 mb-3 sm:mb-4">快速导航</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 section-gap">
      <router-link v-for="item in navCards" :key="item.path" :to="item.path" class="card group">
        <div class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">{{ item.title }}</div>
        <div class="text-muted text-xs sm:text-sm mt-1.5 sm:mt-2">{{ item.desc }}</div>
      </router-link>
    </div>

    <!-- 数据来源与声明 -->
    <div class="card">
      <h2 class="font-roco text-base sm:text-lg lg:text-xl text-primary-500 mb-3 sm:mb-4">数据来源与声明</h2>

      <div class="space-y-3 sm:space-y-4 text-sm sm:text-base leading-relaxed">
        <div>
          <h3 class="font-medium mb-1">📖 数据来源</h3>
          <div class="text-muted space-y-1.5">
            <p>
              精灵、技能等基础数据源自
              <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">洛克王国世界 BWIKI</a>，
              经自动化爬虫采集、清洗并结构化入库，仅供学习与交流使用。
            </p>
            <p>
              赛季、活动等运营数据部分来源于洛克王国世界官方在
              <a href="https://space.bilibili.com/626796832" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">B站</a>、
              <a href="https://weibo.com/u/7476327149" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">微博</a>、
              <a href="https://www.taptap.cn/app/188212" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">TapTap</a>
              等官方社区平台发布的公告与活动信息。
            </p>
            <p>
              部分图片素材来源于
              <a href="https://rocom.qq.com/" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">游戏官网</a>
              及官方创作者素材库，相关版权归腾讯/洛克王国世界官方所有。
            </p>
          </div>
        </div>

        <div>
          <h3 class="font-medium mb-1">⚠️ 数据准确性</h3>
          <p class="text-muted">
            部分数据经过二次处理（如属性克制倍率计算、打击面分析等），处理过程中可能存在偏差或错误。
            <strong class="text-gray-700 dark:text-gray-200">如发现数据有误，欢迎指正，一切以洛克王国世界官方实际数据为准。</strong>
          </p>
        </div>

        <div>
          <h3 class="font-medium mb-1">📜 内容协议</h3>
          <p class="text-muted">
            BWIKI 内容遵循
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener noreferrer"
              class="text-primary-500 hover:text-primary-600 underline underline-offset-2">CC BY-NC-SA 4.0</a>
            协议。本站作为非商业性质的数据展示工具，遵循该协议进行内容引用与再分发。
          </p>
        </div>

        <div>
          <h3 class="font-medium mb-1">©️ 版权声明</h3>
          <div class="text-muted space-y-1.5">
            <p>© 2026 <span class="font-roco text-primary-500">Roco Tools</span> Developed by <a href="https://github.com/eachyczhang" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">@eachzhang</a></p>
            <p>洛克王国世界游戏及相关IP版权归腾讯公司所有。</p>
            <p>本项目仅用于学习交流，非官方应用，无任何商业用途。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { statsApi, seasonsApi } from '@/api'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()
const stats = ref([])
const announcement = reactive({ url: '', text: '', content: '' })
const showAnnouncement = ref(false)

// Lightweight Markdown → HTML parser (supports headings, tables, lists, bold, italic, hr, blockquote)
function parseMarkdown(md) {
  if (!md) return ''
  const lines = md.split('\n')
  let html = ''
  let inTable = false
  let inList = false
  let listType = ''

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      html += '<hr/>'
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      const level = headingMatch[1].length
      html += `<h${level}>${inline(headingMatch[2])}</h${level}>`
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      html += `<blockquote>${inline(line.slice(2))}</blockquote>`
      continue
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
    // Separator row
      if (cells.every(c => /^[-:]+$/.test(c))) continue
      if (!inTable) {
        if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
        inTable = true
        html += '<div class="table-wrap"><table><thead><tr>' + cells.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
        continue
      }
      html += '<tr>' + cells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>'
      continue
    } else if (inTable) {
      html += '</tbody></table></div>'
      inTable = false
    }

    // Unordered list
    if (/^[-*]\s+/.test(line.trim())) {
      if (!inList || listType !== 'ul') {
        if (inList) html += listType === 'ul' ? '</ul>' : '</ol>'
        html += '<ul>'; inList = true; listType = 'ul'
      }
      html += `<li>${inline(line.trim().replace(/^[-*]\s+/, ''))}</li>`
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line.trim())) {
      if (!inList || listType !== 'ol') {
        if (inList) html += listType === 'ul' ? '</ul>' : '</ol>'
        html += '<ol>'; inList = true; listType = 'ol'
      }
      html += `<li>${inline(line.trim().replace(/^\d+\.\s+/, ''))}</li>`
      continue
    }

    // Close list if not continuing
    if (inList && line.trim() === '') {
      html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false
      continue
    }

    // Empty line
    if (line.trim() === '') continue

    // Paragraph
    if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
    html += `<p>${inline(line)}</p>`
  }

  if (inList) html += listType === 'ul' ? '</ul>' : '</ol>'
  if (inTable) html += '</tbody></table></div>'
  return html
}

// Inline formatting: bold, italic, code, links, inline icons
function inline(text) {
  return text
    // Custom inline icons: ![pet:uid], ![skill:uid], ![img:path]
    .replace(/!\[pet:([^\]]+)\]/g, '<img class="inline-icon pet-icon" src="/public/pets/thumbs/$1_default.webp" alt="" loading="lazy" />')
    .replace(/!\[skill:([^\]]+)\]/g, '<img class="inline-icon skill-icon" src="/public/skills/icons/$1.png" alt="" loading="lazy" />')
    .replace(/!\[ability:([^\]]+)\]/g, '<img class="inline-icon ability-icon" src="$1" alt="" loading="lazy" />')
    .replace(/!\[img:([^\]]+)\]/g, '<img class="inline-img" src="$1" alt="" loading="lazy" />')
    .replace(/!\[shiny:([^\]]+)\]/g, '<span class="shiny-wrap">异色：<img class="inline-img" src="/public/pets/shiny/$1_shiny.webp" alt="" loading="lazy" onerror="this.closest(&#39;.shiny-wrap&#39;).style.display=&#39;none&#39;"/></span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/→/g, '→')
}

const announcementHtml = computed(() => parseMarkdown(announcement.content))
const navCards = [
  { path: '/events', title: '活动日历', desc: '当前赛季活动、大量出没、常驻课题' },
  { path: '/pets', title: '精灵图鉴', desc: '查看所有精灵数据、种族值、技能、蛋组' },
  { path: '/skills', title: '技能大全', desc: '按属性、分类筛选所有技能' },
  { path: '/coverage', title: '打击面分析', desc: '选择属性组合，查找最优打击面精灵' },
  { path: '/eggs', title: '蛋组查询', desc: '查看 15 种蛋组及其精灵成员' },
  { path: '/natures', title: '性格一览', desc: '30 种性格属性增减与子性格查询' },
  { path: '/elements', title: '属性克制', desc: '18 种属性克制/抵抗关系一览' },
]

onMounted(async () => {
  try {
    const [data, seasonRes] = await Promise.all([
      statsApi.get(),
      seasonsApi.current(),
    ])
    stats.value = [
      { label: '精灵', value: data.pets ?? 0 },
      { label: '技能', value: data.skills ?? 0 },
      { label: '属性', value: data.elements ?? 0 },
      { label: '蛋组', value: data.eggs ?? 0 },
      { label: '性格', value: data.natures ?? 0 },
    ]
    if (seasonRes.season?.home_announcement_text) {
      announcement.url = seasonRes.season.home_announcement_url || ''
      announcement.text = seasonRes.season.home_announcement_text || ''
      announcement.content = seasonRes.season.home_announcement_content || ''
    }
  } catch (e) {
    console.error('加载数据失败', e)
  }
})
</script>

<style scoped>
/* Modal transition */
.modal-enter-active, .modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child {
  transform: scale(0.95) translateY(8px);
}
.modal-leave-to > div:last-child {
  transform: scale(0.95) translateY(8px);
}

/* ===== Markdown Prose — Light Mode ===== */
:deep(.prose-announcement) {
  font-size: 0.85rem;
  line-height: 1.65;
}
:deep(.prose-light) {
  color: #374151;
}
:deep(.prose-dark) {
  color: #e5e7eb;
}

/* H1 — Main title */
:deep(.prose-announcement h1) {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #D69F23;
  font-family: 'MIANFEIZITI', 'PingFang SC', sans-serif;
}

/* H2 — Section title with gold accent */
:deep(.prose-announcement h2) {
  font-size: 1rem;
  font-weight: 700;
  margin: 1.5rem 0 0.6rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #D69F23;
}
:deep(.prose-light h2) {
  background: rgba(214, 159, 35, 0.08);
  color: #92700C;
}
:deep(.prose-dark h2) {
  background: rgba(255, 202, 40, 0.1);
  color: #FFCA28;
}

/* H3 — Sub-section (skill names, pet names) */
:deep(.prose-announcement h3) {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0.9rem 0 0.2rem;
  padding-left: 0.5rem;
  border-left: 2px solid #D69F23;
}
:deep(.prose-dark h3) {
  color: #fde68a;
}

/* Paragraphs */
:deep(.prose-announcement p) {
  margin: 0.3rem 0;
}

/* Blockquote — meta info */
:deep(.prose-announcement blockquote) {
  margin: 0.5rem 0 1rem;
  padding: 0.4rem 0.75rem;
  border-left: 3px solid #D69F23;
  border-radius: 0 6px 6px 0;
  font-size: 0.78rem;
}
:deep(.prose-light blockquote) {
  background: rgba(214, 159, 35, 0.06);
  color: #6b7280;
}
:deep(.prose-dark blockquote) {
  background: rgba(255, 202, 40, 0.06);
  color: #9ca3af;
}

/* Lists */
:deep(.prose-announcement ul),
:deep(.prose-announcement ol) {
  margin: 0.3rem 0;
  padding-left: 1.2rem;
}
:deep(.prose-announcement li) {
  margin: 0.15rem 0;
  line-height: 1.6;
}
:deep(.prose-announcement ul li) {
  list-style: disc;
}
:deep(.prose-announcement ol li) {
  list-style: decimal;
}
:deep(.prose-light li::marker) {
  color: #D69F23;
}
:deep(.prose-dark li::marker) {
  color: #FFCA28;
}

/* Bold / Strong */
:deep(.prose-announcement strong) {
  font-weight: 600;
}
:deep(.prose-light strong) {
  color: #1f2937;
}
:deep(.prose-dark strong) {
  color: #f9fafb;
}

/* Inline code */
:deep(.prose-announcement code) {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.78rem;
  font-family: 'JetBrains Mono', monospace;
}
:deep(.prose-light code) {
  background: rgba(214, 159, 35, 0.1);
  color: #92700C;
}
:deep(.prose-dark code) {
  background: rgba(255, 202, 40, 0.12);
  color: #fde68a;
}

/* Table wrapper — horizontal scroll */
:deep(.prose-announcement .table-wrap) {
  overflow-x: auto;
  margin: 0.75rem 0;
  border-radius: 8px;
  border: 1px solid;
}
:deep(.prose-light .table-wrap) {
  border-color: #e5e7eb;
}
:deep(.prose-dark .table-wrap) {
  border-color: #2d3548;
}

/* Table */
:deep(.prose-announcement table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  white-space: nowrap;
}
:deep(.prose-announcement th) {
  font-weight: 600;
  padding: 0.45rem 0.6rem;
  text-align: left;
  position: sticky;
  top: 0;
}
:deep(.prose-light th) {
  background: #fdf6e3;
  color: #92700C;
  border-bottom: 2px solid rgba(214, 159, 35, 0.3);
  z-index: 3;
}
:deep(.prose-dark th) {
  background: #252d3a;
  color: #FFCA28;
  border-bottom: 2px solid rgba(255, 202, 40, 0.2);
  z-index: 3;
}
:deep(.prose-announcement td) {
  padding: 0.4rem 0.6rem;
  text-align: left;
}
:deep(.prose-light td) {
  border-bottom: 1px solid #f3f4f6;
}
:deep(.prose-dark td) {
  border-bottom: 1px solid #1e2433;
}
/* Sticky first column */
:deep(.prose-announcement th:first-child),
:deep(.prose-announcement td:first-child) {
  position: sticky;
  left: 0;
  z-index: 2;
  font-weight: 600;
}
:deep(.prose-announcement th:first-child) {
  z-index: 5;
}
:deep(.prose-light th:first-child),
:deep(.prose-light td:first-child) {
  background: #fff;
  box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.06);
}
:deep(.prose-dark th:first-child),
:deep(.prose-dark td:first-child) {
  background: #1f2937;
  box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.3);
}
:deep(.prose-light th:first-child) {
  background: #fdf6e3;
}
:deep(.prose-dark th:first-child) {
  background: #252d3a;
}
:deep(.prose-light tr:nth-child(even) td:first-child) {
  background: #fafafa;
}
:deep(.prose-dark tr:nth-child(even) td:first-child) {
  background: #1a2332;
}
:deep(.prose-light tr:hover td:first-child) {
  background: rgba(214, 159, 35, 0.05);
}
:deep(.prose-dark tr:hover td:first-child) {
  background: rgba(255, 202, 40, 0.05);
}
/* Zebra striping */
:deep(.prose-light tr:nth-child(even) td) {
  background: #fafafa;
}
:deep(.prose-dark tr:nth-child(even) td) {
  background: rgba(255, 255, 255, 0.02);
}
:deep(.prose-light tr:hover td) {
  background: rgba(214, 159, 35, 0.05);
}
:deep(.prose-dark tr:hover td) {
  background: rgba(255, 202, 40, 0.05);
}

/* Horizontal rule */
:deep(.prose-announcement hr) {
  margin: 1.25rem 0;
  border: none;
}
:deep(.prose-light hr) {
  border-top: 1px solid #e5e7eb;
}
:deep(.prose-dark hr) {
  border-top: 1px solid #2d3548;
}

/* Footer disclaimer (paragraph after hr) */
:deep(.prose-announcement hr + p) {
  text-align: center;
  font-size: 0.8rem;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin-top: 0.5rem;
}
:deep(.prose-light hr + p) {
  background: rgba(214, 159, 35, 0.06);
  color: #92700C;
  border: 1px dashed rgba(214, 159, 35, 0.3);
}
:deep(.prose-dark hr + p) {
  background: rgba(255, 202, 40, 0.06);
  color: #FFCA28;
  border: 1px dashed rgba(255, 202, 40, 0.25);
}

/* Links */
:deep(.prose-announcement a) {
  color: #D69F23;
  text-decoration: underline;
  text-underline-offset: 2px;
}
:deep(.prose-announcement a:hover) {
  color: #B8860B;
}
:deep(.prose-dark a) {
  color: #FFCA28;
}
:deep(.prose-dark a:hover) {
  color: #FFD54F;
}

/* Inline icons — pet thumbnails & skill icons */
:deep(.prose-announcement .inline-icon) {
  display: inline-block;
  vertical-align: middle;
  border-radius: 4px;
  object-fit: contain;
  margin: 0 2px;
  flex-shrink: 0;
}
:deep(.prose-announcement .pet-icon) {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
:deep(.prose-light .pet-icon) {
  background: rgba(214, 159, 35, 0.08);
  border: 1px solid rgba(214, 159, 35, 0.2);
}
:deep(.prose-dark .pet-icon) {
  background: rgba(255, 202, 40, 0.08);
  border: 1px solid rgba(255, 202, 40, 0.2);
}
:deep(.prose-announcement .skill-icon) {
  width: 20px;
  height: 20px;
}
/* Ability icon: ![ability:path] — inline, line-height size */
:deep(.prose-announcement .ability-icon) {
  width: 2em;
  height: 2em;
  vertical-align: -0.5em;
  object-fit: contain;
  margin: 0 2px;
}
/* Inline full images: ![img:path] */
:deep(.prose-announcement .inline-img) {
  display: inline-block;
  vertical-align: middle;
  width: 56px;
  height: 56px;
  object-fit: contain;
  border-radius: 6px;
  margin: 0 3px;
}
:deep(.prose-light .skill-icon) {
  background: rgba(0, 0, 0, 0.03);
}
:deep(.prose-dark .skill-icon) {
  background: rgba(255, 255, 255, 0.05);
}
/* Larger icons in table cells for better visibility */
:deep(.prose-announcement td .pet-icon) {
  width: 28px;
  height: 28px;
}
:deep(.prose-announcement td .skill-icon) {
  width: 22px;
  height: 22px;
}
</style>
