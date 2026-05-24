<template>
  <div v-if="loaded">
    <router-link to="/admin/pets" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回精灵列表</router-link>

    <div class="flex items-center gap-3 mb-4">
      <h1 class="font-roco text-xl md:text-2xl text-primary-500">{{ isNew ? '新增精灵' : pet.name }}</h1>
      <span v-if="!isNew" class="text-xs text-muted">{{ pet.uid }}</span>
    </div>

    <!-- 形态切换 -->
    <div v-if="!isNew && variants.length > 1" class="flex items-center gap-1.5 mb-4 flex-wrap">
      <span class="text-xs text-muted mr-1">形态：</span>
      <router-link v-for="v in variants" :key="v.pet_uid"
        :to="'/admin/pets/' + v.pet_uid"
        class="px-2.5 py-1 rounded-lg text-xs transition-colors"
        :class="v.pet_uid === route.params.uid
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 font-medium'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'">
        {{ v.name }}
      </router-link>
    </div>

    <!-- 图片区域 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">图片管理</h2>

      <!-- 立绘预览 + 切换 -->
      <div class="flex flex-col items-center mb-4">
        <div class="w-40 h-40 md:w-52 md:h-52 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center mb-3 cursor-zoom-in hover:rounded-none transition-rounded"
          @click="openPreview(currentPreviewUrl)">
          <img v-if="currentPreviewUrl" :src="currentPreviewUrl" class="w-full h-full object-contain rounded-xl" />
          <span v-else class="text-sm text-muted">无图片</span>
        </div>
        <!-- 切换按钮 -->
        <div class="flex items-center gap-3">
          <button v-for="img in imageSlots" :key="img.type" @click="previewType = img.type"
            class="flex flex-col items-center gap-0.5 transition-opacity cursor-pointer"
            :class="previewType === img.type ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
            <div class="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded flex items-center justify-center cursor-zoom-in hover:rounded-none transition-rounded"
              @click.stop="openPreview(img.url)">
              <img v-if="img.url" :src="img.url" class="w-full h-full object-contain rounded" />
              <span v-else class="text-[8px] text-muted">无</span>
            </div>
            <span class="text-[10px] text-muted">{{ img.label }}</span>
          </button>
        </div>
      </div>

      <!-- 上传按钮组 -->
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div v-for="img in uploadSlots" :key="img.type"
          class="text-center p-2 rounded-lg bg-gray-50 dark:bg-white/5 transition-colors">
          <div class="text-xs font-medium mb-1">{{ img.label }}</div>
          <ImageUploader
            :upload-type="isNew ? '' : img.type"
            :upload-uid="isNew ? '' : uid"
            btn-class="text-[10px] text-primary-500 hover:underline cursor-pointer"
            upload-label="上传"
            @uploaded="(p) => handleImageUploaded(img.type, p)"
            @file-selected="(f) => handleFileSelected(img.type, f)"
          />
        </div>
      </div>
      <p v-if="isNew && pendingCount > 0" class="text-xs text-green-600 mt-2">✓ 已暂存 {{ pendingCount }} 张图片，创建精灵时将一并上传</p>
      <p v-if="isNew && !computedUid" class="text-xs text-amber-500 mt-2">⚠️ 请先填写精灵编号，再上传图片</p>
    </div>

    <!-- 编号 + UID -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">编号信息 <span class="text-xs text-red-500">*</span></h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-muted">精灵编号 <span class="text-red-500">*</span></label>
          <input v-model="form.pet_id" class="input w-full" placeholder="如 001, 040"
            :disabled="!isNew" :class="{ 'bg-gray-50 dark:bg-white/10 cursor-not-allowed': !isNew }" @input="updateUid" />
        </div>
        <div v-if="isNew">
          <label class="text-xs text-muted">形态序号（多形态时填，如 1、2）</label>
          <input v-model="formVariant" class="input w-full" placeholder="留空=单形态" @input="updateUid" />
        </div>
        <div>
          <label class="text-xs text-muted">UID（自动生成）</label>
          <input :value="computedUid" class="input w-full bg-gray-50 dark:bg-white/10" disabled />
        </div>
      </div>
    </div>

    <!-- 基础信息 -->
    <div class="card mb-4 relative z-20">
      <h2 class="font-roco text-base text-primary-500 mb-3">基础信息</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-muted">名称 <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">主属性 <span class="text-red-500">*</span></label>
          <SearchSelect
            v-model="elementIdStr"
            :options="elements.map(e => ({ value: String(e.id), label: e.name, icon: e.icon }))"
            placeholder="请选择属性"
          />
        </div>
        <div>
          <label class="text-xs text-muted">副属性</label>
          <SearchSelect
            v-model="subElementIdStr"
            :options="[{ value: '', label: '无' }, ...elements.map(e => ({ value: String(e.id), label: e.name, icon: e.icon }))]"
            placeholder="无"
          />
        </div>
        <div>
          <label class="text-xs text-muted">版本</label>
          <input v-model="form.version" class="input w-full" />
        </div>
        <div class="flex items-center gap-2 self-end pb-1">
          <label class="text-xs text-muted">最终形态</label>
          <button @click="form.is_final_form = form.is_final_form ? 0 : 1"
            class="relative w-10 h-5 rounded-full transition-colors"
            :class="form.is_final_form ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
              :class="form.is_final_form ? 'translate-x-5' : ''"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- 特性 -->
    <div class="card mb-4 relative z-10">
      <h2 class="font-roco text-base text-primary-500 mb-3">特性 <span class="text-xs text-red-500">*</span></h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-muted">特性名称 <span class="text-red-500">*</span></label>
          <SearchSelect
            v-model="form.ability_name"
            :options="abilityOptions"
            placeholder="选择已有特性或输入新特性"
            :allow-custom="true"
          />
        </div>
        <div>
          <label class="text-xs text-muted">特性描述 <span class="text-red-500">*</span></label>
          <input v-model="form.ability_desc" class="input w-full" />
        </div>
      </div>
      <div class="mt-3 flex items-center gap-4">
        <div class="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-lg flex items-center justify-center cursor-zoom-in hover:rounded-none transition-rounded"
          @click="openPreview(abilityIconUrl)">
          <img v-if="abilityIconUrl" :src="abilityIconUrl" class="w-full h-full object-contain rounded-lg" />
          <span v-else class="text-[8px] text-muted">无图标</span>
        </div>
        <label class="text-xs text-primary-500 hover:underline cursor-pointer">
          <ImageUploader
            :upload-type="isNew ? '' : 'pet_ability'"
            :upload-uid="isNew ? '' : uid"
            upload-label="上传特性图标"
            btn-class="text-xs text-primary-500 hover:underline cursor-pointer"
            @uploaded="(p) => handleImageUploaded('pet_ability', p)"
            @file-selected="(f) => handleFileSelected('pet_ability', f)"
          />
        </label>
      </div>
    </div>

    <!-- 种族值 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">种族值 <span class="text-xs text-red-500">*</span></h2>
      <div class="grid grid-cols-3 md:grid-cols-7 gap-3">
        <div v-for="s in statFields" :key="s.key">
          <label class="text-xs text-muted">{{ s.label }} <span v-if="s.key !== 'total'" class="text-red-500">*</span></label>
          <input v-model.number="form[s.key]" type="number" class="input w-full text-center"
            :class="s.key === 'total' ? 'bg-gray-50 dark:bg-white/10' : ''"
            :disabled="s.key === 'total'" />
        </div>
      </div>
    </div>

    <!-- 详情字段 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">详情信息</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-muted">身高</label>
          <input v-model="detailForm.height" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">体重</label>
          <input v-model="detailForm.weight" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">分布</label>
          <input v-model="detailForm.location" class="input w-full" />
        </div>
      </div>
    </div>

    <!-- 进化链配置 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">进化链 <span class="text-xs text-muted font-normal">（选填，支持多条进化路线）</span></h2>
      <p class="text-xs text-muted mb-3">配置精灵的进化路线。如果精灵有分支进化（如书魔虫→古卷匣魔像 / 书魔虫→另一形态），请添加多条路线。保存后会自动同步到所有路线中的精灵。</p>

      <div v-if="evolutionRoutes.length === 0" class="text-xs text-muted py-3 text-center">暂未配置进化链</div>

      <!-- Routes -->
      <div v-else class="space-y-4 mb-3">
        <div v-for="(route, rIdx) in evolutionRoutes" :key="rIdx"
          class="rounded-xl border p-3"
          :class="isDark ? 'border-gray-600 bg-gray-800/30' : 'border-gray-300 bg-white'">
          <!-- Route header -->
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-primary-500">路线 {{ rIdx + 1 }}</span>
            <button @click="removeEvoRoute(rIdx)" class="text-red-400 hover:text-red-600 text-xs" title="删除此路线">删除路线</button>
          </div>

          <!-- Stages in this route -->
          <div class="space-y-2 mb-2">
            <div v-for="(stage, sIdx) in route" :key="sIdx"
              class="flex items-center gap-2 p-2.5 rounded-lg border transition-colors"
              :class="isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'">
              <!-- Stage number + move arrows -->
              <div class="flex flex-col items-center gap-0.5 flex-shrink-0 w-6">
                <button v-if="sIdx > 0" @click="moveEvoStage(rIdx, sIdx, -1)"
                  class="w-4 h-4 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-primary-500 hover:text-white text-gray-500 dark:text-gray-300 text-[9px] transition-colors" title="上移">▲</button>
                <span v-else class="h-4"></span>
                <span class="text-[10px] font-bold text-primary-500 leading-none">{{ sIdx + 1 }}</span>
                <button v-if="sIdx < route.length - 1" @click="moveEvoStage(rIdx, sIdx, 1)"
                  class="w-4 h-4 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-primary-500 hover:text-white text-gray-500 dark:text-gray-300 text-[9px] transition-colors" title="下移">▼</button>
                <span v-else class="h-4"></span>
              </div>

              <!-- Pet selection + level + condition -->
              <div class="flex-1 min-w-0 flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                  <div class="flex-1 min-w-0">
                    <PetPicker
                      :model-value="stage.pet_uid || ''"
                      @update:model-value="(uid) => onEvoStageSelect(rIdx, sIdx, uid)"
                      placeholder="选择精灵..."
                    />
                  </div>
                  <div class="w-16 flex-shrink-0">
                    <input v-model="stage.evolve_level" class="input w-full text-xs text-center" placeholder="等级" type="number" min="1" />
                  </div>
                </div>
                <!-- Evolve condition (structured) -->
                <div class="flex items-center gap-2">
                  <select class="input w-20 text-xs flex-shrink-0"
                    :value="stage.evolve_condition?.type || ''"
                    @change="onConditionTypeChange(rIdx, sIdx, $event.target.value)">
                    <option value="">无条件</option>
                    <option value="text">文本</option>
                    <option value="skill">技能</option>
                    <option value="element">属性</option>
                    <option value="pet">精灵</option>
                  </select>
                  <!-- Text condition -->
                  <input v-if="stage.evolve_condition?.type === 'text'"
                    v-model="stage.evolve_condition.text" class="input flex-1 text-xs" placeholder="进化条件描述（如：使用火之石）" />
                  <!-- Skill condition -->
                  <div v-else-if="stage.evolve_condition?.type === 'skill'" class="flex-1 flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] text-muted">使用</span>
                    <input v-model.number="stage.evolve_condition.skill_count" type="number" min="1" class="input w-20 text-xs text-center" placeholder="次数" />
                    <span class="text-[10px] text-muted">次</span>
                    <div class="flex-1 min-w-[140px]">
                      <SkillPicker
                        :model-value="stage.evolve_condition.skill_uid || ''"
                        @update:model-value="(uid) => onConditionSkillSelect(rIdx, sIdx, uid)"
                        @selected="(skill) => onConditionSkillInfo(rIdx, sIdx, skill)"
                        placeholder="搜索技能..."
                      />
                    </div>
                    <label class="flex items-center gap-1 text-[10px] text-muted cursor-pointer">
                      <input type="checkbox" v-model="stage.evolve_condition.need_win" class="w-3 h-3" />
                      需战胜
                    </label>
                  </div>
                  <!-- Element condition -->
                  <div v-else-if="stage.evolve_condition?.type === 'element'" class="flex-1 flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] text-muted">击败</span>
                    <input v-model.number="stage.evolve_condition.element_count" type="number" min="1" class="input w-20 text-xs text-center" placeholder="次数" />
                    <span class="text-[10px] text-muted">只</span>
                    <div class="flex-1 min-w-[100px]">
                      <SearchSelect
                        :model-value="stage.evolve_condition.element_id ? String(stage.evolve_condition.element_id) : ''"
                        @update:model-value="(v) => onConditionElementSelect(rIdx, sIdx, v)"
                        :options="elements.map(e => ({ value: String(e.id), label: e.name, icon: e.icon }))"
                        placeholder="选择属性"
                      />
                    </div>
                    <span class="text-[10px] text-muted">属性精灵</span>
                  </div>
                  <!-- Pet condition -->
                  <div v-else-if="stage.evolve_condition?.type === 'pet'" class="flex-1 flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] text-muted">击败</span>
                    <input v-model.number="stage.evolve_condition.pet_count" type="number" min="1" class="input w-20 text-xs text-center" placeholder="次数" />
                    <span class="text-[10px] text-muted">次</span>
                    <div class="flex-1 min-w-[120px]">
                      <PetPicker
                        :model-value="stage.evolve_condition.pet_uid || ''"
                        @update:model-value="(uid) => onConditionPetSelect(rIdx, sIdx, uid)"
                        placeholder="选择精灵..."
                        all-variants
                        compact
                      />
                    </div>
                  </div>
                </div>
                <div v-if="!stage.pet_uid" class="flex items-center gap-2">
                  <span class="text-[10px] text-muted flex-shrink-0">手动：</span>
                  <input v-model="stage.name" class="input flex-1 text-xs" placeholder="精灵名称（未入库时使用）" />
                </div>
              </div>

              <!-- Delete stage -->
              <button @click="removeEvoStage(rIdx, sIdx)" class="text-red-400 hover:text-red-600 text-sm flex-shrink-0 w-5 text-center" title="删除">✕</button>
            </div>
          </div>

          <button @click="addEvoStage(rIdx)" class="text-[11px] text-primary-500 hover:underline">+ 添加阶段</button>
        </div>
      </div>

      <button @click="addEvoRoute" class="text-xs text-primary-500 hover:underline">+ 添加进化路线</button>
    </div>

    <!-- 蛋组配置 -->
    <div v-if="!isNew" class="card mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-roco text-base text-primary-500">蛋组配置</h2>
        <button @click="saveEggGroups" :disabled="eggGroupsSaving" class="btn text-xs">
          {{ eggGroupsSaving ? '保存中...' : '💾 保存蛋组' }}
        </button>
      </div>
      <span v-if="eggGroupsMsg" class="text-xs mb-2 inline-block" :class="eggGroupsOk ? 'text-green-600' : 'text-red-500'">{{ eggGroupsMsg }}</span>

      <!-- Selected egg groups -->
      <div class="flex flex-wrap gap-2 mb-3">
        <div v-for="g in selectedEggGroups" :key="g.id"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
          :style="{ borderColor: getEggGroupColor(g.id) + '60', background: getEggGroupColor(g.id) + '15', color: getEggGroupColor(g.id) }">
          <span>{{ g.name }}</span>
          <button @click="removeEggGroup(g.id)" class="hover:opacity-60 ml-0.5" :style="{ color: getEggGroupColor(g.id) }" title="移除">✕</button>
        </div>
        <div v-if="!selectedEggGroups.length" class="text-xs text-muted py-1">暂未配置蛋组</div>
      </div>

      <!-- Add egg group -->
      <div class="flex items-center gap-2">
        <SearchSelect
          v-model="addEggGroupId"
          :options="availableEggGroupOptions"
          placeholder="选择蛋组..."
          class="flex-1 max-w-xs"
        />
        <button v-if="addEggGroupId" @click="addEggGroup"
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors">
          + 添加
        </button>
      </div>
    </div>

    <!-- 技能配置 -->
    <div v-if="!isNew" class="card mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-roco text-base text-primary-500">技能配置</h2>
        <button @click="saveSkills" :disabled="skillsSaving" class="btn text-xs">
          {{ skillsSaving ? '保存中...' : '💾 保存技能' }}
        </button>
      </div>
      <span v-if="skillsMsg" class="text-xs mb-2 inline-block" :class="skillsOk ? 'text-green-600' : 'text-red-500'">{{ skillsMsg }}</span>

      <!-- Skill tabs -->
      <div class="flex gap-1 mb-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
        <button v-for="tab in skillTabs" :key="tab.key" @click="activeSkillTab = tab.key"
          class="px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px"
          :class="activeSkillTab === tab.key
            ? 'border-primary-500 text-primary-500'
            : 'border-transparent text-muted hover:text-foreground'">
          {{ tab.label }} ({{ skillForms[tab.key].length }})
        </button>
      </div>

      <!-- Skill list for active tab -->
      <div class="space-y-2 max-h-[500px] overflow-y-auto">
        <!-- Header row -->
        <div class="flex items-center gap-2 px-2 text-[10px] text-muted font-medium"
          :class="skillForms[activeSkillTab].length ? '' : 'hidden'">
          <span v-if="activeSkillTab === 'skills'" class="w-20 text-center">等级</span>
          <span class="w-6"></span>
          <span class="flex-1 min-w-0">名称</span>
          <span class="w-14 text-center">属性</span>
          <span class="w-14 text-center">分类</span>
          <span class="w-12 text-center">能耗</span>
          <span class="w-12 text-center">威力</span>
          <span class="w-5"></span>
        </div>
        <div v-for="(skill, idx) in skillForms[activeSkillTab]" :key="idx"
          class="flex items-center gap-2 p-2 rounded-lg border transition-colors"
          :class="isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'">
          <!-- Level (only for skills type) -->
          <div v-if="activeSkillTab === 'skills'" class="flex items-center w-20 flex-shrink-0">
            <span class="text-xs text-muted mr-1">LV</span>
            <input v-model="skill.level" type="number" class="input w-12 text-xs text-center !px-1" placeholder="--" />
          </div>
          <!-- Skill icon: fallback to element icon -->
          <img v-if="skill.skill_icon" :src="skill.skill_icon" class="w-6 h-6 object-contain flex-shrink-0 rounded" loading="lazy" />
          <img v-else-if="getElementIcon(skill.element)" :src="getElementIcon(skill.element)" class="w-6 h-6 object-contain flex-shrink-0 rounded" loading="lazy" />
          <div v-else class="w-6 h-6 bg-gray-200 dark:bg-white/10 rounded flex-shrink-0"></div>
          <!-- Skill name -->
          <span class="text-xs font-medium truncate flex-1 min-w-0">{{ skill.name || '(未选择)' }}</span>
          <!-- Element -->
          <span class="w-14 text-center flex-shrink-0">
            <span v-if="skill.element" class="text-[10px] px-1.5 py-0.5 rounded inline-block"
              :style="{ background: getElementColor(skill.element) + '20', color: getElementColor(skill.element) }">{{ skill.element }}</span>
          </span>
          <!-- Category -->
          <span class="w-14 text-center flex-shrink-0">
            <span v-if="skill.type" class="text-[10px] px-1.5 py-0.5 rounded inline-block"
              :style="{ background: getCategoryColor(skill.type) + '20', color: getCategoryColor(skill.type) }">{{ skill.type }}</span>
          </span>
          <!-- Cost -->
          <span class="w-12 text-center text-[10px] text-muted flex-shrink-0">{{ skill.cost || '-' }}</span>
          <!-- Power -->
          <span class="w-12 text-center text-[10px] text-muted flex-shrink-0">{{ skill.power || '-' }}</span>
          <!-- Delete -->
          <button @click="removeSkill(activeSkillTab, idx)" class="text-red-400 hover:text-red-600 text-sm flex-shrink-0 w-5 text-center" title="移除">✕</button>
        </div>
        <div v-if="!skillForms[activeSkillTab].length" class="text-center text-xs text-muted py-4">暂无技能，点击下方按钮从技能库导入</div>
      </div>

      <!-- Add skill button -->
      <button @click="openSkillPicker()" class="mt-3 text-xs text-primary-500 hover:underline">
        + 从技能库导入{{ activeSkillTab === 'skills' ? '精灵技能' : activeSkillTab === 'bloodline_skills' ? '血脉技能' : '技能石技能' }}
      </button>
    </div>

    <!-- 技能选择弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSkillPicker" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showSkillPicker = false"></div>
          <div class="relative w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            :class="isDark ? 'bg-gray-900' : 'bg-white'">
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
              <h3 class="font-roco text-base text-primary-500">从技能库选择技能</h3>
              <button @click="showSkillPicker = false" class="text-muted hover:text-foreground text-lg">✕</button>
            </div>

            <!-- Filters -->
            <div class="px-5 py-3 border-b space-y-3" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
              <!-- Search + dropdowns -->
              <div class="flex flex-wrap gap-2">
                <input v-model="pickerSearch" placeholder="搜索技能名称..." @input="debouncedPickerFetch" class="input w-full sm:w-52 text-sm" />
                <select v-model="pickerCategory" @change="pickerFilterChanged" class="select text-sm">
                  <option value="">分类：全部</option>
                  <option v-for="c in ['物攻','魔攻','防御','状态']" :key="c" :value="c">分类：{{ c }}</option>
                </select>
                <select v-model="pickerCounter" @change="pickerFilterChanged" class="select text-sm">
                  <option value="">应对：不限</option>
                  <option value="none">应对：无</option>
                  <option v-for="c in ['状态','防御','攻击']" :key="c" :value="c">应对：{{ c }}</option>
                </select>
                <select v-model="pickerKeyword" @change="pickerFilterChanged" class="select text-sm">
                  <option value="">效果：不限</option>
                  <option v-for="k in keywordOptions" :key="k.value" :value="k.value">{{ k.label }}</option>
                </select>
                <span class="text-muted text-xs self-center ml-auto">共 {{ pickerTotal }} 条</span>
              </div>
              <!-- Element filter icons -->
              <div class="flex flex-wrap gap-1.5">
                <button @click="pickerElementId = ''; pickerFilterChanged()"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-medium transition-colors"
                  :class="!pickerElementId ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'">
                  全
                </button>
                <button v-for="elem in elements" :key="elem.id"
                  @click="pickerElementId = elem.id; pickerFilterChanged()"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  :class="pickerElementId === elem.id ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
                  :title="elem.name">
                  <img :src="elem.icon" class="w-5 h-5" :alt="elem.name" />
                </button>
              </div>
            </div>

            <!-- Skill list -->
            <div class="flex-1 overflow-y-auto px-5 py-3">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-muted text-xs">
                    <th class="py-2 px-2 w-10">图标</th>
                    <th class="py-2 px-2">名称</th>
                    <th class="py-2 px-2">属性</th>
                    <th class="py-2 px-2">分类</th>
                    <th class="py-2 px-2 w-12">能耗</th>
                    <th class="py-2 px-2 w-12">威力</th>
                    <th class="py-2 px-2">效果</th>
                    <th class="py-2 px-2 w-12">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="skill in pickerSkills" :key="skill.uid"
                    class="border-t hover:bg-primary-500/5 transition-colors"
                    :class="isDark ? 'border-gray-700' : 'border-gray-100'">
                    <td class="py-2 px-2">
                      <img v-if="skill.icon_url" :src="skill.icon_url" class="w-8 h-8 object-contain" loading="lazy" />
                      <img v-else-if="skill.element_icon" :src="skill.element_icon" class="w-8 h-8 object-contain" loading="lazy" />
                    </td>
                    <td class="py-2 px-2 font-medium">{{ skill.name }}</td>
                    <td class="py-2 px-2">
                      <span class="flex items-center gap-1">
                        <img v-if="skill.element_icon" :src="skill.element_icon" class="w-4 h-4" />
                        <span class="text-xs" :style="{ color: skill.element_color }">{{ skill.element_name }}</span>
                      </span>
                    </td>
                    <td class="py-2 px-2">
                      <span class="text-xs font-medium" :style="{ color: getCategoryColor(skill.category) }">{{ skill.category }}</span>
                    </td>
                    <td class="py-2 px-2 text-center">{{ skill.cost }}</td>
                    <td class="py-2 px-2 text-center">{{ skill.power }}</td>
                    <td class="py-2 px-2 text-xs text-muted max-w-[200px] truncate" :title="skill.description">{{ skill.description }}</td>
                    <td class="py-2 px-2 text-center">
                      <button @click="importSkill(skill)" class="text-primary-500 hover:text-primary-600 text-xs font-medium">导入</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!pickerSkills.length && !pickerLoading" class="text-center text-muted text-xs py-8">无匹配技能</div>
              <div v-if="pickerLoading" class="text-center text-muted text-xs py-8">加载中...</div>
            </div>

            <!-- Pagination -->
            <div v-if="pickerTotal > pickerLimit" class="flex justify-center items-center gap-3 px-5 py-3 border-t" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
              <button @click="pickerPage > 1 && (pickerPage--, fetchPickerSkills())" :disabled="pickerPage <= 1" class="btn-ghost text-xs">← 上一页</button>
              <span class="text-xs text-muted">{{ pickerPage }} / {{ Math.ceil(pickerTotal / pickerLimit) }}</span>
              <button @click="pickerPage < Math.ceil(pickerTotal / pickerLimit) && (pickerPage++, fetchPickerSkills())"
                :disabled="pickerPage >= Math.ceil(pickerTotal / pickerLimit)" class="btn-ghost text-xs">下一页 →</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 成就任务配置 -->
    <div v-if="!isNew" class="card mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-roco text-base text-primary-500">成就任务</h2>
        <button @click="saveAchievements" :disabled="achievementsSaving" class="btn text-xs">
          {{ achievementsSaving ? '保存中...' : '💾 保存成就' }}
        </button>
      </div>
      <span v-if="achievementsMsg" class="text-xs mb-2 inline-block" :class="achievementsOk ? 'text-green-600' : 'text-red-500'">{{ achievementsMsg }}</span>

      <!-- Achievement list -->
      <div class="space-y-2 mb-3">
        <div v-for="(ach, idx) in achievements" :key="idx"
          class="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
          <!-- Type badge -->
          <span class="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
            :class="ach.type === 'skill' ? 'bg-primary-500/15 text-primary-500' : 'bg-gray-200 dark:bg-white/10 text-muted'">
            {{ ach.type === 'skill' ? '技能' : '文本' }}
          </span>

          <!-- Content -->
          <div class="flex-1 min-w-0 space-y-1.5">
            <!-- Text type -->
            <template v-if="ach.type === 'text'">
              <input v-model="ach.title" class="input w-full text-xs" placeholder="成就描述（如：累计登录7天）" />
              <input v-model="ach.reward_desc" class="input w-full text-xs" placeholder="奖励描述（可选）" />
            </template>

            <!-- Skill type -->
            <template v-else-if="ach.type === 'skill'">
              <div class="flex items-center gap-2">
                <select v-model="ach.skill_ref_uid" @change="onAchievementSkillSelect(idx, $event.target.value)"
                  class="select text-xs flex-1">
                  <option value="">选择升级技能...</option>
                  <option v-for="s in levelUpSkills" :key="s.skill_ref_uid" :value="s.skill_ref_uid">
                    {{ s.name }} ({{ s.element || '无属性' }})
                  </option>
                </select>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <span class="text-[10px] text-muted">使用</span>
                  <input v-model.number="ach.use_count" type="number" min="1" class="input w-14 text-xs text-center" />
                  <span class="text-[10px] text-muted">次</span>
                </div>
              </div>
              <input v-model="ach.reward_desc" class="input w-full text-xs" placeholder="奖励描述（如：获得「火焰冲击」技能石）" />
            </template>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-0.5 flex-shrink-0">
            <button v-if="idx > 0" @click="moveAchievement(idx, -1)" class="text-[10px] text-muted hover:text-foreground">▲</button>
            <button v-if="idx < achievements.length - 1" @click="moveAchievement(idx, 1)" class="text-[10px] text-muted hover:text-foreground">▼</button>
            <button @click="removeAchievement(idx)" class="text-red-400 hover:text-red-600 text-xs" title="删除">✕</button>
          </div>
        </div>
        <div v-if="!achievements.length" class="text-center text-xs text-muted py-4">暂无成就任务</div>
      </div>

      <!-- Add buttons -->
      <div class="flex gap-2">
        <button v-if="form.is_final_form" @click="addAchievement('skill')" class="text-xs text-primary-500 hover:underline"
          :disabled="!levelUpSkills.length">
          + 添加技能成就
        </button>
        <button @click="addAchievement('text')" class="text-xs text-primary-500 hover:underline">
          + 添加文本成就
        </button>
      </div>
      <p v-if="form.is_final_form && !levelUpSkills.length" class="text-[10px] text-muted mt-1">提示：请先在技能配置中添加精灵技能，才能选择技能成就</p>
    </div>

    <!-- 保存按钮 -->
    <div class="flex gap-3 mb-8">
      <button @click="save" class="btn-primary shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" :disabled="saving">{{ saving ? '保存中...' : (isNew ? '✨ 创建精灵' : '💾 保存修改') }}</button>
      <span v-if="msg" class="text-sm self-center" :class="ok ? 'text-green-600' : 'text-red-500'">{{ msg }}</span>
    </div>
  </div>
  <div v-else class="text-muted text-center mt-20">加载中...</div>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { petsApi, elementsApi, skillsApi, eggsApi } from '@/api'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import { useImagePreview } from '@/composables/useImagePreview'
