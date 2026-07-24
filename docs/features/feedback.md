# 用户反馈模块

> 模块状态：deployed
> 首次实现：`b5234ca`
> 最近核验：2026-07-24

## 功能概览

用户反馈已在用户端、Express API、SQLite 和管理端完整接入：

- 用户端全局 `FeedbackFAB` 提交 Bug、建议或其他反馈；
- 支持 10～500 字内容、可选联系方式和最多 2 张图片；
- 管理端 `/admin/feedbacks` 支持列表、筛选、详情、状态、备注、删除、功能开关和冷却时间；
- Dashboard、桌面导航和移动导航均有反馈管理入口；
- 公开功能状态接口已在线返回 HTTP 200。

## 当前实现位置

| 层 | 文件/位置 | 职责 |
|---|---|---|
| 用户端 | `app/client/src/components/FeedbackFAB.vue` | 全局 FAB、表单、上传、冷却提示 |
| 用户端挂载 | `app/client/src/App.vue` | 全站挂载反馈组件 |
| 管理端 | `app/client/src/views/admin/AdminFeedbacks.vue` | 列表、详情、状态、备注、删除和配置 |
| 前端 API | `app/client/src/api/admin.js` | 管理端反馈和设置接口封装 |
| 公开路由 | `app/server/src/routes/feedbacks.js` | 状态查询、公开提交、图片处理和内存限流 |
| 管理路由 | `app/server/src/routes/admin/feedbacks.js` | JWT 保护的管理接口 |
| 数据库 | `app/server/src/db/schema.sql` | `feedbacks` 与 `site_settings` 结构 |
| 附件 | `data/uploads/feedbacks/YYYY-MM/` | 运行时反馈图片，不进入 Git |

## API

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/feedbacks/enabled` | 返回功能开关和冷却秒数 | 无 |
| POST | `/api/feedbacks` | 提交反馈及图片 | 无 |
| GET | `/api/admin/feedbacks` | 分页列表和筛选 | JWT |
| GET | `/api/admin/feedbacks/:id` | 查看详情 | JWT |
| PATCH | `/api/admin/feedbacks/:id` | 更新状态或管理员备注 | JWT |
| DELETE | `/api/admin/feedbacks/:id` | 删除反馈并清理附件 | JWT |
| GET/PATCH | `/api/admin/settings` | 读取或更新反馈开关、冷却配置 | JWT |

配置键：

- `feedback_enabled`：`1` 开启，`0` 关闭；未配置时当前实现默认开启。
- `feedback_cooldown`：用户端提交冷却秒数，默认 60，可配置为 0。

## 数据与附件

`feedbacks` 表记录类型、内容、联系方式、附件 JSON、页面信息、设备信息、IP、暗色模式、状态、管理员备注和时间戳。

图片流程：

1. Multer 接收到系统临时目录，限制单文件 3 MB、最多 2 个文件，并按客户端 MIME 做第一层筛选。
2. Sharp 实际解码、限制在 1920×1920 内并重新编码为 lossless WebP。
3. 文件保存到 `data/uploads/feedbacks/YYYY-MM/`，使用时间戳和随机后缀命名。
4. 临时文件在成功或失败路径清理。

反馈图片不属于管理端素材库，也不得提交 Git。

## 三端交互

| 设备 | 入口与面板 |
|---|---|
| 手机 | 右下角 FAB；近全屏 bottom sheet；支持下拉和遮罩关闭 |
| 平板 | 右下角 FAB；居中 bottom sheet |
| 桌面 | 右下角 FAB；浮动卡片；支持点击外部、ESC 和关闭按钮 |

提交成功后显示确认状态并自动关闭。前端记录本地冷却时间，后端同时执行每 IP 每小时最多 10 次的内存限流。

## 已知风险

这些风险是当前实现事实，不因模块已经上线而视为已解决：

- 反馈附件位于公开 `/uploads/` 静态边界，知道 URL 即可访问，并可能被 CDN/PWA 缓存（H-03）。
- 客户端可控的 `X-Forwarded-For` 被直接用于 IP 判断，且 PM2 双实例各自维护内存计数，限流可绕过或放大（M-01）。
- Multer 的第一层过滤依赖 MIME；Sharp 重编码降低了伪装图片风险，但依赖漏洞和资源消耗仍需统一审计（H-05/M-03）。
- 反馈包含联系方式、页面和设备信息，生产数据不得写入 Git、日志示例或 AI 文档。

风险状态与后续整改统一以 `docs/ai/RISK_REGISTER.md` 为准。

## 验证依据

- Git 历史：`b5234ca` 首次实现，后续提交补充冷却、中文页面名和响应式体验。
- 当前代码：公开路由挂载于 `/api/feedbacks`；管理路由统一经过管理员 JWT 中间件。
- 线上证据：2026-07-23 `/api/feedbacks/enabled` 返回 HTTP 200。
