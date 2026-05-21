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
const adminRouter = require('./routes/admin');
const { apiCache } = require('./middleware/apiCache');

const Database = require('better-sqlite3');
// __dirname = app/server/src，2个.. 到 app/server/
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'roco.db');
// 确保 data 目录存在
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;

// 静态资源：data/public/ → /public/
const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'data', 'public');
app.use('/public', express.static(PUBLIC_DIR));

// 手动上传资源：data/uploads/ → /uploads/（入 git）
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

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
app.use('/api/pets', apiCache(300), petsRouter);

// 管理端 API（不缓存）
app.use('/api/admin', adminRouter);

// 统计数据（首页概览）
app.get('/api/stats', (req, res) => {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const pets = db.prepare('SELECT COUNT(*) as c FROM pets').get().c;
    const skills = db.prepare('SELECT COUNT(*) as c FROM skills').get().c;
    const elements = db.prepare('SELECT COUNT(*) as c FROM elements').get().c;
    const eggs = db.prepare('SELECT COUNT(*) as c FROM egg_groups').get().c;
    const natures = db.prepare('SELECT COUNT(*) as c FROM natures').get().c;
    db.close();
    res.json({ pets, skills, elements, eggs, natures });
  } catch (err) {
    db.close();
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

app.listen(PORT, () => {
  console.log(`[Roco API] 运行在 http://localhost:${PORT}`);
  console.log(`[Roco API] 接口文档: http://localhost:${PORT}/api`);
});
