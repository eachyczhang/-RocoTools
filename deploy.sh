#!/bin/bash
set -e

cd /var/www/roco

echo "🔄 拉取最新代码..."
git pull origin main

echo "📦 安装后端依赖..."
cd app/server && npm install --production

echo "📦 安装前端依赖..."
cd ../client && npm install

echo "🔨 构建前端..."
npm run build

echo "🔄 零停机重载服务..."
pm2 reload roco

echo "🔄 重载 Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ 部署完成"
