# RocoTools 当前交接

> 更新时间：2026-07-25
> 交接状态：committed

## 基准

- 仓库：`F:\roco`
- 当前分支：`main`
- 本轮工作区基准：`85bd071111c70aaa9152a5a5f670c1453a244101`
- 文档分支原基准：`848207a9561c43146c9cf6223c6f4829b22eec88`
- `main` / `origin/main` 已包含文档合并点：`8c37af0d69f6af4f337dfa0f1db6e1904852a2ea`
- 产品代码基准：`419a62a`
- 文档一致性实现提交：`7735ecb284871a0e7ef382d4ad0656427b6947dc`
- 文档目录整理基准：`3c22a7aab13bdecfd6d0d5680e9efd68d952c91b`
- 文档目录整理实现提交：`4ff7ac4531bd9dac18670e32d151e4d80ba595ad`
- stash：无

## 当前目标

当前在 `codex/dev-mode` 完成一键开发入口、BWIKI 逐实体暂存与 Diff 审核；已提交并推送到同名功能分支，未合入 `main`、未部署。

## 已完成

1. 清除 `SCRIPTS.md` 仅由行尾/文件状态造成的修改标记，工作区与索引哈希一致。
2. 将上下文分支提交 `848207a` 推送，并 fast-forward 合并、推送到 `main`。
3. 从最新 `main` 创建 `eachzhang/codex/docs-drift`。
4. 统一当前 SQLite 口径：374 个去重精灵、494 个形态、495 个技能、18 个属性、15 个蛋组、30 个性格。
5. 校准 `sync_db.js`：默认生成图片衍生物并建表/补列但不导入 JSON；`--full` 才完整导入和后处理。
6. 区分爬虫自动 init/import、完整导入、服务器数据拉取与代码部署。
7. 新增受 Git 管理的脱敏 `docs/operations/DEPLOY.md`，并在 `.gitignore` 中仅对此文件取消忽略。
8. 记录服务器脚本按前后端差异构建、每个新提交 reload PM2、不执行数据库操作的实际行为。
9. 将反馈文档从待开发设计稿重写为 deployed 实现、真实 API、存储与风险说明。
10. 更新 README、架构、app/scripts/crawler README、CHANGELOG、DOC_RULES、AI memory 和已跟踪开发 Skills。
11. 从 `.ai-memory.md` 移除真实源站 IP；历史 CHANGELOG 和生成报告保留并标明其口径。
12. 更新 STATUS、TODO 和 RISK_REGISTER；M-06 文档漂移标记为 mitigated。
13. 新增 `docs/README.md` 文档中心。
14. 将架构、独立功能、提交规范和展示标准共 7 份正文移动到分类目录。
15. 旧路径保留兼容入口，仓库内部权威引用改为新路径。
16. 更新 README、DOC_RULES、AI memory、开发 Skills 和 AI 上下文中的文档路径。
17. 审核 `main..eachzhang/codex/docs-drift` 的 6 个提交；确认仅包含文档、文档 Skill、旧路径兼容入口和正式部署文档的 `.gitignore` 放行规则。
18. 将文档分支 fast-forward 合并到 `main` 并推送 GitHub；文档合并点为 `8c37af0`。
19. 确认旧上下文和文档分支均已完全合入 `origin/main` 且未被 worktree 使用后，删除其本地及远端分支。
20. 将项目根目录限制、渐进式检索、默认排除目录、按改动验证、重资源操作需确认和临时进程清理要求追加到根 `AGENTS.md`，未覆盖既有规则。

## 验证记录

