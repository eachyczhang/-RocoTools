# RocoTools 风险登记

> 最近核验：2026-07-26
> 风险状态：`open`、`mitigated`、`accepted`、`not-applicable`、`needs-verification`

## 高风险

| ID | 风险 | 状态 | 当前证据 | 修复/验证要求 |
|---|---|---|---|---|
| H-01 | 管理认证 fail-open | open | `authAdmin.js` 和 `admin/index.js` 含默认密码/JWT secret | 生产缺失或弱凭据时拒绝启动；密码哈希；登录限速和审计 |
| H-02 | 公告存储型 XSS | open | Home、Season、AdminSeasons 自制 Markdown 后直接 `v-html` | 成熟解析器 + DOMPurify/白名单 + URL 协议限制 + CSP |
| H-03 | 反馈附件公开 | open | `/uploads/feedbacks/` 被 Express、Nginx 和 PWA 公开缓存 | 私有目录 + JWT 下载接口 + `private,no-store` + CDN 排除 |
| H-04 | 数据库恢复直接覆盖活动库 | open | `backup.js` 使用 `copyFileSync` 覆盖 `DB_PATH` | 完整性检查、快照、连接协调、原子替换、失败回滚和冒烟测试 |
| H-05 | 上传相关依赖暴露 | needs-verification | 2026-07-24 安装审计摘要：前端 1 中危/4 高危，后端 1 低危/1 中危/4 高危；尚未展开 advisory 与可利用性 | 经授权审阅 `npm audit` 详情后分类处置；不得直接使用破坏性 `--force`；补充 CI 安全检查 |

## 中风险

