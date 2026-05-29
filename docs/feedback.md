# 用户反馈模块 需求文档

> 模块状态：待开发
> 创建日期：2026-05-30
> 版本：V1.0

---

## 一、功能概述

全局用户反馈入口，贯穿所有用户页面，支持文字 + 图片反馈。管理端可查看、管理反馈内容。

| 模块 | 说明 |
|------|------|
| 用户端 | 全局 FAB 按钮 → 反馈面板（文字 + 图片上传） |
| 后端 | 接收反馈 + 图片无损压缩存储 + IP限流 |
| 管理端 | 反馈列表 + 详情查看 + 状态管理 + 图片预览 + 功能开关 |

---

## 二、文件规划

### 后端（独立维护）

| 文件 | 说明 |
|------|------|
| `app/server/src/routes/feedbacks.js` | 公开提交 API（POST） |
| `app/server/src/routes/admin/feedbacks.js` | 管理端 CRUD API（独立入口） |

### 前端

| 文件 | 说明 |
|------|------|
| `app/client/src/components/FeedbackFAB.vue` | 全局 FAB + 反馈面板组件 |
| `app/client/src/views/admin/AdminFeedbacks.vue` | 管理端反馈列表+详情页 |

### 存储

| 路径 | 说明 |
|------|------|
| `app/server/uploads/feedbacks/YYYY-MM/` | 反馈图片（按月分目录） |

> ⚠️ 反馈图片**不出现**在管理端素材库（`/admin/media`），仅在反馈管理页面内查看。

---

## 三、管理端开关

- `site_settings` 表增加 `feedback_enabled` 键
- 默认值：`'1'`（开启）
- 管理端 Dashboard 或反馈管理页提供开关按钮
- 关闭时：用户端 FAB 按钮隐藏，POST 接口返回 403

---

## 四、用户端设计

### 4.1 FAB 入口

| 设备 | 尺寸 | 位置 | 默认透明度 | hover |
|------|------|------|-----------|-------|
| 手机 (<640px) | 44×44px | right:16px, bottom:16px | 0.6 | 无 |
| 平板 (640-1023px) | 44×44px | right:20px, bottom:20px | 0.6 | 无 |
| PC (≥1024px) | 40×40px | right:24px, bottom:24px | 0.5 | opacity:1 + scale(1.1) |

- 颜色：`bg-primary-500`，图标白色
- 阴影：`shadow-lg`
- z-index: 50
- 避让：精灵列表页有 sticky 分页器时，FAB 上移至 `bottom: 72px`

### 4.2 反馈面板

#### PC（≥1024px）— 右下角浮动卡片

- 宽度：360px 固定
- 最大高度：`max-h-[70vh]`
- 位置：right:24px, bottom:80px
- 圆角：16px（全部）
- 动画：`transform-origin: bottom right`，scale(0.85)→scale(1)，duration 250ms
- 无背景遮罩
- 关闭方式：✕按钮 / 点击面板外 / ESC

#### 平板（640-1023px）— 底部半屏 Sheet

- 宽度：100%，max-w: 560px 居中
- 最大高度：75vh
- 顶部圆角：20px
- 拖拽指示条：`w-10 h-1 rounded-full bg-gray-300`
- 背景遮罩：`bg-black/40`，点击关闭
- 动画：translateY(100%)→translateY(0)，duration 300ms
- 支持下拉手势关闭（阈值 100px）

#### 手机（<640px）— 近全屏 Sheet

- 宽度：100%
- 最大高度：85vh
- 顶部圆角：16px
- 拖拽指示条：同平板
- 背景遮罩：`bg-black/50`
- 键盘适配：`visualViewport` API 监听键盘弹出
- 支持下拉手势关闭

### 4.3 面板内容