- `scripts/verify-context.ps1`：合并及清理后通过；本地 SQLite `integrity_check=ok`，统计口径一致。
- 本轮提交前 `scripts/verify-context.ps1`：通过；分支为 `main`、HEAD 基准为 `85bd071`，仅两个预期文档处于 working-tree。
- Markdown 本地链接检查：通过。
- 受维护文档敏感 IP、反馈旧 API/状态、已删除脚本和“push 即部署”扫描：通过。
- `git diff --check`：通过。
- 产品源码、数据库 schema 和运行数据 diff：无。
- 7 份迁移正文内容保持一致；架构文档仅清理 1 行既有尾随空格。
- 受 Git 管理及本轮新增 Markdown 本地链接检查通过。
- 固定 AI 上下文路径验证通过；旧路径兼容入口可解析。
- 服务器只读 SSH：认证仍失败，本轮未执行远程命令、部署、PM2/Nginx reload 或数据库操作。

## 当前功能分支提交范围（2026-07-25）

- 分支：`codex/dev-mode`；基准：`0b909d6dc6f810fabedcc4e63db37fbab6936f3e`。
- 根目录新增 `npm run dev` / `npm run dev:check`，不新增第三方调度依赖。
- 已补齐本机缺失的 `vite-plugin-pwa@0.21.2` 与 `cheerio@1.2.0`；前端安装报告 1 中危/4 高危，后端报告 1 低危/1 中危/4 高危，未自动修复。
- 新增 `scripts/wiki_staging.py`：BWIKI 逐实体暂存、字段白名单、dry-run、SQLite backup 与事务导入；新增 `--all-skills`，初次抓取不下载图片。
- 新增正式使用文档；当前未执行数据库写入、生产操作或全量抓取。
- 定向抓取已验证当前 BWIKI 为 592 个精灵形态、553 个技能；技能图标源 URL 只保存在审核元数据，初次抓取样本没有下载图片。
- 最终检查时暂存样本“吹散”（`skill_496`）已通过审核页标记为 `approved-new` 并下载图标；当前 dry-run 显示 5 个启用项（1 技能、4 精灵），尚未执行 `--apply`，正式数据库未写入。
- 2026-07-25 新增确认后素材预览：抓取阶段保留精灵本体/异色/果实/蛋/特性图标与特性图标 URL；路由级测试验证新精灵确认后下载 5 个文件且鉴权素材接口可读取。旧暂存批次不会自动补 URL，需重新定向抓取。
- 2026-07-25 新增 package：全部顶层技能/特性/精灵候选审核结束后，排除忽略和无变化项，只打包启用差异与已确认素材；生成逐实体 change.json、可执行 import.json、manifest.json、SHA-256、目录和 ZIP。当前真实暂存区生成 5 个数据库增量项（1 技能、4 精灵）和 1 个素材文件；发布包 dry-run、篡改拒绝、待审核拒绝和 ZIP 结构均通过。
- 2026-07-25 新增 `clean`：默认预览当前暂存文件、大小与审核状态；只允许 `data/wiki-staging` 内目标，实际删除要求 `--apply --confirm CLEAN`，pending 还需 `--force`；默认保留 `batches/`、`data/wiki-releases/`、SQLite、正式 JSON 和 `data/public/`。隔离夹具验证 pending 拒绝、强制清理和越界路径只读拒绝通过；真实 `wiki-staging` 尚未清理。
- 暂存目录现为每个实体生成 `remote.json`、`local.json`、`diff.json`、`import.json`；`compare` 可不联网地重做逐字段比较。精灵限定为 `pets` 主表 11 个非身份基础字段；`version` 被兼容忽略，详情、进化、克制、技能组、蛋组和图片不参与，导入器会拒绝越界写入。
- S2/S3 身份匹配：远程完整 UID 精确匹配优先；UID 不存在时仅允许唯一同名记录兼容旧 UID，UID 与名称都不匹配则按 `uid-new-form` 新增形态审核，同编号旧形态仅作参考。唯一 `pet_id` 兜底只用于远程没有 UID 的数据；`pet_031_1 / 恶魔男爵` 已验证不会关联本地 `pet_031 / 叮叮恶魔`。
- `/admin/wiki-review` 已扩展为技能 → 特性 → 精灵三个独立 Tab：按稳定标识排序、每次只显示一个候选，前序仍有待审核项时前后端均锁定后序 Tab；现有字段可勾选，新实体只有明确确认后才下载可用素材。技能/特性使用现有卡片语义显示图标，精灵同时显示本体、异色、果实、精灵蛋、特性图标与基础数值；素材仍留在暂存目录，不自动发布。
- `npm run build`、`npm run dev:check`、Python/Node 语法检查、三阶段列表状态、后端跨阶段拒绝、5 类精灵素材下载/受控读取、dry-run、上下文验证与 `git diff --check` 均通过；当前样本技能、特性和精灵均已完成审核，但精灵是在素材功能前确认的，暂无 `assets`。
- 临时数据库 dry-run/写入、SQLite backup、`manual_edit=1` 与 `integrity_check=ok` 已验证；正式数据库未写入。
- 2026-07-25 新增 `docs/operations/BWIKI_VERSION_UPDATE.md`：将后续每次版本更新固定为“服务器基线回拉 → 独立批次抓取 → 技能/特性/精灵顺序审核 → 发布包 → 本地及服务器 dry-run → 数据库导入 → 管理端图片发布 → 线上验证 → 最终回拉 → 批次清理”；同时在文档中心和 `SCRIPTS.md` 增加入口。本轮没有连接服务器、上传发布包、写生产数据库、发布图片或清理暂存数据。
- 2026-07-25 修复 BWIKI Diff 审核 Tab 状态：确认、忽略、撤销或手动刷新后保留当前未锁定 Tab，并在该 Tab 内定位下一条待审候选；仅首次进入自动定位第一个待审阶段，当前 Tab 不存在或被后端锁定时才切换。`npm.cmd run build` 通过；未执行数据库或生产操作。
- 2026-07-25 按用户确认将 `version` 排除出 BWIKI 技能/精灵 Diff；远程快照仍可保留该值作为来源参考。发布包导入新增 `import --version <版本号>`，仅在明确提供时统一写入 skills/pets.version，未提供则不改变原值。
- 2026-07-25 将 BWIKI 审核列表改为服务端“有差异 / 已确认 / 无差异”三类按需返回：默认只为有差异候选读取完整 `remote/local/assets`，统计阶段只读 `diff/import`，审核后只返回当前分类；无差异仍计入待审并保持阶段锁定。隔离 Express 路由测试验证三类计数、筛选、审核迁移和默认响应不含无差异远程载荷；后端语法检查与前端生产构建（含 PWA、SEO）均通过。
- 2026-07-25 进一步将 `/api/admin/wiki-review` 改为按实体分页：原 `?view=differences` 默认只返回技能第 1 条完整候选，其他实体仅返回计数；支持 `entity/page/pageSize`（单页上限 20），审核 POST 只返回成功状态。轻量 `diff/import` 汇总缓存 60 秒，审核决定直接更新缓存，页面手动刷新使用 `refresh=1` 强制重读。隔离路由测试已验证默认单条、跨页、审核迁移、超页回退和 POST 轻响应；后端语法检查与前端生产构建（含 PWA、SEO）通过。
- 2026-07-25 新增 `fetch-html` 离线入口：接受 UTF-8 浏览器 HTML 或 MediaWiki parse API JSON，复用现有解析器生成基础暂存，可通过精灵名称目录或 `名称=路径` 显式映射补详情；清单只记录输入文件名，不记录绝对路径。列表/详情解析器改为仅在线请求时加载 `requests`；Python 语法和 CLI 参数检查通过，完整 HTML 夹具测试因本机缺少项目既有 `beautifulsoup4/lxml` 依赖尚未执行。根 `AGENTS.md` 已记录安全本地工具/文档改动无需二次确认的授权边界。
- 2026-07-25 将 BWIKI 在线请求统一为 `crawler/utils/polite_request.py`：固定且可配置的项目 User-Agent、Session 复用、全进程串行 4～8 秒节流、瞬时故障有限退避，403/429/567 和 HTML 验证页立即熔断；精灵详情并发降为 1，旧 `request.py` 保留兼容导入但导出新策略。未访问 BWIKI，未验证真实网络响应。
- 2026-07-25 将精灵更新拆成两阶段：`fetch --all-pets` 只请求一次“精灵筛选”页，暂存名称、属性、特性名称、六项数值和总种族值，不请求技能页或 592 个详情页；列表缺失的 `ability_desc` 不参与 Diff。确认已匹配精灵基础字段时才下载筛选页已有头像/特性图标，并提供精灵详情入口；管理端详情爬虫改为只请求当前 UID 的一个详情页，不重复筛选页、不连带同编号形态，且种族值默认不勾选。页面结构通过 2026-07-25 线上只读页面核对；未从本机爬虫发起网络抓取。
- 2026-07-25 修复详情页图片按出现顺序错槽：正式文件约定为本体 `JL_*`、异色 `JL_*_yise`、精灵蛋 `Egg_*`、果实 `Fruit_*`；URL 解码后拒绝 `界面_宠物_*` 和 `Icon_异色_*` 页面控件。无法识别或明确错槽素材在审核接口隐藏、发布包排除，原暂存文件保留；圣草迪莫旧控件图和旧本体→异色映射已通过现有暂存数据过滤验证。
- 2026-07-25 补齐多形态 UID 迁移审核：当已有 `pet_031` 遇到第二个同编号形态时，远程组规划为叮叮恶魔 `pet_031_1`、恶魔男爵 `pet_031_2`；叮叮恶魔即使基础字段无变化，也单独进入“确认 UID 更新”。导入器会在同一事务中迁移 `pet_uid` 外键、形态映射及受支持的 JSON UID 引用；未执行生产导入。
- 2026-07-25 为“基础字段无变化但 BWIKI 补充图片”的已匹配精灵新增“只拉取缺失图片”：待审核时即可请求当前精灵详情，只下载本地与暂存缺失的正式槽位，不启用数据库字段导入；审核决定记为 `approved-reference`/“已确认补图”，因此素材可进入发布包。后端仍校验身份安全且无允许字段差异。
- 2026-07-25 修复已确认精灵补图：详情页没有 .allImgTab 时回退扫描正文图片，并按正式文件名/标签识别异色、本体、果实和精灵蛋，继续排除导航与筛选控件。
- 2026-07-25 为无差异精灵增加主动补图并确认入口；确认后使用 approved-reference 转入已确认，图片随发布包导入，不写入基础字段。import 新增 version 参数，可统一覆盖导入时的 skills/pets.version。
- 2026-07-25 为技能、特性、精灵三类审核的“有差异 / 已确认 / 无差异”视图增加轻量候选选择器；选择名称、编号或 UID 后直接跳转分页，不增加完整审核详情的批量返回。

