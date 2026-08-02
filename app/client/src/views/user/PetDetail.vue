<template>
  <div v-if="pet" ref="pageEl" :style="[swipeStyle, detailThemeStyle]" class="pet-detail-page">
    <div class="pet-detail-toolbar">
      <button @click="goBack" class="pet-detail__back text-sm sm:text-base text-muted inline-flex cursor-pointer">← 返回</button>

      <div ref="variantMenuEl" class="pet-variant-switcher" v-if="pet.variants && pet.variants.length > 1" @keydown.esc="variantMenuOpen = false">
        <div class="pet-variant-heading">
          <span class="pet-variant-label text-xs sm:text-sm">形态切换</span>
          <span class="pet-variant-count">{{ pet.variants.length }} 种</span>
        </div>
        <div class="pet-variant-select-shell">
          <button type="button" class="pet-variant-trigger" :aria-expanded="variantMenuOpen" aria-haspopup="listbox" @click="variantMenuOpen = !variantMenuOpen">
            <span>{{ currentVariantName }}</span>
            <svg class="pet-variant-chevron" :class="{ 'pet-variant-chevron--open': variantMenuOpen }" viewBox="0 0 20 20" aria-hidden="true">
              <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
            </svg>
          </button>
          <Transition name="variant-menu">
            <div v-if="variantMenuOpen" class="pet-variant-menu" role="listbox" aria-label="精灵形态">
              <button v-for="v in pet.variants" :key="v.pet_uid" type="button" role="option"
                class="pet-variant-option" :class="{ 'pet-variant-option--active': v.pet_uid === pet.uid }"
                :aria-selected="v.pet_uid === pet.uid" @click="selectVariant(v.pet_uid)">
                <span class="pet-variant-option__dot"></span>
                <span class="pet-variant-option__name">{{ v.name }}</span>
                <span v-if="v.pet_uid === pet.uid" class="pet-variant-option__current">当前</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    <!-- 精灵介绍 -->
    <div class="card pet-hero mb-4 sm:mb-5 lg:mb-6">
      <div class="pet-hero__layout flex flex-col sm:flex-row gap-4 sm:gap-5 lg:gap-6 items-center">
        <!-- 立绘区域（Tab切换） -->
        <div class="pet-hero__visual flex flex-col items-center flex-shrink-0">
          <span class="pet-hero__serial">No.{{ paddedPetId }}</span>
          <span class="pet-hero__watermark" aria-hidden="true">{{ paddedPetId }}</span>
          <span class="pet-hero__halo" aria-hidden="true"></span>
          <img :src="currentImage" class="pet-hero__image w-36 h-36 sm:w-44 sm:h-44 lg:w-48 lg:h-48 object-contain mb-2 sm:mb-3" loading="lazy" />
          <!-- 切换按钮 -->
          <div class="pet-hero__image-tabs flex items-center gap-3 sm:gap-4">
            <button @click="imageTab = 'default'"
              class="flex flex-col items-center gap-0.5 sm:gap-1 transition-opacity"
              :class="imageTab === 'default' ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
              <img :src="pet.detail?.image_default || pet.image_url" class="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 object-contain" loading="lazy" />
              <span class="text-[10px] text-muted">精灵</span>
            </button>
            <button v-if="pet.detail?.image_shiny && pet.show_shiny" @click="imageTab = 'shiny'"
              class="flex flex-col items-center gap-0.5 md:gap-1 transition-opacity"
              :class="imageTab === 'shiny' ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
              <img :src="pet.detail.image_shiny" class="w-8 h-8 md:w-10 md:h-10 object-contain" loading="lazy" />
              <span class="text-[10px] text-muted">异色</span>
            </button>
            <button v-if="pet.detail?.image_fruit" @click="imageTab = 'fruit'"
              class="flex flex-col items-center gap-0.5 md:gap-1 transition-opacity"
              :class="imageTab === 'fruit' ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
              <img :src="pet.detail.image_fruit" class="w-8 h-8 md:w-10 md:h-10 object-contain" loading="lazy" />
              <span class="text-[10px] text-muted">果实</span>
            </button>
            <button v-if="pet.detail?.image_egg" @click="imageTab = 'egg'"
              class="flex flex-col items-center gap-0.5 md:gap-1 transition-opacity"
              :class="imageTab === 'egg' ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
              <img :src="pet.detail.image_egg" class="w-8 h-8 md:w-10 md:h-10 object-contain" loading="lazy" />
              <span class="text-[10px] text-muted">精灵蛋</span>
            </button>
          </div>
        </div>

        <!-- 信息 -->
        <div class="pet-hero__info flex-1 text-center md:text-left w-full">
          <!-- 名称 + 属性 -->
          <div class="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 justify-center sm:justify-start flex-wrap">
            <h1 class="pet-hero__name font-roco text-2xl sm:text-3xl">{{ pet.name }}</h1>
            <span class="badge flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm" :style="{ background: pet.element_color + '18', color: pet.element_color }">
              <img v-if="pet.element_icon" :src="pet.element_icon" class="w-5 h-5 sm:w-6 sm:h-6" />
              {{ pet.element_name }}
            </span>
            <span v-if="pet.sub_element_name" class="badge flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm" :style="{ background: pet.sub_element_color + '18', color: pet.sub_element_color }">
              <img v-if="pet.sub_element_icon" :src="pet.sub_element_icon" class="w-5 h-5 sm:w-6 sm:h-6" />
              {{ pet.sub_element_name }}
            </span>
          </div>

          <!-- 蛋组 -->
          <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 justify-center sm:justify-start">
            <router-link v-for="eg in pet.egg_groups" :key="eg.id"
              :to="{ path: '/eggs', query: { group: eg.id } }"
              class="badge text-xs md:text-sm hover:opacity-80 transition-opacity"
              :style="{ background: getEggGroupColor(eg.name) + '18', color: getEggGroupColor(eg.name) }">
              {{ eg.name }}
            </router-link>
          </div>

          <!-- 精灵标记 -->
          <div v-if="petTags.length" class="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 justify-center sm:justify-start">
            <span v-for="tag in petTags" :key="tag.key"
              class="badge text-xs md:text-sm"
              :style="{ background: tag.color + '18', color: tag.color }">
              {{ tag.label }}
            </span>
          </div>

          <!-- 特性 -->
          <div class="pet-hero__ability flex items-start gap-2.5 sm:gap-3 mb-3 sm:mb-4 justify-center sm:justify-start p-2.5 sm:p-3 rounded-xl">
            <img v-if="pet.detail?.ability_icon" :src="pet.detail.ability_icon"
              class="w-9 h-9 sm:w-11 sm:h-11 rounded-lg object-contain flex-shrink-0 mt-0.5" loading="lazy" />
            <div class="text-left flex-1 min-w-0">
              <div class="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">{{ pet.ability_name }}</div>
              <SkillDescription :text="pet.ability_desc" class="text-xs sm:text-sm leading-relaxed text-muted" />
            </div>
          </div>

          <!-- 身高/体重/分布 -->
          <div class="pet-hero__meta flex gap-3 sm:gap-6 text-xs sm:text-sm justify-center sm:justify-start flex-wrap">
            <div v-if="pet.detail?.height"><span class="text-muted">身高</span> {{ formatRange(pet.detail.height, 'm') }}</div>
            <div v-if="pet.detail?.weight"><span class="text-muted">体重</span> {{ formatRange(pet.detail.weight, 'kg') }}</div>
            <div v-if="pet.detail?.location"><span class="text-muted">分布</span> {{ pet.detail.location }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 进化链 -->
    <div
      v-if="evolutionRoutes.length"
      class="card pet-section-card pet-evolution-card mb-4 sm:mb-6"
      :class="{ 'pet-evolution-card--menu-open': evolutionMenuOpen }"
    >
      <div class="pet-evolution-header">
        <h3 class="font-roco text-sm sm:text-base">进化链</h3>

        <div v-if="evolutionRoutes.length > 1" class="pet-evolution-controls">
          <div v-if="evolutionRoutes.length <= 4 && windowWidth >= 640" class="pet-evolution-tabs" role="tablist" aria-label="进化路线">
            <button
              v-for="(evolutionRoute, routeIndex) in evolutionRoutes"
              :key="`route-tab-${routeIndex}`"
              type="button"
              role="tab"
              class="pet-evolution-tab"
              :class="{ 'pet-evolution-tab--active': selectedEvolutionRouteIndex === routeIndex }"
              :aria-selected="selectedEvolutionRouteIndex === routeIndex"
              @click="selectEvolutionRoute(routeIndex)"
            >
              <span>路线 {{ routeIndex + 1 }}</span>
              <small>{{ evolutionRoute[evolutionRoute.length - 1]?.name }}</small>
            </button>
          </div>

          <div v-else ref="evolutionMenuEl" class="pet-evolution-select" @keydown.esc="evolutionMenuOpen = false">
            <button
              type="button"
              class="pet-evolution-select__trigger"
              :aria-expanded="evolutionMenuOpen"
              aria-haspopup="listbox"
              @click="evolutionMenuOpen = !evolutionMenuOpen"
            >
              <span>{{ evolutionRouteLabel(activeEvolutionRoute, selectedEvolutionRouteIndex) }}</span>
              <svg :class="{ 'pet-evolution-select__chevron--open': evolutionMenuOpen }" class="pet-evolution-select__chevron" viewBox="0 0 20 20" aria-hidden="true">
                <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
              </svg>
            </button>
            <Transition name="variant-menu">
              <div v-if="evolutionMenuOpen" class="pet-evolution-select__menu" role="listbox" aria-label="选择进化路线">
                <button
                  v-for="(evolutionRoute, routeIndex) in evolutionRoutes"
                  :key="`route-option-${routeIndex}`"
                  type="button"
                  role="option"
                  class="pet-evolution-select__option"
                  :class="{ 'pet-evolution-select__option--active': selectedEvolutionRouteIndex === routeIndex }"
                  :aria-selected="selectedEvolutionRouteIndex === routeIndex"
                  @click="selectEvolutionRoute(routeIndex)"
                >
                  <span class="pet-evolution-select__number">{{ routeIndex + 1 }}</span>
                  <span class="pet-evolution-select__name">{{ evolutionRouteLabel(evolutionRoute, routeIndex) }}</span>
                  <span v-if="evolutionRoute.some(stage => stage.uid === pet.uid)" class="pet-evolution-select__current">当前精灵</span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <Transition name="evolution-route" mode="out-in">
        <div :key="selectedEvolutionRouteIndex" class="pet-evolution-viewport">
          <div class="pet-evolution-track">
            <template v-for="(stage, stageIndex) in activeEvolutionRoute" :key="stage.uid || stageIndex">
              <div v-if="stageIndex > 0" class="pet-evolution-arrow">
                <span v-if="stage.evolve_level">Lv.{{ stage.evolve_level }}</span>
                <span v-else-if="!stage.evolve_condition">特殊</span>
                <EvoConditionTag v-if="!stage.evolve_level && stage.evolve_condition" :condition="stage.evolve_condition" :elem-map="elemMap" />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <EvoConditionTag v-if="stage.evolve_level && stage.evolve_condition" :condition="stage.evolve_condition" :elem-map="elemMap" small />
              </div>

              <router-link
                v-if="stage.uid && stage.uid !== pet.uid"
                :to="`/pets/${stage.uid}`"
                class="pet-evolution-stage group"
              >
                <img v-if="stage.thumb_url" :src="stage.thumb_url" :alt="stage.name" loading="lazy" />
                <div v-else class="pet-evolution-stage__placeholder">?</div>
                <span>{{ stage.name }}</span>
              </router-link>
              <div v-else class="pet-evolution-stage" :class="{ 'pet-evolution-stage--current': stage.uid === pet.uid }">
                <img v-if="stage.thumb_url" :src="stage.thumb_url" :alt="stage.name" loading="lazy" />
                <div v-else class="pet-evolution-stage__placeholder">?</div>
                <span>{{ stage.name }}</span>
                <small v-if="stage.uid === pet.uid">当前</small>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </div>
    <!-- 种族值 -->
    <div class="card pet-section-card pet-stats-card mb-4 sm:mb-6">
      <h3 class="pet-section-title font-roco text-sm sm:text-base mb-3 sm:mb-4">种族值 <span class="pet-total-value font-bold ml-2">{{ pet.total }}</span></h3>
      <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div class="flex-1 w-full space-y-2 sm:space-y-3">
          <div v-for="s in statsBarList" :key="s.key" class="pet-stat-row flex items-center gap-2 sm:gap-3">
            <span class="text-xs sm:text-sm text-muted w-8 sm:w-10 text-right">{{ s.label }}</span>
            <div class="pet-stat-track flex-1 h-3 md:h-4 rounded-full overflow-hidden">
              <div class="pet-stat-fill h-full rounded-full transition-all duration-500"
                :style="{ width: (s.value / 200 * 100) + '%' }"></div>
            </div>
              <span class="pet-stat-value text-xs sm:text-sm font-medium w-7 sm:w-8">{{ s.value }}</span>
          </div>
        </div>
        <StatsRadar v-if="pet" :values="{ hp: pet.hp, atk: pet.atk, matk: pet.matk, def: pet.def, mdef: pet.mdef, speed: pet.speed }" :size="radarSize" />
      </div>
    </div>

    <!-- 属性克制关系（实时计算） -->
    <ElementMatchup v-if="petElementIds.length" :element-ids="petElementIds" :elements="elemList" :multipliers="multipliers" />

    <!-- 图鉴课题 -->
    <div class="card pet-section-card mb-4 sm:mb-6" v-if="pet.achievements?.length && !pet.is_boss_form">
      <h3 class="font-roco text-sm sm:text-base mb-2 sm:mb-3">图鉴课题</h3>
      <div class="space-y-1.5">
        <div v-for="(ach, idx) in pet.achievements" :key="idx"
          class="px-3 py-2 sm:py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
          <div class="flex items-center gap-2 sm:gap-3 mb-1">
            <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">{{ idx + 1 }}</span>
            <span class="text-xs sm:text-sm flex-1">
              <span v-if="ach.type === 'skill' && ach.skill_name">
                使用{{ ach.use_count || 2 }}次{{ ach.skill_name }}
              </span>
              <span v-else>
                {{ ach.title }}
              </span>
            </span>
            <span v-if="ach.reward_desc" class="text-[10px] sm:text-xs text-muted flex-shrink-0">{{ ach.reward_desc }}</span>
          </div>

          <!-- 技能类型课题的详细展示 -->
          <div v-if="ach.type === 'skill' && ach.skill_ref_uid" class="ml-7 sm:ml-9">
            <div class="flex items-center gap-2 sm:gap-3 p-2 bg-white/50 dark:bg-white/5 rounded">
              <!-- 技能图标 -->
              <img v-if="skillIcons[ach.skill_ref_uid]" :src="skillIcons[ach.skill_ref_uid]"
                   class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded flex-shrink-0" loading="lazy" />
              <img v-else-if="skillElements[ach.skill_ref_uid]?.icon" :src="skillElements[ach.skill_ref_uid].icon"
                   class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded flex-shrink-0" loading="lazy" />
              <div v-else class="w-6 h-6 sm:w-8 sm:h-8 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>

              <!-- 技能名称和属性 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-medium text-xs sm:text-sm">{{ ach.skill_name }}</span>
                  <span v-if="skillElements[ach.skill_ref_uid]" class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] sm:text-xs"
                        :style="{ background: skillElements[ach.skill_ref_uid].color + '18', color: skillElements[ach.skill_ref_uid].color }">
                    <img :src="skillElements[ach.skill_ref_uid].icon" class="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{{ skillElements[ach.skill_ref_uid].name }}</span>
                  </span>
                </div>
              </div>

              <!-- 技能数据 -->
              <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-[10px] sm:text-xs text-center">
                <div v-if="skillCategories[ach.skill_ref_uid]" class="w-8 sm:w-10">
                  <div class="text-muted text-[8px] sm:text-[10px]">类型</div>
                  <div class="font-medium" :style="{ color: categoryColor(skillCategories[ach.skill_ref_uid]) }">{{ skillCategories[ach.skill_ref_uid] }}</div>
                </div>
                <div v-if="skillLevels[ach.skill_ref_uid]" class="w-8 sm:w-10">
                  <div class="text-muted text-[8px] sm:text-[10px]">等级</div>
                  <div class="font-medium">{{ skillLevels[ach.skill_ref_uid] }}</div>
                </div>
                <div class="w-8 sm:w-10">
                  <div class="text-muted text-[8px] sm:text-[10px]">能耗</div>
                  <div class="font-medium">{{ skillCosts[ach.skill_ref_uid] != null ? skillCosts[ach.skill_ref_uid] : '-' }}</div>
                </div>
                <div class="w-8 sm:w-10">
                  <div class="text-muted text-[8px] sm:text-[10px]">威力</div>
                  <div class="font-medium">{{ skillPowers[ach.skill_ref_uid] || '-' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 打击面分析 -->
    <CoverageAnalysis v-if="allSkills.length"
      :all-skills="allSkills" :all-skills-with-bloodline="allSkillsWithBloodline"
      :elements="elemList" :multipliers="multipliers"
      :initial-coverage="initialCoverage" :initial-bloodline="initialBloodline" />

    <!-- 技能区域（Tab 切换） -->
    <div class="card pet-section-card" v-if="pet.skills?.length || pet.bloodline_skills?.length || pet.learnable_stones?.length">
      <div class="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 border-b border-surface-light-border dark:border-surface-dark-border pb-2 sm:pb-3 overflow-x-auto">
        <button v-for="tab in skillTabs" :key="tab.key"
          @click="activeSkillTab = tab.key"
          class="px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0"
          :class="activeSkillTab === tab.key
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
            : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
          {{ tab.label }}
          <span class="ml-1 text-xs opacity-60">({{ tab.count }})</span>
        </button>
      </div>

      <!-- 技能筛选 -->
      <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <select v-model="skillCategory" class="select text-xs sm:text-sm">
          <option value="">分类：全部</option>
          <option v-for="c in ['物攻','魔攻','防御','状态']" :key="c" :value="c">分类：{{ c }}</option>
        </select>
        <select v-model="skillCounter" class="select text-xs sm:text-sm">
          <option value="">应对：不限</option>
          <option value="none">应对：无</option>
          <option v-for="c in ['状态','防御','攻击']" :key="c" :value="c">应对：{{ c }}</option>
        </select>
        <select v-model="skillKeyword" class="select text-xs sm:text-sm">
          <option value="">效果：不限</option>
          <option v-for="k in skillKeywordOptions" :key="k.value" :value="k.value">{{ k.label }}</option>
        </select>
        <span class="text-xs text-muted self-center ml-auto">{{ filteredSkills.length }} 条</span>
      </div>

      <!-- 属性筛选 -->
      <div class="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
        <button @click="skillElement = ''"
          class="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-colors"
          :class="!skillElement ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'">
          全
        </button>
        <button v-for="elem in availableSkillElements" :key="elem.name"
          @click="skillElement = elem.name"
          class="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-colors"
          :class="skillElement === elem.name ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
          :title="elem.name">
          <img :src="elem.icon" class="w-5 h-5 sm:w-7 sm:h-7" :alt="elem.name" />
        </button>
      </div>

      <SkillTable :title="''" :skills="filteredSkills" :elem-map="elemMap" />
    </div>

    <!-- 悬浮导航：上一只/下一只（仅PC桌面，默认隐藏，鼠标靠近边缘时显示） -->
    <Teleport to="body">
      <!-- 左侧热区 + 按钮 -->
      <div v-if="neighbors.prev" class="hidden xl:block fixed left-0 top-1/3 bottom-1/3 w-16 z-40 group/nav">
        <router-link :to="'/pets/' + neighbors.prev.uid" replace
          class="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500/40 active:scale-95 transition-all duration-300 opacity-0 group-hover/nav:opacity-100"
          :class="{ '!opacity-100': navVisible }">
          <svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover/nav:text-primary-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          <img v-if="neighbors.prev.avatar_url" :src="neighbors.prev.avatar_url" :alt="neighbors.prev.name" class="w-6 h-6 rounded-full object-cover flex-shrink-0" />
          <span class="text-[11px] text-gray-500 dark:text-gray-400 group-hover/nav:text-primary-500 transition-colors max-w-16 truncate">{{ neighbors.prev.name }}</span>
        </router-link>
      </div>
      <!-- 右侧热区 + 按钮 -->
      <div v-if="neighbors.next" class="hidden xl:block fixed right-0 top-1/3 bottom-1/3 w-16 z-40 group/nav">
        <router-link :to="'/pets/' + neighbors.next.uid" replace
          class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500/40 active:scale-95 transition-all duration-300 opacity-0 group-hover/nav:opacity-100"
          :class="{ '!opacity-100': navVisible }">
          <span class="text-[11px] text-gray-500 dark:text-gray-400 group-hover/nav:text-primary-500 transition-colors max-w-16 truncate">{{ neighbors.next.name }}</span>
          <img v-if="neighbors.next.avatar_url" :src="neighbors.next.avatar_url" :alt="neighbors.next.name" class="w-6 h-6 rounded-full object-cover flex-shrink-0" />
          <svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover/nav:text-primary-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </router-link>
      </div>
    </Teleport>

    <!-- 滑动引导遮罩（首次进入，完成一次滑动后消失） -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSwipeGuide" class="xl:hidden fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/75 backdrop-blur-[3px]" @click.self="dismissGuide">
          <!-- 引导内容 -->
          <div class="flex flex-col items-center gap-8 px-8 py-12 max-w-sm text-center">
            <!-- 动画区域 -->
            <div class="relative w-56 sm:w-64 h-28 flex items-center justify-center">
              <!-- 呼吸光环背景 -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="guide-pulse-ring w-24 h-24 rounded-full border-2 border-primary-400/30"></div>
              </div>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="guide-pulse-ring-delay w-32 h-32 rounded-full border border-primary-400/15"></div>
              </div>
              <!-- 滑动轨迹（发光） -->
              <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[2px] rounded-full overflow-hidden">
                <div class="absolute inset-0 bg-white/10"></div>
                <div class="guide-track-glow absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary-400/60 to-transparent"></div>
              </div>
              <!-- 左箭头（交替闪烁） -->
              <div class="absolute left-0 top-1/2 -translate-y-1/2 guide-arrow-left">
                <svg class="w-6 h-6 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </div>
              <!-- 右箭头（交替闪烁） -->
              <div class="absolute right-0 top-1/2 -translate-y-1/2 guide-arrow-right">
                <svg class="w-6 h-6 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </div>
              <!-- 手指图标 + 拖尾 -->
              <div class="swipe-finger-anim relative">
                <div class="guide-finger-trail absolute inset-0 w-12 h-12 rounded-full bg-primary-400/20 blur-md"></div>
                <svg class="relative w-12 h-12 text-white drop-shadow-[0_0_12px_rgba(214,159,35,0.5)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.5 3.5a1.5 1.5 0 0 1 3 0v7.085l3.225-1.612a1.5 1.5 0 0 1 2.007.67l.036.073a1.5 1.5 0 0 1-.462 1.86l-5.87 4.39A5.5 5.5 0 0 1 8.136 17.5H7.5A3.5 3.5 0 0 1 4 14V9.5a1.5 1.5 0 0 1 3 0v1.75a.25.25 0 0 0 .5 0V6.5a1.5 1.5 0 0 1 2 0v-3z"/>
                </svg>
              </div>
            </div>
            <!-- 文字提示（呼吸效果） -->
            <div class="space-y-3 guide-text-breathe">
              <p class="text-white text-xl sm:text-2xl font-semibold tracking-wide">左右滑动切换精灵</p>
              <p class="text-white/50 text-sm sm:text-base">试试向左或向右滑动屏幕</p>
            </div>
            <!-- 底部提示 -->
            <div class="flex flex-col items-center gap-3 mt-2">
              <div class="w-12 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              <p class="text-white/35 text-xs">完成一次滑动后自动关闭 · 点击空白跳过</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { petsApi, elementsApi, skillsApi } from '@/api'
import SkillTable from '@/components/user/SkillTable.vue'
import ElementMatchup from '@/components/shared/ElementMatchup.vue'
import CoverageAnalysis from '@/components/user/CoverageAnalysis.vue'
import StatsRadar from '@/components/shared/StatsRadar.vue'
import EvoConditionTag from '@/components/user/EvoConditionTag.vue'
import SkillDescription from '@/components/user/SkillDescription.vue'
import { getEggGroupColor } from '@/constants/eggGroupColors'
import { categoryColor } from '@/constants/categoryColors'

const route = useRoute()
const router = useRouter()
const pet = ref(null)
const neighbors = ref({ prev: null, next: null })
const showSwipeGuide = ref(false)
const navVisible = ref(false)
const variantMenuEl = ref(null)
const variantMenuOpen = ref(false)
const evolutionMenuEl = ref(null)
const evolutionMenuOpen = ref(false)
const selectedEvolutionRouteIndex = ref(0)

const evolutionRoutes = computed(() => (pet.value?.detail?.evolution_chain || []).filter(route => Array.isArray(route) && route.length > 1))
const activeEvolutionRoute = computed(() => evolutionRoutes.value[selectedEvolutionRouteIndex.value] || evolutionRoutes.value[0] || [])

const currentVariantName = computed(() => {
  const current = pet.value?.variants?.find(variant => variant.pet_uid === pet.value?.uid)
  return current?.name || pet.value?.name || ''
})

function selectVariant(uid) {
  variantMenuOpen.value = false
  if (uid && uid !== pet.value?.uid) switchVariant(uid)
}

function evolutionRouteLabel(route, index) {
  if (!route?.length) return `路线 ${index + 1}`
  const firstName = route[0]?.name || '起点'
  const lastName = route[route.length - 1]?.name || '终点'
  return `路线 ${index + 1} · ${firstName} → ${lastName}`
}

function selectEvolutionRoute(index) {
  selectedEvolutionRouteIndex.value = index
  evolutionMenuOpen.value = false
}

function selectInitialEvolutionRoute() {
  const matchingIndex = evolutionRoutes.value.findIndex(route => route.some(stage => stage.uid === pet.value?.uid))
  selectedEvolutionRouteIndex.value = matchingIndex >= 0 ? matchingIndex : 0
  evolutionMenuOpen.value = false
}

function closeVariantMenu(event) {
  if (variantMenuOpen.value && variantMenuEl.value && !variantMenuEl.value.contains(event.target)) {
    variantMenuOpen.value = false
  }
  if (evolutionMenuOpen.value && evolutionMenuEl.value && !evolutionMenuEl.value.contains(event.target)) {
    evolutionMenuOpen.value = false
  }
}

// Format range string "1.50-2.15" to display "1.50~2.15m" or "1.50m" if same
function formatRange(str, unit) {
  if (!str) return ''
  const m = String(str).match(/^([\d.]+)\s*[~\-]\s*([\d.]+)$/)
  if (m) {
    const a = parseFloat(m[1]).toFixed(2)
    const b = parseFloat(m[2]).toFixed(2)
    return a === b ? a + unit : a + '~' + b + unit
  }
  const single = String(str).match(/^([\d.]+)$/)
  if (single) return parseFloat(single[1]).toFixed(2) + unit
  return str + unit
}

// Pet special tags (displayed as badges)
const petTags = computed(() => {
  if (!pet.value) return []
  const tags = []
  if (pet.value.is_final_form) tags.push({ key: 'final', label: '最终形态', color: '#D69F23' })
  if (pet.value.is_legendary) tags.push({ key: 'legendary', label: '传说精灵', color: '#E6A817' })
  if (pet.value.is_season) tags.push({ key: 'season', label: '赛季精灵', color: '#3B82F6' })
  if (pet.value.is_pass) tags.push({ key: 'pass', label: '通行证精灵', color: '#8B5CF6' })
  if (pet.value.is_boss_form) tags.push({ key: 'boss_form', label: '首领形态', color: '#EF4444' })
  if (pet.value.has_boss_form) tags.push({ key: 'has_boss', label: '拥有首领形态', color: '#F97316' })
  if (pet.value.detail?.image_shiny && pet.value.show_shiny && imageTab.value === 'shiny') tags.push({ key: 'shiny', label: '异色精灵', color: '#EC4899' })
  return tags
})

/** Navigate back: if previous route was pets list, go back to preserve state; otherwise navigate to /pets */
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/pets')
  }
}

