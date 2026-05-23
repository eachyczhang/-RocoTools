<template>
  <div>
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h1 class="font-roco text-xl md:text-2xl text-primary-500">素材管理</h1>
      <div class="flex items-center gap-2">
        <input v-model="searchQuery" placeholder="搜索文件名..." class="input text-sm w-40 sm:w-52" />
        <label class="btn text-xs cursor-pointer">
          📷 上传文件
          <input type="file" accept="image/*" multiple class="hidden" @change="handleUpload" />
        </label>
        <label class="btn text-xs cursor-pointer">
          📁 上传文件夹
          <input type="file" webkitdirectory class="hidden" @change="handleFolderUpload" />
        </label>
      </div>
    </div>

    <!-- Category tabs -->
    <div class="flex items-center gap-1 overflow-x-auto pb-2 mb-2">
      <button
        v-for="cat in categories"
        :key="cat.key"
        @click="selectCategory(cat.key)"
        class="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
        :class="currentCategory === cat.key
          ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
          : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'"
      >
        {{ cat.label }}
        <span class="ml-1 text-xs opacity-60">({{ getCategoryCount(cat.key) }})</span>
      </button>
    </div>

    <!-- Sub-category tabs for pets -->
    <div v-if="currentCategory === 'pets'" class="flex items-center gap-1 overflow-x-auto pb-2 mb-4">
      <button
        v-for="sub in petSubCategories"
        :key="sub.key"
        @click="currentPetSub = sub.key"
        class="px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
        :class="currentPetSub === sub.key
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'"
      >
        {{ sub.label }}
        <span class="ml-1 text-[10px] opacity-60">({{ getPetSubCount(sub.key) }})</span>
      </button>
    </div>
    <div v-else class="mb-4"></div>

    <!-- Directory tree and main content -->
    <div class="media-container flex gap-4">
      <!-- Directory tree panel -->
      <div v-if="currentCategory === 'library'" class="w-64 flex-shrink-0">
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium">目录管理</h3>
            <button @click="showCreateDirDialog = true" class="text-xs text-primary-500 hover:text-primary-600">
              + 新建
            </button>
          </div>
          
          <!-- Directory management -->
          <div class="space-y-3">
            <!-- Current directory path -->
            <div class="text-xs text-muted">
              <span v-if="!currentDirectory">根目录</span>
              <span v-else>
                <span class="cursor-pointer hover:text-primary-500" @click="selectDirectory('')">根目录</span>
                <span v-for="(part, index) in currentDirectory.split('/')" :key="index">
                  / 
                  <span 
                    class="cursor-pointer hover:text-primary-500" 
                    @click="selectDirectory(currentDirectory.split('/').slice(0, index + 1).join('/'))"
                  >
                    {{ part }}
                  </span>
                </span>
              </span>
            </div>
            
            <!-- Directory tree -->
            <div class="space-y-1 max-h-96 overflow-y-auto">
              <DirectoryTree 
                :directories="directories" 
                :current-directory="currentDirectory"
                @select-directory="selectDirectory"
                @rename-directory="openRenameDirDialog"
                @delete-directory="openDeleteDirDialog"
              />
              
              <div v-if="directories.length === 0" class="text-xs text-muted text-center py-2">
                暂无目录
              </div>
            </div>
          </div>
          
          <!-- Current directory path -->
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted">
                <span class="font-medium">当前目录:</span>
                <span 
                  class="cursor-pointer hover:text-primary-500 ml-1"
                  :class="{ 'truncate': !showFullPath }"
                  :title="currentDirectory || '根目录'"
                  @click="showFullPath = !showFullPath"
                >
                  {{ showFullPath ? (currentDirectory || '根目录') : ((currentDirectory && currentDirectory.length > 25) ? currentDirectory.substring(0, 25) + '...' : (currentDirectory || '根目录')) }}
                </span>
              </div>
              <div v-if="currentDirectory" class="flex items-center gap-1">
                <button 
                  @click="copyToClipboard(currentDirectory)"
                  class="text-xs text-primary-500 hover:text-primary-600 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="复制完整路径"
                >
                  📋
                </button>
                <button 
                  @click="showFullPath = !showFullPath"
                  class="text-xs text-primary-500 hover:text-primary-600 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  :title="showFullPath ? '收起路径' : '展开完整路径'"
                >
                  {{ showFullPath ? '🔺' : '🔻' }}
                </button>
              </div>
            </div>
            <button 
              v-if="currentDirectory" 
              @click="currentDirectory = ''"
              class="text-xs text-primary-500 hover:text-primary-600 mt-1"
            >
              返回根目录
            </button>
          </div>
        </div>
      </div>

      <!-- Main content area -->
      <div class="flex-1">
        <!-- Stats bar -->
        <div class="flex items-center justify-between text-xs text-muted mb-3">
          <span>共 {{ filteredFiles.length }} 张图片{{ selectedFiles.size > 0 ? ' · 已选 ' + selectedFiles.size + ' 张' : '' }}</span>
          <div class="flex items-center gap-2">
            <button v-if="isLibraryCategory" @click="selectAllPage" class="text-primary-500 hover:underline">{{ isAllPageSelected ? '取消全选' : '全选本页' }}</button>
            <button v-if="selectedFiles.size > 0" @click="batchDelete" class="text-red-500 hover:underline">批量删除</button>