```
┌─────────────────────────────────────┐
│  反馈建议                        ✕  │
├─────────────────────────────────────┤
│                                     │
│  反馈类型                            │
│  [🐛 Bug] [💡 建议] [📝 其他]      │
│                                     │
│  反馈内容 *（10-500字）              │
│  ┌─────────────────────────────────┐│
│  │  textarea                       ││
│  │                       12/500    ││
│  └─────────────────────────────────┘│
│                                     │
│  截图（选填，最多2张）               │
│  [📷添加] [缩略图1 ✕] [缩略图2 ✕] │
│  单张≤3MB，支持 jpg/png/webp        │
│                                     │
│  联系方式（选填，≤100字）            │
│  ┌─────────────────────────────────┐│
│  │  QQ/邮箱                        ││
│  └─────────────────────────────────┘│
│                                     │
│  [        提交反馈        ]         │
│                                     │
│  📍 当前页面标题                     │
└─────────────────────────────────────┘
```

### 4.4 提交成功

- 面板内容替换为 ✅ + "感谢你的反馈！"
- 1.5秒后自动关闭
- 带 scale 弹入动画

---

## 五、后端设计

### 5.1 API

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/feedback-enabled` | 查询功能是否开启 | 无 |
| POST | `/api/feedbacks` | 提交反馈（FormData） | 无（公开） |
| GET | `/api/admin/feedbacks` | 列表（分页+筛选） | JWT |
| GET | `/api/admin/feedbacks/:id` | 详情 | JWT |
| PATCH | `/api/admin/feedbacks/:id` | 更新状态/备注 | JWT |
| DELETE | `/api/admin/feedbacks/:id` | 删除（含清理图片） | JWT |

### 5.2 数据库表

```sql
CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'other',        -- 'bug' | 'suggestion' | 'other'
  content TEXT NOT NULL,                      -- 反馈内容（10-500字）
  contact TEXT DEFAULT '',                    -- 联系方式（选填）
  images TEXT DEFAULT '[]',                   -- JSON数组，存储相对路径
  page_url TEXT DEFAULT '',                   -- 来源页面路径
  page_title TEXT DEFAULT '',                 -- 页面标题
  device_type TEXT DEFAULT '',                -- 'mobile' | 'tablet' | 'desktop'
  screen_size TEXT DEFAULT '',                -- '375×812'
  user_agent TEXT DEFAULT '',                 -- UA
  ip TEXT DEFAULT '',                         -- 客户端IP
  dark_mode INTEGER DEFAULT 0,               -- 是否暗色模式
  status TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'read' | 'resolved' | 'ignored'
  admin_note TEXT DEFAULT '',                 -- 管理员备注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);
```

### 5.3 图片处理

**无损压缩策略（sharp）：**

| 参数 | 值 | 说明 |
|------|-----|------|
| 格式 | WebP | 统一输出 |
| 压缩模式 | **lossless: true** | 无损压缩 |
| 最大尺寸 | 1920×1920px | 超出等比缩放（fit: inside） |
| withoutEnlargement | true | 小图不放大 |

```javascript
await sharp(inputPath)
  .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
  .webp({ lossless: true })
  .toFile(outputPath)
```

**文件命名：**
```
fb_{feedbackId}_{index}_{random4hex}.webp
// 例：fb_12_0_a3f2.webp
```

**目录结构：**
```
app/server/uploads/feedbacks/
├── 2026-05/
│   ├── fb_1_0_a3f2.webp
│   └── fb_1_1_b7c9.webp
└── 2026-06/
    └── ...
