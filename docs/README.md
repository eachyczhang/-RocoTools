# RocoTools 文档中心

本目录集中承载 RocoTools 的工程上下文、架构、功能、开发规范、展示标准、游戏规则和运维说明。

## 阅读入口

| 需求 | 权威文档 |
|---|---|
| 了解项目 | [根 README](../README.md) |
| AI 启动与续接 | [AI 上下文入口](./ai/START_HERE.md) |
| 查看系统架构 | [工程架构](./architecture/README.md) |
| 查看当前功能状态 | [功能状态](./ai/STATUS.md) |
| 查看风险 | [风险登记](./ai/RISK_REGISTER.md) |
| 查看待办 | [TODO](./ai/TODO.md) |
| 查看部署边界 | [部署与运维](./operations/DEPLOY.md) |
| 执行 BWIKI 版本更新 | [BWIKI 版本更新与服务器同步 SOP](./operations/BWIKI_VERSION_UPDATE.md) |
| Dev 环境 BWIKI 比对与打包 | [BWIKI Dev Diff SOP](./operations/BWIKI_DEV_DIFF_SOP.md) |
| 服务器 BWIKI 部署与回滚 | [BWIKI Server Deploy SOP](./operations/BWIKI_SERVER_DEPLOY_SOP.md) |

## 文档分类

### 架构

- [工程架构](./architecture/README.md)：系统、数据流、数据库、路由和部署关系。

### 独立功能

- [反制推荐](./features/counter-picks.md)：算法、评分、标签和接口。
- [用户反馈](./features/feedback.md)：前后端入口、API、附件和风险。
- [图鉴课题批量管理](./features/admin-achievements-batch.md)：页面、交互、API 和导航设计。
- [BWIKI 逐实体暂存与 JSON 导入](./features/wiki-staging-import.md)：S3 数据抓取、逐字段审阅、备份与本地导入。

### 开发规范

- [Git 提交规范](./development/commit-convention.md)：提交格式、Hooks 和检查项。
- [管理端业务规则](../app/ADMIN_RULES.md)：管理端功能、数据保护和接口约定。
- [应用架构](../app/README.md)：前后端技术栈、组件和启动方式。

### 展示标准

- [公告表格规范](./standards/patch-notes-table.md)：公告表格、排序、图标和响应式展示。
- [文本高亮颜色](./standards/text-highlight-colors.md)：属性色、关键词和匹配规则。
- [视觉设计](../app/client/DESIGN.md)：颜色、组件和暗色模式。
- [响应式规范](../app/client/RESPONSIVE.md)：手机、平板和桌面布局。

### 数据、脚本和爬虫

- [字段对照](../data/FIELDS.md)
- [数据结构规则](../data/STRUCTURE_RULES.md)
- [脚本总览](../SCRIPTS.md)
- [脚本详细手册](../scripts/README.md)
- [爬虫说明](../crawler/README.md)

### 游戏规则与运维

- [游戏规则索引](./game-notes/README.md)
- [部署与运维](./operations/DEPLOY.md)
- [BWIKI 版本更新与服务器同步 SOP](./operations/BWIKI_VERSION_UPDATE.md)：线上基线回拉、分版本审核、增量包发布、图片上传、验证与清理。

## 兼容入口

迁移前位于 `docs/` 根层的文件保留同名兼容入口。兼容入口只负责指向新位置，不再维护正文。仓库内部新引用必须使用本页列出的权威路径。
