# RocoTools 部署与运维指南

> 最近核验：2026-07-24
> 文档范围：脱敏、受 Git 管理的生产部署事实与操作边界

## 生产基线

- 生产仓库目录：`/var/www/roco`。
- 生产代码分支：`main`（由用户根据服务器现状确认）。
- 进程管理：PM2，仓库配置名为 `roco`，`ecosystem.config.js` 配置 2 个 cluster 实例。
- 反向代理：Nginx；仓库中的 `nginx.conf` 和 `nginx.prod.conf` 是脱敏模板，不代表服务器当前配置逐字节一致。
- 服务器 `deploy.sh`、真实主机、用户名、密钥和 `.env` 不进入 Git。
- 生产 commit SHA、PM2 实际状态和线上构建的精确 commit 仍需 SSH 只读核验。

## Git 与部署状态

`git push origin main` 只更新远程仓库，不代表生产已经部署。只有服务器实际执行部署脚本并成功完成，代码状态才可能从 `committed` 变为 `deployed`；最终仍应通过线上接口或页面验证。

当前从服务器下载并于 2026-07-24 审查的脚本执行逻辑：

1. 进入 `/var/www/roco`，记录拉取前 HEAD。
2. 执行 `git pull origin main`，记录拉取后 HEAD。
3. HEAD 未变化且未指定 `--force` 时直接退出。
4. `app/server/` 有差异时，在后端执行 `npm install --production`。
5. `app/client/` 有差异时，在前端执行 `npm install` 和 `npm run build`。
6. 对每次存在新提交的部署执行 `pm2 reload roco`；进程不存在时使用 `ecosystem.config.js` 启动并 `pm2 save`。
7. `nginx/` 有差异时才运行 `nginx -t` 并 reload Nginx。

`--force` 会把前后端都视为已变化，重新安装依赖并构建前端，但不会把 Nginx 标记为变化。

## 变更影响矩阵

| Git 差异 | 服务器动作 | 不会执行 |
|---|---|---|
| 无新提交 | 直接退出 | 构建、PM2 reload、Nginx reload、数据库操作 |
| 仅文档/根目录 | 拉取代码、PM2 reload | 前端构建、依赖安装、Nginx reload、数据库操作 |
| `app/client/` | 安装前端依赖、构建、PM2 reload | 数据库操作；除非另有 `nginx/` 差异，不 reload Nginx |
| `app/server/` | 安装生产依赖、PM2 reload | 前端构建、数据库操作；除非另有对应差异 |
| `nginx/` | `nginx -t` 成功后 reload Nginx、PM2 reload | 数据库操作 |
| `--force` | 安装前后端依赖、重建前端、PM2 reload | 默认不 reload Nginx，不执行数据库操作 |

## 前端构建边界

`app/client/vite.config.js` 设置：

```text
outDir = app/server/public
emptyOutDir = true
```

因此 `npm run build` 会清空并重建 `app/server/public/`。该目录是忽略的构建产物，不应提交 Git。构建失败时脚本因 `set -e` 退出，但输出目录可能已经被清空或只生成了一部分；恢复方式是修复构建后重新执行，不要把旧构建产物提交到仓库。

## 数据库与运行数据边界

当前服务器部署脚本不会执行：

- SQLite 备份或恢复；
- `PRAGMA integrity_check`；
- `node sync_db.js`；
- JSON/图片数据上传或下载；
- 数据库迁移、完整导入或生产数据校验。

生产数据由用户独立维护，并在更新后按受控流程同步回本地。代码部署和数据同步是两个独立流程：

- `node sync_db.js`：默认生成图片衍生物并建表/补列，不导入 JSON。
- `node sync_db.js --full`：完整导入和后处理，会修改数据。
- `scripts/sync_from_server.sh`：从服务器拉取数据库、图片或赛季备份到本地。

未经明确授权，不在服务器运行上述数据命令。

## 发布前检查

1. 确认目标提交已进入 `origin/main`。
2. 确认本地工作区没有遗漏的业务改动和敏感文件。
3. 前端有变化时运行 `npm run build`。
4. 后端有变化时运行语法检查和相关接口测试。
5. 核对 lockfile 与依赖安装方式。
6. 明确本次是否涉及 schema 或运行数据；涉及时另行准备备份和回滚，不依赖部署脚本。
7. 记录待部署 commit、验证结果和剩余风险。

## 只读生产核验

连接信息从 Git 外的本机配置取得。不要把真实主机、用户或私钥写入命令记录、日志或文档。

```bash
ssh <user>@<host> '
  cd /var/www/roco &&
  git branch --show-current &&
  git rev-parse HEAD &&
  git status --short &&
  pm2 status &&
  stat app/server/public/index.html
'
```

构建与 commit 的可靠对应应至少包含：服务器 HEAD、构建文件时间、目标功能线上旁证。仅凭网页 Last-Modified 或“代码存在”不能确定生产 SHA。

## 回滚原则

- 优先在 Git 中对错误提交执行 `git revert`，评审后推送新的 `main` 提交，再由服务器正常拉取。
- 不把服务器上的 `git reset --hard` 当作常规冲突或回滚手段。
- 前端构建失败时修复后重新构建；不要手工拼接或提交 `app/server/public/`。
- 数据库回滚、恢复和迁移属于独立高风险操作，必须另行授权、备份并验证。
- 服务器存在本地改动导致 `git pull` 失败时，先只读检查并保存差异，不直接覆盖。

## 配置与秘密

以下内容必须留在 Git 外：

- 真实服务器地址和 SSH 用户名；
- 私钥、密码、Token、JWT 密钥；
- `app/server/.env`、`scripts/.env`；
- 生产 SQLite、用户反馈、上传素材和日志。

仓库只保留 `.env.example`、Nginx 占位符模板和本脱敏指南。