## 下一步

1. 如需给旧候选补图片，重新定向抓取对应精灵/特性，使 `remote.json` 带有 `assets`；抓取会把对应候选恢复为待审核，之后再在 `/rocotools/admin/wiki-review` 按顺序确认新增，触发素材下载并显示预览。
2. 如需跨电脑继续，执行 `git fetch origin` 后检出 `codex/dev-mode`；不要从未提交工作区或 stash 恢复。
3. 后续版本按 `docs/operations/BWIKI_VERSION_UPDATE.md` 执行；审核全部完成后生成并检查发布包，服务器解压后先 dry-run（自动 SHA-256 验包），再人工决定是否 `--apply`。正式图片仍需通过管理端逐项发布。
4. 线上发布和验证完成后，先运行 `python scripts/wiki_staging.py clean` 预览；清理当前批次使用 `--apply --confirm CLEAN`，需要连历史测试批次一起丢弃时再追加 `--include-batches --force`。`data/wiki-releases` 默认保留。
5. 生产 SHA、PM2 和精确构建证据继续保留为外部核验事项。

## 未确定/外部依赖

- 生产服务器实际 commit SHA。
- PM2 实际进程状态和线上构建的精确 commit。
- 生产 Nginx 配置与仓库模板差异。
- 最新依赖 advisory 数量。