/** Format evolve_condition object to display text */
function formatEvoCondition(cond) {
  if (!cond) return ''
  if (typeof cond === 'string') return cond // legacy string format
  if (cond.type === 'text') return cond.text || ''
  if (cond.type === 'skill') {
    let s = `使用${cond.skill_count || 1}次${cond.skill_name || '?'}`
    if (cond.need_win) s += '(需战胜)'
    return s
  }
  if (cond.type === 'element') return `击败${cond.element_count || 1}只${cond.element_name || '?'}属性精灵`
  if (cond.type === 'pet') return `击败${cond.pet_count || 1}次${cond.pet_name || '?'}`
  return ''
}
const elemMap = ref({})
const elemList = ref([])
const multipliers = ref({})
const activeSkillTab = ref('skills')
const skillCategory = ref('')
const skillCounter = ref('')
const skillKeyword = ref('')
const skillElement = ref('')
const imageTab = ref('default')

// 技能详情相关数据
const skillIcons = ref({})
const skillElements = ref({})
const skillCategories = ref({})
const skillCosts = ref({})
const skillPowers = ref({})
const skillLevels = ref({})

// 响应式雷达图尺寸
const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const radarSize = computed(() => windowWidth.value < 768 ? 160 : 200)

// 加载技能详情
async function loadSkillDetails(achievements) {
  if (!achievements) return

  const skillRefs = achievements
    .filter(ach => ach.type === 'skill' && ach.skill_ref_uid)
    .map(ach => ach.skill_ref_uid)
    .filter((uid, index, array) => array.indexOf(uid) === index) // 去重

  if (skillRefs.length === 0) return

  try {
    // 并行加载所有技能详情以提高性能
    const skillPromises = skillRefs.map(uid => skillsApi.get(uid).catch(err => {
      console.warn(`Failed to load skill ${uid}:`, err)
      return null
    }))

    const skills = await Promise.all(skillPromises)

    skills.forEach((skill, index) => {
      if (skill) {
        const uid = skillRefs[index]
        skillIcons.value[uid] = skill.icon_url
        skillElements.value[uid] = {
          name: skill.element_name,
          icon: skill.element_icon,
          color: skill.element_color
        }
        skillCategories.value[uid] = skill.category
        skillCosts.value[uid] = skill.cost
        skillPowers.value[uid] = skill.power
      }
    })

    // 从精灵的升级技能列表中获取学习等级（课题技能一定是升级学习）
    if (pet.value && pet.value.skills) {
      for (const uid of skillRefs) {
        const petSkill = pet.value.skills.find(s => s.skill_ref_uid === uid)
        if (petSkill && petSkill.level) {
          skillLevels.value[uid] = petSkill.level
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load skill details:', err)
  }
}

const currentImage = computed(() => {
  if (!pet.value) return ''
  const d = pet.value.detail
  if (imageTab.value === 'shiny' && d?.image_shiny) return d.image_shiny
  if (imageTab.value === 'fruit' && d?.image_fruit) return d.image_fruit
  if (imageTab.value === 'egg' && d?.image_egg) return d.image_egg
  return d?.image_default || pet.value.image_url
})

const paddedPetId = computed(() => String(pet.value?.pet_id ?? '').padStart(3, '0'))

const detailThemeStyle = computed(() => {
  const primary = pet.value?.element_color || '#D69F23'
  const secondary = pet.value?.sub_element_color || primary
  return {
    '--pet-detail-accent': primary,
    '--pet-detail-secondary': secondary,
  }
})

const skillKeywordOptions = [
  { value: '连击', label: '连击' },
  { value: '回复', label: '回复' },
  { value: '吸血', label: '吸血' },
  { value: '永久', label: '永久增益' },
  { value: '印记', label: '印记' },
  { value: '驱散', label: '驱散' },
  { value: '打断', label: '打断' },
  { value: '脱离', label: '脱离' },
  { value: '更换', label: '更换精灵' },
  { value: '先手', label: '先手' },
  { value: '迸发', label: '迸发' },
  { value: '迅捷', label: '迅捷' },
  { value: '蓄力', label: '蓄力' },
  { value: '中毒', label: '中毒' },
  { value: '灼烧', label: '灼烧' },
  { value: '冻结', label: '冻结' },
  { value: '萌化', label: '萌化' },
  { value: '奉献', label: '奉献' },
]

// 从 URL query 读取打击面预设（只消费一次）
const initialCoverage = ref(route.query.coverage ? route.query.coverage.split(',') : [])
const initialBloodline = ref(route.query.bloodline || '')

// 精灵的主副属性 ID 列表
const petElementIds = computed(() => {
  if (!pet.value) return []
  const ids = []
  if (pet.value.element_id) ids.push(pet.value.element_id)
  if (pet.value.sub_element_id) ids.push(pet.value.sub_element_id)
  return ids
})

const skillTabs = computed(() => {
  if (!pet.value) return []
  const tabs = []
  if (pet.value.skills?.length) tabs.push({ key: 'skills', label: '精灵技能', count: pet.value.skills.length })
  if (pet.value.bloodline_skills?.length) tabs.push({ key: 'bloodline', label: '血脉技能', count: pet.value.bloodline_skills.length })
  if (pet.value.learnable_stones?.length) tabs.push({ key: 'stones', label: '可学技能石', count: pet.value.learnable_stones.length })
  return tabs
})

const currentSkills = computed(() => {
  if (!pet.value) return []
  if (activeSkillTab.value === 'skills') return pet.value.skills || []
  if (activeSkillTab.value === 'bloodline') return pet.value.bloodline_skills || []
  if (activeSkillTab.value === 'stones') return pet.value.learnable_stones || []
  return []
})

// 当前 Tab 技能中出现的属性（用于属性筛选按钮）
const availableSkillElements = computed(() => {
  const names = new Set()
  for (const s of currentSkills.value) {
    if (s.element) names.add(s.element)
  }
  return elemList.value.filter(e => names.has(e.name))
})

const filteredSkills = computed(() => {
  let list = currentSkills.value
  if (skillElement.value) {
    list = list.filter(s => s.element === skillElement.value)
  }
  if (skillCategory.value) {
    list = list.filter(s => s.type === skillCategory.value)
  }
  if (skillCounter.value) {
    if (skillCounter.value === 'none') {
      list = list.filter(s => !s.description || !s.description.includes('应对'))
    } else {
      list = list.filter(s => s.description && s.description.includes(`应对${skillCounter.value}`))
    }
  }
  if (skillKeyword.value) {
    list = list.filter(s => s.description && s.description.includes(skillKeyword.value))
  }
  return list
})

// 合并所有技能来源（用于打击面分析，不含血脉技能）
const allSkills = computed(() => {
  if (!pet.value) return []
  return [
    ...(pet.value.skills || []),
    ...(pet.value.learnable_stones || []),
  ]
})

// 包含血脉技能
const allSkillsWithBloodline = computed(() => {
  if (!pet.value) return []
  return [
    ...(pet.value.skills || []),
    ...(pet.value.bloodline_skills || []),
    ...(pet.value.learnable_stones || []),
  ]
})

async function loadPet(uid) {
  const [petData, elemData, multData, neighborsData] = await Promise.all([
    petsApi.get(uid),
    elementsApi.list(),
    elementsApi.multipliers(),
    petsApi.neighbors(uid).catch(() => ({ prev: null, next: null })),
  ])
  pet.value = petData
  selectInitialEvolutionRoute()
  elemList.value = elemData.elements
  multipliers.value = multData
  neighbors.value = neighborsData
  const map = {}
  for (const e of elemData.elements) {
    map[e.name] = { icon: e.icon, color: e.color }
  }
  elemMap.value = map
  activeSkillTab.value = 'skills'

  // 加载技能详情
  await loadSkillDetails(petData.achievements)
}

function switchVariant(uid) {
  variantMenuOpen.value = false
  initialCoverage.value = []
  initialBloodline.value = ''
  router.replace(`/pets/${uid}`)
}

const statsBarList = computed(() => {
  if (!pet.value) return []
  return [
    { key: 'hp', label: '生命', value: pet.value.hp },
    { key: 'atk', label: '物攻', value: pet.value.atk },
    { key: 'matk', label: '魔攻', value: pet.value.matk },
    { key: 'def', label: '物防', value: pet.value.def },
    { key: 'mdef', label: '魔防', value: pet.value.mdef },
    { key: 'speed', label: '速度', value: pet.value.speed },
  ]
})

onMounted(() => {
  document.addEventListener('pointerdown', closeVariantMenu)
  loadPet(route.params.uid)
})
onUnmounted(() => document.removeEventListener('pointerdown', closeVariantMenu))

// Show swipe guide mask once for mobile/tablet devices (< xl breakpoint)
onMounted(() => {
  const hintKey = 'pet-swipe-guide-done'
  if (!localStorage.getItem(hintKey) && window.innerWidth < 1280) {
    setTimeout(() => { showSwipeGuide.value = true }, 500)
  }
})

function dismissGuide() {
  showSwipeGuide.value = false
  localStorage.setItem('pet-swipe-guide-done', '1')
}

// Desktop: briefly show nav buttons on page enter, then fade out
onMounted(() => {
  if (window.innerWidth >= 1280) {
    navVisible.value = true
    setTimeout(() => { navVisible.value = false }, 2500)
  }
})

// Re-load when route param changes (same-route navigation, e.g. clicking evo chain links)
watch(() => route.params.uid, (newUid, oldUid) => {
  if (newUid && newUid !== oldUid) {
    initialCoverage.value = []
    initialBloodline.value = ''
    loadPet(newUid)
  }
})

// Mobile swipe gesture with visual feedback
const pageEl = ref(null)
const swipeOffset = ref(0)
const isSwiping = ref(false)
const isAnimating = ref(false)
let touchStartX = 0
let touchStartY = 0
let isHorizontalSwipe = null // null = undecided, true/false = locked

const swipeStyle = computed(() => {
  if (swipeOffset.value === 0 && !isAnimating.value) return {}
  return {
    transform: `translateX(${swipeOffset.value}px)`,
    transition: isSwiping.value ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  }
})

const SWIPE_THRESHOLD = 100 // px to trigger navigation
const MAX_OFFSET = 150 // max drag distance (with resistance)

function onTouchStart(e) {
  if (isAnimating.value) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  isHorizontalSwipe = null
  isSwiping.value = false

  // Ignore touches starting near screen edges (browser back/forward gesture zone)
  const edgeThreshold = 30
  if (touchStartX < edgeThreshold || touchStartX > window.innerWidth - edgeThreshold) {
    isHorizontalSwipe = false
  }
}

function onTouchMove(e) {
  if (isAnimating.value) return
  const dx = e.touches[0].clientX - touchStartX
  const dy = e.touches[0].clientY - touchStartY

  // Lock direction after 10px movement
  if (isHorizontalSwipe === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
    isHorizontalSwipe = Math.abs(dx) > Math.abs(dy)
  }
  if (!isHorizontalSwipe) return

  // Check if swipe direction has a valid neighbor
  if (dx > 0 && !neighbors.value.prev) return
  if (dx < 0 && !neighbors.value.next) return

  isSwiping.value = true
  // Apply resistance: the further you drag, the harder it gets
  const resistance = 1 - Math.min(Math.abs(dx) / (MAX_OFFSET * 3), 0.6)
  swipeOffset.value = dx * resistance
}

function onTouchEnd() {
  if (!isSwiping.value) return
  isSwiping.value = false

  const offset = swipeOffset.value
  if (Math.abs(offset) >= SWIPE_THRESHOLD) {
    // Dismiss guide on first successful swipe
    if (showSwipeGuide.value) {
      showSwipeGuide.value = false
      localStorage.setItem('pet-swipe-guide-done', '1')
    }
    // Trigger navigation: animate out
    isAnimating.value = true
    const direction = offset > 0 ? 1 : -1
    swipeOffset.value = direction * window.innerWidth
    setTimeout(() => {
      if (direction > 0 && neighbors.value.prev) {
        router.replace('/pets/' + neighbors.value.prev.uid)
      } else if (direction < 0 && neighbors.value.next) {
        router.replace('/pets/' + neighbors.value.next.uid)
      }
      // Reset after navigation
      setTimeout(() => {
        swipeOffset.value = 0
        isAnimating.value = false
      }, 50)
    }, 250)
  } else {
    // Snap back
    isAnimating.value = true
    swipeOffset.value = 0
    setTimeout(() => { isAnimating.value = false }, 300)
  }
}

onMounted(() => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
})
onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
})
</script>

