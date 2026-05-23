# RocoTools 工程架构设计图

> 最后更新：2026-05-24
> 本文档使用 Mermaid 语法，可在 GitHub / VS Code / 任何支持 Mermaid 的 Markdown 渲染器中查看。

---

## 1. 系统整体架构（C4 Context）

```mermaid
graph TB
    subgraph Users["用户"]
        Player["🎮 玩家<br/>浏览游戏数据"]
        Admin["🔧 管理员<br/>管理数据/素材"]
    end

    subgraph RocoTools["RocoTools 系统"]
        Frontend["🖥️ Vue3 前端<br/>Vite + TailwindCSS"]
        Backend["⚙️ Node.js 后端<br/>Express + SQLite3"]
        Crawler["🕷️ Python 爬虫<br/>BWIKI 数据采集"]
    end

    subgraph External["外部系统"]
        BWIKI["📖 BWIKI<br/>洛克王国世界Wiki"]
        GitHub["🐙 GitHub<br/>代码仓库"]
        TencentCloud["☁️ 腾讯云<br/>轻量服务器"]
    end

    Player -->|"HTTPS"| Frontend
    Admin -->|"HTTPS + JWT"| Frontend
    Frontend -->|"REST API"| Backend
    Crawler -->|"HTTP 爬取"| BWIKI
    Crawler -->|"JSON/图片"| Backend
    Backend -->|"PM2 部署"| TencentCloud
    Frontend -->|"Nginx 托管"| TencentCloud
    RocoTools -->|"git push"| GitHub
```

---

## 2. 技术栈分层架构

```mermaid
graph LR
    subgraph Presentation["表现层"]
        Vue3["Vue 3"]
        Vite["Vite"]
        Tailwind["TailwindCSS"]
        VueRouter["Vue Router"]
    end

    subgraph Application["应用层"]
        Express["Express.js"]
        JWT["JWT 鉴权"]
        Morgan["Morgan 日志"]
        Multer["Multer 上传"]
        Sharp["Sharp 图片处理"]
    end

    subgraph Data["数据层"]
        SQLite["SQLite3<br/>(better-sqlite3)"]
        FileSystem["文件系统<br/>(JSON + 图片)"]
    end

    subgraph Infrastructure["基础设施"]
        Nginx["Nginx<br/>(Brotli + 缓存)"]
        PM2["PM2<br/>(进程管理)"]
        Server["腾讯云<br/>2G/3M"]
    end

    Presentation --> Application
    Application --> Data
    Application --> Infrastructure
```

---

## 3. 目录结构总览

```mermaid
graph TD
    Root["📁 -RocoTools/"]
    
    Root --> App["📁 app/ <br/>Web应用"]
    Root --> Crawler["📁 crawler/ <br/>Python爬虫"]
    Root --> Data["📁 data/ <br/>数据文件(不入git)"]
    Root --> Docs["📁 docs/ <br/>游戏设定文档"]
    Root --> DevDir["📁 .dev/ <br/>AI Skills"]
    Root --> Nginx["📄 nginx.conf"]

    App --> Client["📁 client/ <br/>Vue3前端"]
    App --> ServerDir["📁 server/ <br/>Node后端"]
    App --> AdminRules["📄 ADMIN_RULES.md"]

    Client --> Src["📁 src/"]
    Src --> Views["📁 views/ <br/>页面组件"]
    Src --> Components["📁 components/ <br/>共享组件"]
    Src --> API["📁 api/ <br/>接口封装"]
    Src --> Composables["📁 composables/ <br/>组合式函数"]
    Src --> Router["📁 router/"]
    Src --> Styles["📁 styles/"]

    ServerDir --> SrcServer["📁 src/"]
    SrcServer --> Routes["📁 routes/ <br/>路由处理"]
    SrcServer --> Services["📁 services/ <br/>业务逻辑"]
    SrcServer --> DB["📁 db/ <br/>数据库"]
    SrcServer --> Middleware["📁 middleware/"]

    Crawler --> Scrapers["📁 scrapers/ <br/>各模块爬虫"]
    Crawler --> Utils["📁 utils/ <br/>工具函数"]

    Data --> Public["📁 public/ <br/>精灵/技能图片"]
    Data --> Uploads["📁 uploads/ <br/>上传/素材库"]
```

