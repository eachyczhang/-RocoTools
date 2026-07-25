# BWIKI 版本更新与服务器同步

> 本文现在只作为入口索引。执行时请按两个阶段分别阅读，避免把 Dev 审核和服务器部署混在一起。

## 阶段一：Dev 环境校验、比对与打包

阅读：[BWIKI_DEV_DIFF_SOP.md](BWIKI_DEV_DIFF_SOP.md)

本阶段只在开发机执行：

- 回拉服务器数据库和图片，建立线上基线；
- 拉取 BWIKI 精灵、技能、特性数据；
- 按技能 → 特性 → 精灵顺序审核；
- 在“有差异 / 已确认 / 无差异”视图中确认字段、UID 和图片；
- 运行 package、manifest SHA-256 校验和 import dry-run；
- 生成发布 ZIP，不连接生产数据库。

## 阶段二：服务器验包、导入与上线

阅读：[BWIKI_SERVER_DEPLOY_SOP.md](BWIKI_SERVER_DEPLOY_SOP.md)

本阶段只在服务器执行：

- 在非正式目录解压发布包并验 SHA-256；
- dry-run 通过后备份 SQLite，再用单事务导入；
- 使用 import --version <版本号> 统一写入技能和精灵 version；
- UID 迁移完成并通过 integrity_check 后，再按最终 UID 发布图片；
- 通过管理端上传接口写入 data/public 和数据库图片字段；
- 验证 API、页面、图片槽位和形态关联；
- 保留备份、发布包和日志，出现异常时按备份回滚。

## 不可跳过的安全边界

- package/import 默认 dry-run，只有显式 --apply 才写数据库。
- 发布包导入不会自动复制图片；图片发布和数据库导入是两个独立确认点。
- UID 不允许直接手改，必须使用审核生成的迁移计划。
- 未通过验包、身份确认、外键检查或线上验证时，不得清理批次和备份。
