const jwt = require('jsonwebtoken');

const JWT_SECRET = 'roco-admin-default-secret-change-me';

// 生成测试令牌
function generateTestToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '4h' });
}

// 测试API
async function testDirectoryAPI() {
  const token = generateTestToken();
  console.log('生成的JWT令牌:', token);
  
  // 测试获取目录结构
  try {
    const response = await fetch('http://localhost:3000/api/admin/library/directories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 获取目录结构成功:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ 获取目录结构失败:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ 网络错误:', error.message);
  }
}

// 运行测试
testDirectoryAPI();