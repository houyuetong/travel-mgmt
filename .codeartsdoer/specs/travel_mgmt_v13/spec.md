# 企业差旅管理系统 V1.3 需求规格

> 版本：V1.3 ｜ 基线：V1.2（2026-08-11）｜ 历史基线：V1.1（加固版）、V1.0
> 定位：在 V1.2 基础上新增两项能力——①**UI/UX 视觉体验升级**（引入 Ant Design 组件库、建立统一 Design Token 设计体系、改造为典型企业管理后台布局，需求编号 6A）；②**简体中文 / English 双语支持**（react-i18next + Ant Design ConfigProvider，需求编号 6B）。本版本不新增任何业务能力、不修改任何后端 API。
> 兼容性承诺：V1.0/V1.1/V1.2 全部既有业务规则、接口语义、路由与数据格式保持兼容；本文档完整保留 V1.1、V1.2 内容作为背景基线，V1.3 新增内容以 **【V1.3 新增】** 标注。
> 授权说明：用户已明确授权"所有决策点按推荐方案执行，默认同意，无需再审批"；V1.3 涉及的关键决策点（i18n 资源文件结构、Design Token 具体取值、组件拆分方案、状态颜色映射等）由本需求规格按最佳专业判断确定，并在本文档 5.6/5.7 节、第 6 章及文末"待确认决策点"节记录决策与推荐理由。

## 本版本变更概览（V1.2 → V1.3）

| 需求编号 | 变更类型 | 一句话说明 |
|---------|---------|-----------|
| 6A-1 ~ 6A-13 | 新增 | UI/UX 视觉体验升级：Ant Design 组件库 + Design Token 统一设计体系 + Sidebar/Header/Login/我的申请/新建申请/申请详情/申请审核/员工管理 全页面企业后台布局重构，不改变路由与后端权限 |
| 6B-1 ~ 6B-12 | 新增 | 简体中文/English 双语支持：i18n 框架、Header 语言切换与持久化、业务值显示映射、日期/金额格式化、组件内置语言同步、英文页无残留中文 |

---


# **1. 组件定位**

## **1.1 核心职责**
**【V1.1 基线】** 本组件负责在保持 V1.0 全部业务功能与接口语义不变的前提下，对企业差旅管理系统进行三项安全与可靠性加固：令牌黑名单定期清理、用户唯一性检查的并发原子化、JWT_SECRET 密钥强度校验。

**【V1.2 新增，保持不变】** 本组件进一步负责：定义并落地**版本分支管理策略**（GitHub Flow 简化版，明确 main/feature/release 分支角色、tag 规范与发布流程，含历史版本分支补建）；向**登录页与主界面**展示当前系统运行版本号（vX.Y.Z 格式），版本号以 `server/package.json` 的 version 字段为**单一事实来源**。

**【V1.3 新增】** 本组件进一步负责：在不改变任何后端 API、路由、权限与业务字段语义的前提下，完成前端**视觉体验升级与双语支持**——引入 **Ant Design** 作为主要 UI 组件库（Layout/Menu/Button/Table/Form/Input/Select/DatePicker/Modal/Drawer/Card/Tag/Steps/Timeline/Pagination/Empty/Spin/Message/Dropdown/Avatar），建立统一 **Design Token** 设计体系（企业蓝 Primary、白/浅灰背景、统一圆角/间距/字体/状态色），将页面改造为典型企业管理后台布局（Sidebar + Header）；并新增**简体中文 / English 双语支持**（react-i18next + i18next 管理业务文案，Ant Design ConfigProvider 管理组件内置语言，语言写入 localStorage 刷新保持），所有用户可见文案支持中英切换，英文页面不残留明显中文。

## **1.2 核心输入**
**【V1.1 基线，保持不变】**
1. 系统启动信号（来源：Node.js 进程启动，内容：环境变量配置，含 NODE_ENV、JWT_SECRET）
2. 用户登录请求（来源：前端用户操作，内容：用户名、密码）
3. 用户登出请求（来源：前端用户操作，内容：当前认证令牌）
4. 管理员创建员工请求（来源：管理员前端操作，内容：用户名、姓名、初始密码）
5. 管理员编辑员工请求（来源：管理员前端操作，内容：员工ID、用户名、姓名、状态）
6. 令牌黑名单写入与查询请求（来源：认证服务与鉴权中间件，内容：令牌及其过期时间）

**【V1.2 新增，保持不变】**
7. 版本号查询请求（来源：前端登录页/主界面，内容：无业务参数，仅请求当前版本号）
8. 版本分支管理操作（来源：开发者/运维，内容：创建 feature/release 分支、合并回 main、打 tag 等 git 操作）

**【V1.3 新增】**
9. 语言切换请求（来源：用户操作 Header 中"中文/EN"切换入口，内容：目标语言标识，zh-CN 或 en-US）
10. 本地存储语言偏好读取请求（来源：前端应用启动，内容：localStorage 中保存的语言偏好值）

## **1.3 核心输出**
**【V1.1 基线，保持不变】**
1. 系统启动校验结果（目标：进程运行环境，内容：配置校验通过/告警/失败退出）
2. 登录认证响应（目标：前端调用方，内容：认证令牌与用户信息、角色，行为与 V1.0 一致）
3. 登出结果响应（目标：前端调用方，内容：登出成功标识，行为与 V1.0 一致）
4. 员工管理操作结果响应（目标：管理员前端，内容：创建/编辑结果，行为与 V1.0 一致）
5. 令牌黑名单清理结果（目标：本地文件存储，内容：清理后剩余的有效黑名单条目）
6. 结构化日志（目标：运行环境日志输出，内容：清理操作、配置告警/错误等）

**【V1.2 新增，保持不变】**
7. 版本号查询响应（目标：前端调用方，内容：当前版本号 vX.Y.Z，值来源于 server/package.json 的 version 字段）
8. 版本分支管理结果（目标：本地 git 仓库，内容：main/feature/release 分支与 vX.Y tag 的结构化状态）

**【V1.3 新增】**
9. 双语界面文案（目标：浏览器用户，内容：依据当前语言（zh-CN/en-US）渲染的全部用户可见文案，含 Sidebar/Header/页面标题/按钮/表格列/状态标签/表单标签/占位符/校验提示/弹窗/抽屉/Toast/空态/分页/日期选择/登出等）
10. 业务值双语显示（目标：浏览器用户，内容：状态（待审核/已通过/已拒绝/已撤回）、角色（管理员/普通员工）、用户状态（启用/禁用）、交通工具（飞机/高铁等）的中英文显示标签）
11. 组件内置语言（目标：浏览器用户，内容：Ant Design 组件（DatePicker/Pagination/Modal/Empty 等）内置文案随 ConfigProvider locale 同步切换）

## **1.4 职责边界**
**【V1.1 基线，保持不变】**
1. 本组件不改变 V1.0 的登录、申请提交、撤回、重新提交、审批、用户管理等既有业务行为与接口语义。
2. 本组件不改变前端页面、路由、接口地址与请求/响应数据结构（接口字段与错误码语义保持兼容）。
3. 本组件不引入新的存储技术；仍使用本地 JSON 文件持久化。
4. 本组件不引入分布式锁、消息队列、外部缓存等新组件；并发互斥仅基于现有进程内串行写锁机制实现。
5. 本组件不负责数据库级别的数据迁移；`users.json`、`token-blacklist.json` 的存量数据结构保持兼容。
6. 本组件不扩展新的业务功能（如多级审批、报销、通知等），仅对已确认的三项风险点进行加固。

**【V1.2 新增，保持不变】**
7. 本组件不负责代码托管平台（GitHub/GitLab 等）的远端分支策略管理与 CI/CD 流水线建设，仅规范本地仓库的分支与版本管理。
8. 本组件不负责版本号自动化发布工具链（如 semantic-release 等），版本号更新由发布流程手工维护。
9. 本组件不改变 V1.1 的登录、登出、申请提交、审批等既有业务行为与接口语义（版本号展示为纯增量功能）。

**【V1.3 新增】**
10. 本组件不新增任何业务能力（不增加 Dashboard、数据统计图、新搜索功能、新差旅字段、多级审批、报销、附件、消息/邮件通知、审计日志 UI、新角色、部门/组织架构、预算管理等）。
11. 本组件不修改任何后端 API、路由、鉴权中间件与后端业务枚举；V1.3 不做数据迁移，历史 JSON 数据（users.json、requests.json 等）格式保持兼容。
12. 本组件不修改既有业务字段、表单校验规则与状态机流转规则；UI 重构仅改变展示形式，不改变业务语义。
13. 本组件不引入大面积渐变、复杂动画、过度装饰等视觉元素；不改变登录逻辑（不新增注册/忘记密码）。
14. 本组件不改动后端返回的中文业务值（待审核/已通过/已拒绝/已撤回、管理员/普通员工、飞机/高铁等）；双语切换仅由前端显示映射层负责。