<style>
/* 详情页沿用精灵卡片的属性色、编号水印、柔和阴影和数字信息层级。 */
.pet-detail-page {
  position: relative;
  --pet-detail-accent: #d69f23;
  --pet-detail-secondary: var(--pet-detail-accent);
}

.pet-detail-page .pet-detail-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.pet-detail-page .pet-detail__back {
  justify-self: start;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 12%, #e7e1d7);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.58);
  padding: 0.42rem 0.7rem;
  transition: border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.pet-detail-page .pet-detail__back:hover {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 34%, #e7e1d7);
  color: var(--pet-detail-accent);
  transform: translateX(-2px);
}

.pet-detail-page .pet-variant-switcher {
  display: inline-grid;
  grid-column: 2;
  justify-self: center;
  width: fit-content;
  max-width: 100%;
  grid-template-columns: auto minmax(16rem, 30rem);
  align-items: center;
  gap: 0.7rem;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 13%, #e7e1d7);
  border-radius: 1.1rem;
  background:
    radial-gradient(circle at 0% 50%, color-mix(in srgb, var(--pet-detail-accent) 8%, transparent), transparent 36%),
    rgb(255 255 255 / 0.64);
  padding: 0.5rem 0.55rem 0.5rem 0.72rem;
  box-shadow: 0 7px 20px rgb(68 40 20 / 0.045);
}

.pet-detail-page .pet-variant-heading {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
}

.pet-detail-page .pet-variant-label {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  color: #5f6875;
  font-weight: 600;
}

.pet-detail-page .pet-variant-label::before {
  width: 0.4rem;
  height: 0.4rem;
  flex: none;
  border-radius: 999px;
  background: var(--pet-detail-accent);
  box-shadow: 0 0 0 0.22rem color-mix(in srgb, var(--pet-detail-accent) 9%, transparent);
  content: '';
}

.pet-detail-page .pet-variant-count {
  border-radius: 999px;
  background: color-mix(in srgb, var(--pet-detail-accent) 8%, transparent);
  color: var(--pet-detail-accent);
  font-size: 0.65rem;
  font-variant-numeric: tabular-nums;
  padding: 0.2rem 0.42rem;
}

.pet-detail-page .pet-variant-select-shell {
  position: relative;
  min-width: 0;
}

.pet-detail-page .pet-variant-trigger {
  display: flex;
  width: 100%;
  min-height: 2.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 22%, #dfe3e8);
  border-radius: 0.8rem;
  outline: none;
  background: linear-gradient(120deg, color-mix(in srgb, var(--pet-detail-accent) 9%, white), rgb(255 255 255 / 0.94));
  color: #303846;
  font-size: 0.875rem;
  line-height: 1.35;
  padding: 0.58rem 0.72rem 0.58rem 0.8rem;
  text-align: left;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.pet-detail-page .pet-variant-trigger > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-detail-page .pet-variant-trigger:hover,
.pet-detail-page .pet-variant-trigger[aria-expanded='true'] {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 48%, #dfe3e8);
}

.pet-detail-page .pet-variant-trigger:focus-visible {
  border-color: var(--pet-detail-accent);
  box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--pet-detail-accent) 12%, transparent);
}

