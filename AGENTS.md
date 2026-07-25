# RocoTools Agent Instructions

本文件定义 RocoTools 仓库级 Agent。所有 Codex 会话在分析、修改、审查或交接本工程时均须遵守。

## 启动

只有以下情况执行完整启动：

- 新任务、新会话、切换电脑、切换分支或恢复中断任务；
- 当前对话没有可信的仓库上下文，或 Git/外部状态可能已经变化；
- 部署、数据库、认证、上传、备份、发布、正式审查或交接等高风险任务；
- 用户明确要求重新核验或完整审查。

完整启动时，第一条用户可见进度包含：

> RocoTools 启动指向：`docs/ai/START_HERE.md` → `PROJECT_CONTEXT.md` → `STATUS.md` → `RISK_REGISTER.md` → `HANDOFF.md`。当前先验证上下文，尚未修改代码。

然后完整阅读 `docs/ai/START_HERE.md`、运行 `scripts/verify-context.ps1`，再按任务范围读取文档、代码和 Git。

## 会话快速通道

同一对话、同一分支、同一工作区和同一任务范围内，默认复用最近一次已验证上下文：

- 连续追问、解释、命令咨询、状态说明和不依赖新事实的问答直接回答，不重复启动话术、上下文文档、`verify-context.ps1`、Git 状态或交接文件更新。
- 小范围本地代码、脚本、UI 或文档修改只读取直接相关文件，完成后运行一次与改动直接相关的检查；不在每个中间步骤重复 Git diff、全量构建或上下文检查。
- 只有发现分支、HEAD、工作区、任务范围或外部状态发生变化时，才补充必要核验。
- 用户要求停止繁琐流程、减少工具调用或快速处理时，优先使用本节；高风险边界不因此降低。
- 不为“证明没有变化”生成临时文件、重复报告或更新 AI 状态文档。

## 事实优先级

1. 当前代码、Git 历史、实际配置和可复现检查。
2. `docs/ai/` 中带证据与验证日期的工程上下文。
3. 正式 README、架构、数据、管理、部署和游戏规则文档。
4. `.ai-memory.md`、`.dev/skills/` 和历史 CodeBuddy 记录，仅作为检索线索。

发现冲突时，以当前可验证事实为准，并在任务范围允许时更新 `docs/ai/`。

## 开发边界

- 保留用户改动，只修改任务必要文件。
- 对用户已明确提出、且仅影响本地开发工具、离线处理脚本、测试夹具或文档的安全改动，若不触发外部写入、线上/生产操作、数据库写入或迁移、数据删除、密钥操作、依赖安装或后台常驻进程，可直接实施并验证，不必为同一范围再次征求确认；一旦范围扩大或越过上述边界，立即停止并请求授权。
- 未经明确授权，不部署、不推送、不重启生产服务、不迁移或恢复数据库、不删除数据、不轮换密钥。
- 数据变更必须检查 `app/server/src/db/schema.sql`、迁移/导入兼容、默认值、索引、外键、备份与回滚。
- 新管理页面必须核对路由、桌面入口、移动入口、Dashboard、前端 API 和后端路由。
- 认证、公告 HTML、上传、反馈附件、备份、数据库发布默认按高风险处理。
- 优先执行只读检查、语法检查和临时输出构建；不为验证覆盖运行数据。
- 不把密码、Token、生产数据库、用户反馈或隐私数据写入 Git、日志、示例或 AI 文档。

## 工作范围与资源约束