| ID | 风险 | 状态 | 当前证据 | 修复/验证要求 |
|---|---|---|---|---|
| M-01 | 反馈限流可绕过 | open | 直接读取 `X-Forwarded-For`；内存 Map；PM2 双实例 | 受限 `trust proxy`、`req.ip`、Nginx/共享限流 |
| M-02 | HTTP 边界不完整 | open | 默认 `cors()`；暴露 `X-Powered-By`；无仓库内 CSP/Permissions-Policy | 收紧 CORS、关闭指纹、增加策略头 |
| M-03 | 上传校验不统一 | open | 管理上传仍含 MIME 依赖和先落原始文件路径 | 实际解码、像素限制、去元数据、重编码、原子落盘 |
| M-04 | 生产配置漂移 | needs-verification | 线上有 HSTS；仓库模板未配置；服务器脚本检查 `nginx/`，但模板位于仓库根目录 | 获取生产配置差异；校准脚本监控路径后回写可公开模板 |
| M-05 | Git hooks 未启用 | open | hook 文件存在但 `core.hooksPath` 为空 | 安装脚本 + CI；不能只依赖本机 hook |
| M-06 | 同步/部署文档漂移 | mitigated | README、SCRIPTS、app/scripts/crawler README、AI memory、开发 Skill 与 `docs/operations/DEPLOY.md` 已按当前代码和服务器脚本副本校准；`docs/operations/BWIKI_VERSION_UPDATE.md` 固定了分版本抓取、审核、验包、服务器导入、图片发布、回拉和清理边界 | 剩余生产 SHA、PM2 与真实 Nginx 配置归 M-04/外部核验；BWIKI SOP 的服务器命令尚未在生产执行验证，功能变更后继续维护文档 |
| M-07 | 人工选择的 BWIKI JSON 字段误覆盖、错配实体或不受控下载图片 | mitigated | 暂存导入器以规范化名称匹配 S2/S3；名称作为匹配键，UID、精灵编号和 BWIKI source_id 只作为身份元数据；无匹配/歧义时阻断未确认导入；精灵仅允许 `pets` 主表 11 个非身份基础字段，`version` 不参与 Diff；导入时只有显式 --version 才覆盖 skills/pets.version；支持从本地 UTF-8 HTML/API JSON 离线解析，输入文件不复制进暂存发布包，清单只记录文件名；在线请求使用稳定项目标识、Session 复用、串行节流和有限退避，403/429/567 或验证页立即熔断；技能、特性、精灵使用独立 `/admin/wiki-review` 分 Tab 审核，固定技能 → 特性 → 精灵顺序且前后端共同阻止跳阶段，并在实体内按“有差异 / 已确认 / 无差异”分类复核；审核列表按实体单条分页，未选实体不加载完整候选，审核 POST 不回传列表；初次抓取不下载图片，只有明确确认 `unmatched` 新技能、新特性或新精灵后才允许 HTTPS BWIKI/CDN 域名下载，拒绝 SVG，限制单文件 5MB，并记录 SHA-256；另有 `manual_edit`、全审核完成门禁、仅确认差异打包、载荷 SHA-256 验证、dry-run、SQLite backup、单事务与完整性检查 | 限速和请求头只能降低触发限制的概率，不能绕过或解除已有封禁；离线 HTML 的来源、抓取时间、完整性和真实性仍需人工确认；缺少详情文件时特性描述和素材 URL 可能不完整；名称变更、同名实体、新增实体仍需人工确认；原始 HTML 不得进入 Git；发布包仍需人工上传；数据库执行 `--apply` 前必须审阅审核决定和 dry-run |
  - 2026-07-25 补充：精灵全量基线只请求一次筛选页；`ability_desc` 等来源页未提供字段不参与基础 Diff；已匹配精灵只有接受基础字段后才下载筛选页已有素材，详情抓取限定当前 UID 单页。剩余风险是筛选页头像不等于完整立绘集合，完整图片仍需在单精灵流程人工确认。
  - 2026-07-25 补充：精灵匹配改为完整 UID 优先；远程 UID 存在但本地未命中时仅允许唯一同名记录兼容旧 UID，UID 与名称都不同则新增形态，不再用唯一同编号旧精灵兜底。剩余风险是远程 UID 或名称同时错误时可能误判新增，确认前仍需人工核对形态和基础数值。
  - 2026-07-25 补充：详情页的标签图标曾被计入素材序列，导致页面控件进入本体、普通立绘误入异色；现按正式文件命名分类，并在 URL 解码后拒绝 `界面_宠物_*`、`Icon_异色_*` 控件，隔离明确错槽素材。剩余风险是无标签、无可识别文件名的图片只能安全落入首张本体或保持未分类，仍需审核预览人工确认。
  - 2026-07-25 补充：部分 BWIKI 详情模板不输出 .allImgTab，补图流程已回退扫描正文并按文件名/标签分类；无法识别的图片仍保持未分类，不会自动占用异色等正式槽位。
  - 2026-07-25 补充：基础字段无差异但缺正式图片的已匹配精灵可单独确认补图；后端要求身份可安全比较且无允许字段差异，只下载缺失槽位，并用 `approved-reference` 打包素材，不启用数据库字段导入。剩余风险是详情页未提供或无法可靠分类的槽位仍会保持缺失，需要人工复核而不能自动猜测。
  - 2026-07-25 补充：无差异 Tab 可主动触发详情补图并转入已确认；import version 只在明确提供版本号时覆盖 skills/pets.version，未提供时不改变原值。
  - 2026-07-25 补充：单形态升级多形态时会产生 `pet_uid` 迁移（例如 `pet_031 → pet_031_1`），审核页要求独立确认，导入器在事务中同步外键、形态映射和受支持的 JSON 引用；剩余风险是未纳入扫描范围的外部文本/缓存仍需上线前人工核对。
  - 2026-07-25 补充：审核选择器只返回候选名称、编号、UID 和页码，详情仍按单页加载；剩余风险是暂存目录候选数量很大时索引读取仍会扫描元数据缓存，但不会返回完整远程素材。

  - 2026-07-26 补充：DEV 导入向导只在测试库通过后才接受 `APPLY-DEV`，导入前使用 SQLite Backup API 独立备份；每步保留日志，自动验证包内技能/精灵 UID、统一版本、UID 迁移、完整性与外键，人工验收可恢复。隔离真实发布包演练已通过。剩余风险：人工页面验收不可自动替代；图片、身高体重、蛋组和三类技能关系现已纳入导入与自动校验，但在输入 `CONFIRM` 前仍不得进入服务器阶段。

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


