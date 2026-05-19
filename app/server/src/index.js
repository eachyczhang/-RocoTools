const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const elementsRouter = require('./routes/elements');
const skillsRouter = require('./routes/skills');
const eggsRouter = require('./routes/eggs');
const petsRouter = require('./routes/pets');

const app = express();
const PORT = process.env.PORT || 3000;

// 静态资源：data/public/ → /public/
const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'data', 'public');
app.use('/public', express.static(PUBLIC_DIR));

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// RESTful API 路由（按 data 目录结构做前缀）
app.use('/api/elements', elementsRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/eggs', eggsRouter);
app.use('/api/pets', petsRouter);

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

// 前端静态文件（build 产物）
const DIST_DIR = path.join(__dirname, '..', 'public');
const fs = require('fs');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA fallback: 非 API/public 的请求都返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/public')) {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not Found' });
    }
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });
}

app.listen(PORT, () => {
  console.log(`[Roco API] 运行在 http://localhost:${PORT}`);
  console.log(`[Roco API] 接口文档: http://localhost:${PORT}/api`);
});