<button v-if="selectedFiles.size > 0 && isLibraryCategory" @click="openBatchRenameDialog" class="text-primary-500 hover:underline">批量重命名</button>
            <button v-if="selectedFiles.size > 0" @click="selectedFiles.clear()" class="text-muted hover:underline">取消选择</button>
            <select v-model="pageSize" class="input text-xs w-20" @change="currentPage = 1">
              <option :value="36">36/页</option>
              <option :value="72">72/页</option>
              <option :value="120">120/页</option>
              <option :value="0">全部</option>
            </select>
            <button @click="toggleViewMode" class="text-muted hover:text-foreground">
              {{ viewMode === 'grid' ? '📋 列表' : '🖼️ 网格' }}
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-10 text-muted">
          <div class="animate-pulse">加载中...</div>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredFiles.length === 0" class="text-center py-10">
          <div class="text-3xl mb-2">🖼️</div>
          <p class="text-muted text-sm">{{ searchQuery ? '未找到匹配的图片' : '该分类下暂无图片' }}</p>
        </div>

        <!-- Grid view -->
        <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          <div
            v-for="file in currentPageFiles"
            :key="file.fullPath"
            class="group relative rounded-xl overflow-hidden border transition-all cursor-pointer"
            :class="[
              selectedFiles.has(file.fullPath)
                ? 'border-primary-500 shadow-lg shadow-primary-500/20 ring-2 ring-primary-500/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500',
            ]"
            @click.exact="openPreview(file.url)"
            @click.ctrl="toggleSelect(file)"
            @click.meta="toggleSelect(file)"
            :title="!isLibraryCategory ? '该分类下的图片受保护，不可批量操作' : ''"
          >
            <div class="aspect-square bg-gray-100 dark:bg-gray-800">
              <img 
                :src="file.thumb_path || file.url" 
                class="w-full h-full object-cover" 
                loading="lazy" 
                @error="handleImageError($event)"
                @load="handleImageLoad($event)"
              />
            </div>
            <!-- Overlay on hover -->
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
              <div class="w-full p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="text-white text-[10px] truncate">{{ file.displayName }}</p>
                <p class="text-white/60 text-[9px]">{{ formatSize(file.size) }}</p>
              </div>
            </div>
            <!-- Select checkbox (only for library category) -->
            <div v-if="isLibraryCategory" class="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              :class="{ '!opacity-100': selectedFiles.has(file.fullPath) }">
              <button
                @click.stop="toggleSelect(file)"
                class="w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-colors"
                :class="selectedFiles.has(file.fullPath)
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'bg-white/80 border-gray-400 text-transparent hover:border-primary-500'"
              >✓</button>
            </div>
            <!-- Category badge -->
            <div class="absolute top-1.5 right-1.5">
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white/80 backdrop-blur-sm">
                {{ file.categoryLabel }}
              </span>
            </div>
            <!-- Delete button -->
            <button
              @click.stop="deleteFile(file)"
              class="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs items-center justify-center hidden group-hover:flex hover:bg-red-600"
            >×</button>
          </div>
        </div>

        <!-- List view -->
        <div v-else class="space-y-1">
          <div
            v-for="file in currentPageFiles"
            :key="file.fullPath"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
          >
            <button v-if="isLibraryCategory" @click="toggleSelect(file)" class="flex-shrink-0">
              <span class="w-5 h-5 rounded border-2 flex items-center justify-center text-xs"
                :class="selectedFiles.has(file.fullPath)
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'border-gray-300 dark:border-gray-600'">
                {{ selectedFiles.has(file.fullPath) ? '✓' : '' }}
              </span>
            </button>
            <span v-else class="w-5 flex-shrink-0"></span>
            <div class="w-10 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 cursor-pointer"
              @click="openPreview(file.url)">
              <img 
                :src="file.thumb_path || file.url" 
                class="w-full h-full object-cover" 
                loading="lazy" 
                @error="handleImageError($event)"
                @load="handleImageLoad($event)"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm truncate">{{ file.displayName }}</p>
              <p class="text-xs text-muted">{{ file.categoryLabel }} · {{ formatSize(file.size) }} · {{ formatTime(file.mtime) }}</p>
            </div>
            <div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="copyPath(file)" class="text-xs text-muted hover:text-primary-500" title="复制路径">📋</button>
              <button @click="deleteFile(file)" class="text-xs text-red-500 hover:text-red-600" title="删除">🗑️</button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination-container flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="currentPage = 1"
            :disabled="currentPage === 1"
            class="px-2 py-1 rounded text-xs transition-colors"
            :class="currentPage === 1 ? 'text-muted cursor-not-allowed' : 'text-foreground hover:bg-gray-100 dark:hover:bg-white/10'"
          >«</button>
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-2 py-1 rounded text-xs transition-colors"
            :class="currentPage === 1 ? 'text-muted cursor-not-allowed' : 'text-foreground hover:bg-gray-100 dark:hover:bg-white/10'"
          >‹</button>
          <template v-for="p in visiblePages" :key="p">
            <span v-if="p === '...'" class="text-xs text-muted px-1">…</span>
            <button
              v-else
              @click="currentPage = p"
              class="w-7 h-7 rounded text-xs font-medium transition-colors"
              :class="currentPage === p
                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
                : 'text-muted hover:bg-gray-100 dark:hover:bg-white/10'"
            >{{ p }}</button>
          </template>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-2 py-1 rounded text-xs transition-colors"
            :class="currentPage === totalPages ? 'text-muted cursor-not-allowed' : 'text-foreground hover:bg-gray-100 dark:hover:bg-white/10'"
          >›</button>
          <button
            @click="currentPage = totalPages"
            :disabled="currentPage === totalPages"
            class="px-2 py-1 rounded text-xs transition-colors"
            :class="currentPage === totalPages ? 'text-muted cursor-not-allowed' : 'text-foreground hover:bg-gray-100 dark:hover:bg-white/10'"
          >»</button>
        </div>
      </div>
    </div>

    <!-- Upload progress overlay -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="uploadProgress" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-80">
            <h3 class="text-sm font-medium mb-3">上传中...</h3>
            <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div class="h-full bg-primary-500 transition-all duration-300 rounded-full"
                :style="{ width: (uploadProgress.current / uploadProgress.total * 100) + '%' }"></div>
            </div>
            <p class="text-xs text-muted text-center">{{ uploadProgress.current }} / {{ uploadProgress.total }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Folder prompt dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="folderPrompt" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="cancelFolderPrompt">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-96">
            <h3 class="text-sm font-medium mb-1">选择目标目录</h3>
            <p class="text-xs text-muted mb-3">即将上传 {{ folderPrompt.desc }}，请指定存放的子目录（留空则存入素材库根目录）</p>
            <div class="flex items-center gap-1 mb-3">
              <span class="text-xs text-muted whitespace-nowrap">uploads/library/</span>
              <input v-model="folderInputValue" class="input flex-1 text-sm" placeholder="子目录名（如 icons、pets/shiny）" @keyup.enter="confirmFolderPrompt" />
            </div>
            <div class="flex justify-end gap-2">
              <button @click="cancelFolderPrompt" class="btn-ghost text-xs">取消</button>
              <button @click="confirmFolderPrompt" class="btn text-xs">确认上传</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Dialogs -->
    <Teleport to="body">
      <!-- Create directory dialog -->
      <Transition name="fade">
        <div v-if="showCreateDirDialog" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="showCreateDirDialog = false">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-96">
            <h3 class="text-sm font-medium mb-1">新建目录</h3>
            <p class="text-xs text-muted mb-3">请输入新目录的名称（支持多级目录，如：icons/pets）</p>
            <div class="space-y-4">
              <div class="text-sm text-muted">
                <span v-if="!currentDirectory">将在根目录下创建</span>
                <span v-else>将在目录 <span class="text-primary-600">{{ currentDirectory }}</span> 下创建</span>
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-1">目录名</label>
                <input 
                  v-model="newDirPath" 
                  type="text" 
                  class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="输入目录名称"
                  @keyup.enter="createDirectory"
                />
              </div>
              
              <div class="flex gap-2 justify-end">
                <button @click="showCreateDirDialog = false" class="px-4 py-2 border rounded hover:bg-gray-50">取消</button>
                <button @click="createDirectory" class="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600">创建</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Rename directory dialog -->
      <Transition name="fade">
        <div v-if="showRenameDirDialog" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="showRenameDirDialog = null">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-96">
            <h3 class="text-sm font-medium mb-1">重命名目录</h3>
            <p class="text-xs text-muted mb-3">请输入新的目录名称</p>
            <input v-model="renameDirName" class="input text-sm mb-3" placeholder="新目录名称" @keyup.enter="renameDirectory" />
            <div class="flex justify-end gap-2">
              <button @click="showRenameDirDialog = null" class="btn-ghost text-xs">取消</button>
              <button @click="renameDirectory" class="btn text-xs">重命名</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Delete directory dialog -->
      <Transition name="fade">
        <div v-if="showDeleteDirDialog" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="showDeleteDirDialog = null">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-96">
            <h3 class="text-sm font-medium mb-1">删除目录</h3>
            <p class="text-xs text-muted mb-3">确定要删除目录「{{ showDeleteDirDialog?.name }}」吗？此操作不可恢复。<br><span class="text-red-500">注意：如果目录非空，将清空所有内容。</span></p>
            <div class="flex justify-end gap-2">
              <button @click="showDeleteDirDialog = null" class="btn-ghost text-xs">取消</button>
              <button @click="deleteDirectory" class="btn-danger text-xs">删除</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Batch rename dialog -->
      <Transition name="fade">
        <div v-if="showBatchRenameDialog" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="showBatchRenameDialog = false">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-96 max-h-[80vh] overflow-y-auto">
            <h3 class="text-sm font-medium mb-1">批量重命名</h3>
            <p class="text-xs text-muted mb-3">已选择 {{ selectedFiles.size }} 个文件，请输入新的命名规则</p>
            
            <div class="space-y-2 mb-3">
              <div class="flex items-center gap-2">
                <input v-model="batchRenamePattern" class="input text-sm flex-1" placeholder="新文件名模板（支持 {index}、{name}）" />
                <button @click="batchRenamePattern = 'file_{index}'" class="text-xs text-primary-500 hover:underline">重置</button>
              </div>
              <div class="text-xs text-muted">
                可用变量：{index} - 序号，{name} - 原文件名（不含扩展名）
              </div>
            </div>
            
            <div class="text-xs font-medium mb-1">预览：</div>
            <div class="space-y-1 max-h-32 overflow-y-auto text-xs">
              <div v-for="(file, index) in batchRenamePreview" :key="file.fullPath" class="flex items-center justify-between">
                <span class="truncate flex-1">{{ file.oldName }}</span>
                <span class="text-muted mx-2">→</span>
                <span class="truncate flex-1 text-primary-600">{{ file.newName }}</span>
              </div>
            </div>
            
            <div class="flex justify-end gap-2 mt-3">
              <button @click="showBatchRenameDialog = false" class="btn-ghost text-xs">取消</button>
              <button @click="executeBatchRename" class="btn text-xs">确认重命名</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch, nextTick, h } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import { useImagePreview } from '@/composables/useImagePreview'

