# BWIKI 服务器：自动导入、验证与回滚 SOP

适用范围：同一个 Release 已在 Dev 使用 `scripts/wiki_dev_import.sh` 完成自动演练和页面人工验收，并最终输入 `CONFIRM`。本阶段只发布数据与图片，不负责 `git pull`、安装依赖、构建前端或部署代码。

线上执行入口只有一个：

```bash
bash scripts/wiki_server_import.sh --release data/wiki-releases/S3/s3-2026-07-26-detail-fix --version S3
```

脚本默认只做隔离演练；只有追加 `--apply`、输入发布包确认文本后，才会停止 PM2 并写生产数据。

## 1. 上线前必须确认

- 线上代码已包含本次使用的 `wiki_staging.py`、`wiki_dev_import.sh` 和 `wiki_server_import.sh`。
- Release 与 Dev 验收的是同一个目录，未在 Dev 验收后手工修改。
- 当前生产数据库是 `app/server/data/roco.db`，正式图片目录是 `data/public`。
- PM2 应用名为 `roco`；如果不同，执行时传 `--pm2-app`。
- API 健康地址默认是 `http://127.0.0.1:3000/api/stats`；如果不同，传 `--health-url`。
- 服务器磁盘空间足够同时保存 Release、生产数据库备份、素材旧文件和日志。

不要把 Release 解压到系统 `/tmp`。当前服务器项目根目录是 `/var/www/roco`，S3 压缩包保存在 `/var/www/release/s3/`，解压后按以下目录使用：

```bash
cd /var/www/roco

RELEASE_ARCHIVE="/var/www/release/s3/s3-2026-07-26-detail-fix"
RELEASE="data/wiki-releases/S3"

mkdir -p "$RELEASE"
unzip -q "$RELEASE_ARCHIVE" -d "$RELEASE"
test -f "$RELEASE/s3-2026-07-26-detail-fix/manifest.json"
```

即使压缩包文件名没有 `.zip` 后缀，`unzip` 也可以读取。当前传给导入脚本的实际目录是 `data/wiki-releases/S3/s3-2026-07-26-detail-fix`。

## 2. 第一遍：在线隔离演练

生产服务保持运行，先执行：

```bash
cd /var/www/roco
bash scripts/wiki_server_import.sh \
  --release data/wiki-releases/S3/s3-2026-07-26-detail-fix \
  --version S3
```

这一遍会：

1. 校验 Release schema、审核状态和 UTF-8；
2. 对当前生产 SQLite 使用 Backup API 创建隔离候选库；
3. 在隔离图片目录执行完整导入；
4. 校验数据库完整性、外键、UID、版本、技能、特性、身高体重、蛋组和图片；
5. 输出 `[DONE] 隔离演练通过。生产环境未修改。` 后退出。

演练记录默认保存在：

```text
app/server/data/backups/wiki-server-import/<时间>-<进程号>/
```

演练失败时不要追加 `--apply`，根据屏幕中的步骤名和该目录内日志处理。

## 3. 第二遍：人工确认后覆盖线上

隔离演练通过后，使用完全相同的 Release 和版本号：

```bash
bash scripts/wiki_server_import.sh \
  --release data/wiki-releases/S3/s3-2026-07-26-detail-fix \
  --version S3 \
  --apply
```

脚本会先再次演练，然后要求输入：

```text
APPLY-PRODUCTION <manifest 中的 package_id>
```

确认后自动按以下顺序执行：

1. 停止 PM2 应用，并确认健康地址不再响应；
2. 使用 SQLite Backup API 保存生产库恢复点并检查完整性和外键；
3. 针对生产路径再次 dry-run；
4. 在一个数据库事务中写入技能、精灵、UID 迁移、特性补全、身高体重、三类技能关系和蛋组；
5. 发布本体、异色、果实、精灵蛋、技能图标、特性图标；
6. 自动生成缩略图和 WebP，并更新数据库图片 URL；
7. 校验数据库、导入实体版本、素材回滚清单和全部实际发布文件；
8. 启动 PM2，并轮询 API 健康检查。

脚本不会自动把未审核内容加入 Release，也不会清空赛季备份。UID 迁移沿用发布包中的 `uid_migration`，由导入器在同一事务中同步关联表和受支持的赛季 JSON 引用。

## 4. 页面人工验收与最终选择

PM2 和 API 恢复后，保持当前终端不要关闭，人工检查：

- 管理端精灵、技能、特性数量与内容；
- 发生 UID 迁移的旧链接、形态切换和技能关系；
- 精灵本体、异色、果实、精灵蛋；
- 技能图标、特性图标、特性描述和关联精灵；
- 身高、体重、三类技能学习列表和蛋组；
- 首页/API 没有 500、空白图或跨精灵串图。

通过后输入：

```text
CONFIRM
```

需要撤回则输入：

```text
ROLLBACK
```

输入无效也会按安全策略自动回滚。

## 5. 自动回滚范围

执行 `--apply` 后任一步失败，或收到 `Ctrl+C`、`TERM`、SSH 断线引发的 `HUP`，脚本都会进入安全收尾并尝试：

1. 保持/重新停止 PM2；
2. 用本轮 `roco-before-import.db` 恢复生产数据库；
3. 根据 `assets.json` 恢复被覆盖图片，并删除本轮新建图片；
4. 再次检查数据库完整性和外键；
5. 重启 PM2并重新检查 API。

如果发布包包含图片但素材回滚清单没有成功生成，脚本会保守地保持服务停止，并显示本次恢复目录，禁止在未知状态下自动重新开放服务。

重要恢复文件：

```text
app/server/data/backups/wiki-server-import/<会话>/
  session.txt
  roco-before-import.db
  assets.json
  candidate.log
  production-dry-run.log
  production-apply.log
  production-report.json
  health.json
```

导入器自身还会在 `app/server/data/backups/` 生成一份 `wiki_staging_*.db` 和素材旧文件目录。上线确认前不要删除 Release、上述会话目录或导入器备份。

## 6. 自定义服务器参数

仅当服务器实际配置不同才传：

```bash
bash scripts/wiki_server_import.sh \
  --release data/wiki-releases/S3/s3-2026-07-26-detail-fix \
  --version S3 \
  --db app/server/data/roco.db \
  --public-dir data/public \
  --pm2-app roco \
  --health-url http://127.0.0.1:3000/api/stats \
  --apply
```

可通过 `PYTHON_BIN` 指定 Python：

```bash
PYTHON_BIN=python3 bash scripts/wiki_server_import.sh \
  --release data/wiki-releases/S3/s3-2026-07-26-detail-fix \
  --version S3
```

不要跳过默认演练直接调用底层 `wiki_staging.py import --apply`；否则不会获得 PM2 停机窗口、持久恢复点、上线后健康检查和最终 `CONFIRM/ROLLBACK` 流程。
