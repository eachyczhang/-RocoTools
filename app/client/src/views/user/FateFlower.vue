
<template>
  <div>
    <!-- Loading -->
    <div v-if="!loaded" class="text-muted text-center mt-20">
      <div class="animate-pulse">加载中...</div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!allPets.length" class="text-center mt-20">
      <div class="text-4xl mb-3">🌸</div>
      <p class="text-muted">暂无命定花种数据</p>
      <router-link to="/events" class="text-sm text-primary-500 hover:underline mt-2 inline-block">← 返回活动日历</router-link>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4">
        <button @click="goBack" class="text-sm text-muted hover:text-primary-500 cursor-pointer">← 返回</button>
        <h1 class="font-roco text-xl sm:text-2xl text-primary-500">命定花种</h1>
        <span v-if="currentEvent" class="text-xs text-muted">
          {{ formatDateRange(currentEvent) }}
        </span>
      </div>

      <!-- Pet selector tabs with avatars -->
      <div class="pet-tabs-container mb-5">
        <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 px-1 pt-1">
          <button
            v-for="pet in allPets"
            :key="pet.uid"
            @click="selectPet(pet)"
            class="pet-tab-btn"
            :class="selectedPet && selectedPet.uid === pet.uid ? 'pet-tab-active' : 'pet-tab-inactive'"
          >
            <img :src="pet.icon" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain" :alt="pet.name" />
            <span class="text-xs sm:text-sm font-medium whitespace-nowrap mt-1">{{ pet.name }}</span>
          </button>
        </div>
      </div>

      <!-- Selected pet detail -->
      <div v-if="selectedPet && petDetail" class="space-y-4">
        <!-- Pet card -->
        <div class="card">
          <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
            <!-- Pet image -->
            <div class="flex-shrink-0">
              <img :src="petDetail.detail?.image_default || petDetail.image_url" class="w-32 h-32 sm:w-40 sm:h-40 object-contain" />
            </div>
            <!-- Pet info -->
            <div class="flex-1 text-center sm:text-left">
              <h2 class="font-roco text-lg sm:text-xl mb-2">{{ petDetail.name }}</h2>
              <!-- Element + Bloodline element -->
              <div class="flex items-center gap-2 justify-center sm:justify-start mb-2 flex-wrap">
                <div class="flex items-center gap-1">
                  <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-5 h-5" />
                  <span class="text-sm font-medium">{{ petDetail.element_name }}</span>
                </div>
                <template v-if="petDetail.sub_element_icon">
                  <span class="text-muted text-xs">/</span>
                  <div class="flex items-center gap-1">
                    <img :src="petDetail.sub_element_icon" class="w-5 h-5" />
                    <span class="text-sm">{{ petDetail.sub_element_name }}</span>
                  </div>
                </template>
                <!-- Bloodline element (same as main element) -->
                <span class="text-muted text-xs mx-1">|</span>
                <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20">
                  <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-4 h-4" />
                  <span class="text-xs font-medium text-purple-600 dark:text-purple-400">血脉：{{ petDetail.element_name }}</span>
                </div>
                <!-- Fate nature -->
                <template v-if="fateNature">
                  <span class="text-muted text-xs mx-1">|</span>
                  <div class="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20">
                    <span class="text-xs font-medium text-green-600 dark:text-green-400">性格：{{ fateNature }}</span>
                  </div>
                </template>
              </div>
              <!-- Ability -->
              <div v-if="petDetail.ability_name" class="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] mb-2">
                <img v-if="petDetail.detail?.ability_icon" :src="petDetail.detail.ability_icon" class="w-8 h-8 rounded object-contain flex-shrink-0" />
                <div class="text-left">
                  <div class="font-medium text-sm">{{ petDetail.ability_name }}</div>
                  <div class="text-xs text-muted">{{ petDetail.ability_desc }}</div>
                </div>
              </div>
              <!-- Stats -->
              <div class="flex flex-wrap gap-2 justify-center sm:justify-start text-xs">
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">
                  种族值 <strong class="text-primary-500">{{ petDetail.total }}</strong>
                </span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">生命 {{ petDetail.hp }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">物攻 {{ petDetail.atk }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">魔攻 {{ petDetail.matk }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">物防 {{ petDetail.def }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">魔防 {{ petDetail.mdef }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">速度 {{ petDetail.speed }}</span>
              </div>
              <!-- Link to full detail -->
              <router-link :to="'/pets/' + petDetail.uid" class="inline-block mt-3 text-sm text-primary-500 hover:underline">
                查看完整详情 →
              </router-link>
            </div>
          </div>
        </div>

        <!-- Fate Flower fixed skills -->
        <div class="card">
          <h3 class="font-roco text-sm sm:text-base mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-pink-500"></span>
            命定技能
          </h3>

          <!-- 愿力冲击 (fixed skill for all fate flower pets) -->
          <div class="mb-4">
            <div class="flex items-start gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-lg bg-gray-50 dark:bg-white/5">
              <!-- Element icon as skill icon (bloodline element) -->
              <img v-if="petDetail.element_icon" :src="petDetail.element_icon"
                class="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded flex-shrink-0 mt-0.5" />
              <div v-else class="w-8 h-8 sm:w-10 sm:h-10 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                  <span class="font-medium text-sm sm:text-base">愿力冲击</span>
                  <span v-if="elemMap[petDetail.element_name]" class="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded text-xs sm:text-sm"
                    :style="{ background: elemMap[petDetail.element_name].color + '18', color: elemMap[petDetail.element_name].color }">
                    <img :src="elemMap[petDetail.element_name].icon" class="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{{ petDetail.element_name }}</span>
                  </span>
                  <span class="text-xs sm:text-sm font-medium px-1.5 py-0.5 rounded bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400">固定技能</span>
                </div>
                <p class="text-xs sm:text-sm text-muted mt-1 sm:mt-1.5">
                  攻击属性 = 精灵血脉属性（{{ petDetail.element_name }}）；自动适配物攻/魔攻更高的一项；可应对状态技能，应对成功后威力 ×1.5
                </p>
              </div>
            </div>
          </div>

          <!-- Configured skills from admin (grouped by source) -->
          <template v-if="groupedFateSkills">
            <div v-if="groupedFateSkills.skills.length" class="mb-3">
              <div class="text-xs text-muted mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                升级技能
              </div>
              <SkillTable title="" :skills="groupedFateSkills.skills" :elem-map="elemMap" />
            </div>
            <div v-if="groupedFateSkills.bloodline_skills.length" class="mb-3">
              <div class="text-xs text-muted mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                血脉技能
              </div>
              <SkillTable title="" :skills="groupedFateSkills.bloodline_skills" :elem-map="elemMap" />
            </div>
            <div v-if="groupedFateSkills.learnable_stones.length">
              <div class="text-xs text-muted mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                技能石技能
              </div>
              <SkillTable title="" :skills="groupedFateSkills.learnable_stones" :elem-map="elemMap" />
            </div>
          </template>

          <!-- Fallback: Bloodline skills matching main element (no admin config) -->
          <div v-else-if="bloodlineElementSkills.length">
            <div class="text-xs text-muted mb-2 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              血脉技能（{{ petDetail.element_name }}系）
            </div>
            <SkillTable title="" :skills="bloodlineElementSkills" :elem-map="elemMap" />
          </div>
        </div>

        <!-- Counter-picks recommendation -->
        <div class="card">
          <h3 class="font-roco text-sm sm:text-base mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            反制推荐
            <span class="text-xs font-normal text-muted">（最适合应对该花种精灵的精灵）</span>
          </h3>

          <!-- Attack profile summary -->
          <div v-if="counterPicks" class="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
            <div class="flex items-center gap-2 sm:gap-3 flex-wrap text-xs sm:text-sm">
              <div class="flex items-center gap-1.5">
                <span class="text-muted">攻击倾向：</span>
                <span class="font-medium" :class="counterPicks.attack_profile.tendency === '物攻' ? 'text-red-500' : 'text-purple-500'">
                  {{ counterPicks.attack_profile.tendency }}
                </span>
                <span class="text-muted text-xs">
                  ({{ counterPicks.attack_profile.tendency_values.atk }}/{{ counterPicks.attack_profile.tendency_values.matk }})
                </span>
              </div>
              <span class="text-muted">|</span>
              <div class="flex items-center gap-1.5">
                <span class="text-muted">攻击属性：</span>
                <div class="flex items-center gap-1">
                  <template v-for="elemName in counterPicks.attack_profile.elements" :key="elemName">
                    <span v-if="elemMap[elemName]" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                      :style="{ background: elemMap[elemName].color + '15', color: elemMap[elemName].color }">
                      <img :src="elemMap[elemName].icon" class="w-3.5 h-3.5" />
                      <span class="text-xs">{{ elemName }}</span>
                    </span>
                  </template>
                </div>
              </div>
              <span class="text-muted">|</span>
              <div class="flex items-center gap-1.5">
                <span class="text-muted">弱点：</span>
                <div class="flex items-center gap-1">
                  <template v-for="elemName in counterPicks.attack_profile.target_weak_to" :key="elemName">
                    <span v-if="elemMap[elemName]" class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded"
                      :style="{ background: elemMap[elemName].color + '15', color: elemMap[elemName].color }">
                      <img :src="elemMap[elemName].icon" class="w-3 h-3" />
                    </span>
                  </template>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 flex-wrap">
              <span v-if="counterPicks.attack_profile.has_status_skills" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                ⚡ 有状态技能
              </span>
              <span v-if="counterPicks.attack_profile.has_defense_skills" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
                🛡️ 有防御技能
              </span>
              <span v-if="counterPicks.attack_profile.boss_weaker_def" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                💢 {{ counterPicks.attack_profile.boss_weaker_def === 'physical' ? '物防较低' : '魔防较低' }}
                ({{ counterPicks.attack_profile.boss_def }}/{{ counterPicks.attack_profile.boss_mdef }})
              </span>
            </div>
            <!-- Tag legend -->
            <div class="flex items-center gap-2 sm:gap-3 mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-500/20 flex-wrap">
              <span class="text-[10px] text-muted mr-0.5">图例：</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[9px]">⚔️💥</span> 高威力克制+应对</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[9px]">⚔️</span> 克制技能</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 text-[9px]">⚡</span> 应对状态</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 text-[9px]">🛡️</span> 应对防御</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 text-[9px]">🔰</span> 应对攻击</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 text-[9px]">💢</span> 克制弱防</span>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="counterLoading" class="text-center py-6 text-muted text-sm animate-pulse">
            分析中...
          </div>

          <!-- Grouped recommended pets by resistance -->
          <template v-else-if="counterPicks && counterPicks.groups && counterPicks.groups.length">
            <div v-for="(group, gIdx) in counterPicks.groups" :key="gIdx" class="mb-4 last:mb-0">
              <!-- Group header -->
              <div class="flex items-center gap-2 mb-2">
                <div class="flex items-center gap-1">
                  <template v-for="elemName in group.resisted_elements" :key="elemName">
                    <span v-if="elemMap[elemName]" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
                      :style="{ background: elemMap[elemName].color + '15', color: elemMap[elemName].color }">
                      <img :src="elemMap[elemName].icon" class="w-3.5 h-3.5" />
                      <span>{{ elemName }}</span>
                    </span>
                  </template>
                </div>
                <span class="text-xs font-medium">
                  {{ group.resisted_elements.length === counterPicks.attack_profile.elements.length ? '全抗' : '抵抗' }}
                </span>
                <span class="text-[10px] text-muted">({{ group.count }}只)</span>
                <div class="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
              </div>

              <!-- Pets grid: 5 per row, auto height -->
              <div class="grid grid-cols-5 gap-2 sm:gap-3">
                <div
                  v-for="cp in group.pets"
                  :key="cp.uid"
                  @click="openSkillModal(cp)"
                  class="counter-pick-card group flex flex-col items-center p-2 sm:p-2.5"
                >
                  <!-- Pet image -->
                  <img :src="cp.image_url" class="w-14 h-14 sm:w-16 sm:h-16 md:w-[4.5rem] md:h-[4.5rem] object-contain mx-auto" :alt="cp.name" />
                  <!-- Pet name -->
                  <div class="text-xs sm:text-sm font-medium text-center mt-1 truncate w-full">{{ cp.name }}</div>
                  <!-- Element badges -->
                  <div class="flex items-center justify-center gap-1 mt-1">
                    <img v-if="cp.element_icon" :src="cp.element_icon" class="w-4 h-4 sm:w-[1.1rem] sm:h-[1.1rem]" :title="cp.element_name" />
                    <img v-if="cp.sub_element_icon" :src="cp.sub_element_icon" class="w-4 h-4 sm:w-[1.1rem] sm:h-[1.1rem]" :title="cp.sub_element_name" />
                  </div>
                  <!-- Bonus tags -->
                  <div class="flex items-center gap-0.5 mt-1.5 flex-wrap justify-center">
                    <span v-if="cp.se_attack_score" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                      {{ cp.se_attack_score >= 2.5 ? '⚔️💥' : cp.se_attack_score >= 1.5 ? '⚔️' : '🗡️' }}
                    </span>
                    <span v-if="cp.counter_status_bonus" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                      {{ cp.counter_status_bonus >= 2 ? '⚡克' : '⚡' }}
                    </span>
                    <span v-if="cp.counter_defense_bonus" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
                      🛡️
                    </span>
                    <span v-if="cp.counter_attack_bonus" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                      🔰
                    </span>
                    <span v-if="cp.boss_weak_bonus" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                      💢
                    </span>
                  </div>
                  <!-- Defense stat & score -->
                  <div class="text-[10px] sm:text-xs text-muted mt-1 text-center">
                    {{ counterPicks.attack_profile.defense_stat_used === 'def' ? '物防' : '魔防' }}
                    <span class="font-medium text-foreground">{{ cp.def_value }}</span>
                    <span class="ml-1 text-blue-500 font-medium">{{ cp.total_score.toFixed(1) }}</span>
                  </div>
                  <!-- Score progress bar -->
                  <div class="w-full mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
                      :style="{ width: Math.max(10, Math.min(100, cp.total_score / (group.pets[0]?.total_score || 1) * 100)) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty state -->
          <div v-else-if="!counterLoading" class="text-center py-6 text-muted text-sm">
            暂无反制推荐数据
          </div>
        </div>
      </div>

      <!-- Loading pet detail -->
      <div v-else-if="selectedPet && !petDetail" class="text-muted text-center mt-10">
        <div class="animate-pulse">加载精灵信息...</div>
      </div>
    </template>

    <!-- Skill Recommendation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="skillModalVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="skillModalVisible = false">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <!-- Modal header -->
            <div class="flex items-center gap-3 p-4 sm:p-5 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
              <img v-if="skillModalPet?.image_url" :src="skillModalPet.image_url" class="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
              <div class="flex-1 min-w-0">
                <h3 class="font-roco text-base sm:text-lg truncate">{{ skillModalPet?.name }} - 推荐技能</h3>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <img v-if="skillModalPet?.element_icon" :src="skillModalPet.element_icon" class="w-4 h-4" />
                  <span class="text-xs text-muted">{{ skillModalPet?.element_name }}</span>
                  <template v-if="skillModalPet?.sub_element_icon">
                    <span class="text-muted">/</span>
                    <img :src="skillModalPet.sub_element_icon" class="w-4 h-4" />
                    <span class="text-xs text-muted">{{ skillModalPet?.sub_element_name }}</span>
                  </template>
                </div>
              </div>
              <router-link :to="'/pets/' + skillModalPet?.uid" class="text-xs sm:text-sm text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
                前往详情 →
              </router-link>
              <button @click="skillModalVisible = false" class="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-muted hover:text-foreground cursor-pointer flex-shrink-0">
                ✕
              </button>
            </div>

            <!-- Skill tabs -->
            <div class="flex items-center gap-1 px-4 sm:px-5 pt-3 flex-shrink-0">
              <button v-for="tab in skillModalTabs" :key="tab.key"
                @click="skillModalActiveTab = tab.key"
                class="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                :class="skillModalActiveTab === tab.key ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400' : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
                {{ tab.label }} ({{ tab.count }})
              </button>
            </div>

            <!-- Skill list -->
            <div class="flex-1 overflow-y-auto p-4 sm:p-5">
              <div v-if="skillModalLoading" class="text-center py-8 text-muted text-sm animate-pulse">
                加载技能中...
              </div>
              <div v-else-if="skillModalCurrentSkills.length" class="space-y-2">
                <div v-for="skill in skillModalCurrentSkills" :key="skill.id || skill.name"
                  class="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                  <!-- Skill icon -->
                  <img v-if="skill.skill_icon" :src="skill.skill_icon"
                    class="w-8 h-8 md:w-9 md:h-9 object-contain rounded flex-shrink-0 mt-0.5" loading="lazy" />
                  <img v-else-if="elemMap[skill.element]?.icon" :src="elemMap[skill.element].icon"
                    class="w-8 h-8 md:w-9 md:h-9 object-contain rounded flex-shrink-0 mt-0.5" loading="lazy" />
                  <div v-else class="w-8 h-8 md:w-9 md:h-9 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>

                  <!-- Skill body -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <router-link v-if="skill.skill_ref_uid" :to="'/skills/' + skill.skill_ref_uid"
                        class="font-medium text-sm hover:text-primary-500 transition-colors">{{ skill.name }}</router-link>
                      <span v-else class="font-medium text-sm">{{ skill.name }}</span>
                      <span v-if="elemMap[skill.element]" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
                        :style="{ background: elemMap[skill.element].color + '18', color: elemMap[skill.element].color }">
                        <img :src="elemMap[skill.element].icon" class="w-4 h-4" />
                        <span class="hidden sm:inline">{{ skill.element }}</span>
                      </span>
                      <span v-if="skill.type" class="text-xs font-medium px-1.5 py-0.5 rounded"
                        :style="{ background: categoryColor(skill.type) + '15', color: categoryColor(skill.type) }">
                        {{ skill.type }}
                      </span>
                      <!-- Recommendation reason tags -->
                      <span v-if="isSkillSuperEffective(skill)" class="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 font-medium">
                        ⚔️ 克制属性
                      </span>
                      <span v-if="skill.description && skill.description.includes('应对攻击')" class="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 font-medium">
                        🔰 应对攻击
                      </span>
                      <span v-if="skill.description && skill.description.includes('应对状态')" class="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 font-medium">
                        ⚡ 应对状态
                      </span>
                      <span v-if="skill.description && skill.description.includes('应对防御')" class="text-[10px] px-1 py-0.5 rounded bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 font-medium">
                        🛡️ 应对防御
                      </span>
                      <!-- Extra info per tab -->
                      <span v-if="skillModalActiveTab === 'skills' && skill.level" class="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                        Lv.{{ skill.level }}
                      </span>
                      <span v-if="skillModalActiveTab === 'bloodline' && skill.element" class="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                        需血脉：{{ skill.element }}
                      </span>
                    </div>
                    <SkillDescription v-if="skill.description" :text="skill.description" class="text-xs text-muted mt-1 line-clamp-2 sm:line-clamp-none" />
                  </div>

                  <!-- Right side data -->
                  <div class="flex items-center gap-2 md:gap-3 flex-shrink-0 text-xs text-center">
                    <div v-if="skillModalActiveTab === 'skills' && skill.level" class="w-8 md:w-10">
                      <div class="text-muted text-[10px]">等级</div>
                      <div class="font-medium text-sm">{{ skill.level }}</div>
                    </div>
                    <div class="w-8 md:w-10">
                      <div class="text-muted text-[10px]">能耗</div>
                      <div class="font-medium text-sm">{{ skill.cost != null ? skill.cost : '-' }}</div>
                    </div>
                    <div class="w-8 md:w-10">
                      <div class="text-muted text-[10px]">威力</div>
                      <div class="font-medium text-sm">{{ skill.power || '-' }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8 text-muted text-sm">
                该分类下无命中推荐规则的技能
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { eventsApi, petsApi, elementsApi, pikaApi } from '@/api'
import SkillTable from '@/components/user/SkillTable.vue'
import SkillDescription from '@/components/user/SkillDescription.vue'
import { categoryColor } from '@/constants/categoryColors'

const router = useRouter()
const route = useRoute()

const loaded = ref(false)
const events = ref([])
const selectedPet = ref(null)
const petDetail = ref(null)
const elemMap = ref({})
const fateFlowerSkills = ref([])
const fateNature = ref('')
const counterPicks = ref(null)
const counterLoading = ref(false)

// Skill recommendation modal state
const skillModalVisible = ref(false)
const skillModalPet = ref(null)
const skillModalLoading = ref(false)
const skillModalData = ref(null) // { skills, bloodline_skills, learnable_stones }
const skillModalActiveTab = ref('skills')

// Filter skills to only show those that contributed to the counter-pick score
// For attack skills: show ALL super-effective ones, sorted by effective power
function filterRelevantSkills(allSkills, petDetail, isBloodline = false) {
  if (!counterPicks.value?.attack_profile) return allSkills
  const profile = counterPicks.value.attack_profile
  const weakTo = new Set(profile.target_weak_to || [])

  const relevant = allSkills.filter(skill => {
    const desc = skill.description || ''
    // 1. Super-effective attack: attack skill with element in boss's weakness list
    if ((skill.type === '物攻' || skill.type === '魔攻') && skill.power > 0 && weakTo.has(skill.element)) {
      return true
    }
    // 2. Counter-attack defense skill (应对攻击)
    if (desc.includes('应对攻击')) return true
    // 3. Counter-status attack skill (应对状态)
    if (desc.includes('应对状态')) return true
    // 4. Counter-defense skill (应对防御)
    if (desc.includes('应对防御')) return true
    return false
  })

  // For bloodline tab, don't sort (keep original order)
  if (isBloodline) return relevant

  // Sort attack skills by effective power (considering pet's atk/matk tendency)
  const petAtk = petDetail?.atk || 100
  const petMatk = petDetail?.matk || 100
  const maxStat = Math.max(petAtk, petMatk)

  relevant.sort((a, b) => {
    const epA = calcEffectivePower(a, petAtk, petMatk, maxStat)
    const epB = calcEffectivePower(b, petAtk, petMatk, maxStat)
    return epB - epA
  })

  return relevant
}

// Calculate effective power for sorting: considers pet's atk/matk and multi-turn penalty
function calcEffectivePower(skill, petAtk, petMatk, maxStat) {
  if (!skill.power || skill.power <= 0) return 0
  const desc = skill.description || ''

  // Base power
  let ep = skill.power

  // Stat alignment: physical skill uses atk, magical uses matk
  if (skill.type === '物攻') {
    ep = ep * (petAtk / maxStat)
  } else if (skill.type === '魔攻') {
    ep = ep * (petMatk / maxStat)
  }

  // Multi-turn penalty: 蓄力 skills take 2 turns, halve effective power
  if (desc.includes('蓄力')) {
    ep = ep * 0.5
  }

  // Bonus for having 应对 effect (counter synergy)
  if (desc.includes('应对攻击') || desc.includes('应对状态') || desc.includes('应对防御')) {
    ep = ep * 1.2
  }

  return ep
}

// Check if a skill is super-effective against the boss
function isSkillSuperEffective(skill) {
  if (!counterPicks.value?.attack_profile) return false
  const weakTo = new Set(counterPicks.value.attack_profile.target_weak_to || [])
  return (skill.type === '物攻' || skill.type === '魔攻') && skill.power > 0 && weakTo.has(skill.element)
}

const skillModalTabs = computed(() => {
  if (!skillModalData.value) return []
  const tabs = []
  const d = skillModalData.value
  if (d.skills?.length) tabs.push({ key: 'skills', label: '升级学习', count: d.skills.length })
  if (d.bloodline_skills?.length) tabs.push({ key: 'bloodline', label: '血脉技能', count: d.bloodline_skills.length })
  if (d.learnable_stones?.length) tabs.push({ key: 'stones', label: '技能石学习', count: d.learnable_stones.length })
  return tabs
})

const skillModalCurrentSkills = computed(() => {
  if (!skillModalData.value) return []
  if (skillModalActiveTab.value === 'skills') return skillModalData.value.skills || []
  if (skillModalActiveTab.value === 'bloodline') return skillModalData.value.bloodline_skills || []
  if (skillModalActiveTab.value === 'stones') return skillModalData.value.learnable_stones || []
  return []
})

async function openSkillModal(pet) {
  skillModalPet.value = pet
  skillModalVisible.value = true
  skillModalLoading.value = true
  skillModalData.value = null
  skillModalActiveTab.value = 'skills'
  try {
    const detail = await petsApi.get(pet.uid)
    // Filter to only show skills that contributed to the counter-pick score
    // Sort attack skills by effective power (pet's atk/matk tendency + multi-turn penalty)
    const filteredSkills = filterRelevantSkills(detail.skills || [], detail)
    const filteredBloodline = filterRelevantSkills(detail.bloodline_skills || [], detail, true)
    const filteredStones = filterRelevantSkills(detail.learnable_stones || [], detail)

    skillModalData.value = {
      skills: filteredSkills,
      bloodline_skills: filteredBloodline,
      learnable_stones: filteredStones,
    }
    // Auto-select first non-empty tab
    if (!filteredSkills.length && filteredBloodline.length) {
      skillModalActiveTab.value = 'bloodline'
    } else if (!filteredSkills.length && !filteredBloodline.length && filteredStones.length) {
      skillModalActiveTab.value = 'stones'
    }
  } catch (err) {
    console.error('[FateFlower] Load pet skills failed:', err)
  }
  skillModalLoading.value = false
}

// Extract all unique pets from fate_flower events
const allPets = computed(() => {
  const petMap = new Map()
  for (const event of events.value) {
    const pets = parsePetIcons(event.pet_icon)
    for (const p of pets) {
      if (p.uid && !petMap.has(p.uid)) {
        petMap.set(p.uid, p)
      }
    }
  }
  return Array.from(petMap.values())
})

// Find the currently active event (for date display)
const currentEvent = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return events.value.find(e => {
    const periods = e.periods || []
    return periods.some(p => p.start <= today && p.end >= today)
  }) || events.value[0] || null
})

// Configured fate flower skills (from admin config)
// Grouped by source for display
const groupedFateSkills = computed(() => {
  if (!fateFlowerSkills.value.length) return null
  const groups = { skills: [], bloodline_skills: [], learnable_stones: [] }
  for (const s of fateFlowerSkills.value) {
    const source = s.skill_source || 'skills'
    if (groups[source]) groups[source].push(s)
    else groups.skills.push(s)
  }
  return groups
})

// Fallback: bloodline skills matching main element (if no admin config)
const bloodlineElementSkills = computed(() => {
  if (fateFlowerSkills.value.length) return [] // Use configured skills instead
  if (!petDetail.value || !petDetail.value.bloodline_skills) return []
  const mainElement = petDetail.value.element_name
  if (!mainElement) return []
  return petDetail.value.bloodline_skills.filter(s => s.element === mainElement)
})



function parsePetIcons(petIcon) {
  if (!petIcon || !petIcon.startsWith('[')) return []
  try { return JSON.parse(petIcon) } catch { return [] }
}

function formatDateRange(event) {
  if (!event) return ''
  const today = new Date().toISOString().slice(0, 10)
  const periods = event.periods || []
  const active = periods.find(p => p.start <= today && p.end >= today)
  if (active) {
    return `${active.start.slice(5).replace('-', '.')} ~ ${active.end.slice(5).replace('-', '.')} (进行中)`
  }
  if (event.start_date && event.end_date) {
    return `${event.start_date.slice(5).replace('-', '.')} ~ ${event.end_date.slice(5).replace('-', '.')}`
  }
  return ''
}

async function selectPet(pet) {
  selectedPet.value = pet
  petDetail.value = null
  fateFlowerSkills.value = []
  fateNature.value = ''
  counterPicks.value = null
  counterLoading.value = true
  try {
    const [detail, skillRes] = await Promise.all([
      petsApi.get(pet.uid),
      pikaApi.getFateFlowerSkills(pet.uid),
    ])
    petDetail.value = detail
    fateFlowerSkills.value = skillRes.skills || []
    fateNature.value = skillRes.fate_nature || ''

    // Load counter-picks after we know the nature
    try {
      const cpRes = await petsApi.counterPicks(pet.uid, skillRes.fate_nature || '')
      counterPicks.value = cpRes
    } catch (cpErr) {
      console.error('[FateFlower] Load counter-picks failed:', cpErr)
    }
  } catch (err) {
    console.error('[FateFlower] Load pet failed:', err)
  }
  counterLoading.value = false
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/events')
  }
}

