# 文档整理规则

> 本文件定义项目中所有 Markdown 文档的用途、维护规则和整理记录。
> 每次整理文档后，更新本文件中的"上次整理时间"字段。

---

## 上次整理时间

**2026-05-31 22:50 CST**

---

## 文档清单与整理规则

### 根目录

| 文件 | 用途 | 整理规则 |
|------|------|----------|
| [README.md](./README.md) | 项目总览（功能/技术栈/结构/API/快速开始） | 新增页面/API/核心特性时更新；保持文档索引表完整 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日志（V1.0起，按模块分类记录变更） | 每次发布新版本时更新；按版本号规范记录 |
| [SCRIPTS.md](./SCRIPTS.md) | 脚本执行手册（用途/参数/顺序/注意事项） | 新增脚本或修改 sync_db 流程时更新；保持执行顺序速查表准确 |
| [DEPLOY.md](./DEPLOY.md) | 服务器部署指南（环境/构建/Nginx/自动部署/排查） | 部署流程或服务器环境变更时更新；禁止包含真实IP/密码 |
| [DOC_RULES.md](./DOC_RULES.md) | 本文件 — 文档整理规则与记录 | 每次整理文档后更新"上次整理时间"；新增 md 文件时补充到清单 |

### scripts/

| 文件 | 用途 | 整理规则 |
|------|------|----------|
| [scripts/README.md](./scripts/README.md) | 脚本命令行手册（详细命令/参数/示例） | 新增脚本时补充命令和示例；与 SCRIPTS.md 保持一致但更详细 |
| [scripts/ability-icon-tool/README.md](./scripts/ability-icon-tool/README.md) | 特性图标提取工具说明 | 工具逻辑变更时更新 |
| [scripts/skill-icon-tool/README.md](./scripts/skill-icon-tool/README.md) | 技能图标提取工具说明 | 工具逻辑变更时更新 |

### app/

| 文件 | 用途 | 整理规则 |
|------|------|----------|
| [app/ADMIN_RULES.md](./app/ADMIN_RULES.md) | 管理端业务规则（缓存/命名/校验/图片/进化/标签/课题等） | 管理端新增功能或修改业务逻辑时更新；按章节编号递增 |
| [app/README.md](./app/README.md) | 应用层架构说明（前后端技术栈/组件/composables） | 新增共享组件/composable/路由时更新 |
| [app/client/DESIGN.md](./app/client/DESIGN.md) | 视觉设计规范（色彩/组件样式/暗色模式/交互） | 修改设计系统或新增组件样式时更新 |
| [app/client/RESPONSIVE.md](./app/client/RESPONSIVE.md) | 响应式适配规范（断点/布局策略） | 修改响应式策略时更新 |

### data/

| 文件 | 用途 | 整理规则 |
|------|------|----------|
| [data/FIELDS.md](./data/FIELDS.md) | 数据字段对照表（各表字段名/类型/示例） | 数据库表结构变更时更新 |
| [data/STRUCTURE_RULES.md](./data/STRUCTURE_RULES.md) | 数据结构化规则（UID/格式/安全/备份） | 数据格式或安全策略变更时更新 |

### docs/

| 文件 | 用途 | 整理规则 |
|------|------|----------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 工程架构设计图（Mermaid 图：系统/数据流/ER/路由/部署） | 架构变更（新增表/路由/服务）时更新 |
| [docs/counter-picks.md](./docs/counter-picks.md) | 反制推荐模块开发规则与算法原理（标签体系/克制倍率/评分权重） | 反制推荐算法或标签规则变更时更新 |
| [docs/PATCH_NOTES_TABLE_RULES.md](./docs/PATCH_NOTES_TABLE_RULES.md) | 公告表格展示规范（列数/排序/图标/样式/各模块格式） | 公告脚本表格格式变更时更新 |
| [docs/TEXT_HIGHLIGHT_COLORS.md](./docs/TEXT_HIGHLIGHT_COLORS.md) | 文本高亮颜色规范（属性色号/关键词映射） | 新增高亮关键词或修改颜色时更新 |
| [docs/COMMIT_CONVENTION.md](./docs/COMMIT_CONVENTION.md) | Git 提交规范（commit message 格式/pre-commit 检查项/绕过方式） | Git hooks 规则变更时更新 |

### docs/game-notes/