import { useTheme } from '@/composables/useTheme'
import SearchSelect from '@/components/shared/SearchSelect.vue'
import ImageUploader from '@/components/shared/ImageUploader.vue'
import PetPicker from '@/components/shared/PetPicker.vue'
import SkillPicker from '@/components/shared/SkillPicker.vue'

const route = useRoute()
const router = useRouter()
const modal = useModal()
const { isDark } = useTheme()
let uid = route.params.uid
const isNew = uid === 'new'

const pet = ref(null)
const detail = ref(null)
const elements = ref([])
const abilities = ref([])
const variants = ref([])
const loaded = ref(false)
const saving = ref(false)
const msg = ref('')
const ok = ref(false)
const previewType = ref('pet_default')
const formVariant = ref('')

// SearchSelect 需要字符串类型，element_id 在 DB 中是数字，做桥接
const elementIdStr = computed({
  get: () => form.value.element_id != null ? String(form.value.element_id) : '',
  set: (v) => { form.value.element_id = v ? Number(v) : null },
})
const subElementIdStr = computed({
  get: () => form.value.sub_element_id != null ? String(form.value.sub_element_id) : '',
  set: (v) => { form.value.sub_element_id = v ? Number(v) : null },
})

const { openPreview } = useImagePreview()

const form = ref({
  pet_id: '', name: '', element_id: null, sub_element_id: null,
  ability_name: '', ability_desc: '', version: '',
  hp: 0, atk: 0, def: 0, matk: 0, mdef: 0, speed: 0, total: 0,
  is_final_form: 0,
})

