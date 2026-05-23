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
3. 检测到 `app/server/node_modules` 存在时，自动同步数据到 SQLite（含进化链同步）

## 数据产出

| 数据 | 输出路径 | 格式 |
|------|----------|------|
| 属性 | `data/elements/` | JSON |
| 技能 | `data/skills/` | JSON |
| 蛋组 | `data/eggs/` | JSON |
| 精灵 | `data/pets/` | JSON |
| 图片 | `data/public/` | PNG |

## 风险预防机制

### 自动备份

爬虫执行 `sync_database()` 前会自动备份当前数据库：

- 备份位置：`app/server/data/backups/auto_presync_YYYYMMDD_HHMMSS.db`
- 保留策略：最近 5 份，旧的自动清理
- 备份失败不阻断流程（仅警告）

### UID 稳定化

多形态精灵的 UID 通过 `data/pets/_uid_mapping.json` 持久化：

```
"pet_id::精灵名" → uid
例如: "004::魔力猫" → "pet_004_1"
      "004::叶冕魔力猫" → "pet_004_2"
```

即使 BWIKI 表格行顺序变化，已有精灵的 UID 不会改变。

### 数据完整性校验

`import.js` 导入前自动检测：

- 旧数据有技能记录但新数据为空 → 中止
- 新数据量比旧数据少超过 50% → 中止

中止时输出排查指引和恢复命令。

### 增量技能更新

`pet_skills` 不再全表清空，改为按 `pet_uid` 逐个删除再插入。爬虫部分失败时，未涉及的精灵技能数据不受影响。

## 故障恢复

### 导入被 ABORT 中止

```bash
# 1. 检查数据完整性
node -e "const d=require('./data/pets/pet_detail.json'); \
  const p=d.pets; const total=Object.keys(p).length; \
  const hasSkills=Object.values(p).filter(x=>x.detail&&x.detail.skills&&x.detail.skills.length>0).length; \
  console.log('总数:',total,'有技能:',hasSkills)"

# 2. 数据不完整 → 重新爬取
python crawler/run.py --full

# 3. 数据正确但确实减少 → 强制导入
cd app/server && node src/db/import.js --force

# 4. 需要回滚 → 使用自动备份
cp app/server/data/backups/auto_presync_最新.db app/server/data/roco.db
# 或在管理端 Dashboard → 备份恢复 中操作
```

### 多形态 UID 错位

如果发现月刊/活动绑定的精灵指向了错误形态：

1. 检查 `data/pets/_uid_mapping.json` 中对应精灵的映射
2. 手动修正映射后重新执行 `python crawler/run.py --full`
3. 在管理端重新绑定精灵

### 爬虫网络异常

| 现象 | 原因 | 处理 |
|------|------|------|
| 567/429 状态码 | BWIKI 限流 | 自动重试（60s × 次数），无需干预 |
| 部分精灵无详情 | 请求超时 | 重新执行 `--full` 或 `--update` |
| 全部失败 | 网络断开/BWIKI 维护 | 等待恢复后重试 |
