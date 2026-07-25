# BWIKI 逐实体暂存与 JSON 导入

该工具用于把 BWIKI 的精灵基础数据、技能和特性数据抓取到隔离目录，人工审阅后再选择性导入本地 SQLite。精灵范围只包含 `pets` 主表基础字段；不会暂存或导入精灵详情、技能组和蛋组，也不会覆盖正式的 `data/pets/*.json`、`data/skills/*.json`。精灵全量基线只请求一次“精灵筛选”页；已有精灵先显示本地正式图片并只补缺失项，新增精灵确认时请求当前精灵详情页，尽可能抓取正式图片。

## 适用场景

- 新赛季一次性拉取全部 BWIKI 文本和数值。
- 按精灵编号、技能 UID、BWIKI 技能资源编号或名称定向拉取。
- 保留本地手工数据，只选择需要接受的远程字段。
- 每个精灵、技能、特性分别保存到独立目录。

## 当前 BWIKI 基线

2026-07-24 通过 MediaWiki API 实测：精灵表为 592 个形态，技能表为 553 条。该口径是远程暂存源数量，不是本地数据库数量；每次抓取以新生成的 `manifest.json` 为准。

暂存目录是累积式工作区。重复抓取会更新命中的实体目录，不会自动删除其他 `import.json`；执行导入前必须先运行 dry-run 核对全部 `enabled=true` 项。

## 抓取

```bash
# 推荐：一次请求精灵筛选页，暂存全部精灵名称、属性、特性名称和基础数值
python scripts/wiki_staging.py fetch --all-pets

# 只暂存全部技能；初次抓取不下载图标
python scripts/wiki_staging.py fetch --all-skills

# 仅在确有需要时，对指定精灵额外请求详情页；全量模式禁止使用 --with-details
python scripts/wiki_staging.py fetch --pet 001 --with-details

# 只抓指定技能：支持本地 skill_N、技能名称或 BWIKI 图片中的 source_id
python scripts/wiki_staging.py fetch --skill skill_496 --skill 718014

# 只抓指定特性
python scripts/wiki_staging.py fetch --ability 氧循环

```

## 从保存的 HTML 离线暂存

当 BWIKI 限流、无法稳定访问，或数据由编辑人员转交时，不需要整站源码包。精灵基线只需准备浏览器保存的“精灵筛选”页面；需要技能时再单独准备“技能查询”。也可以使用 MediaWiki `action=parse` 接口保存的 JSON。输入文件必须是 UTF-8，离线命令不会访问网络或下载图片：

```bash
python scripts/wiki_staging.py fetch-html \
  --all-pets \
  --pet-list-html "wiki-input/精灵筛选.html" \
  --output "$BATCH" \
  --db "$DB"
```

若另有少量精灵详情页，把文件名改为精灵名称，例如 `迪莫.html`，放入同一目录后追加：

```bash
python scripts/wiki_staging.py fetch-html \
  --pet 001 \
  --pet-list-html "wiki-input/精灵筛选.html" \
  --pet-detail-html-dir "wiki-input/pet-details" \
  --output "$BATCH" \
  --db "$DB"
```

文件名无法与精灵名称一致时，可显式指定 `--pet-detail-html "迪莫=wiki-input/pages/page-001.html"`，参数可重复。详情目录只读取顶层 `.html`、`.htm`、`.json`；目录内可以保留其他精灵文件，只有当前选择器命中的文件会进入本次暂存。离线来源只在 `manifest.json` 记录文件名，不记录本机绝对路径；原始 HTML/API JSON 不得提交到 Git。

没有详情文件时仍可生成精灵和技能的基础 Diff；特性描述、特性图标和精灵素材 URL 可能不完整，应先审核基础差异，再对少量候选补详情 HTML。离线输入和在线抓取使用同一套名称匹配、字段白名单、审核、打包和导入规则。

输出默认位于本地忽略目录 `data/wiki-staging/`：

```text
data/wiki-staging/
├── manifest.json
├── pets/pet_001/
│   ├── remote.json
│   ├── local.json
│   ├── diff.json
│   ├── import.json
│   ├── assets.json                 # 确认基础差异或新增后出现
│   └── images/{image_default,image_shiny,image_fruit,image_egg,ability_icon}.png
├── skills/skill_496/
│   ├── remote.json
│   ├── local.json
│   ├── diff.json
│   ├── import.json
│   ├── assets.json
│   ├── image.json                  # 兼容旧技能暂存批次
│   └── images/icon.png             # 扩展名以实际响应类型为准
└── abilities/ability_<hash>/
    ├── remote.json
    ├── local.json
    ├── diff.json
    ├── import.json
    ├── assets.json
    └── images/icon.png
```

