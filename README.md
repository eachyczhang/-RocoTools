# Roco - 洛克王国世界数据工具

洛克王国世界（Roco World）游戏数据爬取与整理工具集，数据来源为 [BWIKI](https://wiki.biligame.com/rocom/%E9%A6%96%E9%A1%B5)。

## 项目结构

```
roco/
├── scripts/                # Python 爬虫脚本
│   ├── run.py              # 总入口（支持全量/增量模式）
│   ├── scrapers/           # 爬虫脚本
│   │   ├── fetch_element_chart.py      # 属性克制关系爬取
│   │   ├── process_element_chart.py    # 属性数据结构化处理
│   │   ├── fetch_skill_list.py         # 技能列表爬取
│   │   ├── fetch_pet_list.py           # 精灵筛选列表爬取
│   │   └── fetch_pet_detail.py         # 精灵详情爬取
│   ├── utils/              # 工具模块
│   │   ├── downloader.py   # 图片下载工具
│   │   └── report.py       # 校验报告生成工具
│   └── requirements.txt
├── data/                   # 爬取数据（不纳入 git）
│   ├── elements/           # 属性克制关系
│   ├── skills/             # 技能数据
│   ├── pets/               # 精灵数据
│   ├── public/             # 图片静态资源（可作为 Vite public 目录）
│   │   ├── elements/icons/ # 属性图标 (elem_N.png)
│   │   ├── pets/           # 精灵图片
│   │   │   ├── thumbnails/ # 缩略图 ({uid}.png)
│   │   │   ├── default/    # 本体立绘 ({uid}_default.png)
│   │   │   ├── shiny/      # 异色立绘 ({uid}_shiny.png)
│   │   │   ├── fruit/      # 果实图片 ({uid}_fruit.png)
│   │   │   └── egg/        # 精灵蛋 ({uid}_egg.png)
│   │   └── skills/icons/   # 技能图标 (skill_N.png)
│   ├── FIELDS.md           # 字段中英文对照表
│   └── STRUCTURE_RULES.md  # 属性数据结构化规则
├── frontend/               # 前端工程（技术栈待定）
└── README.md
```

## 快速使用

```bash
# 安装依赖
pip install -r scripts/requirements.txt

# 全量爬取（所有数据 + 图片，约 40 分钟）
python scripts/run.py --full

# 增量更新（仅爬取版本变更的精灵详情，秒级完成）
python scripts/run.py --update
```

## 执行顺序

| 步骤 | 脚本 | 说明 |
|------|------|------|
| 1 | fetch_element_chart.py | 爬取 18 种属性克制关系 |
| 2 | process_element_chart.py | 结构化处理（ID/颜色/图标） |
| 3 | fetch_skill_list.py | 爬取全部技能（469+） |
| 4 | fetch_pet_list.py | 爬取精灵筛选列表（466+） |
| 5 | fetch_pet_detail.py | 爬取每个精灵详情页 |

步骤 1-2 为后续依赖：精灵和技能的 `element` 字段引用属性结构化数据。

## 数据关联

```
属性 (element_chart_structured.json)
  ↑ 引用
技能 (skill_list.json)          ←── 精灵.detail.skills[].skill_ref
  ↑ 引用
精灵 (pet_list.json / pet_detail.json)
```

- 精灵 `element` → 属性对象 `{id, key, name, color, icon}`
- 精灵技能 `skill_ref` → 技能对象 `{uid, name, icon_url}`
- 技能 `element` → 属性对象

## 数据说明

- 数据来源：[洛克王国世界 BWIKI](https://wiki.biligame.com/rocom/%E9%A6%96%E9%A1%B5)
- Wiki 格式：MediaWiki（通过 api.php 接口获取）
- 图片路径格式：`/public/...`（兼容 Vite 静态资源引用）

## 协议

本项目由 **eachzhang** 结合洛克王国世界 BWIKI 公开数据进行二次开发。

数据来源遵循 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) 协议，本项目同样采用该协议发布：

- **署名**：数据来自洛克王国世界 BWIKI 及其贡献者
- **非商业性使用**：本项目及衍生作品不得用于商业目的
- **相同方式共享**：基于本项目的衍生作品须采用相同协议

详见 [LICENSE](./LICENSE)。

## 安全性说明

- 本项目仅通过 BWIKI 公开的 MediaWiki API（`api.php`）获取数据，不涉及任何登录态、Cookie 或用户隐私信息
- 爬虫脚本内置请求频率限制（≥ 2 秒/次）和限流重试机制，不会对 BWIKI 服务造成过量压力
- 不存储、不传输任何用户个人数据
- 所有图片资源来自 BWIKI 公开 CDN，仅做本地缓存用于开发调试
- 本项目不提供任何在线服务，不收集访问者信息

## 免责声明

- 本项目为个人学习与非商业用途，与腾讯、洛克王国官方及 BWIKI 运营方无关
- 游戏内容版权归腾讯及魔方工作室群所有
- 如有侵权请联系作者删除：879179786@qq.com
