# Scripts - 洛克王国世界数据爬取

Python 脚本目录，通过 MediaWiki API 从 [洛克王国世界 BWIKI](https://wiki.biligame.com/rocom/%E9%A6%96%E9%A1%B5) 爬取数据。

## 环境要求

- Python 3.10+
- 依赖：`pip install -r requirements.txt`

## 目录说明

```
scripts/
├── run.py              # 总入口（--full 全量 / --update 增量）
├── scrapers/           # 爬虫脚本
│   ├── fetch_element_chart.py      # 属性克制关系
│   ├── process_element_chart.py    # 属性结构化处理
│   ├── fetch_skill_list.py         # 技能列表
│   ├── fetch_pet_list.py           # 精灵筛选列表
│   └── fetch_pet_detail.py         # 精灵详情（含增量支持）
├── utils/              # 工具模块
│   ├── downloader.py   # 图片批量下载（支持重试/跳过已有）
│   └── report.py       # 完整性校验报告生成
└── requirements.txt
```

## 使用方式

```bash
# 全量爬取
python scripts/run.py --full

# 增量更新（仅 version 变更的精灵详情）
python scripts/run.py --update

# 也可单独运行某个爬虫
python scripts/scrapers/fetch_element_chart.py
python scripts/scrapers/fetch_skill_list.py
python scripts/scrapers/fetch_pet_list.py
python scripts/scrapers/fetch_pet_detail.py
```

## 限流说明

BWIKI 对 API 请求有频率限制，脚本内置：
- 请求间隔：5 秒（detail 爬虫）
- 自动重试：遇到 567/429 错误等待 120 秒后重试，最多 5 次
- 图片下载间隔：0.2 秒
- 步骤间冷却：5 秒

全量爬取约需 40 分钟，日常使用 `--update` 模式即可。
