# 视觉设计规范

本文档定义了 RocoTools 项目的视觉设计系统，所有页面（用户端 + 管理端）应统一遵循。

---

## 色彩体系

### 主色（Primary）— 金色系

源自洛克王国世界的品牌色调，用于标题、按钮、激活态、强调元素。

| Token | 色值 | 用途 |
|-------|------|------|
| `primary-50` | `#FFF8E1` | 极浅背景、hover 底色 |
| `primary-100` | `#FFECB3` | 浅色背景、选中态底色 |
| `primary-200` | `#FFE082` | 边框高亮、进度条底 |
| `primary-300` | `#FFD54F` | hover 边框、装饰 |
| `primary-400` | `#FFCA28` | 暗色模式下的强调色 |
| `primary-500` | `#D69F23` | **核心主色**：按钮、标题、激活态 |
| `primary-600` | `#B8860B` | 按钮 hover、深色强调 |
| `primary-700` | `#8B6914` | 按钮 active、文字强调 |
| `primary-800` | `#5D4E37` | 深色文字 |
| `primary-900` | `#3D2E1F` | 极深色 |

### 表面色（Surface）

| Token | 色值 | 用途 |
|-------|------|------|
| `surface-light` | `#FFFFFF` | 亮色主背景 |
| `surface-light-alt` | `#F8F9FA` | 亮色次背景（body） |
| `surface-light-card` | `#FFFFFF` | 卡片背景 |
| `surface-light-border` | `#E5E7EB` | 亮色边框 |
| `surface-dark` | `#0F1419` | 暗色主背景 |
| `surface-dark-alt` | `#1A1F2E` | 暗色次背景（输入框） |
| `surface-dark-card` | `#1E2433` | 暗色卡片背景 |
| `surface-dark-border` | `#2D3548` | 暗色边框 |

### 语义色

用于状态标签、提示信息等场景：

| 语义 | 亮色文字 | 亮色背景 | 暗色文字 | 暗色背景 |
|------|----------|----------|----------|----------|
| 成功/当期 | `#16a34a` | `rgba(34,197,94,0.1)` | `#86efac` | `rgba(34,197,94,0.15)` |
| 信息/即将 | `#2563eb` | `rgba(59,130,246,0.1)` | `#93c5fd` | `rgba(59,130,246,0.15)` |
| 中性/已过 | `#6b7280` | `rgba(156,163,175,0.1)` | `#d1d5db` | `rgba(156,163,175,0.15)` |
| 男性标识 | `white` | `rgba(59,130,246,0.8)` | — | — |
| 女性标识 | `white` | `rgba(236,72,153,0.8)` | — | — |

### 文字色

| 场景 | 亮色 | 暗色 | Tailwind |
|------|------|------|----------|
| 正文 | `gray-800` | `gray-100` | body 默认 |
| 辅助文字 | `gray-500` | `gray-400` | `.text-muted` |
| 标题 | `primary-500` | `primary-500` | `.page-title` |

---

## 字体

| Token | 字体栈 | 用途 |
|-------|--------|------|
| `font-sans` | PingFang SC, Microsoft YaHei, Hiragino Sans GB, -apple-system, sans-serif | 正文 |
| `font-roco` | MIANFEIZITI, PingFang SC, Microsoft YaHei, sans-serif | 标题、品牌文字 |
| 等宽 | JetBrains Mono, monospace | 日期、数字、代码 |

---

## 暗色模式

- 通过 `darkMode: 'class'` 实现，body 添加 `.dark` 类切换
- **所有组件必须同时提供亮色和暗色样式**
- CSS 中使用 `:root.dark` 或 `.dark &`（SCSS）选择器
- 颜色对比度要求：文字与背景至少 4.5:1

---

## 组件规范

### 卡片 (.card)

```css
圆角: rounded-xl (12px)
阴影: shadow-sm → hover:shadow-md
边框: 1px solid surface-light-border / surface-dark-border
内边距: p-3 → sm:p-4 → lg:p-5
hover: translateY(-2px)
```

### 按钮

| 类 | 样式 |
|----|------|
| `.btn` | 基础按钮：rounded-lg, font-medium, active:scale-95 |
| `.btn-primary` | 金色填充：bg-primary-500, text-white, hover:bg-primary-600 |
| `.btn-ghost` | 透明：hover:bg-gray-100 / dark:hover:bg-white/5 |
| `.btn-sm` | 小号按钮 |

### 输入框 (.input)

```css
圆角: rounded-lg
边框: surface-light-border → focus:primary-500
聚焦: ring-2 ring-primary-500/20
暗色: bg-surface-dark-alt, focus:border-primary-400
```

### 标签页/Tab

激活态应使用 **primary 金色系**：

```css
/* 亮色激活 */
background: rgba(214, 159, 35, 0.1)   /* primary-500 的 10% */
border-color: rgba(214, 159, 35, 0.3)
color: #B8860B                          /* primary-600 */

/* 暗色激活 */
background: rgba(255, 202, 40, 0.12)   /* primary-400 的 12% */
border-color: rgba(255, 202, 40, 0.3)
color: #FFCA28                          /* primary-400 */
```

### 状态标签

```css
font-size: 0.65rem
font-weight: 600
padding: 0.15rem 0.5rem
border-radius: 9999px (pill)
border: 1px solid
```

颜色参考上方「语义色」表格。

---

## 交互规范

| 交互 | 效果 |
|------|------|
| 按钮点击 | `active:scale-95` |
| 卡片 hover | `translateY(-2px)` + 阴影增强 |
| 图片卡片 hover | `translateY(-3px)` + 边框变为 primary 色 |
| 过渡时长 | 按钮 150ms，卡片/Tab 200ms，展开 250ms |
| 加载态 | `animate-pulse` |

---

## 图片展示规范

| 类型 | 宽高比 | 说明 |
|------|--------|------|
| 概念图（横版） | 16:9 | 男装/女装概念图 |
| 角色图（竖版） | 9:16 | 时装/印象服装 |
| 精灵头像 | 1:1 (圆形) | 精灵选择器图标 |
| 缩略图 | 1:1 | 精灵列表卡片 |

图片容器统一使用：
```css
border-radius: 12px
overflow: hidden
object-fit: cover
border: 1px solid rgba(0,0,0,0.08) / dark: rgba(255,255,255,0.08)
background: #f3f4f6 / dark: rgba(255,255,255,0.03) /* 占位底色 */
```

---

## 禁止事项

1. ❌ 不要在页面中使用 indigo/紫色 (`#6366f1`) 作为主色，项目主色是金色
2. ❌ 不要硬编码颜色值代替 Tailwind token（如直接写 `color: #D69F23` 而非 `text-primary-500`）
3. ❌ 不要忽略暗色模式适配
4. ❌ 不要在 scoped CSS 中使用与全局 primary 不一致的 fallback 值
5. ❌ 不要使用 `opacity` 降低文字可见度（用明确的颜色值代替）

---

## 正确的 CSS 变量 Fallback

在 scoped CSS 中如需使用 CSS 变量 + fallback，应使用项目实际的 primary 色值：

```css
/* ✅ 正确 */
color: var(--color-primary-500, #D69F23);
background: rgba(214, 159, 35, 0.1);

/* ❌ 错误（indigo 色） */
color: var(--color-primary-500, #6366f1);
background: rgba(99, 102, 241, 0.1);
```

---

## 参考文件

- 颜色定义：`tailwind.config.js`
- 全局样式：`src/styles/main.scss`
- 响应式规范：`RESPONSIVE.md`