.pet-detail-page .pet-variant-chevron {
  width: 1.1rem;
  height: 1.1rem;
  flex: none;
  color: var(--pet-detail-accent);
  transition: transform 180ms ease;
}

.pet-detail-page .pet-variant-chevron--open {
  transform: rotate(180deg);
}

.pet-detail-page .pet-variant-menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.45rem);
  right: 0;
  left: 0;
  max-height: min(20rem, 52vh);
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 18%, #dfe3e8);
  border-radius: 0.95rem;
  background: rgb(255 255 255 / 0.96);
  padding: 0.38rem;
  box-shadow:
    0 14px 34px rgb(36 30 24 / 0.14),
    0 30px 68px -34px color-mix(in srgb, var(--pet-detail-accent) 42%, transparent);
  backdrop-filter: blur(16px);
}

.pet-detail-page .pet-variant-option {
  display: grid;
  width: 100%;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid transparent;
  border-radius: 0.72rem;
  color: #4b5563;
  font-size: 0.84rem;
  padding: 0.62rem 0.7rem;
  text-align: left;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.pet-detail-page .pet-variant-option:hover {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 12%, transparent);
  background: color-mix(in srgb, var(--pet-detail-accent) 7%, transparent);
  color: var(--pet-detail-accent);
}

.pet-detail-page .pet-variant-option--active {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 24%, transparent);
  background: color-mix(in srgb, var(--pet-detail-accent) 11%, white);
  color: var(--pet-detail-accent);
  font-weight: 600;
}