---

## 4. 数据流架构

```mermaid
flowchart LR
    subgraph DataSource["数据源"]
        BWIKI["BWIKI Wiki"]
        ManualInput["管理员手动录入"]
        LibUpload["素材批量上传"]
    end

    subgraph Processing["数据处理"]
        CrawlerProc["Python 爬虫<br/>解析/清洗/下载图片"]
        ImportProc["DB Import<br/>JSON → SQLite"]
        AdminAPI["Admin API<br/>CRUD + 图片处理"]
    end

    subgraph Storage["存储"]
        JSONFiles["JSON 文件<br/>(data/目录)"]
        SQLiteDB["SQLite DB<br/>(roco.db)"]
        ImageFiles["图片文件<br/>(public/ + uploads/)"]
    end

    subgraph Delivery["交付"]
        RestAPI["REST API<br/>(带缓存)"]
        StaticFiles["静态资源<br/>(Nginx直出)"]
        SPA["Vue SPA<br/>(前端渲染)"]
    end

    BWIKI --> CrawlerProc
    CrawlerProc --> JSONFiles
    JSONFiles --> ImportProc
    ImportProc --> SQLiteDB
    CrawlerProc --> ImageFiles

    ManualInput --> AdminAPI
    LibUpload --> AdminAPI
    AdminAPI --> SQLiteDB
    AdminAPI --> ImageFiles

    SQLiteDB --> RestAPI
    ImageFiles --> StaticFiles
    RestAPI --> SPA
    StaticFiles --> SPA
```

---

## 5. 数据库 ER 图

```mermaid
erDiagram
    elements {
        int id PK
        text key UK
        text name
        text color
        text icon
        text strong_against "JSON"
        text resisted_by "JSON"
        text weak_to "JSON"
        text resistant_to "JSON"
    }

    skills {
        text uid PK
        text name
        int element_id FK
        text category
        int cost
        int power
        text description
        int manual_edit
    }

    pets {
        text uid PK
        text pet_id
        text name
        int element_id FK
        int sub_element_id FK
        text ability_name
        int hp
        int speed
        int atk
        int matk
        int def
        int mdef
        int total
        int manual_edit
    }

    pet_details {
        text pet_uid PK_FK
        text image_default
        text image_shiny
        text image_fruit
        text image_egg
        text evolution_chain "JSON"
        int manual_edit
    }

    pet_skills {
        int id PK
        text pet_uid FK
        text skill_type
        text level
        text name
        text skill_ref_uid FK
    }

    egg_groups {
        int id PK
        text name UK
    }

    pet_egg_groups {
        text pet_uid PK_FK
        int egg_group_id PK_FK
    }

    natures {
        int id PK
        text name UK
        text stat_up
        text stat_down
        text sub_natures "JSON"
    }

    seasons {
        text id PK
        text name
        int is_current
        text pass_pets "JSON"
        text legend_pet
        text season_pets "JSON"
        text shiny_pets "JSON"
    }

    season_events {
        int id PK
        text season_id FK
        text category
        text name
        text pet_uid FK
        text start_date
        text end_date
    }

    pika_monthlies {
        int id PK
        text period
        text name
        text concept_male
        text concept_female
    }

    pika_monthly_pets {
        int id PK
        int monthly_id FK
        text pet_uid
        text locke_male
        text locke_female
    }

    variants_map {
        text pet_id PK
        text pet_uid PK_FK
        int sort_order
    }

    nav_tabs {
        int id PK
        text tab_key UK
        text label
        text route
        text parent_key
        int is_visible
        int sort_order
    }

    elements ||--o{ skills : "element_id"
    elements ||--o{ pets : "element_id"
    pets ||--|| pet_details : "pet_uid"
    pets ||--o{ pet_skills : "pet_uid"
    skills ||--o{ pet_skills : "skill_ref_uid"
    pets ||--o{ pet_egg_groups : "pet_uid"
    egg_groups ||--o{ pet_egg_groups : "egg_group_id"
    pets ||--o{ variants_map : "pet_uid"
    seasons ||--o{ season_events : "season_id"
    pika_monthlies ||--o{ pika_monthly_pets : "monthly_id"
```

