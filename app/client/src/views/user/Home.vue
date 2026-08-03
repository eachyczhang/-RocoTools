<template>
  <div class="home-page">
    <section class="home-hero">
      <div class="home-hero__content">
        <span class="home-hero__eyebrow">ROCO WORLD DATABASE</span>
        <h1>洛克王国世界<br class="sm:hidden"> 数据工具</h1>
        <p>把精灵、技能与赛季资料，整理成一套轻松好用的冒险手册。</p>
      </div>
      <div class="home-hero__mark" aria-hidden="true">
        <span>ROCO</span>
        <strong>TOOLS</strong>
      </div>
    </section>

    <div v-if="announcement.text" @click="showAnnouncement = true" class="home-announcement-card group cursor-pointer">
      <div class="flex items-center gap-2">
        <span class="home-announcement-card__icon">📢</span>
        <span class="home-announcement-card__text">{{ announcement.text }}</span>
        <span class="home-announcement-card__action">查看详情 <b>→</b></span>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAnnouncement" class="fixed inset-0 z-[300] flex items-center justify-center p-4" @click.self="showAnnouncement = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col" :class="isDark ? 'bg-gray-800' : 'bg-white'">
            <div class="flex items-center justify-between px-5 py-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
              <h3 class="font-roco text-base text-primary-500">📢 赛季更新公告</h3>
              <button @click="showAnnouncement = false" class="text-muted hover:text-primary-500 text-xl leading-none">&times;</button>
            </div>
            <div class="flex-1 overflow-y-auto px-5 py-4 prose-announcement" :class="isDark ? 'prose-dark' : 'prose-light'" v-html="announcementHtml"></div>
            <div class="px-5 py-3 border-t flex items-center justify-between" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
              <a v-if="announcement.url" :href="announcement.url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium border border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white transition-colors">📋 查看官方公告</a>
              <span v-else></span>
              <button @click="showAnnouncement = false" class="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="home-source-links section-gap">
      <a href="https://rocom.qq.com/" target="_blank" rel="noopener noreferrer" class="home-source-link group"><span class="home-source-link__icon">🎮</span><span>洛克王国世界官网</span></a>
      <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer" class="home-source-link group"><span class="home-source-link__icon">📖</span><span>BWIKI 百科</span></a>
      <a href="https://space.bilibili.com/626796832" target="_blank" rel="noopener noreferrer" class="home-source-link group"><span class="home-source-link__icon">📺</span><span>官方 B 站</span></a>
      <a href="https://weibo.com/u/7476327149" target="_blank" rel="noopener noreferrer" class="home-source-link group"><span class="home-source-link__icon">📣</span><span>官方微博</span></a>
      <a href="https://www.taptap.cn/app/188212" target="_blank" rel="noopener noreferrer" class="home-source-link group"><span class="home-source-link__icon">🎯</span><span>TapTap</span></a>
    </div>

    <section class="home-section section-gap">
      <div class="home-section-heading">
        <div><span>DATA OVERVIEW</span><h2>数据概览</h2></div>
        <p>冒险资料持续整理中</p>
      </div>
      <div class="home-stat-grid">
        <div class="home-stat-card" v-for="(stat, index) in stats" :key="stat.label">
          <span class="home-stat-card__index">0{{ index + 1 }}</span>
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </div>
    </section>

    <section class="home-section section-gap">
      <div class="home-section-heading">
        <div><span>QUICK ACCESS</span><h2>快速导航</h2></div>
        <p>选择一张卡片开始探索</p>
      </div>
      <div class="home-nav-grid">
        <router-link v-for="(item, index) in navCards" :key="item.path" :to="item.path" class="home-nav-card group">
          <span class="home-nav-card__number">0{{ index + 1 }}</span>
          <div class="home-nav-card__body"><h3>{{ item.title }}</h3><p>{{ item.desc }}</p></div>
          <span class="home-nav-card__arrow">→</span>
        </router-link>
      </div>
    </section>

    <div class="home-disclaimer-card">
      <div class="home-section-heading home-section-heading--compact">
        <div><span>ABOUT THE DATA</span><h2>数据来源与声明</h2></div>
      </div>
      <div class="space-y-3 sm:space-y-4 text-sm sm:text-base leading-relaxed">
        <div>
          <h3 class="home-disclaimer-title">📖 数据来源</h3>
          <div class="text-muted space-y-1.5">
            <p>精灵、技能等基础数据源自 <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">洛克王国世界 BWIKI</a>，经自动化爬虫采集、清洗并结构化入库，仅供学习与交流使用。</p>
            <p>赛季、活动等运营数据部分来源于洛克王国世界官方在 <a href="https://space.bilibili.com/626796832" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">B站</a>、<a href="https://weibo.com/u/7476327149" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">微博</a>、<a href="https://www.taptap.cn/app/188212" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">TapTap</a> 等官方社区平台发布的公告与活动信息。</p>
            <p>部分图片素材来源于 <a href="https://rocom.qq.com/" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">游戏官网</a> 及官方创作者素材库，相关版权归腾讯/洛克王国世界官方所有。</p>
          </div>
        </div>
        <div><h3 class="home-disclaimer-title">⚠️ 数据准确性</h3><p class="text-muted">部分数据经过二次处理（如属性克制倍率计算、打击面分析等），处理过程中可能存在偏差或错误。<strong class="text-gray-700 dark:text-gray-200">如发现数据有误，欢迎指正，一切以洛克王国世界官方实际数据为准。</strong></p></div>
        <div><h3 class="home-disclaimer-title">📜 内容协议</h3><p class="text-muted">BWIKI 内容遵循 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">CC BY-NC-SA 4.0</a> 协议。本站作为非商业性质的数据展示工具，遵循该协议进行内容引用与再分发。</p></div>
        <div><h3 class="home-disclaimer-title">©️ 版权声明</h3><div class="text-muted space-y-1.5"><p>© 2026 <span class="font-roco text-primary-500">Roco Tools</span> Developed by <a href="https://github.com/eachyczhang" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">@eachzhang</a></p><p>洛克王国世界游戏及相关IP版权归腾讯公司所有。</p><p>本项目仅用于学习交流，非官方应用，无任何商业用途。</p></div></div>
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
        html += `<div class="table-wrap"><table class="cols-${cells.length}"><thead><tr>` + cells.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
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
    .replace(/!\[element:([^\]]+)\]/g, '<img class="inline-icon element-icon" src="$1" alt="" loading="lazy" />')
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
/* ===== 首页卡面系统 ===== */
.home-page {
  --home-accent: #c98b2a;
  --home-accent-soft: #f2d390;
  --home-ink: #202a38;
  --home-muted: #727b89;
  --home-border: rgba(121, 90, 49, 0.15);
  --home-surface: rgba(255, 254, 250, 0.94);
  --home-shadow: 0 10px 26px rgba(86, 63, 34, 0.065);
}