`remote.json` 是 BWIKI 只读参考快照，`local.json` 是当前本地 SQLite 快照，`diff.json` 是逐字段差异，`import.json` 是可人工编辑的导入清单。远程图片 URL 只作为 `assets.*.remote_url` 审核元数据，不参与业务字段差异。技能使用 `icon`，特性使用 `icon`，精灵使用 `image_default`、`image_shiny`、`image_fruit`、`image_egg` 和 `ability_icon`。

## 与手工录入数据比对

抓取时会自动生成一次比对。若之后在管理端或数据库中修改了本地数据，不需要重新请求 BWIKI，执行：

```bash
python scripts/wiki_staging.py compare
```

脚本只读取 `remote.json` 和本地 SQLite，然后重写各实体目录中的 `local.json`、`diff.json`，不会写数据库。

`diff.json` 先记录身份匹配，再记录业务字段差异：

- 精灵、技能和特性以去除空白后的名称作为匹配键；名称是当前跨 S2/S3 的主身份依据。
- `identity.status=matched`：名称唯一且本地/远程内部编号也一致。
- `identity.status=name-match-id-different`：名称唯一匹配，但 UID 或精灵编号不同。编号只放在 `identity.remote/local` 中作为特殊身份差异，不计入普通字段差异；导入前必须把 `identity_confirmed` 明确改为 `true`。
- `identity.status=id-match-name-different`：精灵完整 UID 已匹配但名称不同；仍加载该 UID 的本地数据供比较。远程有完整 UID 但本地不存在时，只允许规范化名称唯一匹配来兼容旧 UID；UID 与名称都不匹配时按 `uid-new-form` 新增形态审核，同编号旧形态仅作参考。只有远程没有 UID 时，才允许唯一 `pet_id` 兜底。
- `identity.status=unmatched`：没有同名本地记录；`ambiguous`：同名候选不唯一。这两种情况的 `fields` 为空，`comparison_status=skipped-identity-unresolved`，不会把整条远程记录误报成字段差异，也不能直接导入。
- 名称是匹配键；BWIKI `source_id`、远程 UID、本地 UID 和精灵编号属于来源/身份元数据。它们都不作为描述、属性或数值差异；现有实体的名称和编号也不能通过普通字段导入改写。

身份确认后，业务差异区含义如下：

- `summary.manual_edit` 表示本地对应实体是否被标记为人工维护。
- `fields.<字段>.status` 为 `same`、`changed`、`remote-only` 或 `local-only`。
- `fields.<字段>.local` 与 `remote` 保留两边原值，便于人工决定。
- 精灵只比较 `element`、`sub_element`、`ability_name`、`ability_desc`、`hp`、`speed`、`atk`、`matk`、`def`、`mdef`、`total`；`collections` 为空。
- `version` 不参与技能、精灵或特性的业务字段差异。发布包导入时可通过 `import --version <版本号>` 统一写入支持该列的技能和精灵表；不传参数则保留原有导入值。

比对结果不会自动决定谁正确。身份状态为 `name-match-id-different`、`id-match-name-different`、`unmatched` 或 `ambiguous` 时，先核对 `identity.remote/local/candidates`；确认确实是同一实体或确实要新增后，再把 `identity_confirmed` 改为 `true`。之后才设置 `enabled=true` 并选择普通字段。精灵详情、进化、克制、技能组、蛋组和图片不参与比较，也不能通过精灵暂存计划导入。

## 管理页按顺序确认 Diff

1. 抓取所需候选后启动本地开发环境，打开 `/rocotools/admin/wiki-review`；也可从管理首页或“系统 → BWIKI Diff”进入。
2. 页面固定为三个独立 Tab：①技能 → ②特性 → ③精灵。当前 Tab 仍有待审核项时，后续 Tab 在界面和 API 两侧都会锁定。
3. 每个 Tab 按稳定标识排序，一次只显示一个候选；使用“上一个/下一个”移动，决定完成后自动定位到下一条待审核项。
4. `matched` / `name-match-id-different` / `id-match-name-different`：技能只勾选允许的远程字段；特性仅按名称检查新增和本地描述缺失，本地已有描述不比较，缺描述时进入人工补录队列且不能接受远程空值；精灵基线只比较页面实际提供的属性、特性名称和基础数值。
   确认新增特性或补充描述时，后端只请求候选记录中的一只代表精灵详情，校验特性名称一致后保存正式大图标、远程描述和来源精灵；已确认视图同时展示本地/远程描述。
