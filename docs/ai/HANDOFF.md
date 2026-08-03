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

当前在 `codex/dev-mode` 完成一键开发入口、BWIKI 逐实体暂存与 Diff 审核；已提交并推送到同名功能分支，本轮合入 `main`，未部署。

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
- 暂存目录现为每个实体生成 `remote.json`、`local.json`、`diff.json`、`import.json`；`compare` 可不联网地重做逐字段比较。精灵基础差异仍限定为 `pets` 主表 11 个非身份字段，`version` 被兼容忽略；已审核的详情快照另走补充导入，支持身高、体重、三类技能和蛋组，进化与克制仍不参与。
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

## 2026-07-25：精灵 UID/名称冲突强制身份决策

- 状态：`committed`；分支 `codex/dev-mode`，基准提交 `6da3d15880691999b25eb6003b2e3d1ad9fb532f`，本轮合入 `main`，未部署。
- 精灵候选为 `name-match-id-different` 或 `id-match-name-different` 且不存在既定 UID 迁移时，审核页必须明确选择“更新现有本地 UID”或“使用远程 UID 作为新形态新增”；选择前不再提供通用“接受字段/确认无变化”入口。
- “更新现有”保留本地 UID，只导入勾选字段；“作为新形态新增”保留原记录并把远程 UID 写入新增计划。两种决定均在 `import.json.review.identity_resolution` 记录审计信息。
- 服务端拒绝未带显式 `identity_resolution` 的名称/UID 冲突字段更新，并拒绝新增已存在的远程 UID；更新现有时会强制把 `plan.id` 设为本地 UID，新增时强制设为远程 UID。抓取脚本不再用“唯一同编号但名称不同”覆盖完整远程 UID 的新形态判定；此轮未写本地数据库、未请求真实 BWIKI、未部署。
- 已验证：前端 API 与服务端 Node 语法、Vue SFC 编译、`git diff --check`；使用隔离暂存副本验证未选择身份时请求被阻断、`pet_011_9` 可作为新形态生成计划、或明确更新现有 `pet_011_7`。补回已下载素材中文标签函数，并额外验证模板引用存在对应的 SFC 脚本绑定。又以 `pet_031_1 / 叮叮恶魔` 和 `pet_031_2 / 恶魔男爵` 验证了“基础形态 UID 迁移 + 新形态新增”分流，以及旧批次的新增/更新现有两条路由；新增形态素材测试确认会忽略本地候选已有图片，并从远程详情补齐本体、异色、果实、精灵蛋和特性图标。下一步为用户刷新真实审核页，确认恶魔男爵显示两个身份决定按钮。

## 2026-07-25：精灵详情异色图补全修复

- 状态：`committed`；修复详情图片解析器只扫描 `.imgAll-sprite-img`（通常仅果实）而漏掉同一区域本体、异色和精灵蛋的问题。
- 已用伊贝儿真实页面结构确认异色资源为 `JL_yibeier_yise.png`；修复后会扫描 `.allImgTab` 内全部图片，并继续排除页签/异色切换按钮图标。
- 用户重启本地 API 后，在伊贝儿已确认卡片再次点击“刷新图片和详情”，缺失异色应写入当前批次 `pets/pet_071/images/` 与 `assets.json`；不会直接写数据库或部署线上。

## 2026-07-25：BWIKI 发布前增加 DEV 本地导入闸门

- 状态：`committed`；`BWIKI_VERSION_UPDATE.md` 已从两阶段改为三阶段，在 Dev 审核打包与服务器部署之间加入数据库副本演练、DEV 正式库导入、API/页面验证和备份回滚步骤。
- 服务器导入的新前置条件：发布包必须先通过测试数据库 `dry-run/--apply`、`integrity_check`、`foreign_key_check`，再通过 DEV 正式库与页面验证。图片仍与数据库字段分开发布。

## 2026-07-25：同编号精灵形态标签优先匹配

- 状态：`committed`；精灵匹配新增括号形态标签语义层，完整 UID/完整名称之后优先匹配等价形态标签，再回退基础名。
- 已验证远程 `pet_277_3 / 地鼠（储水时的样子）` 唯一关联本地 `pet_277_2 / 地鼠（储水期的样子）`，不再错误选择 `pet_277_1 / 枯水期`；无形态标签的板板壳最低序号兜底保持不变。当前 `s3-clean-2026-07-25-01` 的该候选已定向重算，未修改审核决定或数据库。