const modal = useModal()
const { openPreview } = useImagePreview()

const loading = ref(false)
const allFiles = ref([])
const currentCategory = ref('all')
const searchQuery = ref('')
const viewMode = ref('grid')
const selectedFiles = reactive(new Set())
const currentPage = ref(1)
const pageSize = ref(24) // 减少每页数量，减轻带宽压力
const uploadProgress = ref(null)
const currentPageFiles = ref([]) // 当前页的实际图片数据
const totalFiles = ref(0) // 后端分页的总文件数
const totalPages = ref(1) // 后端分页的总页数

// Directory management
const directories = ref([])
const currentDirectory = ref('')
const showCreateDirDialog = ref(false)
const newDirPath = ref('')
const showRenameDirDialog = ref(null)
const renameDirName = ref('')
const showDeleteDirDialog = ref(null)

// Batch rename
const showBatchRenameDialog = ref(false)
const batchRenamePattern = ref('file_{index}')

const categories = [
  { key: 'all', label: '全部' },
  { key: 'library', label: '素材库' },
  { key: 'pets', label: '精灵' },
  { key: 'pika', label: '皮卡月刊' },
  { key: 'seasons', label: '赛季' },
  { key: 'events', label: '活动' },
  { key: 'skills', label: '技能' },
  { key: 'elements', label: '属性' },
]

