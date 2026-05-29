<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">赛季管理</h1>

    <!-- 赛季列表 + 新增 + 保存/删除 -->
    <div class="flex items-center gap-2 mb-4 flex-wrap">
      <SearchSelect
        v-model="currentSeasonId"
        :options="seasonOptions"
        placeholder="选择赛季"
        class="w-56"
        @update:model-value="loadSeason"
      />
      <button @click="showCreate = true" class="btn text-xs">+ 新增赛季</button>
      <!-- 保存/删除：有赛季时显示 -->
      <template v-if="season">
        <div class="flex-1"></div>
        <button
          @click="deleteSeason"
          class="text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:bg-red-700 border border-red-500 rounded-lg px-4 py-1.5 transition-colors shadow-sm"
        >🗑 删除赛季</button>
        <button
          @click="save"
          :disabled="saving"
          class="text-sm font-semibold text-white bg-green-600 hover:bg-green-500 active:bg-green-700 border border-green-500 rounded-lg px-5 py-1.5 transition-colors shadow-sm disabled:opacity-50"
        >{{ saving ? '保存中...' : '✓ 保存配置' }}</button>
      </template>
    </div>

    <!-- 新增赛季弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreate" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="closeCreate">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            :class="isDark ? 'bg-gray-800' : 'bg-white'">
            <!-- 顶部色条 -->
            <div class="h-1 bg-primary-500"></div>
            <div class="p-5 md:p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-roco text-base text-primary-500 font-bold">新增赛季</h2>
                <button @click="closeCreate" class="text-muted hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
              </div>
              <div class="space-y-3">
                <div>
                  <label class="text-xs text-muted block mb-1">赛季ID <span class="text-red-500">*</span></label>
                  <input v-model="newSeason.id" class="input w-full" placeholder="如 S1、S2" />
                </div>
                <div>
                  <label class="text-xs text-muted block mb-1">赛季名称 <span class="text-red-500">*</span></label>
                  <input v-model="newSeason.name" class="input w-full" placeholder="如 第一赛季" />
                </div>
                <div>
                  <label class="text-xs text-muted block mb-1">设为当前赛季</label>
                  <select v-model="newSeason.is_current" class="select w-full">
                    <option :value="1">是</option>
                    <option :value="0">否</option>
                  </select>
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-5">
                <button @click="closeCreate" class="btn-ghost text-sm">取消</button>
                <button @click="createSeason" class="btn text-sm" :disabled="creating">{{ creating ? '创建中...' : '创建赛季' }}</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 赛季详情编辑 -->
    <div v-if="season" class="space-y-4">

      <!-- Hero：封面 + 基本信息叠加 -->
      <div class="card overflow-hidden !p-0">
        <!-- 背景图区域 -->
        <div class="relative w-full" style="aspect-ratio: 16/7; min-height: 180px;">
          <!-- 背景图 -->
          <img v-if="form.image" :src="form.image" class="absolute inset-0 w-full h-full object-cover cursor-zoom-in" @click="openPreview(form.image)" />
          <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-900/30 to-gray-800/60 flex items-center justify-center">
            <span class="text-xs text-muted">暂无封面</span>
          </div>
          <!-- 渐变遮罩：双层，底部更深确保表单可读 -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10"></div>
          <div class="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent"></div>

          <!-- 叠加内容：底部信息区 -->
          <div class="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            <!-- 第一行：赛季ID + 名称大字展示 -->
            <div class="flex items-end gap-3 mb-4">
              <span class="font-roco text-3xl md:text-4xl font-black text-yellow-400 drop-shadow-lg leading-none tracking-wide">{{ season.id }}</span>
              <input
                v-model="form.name"
                class="font-roco text-xl md:text-2xl font-bold text-white bg-transparent border-b-2 border-white/40 focus:border-yellow-400 outline-none transition-colors pb-0.5 flex-1 min-w-0 placeholder-white/40 drop-shadow"
                placeholder="赛季名称"
              />
              <!-- 当前赛季徽章 -->
              <span
                v-if="form.is_current"
                class="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-400 text-black shadow"
              >当前赛季</span>
            </div>
            <!-- 第二行：其余字段 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
              <!-- 当前赛季切换 -->
              <div>
                <label class="text-xs text-white/70 block mb-1 font-medium">设为当前赛季</label>
                <select v-model="form.is_current" class="w-full text-sm text-white bg-black/50 backdrop-blur-sm hover:bg-black/60 border border-white/40 focus:border-yellow-400 rounded-lg px-2.5 py-1.5 outline-none transition-colors">
                  <option :value="1" class="text-black bg-white">是</option>
                  <option :value="0" class="text-black bg-white">否</option>
                </select>
              </div>
              <!-- 开始日期 -->
              <div>
                <label class="text-xs text-white/70 block mb-1 font-medium">开始日期</label>
                <DatePicker v-model="form.start_date" variant="dark" />
              </div>
              <!-- 结束日期 -->
              <div>
                <label class="text-xs text-white/70 block mb-1 font-medium">结束日期</label>
                <DatePicker v-model="form.end_date" variant="dark" />
              </div>
              <!-- 备注 -->
              <div>
                <label class="text-xs text-white/70 block mb-1 font-medium">备注</label>
                <input v-model="form.note" class="w-full text-sm text-white bg-black/50 backdrop-blur-sm hover:bg-black/60 focus:bg-black/70 border border-white/40 focus:border-yellow-400 rounded-lg px-2.5 py-1.5 outline-none transition-colors placeholder-white/40" placeholder="可选" />
              </div>
            </div>
          </div>

          <!-- 右上角：上传封面按钮 -->
          <div class="absolute top-3 right-3">
            <ImageUploader
              upload-type="season_cover"
              :upload-uid="currentSeasonId"
              btn-class="text-xs text-white/70 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
              upload-label="📷 更换封面"
              @uploaded="onCoverUploaded"
            />
          </div>
        </div>
        <!-- 底部提示 -->
        <div class="px-4 py-2 border-t border-white/5 flex items-center gap-2">
          <span class="text-[10px] text-muted">建议封面尺寸 16:9 &nbsp;·&nbsp; 命名规则：{{ currentSeasonId }}_cover.png</span>
        </div>
      </div>

      <!-- 通行证精灵（2只） -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-3">通行证精灵 <span class="text-xs text-muted font-normal">（2只）</span></h2>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.pass_pets" :key="'pass_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.pass_pets[i]" class="flex-1" />
          </div>
          <button v-if="form.pass_pets.length < 2" @click="form.pass_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

      <!-- 传说精灵 -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-1">传说精灵</h2>
        <p class="text-xs text-muted mb-3">当赛季主推的传说精灵，可配置多只</p>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.legend_pets" :key="'legend_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.legend_pets[i]" class="flex-1" />
            <button @click="form.legend_pets.splice(i, 1)" class="text-xs text-red-400 hover:text-red-600 flex-shrink-0">移除</button>
          </div>
          <button @click="form.legend_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