## 2026-07-25：UID 迁移发布包冲突误报修复

- 状态：`committed`；`package` 的 enabled/decision 一致性校验已允许合法的 `approved-uid-migration`，不再误报 `pet_031_1`、`pet_107_1`、`pet_206_1`、`pet_233_1`、`pet_288_1`、`pet_329_1`。
- 真实 `s3-clean-2026-07-25-01` 在临时输出目录完成打包回归：225 项、167 个数据库导入、58 个仅素材项、416 个素材文件；6 个迁移均进入 manifest，临时目录已自动清理，未写数据库。
## 2026-07-25：BWIKI Batch 可视化工作流

- 状态：`committed`；分支 `codex/dev-mode`，基准提交 `6da3d15880691999b25eb6003b2e3d1ad9fb532f`，本轮合入 `main`，未部署。
- 管理端 BWIKI Diff 页面新增 Batch 工作流：创建/命名、修改显示名称、选择审核 Batch、分别或依次拉取技能与精灵/特性、查看后台任务日志、审核完成后生成并下载 ZIP。
- Batch 使用稳定目录 ID 和 `.batch.json` 显示名称，改名不搬目录；已有无元数据批次继续兼容。所有审核与图片请求携带 Batch ID，服务端使用异步上下文选择根目录并把 60 秒审核缓存按 Batch 隔离。
- 后台任务使用参数数组启动 `scripts/wiki_staging.py`，不经过 shell；每个 Batch 同时只允许一个任务。任务状态保存在 API 内存，服务重启后不可续接。
- 已验证：新增/修改文件 Node 语法、前端生产构建；临时 Express 接口验证 3 个现有 Batch 可列出并分别返回所选 Batch；临时 Batch 创建、改名和稳定 ID 验证通过后已精确清理。未向 BWIKI 发请求、未生成正式发布包、未写数据库。
- 下一步：用户重启 `npm run dev`，在真实管理页选择现有 Batch 验收；新版本应新建 Batch 后使用“依次拉取全部”，确保技能、特性和精灵位于同一 Batch，再开始审核和打包。

## 2026-07-26：BWIKI DEV 导入向导

- 状态：`committed`；新增 `scripts/wiki_dev_import.sh`，阶段二不再要求人工拼接数据库副本与 Python 命令。
- 向导顺序：发布包/数据库预检 → SQLite 测试库 → dry-run → 测试库 apply → 逐实体校验 → `APPLY-DEV` 门禁 → DEV 独立备份/导入/校验 → 人工页面验收。
- 错误会输出失败步骤、退出码、日志路径、最近 20 行和恢复备份；人工结果使用 `CONFIRM`、`RESTORE`、`KEEP`。Python 输出固定 UTF-8。
- `s3-2026-07-25-03 --test-only` 隔离演练通过：256 个导入项、89 技能、167 精灵、6 UID 迁移；测试库由 494/495 变为 596/554，`integrity_check=ok`、外键错误 0、逐项错误 0。DEV 正式数据库未修改。
- 验证中修正了旧 UID 被后续新形态合法复用时的迁移误报；例如 `pet_288 → pet_288_1` 后，另一导入项仍可合法使用 `pet_288`。
- `docs/operations/BWIKI_VERSION_UPDATE.md` 阶段二已改为单脚本说明、错误报告结构和人工验收清单。下一步由用户对目标发布包执行完整向导，并在页面核对后输入 `CONFIRM` 或 `RESTORE`；本轮未部署。

## 2026-07-26：BWIKI 图片与特性补全导入修复