const petSubCategories = [
  { key: 'all', label: '全部' },
  { key: 'default', label: '高清立绘' },
  { key: 'thumb', label: '缩略图' },
  { key: 'shiny', label: '异色' },
  { key: 'fruit', label: '果实' },
  { key: 'egg', label: '精灵蛋' },
  { key: 'ability', label: '特性图标' },
  { key: 'other', label: '其他' },
]

const currentPetSub = ref('all')

// Computed properties
const isLibraryCategory = computed(() => currentCategory.value === 'library')
const isAllPageSelected = computed(() => {
  if (!currentPageFiles.value.length) return false
  return currentPageFiles.value.every(f => selectedFiles.has(f.fullPath))
})

const batchRenamePreview = computed(() => {
  if (!batchRenamePattern.value || selectedFiles.size === 0) return []
  
  const selectedFileList = Array.from(selectedFiles).map(path => 
    allFiles.value.find(f => f.fullPath === path)
  ).filter(Boolean)
  
  return selectedFileList.map((file, index) => {
    const oldName = file.filename
    const nameWithoutExt = oldName.replace(/\.[^.]+$/, '')
    const ext = oldName.match(/\.[^.]+$/)?.[0] || ''
    
    let newName = batchRenamePattern.value
      .replace(/{index}/g, (index + 1).toString().padStart(3, '0'))
      .replace(/{name}/g, nameWithoutExt)
    
    newName += ext
    
    return {
      oldName: oldName,
      newName: newName,
      fullPath: file.fullPath
    }
  })
})

// Methods
async function loadDirectories() {
  if (currentCategory.value !== 'library') return
  
  try {
    const res = await adminApi.libraryDirectories()
    directories.value = res.directories || []
  } catch (err) {
    console.error('加载目录失败:', err)
  }
}

function selectDirectory(path) {
  currentDirectory.value = path
  currentPage.value = 1
  selectedFiles.clear()
}

  // Create directory
  async function createDirectory() {
    if (!newDirPath.value.trim()) {
      await modal.alert('请输入目录名')
      return
    }
    
    // 构建完整路径
    const fullPath = currentDirectory.value 
      ? currentDirectory.value + '/' + newDirPath.value.trim()
      : newDirPath.value.trim()
    
    try {
      await adminApi.createLibraryDirectory(fullPath)
      await modal.success('创建成功', '目录已创建')
      showCreateDirDialog.value = false
      newDirPath.value = ''
      await loadDirectories()
    } catch (err) {
      await modal.alert('创建失败', err.message)
    }
  }

