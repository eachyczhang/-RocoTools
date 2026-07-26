<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500">← 返回管理首页</router-link>
        <h1 class="font-roco text-xl md:text-2xl text-primary-500 mt-2">版本公告生成</h1>
        <p class="text-sm text-muted mt-1">选择同一项目目录下的两个 SQLite，对比后隐藏无需展示的条目并导出 Markdown。</p>
      </div>
    </div>

    <section class="card space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1" for="patch-directory">数据库目录</label>
        <div class="flex flex-col sm:flex-row gap-2">
          <input id="patch-directory" v-model.trim="directory" class="input flex-1" placeholder="例如 temp/seasons" @keyup.enter="loadDatabases" />
          <button class="btn text-sm" :disabled="loadingDatabases" @click="loadDatabases">
            {{ loadingDatabases ? '读取中…' : '读取 DB 列表' }}
          </button>
        </div>
        <p class="text-xs text-muted mt-1">仅接受项目内相对路径，只读取该目录第一层的 .db 文件，不递归扫描。</p>
      </div>

      <div class="grid md:grid-cols-2 gap-3">
        <label class="block text-sm">
          <span class="block font-medium mb-1">旧版本数据库</span>
          <select v-model="oldDatabase" class="input w-full">
            <option value="">请选择旧版本</option>
            <option v-for="database in databases" :key="`old-${database.name}`" :value="database.name">
              {{ database.name }}（{{ formatSize(database.size) }}）
            </option>
          </select>
        </label>
        <label class="block text-sm">
          <span class="block font-medium mb-1">新版本数据库</span>
          <select v-model="newDatabase" class="input w-full">
            <option value="">请选择新版本</option>
            <option v-for="database in databases" :key="`new-${database.name}`" :value="database.name">
              {{ database.name }}（{{ formatSize(database.size) }}）
            </option>
          </select>
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button class="btn text-sm" :disabled="comparing || !canCompare" @click="compareDatabases">
          {{ comparing ? '正在比对…' : '生成可编辑公告' }}
        </button>
        <span class="text-xs text-muted">比对过程只读，不会修改两个数据库。</span>
      </div>
    </section>

    <template v-if="result">
      <section class="card">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 class="font-roco text-base text-primary-500">公告条目审核</h2>
            <p class="text-xs text-muted mt-1">{{ result.oldDatabase }} → {{ result.newDatabase }}；隐藏操作只影响当前公告草稿。</p>
            <p class="text-xs text-muted mt-1">精简规则：重点新增内容显示图片，批量清单仅显示文字，纯数据补录不写入公告。</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn text-xs" :disabled="!markdown" @click="showPreview = true">公告弹窗预览</button>
            <button class="btn text-xs" :disabled="!markdown" @click="copyMarkdown">
              {{ copied ? '已复制' : '一键复制公告文本' }}
            </button>
            <button class="btn-ghost text-xs" :disabled="hiddenIds.length === 0" @click="restoreAll">恢复全部</button>
            <span class="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">已隐藏 {{ hiddenIds.length }} 条</span>
          </div>
        </div>

        <div class="space-y-4">
          <article v-for="section in result.sections" :key="section.id" class="rounded-xl border border-border p-3">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 class="font-medium">{{ section.title }}</h3>
              <div class="flex items-center gap-2 text-xs">
                <span class="text-muted">显示 {{ visibleCount(section) }} / {{ section.entryCount }}</span>
                <button v-if="section.entryCount" class="text-red-500 hover:text-red-600" @click="hideSection(section)">隐藏本模块条目</button>
              </div>
            </div>
            <div v-if="section.entryCount" class="space-y-2">
              <div
                v-for="entry in entryBlocks(section)"
                :key="entry.id"
                class="flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm"
                :class="isHidden(entry.id) ? 'bg-gray-100 text-muted line-through dark:bg-white/5' : 'bg-surface-2'"
              >
                <div class="min-w-0 flex-1 space-y-2">
                  <div v-if="entry.images?.length" class="flex flex-wrap gap-2">
                    <figure
                      v-for="image in entry.images"
                      :key="`${entry.id}-${image.url}`"
                      class="rounded-lg border border-border bg-white/70 p-1.5 dark:bg-black/10"
                    >
                      <img
                        :src="image.url"
                        :alt="image.label"
                        class="h-16 w-16 object-contain"
                        loading="lazy"
                        @error="hideBrokenImage"
                      />
                      <figcaption class="mt-1 max-w-16 truncate text-center text-[10px] text-muted">{{ image.label }}</figcaption>
                    </figure>
                  </div>
                  <span class="block break-words">{{ entry.label }}</span>
                </div>
                <button v-if="!isHidden(entry.id)" class="shrink-0 text-xs text-red-500 hover:text-red-600" @click="hideEntry(entry.id)">从公告移除</button>
                <button v-else class="shrink-0 text-xs text-primary-500 hover:text-primary-600" @click="restoreEntry(entry.id)">恢复</button>
              </div>
            </div>
            <p v-else class="text-xs text-muted">该模块没有可单独删除的表格条目，将按脚本原样保留。</p>
          </article>
        </div>
      </section>

      <section class="card">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 class="font-roco text-base text-primary-500">最终 Markdown</h2>
            <p class="text-xs text-muted mt-1">可以继续手动修改文案；再次隐藏或恢复条目时，会按筛选结果重新生成这里的内容。</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-ghost text-xs" :disabled="!markdown" @click="showPreview = true">公告弹窗预览</button>
            <button class="btn-ghost text-xs" @click="copyMarkdown">{{ copied ? '已复制' : '一键复制公告文本' }}</button>
            <button class="btn text-xs" @click="downloadMarkdown">下载 Markdown</button>
          </div>
        </div>
        <textarea v-model="markdown" class="input w-full min-h-[420px] font-mono text-xs leading-5" spellcheck="false"></textarea>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showPreview" class="fixed inset-0 z-[300] flex items-center justify-center p-4" @click.self="showPreview = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            :class="isDark ? 'bg-gray-800' : 'bg-white'">
            <div class="flex items-center justify-between px-5 py-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
              <h3 class="font-roco text-base text-primary-500">📢 赛季更新公告预览</h3>
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
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import { useTheme } from '@/composables/useTheme'

