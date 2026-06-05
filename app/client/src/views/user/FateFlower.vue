
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

        <!-- Counter-picks recommendation (controlled by admin setting) -->
        <div v-if="counterPicksEnabled" class="card">
          <h3 class="font-roco text-sm sm:text-base mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            反制推荐
            <span class="text-xs font-normal text-muted">（最适合应对该花种精灵的精灵，仅作参考）</span>
          </h3>

          <!-- Attack profile summary -->
          <div v-if="counterPicks" class="mb-4 p-2.5 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
            <!-- Boss base stats + nature + tendency -->
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm mb-2 pb-2 border-b border-blue-200/50 dark:border-blue-500/20">
              <div class="flex items-center gap-1.5">
                <span class="text-muted">种族值：</span>
                <span class="font-medium">物攻 <strong>{{ counterPicks.attack_profile.base_values.atk }}</strong></span>
                <span class="text-muted">/</span>
                <span class="font-medium">魔攻 <strong>{{ counterPicks.attack_profile.base_values.matk }}</strong></span>
                <span class="text-muted">/</span>
                <span class="font-medium">物防 <strong>{{ counterPicks.attack_profile.boss_def }}</strong></span>
                <span class="text-muted">/</span>
                <span class="font-medium">魔防 <strong>{{ counterPicks.attack_profile.boss_mdef }}</strong></span>
              </div>
              <div v-if="counterPicks.attack_profile.nature_up" class="flex items-center gap-1">
                <span class="text-muted">性格加成：</span>
                <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                  ▲{{ counterPicks.attack_profile.nature_up }}
                </span>
                <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400">
                  ▼{{ counterPicks.attack_profile.nature_down }}
                </span>
              </div>
            </div>
            <!-- Tendency + defense hint -->
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm mb-2">
              <div class="flex items-center gap-1.5">
                <span class="text-muted">攻击倾向：</span>
                <span class="font-bold px-1.5 py-0.5 rounded" :class="counterPicks.attack_profile.tendency === '物攻' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'">
                  {{ counterPicks.attack_profile.tendency }}型
                </span>
                <span class="text-muted text-[10px]">
                  (修正后 {{ counterPicks.attack_profile.tendency_values.atk }}/{{ counterPicks.attack_profile.tendency_values.matk }})
                </span>
              </div>
              <span v-if="counterPicks.attack_profile.boss_weaker_def" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                💢 {{ counterPicks.attack_profile.boss_weaker_def === 'physical' ? '物防较低 → 建议用物攻打' : '魔防较低 → 建议用魔攻打' }}
              </span>
              <span v-else-if="counterPicks.attack_profile.boss_def != null" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400">
                ⚖️ 双防均衡
              </span>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-0 text-xs sm:text-sm">
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
              <span class="hidden sm:inline text-muted mx-2">|</span>
              <div class="flex items-center gap-1.5">
                <span class="text-muted">弱点：</span>
                <div class="flex items-center gap-1 flex-wrap">
                  <template v-for="item in counterPicks.attack_profile.target_weak_to" :key="item.name || item">
                    <span v-if="elemMap[item.name || item]" class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded"
                      :style="{ background: elemMap[item.name || item].color + '15', color: elemMap[item.name || item].color }"
                      :title="(item.multiplier === 3 ? '×3双重克制' : '×2克制')">
                      <img :src="elemMap[item.name || item].icon" class="w-3 h-3" />
                      <span class="text-[9px] font-bold">×{{ item.multiplier || 2 }}</span>
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
            </div>
            <!-- Tag legend (hidden on mobile, shown on sm+) -->
            <div class="hidden sm:flex items-center gap-2 sm:gap-3 mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-500/20 flex-wrap">
              <span class="text-[10px] text-muted mr-0.5">图例：</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-red-200 text-red-700 dark:bg-red-500/30 dark:text-red-300 text-[9px] font-bold">⚔️×3</span> 三倍克制</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[9px]">⚔️×2</span> 双倍克制</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 text-[9px] font-bold">🌟</span> 贪婪</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 text-[9px] font-bold">🌟</span> 驱散减益</span>
              <span v-if="counterPicks.attack_profile.has_status_skills" class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 text-[9px]">⚡</span> 应对状态</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[9px]">💚⚔️</span> 克制续航</span>
              <span class="inline-flex items-center gap-0.5 text-[10px] sm:text-xs"><span class="px-0.5 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[9px]">💚</span> 续航</span>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="counterLoading" class="text-center py-6 text-muted text-sm animate-pulse">
            分析中...
          </div>

          <!-- Recommended pets sorted by score (flat list) -->
          <template v-else-if="counterPicks && counterPicks.pets && counterPicks.pets.length">
            <!-- Pets grid: responsive columns -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              <div
                v-for="cp in counterPicks.pets"
                :key="cp.uid"
                @click="openSkillModal(cp)"
                class="counter-pick-card group flex flex-col items-center p-2 sm:p-2.5"
              >
                <!-- Pet image -->
                <img :src="cp.image_url" class="w-16 h-16 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-[4.5rem] lg:h-[4.5rem] object-contain mx-auto" :alt="cp.name" />
                <!-- Pet name -->
                <div class="text-sm sm:text-xs md:text-sm font-medium text-center mt-1 truncate w-full">{{ cp.name }}</div>
                <!-- Element badges -->
                <div class="flex items-center justify-center gap-1 mt-1">
                  <img v-if="cp.element_icon" :src="cp.element_icon" class="w-4 h-4 sm:w-[1.1rem] sm:h-[1.1rem]" :title="cp.element_name" />
                  <img v-if="cp.sub_element_icon" :src="cp.sub_element_icon" class="w-4 h-4 sm:w-[1.1rem] sm:h-[1.1rem]" :title="cp.sub_element_name" />
                </div>
                <!-- Resisted elements -->
                <div v-if="cp.resisted_elements && cp.resisted_elements.length" class="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                  <span class="text-[9px] text-muted">抗</span>
                  <template v-for="elemName in cp.resisted_elements" :key="elemName">
                    <img v-if="elemMap[elemName]" :src="elemMap[elemName].icon" class="w-3.5 h-3.5 sm:w-4 sm:h-4" :title="'抵抗' + elemName" />
                  </template>
                </div>
                <!-- Attack type indicator (separate row) -->
                <div class="mt-1 text-center text-[10px] sm:text-xs leading-tight">
                  <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                    :class="cp.atk === cp.matk ? 'bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400' : cp.atk > cp.matk ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400'">
                    <span class="opacity-70">{{ cp.atk }}/{{ cp.matk }}</span>
                    <span class="font-medium">{{ cp.atk === cp.matk ? '双攻均衡' : cp.atk > cp.matk ? '推荐物攻' : '推荐魔攻' }}</span>
                  </span>
                </div>
                <!-- Bonus tags -->
                <div class="flex items-center gap-0.5 mt-1.5 flex-wrap justify-center">
                  <span v-if="cp.greedy_bonus" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 font-bold" title="可学习贪婪(100%吸血)，最高优先级">
                    🌟贪
                  </span>
                  <span v-if="cp.cleanse_bonus" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 font-bold" title="可学习驱散自己减益(非血脉)，应对灼烧/中毒">
                    🌟净
                  </span>
                  <span v-if="cp.meteor_rabbit_bonus" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400 font-bold" title="特性「陨落」：回合结束效果不触发，完美免疫灼烧/中毒结算">
                    🌟陨
                  </span>
                  <span v-if="cp.se_attack_score" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight" :class="cp.best_se_multiplier >= 3 ? 'bg-red-200 text-red-700 dark:bg-red-500/30 dark:text-red-300 font-bold' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'" :title="cp.best_se_multiplier >= 3 ? '×3双重克制技能' : '×2克制技能'">
                    {{ cp.se_attack_score >= 2.5 ? '⚔️💥' : cp.se_attack_score >= 1.5 ? '⚔️' : '🗡️' }}×{{ cp.best_se_multiplier || 2 }}
                  </span>
                  <span v-if="cp.counter_status_bonus && counterPicks.attack_profile.has_status_skills" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                    {{ cp.counter_status_bonus >= 2 ? '⚡克' : '⚡' }}
                  </span>
                  <span v-if="cp.lifesteal_bonus && cp.lifesteal_category === 'se'" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold" title="克制boss的吸血续航技能">
                    💚⚔️
                  </span>
                  <span v-else-if="cp.lifesteal_bonus && cp.lifesteal_category === 'neutral'" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" title="吸血续航技能（不被boss抵抗）">
                    💚
                  </span>
                  <span v-else-if="cp.lifesteal_bonus && cp.lifesteal_category === 'resisted'" class="px-1 py-0.5 rounded text-[10px] sm:text-xs leading-tight bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400 line-through" title="吸血续航技能（被boss抵抗）">
                    💚
                  </span>
                </div>
                <!-- Defense stat & score -->
                <div class="text-[10px] sm:text-xs text-muted mt-1 text-center">
                  {{ counterPicks.attack_profile.defense_stat_used === 'def' ? '物防' : '魔防' }}
                  <span class="font-medium text-foreground">{{ cp.def_value }}</span>
                  <span v-if="cp.meteor_rabbit_bonus" class="ml-1 text-pink-500 font-bold">∞</span>
                  <span v-else class="ml-1 text-blue-500 font-medium">{{ cp.total_score.toFixed(1) }}</span>
                </div>
                <!-- Score progress bar -->
                <div class="w-full mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div v-if="cp.meteor_rabbit_bonus" class="h-full rounded-full bg-gradient-to-r from-pink-400 to-purple-500 w-full"></div>
                  <div v-else class="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
                    :style="{ width: Math.max(10, Math.min(100, cp.total_score / (counterPicksMaxNormalScore || 1) * 100)) + '%' }"></div>
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
                      <span v-if="getSkillSeMultiplier(skill)" class="text-[10px] px-1 py-0.5 rounded font-medium" :class="getSkillSeMultiplier(skill) >= 3 ? 'bg-red-200 text-red-700 dark:bg-red-500/30 dark:text-red-300 font-bold' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'">
                        ⚔️×{{ getSkillSeMultiplier(skill) }}
                      </span>
                      <span v-if="skill.description && skill.description.includes('应对攻击')" class="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 font-medium">
                        🔰 应对攻击
                      </span>
                      <span v-if="skill.description && skill.description.includes('应对状态') && counterPicks?.attack_profile?.has_status_skills" class="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 font-medium">
                        ⚡ 应对状态
                      </span>
                      <span v-if="skill.description && skill.description.includes('应对防御')" class="text-[10px] px-1 py-0.5 rounded bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 font-medium">
                        🛡️ 应对防御
                      </span>
                      <span v-if="isLifestealSkillVisible(skill.name)" class="text-[10px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-medium">
                        💚 续航
                      </span>
                      <span v-if="skill.description && skill.description.includes('驱散自己') && skill.description.includes('减益')" class="text-[10px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 font-medium">
                        🌟 驱散减益
                      </span>
                      <span v-if="skill.type === '状态' && !skill.description?.includes('应对攻击') && !skill.description?.includes('应对状态') && !skill.description?.includes('应对防御')" class="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 font-medium">
                        📋 状态
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
import { eventsApi, petsApi, elementsApi, pikaApi, settingsApi } from '@/api'
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
const counterPicksEnabled = ref(false) // Controlled by admin setting