function openRenameDirDialog(dir) {
  showRenameDirDialog.value = dir
  renameDirName.value = dir.name
}

async function renameDirectory() {
  if (!showRenameDirDialog.value || !renameDirName.value.trim()) return
  
  try {
    await adminApi.renameLibraryDirectory(
      showRenameDirDialog.value.path,
      renameDirName.value.trim()
    )
    showRenameDirDialog.value = null
    renameDirName.value = ''
    await loadDirectories()
    await modal.success('重命名成功', '目录已重命名')
  } catch (err) {
    await modal.alert('重命名失败', err.message)
  }
}

function openDeleteDirDialog(dir) {
  showDeleteDirDialog.value = dir
}

async function deleteDirectory() {
  if (!showDeleteDirDialog.value) return
  
  try {
    // 检查目录是否为空
    const filesInDirectory = allFiles.value.filter(f => {
      if (f.category !== 'library') return false
      const filePath = f.fullPath.replace('/uploads/library/', '')
      const dirPath = showDeleteDirDialog.value.path
      
      // 检查文件是否在当前目录或其子目录中
      if (filePath.startsWith(dirPath + '/')) {
        const remainingPath = filePath.substring(dirPath.length + 1)
        // 如果是当前目录的直接文件，或者是在子目录中的文件
        return true
      }
      return false
    })
    
    // 如果目录非空，显示二次确认
    if (filesInDirectory.length > 0) {
      const confirmed = await modal.confirm(
        '清空目录确认',
        `目录「${showDeleteDirDialog.value.name}」中包含 ${filesInDirectory.length} 个文件。\n\n此操作将永久删除目录及其所有内容，不可恢复。\n\n确定要继续吗？`,
        { confirmText: '清空目录', cancelText: '取消', type: 'danger' }
      )
      
      if (!confirmed) {
        showDeleteDirDialog.value = null
        return
      }
    }
    
    await adminApi.deleteLibraryDirectory(showDeleteDirDialog.value.path)
    showDeleteDirDialog.value = null
    await loadDirectories()
    await modal.success('删除成功', '目录及所有内容已删除')
  } catch (err) {
    let errorMessage = err.message
    // 尝试从错误信息中提取更具体的错误描述
    if (errorMessage.includes('目录不存在')) {
      errorMessage = '目录不存在或已被删除'
    } else if (errorMessage.includes('路径非法')) {
      errorMessage = '目录路径不合法'
    } else if (errorMessage.includes('删除目录失败')) {
      // 保留后端返回的具体错误信息
      errorMessage = err.message
    }
    await modal.alert('删除失败', errorMessage)
  }
}

function openBatchRenameDialog() {
  if (selectedFiles.size === 0) return
  showBatchRenameDialog.value = true
  batchRenamePattern.value = 'file_{index}'
}

async function executeBatchRename() {
  if (batchRenamePreview.value.length === 0) return
  
  const operations = batchRenamePreview.value.map(item => ({
    oldPath: item.fullPath,
    newName: item.newName
  }))
  
  try {
    const res = await adminApi.batchRenameFiles(operations)
    showBatchRenameDialog.value = false
    await modal.success('批量重命名成功', `${res.results.filter(r => r.success).length} 个文件已重命名`)
    await loadAllMedia()
    selectedFiles.clear()
  } catch (err) {
    await modal.alert('批量重命名失败', err.message)
  }
}

// Existing methods (keep the same)
function getFileCategory(filePath) {
  if (filePath.includes('/library/')) return 'library'
  if (filePath.includes('/pets/') || filePath.includes('/thumbs/')) return 'pets'
  if (filePath.includes('/pika/')) return 'pika'
  if (filePath.includes('/seasons/')) return 'seasons'
  if (filePath.includes('/events/')) return 'events'
  if (filePath.includes('/skills/')) return 'skills'
  if (filePath.includes('/elements/')) return 'elements'
  return 'library'
}

function getPetSubCategory(filePath) {
  if (filePath.includes('/pets/thumbs/')) return 'thumb'
  if (filePath.includes('/pets/default/')) return 'default'
  if (filePath.includes('/pets/shiny/')) return 'shiny'
  if (filePath.includes('/pets/fruit/')) return 'fruit'
  if (filePath.includes('/pets/egg/')) return 'egg'
  if (filePath.includes('/pets/abilities/')) return 'ability'
  return 'other'
}

function getPetSubCount(key) {
  const petFiles = allFiles.value.filter(f => f.category === 'pets')
  if (key === 'all') return petFiles.length
  return petFiles.filter(f => f.petSub === key).length
}

function selectCategory(key) {
  currentCategory.value = key
  currentPetSub.value = 'all'
  currentDirectory.value = ''
  selectedFiles.clear()
}

function getCategoryLabel(cat) {
  const found = categories.find(c => c.key === cat)
  return found ? found.label : cat
}

function getCategoryCount(key) {
  if (key === 'all') return allFiles.value.length
  return allFiles.value.filter(f => f.category === key).length
}

