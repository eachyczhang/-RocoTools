require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const elementsRouter = require('./routes/elements');
const skillsRouter = require('./routes/skills');
const eggsRouter = require('./routes/eggs');
const petsRouter = require('./routes/pets');
const naturesRouter = require('./routes/natures');
const seasonsRouter = require('./routes/seasons');
const eventsRouter = require('./routes/events');
const pikaRouter = require('./routes/pika');
const adminRouter = require('./routes/admin');
const { apiCache } = require('./middleware/apiCache');

const { DATA_DIR, getDb } = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3000;

// 静态资源：data/public/ → /public/
app.use('/public', express.static(path.join(DATA_DIR, 'public')));

// 手动上传资源：data/uploads/ → /uploads/
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// RESTful API 路由（带缓存：5 分钟）
app.use('/api/elements', apiCache(600), elementsRouter);
app.use('/api/skills', apiCache(300), skillsRouter);
app.use('/api/eggs', apiCache(600), eggsRouter);
app.use('/api/natures', apiCache(600), naturesRouter);
app.use('/api/seasons', apiCache(600), seasonsRouter);
app.use('/api/events', apiCache(300), eventsRouter);
app.use('/api/pika-monthlies', apiCache(300), pikaRouter);
app.use('/api/pets', apiCache(300), petsRouter);

// 管理端 API（不缓存）
app.use('/api/admin', adminRouter);

// 统计数据（首页概览）
app.get('/api/stats', (req, res) => {
  const db = getDb();
  try {
    const pets = db.prepare('SELECT COUNT(DISTINCT pet_id) as c FROM pets').get().c;
    const skills = db.prepare('SELECT COUNT(*) as c FROM skills').get().c;
    const elements = db.prepare('SELECT COUNT(*) as c FROM elements').get().c;
    const eggs = db.prepare('SELECT COUNT(*) as c FROM egg_groups').get().c;
    const natures = db.prepare('SELECT COUNT(*) as c FROM natures').get().c;
    res.json({ pets, skills, elements, eggs, natures });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 健康检查
app.get('/api', (req, res) => {
  res.json({
    name: 'Roco Data API',
    version: '1.0.0',
    endpoints: [
      '/api/elements',
      '/api/skills',
      '/api/eggs',
      '/api/pets',
    ],
  });
});

// 根路径静态文件（验证文件、证书等）
const ROOT_STATIC_DIR = path.join(__dirname, '..', 'root-static');
if (fs.existsSync(ROOT_STATIC_DIR)) {
  app.use(express.static(ROOT_STATIC_DIR));
}

// 根路径重定向到工具站
app.get('/', (req, res) => {
  res.redirect('/rocotools/');
});

// 前端静态文件（build 产物）挂载到 /rocotools/
const DIST_DIR = path.join(__dirname, '..', 'public');
if (fs.existsSync(DIST_DIR)) {
  app.use('/rocotools', express.static(DIST_DIR));
  // SPA fallback
  app.get('/rocotools/*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.use((req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/public')) {
      res.status(404).json({ error: 'Not Found' });
    }
  });
}

// 全局错误处理（防止堆栈信息泄露）
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? '服务器内部错误' : err.message });
});

// 启动前检查关键环境变量
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[WARN] 未设置 ADMIN_PASSWORD 环境变量，管理端使用默认密码（仅限开发）');
}
if (!process.env.ADMIN_SECRET) {
  console.warn('[WARN] 未设置 ADMIN_SECRET 环境变量，JWT 使用默认密钥（仅限开发）');
}

app.listen(PORT, () => {
  console.log(`[Roco API] 运行在 http://localhost:${PORT}`);
  console.log(`[Roco API] 接口文档: http://localhost:${PORT}/api`);
});