```

### 5.4 限流与安全

**前端：**
- localStorage 记录提交时间戳，5分钟冷却

**后端：**
- IP 限流：同 IP 1小时内最多 10 次
- 文件校验：前端 accept + 后端 magic bytes 双重校验
- 文件名消毒：不使用原始文件名，统一重命名
- 大小限制：multer limits: 单文件 3MB，总计 6MB，最多 2 文件
- XSS 防护：content/contact 入库前 HTML 转义
- 功能关闭时：POST 返回 `403 { error: 'Feedback is disabled' }`

### 5.5 自动采集字段

提交时前端自动附带（用户无感）：

```javascript
{
  page_url: location.pathname,
  page_title: document.title,
  device_type: getDeviceType(),  // 'mobile' | 'tablet' | 'desktop'
  screen_size: `${innerWidth}×${innerHeight}`,
  user_agent: navigator.userAgent,
  dark_mode: isDark ? '1' : '0'
}
```

---

## 六、管理端设计

### 6.1 入口

- 路由：`/admin/feedbacks`
- 侧边栏/导航：需在 App.vue 桌面+移动+AdminDashboard 三处添加入口
- Dashboard 统计卡片：显示待处理数量 + 本周新增

### 6.2 功能开关

- 页面顶部显示开关按钮（Switch 组件）
- 开启/关闭时调用 `PATCH /api/admin/settings` 更新 `feedback_enabled`
- 关闭状态下列表仍可查看历史反馈

### 6.3 列表页

- Tab 筛选：全部 / 待处理 / 已读 / 已解决 / 已忽略
- 类型筛选：全部 / Bug / 建议 / 其他
- 排序：最新优先（默认）
- 分页：每页 10 条
- 列表项显示：类型图标 + 状态标签 + 时间 + 内容摘要 + 设备 + 图片数量

### 6.4 详情/操作

- 点击列表项展开详情（行内展开，非跳转）
- 详情内容：完整反馈文字 + 图片预览（点击放大） + 环境信息 + 联系方式
- 操作：更新状态 / 添加备注 / 删除（二次确认，同步删除图片文件）

### 6.5 图片预览

- 列表中显示 📷 标记
- 详情中 120×120 缩略图
- 点击使用 `ImagePreview` 组件放大查看
- **图片不出现在 `/admin/media` 素材库**

---

## 七、三端对比总览

| 特性 | 手机 (<640px) | 平板 (640-1023px) | PC (≥1024px) |
|------|---------------|-------------------|--------------|
| FAB 尺寸 | 44×44px | 44×44px | 40×40px |
| FAB 位置 | right:16px, bottom:16px | right:20px, bottom:20px | right:24px, bottom:24px |
| FAB 默认透明度 | 0.6 | 0.6 | 0.5 |
| FAB hover | 无 | 无 | opacity:1 + scale(1.1) |
| 面板形式 | Bottom Sheet (近全屏) | Bottom Sheet (半屏) | 右下角浮动卡片 |
| 面板宽度 | 100% | 100%, max 560px | 360px |
| 面板最大高度 | 85vh | 75vh | 70vh |
| 面板圆角 | 顶部 16px | 顶部 20px | 全部 16px |
| 打开动画 | 底部滑入 | 底部滑入 | 缩放弹出 |
| 关闭方式 | 下拉/点遮罩 | 下拉/点遮罩/✕ | ✕/点外部/ESC |
| 背景遮罩 | bg-black/50 | bg-black/40 | 无 |
| 拖拽指示条 | ✅ | ✅ | ❌ |
| textarea 高度 | 100px | 120px | 120px |
| 键盘适配 | ✅ | ✅ | ❌ |

---

## 八、存储空间估算

| 指标 | 估算 |
|------|------|
| 每张无损 WebP（1920px内） | ~200-500KB |
| 每条反馈最多 | 2张 ≈ 1MB |
| 假设每天 5 条反馈 | ~5MB/天 |
| 每月 | ~150MB |
| 每年 | ~1.8GB |
| 结论 | 可控，必要时可加定期清理 |

---

## 九、依赖

| 包 | 用途 | 备注 |
|----|------|------|
| `sharp` | 图片无损压缩 | 需 npm install |
| `multer` | 文件上传中间件 | 需确认是否已安装 |

---

## 十、暗色模式适配

| 元素 | 亮色 | 暗色 |
|------|------|------|
| FAB 背景 | bg-primary-500 | bg-primary-500 |
| 面板背景 | bg-white | bg-surface-dark-card |
| 面板边框 | border-gray-200 | border-surface-dark-border |
| 遮罩 | bg-black/40 | bg-black/60 |
| 类型按钮选中 | bg-primary-100 border-primary-400 | bg-primary-500/20 border-primary-400 |

---

## 十一、后续可选扩展（暂不实现）

| 功能 | 说明 |
|------|------|
| 邮件通知 | 新反馈时通知管理员 |
| 反馈回复 | 管理员回复用户 |
| 自动归档 | 30天前已解决反馈归档 |
| 导出 CSV | 批量导出 |