<!-- 赛季奇遇精灵（8只） -->
      <div class="card">
<h2 class="font-roco text-base text-primary-500 font-bold mb-1">赛季奇遇精灵 <span class="text-xs text-muted font-normal">（8只）</span></h2>
        <p class="text-xs text-muted mb-3">仅当赛季可捕捉，拥有异色版本，赛季结束后异色仅可通过孵蛋获取</p>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.season_pets" :key="'season_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.season_pets[i]" class="flex-1" />
          </div>
          <button v-if="form.season_pets.length < 8" @click="form.season_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

<!-- 赛季奇遇异色精灵（8只） -->
      <div class="card">
<h2 class="font-roco text-base text-primary-500 font-bold mb-1">赛季奇遇异色精灵 <span class="text-xs text-muted font-normal">（8只）</span></h2>
        <p class="text-xs text-muted mb-3">日常可捕捉的精灵，当赛季可在野外获取其异色版本，赛季结束后异色仅可通过孵蛋获取</p>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.shiny_pets" :key="'shiny_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.shiny_pets[i]" class="flex-1" />
          </div>
          <button v-if="form.shiny_pets.length < 8" @click="form.shiny_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

      <!-- 赛季详情公告配置 -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-1">赛季详情公告 <span class="text-xs text-muted font-normal">（可选）</span></h2>
        <p class="text-xs text-muted mb-3">配置后将在赛季详情页顶部显示公告横幅，点击弹窗展示公告正文；通常用于展示本赛季相对上赛季的改动内容</p>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-muted block mb-1">公告文案（横幅显示文字）</label>
            <input v-model="form.announcement_text" class="input w-full" placeholder="如：本赛季有精灵个体值、特性、技能学习面等调整" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">外链地址（可选，有正文时优先弹窗）</label>
            <input v-model="form.announcement_url" class="input w-full" placeholder="https://..." />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs text-muted">公告正文（Markdown 格式，粘贴即可）</label>
              <button v-if="form.announcement_content" @click="openPreviewModal('season')" class="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors">👁 预览效果</button>
            </div>
            <textarea v-model="form.announcement_content" class="input w-full font-mono text-xs" rows="12"
              placeholder="# 标题&#10;&#10;正文内容，支持 Markdown 格式..."></textarea>
            <p class="text-xs text-muted mt-1">支持标题、表格、列表、加粗等 Markdown 语法，用户端点击公告横幅后弹窗展示</p>
          </div>
        </div>
      </div>

      <!-- 首页公告配置 -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-1">首页公告 <span class="text-xs text-muted font-normal">（可选）</span></h2>
        <p class="text-xs text-muted mb-3">配置后将在用户端首页顶部显示公告横幅，点击弹窗展示公告正文；可用于赛季改动摘要或其他通知</p>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-muted block mb-1">公告文案（横幅显示文字）</label>
            <input v-model="form.home_announcement_text" class="input w-full" placeholder="如：S2 狂欢怪谈赛季已开启，点击查看更新内容" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">外链地址（可选，有正文时优先弹窗）</label>
            <input v-model="form.home_announcement_url" class="input w-full" placeholder="https://..." />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs text-muted">公告正文（Markdown 格式，粘贴即可）</label>
              <button v-if="form.home_announcement_content" @click="openPreviewModal('home')" class="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors">👁 预览效果</button>
            </div>
            <textarea v-model="form.home_announcement_content" class="input w-full font-mono text-xs" rows="8"
              placeholder="# 标题&#10;&#10;正文内容，支持 Markdown 格式..."></textarea>
            <p class="text-xs text-muted mt-1">支持标题、表格、列表、加粗等 Markdown 语法，用户端点击公告横幅后弹窗展示</p>
          </div>
        </div>
      </div>

    </div>

    <!-- 公告预览弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showPreview" class="fixed inset-0 z-[200] flex items-center justify-center p-4" @click.self="showPreview = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            :class="isDark ? 'bg-gray-800' : 'bg-white'">
            <div class="flex items-center justify-between px-5 py-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
              <h3 class="font-roco text-base text-primary-500">📢 {{ previewType === 'season' ? '赛季详情公告预览' : '首页公告预览' }}</h3>
              <button @click="showPreview = false" class="text-muted hover:text-primary-500 text-xl leading-none">&times;</button>
            </div>
            <div class="flex-1 overflow-y-auto px-5 py-4 prose-announcement" :class="isDark ? 'prose-dark' : 'prose-light'" v-html="previewHtml"></div>
            <div class="px-5 py-3 border-t flex items-center justify-end" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
              <button @click="showPreview = false" class="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import { useImagePreview } from '@/composables/useImagePreview'