| 文件 | 用途 | 整理规则 |
|------|------|----------|
| [docs/game-notes/README.md](./docs/game-notes/README.md) | 游戏设定笔记索引 | 新增游戏设定文件时更新索引表 |
| [docs/game-notes/energy.md](./docs/game-notes/energy.md) | 能量系统设定 | 游戏能量机制变更时更新 |
| [docs/game-notes/elements.md](./docs/game-notes/elements.md) | 属性系统设定（18种属性/克制/免疫） | 属性机制变更时更新 |
| [docs/game-notes/skills.md](./docs/game-notes/skills.md) | 技能系统设定（分类/学习方式/应对/血脉） | 技能机制变更时更新 |
| [docs/game-notes/pets.md](./docs/game-notes/pets.md) | 精灵系统设定（种族值/等级/个体值/星级与成长值/觉醒/形态/进化/标签/课题） | 精灵相关机制变更时更新 |
| [docs/game-notes/battle.md](./docs/game-notes/battle.md) | 战斗系统设定（背包/道具） | 战斗机制变更时更新 |
| [docs/game-notes/seasons.md](./docs/game-notes/seasons.md) | 赛季系统设定（通行证/传说/限定/异色） | 赛季机制变更时更新 |
| [docs/game-notes/events.md](./docs/game-notes/events.md) | 活动系统设定（版本活动/大量出没/常驻课题） | 活动机制变更时更新 |
| [docs/game-notes/pika-monthly.md](./docs/game-notes/pika-monthly.md) | 皮卡月刊设定（角色时装/精灵绑定） | 月刊机制变更时更新 |

### .dev/skills/（AI Skills）

| 文件 | 用途 | 整理规则 |
|------|------|----------|
| [.dev/skills/rocotools-development.md](./.dev/skills/rocotools-development.md) | 综合开发 Skill（架构/流程/任务/调试） | 重大架构变更时更新 |
| [.dev/skills/roco-admin.md](./.dev/skills/roco-admin.md) | 管理端开发规范 | 管理端新增页面/组件时更新 |
| [.dev/skills/roco-data-spec.md](./.dev/skills/roco-data-spec.md) | 数据结构与命名规范 | 数据格式变更时更新 |
| [.dev/skills/roco-deploy.md](./.dev/skills/roco-deploy.md) | 部署相关流程 | 部署流程变更时更新 |
| [.dev/skills/roco-evolution.md](./.dev/skills/roco-evolution.md) | 进化链与进化条件配置系统 | 进化系统变更时更新 |
| [.dev/skills/roco-text-highlight.md](./.dev/skills/roco-text-highlight.md) | 文本高亮颜色系统 | 高亮规则变更时更新 |

### crawler/

| 文件 | 用途 | 整理规则 |
|------|------|----------|
| [crawler/README.md](./crawler/README.md) | 爬虫模块说明（架构/使用/风险预防/故障恢复） | 爬虫逻辑变更时更新 |

---

## 整理流程

每次整理文档时，按以下步骤执行：

1. **查看 git log**：对比上次整理时间后的所有提交，提取功能变更
   ```bash
   git log --oneline --since="<上次整理时间>"
   ```

2. **分类变更**：将变更归类到对应文档
   - 新增/修改 API → README.md + ADMIN_RULES.md
   - 新增脚本 → SCRIPTS.md + scripts/README.md
   - 游戏机制变更 → docs/game-notes/ 对应文件
   - 数据库结构变更 → data/FIELDS.md + docs/ARCHITECTURE.md
   - 前端组件/样式变更 → app/README.md + DESIGN.md
   - 管理端业务逻辑 → app/ADMIN_RULES.md

3. **更新文档**：逐个更新涉及的文档

4. **更新本文件**：修改"上次整理时间"为当前时间

5. **提交推送**：
   ```bash
   git add . && git commit -m "docs: update documentation after <简要描述>" && git push
   ```

---

## 命名与格式规范

| 规则 | 说明 |
|------|------|
| 文件名 | 全大写（根目录规范文档）或全小写+连字符（game-notes） |
| 标题层级 | 一级标题仅用于文件标题，内容从二级标题开始 |
| 表格 | 优先使用表格展示结构化信息 |
| 代码块 | 命令行用 `bash`，数据结构用 `json`/`sql` |
| 链接 | 文档间使用相对路径链接 |
| 更新标记 | 重要变更在对应章节末尾标注更新日期（可选） |

---

## 注意事项

1. **不要创建冗余文档**：优先在现有文档中补充，而非新建文件
2. **保持一致性**：SCRIPTS.md 和 scripts/README.md 内容应一致（后者更详细）
3. **game-notes 只记录游戏设定**：不记录实现细节，实现细节放 ADMIN_RULES.md
4. **AI Skills 文档**：面向 AI 助手，侧重"如何做"而非"是什么"
5. **.ai-memory.md**：由 AI 自动维护，不纳入本规则管理范围
