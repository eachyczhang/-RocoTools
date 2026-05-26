
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
            <button @click="showRulesModal = true" class="ml-auto text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer flex items-center gap-0.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              评分规则
            </button>
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
              <span v-if="counterPicks.attack_profile.has_attack_skills" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                ⚔️ 有攻击技能
              </span>
              <span class="text-[10px] sm:text-xs text-muted">
                排序：克制攻击×4 + 应对状态×2 + 应对防御×1.5 + 应对攻击×1.5 + 抗性×1
              </span>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="counterLoading" class="text-center py-6 text-muted text-sm animate-pulse">
            分析中...
          </div>

          <!-- Recommended pets grid -->
          <div v-else-if="counterPicks && counterPicks.recommended_pets.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            <router-link
              v-for="(cp, idx) in counterPicks.recommended_pets"
              :key="cp.uid"
              :to="'/pets/' + cp.uid"
              class="counter-pick-card group"
            >
              <!-- Rank badge -->
              <div class="absolute top-1 left-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center z-10"
                :class="idx < 3 ? 'bg-amber-400 text-white' : 'bg-gray-200 dark:bg-gray-600 text-muted'">
                {{ idx + 1 }}
              </div>
              <!-- Pet image -->
              <img :src="cp.image_url" class="w-14 h-14 sm:w-16 sm:h-16 object-contain mx-auto" :alt="cp.name" />
              <!-- Pet name -->
              <div class="text-xs font-medium text-center mt-1 truncate w-full">{{ cp.name }}</div>
              <!-- Element badges -->
              <div class="flex items-center justify-center gap-0.5 mt-0.5">
                <img v-if="cp.element_icon" :src="cp.element_icon" class="w-3.5 h-3.5" :title="cp.element_name" />
                <img v-if="cp.sub_element_icon" :src="cp.sub_element_icon" class="w-3.5 h-3.5" :title="cp.sub_element_name" />
              </div>
              <!-- Bonus tags -->
              <div class="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                <span v-if="cp.se_attack_score" class="px-1 py-0 rounded text-[9px] leading-tight bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400" title="克制属性攻击技能">
                  {{ cp.se_attack_score >= 2.5 ? '⚔️💥' : cp.se_attack_score >= 1.5 ? '⚔️' : '🗡️' }}
                </span>
                <span v-if="cp.counter_status_bonus" class="px-1 py-0 rounded text-[9px] leading-tight bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" title="拥有应对状态技能">
                  {{ cp.counter_status_bonus >= 2 ? '⚡克' : '⚡' }}
                </span>
                <span v-if="cp.counter_defense_bonus" class="px-1 py-0 rounded text-[9px] leading-tight bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400" title="拥有应对防御技能">
                  🛡️
                </span>
                <span v-if="cp.counter_attack_bonus" class="px-1 py-0 rounded text-[9px] leading-tight bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400" title="拥有应对攻击的防御技能">
                  🔰
                </span>
              </div>
              <!-- Defense stat -->
              <div class="text-[10px] text-muted mt-0.5 text-center">
                {{ counterPicks.attack_profile.defense_stat_used === 'def' ? '物防' : '魔防' }}
                <span class="font-medium text-foreground">{{ cp.def_value }}</span>
                <span class="ml-1 text-blue-500">{{ cp.total_score }}</span>
              </div>
              <!-- Total score indicator -->
              <div class="w-full mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
                  :style="{ width: Math.max(10, Math.min(100, cp.total_score / (counterPicks.recommended_pets[0]?.total_score || 1) * 100)) + '%' }"></div>
              </div>
            </router-link>
          </div>

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

    <!-- Rules Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showRulesModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showRulesModal = false">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-5 sm:p-6">
            <!-- Close button -->
            <button @click="showRulesModal = false" class="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-muted hover:text-foreground cursor-pointer">
              ✕
            </button>

            <h3 class="font-roco text-lg text-primary-500 mb-4">反制推荐评分规则</h3>

            <!-- Core concept -->
            <div class="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
              <p class="text-sm font-medium text-amber-700 dark:text-amber-400">💡 核心思路：克制 = 击杀</p>
              <p class="text-xs text-amber-600 dark:text-amber-400/80 mt-1">评分以「能否有效输出伤害」为核心，防御能力为辅助。拥有克制属性的攻击技能且带应对效果的精灵，加分最高。</p>
            </div>

            <!-- Target analysis -->
            <div class="mb-4">
              <h4 class="text-sm font-medium mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                花种精灵画像分析
              </h4>
              <div class="text-xs text-muted space-y-1 pl-3">
                <p>• <strong>攻击倾向</strong>：种族值物攻 vs 魔攻（+性格修正），平局选物攻</p>
                <p>• <strong>攻击属性</strong>：愿力冲击(血脉属性) + 命定技能中的攻击属性</p>
                <p>• <strong>技能类型</strong>：检测是否有攻击/防御/状态技能</p>
                <p>• <strong>弱点属性</strong>：哪些属性能克制该花种精灵</p>
              </div>
            </div>

            <!-- Three counters -->
            <div class="mb-4">
              <h4 class="text-sm font-medium mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                三大应对维度
              </h4>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-white/5">
                      <th class="text-left py-1.5 px-2 font-medium">花种精灵的技能</th>
                      <th class="text-left py-1.5 px-2 font-medium">候选精灵需要</th>
                      <th class="text-left py-1.5 px-2 font-medium">判定方式</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted">
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2">攻击技能</td>
                      <td class="py-1.5 px-2">应对攻击的防御技能</td>
                      <td class="py-1.5 px-2">描述含「应对攻击」</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2">防御技能</td>
                      <td class="py-1.5 px-2">应对防御的技能</td>
                      <td class="py-1.5 px-2">描述含「应对防御」</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2">状态技能</td>
                      <td class="py-1.5 px-2">应对状态的攻击技能</td>
                      <td class="py-1.5 px-2">描述含「应对状态」</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Scoring system -->
            <div class="mb-4">
              <h4 class="text-sm font-medium mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                五维评分体系
              </h4>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-white/5">
                      <th class="text-left py-1.5 px-2 font-medium">维度</th>
                      <th class="text-center py-1.5 px-2 font-medium">权重</th>
                      <th class="text-left py-1.5 px-2 font-medium">说明</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted">
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2 font-medium text-red-500">克制属性攻击</td>
                      <td class="py-1.5 px-2 text-center">×4</td>
                      <td class="py-1.5 px-2">克制花种属性的攻击技能 + 应对效果联动</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2 font-medium text-orange-500">应对状态 ⚡</td>
                      <td class="py-1.5 px-2 text-center">×2</td>
                      <td class="py-1.5 px-2">攻击技能能应对状态，打伤害+打断</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2 font-medium text-cyan-500">应对防御 🛡️</td>
                      <td class="py-1.5 px-2 text-center">×1.5</td>
                      <td class="py-1.5 px-2">拥有应对防御的技能，破防能力</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2 font-medium text-green-500">应对攻击 🔰</td>
                      <td class="py-1.5 px-2 text-center">×1.5</td>
                      <td class="py-1.5 px-2">拥有应对攻击的防御技能，生存能力</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2 font-medium text-blue-500">抗性+防御值</td>
                      <td class="py-1.5 px-2 text-center">×1</td>
                      <td class="py-1.5 px-2">属性抵抗 + 对应防御种族值</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Key dimension detail -->
            <div class="mb-4">
              <h4 class="text-sm font-medium mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                核心维度：克制属性攻击 + 应对联动
              </h4>
              <p class="text-xs text-muted mb-2 pl-3">
                ※ 使用<strong>有效威力</strong>而非原始威力：有效威力 = 技能power × 种族值适配系数。
                物攻技能适配系数 = 精灵物攻 / max(物攻,魔攻)；魔攻技能同理。
                <br/>例：精灵物攻130/魔攻60，物攻技能P100有效威力=100，魔攻技能P150有效威力=150×(60/130)≈69。
              </p>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-white/5">
                      <th class="text-left py-1.5 px-2 font-medium">条件</th>
                      <th class="text-center py-1.5 px-2 font-medium">加分</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted">
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2">有效威力≥120 + 带应对效果</td>
                      <td class="py-1.5 px-2 text-center font-medium text-red-500">+3</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2">有效威力≥120，无应对</td>
                      <td class="py-1.5 px-2 text-center">+2</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2">有效威力≥80 + 带应对效果</td>
                      <td class="py-1.5 px-2 text-center">+2.5</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2">有效威力≥80，无应对</td>
                      <td class="py-1.5 px-2 text-center">+1.5</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2">有效威力≥40 + 带应对效果</td>
                      <td class="py-1.5 px-2 text-center">+2</td>
                    </tr>
                    <tr class="border-t border-gray-100 dark:border-white/5">
                      <td class="py-1.5 px-2">有效威力≥40，无应对</td>
                      <td class="py-1.5 px-2 text-center">+1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="text-[10px] text-muted mt-1.5 pl-3">※ 应对效果指该攻击技能描述中含「应对状态」或「应对防御」；若有效威力接近（≥80%）且带应对效果，优先选择带应对的技能</p>
            </div>

            <!-- Tags legend -->
            <div>
              <h4 class="text-sm font-medium mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                标签图例
              </h4>
              <div class="grid grid-cols-2 gap-1.5 text-xs text-muted">
                <div class="flex items-center gap-1.5">
                  <span class="px-1 py-0 rounded bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 text-[9px]">⚡</span>
                  <span>应对状态</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="px-1 py-0 rounded bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 text-[9px]">⚡克</span>
                  <span>应对状态 + 克制属性</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="px-1 py-0 rounded bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 text-[9px]">🛡️</span>
                  <span>应对防御</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="px-1 py-0 rounded bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 text-[9px]">🔰</span>
                  <span>应对攻击</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="px-1 py-0 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[9px]">⚔️⚔️</span>
                  <span>克制属性 power≥120</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="px-1 py-0 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[9px]">⚔️</span>
                  <span>克制属性 power≥80</span>
                </div>
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
const showRulesModal = ref(false)

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

// Attack element list from counter-picks (for progress bar width calculation)
const attackElementList = computed(() => {
  return counterPicks.value?.attack_profile?.elements || []
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