- 状态：`committed`；根因是旧导入器只加载 `enabled` 数据库计划，475 个包内图片从未复制到 `data/public`；同时 `approved-reference` 特性打包时未保留 `import.json`，描述与关联精灵信息丢失。
- 修复：schema v2 发布包保留特性补全载荷；import 按技能 → 精灵/UID → 特性补全 → 图片顺序执行，将图片写入正式槽位及数据库 URL。特性描述只补空值或含 `�` 的损坏值，图标按名称写到全部关联精灵。UID/新增记录重跑已改为幂等。
- DEV 向导测试阶段使用隔离图片目录，逐文件验证 URL 与 SHA-256；正式 DEV 阶段生成数据库备份、素材备份和回滚清单，`RESTORE` 同时恢复数据库与图片。
- 验证：从 `s3-clean-2026-07-25-01` 临时重打 schema v2 包，隔离数据库重跑 256 个数据库项、41 个特性补全项，475 个包内素材展开为 515 个最终图片；`integrity_check=ok`、外键 0、图片验证 515/515。真实 DEV 数据库和 `data/public` 未由本轮测试写入，未部署。
- 下一步：不要继续使用 `s3-2026-07-25-03` 旧包；从原 Batch 重新生成新名称发布包，再运行 `bash scripts/wiki_dev_import.sh --release <新包> --version S3`，人工确认页面后选择 `CONFIRM` 或 `RESTORE`。

## 2026-07-26：旧发布包 DEV 导入恢复

- 用户曾将旧包 `s3-2026-07-25-03` 导入 DEV；因人工验收时未停止 `npm run dev`，向导按安全门禁拒绝执行 `RESTORE`。数据库备份本身没有损坏。
- 已在确认 3000/5173 端口无监听后，从 `tmp/wiki-dev-import/20260726-003631-3114/dev-before-import.db` 使用 SQLite Backup API 恢复 `app/server/data/roco.db`。
- 恢复后验证：`integrity_check=ok`、外键错误 0、精灵形态 494、技能 495；异常导入后的 596/554 数据库另存为同一会话目录的 `current-after-failed-import-before-restore.db`，暂未删除。
- 旧包未发布正式图片文件，因此本次无需回滚 `data/public`。下一步仍是从原 Batch 重新生成 schema v2 新发布包，再按 DEV 导入向导完整演练。


## 2026-07-26：项目 `tmp/` 清点与保留点

- 本次只读清点时，`tmp/` 约 273 MB，未执行删除。主要占用：`wiki-dev-import` 约 155 MB、临时修复发布目录约 43 MB、临时 ZIP 约 33 MB、隔离图片约 32 MB、两个 SQLite 测试/备份组各约 5 MB。
- `tmp/wiki-dev-import/20260726-003631-3114/` 是实际执行过 `APPLY-DEV` 的旧包导入会话，包含已用于恢复的 `dev-before-import.db` 和异常库保护副本 `current-after-failed-import-before-restore.db`；问题复盘和新包验证完成前保留。
- `20260726-004356-3197` 是未完成的旧包测试会话；`20260726-005711-3741`、`005936-3858`、`010128-3970` 是修复后 schema v2 的隔离测试会话，均未写 DEV 正式库。
- `tmp/wiki-import-asset-fix-package/`、同名 ZIP、`wiki-import-asset-fix-test.db` 和 `wiki-import-asset-fix-public/` 是图片/特性导入修复回归产物，可由原 Batch 重新生成，不是正式发布来源。
- 下一步：先从原 Batch 生成正式新名称 schema v2 Release，并完成一次新的 DEV 导入与人工验收；在新流程确认成功且旧恢复点不再需要后，再按完整会话目录精确清理可重建产物。

## 2026-07-26：BWIKI 身高、体重、蛋组与三类技能导入

- 状态：`committed`；根因是审核阶段虽已生成 `import.json.detail`，旧导入器仍显式拒绝详情/技能组，向导又只检查主记录，所以会出现脚本显示成功但精灵管理页字段为空。
- 修复后，打包器保留已审核的详情快照（包括没有图片、基础字段无变化的 `approved-reference`）；导入器在 UID 迁移和精灵主记录完成后写入 `pet_details`、`pet_skills`、`pet_egg_groups`。
- 保护规则：有效人工身高/体重不覆盖；远程空技能类别不清空；人工蛋组保留；技能无法解析到全局技能表时整批阻断。UID 迁出后旧 UID 被新形态复用的详情归属已纳入校验。
- 隔离完整包导入结果：179 个精灵详情、534 个技能分类/8662 条技能关系、217 条导入蛋组关系；增强验证核对 358 个详情字段、534 个分类、8662 条技能和 221 条最终蛋组关系，错误 0，`integrity_check=ok`、外键 0。无图片 `pet_146 approved-reference` 的详情打包回归通过。
- 本轮未修改 DEV 正式数据库、未部署。下一步必须从原 Batch 重新打包，运行 `bash scripts/wiki_dev_import.sh --release <新包> --version S3`，在自动检查通过后人工核对精灵管理页的身高、体重、蛋组和三类技能，再决定 `CONFIRM` 或 `RESTORE`。