const detailForm = ref({ height: '', weight: '', location: '' })

// Evolution chain - multi-route format: [[{name, evolve_level, evolve_condition, pet_uid, thumb_url}, ...], ...]
const evolutionRoutes = ref([])

function addEvoRoute() {
  evolutionRoutes.value.push([])
}

function removeEvoRoute(routeIdx) {
  evolutionRoutes.value.splice(routeIdx, 1)
}

function addEvoStage(routeIdx) {
  evolutionRoutes.value[routeIdx].push({ name: '', evolve_level: '', evolve_condition: null, pet_uid: '', thumb_url: '' })
}

function removeEvoStage(routeIdx, stageIdx) {
  evolutionRoutes.value[routeIdx].splice(stageIdx, 1)
  // Remove route if empty
  if (evolutionRoutes.value[routeIdx].length === 0) {
    evolutionRoutes.value.splice(routeIdx, 1)
  }
}

function moveEvoStage(routeIdx, stageIdx, dir) {
  const route = evolutionRoutes.value[routeIdx]
  const target = stageIdx + dir
  if (target < 0 || target >= route.length) return
  const temp = route[stageIdx]
  route[stageIdx] = route[target]
  route[target] = temp
}

async function onEvoStageSelect(routeIdx, stageIdx, petUid) {
  const stage = evolutionRoutes.value[routeIdx][stageIdx]
  if (!petUid) {
    stage.pet_uid = ''
    stage.name = ''
    stage.thumb_url = ''
    return
  }
  stage.pet_uid = petUid
  // Fetch pet info to get name and thumb
  try {
    const pet = await petsApi.get(petUid)
    stage.name = pet.name || ''
    stage.thumb_url = pet.thumb_url || pet.image_url || ''
  } catch {
    stage.name = petUid
    stage.thumb_url = ''
  }
}

