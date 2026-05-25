<template>
  <div>
    <!-- 赛季选择器 -->
    <div v-if="allSeasons.length > 1" class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto mb-5 sm:mb-6 pb-1 pt-2">
      <button v-for="s in allSeasons" :key="s.id" @click="switchSeason(s)"
        class="relative flex flex-col items-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap flex-shrink-0 border"
        :class="currentId === s.id
          ? 'bg-primary-500/15 border-primary-500/40 text-primary-600 dark:bg-primary-400/15 dark:border-primary-400/40 dark:text-primary-400 shadow-sm'
          : 'border-transparent text-muted hover:bg-gray-100 dark:hover:bg-white/5 hover:border-gray-200 dark:hover:border-white/10'">
        <!-- S几 编号（直接用数据库配置的id） -->
        <span class="text-[11px] sm:text-xs font-bold tracking-widest mb-0.5"
          :class="currentId === s.id ? 'text-primary-500 dark:text-primary-400' : 'text-muted'">
          {{ s.id }}
        </span>
        <!-- 赛季名称 -->
        <span class="text-xs sm:text-sm font-medium leading-tight">{{ s.name }}</span>
        <!-- 当前赛季标识 -->
        <span v-if="s.is_current"
          class="absolute -top-1.5 -right-1 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary-500 text-white shadow-sm">
          <span class="w-1 h-1 rounded-full bg-white/80 animate-pulse"></span>
          当前
        </span>
      </button>
    </div>

    <div v-if="season && !switching">
      <!-- 赛季头部 -->
      <div class="relative mb-6 sm:mb-8 rounded-2xl overflow-hidden" style="aspect-ratio: 16/7;">
        <!-- 背景图 / 渐变占位 -->
        <div class="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-primary-400/10 to-transparent">
          <img v-if="season.image" :src="season.image" class="w-full h-full object-cover object-center" />
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-5 sm:p-6 md:p-8">
          <div>
            <div class="text-sm sm:text-base font-medium text-white/80 mb-1">{{ season.id }}</div>
            <h1 class="font-roco text-3xl sm:text-4xl md:text-5xl text-primary-300 drop-shadow-lg">{{ season.name }}</h1>
            <div v-if="season.start_date || season.end_date" class="text-sm sm:text-base text-white/70 mt-2">
              {{ season.start_date || '?' }} ~ {{ season.end_date || '?' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 赛季详情公告横幅 -->
      <div v-if="announcementData.text" @click="showAnnouncement = true"
        class="mb-5 sm:mb-6 card !py-3 !px-4 border-l-4 border-l-primary-500 hover:border-primary-500/50 transition-colors group cursor-pointer">
        <div class="flex items-center gap-2">
          <span class="text-base">📢</span>
          <span class="text-sm sm:text-base font-medium group-hover:text-primary-500 transition-colors">{{ announcementData.text }}</span>
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
              <div class="flex items-center justify-between px-5 py-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
                <h3 class="font-roco text-base text-primary-500">📢 赛季更新公告</h3>
                <button @click="showAnnouncement = false" class="text-muted hover:text-primary-500 text-xl leading-none">&times;</button>
              </div>
              <div class="flex-1 overflow-y-auto px-5 py-4 prose-announcement" :class="isDark ? 'prose-dark' : 'prose-light'" v-html="announcementHtml"></div>
              <div class="px-5 py-3 border-t flex items-center justify-between" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
                <a v-if="announcementData.url" :href="announcementData.url" target="_blank" rel="noopener noreferrer"
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

      <!-- 通行证精灵 -->
      <div v-if="passPetList.length" class="mb-6 sm:mb-8">
        <h2 class="font-roco text-lg sm:text-xl text-primary-500 mb-3 sm:mb-4">通行证精灵</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <router-link v-for="pet in passPetList" :key="pet.uid" :to="`/pets/${pet.uid}`"
            class="card group flex items-center gap-4 !p-4 hover:border-primary-500/30 transition-all">
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
              <img :src="pet.thumb_url || pet.image_url" class="w-full h-full object-contain group-hover:scale-105 transition-transform"
                :class="{ 'group-hover:opacity-0': shinyMap[pet.uid] }" />
              <img v-if="shinyMap[pet.uid]" :src="shinyMap[pet.uid]"
                class="absolute inset-0 w-full h-full object-contain transition-all opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-105" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-roco text-base sm:text-lg group-hover:text-primary-500 transition-colors">{{ pet.name }}</div>
              <div class="flex items-center gap-1.5 mt-2">
                <img v-if="pet.element_icon" :src="pet.element_icon" class="w-5 h-5" />
                <span class="text-xs sm:text-sm">{{ pet.element_name }}</span>
                <template v-if="pet.sub_element_icon">
                  <img :src="pet.sub_element_icon" class="w-5 h-5 ml-1" />
                  <span class="text-xs sm:text-sm">{{ pet.sub_element_name }}</span>
                </template>
              </div>
              <div class="text-xs sm:text-sm text-muted mt-1">种族值 {{ pet.total }}</div>
            </div>
          </router-link>
        </div>
      </div>

      <!-- 传说精灵 -->
      <div v-if="legendPets.length" class="mb-6 sm:mb-8">
        <h2 class="font-roco text-lg sm:text-xl text-primary-500 mb-3 sm:mb-4">传说精灵</h2>
        <div class="space-y-3">
          <router-link v-for="legendPet in legendPets" :key="legendPet.uid" :to="'/pets/' + legendPet.uid"
            class="card group flex flex-col sm:flex-row items-center gap-4 sm:gap-6 !p-5 sm:!p-6 hover:border-primary-500/30 transition-all bg-gradient-to-br from-primary-50/30 to-transparent dark:from-primary-500/5">
            <div class="relative w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0">
              <img :src="legendPet.thumb_url || legendPet.image_url"
                class="w-full h-full object-contain group-hover:scale-105 transition-transform"
                :class="{ 'group-hover:opacity-0': shinyMap[legendPet.uid] }" />
              <img v-if="shinyMap[legendPet.uid]" :src="shinyMap[legendPet.uid]"
                class="absolute inset-0 w-full h-full object-contain transition-all opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-105" />
            </div>
            <div class="flex-1 min-w-0 text-center sm:text-left">
              <div class="font-roco text-xl sm:text-2xl group-hover:text-primary-500 transition-colors">{{ legendPet.name }}</div>
              <div class="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                <span v-if="legendPet.element_icon" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs sm:text-sm"
                  :style="{ background: legendPet.element_color + '18', color: legendPet.element_color }">
                  <img :src="legendPet.element_icon" class="w-4 h-4" /> {{ legendPet.element_name }}
                </span>
                <span v-if="legendPet.sub_element_icon" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs sm:text-sm"
                  :style="{ background: legendPet.sub_element_color + '18', color: legendPet.sub_element_color }">
                  <img :src="legendPet.sub_element_icon" class="w-4 h-4" /> {{ legendPet.sub_element_name }}
                </span>
              </div>
              <div class="text-sm text-muted mt-2">种族值 <span class="font-bold text-primary-500">{{ legendPet.total }}</span></div>
              <div v-if="legendPet.ability_name" class="text-xs sm:text-sm text-muted mt-1">特性：{{ legendPet.ability_name }}</div>
            </div>
          </router-link>
        </div>
      </div>

<!-- 赛季奇遇精灵 -->
      <div v-if="seasonPetList.length" class="mb-6 sm:mb-8">
<h2 class="font-roco text-lg sm:text-xl text-primary-500 mb-1 sm:mb-2">赛季奇遇精灵</h2>
        <p class="text-xs sm:text-sm text-muted mb-3 sm:mb-4">仅当赛季可捕捉，拥有异色版本，赛季结束后异色仅可通过孵蛋获取</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          <PetCard v-for="pet in seasonPetList" :key="pet.uid" :pet="pet" :shiny-url="shinyMap[pet.uid]" />
        </div>
      </div>

<!-- 赛季奇遇异色精灵 -->
      <div v-if="shinyPetList.length">
<h2 class="font-roco text-lg sm:text-xl text-primary-500 mb-1 sm:mb-2">赛季奇遇异色精灵</h2>
        <p class="text-xs sm:text-sm text-muted mb-3 sm:mb-4">日常可捕捉的精灵，当赛季可在野外获取其异色版本，赛季结束后异色仅可通过孵蛋获取</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          <PetCard v-for="pet in shinyPetList" :key="pet.uid" :pet="pet" :shiny-url="shinyMap[pet.uid]" />
        </div>
      </div>

      <!-- 赛季备注 -->
      <div v-if="season.note" class="mt-6 sm:mt-8 card">
        <p class="text-sm text-muted">{{ season.note }}</p>
      </div>
    </div>

    <!-- 无赛季 -->
    <div v-else-if="loaded && !switching" class="text-center mt-20">
      <div class="text-3xl mb-3">🏖️</div>
      <p class="text-muted">暂无赛季信息</p>
    </div>

    <div v-else class="text-muted text-center mt-20">
      <div class="animate-pulse">加载中...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { petsApi, seasonsApi } from '@/api'
import { useTheme } from '@/composables/useTheme'
import PetCard from '@/components/shared/PetCard.vue'

const { isDark } = useTheme()
const allSeasons = ref([])
const season = ref(null)
const currentId = ref('')
const loaded = ref(false)
const switching = ref(false)
const legendPets = ref([])
const passPetList = ref([])
const seasonPetList = ref([])
const shinyPetList = ref([])
const shinyMap = ref({})

async function loadPetsByUids(uids) {
  if (!uids || !uids.length) return []
  const results = await Promise.allSettled(
    uids.filter(Boolean).map(uid => petsApi.get(uid))
  )
  return results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
}

const showAnnouncement = ref(false)
const announcementData = ref({ url: '', text: '', content: '' })

function parseMarkdown(md) {
  if (!md) return ''
  const lines = md.split('\n')
  let html = ''
  let inTable = false
  let inList = false
  let listType = ''
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (/^---+$/.test(line.trim())) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      html += '<hr/>'; continue
    }
    const hm = line.match(/^(#{1,6})\s+(.+)$/)
    if (hm) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      html += `<h${hm[1].length}>${inlineFormat(hm[2])}</h${hm[1].length}>`; continue
    }
    if (line.startsWith('> ')) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      html += `<blockquote>${inlineFormat(line.slice(2))}</blockquote>`; continue
    }
    if (line.includes('|') && line.trim().startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      if (cells.every(c => /^[-:]+$/.test(c))) continue
      if (!inTable) {
        if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
        inTable = true
        html += '<div class="table-wrap"><table><thead><tr>' + cells.map(c => `<th>${inlineFormat(c)}</th>`).join('') + '</tr></thead><tbody>'
        continue
      }
      html += '<tr>' + cells.map(c => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>'; continue
    } else if (inTable) { html += '</tbody></table></div>'; inTable = false }
    if (/^[-*]\s+/.test(line.trim())) {
      if (!inList || listType !== 'ul') { if (inList) html += listType === 'ul' ? '</ul>' : '</ol>'; html += '<ul>'; inList = true; listType = 'ul' }
      html += `<li>${inlineFormat(line.trim().replace(/^[-*]\s+/, ''))}</li>`; continue
    }
    if (/^\d+\.\s+/.test(line.trim())) {
      if (!inList || listType !== 'ol') { if (inList) html += listType === 'ul' ? '</ul>' : '</ol>'; html += '<ol>'; inList = true; listType = 'ol' }
      html += `<li>${inlineFormat(line.trim().replace(/^\d+\.\s+/, ''))}</li>`; continue
    }
    if (inList && line.trim() === '') { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false; continue }
    if (line.trim() === '') continue
    if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
    html += `<p>${inlineFormat(line)}</p>`
  }
  if (inList) html += listType === 'ul' ? '</ul>' : '</ol>'
  if (inTable) html += '</tbody></table></div>'
  return html
}
function inlineFormat(text) {
  return text
    .replace(/!\[pet:([^\]]+)\]/g, '<img class="inline-icon pet-icon" src="/public/pets/thumbs/$1_default.webp" alt="" loading="lazy" />')
    .replace(/!\[skill:([^\]]+)\]/g, '<img class="inline-icon skill-icon" src="/public/skills/icons/$1.png" alt="" loading="lazy" />')
    .replace(/!\[ability:([^\]]+)\]/g, '<img class="inline-icon ability-icon" src="$1" alt="" loading="lazy" />')
    .replace(/!\[img:([^\]]+)\]/g, '<img class="inline-img" src="$1" alt="" loading="lazy" />')
    .replace(/!\[shiny:([^\]]+)\]/g, '<span class="shiny-wrap">异色：<img class="inline-img" src="/public/pets/shiny/$1_shiny.webp" alt="" loading="lazy" onerror="this.closest(&#39;.shiny-wrap&#39;).style.display=&#39;none&#39;"/></span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}
