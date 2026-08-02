# RocoTools 功能状态

> 最近核验：2026-07-26
> 仓库 `main` 已包含文档合并点：`8c37af0d69f6af4f337dfa0f1db6e1904852a2ea`
> 产品代码基准：`419a62a553b2eab1e72bf9348eb140347707a136`
> 文档修复分支原基准：`848207a9561c43146c9cf6223c6f4829b22eec88`
> 状态词：`deployed`、`committed`、`working-tree`、`planned`、`deprecated`

## 已验证状态

| 功能/能力 | 状态 | Git 证据 | 验证方式 | 备注 |
|---|---|---|---|---|
| V1.0 核心站点 | deployed | `7d867be` | 站点 HTTP 200 | 用户端、管理端、爬虫和单库链路 |
| 用户反馈 | deployed | `b5234ca` 等 | `/api/feedbacks/enabled` HTTP 200 | 实现文档已按当前代码修正 |
| Service Worker / PWA | deployed | `343b6d1`、`cf0d63e` | `sw.js`、manifest HTTP 200 | AI memory 已修正 |
| BWIKI 新版适配 | committed | `dd4faea` | Git 与代码 | 线上构建日期匹配，但无生产 SHA |
| 命定花种增强 | committed | `15fc601` | Git 与代码 | 线上页面可访问，未做管理操作 |
| 技能课题抓取 | committed | `b51f526` | Git 与脚本 | 独立两阶段脚本 |
| Q 版头像 | deployed | `419a62a` | 线上邻居 API 返回 `avatar_url`，线上精灵详情构建包含该字段 | 生产 SHA 仍未知 |
| 管理端 Excel 整库导出 | committed | `550eb4a` | 路由与前端代码 | 不等于用户端报告导出 |
| 根目录一键开发启动 | committed | `codex/dev-mode` | 直接依赖完整性与 `npm run dev:check` 通过 | 同时启动 server/client；实际常驻重启由用户验证 |
| BWIKI 逐实体暂存、Diff 审核与选择性 JSON 导入 | committed | `scripts/wiki_staging.py`、`/admin/wiki-review` | 支持 `--all-skills`，并支持 `fetch-html` 从 UTF-8 浏览器 HTML 或 MediaWiki parse API JSON 完全离线生成基础暂存、按名称目录或显式映射补少量详情；在线抓取统一使用固定项目标识、Session 复用、串行 4～8 秒节流和有限退避，403/429/567 或验证页立即熔断，详情并发为 1；按规范化名称匹配 S2/S3；管理页按技能 → 特性 → 精灵三个 Tab 逐条审核并锁定阶段，每个实体再按需加载“有差异 / 已确认 / 无差异”；审核 GET 默认仅返回当前实体当前页 1 个完整候选，其他实体仅返回计数，审核 POST 不再回传列表，轻量汇总缓存 60 秒且可手动强制刷新；确认 `unmatched` 新实体后才下载可用素材，技能/特性卡显示图标，精灵卡同时显示本体、异色、果实、精灵蛋及特性信息；精灵仅比较/导入 `pets` 主表 11 个非身份基础字段，`version` 不参与 Diff；导入可用 --version 统一覆盖 skills/pets.version；全部审核后可用 `package` 排除忽略/无变化项，生成带 `change.json`、素材、清单、SHA-256 的目录和 ZIP，服务器 dry-run 自动验包；`clean` 默认只预览，限定 `wiki-staging` 路径、保护 pending、默认保留历史批次与发布包；Python 语法、离线 CLI、前端构建、路由级分页/筛选/素材读取、打包/验包、清理范围/待审核/越界保护、dry-run、backup 与 integrity 通过 | 本机当前缺少爬虫已有 `beautifulsoup4/lxml`，完整离线 HTML 夹具待在已安装 `crawler/requirements.txt` 的环境验证；在线策略未对 BWIKI 发请求验证且不能保证解除现有封禁；发布包不自动上传，暂存素材不自动发布到正式目录；原始 HTML 不入 Git；写库前备份 |
| 可移植 Agent 与上下文交接 Skill | committed | `a5f2ba4`～`848207a` | 已合并并推送到 `main`，上下文校验通过 | 尚未通过服务器 SHA 证明部署 |
| 双库隔离与发布 | planned | 无 | 全仓与全 Git 历史无相关符号 | 旧安全报告中的未提交实现不在当前仓库 |
| 精灵对比 | planned | 无 | README/AI memory 待办 | 范围待定义 |
| 用户端 Excel/PDF 报告 | planned | 无 | 待办与现代码对比 | 与管理端整库导出区分 |
| 文档一致性修复 | committed | `7735ecb`、合并点 `8c37af0` | 链接、命令、统计、状态和敏感信息扫描通过 | 已 fast-forward 进入并推送 `main` |
| 文档目录整理 | committed | `4ff7ac4`、合并点 `8c37af0` | 7 份正文归档、旧路径兼容入口、文档中心及链接验证通过 | 已 fast-forward 进入并推送 `main` |