.pet-detail-page .pet-variant-option__dot {
  width: 0.42rem;
  height: 0.42rem;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 36%, transparent);
  border-radius: 999px;
}

.pet-detail-page .pet-variant-option--active .pet-variant-option__dot {
  border-color: var(--pet-detail-accent);
  background: var(--pet-detail-accent);
  box-shadow: 0 0 0 0.18rem color-mix(in srgb, var(--pet-detail-accent) 10%, transparent);
}

.pet-detail-page .pet-variant-option__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-detail-page .pet-variant-option__current {
  border-radius: 999px;
  background: color-mix(in srgb, var(--pet-detail-accent) 10%, transparent);
  font-size: 0.62rem;
  padding: 0.18rem 0.38rem;
}

.variant-menu-enter-active,
.variant-menu-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
  transform-origin: top center;
}

.variant-menu-enter-from,
.variant-menu-leave-to {
  opacity: 0;
  transform: translateY(-0.3rem) scale(0.985);
}
.pet-detail-page .pet-hero,
.pet-detail-page .pet-section-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 22%, #e7e1d7);
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at 3% 0%, color-mix(in srgb, var(--pet-detail-accent) 8%, transparent), transparent 38%),
    radial-gradient(circle at 97% 0%, color-mix(in srgb, var(--pet-detail-secondary) 9%, transparent), transparent 42%),
    linear-gradient(155deg, rgb(255 255 255 / 0.98), rgb(255 254 251 / 0.94));
  box-shadow:
    0 1px 2px rgb(68 40 20 / 0.04),
    0 14px 32px rgb(68 40 20 / 0.08),
    0 32px 64px -42px color-mix(in srgb, var(--pet-detail-accent) 48%, transparent);
}