const modal = useModal()
const { isDark } = useTheme()
const showPreview = ref(false)
const directory = ref('temp/seasons')
const databases = ref([])
const oldDatabase = ref('')
const newDatabase = ref('')
const loadingDatabases = ref(false)
const comparing = ref(false)
const result = ref(null)
const hiddenIds = ref([])
const markdown = ref('')
const copied = ref(false)

const canCompare = computed(() => oldDatabase.value && newDatabase.value && oldDatabase.value !== newDatabase.value)

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

const previewHtml = computed(() => parseMarkdown(markdown.value))

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function loadDatabases() {
  loadingDatabases.value = true
  try {
    const data = await adminApi.patchNoteDatabases(directory.value)
    directory.value = data.directory
    databases.value = data.databases || []
    if (!databases.value.some(item => item.name === newDatabase.value)) newDatabase.value = databases.value[0]?.name || ''
    if (!databases.value.some(item => item.name === oldDatabase.value) || oldDatabase.value === newDatabase.value) {
      oldDatabase.value = databases.value[1]?.name || ''
    }
    result.value = null
    hiddenIds.value = []
    markdown.value = ''
    if (databases.value.length < 2) await modal.alert('数据库不足', '该目录至少需要两个 .db 文件才能进行版本比对。')
  } catch (error) {
    await modal.alert('读取失败', error.message)
  } finally {
    loadingDatabases.value = false
  }
}

async function compareDatabases() {
  if (!canCompare.value) return
  comparing.value = true
  try {
    result.value = await adminApi.comparePatchNotes(directory.value, oldDatabase.value, newDatabase.value)
    hiddenIds.value = []
    rebuildMarkdown()
  } catch (error) {
    await modal.alert('比对失败', error.message)
  } finally {
    comparing.value = false
  }
}

function entryBlocks(section) {
  return section.blocks.filter(block => block.type === 'entry')
}

function isHidden(id) {
  return hiddenIds.value.includes(id)
}

function visibleCount(section) {
  return entryBlocks(section).filter(entry => !isHidden(entry.id)).length
}

function hideEntry(id) {
  if (!isHidden(id)) hiddenIds.value = [...hiddenIds.value, id]
  rebuildMarkdown()
}

function restoreEntry(id) {
  hiddenIds.value = hiddenIds.value.filter(value => value !== id)
  rebuildMarkdown()
}

function hideSection(section) {
  const ids = entryBlocks(section).map(entry => entry.id)
  hiddenIds.value = [...new Set([...hiddenIds.value, ...ids])]
  rebuildMarkdown()
}

function restoreAll() {
  hiddenIds.value = []
  rebuildMarkdown()
}

function hideBrokenImage(event) {
  const figure = event.target?.closest('figure')
  if (figure) figure.hidden = true
}

function rebuildMarkdown() {
  if (!result.value) return
  const lines = [result.value.header]
  for (const section of result.value.sections) {
    lines.push(section.heading)
    for (const block of section.blocks) {
      if (block.type === 'entry' && isHidden(block.id)) continue
      lines.push(block.markdown)
    }
  }
  if (result.value.footer) lines.push(result.value.footer)
  markdown.value = `${lines.join('\n').trimEnd()}\n`
}

async function copyMarkdown() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown.value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = markdown.value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      textarea.remove()
      if (!success) throw new Error('浏览器未允许复制，请手动选择下方文本')
    }
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1600)
  } catch (error) {
    await modal.alert('复制失败', error.message)
  }
}

function downloadMarkdown() {
  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `patch_notes_${newDatabase.value.replace(/\.db$/i, '')}.md`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

onMounted(loadDatabases)
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
  :deep(.prose-announcement table.cols-2 th:first-child) { width: 90px; min-width: 90px; max-width: 90px; padding: 0.3rem 0.4rem; text-align: center; }
  :deep(.prose-announcement table.cols-2 th:first-child div[style]),
  :deep(.prose-announcement table.cols-2 td:first-child div[style]) { min-width: unset !important; }
  :deep(.prose-announcement table.cols-2 td:nth-child(2)),
  :deep(.prose-announcement table.cols-2 th:nth-child(2)) { min-width: unset; padding-left: 0.4rem; }
  :deep(.prose-announcement table.cols-2 .inline-img) { width: 32px; height: 32px; }
  :deep(.prose-announcement .ability-icon) { width: 1.4em; height: 1.4em; vertical-align: -0.3em; }
  /* cols-6/cols-8: narrow first column with ellipsis */
  :deep(.prose-announcement table.cols-6 td:first-child),
  :deep(.prose-announcement table.cols-6 th:first-child),
  :deep(.prose-announcement table.cols-8 td:first-child),
  :deep(.prose-announcement table.cols-8 th:first-child) { max-width: 120px; min-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
</style>