---

## 6. 前端路由与页面结构

```mermaid
graph TD
    subgraph UserPages["🎮 用户端 (/rocotools/)"]
        Home["/  首页"]
        Season["/season  赛季"]
        Events["/events  活动日历"]
        Pets["/pets  精灵图鉴"]
        PetDetail["/pets/:uid  精灵详情"]
        Skills["/skills  技能列表"]
        SkillDetail["/skills/:uid  技能详情"]
        Coverage["/coverage  属性覆盖"]
        Eggs["/eggs  蛋组"]
        Natures["/natures  性格"]
        Elements["/elements  属性克制"]
        Pika["/pika  皮卡月刊"]
    end

    subgraph AdminPages["🔧 管理端 (/admin/) - JWT鉴权"]
        AdminLogin["/admin  登录"]
        Dashboard["/admin/dashboard  仪表盘"]
        AdminPets["/admin/pets  精灵管理"]
        AdminPetEdit["/admin/pets/:uid  精灵编辑"]
        AdminSkills["/admin/skills  技能管理"]
        AdminSkillEdit["/admin/skills/:uid  技能编辑"]
        AdminNatures["/admin/natures  性格管理"]
        AdminEggs["/admin/eggs  蛋组管理"]
        AdminSeasons["/admin/seasons  赛季管理"]
        AdminEvents["/admin/events  活动管理"]
        AdminPika["/admin/pika  皮卡月刊"]
        AdminAbilities["/admin/abilities  特性管理"]
        AdminMedia["/admin/media  素材管理"]
        AdminNavTabs["/admin/nav-tabs  导航配置"]
        AdminConflicts["/admin/conflicts  数据冲突"]
    end

    Home --> Pets
    Home --> Skills
    Pets --> PetDetail
    Skills --> SkillDetail
    AdminLogin -->|"JWT验证"| Dashboard
    Dashboard --> AdminPets
    Dashboard --> AdminSkills
    Dashboard --> AdminMedia
```

---

## 7. 后端 API 路由结构

```mermaid
graph LR
    subgraph PublicAPI["公开 API (带缓存)"]
        E["/api/elements<br/>属性 (600s)"]
        S["/api/skills<br/>技能 (300s)"]
        EG["/api/eggs<br/>蛋组 (600s)"]
        P["/api/pets<br/>精灵 (300s)"]
        N["/api/natures<br/>性格 (600s)"]
        SE["/api/seasons<br/>赛季 (600s)"]
        EV["/api/events<br/>活动 (300s)"]
        PK["/api/pika-monthlies<br/>皮卡月刊 (300s)"]
        ST["/api/stats<br/>统计概览"]
    end

    subgraph AdminAPI["管理 API (JWT鉴权)"]
        AL["/api/admin/login"]
        AP["/api/admin/pets"]
        AS["/api/admin/skills"]
        AN["/api/admin/natures"]
        AE["/api/admin/eggs"]
        ASE["/api/admin/seasons"]
        AEV["/api/admin/events"]
        APK["/api/admin/pika"]
        AAB["/api/admin/abilities<br/>特性管理"]
        AM["/api/admin/media<br/>素材浏览"]
        ALB["/api/admin/library<br/>素材库CRUD"]
        ANT["/api/admin/nav-tabs"]
        ABK["/api/admin/backup"]
    end

    subgraph Middleware["中间件"]
        Cache["apiCache<br/>内存缓存"]
        Auth["authAdmin<br/>JWT验证"]
        ClearCache["clearCache<br/>写操作后清缓存"]
    end

    PublicAPI --> Cache
    AdminAPI --> Auth
    AdminAPI --> ClearCache
```

---

## 8. 爬虫模块结构

