/**
 * Global crawl preview composable
 * Manages BWIKI crawl preview state as a singleton across all admin pages.
 * Supports minimize/restore so the preview persists across page navigation.
 *
 * Usage:
 *   import { useCrawlPreview } from '@/composables/useCrawlPreview'
 *   const { crawlPreview, isMinimized, minimize, restore, close } = useCrawlPreview()
 */
import { ref, computed } from 'vue'

// Module-level singleton state (shared across all components)
const crawlPreview = ref(null)
const crawlSelections = ref([])
const crawlActiveVariant = ref(0)
const isMinimized = ref(false)
const crawlCooldown = ref(0)
let crawlCooldownTimer = null

export function useCrawlPreview() {
  function setCrawlData(data) {
    crawlPreview.value = data
    crawlActiveVariant.value = 0
    isMinimized.value = false
    // 基础种族值先走精灵筛选 Diff；单精灵详情默认只选择描述、详情和技能。
    crawlSelections.value = data.crawled.map(c => ({
      stats: false,
      ability: !!c.ability_name,
      detail: !!(c.height || c.weight),
      skills: !!(c.skills && c.skills.length),
      bloodline_skills: !!(c.bloodline_skills && c.bloodline_skills.length),
      learnable_stones: !!(c.learnable_stones && c.learnable_stones.length),
    }))
  }

  function minimize() {
    isMinimized.value = true
  }

  function restore() {
    isMinimized.value = false
  }

  function close() {
    crawlPreview.value = null
    crawlSelections.value = []
    crawlActiveVariant.value = 0
    isMinimized.value = false
  }

  function startCooldown(seconds) {
    crawlCooldown.value = seconds
    if (crawlCooldownTimer) clearInterval(crawlCooldownTimer)
    crawlCooldownTimer = setInterval(() => {
      crawlCooldown.value--
      if (crawlCooldown.value <= 0) {
        clearInterval(crawlCooldownTimer)
        crawlCooldownTimer = null
      }
    }, 1000)
  }

  /**
   * Export skills data for a specific variant (excluding unmatched skills)
   * Returns a JSON string suitable for clipboard copy
   */
  function exportSkills(variantIdx) {
    if (!crawlPreview.value) return null
    const crawled = crawlPreview.value.crawled[variantIdx]
    if (!crawled) return null

    const result = { _name: crawled._name, _uid: crawled._uid }
    for (const skillType of ['skills', 'bloodline_skills', 'learnable_stones']) {
      if (crawled[skillType] && crawled[skillType].length) {
        // Only include matched skills (exclude red-background ones)
        result[skillType] = crawled[skillType]
          .filter(s => s._matched)
          .map(s => ({
            name: s.name,
            skill_ref_uid: s.skill_ref_uid,
            level: s.level ? parseInt(String(s.level).replace(/^LV/i, ''), 10) || null : null,
            element: s.element || null,
            type: s.type || null,
            cost: s.cost || 0,
            power: s.power || 0,
            description: s.description || '',
            skill_icon: s.skill_icon || '',
          }))
      }
    }
    return JSON.stringify(result, null, 2)
  }

  const hasData = computed(() => !!crawlPreview.value)

  const previewTitle = computed(() => {
    if (!crawlPreview.value) return ''
    const variants = crawlPreview.value.variants || []
    if (variants.length === 1) return variants[0].name
    return `${variants[0]?.name || ''} (${variants.length}形态)`
  })

  return {
    crawlPreview,
    crawlSelections,
    crawlActiveVariant,
    isMinimized,
    crawlCooldown,
    hasData,
    previewTitle,
    setCrawlData,
    minimize,
    restore,
    close,
    startCooldown,
    exportSkills,
  }
}