/** Handle evolve_condition type change - initialize the appropriate structure */
function onConditionTypeChange(routeIdx, stageIdx, type) {
  const stage = evolutionRoutes.value[routeIdx][stageIdx]
  if (!type) {
    stage.evolve_condition = null
    return
  }
  if (type === 'text') {
    stage.evolve_condition = { type: 'text', text: '' }
  } else if (type === 'skill') {
    stage.evolve_condition = { type: 'skill', skill_name: '', skill_uid: '', skill_count: 1, need_win: false }
  } else if (type === 'element') {
    stage.evolve_condition = { type: 'element', element_name: '', element_id: null, element_count: 1 }
  } else if (type === 'pet') {
    stage.evolve_condition = { type: 'pet', pet_name: '', pet_uid: '', pet_count: 1 }
  }
}

/** Handle skill selection in skill-type evolve condition */
function onConditionSkillSelect(routeIdx, stageIdx, skillUid) {
  const cond = evolutionRoutes.value[routeIdx][stageIdx].evolve_condition
  if (!cond) return
  if (!skillUid) {
    cond.skill_uid = ''
    cond.skill_name = ''
    return
  }
  cond.skill_uid = skillUid
}

/** Handle skill info callback from SkillPicker */
function onConditionSkillInfo(routeIdx, stageIdx, skill) {
  const cond = evolutionRoutes.value[routeIdx][stageIdx].evolve_condition
  if (!cond) return
  if (skill) {
    cond.skill_name = skill.name || ''
    cond.skill_uid = skill.uid || ''
  } else {
    cond.skill_name = ''
    cond.skill_uid = ''
  }
}