5. `unmatched` 技能：确认新增后才下载图标；后端校验 HTTPS 域名、图片 MIME 与单文件 5MB 上限，下载成功后才启用导入计划。
6. `unmatched` 特性：标记为“已确认引用”，不单独启用导入，因为特性没有独立数据表，将随关联精灵的基础字段导入。
7. `unmatched` 精灵：确认后启用基础数据导入，并请求当前精灵详情页，尽可能下载原图立绘、异色、果实、精灵蛋和正式特性图标；筛选页小头像和压缩特性图标仅用于审核预览，不进入正式槽位。
8. 已匹配精灵直接显示本地 `pet_details` 中已有的正式图片；接受基础字段后只请求当前 UID 的一个详情页补缺失图片，不重复下载已有槽位、不重复请求筛选页，也不连带同编号的其他形态。
9. 无字段变化的已匹配候选自动不计入待审、不阻塞下一实体；仍可按需使用“确认无变化”留下显式记录。“忽略”与“撤销决定”均不写数据库。
10. 三个阶段审核完成后执行 `python scripts/wiki_staging.py import` 查看 dry-run；确认后再执行 `python scripts/wiki_staging.py import --apply`。

每个实体 Tab 内再分为三个按需加载的审核视图：

- **有差异**：默认视图，只返回尚未处理且存在允许字段差异、身份差异、新增或歧义的候选。
- **已确认**：返回已接受字段、已确认新增、已确认无变化或已忽略的候选，便于复查和撤销。
- **无差异**：返回尚未处理但身份已匹配、允许字段完全相同的候选。

列表接口统计时只读取较小的 `diff.json/import.json`，随后只为当前视图加载完整的 `remote/local/assets` 内容；确认或忽略后的响应也只返回当前视图。无差异候选保留在独立视图中，但自动视为 `auto-unchanged`，不计入待审，也不会阻塞下一实体 Tab 或发布包生成。

审核列表接口还会按 `entity`、`page`、`pageSize` 分页；默认及前端审核页面每次只返回当前实体的 1 个完整候选，其他实体只返回计数，单页上限为 20。审核 POST 只返回成功状态，前端随后获取当前页；轻量 `diff/import` 汇总在进程内缓存 60 秒，点击“刷新暂存数据”会显式跳过缓存。

下载结果统一记录在 `assets.json`，包含来源 URL、相对文件、MIME、大小和 SHA-256；技能同时保留 `image.json` 兼容旧批次。审核页通过鉴权接口显示已下载素材：技能卡显示技能图标，特性卡显示特性图标，精灵卡同时显示本体、异色、果实、精灵蛋及特性信息。素材只留在暂存目录，不自动复制到正式图片目录；正式素材仍需后续受控发布。

## 选择字段

现有记录默认：

```json
{
  "enabled": false,
  "fields": {
    "pet": [],
    "detail": [],
    "replace_skill_sets": false
  }
}
```

要接受远程字段，把 `enabled` 改为 `true`，并把字段名加入对应数组。可以直接修改 `data` 中的值后导入。

精灵允许字段：

- `pet`：新实体可使用 `pet_id`、`name`；现有实体只允许 `element`、`sub_element`、`ability_name`、`ability_desc`、`hp`、`speed`、`atk`、`matk`、`def`、`mdef`、`total`
- `detail`：必须保持空数组；非空时导入器直接拒绝
- `replace_skill_sets`：必须保持 `false`；设为 `true` 时导入器直接拒绝

技能允许字段：新技能可使用名称；现有技能只允许属性、分类、能耗、威力和描述。

特性允许字段：`description`。导入时会更新所有使用同名特性的精灵。

图片、图标、头像和缩略图字段不在数据库字段白名单内。精灵确认前先显示本地已有正式图片；确认新增精灵时请求该精灵详情页并尽可能下载本体、异色、果实、精灵蛋和正式特性图标，已匹配精灵只下载本地及暂存中缺失的槽位。素材保存到实体 `images/` 暂存子目录，不覆盖正式图片；详情页未提供的槽位保持缺失并显示“暂无图片”，绝不使用筛选页缩略图代替。

## 生成线上发布包

全部 Tab 审核完成后，不要手工挑选暂存目录。执行：

```bash
# 从默认 data/wiki-staging 整理本次已确认差异
python scripts/wiki_staging.py package

# 指定历史批次或输出目录
python scripts/wiki_staging.py package \
  --input data/wiki-staging/batches/2026-07-24-01 \
  --output data/wiki-releases/s3-2026-07-25
```

`package` 有以下约束：

- 只检查输入目录顶层的 `skills/`、`abilities/`、`pets/`，不会把旁边的其他历史批次混入；要处理历史批次必须显式传 `--input`。
- 只要还有一个 `pending` 候选就拒绝生成。
- 只把 `enabled=true` 的已确认数据库差异写入发布包；`ignored` 和 `approved-no-change` 不进入包。
- 已确认引用的特性若有下载素材，会作为 `reference-assets-only` 随包保留，但不会生成可执行的 `import.json`。
- 每个项目生成 `change.json`，列出审核决定、目标实体、接受字段、本地值、远程值和实际应用值。
- 下载素材会校验原始 `assets.json` 中的 SHA-256 后复制；包内 `manifest.json` 再记录所有载荷文件的 SHA-256。

