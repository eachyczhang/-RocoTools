# Skill: roco-admin

> RocoTools 管理端开发规范。新增管理页面或修改后端 CRUD 时参考。

---

## 路由规范

管理端路由统一 `/admin` 前缀，`meta.hidden = true`（不显示在用户端导航）：

```js
{ path: '/admin/xxx', name: 'AdminXxx', component: () => import('@/views/admin/AdminXxx.vue'), meta: { hidden: true } }
```

---

## 目录结构

```
src/
├── views/admin/           # 管理端页面
│   ├── Admin.vue          # 登录页
│   ├── AdminDashboard.vue # 管理首页（概览 + 备份）
│   ├── AdminPets.vue      # 精灵列表
│   ├── AdminPetEdit.vue   # 精灵编辑
│   ├── AdminSkills.vue    # 技能列表
│   ├── AdminSkillEdit.vue # 技能编辑
│   ├── AdminNatures.vue   # 性格管理
│   └── AdminEggs.vue      # 蛋组管理
├── api/admin.js           # 管理端 API 封装
├── composables/useAdmin.js # 管理员状态
└── composables/useModal.js # 全局弹窗
```

---

## 后端 EDITABLE_TABLES 配置

新增可编辑表时，在 `app/server/src/routes/admin.js` 的 `EDITABLE_TABLES` 中添加：

```js
table_name: {
  label: '中文名',        // 用于错误提示
  primaryKey: 'uid',     // 主键字段
  editableFields: [...], // 可编辑字段列表
},
```

---

## 图片上传类型配置

在 `IMAGE_TYPES` 中添加：

```js
type_key: { dir: '相对 data/public/ 的目录', suffix: '文件后缀' },
```

在 `fieldMap` 中添加数据库映射：

```js
type_key: { table: '表名', field: '字段名', key: '主键字段' },
```

---

## 全局弹窗 useModal

```js
import { useModal } from '@/composables/useModal'
const modal = useModal()

// 确认操作（返回 true/false）
const ok = await modal.confirm('标题', '内容')

// 危险操作（红色按钮）
const ok = await modal.danger('删除', '确定删除？')

// 警告提示
await modal.warning('提示', '请填写必填项')

// 成功提示（无取消按钮）
await modal.success('完成', '操作成功')

// 信息提示（无取消按钮）
await modal.alert('提示', '说明文字')

// 自定义
await modal.show({
  type: 'danger',
  title: '最终确认',
  message: '不可恢复！',
  confirmText: '确认删除',
  cancelText: '取消',
})
```

---

## 鉴权机制

- 密码：环境变量 `ADMIN_PASSWORD`
- Token：JWT，4 小时有效，secret 为 `ADMIN_SECRET`
- 中间件：`src/middleware/authAdmin.js`
- 前端存储：`localStorage` 的 `admin_token`
- 登录后调用 `useAdmin().login()`，退出调用 `logout()`

---

## 新增管理页面模板

```vue
<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">页面标题</h1>
    <!-- 内容 -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'

const modal = useModal()
// ...
</script>
```

---

## 备份系统

三种类型：

| 类型 | 目录 | 删除保护 |
|------|------|---------|
| 临时备份 | `backups/` | 1次确认 |
| 赛季备份 | `backups/seasons/` | 3次确认（前端2+后端token） |
| 恢复前快照 | `backups/snapshots/` | 1次确认 |

恢复时弹窗可选：是否保存当前数据为快照 + 自定义命名。

---

## 属性选择器规范

属性字段统一用下拉 `<select>`，从 `elementsApi.list()` 获取选项：

```vue
<select v-model="form.element_id" class="select w-full">
  <option :value="null" disabled>请选择属性</option>
  <option v-for="e in elements" :key="e.id" :value="e.id">{{ e.name }}</option>
</select>
```

---

## 必填校验

新增精灵必填：编号(pet_id)、名称(name)、主属性(element_id)、特性名称、特性描述、种族值（至少一项非零）

新增时 UID 由编号自动生成，已存在则后端返回 409 + 友好提示。

---

## 赛季管理

- 路由：`/admin/seasons`
- 赛季数据仅在管理端配置，不通过爬虫获取
- 配置项：封面图 + 传说精灵(1) + 通行证精灵(2) + 赛季限定(8) + 赛季异色(8)
- PetPicker 选取精灵（搜索模式 + 图片浏览模式）
- 封面图存入 `data/uploads/seasons/{season_id}_cover.png`（不被爬虫覆盖）
- `is_current` 设为当前赛季时自动将其他赛季置 0

---

## 数据审查

- 路由：`/admin/conflicts`
- import.js 遇到 manual_edit=1 的记录 → 跳过并存入 pending_conflicts.json
- 审查页面逐条对比：当前值(蓝) vs 爬虫新值(绿)，差异黄色标记
- 操作：逐条覆盖/保留，或全部覆盖/保留
- 覆盖后 manual_edit 重置为 0