## 结束话术

> RocoTools 结束指向：`docs/ai/HANDOFF.md`（下一步）→ `docs/ai/STATUS.md`（功能状态）→ `docs/ai/RISK_REGISTER.md`（风险与剩余事项）。


- 2026-07-25: pet BWIKI confirmation now reuses the detail-page parser and stages height, weight, three skill-source lists, and egg groups in remote.json.detail / import.json.detail; the confirmed review card renders the snapshot. Existing confirmed pets can use the backfill action. No live DB write is performed by this review action; package/import support for these supplementary fields remains an explicit follow-up.


- 2026-07-25: confirmed and unchanged pet views now keep a supplementary refresh action available. Each click refreshes the detail page and stages six stats, height/weight, three skill groups, egg groups, and missing formal images; the card prefers the refreshed stats for display.


- 2026-07-25: pet review skill cards now enrich BWIKI skill names from the local skills catalog, fall back to staged skill-review records, and render icon/element/type/level/cost/power/description. Unmatched cards link to Skill review.


- 2026-07-25: fixed pet skill enrichment to scan configured staging plus version batch skill folders, normalize names with NFKC/whitespace stripping, and fall back to standard local skill icon paths when the DB row has no icon URL.


- 2026-07-25: fixed pet form matching for remote UIDs with different ordinals. Same pet_id plus a shared name after removing local parenthetical form labels now maps to the lowest local ordinal (pet_012_3 -> pet_012_1 in the verified fixture) instead of uid-new-form.