/** Handle element selection in element-type evolve condition */
function onConditionElementSelect(routeIdx, stageIdx, elemIdStr) {
  const cond = evolutionRoutes.value[routeIdx][stageIdx].evolve_condition
  if (!cond) return
  const elemId = elemIdStr ? Number(elemIdStr) : null
  cond.element_id = elemId
  const elem = elements.value.find(e => e.id === elemId)
  cond.element_name = elem ? elem.name : ''
}

/** Handle pet selection in pet-type evolve condition */
async function onConditionPetSelect(routeIdx, stageIdx, petUid) {
  const cond = evolutionRoutes.value[routeIdx][stageIdx].evolve_condition
  if (!cond) return
  if (!petUid) {
    cond.pet_uid = ''
    cond.pet_name = ''
    return
  }
  cond.pet_uid = petUid
  try {
    const pet = await petsApi.get(petUid)
    cond.pet_name = pet.name || ''
  } catch {
    cond.pet_name = petUid
  }
}

/** Serialize a single evolve_condition object, stripping empty values */
function serializeCondition(cond) {
  if (!cond || !cond.type) return null
  if (cond.type === 'text') {
    return cond.text?.trim() ? { type: 'text', text: cond.text.trim() } : null
  }
  if (cond.type === 'skill') {
    if (!cond.skill_uid && !cond.skill_name?.trim()) return null
    return { type: 'skill', skill_name: cond.skill_name?.trim() || '', skill_uid: cond.skill_uid || '', skill_count: cond.skill_count || 1, need_win: !!cond.need_win }
  }
  if (cond.type === 'element') {
    if (!cond.element_id && !cond.element_name?.trim()) return null
    return { type: 'element', element_name: cond.element_name?.trim() || '', element_id: cond.element_id || null, element_count: cond.element_count || 1 }
  }
  if (cond.type === 'pet') {
    if (!cond.pet_name?.trim() && !cond.pet_uid) return null
    return { type: 'pet', pet_name: cond.pet_name?.trim() || '', pet_uid: cond.pet_uid || '', pet_count: cond.pet_count || 1 }
  }
  return null
}