默认输出：

```text
data/wiki-releases/
├── wiki_release_YYYYMMDD_HHMMSS/
│   ├── manifest.json
│   ├── skills/<uid>/{import.json,change.json,assets.json,images/...}
│   ├── abilities/<hash>/{change.json,assets.json,images/...}
│   └── pets/<uid>/{import.json,change.json,assets.json,images/...}
└── wiki_release_YYYYMMDD_HHMMSS.zip
```

目录和 ZIP 都只包含审核通过的增量载荷。将 ZIP 解压到服务器后，先执行：

```bash
python3 scripts/wiki_staging.py import --input data/wiki-releases/<发布包目录>
```

若输入目录是发布包，`import` 会先核对清单和所有 SHA-256，再显示 dry-run；文件被修改、缺失或额外插入时会拒绝继续。确认后才追加 `--apply`。数据库导入仍不会把包内图片自动复制到正式 `data/public/`；图片需要通过管理端上传，或后续使用独立的受控素材发布命令。

## 导入

```bash
# 默认 dry-run，只列出 enabled=true 的项目
python scripts/wiki_staging.py import

# 确认后写入本地数据库
python scripts/wiki_staging.py import --apply
```

实际写入前会使用 SQLite backup API 创建：

```text
app/server/data/backups/wiki_staging_YYYYMMDD_HHMMSS.db
```

导入在单一事务内执行，完成后运行 `PRAGMA integrity_check`。显式导入的精灵基础数据、技能或特性会标记为 `manual_edit=1`，避免之后被常规全量导入覆盖。

## 清理暂存区，开始下一版本

建议只在以下步骤全部完成后清理：

1. 三个 Tab 已审核完成。
2. 已执行 `package` 并保存发布 ZIP。
3. 服务器 dry-run / `--apply` 与线上检查已完成，或你明确决定放弃本轮候选。

清理命令默认只预览：

```bash
python scripts/wiki_staging.py clean
```

默认范围只包含当前输入目录下的 `.meta/`、`skills/`、`abilities/`、`pets/` 和 `manifest.json`。它会显示文件数、目录数、大小和审核状态，不会删除任何内容，并保留：

- `data/wiki-staging/batches/` 历史批次；
- `data/wiki-releases/` 已生成发布目录和 ZIP；
- 正式 SQLite、`data/public/`、正式 JSON。

确认当前审核工作区已经不再需要后：

```bash
python scripts/wiki_staging.py clean --apply --confirm CLEAN
```

若希望把 `wiki-staging` 内的历史测试批次也一起清空：

```bash
# 先预览；存在 pending 时会明确拒绝
python scripts/wiki_staging.py clean --include-batches

# 明确确认待审核测试数据也可以丢弃
python scripts/wiki_staging.py clean \
  --include-batches \
  --force \
  --apply \
  --confirm CLEAN
```

也可以只清理指定历史批次：

```bash
python scripts/wiki_staging.py clean \
  --input data/wiki-staging/batches/2026-07-24-01
```

安全限制：

- 实际删除必须同时提供 `--apply --confirm CLEAN`。
- 有 `pending` 候选时默认拒绝；只有显式 `--force` 才允许丢弃。
- 清理目标必须等于 `data/wiki-staging` 或位于其内部；其他路径在读取或删除前就会被拒绝。
- 清理完成后保留空工作区，下一次 `fetch` 会自动重新创建实体目录。
- 发布包不会随暂存区清理；建议在线上验证完成并另行归档后，再人工处理旧发布包。

## 安全边界

- 抓取默认只写 `data/wiki-staging/`；打包只写被 Git 忽略的 `data/wiki-releases/`；`clean` 只允许清理 `wiki-staging` 内部且默认 dry-run，三者都不写正式数据文件。
- 默认 dry-run；只有 `--apply` 写数据库。
- 初次抓取和普通字段审核不下载图片；只有确认 `unmatched` 新技能、新特性或新精灵时，才下载其可用素材到暂存目录。
- 审核页只预览经过确认后下载的暂存素材，不热链远程图片，不覆盖 `data/public/`，也不直接写数据库。
- 不读取或操作生产服务器。
- 不自动执行 `sync_db.js --full`。
- 精灵详情、技能组和蛋组不在允许的数据库导入范围内；暂存图片与导入字段隔离，精灵计划中的 `detail` 非空或 `replace_skill_sets=true` 会被拒绝。