## 当前仓库状态基线

- `main` 与 `origin/main` 均已包含文档合并点 `8c37af0`；产品代码最新提交仍为 `419a62a`。
- 当前工作分支：`codex/dev-mode`；父基准 `0b909d6`，本批 BWIKI 工具链已提交到功能分支，本轮合入 `main`，未部署。
- BWIKI 精灵基线处于 `committed`：推荐 `fetch --all-pets` 单次读取“精灵筛选”，详情页改由管理端按 UID 单独人工触发；基础字段确认前不下载素材，列表未提供的特性描述不制造删除差异。
- BWIKI 精灵身份匹配处于 `committed`：完整 UID 优先；UID 不存在时仅允许唯一同名记录兼容旧 UID，UID 与名称均不同则新增形态。唯一 `pet_id` 兜底仅用于远程无 UID；已验证 `pet_026_1` 精确关联、`pet_001_3` 和 `pet_031_1` 新增形态分类。
- BWIKI 正式图片分类处于 `committed`：不再按详情页图片出现顺序映射槽位；优先使用实际内容图片和语义标签，明确错槽的既有暂存素材会被隔离并从发布包排除，原文件不自动删除。
- BWIKI 多形态 UID 迁移处于 `committed`：单形态升级为多形态时，已有基础形态规划为 `_1`，新形态规划为 `_2` 起；审核页提供独立 UID 更新确认，导入器在事务中同步外键和受支持的 JSON 引用。
- BWIKI 无字段差异补图处于 `committed`：已匹配精灵即使基础字段相同，只要本地或暂存缺少正式图片，审核页可直接“只拉取缺失图片”；该决定不启用数据库字段导入，并以 `approved-reference` 将确认素材纳入发布包。
- BWIKI 审核候选快速定位处于 `committed`：有差异、已确认、无差异三个视图均返回轻量候选索引，前端选择后按页码加载单条详情。
- BWIKI 已确认精灵的缺失图片补抓处于 committed：详情页无 .allImgTab 时回退正文图片扫描，异色等正式槽位可继续进入暂存素材。
- BWIKI 无差异精灵补图入口处于 committed：可在无差异 Tab 主动请求官网详情，确认后转入已确认并随发布包导入。导入脚本支持 version 参数统一写入技能和精灵的 version 列。
- 文档一致性修复和目录整理已 fast-forward 合并并推送到 `main`，不含产品源码、schema 或运行数据。
- 已删除本地和远端的 `eachzhang/codex/context-handoff`、`eachzhang/codex/docs-drift`；其提交均由 `main` 保留。
- `SCRIPTS.md` 原行尾状态已通过工作区/索引哈希一致性确认并清除。
- 没有 stash；没有包含双库实现的其他可见分支。
- 可移植 Agent 与上下文交接 Skill 已合并并推送到 `main`，状态为 `committed`；生产部署仍未通过服务器 SHA 验证。

## 线上只读证据

2026-07-23 验证：