- 2026-07-25: pet review now captures supplementary detail from the single BWIKI detail page. Remaining risk: parser selectors and egg-group text matching need a real-page fixture; the staged snapshot is display/review data only until an explicit importer/apply path is added.


- 2026-07-25: supplementary refresh now re-requests the BWIKI detail page even when images are complete. Remaining risk is request cost/rate limiting and parser accuracy; no production DB write is performed.


- 2026-07-25: skill enrichment is name-based after BWIKI parsing; ambiguous or renamed skills can remain unmatched and require Skill review confirmation.


- 2026-07-25: skill matching remains name-based; duplicate or renamed skills may still require manual Skill review confirmation. External staged icon URLs also depend on BWIKI/CDN availability.


- 2026-07-25: reduced false-new-form risk for differing BWIKI UID ordinals using pet_id plus normalized form name. Residual risk remains when multiple local forms share the same base name and no reliable form label is available; lowest ordinal is selected and needs manual review.

- Pet manual association: only rewrites staging JSON; verify UID mapping and import package before production deployment.

- Backend ECONNREFUSED remains an environment/startup issue; start the API server before using the review page.

- Existing corrupt staging batches may contain irreversible replacement characters; keep them out of import and regenerate from clean UTF-8 source.

- 2026-07-25：已修复审核页合法 UTF-8 中保存的乱码，以及服务端中文图片分类/筛选页路径语义损坏。剩余风险：BWIKI DOM 或文件命名变化仍可能产生未分类素材；导入前必须在已确认页核对本体、异色、果实、精灵蛋四个槽位，真实网络抓取尚未在本轮执行。

- 2026-07-25 补充：同名但 UID 不同、同编号但名称不同的精灵不再自动落到本地候选上接受字段。审核人必须显式选择保留本地 UID 更新现有记录，或保留现有记录并用远程 UID 新增形态；远程已有完整 UID 时，同编号不同名记录只作为参考。服务端同时校验决定类型、强制目标 UID、检查远程 UID 是否已存在并记录审计字段。剩余风险是 BWIKI 与本地命名本身可能不足以判断形态关系，最终选择仍需结合立绘、属性、编号和形态说明人工确认。
- 2026-07-25 补充：详情图片解析已从仅扫描 `.imgAll-sprite-img` 改为扫描 `.allImgTab` 全部图片并过滤控制图标，解决伊贝儿 `JL_yibeier_yise.png` 被遗漏。剩余风险：BWIKI 若再次改变图片区层级、alt/文件命名或移除 `.allImgTab`，仍可能漏分槽；导入前继续人工核对本体、异色、果实、精灵蛋。
- 2026-07-25 补充：服务器 BWIKI 导入前必须先完成数据库副本导入演练和 DEV 页面验证；该闸门降低首次 `--apply` 直接作用于生产库的风险。该风险后续已由 schema v2 导入器缓解：发布包图片现与数据库索引一并发布并支持回滚；剩余风险转为必须在 DEV 和线上人工核对槽位。
- 2026-07-25 补充：已降低删除括号后同编号多形态误配风险；带形态标签的候选先做标签语义匹配，远程无标签才使用基础名最低序号兜底。剩余风险：其他未登记的同义形态文案仍可能需要人工关联或增加明确别名规则。
- 2026-07-25 补充：已修复打包器将合法 `approved-uid-migration` 误判为 enabled 冲突的问题；真实批次 6 个 UID 迁移均进入发布 manifest。剩余风险仍在实际 DEV/服务器 `--apply` 阶段，必须按数据库副本演练、外键检查和备份回滚闸门执行。
- 2026-07-25 补充：BWIKI Batch 工作流已进入管理端，目录 ID 使用严格白名单并限制在 `data/wiki-staging/batches`，发布包限制在 `data/wiki-releases`；Python 通过参数数组启动而非 shell，审核请求按 Batch 隔离。剩余风险：后台任务状态仅保存在 API 进程内存中，重启服务会中断任务；抓取仍可能触发远端限流；页面打包完成后仍必须执行 DEV 数据库副本演练，不能直接部署生产。
- 2026-07-26 补充：旧 schema v1 发布包会丢失 `approved-reference` 特性的描述和关联信息，且旧 import 不发布图片；导入器现在会明确拒绝这类旧包，必须从原 Batch 用修复后的 package 重新打包。schema v2 在同一导入窗口写数据库和图片，失败时回滚事务并恢复文件，成功时生成素材回滚清单。身高、体重、蛋组和三类技能学习快照现已进入正式导入。剩余风险：远程技能必须唯一解析到全局技能表，否则整批阻断；生产执行前必须先通过 DEV 向导并人工验收。

