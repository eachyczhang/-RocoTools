# Git 提交规范

> 本项目使用 Git Hooks 强制执行提交规范。Hooks 位于 `scripts/git-hooks/`，通过 `core.hooksPath` 激活。
> 首次 clone 后执行 `bash scripts/setup-hooks.sh` 即可启用。

---

## 一、Commit Message 格式

### 基本格式

```
<type>: <description>
```

### 带作用域格式

```
<type>(<scope>): <description>
```

### 规则

| 规则 | 说明 |
|------|------|
| 前缀必选 | 必须以有效 type 开头 |
| 冒号+空格 | type 与 description 之间必须是 `: `（冒号+一个空格） |
| 最小长度 | 整条消息不少于 10 个字符 |
| 语言 | 英文为主，中文亦可（描述部分） |
| Merge 豁免 | 以 `Merge` 开头的消息自动跳过校验 |

### 有效 Type 列表

| Type | 含义 | 使用场景 |
|------|------|----------|
| `feat` | 新功能 | 新增页面、API、组件、模块 |
| `fix` | Bug 修复 | 修复已有功能的缺陷 |
| `docs` | 文档变更 | 仅修改 .md 文件或注释 |
| `style` | 代码格式 | 不影响逻辑的格式调整（缩进、空行、分号等） |
| `refactor` | 代码重构 | 既非新功能也非修复的代码改动 |
| `perf` | 性能优化 | 提升性能的代码改动 |
| `chore` | 杂项 | 构建工具、依赖管理、配置文件等 |
| `release` | 版本发布 | 发布新版本时使用 |
| `build` | 构建系统 | 修改构建脚本或配置 |
| `ci` | CI/CD | 修改持续集成/部署配置 |
| `test` | 测试 | 添加或修改测试代码 |
| `hotfix` | 紧急修复 | 线上紧急问题的快速修复 |

### Scope（可选）

scope 用于标注改动影响的模块，常用值：

| Scope | 对应目录/模块 |
|-------|--------------|
| `client` | app/client/ 前端 |
| `server` | app/server/ 后端 |
| `admin` | 管理端相关 |
| `crawler` | crawler/ 爬虫 |
| `scripts` | scripts/ 工具脚本 |
| `data` | 数据结构/导入 |
| `deploy` | 部署相关 |

### 示例

```bash
# 新功能
git commit -m "feat: add pet comparison feature"
git commit -m "feat(admin): add batch skill import"
git commit -m "feat(client): add swipe gesture for pet navigation"

# Bug 修复
git commit -m "fix: resolve skill editor crash on empty data"
git commit -m "fix(server): fix cache invalidation after pet update"

# 文档
git commit -m "docs: update CHANGELOG for V1.0"
git commit -m "docs: add commit convention guide"

# 重构
git commit -m "refactor(server): split admin routes into modules"

# 版本发布
git commit -m "release: V1.1"

# 紧急修复
git commit -m "hotfix: fix production database connection"

# 杂项
git commit -m "chore: add git hooks for pre-commit checks"
git commit -m "chore(scripts): update sync_from_server.sh"
```

---

## 二、Pre-commit 检查项

每次 `git commit` 前自动执行以下 7 项检查：

### 检查清单

| # | 检查项 | 检测范围 | 严重性 | 说明 |
|---|--------|----------|--------|------|
| 1 | `console.log` | 暂存的 .js/.vue/.ts/.jsx/.tsx 文件中**新增**的行 | ⚠️ 警告 | 不阻止提交，但会提示 |
| 2 | `debugger` | 同上 | ❌ 阻止 | 必须移除后才能提交 |
| 3 | `.env` 文件 | 暂存文件列表中匹配 `.env` 的文件 | ❌ 阻止 | 敏感信息禁止入库 |
| 4 | `.db` 文件 | 暂存文件列表中匹配 `.db`/`.db-shm`/`.db-wal` | ❌ 阻止 | 数据库文件禁止入库 |
| 5 | 大文件 (>5MB) | 所有暂存文件 | ❌ 阻止 | 超大文件不应入库 |
| 6 | 尾部空白 | .js/.vue/.ts/.jsx/.tsx/.css/.scss/.html/.json/.md | ✅ 自动修复 | 自动清除行尾空格并 re-add |
| 7 | 前端构建 | 仅当 `app/client/` 有文件变动时触发 | ❌ 构建失败阻止 | 确保提交的代码可构建 |

### 检查行为详解

**console.log（警告）**：
- 仅检查 `git diff --cached` 中以 `+` 开头的行（即新增内容）
- 不会误报已有代码中的 console.log
- 提交不会被阻止，但建议清理

**debugger（阻止）**：
- 同样仅检查新增行
- 发现即阻止提交，必须移除

**敏感文件（阻止）**：
- `.env` 和 `.db` 文件即使被 `.gitignore` 忽略，如果被强制 `git add -f` 也会被拦截
- 这是最后一道防线

**大文件（阻止）**：
- 阈值：5MB（5,242,880 字节）
- 适用于所有文件类型
- 图片资源应通过 CDN/服务器管理，不入版本控制

**尾部空白（自动修复）**：
- 自动执行 `sed` 清除行尾空格
- 修复后自动 `git add` 重新暂存
- 无需手动操作

**前端构建（条件触发）**：
- 仅当 `app/client/` 目录下有文件变动时才执行
- 执行 `npm run build`
- 构建成功后自动暂存产物到 `app/server/public/`
- 构建失败时显示最后 20 行错误输出

---

## 三、绕过 Hooks

紧急情况下可跳过所有 hooks：

```bash
git commit --no-verify -m "hotfix: emergency fix description"
```

> ⚠️ **不推荐**：绕过检查可能导致敏感文件泄露或构建失败的代码被推送。仅在确认安全的紧急情况下使用。

---

## 四、常见问题

### Q: 提交被阻止，提示 "Invalid commit message format"

检查你的 commit message 是否符合 `<type>: <description>` 格式。注意冒号后必须有空格。

```bash
# ❌ 错误
git commit -m "add new feature"
git commit -m "feat:add new feature"    # 冒号后缺少空格
git commit -m "Feat: add new feature"   # type 必须小写

# ✅ 正确
git commit -m "feat: add new feature"
```

### Q: 提交被阻止，提示 "Found debugger statements"

在代码中搜索并移除 `debugger` 语句：

```bash
# 查找暂存文件中的 debugger
git diff --cached | grep '^\+.*debugger'
```

### Q: console.log 警告但我确实需要保留

如果是有意保留的日志（如服务端启动日志），可以：
1. 忽略警告继续提交（console.log 不阻止提交）
2. 或使用自定义 logger 替代 console.log

### Q: 前端构建失败

```bash
# 先在本地验证构建
cd app/client && npm run build

# 修复错误后重新提交
git add . && git commit -m "fix: resolve build error"
```

### Q: hooks 未生效

确认 hooks 已激活：

```bash
git config core.hooksPath
# 应输出: scripts/git-hooks

# 如果为空，重新激活
bash scripts/setup-hooks.sh
```

---

## 五、Hook 文件位置

```
scripts/
├── git-hooks/
│   ├── pre-commit    # 提交前检查（7项）
│   └── commit-msg    # 提交信息格式校验
└── setup-hooks.sh    # 一键激活脚本
```

激活命令：

```bash
# 方式一：运行脚本
bash scripts/setup-hooks.sh

# 方式二：手动配置
git config core.hooksPath scripts/git-hooks
```