// Max score among non-meteor-rabbit pets (for progress bar normalization)
const counterPicksMaxNormalScore = computed(() => {
  if (!counterPicks.value?.pets) return 1
  const normalPets = counterPicks.value.pets.filter(p => !p.meteor_rabbit_bonus)
  return normalPets.length > 0 ? normalPets[0].total_score : 1
})

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
  const weakTo = new Set((profile.target_weak_to || []).map(item => item.name || item))

  const relevant = allSkills.filter(skill => {
    const desc = skill.description || ''
    // 1. Super-effective attack: attack skill with element in boss's weakness list
    // NOT considered for bloodline skills (bloodline only counts defense/status)
    if (!isBloodline && (skill.type === '物攻' || skill.type === '魔攻') && skill.power > 0 && weakTo.has(skill.element)) {
      return true
    }
    // 2. Counter-attack defense skill (应对攻击)
    if (desc.includes('应对攻击')) return true
    // 3. Counter-status attack skill (应对状态)
    if (desc.includes('应对状态')) return true
    // 4. Counter-defense skill (应对防御)
    if (desc.includes('应对防御')) return true
    // 5. All status skills (type = '状态') - show for reference
    if (skill.type === '状态') return true
    // 6. Self-debuff cleanse skills (驱散自己减益 - includes attack-type like 除厄)
    if (desc.includes('驱散自己') && desc.includes('减益')) return true
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

// Determine if a lifesteal skill should show the 续航 badge in skill modal
// 撕裂/抽枝/暗突袭 only show badge when boss has status skills
const COUNTER_STATUS_LIFESTEAL_NAMES = new Set(['撕裂', '抽枝', '暗突袭'])
const ALL_LIFESTEAL_NAMES = new Set(['蝙蝠', '暗突袭', '撕裂', '等价交换', '抽枝', '气沉丹田'])
function isLifestealSkillVisible(skillName) {
  if (!ALL_LIFESTEAL_NAMES.has(skillName)) return false
  // If it's a counter-status type, only show when boss has status skills
  if (COUNTER_STATUS_LIFESTEAL_NAMES.has(skillName)) {
    return counterPicks.value?.attack_profile?.has_status_skills
  }
  return true
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
  const weakTo = new Set((counterPicks.value.attack_profile.target_weak_to || []).map(item => item.name || item))
  return (skill.type === '物攻' || skill.type === '魔攻') && skill.power > 0 && weakTo.has(skill.element)
}

// Get the SE multiplier for a skill (0 = not SE, 2 = ×2, 3 = ×3)
function getSkillSeMultiplier(skill) {
  if (!counterPicks.value?.attack_profile) return 0
  if (!(skill.type === '物攻' || skill.type === '魔攻') || !skill.power || skill.power <= 0) return 0
  const weakToList = counterPicks.value.attack_profile.target_weak_to || []
  const match = weakToList.find(item => (item.name || item) === skill.element)
  if (!match) return 0
  return match.multiplier || 2
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

    // Load counter-picks after we know the nature (only if enabled)
    if (counterPicksEnabled.value) {
      try {
        const cpRes = await petsApi.counterPicks(pet.uid, skillRes.fate_nature || '')
        counterPicks.value = cpRes
      } catch (cpErr) {
        console.error('[FateFlower] Load counter-picks failed:', cpErr)
      }
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
    // Load site settings (check if counter-picks feature is enabled)
    const settings = await settingsApi.getPublic()
    counterPicksEnabled.value = settings.counter_picks_enabled === '1'
  } catch (e) {
    // Settings load failure is non-critical
  }

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
    let fateEvents = (res.events || []).filter(
      e => e.category === 'routine' && (e.sub_type === 'fate_flower' || e.sub_type === 'destiny')
    )
    // 如果有 eventId 参数，只显示该活动的精灵
    const eventId = route.query.eventId
    if (eventId) {
      fateEvents = fateEvents.filter(e => String(e.id) === String(eventId))
    }
    events.value = fateEvents
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