import { useTheme } from '@/composables/useTheme'
import PetPicker from '@/components/shared/PetPicker.vue'
import SearchSelect from '@/components/shared/SearchSelect.vue'
import DatePicker from '@/components/shared/DatePicker.vue'
import ImageUploader from '@/components/shared/ImageUploader.vue'

const { isDark } = useTheme()

const modal = useModal()

const seasonList = ref([])
const currentSeasonId = ref('')
const season = ref(null)
const showCreate = ref(false)
const saving = ref(false)
const creating = ref(false)

function closeCreate() {
  showCreate.value = false
  newSeason.id = ''; newSeason.name = ''; newSeason.is_current = 0
}

const newSeason = reactive({ id: '', name: '', is_current: 0 })

const { openPreview } = useImagePreview()

// --- Announcement preview ---
const showPreview = ref(false)
const previewType = ref('season')

function openPreviewModal(type) {
  previewType.value = type
  showPreview.value = true
}

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
      if (inTable) { html += '</tbody></table></div>'; inTable = false }
      html += '<hr/>'; continue
    }
    const hm = line.match(/^(#{1,6})\s+(.+)$/)
    if (hm) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table></div>'; inTable = false }
      html += `<h${hm[1].length}>${inlineFormat(hm[2])}</h${hm[1].length}>`; continue
    }
    if (line.startsWith('> ')) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table></div>'; inTable = false }
      html += `<blockquote>${inlineFormat(line.slice(2))}</blockquote>`; continue
    }
    if (line.includes('|') && line.trim().startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      if (cells.every(c => /^[-:]+$/.test(c))) continue
      if (!inTable) {
        if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
        inTable = true
        html += `<div class="table-wrap"><table class="cols-${cells.length}"><thead><tr>` + cells.map(c => `<th>${inlineFormat(c)}</th>`).join('') + '</tr></thead><tbody>'
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
    .replace(/!\[element:([^\]]+)\]/g, '<img class="inline-icon element-icon" src="$1" alt="" loading="lazy" />')
    .replace(/!\[ability:([^\]]+)\]/g, '<img class="inline-icon ability-icon" src="$1" alt="" loading="lazy" />')
    .replace(/!\[img:([^\]]+)\]/g, '<img class="inline-img" src="$1" alt="" loading="lazy" />')
    .replace(/!\[shiny:([^\]]+)\]/g, '<span class="shiny-wrap">异色：<img class="inline-img" src="/public/pets/shiny/$1_shiny.webp" alt="" loading="lazy" onerror="this.closest(&#39;.shiny-wrap&#39;).style.display=&#39;none&#39;"/></span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}