```mermaid
flowchart TD
    RunPy["🚀 run.py<br/>爬虫入口/调度器"]

    subgraph Scrapers["爬虫模块"]
        PetList["fetch_pet_list.py<br/>精灵列表"]
        PetDetail["fetch_pet_detail.py<br/>精灵详情+图片"]
        SkillList["fetch_skill_list.py<br/>技能列表"]
        EggGroup["fetch_egg_group.py<br/>蛋组数据"]
        Nature["fetch_nature.py<br/>性格数据"]
        ElementChart["fetch_element_chart.py<br/>属性克制表"]
        ProcessElement["process_element_chart.py<br/>属性数据处理"]
    end

    subgraph Utils["工具模块"]
        Request["request.py<br/>HTTP请求封装"]
        Downloader["downloader.py<br/>图片下载器"]
        Report["report.py<br/>运行报告"]
    end

    subgraph Output["输出"]
        JSON["📄 data/*.json"]
        Images["🖼️ data/public/"]
    end

    RunPy --> PetList
    RunPy --> PetDetail
    RunPy --> SkillList
    RunPy --> EggGroup
    RunPy --> Nature
    RunPy --> ElementChart
    ElementChart --> ProcessElement

    PetList --> Request
    PetDetail --> Request
    PetDetail --> Downloader
    SkillList --> Request

    PetList --> JSON
    PetDetail --> JSON
    PetDetail --> Images
    SkillList --> JSON
    EggGroup --> JSON
    Nature --> JSON
    ElementChart --> JSON
```

---

## 9. 部署架构

```mermaid
graph TB
    subgraph Internet["互联网"]
        Browser["🌐 用户浏览器"]
    end

    subgraph TencentCloud["☁️ 腾讯云轻量服务器 (2G/3M)"]
        subgraph NginxLayer["Nginx (反向代理)"]
            SSL["HTTPS/SSL"]
            Brotli["Brotli 压缩"]
            StaticCache["静态资源缓存<br/>365天 immutable"]
            Proxy["反向代理<br/>→ localhost:3000"]
        end

        subgraph AppLayer["应用层"]
            PM2Process["PM2 进程管理"]
            NodeApp["Node.js Express<br/>端口 3000"]
        end

        subgraph DataLayer["数据层"]
            DB["SQLite3<br/>roco.db"]
            PublicDir["public/<br/>精灵/技能图片"]
            UploadsDir["uploads/<br/>上传/素材库"]
        end
    end

    Browser -->|"HTTPS"| SSL
    SSL --> Brotli
    Brotli -->|"/public/ /uploads/"| StaticCache
    Brotli -->|"/api/* /rocotools/*"| Proxy
    StaticCache --> PublicDir
    StaticCache --> UploadsDir
    Proxy --> PM2Process
    PM2Process --> NodeApp
    NodeApp --> DB
```

---

## 10. 素材管理模块详细流程

```mermaid
flowchart TD
    subgraph Upload["上传流程"]
        SelectFiles["选择文件/文件夹"]
        CheckDup{"重名检查<br/>(同目录同名跳过)"}
        Compress["Sharp 压缩<br/>WebP转换"]
        GenThumb["生成缩略图<br/>.thumbs/ 目录"]
        SaveFile["保存到<br/>uploads/library/"]
    end

    subgraph Browse["浏览流程"]
        TabSwitch["Tab切换<br/>素材库/精灵/皮卡/..."]
        LoadDir["加载目录树"]
        LoadFiles["分页加载文件<br/>pageSize=24"]
        Sort["排序<br/>name/time/size"]
        LazyLoad["懒加载图片<br/>IntersectionObserver"]
    end

    subgraph Manage["管理操作"]
        Delete["删除文件/目录"]
        BatchDelete["批量删除"]
        Search["搜索过滤"]
        ViewSwitch["网格/列表视图"]
    end

    SelectFiles --> CheckDup
    CheckDup -->|"不重复"| Compress
    CheckDup -->|"重复"| Skip["跳过"]
    Compress --> GenThumb
    GenThumb --> SaveFile

    TabSwitch --> LoadDir
    LoadDir --> LoadFiles
    LoadFiles --> Sort
    Sort --> LazyLoad
```