const filteredFiles = computed(() => {
  let files = allFiles.value
  
  // Filter by category
  if (currentCategory.value !== 'all') {
    files = files.filter(f => f.category === currentCategory.value)
  }
  
  // Filter by pet sub-category
  if (currentCategory.value === 'pets' && currentPetSub.value !== 'all') {
    files = files.filter(f => f.petSub === currentPetSub.value)
  }
  
  // Filter by directory (library category only)
  if (currentCategory.value === 'library' && currentDirectory.value) {
    files = files.filter(f => {
      // 精确匹配当前目录下的文件，不包括子目录
      const filePath = f.fullPath.replace('/uploads/library/', '')
      const dirPath = currentDirectory.value
      
      // 文件路径应该以当前目录开头，且下一级就是文件名（没有更深层目录）
      if (filePath.startsWith(dirPath + '/')) {
        const remainingPath = filePath.substring(dirPath.length + 1)
        // 如果剩余路径中不包含斜杠，说明是当前目录的直接文件
        return !remainingPath.includes('/')
      }
      return false
    })
  }
  
  // Filter by search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    files = files.filter(f => f.displayName.toLowerCase().includes(q) || f.fullPath.toLowerCase().includes(q))
  }
  
  return files
})

// 使用后端分页数据，不再需要前端计算
// const totalPages = computed(() => {
//   if (pageSize.value === 0) return 1
//   return Math.max(1, Math.ceil(filteredFiles.value.length / pageSize.value))
// })



// 监听分页变化，重新加载数据
watch([currentPage, pageSize], () => {
  loadAllMedia()
}, { immediate: true })

// 预加载下一页图片
function preloadNextPage() {
  if (currentPage.value >= totalPages.value) return
  
  const nextPageStart = currentPage.value * pageSize.value
  const nextPageEnd = nextPageStart + pageSize.value
  const nextPageFiles = filteredFiles.value.slice(nextPageStart, nextPageEnd)
  
  // 异步预加载图片
  setTimeout(() => {
    nextPageFiles.forEach(file => {
      const img = new Image()
      img.src = file.url
    })
  }, 100) // 延迟100ms，避免阻塞当前页加载
}

// 滚动监听，当接近底部时预加载下一页
function setupScrollListener() {
  const container = document.querySelector('.media-container')
  if (!container) return
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && currentPage.value < totalPages.value) {
        preloadNextPage()
      }
    })
  }, {
    rootMargin: '200px' // 提前200px触发预加载
  })
  
  // 观察分页组件
  const paginationElement = document.querySelector('.pagination-container')
  if (paginationElement) {
    observer.observe(paginationElement)
  }
}

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

// Watch for category changes to load directories
watch(currentCategory, () => {
  if (currentCategory.value === 'library') {
    loadDirectories()
  }
})

// Existing methods...
function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

function selectAllPage() {
  if (isAllPageSelected.value) {
    currentPageFiles.value.forEach(f => selectedFiles.delete(f.fullPath))
  } else {
    currentPageFiles.value.forEach(f => {
      if (f.category === 'library') selectedFiles.add(f.fullPath)
    })
  }
}

function toggleSelect(file) {
  if (file.category !== 'library') return
  if (selectedFiles.has(file.fullPath)) {
    selectedFiles.delete(file.fullPath)
  } else {
    selectedFiles.add(file.fullPath)
  }
}

async function loadAllMedia() {
  loading.value = true
  try {
    let res
    
    // 如果是素材库分类，使用素材库API的分页
    if (currentCategory.value === 'library') {
      res = await adminApi.libraryList({
        page: currentPage.value,
        pageSize: pageSize.value
      })
    } else {
      // 其他分类使用主媒体API的分页
      res = await adminApi.mediaList({
        page: currentPage.value,
        pageSize: pageSize.value
      })
    }
    
    // 如果是第一页，初始化文件列表
    if (currentPage.value === 1) {
      allFiles.value = []
    }
    
    // 添加新加载的文件
    const newFiles = (res.files || []).map(f => {
      const category = getFileCategory(f.fullPath || f.path)
      return {
        ...f,
        category,
        categoryLabel: getCategoryLabel(category),
        petSub: category === 'pets' ? getPetSubCategory(f.fullPath || f.path) : null,
        displayName: f.filename.replace(/^\d+_/, ''),
        fullPath: f.fullPath || f.path // 兼容两种API返回格式
      }
    })
    
    allFiles.value = [...allFiles.value, ...newFiles]
    
    // 更新分页信息
    totalFiles.value = res.total || 0
    totalPages.value = res.totalPages || 1
    
    // 更新当前页文件
    currentPageFiles.value = newFiles
    
    if (currentCategory.value === 'library') {
      await loadDirectories()
    }
  } catch (err) {
    await modal.alert('加载失败', err.message)
  } finally {
    loading.value = false
  }
}

// 后端分页已处理，不再需要前端分页函数