/** Serialize evolution routes to JSON for saving (2D array format) */
function serializeEvoChain() {
  const validRoutes = evolutionRoutes.value
    .map(route => route.filter(s => s.name?.trim()))
    .filter(route => route.length > 0)
  if (validRoutes.length === 0) return null
  return JSON.stringify(validRoutes.map(route =>
    route.map(s => ({
      name: s.name.trim(),
      evolve_level: s.evolve_level || null,
      evolve_condition: serializeCondition(s.evolve_condition),
    }))
  ))
}

// Egg groups
const allEggGroups = ref([])
const selectedEggGroups = ref([])
const addEggGroupId = ref('')
const eggGroupsSaving = ref(false)
const eggGroupsMsg = ref('')
const eggGroupsOk = ref(false)

// Egg group color palette (15 groups, id 0~14)
const EGG_GROUP_COLORS = {
  0: '#9CA3AF',  // 无法孵蛋 - 灰色
  1: '#D97706',  // 动物组 - 琥珀
  2: '#EC4899',  // 拟人组 - 粉色
  3: '#7C3AED',  // 巨灵组 - 紫色
  4: '#8B5CF6',  // 魔力组 - 浅紫
  5: '#06B6D4',  // 天空组 - 青色
  6: '#14B8A6',  // 两栖组 - 蓝绿
  7: '#22C55E',  // 植物组 - 绿色
  8: '#A16207',  // 大地组 - 棕色
  9: '#F472B6',  // 妖精组 - 浅粉
  10: '#84CC16', // 昆虫组 - 黄绿
  11: '#A78BFA', // 软体组 - 淡紫
  12: '#6B7280', // 机械组 - 钢灰
  13: '#3B82F6', // 海洋组 - 蓝色
  14: '#EF4444', // 龙组 - 红色
}

function getEggGroupColor(id) {
  return EGG_GROUP_COLORS[id] || '#6B7280'
}

const availableEggGroupOptions = computed(() =>
  allEggGroups.value
    .filter(g => !selectedEggGroups.value.some(s => s.id === g.id))
    .map(g => ({ value: String(g.id), label: g.name }))
)

function addEggGroup() {
  const id = Number(addEggGroupId.value)
  const group = allEggGroups.value.find(g => g.id === id)
  if (group && !selectedEggGroups.value.some(s => s.id === id)) {
    selectedEggGroups.value.push({ id: group.id, name: group.name })
    addEggGroupId.value = ''
    eggGroupsMsg.value = `已添加「${group.name}」`
    eggGroupsOk.value = true
  }
}

function removeEggGroup(id) {
  const idx = selectedEggGroups.value.findIndex(g => g.id === id)
  if (idx !== -1) {
    const name = selectedEggGroups.value[idx].name
    selectedEggGroups.value.splice(idx, 1)
    eggGroupsMsg.value = `已移除「${name}」`
    eggGroupsOk.value = true
  }
}

async function saveEggGroups() {
  eggGroupsSaving.value = true
  eggGroupsMsg.value = ''
  try {
    const ids = selectedEggGroups.value.map(g => g.id)
    await adminApi.savePetEggGroups(uid, ids)
    eggGroupsMsg.value = '蛋组保存成功'
    eggGroupsOk.value = true
  } catch (err) {
    eggGroupsMsg.value = '保存失败: ' + err.message
    eggGroupsOk.value = false
  } finally {
    eggGroupsSaving.value = false
  }
}

async function loadEggGroups() {
  if (isNew) return
  try {
    const [allRes, petRes] = await Promise.all([
      eggsApi.list(),
      adminApi.getPetEggGroups(uid),
    ])
    allEggGroups.value = allRes.egg_groups || []
    selectedEggGroups.value = petRes.egg_groups || []
  } catch (err) {
    console.error('Load egg groups failed:', err)
  }
}

const statFields = [
  { key: 'hp', label: '生命' }, { key: 'atk', label: '物攻' }, { key: 'matk', label: '魔攻' },
  { key: 'def', label: '物防' }, { key: 'mdef', label: '魔防' }, { key: 'speed', label: '速度' },
  { key: 'total', label: '总和' },
]

// 自动计算种族值总和
watch(() => [form.value.hp, form.value.atk, form.value.def, form.value.matk, form.value.mdef, form.value.speed], () => {
  form.value.total = (form.value.hp || 0) + (form.value.atk || 0) + (form.value.def || 0) +
    (form.value.matk || 0) + (form.value.mdef || 0) + (form.value.speed || 0)
})

// 编号 → UID
const computedUid = computed(() => {
  if (!isNew) return uid
  const pid = form.value.pet_id?.trim()
  if (!pid) return ''
  const padded = pid.padStart(3, '0')
  return formVariant.value?.trim() ? `pet_${padded}_${formVariant.value.trim()}` : `pet_${padded}`
})

function updateUid() {}

// 图片插槽
const imageSlots = computed(() => [
  { type: 'pet_default', label: '立绘', url: pendingPreviews.value.pet_default || detail.value?.image_default },
  { type: 'pet_shiny', label: '异色', url: pendingPreviews.value.pet_shiny || detail.value?.image_shiny },
  { type: 'pet_fruit', label: '果实', url: pendingPreviews.value.pet_fruit || detail.value?.image_fruit },
  { type: 'pet_egg', label: '精灵蛋', url: pendingPreviews.value.pet_egg || detail.value?.image_egg },
  { type: 'pet_thumb', label: '缩略图', url: pendingPreviews.value.pet_thumb || pet.value?.thumb_url },
])

const uploadSlots = computed(() => [
  { type: 'pet_default', label: '立绘' },
  { type: 'pet_shiny', label: '异色' },
  { type: 'pet_fruit', label: '果实' },
  { type: 'pet_egg', label: '精灵蛋' },
  { type: 'pet_thumb', label: '缩略图' },
  { type: 'pet_ability', label: '特性图标' },
])

const currentPreviewUrl = computed(() => {
  const slot = imageSlots.value.find(s => s.type === previewType.value)
  return slot?.url || null
})

const abilityIconUrl = computed(() => pendingPreviews.value.pet_ability || detail.value?.ability_icon || null)