.home-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-height: 138px;
  margin-bottom: 1.5rem;
  padding: clamp(1.15rem, 2.8vw, 2rem);
  overflow: hidden;
  border: 1px solid var(--home-border);
  border-radius: 1.55rem;
  color: var(--home-ink);
  background:
    radial-gradient(circle at 14% 18%, rgba(255, 218, 137, 0.34), transparent 28%),
    radial-gradient(circle at 88% 22%, rgba(119, 198, 207, 0.22), transparent 30%),
    radial-gradient(circle, rgba(201, 139, 42, 0.05) 1px, transparent 1.2px),
    linear-gradient(135deg, rgba(255, 253, 247, 0.98), rgba(245, 244, 237, 0.94));
  background-size: auto, auto, 22px 22px, auto;
  box-shadow: var(--home-shadow);
}

.home-hero::after {
  content: '';
  position: absolute;
  inset: auto 2.5rem -2.2rem auto;
  width: 8rem;
  height: 8rem;
  border: 0.8rem solid rgba(201, 139, 42, 0.045);
  border-radius: 50%;
}

.home-hero__content { position: relative; z-index: 1; }
.home-hero__eyebrow,
.home-section-heading span {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--home-accent);
  font-family: 'MIANFEIZITI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
}

.home-hero h1 {
  margin: 0;
  color: var(--home-ink);
  font-family: 'MIANFEIZITI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.7rem, 3.5vw, 2.45rem);
  line-height: 1.12;
  letter-spacing: 0.03em;
}