const form = reactive({
  name: '', is_current: 0, image: '', start_date: '', end_date: '', note: '',
  announcement_url: '', announcement_text: '', announcement_content: '',
  home_announcement_url: '', home_announcement_text: '', home_announcement_content: '',
  legend_pets: [],
  pass_pets: [],
  season_pets: [],
  shiny_pets: [],
})

const previewHtml = computed(() => {
  const content = previewType.value === 'season' ? form.announcement_content : form.home_announcement_content
  return parseMarkdown(content)
})

// 赛季列表选项（用于 SearchSelect）
const seasonOptions = computed(() =>
  seasonList.value.map(s => ({
    value: s.id,
    label: `${s.name}${s.is_current ? ' ← 当前' : ''}`,
  }))
)

async function loadList(keepCurrent = false) {
  try {
    const res = await adminApi.list('seasons', { limit: 100 })
    seasonList.value = res.rows || []
    // 自动切换到当前赛季（仅首次加载或未指定保持当前选中时）
    if (!keepCurrent || !currentSeasonId.value) {
      const current = seasonList.value.find(s => s.is_current)
      if (current) {
        currentSeasonId.value = current.id
        loadSeason()
      }
    }
  } catch (err) { console.error("[Page] 加载失败:", err) }
}

function loadSeason() {
  const s = seasonList.value.find(x => x.id === currentSeasonId.value)
  if (!s) { season.value = null; return }
  season.value = s
  form.name = s.name
  form.is_current = s.is_current
  form.image = s.image || ''
  form.start_date = s.start_date || ''
  form.end_date = s.end_date || ''
  form.note = s.note || ''
  form.announcement_url = s.announcement_url || ''
  form.announcement_text = s.announcement_text || ''
  form.announcement_content = s.announcement_content || ''
  form.home_announcement_url = s.home_announcement_url || ''
  form.home_announcement_text = s.home_announcement_text || ''
  form.home_announcement_content = s.home_announcement_content || ''
  form.legend_pets = parseLegendPet(s.legend_pet)
  form.pass_pets = safeParseJSON(s.pass_pets)
  form.season_pets = safeParseJSON(s.season_pets)
  form.shiny_pets = safeParseJSON(s.shiny_pets)
}

function safeParseJSON(str) {
  try { return JSON.parse(str || '[]') }
  catch { return [] }
}

// 兼容旧单值格式 "pet_295" 和新数组格式 ["pet_295","pet_152"]
function parseLegendPet(val) {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return [val] // 旧单值字符串
  }
}

async function createSeason() {
  if (!newSeason.id.trim() || !newSeason.name.trim()) {
    await modal.warning('提示', '请填写赛季ID和名称')
    return
  }
  creating.value = true
  try {
    const createdId = newSeason.id.trim()
    // 如果设为当前赛季，先清除其他赛季的 is_current
    if (newSeason.is_current) {
      const others = seasonList.value.filter(s => s.is_current)
      await Promise.all(others.map(s => adminApi.update('seasons', s.id, { is_current: 0 })))
    }
    await adminApi.create('seasons', {
      id: createdId,
      name: newSeason.name.trim(),
      is_current: newSeason.is_current,
      pass_pets: '[]', season_pets: '[]', shiny_pets: '[]',
    })
    closeCreate()
    await loadList()
    currentSeasonId.value = createdId
    loadSeason()
    await modal.success('创建成功', `赛季 ${createdId} 已创建`)
  } catch (err) {
    await modal.alert('创建失败', err.message)
  } finally {
    creating.value = false
  }
}

