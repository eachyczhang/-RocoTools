# Crawler - 洛克王国世界数据爬取

Python 脚本目录，通过 MediaWiki API 从 [洛克王国世界 BWIKI](https://wiki.biligame.com/rocom/%E9%A6%96%E9%A1%B5) 爬取数据。

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
│   ├── fetch_skill_list.py         # 技能列表
│   ├── fetch_egg_group.py          # 蛋组数据
│   ├── fetch_pet_list.py           # 精灵筛选列表（注入 egg_groups）
│   └── fetch_pet_detail.py         # 精灵详情（含增量支持 + egg_groups）
├── utils/              # 工具模块
│   ├── downloader.py   # 图片批量下载（支持重试/跳过已有）
│   └── report.py       # 完整性校验报告生成
└── requirements.txt
```

## 使用方式

```bash
# 全量爬取
python crawler/run.py --full

# 增量更新（仅 version 变更的精灵详情）
python crawler/run.py --update

# 也可单独运行某个爬虫
python crawler/scrapers/fetch_element_chart.py
python crawler/scrapers/fetch_skill_list.py
python crawler/scrapers/fetch_pet_list.py
python crawler/scrapers/fetch_pet_detail.py
```

## 限流与并发说明

爬虫使用多线程并发加速，同时保持对 BWIKI 的友好请求：

| 参数 | 值 | 说明 |
|------|------|------|
| 详情页并发数 | 5 线程 | `fetch_pet_detail.py` 中 `CONCURRENCY` |
| 详情页请求间隔 | 0.5s/线程 | `REQUEST_DELAY` |
| 图片下载并发数 | 10 线程 | `downloader.py` 中 `max_workers` |
| 图片下载间隔 | 0.1s/线程 | `delay` |
| 限流重试等待 | 60s × 次数 | 遇到 567/429 自动等待重试，最多 5 次 |
| 步骤间冷却 | 2s | `run.py` 中步骤间隔 |

全量爬取约需 **5-8 分钟**，日常使用 `--update` 模式即可。

## 执行后自动行为

`run.py` 执行完成后会自动触发以下行为：

1. **各脚本独立校验**：每个爬虫脚本（skill/pet_list/pet_detail）运行结束后，自动生成对应的 `*_report.md` 校验报告
2. **汇总完整性分析**：`run.py` 所有步骤完成后，在终端末尾打印全局数据完整性汇总
3. **数据库自动同步**：若检测到 `app/server/node_modules` 存在，自动执行 `init.js` + `import.js` 将最新 JSON 数据同步到 SQLite（未安装依赖时跳过）

### 校验报告位置

| 数据 | 报告文件 |
|------|----------|
| 技能列表 | `data/skills/skill_list_report.md` |
| 精灵列表 | `data/pets/pet_list_report.md` |
| 精灵详情 | `data/pets/pet_detail_report.md` |
