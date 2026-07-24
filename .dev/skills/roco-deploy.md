# Skill: roco-deploy

> RocoTools 部署相关流程和命令。当前事实以 `docs/operations/DEPLOY.md`、服务器只读证据和实际脚本为准。

## 使用顺序

1. 先读 `docs/operations/DEPLOY.md`、`SCRIPTS.md`、`nginx*.conf` 和 `app/server/ecosystem.config.js`。
2. 旧 AI memory、历史 CodeBuddy 和本文件旧版本只作为检索线索。
3. 部署前确认目标 commit、工作区、lockfile、构建、数据库边界和回滚方法。
4. 未经明确授权，不运行 SSH、部署、PM2/Nginx reload、数据库同步、恢复或上传。
5. 密码、Token、服务器地址、SSH 用户和 `.env` 不写入 Git 或输出。

## 当前生产事实（2026-07-24）

- 生产目录：`/var/www/roco`。
- 生产分支：`main`。
- PM2 仓库配置名：`roco`，配置 2 个 cluster 实例；服务器实际状态仍需只读核验。
- 服务器 `deploy.sh` 在 Git 外，不会随 `git pull main` 更新。
- `git push` 只更新远程仓库，不能直接标记为 `deployed`。

服务器脚本的已验证行为：

- `git pull origin main`；无新 commit 且非 `--force` 时退出。
- `app/server/` 有差异时执行 `npm install --production`。
- `app/client/` 有差异时执行 `npm install` 和 `npm run build`。
- 有新 commit 时 reload `roco`；进程不存在才从 `ecosystem.config.js` 启动。
- `nginx/` 有差异时测试并 reload Nginx。
- 不执行数据库备份、完整性检查、`sync_db.js` 或数据同步。

完整影响矩阵、只读核验和回滚原则见 `docs/operations/DEPLOY.md`。

## 数据命令边界

```bash
cd app/server
node sync_db.js          # 默认：生成图片衍生物 + 建表/补列，不导入 JSON
node sync_db.js --full   # 完整导入和全部后处理，会修改数据
```

生产代码部署与生产数据同步是独立流程。`scripts/sync_from_server.sh` 只用于从服务器拉取受控运行数据到本地。

## 前端构建

```bash
cd app/client
npm install
npm run build
```

Vite 的 `outDir` 为 `app/server/public` 且 `emptyOutDir=true`，构建会清空并重建该目录。失败后可能留下空目录或部分产物，需要修复后完整重建。

## PM2 与 Nginx

```bash
# 只读
pm2 status
nginx -t
```

任何 `pm2 reload/restart`、`systemctl reload nginx` 或配置写入都需要用户明确授权。仓库 Nginx 文件是脱敏模板，不等于生产配置。

## 回滚

- 代码优先通过 `git revert` 产生新提交并按正常流程发布。
- 不把服务器 `git reset --hard` 当作常规冲突处理。
- 数据库恢复、迁移和回滚属于独立高风险操作，必须备份、授权并验证。
- 服务器出现本地改动时先保存并审查差异，不直接覆盖。