function onCoverUploaded(path) {
  form.image = path
  loadList(true)
}

async function save() {
  saving.value = true
  try {
    if (form.is_current) {
      const others = seasonList.value.filter(s => s.id !== currentSeasonId.value && s.is_current)
      await Promise.all(others.map(s => adminApi.update('seasons', s.id, { is_current: 0 })))
    }

    await adminApi.update('seasons', currentSeasonId.value, {
      name: form.name,
      is_current: form.is_current,
      image: form.image || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      note: form.note || null,
      announcement_url: form.announcement_url || null,
      announcement_text: form.announcement_text || null,
      announcement_content: form.announcement_content || null,
      home_announcement_url: form.home_announcement_url || null,
      home_announcement_text: form.home_announcement_text || null,
      home_announcement_content: form.home_announcement_content || null,
      legend_pet: JSON.stringify(form.legend_pets.filter(Boolean)),
      pass_pets: JSON.stringify(form.pass_pets.filter(Boolean)),
      season_pets: JSON.stringify(form.season_pets.filter(Boolean)),
      shiny_pets: JSON.stringify(form.shiny_pets.filter(Boolean)),
    })
    await modal.success('保存成功', '赛季配置已更新')
    await loadList(true)
  } catch (err) {
    await modal.alert('保存失败', err.message)
  } finally {
    saving.value = false
  }
}

async function deleteSeason() {
  // 第一次确认
  const ok = await modal.danger(
    '删除赛季',
    `此操作不可恢复！\n\n将永久删除赛季「${season.value?.name}（${currentSeasonId.value}）」及其所有配置数据。\n\n确定要继续吗？`
  )
  if (!ok) return
  // 第二次确认：输入赛季ID
  const input = await modal.prompt(
    '二次确认',
    `请输入赛季ID「${currentSeasonId.value}」以确认删除：`
  )
  if (input !== currentSeasonId.value) {
    if (input !== null) await modal.warning('取消删除', '输入的赛季ID不匹配，已取消删除')
    return
  }
  try {
    await adminApi.delete('seasons', currentSeasonId.value)
    season.value = null
    currentSeasonId.value = ''
    loadList()
  } catch (err) {
    await modal.alert('删除失败', err.message)
  }
}