---

## 11. 核心数据关系概览

```mermaid
graph TD
    subgraph Core["核心数据实体"]
        Element["🔥 属性 (18)"]
        Skill["⚡ 技能 (469+)"]
        Pet["🐾 精灵 (466+)"]
        EggGroup["🥚 蛋组 (15)"]
        Nature["💫 性格 (30)"]
    end

    subgraph Content["内容数据"]
        Season["🏆 赛季"]
        Event["📅 活动"]
        Pika["📰 皮卡月刊"]
    end

    subgraph System["系统数据"]
        NavTab["🧭 导航标签"]
        Library["📁 素材库"]
    end

    Element -->|"1:N"| Skill
    Element -->|"1:N 主属性"| Pet
    Element -->|"1:N 副属性"| Pet
    Pet -->|"M:N"| EggGroup
    Pet -->|"1:N"| Skill
    Pet -->|"多形态"| Pet

    Season -->|"1:N"| Event
    Pika -->|"N:M"| Pet
    Season -->|"引用"| Pet
    Event -->|"引用"| Pet
```

---

## 12. 前端共享组件依赖

```mermaid
graph TD
    subgraph SharedComponents["共享组件 (components/shared/)"]
        ImageUploader["ImageUploader<br/>图片上传+素材库选取"]
        ImagePreview["ImagePreview<br/>图片预览灯箱"]
        ModalDialog["ModalDialog<br/>通用弹窗"]
        SearchSelect["SearchSelect<br/>搜索下拉"]
        PetPicker["PetPicker<br/>精灵选择器"]
        PetCard["PetCard<br/>精灵卡片"]
        DatePicker["DatePicker<br/>日期选择"]
        StatsRadar["StatsRadar<br/>六维雷达图"]
        ElementMatchup["ElementMatchup<br/>属性克制"]
    end

    subgraph AdminViews["管理端页面"]
        AdminPetEdit2["AdminPetEdit"]
        AdminEvents2["AdminEvents"]
        AdminSeasons2["AdminSeasons"]
        AdminPika2["AdminPikaMonthlies"]
        AdminMedia2["AdminMedia"]
    end

    subgraph Composables["组合式函数 (composables/)"]
        useModal["useModal"]
        useLazyImage["useLazyImage"]
        useImagePreview["useImagePreview"]
        usePageVisibility["usePageVisibility"]
        useAdmin["useAdmin"]
        useTheme["useTheme"]
    end

    AdminPetEdit2 --> ImageUploader
    AdminPetEdit2 --> PetPicker
    AdminPetEdit2 --> SearchSelect
    AdminPetEdit2 --> StatsRadar
    AdminEvents2 --> DatePicker
    AdminEvents2 --> PetPicker
    AdminEvents2 --> ImageUploader
    AdminSeasons2 --> PetPicker
    AdminSeasons2 --> ImageUploader
    AdminPika2 --> PetPicker
    AdminPika2 --> ImageUploader
    AdminMedia2 --> ImagePreview

    ImageUploader --> ModalDialog
    PetPicker --> ModalDialog
    ImagePreview --> useImagePreview
    AdminMedia2 --> useLazyImage

    App_vue["App.vue"] --> usePageVisibility
```

---

## 图例说明

| 符号 | 含义 |
|------|------|
| `PK` | 主键 |
| `FK` | 外键 |
| `UK` | 唯一键 |
| `1:N` | 一对多关系 |
| `M:N` | 多对多关系 |
| `JSON` | 字段存储为JSON字符串 |

---

## 快速导航

- **整体架构** → 第1节
- **技术栈** → 第2节
- **目录结构** → 第3节
- **数据流** → 第4节
- **数据库设计** → 第5节
- **前端路由** → 第6节
- **API结构** → 第7节
- **爬虫模块** → 第8节
- **部署架构** → 第9节
- **素材管理** → 第10节
- **数据关系** → 第11节
- **组件依赖** → 第12节
