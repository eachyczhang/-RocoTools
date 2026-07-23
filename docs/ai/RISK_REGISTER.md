# RocoTools 风险登记

> 最近核验：2026-07-23
> 风险状态：`open`、`mitigated`、`accepted`、`not-applicable`、`needs-verification`

## 高风险

| ID | 风险 | 状态 | 当前证据 | 修复/验证要求 |
|---|---|---|---|---|
| H-01 | 管理认证 fail-open | open | `authAdmin.js` 和 `admin/index.js` 含默认密码/JWT secret | 生产缺失或弱凭据时拒绝启动；密码哈希；登录限速和审计 |
| H-02 | 公告存储型 XSS | open | Home、Season、AdminSeasons 自制 Markdown 后直接 `v-html` | 成熟解析器 + DOMPurify/白名单 + URL 协议限制 + CSP |
| H-03 | 反馈附件公开 | open | `/uploads/feedbacks/` 被 Express、Nginx 和 PWA 公开缓存 | 私有目录 + JWT 下载接口 + `private,no-store` + CDN 排除 |
| H-04 | 数据库恢复直接覆盖活动库 | open | `backup.js` 使用 `copyFileSync` 覆盖 `DB_PATH` | 完整性检查、快照、连接协调、原子替换、失败回滚和冒烟测试 |
| H-05 | 上传相关依赖暴露 | needs-verification | 锁文件含 Multer 2.1.1、Sharp 0.34.5、XLSX 0.18.5 | 经授权运行 registry 审计；升级或替换；CI 安全检查 |

## 中风险

| ID | 风险 | 状态 | 当前证据 | 修复/验证要求 |
|---|---|---|---|---|
| M-01 | 反馈限流可绕过 | open | 直接读取 `X-Forwarded-For`；内存 Map；PM2 双实例 | 受限 `trust proxy`、`req.ip`、Nginx/共享限流 |
| M-02 | HTTP 边界不完整 | open | 默认 `cors()`；暴露 `X-Powered-By`；无仓库内 CSP/Permissions-Policy | 收紧 CORS、关闭指纹、增加策略头 |
| M-03 | 上传校验不统一 | open | 管理上传仍含 MIME 依赖和先落原始文件路径 | 实际解码、像素限制、去元数据、重编码、原子落盘 |
| M-04 | 生产配置漂移 | needs-verification | 线上有 HSTS；仓库 `nginx.prod.conf` 未配置 HSTS | 获取生产配置差异，回写可公开模板 |
| M-05 | Git hooks 未启用 | open | hook 文件存在但 `core.hooksPath` 为空 | 安装脚本 + CI；不能只依赖本机 hook |
| M-06 | 同步/部署文档漂移 | open | `sync_db.js` 默认不导入；`deploy.sh` 不运行 sync；文档仍称完整同步 | 更新 README、SCRIPTS、DEPLOY 和旧 AI memory |

## 双库历史风险

当前仓库没有双库代码，下列风险标记为 `not-applicable`，但重新设计双库时必须恢复为发布阻断检查：

- 线上库和编辑库指向同一个可写文件。
- 发布接口忽略当前编辑指针。
- 备份被直接作为编辑库或被原地迁移。
- 活动指针引用的数据库可被删除。
- 缺少完整性、schema、数据量、原子指针、回滚和 API 冒烟检查。

## 风险处理规则

- 不因旧报告写着“已修复”就关闭风险。
- 每次关闭风险记录涉及文件、验证命令、结果、日期和剩余风险。
- 未经授权不通过生产操作验证风险。
- 依赖 advisory 会随时间变化，具体数量必须记录审计日期与数据源。
