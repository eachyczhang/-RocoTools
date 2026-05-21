# Skill: roco-deploy

> RocoTools 部署相关流程和命令。

---

## 服务器信息

- 系统：Ubuntu 24.04+
- 路径：`/var/www/roco`
- 域名：已备案，base: `/rocotools/`
- 进程守护：PM2
- 反向代理：Nginx（HTTP/2 + SSL）

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

## 一键部署（本地执行）

```bash
bash deploy.sh
# 选项：
# 1) 仅上传数据（rsync 增量同步 data/）
# 2) 仅更新代码（git pull + build + restart）
# 3) 全量部署（数据 + 代码）
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

### sync_db.js 流程

```bash
cd /var/www/roco/app/server
node sync_db.js
```

执行顺序：
1. 生成缩略图（128px WebP q60，需 sharp）→ 更新 pet_list.json
2. 初始化数据库（建表）
3. 导入数据（JSON → SQLite）

### 首次安装 sharp

```bash
cd /var/www/roco/app/server
npm install sharp
```

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

文件位置：项目根目录 `nginx.conf`（已入 git）

更新配置：
```bash
sudo cp /var/www/roco/nginx.conf /etc/nginx/sites-available/roco
sudo nginx -t && sudo systemctl restart nginx
```

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

## 定时任务

crontab 每天 00:00 自动执行 deploy.sh：
```cron
0 0 * * * cd /var/www/roco && ./deploy.sh 2 >> /var/log/roco-deploy.log 2>&1
```

---

## 备份目录结构

```
app/server/data/
├── roco.db              # 当前数据库
└── backups/
    ├── *.db             # 临时备份
    ├── _meta.json       # 备份元数据
    ├── seasons/         # 赛季备份（受保护）
    │   └── season_S1_20260520.db
    └── snapshots/       # 恢复前快照
        └── snapshot_S1更新前_20260521_1430.db
```