onMounted(async () => {
  try {
    // Load elements for SkillTable
    const elemRes = await elementsApi.list()
    const map = {}
    for (const e of (elemRes.elements || elemRes || [])) {
      map[e.name] = { icon: e.icon, color: e.color, name: e.name }
    }
    elemMap.value = map

    const res = await eventsApi.list(null, true)
    // Filter fate_flower events
    events.value = (res.events || []).filter(
      e => e.category === 'routine' && (e.sub_type === 'fate_flower' || e.sub_type === 'destiny')
    )
  } catch (err) {
    console.error('[FateFlower] Load events failed:', err)
  }
  loaded.value = true

  // Auto-select first pet, or pet from route query
  if (allPets.value.length) {
    const targetUid = route.query.pet
    const target = targetUid ? allPets.value.find(p => p.uid === targetUid) : null
    selectPet(target || allPets.value[0])
  }
})
</script>

<style scoped>
.pet-tabs-container {
  @apply border-b border-surface-light-border dark:border-surface-dark-border;
}

.pet-tab-btn {
  @apply flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all cursor-pointer flex-shrink-0;
}

.pet-tab-active {
  @apply bg-primary-100 dark:bg-primary-500/20 ring-2 ring-primary-400 dark:ring-primary-500/50;
}

.pet-tab-inactive {
  @apply bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 opacity-70 hover:opacity-100;
}

.counter-pick-card {
  @apply relative flex flex-col items-center p-2 sm:p-3 rounded-xl
         bg-gray-50 dark:bg-white/5
         hover:bg-blue-50 dark:hover:bg-blue-500/10
         border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30
         transition-all cursor-pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