// Upload methods...
async function handleUpload(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  
  loading.value = true
  uploadProgress.value = { current: 0, total: files.length }
  
  try {
    // 先加载现有文件列表，用于冲突检测
    const existingFiles = await adminApi.mediaList()
    const existingPaths = new Set(existingFiles.files.map(f => f.fullPath))
    
    let uploadedCount = 0
    let skippedFiles = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileName = file.name
      const targetPath = currentDirectory.value ? currentDirectory.value + '/' + fileName : fileName
      const fullTargetPath = '/uploads/library/' + targetPath
      
      // 检查文件是否已存在
      if (existingPaths.has(fullTargetPath)) {
        skippedFiles.push(targetPath)
        uploadProgress.value.current = i + 1
        continue
      }
      
      await adminApi.libraryUpload(file, currentDirectory.value || undefined)
      uploadedCount++
      uploadProgress.value.current = i + 1
    }
    
    let message = `上传完成！成功上传 ${uploadedCount} 张图片`
    if (skippedFiles.length > 0) {
      message += `，跳过 ${skippedFiles.length} 个已存在的文件`
      if (skippedFiles.length <= 5) {
        message += `：${skippedFiles.join('、')}`
      } else {
        message += `（前5个：${skippedFiles.slice(0, 5).join('、')}...）`
      }
    }
    
    await modal.success('上传完成', message)
    await loadAllMedia()
  } catch (err) {
    await modal.alert('上传失败', '已上传 ' + uploadProgress.value.current + '/' + files.length + '，错误: ' + err.message)
  } finally {
    loading.value = false
    uploadProgress.value = null
    e.target.value = ''
  }
}

async function handleFolderUpload(e) {
  const allEntries = Array.from(e.target.files || [])
  const files = allEntries.filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f.name))
  if (!files.length) {
    await modal.alert('无图片', '所选文件夹中没有找到图片文件（支持 PNG/JPEG/WebP/GIF）')
    e.target.value = ''
    return
  }
  
  loading.value = true
  uploadProgress.value = { current: 0, total: files.length }
  
  try {
    let createdDirectories = new Set()
    let skippedFiles = []
    let uploadedCount = 0
    
    // 先加载现有文件列表，用于冲突检测
    const existingFiles = await adminApi.mediaList()
    const existingPaths = new Set(existingFiles.files.map(f => f.fullPath))
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const relativePath = file.webkitRelativePath || ''
      const parts = relativePath.split('/')
      const subDirs = parts.slice(1, -1).join('/')
      const targetFolder = currentDirectory.value ? (subDirs ? currentDirectory.value + '/' + subDirs : currentDirectory.value) : subDirs
      const fileName = parts[parts.length - 1]
      
      // 构建目标文件路径
      const targetPath = targetFolder ? targetFolder + '/' + fileName : fileName
      const fullTargetPath = '/uploads/library/' + targetPath
      
      // 检查文件是否已存在
      if (existingPaths.has(fullTargetPath)) {
        skippedFiles.push(targetPath)
        uploadProgress.value.current = i + 1
        continue
      }
      
      // 记录创建的目录
      if (targetFolder && !createdDirectories.has(targetFolder)) {
        createdDirectories.add(targetFolder)
      }
      
      await adminApi.libraryUpload(file, targetFolder || undefined)
      uploadedCount++
      uploadProgress.value.current = i + 1
    }
    
    let message = `上传完成！成功上传 ${uploadedCount} 张图片`
    if (skippedFiles.length > 0) {
      message += `，跳过 ${skippedFiles.length} 个已存在的文件`
      if (skippedFiles.length <= 5) {
        message += `：${skippedFiles.join('、')}`
      } else {
        message += `（前5个：${skippedFiles.slice(0, 5).join('、')}...）`
      }
    }
    
    await modal.success('上传完成', message)
    
    // 上传完成后刷新目录树
    await loadDirectories()
    
    // 如果有上传到新目录，自动切换到第一个创建的目录
    if (createdDirectories.size > 0) {
      const firstCreatedDir = Array.from(createdDirectories)[0]
      currentDirectory.value = firstCreatedDir
      currentPage.value = 1
      selectedFiles.clear()
    }
    
    await loadAllMedia()
  } catch (err) {
    await modal.alert('上传失败', '已上传 ' + uploadProgress.value.current + '/' + files.length + '，错误: ' + err.message)
  } finally {
    loading.value = false
    uploadProgress.value = null
    e.target.value = ''
  }
}

async function handleFileUpload(e) {
  const files = Array.from(e.target.files || []).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f.name))
  if (!files.length) {
    await modal.alert('无图片', '请选择图片文件（PNG/JPEG/WebP/GIF）')
    e.target.value = ''
    return
  }
  
  loading.value = true
  uploadProgress.value = { current: 0, total: files.length }
  
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      await adminApi.libraryUpload(file, currentDirectory.value || undefined)
      uploadProgress.value.current = i + 1
    }
    
    await modal.success('上传成功', files.length + ' 张图片已上传到素材库' + (currentDirectory.value ? '/' + currentDirectory.value : ''))
    await loadAllMedia()
  } catch (err) {
    await modal.alert('上传失败', '已上传 ' + uploadProgress.value.current + '/' + files.length + '，错误: ' + err.message)
  } finally {
    loading.value = false
    uploadProgress.value = null
    e.target.value = ''
  }
}