onMounted(loadList)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-active > div:last-child, .modal-leave-active > div:last-child { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div:last-child { transform: scale(0.95) translateY(8px); }
.modal-leave-to > div:last-child { transform: scale(0.95) translateY(8px); }

/* Announcement preview styles (same as user-facing Season.vue) */
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
:deep(.prose-announcement table) { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
:deep(.prose-announcement table.cols-2) { width: 100%; table-layout: fixed; }
:deep(.prose-announcement table.cols-2 td:first-child), :deep(.prose-announcement table.cols-2 th:first-child) { white-space: nowrap; width: 130px; overflow: visible; }
:deep(.prose-announcement table.cols-2 td:nth-child(2)), :deep(.prose-announcement table.cols-2 th:nth-child(2)) { white-space: normal; word-break: break-word; padding-left: 1rem; }
:deep(.prose-announcement table:not(.cols-2):not(.cols-6) td) { white-space: nowrap; }
:deep(.prose-announcement table.cols-3) { width: max-content; min-width: 100%; }
:deep(.prose-announcement table.cols-3 td) { min-width: 150px; }
:deep(.prose-announcement table.cols-6) { width: max-content; min-width: 100%; }
:deep(.prose-announcement table.cols-6 th:first-child), :deep(.prose-announcement table.cols-6 td:first-child) { position: sticky; left: 0; z-index: 2; font-weight: 600; white-space: nowrap; min-width: 100px; }
:deep(.prose-announcement table.cols-6 th:first-child) { z-index: 5; }
:deep(.prose-light table.cols-6 th:first-child) { background: #fdf6e3; }
:deep(.prose-light table.cols-6 td:first-child) { background: #fff; box-shadow: 2px 0 4px -1px rgba(0,0,0,0.06); }
:deep(.prose-dark table.cols-6 th:first-child) { background: #252d3a; }
:deep(.prose-dark table.cols-6 td:first-child) { background: #1f2937; box-shadow: 2px 0 4px -1px rgba(0,0,0,0.3); }
:deep(.prose-light table.cols-6 tr:nth-child(even) td:first-child) { background: #fafafa; }
:deep(.prose-dark table.cols-6 tr:nth-child(even) td:first-child) { background: #1a2332; }
:deep(.prose-announcement table.cols-6 td:last-child) { white-space: normal; word-break: break-word; min-width: 200px; max-width: 400px; }
:deep(.prose-announcement table.cols-6 th:nth-child(4)), :deep(.prose-announcement table.cols-6 td:nth-child(4)),
:deep(.prose-announcement table.cols-6 th:nth-child(5)), :deep(.prose-announcement table.cols-6 td:nth-child(5)) { min-width: 45px; }
:deep(.prose-announcement table.cols-2 .ability-icon) { width: 1.2em; height: 1.2em; vertical-align: -0.2em; }
:deep(.prose-announcement table.cols-8) { width: max-content; min-width: 100%; }
:deep(.prose-announcement table.cols-8 th:first-child), :deep(.prose-announcement table.cols-8 td:first-child) { position: sticky; left: 0; z-index: 2; font-weight: 600; white-space: nowrap; min-width: 90px; }
:deep(.prose-announcement table.cols-8 th:first-child) { z-index: 5; }
:deep(.prose-light table.cols-8 th:first-child) { background: #fdf6e3; }
:deep(.prose-light table.cols-8 td:first-child) { background: #fff; box-shadow: 2px 0 4px -1px rgba(0,0,0,0.06); }
:deep(.prose-dark table.cols-8 th:first-child) { background: #252d3a; }
:deep(.prose-dark table.cols-8 td:first-child) { background: #1f2937; box-shadow: 2px 0 4px -1px rgba(0,0,0,0.3); }
:deep(.prose-light table.cols-8 tr:nth-child(even) td:first-child) { background: #fafafa; }
:deep(.prose-dark table.cols-8 tr:nth-child(even) td:first-child) { background: #1a2332; }
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
:deep(.prose-announcement .element-icon) { width: 20px; height: 20px; }
:deep(.prose-announcement .ability-icon) { width: 2em; height: 2em; vertical-align: -0.5em; object-fit: contain; margin: 0 2px; }
:deep(.prose-announcement .inline-img) { display: inline-block; vertical-align: middle; width: 56px; height: 56px; object-fit: contain; border-radius: 6px; margin: 0 3px; flex-shrink: 0; }
:deep(.prose-announcement .shiny-wrap) { display: inline-flex; align-items: center; vertical-align: middle; gap: 2px; white-space: nowrap; }
:deep(.prose-announcement table.cols-2 td:first-child .shiny-wrap) { font-size: 0; gap: 0; }
:deep(.prose-announcement table.cols-2 td:first-child .shiny-wrap .inline-img) { font-size: 0.78rem; }

/* Mobile optimization for announcement tables */
@media (max-width: 639px) {
  :deep(.prose-announcement table.cols-2 td:first-child),
  :deep(.prose-announcement table.cols-2 th:first-child) { width: 90px; min-width: 90px; }
  :deep(.prose-announcement table.cols-2 td:nth-child(2)),
  :deep(.prose-announcement table.cols-2 th:nth-child(2)) { padding-left: 0.5rem; }
  :deep(.prose-announcement .inline-img) { width: 40px; height: 40px; }
  :deep(.prose-announcement .ability-icon) { width: 1.4em; height: 1.4em; vertical-align: -0.3em; }
  /* cols-6/cols-8/cols-3: narrow first column with ellipsis */
  :deep(.prose-announcement table.cols-6 td:first-child),
  :deep(.prose-announcement table.cols-6 th:first-child),
  :deep(.prose-announcement table.cols-8 td:first-child),
  :deep(.prose-announcement table.cols-8 th:first-child),
  :deep(.prose-announcement table.cols-3 td:first-child),
  :deep(.prose-announcement table.cols-3 th:first-child) { max-width: 120px; min-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
</style>