# **2. 领域术语**

**【V1.1 基线，保持不变】**

**加固**
: 在不改变既有业务语义的前提下，对系统安全性、可靠性、并发正确性进行增强的工程活动。

**令牌黑名单**
: 用于记录已登出、需立即失效的 JWT 令牌的条目集合，持久化于 `token-blacklist.json`。
: 备注：每条黑名单记录包含令牌原文与过期时间（expiresAt）。

**过期条目**
: 黑名单中 `expiresAt` 早于当前时间的记录，可安全删除，不影响任何有效令牌的校验。

**互斥临界区**
: 将"唯一性检查 + 数据写入"视为一个不可分割单元串行执行的区域，用于消除 check-then-act 竞态。
: 备注：V1.1 基于 JsonStoreEngine 既有的 per-collection 串行写锁实现。

**TOCTOU 竞态**
: Time-of-check to time-of-use，指"先检查后使用"之间存在时间窗口、导致并发下检查结果失效的问题。

**弱密钥**
: 长度不足 32 字符，或命中系统内置示例/弱密钥黑名单（如 `dev-jwt-secret-key-for-testing-only`、`your-jwt-secret-key-change-in-production`）的 JWT_SECRET。

**fail-fast**
: 启动阶段立即失败并终止进程的配置校验策略，用于生产环境杜绝弱密钥带病运行。

**【V1.2 新增】**

