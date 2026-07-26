# BWIKI Dev 环境：版本比对与发布包 SOP

适用：在开发机完成一次 BWIKI 版本更新的抓取、审核、验证和打包。不连接生产数据库，不上传生产图片。

## 1. 在管理端创建并选择 Batch

启动开发环境：

```bash
npm run dev
```

打开管理端“BWIKI Diff 审核”。页面顶部的 Batch 工作流负责本阶段全部操作：

1. 输入本次版本的中文名称并点击“创建”。
2. 系统生成稳定 Batch ID，并把显示名称写入 `.batch.json`。
3. 后续可修改显示名称；稳定 ID、目录、审核决定和发布引用不会改变。
4. Batch 下拉框可随时切换要审核的数据，每个审核、图片和决定请求都会携带 Batch ID，不共用另一个 Batch 的缓存。

已有的 `data/wiki-staging/batches/*` 即使没有 `.batch.json` 也会自动显示，默认名称为目录 ID。不要在资源管理器中直接改目录名；在页面修改显示名称即可。

## 2. 建立服务器基线

```bash
bash scripts/sync_from_server.sh --db
bash scripts/sync_from_server.sh --images
```

首次同步或明确要求全量图片时才使用 `--images --full`。同步完成后不要运行 `sync_db.js --full`，避免把其他 JSON 混入比对基线。

## 3. 在页面拉取 BWIKI 基础数据

选中本次 Batch 后，可选择：

- “拉取技能”：执行当前技能列表抓取；
- “拉取精灵与特性”：只读取一次“精灵筛选”页，生成精灵基础数据和特性候选；
- “依次拉取全部”：先技能，后精灵与特性，确保三类数据进入同一个 Batch。

任务在服务端后台运行，页面显示当前步骤和最近日志。抓取继续使用项目现有的 Session、串行节流、有限退避和封禁熔断；关闭页面不会主动取消任务，但重启 API 会丢失内存任务状态并终止其子进程，需要检查 Batch 内容后再决定是否重跑。初次抓取不下载正式图片，图片仍只在审核确认或补图时请求详情页。

如页面任务失败，可使用 CLI 作为排障后备；日常版本更新优先使用页面，不再要求 `fetch-html`。

## 4. 选择 Batch 并审核

在顶部 Batch 下拉框选择目标后，按“技能 → 特性 → 精灵”审核。每类分别使用“有差异 / 已确认 / 无差异”视图，选择器可按名称、编号或 UID 定位。

- 技能：只确认需要导入的字段。
- 特性：只处理名称、新增和本地缺少描述；已有本地描述不被远程覆盖。
- 精灵：只比较基础字段，`version` 不参与 Diff。
- 无差异精灵：如官网补充了异色等图片，在“无差异”中确认补图；它只下载缺失图片，不导入基础字段。
- UID 变化：必须单独确认 UID 迁移。
- 身份冲突：必须明确选择“更新现有”或“作为新形态新增”。
- 形态名称匹配：完整 UID、完整名称和括号形态语义优先；不可靠的同编号候选仍需人工关联。

切换 Batch 只改变当前审核上下文，不会合并两个 Batch。一个发布包只能来源于一个 Batch，因此技能、特性和精灵必须在开始打包前都存在于同一 Batch。

## 5. 在页面校验并生成 ZIP

全部审核完成后，在页面填写发布包名称并点击“校验并打包 ZIP”。后台任务调用同一套 `package` 校验：

- 阻止任何 `pending` 或身份歧义项；
- 只收录已确认数据库变更和已确认素材；特性补全项同时保留描述、关联精灵和图标导入计划；
- 保留合法的 `approved-uid-migration`；
- 生成 `manifest.json`、逐实体 `change.json` / `import.json`、素材和 SHA-256；
- 同时生成发布目录和 ZIP。

完成后页面显示“下载 ZIP”。如果发布包名称已存在，必须换一个名称，系统不会覆盖旧发布包。