- `/rocotools/`：HTTP 200
- `/rocotools/sw.js`：HTTP 200
- `/rocotools/manifest.webmanifest`：HTTP 200
- `/api/seasons`：HTTP 200
- `/api/feedbacks/enabled`：HTTP 200
- `/api/stats`：374 精灵、495 技能、18 属性、15 蛋组、30 性格
- 线上首页与 `sw.js` Last-Modified：2026-06-10

没有读取生产 commit SHA，因此不能把“构建日期一致”提升为“生产代码逐字节等于 HEAD”。

2026-07-24 补充：

- 用户根据服务器现状确认生产仓库使用 `main` 分支。
- 从服务器下载的 `deploy.sh` 固定执行 `git pull origin main`；该脚本不运行数据库同步或校验。
- 只读 SSH 认证仍被服务器拒绝，因此生产 commit SHA、PM2 实际状态及线上构建与 commit 的精确对应关系仍未验证。
- 线上首页 Last-Modified 为 2026-06-10 17:00（北京时间），约晚于 `419a62a` 提交 4 分钟。
- 公开邻居 API 已返回 `avatar_url`，线上精灵详情构建也包含该字段，因此 Q 版头像可确认已部署；该证据只能证明线上包含 `419a62a` 引入的功能，不能替代服务器 `git rev-parse HEAD`。
- 线上入口资源哈希与当前本地构建不同，不能据此宣称生产构建与本地 HEAD 逐字节一致。


- Pet review detail snapshot: committed; confirmation/backfill stages BWIKI height, weight, three skill categories, and egg groups and displays them in the confirmed view. Live database import of these supplementary fields is not yet enabled by the staging importer.


- Pet supplementary refresh action: committed; available in confirmed and unchanged views and refreshes the complete staged detail snapshot plus missing images.


- Pet skill detail rendering: committed; review cards now use local skill-list metadata with staged Skill review fallback.


- Pet skill matching/image fallback: committed; scans local skills first, then active/version staging skill lists, with normalized names and local UID icon fallback.


- Pet form identity fallback: committed; same pet_id/form-name candidates now resolve to the lowest existing UID ordinal before classifying a remote form as new.

- Pet review local association: committed（staging-only, pending validation）

- Wiki review API/server syntax: committed (validated)

- AdminWikiReview Chinese UI labels: committed (SFC validated).

- BWIKI 审核页中文显示与服务端图片分类修复：committed（SFC/Node 语法与图片规则定向测试通过；真实页面验收待执行）。

- BWIKI 精灵 UID/名称冲突身份决策：`committed`。精灵为“同名但 UID 不同”或“同编号但名称不同”时，必须人工选择“更新现有（保留本地 UID）”或“作为新形态新增（使用远程 UID）”；远程已有完整 UID 时，唯一同编号但名称不同的本地记录只作为参考，未来重新比对会把远程记录判定为新增形态。前后端共同阻止未选择身份的字段接受，并在暂存导入计划记录决策来源。本轮合入 `main`，未部署。
- BWIKI 精灵详情异色图补全：`committed`。已修复 `.allImgTab` 仅扫描果实类图片导致本体/异色/蛋遗漏的问题；伊贝儿真实 DOM 与四槽位定向解析测试通过，尚待用户重启 API 后执行一次审核页补图验收，未部署。
- BWIKI DEV 本地导入验证闸门：`committed`。新增 `scripts/wiki_dev_import.sh`，逐步执行发布包预检、SQLite Backup API 测试库、dry-run、测试库真实导入、逐 UID/版本/迁移/外键验证、DEV 备份与导入，并在人工页面验收后支持确认、保留待查或恢复。使用 `s3-2026-07-25-03` 的 `--test-only` 隔离演练通过：256 项（89 技能、167 精灵、6 UID 迁移），`integrity_check=ok`、外键 0；未写 DEV 正式库、未部署。
- BWIKI 精灵形态标签语义匹配：`committed`。同编号候选在基础名兜底前先比较括号形态标签，并兼容“储水时/储水期”同义写法；地鼠与板板壳回归通过，未部署。
- BWIKI UID 迁移打包：`committed`。`approved-uid-migration + enabled=true` 现被识别为合法数据库导入项；真实审核批次临时打包回归通过，未部署。
- BWIKI Batch 可视化工作流：`committed`。管理端审核页现在支持创建并命名 Batch、修改显示名称、选择任意 Batch 审核、后台拉取技能或精灵/特性、查看任务步骤与日志、完成审核后校验并生成/下载发布 ZIP。稳定 Batch ID 与可编辑名称分离；审核缓存按 Batch 根目录隔离。尚未真实访问 BWIKI、未执行正式打包或数据库导入，未部署。
- BWIKI 发布包素材、特性补全与图片衍生物导入：`committed`。schema v2 包为 `approved-reference` 特性保留 `import.json`；导入器将本体/异色/果实/精灵蛋/技能图标/特性图标原图发布到 `data/public` 并写数据库 URL，随后自动生成本体缩略图、写 `pets.thumb_url`，并为正式图片生成同目录 WebP。原图、衍生图与数据库共用回滚窗口和素材日志。最新隔离完整包验证 256 个数据库项、41 个特性补全计划、521 个发布原图、99 个缩略图、443 个额外 WebP；日志包含 109 个特性 WebP，完整性和外键均通过。真实 DEV 数据与正式图片目录未由本轮测试写入，未部署。