// Ability options for SearchSelect (with pet_count badge)
const abilityOptions = computed(() =>
  abilities.value.map(a => ({
    value: a.name,
    label: a.name + (a.pet_count > 1 ? ` (${a.pet_count})` : ''),
    icon: a.icon || '',
  }))
)

// Watch ability_name changes to auto-fill description
watch(() => form.value.ability_name, (newName) => {
  if (!newName) return
  const found = abilities.value.find(a => a.name === newName)
  if (found) {
    // Only auto-fill if description is empty or matches a known ability description
    const currentDesc = form.value.ability_desc
    const isKnownDesc = !currentDesc || abilities.value.some(a => a.description === currentDesc)
    if (isKnownDesc) {
      form.value.ability_desc = found.description || ''
    }
  }
})

async function loadData() {
  const [elemRes, abilitiesRes] = await Promise.all([
    elementsApi.list(),
    adminApi.abilities().catch(() => []),
  ])
  elements.value = elemRes.elements
  abilities.value = abilitiesRes

  if (!isNew) {
    const data = await petsApi.get(uid)
    pet.value = data
    detail.value = data.detail || null

    form.value = {
      pet_id: data.pet_id, name: data.name,
      element_id: data.element_id, sub_element_id: data.sub_element_id,
      ability_name: data.ability_name, ability_desc: data.ability_desc,
      version: data.version,
      hp: data.hp, atk: data.atk, def: data.def,
      matk: data.matk, mdef: data.mdef, speed: data.speed, total: data.total,
      is_final_form: data.is_final_form || 0,
    }

    if (data.detail) {
      detailForm.value = {
        height: data.detail.height, weight: data.detail.weight, location: data.detail.location,
      }
      // Load evolution chain (backend now returns 2D array: [[{name, evolve_level, evolve_condition, uid, thumb_url},...], ...])
      const rawChain = data.detail.evolution_chain || []
      evolutionRoutes.value = rawChain.map(route =>
        route.map(stage => ({
          name: stage.name || '',
          evolve_level: stage.evolve_level || '',
          evolve_condition: stage.evolve_condition || null, // structured object or null
          pet_uid: stage.uid || '',
          thumb_url: stage.thumb_url || '',
        }))
      )
    }

    // Load variants
    variants.value = data.variants || []

    // Load skills
    await loadSkills()
    // Load egg groups
    await loadEggGroups()
    // Load achievements
    await loadAchievements()
  }

  loaded.value = true
}

// Track uploaded images for new pet (file saved on disk but not yet in DB)
const pendingImages = ref({})
// Blob preview URLs for staged files (new pet mode)
const pendingPreviews = ref({})
// Count of pending images
const pendingCount = computed(() => Object.keys(pendingImages.value).length)

function handleImageUploaded(type, path) {
  msg.value = '上传成功'; ok.value = true
  if (isNew) {
    // From library selection in deferred mode — store the library path
    pendingImages.value[type] = { source: 'library', path }
    pendingPreviews.value[type] = path
  } else {
    loadData()
  }
}

function handleFileSelected(type, file) {
  if (isNew && !computedUid.value) {
    modal.warning('请先填写编号', '上传图片前需要先填写精灵编号，以便生成 UID')
    return
  }
  // Stage the file locally with a blob preview URL
  pendingImages.value[type] = { source: 'file', file }
  // Revoke old blob URL if exists
  if (pendingPreviews.value[type] && pendingPreviews.value[type].startsWith('blob:')) {
    URL.revokeObjectURL(pendingPreviews.value[type])
  }
  pendingPreviews.value[type] = URL.createObjectURL(file)
  msg.value = `${uploadSlots.value.find(s => s.type === type)?.label || '图片'}已暂存`
  ok.value = true
}

async function handleNoUid() {
  await modal.warning('请先填写编号', '上传图片前需要先填写精灵编号，以便生成 UID')
}

function validate() {
  if (!form.value.pet_id?.trim()) return '请填写精灵编号'
  if (!form.value.name?.trim()) return '请填写名称'
  if (!form.value.element_id) return '请选择主属性'
  if (!form.value.ability_name?.trim()) return '请填写特性名称'
  if (!form.value.ability_desc?.trim()) return '请填写特性描述'
  if (!form.value.hp && !form.value.atk && !form.value.speed) return '请填写种族值'
  return null
}

async function save() {
  const err = validate()
  if (err) { await modal.warning('缺少必填项', err); return }

  saving.value = true; msg.value = ''
  try {
    if (isNew) {
      const newUid = computedUid.value
      if (!newUid) { await modal.warning('提示', '编号无效'); saving.value = false; return }
      await adminApi.create('pets', { uid: newUid, ...form.value })
      // Create pet_details first so upload UPSERT can find the record
      const evoChainJson = serializeEvoChain()
      await adminApi.create('pet_details', { pet_uid: newUid, ...detailForm.value, evolution_chain: evoChainJson })

      // Upload all pending images now that the pet exists
      const imageFieldMap = {
        pet_default: 'image_default', pet_shiny: 'image_shiny',
        pet_fruit: 'image_fruit', pet_egg: 'image_egg', pet_ability: 'ability_icon',
      }
      const detailUpdates = {}
      let thumbUrl = ''

      for (const [type, pending] of Object.entries(pendingImages.value)) {
        let resultPath = ''
        let res
        if (pending.source === 'file') {
          // Upload the staged file to server
          res = await adminApi.upload(pending.file, type, newUid)
          resultPath = res.path
        } else if (pending.source === 'library') {
          // Copy from library to business directory
          res = await adminApi.mediaCopyToBusiness(pending.path, type, newUid)
          resultPath = res.path
        }
        // Map to detail fields
        if (type === 'pet_thumb') {
          thumbUrl = resultPath
        } else if (imageFieldMap[type]) {
          detailUpdates[imageFieldMap[type]] = resultPath
        }
        // Capture auto-generated thumbnail from pet_default upload
        if (type === 'pet_default' && res?.thumb_path && !thumbUrl) {
          thumbUrl = res.thumb_path
        }
      }

      // Update pet_details with image paths if any were uploaded
      if (Object.keys(detailUpdates).length > 0) {
        await adminApi.update('pet_details', newUid, detailUpdates)
      }
      if (thumbUrl) {
        await adminApi.update('pets', newUid, { thumb_url: thumbUrl })
      }

      // Cleanup blob URLs
      for (const url of Object.values(pendingPreviews.value)) {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
      }

      await modal.success('创建成功', `精灵 ${form.value.name}（${newUid}）已创建`)
      router.replace(`/admin/pets/${newUid}`)
    } else {
      await adminApi.update('pets', uid, form.value)
      const evoChainJson = serializeEvoChain()
      const detailPayload = { ...detailForm.value, evolution_chain: evoChainJson }
      if (detail.value) {
        await adminApi.update('pet_details', uid, detailPayload)
      } else {
        // pet_details record doesn't exist yet, create it
        await adminApi.create('pet_details', { pet_uid: uid, ...detailPayload })
      }
      ok.value = true; msg.value = '保存成功'
      loadData()
    }
  } catch (err) {
    await modal.alert('操作失败', err.message)
  } finally {
    saving.value = false
  }
}