.home-hero p {
  max-width: 34rem;
  margin-top: 0.5rem;
  color: var(--home-muted);
  font-size: clamp(0.9rem, 2vw, 1.05rem);
  line-height: 1.7;
}

.home-hero__mark {
  position: relative;
  z-index: 1;
  display: grid;
  place-content: center;
  width: clamp(5.5rem, 10vw, 7.5rem);
  aspect-ratio: 1;
  border: 1px solid rgba(201, 139, 42, 0.16);
  border-radius: 50%;
  color: var(--home-accent);
  text-align: center;
  background: rgba(255, 255, 255, 0.48);
  box-shadow: inset 0 0 0 0.4rem rgba(255, 255, 255, 0.18);
}

.home-hero__mark span,
.home-hero__mark strong {
  font-family: 'MIANFEIZITI', sans-serif;
  line-height: 1;
}
.home-hero__mark span { font-size: clamp(0.8rem, 1.6vw, 1.05rem); letter-spacing: 0.22em; }
.home-hero__mark strong { margin-top: 0.2rem; font-size: clamp(1rem, 1.8vw, 1.45rem); }

.home-announcement-card,
.home-source-link,
.home-stat-card,
.home-nav-card,
.home-disclaimer-card {
  border: 1px solid var(--home-border);
  background-color: var(--home-surface);
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(241, 246, 240, 0.12));
  background-size: auto;
  box-shadow: var(--home-shadow);
}

.home-announcement-card {
  margin-bottom: 1.1rem;
  padding: 0.9rem 1rem;
  border-radius: 1.25rem;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.home-announcement-card:hover { transform: translateY(-2px); border-color: rgba(201, 139, 42, 0.4); box-shadow: 0 20px 42px rgba(86, 63, 34, 0.13); }
.home-announcement-card__icon { display: grid; place-items: center; width: 2rem; height: 2rem; flex: 0 0 auto; border-radius: 0.75rem; background: rgba(201, 139, 42, 0.1); }
.home-announcement-card__text { overflow: hidden; color: var(--home-ink); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.home-announcement-card__action { margin-left: auto; flex: 0 0 auto; color: var(--home-muted); font-size: 0.8rem; }
.home-announcement-card__action b { color: var(--home-accent); font-size: 1rem; }

.home-source-links {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.8rem;
}
.home-source-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3.35rem;
  padding: 0.65rem 0.8rem;
  border-radius: 1.15rem;
  color: var(--home-ink);
  font-family: 'MIANFEIZITI', 'PingFang SC', sans-serif;
  font-size: 0.9rem;
  text-align: center;
  transition: transform 180ms ease, color 180ms ease, border-color 180ms ease;
}
.home-source-link:hover { color: var(--home-accent); transform: translateY(-3px); border-color: rgba(201, 139, 42, 0.38); }
.home-source-link__icon { margin-right: 0.45rem; font-family: sans-serif; font-size: 1rem; }

.home-section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.home-section-heading h2 {
  position: relative;
  margin: 0;
  padding-left: 0.8rem;
  color: var(--home-ink);
  font-family: 'MIANFEIZITI', 'PingFang SC', sans-serif;
  font-size: clamp(1.35rem, 2.5vw, 1.8rem);
  line-height: 1.15;
}
.home-section-heading h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.05em;
  width: 0.24rem;
  height: 0.95em;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--home-accent), #72c5cf);
}
.home-section-heading p { margin: 0 0 0.1rem; color: var(--home-muted); font-size: 0.8rem; }
.home-section-heading--compact { margin-bottom: 1.25rem; }