## 2026-07-26：管理端版本公告生成

- 状态：`committed`；新增管理页 `/admin/patch-notes`、管理首页入口、前端 API 和只读后端路由。
- 可视入口：管理首页卡片、桌面端“系统”下拉菜单和移动端“系统”子菜单均可进入；系统菜单激活态已包含该路由。
- 数据源：输入项目内相对目录，后端仅列出目录第一层 `.db`；选择旧/新数据库后，通过 `generate_patch_notes.js --stdout` 在内存生成 Markdown，不落地过程文件。
- 审核：公告按 `##` 模块和 Markdown 表格条目拆分；可逐条移除、整模块隐藏条目、恢复，并编辑、一键复制或下载最终 Markdown。审核区和最终 Markdown 区均可打开“公告弹窗预览”，使用与用户赛季公告相同的解析器、弹窗尺寸和样式。
- 精简规则：重点新增内容只保留一张代表图；异色专题只显示异色图；批量清单使用文字，不重复嵌入精灵、技能和属性图片；从空值补齐的个体值以及超过 80 条关系的批量技能学习同步不进入用户公告；零变更模块不生成。
- 图片来源：公告生成器优先使用新数据库 `pet_details.image_default/image_shiny` 的实际路径，不依赖预先生成 `thumbs/*.webp` 或推测异色 WebP 路径。BWIKI 新包导入会自动生成衍生图；`gen_thumbnails.js`、`gen_webp.js` 只用于历史存量修复。
- 安全：拒绝绝对路径、`..`、非 `.db`、同一文件和敏感/构建目录；子进程限制 60 秒与 32 MB 输出。
- 验证：Node 语法、Vue SFC、中文异常字符扫描通过。真实 S1→S2 公告由原先 660 个图片引用压缩到 77 个，其中精灵大图 19 张；S2→S3 为 38 个图片引用，其中精灵大图 8 张。尚未进行浏览器人工视觉验收、未部署。
- 下一步：用户重启本地 `npm run dev`，从管理首页进入“版本公告生成”，在弹窗预览中检查最终版式和图片密度；删除条目后仍需人工校正标题/概览数量。

## 2026-07-26：BWIKI 导入自动生成缩略图与 WebP

- 状态：`committed`；`wiki_staging.py import --apply` 在发布并写入原图数据库字段后，自动调用 `scripts/generate_image_derivatives.js`。
- 精灵本体生成 `data/public/pets/thumbs/<uid>_default.webp` 并写 `pets.thumb_url`；本体、异色、果实、精灵蛋、技能图标及按关联精灵展开的特性图标生成同目录 WebP，数据库正式图片字段继续指向原图。
- 所有衍生图通过既有 `publish_file` 发布并进入素材回滚清单；Sharp、完整性或外键任一步失败时，数据库事务、原图、缩略图和 WebP 统一回滚。DEV 向导新增衍生图和缩略图字段验证。
- 使用 `s3-2026-07-26-detail-fix` 和隔离数据库/图片目录回归：发布原图 521 个，生成缩略图 99 个、额外 WebP 443 个；回滚日志含 985 个文件，其中 WebP 542 个、特性 WebP 109 个；`integrity_check=ok`、外键错误 0。隔离目录已清理，未修改 DEV 正式数据库或 `data/public`，未部署。


## 2026-07-26：BWIKI 线上自动导入向导

