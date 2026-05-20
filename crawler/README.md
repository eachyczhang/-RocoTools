# Crawler - 洛克王国世界数据爬取

Python 爬虫，通过 MediaWiki API 从 [洛克王国世界 BWIKI](https://wiki.biligame.com/rocom) 爬取游戏数据。

## 环境要求

- Python 3.10+
- 依赖：`pip install -r requirements.txt`

## 目录说明

```
crawler/
├── run.py              # 总入口（--full 全量 / --update 增量）
├── scrapers/           # 爬虫脚本
│   ├── fetch_element_chart.py      # 属性克制关系
│   ├── process_element_chart.py    # 属性结构化处理
│   ├── fetch_skill_list.py         # 技能列表 + 图标
│   ├── fetch_egg_group.py          # 蛋组数据
│   ├── fetch_pet_list.py           # 精灵列表 + 缩略图
│   └── fetch_pet_detail.py         # 精灵详情 + 立绘（支持增量）
├── utils/
│   ├── downloader.py   # 图片批量下载（重试/跳过已有）
│   └── report.py       # 完整性校验报告
└── requirements.txt
```

## 使用方式

```bash
# 全量爬取（首次使用）
python crawler/run.py --full

# 增量更新（仅 version 变更的精灵详情）
python crawler/run.py --update

# 单独运行某个爬虫
python crawler/scrapers/fetch_element_chart.py
python crawler/scrapers/fetch_skill_list.py
python crawler/scrapers/fetch_pet_list.py
python crawler/scrapers/fetch_pet_detail.py
```

## 执行顺序

| 步骤 | 脚本 | 说明 |
|------|------|------|
| 1 | fetch_element_chart.py | 属性克制关系（18 种） |
| 2 | process_element_chart.py | 属性结构化 + 图标本地化 |
| 3 | fetch_skill_list.py | 技能列表 + 图标（469+） |
| 4 | fetch_egg_group.py | 蛋组归属数据（15 组） |
| 5 | fetch_pet_list.py | 精灵列表 + 注入 egg_groups |
| 6 | fetch_pet_detail.py | 精灵详情 + 立绘 + 映射刷新 |

## 限流与并发

| 参数 | 值 | 说明 |
|------|------|------|
| 详情页并发数 | 5 线程 | `fetch_pet_detail.py` |
| 详情页请求间隔 | 0.5s/线程 | 对 BWIKI 友好 |
| 图片下载并发数 | 10 线程 | `downloader.py` |
| 图片下载间隔 | 0.1s/线程 | |
| 限流重试等待 | 60s × 次数 | 遇到 567/429 自动重试 |
| 步骤间冷却 | 2s | `run.py` 步骤间隔 |

全量爬取约需 **5-8 分钟**，日常使用 `--update` 即可。

## 执行后自动行为

1. 各爬虫脚本运行后自动生成 `*_report.md` 校验报告
2. `run.py` 完成后打印全局数据完整性汇总
3. 检测到 `app/server/node_modules` 存在时，自动同步数据到 SQLite

## 数据产出

| 数据 | 输出路径 | 格式 |
|------|----------|------|
| 属性 | `data/elements/` | JSON |
| 技能 | `data/skills/` | JSON |
| 蛋组 | `data/eggs/` | JSON |
| 精灵 | `data/pets/` | JSON |
| 图片 | `data/public/` | PNG |