下载后仍需执行 import dry-run：

```bash
RELEASE="data/wiki-releases/本次发布包目录"
python scripts/wiki_staging.py import --input "$RELEASE"
```

需要写入统一版本号时，只在后续 DEV 导入演练和正式导入阶段明确提供 `--version`。
## 6. Dev 交付物

交付：发布 ZIP、解压目录、`manifest.json`、审核摘要、目标版本号，以及本批次的 UID 迁移清单和图片清单。不要交付生产数据库文件或明文凭据。



## Pet detail snapshot during confirmation

When a pet review is confirmed, the review service requests that pet's BWIKI detail page once. It stores height, weight, the three skill-source lists, and egg groups in remote.json.detail and import.json.detail, alongside the existing formal image assets. The confirmed view renders this snapshot. Existing confirmed pets without a snapshot expose a fetch-images-and-detail backfill action. This action writes only staged JSON and assets; it does not write the live database. Review the snapshot before packaging.


For both the confirmed and unchanged pet views, the supplementary action is always available. It refreshes the detail page even when all four formal images already exist, then stores the six parsed stats plus height, weight, three skill groups, and egg groups in the staged detail snapshot.


Pet skill snapshots use the local skills table as the primary catalog. If a skill is absent there, the review endpoint searches staged skill-review remote.json records by name and marks the source; unmatched cards include a link to the Skill review tab. Each card shows icon, element, category/type, level, cost, power, and description.


Skill matching order is deterministic: normalize the name with Unicode NFKC and remove whitespace/punctuation, then match the local skills table; if absent, scan the active staging root and all version batch skill folders. The card uses the matched icon URL (or the standard local UID path), and unresolved names remain linked to Skill review.


For form identity, a remote UID such as pet_012_3 is not automatically treated as a new entity. When the same pet_id exists locally, local parenthetical form labels are stripped for comparison; a shared form name maps to the lowest existing ordinal (for example pet_012_1). Only when no safe form-name candidate exists is the record shown as uid-new-form.

## 2026-07-25：待审核新增精灵可手动关联本地记录

- 精灵 `unmatched`、身份歧义以及名称/UID 冲突候选均显示“关联本地精灵”按钮。
- 选择器复用 `PetPicker`，开启全部形态；确认后只改当前 staging 的 `local.json`、`diff.json`、`import.json`，不会直接写数据库。
- 关联会把本地 UID/基础数据作为比较基准并重建差异；随后仍需按字段审核。远程 UID 与本地 UID 不同会标记为人工关联的 UID 差异，避免把已有记录误判为新增。
- 未实现自动导入线上；部署前仍需导出并人工检查 import 包。


## 7. 项目内 `tmp/` 的作用和保留规则

`tmp/` 是开发机上的可重建测试区和恢复区，不是 Batch、正式发布包或正式图片目录。它与 `data/wiki-staging/`、`data/wiki-releases/`、`data/public/` 的职责不同：

