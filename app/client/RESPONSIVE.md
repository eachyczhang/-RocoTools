# 响应式适配规范

## 断点体系

使用 Tailwind CSS 默认断点，**Mobile-first** 写法：

| 断点 | 宽度 | 设备 | 前缀 |
|------|------|------|------|
| 默认 | < 640px | 手机竖屏 | 无前缀 |
| `sm:` | ≥ 640px | 大屏手机 / 小平板 | `sm:` |
| `md:` | ≥ 768px | 平板竖屏 | `md:` |
| `lg:` | ≥ 1024px | 平板横屏 / 小桌面 | `lg:` |
| `xl:` | ≥ 1280px | 桌面 | `xl:` |
| `2xl:` | ≥ 1536px | 大桌面 | `2xl:` |

### 核心使用原则

- **手机 → 平板过渡**：用 `sm:` 断点（640px）
- **平板 → 桌面过渡**：用 `lg:` 断点（1024px）
- `md:` 主要用于导航栏切换（汉堡 vs 水平）和网格列数
- 所有样式先写手机版，再逐级覆盖

---

## 全局字号

通过 `main.scss` body 动态设置：

| 设备 | 基础字号 |
|------|----------|
| 手机 (<640px) | 14px |
| 平板 (640-1023px) | 15px |
| 桌面 (≥1024px) | 16px |

---

## 导航栏

| 属性 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| 高度 | `h-14` | `sm:h-15` | `lg:h-16` |
| 内边距 | `px-4` | `sm:px-6` | `lg:px-8` |
| 导航方式 | 汉堡菜单 | 水平导航(md:) | 同左 |
| Logo 字号 | `text-xl` | `sm:text-xl` | `lg:text-2xl` |

导航按钮在 `md:` (768px) 切换为水平模式。

---

## 内容区

| 属性 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| 内边距 | `px-3 py-4` | `sm:px-5 sm:py-6` | `lg:px-8 lg:py-8` |
| 最大宽度 | `max-w-screen-2xl` | 同 | 同 |

---

## 页面标题 (.page-title)

```
text-xl sm:text-2xl lg:text-3xl
mb-4 sm:mb-5 lg:mb-6
```

---

## 卡片 (.card)

| 属性 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| 内边距 | `p-3` | `sm:p-4` | `lg:p-5` |
| 圆角 | `rounded-xl` | 同 | 同 |

---

## 按钮

| 类型 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| .btn | `px-3 py-1.5 text-sm` | `sm:px-4 sm:py-2` | `lg:px-5 lg:py-2.5 lg:text-base` |
| .btn-sm | `px-2 py-1 text-xs` | `sm:px-2.5 sm:py-1` | `lg:px-3 lg:py-1.5 lg:text-sm` |
| .btn-icon | `w-9 h-9` | `sm:w-10 sm:h-10` | 同 |

---

## 输入控件

| 属性 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| padding | `px-3 py-2` | `sm:px-3.5 sm:py-2` | `lg:px-4 lg:py-2.5` |
| 字号 | `text-sm` | `sm:text-sm` | `lg:text-base` |
| 搜索框宽度 | `w-full` | `sm:w-52` | `lg:w-64` |

---

## 图标尺寸

| 场景 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| 属性筛选图标 | `w-6 h-6` | `sm:w-7 sm:h-7` | `lg:w-8 lg:h-8` |
| 属性筛选按钮 | `w-9 h-9` | `sm:w-10 sm:h-10` | `lg:w-11 lg:h-11` |
| PetCard 立绘 | `w-20 h-20` | `sm:w-24 sm:h-24` | `lg:w-28 lg:h-28` |
| PetDetail 立绘 | `w-36 h-36` | `sm:w-44 sm:h-44` | `lg:w-48 lg:h-48` |
| 技能/属性标签 | `w-5 h-5` | `sm:w-6 sm:h-6` | 同 |

---

## 网格系统

### 精灵列表（PetCard）
```
grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6
```

### 精灵横向卡片（蛋组/学习者等）
```
grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
```

### 打击面格子
```
grid-cols-2 sm:grid-cols-4
```

### 数据概览
```
grid-cols-2 sm:grid-cols-4
```

### 属性选择网格
```
grid-cols-4 sm:grid-cols-6 lg:grid-cols-9
```

---

## 间距规范

| 场景 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| 卡片间 gap | `gap-3` | `sm:gap-4` | `lg:gap-5` |
| 区块间距 (.section-gap) | `mb-6` | `sm:mb-8` | `lg:mb-10` |
| 筛选栏底部 (.filter-bar) | `mb-5` | `sm:mb-6` | `lg:mb-8` |

---

## 表格处理

- **桌面端 (lg:)**：使用 `<table>` 完整展示
- **平板/手机 (<lg)**：改为卡片式布局
  - 技能列表：`hidden lg:block` 表格 + `lg:hidden` 卡片
  - 克制表：使用 `.scroll-x-mobile` 横滚

---

## 布局切换断点

| 组件 | 垂直→水平 |
|------|-----------|
| PetDetail 信息区 | `sm:` (640px) |
| SkillDetail 技能卡片 | `sm:` (640px) |
| 导航栏 | `md:` (768px) |
| 技能列表（表格/卡片） | `lg:` (1024px) |

---

## 特殊处理

### 雷达图 (StatsRadar)
通过 `window.innerWidth` 监听动态设置 size：
- 手机：160px
- 平板：180px
- 桌面：200px

### 横滚容器
```scss
.scroll-x-mobile {
  @apply overflow-x-auto -mx-3 sm:-mx-4 lg:mx-0;
  @apply rounded-none lg:rounded-xl;
}
```

### 触摸优化
```scss
body {
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
}
```

### 滚动条（仅桌面端）
通过 `@media (min-width: 1024px)` 自定义 webkit 滚动条样式。

---

## 命名约定

- 所有响应式类使用 **mobile-first** 写法
- 渐进增强：`text-sm sm:text-base lg:text-lg`
- 隐藏/显示：`hidden lg:block`（桌面可见）、`lg:hidden`（仅手机/平板可见）
- 优先使用全局组件类（`.card`、`.btn`、`.input`、`.page-title`）
- 只在组件类无法满足时才写内联断点样式

---

## 相关文档

- 视觉设计规范（色彩/组件/暗色模式）：[DESIGN.md](./DESIGN.md)