.home-stat-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
}
.home-stat-card,
.home-nav-card {
  position: relative;
  isolation: isolate;
}
.home-stat-card::after,
.home-nav-card::after {
  content: '';
  position: absolute;
  z-index: -1;
  right: 0.75rem;
  bottom: -0.2rem;
  left: 0.75rem;
  height: 0.3rem;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(114, 197, 207, 0.38), rgba(201, 139, 42, 0.34));
  opacity: 0.46;
}
.home-stat-card {
  display: flex;
  min-height: 6.6rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.9rem 0.7rem;
  border-radius: 1.4rem;
}
.home-stat-card__index { position: absolute; top: 0.75rem; left: 0.85rem; color: rgba(201, 139, 42, 0.35); font-family: 'MIANFEIZITI', sans-serif; font-size: 0.75rem; }
.home-stat-card strong { color: var(--home-accent); font-family: 'MIANFEIZITI', sans-serif; font-size: clamp(1.65rem, 3vw, 2.15rem); line-height: 1; }
.home-stat-card > span:last-child { margin-top: 0.65rem; color: var(--home-muted); font-size: 0.85rem; }

.home-nav-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
.home-nav-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-height: 6.6rem;
  gap: 0.8rem;
  padding: 1rem;
  border-radius: 1.45rem;
  color: inherit;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.home-nav-card:hover { transform: translateY(-4px); border-color: rgba(201, 139, 42, 0.38); box-shadow: 0 23px 44px rgba(86, 63, 34, 0.14); }
.home-nav-card__number { display: grid; place-items: center; width: 2.65rem; height: 2.65rem; border: 1px solid rgba(201, 139, 42, 0.2); border-radius: 0.9rem; color: var(--home-accent); font-family: 'MIANFEIZITI', sans-serif; background: rgba(201, 139, 42, 0.07); }
.home-nav-card__body h3 { margin: 0; color: var(--home-ink); font-family: 'MIANFEIZITI', 'PingFang SC', sans-serif; font-size: 1.05rem; }
.home-nav-card__body p { margin: 0.45rem 0 0; color: var(--home-muted); font-size: 0.8rem; line-height: 1.55; }
.home-nav-card__arrow { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; color: var(--home-accent); background: rgba(201, 139, 42, 0.09); transition: transform 180ms ease, background 180ms ease; }
.home-nav-card:hover .home-nav-card__arrow { transform: translateX(3px); background: rgba(201, 139, 42, 0.16); }

.home-disclaimer-card {
  padding: clamp(1.15rem, 3vw, 2rem);
  border-radius: 1.65rem;
}
.home-disclaimer-title { margin-bottom: 0.35rem; color: var(--home-ink); font-family: 'MIANFEIZITI', 'PingFang SC', sans-serif; font-size: 0.95rem; }

:global(.dark) .home-page {
  --home-accent: #e4ad4a;
  --home-accent-soft: #765a28;
  --home-ink: #edf2f7;
  --home-muted: #9aa8b9;
  --home-border: rgba(121, 184, 215, 0.18);
  --home-surface: rgba(26, 34, 45, 0.94);
  --home-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
}
:global(.dark) .home-hero {
  background:
    radial-gradient(circle at 14% 18%, rgba(224, 162, 57, 0.14), transparent 28%),
    radial-gradient(circle at 88% 22%, rgba(80, 184, 227, 0.14), transparent 30%),
    radial-gradient(circle, rgba(115, 183, 212, 0.12) 1px, transparent 1.2px),
    linear-gradient(135deg, rgba(27, 35, 46, 0.98), rgba(22, 29, 39, 0.96));
  background-size: auto, auto, 22px 22px, auto;
}
:global(.dark) .home-hero__mark { background: rgba(13, 19, 27, 0.32); box-shadow: inset 0 0 0 0.4rem rgba(255, 255, 255, 0.014); }
:global(.dark) .home-announcement-card,
:global(.dark) .home-source-link,
:global(.dark) .home-stat-card,
:global(.dark) .home-nav-card,
:global(.dark) .home-disclaimer-card { background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.025), rgba(82, 149, 177, 0.025)); }
:global(.dark) .home-stat-card::after,
:global(.dark) .home-nav-card::after { opacity: 0.25; }