| 路径 | 作用 | 是否影响 DEV 正式数据 | 何时可删 |
|---|---|---:|---|
| `tmp/wiki-dev-import/<时间>-<进程号>/` | 一次 `wiki_dev_import.sh` 会话的测试库、日志、报告和恢复文件 | 只有输入 `APPLY-DEV` 的会话会修改 DEV | 完成 `CONFIRM` 且不再需要回滚后，按整个会话删除 |
| 会话内 `roco-import-test.db` | 从 DEV 库用 SQLite Backup API 生成的隔离测试副本 | 否 | 会话确认结束后 |
| 会话内 `test-public/` | 测试库导入时隔离发布的图片 | 否，不是 `data/public` | 会话确认结束后 |
| 会话内 `test-report.json`、`dev-report.json` | 导入前后数量、版本、UID、图片和错误校验报告 | 否 | 建议随会话保留到本版本上线完成 |
| 会话内 `01-...08-*.log` | 各步骤执行日志；数字表示执行顺序 | 否 | 排障结束且版本上线完成后 |
| 会话内 `dev-before-import.db` | 输入 `APPLY-DEV` 前创建的 DEV 导入前备份 | 是恢复依据 | 未 `CONFIRM`、发生异常或仍可能回滚时禁止删除 |
| 会话内 `dev-assets.json` 和素材备份目录 | 正式 `data/public` 文件的回滚清单与旧文件副本 | 是图片恢复依据 | 数据库和页面均确认、且不再回滚后 |
| 会话内 `backups/wiki_staging_*.db` | 导入器针对当次测试库或 DEV 库生成的附加备份 | 取决于该次命令目标 | 先读日志确认目标库，再随会话处理 |
| `tmp/backups/wiki_staging_*.db` | 导入目标数据库位于 `tmp/` 根目录时，导入器自动创建的同级备份；当前文件来自图片/特性修复测试库 | 否，不是 DEV 正式库备份 | 正式新包验证完成后可与对应测试库一起清理 |
| `tmp/wiki-import-asset-fix-*` | 图片/特性导入修复期间的临时发布包、ZIP、测试库和隔离图片 | 否 | 修复回归完成且正式新包已重新生成后，可整体清理 |

重要边界：

- 不要把 `tmp/` 当作正式发布来源；正式发布来源只能是 `data/wiki-releases/<release>/` 或由其生成的 ZIP。
- 不要把 `tmp/` 加入 Git，其中可能包含数据库副本、审核数据和大量图片。
- 不要按单个文件随意删除导入会话。恢复依赖 `dev-before-import.db`、`dev-assets.json` 和素材备份目录彼此对应。
- 当前导入未验收或恢复失败时，整个会话目录必须原样保留。
- 清理前先停止 `npm run dev`，确认没有导入脚本正在运行，并用 `du -sh tmp/*` 只读查看占用；不要用模糊通配符删除整个项目 `tmp/`。

## 8. 精灵详情快照如何进入发布包

精灵在“有差异”“已确认”或“无差异”视图中执行“刷新图片和详情/补充基础数据”后，`import.json.detail` 可包含身高、体重、蛋组、精灵技能、血脉技能和技能石技能。打包器即使没有新增图片、基础字段也未启用，仍会把已审核的非空详情快照放入 Release；因此“仅补详情”的精灵不会被遗漏。

正式导入规则：

- 身高、体重写入 `pet_details.height/weight`，只补空值或损坏值，保留有效人工录入。
- 三类技能分别写入 `pet_skills.skill_type = skills / bloodline_skills / learnable_stones`；仅替换远程非空类别，远程空列表绝不清空本地数据。
- 每条技能必须按 `skill_ref_uid` 或唯一规范化名称命中全局 `skills` 表；无法唯一命中时阻断导入，应先完成技能审核并重新打包。
- 蛋组写入 `pet_egg_groups`；若本地已有 `manual_edit=1` 关联，则保留人工关系。
- UID 迁移先完成，再按最终 UID 写详情和关系；旧 UID 被新形态复用时，两只精灵分别获得各自的详情。
- 图片导入保留发布包原图并写正式数据库图片字段；精灵本体自动生成 `pets/thumbs/<uid>_default.webp` 和 `pets.thumb_url`，本体/异色/果实/精灵蛋/技能图标/特性图标自动生成同目录 WebP。
- 图片生成和数据库写入共用一次导入回滚窗口；任何一步失败时恢复数据库及被替换文件，并删除当次新增的原图和衍生图。历史存量缺图才单独使用 `gen_thumbnails.js` / `gen_webp.js`。

`scripts/wiki_dev_import.sh` 会在测试库和 DEV 库分别自动核对上述字段与关系，并验证原图 SHA-256、缩略图、WebP 和 `pets.thumb_url`。自动校验通过后，仍需在精灵管理详情页人工核对三类技能卡片、等级、身高、体重、蛋组和四类正式图片显示。
