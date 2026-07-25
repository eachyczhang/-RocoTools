<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">返回管理首页</router-link>
    <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-5">
      <div>
        <h1 class="font-roco text-xl md:text-2xl text-primary-500">BWIKI Diff 审核</h1>
        <p class="text-sm text-muted mt-1">按技能、特性、精灵依次审核，决定只更新 import.json。</p>
      </div>
      <button class="btn-ghost text-xs self-start" :disabled="loading" @click="refreshData">刷新暂存数据</button>
    </div>

    <div class="card mb-4 text-sm">
      <div class="flex flex-wrap items-center gap-2">
        <template v-for="(stage, index) in stages" :key="stage.entity">
          <button
            class="flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
            :class="tabClass(stage)"
            :title="stage.locked ? stage.blockedBy : ''"
            @click="activateStage(stage)"
          >
            <span class="flex h-5 w-5 items-center justify-center rounded-full text-xs" :class="activeEntity === stage.entity ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10'">{{ stage.order }}</span>
            <span>{{ stage.label }}</span>
            <span class="text-xs opacity-75">待审 {{ stage.counts.pending }}/{{ stage.counts.total }}</span>
            <span v-if="stage.locked">🔒</span>
            <span v-else-if="stage.counts.pending === 0">✓</span>
          </button>
          <span v-if="index < stages.length - 1" class="text-muted">→</span>
        </template>

    <Teleport to="body">
      <div v-if="associationReview" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="closeAssociation">
        <div class="card w-full max-w-xl space-y-4 bg-white dark:bg-gray-900">
          <h2 class="text-lg font-medium">关联本地精灵</h2>
          <p class="text-sm text-muted">选择本地精灵后重新生成比对，不会直接修改数据库。</p>
          <PetPicker v-model="associationUid" :all-variants="true" placeholder="搜索并选择本地精灵" />
          <div class="flex justify-end gap-2"><button class="btn-ghost text-sm" @click="closeAssociation">取消</button><button class="btn text-sm" :disabled="!associationUid || busy" @click="associateLocalPet">确认关联并继承</button></div>
        </div>
      </div>
    </Teleport>      </div>
      <p class="text-xs text-muted mt-3">后一 Tab 只有在前一 Tab 审核完成后解锁；决定只修改 import.json，不会直接写入数据库。</p>
    </div>

    <div v-if="activeStage" class="card mb-4 py-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="view in REVIEW_VIEWS"
          :key="view.key"
          class="rounded-lg border px-3 py-2 text-sm transition-colors"
          :class="activeView === view.key ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-200 hover:border-primary-300 dark:border-white/10'"
          :disabled="loading"
          @click="activateReviewView(view.key)"
        >
          {{ view.label }} {{ activeStage.counts[view.countKey] || 0 }}
        </button>
      </div>
      <p class="mt-2 text-xs text-muted">默认只显示有差异候选，无差异内容可在“无差异” Tab 中查看。</p>
    </div>

    <div v-if="activeStage && activeStage.selector?.length" class="card mb-4 py-3">
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-sm text-muted" for="wiki-review-selector">&#x5FEB;&#x901F;&#x5B9A;&#x4F4D;</label>
        <select id="wiki-review-selector" v-model="jumpFolderId" class="input flex-1 min-w-[240px]" :disabled="loading" @change="jumpToSelection">
          <option value="">&#x9009;&#x62E9;{{ activeStage.label }}&#x5019;&#x9009;&#xFF08;&#x53EF;&#x6309;&#x540D;&#x79F0;&#x3001;&#x7F16;&#x53F7;&#x6216; UID &#x641C;&#x7D22;&#xFF09;</option>
          <option v-for="item in activeStage.selector" :key="item.folderId" :value="item.folderId">{{ item.label }}</option>
        </select>
      </div>
    </div>
    <div v-if="loading && stages.length === 0" class="card text-center py-10 text-muted">正在读取暂存 Diff…</div>
    <div v-else-if="!activeStage" class="card text-center py-10 text-muted">暂无可审核的暂存数据。</div>
    <div v-else-if="activeStage.reviews.length === 0" class="card text-center py-10">
      <div class="text-2xl mb-2">📭</div>
      <p class="text-muted">{{ activeStage.label }} · {{ activeViewLabel }} · 暂无候选</p>
    </div>

    <template v-else-if="currentReview">
      <div class="flex items-center justify-between mb-3 text-sm">
        <button class="btn-ghost text-xs" :disabled="loading || activePagination.page <= 1" @click="move(-1)">← 上一个</button>
        <div class="text-center">
          <span class="font-medium">{{ activeStage.label }} {{ activePagination.page }} / {{ activePagination.total }}</span>
          <span class="text-muted ml-2">已确认 {{ activeStage.counts.approved }} · 已忽略 {{ activeStage.counts.ignored }} · 待审 {{ activeStage.counts.pending }}</span>
        </div>
        <button class="btn-ghost text-xs" :disabled="loading || activePagination.page >= activePagination.totalPages" @click="move(1)">下一个 →</button>
      </div>

      <section class="card">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-medium text-lg">{{ currentReview.remote.data?.name || currentReview.folderId }}</h2>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="identityClass(currentReview)">{{ identityLabel(currentReview) }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="decisionClass(currentReview)">{{ decisionLabel(currentReview) }}</span>
            </div>
            <p class="text-xs text-muted mt-1">{{ identityMeta(currentReview) }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-if="canAssociateLocalPet(currentReview)" class="btn text-xs" :disabled="busy" @click="openAssociation(currentReview)">关联本地精灵</button>
            <button v-if="canApproveNew(currentReview)" class="btn text-xs" :disabled="busy" @click="approveNew(currentReview)">
              {{ busy ? '处理中...' : newButtonLabel(currentReview) }}
            </button>
            <button v-else-if="canAcceptFields(currentReview)" class="btn text-xs" :disabled="busy || selectedFor(currentReview).length === 0" @click="acceptFields(currentReview)">
              接受选中字段
            </button>
            <button v-else-if="needsManualAbilityDescription(currentReview)" class="btn text-xs" :disabled="busy" @click="confirmAbilityDetail(currentReview)">
              {{ busy ? '加载详情...' : '确认特性详情和图标' }}
            </button>
            <button v-if="canApproveUidMigration(currentReview)" class="btn text-xs" :disabled="busy" @click="approveUidMigration(currentReview)">
              确认 UID 更新
            </button>
            <button v-else-if="canFetchUnchangedPetAssets(currentReview)" class="btn text-xs" :disabled="busy" @click="approvePetAssetsOnly(currentReview)">
              &#x4ECE;&#x5B98;&#x7F51;&#x8865;&#x5145;&#x56FE;&#x7247;&#x5E76;&#x786E;&#x8BA4;
            </button>
            <button v-else-if="canApprovePetAssetsOnly(currentReview)" class="btn text-xs" :disabled="busy" @click="approvePetAssetsOnly(currentReview)">
              {{ busy ? '下载中...' : '下载缺失图片' }}
            </button>
            <button v-else-if="needsPetAssetBackfill(currentReview)" class="btn text-xs" :disabled="busy" @click="backfillPetAssets(currentReview)">
              {{ busy ? '加载中...' : (currentReview.remote.detail ? '刷新图片和详情' : '获取图片和详情') }}
            </button>
            <button v-else-if="canApproveNoChange(currentReview)" class="btn text-xs" :disabled="busy" @click="approveNoChange(currentReview)">
              确认无变化
            </button>
            <button class="btn-ghost text-xs" :disabled="busy" @click="ignore(currentReview)">忽略</button>
            <button v-if="isResolved(currentReview)" class="btn-ghost text-xs" :disabled="busy" @click="reset(currentReview)">撤销决定</button>
          </div>
        </div>

        <div v-if="downloadedAssets(currentReview).length" class="mt-3 rounded-lg bg-green-50 dark:bg-green-500/5 px-3 py-2 text-xs text-green-700 dark:text-green-300">
          已下载 {{ downloadedAssets(currentReview).length }} 个素材：{{ downloadedAssetLabels(currentReview) }}。
        </div>
        <div v-else-if="isNew(currentReview) && currentReview.entity === 'skill'" class="mt-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          新增技能只有在确认后才会下载正式图标。
        </div>
        <div v-if="uidMigration(currentReview)" class="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-500/5 dark:text-blue-300">
          该候选会更新形态 UID，需要单独确认 UID 迁移：
          <strong>{{ uidMigration(currentReview).from }}</strong>
          → <strong>{{ uidMigration(currentReview).to }}</strong>。
        </div>
        <div v-if="currentReview.entity === 'ability' && isNew(currentReview) && !currentReview.remote.detail_source" class="mt-3 rounded-lg bg-blue-50 dark:bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          特性没有独立数据表；确认后会从关联精灵详情获取描述和正式图标，并随关联精灵基础数据导入。
        </div>
        <div v-if="canContinuePetDetail(currentReview)" class="mt-3 flex flex-col gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-500/5 dark:text-blue-300 sm:flex-row sm:items-center sm:justify-between">
          <span>这里处理基础字段和正式图片；技能、描述等详情仍可进入精灵详情继续维护。</span>
          <router-link :to="`/admin/pets/${petEditUid(currentReview)}`" class="btn-ghost whitespace-nowrap text-xs">
            进入精灵详情
          </router-link>
        </div>

        <div v-if="currentReview.diff.identity?.status === 'unmatched' && currentReview.diff.identity?.basis === 'uid-new-form'" class="mt-3 rounded-lg bg-blue-50 dark:bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          远程 UID {{ currentReview.diff.identity.remote?.uid }} 尚未关联本地记录。同编号本地形态仅供参考：{{ (currentReview.diff.identity.candidates || []).map(item => item.uid + ' ' + item.name).join('、') || '无' }}
        </div>

        <div v-if="currentReview.diff.identity?.status === 'ambiguous'" class="mt-3 rounded-lg bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          本地存在多个候选，无法自动判断。请使用“关联本地精灵”选择正确记录，或暂时忽略。
        </div>

        <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div class="mb-3 text-xs font-medium text-muted">当前图表预览</div>
          <div v-if="currentReview.entity === 'skill'" class="flex items-center gap-4">
            <div class="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/5">
              <img v-if="assetUrl(currentReview, 'icon')" :src="assetUrl(currentReview, 'icon')" :alt="currentReview.remote.data?.name" class="h-16 w-16 object-contain" />
              <span v-else class="text-xs text-muted">确认后显示图标</span>
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <strong class="text-base">{{ currentReview.remote.data?.name }}</strong>
                <span class="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">{{ currentReview.remote.data?.element || '未知属性' }}</span>
                <span class="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-white/10">{{ currentReview.remote.data?.category || '未知分类' }}</span>
              </div>
              <p class="mt-1 text-xs text-muted">能耗 {{ displayValue(currentReview.remote.data?.cost) }} · 威力 {{ displayValue(currentReview.remote.data?.power) }}</p>
              <p class="mt-2 text-sm leading-6">{{ currentReview.remote.data?.description || '暂无描述' }}</p>
            </div>
          </div>
          <div v-else-if="currentReview.entity === 'ability'" class="flex items-center gap-4">
            <div class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-white/5">
              <img v-if="assetUrl(currentReview, 'icon') || reviewAssetUrl(currentReview, 'review_icon')" :src="assetUrl(currentReview, 'icon') || reviewAssetUrl(currentReview, 'review_icon')" :alt="currentReview.remote.data?.name" class="h-12 w-12 object-contain" />
              <span v-else class="text-xs text-muted">暂无特性图标</span>
            </div>
            <div class="min-w-0">
              <strong class="text-base">{{ currentReview.remote.data?.name }}</strong>
              <p class="mt-2 text-sm leading-6"><span class="text-muted">本地描述：</span>{{ abilityLocalDescription(currentReview) }}</p>
              <p class="mt-1 text-sm leading-6"><span class="text-muted">BWIKI 描述：</span>{{ abilityRemoteDescription(currentReview) }}</p>
              <p class="mt-2 text-xs text-muted">
                关联精灵 {{ currentReview.remote.data?.pet_uids?.length || 0 }} 只
                <span v-if="abilitySourcePet(currentReview)"> · 详情来源：{{ abilitySourcePet(currentReview).name }}（{{ abilitySourcePet(currentReview).uid }}）</span>
              </p>
              <p v-if="reviewAssetUrl(currentReview, 'review_icon')" class="mt-1 text-xs text-amber-600 dark:text-amber-300">当前筛选页压缩图标仅用于审核识别，不会作为正式特性图标。</p>
              <router-link to="/admin/abilities" class="mt-2 inline-block text-xs text-primary-500 hover:underline">打开特性管理</router-link>
            </div>
          </div>
          <div v-else class="space-y-4">
            <div v-if="reviewAssetUrl(currentReview, 'review_avatar') || reviewAssetUrl(currentReview, 'review_ability_icon')" class="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
              <div v-if="reviewAssetUrl(currentReview, 'review_avatar')" class="flex items-center gap-2">
                <img :src="reviewAssetUrl(currentReview, 'review_avatar')" :alt="currentReview.remote.data?.name" class="h-12 w-12 rounded object-contain" />
                <span class="text-xs">筛选页小头像</span>
              </div>
              <div v-if="reviewAssetUrl(currentReview, 'review_ability_icon')" class="flex items-center gap-2">
                <img :src="reviewAssetUrl(currentReview, 'review_ability_icon')" alt="筛选页特性缩略图" class="h-10 w-10 object-contain" />
                <span class="text-xs">筛选页特性缩略图</span>
              </div>
              <span class="text-xs text-amber-700 dark:text-amber-300">这些素材仅用于 DIFF 审核识别，不占用正式图片槽位。</span>
            </div>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div v-for="slot in PET_IMAGE_SLOTS" :key="slot.key" class="rounded-xl bg-white p-2 text-center shadow-sm dark:bg-white/5">
                <div class="flex aspect-square items-center justify-center">
                  <img v-if="petAssetUrl(currentReview, slot.key)" :src="petAssetUrl(currentReview, slot.key)" :alt="`${currentReview.remote.data?.name}${slot.label}`" class="h-full w-full object-contain" />
                  <span v-else class="text-xs text-muted">暂无图片</span>
                </div>
                <div class="mt-2 text-xs font-medium">{{ slot.label }}</div>
              </div>
            </div>
            <div class="flex flex-col gap-3 rounded-xl bg-white p-3 dark:bg-white/5 md:flex-row md:items-center md:justify-between">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-base">No.{{ currentReview.remote.data?.pet_id || '-' }} {{ currentReview.remote.data?.name }}</strong>
                  <span class="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">{{ currentReview.remote.data?.element || '未知属性' }}</span>
                  <span v-if="currentReview.remote.data?.sub_element" class="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-white/10">{{ currentReview.remote.data.sub_element }}</span>
                </div>
                <div class="mt-2 flex items-center gap-2 text-sm">
                  <img v-if="petAssetUrl(currentReview, 'ability_icon')" :src="petAssetUrl(currentReview, 'ability_icon')" class="h-8 w-8 object-contain" />
                  <span><strong>{{ currentReview.remote.data?.ability_name || '暂无特性' }}</strong><span class="ml-2 text-muted">{{ currentReview.remote.data?.ability_desc || '' }}</span></span>
                </div>
              </div>
              <div class="grid grid-cols-4 gap-x-4 gap-y-1 text-xs md:grid-cols-7">
                <span v-for="stat in PET_STATS" :key="stat.key"><span class="text-muted">{{ stat.label }}</span> {{ currentReview.remote.detail?.stats?.[stat.key] ?? currentReview.remote.data?.[stat.key] ?? '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentReview.entity === 'pet' && currentReview.remote.detail" class="grid gap-4 md:grid-cols-3 mt-3">
          <div v-for="skillType in ['skills', 'bloodline_skills', 'learnable_stones']" :key="skillType" class="rounded-xl bg-white p-3 dark:bg-white/5">
            <div class="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2 mb-2">
              <strong class="text-sm text-primary-500">{{ skillType === 'skills' ? '等级技能' : skillType === 'bloodline_skills' ? '遗传技能' : '技能石技能' }}</strong>
              <span class="text-xs text-muted">{{ (currentReview.remote.detail[skillType] || []).length }}</span>
            </div>
            <div v-if="(currentReview.remote.detail[skillType] || []).length" class="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              <div v-for="(skill, index) in currentReview.remote.detail[skillType]" :key="skill.skill_ref_uid || skill.name + '-' + index" class="rounded-lg border border-gray-100 p-2 dark:border-white/10">
                <div class="flex items-start gap-2">
                  <img v-if="skill.skill_icon" :src="skill.skill_icon" :alt="skill.name" class="h-9 w-9 rounded object-contain flex-shrink-0" loading="lazy" />
                  <div v-else class="h-9 w-9 rounded bg-gray-100 dark:bg-white/10 flex-shrink-0"></div>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1">
                      <strong class="text-sm truncate">{{ skill.name }}</strong>
                      <span v-if="skill.level" class="text-[10px] rounded bg-gray-100 px-1.5 py-0.5 text-muted dark:bg-white/10">Lv.{{ skill.level }}</span>
                    </div>
                    <div class="mt-1 flex flex-wrap gap-1 text-[10px]">
                      <span v-if="skill.element" class="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{{ skill.element }}</span>
                      <span v-if="skill.type || skill.category" class="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">{{ skill.type || skill.category }}</span>
                      <span class="rounded bg-gray-100 px-1.5 py-0.5 text-muted dark:bg-white/10">能耗 {{ skill.cost ?? '-' }}</span>
                      <span class="rounded bg-gray-100 px-1.5 py-0.5 text-muted dark:bg-white/10">威力 {{ skill.power ?? '-' }}</span>
                    </div>
                    <p v-if="skill.description" class="mt-1 text-xs leading-5 text-muted">{{ skill.description }}</p>
                    <p v-if="!skill.skill_ref_uid" class="mt-1 text-[10px] text-amber-600 dark:text-amber-300">本地技能列表暂无匹配；<router-link to="/admin/wiki-review?entity=skill&view=differences" class="underline">前往技能审核</router-link></p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="py-4 text-center text-xs text-muted">暂无技能</div>
          </div>
        </div>

        <div class="overflow-x-auto mt-4">
          <table class="w-full text-xs min-w-[720px]">
            <thead>
              <tr class="border-b dark:border-white/10">
                <th class="text-center py-2 px-2 w-14">选择</th>
                <th class="text-left py-2 px-2 w-28">字段</th>
                <th class="text-left py-2 px-2">本地</th>
                <th class="text-left py-2 px-2">BWIKI</th>
                <th class="text-center py-2 px-2 w-24">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="field in displayFields(currentReview)" :key="field" class="border-b dark:border-white/5" :class="fieldStatus(currentReview, field) !== 'same' ? 'bg-amber-50/40 dark:bg-amber-500/5' : ''">
                <td class="text-center py-2 px-2">
                  <input v-if="fieldSelectable(currentReview, field)" v-model="selected[currentReview.entity][currentReview.folderId]" type="checkbox" :value="field" />
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="py-2 px-2 font-medium">{{ fieldLabel(field) }}</td>
                <td class="py-2 px-2 whitespace-pre-wrap break-words">{{ displayValue(localValue(currentReview, field)) }}</td>
                <td class="py-2 px-2 whitespace-pre-wrap break-words">{{ displayValue(remoteValue(currentReview, field)) }}</td>
                <td class="text-center py-2 px-2">{{ fieldStatusLabel(currentReview, field) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import PetPicker from '@/components/shared/PetPicker.vue'

const modal = useModal()
const stages = ref([])
const activeEntity = ref('skill')
const activeView = ref('differences')
const pages = reactive({ skill: 1, ability: 1, pet: 1 })
const selected = reactive({ skill: {}, ability: {}, pet: {} })
const jumpFolderId = ref('')
const loading = ref(false)
const busy = ref(false)
const assetUrls = reactive({})
const associationReview = ref(null)
const associationUid = ref('')

const REVIEW_VIEWS = [
  { key: 'differences', countKey: 'differences', label: '有差异' },
  { key: 'confirmed', countKey: 'confirmed', label: '已确认' },
  { key: 'unchanged', countKey: 'unchanged', label: '无差异' },
]
const ASSET_LABELS = { icon: '图标', image_default: '本体', image_shiny: '异色', image_fruit: '果实', image_egg: '精灵蛋', ability_icon: '特性图标' }
const PET_IMAGE_SLOTS = [
  { key: 'image_default', label: '本体' }, { key: 'image_shiny', label: '异色' },
  { key: 'image_fruit', label: '果实' }, { key: 'image_egg', label: '精灵蛋' },
]
const PET_STATS = [
  { key: 'hp', label: '精力' }, { key: 'atk', label: '物攻' }, { key: 'matk', label: '魔攻' },
  { key: 'def', label: '物防' }, { key: 'mdef', label: '魔防' }, { key: 'speed', label: '速度' }, { key: 'total', label: '总和' },
]

const ENTITY_FIELDS = {
  skill: ['name', 'element', 'category', 'cost', 'power', 'description'],
  ability: ['description'],
  pet: ['element', 'sub_element', 'ability_name', 'ability_desc', 'hp', 'speed', 'atk', 'matk', 'def', 'mdef', 'total'],
}
const FIELD_LABELS = {
  pet_id: '精灵编号', name: '名称', element: '属性', sub_element: '副属性', category: '分类', cost: '能耗', power: '威力',
  description: '描述', ability_name: '特性名称', ability_desc: '特性描述', hp: '精力', speed: '速度', atk: '物攻', matk: '魔攻',
  def: '物防', mdef: '魔防', total: '总和',
}
const RESOLVED_DECISIONS = new Set(['approved-new', 'approved-fields', 'approved-reference', 'approved-no-change', 'approved-uid-migration', 'ignored'])

const activeStage = computed(() => stages.value.find(stage => stage.entity === activeEntity.value) || null)
const activeViewLabel = computed(() => REVIEW_VIEWS.find(view => view.key === activeView.value)?.label || '有差异')
const activePagination = computed(() => activeStage.value?.pagination || {
  page: pages[activeEntity.value] || 1, pageSize: 1, total: 0, totalPages: 0,
})
const activeSelector = computed(() => activeStage.value?.selector || [])
const currentReview = computed(() => activeStage.value?.reviews[0] || null)

const decision = review => review.plan.review?.decision || (review.plan.enabled ? 'approved-fields' : 'pending')
const isResolved = review => Boolean(review.plan.enabled) || RESOLVED_DECISIONS.has(decision(review))
const isNew = review => review.diff.identity?.status === 'unmatched'
const hasChanges = review => Object.entries(review.diff.fields || {}).some(
  ([field, value]) => ENTITY_FIELDS[review.entity]?.includes(field) && value.status !== 'same',
)

function initializeSelection(review) {
  const allowed = ENTITY_FIELDS[review.entity] || []
  selected[review.entity][review.folderId] = Object.entries(review.diff.fields || {})
    .filter(([field, value]) => allowed.includes(field) && value.status !== 'same')
    .map(([field]) => field)
}

function applyStages(nextStages) {
  stages.value = nextStages || []
  stages.value.forEach(stage => {
    stage.reviews.forEach(initializeSelection)
    if (stage.entity === activeEntity.value && stage.pagination) pages[stage.entity] = stage.pagination.page
  })
  const current = stages.value.find(stage => stage.entity === activeEntity.value)
  const currentPage = current?.pagination?.page || pages[activeEntity.value] || 1
  jumpFolderId.value = activeSelector.value.find(item => item.page === currentPage)?.folderId || ''
  if (!current || current.locked) {
    const next = stages.value.find(stage => !stage.locked && stage.counts.pending > 0)
      || stages.value.find(stage => !stage.locked)
    if (next) activeEntity.value = next.entity
  }
}

const canAssociateLocalPet = review => review?.entity === 'pet' && isNew(review) && !isResolved(review)
function openAssociation(review) { associationReview.value = review; associationUid.value = ''; }
function closeAssociation() { associationReview.value = null; associationUid.value = ''; }
async function associateLocalPet() {
  if (!associationReview.value || !associationUid.value || busy.value) return
  busy.value = true
  try { await adminApi.associateWikiReviewPet(associationReview.value.folderId, associationUid.value); closeAssociation(); await loadData() }
  catch (error) { await modal.alert('关联失败', error.message) }
  finally { busy.value = false }
}

async function loadData(refresh = false) {
  loading.value = true
  try {
    const isInitialLoad = stages.value.length === 0
    const requestedEntity = activeEntity.value
    let result = await adminApi.wikiReviews(
      activeView.value,
      requestedEntity,
      pages[requestedEntity] || 1,
      1,
      refresh,
    )
    applyStages(result.stages)
    if (isInitialLoad) {
      const firstPending = stages.value.find(stage => !stage.locked && stage.counts.pending > 0)
      if (firstPending) activeEntity.value = firstPending.entity
    }
    if (activeEntity.value !== requestedEntity) {
      result = await adminApi.wikiReviews(
        activeView.value,
        activeEntity.value,
        pages[activeEntity.value] || 1,
        1,
        refresh,
      )
      applyStages(result.stages)
    }
  } catch (error) {
    await modal.alert('加载失败', error.message)
  } finally {
    loading.value = false
  }
}

async function jumpToSelection(){
  const item = activeSelector.value.find(candidate => candidate.folderId === jumpFolderId.value)
  if (!item || loading.value) return
  pages[activeEntity.value] = item.page
  await loadData()
}

async function refreshData() {
  await loadData(true)
}

async function activateStage(stage) {
  if (stage.locked || loading.value || activeEntity.value === stage.entity) return
  activeEntity.value = stage.entity
  jumpFolderId.value = ''
  await loadData()
}

async function activateReviewView(view) {
  if (activeView.value === view || loading.value) return
  activeView.value = view
  pages[activeEntity.value] = 1
  jumpFolderId.value = ''
  await loadData()
}

async function move(offset) {
  const next = activePagination.value.page + offset
  if (next < 1 || next > activePagination.value.totalPages || loading.value) return
  pages[activeEntity.value] = next
  await loadData()
}

async function decide(review, nextDecision, fields = []) {
  busy.value = true
  try {
    await adminApi.decideWikiReview(review.entity, review.folderId, nextDecision, fields)
    await loadData()
  } catch (error) {
    await modal.alert('审核操作失败', error.message)
  } finally {
    busy.value = false
  }
}

async function approveNew(review) { if (await modal.confirm("确认新增", "确认导入这个暂存项目？")) await decide(review, "approve-new") }
async function acceptFields(review) { const fields = selectedFor(review); if (fields.length && await modal.confirm('接受字段', '确认接受当前选中的 BWIKI 字段？')) await decide(review, 'accept-fields', fields) }
async function confirmAbilityDetail(review) { if (await modal.confirm("确认特性详情", "获取特性描述和图标？")) await decide(review, "confirm-ability-detail") }
async function backfillPetAssets(review) { if (await modal.confirm('补充精灵数据', '确认从 BWIKI 刷新详情并补充缺失图片？')) await decide(review, 'backfill-pet-assets') }
async function approvePetAssetsOnly(review) { if (await modal.confirm('补充缺失图片', '确认只补充本地缺失的正式图片？')) await decide(review, 'approve-pet-assets-only') }
async function approveUidMigration(review) { if (await modal.confirm("确认 UID 更新", "应用 UID 更新？")) await decide(review, "approve-uid-migration") }
async function approveNoChange(review) { await decide(review, "approve-no-change") }
async function ignore(review) { if (await modal.confirm('忽略候选', '确认忽略当前审核候选？')) await decide(review, 'ignore') }
async function reset(review) { await decide(review, "pending") }

const selectedFor = review => selected[review.entity]?.[review.folderId] || []
const abilitySourcePet = review => review?.remote?.data?.source_pet || review?.remote?.data?.representative_pet || review?.remote?.data?.pet_refs?.[0] || null
const abilityLocalDescription = review => displayValue(review?.local?.data?.description)
const abilityRemoteDescription = review => review?.remote?.data?.description || '暂无描述'
const needsManualAbilityDescription = review => review.entity === "ability" && review.diff.fields?.description?.reason === "local-description-missing"
const canAcceptFields = review => ["matched", "name-match-id-different", "id-match-name-different"].includes(review.diff.identity?.status) && hasChanges(review) && !needsManualAbilityDescription(review)
const uidMigration = review => review?.plan?.uid_migration || review?.diff?.identity?.uid_migration || null
const canApproveUidMigration = review => review.entity === "pet" && Boolean(uidMigration(review)) && !hasChanges(review) && !isResolved(review)
const canApproveNoChange = review => ["matched", "name-match-id-different", "id-match-name-different"].includes(review.diff.identity?.status) && !hasChanges(review) && !uidMigration(review)
const canFetchUnchangedPetAssets = review => review.entity === "pet" && activeView.value === "unchanged" && !isResolved(review) && canApproveNoChange(review)
const canApprovePetAssetsOnly = review => review.entity === "pet" && !isResolved(review) && canApproveNoChange(review) && [...PET_IMAGE_SLOTS.map(slot => slot.key), "ability_icon"].some(key => !petAssetUrl(review, key))
const needsPetAssetBackfill = review => review.entity === "pet" && isResolved(review)
const fieldSelectable = (review, field) => !isNew(review) && ENTITY_FIELDS[review.entity]?.includes(field) && fieldStatus(review, field) !== "same" && review.diff.fields?.[field]?.selectable !== false
const displayFields = review => isNew(review) && review.entity === "pet" ? ["pet_id", "name", ...ENTITY_FIELDS.pet] : isNew(review) ? ENTITY_FIELDS[review.entity] || [] : (ENTITY_FIELDS[review.entity] || []).filter(field => Object.hasOwn(review.diff.fields || {}, field))
const localValue = (review, field) => review.diff.fields?.[field]?.local ?? review.local?.data?.[field]
const remoteValue = (review, field) => review.diff.fields?.[field]?.remote ?? review.remote.data?.[field]
const fieldStatus = (review, field) => review.diff.fields?.[field]?.status || (isNew(review) ? "remote-only" : "same")
const fieldLabel = field => FIELD_LABELS[field] || field
const displayValue = value => value === null || value === undefined || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
const fieldStatusLabel = (review, field) => review.diff.fields?.[field]?.reason === 'local-description-missing' ? '本地缺少描述' : statusLabel(fieldStatus(review, field))
const statusLabel = status => ({ same: '相同', changed: '变化', 'remote-only': '仅远程', 'local-only': '仅本地' }[status] || status)
const identityLabel = review => ({ matched: '已匹配', 'name-match-id-different': '同名但 UID 不同', 'id-match-name-different': '同编号但名称不同', unmatched: '候选新增', ambiguous: '身份歧义' }[review.diff.identity?.status] || '未知身份')
const decisionLabel = review => ({ pending: "待审核", "approved-new": "已确认新增", "approved-fields": "已接受字段", "approved-reference": "已确认引用", "approved-no-change": "已确认无变化", "approved-uid-migration": "已确认 UID 更新", ignored: "已忽略" }[decision(review)] || decision(review))
const decisionClass = review => decision(review) === "ignored" ? "bg-gray-100 text-gray-600" : isResolved(review) ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
const identityClass = review => isNew(review) ? "bg-blue-100 text-blue-700" : review.diff.identity?.safe_to_compare ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
const identityMeta = review => { const remote = review.diff.identity?.remote || {}; const local = review.diff.identity?.local || {}; return `暂存 ${review.folderId} · 远程 ${remote.uid || remote.pet_id || remote.name || '—'} · 本地 ${local.uid || local.name || '无匹配'}` }
const canApproveNew = review => isNew(review) && !(review.entity === "ability" && review.remote?.detail_source)
const newButtonLabel = review => ({ skill: '确认新增并下载图标', ability: '确认新增特性', pet: '确认新增并抓取图片' }[review.entity] || '确认')
const petEditUid = review => review.local?.data?.uid || review.plan?.id || ""
const canContinuePetDetail = review => review.entity === "pet" && decision(review) === "approved-fields" && Boolean(petEditUid(review))

const tabClass = stage => {
  if (stage.locked) return 'cursor-not-allowed border-gray-200 text-muted opacity-60 dark:border-white/10'
  if (activeEntity.value === stage.entity) return 'border-primary-500 bg-primary-500 text-white'
  if (stage.counts.pending === 0) return 'border-green-300 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/5 dark:text-green-300'
  return 'border-gray-200 hover:border-primary-300 dark:border-white/10'
}

const assetCacheKey = (review, key) => `${review.entity}/${review.folderId}/${key}`
const assetUrl = (review, key) => assetUrls[assetCacheKey(review, key)] || ''
const petAssetUrl = (review, key) => assetUrl(review, key) || review?.local?.data?.[key] || ''
const reviewAssetUrl = (review, key) => review?.remote?.assets?.[key]?.remote_url || ''
const downloadedAssets = review => Object.entries(review.assets || {})
  .filter(([, metadata]) => metadata?.status?.startsWith('downloaded-after-'))
  .map(([key, metadata]) => ({ key, metadata }))

async function loadReviewAssets(review) {
  if (!review) return
  for (const { key } of downloadedAssets(review)) {
    const cacheKey = assetCacheKey(review, key)
    if (assetUrls[cacheKey]) continue
    try {
      const blob = await adminApi.wikiReviewAsset(review.entity, review.folderId, key)
      assetUrls[cacheKey] = URL.createObjectURL(blob)
    } catch (error) {
      console.warn(`Temporary asset load failed ${cacheKey}`, error)
    }
  }
}

watch(currentReview, loadReviewAssets, { immediate: true })
onMounted(loadData)
onBeforeUnmount(() => {
  Object.values(assetUrls).forEach(url => URL.revokeObjectURL(url))
})
</script>