.pet-detail-page .pet-hero::before,
.pet-detail-page .pet-section-card::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  opacity: 0.16;
  background-image: radial-gradient(color-mix(in srgb, var(--pet-detail-accent) 48%, transparent) 0.7px, transparent 0.7px);
  background-size: 13px 13px;
  mask-image: linear-gradient(to bottom, black, transparent 64%);
  content: '';
  pointer-events: none;
}


.pet-detail-page .pet-hero__layout {
  align-items: stretch;
}

.pet-detail-page .pet-hero__visual {
  position: relative;
  isolation: isolate;
  justify-content: center;
  width: min(100%, 20rem);
  min-height: 18.5rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 14%, transparent);
  border-radius: 1.25rem;
  background:
    radial-gradient(circle at 36% 56%, color-mix(in srgb, var(--pet-detail-accent) 16%, transparent), transparent 48%),
    radial-gradient(circle at 72% 46%, color-mix(in srgb, var(--pet-detail-secondary) 14%, transparent), transparent 48%),
    linear-gradient(145deg, rgb(255 255 255 / 0.74), rgb(255 255 255 / 0.2));
}

.pet-detail-page .pet-hero__serial {
  position: absolute;
  z-index: 4;
  top: 0.9rem;
  left: 0.9rem;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 24%, transparent);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.72);
  color: var(--pet-detail-accent);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.42rem 0.62rem;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.86);
}

.pet-detail-page .pet-hero__watermark {
  position: absolute;
  z-index: 0;
  top: -0.15rem;
  right: 0.8rem;
  background-image: linear-gradient(
    105deg,
    color-mix(in srgb, var(--pet-detail-accent) 9%, transparent),
    color-mix(in srgb, var(--pet-detail-secondary) 12%, transparent)
  );
  background-clip: text;
  color: transparent;
  font-size: clamp(5rem, 11vw, 8.5rem);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.08em;
  user-select: none;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.pet-detail-page .pet-hero__halo {
  position: absolute;
  z-index: 0;
  width: min(62%, 12rem);
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 18%, transparent);
  border-radius: 999px;
  box-shadow: 0 0 0 16px color-mix(in srgb, var(--pet-detail-accent) 4%, transparent);
  transition: transform 300ms ease;
}

.pet-detail-page .pet-hero:hover .pet-hero__halo {
  transform: scale(1.06) rotate(7deg);
}

.pet-detail-page .pet-hero__image {
  position: relative;
  z-index: 2;
  width: min(72%, 13.5rem);
  height: 13.5rem;
  margin-top: 1.5rem;
  filter: drop-shadow(0 18px 15px rgb(24 30 39 / 0.2));
  transition: transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), filter 300ms ease;
}

.pet-detail-page .pet-hero:hover .pet-hero__image {
  filter: drop-shadow(0 22px 18px rgb(24 30 39 / 0.25));
  transform: scale(1.035) translateY(-2px);
}

.pet-detail-page .pet-hero__image-tabs {
  position: relative;
  z-index: 4;
  min-height: 3.2rem;
  border: 1px solid rgb(231 225 215 / 0.66);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.7);
  padding: 0.35rem 0.75rem;
  backdrop-filter: blur(8px);
}

.pet-detail-page .pet-hero__info {
  align-self: center;
  padding: 0.35rem 0.2rem;
}

.pet-detail-page .pet-hero__name {
  position: relative;
  padding-left: 0.72rem;
  color: #202938;
  font-family: 'MIANFEIZITI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-weight: 400;
  letter-spacing: 0.025em;
  transition: color 180ms ease;
}

.pet-detail-page .pet-hero__name::before {
  position: absolute;
  top: 0.2em;
  bottom: 0.2em;
  left: 0;
  width: 0.2rem;
  border-radius: 999px;
  background: linear-gradient(to bottom, var(--pet-detail-accent), var(--pet-detail-secondary));
  content: '';
}

.pet-detail-page .pet-hero:hover .pet-hero__name {
  color: var(--pet-detail-accent);
}

.pet-detail-page .pet-hero__ability {
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 13%, transparent);
  background: linear-gradient(
    125deg,
    color-mix(in srgb, var(--pet-detail-accent) 8%, white),
    color-mix(in srgb, var(--pet-detail-secondary) 5%, white)
  );
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.74);
}

.pet-detail-page .pet-hero__meta > div {
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 12%, transparent);
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 0.62);
  padding: 0.45rem 0.65rem;
}

.pet-detail-page .pet-section-card {
  transition: border-color 180ms ease, box-shadow 220ms ease, transform 220ms ease;
}

.pet-detail-page .pet-section-card:hover {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 34%, #e7e1d7);
  box-shadow:
    0 3px 8px rgb(68 40 20 / 0.05),
    0 18px 40px rgb(68 40 20 / 0.1),
    0 34px 70px -42px color-mix(in srgb, var(--pet-detail-accent) 54%, transparent);
  transform: translateY(-1px);
}

.pet-detail-page .pet-section-card > h3,
.pet-detail-page .pet-section-title {
  position: relative;
  padding-left: 0.7rem;
  color: #202938;
  font-family: 'MIANFEIZITI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  letter-spacing: 0.025em;
}

.pet-detail-page .pet-section-card > h3::before,
.pet-detail-page .pet-section-title::before {
  position: absolute;
  top: 0.12em;
  bottom: 0.12em;
  left: 0;
  width: 0.18rem;
  border-radius: 999px;
  background: linear-gradient(to bottom, var(--pet-detail-accent), var(--pet-detail-secondary));
  content: '';
}

.pet-detail-page .pet-total-value,
.pet-detail-page .pet-evolution-card {
  overflow: visible;
}

.pet-detail-page .pet-evolution-card--menu-open {
  z-index: 40;
}