const announcementHtml = computed(() => parseMarkdown(announcementData.value.content))

async function loadSeasonData(s) {
  announcementData.value = {
    url: s.announcement_url || '',
    text: s.announcement_text || '',
    content: s.announcement_content || '',
  }
  showAnnouncement.value = false
  season.value = s
  currentId.value = s.id
  legendPets.value = []
  passPetList.value = []
  seasonPetList.value = []
  shinyPetList.value = []

  // 将 legend_pet 字段解析为数组（兼容旧单值格式）
  function parseLegendPet(val) {
    if (!val) return []
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch { return [val] }
  }

  const [legendUids, pass, sPets, shPets] = await Promise.all([
    Promise.resolve(parseLegendPet(s.legend_pet)),
    loadPetsByUids(s.pass_pets || []),
    loadPetsByUids(s.season_pets || []),
    loadPetsByUids(s.shiny_pets || []),
  ])
  legendPets.value = (await loadPetsByUids(legendUids)).filter(Boolean)
  passPetList.value = pass
  seasonPetList.value = sPets
  shinyPetList.value = shPets
}

function switchSeason(s) {
  if (currentId.value === s.id || switching.value) return
  switching.value = true
  loadSeasonData(s).finally(() => { switching.value = false })
}

onMounted(async () => {
  try {
    // 加载异色映射
    const shinyList = await petsApi.shiny()
    const map = {}
    if (Array.isArray(shinyList)) {
      for (const s of shinyList) map[s.uid] = s.image_shiny
    }
    shinyMap.value = map

    // 加载所有赛季
    const res = await seasonsApi.list()
    allSeasons.value = res.seasons || []

    // 默认展示当前赛季，没有则展示最新的
    const current = allSeasons.value.find(s => s.is_current)
    if (current) {
      await loadSeasonData(current)
    } else if (allSeasons.value.length) {
      await loadSeasonData(allSeasons.value[0])
    }
  } catch (err) { console.error("[Page] 加载失败:", err) }
  loaded.value = true
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div:last-child { transform: scale(0.95) translateY(8px); }
.modal-leave-to > div:last-child { transform: scale(0.95) translateY(8px); }

:deep(.prose-announcement) { font-size: 0.85rem; line-height: 1.65; }
:deep(.prose-light) { color: #374151; }
:deep(.prose-dark) { color: #e5e7eb; }
:deep(.prose-announcement h1) { font-size: 1.2rem; font-weight: 700; margin: 0 0 0.5rem; color: #D69F23; font-family: 'MIANFEIZITI', 'PingFang SC', sans-serif; }
:deep(.prose-announcement h2) { font-size: 1rem; font-weight: 700; margin: 1.5rem 0 0.6rem; padding: 0.4rem 0.75rem; border-radius: 6px; border-left: 3px solid #D69F23; }
:deep(.prose-light h2) { background: rgba(214,159,35,0.08); color: #92700C; }
:deep(.prose-dark h2) { background: rgba(255,202,40,0.1); color: #FFCA28; }
:deep(.prose-announcement h3) { font-size: 0.9rem; font-weight: 600; margin: 0.9rem 0 0.2rem; padding-left: 0.5rem; border-left: 2px solid #D69F23; }
:deep(.prose-dark h3) { color: #fde68a; }
:deep(.prose-announcement p) { margin: 0.3rem 0; }
:deep(.prose-announcement blockquote) { margin: 0.5rem 0 1rem; padding: 0.4rem 0.75rem; border-left: 3px solid #D69F23; border-radius: 0 6px 6px 0; font-size: 0.78rem; }
:deep(.prose-light blockquote) { background: rgba(214,159,35,0.06); color: #6b7280; }
:deep(.prose-dark blockquote) { background: rgba(255,202,40,0.06); color: #9ca3af; }
:deep(.prose-announcement ul), :deep(.prose-announcement ol) { margin: 0.3rem 0; padding-left: 1.2rem; }
:deep(.prose-announcement li) { margin: 0.15rem 0; line-height: 1.6; }
:deep(.prose-announcement ul li) { list-style: disc; }
:deep(.prose-announcement ol li) { list-style: decimal; }
:deep(.prose-light li::marker) { color: #D69F23; }
:deep(.prose-dark li::marker) { color: #FFCA28; }
:deep(.prose-announcement strong) { font-weight: 600; }
:deep(.prose-light strong) { color: #1f2937; }
:deep(.prose-dark strong) { color: #f9fafb; }
:deep(.prose-announcement code) { padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.78rem; }
:deep(.prose-light code) { background: rgba(214,159,35,0.1); color: #92700C; }
:deep(.prose-dark code) { background: rgba(255,202,40,0.12); color: #fde68a; }
:deep(.prose-announcement .table-wrap) { overflow-x: auto; margin: 0.75rem 0; border-radius: 8px; border: 1px solid; }
:deep(.prose-light .table-wrap) { border-color: #e5e7eb; }
:deep(.prose-dark .table-wrap) { border-color: #2d3548; }
:deep(.prose-announcement table) { width: 100%; border-collapse: collapse; font-size: 0.78rem; white-space: nowrap; }
:deep(.prose-announcement th) { font-weight: 600; padding: 0.45rem 0.6rem; text-align: left; }
:deep(.prose-light th) { background: #fdf6e3; color: #92700C; border-bottom: 2px solid rgba(214,159,35,0.3); }
:deep(.prose-dark th) { background: #252d3a; color: #FFCA28; border-bottom: 2px solid rgba(255,202,40,0.2); }
:deep(.prose-announcement td) { padding: 0.4rem 0.6rem; }
:deep(.prose-light td) { border-bottom: 1px solid #f3f4f6; }
:deep(.prose-dark td) { border-bottom: 1px solid #1e2433; }
:deep(.prose-light tr:nth-child(even) td) { background: #fafafa; }
:deep(.prose-dark tr:nth-child(even) td) { background: rgba(255,255,255,0.02); }
:deep(.prose-announcement hr) { margin: 1.25rem 0; border: none; }
:deep(.prose-light hr) { border-top: 1px solid #e5e7eb; }
:deep(.prose-dark hr) { border-top: 1px solid #2d3548; }
:deep(.prose-announcement hr + p) { text-align: center; font-size: 0.8rem; padding: 0.6rem 1rem; border-radius: 6px; margin-top: 0.5rem; }
:deep(.prose-light hr + p) { background: rgba(214,159,35,0.06); color: #92700C; border: 1px dashed rgba(214,159,35,0.3); }
:deep(.prose-dark hr + p) { background: rgba(255,202,40,0.06); color: #FFCA28; border: 1px dashed rgba(255,202,40,0.25); }
:deep(.prose-announcement a) { color: #D69F23; text-decoration: underline; text-underline-offset: 2px; }
:deep(.prose-announcement .inline-icon) { display: inline-block; vertical-align: middle; border-radius: 4px; object-fit: contain; margin: 0 2px; }
:deep(.prose-announcement .pet-icon) { width: 24px; height: 24px; border-radius: 50%; }
:deep(.prose-light .pet-icon) { background: rgba(214,159,35,0.08); border: 1px solid rgba(214,159,35,0.2); }
:deep(.prose-dark .pet-icon) { background: rgba(255,202,40,0.08); border: 1px solid rgba(255,202,40,0.2); }
:deep(.prose-announcement .skill-icon) { width: 20px; height: 20px; }
:deep(.prose-announcement .ability-icon) { width: 2em; height: 2em; vertical-align: -0.5em; object-fit: contain; margin: 0 2px; }
:deep(.prose-announcement .inline-img) { display: inline-block; vertical-align: middle; width: 56px; height: 56px; object-fit: contain; border-radius: 6px; margin: 0 3px; }
</style>