@media (max-width: 1023px) {
  .home-source-links { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .home-stat-grid { grid-template-columns: repeat(5, minmax(7rem, 1fr)); overflow-x: auto; padding: 0 0.35rem 0.65rem 0; }
  .home-nav-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 639px) {
  .home-hero { min-height: 0; grid-template-columns: 1fr; padding: 1.1rem; border-radius: 1.3rem; }
  .home-hero__mark { position: absolute; right: -1.5rem; bottom: -2rem; width: 8rem; opacity: 0.18; }
  .home-hero p { max-width: 82%; }
  .home-announcement-card__action { font-size: 0; }
  .home-announcement-card__action b { font-size: 1rem; }
  .home-source-links { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
  .home-source-link { min-height: 3.5rem; padding: 0.65rem 0.55rem; font-size: 0.78rem; }
  .home-source-link:first-child { grid-column: 1 / -1; }
  .home-section-heading { align-items: start; }
  .home-section-heading p { display: none; }
  .home-stat-grid { grid-template-columns: repeat(5, 7rem); margin-right: -0.75rem; }
  .home-stat-card { min-height: 6.2rem; border-radius: 1.1rem; }
  .home-nav-grid { grid-template-columns: 1fr; gap: 0.85rem; }
  .home-nav-card { min-height: 6rem; padding: 0.9rem; border-radius: 1.15rem; }
  .home-nav-card__body h3 { font-size: 1rem; }
  .home-disclaimer-card { border-radius: 1.4rem; }
}
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
}
:deep(.prose-announcement table.cols-2 td:first-child),
:deep(.prose-announcement table.cols-2 th:first-child) {
  white-space: nowrap;
  width: 130px;
  min-width: 130px;
}
:deep(.prose-announcement table.cols-2 td:nth-child(2)),
:deep(.prose-announcement table.cols-2 th:nth-child(2)) {
  white-space: normal;
  min-width: 200px;
  word-break: break-word;
}
:deep(.prose-announcement table:not(.cols-2) td) {
  white-space: nowrap;
}
:deep(.prose-announcement table.cols-3) {
  width: max-content;
  min-width: 100%;
}
:deep(.prose-announcement table.cols-3 td) {
  min-width: 150px;
}
:deep(.prose-announcement table.cols-8) {
  width: max-content;
  min-width: 100%;
}
:deep(.prose-announcement table.cols-8 th:first-child),
:deep(.prose-announcement table.cols-8 td:first-child) {
  position: sticky;
  left: 0;
  z-index: 2;
  font-weight: 600;
  white-space: nowrap;
  min-width: 90px;
}
:deep(.prose-announcement table.cols-8 th:first-child) {
  z-index: 5;
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
/* Sticky first column (for 2-col, 6-col and 8-col tables) */
:deep(.prose-announcement table.cols-2 th:first-child),
:deep(.prose-announcement table.cols-2 td:first-child),
:deep(.prose-announcement table.cols-6 th:first-child),
:deep(.prose-announcement table.cols-6 td:first-child) {
  position: sticky;
  left: 0;
  z-index: 2;
  font-weight: 600;
}
:deep(.prose-announcement table.cols-2 th:first-child) {
  z-index: 5;
}
:deep(.prose-announcement table.cols-6 th:first-child) {
  z-index: 5;
}
:deep(.prose-light table.cols-2 th:first-child),
:deep(.prose-light table.cols-2 td:first-child),
:deep(.prose-light table.cols-6 th:first-child),
:deep(.prose-light table.cols-6 td:first-child),
:deep(.prose-light table.cols-8 th:first-child),
:deep(.prose-light table.cols-8 td:first-child) {
  background: #fff;
  box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.06);
}
:deep(.prose-dark table.cols-2 th:first-child),
:deep(.prose-dark table.cols-2 td:first-child),
:deep(.prose-dark table.cols-6 th:first-child),
:deep(.prose-dark table.cols-6 td:first-child),
:deep(.prose-dark table.cols-8 th:first-child),
:deep(.prose-dark table.cols-8 td:first-child) {
  background: #1f2937;
  box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.3);
}
:deep(.prose-light table.cols-2 th:first-child),
:deep(.prose-light table.cols-6 th:first-child),
:deep(.prose-light table.cols-8 th:first-child) {
  background: #fdf6e3;
}
:deep(.prose-dark table.cols-2 th:first-child),
:deep(.prose-dark table.cols-6 th:first-child),
:deep(.prose-dark table.cols-8 th:first-child) {
  background: #252d3a;
}
:deep(.prose-light table.cols-2 tr:nth-child(even) td:first-child),
:deep(.prose-light table.cols-6 tr:nth-child(even) td:first-child),
:deep(.prose-light table.cols-8 tr:nth-child(even) td:first-child) {
  background: #fafafa;
}
:deep(.prose-dark table.cols-2 tr:nth-child(even) td:first-child),
:deep(.prose-dark table.cols-6 tr:nth-child(even) td:first-child),
:deep(.prose-dark table.cols-8 tr:nth-child(even) td:first-child) {
  background: #1a2332;
}
:deep(.prose-light table.cols-2 tr:hover td:first-child),
:deep(.prose-light table.cols-6 tr:hover td:first-child),
:deep(.prose-light table.cols-8 tr:hover td:first-child) {
  background: rgba(214, 159, 35, 0.05);
}
:deep(.prose-dark table.cols-2 tr:hover td:first-child),
:deep(.prose-dark table.cols-6 tr:hover td:first-child),
:deep(.prose-dark table.cols-8 tr:hover td:first-child) {
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
:deep(.prose-announcement .element-icon) {
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
  flex-shrink: 0;
}
:deep(.prose-announcement .shiny-wrap) {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  gap: 2px;
  white-space: nowrap;
}
:deep(.prose-announcement table.cols-2 td:first-child .shiny-wrap) {
  font-size: 0;
  gap: 0;
}
:deep(.prose-announcement table.cols-2 td:first-child .shiny-wrap .inline-img) {
  font-size: 0.78rem;
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

/* Mobile optimization for announcement tables */
@media (max-width: 639px) {
  /* cols-2 (传说/通行证/赛季/异色): shrink first column */
  :deep(.prose-announcement table.cols-2 td:first-child),
  :deep(.prose-announcement table.cols-2 th:first-child) {
    width: 90px;
    min-width: 90px;
    max-width: 90px;
    padding: 0.3rem 0.4rem;
    text-align: center;
  }
  :deep(.prose-announcement table.cols-2 th:first-child div[style]),
  :deep(.prose-announcement table.cols-2 td:first-child div[style]) {
    min-width: unset !important;
  }
  :deep(.prose-announcement table.cols-2 td:nth-child(2)),
  :deep(.prose-announcement table.cols-2 th:nth-child(2)) {
    min-width: unset;
    padding-left: 0.4rem;
  }
  :deep(.prose-announcement table.cols-2 .inline-img) {
    width: 32px;
    height: 32px;
  }
  :deep(.prose-announcement .ability-icon) {
    width: 1.4em;
    height: 1.4em;
    vertical-align: -0.3em;
  }
  :deep(.prose-announcement td .pet-icon) {
    width: 22px;
    height: 22px;
  }
  /* cols-6/cols-8: narrow first column with ellipsis */
  :deep(.prose-announcement table.cols-6 td:first-child),
  :deep(.prose-announcement table.cols-6 th:first-child),
  :deep(.prose-announcement table.cols-8 td:first-child),
  :deep(.prose-announcement table.cols-8 th:first-child) {
    max-width: 120px;
    min-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