- 状态：`committed`；新增 `scripts/wiki_server_import.sh`，默认只基于当前生产库快照执行完整隔离演练，追加 `--apply` 后才进入生产停机、备份、导入、验证和人工确认。
- 生产流程：Release/UTF-8/审核预检 → 隔离候选库与图片演练 → 精确输入 `APPLY-PRODUCTION <package_id>` → PM2 停机 → SQLite Backup API 持久恢复点 → 生产 dry-run → 数据、原图、缩略图和 WebP 导入 → 数据库/版本/图片校验 → PM2/API 恢复 → `CONFIRM` 或 `ROLLBACK`。
- 失败保护：生产写入后任一步失败或收到 `INT/TERM/HUP` 信号都会恢复 `roco-before-import.db` 和素材回滚清单；发布包含图片但清单缺失时保守保持服务停止。服务器日志和恢复点保存在 `app/server/data/backups/wiki-server-import/<session>/`。
- 同时修复 Dev 向导验证函数的退出码传播；之前报告中已有 errors 时仍可能继续打印 PASS。身高/体重范围现按 `~/-` 和尾随零进行语义比较。
- 本地只读回归：`s3-2026-07-26-detail-fix` 默认服务器模式完成 256 个数据项、41 个特性补全、186 个详情、555 组/8995 条技能、231 条最终蛋组、521 个原图和 620 个衍生图验证，errors=0；未传 `--apply`，未修改 DEV 正式库或 `data/public`。临时回归目录已清理。
- 下一步：代码部署到服务器后，先按 `BWIKI_SERVER_DEPLOY_SOP.md` 不带 `--apply` 演练；确认同一 Release 后再追加 `--apply`。真实 Linux PM2 停机/启动、生产健康地址和回滚尚未实际执行。

## 2026-08-02：前端性能优化第一批

- 状态：`committed`；实现已随当前 `main` HEAD 提交，原始基准为 `de6674420bf8550bf1f221adf116d98b12609a2f`。
- 修改范围：`app/client/src/api/index.js`、`FeedbackFAB.vue`、`PetDetail.vue`、`Pets.vue`、`Skills.vue`。
- 已完成：稳定公共参考数据 10 分钟内存缓存与同请求合并；反馈配置 5 分钟缓存；形态切换去除重复详情加载；精灵/技能筛选仅最后响应生效。
- 安全边界：未修改 Service Worker、管理端 API、数据库、服务端、图片策略或持久缓存；刷新页面可清空全部新增缓存。
- 验证：API `node --check`、4 个 Vue SFC 编译、缓存只保存成功响应及并发合并测试、中文异常字符扫描、`git diff --check` 均通过。未运行完整前端构建，未执行浏览器 Network 面板人工验收，未提交、未部署。
- 下一步：启动 DEV 后依次验证用户端页面切换不重复请求属性/克制数据、精灵形态每次只加载一轮、快速筛选不被旧响应覆盖、用户端与管理端往返时反馈按钮状态正确。

## 2026-08-03：用户端整体卡面 UI 首批交接

- 状态：`committed`；分支 `main`，原始基准 `eae205e44bd72212c7334bb09d1045a67eb88aa6`，部署状态未验证。
- 整体框架：`App.vue`、`main.scss` 和新增 `UserPageHeader.vue` 将用户端与管理端样式隔离；用户端普通内容卡片、筛选容器、空状态、分页、页脚与页头统一使用圆角、点阵纹理、柔和渐变和轻量阴影。
- 首页重构：公告、官方链接、数据概览、快速导航和数据声明均改为完整卡面；数据与导航卡增加编号、层叠底板、悬停反馈，亮色/暗色采用独立材质。项目既有官网同源 `MIANFEIZITI` 字体用于标题、数字和卡片名称，正文继续使用易读系统字体。
- 首批页面：精灵、技能、蛋组、性格、属性克制与打击面已接入共享用户页头；接口、路由、数据结构和服务端均未修改。
- 验证：前端 `npm run build`（Vite 117 modules、PWA、SEO）通过，`git diff --check` 与中文异常字符扫描通过；没有启动常驻服务，尚未完成浏览器人工视觉验收或部署验证。
- 下一步：用户在 DEV 中检查首页和六个列表页的亮色/暗色、桌面/手机效果；确认卡面密度后，继续迁移赛季、活动、皮卡月刊、命定花种和技能详情。