async function deleteFile(file) {
  const ok = await modal.danger('删除图片', '确定删除「' + file.displayName + '」？此操作不可恢复。')
  if (!ok) return
  try {
    await adminApi.mediaDelete(file.fullPath)
    selectedFiles.delete(file.fullPath)
    await loadAllMedia()
  } catch (err) {
    let errorMessage = err.message
    if (errorMessage.includes('文件不存在')) {
      errorMessage = '文件不存在或已被删除'
    }
    await modal.alert('删除失败', errorMessage)
  }
}

async function batchDelete() {
  const count = selectedFiles.size
  const ok = await modal.danger('批量删除', '确定删除选中的 ' + count + ' 张图片？此操作不可恢复。')
  if (!ok) return
  try {
    const paths = [...selectedFiles]
    await Promise.all(paths.map(p => adminApi.mediaDelete(p)))
    selectedFiles.clear()
    await modal.success('删除成功', count + ' 张图片已删除')
    await loadAllMedia()
  } catch (err) {
    let errorMessage = err.message
    if (errorMessage.includes('文件不存在')) {
      errorMessage = '部分文件不存在或已被删除'
    }
    await modal.alert('删除失败', errorMessage)
  }
}

function copyPath(file) {
  navigator.clipboard.writeText(file.url)
}

function formatSize(b) {
  if (!b) return '—'
  if (b < 1024) return b + 'B'
  if (b < 1048576) return (b / 1024).toFixed(1) + 'KB'
  return (b / 1048576).toFixed(1) + 'MB'
}

function formatTime(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('zh-CN')
}

// 图片加载处理
function handleImageError(event) {
  const img = event.target
  img.style.opacity = '0.3'
  img.title = '图片加载失败'
}

function handleImageLoad(event) {
  const img = event.target
  img.style.opacity = '1'
}

// 复制文本到剪贴板
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    await modal.success('复制成功', '目录路径已复制到剪贴板')
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    await modal.success('复制成功', '目录路径已复制到剪贴板')
  }
}

// 切换完整路径显示状态
const showFullPath = ref(false)

onMounted(() => {
  loadAllMedia()
  // 等待DOM渲染完成后设置滚动监听
  nextTick(() => {
    setupScrollListener()
  })
})

// 递归目录树组件
const DirectoryTree = {
  name: 'DirectoryTree',
  props: {
    directories: Array,
    currentDirectory: String,
    level: {
      type: Number,
      default: 0
    }
  },
  emits: ['select-directory', 'rename-directory', 'delete-directory'],
  setup(props, { emit }) {
    const expanded = ref({})

    const toggleExpand = (dirPath) => {
      expanded.value[dirPath] = !expanded.value[dirPath]
    }

    const handleSelect = (dirPath) => {
      emit('select-directory', dirPath)
    }

    const handleRename = (dir) => {
      emit('rename-directory', dir)
    }

    const handleDelete = (dir) => {
      emit('delete-directory', dir)
    }

    return {
      expanded,
      toggleExpand,
      handleSelect,
      handleRename,
      handleDelete
    }
  },
  render() {
    const { directories, currentDirectory, level, expanded, toggleExpand, handleSelect, handleRename, handleDelete } = this
    
    return h('div', directories.map(dir => {
      const isExpanded = expanded[dir.path]
      const hasChildren = dir.children && dir.children.length > 0
      
      return h('div', { 
        key: dir.path,
        class: 'directory-item',
        style: { marginLeft: level * 12 + 'px' }
      }, [
        // 目录项
        h('div', {
          class: [
            'group flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors',
            currentDirectory === dir.path 
              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'
          ],
          onClick: () => handleSelect(dir.path)
        }, [
          // 展开/收起按钮
          hasChildren ? h('button', {
            class: 'w-3 h-3 flex items-center justify-center text-[10px]',
            onClick: (e) => {
              e.stopPropagation()
              toggleExpand(dir.path)
            }
          }, isExpanded ? '▼' : '▶') : h('span', { class: 'w-3' }),
          
          h('span', '📁'),
          h('span', { class: 'truncate flex-1' }, dir.name),
          
          // 操作按钮
          h('div', { class: 'opacity-0 group-hover:opacity-100 flex gap-1' }, [
            h('button', {
              onClick: (e) => {
                e.stopPropagation()
                handleRename(dir)
              },
              class: 'hover:text-primary-500',
              title: '重命名'
            }, '✏️'),
            h('button', {
              onClick: (e) => {
                e.stopPropagation()
                handleDelete(dir)
              },
              class: 'hover:text-red-500',
              title: '删除'
            }, '🗑️')
          ])
        ]),
        
        // 子目录
        isExpanded && hasChildren ? h(DirectoryTree, {
          directories: dir.children,
          currentDirectory: currentDirectory,
          level: level + 1,
          onSelectDirectory: handleSelect,
          onRenameDirectory: handleRename,
          onDeleteDirectory: handleDelete
        }) : null
      ].filter(Boolean))
    }))
  }
}
</script>