.pet-detail-page .pet-evolution-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.pet-detail-page .pet-evolution-header > h3 {
  flex: none;
  margin: 0;
}

.pet-detail-page .pet-evolution-controls {
  min-width: 0;
}

.pet-detail-page .pet-evolution-tabs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 13%, #e3e6ea);
  border-radius: 0.9rem;
  background: rgb(255 255 255 / 0.48);
  padding: 0.28rem;
}

.pet-detail-page .pet-evolution-tab {
  display: grid;
  gap: 0.08rem;
  min-width: 6.5rem;
  border: 1px solid transparent;
  border-radius: 0.68rem;
  color: #687382;
  font-size: 0.72rem;
  padding: 0.48rem 0.65rem;
  text-align: left;
  transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
}

.pet-detail-page .pet-evolution-tab small {
  max-width: 9rem;
  overflow: hidden;
  color: #8b94a1;
  font-size: 0.62rem;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-detail-page .pet-evolution-tab:hover {
  background: color-mix(in srgb, var(--pet-detail-accent) 6%, transparent);
  color: var(--pet-detail-accent);
}

.pet-detail-page .pet-evolution-tab--active {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 24%, transparent);
  background: color-mix(in srgb, var(--pet-detail-accent) 11%, white);
  color: var(--pet-detail-accent);
  font-weight: 600;
}

.pet-detail-page .pet-evolution-tab--active small {
  color: color-mix(in srgb, var(--pet-detail-accent) 72%, #687382);
}

.pet-detail-page .pet-evolution-select {
  position: relative;
  width: min(31rem, 58vw);
}

.pet-detail-page .pet-evolution-select__trigger {
  display: flex;
  width: 100%;
  min-height: 2.7rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 20%, #dfe3e8);
  border-radius: 0.82rem;
  background: linear-gradient(120deg, color-mix(in srgb, var(--pet-detail-accent) 7%, white), rgb(255 255 255 / 0.86));
  color: #465160;
  font-size: 0.78rem;
  padding: 0.62rem 0.75rem 0.62rem 0.85rem;
  text-align: left;
}

.pet-detail-page .pet-evolution-select__trigger > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-detail-page .pet-evolution-select__chevron {
  width: 1.05rem;
  height: 1.05rem;
  flex: none;
  color: var(--pet-detail-accent);
  transition: transform 180ms ease;
}

.pet-detail-page .pet-evolution-select__chevron--open {
  transform: rotate(180deg);
}

.pet-detail-page .pet-evolution-select__menu {
  position: absolute;
  z-index: 35;
  top: calc(100% + 0.4rem);
  right: 0;
  left: 0;
  max-height: min(23rem, 56vh);
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 18%, #dfe3e8);
  border-radius: 0.9rem;
  background: rgb(255 255 255 / 0.97);
  padding: 0.38rem;
  box-shadow: 0 18px 44px rgb(36 30 24 / 0.16);
  backdrop-filter: blur(16px);
}

.pet-detail-page .pet-evolution-select__option {
  display: grid;
  width: 100%;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid transparent;
  border-radius: 0.7rem;
  color: #596474;
  font-size: 0.75rem;
  padding: 0.58rem 0.65rem;
  text-align: left;
}

.pet-detail-page .pet-evolution-select__option:hover,
.pet-detail-page .pet-evolution-select__option--active {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 18%, transparent);
  background: color-mix(in srgb, var(--pet-detail-accent) 8%, transparent);
  color: var(--pet-detail-accent);
}

.pet-detail-page .pet-evolution-select__number {
  display: grid;
  width: 1.55rem;
  height: 1.55rem;
  place-items: center;
  border-radius: 0.55rem;
  background: color-mix(in srgb, var(--pet-detail-accent) 9%, transparent);
  color: var(--pet-detail-accent);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.pet-detail-page .pet-evolution-select__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-detail-page .pet-evolution-select__current {
  border-radius: 999px;
  background: color-mix(in srgb, var(--pet-detail-accent) 10%, transparent);
  font-size: 0.6rem;
  padding: 0.18rem 0.38rem;
  white-space: nowrap;
}

.pet-detail-page .pet-evolution-viewport {
  overflow-x: auto;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent) 10%, #e7e9ed);
  border-radius: 1.15rem;
  background:
    radial-gradient(circle at 8% 20%, color-mix(in srgb, var(--pet-detail-accent) 6%, transparent), transparent 38%),
    radial-gradient(circle at 92% 80%, color-mix(in srgb, var(--pet-detail-secondary) 6%, transparent), transparent 40%),
    rgb(255 255 255 / 0.28);
  scrollbar-width: thin;
}

.pet-detail-page .pet-evolution-track {
  display: flex;
  width: max-content;
  min-width: 100%;
  min-height: 11.5rem;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.25rem;
}

.pet-detail-page .pet-evolution-stage {
  position: relative;
  display: flex;
  width: 8.6rem;
  min-height: 9rem;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 1rem;
  color: #4c5665;
  padding: 0.7rem;
  text-align: center;
  transition: border-color 170ms ease, background-color 170ms ease, color 170ms ease, transform 170ms ease;
}

.pet-detail-page a.pet-evolution-stage:hover {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 18%, transparent);
  background: color-mix(in srgb, var(--pet-detail-accent) 7%, transparent);
  color: var(--pet-detail-accent);
  transform: translateY(-2px);
}

.pet-detail-page .pet-evolution-stage img,
.pet-detail-page .pet-evolution-stage__placeholder {
  width: 5.5rem;
  height: 5.5rem;
  object-fit: contain;
}

.pet-detail-page .pet-evolution-stage__placeholder {
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pet-detail-accent) 6%, #f1f3f5);
  color: #9aa2ae;
}

.pet-detail-page .pet-evolution-stage > span {
  width: 100%;
  overflow: hidden;
  margin-top: 0.35rem;
  font-size: 0.76rem;
  line-height: 1.2rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-detail-page .pet-evolution-stage > small {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  border-radius: 999px;
  background: var(--pet-detail-accent);
  color: white;
  font-size: 0.56rem;
  padding: 0.16rem 0.35rem;
}

.pet-detail-page .pet-evolution-stage--current {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 38%, transparent);
  background: color-mix(in srgb, var(--pet-detail-accent) 10%, white);
  color: var(--pet-detail-accent);
  box-shadow: 0 12px 28px -20px color-mix(in srgb, var(--pet-detail-accent) 62%, transparent);
}

