import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const checkOnly = process.argv.includes('--check')
const isWindows = process.platform === 'win32'

const services = [
  {
    name: 'server',
    cwd: join(rootDir, 'app', 'server'),
    url: 'http://localhost:3000/api',
  },
  {
    name: 'client',
    cwd: join(rootDir, 'app', 'client'),
    url: 'http://localhost:5173/rocotools/',
  },
]

function validateService(service) {
  const packagePath = join(service.cwd, 'package.json')
  const nodeModulesPath = join(service.cwd, 'node_modules')

  if (!existsSync(packagePath)) {
    throw new Error(`${service.name} 缺少 package.json：${packagePath}`)
  }

  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  if (!packageJson.scripts?.dev) {
    throw new Error(`${service.name} 未定义 npm run dev`)
  }

  if (!existsSync(nodeModulesPath)) {
    throw new Error(
      `${service.name} 依赖尚未安装，请先运行：npm install --prefix app/${service.name}`,
    )
  }

  const directDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }
  const missingDependencies = Object.keys(directDependencies).filter(
    (name) => !existsSync(join(nodeModulesPath, name, 'package.json')),
  )
  if (missingDependencies.length > 0) {
    throw new Error(
      `${service.name} 缺少依赖：${missingDependencies.join(', ')}；请运行：npm install --prefix app/${service.name}`,
    )
  }
}

try {
  services.forEach(validateService)
} catch (error) {
  console.error(`[dev] ${error.message}`)
  process.exit(1)
}

if (checkOnly) {
  console.log('[dev] 启动条件检查通过')
  services.forEach((service) => {
    console.log(`[dev] ${service.name}: npm run dev (${service.cwd})`)
  })
  process.exit(0)
}

console.log('[dev] 正在启动 RocoTools 开发环境，按 Ctrl+C 可同时停止')
services.forEach((service) => {
  console.log(`[dev] ${service.name}: ${service.url}`)
})

const children = new Map()
let shuttingDown = false

function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return

  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
  } else {
    child.kill('SIGTERM')
  }
}

function shutdown(exitCode) {
  if (shuttingDown) return
  shuttingDown = true

  children.forEach(stopChild)
  setTimeout(() => process.exit(exitCode), 200)
}

for (const service of services) {
  const command = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'npm'
  const args = isWindows
    ? ['/d', '/s', '/c', 'npm run dev']
    : ['run', 'dev']

  const child = spawn(command, args, {
    cwd: service.cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false,
  })

  children.set(service.name, child)

  child.on('error', (error) => {
    console.error(`[dev] ${service.name} 启动失败：${error.message}`)
    shutdown(1)
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) return

    const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`
    console.error(`[dev] ${service.name} 已退出（${reason}），正在停止其他服务`)
    shutdown(code ?? 1)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
