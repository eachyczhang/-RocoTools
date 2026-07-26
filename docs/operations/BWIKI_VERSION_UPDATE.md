# BWIKI 版本更新与服务器同步

> 本文现在只作为入口索引。执行时请按三个阶段分别阅读，先在 Dev 完成审核和本地导入验证，再进入服务器部署。

## 阶段一：Dev 环境校验、比对与打包

阅读：[BWIKI_DEV_DIFF_SOP.md](BWIKI_DEV_DIFF_SOP.md)

本阶段只在开发机执行：

- 回拉服务器数据库和图片，建立线上基线；
- 在管理端创建、命名或选择独立 Batch；
- 通过页面后台任务拉取 BWIKI 技能、精灵基础数据和特性；
- 按技能 → 特性 → 精灵顺序审核，并可随时切换要审核的 Batch；
- 在“有差异 / 已确认 / 无差异”视图中确认字段、UID 和图片；
- 在页面校验审核门禁并生成、下载发布 ZIP；
- 对发布目录执行 manifest SHA-256 校验和 import dry-run，不连接生产数据库。

## 阶段二：Dev 本地导入演练与页面验证

阶段一生成发布包后，使用仓库脚本逐步完成测试库演练、DEV 导入、自动校验和人工页面验收。不要再手工复制数据库或拼接多段 Python 命令。

### 1. 停止 DEV 服务

如果 `npm run dev` 正在运行，先在对应终端按 `Ctrl+C`。脚本检测到 `http://localhost:3000/api/stats` 仍可访问时会拒绝继续，防止在 SQLite 正被服务使用时导入或恢复。

### 2. 执行导入向导

在项目根目录的 Git Bash 中执行：

```bash
bash scripts/wiki_dev_import.sh \
  --release "data/wiki-releases/本次发布包目录" \
  --version "S3"
```

如只想验证发布包和测试数据库，不写入 DEV 数据库：

```bash
bash scripts/wiki_dev_import.sh \
  --release "data/wiki-releases/本次发布包目录" \
  --version "S3" \
  --test-only
```

脚本固定按以下顺序运行，前一步失败就不会执行后一步：

1. 检查发布包、`manifest.json`、待审核数量、DEV 数据库完整性和外键。
2. 使用 SQLite Backup API 在 `tmp/wiki-dev-import/时间-进程号/` 创建独立测试库，不会遗漏 WAL 中的数据。
3. 对测试库执行 import dry-run。
4. 对测试库执行真实 import `--apply`。
5. 逐项验证测试库：完整性、外键、技能/精灵 UID、统一版本号、UID 迁移、特性描述关联、身高/体重、蛋组、三类精灵技能关系，以及原图 URL/SHA-256、同目录 WebP、精灵缩略图和 `pets.thumb_url`。
6. 只有输入 `APPLY-DEV`，才生成 DEV 导入前独立备份。
7. 对 DEV 数据库再次 dry-run，随后真实导入。
8. 对 DEV 数据库重复逐项验证，并停在人工页面验收。

测试库通过后，终端会显示：

```text
[PASS] 测试库演练通过。
输入 APPLY-DEV 才会继续：
```

- 输入 `APPLY-DEV`：备份并导入真正的 DEV 数据库。
- 输入其他内容：安全停止，DEV 数据库不变。

### 3. 查看错误和报告

每一步都有独立日志。任何失败都会明确输出：

- 失败的步骤名称；
- 命令退出码；
- 对应 `.log` 文件路径；
- 最近 20 行错误；
- 已生成的 DEV 恢复备份路径。

本次目录示例：

```text
tmp/wiki-dev-import/20260726-153000-1234/
├── 01-preflight.log
├── 03-test-dry-run.log
├── 04-test-apply.log
├── 05-test-verify.log
├── test-report.json
├── dev-before-import.db
├── 07-dev-import.log
├── 08-dev-verify.log
└── dev-report.json
```

`test-report.json` 和 `dev-report.json` 会记录导入前后数量、版本号、验证实体数和具体错误。未通过自动验证时不得进入页面验收或服务器阶段。

### 4. 人工页面验收

脚本显示 `[PASS] DEV 数据库导入与自动检查通过` 后，保持脚本终端打开，在另一个 Git Bash 终端启动：

```bash
npm run dev
```

人工检查：

1. 管理端技能列表和详情：新增、威力、描述、属性、分类和版本号。
2. 管理端精灵列表和详情：新增/替换结果、基础六维、名称、特性和版本号。
3. UID 改动：旧 UID 不再出现，新 UID 正常显示；形态列表、技能关联和特性关联没有断裂。
4. 管理端精灵详情：身高、体重、蛋组，以及精灵技能、血脉技能、技能石技能的数量、等级和详情是否正确。
5. 管理端特性：本地空描述是否补齐，新增特性是否关联到正确精灵。
6. 公共页面和 `http://localhost:3000/api/stats` 是否正常。
7. 抽查本次确认过的记录，确认是“替换现有”还是“作为新形态新增”，与审核决定一致。