.pet-detail-page .pet-evolution-arrow {
  display: flex;
  width: 5.8rem;
  flex: none;
  flex-direction: column;
  align-items: center;
  color: var(--pet-detail-accent);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.pet-detail-page .pet-evolution-arrow > svg {
  width: 1.55rem;
  height: 1.55rem;
}

.evolution-route-enter-active,
.evolution-route-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.evolution-route-enter-from {
  opacity: 0;
  transform: translateX(0.45rem);
}

.evolution-route-leave-to {
  opacity: 0;
  transform: translateX(-0.45rem);
}

.dark .pet-detail-page .pet-evolution-tabs,
.dark .pet-detail-page .pet-evolution-viewport {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 16%, #303a48);
  background: rgb(17 21 28 / 0.3);
}

.dark .pet-detail-page .pet-evolution-tab,
.dark .pet-detail-page .pet-evolution-stage {
  color: #b7c0cc;
}

.dark .pet-detail-page .pet-evolution-tab small {
  color: #87919f;
}

.dark .pet-detail-page .pet-evolution-tab--active,
.dark .pet-detail-page .pet-evolution-stage--current {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 30%, #303a48);
  background: color-mix(in srgb, var(--pet-detail-accent) 12%, #202835);
  color: var(--pet-detail-accent);
}

.dark .pet-detail-page .pet-evolution-select__trigger {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 24%, #303a48);
  background: linear-gradient(120deg, color-mix(in srgb, var(--pet-detail-accent) 9%, #202835), #202835);
  color: #d8dee7;
}

.dark .pet-detail-page .pet-evolution-select__menu {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 24%, #303a48);
  background: rgb(25 31 41 / 0.98);
  box-shadow: 0 18px 44px rgb(0 0 0 / 0.36);
}

.dark .pet-detail-page .pet-evolution-select__option {
  color: #c2cad5;
}

.dark .pet-detail-page .pet-evolution-select__option:hover,
.dark .pet-detail-page .pet-evolution-select__option--active {
  background: color-mix(in srgb, var(--pet-detail-accent) 12%, #202835);
  color: var(--pet-detail-accent);
}

@media (max-width: 639px) {
  .pet-detail-page .pet-evolution-header {
    align-items: stretch;
    flex-direction: column;
    gap: 0.65rem;
  }

  .pet-detail-page .pet-evolution-select {
    width: 100%;
  }

  .pet-detail-page .pet-evolution-track {
    min-height: 9.6rem;
    justify-content: flex-start;
    padding: 0.75rem;
  }

  .pet-detail-page .pet-evolution-stage {
    width: 7.1rem;
    min-height: 8.2rem;
    padding: 0.55rem;
  }

  .pet-detail-page .pet-evolution-stage img,
  .pet-detail-page .pet-evolution-stage__placeholder {
    width: 4.7rem;
    height: 4.7rem;
  }

  .pet-detail-page .pet-evolution-arrow {
    width: 4.5rem;
  }
}
.pet-detail-page .pet-stat-value {
  color: var(--pet-detail-accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.pet-detail-page .pet-total-value {
  position: relative;
  padding-bottom: 0.12rem;
  font-size: 1.1em;
}

.pet-detail-page .pet-total-value::after {
  position: absolute;
  right: 0;
  bottom: -0.08rem;
  left: 0;
  height: 0.12rem;
  border-radius: 999px;
  background: linear-gradient(to right, var(--pet-detail-accent), var(--pet-detail-secondary));
  content: '';
}

.pet-detail-page .pet-stat-row {
  border-radius: 0.8rem;
  padding: 0.22rem 0.35rem;
  transition: background-color 160ms ease;
}

.pet-detail-page .pet-stat-row:hover {
  background: color-mix(in srgb, var(--pet-detail-accent) 6%, transparent);
}

.pet-detail-page .pet-stat-track {
  background: color-mix(in srgb, var(--pet-detail-accent) 7%, #f0f1f3);
  box-shadow: inset 0 1px 2px rgb(24 30 39 / 0.06);
}

.pet-detail-page .pet-stat-fill {
  background: linear-gradient(90deg, var(--pet-detail-accent), var(--pet-detail-secondary));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.28);
}

.pet-detail-page .pet-stat-value {
  text-align: right;
  font-weight: 700;
}

.dark .pet-detail-page .pet-detail__back,
.dark .pet-detail-page .pet-variant-switcher {
  background:
    radial-gradient(circle at 0% 50%, color-mix(in srgb, var(--pet-detail-accent) 11%, transparent), transparent 36%),
    rgb(17 21 28 / 0.52);
}

.dark .pet-detail-page .pet-variant-label {
  color: #aeb6c2;
}

.dark .pet-detail-page .pet-variant-trigger {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 26%, #303a48);
  background: linear-gradient(120deg, color-mix(in srgb, var(--pet-detail-accent) 10%, #202835), #202835);
  color: #f2f4f7;
}

.dark .pet-detail-page .pet-variant-menu {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 26%, #303a48);
  background: rgb(25 31 41 / 0.98);
  box-shadow: 0 18px 42px rgb(0 0 0 / 0.34);
}

.dark .pet-detail-page .pet-variant-option {
  color: #c7ced8;
}

.dark .pet-detail-page .pet-variant-option:hover {
  background: color-mix(in srgb, var(--pet-detail-accent) 10%, #202835);
}

.dark .pet-detail-page .pet-variant-option--active {
  background: color-mix(in srgb, var(--pet-detail-accent) 16%, #202835);
  color: var(--pet-detail-accent);
}

.dark .pet-detail-page .pet-hero,
.dark .pet-detail-page .pet-section-card {
  border-color: color-mix(in srgb, var(--pet-detail-accent) 28%, #303a48);
  background:
    radial-gradient(circle at 3% 0%, color-mix(in srgb, var(--pet-detail-accent) 11%, transparent), transparent 38%),
    radial-gradient(circle at 97% 0%, color-mix(in srgb, var(--pet-detail-secondary) 12%, transparent), transparent 42%),
    linear-gradient(155deg, rgb(31 39 51 / 0.98), rgb(25 31 41 / 0.98));
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.2),
    0 18px 38px rgb(0 0 0 / 0.24),
    0 34px 72px -42px color-mix(in srgb, var(--pet-detail-accent) 58%, transparent);
}

.dark .pet-detail-page .pet-hero__visual {
  background:
    radial-gradient(circle at 36% 56%, color-mix(in srgb, var(--pet-detail-accent) 19%, transparent), transparent 48%),
    radial-gradient(circle at 72% 46%, color-mix(in srgb, var(--pet-detail-secondary) 16%, transparent), transparent 48%),
    linear-gradient(145deg, rgb(255 255 255 / 0.035), rgb(255 255 255 / 0.015));
}

.dark .pet-detail-page .pet-hero__serial,
.dark .pet-detail-page .pet-hero__image-tabs,
.dark .pet-detail-page .pet-hero__meta > div {
  background: rgb(17 21 28 / 0.58);
}

.dark .pet-detail-page .pet-hero__name,
.dark .pet-detail-page .pet-section-card > h3,
.dark .pet-detail-page .pet-section-title {
  color: #f2f4f7;
}

.dark .pet-detail-page .pet-hero:hover .pet-hero__name {
  color: var(--pet-detail-accent);
}

.dark .pet-detail-page .pet-hero__ability {
  background: linear-gradient(
    125deg,
    color-mix(in srgb, var(--pet-detail-accent) 11%, #1c232e),
    color-mix(in srgb, var(--pet-detail-secondary) 8%, #1c232e)
  );
}

.dark .pet-detail-page .pet-stat-track {
  background: color-mix(in srgb, var(--pet-detail-accent) 8%, #202835);
}

@media (max-width: 639px) {
  .pet-detail-page .pet-detail-toolbar {
    display: flex;
    align-items: stretch;
    flex-direction: column;
    gap: 0.55rem;
  }

  .pet-detail-page .pet-detail__back {
    align-self: flex-start;
  }

  .pet-detail-page .pet-variant-switcher {
    width: 100%;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.45rem;
    border-radius: 1rem;
    padding: 0.55rem;
  }

  .pet-detail-page .pet-variant-heading {
    justify-content: space-between;
    padding-inline: 0.2rem;
  }

  .pet-detail-page .pet-variant-trigger {
    min-height: 2.65rem;
    font-size: 0.82rem;
  }

  .pet-detail-page .pet-hero {
    padding: 0.8rem;
  }

  .pet-detail-page .pet-hero__visual {
    min-height: 17rem;
  }

  .pet-detail-page .pet-hero__image {
    height: 11.5rem;
  }

  .pet-detail-page .pet-hero__info {
    padding-inline: 0.25rem;
  }

  .pet-detail-page .pet-hero__name {
    padding-left: 0.62rem;
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .pet-detail-page .pet-detail-toolbar {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .pet-detail-page .pet-variant-switcher {
    width: 100%;
    grid-column: 2;
    grid-template-columns: auto minmax(0, 1fr);
    justify-self: stretch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pet-detail-page .pet-hero__halo,
  .pet-detail-page .pet-hero__image,
  .pet-detail-page .pet-section-card {
    transition: none;
  }

  .pet-detail-page .pet-hero:hover .pet-hero__image,
  .pet-detail-page .pet-section-card:hover {
    transform: none;
  }
}

/* Unscoped: Teleport content needs global styles */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* === Swipe Guide Animations === */

/* Finger swipe: left-right motion */
@keyframes swipe-finger {
  0%, 100% { transform: translateX(0); }
  10% { transform: translateX(0); }
  35% { transform: translateX(55px); }
  45% { transform: translateX(55px); }
  55% { transform: translateX(0); }
  65% { transform: translateX(0); }
  85% { transform: translateX(-55px); }
  92% { transform: translateX(-55px); }
}
.swipe-finger-anim {
  animation: swipe-finger 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* Pulse ring: breathing glow */
@keyframes pulse-ring {
  0%, 100% { transform: scale(0.8); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 0.15; }
}
.guide-pulse-ring {
  animation: pulse-ring 2.5s ease-in-out infinite;
}
.guide-pulse-ring-delay {
  animation: pulse-ring 2.5s ease-in-out infinite 0.8s;
}

/* Track glow: shimmer along the track */
@keyframes track-glow {
  0% { left: -33%; }
  100% { left: 100%; }
}
.guide-track-glow {
  animation: track-glow 2s linear infinite;
}

/* Arrows: alternating fade */
@keyframes arrow-left {
  0%, 100% { opacity: 0.3; transform: translateX(0) translateY(-50%); }
  25% { opacity: 1; transform: translateX(-4px) translateY(-50%); }
  50% { opacity: 0.3; transform: translateX(0) translateY(-50%); }
}
@keyframes arrow-right {
  0%, 100% { opacity: 0.3; transform: translateX(0) translateY(-50%); }
  50% { opacity: 0.3; transform: translateX(0) translateY(-50%); }
  75% { opacity: 1; transform: translateX(4px) translateY(-50%); }
}
.guide-arrow-left {
  animation: arrow-left 3.5s ease-in-out infinite;
}
.guide-arrow-right {
  animation: arrow-right 3.5s ease-in-out infinite;
}

/* Text breathe */
@keyframes text-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.guide-text-breathe {
  animation: text-breathe 3s ease-in-out infinite;
}

/* Finger trail glow */
.guide-finger-trail {
  animation: pulse-ring 2s ease-in-out infinite;
}
</style>