## 2026-07-25：待审核新增精灵可手动关联本地记录

- 精灵 `unmatched`/身份歧义候选现在显示“关联本地精灵”按钮。
- 选择器复用 `PetPicker`，开启全部形态；确认后只改当前 staging 的 `local.json`、`diff.json`、`import.json`，不会直接写数据库。
- 关联会把本地 UID/基础数据作为比较基准并重建差异；随后仍需按字段审核。远程 UID 与本地 UID 不同会标记为人工关联的 UID 差异，避免把已有记录误判为新增。
- 未实现自动导入线上；部署前仍需导出并人工检查 import 包。

- Fixed missing wiki review API methods and repaired malformed staged review route strings; client SFC and server route syntax checks now pass.

- Repaired mojibake in AdminWikiReview.vue using selective GBK-to-UTF8 recovery; preserved a valid SFC and removed temporary backup.

- Repaired mojibake in AdminWikiReview.vue using selective GBK-to-UTF8 recovery; SFC compilation passes.

- Replaced remaining mojibake UI strings in AdminWikiReview.vue with readable UTF-8-safe labels; SFC compilation passes.

- UI labels restored to Chinese; dynamic staging mojibake is treated as invalid input and must be regenerated rather than auto-imported.

- User command convention: all project commands and examples should use Bash syntax by default.


## 2026-07-25 乱码与图片分类修复交接

- 状态：committed，分支 codex/dev-mode，父基准 0b909d6；随当前分支 HEAD 交接，未合入 main、未部署。
- 修复 AdminWikiReview.vue 中全部已识别乱码、意外问号和英文占位；技能、特性、精灵审核的标签、按钮、字段、状态、图片槽位与提示统一为中文。
- 修复 wikiReview.js 中被乱码破坏的“精灵筛选”隔离判断、正式图片分类正则、模板插值和错误文案；详情页无 .allImgTab 时改为从正文图片容器回退，不再引用未定义的 img。
- 已验证：Vue SFC 编译、服务端语法、前端 API 契约、图片四槽位分类、筛选页缩略图隔离。仍需用户重启本地服务并在真实 BWIKI 详情页点击补图进行浏览器验收。
