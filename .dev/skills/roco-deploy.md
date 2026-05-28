# Skill: roco-deploy

> RocoTools 部署相关流程和命令。

---

## 服务器信息

- 系统：Ubuntu 24.04+
- 路径：`/var/www/roco`
- 域名：已备案，base: `/rocotools/`
- 进程守护：PM2
- 反向代理：Nginx（HTTP/2 + Brotli + SSL）

---

## 环境变量

文件位置：`app/server/.env`（不入 git）

```env
ADMIN_PASSWORD=xxx
ADMIN_SECRET=xxx
PORT=3000
```

示例文件：`app/server/.env.example`

---

## 自动部署机制

服务器通过 crontab 定时任务自动拉取代码并部署：

```cron
0 0 * * * cd /var/www/roco && ./deploy.sh 2 >> /var/log/roco-deploy.log 2>&1
```

> 每天 00:00 自动执行。日常只需 `git push`，禁止手动在服务器执行部署命令。

### deploy.sh 选项

```bash
bash deploy.sh
# 选项：
# 1) 仅上传数据（rsync 增量同步 data/）
# 2) 仅更新代码（git pull + build + restart）
# 3) 全量部署（数据 + 代码）
```

### 手动触发部署（紧急情况）

```bash
ssh <用户名>@<服务器IP>
cd /var/www/roco && ./deploy.sh 2
```

---

## 手动部署步骤

### 服务器拉取 + 构建

```bash
cd /var/www/roco
git pull
cd app/client && npm install && npm run build
cd ../server && npm install && node sync_db.js
pm2 restart roco-server
```

### sync_db.js 完整流程（10步）

```bash
cd /var/www/roco/app/server
node sync_db.js
```

执行顺序：
1. 生成缩略图（128px WebP q60，需 sharp）→ 更新 pet_list.json
2. 生成 WebP 副本（全部图片，需 sharp）
3. 初始化数据库（建表）
4. 导入数据（JSON → SQLite）
5. 迁移 show_shiny 列（默认值1）
6. 规范化身高体重数据
7. 清洗技能等级字段
8. 同步进化链（多路线合并）
9. 同步最终形态标记
10. 同步默认图鉴课题

> 如果未安装 `sharp`，步骤 1-2 会自动跳过。

### 首次安装 sharp

```bash
cd /var/www/roco/app/server
npm install sharp
```

---

## 后端依赖

关键依赖（`app/server/package.json`）：
- `better-sqlite3` — SQLite3 数据库驱动
- `cheerio` — BWIKI HTML 解析（爬取预览功能）
- `sharp` — 图片处理（缩略图/WebP 生成）
- `jsonwebtoken` — JWT 鉴权
- `multer` — 文件上传

---

## Python 虚拟环境（爬虫）

Ubuntu 24.04+ 需用 venv：

```bash
cd /var/www/roco
source .venv/bin/activate    # 激活
python crawler/run.py --full # 运行
deactivate                   # 退出
```

首次创建：
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r crawler/requirements.txt
```

---

## Nginx 配置

- `nginx.conf` 入 git 但使用占位符：`<YOUR_DOMAIN>`、`<PROJECT_DIR>`
- 部署脚本 `setup-nginx.sh`（不入 git）自动替换占位符并应用
- 用法：`sudo bash setup-nginx.sh`

特性：
- HTTP/2 多路复用
- Brotli 压缩（优先）+ Gzip 备用
- 静态资源 365 天 immutable 缓存
- WebP 自动返回（检测浏览器 Accept 头）

---

## 重要注意

- `init.js` 不再删除旧数据库（保留 seasons 等手动录入数据）
- `sync_db.js` 导入时跳过 `manual_edit=1` 的记录
- 赛季数据只通过管理端配置，sync 不会覆盖
- `data/uploads/` 存放手动上传图片，爬虫不碰
- 后端依赖 `cheerio`（BWIKI 爬取），确保 `npm install` 完整执行

---

## PM2 常用命令

```bash
pm2 status              # 查看状态
pm2 logs roco-server    # 查看日志
pm2 restart roco-server # 重启
pm2 reload roco-server  # 零停机重载
pm2 stop roco-server    # 停止
```

---

## 数据上传（本地 → 服务器）

```bash
# rsync 增量同步（推荐，支持断点续传）
rsync -avz --progress --checksum --delete \
  -e "ssh -o ServerAliveInterval=60" \
  data/ <用户名>@<服务器IP>:/var/www/roco/data/
```

---

## SSL 证书续期

Let's Encrypt 自动续期，手动检查：
```bash
sudo certbot renew --dry-run
```

---

## 排查自动部署问题

```bash
# 查看部署日志
tail -50 /var/log/roco-deploy.log

# 检查 git 状态
cd /var/www/roco && git status

# 如有冲突，强制重置
git fetch origin && git reset --hard origin/main

# 手动重新构建
cd app/client && npm install && npm run build
cd ../server && npm install
pm2 restart roco-server
```

---

## 备份目录结构

```
app/server/data/
├── roco.db              # 当前数据库
└── backups/
    ├── *.db             # 临时备份
    ├── _meta.json       # 备份元数据
    ├── auto_presync_*.db  # 自动预同步备份（最近5份）
    ├── seasons/         # 赛季备份（受保护）
    │   └── season_S1_20260520.db
    └── snapshots/       # 恢复前快照
        └── snapshot_S1更新前_20260521_1430.db
```
