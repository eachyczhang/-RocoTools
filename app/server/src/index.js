const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const elementsRouter = require('./routes/elements');
const skillsRouter = require('./routes/skills');
const eggsRouter = require('./routes/eggs');
const petsRouter = require('./routes/pets');
const { apiCache } = require('./middleware/apiCache');

const app = express();
const PORT = process.env.PORT || 3000;

// 静态资源：data/public/ → /public/
const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'data', 'public');
app.use('/public', express.static(PUBLIC_DIR));

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// RESTful API 路由（带缓存：5 分钟）
app.use('/api/elements', apiCache(600), elementsRouter);
app.use('/api/skills', apiCache(300), skillsRouter);
app.use('/api/eggs', apiCache(600), eggsRouter);
app.use('/api/pets', apiCache(300), petsRouter);

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
const fs = require('fs');
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
