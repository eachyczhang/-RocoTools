
<template>
  <div class="relative" :class="{ 'z-[100]': isOpen }" ref="wrapperRef">
    <!-- 输入框 -->
    <div
      class="input w-full flex items-center gap-2 cursor-text"
      :class="[
        disabled ? 'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:bg-white/5 dark:disabled:text-white/30' : 'cursor-text',
        isOpen ? 'border-primary-500 ring-2 ring-primary-500/20 dark:border-primary-400 dark:ring-primary-400/20' : ''
      ]"
      @click="!disabled && openDropdown()"
    >
      <input
        ref="inputRef"
        v-model="query"
        class="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-white/30 min-w-0"
        :placeholder="disabled ? '' : (modelValue ? '' : placeholder)"
        :disabled="disabled"
        @focus="openDropdown"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
      />
      <!-- 已选中时显示标签 -->
      <span
        v-if="selectedLabel && !query"
        class="absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-foreground dark:text-white truncate max-w-[calc(100%-3rem)] flex items-center gap-1.5"
      ><img v-if="selectedIcon" :src="selectedIcon" class="w-4 h-4 inline-block" />{{ selectedLabel }}</span>
      <!-- 清除按钮 -->
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-white/60 transition-colors text-base leading-none"
        @mousedown.prevent="clearValue"
        tabindex="-1"
      >×</button>
      <!-- 箭头图标 -->
      <svg
        class="shrink-0 w-4 h-4 text-gray-400 transition-transform duration-150"
        :class="isOpen ? 'rotate-180' : ''"
        viewBox="0 0 20 20" fill="currentColor"
      >
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>
    </div>

    <!-- 下拉面板 -->
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-y-95"
      enter-to-class="opacity-100 translate-y-0 scale-y-100"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-y-100"
      leave-to-class="opacity-0 translate-y-1 scale-y-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 w-full bg-white dark:bg-surface-dark border border-surface-light-border dark:border-surface-dark-border rounded-lg shadow-lg overflow-hidden origin-top"
      >
        <!-- 无结果 -->
        <div v-if="filteredOptions.length === 0" class="px-3 py-6 text-center text-sm text-muted">
          {{ query ? `没有匹配「${query}」的选项` : '暂无可选项' }}
        </div>
        <!-- 选项列表 -->
        <ul ref="listRef" class="max-h-52 overflow-y-auto py-1">
          <li
            v-for="(opt, idx) in filteredOptions"
            :key="opt.value"
            class="flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition-colors"
            :class="[
              idx === activeIndex ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'hover:bg-surface-light dark:hover:bg-surface-dark-alt text-foreground dark:text-white',
              opt.value === modelValue ? 'font-medium' : ''
            ]"
            @mousedown.prevent="selectOption(opt)"
            @mousemove="activeIndex = idx"
          >
            <span class="truncate flex items-center gap-1.5"><img v-if="opt.icon" :src="opt.icon" class="w-4 h-4 inline-block shrink-0" />{{ opt.label }}</span>
            <span v-if="opt.value !== opt.label && !opt.icon" class="ml-2 shrink-0 text-xs text-muted font-mono">{{ opt.value }}</span>
            <svg v-if="opt.value === modelValue" class="ml-2 shrink-0 w-3.5 h-3.5 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  /** v-model 绑定值（option.value） */
  modelValue: { type: String, default: '' },
  /** 选项列表：[{ value, label }] 或 [{ value }]（label 默认等于 value） */
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择或输入搜索' },
  disabled: { type: Boolean, default: false },
  /** 允许输入不在列表中的自定义值 */
  allowCustom: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const wrapperRef = ref(null)
const inputRef = ref(null)
const listRef = ref(null)
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(-1)

// 标准化选项
const normalizedOptions = computed(() =>
  props.options.map(o =>
    typeof o === 'string'
      ? { value: o, label: o, icon: '' }
      : { value: o.value ?? o.path ?? '', label: o.label ?? o.value ?? o.path ?? '', icon: o.icon || '' }
  )
)

// 当前选中项的显示名
const selectedLabel = computed(() => {
  if (!props.modelValue) return ''
  const found = normalizedOptions.value.find(o => o.value === props.modelValue)
  return found ? found.label : props.modelValue
})

// 当前选中项的图标
const selectedIcon = computed(() => {
  if (!props.modelValue) return ''
  const found = normalizedOptions.value.find(o => o.value === props.modelValue)
  return found ? found.icon : ''
})

// 过滤后的选项
const filteredOptions = computed(() => {
  if (!query.value) return normalizedOptions.value
  const q = query.value.toLowerCase()
  return normalizedOptions.value.filter(o =>
    o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
  )
})

function openDropdown() {
  if (props.disabled) return
  isOpen.value = true
  activeIndex.value = -1
  nextTick(() => inputRef.value?.focus())
}

function closeDropdown() {
  isOpen.value = false
  query.value = ''
  activeIndex.value = -1
}

function selectOption(opt) {
  emit('update:modelValue', opt.value)
  closeDropdown()
}

function clearValue() {
  emit('update:modelValue', '')
  query.value = ''
  nextTick(() => inputRef.value?.focus())
}

function onInput() {
  isOpen.value = true
  activeIndex.value = -1
}

function onKeydown(e) {
  if (!isOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') openDropdown()
    return
  }
  const len = filteredOptions.value.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % len
    scrollActiveIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + len) % len
    scrollActiveIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (activeIndex.value >= 0 && filteredOptions.value[activeIndex.value]) {
      selectOption(filteredOptions.value[activeIndex.value])
    } else if (props.allowCustom && query.value) {
      emit('update:modelValue', query.value)
      closeDropdown()
    }
  } else if (e.key === 'Escape') {
    closeDropdown()
  }
}

function onBlur() {
  // 延迟关闭，让 mousedown 事件先触发
  setTimeout(() => {
    if (!wrapperRef.value?.contains(document.activeElement)) {
      // 如果 allowCustom 且有输入内容，提交自定义值
      if (props.allowCustom && query.value && query.value !== selectedLabel.value) {
        emit('update:modelValue', query.value)
      }
      closeDropdown()
    }
  }, 150)
}

function scrollActiveIntoView() {
  nextTick(() => {
    const list = listRef.value
    if (!list) return
    const item = list.children[activeIndex.value]
    item?.scrollIntoView({ block: 'nearest' })
  })
}

// 外部 modelValue 变化时同步
watch(() => props.modelValue, () => {
  if (!isOpen.value) query.value = ''
})
</script>
