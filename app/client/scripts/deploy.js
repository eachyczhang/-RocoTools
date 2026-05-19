/**
 * 构建完成后 dist 已输出到 ../server/public/
 * 此脚本仅做确认输出
 */
const fs = require('fs')
const path = require('path')

const dist = path.join(__dirname, '..', '..', 'server', 'public', 'index.html')

if (fs.existsSync(dist)) {
  console.log('[DONE] 前端已构建并部署到 app/server/public/')
  console.log('[INFO] 启动 server 后访问 http://localhost:3000 即可')
} else {
  console.log('[ERROR] 构建产物未找到，请先执行 npm run build')
}
