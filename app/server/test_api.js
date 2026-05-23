const jwt = require('jsonwebtoken');

const JWT_SECRET = 'eachzhangRocoTools';

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
  
  // 测试创建目录
  try {
    const response = await fetch('http://localhost:3000/api/admin/library/directories', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: 'test-directory' })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 创建目录成功:', data);
    } else {
      console.log('❌ 创建目录失败:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ 创建目录网络错误:', error.message);
  }
  
  // 再次获取目录结构查看变化
  try {
    const response = await fetch('http://localhost:3000/api/admin/library/directories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 更新后的目录结构:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ 获取更新目录结构失败:', error.message);
  }
  
  // 测试重命名目录
  try {
    const response = await fetch('http://localhost:3000/api/admin/library/directories', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ oldPath: 'test-directory', newName: 'renamed-directory' })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 重命名目录成功:', data);
    } else {
      console.log('❌ 重命名目录失败:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ 重命名目录网络错误:', error.message);
  }
  
  // 最终获取目录结构查看最终状态
  try {
    const response = await fetch('http://localhost:3000/api/admin/library/directories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 最终目录结构:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ 获取最终目录结构失败:', error.message);
  }
}

// 运行测试
testDirectoryAPI();