## 2026-07-26：BWIKI 临时目录文档状态

- 状态：`committed`。三段 BWIKI SOP 已区分项目内 `tmp/`、Batch、Release、DEV 正式图片目录和服务器持久恢复目录，并记录导入会话内测试库、日志、报告、数据库备份与素材回滚文件的生命周期。
- 当前仅完成清点和文档整理，未删除任何临时目录，未修改 DEV 数据库或正式图片。
- BWIKI 精灵详情关系导入：`committed`。Release 现保留已审核的身高、体重、蛋组及三类技能快照，包括无图片的 `approved-reference` 精灵；导入器按最终 UID 写入 `pet_details`、`pet_skills`、`pet_egg_groups`，保留有效人工身高/体重和人工蛋组，远程空技能类别不清空本地关系。隔离完整包验证 179 个详情、534 个技能分类/8662 条技能关系、217 条蛋组关系；增强向导复核 358 个详情字段、534 个分类、8662 条技能和 221 条最终蛋组关系，错误 0，完整性与外键通过。未写 DEV 正式库、未部署。

- 版本公告管理端可视化：`committed`。管理端 `/admin/patch-notes` 可选择项目内指定目录第一层的两个 SQLite，逐条移除或恢复公告内容，并编辑、复制和下载最终 Markdown；新增与用户赛季公告相同样式的弹窗预览。生成器已压缩图片密度：重点内容保留代表图，批量清单文字化，纯补录及超大批量技能关系不进入公告，零变更模块不生成。真实 S1→S2 从 660 个图片引用降至 77 个（大图 19），S2→S3 为 38 个（大图 8）；比对只读、不创建过程文件，未部署。

- BWIKI 线上自动导入向导：`committed`。新增默认只读候选演练、生产精确确认、PM2 停机窗口、持久 SQLite/素材恢复点、导入后数据库与图片校验、API 冒烟及 `CONFIRM/ROLLBACK` 的 `scripts/wiki_server_import.sh`；本地默认模式完整回归通过，未执行生产 `--apply`、未部署。

## 2026-08-02：前端性能优化第一批

- 状态：`committed`。公共属性列表、属性详情、克制关系和性格接口增加 10 分钟纯内存成功响应缓存及并发请求合并；刷新页面即清空，不缓存管理端或搜索结果。
- 精灵形态切换移除重复 `loadPet`，统一由路由 UID 监听加载；精灵与技能筛选使用响应序号，只有最后发起的请求可以更新页面。
- 反馈启用配置增加 5 分钟纯内存缓存，并在管理端返回用户端时从缓存恢复显示状态。
- 已通过 API JavaScript 语法、4 个 Vue SFC 编译、缓存失败重试/并发合并行为、中文异常字符扫描和 `git diff --check`；尚未执行浏览器 Network 面板人工验收，未提交、未部署。