- 仅在当前项目根目录内工作；禁止搜索项目目录之外的路径，不扫描用户目录、Documents、其他磁盘或项目父级目录。
- 优先检查用户明确指定的文件和目录；不要无条件递归枚举整个项目。
- 建立上下文时先读取入口文件、配置文件和少量相关源码，再根据明确引用关系逐步扩大范围。
- 文本搜索必须限定到具体文件或相关目录，并排除 `node_modules`、`.git`、`dist`、`build`、`.next`、`coverage`、缓存、日志、上传文件和大型数据目录。
- 读取大文件时先查看相关片段；只有规则明确要求完整阅读或任务确有必要时才读取全文。
- 不自动启动开发服务器，不自动执行全量构建、全量测试、依赖安装或后台常驻进程。
- 验证优先使用单文件、单模块或与改动直接相关的检查。
- 如确需扩大扫描范围或执行可能明显占用 CPU、内存或磁盘的操作，必须先说明原因、预计范围和资源影响，并取得用户确认。
- 完成工作后停止由 Agent 启动的临时服务和后台进程。

## 状态与交接

功能状态只使用 `deployed`、`committed`、`working-tree`、`planned`、`deprecated`。

只有产生需要跨任务恢复的重要代码状态、数据结构、风险判断、发布事实或明确交接点时，结束前更新：

- `docs/ai/HANDOFF.md`：当前续接点。
- `docs/ai/STATUS.md`：功能状态变化。
- `docs/ai/RISK_REGISTER.md`：风险、证据、验证与剩余风险变化。

普通问答、连续追问、轻微文案/格式修正、临时诊断和未改变工程事实的小改动不更新上述文件。

最终答复必须包含以下明确指向，并说明这些文件本次是否已更新：

> RocoTools 结束指向：`docs/ai/HANDOFF.md`（下一步）→ `docs/ai/STATUS.md`（功能状态）→ `docs/ai/RISK_REGISTER.md`（风险与剩余事项）。

## 验证与完成定义

- 仅在完整开发、审查、发布或交接任务中报告当前分支、基准 commit 和工作区状态；连续追问不重复报告。
- 不为每轮对话执行 Git commit、push、全量 diff 或全仓状态扫描；用户未要求时不提交代码。
- 运行与风险相称的测试、构建或检查，明确未验证项。
- 不把“代码存在”写成“已经上线”；`deployed` 必须附线上或生产证据。
- 不把 stash、未提交文件或本机 `.codex` 当成跨电脑交接。
- 未完成工作必须提交并推送到功能分支后，才能保证另一台电脑可恢复。

## File encoding safety

- Treat all source, Vue, JavaScript, JSON, Markdown, and documentation files as UTF-8.
- Never use PowerShell `Get-Content`/`Set-Content` for source rewrites without explicitly preserving UTF-8; avoid the Windows PowerShell default encoding.
- Prefer `apply_patch` or a byte-preserving editor. If a scripted rewrite is required, use UTF-8 without BOM and verify the resulting bytes.
- Do not convert Chinese text through the system code page. After editing, run the relevant parser/compiler and inspect for mojibake (`鍏`, `瀹`, `鈧`, `�`, or unexpected `?`).
- If encoding corruption is detected, stop feature work, preserve the original file if available, and repair encoding before continuing.

- Dynamic staging JSON (
emote.json, local.json, diff.json) must be validated as UTF-8 before review. If mojibake or replacement ? appears in data values, do not auto-import; regenerate the batch from clean source and keep the corrupt batch out of review.

## User-facing text safety

- 管理端和用户可见页面默认使用简体中文；除固定技术名词（如 BWIKI、UID、Diff）外，不引入英文占位文案。
- 修改 Vue、JavaScript 或服务端返回文案后，必须同时检查乱码字符、意外问号、丢失的模板插值和残留英文 UI 文案。
- “语法检查或构建通过”不能替代文案与条件逻辑校验；涉及中文正则、URL 路径和图片分类时，必须补充针对实际中文关键词的定向测试。
- Windows 下禁止让源码经过控制台代码页转换；补丁助手不可用时，只能使用显式 UTF-8 无 BOM 的字节安全写入，并在写入后立即验证。

## Shell command convention

- Use Bash syntax for project commands, scripts, environment variables, paths, pipelines, and examples.
- Do not provide PowerShell equivalents unless the user explicitly asks for Windows PowerShell.
- When a command must write UTF-8 files, use Bash/Python/Node with explicit UTF-8 handling; never rely on shell default encoding.
