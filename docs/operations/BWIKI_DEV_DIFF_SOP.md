# BWIKI Dev 环境：版本比对与发布包 SOP

适用：在开发机完成一次 BWIKI 版本更新的抓取、审核、验证和打包。不连接生产数据库，不上传生产图片。

## 1. 创建独立批次

```bash
VERSION="s4-2026-08-20"
BATCH="data/wiki-staging/batches/$VERSION"
RELEASE="data/wiki-releases/$VERSION"
DB="app/server/data/roco.db"
```

每个版本使用新的 `BATCH`，不要复用旧批次。`BATCH` 是审核工作区，`RELEASE` 是最终发布包目录。

## 2. 建立服务器基线

```bash
bash scripts/sync_from_server.sh --db
bash scripts/sync_from_server.sh --images
```

首次同步或明确要求全量图片时才使用 `--images --full`。同步完成后不要运行 `sync_db.js --full`，避免把其他 JSON 混入比对基线。

## 3. 拉取 BWIKI 基础数据

精灵基础数据只从“精灵筛选”页拉取：

```bash
python scripts/wiki_staging.py fetch-html \
  --all-pets \
  --pet-list-html "wiki-input/精灵筛选.html" \
  --output "$BATCH" --db "$DB"
```

技能、特性按需要定向抓取。初次抓取不下载图片；图片只在审核确认时请求详情页。

## 4. Dev 审核顺序

启动开发环境后打开管理端 BWIKI Diff：

```bash
npm run dev
```

按“技能 → 特性 → 精灵”审核，每类分别使用“有差异 / 已确认 / 无差异”视图。选择器可按名称、编号或 UID 直接定位。

- 技能：只确认需要导入的字段。
- 特性：只处理名称、新增和本地缺少描述；已有本地描述不被远程覆盖。
- 精灵：只比较基础字段。`version` 不参与 Diff。
- 无差异精灵：如官网补充了异色等图片，在“无差异”中点击“从官网补充图片并确认”；它只下载缺失图片，不导入基础字段，然后转入“已确认”。
- UID 变化：必须单独确认 UID 迁移，不能把它当普通名称或数值字段修改。

## 5. Dev 校验

审核完成后先生成发布包：

```bash
python scripts/wiki_staging.py package \
  --input "$BATCH" --output "$RELEASE"
```

检查以下内容：

- `pending=0`，没有未处理或身份歧义项。
- `manifest.json` 的 SHA-256 校验通过。
- `change.json` 中字段、UID、决策和图片槽位符合预期。
- 图片位于对应实体目录的 `images/` 下，且 `assets.json` 记录来源、相对路径、大小和 SHA-256。
- 对发布包执行 dry-run：

```bash
python scripts/wiki_staging.py import --input "$RELEASE"
```

如需在开发数据库验证统一版本号：

```bash
python scripts/wiki_staging.py import \
  --input "$RELEASE" --version S4 --apply
```

`--version` 只在明确提供时覆盖 `skills.version` 和 `pets.version`；不提供则保留原值。确认开发验证通过后，保留 ZIP、目录和 manifest，交给服务器 SOP。

## 6. Dev 交付物

交付：发布 ZIP、解压目录、`manifest.json`、审核摘要、目标版本号，以及本批次的 UID 迁移清单和图片清单。不要交付生产数据库文件或明文凭据。



## Pet detail snapshot during confirmation

When a pet review is confirmed, the review service requests that pet's BWIKI detail page once. It stores height, weight, the three skill-source lists, and egg groups in remote.json.detail and import.json.detail, alongside the existing formal image assets. The confirmed view renders this snapshot. Existing confirmed pets without a snapshot expose a fetch-images-and-detail backfill action. This action writes only staged JSON and assets; it does not write the live database. Review the snapshot before packaging.


For both the confirmed and unchanged pet views, the supplementary action is always available. It refreshes the detail page even when all four formal images already exist, then stores the six parsed stats plus height, weight, three skill groups, and egg groups in the staged detail snapshot.


Pet skill snapshots use the local skills table as the primary catalog. If a skill is absent there, the review endpoint searches staged skill-review remote.json records by name and marks the source; unmatched cards include a link to the Skill review tab. Each card shows icon, element, category/type, level, cost, power, and description.


Skill matching order is deterministic: normalize the name with Unicode NFKC and remove whitespace/punctuation, then match the local skills table; if absent, scan the active staging root and all version batch skill folders. The card uses the matched icon URL (or the standard local UID path), and unresolved names remain linked to Skill review.


For form identity, a remote UID such as pet_012_3 is not automatically treated as a new entity. When the same pet_id exists locally, local parenthetical form labels are stripped for comparison; a shared form name maps to the lowest existing ordinal (for example pet_012_1). Only when no safe form-name candidate exists is the record shown as uid-new-form.

## 2026-07-25：待审核新增精灵可手动关联本地记录

- 精灵 `unmatched`/身份歧义候选现在显示“关联本地精灵”按钮。
- 选择器复用 `PetPicker`，开启全部形态；确认后只改当前 staging 的 `local.json`、`diff.json`、`import.json`，不会直接写数据库。
- 关联会把本地 UID/基础数据作为比较基准并重建差异；随后仍需按字段审核。远程 UID 与本地 UID 不同会标记为人工关联的 UID 差异，避免把已有记录误判为新增。
- 未实现自动导入线上；部署前仍需导出并人工检查 import 包。
