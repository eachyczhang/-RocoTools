# Roco - 洛克王国世界数据工具

洛克王国世界（Roco World）游戏数据爬取、存储与展示工具集，数据来源为 [BWIKI](https://wiki.biligame.com/rocom/%E9%A6%96%E9%A1%B5)。

## 项目结构

```
roco/
├── crawler/                # Python 爬虫（并发模式，5-8 分钟全量）
│   ├── run.py              # 总入口（--full / --update）
│   ├── scrapers/           # 各数据源爬虫
│   └── utils/              # 下载工具 + 校验报告
├── data/                   # 爬取数据（JSON + 图片，不纳入 git）
│   ├── elements/           # 属性克制关系（18 种）
│   ├── skills/             # 技能数据（469+）
│   ├── eggs/               # 蛋组数据（15 组）
│   ├── pets/               # 精灵数据（466+）
│   ├── public/             # 图片静态资源
│   ├── FIELDS.md           # 字段对照表
│   └── STRUCTURE_RULES.md  # 数据结构化规则
├── app/                    # 应用层
│   ├── server/             # Express 后台（SQLite + RESTful API）
│   └── client/             # Vue3 前端（Vite + TailwindCSS + Sass）
└── .ai-memory.md           # AI 协作记忆文件（跨设备同步用）
```

## 快速开始

```bash
# 1. 爬虫 - 爬取数据
pip install -r crawler/requirements.txt
python crawler/run.py --full

# 2. 后台 - 初始化数据库
cd app/server
npm install && npm run setup

# 3. 前端 - 开发模式
cd app/client
npm install && npm run dev

# 4. 生产部署（单服务）
cd app/client && npm run build
cd ../server && npm run dev    # http://localhost:3000
```

## 数据流

```
BWIKI → crawler(爬取) → data/(JSON+图片) → server(SQLite) → client(展示)
                                              ↑ 自动同步
                                         run.py 结束后触发
```

## 执行顺序

| 步骤 | 脚本 | 说明 |
|------|------|------|
| 1 | fetch_element_chart.py | 属性克制关系 |
| 2 | process_element_chart.py | 属性结构化 + 图标本地化 |
| 3 | fetch_skill_list.py | 技能列表 + 图标 |
| 4 | fetch_egg_group.py | 蛋组归属数据 |
| 5 | fetch_pet_list.py | 精灵列表 + 缩略图 + 注入 egg_groups |
| 6 | fetch_pet_detail.py | 精灵详情 + 立绘 + 映射刷新 |

## 协议

CC BY-NC-SA 4.0 — 数据来自洛克王国世界 BWIKI，非商业用途。

详见 [LICENSE](./LICENSE)。