- 2026-07-26 恢复验证：DEV 服务仍运行时，导入向导会拒绝 `RESTORE`，但保留导入前备份。停止服务后已使用该备份恢复成功，完整性与外键检查通过；异常导入后的数据库也另存保护。剩余风险是人工验收后必须先停止 `npm run dev` 再输入 `RESTORE`，否则只能在服务停止后按会话备份手工恢复。


- 2026-07-26 临时目录风险：项目内 `tmp/` 当前包含 SQLite 数据库副本、发布包、隔离图片和导入恢复点，且工作区显示为未跟踪目录。禁止提交或上传整个 `tmp/`；禁止在未确认 `CONFIRM/RESTORE` 结果前删除 `wiki-dev-import/<session>`。恢复必须同时保留数据库备份、素材日志和旧文件副本；服务器 `/tmp` 不是持久备份位置。
- 2026-07-26 精灵详情导入风险缓解：身高/体重采用“只补空值或损坏值”，远程空技能类别不会清空本地关系，人工蛋组优先保留；技能引用无法按 UID 或唯一名称解析时整批失败。UID 迁移、旧 UID 复用、完整包和无图片 `approved-reference` 打包均已隔离验证。剩余风险：页面是否按预期渲染三类技能与蛋组仍需 DEV 人工验收，且已有有效人工身高/体重不会自动改成 BWIKI 新值。

- 2026-07-26 版本公告草稿风险：管理端比对接口只接受项目内相对目录和同目录直接 `.db` 文件，使用只读脚本生成，不修改数据库、不保存服务器草稿，也不创建中间 Markdown。条目隐藏状态仅存在于当前浏览器页面；刷新或重新比对会重置。删除条目后模块标题和更新概览中的初始数量不会自动改写。为控制公告体积，超过 80 条关系的批量技能学习同步默认省略，若该批次确有面向用户的玩法变化需人工补充；弹窗预览虽复用线上解析器和样式，仍需浏览器人工确认移动端横向表格与实际图片。

- 2026-07-26 图片衍生物风险缓解：BWIKI `import --apply` 不再依赖导入后人工运行压缩脚本；原图写入正式字段后自动生成精灵缩略图和各正式槽位 WebP，`pets.thumb_url` 与缩略图在同一数据库事务中更新，所有生成文件进入素材回滚日志。隔离完整包验证 99 个缩略图、443 个额外 WebP（含 109 个特性 WebP）、完整性与外键通过。剩余风险：只处理当前发布包素材，历史存量缺图仍需单独运行存量修复脚本；上线前仍需 DEV/线上页面抽查槽位与缓存。

- 2026-07-26 线上自动导入风险控制：服务器向导默认仅使用生产库快照和隔离图片目录演练，`--apply` 需要发布包 ID 精确确认；写入前停止 PM2并保存独立 SQLite 恢复点，写入后检查完整性、外键、实体版本、素材清单和实际文件，异常或 `INT/TERM/HUP` 中断自动恢复数据库与图片。已修复 Dev 验证报告存在 errors 仍返回成功的退出码漏洞，并对数值范围格式做语义归一。剩余风险：真实生产 Linux 的 PM2 应用名、健康地址、权限、磁盘空间和完整回滚路径尚未执行验证；首次上线必须先跑默认演练，保留 Release/会话/导入器备份，并在最终 `CONFIRM` 前人工核对关键页面。若素材清单缺失，脚本会保持服务停止，必须从会话恢复点人工处置。