// ============================================================
// 技能配置
// ============================================================
const activeSkillTab = ref('skills')
const skillsSaving = ref(false)
const skillsMsg = ref('')
const skillsOk = ref(false)

const skillTabs = [
  { key: 'skills', label: '精灵技能' },
  { key: 'bloodline_skills', label: '血脉技能' },
  { key: 'learnable_stones', label: '技能石技能' },
]

const skillForms = reactive({
  skills: [],
  bloodline_skills: [],
  learnable_stones: [],
})

// Skill picker modal state
const showSkillPicker = ref(false)
const pickerSkills = ref([])
const pickerTotal = ref(0)
const pickerPage = ref(1)
const pickerLimit = ref(30)
const pickerSearch = ref('')
const pickerCategory = ref('')
const pickerCounter = ref('')
const pickerElementId = ref('')
const pickerKeyword = ref('')
const pickerLoading = ref(false)

const keywordOptions = [
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

function getElementColor(elementName) {
  const elem = elements.value.find(e => e.name === elementName)
  return elem?.color || '#6B7280'
}

function getElementIcon(elementName) {
  const elem = elements.value.find(e => e.name === elementName)
  return elem?.icon || ''
}

function getCategoryColor(type) {
  const colors = { '物攻': '#FF9636', '魔攻': '#9446EC', '防御': '#3F89B4', '状态': '#2E7D32' }
  return colors[type] || '#6B7280'
}

function removeSkill(tabKey, idx) {
  skillForms[tabKey].splice(idx, 1)
}

function openSkillPicker() {
  showSkillPicker.value = true
  pickerPage.value = 1
  fetchPickerSkills()
}

let pickerDebounceTimer = null
function debouncedPickerFetch() {
  clearTimeout(pickerDebounceTimer)
  pickerDebounceTimer = setTimeout(() => { pickerPage.value = 1; fetchPickerSkills() }, 300)
}

function pickerFilterChanged() {
  pickerPage.value = 1
  fetchPickerSkills()
}

async function fetchPickerSkills() {
  pickerLoading.value = true
  try {
    const res = await skillsApi.list({
      page: pickerPage.value,
      limit: pickerLimit.value,
      search: pickerSearch.value,
      category: pickerCategory.value,
      counter: pickerCounter.value,
      element_id: pickerElementId.value,
      keyword: pickerKeyword.value,
    })
    pickerSkills.value = res.skills
    pickerTotal.value = res.total
  } catch (err) {
    console.error('Fetch picker skills failed:', err)
  } finally {
    pickerLoading.value = false
  }
}

function importSkill(skill) {
  const newSkill = {
    level: '',
    name: skill.name,
    element: skill.element_name || '',
    type: skill.category || '',
    cost: skill.cost || 0,
    power: skill.power || 0,
    description: skill.description || '',
    skill_ref_uid: skill.uid || '',
    skill_icon: skill.icon_url || '',
  }
  skillForms[activeSkillTab.value].push(newSkill)
  showSkillPicker.value = false
  skillsMsg.value = `已导入「${skill.name}」`
  skillsOk.value = true
}

async function loadSkills() {
  if (isNew) return
  try {
    const data = await adminApi.getPetSkills(uid)
    skillForms.skills = data.skills || []
    skillForms.bloodline_skills = data.bloodline_skills || []
    skillForms.learnable_stones = data.learnable_stones || []
  } catch (err) {
    console.error('Load pet skills failed:', err)
  }
}

async function saveSkills() {
  skillsSaving.value = true
  skillsMsg.value = ''
  try {
    // Clean up internal fields before sending
    const clean = (arr) => arr.map(({ id, pet_uid, skill_type, skill_icon, ...rest }) => rest)
    await adminApi.savePetSkills(uid, {
      skills: clean(skillForms.skills),
      bloodline_skills: clean(skillForms.bloodline_skills),
      learnable_stones: clean(skillForms.learnable_stones),
    })
    skillsOk.value = true
    skillsMsg.value = '技能保存成功'
  } catch (err) {
    skillsOk.value = false
    skillsMsg.value = err.message
  } finally {
    skillsSaving.value = false
  }
}

// ============================================================
// 成就任务配置
// ============================================================
const achievements = ref([])
const achievementsSaving = ref(false)
const achievementsMsg = ref('')
const achievementsOk = ref(false)

// Get level-up skills (skill_type === 'skills') for skill achievement selection
const levelUpSkills = computed(() => skillForms.skills.filter(s => s.skill_ref_uid))

function addAchievement(type) {
  if (type === 'text') {
    achievements.value.push({ type: 'text', title: '', reward_desc: '' })
  } else if (type === 'skill') {
    achievements.value.push({ type: 'skill', skill_ref_uid: '', skill_name: '', use_count: 10, reward_desc: '' })
  }
}

function removeAchievement(idx) {
  achievements.value.splice(idx, 1)
}

function moveAchievement(idx, dir) {
  const target = idx + dir
  if (target < 0 || target >= achievements.value.length) return
  const temp = achievements.value[idx]
  achievements.value[idx] = achievements.value[target]
  achievements.value[target] = temp
}

function onAchievementSkillSelect(idx, skillRefUid) {
  const a = achievements.value[idx]
  if (!skillRefUid) {
    a.skill_ref_uid = ''
    a.skill_name = ''
    a.reward_desc = ''
    return
  }
  a.skill_ref_uid = skillRefUid
  const skill = skillForms.skills.find(s => s.skill_ref_uid === skillRefUid)
  if (skill) {
    a.skill_name = skill.name
    a.reward_desc = `获得「${skill.name}」技能石`
  }
}

async function loadAchievements() {
  if (isNew) return
  try {
    const data = await adminApi.getPetAchievements(uid)
    achievements.value = (data.achievements || []).map(a => ({
      type: a.type,
      title: a.title || '',
      skill_ref_uid: a.skill_ref_uid || '',
      skill_name: a.skill_name || '',
      use_count: a.use_count || 0,
      reward_desc: a.reward_desc || '',
      skill_icon: a.skill_icon || '',
      element_icon: a.element_icon || '',
    }))
  } catch (err) {
    console.error('Load achievements failed:', err)
  }
}

async function saveAchievements() {
  achievementsSaving.value = true
  achievementsMsg.value = ''
  try {
    const payload = achievements.value.map((a, idx) => ({
      type: a.type,
      title: a.title || null,
      skill_ref_uid: a.skill_ref_uid || null,
      skill_name: a.skill_name || null,
      use_count: a.use_count || 0,
      reward_desc: a.reward_desc || null,
      sort_order: idx,
    }))
    await adminApi.savePetAchievements(uid, payload)
    achievementsOk.value = true
    achievementsMsg.value = '成就任务保存成功'
  } catch (err) {
    achievementsOk.value = false
    achievementsMsg.value = err.message
  } finally {
    achievementsSaving.value = false
  }
}

onMounted(loadData)

// Watch route param changes for variant switching (same component reused)
watch(() => route.params.uid, (newUid) => {
  if (newUid && newUid !== uid && !isNew) {
    uid = newUid
    loaded.value = false
    previewType.value = 'pet_default'
    msg.value = ''
    pendingImages.value = {}
    pendingPreviews.value = {}
    loadData()
  }
})
</script>