`import --apply` 会在同一事务检查窗口内导入基础记录与精灵详情关系，并把发布包原图复制到 `data/public`。发布原图后会自动调用 Sharp：精灵本体生成 `pets/thumbs/<uid>_default.webp` 并写入 `pets.thumb_url`；本体、异色、果实、精灵蛋、技能图标和按关联精灵展开后的特性图标生成同目录同名 `.webp`。数据库正式图片字段仍索引发布包原图，WebP 是页面性能衍生物，原图不会被替换。身高、体重只填补本地空值或含 `�` 的损坏值，不覆盖有效人工值；远程某类技能列表非空时才替换对应的 `pet_skills.skill_type`，空列表不会清空本地关系；技能必须按 UID 或唯一规范化名称解析到全局 `skills` 表，否则导入阻断。蛋组有有效远程值时写入 `pet_egg_groups`，已标记 `manual_edit=1` 的本地蛋组关系优先保留。特性图标按特性名称展开到全部关联精灵，特性描述只补本地空值。测试阶段使用隔离图片目录，DEV 阶段才写正式 `data/public`；生成失败会阻断导入，数据库、原图、缩略图和 WebP 一并回滚，成功后全部进入素材回滚清单。`gen_thumbnails.js`、`gen_webp.js` 仅用于历史存量修复，不再是 BWIKI 导入后的手工步骤。

### 5. 把人工结果交回脚本

完成页面检查后，先在运行 `npm run dev` 的终端按 `Ctrl+C`，再回到脚本终端输入：

- `CONFIRM`：人工确认导入/替换成功，允许进入阶段三。
- `RESTORE`：用本次 `dev-before-import.db` 通过 SQLite Backup API 恢复 DEV，并再次检查完整性和外键。
- `KEEP`：暂时保留 DEV 导入结果继续排查，但脚本以未验收状态结束，不得部署服务器。

只有脚本自动检查全部通过并最终输入 `CONFIRM`，才进入服务器阶段。

## 阶段三：服务器验包、导入与上线

阅读：[BWIKI_SERVER_DEPLOY_SOP.md](BWIKI_SERVER_DEPLOY_SOP.md)

本阶段在服务器使用统一向导执行。先在线隔离演练，不停止 PM2、不写生产库：

```bash
bash scripts/wiki_server_import.sh \
  --release data/wiki-releases/S3/s3-2026-07-26-detail-fix \
  --version S3
```

演练通过后，用同一 Release 追加 `--apply`：

```bash
bash scripts/wiki_server_import.sh \
  --release data/wiki-releases/S3/s3-2026-07-26-detail-fix \
  --version S3 \
  --apply
```

向导会再次演练，并依次完成精确确认、PM2 停机、持久数据库恢复点、生产 dry-run、单事务数据与图片导入、缩略图/WebP、数据库和素材校验、PM2/API 恢复以及最终 `CONFIRM` 或 `ROLLBACK`。详细输入和恢复目录见服务器 SOP。

## 不可跳过的安全边界

- package/import 默认 dry-run，只有显式 --apply 才写数据库。
- Dev 数据库副本演练和 DEV 页面验证未通过时，不得进入服务器导入。
- 发布包导入会同时复制图片并写入数据库图片索引；必须保留导入器生成的数据库备份、素材备份和素材回滚清单。
- UID 不允许直接手改，必须使用审核生成的迁移计划。
- 未通过验包、身份确认、外键检查或线上验证时，不得清理批次和备份。


## 本地 `tmp/` 目录在三阶段中的位置

`tmp/` 只服务于阶段二的隔离演练、日志和恢复，不替代阶段一的 Batch/Release，也不上传到阶段三的服务器。

```text
data/wiki-staging/batches/<batch>   阶段一审核源数据，必须保留到发布完成
data/wiki-releases/<release>        阶段一正式发布目录，阶段二和阶段三共同使用
tmp/wiki-dev-import/<session>       阶段二单次本地导入会话、测试副本和恢复点
data/public                         DEV 正式图片目录，仅 APPLY-DEV 后可能变化
app/server/data/backups/wiki-server-import/<session>  阶段三持久日志、数据库和素材恢复点
```

阶段二结束时按以下规则判断：

- 选择 `CONFIRM`：会话仍建议保留到服务器上线并完成最终验证，之后可整目录归档或删除。
- 选择 `RESTORE`：先确认数据库、图片和页面确实恢复，再保留该会话到问题复盘结束。
- 选择 `KEEP`、输入错误、脚本中断或恢复失败：禁止清理该会话。
- 只运行 `--test-only`：不会修改 DEV 正式库；测试日志不再需要且正式新包已验证后，可整会话删除。
- `wiki-import-asset-fix-*` 是 2026-07-26 修复过程的可重建验证产物，不得作为线上发布包使用。

详细文件说明见 [BWIKI_DEV_DIFF_SOP.md](BWIKI_DEV_DIFF_SOP.md#7-项目内-tmp-的作用和保留规则)。当前仍有恢复价值的会话和实际占用记录在 `docs/ai/HANDOFF.md`。