**GitHub Flow 简化版**
: 一种基于 main 主分支的轻量级分支策略：main 同时承担功能集成与版本发布；新功能从 main 检出 feature/* 分支开发，完成后合并回 main；发布时打 tag 并补建 release/vX.Y 归档分支。
: 备注：别名"单主干分支策略"；不设置独立的 develop 分支。

**main 分支**
: 仓库唯一的开发主分支，既是功能集成的目标分支，也是版本发布的来源分支。

**feature 分支**
: 从 main 分支检出的功能开发分支，命名格式 `feature/<功能名>`，开发完成后合并回 main 并删除。

**release 分支**
: 已发布版本的归档维护分支，命名格式 `release/vX.Y`（如 release/v1.2），从对应 tag 创建，仅用于该版本的缺陷修复。

**git tag**
: 指向 main 分支某次发布提交的不可变标签，命名格式 `vX.Y`（如 v1.2），用于标记已发布版本。

**版本号（version）**
: 系统当前运行版本的标识，遵循语义化版本格式 `X.Y.Z`（如 1.2.0），对外展示格式 `vX.Y.Z`（如 v1.2.0）。
: 备注：与 CHANGELOG.md 版本章节号、git tag（vX.Y）保持对应。

**单一事实来源**
: 版本号唯一维护位置的定义：除 server/package.json 的 version 字段外，前端与后端均不得硬编码版本号。
: 备注：避免两处手写导致版本号不一致。

**【V1.3 新增】**

**Design Token**
: 统一设计变量集合，定义颜色（Primary Color/Background/Border/Status Color）、圆角（Radius）、间距（Spacing）、字体（Typography）等视觉基础值，作为全站样式的单一数据源。
: 备注：V1.3 采用 Ant Design ConfigProvider token 机制承载，避免散落的 inline style。

**Modern Enterprise SaaS 风格**
: 成熟企业级软件外观：白/浅灰背景、企业蓝主色、清晰字体与留白信息层级、统一按钮/表格/表单/状态标签/圆角/间距；不使用大面积渐变、复杂动画与过度装饰。

**业务值（business value）**
: 后端持久化与接口传输使用的真实业务取值，如申请状态"待审核/已通过/已拒绝/已撤回"、角色"管理员/普通员工"、用户状态"启用/禁用"、交通工具"火车/飞机/汽车/高铁/轮船/其他"。
: 备注：V1.3 不改动这些值，双语显示仅由前端映射层转换。

**显示映射（display mapping）**
: 前端将后端业务值映射为界面显示标签的配置表，例如 待审核 → zh:待审核 / en:Pending。
: 备注：请求 API 时仍发送后端业务值（如"待审核"），仅展示层输出本地化标签。

**i18n（国际化）**
: Internationalization，本版本指简体中文（zh-CN）与英文（en-US）双语言支持，采用 react-i18next + i18next 管理业务文案、Ant Design ConfigProvider 管理组件内置语言。

**本地化（localization）**
: 依据当前语言（zh-CN/en-US）将日期、金额、状态、按钮、表格列等用户可见内容转换为对应语言的展示形式。

# **3. 角色与边界**

## **3.1 核心角色**
**【V1.1 基线，保持不变】**
- 管理员：执行员工创建、编辑、禁用/启用、重置密码等管理操作；V1.1 加固不改变其操作方式与返回结果。
- 普通员工：执行登录、登出、差旅申请相关操作；V1.1 加固不改变其操作方式与返回结果。

**【V1.2 新增，保持不变】**
- 开发者/运维：执行版本分支管理操作（创建 feature/release 分支、合并回 main、打 tag），并按发布流程维护版本号与 CHANGELOG.md。

**【V1.3 新增】**
- 中英双语用户：所有既有角色（管理员、普通员工）用户均可选择使用简体中文或英文界面；语言选择按用户浏览器端记忆，不区分角色。

## **3.2 外部系统**
**【V1.1 基线，保持不变】**
- 本地文件存储系统：读写 `users.json`、`token-blacklist.json` 等 JSON 数据文件。
- 初始化配置：系统启动时提供环境变量（NODE_ENV、JWT_SECRET、INIT_ADMIN_* 等）。

**【V1.2 新增，保持不变】**
- 本地 git 仓库：承载 main/feature/release 分支与 vX.Y tag，反映版本管理与发布状态。

**【V1.3 新增】**
- 浏览器本地存储（localStorage）：保存用户语言偏好，刷新页面后语言保持。
- 前端 i18n 资源：zh-CN/en-US 两套业务文案资源与显示映射表（前端静态资源，不涉及后端接口）。
- 后端现有 API（保持不变）：V1.3 仅复用既有登录、员工、申请、审批接口；双语页面调用 API 时仍发送后端可识别的中文业务值，接口地址、请求/响应结构完全不变。

## **3.3 交互上下文**

```plantuml
@startuml
left to right direction
actor "管理员" as Admin
actor "普通员工" as Employee
actor "开发者/运维" as Dev
actor "双语用户" as I18nUser
rectangle "企业差旅管理系统 V1.3" as System
database "本地文件存储" as Storage
component "初始化配置" as Config
database "本地 git 仓库" as Git
component "浏览器 localStorage" as LS
component "前端 i18n 资源" as I18n

Admin --> System : 创建/编辑员工（唯一性原子校验）
Employee --> System : 登录 / 登出（黑名单清理）
Employee --> System : 查看登录页/主界面（展示版本号）
I18nUser --> System : 切换中/英语言（Header）
I18nUser --> LS : 语言偏好读写（刷新保持）
System --> I18n : 读取 zh-CN/en-US 文案与显示映射
System --> Storage : 读写用户与令牌黑名单数据（业务值不变）
Config --> System : 提供 NODE_ENV / JWT_SECRET 等配置
System --> Config : 启动期密钥强度校验
System --> Dev : 版本号查询接口（vX.Y.Z）
Dev --> Git : 分支管理 / 打 tag / 发布
@enduml
```

# **4. DFX约束**

## **4.1 性能**
**【V1.1 基线，保持不变】**
1. 核心接口（登录、登出、员工创建、员工编辑）响应时间上限保持 V1.0 基线：2 秒（单机本地文件存储场景）。
2. 黑名单单次按需清理的过期条目数不做上限限定，但单次清理必须为同步文件写入且不得引入额外的轮询/定时任务。
3. 用户唯一性原子化方法不得引入除既有写锁之外的新增等待机制；临界区外不增加额外 I/O。

**【V1.2 新增，保持不变】**
4. 版本号查询接口响应时间上限 200ms（公开静态数据，无存储 I/O、无鉴权开销）。

**【V1.3 新增】**
5. 语言切换后界面文案渲染必须在 500ms 内完成（本地资源切换，无网络请求、无后端交互）。
6. 页面首次加载 i18n 资源不得阻塞首屏渲染超过 500ms；语言资源为前端静态打包，不发起额外网络请求。

## **4.2 可靠性**
**【V1.1 基线，保持不变】**
1. 黑名单清理失败（含写入失败）不得阻断登录/登出主流程，且不得导致有效条目丢失或重复。
2. 用户唯一性原子化必须保证 users 集合强一致：并发操作后，任一用户名最多对应一个账号记录。
3. 清理与登出写入并发时必须串行执行，避免互相覆盖丢失数据。

**【V1.2 新增，保持不变】**
4. 版本号查询接口不可用（异常/超时）时，不得影响登录、登出等既有主流程；前端按降级策略隐藏版本号。

**【V1.3 新增】**
5. 语言偏好读写 localStorage 失败时，系统必须按默认语言（zh-CN）正常渲染，不得阻塞页面使用、不得抛出错误。
6. i18n 资源缺失/加载失败时，界面必须降级为简体中文渲染，且不得影响既有业务功能可用性。

## **4.3 安全性**
**【V1.1 基线，保持不变】**
1. JWT_SECRET 必须满足最小长度 ≥ 32 字符且不得命中内置示例/弱密钥黑名单。
2. 生产模式（NODE_ENV=production）下弱密钥必须导致启动失败，禁止带病运行。
3. 非生产模式下弱密钥必须输出告警日志，便于开发阶段及早发现。
4. 用户密码存储方式、令牌签发与校验机制保持 V1.0 不变（bcrypt + JWT）。

**【V1.2 新增，保持不变】**
5. 版本号查询接口必须为公开只读接口，不要求认证、不返回任何敏感业务数据，不暴露服务器内部信息。

**【V1.3 新增】**
6. 语言切换入口必须对所有登录用户可见（管理员与普通员工均可切换），不涉及接口鉴权变更。
7. 语言切换不改变既有认证与鉴权逻辑：员工仍不能访问管理员页面，管理员仍可访问全部管理页面。
8. 双语显示映射仅做前端展示转换，不得将语言标识或英文业务值提交给后端；API 请求体/参数必须保持后端可识别的原始中文业务值。

## **4.4 可维护性**
**【V1.1 基线，保持不变】**
1. 黑名单清理操作必须输出结构化日志，包含清理时间、清理前/后条目数。
2. 启动期配置校验失败/告警必须输出结构化日志，包含失败原因类别（缺失/过短/命中黑名单）。
3. 新增错误信息必须遵循既有错误码与错误提示规范，便于问题定位。

**【V1.2 新增，保持不变】**
4. 版本号更新仅需修改 `server/package.json` 一处，并同步在 CHANGELOG.md 顶部追加对应版本章节。
5. 分支命名（feature/*、release/vX.Y）与 tag 命名（vX.Y）必须遵循本文档规范，便于版本追溯。

**【V1.3 新增】**
6. 全部用户可见文案必须集中管理于 i18n 资源文件（zh-CN/en-US），禁止散落硬编码在页面组件中。
7. 新增/修改文案必须同时维护中英两套资源，缺失任一语言键时按降级规则处理（见 4.2-6）。
8. 业务值显示映射表必须单一维护（一个映射模块/配置文件），禁止在各页面重复散落映射逻辑。

## **4.5 兼容性**
**【V1.1 基线，保持不变】**
1. V1.0 全部对外接口、请求参数、响应结构与错误码语义保持兼容，V1.1 不引入破坏性变更。
2. `users.json`、`token-blacklist.json` 存量数据格式保持兼容，无需数据迁移。
3. 开发模式下的默认 `JWT_SECRET` 示例值在 V1.1 起将被判定为弱密钥（开发模式告警、生产模式拦截），属预期行为变更，不影响开发启动。

**【V1.2 新增，保持不变】**
4. 新增的版本号查询接口为纯增量公开接口，不影响 V1.1 既有任何接口的地址、请求/响应结构与错误码语义。
5. 版本号展示为前端纯增量功能，不改变既有页面的功能与布局语义。

**【V1.3 新增】**
6. V1.3 不修改任何既有接口的地址、请求参数、响应结构与错误码语义；不改变后端业务枚举与历史 JSON 数据格式，无需数据迁移。
7. UI 重构不得改变既有路由（/login、/employee/requests 等）、权限守卫（AdminRoute/EmployeeRoute）与表单字段校验规则。
8. 双语切换仅影响前端显示层，后端返回的业务值（中文）保持不变；英文页面展示的标签为前端映射结果，非后端数据变更。
9. 既有自动化测试（服务端 node:test 与 E2E Playwright）必须全部通过，确保 v1.2 业务无回归。
# **5. 核心能力**

> 说明：5.1 ~ 5.3 为 V1.1 基线需求（背景，保持兼容，本版本不修改）；5.4 ~ 5.5 为 V1.2 新增需求。

## **5.1 令牌黑名单定期清理**【V1.1 基线，保持不变】

### **5.1.1 业务规则**

1. **启动清理规则**：系统完成存储初始化后，必须清理令牌黑名单中的全部过期条目。
   a. 验收条件：When 系统启动并完成存储初始化，the system shall 清理 `token-blacklist` 中全部过期条目并将结果持久化。
2. **登录按需清理规则**：用户登录成功时，系统必须按需清理令牌黑名单中的过期条目。
   a. 验收条件：When 用户登录成功，the system shall 清理 `token-blacklist` 中的过期条目并持久化，且不影响本次登录结果。
3. **登出按需清理规则**：用户登出时，系统在将当前令牌加入黑名单后，必须按需清理过期条目。
   a. 验收条件：When 用户执行登出操作，the system shall 将当前令牌加入黑名单并清理既有过期条目，随后返回登出成功。
4. **清理范围规则**：清理操作仅允许移除 `expiresAt` 早于当前时间的条目，禁止误删未过期条目。
   a. 验收条件：When 清理操作执行完毕，the system shall 仅删除已过期条目，所有未过期条目保持完整。
5. **清理并发安全规则**：清理操作必须与黑名单的读写操作（含登出加入条目、鉴权查询）在同一互斥临界区内串行执行。
   a. 验收条件：While 清理操作与登出加入条目并发发生，the system shall 串行执行两者，保证既有有效条目与新增条目均不丢失。
6. **清理容错规则**：清理或清理后的持久化失败时，系统必须回滚内存态、记录错误日志，且不得阻断登录/登出主流程。
   a. 验收条件：If 清理持久化失败，the system shall 恢复清理前的内存态、输出错误日志，并照常返回登录/登出结果。
7. **黑名单校验语义保持规则**：清理机制不得改变令牌失效校验语义——已登出令牌（含过期与未过期）访问接口仍必须被拒绝。
   a. 验收条件：While 令牌处于黑名单中，when 携带该令牌访问业务接口，the system shall 返回令牌已失效错误（与 V1.0 一致）。
8. **清理时机范围规则**：V1.1 仅允许在启动、登录成功、登出三个时机触发清理，禁止引入独立定时任务或新增清理入口。
   a. 验收条件：If 除上述三个时机外存在任何其他自动清理触发源，the system shall 不产生该行为（该条件用于约束实现范围）。

### **5.1.2 交互流程**

```plantuml
@startuml
actor "用户" as User
participant "企业差旅管理系统" as System
database "token-blacklist.json" as Blacklist

== 启动 ==
System -> System : 存储初始化完成
System -> System : 清理全部过期条目
System -> Blacklist : 持久化剩余有效条目

== 登录成功 ==
User -> System : 提交用户名与密码
System -> System : 校验通过、签发令牌
System -> System : 按需清理过期条目
System -> Blacklist : 持久化
System --> User : 返回令牌与用户信息

== 登出 ==
User -> System : 登出请求（携带令牌）
System -> Blacklist : 将当前令牌加入黑名单
System -> System : 按需清理过期条目
System -> Blacklist : 持久化
System --> User : 返回登出成功
@enduml
```

### **5.1.3 异常场景**

1. **清理持久化失败**
   a. 触发条件：清理后写入 `token-blacklist.json` 失败
   b. 系统行为：恢复清理前内存态，输出错误日志，继续完成登录/登出主流程
   c. 用户感知：登录/登出接口仍返回正常结果；通过日志定位失败原因
2. **清理与登出写入并发竞争**
   a. 触发条件：登出加入新条目与清理过期条目同时发生
   b. 系统行为：两者在统一临界区内串行执行，不丢失任何条目
   c. 用户感知：无感知，登出返回成功
3. **数据文件损坏导致清理无法解析**
   a. 触发条件：`token-blacklist.json` 内容损坏、无法解析
   b. 系统行为：记录错误日志，不执行清理，不阻断主流程（行为不劣于 V1.0）
   c. 用户感知：登录/登出按 V1.0 行为继续，错误仅记录于日志

## **5.2 用户唯一性并发原子化**【V1.1 基线，保持不变】

### **5.2.1 业务规则**

1. **创建原子化规则**：创建员工时，"用户名唯一性检查 + 写入用户数据"必须整体纳入同一互斥临界区执行。
   a. 验收条件：When 管理员发起创建员工请求，the system shall 在临界区内完成唯一性检查与数据写入，消除检查与写入之间的竞态窗口。
2. **编辑原子化规则**：修改员工用户名时，"新用户名唯一性检查 + 写入更新数据"必须整体纳入同一互斥临界区执行。
   a. 验收条件：When 管理员提交修改员工用户名的请求，the system shall 在临界区内校验新用户名唯一性后写入更新。
3. **并发重名单成功规则**：并发提交相同用户名的创建请求时，最终必须仅有一个请求成功创建账号。
   a. 验收条件：When 两个创建请求携带相同用户名并发提交，the system shall 仅允许其中一个成功，另一个被拒绝。
4. **并发失败语义保持规则**：并发冲突失败必须返回与 V1.0 完全一致的错误码与提示（`USER_NAME_CONFLICT`、HTTP 409、"用户名已存在"）。
   a. 验收条件：If 并发场景下唯一性校验失败，the system shall 返回错误码 `USER_NAME_CONFLICT`、HTTP 状态 409 及提示"用户名已存在"。
5. **复用既有写锁规则**：原子化方法必须复用 JsonStoreEngine 既有的 per-collection 串行写锁实现临界区，禁止引入新的锁机制或外部组件。
   a. 验收条件：When 原子化方法执行，the system shall 基于既有 users 集合串行写锁将检查与写入串行化，且不引入新依赖。
6. **非用户集合不受影响规则**：本版本仅对 users 集合的唯一性敏感操作进行原子化，requests、audit-logs、token-blacklist 的既有行为与并发特性保持不变。
   a. 验收条件：When 申请提交、审批、审计记录、黑名单写入等非用户集合操作执行，the system shall 行为与 V1.0 完全一致。
7. **接口语义保持规则**：原子化加固不得改变创建/编辑员工接口的请求参数、成功响应结构与字段校验规则。
   a. 验收条件：When 创建/编辑员工请求成功，the system shall 返回与 V1.0 结构一致的响应数据（含审计记录行为不变）。
8. **唯一性约束保证规则**：任一时刻，users 集合中不得存在两个用户名相同的账号记录（含并发场景）。
   a. 验收条件：While 系统处于运行状态，when 任意时刻查询 users 集合，the system shall 不存在用户名重复的记录。

### **5.2.2 交互流程**

```plantuml
@startuml
actor "管理员" as Admin
participant "企业差旅管理系统" as System
database "users.json" as Users

== 创建员工（并发场景） ==
Admin -> System : 提交创建请求（用户名 A）
Admin -> System : 提交创建请求（用户名 A，并发）
System -> System : 进入 users 互斥临界区（串行执行）
System -> System : 临界区内检查用户名唯一性
alt 唯一性通过
    System -> Users : 写入新账号
    System --> Admin : 返回创建成功
else 唯一性冲突
    System --> Admin : 返回 USER_NAME_CONFLICT(409) "用户名已存在"
end
@enduml
```

### **5.2.3 异常场景**

1. **并发用户名冲突**
   a. 触发条件：多个管理员并发创建/修改为相同用户名
   b. 系统行为：在临界区内串行校验，仅首个通过，其余返回唯一性冲突
   c. 用户感知：错误码 `USER_NAME_CONFLICT`、HTTP 409、提示"用户名已存在"（与 V1.0 一致）
2. **临界区内写入失败**
   a. 触发条件：唯一性检查通过后写入 `users.json` 失败
   b. 系统行为：回滚内存态，输出错误日志
   c. 用户感知：错误码 `STORE_WRITE_FAILED`、HTTP 500、提示"数据写入失败"（与 V1.0 一致）
3. **数据文件损坏导致临界区内读取失败**
   a. 触发条件：`users.json` 内容损坏、无法解析
   b. 系统行为：记录错误日志，拒绝本次创建/编辑操作
   c. 用户感知：返回明确的服务端错误，不产生半写入状态

## **5.3 JWT_SECRET 强度校验**【V1.1 基线，保持不变】

### **5.3.1 业务规则**

1. **最小长度规则**：JWT_SECRET 的长度必须不少于 32 字符。
   a. 验收条件：If JWT_SECRET 长度小于 32 字符，the system shall 将其判定为弱密钥。
2. **弱密钥黑名单规则**：JWT_SECRET 命中内置示例/弱密钥黑名单时必须被判定为弱密钥；黑名单至少包含 `dev-jwt-secret-key-for-testing-only` 与 `your-jwt-secret-key-change-in-production`。
   a. 验收条件：If JWT_SECRET 与黑名单中任一示例值完全一致，the system shall 将其判定为弱密钥。
3. **生产模式 fail-fast 规则**：当 NODE_ENV=production 时，若 JWT_SECRET 缺失、过短或命中黑名单，系统必须拒绝启动并终止进程。
   a. 验收条件：While 系统处于生产模式启动流程，if JWT_SECRET 为弱密钥或缺失，the system shall 终止启动并输出错误日志。
4. **开发模式告警规则**：当 NODE_ENV 非 production 时，若 JWT_SECRET 为弱密钥，系统必须输出告警日志并允许继续启动。
   a. 验收条件：While 系统处于非生产模式启动流程，if JWT_SECRET 为弱密钥，the system shall 输出告警日志并正常启动。
5. **密钥缺失拒绝启动规则**：任何模式下 JWT_SECRET 未配置时，系统必须拒绝启动并提示配置缺失（保持 V1.0 语义）。
   a. 验收条件：If JWT_SECRET 未配置，the system shall 拒绝启动并输出配置缺失错误。
6. **错误信息可定位规则**：生产模式下拒绝启动的错误信息必须明确失败原因类别（缺失 / 长度不足 / 命中示例黑名单）。
   a. 验收条件：When 生产模式因弱密钥拒绝启动，the system shall 在错误信息中指出具体失败原因类别。
7. **校验时机规则**：JWT_SECRET 强度校验必须在服务开始监听端口之前完成。
   a. 验收条件：When 启动流程执行密钥校验，the system shall 在端口监听前完成校验，确保弱密钥进程不会对外提供服务。

### **5.3.2 交互流程**

```plantuml
@startuml
actor "运维/开发者" as Ops
participant "企业差旅管理系统（启动流程）" as System

Ops -> System : 设置 NODE_ENV 与 JWT_SECRET 并启动
System -> System : 加载配置
System -> System : 校验 JWT_SECRET（缺失 / 长度 / 黑名单）
alt 生产模式
    alt 校验通过
        System -> System : 继续初始化并监听端口
    else 校验失败（弱密钥或缺失）
        System -> Ops : 输出明确错误并终止进程
    end
else 非生产模式
    alt 校验通过
        System -> System : 继续启动
    else 弱密钥
        System -> Ops : 输出告警日志
        System -> System : 继续启动
    end
end
@enduml
```

### **5.3.3 异常场景**

1. **生产模式弱密钥**
   a. 触发条件：NODE_ENV=production 且 JWT_SECRET 缺失 / 过短 / 命中示例黑名单
   b. 系统行为：输出包含失败原因的错误日志并终止进程，不监听端口
   c. 用户感知：进程退出码非 0，控制台输出明确错误信息
2. **开发模式弱密钥**
   a. 触发条件：NODE_ENV 非 production 且 JWT_SECRET 为弱密钥
   b. 系统行为：输出告警日志后继续正常启动
   c. 用户感知：控制台输出 WARN 告警，服务照常可用
3. **强密钥校验通过**
   a. 触发条件：JWT_SECRET 长度 ≥ 32 字符且未命中黑名单
   b. 系统行为：不输出告警，正常完成启动
   c. 用户感知：无额外提示，启动日志与 V1.0 一致

## **5.4 版本分支管理策略**【V1.2 新增】（需求编号 5A）

> 工程流程类需求：规范本地 git 仓库的分支与版本管理。V1.2 实施时需落地为实际分支与 tag 操作（任务归属 design/tasks 阶段）。

### **5.4.1 业务规则**

1. **5A-1 main 主分支角色（Eb）**：main 分支必须作为系统唯一的开发主分支，同时承担功能集成与版本发布角色。
   a. 验收条件：When 版本发布或功能集成操作执行，the system shall 以 main 分支为唯一基准分支。
2. **5A-2 feature 分支创建规则（Ev）**：任何新功能开发必须从 main 分支检出 `feature/*` 分支进行，禁止直接在 main 分支上开发新功能。
   a. 验收条件：When 开发者开始新功能开发，the system shall 从 main 分支创建 feature/<功能名> 分支。
3. **5A-3 feature 分支命名规则（Eb）**：feature 分支命名必须遵循 `feature/<功能名>` 格式，名称应能体现功能含义。
   a. 验收条件：When 创建 feature 分支，the system shall 分支名以 feature/ 为前缀且名称可辨识功能内容。
4. **5A-4 feature 合并回 main 规则（Ev）**：feature 分支开发完成并验证通过后，必须合并回 main 分支，合并后可删除该 feature 分支。
   a. 验收条件：When feature 分支开发完成，the system shall 将变更合并回 main 分支。
5. **5A-5 发布 tag 规则（Ev）**：每个已发布版本必须从 main 分支创建 git tag，命名格式为 `vX.Y`（如 v1.2）。
   a. 验收条件：When 版本 vX.Y 发布，the system shall 在 main 分支上创建 vX.Y 格式的 tag。
6. **5A-6 release 归档分支规则（Ev）**：每个已发布版本必须从对应 tag 创建 `release/vX.Y` 归档分支。
   a. 验收条件：When tag vX.Y 创建完成，the system shall 从该 tag 创建 release/vX.Y 分支。
7. **5A-7 历史分支补建规则（Ev）**：V1.2 实施时必须从既有 tag v1.0、v1.1 补建 `release/v1.0`、`release/v1.1` 分支。
   a. 验收条件：When V1.2 版本实施完成，the system shall 存在 release/v1.0 与 release/v1.1 分支，且分别指向 v1.0 与 v1.1 tag 对应提交。
8. **5A-8 V1.2 发布流程规则（Ev）**：V1.2 版本开发与发布必须遵循：新建 feature 分支开发 → 合并回 main → 打 tag v1.2 → 补建 release/v1.2。
   a. 验收条件：When V1.2 发布流程执行，the system shall 依次完成 feature 开发合并、main 打 tag v1.2、release/v1.2 分支补建。
9. **5A-9 release 分支变更约束（Eu）**：release/vX.Y 归档分支仅允许该版本的缺陷修复，禁止直接开发或合并新功能。
   a. 验收条件：If 新功能变更被直接提交到 release/vX.Y 分支，the system shall 该变更不得进入对应发布版本内容。
10. **5A-10 main 直接开发约束（Eu）**：main 分支禁止直接提交新功能开发变更，仅允许合并 feature 分支、创建 tag 与文档/配置类维护。
    a. 验收条件：If 新功能开发变更被直接提交到 main 分支，the system shall 要求其改走 feature 分支流程。
11. **5A-11 命名唯一性规则（Eb）**：仓库内 git tag 与分支名称必须唯一，不得重复创建。
    a. 验收条件：When 创建 git tag 或分支，the system shall 保证名称在仓库内唯一。
12. **5A-12 tag 与 CHANGELOG 一致性规则（Ev）**：打 tag 前 CHANGELOG.md 必须已包含对应版本章节，且版本号与 tag 一致。
    a. 验收条件：When 创建 tag vX.Y，the system shall CHANGELOG.md 已存在 [X.Y.0] 版本章节且版本号一致。
13. **5A-13 分支策略文档化规则（Eb）**：版本分支管理策略必须记录于仓库内文档（如 BRANCHING.md 或 README 章节），供团队遵循。
    a. 验收条件：When 检视仓库文档，the system shall 存在描述 main/feature/release/tag 角色的版本管理规范文档。

### **5.4.2 交互流程**

```plantuml
@startuml
actor "开发者/运维" as Dev
participant "本地 git 仓库" as Git
participant "CHANGELOG.md" as Chg

== V1.2 版本发布流程 ==
Dev -> Git : 从 main 检出 feature/travel-mgmt-v1.2
Dev -> Git : 在 feature 分支开发并提交 V1.2 变更
Dev -> Git : 合并 feature 回 main
Dev -> Chg : 更新 CHANGELOG.md 新增 [1.2.0] 章节
Dev -> Git : 在 main 打 tag v1.2
Dev -> Git : 从 tag v1.2 创建 release/v1.2

== 历史版本分支补建 ==
Dev -> Git : 从 tag v1.0 创建 release/v1.0
Dev -> Git : 从 tag v1.1 创建 release/v1.1
note over Git : main(含 V1.2) + tag v1.2 + release/v1.0/v1.1/v1.2
@enduml
```

### **5.4.3 异常场景**

1. **tag 与 CHANGELOG 版本不一致**
   a. 触发条件：打 tag 时 CHANGELOG.md 缺失对应版本章节或版本号不符
   b. 系统行为：发布流程视为未完成，需先补齐 CHANGELOG 后再打 tag
   c. 用户感知：通过文档与 tag 对照可发现不一致，需人工修正
2. **main 分支直接开发新功能**
   a. 触发条件：开发者绕过 feature 分支直接在 main 提交功能变更
   b. 系统行为：属流程违规，应回退提交并改用 feature 分支流程
   c. 用户感知：通过 git log 审查发现，人工纠正
3. **分支/tag 命名冲突**
   a. 触发条件：创建已存在的分支名或 tag 名
   b. 系统行为：git 拒绝创建（名称冲突错误）
   c. 用户感知：命令失败，需更换名称
4. **release 分支混入新功能**
   a. 触发条件：新功能变更被直接提交/合并到 release/vX.Y
   b. 系统行为：该变更不得进入对应发布版本
   c. 用户感知：通过代码评审与 git 审查拦截

## **5.5 版本号展示**【V1.2 新增】（需求编号 5B）

### **5.5.1 业务规则**

1. **5B-1 版本号单一来源规则（Eb）**：系统版本号必须以 `server/package.json` 的 version 字段为唯一事实来源，前端与后端其他位置禁止硬编码版本号。
   a. 验收条件：When 系统启动并对外提供版本信息，the system shall 版本号值恒等于 server/package.json 的 version 字段。
2. **5B-2 版本号格式规则（Eb）**：版本号必须遵循语义化版本格式 `X.Y.Z`（如 1.2.0），对外展示格式为 `vX.Y.Z`（如 v1.2.0）。
   a. 验收条件：When 前端展示版本号，the system shall 以 vX.Y.Z 格式呈现。
3. **5B-3 公开版本接口规则（Ev）**：后端必须提供公开的版本查询接口，返回当前版本号。
   a. 验收条件：When 客户端（含未登录）调用版本查询接口，the system shall 返回 HTTP 200 与当前版本号。
4. **5B-4 接口免鉴权规则（Ev）**：版本查询接口必须允许匿名访问，不要求携带 JWT 认证令牌。
   a. 验收条件：When 未携带认证令牌访问版本接口，the system shall 正常返回版本信息（而非 401）。
5. **5B-5 接口响应结构规则（Ev）**：版本查询接口的响应必须包含版本号字段。
   a. 验收条件：When 版本接口返回成功，the system shall 响应中包含 version 字段且值等于 server/package.json 的 version。
6. **5B-6 登录页展示规则（Ev）**：登录页面必须展示当前系统版本号。
   a. 验收条件：When 用户打开登录页，the system shall 在页面可见位置展示 vX.Y.Z 格式的版本号。
7. **5B-7 主界面展示规则（Ev）**：登录后的主界面（页脚或顶栏）必须展示当前系统版本号。
   a. 验收条件：When 用户登录进入任一主界面页面，the system shall 在页脚/顶栏可见位置展示版本号。
8. **5B-8 展示一致性规则（Eb）**：登录页与主界面展示的版本号必须来自同一数据源（同一版本接口），两处展示必须一致。
   a. 验收条件：When 同一运行实例中分别查看登录页与主界面，the system shall 两处版本号完全一致。
9. **5B-9 获取失败降级规则（Eu）**：前端获取版本号失败时（接口异常、网络错误、超时等），必须隐藏版本号展示，不得阻断页面使用，不得弹出错误提示。
   a. 验收条件：If 版本接口请求失败，the system shall 隐藏版本号且页面其他功能正常可用、无错误提示。
10. **5B-10 版本自动跟随规则（Ev）**：后续版本升级时，仅需更新 `server/package.json` 的 version 字段，前端展示的版本号必须自动跟随，无需前端代码改动。
    a. 验收条件：When server/package.json 的 version 更新为新值并重新部署，the system shall 登录页与主界面自动展示新版本号。
11. **5B-11 不影响既有接口规则（Ev）**：新增版本接口不得改变 V1.1 既有接口的地址、请求/响应结构与错误码语义。
    a. 验收条件：When V1.2 发布后执行既有接口回归，the system shall 既有接口行为与 V1.1 完全一致。

### **5.5.2 交互流程**

```plantuml
@startuml
actor "用户" as User
participant "登录页/主界面（前端）" as FE
participant "版本查询接口（后端）" as BE
participant "server/package.json" as Pkg

User -> FE : 打开登录页或进入主界面
FE -> BE : 请求当前版本号（无鉴权）
BE -> Pkg : 读取 version 字段
Pkg --> BE : 返回 version（如 1.2.0）
BE --> FE : 返回版本号
FE -> FE : 以 vX.Y.Z 格式展示

alt 版本接口失败
    FE -> FE : 隐藏版本号（不阻断页面、不弹错误）
end
@enduml
```

### **5.5.3 异常场景**

1. **版本接口请求失败**
   a. 触发条件：网络异常、后端未启动或接口超时
   b. 系统行为：前端隐藏版本号，不展示、不报错，不阻断页面
   c. 用户感知：页面正常使用，仅版本号区域不可见
2. **package.json 版本字段缺失或格式非法**
   a. 触发条件：server/package.json 无 version 字段或不符合 X.Y.Z 格式
   b. 系统行为：后端按配置缺失/异常处理，接口返回失败（具体语义由 design 定义）
   c. 用户感知：前端按失败降级处理，隐藏版本号
3. **版本号与 tag/CHANGELOG 不一致**
   a. 触发条件：发布时未同步更新 CHANGELOG 或 git tag
   b. 系统行为：页面展示 server/package.json 中的版本号（正确来源），CHANGELOG/tag 需人工对齐
   c. 用户感知：通过文档与页面比对可发现不一致

## **5.6 UI/UX 视觉体验升级**【V1.3 新增】（需求编号 6A）

> 定位：将前端从"功能可用 Demo"升级为"成熟企业内部差旅管理系统"。仅改变展示形式与信息层级，不新增业务能力、不修改路由与后端权限。
> 决策记录（推荐方案）：引入 **Ant Design v5** 作为主要 UI 组件库，通过 `ConfigProvider` theme token 承载 Design Token；原 inline style 逐步收敛为 token 引用；状态颜色映射沿用 Ant Design 语义色体系。

### **5.6.1 业务规则**

1. **6A-1 Design Token 统一规则（Eb）**：系统必须建立统一 Design Token 设计体系，覆盖 Primary Color、Background、Border、Radius、Spacing、Typography、Status Color，全站样式必须引用该体系。
   a. 验收条件：When 用户浏览系统任一页面，the system shall 所有界面元素样式来源于统一 Design Token，不存在散落且不一致的硬编码颜色/间距/圆角。
2. **6A-2 Ant Design 组件库规则（Eb）**：系统必须引入 Ant Design 作为主要 UI 组件库，覆盖 Layout、Menu、Button、Table、Form、Input、Select、DatePicker、Modal、Drawer、Card、Tag、Steps/Timeline、Pagination、Empty、Spin、Message、Dropdown、Avatar 等组件。
   a. 验收条件：When 系统渲染登录后主界面与各业务页面，the system shall 使用 Ant Design 组件构建，既有 inline style 逐步整理收敛。
3. **6A-3 视觉风格约束规则（Eu）**：界面必须遵循 Modern Enterprise SaaS 风格：白/浅灰背景、企业蓝 Primary、清晰字体留白信息层级、统一按钮/表格/表单/状态标签/圆角/间距；禁止使用大面积渐变、复杂动画与过度装饰。
   a. 验收条件：When 用户浏览任一页面，the system shall 页面不出现大面积渐变/复杂动画/过度装饰，视觉风格统一为企业蓝 + 白/浅灰背景。
4. **6A-4 桌面优先响应式规则（Ev）**：界面必须以桌面为主，同时兼顾基本响应式：不同窗口宽度下不得出现文字重叠、按钮错位、表格溢出。
   a. 验收条件：When 用户在桌面浏览器（≥1280px）与中等宽度（768px-1280px）查看主要页面，the system shall 布局无文字重叠、按钮不错位、Table 不溢出。
5. **6A-5 Sidebar 布局规则（Ev）**：登录后的主界面必须采用 Sidebar 布局，Sidebar 顶部显示系统名称"企业差旅管理/Travel Management"，菜单按角色显示。
   a. 验收条件：When 普通员工登录进入主界面，the system shall Sidebar 显示"我的申请/My Requests"与"新建申请/New Request"菜单。
   b. 验收条件：When 管理员登录进入主界面，the system shall Sidebar 显示"申请审核/Request Review"与"员工管理/Employee Management"菜单。
6. **6A-6 Header 信息规则（Ev）**：Header 必须包含：当前页面标题、中文/EN 语言切换入口、当前用户名与角色（Avatar+Username+Role）、Logout 登出按钮；同时保留版本号展示。
   a. 验收条件：When 用户登录进入任一主界面页面，the system shall Header 同时展示页面标题、语言切换、用户名、角色与登出入口。
7. **6A-7 Login 页面规则（Ev）**：登录页必须改造为成熟企业 SaaS 登录页，包含系统标题、用户名输入、密码输入、登录按钮与统一错误校验提示；必须保持既有登录逻辑，不得新增注册/忘记密码功能。
   a. 验收条件：When 用户打开登录页，the system shall 呈现统一的 SaaS 风格登录表单（标题 + Username + Password + Login + 统一错误提示）。
   b. 验收条件：When 用户提交错误凭证，the system shall 以统一错误校验提示方式展示错误信息，且登录逻辑与 V1.2 一致。
8. **6A-8 我的申请列表规则（Ev）**：员工"我的申请"页面必须使用 Ant Design Table 展示：状态筛选、目的地、日期、预计费用、状态、创建时间、操作列；状态使用统一 Tag；保留分页、撤回、重新提交功能；统一 Loading/Empty 状态；"新建申请"为明显的 Primary Button。
   a. 验收条件：When 普通员工进入"我的申请"页面，the system shall 以 Ant Design Table 展示申请列表，状态以统一 Tag 呈现，支持状态筛选、分页、撤回与重新提交。
   b. 验收条件：When 页面加载中或无数据，the system shall 分别展示 Spin 加载态与 Empty 空态，且"新建申请"按钮为醒目 Primary Button。
9. **6A-9 新建申请表单规则（Ev）**：员工"新建申请"页面必须使用 Card + Form 重构：统一 Label、Placeholder、Required 标记、DatePicker、Select、Input、InputNumber、Submit/Cancel 按钮；必须保持既有字段与校验规则，不新增字段。
   a. 验收条件：When 普通员工进入"新建申请"页面，the system shall 以 Card+Form 布局呈现全部既有字段（目的地、出发/返回日期、事由、交通工具、预计费用），校验规则与 V1.2 完全一致。
   b. 验收条件：When 用户提交或取消，the system shall 表单提供提交（Submit）与取消（Cancel）操作且行为与 V1.2 一致。
10. **6A-10 申请详情信息层级规则（Ev）**：申请详情页必须优化信息层级：页面顶部 Header 展示标题与目的地+状态 Tag；正文分区块展示基本信息、出差事由、审批状态、管理员审批区域；使用 Steps/Timeline 展示 Submitted→Pending→Approved/Rejected 流程（不得增加审批阶段）。
    a. 验收条件：When 用户（员工/管理员）打开申请详情页，the system shall 页面按"基本信息/出差事由/审批状态/管理员审批区域"分区展示，且以 Steps/Timeline 呈现 Submitted→Pending→Approved/Rejected 审批流程。
11. **6A-11 申请审核页规则（Ev）**：管理员"申请审核"页面必须与"我的申请"统一视觉（Ant Design Table、状态 Tag、Pending 待审核状态易识别、详情/Approve/Reject 操作清晰）；必须保留既有筛选、分页与审批意见功能。
    a. 验收条件：When 管理员进入"申请审核"页面，the system shall 以统一 Table 视觉展示全部申请，待审核（Pending）状态 Tag 易于识别，支持筛选、分页、详情、通过（Approve）与拒绝（Reject）且审批意见必填规则不变。
12. **6A-12 员工管理页规则（Ev）**：管理员"员工管理"页面必须使用 Table + Modal/Drawer + Form 承载创建、编辑、启用/禁用、重置密码；低频操作必须收进"更多/More" Dropdown。
    a. 验收条件：When 管理员进入"员工管理"页面，the system shall 以 Table 展示员工列表，"创建员工"为 Primary Button，编辑/启用禁用/重置密码可通过 Modal/Drawer 完成，低频操作收纳于"更多/More" Dropdown。
13. **6A-13 业务语义保持规则（Ev）**：UI 重构不得改变既有路由地址、权限守卫、表单字段与校验规则、状态机流转与接口调用行为。
    a. 验收条件：When V1.3 发布后执行既有自动化测试，the system shall 既有服务端 node:test 与 Playwright E2E 全部通过（无回归）。

### **5.6.2 交互流程**

```plantuml
@startuml
actor "管理员" as Admin
actor "普通员工" as Employee
participant "企业差旅管理系统（Ant Design 前端）" as System

== 登录与布局 ==
Employee -> System : 打开登录页（SaaS 风格）
Employee -> System : 输入用户名/密码登录
System -> Employee : 按角色渲染 Sidebar（员工菜单）
Employee -> System : 进入"我的申请/新建申请"（Table/Form）

== 管理员操作 ==
Admin -> System : 登录后进入"申请审核"（统一 Table）
Admin -> System : 打开详情（信息分层 + Steps 流程）
Admin -> System : 填写审核意见并 Approve/Reject
Admin -> System : 进入"员工管理"（Table + Modal/Drawer + More）
@enduml
```

### **5.6.3 异常场景**

1. **Ant Design 组件渲染异常**
   a. 触发条件：Ant Design 组件在特定环境（浏览器兼容、资源加载失败）渲染异常
   b. 系统行为：页面降级为可用的基础布局，业务功能保持可用
   c. 用户感知：页面样式可能降级，但功能与数据不受影响
2. **窄屏布局溢出**
   a. 触发条件：窗口宽度低于设计最小宽度，表格或表单内容溢出
   b. 系统行为：Table 启用横向滚动/换行，表单布局自动换行
   c. 用户感知：页面可正常浏览，无文字重叠与按钮错位

## **5.7 简体中文/English 双语支持**【V1.3 新增】（需求编号 6B）

> 定位：react-i18next + i18next 管理业务文案；Ant Design ConfigProvider 管理组件内置语言；Header 提供 中文/EN 切换；语言写入 localStorage 刷新保持。后端不改造，API 调用仍发送后端可识别的真实业务值。
> 决策记录（推荐方案）：i18n 资源采用 `client/src/locales/zh-CN.js` 与 `client/src/locales/en-US.js` 两套 JS 资源文件（按命名空间分组：common/login/layout/myRequests/newRequest/detail/review/employeeManagement/errors）；显示映射收敛于 `client/src/utils/displayMapping.js` 单一模块；默认语言 zh-CN；localStorage key 为 `i18nLanguage`。

### **5.7.1 业务规则**

1. **6B-1 i18n 框架规则（Eb）**：系统必须采用 react-i18next + i18next 管理业务文案，采用 Ant Design ConfigProvider 管理组件内置语言（DatePicker/Pagination/Modal/Empty 等）。
   a. 验收条件：When 系统启动并渲染界面，the system shall 业务文案经 i18n 资源读取，Ant Design 组件语言经 ConfigProvider locale 控制。
2. **6B-2 语言切换入口规则（Ev）**：Header 必须提供"中文/EN"切换入口，用户可随时切换界面语言。
   a. 验收条件：When 用户点击 Header 语言切换控件，the system shall 界面立即按目标语言重新渲染。
3. **6B-3 语言持久化规则（Ev）**：语言选择必须写入 localStorage，刷新页面后语言保持。
   a. 验收条件：When 用户切换语言并刷新浏览器，the system shall 界面保持用户选择的目标语言。
4. **6B-4 文案覆盖范围规则（Eb）**：以下所有用户可见文案必须支持中英切换：Login、Sidebar、Header、Page Title、Button、Table Column、Status、Role、Form Label、Placeholder、Validation、Modal、Drawer、Toast、Empty、Pagination、DatePicker、Logout。
   a. 验收条件：When 用户在中文与英文间切换，the system shall 上述全部类别的用户可见文案随语言切换而更新。
5. **6B-5 业务值显示映射规则（Eb）**：前端必须建立统一显示 Mapping：后端中文业务值（如 待审核→Pending、已通过→Approved、已拒绝→Rejected、已撤回→Withdrawn、管理员→Administrator、普通员工→Employee、启用→Active、禁用→Disabled、飞机→Flight、高铁→High-speed Rail）在英文界面显示为英文标签，中文界面显示为中文标签。
   a. 验收条件：When 界面语言为 en-US，the system shall 状态/角色/用户状态/交通工具以英文标签展示（映射自后端中文业务值）。
   b. 验收条件：When 界面语言为 zh-CN，the system shall 上述业务值以中文标签展示。
6. **6B-6 API 真实业务值规则（Ev）**：英文页面调用 API 时，请求参数与数据必须仍为后端可识别的真实中文业务值；不得将英文标签或语言标识提交给后端。
   a. 验收条件：When 界面语言为 en-US 且员工按"Pending"筛选申请，the system shall 向后端发送的业务值为"待审核"且筛选结果正确。
   b. 验收条件：When 界面语言为 en-US 且管理员执行 Approve/Reject 操作，the system shall 后端请求体与 V1.2 完全一致。
7. **6B-7 日期本地化规则（Ev）**：日期显示必须按当前语言合理格式化（zh-CN 用 YYYY-MM-DD 或中文格式，en-US 用本地化英文格式）；发送给后端/展示原始值仍保持 ISO 格式。
   a. 验收条件：When 界面语言切换为 en-US，the system shall 申请列表与详情中的日期以英文本地化格式展示；切换回 zh-CN，the system shall 以中文习惯格式展示。
8. **6B-8 金额展示规则（Ev）**：金额仅优化展示（如千分位分组），不得增加新币种逻辑。
   a. 验收条件：When 列表或详情展示预计费用，the system shall 金额以优化后的格式展示（如 1,234.50），币种语义与 V1.2 一致。
9. **6B-9 英文页无残留中文规则（Eu）**：界面语言为 en-US 时，除用户自定义数据（用户名、姓名、目的地、事由等业务数据）外，系统固有 UI 文案不得残留明显中文。
   a. 验收条件：When 界面语言为 en-US 并浏览主要页面（登录、我的申请、新建申请、详情、审核、员工管理），the system shall 系统固有文案均为英文，无遗留中文文案。
10. **6B-10 组件内置语言同步规则（Ev）**：Ant Design 组件（DatePicker、Pagination、Modal、Empty 等）内置语言必须随 ConfigProvider locale 同步切换。
    a. 验收条件：When 界面语言切换为 en-US，the system shall DatePicker 月份/星期、Pagination 文案、Modal 确认按钮等组件内置文案为英文。
11. **6B-11 默认语言规则（Eb）**：首次使用（localStorage 无语言记录）时，系统必须默认使用简体中文。
    a. 验收条件：When 新用户首次打开系统且 localStorage 无语言偏好，the system shall 界面以简体中文渲染。
12. **6B-12 校验与错误提示双语规则（Ev）**：表单校验提示、接口错误提示（Toast/Message）与确认弹窗文案必须随当前语言切换。
    a. 验收条件：When 界面语言为 en-US 且触发表单校验或接口错误，the system shall 错误/校验提示以英文展示；zh-CN 时以中文展示。

### **5.7.2 交互流程**

```plantuml
@startuml
actor "用户" as User
participant "前端（react-i18next + Ant Design）" as FE
participant "localStorage" as LS
participant "后端 API" as BE

User -> FE : 打开系统（无语言偏好）
FE -> FE : 读取 localStorage → 无记录，默认 zh-CN
FE -> FE : i18n 初始化 zh-CN + ConfigProvider zh_CN locale
FE --> User : 渲染中文界面

User -> FE : 点击 Header "EN"
FE -> FE : 切换 i18n language 至 en-US
FE -> FE : 更新 ConfigProvider locale 为 en_US
FE -> LS : 写入语言偏好 en-US
FE --> User : 全界面切换为英文（含组件内置语言）

User -> FE : 英文界面下提交申请/筛选/审批
FE -> BE : 请求体仍为后端真实业务值（如"待审核"）
BE --> FE : 返回中文业务值
FE -> FE : 显示映射 → 英文标签
FE --> User : 展示英文结果

User -> FE : 刷新页面
FE -> LS : 读取语言偏好 en-US
FE --> User : 语言保持英文
@enduml
```

### **5.7.3 异常场景**

1. **i18n 资源缺失或加载失败**
   a. 触发条件：zh-CN/en-US 资源文件缺失或翻译键缺失
   b. 系统行为：降级为简体中文渲染，缺失键显示原键或中文兜底
   c. 用户感知：界面保持可用，个别文案可能显示为中文或占位符，业务功能不受影响
2. **localStorage 不可用**
   a. 触发条件：浏览器禁用本地存储或写入失败
   b. 系统行为：忽略持久化失败，按默认语言 zh-CN 渲染；切换仍作用于当前会话
   c. 用户感知：界面正常使用，仅刷新后语言不保持（回到默认）
3. **英文界面残留中文**
   a. 触发条件：新增文案未补充 en-US 翻译键
   b. 系统行为：按 6B-9 验收标准，若残留系统固有中文则视为缺陷，需补齐翻译
   c. 用户感知：测试阶段通过 E2E 检查发现并修复

# **6. 数据约束**

> 说明：6.1 ~ 6.2 为 V1.1 基线内容（背景，保持不变）；6.3 ~ 6.4 为 V1.2 新增约束。

## **6.1 令牌黑名单条目（token-blacklist）**【V1.1 基线，保持不变】
1. **id**：每条记录的全局唯一标识，格式不限，同一集合内不得重复。
2. **token**：登出时写入的 JWT 令牌原文，用于鉴权时精确匹配；同一集合内允许重复写入但以 V1.0 校验语义为准。
3. **expiresAt**：令牌的过期时间（ISO 8601 格式字符串）；清理时以此为唯一过期判据，当前时间晚于该值时视为过期。
4. **清理幂等性**：对同一数据状态重复执行清理，其结果必须一致（无副作用）。

## **6.2 用户账号（users）**【V1.1 基线，保持不变】
1. **username**：全局唯一，创建与编辑时必须在互斥临界区内校验；同一集合内不得存在两个相同的用户名。
2. **id**：账号唯一标识，创建时生成，创建后不得变更。
3. **passwordHash**：密码的 bcrypt 哈希值，接口响应中必须剔除，V1.1 不改变其存储与使用方式。
4. **role / status**：取值与语义保持 V1.0 不变（角色仅 ADMIN/EMPLOYEE；状态仅 ACTIVE/DISABLED）。
5. **createdAt / updatedAt**：记录创建与最近更新时间，格式保持 ISO 8601 字符串。

## **6.3 系统版本号**【V1.2 新增】
1. **version**：系统版本号，遵循语义化版本格式 `X.Y.Z`（如 1.2.0），必须以 `server/package.json` 的 version 字段为唯一事实来源。
2. **展示格式**：对外展示必须为 `vX.Y.Z` 格式（如 v1.2.0），与 CHANGELOG.md 版本章节号、git tag（vX.Y）保持对应。
3. **一致性**：`server/package.json` 的 version 必须与 CHANGELOG.md 顶部版本章节、git tag 对应（如 version=1.2.0 ↔ CHANGELOG [1.2.0] ↔ tag v1.2）。
4. **更新约束**：版本号变更仅允许在发布流程中维护，禁止前端硬编码或在其他后端配置中二次维护。

## **6.4 分支与标签（git branch / tag）**【V1.2 新增】
1. **main**：仓库唯一的开发主分支（集成 + 发布），禁止直接提交新功能开发变更。
2. **feature/* 分支**：从 main 检出，命名格式 `feature/<功能名>`，开发完成后合并回 main 并删除；名称在仓库内唯一。
3. **release/vX.Y 分支**：从对应 tag `vX.Y` 创建，命名格式 `release/vX.Y`，仅用于该版本的缺陷修复；名称在仓库内唯一。
4. **tag vX.Y**：从 main 分支创建，命名格式 `vX.Y`，仓库内唯一；指向对应版本的发布提交，且与 CHANGELOG.md 版本号对应。

## **6.5 Design Token 设计体系**【V1.3 新增】
> 说明：以下为 V1.3 已确定的推荐取值（决策记录），供 design/tasks 落地；不涉及后端数据。
1. **Primary Color**：企业蓝 `#1677ff`（沿用 Ant Design 默认主色，保证与既有"差旅管理系统"蓝色视觉一致）。
2. **Background**：页面背景浅灰 `#f5f5f5`（或 `#f0f2f5`，沿用现有背景）；卡片/表格背景白 `#ffffff`。
3. **Border**：边框色 `#d9d9d9`，分割线 `#f0f0f0`。
4. **Radius**：组件圆角统一 6px（按钮/输入框/表格）；卡片 8px；Tag 4px。
5. **Spacing**：页面级间距 24px、卡片内 16px、组件间 8-12px，遵循 4px 栅格体系。
6. **Typography**：标题 16-20px（加粗）、正文 14px、辅助说明 12px、字重 400/500/600；行高 1.5。
7. **Status Color**：待审核=琥珀色 `#faad14`、已通过=绿色 `#52c41a`、已拒绝=红色 `#f5222d`、已撤回=灰色 `#8c8c8c`（与既有 StatusTag 配色一致，收敛为 token）；启用=绿色、禁用=灰色/红色语义区分。
8. **错误/警告色**：错误 `#ff4d4f`、警告 `#faad14`、成功 `#52c41a`（Ant Design 语义色）。

## **6.6 i18n 语言资源**【V1.3 新增】
> 说明：决策记录——资源文件采用 `client/src/locales/zh-CN.js` 与 `client/src/locales/en-US.js`，按命名空间分组；localStorage key 为 `i18nLanguage`；语言标识 `zh-CN`（默认）/ `en-US`。
1. **语言标识**：仅允许 `zh-CN` 与 `en-US` 两种取值；默认 `zh-CN`。
2. **localStorage key**：语言偏好统一存储于 `i18nLanguage`，值为 `zh-CN` 或 `en-US`；无记录时按默认语言渲染。
3. **资源完整性**：zh-CN 与 en-US 两套资源必须键一致；业务文案必须以翻译键引用，禁止页面内硬编码。
4. **命名空间分组**：至少包含 common / login / layout / myRequests / newRequest / detail / review / employeeManagement / errors 等命名空间，保证文案组织清晰。
5. **显示映射表**：后端业务值（状态/角色/用户状态/交通工具）→ 中英文标签的映射关系必须集中维护于单一模块，禁止在页面组件中散落映射逻辑。

## **6.7 双语显示映射（display mapping）**【V1.3 新增】
1. **申请状态**：待审核→zh:待审核 / en:Pending；已通过→zh:已通过 / en:Approved；已拒绝→zh:已拒绝 / en:Rejected；已撤回→zh:已撤回 / en:Withdrawn。
2. **角色**：管理员→zh:管理员 / en:Administrator；普通员工→zh:普通员工 / en:Employee。
3. **用户状态**：启用→zh:启用 / en:Active；禁用→zh:禁用 / en:Disabled。
4. **交通工具**：火车→en:Train；飞机→en:Flight；汽车→en:Car/Bus；高铁→en:High-speed Rail；轮船→en:Ship；其他→en:Other。
5. **请求参数约束**：显示映射仅用于界面展示；任何 API 请求参数/请求体必须使用后端真实业务值（中文），禁止提交英文标签或语言标识。

---

# **7. 待确认决策点【V1.3 新增】**

> 依据用户授权"所有决策点按推荐方案执行，默认同意，无需再审批"，以下决策点均由本需求规格按最佳专业判断确定推荐方案并默认采用；仅当实现阶段出现影响巨大的分歧时按此处记录沟通。
> 说明：当前无阻塞性问题。以下为已确定决策记录，供后续 design/tasks 阶段引用。

| 编号 | 决策点 | 推荐方案（已采用） | 推荐理由 |
|------|--------|------------------|---------|
| D-1 | UI 组件库 | Ant Design v5（react 18 兼容） | 组件齐全（Layout/Menu/Table/Form/Modal/Drawer/Steps 等覆盖全部需求），ConfigProvider token 天然承载 Design Token，中文生态成熟 |
| D-2 | Design Token 承载方式 | Ant Design ConfigProvider theme.token 统一配置 + 少量 CSS 变量 | 避免散落 inline style，全站单一来源，符合 6A-1 |
| D-3 | i18n 框架 | react-i18next + i18next | 与 React 集成度高、按命名空间组织资源、支持语言切换与持久化 |
| D-4 | i18n 资源文件结构 | `client/src/locales/zh-CN.js`、`client/src/locales/en-US.js`（按命名空间分组） | 保持 JS 技术栈一致性，避免引入 JSON 加载插件；命名空间分组便于维护 |
| D-5 | 语言持久化 | localStorage key=`i18nLanguage`，值 `zh-CN`/`en-US`，默认 `zh-CN` | 满足"刷新保持"需求，实现简单、无服务端改动 |
| D-6 | 状态颜色映射 | 待审核=#faad14、已通过=#52c41a、已拒绝=#f5222d、已撤回=#8c8c8c | 沿用既有 StatusTag 配色，收敛为 token，保证视觉语义与既有认知一致 |
| D-7 | 组件内置语言同步 | Ant Design ConfigProvider locale（zh_CN / en_US）随语言切换 | 原生机制，DatePicker/Pagination/Modal/Empty 内置文案自动同步 |
| D-8 | 布局方案 | Ant Design Layout（Sider + Header + Content），按角色渲染 Menu | 符合"典型企业管理后台"目标，复用组件库能力 |
| D-9 | 员工管理低频操作 | Dropdown（"更多/More"）收纳编辑/启用禁用/重置密码，创建为 Primary Button | 需求明确要求低频操作收进 More Dropdown |
| D-10 | 日期/金额格式化 | 日期按语言 locale 格式化（zh-CN: YYYY-MM-DD；en-US: 英文格式）；金额千分位分组，币种逻辑不变 | 满足"按语言合理格式化"与"金额仅优化展示"要求，不新增币种逻辑 |
| D-11 | 显示映射存放位置 | 单一模块 `client/src/utils/displayMapping.js` | 集中维护、便于测试与复用，符合 4.4-8 |
| D-12 | 后端兼容策略 | 后端 API/枚举/数据完全不动；双语仅前端显示映射 | 符合"不破坏历史 JSON 和现有 API"硬约束，降低回归风险 |


