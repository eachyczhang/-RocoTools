const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.ADMIN_SECRET || 'roco-admin-default-secret-change-me';

/**
 * 管理员鉴权中间件
 * 验证 Authorization: Bearer <token>
 */
function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: '无权限' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'token 无效或已过期' });
  }
}

/**
 * 生成管理员 token
 */
function signAdminToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '4h' });
}

module.exports = { authAdmin, signAdminToken, JWT_SECRET };
