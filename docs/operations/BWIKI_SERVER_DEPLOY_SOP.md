# BWIKI 服务器：发布包部署与回滚 SOP

适用：把 Dev 已审核的 BWIKI 发布包安全导入线上。数据库导入、UID 迁移和图片发布必须分开确认。

## 1. 部署前检查

确认服务器代码已包含：

- `scripts/wiki_staging.py` 的导入器；
- 当前审核和素材路由；
- 与发布包兼容的数据库 schema。

将 ZIP 上传到非正式目录并解压，不要覆盖正在运行的 `app/server/data/roco.db`：

```bash
mkdir -p /tmp/roco-wiki-release
unzip -q wiki_release_*.zip -d /tmp/roco-wiki-release
```

## 2. 验包和 dry-run

```bash
python3 scripts/wiki_staging.py import \
  --input /tmp/roco-wiki-release/<release-dir> \
  --version S4
```

导入器会先检查 manifest 中所有文件的 SHA-256，再检查身份确认、字段白名单和审核状态。dry-run 失败必须停止，不执行 `--apply`。

版本号规则：

- `--version S4`：统一写入技能和精灵的 `version` 列；
- 不传 `--version`：不改变数据库原有版本值；
- 特性没有独立版本列，不写入特性表。

## 3. 数据库导入和安全保证

确认 dry-run 输出后才执行：

```bash
python3 scripts/wiki_staging.py import \
  --input /tmp/roco-wiki-release/<release-dir> \
  --version S4 --apply
```

导入器会：

1. 在 `app/server/data/backups/` 创建 SQLite 备份；
2. 开启外键约束和单一事务；
3. 执行全部数据库变更；
4. 执行 `PRAGMA integrity_check` 和 `PRAGMA foreign_key_check`；
5. 任一步失败则回滚事务，保留备份供恢复。

## 4. UID 迁移如何保证关联不断裂

UID 迁移必须使用审核生成的 `uid_migration`，禁止手工直接改 `pets.uid`。导入器会先验证：

- 源 UID 存在；
- 目标 UID 不存在且等于发布计划 ID；
- `pet_id` 和名称与源记录一致。

通过验证后，在同一事务中完成：

- `pets.uid` 更新；
- 所有包含 `pet_uid` 的表同步更新，包括 `pet_details`、`pet_skills` 和其他外键表；
- `variants_map.pet_uid` 和形态排序更新；
- `seasons` 中受支持的 `pass_pets`、`legend_pet`、`season_pets`、`shiny_pets` JSON UID 引用更新；
- `pet_details.evolution_chain` 中的 UID 引用更新。

随后才发布图片。图片必须使用迁移后的最终 UID，例如 `pet_031_1`，不能继续使用旧 UID 文件名。

## 5. 图片发布位置和数据库索引

发布包中的图片暂时只放在包内实体目录，例如：

```text
pets/pet_177/images/image_shiny.png
```

`import --apply` 不会自动复制图片到正式目录，也不会自动写图片字段。数据库导入完成后，使用管理端上传接口逐张发布：

```bash
curl -X POST "https://<host>/api/admin/upload" \
  -F "type=pet_shiny" -F "uid=pet_177" \
  -F "file=@pets/pet_177/images/image_shiny.png"
```
请求必须携带现有管理端认证；不要把 Cookie、Token 或密码写入 SOP、Git 或命令历史。

正式目录和索引关系如下：

| 类型 | 文件位置 | 数据库索引 |
|---|---|---|
| 精灵本体 | `data/public/pets/default/<uid>_default.png` | `pet_details.image_default`；同时更新 `pets.image_url` |
| 精灵异色 | `data/public/pets/shiny/<uid>_shiny.png` | `pet_details.image_shiny` |
| 精灵果实 | `data/public/pets/fruit/<uid>_fruit.png` | `pet_details.image_fruit` |
| 精灵蛋 | `data/public/pets/egg/<uid>_egg.png` | `pet_details.image_egg` |
| 特性图标 | `data/public/pets/abilities/<uid>_ability.png` | `pet_details.ability_icon` |
| 技能图标 | `data/public/skills/icons/<skill_uid>.png` | `skills.icon_url` |

管理端上传会按 `type + uid` 生成文件名，并更新对应数据库字段；本体图还会生成 `data/public/pets/thumbs/<uid>_default.webp`，写入 `pets.thumb_url`。前端通过 `pet_details.pet_uid = pets.uid` 读取正确槽位，因此 UID 迁移完成后再上传是必要条件。

## 6. 图片发布后的验证

逐项检查：

```bash
sqlite3 app/server/data/roco.db \
  "SELECT pet_uid,image_default,image_shiny,image_fruit,image_egg,ability_icon FROM pet_details WHERE pet_uid='pet_177';"
```

并用管理端或线上页面确认：

- URL 返回 HTTP 200；
- 图片槽位没有串位；
- 异色显示在异色槽位；
- UID 迁移后的精灵、技能组和形态映射仍可打开；
- 线上统计和 API 无异常。

## 7. 回滚和收尾

数据库导入失败时保留原库和备份，不继续发布图片。数据库成功、图片失败时，先修复或补传图片，不回滚已验证的数据库字段；若必须整体回滚，停止写入服务后使用本次导入器生成的备份恢复，再重新执行 dry-run。

线上验证完成后归档 ZIP、manifest、导入日志和备份记录。不要立即删除服务器上的备份或本批次发布包。
