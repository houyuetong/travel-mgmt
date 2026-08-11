# 企业差旅管理系统技术设计方案（V1.3）

> 版本：V1.3 ｜ 基线：V1.2（2026-08-11）｜ 历史基线：V1.1（加固版）、V1.0
> 对应需求：`docs/spec.md`（V1.1 基线 23 条 + V1.2 新增 5A-1~13「版本分支管理策略」、5B-1~11「版本号展示」 + V1.3 新增 6A-1~13「UI/UX 视觉体验升级」、6B-1~12「简体中文/English 双语支持」）
> 文档结构说明：**第一、二章为 V1.1 加固版技术设计（完整保留作为基线，各章标题标注【V1.1 基线，保持不变】）**；**第三、四章为 V1.2 新增设计（需求与存量关系分析 + 增量设计方案）**；**第五、六章为 V1.3 新增设计（需求与存量关系分析 + 增量设计方案，仅前端改造，后端零改动）**。
> 设计原则（V1.1 基线，保持不变）：改动点最小化、保持 V1.0 业务语义与接口完全兼容、复用既有 per-collection 串行写锁机制、不引入新组件/新存储/定时任务。
> 设计原则（V1.2 新增，保持不变）：版本号单一事实来源（`server/package.json`）、新增版本接口为纯增量公开接口、前端失败静默降级（隐藏版本号、不阻断、不弹错）、版本分支策略文档化并落地（`BRANCHING.md`）。
> 设计原则（V1.3 新增）：仅前端改造、后端 API/枚举/数据模型零改动；引入 Ant Design v5 作为统一 UI 组件库、ConfigProvider theme.token 承载 Design Token；react-i18next + i18next 管理业务文案、Ant Design ConfigProvider 管理组件内置语言；双语仅由前端显示映射层承担，API 请求仍发送后端可识别中文业务值；不新增任何业务能力（遵守 spec 6A/6B 禁止扩展清单）。

## V1.3 变更概览（V1.2 → V1.3）

| 需求编号 | 变更类型 | 对应设计章节 | 一句话说明 |
|---------|---------|-------------|-----------|
| 6A-1 ~ 6A-13 | 新增 | 第五、六章 | UI/UX 视觉体验升级：Ant Design v5 组件库 + Design Token 统一设计体系 + Sidebar/Header 企业后台布局 + 全页面 antd 重构（不改变路由与后端权限） |
| 6B-1 ~ 6B-12 | 新增 | 第五、六章 | 简体中文/English 双语支持：i18n 框架 + Header 语言切换与 localStorage 持久化 + displayMapping 显示映射 + 日期/金额本地化 + 组件内置语言同步 |

## V1.2 变更概览（V1.1 → V1.2）【背景基线，保持不变】

| 需求编号 | 变更类型 | 对应设计章节 | 一句话说明 |
|---------|---------|-------------|-----------|
| 5A-1 ~ 5A-13 | 新增 | 第三、四章 | 版本分支管理策略：GitHub Flow 简化版文档化（BRANCHING.md）+ 历史分支补建 + V1.2 发布流程落地 |
| 5B-1 ~ 5B-11 | 新增 | 第三、四章 | 版本号展示：后端公开版本接口 + 前端登录页/主界面两处展示 + 失败降级 + 版本号自动跟随 |

---

# 一、需求与存量功能关系分析【V1.1 基线，保持不变】

本章明确 V1.1 三项加固需求与 V1.0 现有代码的关系，是增量设计的基础。所有代码位置均已核实到文件级（函数级以行号标注）。

## 1.1 需求功能与存量功能对比

### 1.1.1 已实现功能

以下功能在 V1.0 已完整实现，V1.1 **保持原样、不做改动**：

| 需求功能 | 存量功能 | 代码位置 | 匹配度 |
|---------|---------|---------|--------|
| 登出时将当前令牌加入黑名单 | `authService.logout()` 调用 `blacklistRepository.add()`，写入 `{id, token, expiresAt}` | `server/src/services/authService.js:36-42`；`server/src/repositories/blacklistRepository.js:4-8` | 100% |
| 鉴权时校验令牌是否在黑名单中 | `authRequired` 中间件调用 `blacklistRepository.isBlacklisted()`，命中返回 `AUTH_TOKEN_INVALID`(401) | `server/src/middlewares/auth.js:16-18`；`server/src/repositories/blacklistRepository.js:10-13` | 100% |
| 用户名唯一性检查的错误语义（`USER_NAME_CONFLICT` / HTTP 409 / "用户名已存在"） | `createUser()` 与 `updateUser()` 中的 `findByUsername` 冲突检查 | `server/src/services/userService.js:30-33, 73-76`；`server/src/constants/errorCodes.js:6` | 100% |
| JWT_SECRET 缺失时拒绝启动（`INIT_CONFIG_MISSING`） | `startServer()` 起始处缺失检查 | `server/src/app.js:19-21`；`server/src/constants/errorCodes.js:11` | 100% |
| 存储写入失败回滚内存态并抛 `STORE_WRITE_FAILED` | `JsonStoreEngine.write()` 的 try/catch 回滚逻辑 | `server/src/store/JsonStoreEngine.js:42-53` | 100% |
| 黑名单"按过期时间过滤"的删除逻辑 | `blacklistRepository.cleanupExpired()` 的 filter 判断（V1.1 仅扩展调用时机与临界区，不重写过滤逻辑） | `server/src/repositories/blacklistRepository.js:15-22` | 75%（逻辑已实现，缺调用点/临界区/日志，见 1.1.2） |
| 员工创建/编辑/禁用/重置密码、申请、审批、审计等既有业务 | 服务层 `userService` / `requestService` / `reviewService` / `auditService` 全量逻辑 | `server/src/services/*.js` | 100%（V1.1 不改动其业务语义） |

### 1.1.2 需要扩展的功能

以下功能与存量代码部分匹配，需要在现有基础上改造：

| 需求功能 | 存量功能 | 差异说明 | 扩展方向 |
|---------|---------|---------|---------|
| 清理操作纳入与读写相同的互斥临界区 | `cleanupExpired()` 直接 `read → filter → write`，未加锁；`add()` 亦未加锁 | ①清理与登出写入并发时可能互相覆盖丢失数据；②"检查+写"存在竞态窗口 | ①为 `JsonStoreEngine` 新增 `runExclusive(collection, task)` 串行临界区 API，复用既有 `this.locks[collection]` 锁链；②`add()`、`cleanupExpired()` 均改为在临界区内执行"读-改-写" |
| 启动 / 登录成功 / 登出三个时机触发清理 | `cleanupExpired()` 全项目无调用点 | 功能"定义了但未启用" | ①`app.js` 在 `store.init()` 后调用；②`authService.login()` 成功后调用；③`authService.logout()` 加入黑名单后调用；调用处均以内置容错包裹 |
| 清理失败不阻断主流程、输出结构化日志 | `cleanupExpired()` 无 try/catch、无日志 | 清理/持久化失败将向调用方抛错 | 在 `cleanupExpired()` 内统一 try/catch，记录 `BLACKLIST` 模块 ERROR 日志（含清理前后条目数、失败原因），失败不向外抛出 |
| `createUser` 唯一性检查 + 写入原子化 | 检查在 `userService.createUser()`，写入在 `userRepository.create()`，期间 `await bcrypt.hash()` 让出事件循环 | TOCTOU 竞态：并发同用户名创建时两个请求都可能通过检查 | ①`userRepository` 新增 `createIfUsernameFree()`，在 users 集合临界区内完成"唯一性检查 + 写入"；②`createUser()` 将 bcrypt.hash 提前到临界区外执行（缩短临界区） |
| `updateUser` 新用户名唯一性检查 + 写入原子化 | 检查在 `userService.updateUser()`（`userService.js:73-76`），写入在 `userRepository.update()` | 同上，存在竞态窗口 | ①`userRepository` 新增 `updateIfUsernameFree()`，临界区内完成"读用户 + 唯一性检查 + 写入"；②`updateUser()` 仅做参数/角色校验（临界区外只读），唯一性检查移交原子方法 |
| JWT_SECRET 强度校验（长度 ≥ 32 + 弱密钥黑名单 + 环境感知） | 仅 `app.js:19-21` 做缺失检查 | 无长度/黑名单校验；无 NODE_ENV 分支 | ①新增 `server/src/utils/secretValidator.js`（`validateJwtSecret` / `assertJwtSecretStrength`）；②`app.js` 在 `store.init()` 与 `listen()` 之前调用校验；③`config.js` 新增 `NODE_ENV` 字段 |
| 生产模式弱密钥 fail-fast、开发模式 WARN | 无 | 生产模式弱密钥会带病运行 | 由 `assertJwtSecretStrength()` 按 `NODE_ENV === 'production'` 分支：fail-fast 抛错终止启动（错误信息含失败原因类别）；非生产仅 `CONFIG` 模块 WARN |

### 1.1.3 需要新增的功能或接口

按业务模块分组，存量代码中完全没有对应实现的部分：

**A. 存储引擎层（`server/src/store/JsonStoreEngine.js`）**
- 新增 `runExclusive(collection, task)`：per-collection 串行临界区 API，与既有 `write()` 共享同一 `this.locks[collection]` 锁链，消除"检查 + 写"之间的竞态窗口；task 抛错不中断锁链（后续操作可继续）。

**B. 用户仓储层（`server/src/repositories/userRepository.js`）**
- 新增 `createIfUsernameFree(user)`：临界区内校验用户名唯一 → 生成 id → 写入；冲突抛 `USER_NAME_CONFLICT`(409)。
- 新增 `updateIfUsernameFree(id, updates)`：临界区内定位用户 → 校验新用户名唯一（排除自身）→ 写入更新；不存在返回 `null`（由服务层映射 404）。

**C. 配置校验（新增 `server/src/utils/secretValidator.js`）**
- 常量：`MIN_JWT_SECRET_LENGTH = 32`、`WEAK_JWT_SECRETS = ['dev-jwt-secret-key-for-testing-only', 'your-jwt-secret-key-change-in-production', ...]`。
- `validateJwtSecret(secret)`：返回 `{ valid, reason }`，`reason ∈ { 'missing' | 'too-short' | 'blacklisted' | null }`。
- `assertJwtSecretStrength(secret, nodeEnv)`：启动期入口，缺失→拒绝（保持 V1.0 语义）；生产模式弱密钥→抛错终止；开发模式→WARN 后放行。

**D. 错误码（`server/src/constants/errorCodes.js`）**
- 新增 `INIT_CONFIG_WEAK_SECRET`：仅用于启动期内部错误日志，不对外暴露（不改变任何对外接口错误码语义）。

**E. 配置项（`server/src/config.js`）**
- 新增 `NODE_ENV: process.env.NODE_ENV` 字段，供启动校验分支使用。

**F. 测试基础设施（新增，V1.0 无服务端测试）**
- `server/package.json` 新增 `"test": "node --test test/"` 脚本；新增 `server/test/` 目录（`secretValidator.test.js`、`blacklistCleanup.test.js`、`userConcurrency.test.js`、`startupValidation.test.js`），使用 Node 内置 `node:test` + `node:assert`，零新增依赖。
- `tests/hardening.test.js`：新增 Playwright E2E 加固回归用例。

**G. 配置示例（新增 `server/.env.example`）**
- 当前仓库仅有 `server/.env`（无 `.env.example`），新增示例文件并给出强密钥占位，避免误导（详见 2.1.3.4）。

## 1.2 存量功能详细分析

本节对 1.1.1"已实现功能"中与 V1.1 强相关的部分做深入解读，明确其接口契约与约束，避免设计落空。

### 1.2.1 JsonStoreEngine（存储引擎单例）

- **接口契约**：
  - `read(collection)`：同步返回 `this.memory[collection]`（不存在返回 `[]`）；**返回的是内存数组的引用**，调用方原地修改会直接污染内存态，且不会触发持久化。
  - `write(collection, data)`：将写入任务追加到 `this.locks[collection]` Promise 链（per-collection 串行写锁）；锁内先更新内存再同步 `writeFileSync` 落盘；失败则回滚 `this.memory[collection]` 并抛 `BusinessError(STORE_WRITE_FAILED, '数据写入失败', 500)`。
- **约束与边界**：
  - 锁仅覆盖"写"本身，`read` 为无锁同步读，**"读-检查-写"整体并非原子**——这是 V1.1 需要扩展的根本原因。
  - `this.locks[collection]` 初始为 `undefined`，`write()` 首次调用时初始化为 `Promise.resolve()`；锁链通过 `locks[collection] = locks[collection].then(...)` 不断追加，天然 FIFO 串行。
  - `COLLECTIONS = ['users', 'requests', 'audit-logs', 'token-blacklist']`，四类集合共用同一引擎与锁机制。
  - **死锁风险点**：若在临界区内再次调用 `write()`（链上自引用等待）会形成死锁，V1.1 新增 `runExclusive` 时必须通过契约规避（见 2.1.3.1）。

### 1.2.2 blacklistRepository（黑名单仓储）

- **接口契约**：
  - `add(token, expiresAt)`：`read → list.push → write`，无锁；`token` 可重复（V1.0 校验语义为准）。
  - `isBlacklisted(token)`：同步读内存做精确匹配，无写操作。
  - `cleanupExpired()`：`read → filter(expiresAt > now) → 若有删除则 write`；当前无 try/catch、无日志、**无任何调用点**。
- **约束**：`read` 返回引用，`list.push` 直接改内存后再 `write`（V1.0 依赖此行为）；改用临界区后需转为"不可变更新"模式以配合持久化判定（见 2.1.3.1 契约约定）。

### 1.2.3 userService 用户唯一性检查

- **接口契约**：
  - `createUser(operator, {username, name, password})`：字段校验(400) → `findByUsername` 查重(409) → `await bcrypt.hash()` → `userRepository.create()` → 审计。
  - `updateUser(operator, id, {username, name, status})`：`findById`(404) → 角色校验(403) → 字段校验(400) → 新用户名查重(409，排除自身) → `userRepository.update()` → 审计。
- **约束与竞态窗口**：`bcrypt.hash()` 为异步且耗时（bcryptjs 非阻塞实现），查重与写入之间必然让出事件循环；两个并发请求可同时通过查重后再先后写入，产生重复用户名——**V1.1 需将"查重 + 写入"整体纳入临界区**。
- **兼容性约束**：字段校验顺序、错误码与 HTTP 状态必须保持 V1.0 完全一致（400 校验 → 409 冲突 → 404 不存在 → 403 越权）。

### 1.2.4 app.js 启动流程

- **接口契约**：`startServer()`：缺失校验 → `store.init()`（读/建 JSON 文件）→ `await initAdmin()` → 构建 Express app → 注册路由/静态托管 → `app.listen(PORT)`。
- **约束**：`require('dotenv').config()` 位于 `app.js` 第 1 行，所有模块 require 时环境变量已就绪；启动失败经 `startServer().catch()` 记录 ERROR 日志并以 `process.exit(1)` 终止。V1.1 的密钥校验与启动清理必须插入到 `listen()` **之前**，且任何校验失败不得进入监听。

### 1.2.5 config.js 与测试现状

- `config.js` 为纯环境变量透传，无校验逻辑、无 `NODE_ENV` 字段；`JWT_SECRET` 为 `undefined` 时由 `app.js` 兜底报错。
- `server/.env` 当前 `JWT_SECRET=dev-jwt-secret-key-for-testing-only` **恰为 spec 指定的弱密钥黑名单示例值**：V1.1 实施后，开发/测试模式启动将输出 `CONFIG` 模块 WARN 告警但不阻断，符合 spec 兼容性条款 4.5.3，`playwright.config.js` 的 webServer（`node src/app.js`）不受影响。
- 服务端当前**无任何测试框架与脚本**（`server/package.json` 无 test 相关配置）；E2E 测试位于 `tests/`（Playwright，`helpers.js` 提供 `loginAs`/`apiCall`/`createEmployee` 等 API 封装）。

---

# 二、增量设计方案【V1.1 基线，保持不变】

本章将 V1.1 三项加固需求转化为可落地的技术方案。总体策略：**改动点最小化**——不重构既有分层（Controller → Service → Repository → Store），不改变任何对外接口/响应结构/错误码语义，仅在三处"薄改动点"（存储引擎临界区 API、黑名单与用户仓储原子操作、启动配置校验）上增量扩展。

## 2.1 实现模型

### 2.1.1 上下文视图

V1.1 不改变系统与外部角色/系统的交互边界，仅新增"启动期校验"与"清理/原子化"两类内部行为：

```plantuml
@startuml
!theme plain
left to right direction
actor "管理员" as Admin
actor "普通员工" as Employee
actor "运维/开发者" as Ops
rectangle "企业差旅管理系统 V1.1" as System {
    usecase "登录（触发按需清理）" as UC1
    usecase "登出（加黑名单 + 按需清理）" as UC2
    usecase "创建/编辑员工（唯一性原子校验）" as UC3
    usecase "启动（密钥校验 + 启动清理）" as UC4
}
database "本地文件存储" as Storage
component "环境变量" as Env

Admin --> UC3
Employee --> UC1
Employee --> UC2
Ops --> UC4 : 设置 NODE_ENV / JWT_SECRET
UC1 ..> Storage : 清理 token-blacklist
UC2 ..> Storage : 读写 token-blacklist
UC3 ..> Storage : 原子读写 users
UC4 ..> Storage : 启动清理
UC4 ..> Env : 读取配置
@enduml
```

### 2.1.2 服务/组件总体架构

架构保持 V1.0 分层不变（Route → Controller → Service → Repository → JsonStoreEngine），V1.1 的改动集中标注如下：

```plantuml
@startuml
!theme plain
skinparam componentStyle rectangle

package "路由/控制器层（不改）" {
  [routes/auth.js] as RA
  [routes/admin.js] as RA2
  [authController] as CA
  [userController] as CU
}

package "服务层（微调）" {
  [authService] as SA
  [userService] as SU
}

package "仓储层（扩展原子操作）" {
  [blacklistRepository] as RB
  [userRepository] as RU
  [requestRepository] as RR
  [auditRepository] as RAD
}

package "存储引擎（新增临界区 API）" {
  [JsonStoreEngine] as EN
}

package "启动校验（新增）" {
  [secretValidator] as SV
  [config] as CF
  [app.js] as APP
}

RA --> CA
RA2 --> CU
CA --> SA
CU --> SU
SA --> RB
SA --> RU
SU --> RU
SU --> RAD
RB --> EN : add / isBlacklisted / cleanupExpired\n（runExclusive 临界区）
RU --> EN : createIfUsernameFree / updateIfUsernameFree\n（runExclusive 临界区）
RR --> EN : write（V1.0 不变）
RAD --> EN : write（V1.0 不变）
APP --> SV : assertJwtSecretStrength（监听前）
APP --> RB : 启动清理
SV --> CF : 读取 JWT_SECRET / NODE_ENV

note right of EN
  runExclusive(collection, task)
  复用既有 per-collection 写锁链
  （新增，V1.1）
end note
note right of SV
  validateJwtSecret / assertJwtSecretStrength
  （新增，V1.1）
end note
@enduml
```

组件职责与 V1.1 变更对照：

| 组件 | 职责 | V1.1 变更 |
|------|------|----------|
| `JsonStoreEngine` | 内存态管理、per-collection 串行写锁、JSON 落盘与回滚 | **新增** `runExclusive()`；`write()` 逻辑保持（内部可提取共享持久化辅助） |
| `blacklistRepository` | 黑名单增/查/清理 | `add()`、`cleanupExpired()` 改为临界区原子操作；清理补日志与容错 |
| `userRepository` | users 集合 CRUD | **新增** `createIfUsernameFree()`、`updateIfUsernameFree()`；既有 `create`/`update` 保留（供 `initAdmin` 等使用） |
| `userService` | 用户管理业务 | `createUser`/`updateUser` 改调原子方法；bcrypt.hash 提前到临界区外 |
| `authService` | 登录/登出 | 登录成功后、登出加黑名单后触发按需清理 |
| `app.js` | 启动编排 | 监听前插入密钥强度校验；`store.init()` 后插入启动清理 |
| `secretValidator`（新） | JWT_SECRET 强度判定与环境分支 | 新增模块 |
| `config` | 环境变量透传 | 新增 `NODE_ENV` 字段 |

### 2.1.3 实现设计文档

#### 2.1.3.1 加固点 1：令牌黑名单定期清理

**核心设计——存储引擎串行临界区 API `runExclusive`**

三个加固点的并发正确性均依赖"既有 per-collection 写锁的复用"，因此先在 `JsonStoreEngine` 上新增唯一一个公共并发原语：

```js
/**
 * 在指定集合的串行临界区内执行 task（复用既有 this.locks[collection] 锁链，
 * 与 write() 天然串行——同一把锁，FIFO）。
 *
 * 契约约束（防止死锁与内存污染）：
 *  1) task 内禁止调用 write() 或 runExclusive() 自身（链上自引用会死锁）；
 *     允许调用同步 read() 读取当前集合快照。
 *  2) task 返回值约定：返回「变更后的完整集合数据（新数组/不可变更新）」→
 *     引擎在锁内同步落盘，失败回滚内存态并抛 BusinessError(STORE_WRITE_FAILED, 500)；
 *     返回 null / undefined → 视为无变更，不落盘（保证清理幂等、无副作用）。
 *  3) task 抛错（含业务冲突）时，引擎以 run.catch(() => {}) 维持锁链连续，
 *     后续操作不被阻塞（错误向上冒泡给调用方处理）。
 *
 * @param {string} collection - 集合名（users / requests / audit-logs / token-blacklist）
 * @param {() => Promise<Array<object> | null>} task - 临界区内任务
 * @returns {Promise<void>}
 */
async runExclusive(collection, task)
```

设计要点：
- **锁复用**：`runExclusive` 与 `write()` 读写同一个 `this.locks[collection]`，因此"登出加黑名单（add）"与"清理（cleanupExpired）"在锁链上排队串行，天然满足 spec 5.1.1-5"清理与读写在同一互斥临界区串行执行"。
- **避免死锁**：通过契约（临界区内不调 `write`）+ 锁链失败延续（`run.catch(() => {})`）双保险；`read()` 保持同步无锁（Node 单线程下读取内存快照不会与锁内写交错），因此 `isBlacklisted()` 等纯读接口无需改造，**不增加鉴权路径等待**（满足 spec 4.1-3 性能约束）。
- **幂等性**：task 返回 `null` 表示无过期条目时不落盘，重复清理无副作用（满足 spec 6.1-4）。

**blacklistRepository 改造**

```js
// add：读-改-写整体纳入临界区（不可变更新）
async function add(token, expiresAt) {
  await store.runExclusive('token-blacklist', () => {
    const list = store.read('token-blacklist');
    return [...list, { id: crypto.randomUUID(), token, expiresAt }];
  });
}

// cleanupExpired：仅删过期条目 + 容错 + 结构化日志（内部吞错，不向外抛）
async function cleanupExpired() {
  const before = store.read('token-blacklist').length;
  try {
    await store.runExclusive('token-blacklist', () => {
      const list = store.read('token-blacklist');
      const now = Date.now();
      const filtered = list.filter(e => new Date(e.expiresAt).getTime() > now);
      return filtered.length === list.length ? null : filtered; // 无过期则 null（不落盘）
    });
    const after = store.read('token-blacklist').length;
    logger.info('BLACKLIST', 'Expired tokens cleaned', { before, after });
  } catch (e) {
    logger.error('BLACKLIST', 'Cleanup expired tokens failed', { error: e.message });
  }
}
```

- **错误处理**：持久化失败由 `runExclusive` 回滚内存态并抛 `STORE_WRITE_FAILED`，被 `cleanupExpired` 的 try/catch 吞掉并记录 ERROR 日志 → **登录/登出主流程不受阻断**（满足 spec 5.1.1-6）。数据文件损坏导致读取失败同样被捕获，仅记录日志，行为不劣于 V1.0（满足 spec 5.1.3-3）。

**三个触发时机的调用链**

```plantuml
@startuml
!theme plain
actor "用户" as User
participant "app.js" as APP
participant "authService" as AS
participant "blacklistRepository" as BR
database "token-blacklist" as TKB

== 时机 1：启动 ==
APP -> APP : assertJwtSecretStrength（校验通过）
APP -> APP : store.init()
APP -> BR : cleanupExpired()（容错，不阻断）
BR -> TKB : 删除过期条目并落盘
APP -> APP : initAdmin() / app.listen()

== 时机 2：登录成功 ==
User -> AS : login(username, password)
AS -> AS : 校验通过、签发 token
AS -> BR : cleanupExpired()（await，内部容错）
BR -> TKB : 按需清理过期条目
AS --> User : 返回 token + 用户信息（不受清理结果影响）

== 时机 3：登出 ==
User -> AS : logout(token)
AS -> BR : add(token, expiresAt)（临界区 1）
BR -> TKB : 写入当前令牌
AS -> BR : cleanupExpired()（临界区 2，串行）
BR -> TKB : 按需清理过期条目
AS --> User : 返回登出成功
@enduml
```

- 登录成功后 `await cleanupExpired()`：清理同步完成后返回登录结果，保证"必须执行"语义且不影响结果正确性（内部容错）。清理为同步文件写（数据量小），登录响应保持在 2s 基线内（spec 4.1-1）。
- 登出时 add 与 cleanup 为两次独立临界区调用，在锁链上**串行执行**，不会互相覆盖（spec 4.2-3）。
- 三个时机之外无任何自动清理入口，**不引入定时任务**（spec 5.1.1-8）。
- 黑名单校验语义不变：`isBlacklisted()` 保持同步读，已登出令牌（含过期/未过期）访问接口仍返回 `AUTH_TOKEN_INVALID`(401)（spec 5.1.1-7）。

#### 2.1.3.2 加固点 2：用户唯一性并发原子化

**核心设计——用户仓储原子方法**

在 `userRepository` 新增两个原子方法，将"唯一性检查 + 写入"整体纳入 users 集合临界区：

```js
/**
 * 临界区内创建用户：唯一性检查 + 写入原子化（复用 users 集合既有写锁）。
 * 唯一性冲突 → 抛 BusinessError(USER_NAME_CONFLICT, '用户名已存在', 409)（与 V1.0 语义一致）；
 * 持久化失败 → 由 runExclusive 统一回滚并抛 STORE_WRITE_FAILED(500)。
 * @param {object} user - { username, name, passwordHash, role, status, createdAt, updatedAt }
 * @returns {Promise<object>} 创建后的用户（含 id，经闭包捕获返回）
 */
async createIfUsernameFree(user)

/**
 * 临界区内更新用户：定位 + 新用户名唯一性检查（排除自身）+ 写入原子化。
 * 用户不存在 → 返回 null（服务层映射 404）；新用户名冲突 → 抛 USER_NAME_CONFLICT(409)。
 * @param {string} id
 * @param {object} updates - { username?, name?, status? } 等
 * @returns {Promise<object|null>} 更新后的用户或 null
 */
async updateIfUsernameFree(id, updates)
```

**userService 改造**

- `createUser()`：
  1. 字段校验（400）——**临界区外，与 V1.0 顺序一致**；
  2. `await bcrypt.hash(password)`——**提前到临界区外**执行（耗时异步操作不占锁，缩短临界区）；
  3. 调用 `createIfUsernameFree({...})`——临界区内完成查重 + 写入；
  4. 审计、返回脱敏用户（不变）。
- `updateUser()`：
  1. `findById` + 角色校验 + 字段校验（临界区外只读快照，V1.0 语义不变）；
  2. 调用 `updateIfUsernameFree(id, updates)`——临界区内"重新定位用户 + 新用户名查重（排除自身）+ 写入"；
  3. 返回 `null` 映射 404；审计、返回（不变）。

> 说明：`findById`/角色校验放在临界区外读快照是安全的——V1.0 中用户 role 创建后不可变，且不存在删除用户操作，临界区内 `updateIfUsernameFree` 会基于锁内最新记录合并写入，状态类并发（如同时禁用）不会破坏唯一性。

**并发时序（以并发创建同用户名为例）**

```plantuml
@startuml
!theme plain
actor "管理员" as Admin
participant "Express / 事件循环" as EV
participant "users 写锁链" as LOCK
database "users.json" as U

Admin -> EV : 请求 A（username=X）
Admin -> EV : 请求 B（username=X，并发）
EV -> EV : A：字段校验 → bcrypt.hash（异步让出）
EV -> EV : B：字段校验 → bcrypt.hash（异步让出）
EV -> LOCK : A 进入临界区（检查 X 唯一）
LOCK -> U : 通过，写入 X
LOCK -> LOCK : 释放，B 进入临界区（检查 X 唯一）
LOCK -> EV : 冲突 → 抛 USER_NAME_CONFLICT(409)
EV --> Admin : A 成功 / B 返回 409 "用户名已存在"
@enduml
```

- **结果**：任一用户名在任意时刻至多一条账号记录（spec 5.2.1-8）；并发重名仅一个成功，其余返回 `USER_NAME_CONFLICT`(409)（spec 5.2.1-3/4）。
- **锁作用域**：仅 users 集合受影响；requests、audit-logs、token-blacklist 的既有写操作继续走 `write()`，与 users 临界区互不干扰（spec 5.2.1-6）。
- **错误处理**：冲突抛 `USER_NAME_CONFLICT`；临界区内写入失败回滚内存并抛 `STORE_WRITE_FAILED`(500)；数据文件损坏导致读失败时本次操作拒绝、不产生半写入状态（spec 5.2.3）。

#### 2.1.3.3 加固点 3：JWT_SECRET 强度校验

**核心设计——secretValidator 模块（新增 `server/src/utils/secretValidator.js`）**

```js
const MIN_JWT_SECRET_LENGTH = 32;
const WEAK_JWT_SECRETS = [
  'dev-jwt-secret-key-for-testing-only',          // spec 指定示例
  'your-jwt-secret-key-change-in-production',      // spec 指定示例
  // 后续可扩展其他已知示例/弱密钥
];

/**
 * 纯判定函数（可单测）：
 * @param {string|undefined} secret
 * @returns {{ valid: boolean, reason: 'missing'|'too-short'|'blacklisted'|null }}
 */
function validateJwtSecret(secret)

/**
 * 启动期校验入口（须在 app.listen 之前调用）：
 *  - 缺失（任何模式）→ 抛 BusinessError(INIT_CONFIG_MISSING, 'JWT_SECRET 配置缺失', 500)，保持 V1.0 语义；
 *  - 生产模式（NODE_ENV === 'production'）弱密钥 → 抛 BusinessError(INIT_CONFIG_WEAK_SECRET,
 *    含原因类别消息（缺失/长度不足/命中示例黑名单）, 500) → fail-fast 终止进程；
 *  - 非生产模式弱密钥 → logger.warn('CONFIG', 'JWT_SECRET 为弱密钥，仅限开发环境使用', { reason }) → 放行。
 * @param {string|undefined} secret
 * @param {string|undefined} nodeEnv
 * @returns {{ ok: boolean, reason: ... }}
 */
function assertJwtSecretStrength(secret, nodeEnv)
```

**app.js 启动流程改造（校验时机：端口监听前）**

```plantuml
@startuml
!theme plain
[*] --> 加载配置(dotenv)
加载配置 --> 校验 JWT_SECRET
校验 JWT_SECRET --> alt[缺失] : 任何模式
alt[缺失]
  --> [抛错 INIT_CONFIG_MISSING] --> 终止进程(exit 1)
end
校验 JWT_SECRET --> alt[弱密钥]
alt[弱密钥]
  --> alt[NODE_ENV=production]
  alt[NODE_ENV=production]
    --> [抛错 INIT_CONFIG_WEAK_SECRET(含原因)] --> 终止进程(exit 1)
  else[非生产]
    --> [WARN 告警] --> 继续启动
  end
else[强密钥]
  --> [无告警] --> 继续启动
end
继续启动 --> store.init() --> 启动清理(容错) --> initAdmin() --> app.listen(PORT)
@enduml
```

- **校验时机**：`assertJwtSecretStrength` 置于 `startServer()` 最前（`store.init()` 之前、`app.listen()` 之前），确保弱密钥进程**不会对外监听**（spec 5.3.1-7）。
- **fail-fast 语义**：生产模式校验失败抛出的错误经 `startServer().catch()` 记录 ERROR 日志并以 `process.exit(1)` 终止，退出码非 0（spec 5.3.3-1）。
- **错误信息可定位**：生产模式错误消息明确标注失败原因类别（缺失/长度不足/命中示例黑名单）（spec 5.3.1-6）。
- **新错误码** `INIT_CONFIG_WEAK_SECRET` 仅用于启动期内部日志，不改变任何对外接口错误码（对外接口错误码集合保持不变）。

#### 2.1.3.4 config 加载与校验设计

- **加载时序**：`app.js` 第 1 行 `require('dotenv').config()` 先于一切模块加载执行，`config.js` 及各依赖模块 require 时环境变量已就绪（V1.0 既有行为，不变）。
- **`config.js` 变更**：新增 `NODE_ENV: process.env.NODE_ENV`（其余字段不动）；`JWT_SECRET` 仍为 `process.env.JWT_SECRET` 透传，校验职责下沉到 `secretValidator`，避免 config 模块承担业务判定。
- **校验链路**：`app.js → secretValidator.assertJwtSecretStrength(config.JWT_SECRET, config.NODE_ENV)`，单入口、可单测、不侵入 jwt 签发/校验路径。
- **示例配置文档化**：新增 `server/.env.example`（当前仓库缺失），示例中 `JWT_SECRET` 使用 ≥32 字符强密钥占位（如 `please-change-me-to-a-random-secret-at-least-32-chars`）并注释说明；`server/.env` 现有弱密钥值**保持不变**——开发模式将输出 WARN 但不阻断（符合 spec 4.5.3 预期行为变更），保证开发与 E2E 启动不被破坏。

## 2.2 接口设计

### 2.2.1 总体设计

- **对外接口（HTTP API）零变更**：`/api/auth/login`、`/api/auth/logout`、`/api/admin/users`（GET/POST/PUT/PATCH/reset-password）、`/api/requests/**` 的路径、请求参数、成功响应结构、错误码与 HTTP 状态全部保持 V1.0 不变。新增/修改的均为**进程内内部接口**（存储引擎、仓储、启动校验）。
- **接口分类**：内部接口分为三类——①存储引擎并发原语（`runExclusive`）；②仓储原子方法（`createIfUsernameFree`、`updateIfUsernameFree`、改造后的 `add`/`cleanupExpired`）；③启动校验（`validateJwtSecret`、`assertJwtSecretStrength`）。
- **稳定性等级**：`read`/`write`/`findByUsername` 等既有接口为**稳定**；新增内部接口为**实验级**（V1.1 内部使用，未来可演进）；无废弃接口。
- **类型安全**：全栈 JS 技术栈，内部接口以 JSDoc `@param`/`@returns` 声明类型；临界区 task 返回值严格约定为 `Array<object> | null`（运行时语义约束 + 契约文档化），杜绝 `any`/非结构化 Map 传参。

### 2.2.2 接口清单

**A. 存储引擎层（`JsonStoreEngine`，新增/变更）**

```js
// 新增
async runExclusive(collection, task)          // 串行临界区，契约见 2.1.3.1
// 不变（既有接口，锁链与 runExclusive 共享）
read(collection)                              // 同步读内存快照
async write(collection, data)                 // 串行写 + 失败回滚
```

**B. 仓储层（新增原子方法 / 变更）**

```js
// blacklistRepository（改造，行为对外不变）
async add(token, expiresAt)                   // 临界区内读-改-写（不可变更新）
async cleanupExpired()                        // 仅删过期 + 容错 + 结构化日志
isBlacklisted(token)                          // 不变（同步读）

// userRepository（新增）
async createIfUsernameFree(user)              // 冲突抛 409；返回新用户
async updateIfUsernameFree(id, updates)       // 不存在返回 null；冲突抛 409
```

**C. 启动校验（`secretValidator`，新增）**

```js
validateJwtSecret(secret)                     // → { valid, reason }
assertJwtSecretStrength(secret, nodeEnv)      // 生产 fail-fast / 开发 WARN / 缺失拒绝
```

## 2.3 数据模型

### 2.3.1 设计目标

- 支持的业务场景：黑名单过期条目按需清理；并发下用户名全局唯一；启动期密钥强度校验。
- 兼容策略：`users.json`、`token-blacklist.json` 存量数据格式**零变更、零迁移**（spec 4.5-2）；不新增任何数据文件。
- 性能目标：临界区仅含"内存读 + 比较 + 同步文件写"，单次临界区耗时 ms 级；核心接口响应保持 2s 基线内。

### 2.3.2 模型实现

**核心对象关系（V1.0 数据条目不变，仅新增操作语义）**

```plantuml
@startuml
!theme plain
class JsonStoreEngine {
  - memory: Object<string, Array<object>>
  - locks: Object<string, Promise>
  + read(collection): Array<object>
  + async write(collection, data)
  + async runExclusive(collection, task)
}

class blacklistRepository {
  + async add(token, expiresAt)
  + isBlacklisted(token): boolean
  + async cleanupExpired()
}

class userRepository {
  + findAll(): Array<object>
  + findByUsername(username): object
  + findById(id): object
  + async createIfUsernameFree(user)
  + async updateIfUsernameFree(id, updates)
}

class "BlacklistEntry\n{id, token, expiresAt}" as BE
class "UserAccount\n{id, username, name, passwordHash,\n role, status, createdAt, updatedAt}" as UA

blacklistRepository --> JsonStoreEngine : runExclusive('token-blacklist')
userRepository --> JsonStoreEngine : runExclusive('users')
blacklistRepository --> BE : 管理
userRepository --> UA : 管理
note right of UA : username 全局唯一\n（由临界区保证）
@enduml
```

- **`token-blacklist` 条目**：`id` / `token` / `expiresAt`（ISO 8601）——结构不变；`expiresAt` 为唯一过期判据（spec 6.1）。
- **`users` 条目**：`username` 唯一性由临界区在写入时保证（spec 6.2-1）；`passwordHash` 存储与脱敏逻辑不变；`role`/`status` 取值语义不变；`createdAt`/`updatedAt` 生成规则不变（`updatedAt` 在 `updateIfUsernameFree` 内同步刷新）。
- **对象生命周期**：黑名单条目仅由 `add` 创建、由 `cleanupExpired` 批量删除；用户记录仅由创建/更新原子方法写入，无新增删除操作。

## 2.4 改动点清单（文件级 + 方法级）

| # | 文件 | 改动类型 | 方法/位置级改动 |
|---|------|---------|----------------|
| 1 | `server/src/store/JsonStoreEngine.js` | 修改（新增方法） | 新增 `runExclusive(collection, task)`；`write()` 内部可提取私有 `_persist` 共享落盘/回滚逻辑（可选重构，行为不变） |
| 2 | `server/src/repositories/blacklistRepository.js` | 修改 | `add()` 改临界区不可变更新；`cleanupExpired()` 改临界区 + 容错 + 结构化日志；`isBlacklisted()` 不变 |
| 3 | `server/src/repositories/userRepository.js` | 修改（新增方法） | 新增 `createIfUsernameFree(user)`、`updateIfUsernameFree(id, updates)`；既有 `create`/`update` 保留 |
| 4 | `server/src/services/userService.js` | 修改 | `createUser()`：bcrypt.hash 提前到临界区外，改调 `createIfUsernameFree`；`updateUser()`：唯一性检查移交 `updateIfUsernameFree` |
| 5 | `server/src/services/authService.js` | 修改 | `login()`：签发 token 后 `await cleanupExpired()`；`logout()`：`add()` 后 `await cleanupExpired()` |
| 6 | `server/src/app.js` | 修改 | `startServer()`：监听前调用 `assertJwtSecretStrength`；`store.init()` 后调用 `cleanupExpired()` |
| 7 | `server/src/config.js` | 修改 | 新增 `NODE_ENV: process.env.NODE_ENV` |
| 8 | `server/src/constants/errorCodes.js` | 修改 | 新增 `INIT_CONFIG_WEAK_SECRET`（仅启动期内部使用） |
| 9 | `server/src/utils/secretValidator.js` | **新增** | `MIN_JWT_SECRET_LENGTH`、`WEAK_JWT_SECRETS`、`validateJwtSecret`、`assertJwtSecretStrength` |
| 10 | `server/.env.example` | **新增** | 配置示例（强密钥占位 + 注释） |
| 11 | `server/package.json` | 修改 | 新增脚本 `"test": "node --test test/"` |
| 12 | `server/test/secretValidator.test.js` | **新增** | 密钥判定单测 |
| 13 | `server/test/blacklistCleanup.test.js` | **新增** | 清理逻辑 + 并发不丢数据 |
| 14 | `server/test/userConcurrency.test.js` | **新增** | 并发重名唯一性（Promise.all） |
| 15 | `server/test/startupValidation.test.js` | **新增** | 生产 fail-fast / 开发 WARN（子进程） |
| 16 | `tests/hardening.test.js` | **新增** | E2E 加固回归用例 |

**明确不改动**：`controllers/*`、`routes/*`、`middlewares/auth.js`、`middlewares/errorHandler.js`、`utils/jwt.js`、`utils/bcrypt.js`、`utils/validator.js`、`utils/response.js`、`utils/logger.js`、`errors/BusinessError.js`、`requestService`、`reviewService`、`auditService`、`requestRepository`、`auditRepository`、`initAdmin.js`（内部不动）、`client/**`、`server/.env`（保留弱密钥值，开发模式 WARN 属预期）。

## 2.5 风险与兼容性分析

| 维度 | 风险/影响 | 评估与对策 |
|------|----------|-----------|
| 接口兼容 | 对外 HTTP API 路径、参数、响应、错误码零变化 | `USER_NAME_CONFLICT`(409)、`AUTH_TOKEN_INVALID`(401) 等语义原样保留；新错误码仅启动期内部日志 |
| 数据兼容 | `users.json` / `token-blacklist.json` 格式不变 | 无数据迁移；`runExclusive` 落盘内容与既有 `write` 一致（`JSON.stringify(data, null, 2)`） |
| 并发正确性 | `runExclusive` 死锁（task 内调 `write`） | 契约约束（临界区内禁调 `write`/`runExclusive`）+ 锁链失败延续（`run.catch(() => {})`）+ 代码评审；纯读接口不进临界区，无额外等待 |
| 并发正确性 | 内存污染（task 原地修改集合引用） | 契约强制"不可变更新"（返回新数组）；`data === previous` 判定跳过落盘，避免误写 |
| 行为兼容 | `createUser` 的 bcrypt.hash 提前 | 对外校验顺序与错误码不变（校验仍先于查重，查重后移但语义等价）；重名时多消耗一次 hash 成本（~100ms 级），单用户操作场景可接受 |
| 启动行为 | 生产模式弱密钥将拒绝启动 | 属 spec 明确要求的 fail-fast；开发模式仅 WARN 不阻断，`server/.env` 现有值（黑名单示例）在开发/E2E 下照常启动 |
| 启动耗时 | 启动新增一次同步清理（数据量小） | 影响可忽略；清理失败不阻断启动（内部容错） |
| 测试隔离 | 服务端测试会触碰真实 `server/data/` | 每个测试文件在 require 模块前设置 `process.env.DATA_DIR` 为临时目录（`node:test` 文件级进程隔离天然支持），杜绝污染 |
| 兼容性回归 | E2E webServer（`node src/app.js`）启动判定 | 开发模式弱密钥仅 WARN，端口正常监听，Playwright `reuseExistingServer` 行为不变 |

## 2.6 测试方案设计

分层验证策略：**服务端自动化测试（`node:test`）承担并发正确性与启动期校验的核心验证；Playwright E2E 覆盖主流程加固回归**（与已确认的设计选择一致）。

### 2.6.1 服务端自动化测试（`server/test/`，零新增依赖）

测试运行：`cd server && npm test`（即 `node --test test/`，Node 18+ 内置 runner）。

**隔离约定**：每个测试文件为独立进程（`node:test` 默认），文件顶部先设置 `process.env.DATA_DIR = <os.tmpdir() 下的临时目录>`、`process.env.JWT_SECRET = <≥32字符强密钥>`（启动校验用例除外），再 `require` 被测模块；`after` 钩子清理临时目录。

| 测试文件 | 覆盖点 | 关键用例 |
|---------|--------|---------|
| `secretValidator.test.js` | 密钥判定逻辑（纯函数单测） | ①缺失→`{valid:false, reason:'missing'}`；②`31` 字符→`'too-short'`；③黑名单示例值→`'blacklisted'`（两个示例均覆盖）；④≥32 非黑名单→`valid:true`；⑤`assertJwtSecretStrength` 开发模式弱密钥返回 `{ok:true}` 且输出 WARN；⑥生产模式弱密钥抛出且消息含原因类别 |
| `blacklistCleanup.test.js` | 清理逻辑与并发安全 | ①仅删 `expiresAt < now` 条目、未过期条目完整保留；②无过期条目时不落盘（文件 mtime/内容不变，验证幂等）；③并发 `Promise.all` 发起多条 `add` + 一次 `cleanupExpired`，断言全部未过期新条目与清理结果一致、无条目丢失；④模拟写入失败（注入引擎写异常）时 `cleanupExpired` 不抛错且内存态回滚 |
| `userConcurrency.test.js` | 用户唯一性并发原子化 | ①并发 `createIfUsernameFree` 两个相同 username（`Promise.all`，利用 bcrypt.hash 异步让出制造真实竞态），断言恰一个成功、一个抛 `USER_NAME_CONFLICT`；②`updateIfUsernameFree` 改为已有用户名（排除自身）→ 抛 409；③HTTP 层（`app.listen(随机端口)` + 内置 `fetch`）并发 POST `/api/admin/users` 同 username，断言一 200 一 409 且错误码 `USER_NAME_CONFLICT`；④users.json 最终无重复 username |
| `startupValidation.test.js` | 启动期校验（子进程） | ①`NODE_ENV=production` + 弱密钥 → `spawn node src/app.js` 退出码非 0、日志含原因类别；②`NODE_ENV=production` + 缺失 → 退出码非 0、`INIT_CONFIG_MISSING`；③非生产 + 弱密钥 → 退出码 0、日志含 WARN、端口可访问；④生产 + 强密钥 → 正常启动 |

### 2.6.2 Playwright E2E 加固回归（`tests/hardening.test.js`）

沿用 `tests/helpers.js` 既有 API 封装（`loginAs` / `apiCall` / `createEmployee`），在既有 E2E 基础上**仅追加加固点回归用例**（不重构既有用例）：

| 用例 | 步骤 | 断言 |
|------|------|------|
| 创建重名员工仍返回 409（串行回归） | 登录管理员 → 创建员工 X → 再次创建同名员工 X | 第二次响应 `status=409`、`code=USER_NAME_CONFLICT`、提示"用户名已存在" |
| 登出后令牌失效且登出流程不受清理影响 | 登录管理员 → 登出 → 携带已登出 token 访问 `/api/admin/users` | 登出返回 `code=0`；后续请求 `status=401`、`code=AUTH_TOKEN_INVALID` |
| 登录/登出主流程冒烟回归（覆盖清理触发路径） | 管理员登录 → 登出 → 重新登录 → 创建员工 | 每一步均成功（`code=0`），系统持续可用，验证三时机清理未破坏主流程 |

> 说明：真实并发重名、启动期密钥校验等**不依赖浏览器交互**的验证由服务端 `node:test` 承担（E2E 单浏览器无法构造真实并发），与已确认的测试分层一致。

---

# 三、V1.2 需求与存量功能关系分析

本章明确 V1.2 两项新需求（5A 版本分支管理策略、5B 版本号展示）与 V1.1 现有代码/仓库状态的关系，是增量设计的基础。所有代码位置均已核实到文件级。

## 3.1 需求功能与存量功能对比

### 3.1.1 已实现功能

以下能力在存量代码/仓库中已具备，V1.2 直接复用、无需重新开发：

| 需求功能 | 存量功能 | 代码位置 | 匹配度 |
|---------|---------|---------|--------|
| 5A-5 发布 tag（vX.Y） | 仓库已存在 tag `v1.0`、`v1.1`（指向 V1.0/V1.1 发布提交） | `git tag`（提交 `6f0423a`、`0364c75`） | 100%（打 tag 方式已具备，V1.2 沿用） |
| 5A-6 release 归档分支（release/vX.Y） | git 分支管理机制已具备（当前仅有 main） | 仓库 `git branch` | 50%（机制已具备，release 分支不存在，需补建） |
| 5B-3/5B-4 公开免鉴权 HTTP 接口能力 | Express 路由挂载机制 + 不挂 `authRequired` 即为公开路径 | `server/src/routes/auth.js:6`（login 免鉴权示例）；`server/src/app.js:32-34` | 100%（机制具备，接口本体需新增） |
| 5B-5 响应结构 `{ code, data }` 契约 | `response.success()/fail()` 统一封装；前端 `apiClient` 响应拦截器已解包 `response.data` | `server/src/utils/response.js:1-8`；`client/src/api/client.js:16-17` | 100%（契约已具备，直接复用） |
| 5B-2 语义化版本号 `X.Y.Z` | `server/package.json` version 字段（当前 `1.0.0`，符合 X.Y.Z 格式） | `server/package.json:3` | 100%（格式具备，值需升级为 1.2.0） |

### 3.1.2 需要扩展的功能

| 需求功能 | 存量功能 | 差异说明 | 扩展方向 |
|---------|---------|---------|---------|
| 5A-7 历史分支补建（release/v1.0、release/v1.1） | 已有 tag v1.0、v1.1，无对应 release 分支 | tag 已存在但归档分支缺失 | git 操作：`git branch release/v1.0 v1.0`、`git branch release/v1.1 v1.1` 并推送（无代码改动） |
| 5B-1 版本号单一来源（version 升级） | `server/package.json` version=1.0.0；`client/package.json`、根 `package.json` version=1.0.0 | 值需升级；三处同步升级但展示仍以 server 为唯一来源 | 三处 `version` 修改为 `1.2.0`；前端展示只走后端接口，不读本地 package.json |
| 5B-6/5B-7 登录页与主界面展示版本号 | 登录页 `Login.jsx`（独立卡片，底部为空闲区）；主界面 `Layout.jsx` 顶栏右侧（用户信息/登出并列区） | 页面无版本号展示逻辑 | 引入 `useVersion` hook + 版本接口调用，两处挂载展示；失败静默隐藏 |
| 5B-8 两处展示同源一致 | 无既有版本展示 | 需保证登录页与主界面取同一数据源 | `useVersion` 采用模块级单例 Promise 缓存，两处共享同一接口响应 |

### 3.1.3 需要新增的功能或接口

**A. 后端（版本号展示）**
- 新增公开免鉴权接口 `GET /api/meta/version`：返回 `{ code: 0, data: { version } }`，version 来自启动时缓存的 `server/package.json`。
- 新增 `versionProvider` 模块：启动时读取 `server/package.json` 的 version 并缓存于内存；读取失败/缺失/格式非法时缓存 null 并输出 ERROR 日志（不阻断启动）。
- 新增 `VERSION_UNAVAILABLE` 错误码（仅版本接口使用，不影响既有对外错误码语义）。

**B. 前端（版本号展示）**
- 新增 `client/src/api/meta.js`：封装 `fetchVersion()`。
- 新增 `client/src/hooks/useVersion.js`：模块级单例缓存 + 失败静默降级，返回格式化后的展示版本号（`vX.Y.Z`）或 null。
- 改造 `Login.jsx`（卡片底部）、`Layout.jsx`（顶栏右侧）：version 非 null 时渲染。

**C. 分支管理（工程流程）**
- 新增 `BRANCHING.md`：GitHub Flow 简化版策略文档（5A-13）。
- 补建 release/v1.0、release/v1.1（git 操作，5A-7）。
- 执行 V1.2 发布流程（feature → merge main → tag v1.2 → release/v1.2，5A-8）。

## 3.2 存量功能详细分析

### 3.2.1 app.js 启动与路由挂载（5B 后端落点）

- **接口契约**：`startServer()`：密钥校验 → `store.init()` → 启动清理 → `initAdmin()` → 构建 Express app → 挂载 `/api/auth`、`/api/requests`、`/api/admin` → 静态托管与 SPA fallback → `errorHandler` → `listen()`。
- **约束**：
  - 新增 `/api/meta` 路由必须挂载在 `errorHandler` 之前（与既有路由一致）；`app.get('*')` fallback 对 `/api` 前缀直接 `next()`，版本接口不会被 SPA 兜底吞掉。
  - 版本接口**不得挂 `authRequired`/`requireAdmin` 中间件**（5B-4 免鉴权），与 `/api/auth/login` 同属公开路径。
  - 启动预热缓存应放在 `listen()` 之前；读取失败仅输出日志、不阻断启动（版本展示为可降级功能，spec 4.2-4）。

### 3.2.2 前端 apiClient 与页面结构（5B 前端落点）

- **`client/src/api/client.js`**：axios 实例 baseURL=`/api`；请求拦截器自动附加 `Authorization`（无 token 时不附加）；响应拦截器 `response => response.data`，仅 401 时清除凭证并跳转登录页。
- **约束**：
  - 版本接口正常返回 200，**不会触发 401 跳转分支**；即便版本接口异常，错误对象 `{ code, message }` 或 `{ code: 'NETWORK_ERROR' }` 由 `useVersion` catch 后静默处理，不经过 Toast 弹窗（5B-9 不弹错误）。
  - `fetchVersion()` 经 `apiClient.get('/meta/version')`，因拦截器解包后实际结构为 `{ code: 0, data: { version } }`，需取 `.data.version`。
- **`Login.jsx`**：无 Layout、独立居中卡片；卡片底部当前为空闲区域，适合新增版本号（5B-6）。
- **`Layout.jsx`**：顶栏右侧 flex 容器已有 `{user.name}({role})` 与登出按钮，版本号作为并列 `<span>` 插入（5B-7）；所有主界面页面（admin/employee）均经 `<Layout>` 渲染，改动一处即全局生效。

### 3.2.3 git 仓库现状（5A 落点）

- **现状**：仅 `main` 分支；tag `v1.0`（提交 `6f0423a`）、`v1.1`（提交 `0364c75`）；无任何 release 分支；无 `BRANCHING.md`。
- **约束**：补建分支必须从既有 tag 创建（`git branch <name> <tag>` 即从 tag 指向的提交创建），满足 5A-7「指向 v1.0/v1.1 tag 对应提交」；分支/tag 命名唯一性由 git 强制（5A-11）。

---

# 四、V1.2 增量设计方案

本章将 5A（版本分支管理策略）与 5B（版本号展示）转化为可落地技术方案。总体策略：**改动点最小化**——5B 为纯增量前后端功能（新增 1 个公开接口 + 2 个前端组件改动 + 版本号升级），不触碰任何既有业务接口/数据文件/鉴权语义；5A 为工程流程类需求（文档 + git 操作），不涉及运行时代码。

## 4.1 实现模型

### 4.1.1 上下文视图

```plantuml
@startuml
!theme plain
left to right direction
actor "用户（未登录）" as U1
actor "用户（已登录）" as U2
rectangle "企业差旅管理系统 V1.2" as System {
    usecase "登录页展示版本号" as UC1
    usecase "主界面顶栏展示版本号" as UC2
    usecase "版本查询接口" as UC3
}
rectangle "server/package.json" as Pkg
actor "开发者/运维" as Dev
rectangle "本地 git 仓库" as Git

U1 --> UC1
U2 --> UC2
UC1 ..> UC3 : GET /api/meta/version（免鉴权）
UC2 ..> UC3 : GET /api/meta/version（免鉴权）
UC3 --> Pkg : 启动时读取 version（内存缓存）
Dev --> Git : 分支管理 / 打 tag / 发布
@enduml
```

- **上游**：登录页与主界面（前端组件）挂载时调用版本接口获取版本号，两处共享同一数据源（5B-8）。
- **下游**：后端仅依赖 `server/package.json`（启动时读取一次），无存储 I/O、无鉴权开销，满足 200ms 响应上限（spec 4.1-4）。
- 5A 分支管理由开发者/运维在本地 git 仓库操作，与运行时无交互。

### 4.1.2 服务/组件总体架构

架构保持 V1.0/V1.1 分层不变（Route → Controller → Service/Util → 数据源），V1.2 的改动为「新增 meta 链路」与「前端展示链路」：

```plantuml
@startuml
!theme plain
skinparam componentStyle rectangle

package "路由层" {
  [routes/meta.js] as RM
  [routes/auth.js] as RA
  [routes/admin.js] as RA2
  [routes/request.js] as RR
}

package "控制器层" {
  [metaController] as CM
  [authController] as CA
  [userController] as CU
}

package "工具/常量层" {
  [versionProvider] as VP
  [response] as RES
  [errorCodes] as EC
}

package "前端" {
  [api/meta.js] as FAM
  [hooks/useVersion.js] as FUV
  [pages/Login.jsx] as FL
  [components/Layout.jsx] as FLAY
  [api/client.js] as FC
}

RM --> CM
CM --> VP : getVersion()（内存缓存）
CM --> RES : success({ version })
CM --> EC : VERSION_UNAVAILABLE（版本不可用时）
RA --> CA
RA2 --> CU
RR --> CA

FAM --> FC : axios GET /meta/version
FUV --> FAM : 单例 Promise 缓存
FL --> FUV : 卡片底部展示 vX.Y.Z
FLAY --> FUV : 顶栏右侧展示 vX.Y.Z

note right of VP
  启动时读取 server/package.json
  的 version 字段并缓存（新增，V1.2）
end note
note right of FUV
  模块级单例：两处组件共享同一
  接口响应，失败静默返回 null
end note
@enduml
```

组件职责与 V1.2 变更对照：

| 组件 | 职责 | V1.2 变更 |
|------|------|----------|
| `routes/meta.js`（新） | 公开元信息路由，挂载 `/api/meta`，version 子路由免鉴权 | 新增模块 |
| `metaController.js`（新） | 版本接口处理器：取缓存版本号并返回 `{ code: 0, data: { version } }`；不可用时抛 `VERSION_UNAVAILABLE`(500) | 新增模块 |
| `versionProvider.js`（新） | 启动时读取 `server/package.json` version 并缓存；提供工厂函数便于测试注入 | 新增模块 |
| `errorCodes.js` | 错误码常量 | 新增 `VERSION_UNAVAILABLE`（仅版本接口使用） |
| `app.js` | 启动编排与路由挂载 | 挂载 `/api/meta`；`listen()` 前调用 `versionProvider.getVersion()` 预热缓存 |
| `client/src/api/meta.js`（新） | 封装 `fetchVersion()` → `GET /api/meta/version` | 新增模块 |
| `client/src/hooks/useVersion.js`（新） | 版本号获取 hook：单例 Promise 缓存 + 失败静默降级，返回 `vX.Y.Z` 或 null | 新增模块 |
| `Login.jsx` | 登录页 | 卡片底部展示版本号（version 非 null 时） |
| `Layout.jsx` | 主界面布局 | 顶栏右侧（用户信息/登出并列）展示版本号 |
| 三处 `package.json` | 包元数据 | version 同步升级为 1.2.0（展示唯一来源仍为 server） |
| `BRANCHING.md`（新） | 版本分支管理策略文档 | 新增文档（5A-13） |

### 4.1.3 实现设计文档（5B 版本号展示）

#### 后端：versionProvider 启动缓存

设计要点（已确认决策 3：启动时读取一次并缓存于内存）：

```js
/**
 * 版本号提供器：以 server/package.json 的 version 字段为单一事实来源（5B-1）。
 * 首次调用（启动期预热）读取并缓存于内存，进程生命周期内不重复读取；
 * 读取失败 / version 缺失或不符合 X.Y.Z 格式 → 缓存 null 并输出 META 模块 ERROR 日志，
 * 不阻断启动（版本展示为可降级功能）。
 * 提供 createVersionProvider(packagePath) 工厂，便于测试注入临时 package.json。
 */
getVersion() → string | null          // 惰性读取 + 缓存
createVersionProvider(packagePath)    // 工厂（测试用）
```

- **读取方式**：`fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')` + `JSON.parse`，取 `version` 字段；格式校验正则 `/^\d+\.\d+\.\d+$/`（X.Y.Z）。
- **缓存策略**：模块级 `cachedVersion` + 初始化标志，首次调用后不再读文件（进程内恒定，符合「单一事实来源」与 200ms 约束）。
- **启动预热**：`app.js` 的 `startServer()` 在 `listen()` 前调用一次 `versionProvider.getVersion()`，触发读取并缓存；读取异常仅输出 ERROR 日志。
- **接口异常映射**：`getVersion()` 返回 null（package.json 缺失 / version 缺失 / 格式非法，spec 5.5.3-2）→ `metaController` 抛 `BusinessError(VERSION_UNAVAILABLE, '版本信息不可用', 500)` → `errorHandler` 返回 `{ code: 'VERSION_UNAVAILABLE', message: '版本信息不可用' }`；前端按失败降级静默隐藏（5B-9）。

#### 后端：app.js 挂载方式

```js
// startServer() 内（增量，V1.2）：
const versionProvider = require('./utils/versionProvider');
const metaRoutes = require('./routes/meta');
// ... 既有初始化 ...
versionProvider.getVersion();      // 启动预热缓存（新增，listen 前）
// ...
app.use('/api/meta', metaRoutes);  // 新增：免鉴权路由（不挂 authRequired）
```

- 挂载位置：与 `/api/auth` 等并列，位于 `errorHandler` 之前、SPA fallback 之前；`/api` 前缀由 `app.get('*')` 直接 `next()`，不会被 index.html 兜底。
- 兼容性：不修改 `authRequired`/`errorHandler` 任何行为；`errorHandler` 的 `INTERNAL_ERROR` 兜底分支保持原样。

#### 前端：版本号获取、缓存与展示

**API 封装（`client/src/api/meta.js`）**

```js
import apiClient from './client';
// 响应拦截器已解包 response.data → resolve 为 { code: 0, data: { version } }
export const fetchVersion = () => apiClient.get('/meta/version');
```

**数据获取 hook（`client/src/hooks/useVersion.js`）——无需全局状态库**

设计要点（满足 5B-6/7/8/9，不引入 Redux/Zustand 等任何状态库）：

```js
// 模块级单例 Promise 缓存：登录页与 Layout 共享同一请求与结果（5B-8 同源一致）
let versionPromise = null;
function loadVersion() {
  if (!versionPromise) {
    versionPromise = fetchVersion()
      .then(res => res.data.version)   // 取 { code:0, data:{ version } }.data.version
      .catch(() => null);              // 失败静默降级（5B-9）：不抛出、不弹错
  }
  return versionPromise;
}

export default function useVersion() {
  const [version, setVersion] = useState(null);
  useEffect(() => {
    let mounted = true;
    loadVersion().then(v => { if (mounted) setVersion(v); });
    return () => { mounted = false; };
  }, []);
  return version ? `v${version}` : null;  // 1.2.0 → v1.2.0（5B-2）
}
```

- **同源一致性（5B-8）**：`versionPromise` 为模块级单例——登录页首次挂载发起请求，登录跳转主界面后 Layout 挂载复用同一已 resolve 的 Promise，两处取值必然一致，且整个运行实例只发一次请求。
- **失败降级（5B-9）**：`.catch(() => null)` 吞掉一切异常（网络错误 / 接口 500 / 超时），hook 返回 null，组件不渲染版本号；不弹 Toast、不影响登录流程与主界面使用；刷新页面可重试。
- **版本号格式（5B-2）**：后端下发 `1.2.0`（X.Y.Z），hook 内统一加前缀 `v` 得 `v1.2.0`；version 为空/非法时返回 null 隐藏。
- **无全局状态库**：React 18 内 `useState` + 模块级单例即可满足「两处共享数据 + 一次请求」，不新增任何依赖。

**登录页（`Login.jsx`）改动**：卡片底部（`</form>` 之后）新增版本号区域，`{version && <div>…{version}</div>}`，version 为 null 时不渲染。

**主界面（`Layout.jsx`）改动**：顶栏右侧 flex 容器中、用户信息与登出按钮之间（或之后）并列新增版本号 `<span>`（已确认决策 2），同样为条件渲染 `{version && <span>…{version}</span>}`。

**两处展示均为条件渲染**：加载中/失败时不显示任何占位，不阻断页面（5B-9）。

### 4.1.4 实现设计文档（5A 版本分支管理落地）

#### BRANCHING.md 内容大纲（5A-13）

新增仓库根目录 `BRANCHING.md`，内容大纲：

1. **分支模型总览**：GitHub Flow 简化版（单主干）；不设 develop 分支；main 兼任功能集成与版本发布。
2. **分支角色与命名规范**：
   - `main`：唯一开发主分支（集成 + 发布）；禁止直接提交新功能，仅允许合并 feature、打 tag、文档/配置类维护（5A-10）。
   - `feature/<功能名>`：新功能开发分支，从 main 检出，完成后合并回 main 并删除（5A-2/3/4）。
   - `release/vX.Y`：已发布版本归档分支，从 tag `vX.Y` 创建，仅允许该版本缺陷修复（5A-6/9）。
   - tag `vX.Y`：从 main 创建的版本标签（5A-5）。
3. **开发流程**：`git checkout -b feature/<功能名> main` → 开发提交 → `git checkout main && git merge --no-ff feature/<功能名>` → 删除 feature 分支。
4. **发布流程**：合并 feature → 更新三处 package.json version → 追加 CHANGELOG 对应章节 → 打 tag → 补建 release 分支 → 推送。
5. **约束与检查**：分支/tag 命名唯一性（5A-11）；打 tag 前 CHANGELOG 必须已含对应版本章节且版本号一致（5A-12）；违规处理（main 直接开发新功能 / release 混入新功能时回退并改走规范流程）。
6. **常用命令速查表**：检出/合并/打 tag/补建分支/推送命令。

#### 历史分支补建（5A-7）——具体命令

```bash
# 从既有 tag 补建历史归档分支（指向 tag 对应提交）
git branch release/v1.0 v1.0
git branch release/v1.1 v1.1
# 推送远端（仓库已存在 origin）
git push -u origin release/v1.0
git push -u origin release/v1.1
```

- 验证：`git branch --list 'release/*'` 显示 `release/v1.0`、`release/v1.1`；`git rev-parse release/v1.0` 与 `git rev-parse v1.0^{commit}` 一致（满足 5A-7 验收条件）。

#### V1.2 发布流程（5A-8）——具体步骤

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | `git checkout -b feature/travel-mgmt-v1.2 main` | 从 main 检出 V1.2 功能分支（5A-2/3） |
| 2 | 在 feature 分支完成 V1.2 开发与文档（版本接口、前端展示、BRANCHING.md、三处 package.json、CHANGELOG [1.2.0]） | 所有变更落在 feature 分支（5A-10） |
| 3 | `git checkout main && git merge --no-ff feature/travel-mgmt-v1.2` | 合并回 main（5A-4）；合并后删除 feature 分支 |
| 4 | 检查 `CHANGELOG.md` 已含 `## [1.2.0]` 章节且版本号与 package.json 一致 | 满足 5A-12（tag 与 CHANGELOG 一致性） |
| 5 | `git tag -a v1.2 -m "release v1.2"` | 在 main 上打 tag（5A-5）；tag 名唯一（5A-11） |
| 6 | `git branch release/v1.2 v1.2` | 从 tag 补建归档分支（5A-6） |
| 7 | `git push origin main v1.2`、`git push -u origin release/v1.2` | 推送 main、tag 与 release 分支 |

#### 三处 package.json 版本同步（5B-1/5B-10）

- **同步升级**：`package.json`（根）、`client/package.json`、`server/package.json` 的 `version` 字段均由 `1.0.0` 升级为 `1.2.0`（已确认决策 4）。
- **展示唯一来源不变**：前端展示的版本号仅通过后端 `GET /api/meta/version` 获取，该接口值恒等于 `server/package.json` 的 version（5B-1）；client 与根 package.json 的 version 不参与展示，同步升级仅为仓库版本号整体一致。
- **自动跟随（5B-10）**：后续版本升级只需修改 `server/package.json` version 并重启后端（刷新缓存），前端展示自动跟随，无需前端代码改动。

## 4.2 接口设计

### 4.2.1 总体设计

- **对外接口**：新增 **1 个**公开只读接口 `GET /api/meta/version`；V1.0/V1.1 全部既有接口（auth/requests/admin）路径、参数、响应结构、错误码语义**零变更**（5B-11）。
- **接口分类**：元信息类（`/api/meta` 命名空间），与业务路由隔离，未来可扩展其他元信息（如构建号、环境标识）。
- **鉴权策略**：不挂 `authRequired`/`requireAdmin` 中间件，匿名可访问（5B-4）。
- **稳定性等级**：新增接口标记为**实验级**（V1.2 新增，未来可演进）；既有接口稳定性不变。
- **类型安全**：响应字段类型明确——`data.version` 为 `string`（`X.Y.Z`）；前端解包后不做类型转换，非法值（null/非字符串）由 hook 降级隐藏，杜绝 `any` 式传递。

### 4.2.2 接口清单

**A. 元信息类（新增）**

```js
// GET /api/meta/version —— 查询当前系统版本号（公开、免鉴权、只读）
// 成功：HTTP 200
//   { code: 0, data: { version: "1.2.0" } }
// 失败（server/package.json 缺失 / version 缺失或格式非法）：
//   HTTP 500
//   { code: "VERSION_UNAVAILABLE", message: "版本信息不可用" }
```

- **业务说明**：供登录页与主界面获取版本号，值来源于 `server/package.json` 的 version 字段（启动时缓存），符合 5B-1/3/5。
- **前置条件**：无（匿名可调用）。
- **后置条件**：无任何状态变更（只读接口）。
- **异常映射**：`VERSION_UNAVAILABLE`(500) 仅由版本数据不可用触发；其余错误走 `errorHandler` 通用分支（`INTERNAL_ERROR`(500)）。
- **调用示例（前端）**：

```js
// client/src/api/meta.js
export const fetchVersion = () => apiClient.get('/meta/version');
// 使用：const { data: { version } } = await fetchVersion();  // '1.2.0'
```

**B. 内部接口（新增，进程内）**

```js
// versionProvider
getVersion() → string | null                        // 启动缓存版本号
createVersionProvider(packagePath) → { getVersion() }  // 工厂（测试注入）
```

## 4.3 数据模型

### 4.3.1 设计目标

- 支持的场景：系统版本号查询（登录页/主界面展示）；版本分支与 tag 的可追溯管理。
- **不引入任何 JSON 数据文件变更**：版本号来源为 `server/package.json`（包元数据，非运行时数据文件）；`users.json`、`token-blacklist.json` 等存量数据零改动。
- 兼容策略：既有数据格式零变更、零迁移（spec 4.5-2 保持）。

### 4.3.2 模型实现

**系统版本号（V1.2 新增约束，spec 6.3）**

```plantuml
@startuml
!theme plain
class "server/package.json" as Pkg {
  version: "1.2.0"   // X.Y.Z 单一事实来源
}
class versionProvider {
  cachedVersion: string | null
  + getVersion(): string | null
}
class "GET /api/meta/version" as Api {
  + data.version: string
}
class "前端展示" as FE {
  + 登录页卡片底部: "v1.2.0"
  + 主界面顶栏右侧: "v1.2.0"
}
Pkg --> versionProvider : 启动时读取一次（缓存）
versionProvider --> Api : 内存缓存
Api --> FE : { code:0, data:{ version } }
note right of Pkg
  version=1.2.0 ↔ CHANGELOG [1.2.0] ↔ tag v1.2
  （发布流程保证一致性，spec 6.3-3）
end note
@enduml
```

- **对象生命周期**：版本号无持久化对象生命周期——启动时由 `versionProvider` 读取并缓存，进程重启后重新读取；不落任何数据文件。
- **git 分支/tag（spec 6.4）**：`main`（集成+发布）、`feature/<功能名>`（从 main 检出，合并后删除）、`release/vX.Y`（从 tag 创建，仅缺陷修复）、tag `vX.Y`（从 main 创建）；均为 git 仓库对象，非 JSON 数据，无需运行时存储层支持。

## 4.4 改动点清单（文件级 + 方法级 + git 操作）

**A. 后端（版本号展示）**

| # | 文件 | 改动类型 | 方法/位置级改动 |
|---|------|---------|----------------|
| 1 | `server/src/utils/versionProvider.js` | **新增** | `getVersion()`、`createVersionProvider(packagePath)`；启动缓存 + 异常降级 |
| 2 | `server/src/controllers/metaController.js` | **新增** | `getVersion(req, res, next)`：返回 `{ code:0, data:{ version } }`；null 时抛 `VERSION_UNAVAILABLE` |
| 3 | `server/src/routes/meta.js` | **新增** | `router.get('/version', metaController.getVersion)`（免鉴权） |
| 4 | `server/src/app.js` | 修改 | 引入 `versionProvider` + `metaRoutes`；`listen()` 前调用 `getVersion()` 预热；挂载 `app.use('/api/meta', metaRoutes)` |
| 5 | `server/src/constants/errorCodes.js` | 修改 | 新增 `VERSION_UNAVAILABLE: 'VERSION_UNAVAILABLE'`（仅版本接口使用） |
| 6 | `server/package.json` | 修改 | `version: "1.2.0"` |

**B. 前端（版本号展示）**

| # | 文件 | 改动类型 | 方法/位置级改动 |
|---|------|---------|----------------|
| 7 | `client/src/api/meta.js` | **新增** | `fetchVersion()` |
| 8 | `client/src/hooks/useVersion.js` | **新增** | `useVersion()`：单例 Promise 缓存 + 失败降级 + 格式化 `vX.Y.Z` |
| 9 | `client/src/pages/Login.jsx` | 修改 | 卡片底部条件渲染版本号（`{version && ...}`） |
| 10 | `client/src/components/Layout.jsx` | 修改 | 顶栏右侧（用户信息/登出并列）条件渲染版本号 |
| 11 | `client/package.json` | 修改 | `version: "1.2.0"`（同步，不参与展示） |

**C. 版本号同步与文档**

| # | 文件/操作 | 改动类型 | 说明 |
|---|----------|---------|------|
| 12 | `package.json`（根） | 修改 | `version: "1.2.0"`（同步，不参与展示） |
| 13 | `CHANGELOG.md` | 修改 | 顶部追加 `## [1.2.0] - 未发布` 章节（含 5A/5B 变更描述） |
| 14 | `BRANCHING.md` | **新增** | GitHub Flow 简化版策略文档（5A-13） |
| 15 | git 操作 | 执行 | 补建 `release/v1.0`、`release/v1.1`（5A-7） |
| 16 | git 操作（发布） | 执行 | V1.2 发布流程：feature → merge main → tag v1.2 → release/v1.2（5A-8） |

**D. 测试**

| # | 文件 | 改动类型 | 说明 |
|---|------|---------|------|
| 17 | `server/test/versionApi.test.js` | **新增** | 版本接口单测（node:test） |
| 18 | `tests/versionDisplay.test.js` | **新增** | 版本号展示与降级 E2E（Playwright） |

**明确不改动**：`routes/auth.js`、`routes/admin.js`、`routes/request.js`、`middlewares/auth.js`、`middlewares/errorHandler.js`、`store/JsonStoreEngine.js`、全部既有 services/controllers/repositories、`data/*.json`、`client/src/api/client.js`（既有拦截器不动）、`AuthContext.jsx`、既有页面业务逻辑与样式结构、`server/.env`。

## 4.5 风险与兼容性分析

| 维度 | 风险/影响 | 评估与对策 |
|------|----------|-----------|
| 接口兼容 | 新增 `/api/meta/version` 是否影响既有接口 | 纯增量公开接口；未改动任何既有路由/中间件/错误码语义（5B-11）；`app.get('*')` 对 `/api` 前缀 `next()` 不受影响 |
| 前端兼容 | 版本接口失败是否影响页面 | `useVersion` catch 静默返回 null，版本号隐藏；不弹 Toast、不跳转、不影响登录/主流程（5B-9） |
| 前端兼容 | `apiClient` 401 拦截器是否误触发 | 版本接口免鉴权恒 200；即便异常也是非 401 错误，拦截器仅 401 分支处理，不触发跳转 |
| 数据兼容 | 版本号引入是否影响 JSON 数据 | 不新增/修改任何数据文件；`server/package.json` 为包元数据，非运行时数据 |
| 版本一致性 | 三处 package.json 版本不一致风险 | 展示唯一来源为 server（接口下发）；client/根 package.json 仅同步元数据，不参与展示，发布流程统一修改（改动点 12/13） |
| 版本一致性 | version 与 CHANGELOG/tag 不一致 | 发布流程步骤 4 强制检查 CHANGELOG [1.2.0] 与 tag v1.2 对应（5A-12）；页面展示以 server/package.json 为准（正确来源） |
| 分支管理 | 补建分支/打 tag 与既有提交冲突 | 分支/tag 命名唯一性由 git 强制；release/v1.0、release/v1.1 从既有 tag 创建，不改变既有提交历史 |
| 缓存语义 | 部署后修改 version 需重启才生效 | 已确认决策 3（启动时读取缓存）；本项目无热更新部署场景，符合预期 |
| 启动行为 | package.json 读取失败是否阻断启动 | `versionProvider` 内部容错：仅 ERROR 日志 + 缓存 null，不阻断启动（spec 4.2-4 版本接口不可用不影响主流程） |
| 测试隔离 | 版本接口测试避免污染真实 package.json | `createVersionProvider` 工厂注入临时 package.json 文件；服务端测试沿用 DATA_DIR 临时目录约定 |

## 4.6 测试方案设计

分层验证策略（与 V1.1 一致）：**服务端 `node:test` 承担接口契约与缓存逻辑验证；Playwright E2E 承担页面展示与降级验证**。

### 4.6.1 服务端自动化测试（`server/test/versionApi.test.js`，node:test，零新增依赖）

沿用 V1.1 测试隔离约定（文件顶部设置临时 `DATA_DIR`、强 `JWT_SECRET`，`after` 清理临时目录）。

| 用例 | 覆盖点 | 关键断言 |
|------|--------|---------|
| 版本接口正常返回 | 5B-3/5 | 无 token 调用 `GET /api/meta/version` → HTTP 200、`code=0`、`data.version` 等于 `server/package.json` 的 version（`1.2.0`） |
| 免鉴权访问 | 5B-4 | 不带 `Authorization` 头访问 → 200（而非 401） |
| 单一来源一致性 | 5B-1 | `versionProvider.getVersion()` 返回值与 `require('../../package.json').version` 完全一致 |
| 缓存生效 | 已确认决策 3 | 连续调用 `getVersion()` 仅读取一次文件（注入计数器/修改临时文件后取值不变验证） |
| version 缺失/格式非法降级 | spec 5.5.3-2 | `createVersionProvider(临时 package.json)`：无 version 字段 / version 非法 → `getVersion()` 返回 null；接口路径返回 500 + `VERSION_UNAVAILABLE` |
| package.json 读取失败 | spec 5.5.3-2 | `createVersionProvider(不存在的路径)` → 返回 null 且不抛错（容错） |

### 4.6.2 Playwright E2E（`tests/versionDisplay.test.js`）

沿用 `tests/playwright.config.js`（webServer=`node src/app.js`）与既有页面交互方式（Playwright 浏览器交互，符合用户偏好）：

| 用例 | 步骤 | 断言 |
|------|------|------|
| 登录页展示版本号 | 打开 `/login` | 页面出现文本 `v1.2.0`（卡片底部） |
| 主界面展示版本号 | 登录管理员 → 进入任一主界面页 | 顶栏右侧出现 `v1.2.0`；与登录页所展示一致（同源，5B-8） |
| 接口失败降级（登录页） | `page.route('/api/meta/version')` 拦截返回 500 → 打开 `/login` | 页面无版本号文本、登录表单可正常使用、无错误弹窗（5B-9） |
| 接口失败降级（主界面） | 同上拦截 → 登录进入主界面 | 页面正常加载、无版本号、无错误弹窗 |
| 既有主流程回归 | 既有 E2E 用例全量执行 | `auth/userManagement/adminReview/requestSubmit` 等全部通过（5B-11 不影响既有接口） |

---

# 五、V1.3 需求与存量功能关系分析

本章明确 V1.3 两项新需求（6A UI/UX 视觉体验升级、6B 简体中文/English 双语支持）与 V1.2 现有前端代码/测试的关系，是增量设计的基础。所有代码位置均已核实到文件级。

> 总体结论：V1.3 为**纯前端改造**——后端 API、路由、鉴权中间件、业务枚举（`server/src/constants/*.js`）与 JSON 数据模型完全不动（spec 1.4-11/14、决策点 D-12）；前端全部既有**业务逻辑与接口调用**均已实现并复用，V1.3 的实质工作是将「原生 HTML + inline style」的展示层重构为「Ant Design 组件 + Design Token + i18n 文案」，并新增显示映射与语言切换两类纯展示能力。

## 5.1 需求功能与存量功能对比

### 5.1.1 已实现功能

以下功能在存量代码中已完整实现，V1.3 直接复用、**不重写业务逻辑**（仅包裹为 antd 组件形态）：

| 需求功能 | 存量功能 | 代码位置 | 匹配度 |
|---------|---------|---------|--------|
| 6A-7 登录逻辑（凭证校验、错误码、跳转） | `AuthContext.login()` + `api/auth.js` + `Login.jsx handleSubmit` | `client/src/context/AuthContext.jsx:13-21`；`client/src/api/auth.js:3-4`；`client/src/pages/Login.jsx:18-34` | 100%（逻辑复用，UI 展示层重构） |
| 6A-8 我的申请列表业务（状态筛选/分页/撤回/重新提交） | `EmployeeRequestList.jsx` 的 `fetchData`、`handleWithdraw` 与 API 调用 | `client/src/pages/employee/EmployeeRequestList.jsx:21-44`；`client/src/api/request.js` | 100%（业务与接口复用，原生 table→antd Table） |
| 6A-9 新建申请字段与校验规则 | `NewRequest.jsx` 表单字段（目的地/出发返回日期/事由/交通工具/预计费用）、required/maxLength/min 约束 | `client/src/pages/employee/NewRequest.jsx:10-25,36-63`；`client/src/api/request.js:3-4` | 100%（字段与校验规则复用，表单容器重构） |
| 6A-10 申请详情数据来源 | `RequestDetail.jsx` 经 `requestApi.getMyRequest(id)` 取数 | `client/src/pages/employee/RequestDetail.jsx:15-19`；`client/src/api/request.js:9-10` | 100%（取数逻辑复用，信息层级重构） |
| 6A-11 申请审核业务（列表/详情/Approve/Reject/意见） | `AdminRequestList.jsx`、`AdminRequestDetail.jsx` + `api/review.js` | `client/src/pages/admin/AdminRequestList.jsx:18-27`；`client/src/pages/admin/AdminRequestDetail.jsx:17-58`；`client/src/api/review.js` | 100%（业务与审批意见必填规则复用，UI 重构） |
| 6A-12 员工管理业务（创建/编辑/启用禁用/重置密码） | `AdminUsers.jsx` + `api/user.js` | `client/src/pages/admin/AdminUsers.jsx:20-79`；`client/src/api/user.js` | 100%（业务与 Modal 表单逻辑复用，容器换 antd） |
| 6A-6/6B 版本号展示 | `useVersion` hook（单例缓存 + 失败降级）+ `api/meta.js` | `client/src/hooks/useVersion.js:4-30`；`client/src/api/meta.js:3` | 100%（V1.3 布局重构后原样保留挂载） |
| 6A-13 路由与权限守卫 | `App.jsx` Routes + `AdminRoute/EmployeeRoute` + 后端 `authRequired`/`requireAdmin` | `client/src/App.jsx:15-27`；`client/src/router/ProtectedRoute.jsx:6-18`；`server/src/routes/admin.js:7-16`、`server/src/routes/request.js:6-10` | 100%（路由地址与权限语义保持 V1.2 不变） |
| 6A-5 角色识别 | `ROLES` 常量（管理员/普通员工）、`AuthContext.user.role` | `client/src/constants/roles.js`；`client/src/context/AuthContext.jsx:36` | 100%（Menu 按角色渲染的数据来源） |
| 6B-6 业务枚举中文值 | 前端/后端枚举常量（申请状态/角色/用户状态/交通工具） | `client/src/constants/requestStatus.js`、`roles.js`、`userStatus.js`、`transports.js`；`server/src/constants/*.js` | 100%（值保持为后端可识别中文业务值，双语仅展示层映射） |
| 6B-7 日期 ISO 展示原始值 | 各页面 `r.startDate?.slice(0, 10)`、`submittedAt?.slice(0, 19).replace('T',' ')` | `client/src/pages/employee/EmployeeRequestList.jsx:76-81` 等 | 100%（原始 ISO 数据来源不变，仅展示格式化逻辑替换） |

### 5.1.2 需要扩展的功能

以下功能与存量代码部分匹配，需要在前端现有基础上改造（均为展示层改造，业务语义不变）：

| 需求功能 | 存量功能 | 差异说明 | 扩展方向 |
|---------|---------|---------|---------|
| 6A-1 Design Token 统一设计体系 | 全部页面散落 inline style 硬编码颜色/间距/圆角（如 `#1677ff`、`#f0f2f5`、`#d9d9d9`、`borderRadius: '8px'`） | 视觉值散落于各页面与组件，无统一来源 | 引入 antd `ConfigProvider theme.token` 承载 Design Token（决策点 D-2）；新增 `client/src/theme/designTokens.js` 集中定义；散落的 inline style 逐步收敛为 token 引用 |
| 6A-2 Ant Design 组件库 | 原生 HTML 元素：`<table>`、`<form>`、`<input>`、`<select>`、`<button>`、手写 Modal/Toast/Pagination/Tag | 组件能力与视觉基线未统一，不满足企业后台视觉要求 | 全页面改为 antd 组件（Table/Form/Input/Select/DatePicker/InputNumber/Modal/Drawer/Card/Tag/Steps/Timeline/Dropdown/Avatar/Spin/Empty/Button/message）；既有 `StatusTag`/`Toast`/`Pagination`/`ConfirmDialog` 四个自研组件**保留文件名与 props API**、内部委托 antd 实现（最小化改动既有页面调用点） |
| 6A-5 Sidebar 布局 | `Layout.jsx` 顶部横向导航（`navItems` map 渲染），无侧边栏 | 布局形态不符合"典型企业管理后台（Sidebar + Header）"目标 | `Layout.jsx` 重构为 antd `Layout`（Sider + Header + Content）；Sider 顶部标题"企业差旅管理/Travel Management"；Menu 按 `user.role` 自动生成（员工：我的申请/新建申请；管理员：申请审核/员工管理），selectedKeys 与 `useLocation` 联动 |
| 6A-6 Header 信息 | `Layout.jsx` 顶栏仅含 navItems + 用户名(角色) + 版本号 + 登出按钮 | 缺少当前页面标题、语言切换入口、Avatar；用户名/角色为纯文本 | Header 重构：当前页面标题（t 文案）+ 中文/EN 语言切换 + Avatar + 用户名 + 角色 Tag + 版本号（复用 useVersion）+ 登出按钮 |
| 6B-1/6B-4 业务文案 i18n 化 | 全部页面/组件文案硬编码中文（按钮、列名、标签、占位符、Toast、Modal、空态、分页等） | 无 i18n 框架，文案无法切换 | 新增依赖 react-i18next + i18next（决策点 D-3）；新增 `client/src/locales/zh-CN.js`、`en-US.js`（决策点 D-4）；全部用户可见文案以 `useTranslation` 的翻译键引用，禁止页面硬编码（spec 6.6-3） |
| 6B-7/6B-8 日期与金额本地化 | 日期 `slice(0,10)` 截取 ISO、金额 `¥{value}` 原样拼接 | 日期不随语言切换格式、金额无千分位 | 新增格式化工具（放于 `client/src/utils/displayMapping.js` 或同目录 `format.js`）：`formatDate`/`formatDateTime` 按语言 locale 格式化（zh-CN: YYYY-MM-DD；en-US: 英文本地化格式）、`formatCurrency` 千分位分组（决策点 D-10）；表单提交/回填值保持 ISO 原始格式不变（spec 6B-7） |
| 6B-5 业务值双语显示 | `StatusTag` 直接渲染中文状态、列表/详情直接渲染 `r.status`/`r.role`/`r.status`/`r.transport` 中文值 | 后端业务值为中文（待审核/管理员/启用/飞机等），英文界面需显示英文标签 | 新增 `client/src/utils/displayMapping.js` 单一映射模块（决策点 D-11）：状态/角色/用户状态/交通工具 → `{zh, en}`；展示层按当前语言映射，**API 请求仍发送中文业务值**（spec 6B-6） |
| 6B-7 组件内置语言同步 | 无 DatePicker/Pagination/Modal/Empty 等组件（原生元素无内置语言） | antd 引入后其内置文案（日期面板/分页/弹窗确认/空态）需随语言切换 | `main.jsx` 引入 `antd/locale/zh_CN`、`antd/locale/en_US`，经 `ConfigProvider locale` 随 i18n 语言联动（决策点 D-7） |

### 5.1.3 需要新增的功能或接口

按模块分组，存量代码中完全没有对应实现的部分：

**A. i18n 基础设施（全新）**
- 新增 `client/src/i18n/index.js`：i18next + react-i18next 初始化；localStorage key=`i18nLanguage`（决策点 D-5），默认 `zh-CN`（6B-11）；`changeLanguage()` 切换并持久化、同步 `document.documentElement.lang`。
- 新增 `client/src/locales/zh-CN.js`、`en-US.js`：两套 JS 资源文件，命名空间分组（common/login/layout/sidebar/header/table/form/status/role/modal/toast/errors 及页面级命名空间 myRequests/newRequest/detail/review/employeeManagement），两套键完全一致（spec 6.6-3）。
- 新增 `client/src/components/LocaleProvider.jsx`：读取当前 i18n 语言，渲染 antd `ConfigProvider`（locale 为 zh_CN/en_US + theme.token），包裹 App 全局生效。

**B. Ant Design 集成（全新）**
- `client/src/main.jsx`：挂载 `ConfigProvider`（经 LocaleProvider）与 i18n 初始化（副作用导入 `import './i18n'`）。
- 新增 `client/src/theme/designTokens.js`：Design Token 常量表（spec 6.5 取值，见 6.3.2）。
- 新增依赖：`antd`、`@ant-design/icons`、`react-i18next`、`i18next`、`dayjs`（见 6.1.3.1 安装方式）。

**C. 显示映射模块（全新）**
- 新增 `client/src/utils/displayMapping.js`：`mapDisplay(value, lang)` / `displayText(value)` / `formatDate` / `formatDateTime` / `formatCurrency`（完整映射表见 6.3.2，决策点 D-11）。

**D. 布局与页面重构（改造）**
- `Layout.jsx` 重构为 antd Layout（Sider + Header + Content），Menu 按角色渲染、语言切换、Avatar、登出、版本号。
- 7 个页面（Login / EmployeeRequestList / NewRequest / RequestDetail / ResubmitRequest / AdminRequestList / AdminRequestDetail / AdminUsers）全部 antd 重构；组件结构与 antd 组件选择见 6.1.3.5。

**E. 测试适配与新增（见 6.6）**
- `tests/versionDisplay.test.js`：登录页 UI 选择器适配（详见 5.2.5 与 6.6.2）。
- 新增 `tests/i18n.test.js`：语言切换持久化、英文页无中文残留、中英全流程、组件语言同步等 E2E。

## 5.2 存量功能详细分析

### 5.2.1 前端 API 封装与接口契约（`client/src/api/*`）

- **`client.js`**：axios 实例 `baseURL='/api'`；请求拦截器自动附加 `Authorization`（无 token 不附加）；响应拦截器解包 `response.data`、仅 `status===401` 时清除凭证并跳转 `/login`。**V1.3 不改动**（spec 1.4-11 后端接口零变更；双语页面调用 API 仍发送中文业务值，响应结构完全不变）。
- **`auth.js`**：`login(username, password)` POST `/auth/login`、`logout()` POST `/auth/logout`。
- **`request.js`**：`createRequest(data)` POST `/requests`、`listMyRequests(params)` GET `/requests`（含 `status`/`page`/`pageSize` 筛选参数）、`getMyRequest(id)`、`withdrawRequest(id)`、`resubmitRequest(id, data)`。
- **`review.js`**：`listAllRequests(params)` GET `/admin/requests`、`getRequestDetail(id)`、`approveRequest(id, comment)` POST `/admin/requests/:id/approve`、`rejectRequest(id, comment)` POST `/admin/requests/:id/reject`。
- **`user.js`**：`listUsers()`、`createUser(username, name, password)`、`updateUser(id, data)`、`updateUserStatus(id, status)`、`resetPassword(id, newPassword)`。
- **约束**：筛选参数 `status` 取值必须为后端可识别中文业务值（如"待审核"）或"全部"（spec 6B-6）；`STATUS_OPTIONS`（`['全部','待审核','已通过','已拒绝','已撤回']`）为筛选下拉数据源，V1.3 仅将其展示 label 映射为双语，**提交给后端的 value 不变**。

### 5.2.2 前端常量与后端枚举对照（`client/src/constants/*` ↔ `server/src/constants/*`）

| 前端常量文件 | 内容 | 后端对应（`server/src/constants`） | V1.3 处理 |
|-------------|------|----------------------------------|----------|
| `roles.js` | `ADMIN:'管理员'`、`EMPLOYEE:'普通员工'` | `roles.js` | 值不变；展示经 displayMapping 双语 |
| `requestStatus.js` | `PENDING:'待审核'`、`APPROVED:'已通过'`、`REJECTED:'已拒绝'`、`WITHDRAWN:'已撤回'` + `STATUS_OPTIONS` | `requestStatus.js` | 值不变；`STATUS_OPTIONS` 用作筛选 value，label 双语映射 |
| `userStatus.js` | `ACTIVE:'启用'`、`DISABLED:'禁用'` | `userStatus.js` | 值不变；展示经 displayMapping 双语 |
| `transports.js` | `['火车','飞机','汽车','高铁','轮船','其他']` | `transports.js` | 值不变；Form Select options 的 label 双语映射、value 仍为中文 |
| `errorCodes.js` | `ERROR_CODES` + `ERROR_MESSAGES`（中文提示） | `constants/errorCodes.js` | 错误码常量不变；`ERROR_MESSAGES` 中文提示迁移至 i18n `errors` 命名空间（6B-12），页面经 `t()` 取文案 |

### 5.2.3 既有自研组件（`client/src/components/*`）

- **`Layout.jsx`**：手写顶栏（`#001529` 深色）+ 内容区；props `{ title, children, navItems }`；顶部含 `useVersion()` 版本号（V1.2）。V1.3 重构为 antd Layout（见 6.1.3.4），**组件名与导出路径不变**（各页面 import 零改动），`navItems` prop 由「按角色自动生成菜单」替代（spec 6A-5）。
- **`StatusTag.jsx`**：`STATUS_COLORS` 硬编码色值（待审核 `#e6a700`、已通过 `#52c41a`、已拒绝 `#f5222d`、已撤回 `#8c8c8c`）渲染 span。V1.3 重构为 antd `Tag`，**色值收敛为 Design Token 状态色**（spec 6.5-7：待审核 `#faad14`、已通过 `#52c41a`、已拒绝 `#f5222d`、已撤回 `#8c8c8c`，与既有认知一致），label 经 displayMapping 双语；props `{ status }` 不变。
- **`Toast.jsx`**：自研 Context Toast（`useToast().show(msg, type)`）。V1.3 内部改为委托 antd `message` 静态方法（经 `App.useApp()` 获取实例以保证主题/语言同步），**对外 `useToast` API 不变**，各页面调用点零改动（仅视觉统一，6B-12）。
- **`Pagination.jsx`**：自研分页（"共 N 条/上一页/下一页"）。V1.3 内部改为 antd `Pagination`（内置文案经 ConfigProvider locale 自动双语，6B-10）；props `{ page, pageSize, total, onChange }` 不变，`page` 语义保持从 1 开始、onChange 传回目标页号。
- **`ConfirmDialog.jsx`**：自研确认弹窗。V1.3 内部改为 antd `Modal`（内置"确定/取消"文案随语言，6B-10）；props `{ open, title, message, onConfirm, onCancel }` 不变。

### 5.2.4 页面结构现状（`client/src/pages/*`）

- **`Login.jsx`**：独立居中卡片（无 Layout），`input[placeholder="用户名"/"密码"]` + 提交按钮 + 版本号；`useToast().show()` 报错。
- **员工侧**：`EmployeeRequestList`（原生 table + select 筛选 + Pagination + ConfirmDialog + 新建按钮）、`NewRequest`（原生 form 内联输入）、`RequestDetail`（单卡片字段堆叠）、`ResubmitRequest`（与 NewRequest 同构的重新提交表单）。
- **管理员侧**：`AdminRequestList`（原生 table + select + Pagination）、`AdminRequestDetail`（单卡片 + 审批区）、`AdminUsers`（原生 table + 三个手写 Modal + ConfirmDialog）。
- **约束**：所有页面均以 `<Layout title="…" navItems={…}>` 包裹——Layout 重构后可全局生效；各页面"加载中/暂无数据"为条件文本，V1.3 统一为 antd `Spin`/`Empty`（6A-8a）。

### 5.2.5 既有自动化测试现状（`tests/*`）

- **API 层测试（不受前端 UI 重构影响）**：`auth.test.js`、`userManagement.test.js`、`adminReview.test.js`、`requestSubmit.test.js`、`permission.test.js`、`employeeManage.test.js`、`hardening.test.js` 均基于 `tests/helpers.js` 的 `loginAs`/`apiCall`（`http://localhost:3001/api` 直连后端），**不涉及浏览器 UI**——V1.3 前端重构对它们零影响，全量回归仅需确认后端不变（spec 6A-13）。
- **UI 交互测试（需适配）**：`versionDisplay.test.js` 是**唯一**使用浏览器 UI 选择器的测试，其中第 26-27 行：
  ```js
  await expect(page.locator('input[placeholder="用户名"]')).toBeVisible();
  await expect(page.locator('input[placeholder="密码"]')).toBeVisible();
  ```
  依赖登录页 `input[placeholder="用户名"/"密码"]` 选择器。V1.3 登录页重构为 antd `Form` + `Input` 后，antd `Input` 的 `placeholder` 属性仍直接渲染在 `<input>` 上（默认语言 zh-CN 时 placeholder 文案仍为"用户名"/"密码"），**该选择器在 zh-CN 默认语言下依然匹配**；但为增强语义健壮性（antd 可能包裹 wrapper 节点、后续语言测试可能切换语言），设计上同步更新为 `page.getByPlaceholder('用户名')` 等 Playwright 语义化选择器（见 6.6.2 测试适配方案）。
- **webServer 配置**：`playwright.config.js` 自动启动 `server(3001) + client(5173)`；V1.3 新增前端依赖后 client dev server 启动不变。

---

# 六、V1.3 增量设计方案

本章将 6A（UI/UX 视觉体验升级）与 6B（简体中文/English 双语支持）转化为可落地技术方案。总体策略：**仅前端改造、后端零改动**——不改任何 API/枚举/数据模型（决策点 D-12）；以「Ant Design v5 + ConfigProvider Design Token」重构展示层（决策点 D-1/D-2/D-8），以「react-i18next + displayMapping」承担双语（决策点 D-3/D-4/D-5/D-7/D-10/D-11）；既有业务逻辑、路由、权限守卫、接口调用行为保持 V1.2 完全一致（spec 6A-13）。

## 6.1 实现模型

### 6.1.1 上下文视图

```plantuml
@startuml
!theme plain
left to right direction
actor "管理员" as Admin
actor "普通员工" as Employee
actor "双语用户" as I18nUser
rectangle "前端（Ant Design + i18n）V1.3" as FE {
    usecase "SaaS 登录页（Card+Form）" as UC1
    usecase "Sidebar+Header 企业后台布局" as UC2
    usecase "各业务页面（antd Table/Form/详情）" as UC3
    usecase "Header 中文/EN 语言切换" as UC4
}
component "浏览器 localStorage" as LS
component "前端 i18n 资源\n(zh-CN.js / en-US.js)" as I18N
component "显示映射\ndisplayMapping.js" as DM
rectangle "后端 API（V1.3 零改动）" as BE
database "本地 JSON 存储" as ST

I18nUser --> UC4 : 切换语言（立即生效 + 持久化）
UC4 --> LS : 读写 i18nLanguage（默认 zh-CN）
UC2 --> I18N : 读取布局/菜单/Header 文案
UC3 --> I18N : 读取页面文案（t() 翻译键）
UC3 --> DM : 状态/角色/用户状态/交通工具双语映射\n日期/金额本地化
UC1 --> BE : POST /api/auth/login（中文业务值）
UC2 --> BE : GET /api/meta/version（版本号）
UC3 --> BE : /api/requests、/api/admin/**（中文业务值）
BE --> ST : users.json / requests.json（业务值不变）
note bottom of FE
  组件内置语言由 ConfigProvider locale
  （zh_CN / en_US）控制（6B-10）
end note
@enduml
```

- **上游**：浏览器用户（管理员/普通员工/双语用户）经前端各页面交互；语言选择经 localStorage 保持（6B-3）。
- **下游**：后端既有 API 完全不变，双语页面调用 API 仍发送后端可识别的中文业务值（spec 6B-6）；版本号接口复用 V1.2 `GET /api/meta/version`。

### 6.1.2 服务/组件总体架构

架构分层保持 V1.2 不变（页面 → 自研组件/API 封装 → axios → 后端），V1.3 的改动集中在**展示层**，新增 i18n / theme / utils 三个支撑模块：

```plantuml
@startuml
!theme plain
skinparam componentStyle rectangle

package "入口与全局" {
  [main.jsx] as M
  [LocaleProvider.jsx] as LP
  [i18n/index.js] as I18N
  [theme/designTokens.js] as TK
  [App.jsx] as APP
}

package "布局组件" {
  [Layout.jsx] as LAY
  [StatusTag.jsx] as ST
  [Toast.jsx] as TOA
  [Pagination.jsx] as PAG
  [ConfirmDialog.jsx] as CD
}

package "业务页面" {
  [Login.jsx] as P1
  [employee/*（我的申请/新建/详情/重新提交）] as P2
  [admin/*（审核列表/详情/员工管理）] as P3
}

package "API 封装（V1.3 不改）" {
  [api/client.js] as AC
  [api/auth.js / request.js / review.js / user.js / meta.js] as APIS
}

package "支撑模块" {
  [utils/displayMapping.js] as DM
  [locales/zh-CN.js] as ZC
  [locales/en-US.js] as EN
  [hooks/useVersion.js] as UV
}

package "后端（V1.3 零改动）" {
  [REST API] as BE
}

M --> LP : ConfigProvider(theme.token + locale)
M --> I18N : 副作用导入（初始化）
M --> APP
LP --> TK : 读取 Design Token
LP --> I18N : 读取当前语言 → zh_CN/en_US
I18N --> ZC
I18N --> EN
APP --> LAY
LAY --> P1 : /login
LAY --> P2 : /employee/**
LAY --> P3 : /admin/**
P1 --> DM : displayText / 错误文案
P2 --> ST : 状态 Tag（双语）
P2 --> TOA : 提示（委托 antd message）
P2 --> PAG : 分页（antd）
P2 --> CD : 确认弹窗（antd Modal）
P3 --> ST : 状态 Tag
P3 --> TOA : 提示
P3 --> PAG : 分页
P3 --> CD : 确认弹窗
P1 --> APIS
P2 --> APIS
P3 --> APIS
APIS --> AC : axios（拦截器不变）
AC --> BE
LAY --> UV : 版本号（V1.2 复用）
ST --> DM : 状态 label 双语
note right of DM
  显示映射：状态/角色/用户状态/
  交通工具 → {zh, en}；
  formatDate / formatCurrency
end note
@enduml
```

组件职责与 V1.3 变更对照：

| 组件 | 职责 | V1.3 变更 |
|------|------|----------|
| `main.jsx` | 应用入口 | 引入 `./i18n`（副作用初始化）、包裹 `LocaleProvider`（新增） |
| `LocaleProvider.jsx`（新） | antd `ConfigProvider`：theme.token + locale（zh_CN/en_US 随语言联动） | 新增模块 |
| `i18n/index.js`（新） | i18next 初始化、语言读写（localStorage `i18nLanguage`）、`changeLanguage()` | 新增模块 |
| `theme/designTokens.js`（新） | Design Token 常量（spec 6.5 取值） | 新增模块 |
| `locales/zh-CN.js`、`en-US.js`（新） | 两套双语业务文案资源（命名空间分组） | 新增模块 |
| `utils/displayMapping.js`（新） | 业务值双语映射 + 日期/金额格式化 | 新增模块 |
| `Layout.jsx` | 主界面布局 | 重构为 antd Layout（Sider+Header+Content），Menu 按角色渲染 + selectedKeys 路由联动 + 语言切换 + Avatar + 版本号 + 登出 |
| `StatusTag.jsx` | 状态标签 | 内部改 antd `Tag` + token 状态色 + 双语 label（props 不变） |
| `Toast.jsx` | 全局提示 | 内部委托 antd `message`（`App.useApp()`），对外 `useToast` API 不变 |
| `Pagination.jsx` | 分页 | 内部改 antd `Pagination`（内置文案随 locale），props 不变 |
| `ConfirmDialog.jsx` | 确认弹窗 | 内部改 antd `Modal`，props 不变 |
| `Login.jsx` | 登录页 | 重构为 SaaS 登录页（Card+Form+Input+Password+Button+统一 message 错误提示） |
| `employee/*.jsx` | 员工侧 4 页 | antd Table/Card+Form/Steps 重构，业务逻辑与校验规则不变 |
| `admin/*.jsx` | 管理员侧 3 页 | antd Table/Modal/Drawer/Steps 重构，审批意见必填规则不变 |
| `api/*.js`、`client.js`、`hooks/useVersion.js`、`router/ProtectedRoute.jsx`、`context/AuthContext.jsx`、`constants/*`、`App.jsx`（路由表） | 既有基础能力 | **不变**（spec 6A-13 路由与权限语义保持；`App.jsx` 仅包裹层级新增 LocaleProvider） |
| `server/**` | 后端 | **零改动**（决策点 D-12） |

### 6.1.3 实现设计文档

#### 6.1.3.1 Ant Design v5 集成与 Design Token

**依赖新增清单（仅 `client/`，安装方式）：**

```bash
cd client
npm install antd @ant-design/icons react-i18next i18next dayjs
# 说明：antd ^5.x、@ant-design/icons ^5.x（React 18 兼容，决策点 D-1）；
# dayjs 为 antd v5 内置时间库（DatePicker 依赖），显式安装以便直接 import 使用（6B-7）；
# 安装完成后 client/package.json dependencies 追加 5 项。
```

**Design Token 承载方式（决策点 D-2）**：antd v5 经 `ConfigProvider theme.token` 统一配置（CSS-in-JS，无需额外 CSS 文件）；仅少量布局类值（如 Sider 背景、页面最小宽度）可辅以 CSS 变量。Token 定义收敛于 `client/src/theme/designTokens.js`，页面禁止散落硬编码色值/圆角/间距（spec 6A-1）。

**全局接入（`client/src/main.jsx` 改造）：**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext.jsx';
import './i18n';                       // i18n 初始化（副作用导入，新增）
import LocaleProvider from './components/LocaleProvider';  // 新增

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LocaleProvider>              // ConfigProvider(theme.token + locale)
          <App />
        </LocaleProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

**LocaleProvider（`client/src/components/LocaleProvider.jsx`，新增）：**

```jsx
import { ConfigProvider, App as AntApp } from 'antd';
import { useTranslation } from 'react-i18next';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { DESIGN_TOKENS } from '../theme/designTokens';

export default function LocaleProvider({ children }) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en-US' ? enUS : zhCN;   // 决策点 D-7
  return (
    <ConfigProvider locale={locale} theme={{ token: DESIGN_TOKENS }}>
      <AntApp>{children}</AntApp>     // antd App 组件：使 message/modal 静态方法获得主题与语言上下文
    </ConfigProvider>
  );
}
```

> `AntApp`（antd v5.1+ 的 `App` 组件）为 `message`/`Modal.confirm` 等命令式 API 提供 context，保证其主题与语言与 ConfigProvider 同步（6B-10 组件内置文案联动依赖此机制）；`Toast.jsx`/`ConfirmDialog.jsx` 内部经 `App.useApp()` 获取实例。

**页面响应语言切换**：语言切换后 i18n 触发已订阅 `useTranslation` 的组件重渲染（LocaleProvider 及所有页面），antd locale 与业务文案同步更新、立即生效（6B-2）。

#### 6.1.3.2 i18n 集成与语言切换

**i18n 初始化（`client/src/i18n/index.js`，新增）——决策点 D-3/D-4/D-5：**

```js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from '../locales/zh-CN';
import enUS from '../locales/en-US';

export const LANG_KEY = 'i18nLanguage';
export const SUPPORTED_LANGS = ['zh-CN', 'en-US'];
export const DEFAULT_LANG = 'zh-CN';

export function getSavedLanguage() {
  const saved = localStorage.getItem(LANG_KEY);
  return SUPPORTED_LANGS.includes(saved) ? saved : DEFAULT_LANG;  // 6B-11 默认 zh-CN
}

export function changeLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* localStorage 不可用时忽略，仅会话内生效（spec 5.7.3-2） */ }
  i18n.changeLanguage(lang);                                     // 立即生效（6B-2）
  document.documentElement.lang = lang === 'en-US' ? 'en' : 'zh-CN'; // 页面 lang 属性同步
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
  },
  lng: getSavedLanguage(),
  fallbackLng: 'zh-CN',           // 缺失键/加载失败兜底（spec 5.7.3-1）
  interpolation: { escapeValue: false },
  returnNull: false,
});
```

**文案引用规范**：所有页面/组件用户可见文案必须经 `useTranslation()` 的 `t('namespace:key')` 引用，禁止硬编码中文/英文（spec 6.6-3、6B-4）；资源结构见 6.3.2。

**语言切换入口（Header，见 6.1.3.4）**：调用 `changeLanguage('zh-CN' | 'en-US')`，写入 localStorage 并即时刷新界面（6B-2/6B-3）。

#### 6.1.3.3 显示映射模块（`client/src/utils/displayMapping.js`）

**核心 API（决策点 D-11，集中单一模块）：**

```js
import i18n from '../i18n';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 业务值 → { zh, en } 映射表（值来自后端/前端常量，双语标签见 6.3.2 完整表）
const DISPLAY_MAP = {
  '待审核': { zh: '待审核', en: 'Pending' },  '已通过': { zh: '已通过', en: 'Approved' },
  '已拒绝': { zh: '已拒绝', en: 'Rejected' }, '已撤回': { zh: '已撤回', en: 'Withdrawn' },
  '管理员': { zh: '管理员', en: 'Administrator' }, '普通员工': { zh: '普通员工', en: 'Employee' },
  '启用': { zh: '启用', en: 'Active' },       '禁用': { zh: '禁用', en: 'Disabled' },
  '火车': { zh: '火车', en: 'Train' },        '飞机': { zh: '飞机', en: 'Flight' },
  '汽车': { zh: '汽车', en: 'Car/Bus' },      '高铁': { zh: '高铁', en: 'High-speed Rail' },
  '轮船': { zh: '轮船', en: 'Ship' },         '其他': { zh: '其他', en: 'Other' },
};

export function mapDisplay(value, lang = i18n.language) {
  const entry = DISPLAY_MAP[value];
  return entry ? (lang === 'en-US' ? entry.en : entry.zh) : value; // 未知值原样返回（后端扩展兼容）
}
export const displayText = (value) => mapDisplay(value, i18n.language); // 便捷包装

// 日期/金额本地化（决策点 D-10；6B-7 提交/回填仍用 ISO 原始值，本函数仅用于展示）
export function formatDate(value, lang = i18n.language) {
  if (!value) return '';
  const d = dayjs(value);
  return lang === 'en-US' ? d.format('MMM D, YYYY') : d.format('YYYY-MM-DD');
}
export function formatDateTime(value, lang = i18n.language) {
  if (!value) return '';
  const d = dayjs(value);
  return lang === 'en-US' ? d.format('MMM D, YYYY HH:mm') : d.format('YYYY-MM-DD HH:mm');
}
export function formatCurrency(value, lang = i18n.language) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value ?? '');
  return n.toLocaleString(lang === 'en-US' ? 'en-US' : 'zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// dayjs locale 与 i18n 语言联动：切换语言时同步 dayjs.locale(lang === 'en-US' ? 'en' : 'zh-cn')
export function syncDayjsLocale(lang = i18n.language) { dayjs.locale(lang === 'en-US' ? 'en' : 'zh-cn'); }
```

**关键约束（spec 6B-6）**：映射仅作用于**界面展示**；任何 API 请求参数/请求体（如状态筛选值、创建/编辑请求体、审批意见）必须使用后端真实中文业务值（`STATUS_OPTIONS` 的 value、`REQUEST_STATUS` 等常量原样传递），**禁止提交英文标签或语言标识**。

#### 6.1.3.4 布局重构（`client/src/components/Layout.jsx`）

**重构为 antd Layout（决策点 D-8），组件名/路径/导出保持不变**（各页面 import 零改动）；`title`/`children` props 保留，`navItems` prop 废弃（Menu 按角色自动生成，spec 6A-5）：

```jsx
import { Layout as AntLayout, Menu, Avatar, Button, Space, Dropdown, Tag } from 'antd';
import { GlobalOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useVersion } from '../hooks/useVersion';
import { ROLES } from '../constants/roles';
import { changeLanguage } from '../i18n';
import { displayText } from '../utils/displayMapping';

const { Sider, Header, Content } = AntLayout;

// 按角色生成菜单（spec 6A-5）：label 为 i18n 翻译键
const MENU_BY_ROLE = {
  [ROLES.EMPLOYEE]: [
    { key: '/employee/requests',        labelKey: 'layout:myRequests' },
    { key: '/employee/requests/new',    labelKey: 'layout:newRequest' },
  ],
  [ROLES.ADMIN]: [
    { key: '/admin/requests',           labelKey: 'layout:requestReview' },
    { key: '/admin/users',              labelKey: 'layout:employeeManagement' },
  ],
};

export default function Layout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const version = useVersion();
  const isEn = i18n.language === 'en-US';
  const menuItems = (MENU_BY_ROLE[user?.role] || []).map(m => ({
    key: m.key, label: t(m.labelKey),
  }));
  const selectedKey = (() => {            // 选中态与路由联动（含 /:id 详情、/new 二级路径）
    const p = location.pathname;
    if (p.startsWith('/admin/requests')) return '/admin/requests';
    if (p.startsWith('/admin/users'))    return '/admin/users';
    if (p.startsWith('/employee/requests/new')) return '/employee/requests/new';
    if (p.startsWith('/employee/requests'))    return '/employee/requests';
    return '';
  })();

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div className="app-sider-title">{t('common:appTitle')}</div>   {/* 企业差旅管理 / Travel Management */}
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={menuItems}
              onClick={({ key }) => navigate(key)} />
      </Sider>
      <AntLayout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="page-title">{title}</span>                    {/* Header 当前页面标题，6A-6 */}
          <Space size="middle">
            <Dropdown menu={{ items: [
              { key: 'zh-CN', label: '中文', onClick: () => changeLanguage('zh-CN') },
              { key: 'en-US', label: 'EN',   onClick: () => changeLanguage('en-US') },
            ] }} trigger={['click']}>
              <Button type="text" icon={<GlobalOutlined />}>{isEn ? '中文/EN' : '中文/EN'}</Button>
            </Dropdown>
            {version && <span style={{ fontSize: 12, color: '#999' }}>{version}</span>}
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.name}（{displayText(user?.role)}）</span>     {/* 用户名+角色（双语映射），6A-6 */}
            </Space>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>{t('header:logout')}</Button>
          </Space>
        </Header>
        <Content style={{ margin: 24, background: 'transparent' }}>{children}</Content>
      </AntLayout>
    </AntLayout>
  );
}
```

设计要点：
- **Sider 标题**：`common:appTitle` 双语（zh:"企业差旅管理" / en:"Travel Management"）（spec 6A-5）；可在 Sider 下方辅以 `common:appTitleSub`（"差旅管理系统"副标题，可选）。
- **Menu 按角色**：数据源 `MENU_BY_ROLE`（决策点 D-8），`user.role` 读取自 AuthContext（V1.2 不变）；权限仍由路由守卫 + 后端中间件双重保障（spec 6A-13），Menu 仅控制可见导航。
- **Header 内容**：页面标题（由各页面 `title` prop 传入，改为 i18n 文案）+ 语言切换 Dropdown（中文/EN）+ 版本号（复用 `useVersion`）+ Avatar + 用户名（角色 Tag，角色经 displayText 双语）+ 登出（6A-6）。
- **页面 title 传入**：各页面 `<Layout title={t('myRequests:pageTitle')}>`（原中文 title 文本改为翻译键）。
- **兼容性**：Sider 固定桌面宽度、Header 白底；中等宽度（768-1280px）下 Table 横向滚动、表单换行，满足 6A-4。

#### 6.1.3.5 页面重构（组件结构与 antd 组件选择）

> 统一约定：每页保留既有数据获取/提交函数（API 调用、错误码处理、Toast），仅替换渲染容器与展示层；字段与校验规则**不新增、不删减**（spec 6A-9/6A-13）；页面标题、按钮、列名、标签、占位符、校验提示、Modal/Toast 文案全部走 `t()`（6B-4）。

**① Login.jsx —— SaaS 登录页（6A-7/6B-12）**

```jsx
import { Card, Form, Input, Button, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
// handleSubmit：login → role 判断跳转（逻辑与 V1.2 完全一致）
// 错误：统一 message.error(t(`errors:${err.code}`) || err.message)（6B-12）
<Card style={{ width: 380, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
  <Typography.Title level={3} style={{ textAlign: 'center' }}>{t('common:appTitle')}</Typography.Title>
  <Form onFinish={handleSubmit} size="large">
    <Form.Item name="username" rules={[{ required: true, message: t('login:usernameRequired') }]}>
      <Input prefix={<UserOutlined />} placeholder={t('login:usernamePlaceholder')} autoComplete="username" />
    </Form.Item>
    <Form.Item name="password" rules={[{ required: true, message: t('login:passwordRequired') }]}>
      <Input.Password prefix={<LockOutlined />} placeholder={t('login:passwordPlaceholder')} autoComplete="current-password" />
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" block loading={loading}>{t('login:loginButton')}</Button>
    </Form.Item>
  </Form>
  {version && <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>{version}</div>}   {/* V1.2 版本号保留 */}
</Card>
```

- 页面容器：居中 Card（白底 + token 阴影），背景为 `colorBgLayout`。
- 错误提示统一 antd `message`（经 `App.useApp()`），替代原 `useToast().show()` 错误提示（6B-12）。
- `input[placeholder=用户名]` 选择器适配见 6.6.2。

**② EmployeeRequestList.jsx —— 我的申请（6A-8）**

| 区域 | antd 组件 | 说明 |
|------|----------|------|
| 状态筛选 | `Select`（options：`STATUS_OPTIONS` → value 中文业务值 / label `displayText` 或 i18n） | 变更 status 时重置 page=1，行为与 V1.2 一致 |
| 新建申请 | `Button type="primary"` | 醒目 Primary（6A-8b） |
| 列表 | `Table` | 列：目的地/出发日期/返回日期/交通工具/预计费用/状态/提交时间/操作；loading 用 `Spin`、空数据 `Empty`（6A-8a） |
| 状态列 | `StatusTag`（antd Tag + displayText） | 颜色映射见 6.3.2 |
| 日期/金额 | `formatDate`/`formatDateTime`/`formatCurrency` | 6B-7/6B-8 |
| 分页 | `Pagination`（内部 antd） | 保留组件 props |
| 撤回 | `Modal.confirm`（经 ConfirmDialog 或 `App.useApp().modal`） | 确认文案双语（6B-12） |
| 操作 | `Button type="link"` | 详情/撤回（仅待审核）/重新提交（仅已拒绝） |

**③ NewRequest.jsx / ResubmitRequest.jsx —— 新建/重新提交申请（6A-9）**

`Card` + `Form`（`layout="vertical"`），字段与校验规则保持 V1.2 完全一致：

| 字段 | antd 组件 | 校验（与 V1.2 一致） |
|------|----------|---------------------|
| 出差目的地 | `Input`（maxLength 100） | required |
| 出发日期/返回日期 | `DatePicker`（`format="YYYY-MM-DD"`，提交值 `YYYY-MM-DD`） | required |
| 出差事由 | `Input.TextArea`（maxLength 500） | required |
| 交通工具 | `Select`（options：`TRANSPORTS` → value 中文值 / label 双语） | required |
| 预计费用 | `InputNumber`（`min=0`、`precision=2`、`prefix="¥"`） | required |
| 提交/取消 | `Button type="primary" htmlType="submit"` / `Button` | 行为与 V1.2 一致 |

> `DatePicker` 提交值格式保持 ISO `YYYY-MM-DD`（`valueFormat="YYYY-MM-DD"`），确保后端与重新提交回填（`slice(0,10)`）语义不变（spec 6B-7）；取消按钮回跳列表页。

**④ RequestDetail.jsx —— 申请详情（6A-10，员工视角）**

- **Header 区**：标题（目的地）+ 状态 `StatusTag`（6A-10 顶部展示）。
- **分区**：`Card` 分块 —— 基本信息（目的地/出发/返回/交通工具/预计费用/提交时间）、出差事由（purpose）、审批状态（审核人/审核时间/审核意见，已审核时展示）。
- **审批流程**：`Steps`（`current` 由状态映射：待审核=1、已通过=2、已拒绝=2（`status="error"`）、已撤回=展示撤回说明）；步骤文案 Submitted→Pending→Approved/Rejected（6A-10，**不新增审批阶段**，spec 1.4-12）；员工页 Steps 中 Pending/Approved/Rejected 展示为 i18n 或英文标签（状态词走 i18n `status` 命名空间）。
- 操作：返回列表；已拒绝时"重新提交"（跳 `/resubmit`）。

**⑤ AdminRequestList.jsx —— 申请审核（6A-11，管理员视角）**

| 区域 | antd 组件 | 说明 |
|------|----------|------|
| 筛选 | `Select`（同②） | 保持 V1.2 参数语义 |
| 列表 | `Table` | 列：提交人/目的地/出发/返回/状态/提交时间/操作（详情）；loading `Spin`、空 `Empty` |
| 状态列 | `StatusTag` | 待审核（Pending）用 warning 色（`#faad14`）高识别（6A-11），可辅以 `bold` 样式 |
| 分页 | `Pagination`（内部 antd） | 保留组件 props |
| 操作 | `Button type="link"`（详情） | 跳 `/admin/requests/:id` |

**⑥ AdminRequestDetail.jsx —— 申请详情与审核（6A-10/6A-11，管理员视角）**

- Header（标题/目的地 + 状态 Tag）+ 基本信息/出差事由/审批状态分区 + `Steps`（Submitted→Pending→Approved/Rejected，不新增审批阶段）。
- **管理员审批区域**（`status==='待审核'` 时）：`Card` 内 `Input.TextArea`（审核意见）+ `Button type="primary"`（通过 Approve）+ `Button danger`（拒绝 Reject）+ 返回。
- 审批意见规则保持：拒绝时必填（前端校验，提示双语 6B-12）；通过/拒绝后 `toast` 成功提示并 `fetchDetail()` 刷新（行为与 V1.2 一致）。

**⑦ AdminUsers.jsx —— 员工管理（6A-12）**

| 区域 | antd 组件 | 说明 |
|------|----------|------|
| 创建员工 | `Button type="primary"` → `Modal` + `Form` | 用户名/姓名/密码（≥6 位），提交后 toast + 刷新 |
| 列表 | `Table` | 列：用户名/姓名/角色/状态/创建时间/操作；角色/用户状态经 displayText 双语；管理员行不显示操作（既有逻辑） |
| 低频操作 | `Dropdown`（"更多/More"，决策点 D-9） | 收纳：编辑、启用/禁用、重置密码 |
| 编辑 | `Modal` + `Form` | 用户名/姓名/状态（Select 启用/禁用） |
| 启用/禁用 | `Modal.confirm` | 确认文案双语（6B-12） |
| 重置密码 | `Modal` + `Form` | 新密码（≥6 位） |

> `Modal`/`Drawer` 任选其一即可满足 6A-12 验收条件（决策点 D-9 采用 Modal）；表单校验与提交逻辑（`handleCreate`/`handleEdit`/`handleToggleStatus`/`handleResetPassword`）原样复用。

#### 6.1.3.6 语言切换流程（6B-2/6B-3/6B-10）

```plantuml
@startuml
!theme plain
actor "用户" as User
participant "Header Dropdown" as HD
participant "i18n/index.js" as I18N
participant "LocaleProvider(ConfigProvider)" as LP
participant "localStorage" as LS
participant "页面组件" as PG

User -> HD : 点击"EN"
HD -> I18N : changeLanguage('en-US')
I18N -> LS : localStorage.setItem('i18nLanguage', 'en-US')（持久化，6B-3）
I18N -> I18N : i18n.changeLanguage('en-US')（立即生效，6B-2）
I18N -> LP : language 变化
LP -> LP : ConfigProvider locale → en_US（6B-10）
LP -> PG : 已订阅 useTranslation 的组件重渲染
PG -> PG : 业务文案经 t() 更新；业务值经 displayText 映射为英文标签
PG --> User : 全界面切换为英文（含 DatePicker/Pagination/Modal 内置文案）

User -> User : 刷新页面
I18N -> LS : 读取 i18nLanguage=en-US（getSavedLanguage）
I18N -> I18N : 初始化 en-US
I18N -> LP : locale=en_US
LP --> User : 语言保持英文（6B-3）
@enduml
```

- **立即生效**：`changeLanguage` 同步触发 i18n 事件 → 所有订阅组件重渲染，无需刷新（6B-2）。
- **持久化**：localStorage key=`i18nLanguage`；无记录/非法值回退默认 `zh-CN`（6B-11）；localStorage 不可用时仅会话内生效、不阻断使用（spec 5.7.3-2）。
- **组件内置语言**：ConfigProvider locale 随语言切换，DatePicker/Pagination/Modal/Empty 等内置文案自动同步（6B-10）。

## 6.2 接口设计

### 6.2.1 总体设计

- **对外 HTTP API 零变更**：`/api/auth/*`、`/api/admin/*`、`/api/requests/*`、`/api/meta/version` 的路径、请求参数、成功响应结构、错误码与 HTTP 状态全部保持 V1.2 不变（决策点 D-12、spec 6A-13）。V1.3 不新增、不删除任何 HTTP 接口。
- **接口分类**：本版本新增/变更的均为**前端进程内模块接口**，分三类——①i18n 基础设施（初始化、语言切换、持久化）；②显示映射与格式化工具（`mapDisplay`/`displayText`/`formatDate`/`formatDateTime`/`formatCurrency`）；③React 组件契约（`LocaleProvider`、重构后 `Layout`/`StatusTag`/`Toast`/`Pagination`/`ConfirmDialog` 的 props 保持）。
- **类型安全**：全栈 JS 技术栈，模块接口以 JSDoc `@param`/`@returns` 声明类型；`DISPLAY_MAP` 键值结构固定为 `{ zh: string, en: string }`；`changeLanguage` 入参白名单校验（仅 `zh-CN`/`en-US`，spec 6.6-1）；`formatCurrency` 对非法输入降级原样返回，杜绝 `NaN`/异常向上传播。

### 6.2.2 接口清单

**A. i18n 基础设施（`client/src/i18n/index.js`，新增）**

```js
// 常量
LANG_KEY: string            // 'i18nLanguage'（决策点 D-5，spec 6.6-2）
SUPPORTED_LANGS: string[]   // ['zh-CN', 'en-US']（spec 6.6-1）
DEFAULT_LANG: string        // 'zh-CN'（6B-11）

// 函数
getSavedLanguage(): string            // 读取 localStorage；无记录/非法 → DEFAULT_LANG
changeLanguage(lang: string): void    // 写入 localStorage + i18n.changeLanguage（立即生效 6B-2）+ 同步 document.documentElement.lang
```

- **业务说明**：应用启动初始化（副作用导入）与 Header 语言切换调用；localStorage 持久化满足"刷新保持"（6B-3）。
- **异常降级**：localStorage 读写失败被捕获忽略（仅会话内生效，spec 5.7.3-2）；资源缺失回退 `fallbackLng: 'zh-CN'`（spec 5.7.3-1）。

**B. 显示映射与格式化（`client/src/utils/displayMapping.js`，新增）**

```js
mapDisplay(value: string, lang?: string): string   // 业务值 → 语言标签；未知值原样返回
displayText(value: string): string                 // 便捷包装（按当前 i18n 语言）
formatDate(value: string|null, lang?): string      // ISO → 展示日期（zh: YYYY-MM-DD；en: MMM D, YYYY）
formatDateTime(value: string|null, lang?): string  // ISO → 展示时间（zh: YYYY-MM-DD HH:mm；en: MMM D, YYYY HH:mm）
formatCurrency(value: number|string, lang?): string // 千分位 + 2 位小数（如 1,234.50，决策点 D-10）
syncDayjsLocale(lang?): void                        // 同步 dayjs locale（zh-cn / en）
```

- **前置条件**：`value` 为后端/前端常量中文业务值（状态/角色/用户状态/交通工具）；`lang` 缺省取 `i18n.language`。
- **后置条件**：纯展示函数，无任何状态变更；**不参与 API 请求体构造**（spec 6B-6）。
- **调用示例**：
  ```js
  // 员工列表状态列
  <StatusTag status={r.status} />            // StatusTag 内部：displayText(status) → '待审核'/'Pending'
  // 详情日期与金额
  {formatDate(r.startDate)} / {formatCurrency(r.estimatedCost)}
  // 英文界面筛选：value 仍为中文业务值，仅 label 双语
  <Select options={STATUS_OPTIONS.map(s => ({ value: s, label: displayText(s) }))} />
  ```

**C. React 组件契约（改造，props 兼容）**

```jsx
// LocaleProvider（新增）：包裹全局
<LocaleProvider>{children}</LocaleProvider>           // 内部 ConfigProvider(theme.token + locale) + <AntApp>

// Layout（改造）：title/children 保留，navItems 废弃
<Layout title={t('myRequests:pageTitle')}>{children}</Layout>   // Menu 按 role 自动生成 + Header 语言切换/版本/登出

// StatusTag / Toast / Pagination / ConfirmDialog（改造，props 与 V1.2 完全一致）
<StatusTag status={status} />                          // 内部 antd Tag + token 状态色 + displayText
const toast = useToast(); toast.show(msg, 'success'); // 内部委托 antd message（App.useApp）
<Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />  // 内部 antd Pagination
<ConfirmDialog open={open} title={...} message={...} onConfirm={...} onCancel={...} />  // 内部 antd Modal
```

- **稳定性等级**：`useToast`/`Pagination`/`ConfirmDialog`/`StatusTag` 对外 props 为**稳定**（各页面调用点不改）；`i18n`/`displayMapping` 为**实验级**（V1.3 内部使用，未来可演进）；HTTP API 稳定性不变。
- **兼容性承诺**：所有既有页面组件调用方式不变，仅内部实现与视觉/文案来源变化（spec 6A-13 不改业务行为）。

## 6.3 数据模型

### 6.3.1 设计目标

- 支持场景：统一视觉变量（Design Token）、双语业务文案（i18n 资源）、业务值双语标签（displayMapping）、语言偏好持久化（localStorage）。
- **不引入任何后端数据变更**：`users.json`、`requests.json`、`token-blacklist.json` 格式与业务值零改动（决策点 D-12、spec 6.1~6.2 保持）；不新增任何 JSON 数据文件。
- **前端新增静态资源**：仅前端构建期资源（`locales/*.js`、`theme/designTokens.js`、`utils/displayMapping.js`），不涉及服务端存储。
- **兼容策略**：存量 localStorage key（`token`、`user`）不受影响；新增 `i18nLanguage` 与既有 key 互不干扰。

### 6.3.2 模型实现

**① Design Token 设计体系（`client/src/theme/designTokens.js`，spec 6.5 取值）**

| Token（antd theme.token 字段） | 取值 | 说明（spec 6.5） |
|-------------------------------|------|-----------------|
| `colorPrimary` | `#1677ff` | Primary Color 企业蓝（沿用 Ant Design 默认主色，与既有差旅管理系统蓝色一致） |
| `colorBgLayout` | `#f5f5f5` | 页面背景浅灰（Layout/Content 背景；沿用既有 `#f0f2f5` 亦可，二选一收敛） |
| `colorBgContainer` | `#ffffff` | 卡片/表格/表单容器背景 |
| `colorBorder` | `#d9d9d9` | 边框色（输入框/表格边框） |
| `colorBorderSecondary` | `#f0f0f0` | 分割线（表格行分隔/卡片内分隔） |
| `borderRadius` | `6` | 组件圆角（按钮/输入框/表格，spec 6.5-4） |
| `borderRadiusLG` | `8` | 大圆角（卡片） |
| `borderRadiusSM` | `4` | 小圆角（Tag） |
| `fontSize` | `14` | 正文字号（spec 6.5-6） |
| `fontSizeHeading` | `16~20` | 标题字号（页面标题 20、Card 标题 16，加粗） |
| `fontSizeSM` | `12` | 辅助说明字号 |
| `fontWeightStrong` | `600` | 强调字重（标题 600、正文 400/500） |
| `lineHeight` | `1.5` | 行高（spec 6.5-6） |
| `colorText` | `rgba(0,0,0,0.88)` | 正文主色 |
| `colorTextSecondary` | `rgba(0,0,0,0.65)` | 辅助文字（label/说明） |
| `colorTextTertiary` | `rgba(0,0,0,0.45)` | 弱化文字（占位/空态） |
| `colorError` | `#ff4d4f` | 错误语义色（spec 6.5-8） |
| `colorWarning` | `#faad14` | 警告语义色（待审核） |
| `colorSuccess` | `#52c41a` | 成功语义色（已通过/启用） |

**状态色映射（`StatusTag` 专用，spec 6.5-7，收敛为 token）**：

| 业务值 | 色值 | 语义 |
|--------|------|------|
| 待审核 | `#faad14` | 琥珀/警告（Pending 高识别，6A-11） |
| 已通过 | `#52c41a` | 绿/成功 |
| 已拒绝 | `#f5222d` | 红/错误 |
| 已撤回 | `#8c8c8c` | 灰/默认 |
| 启用 | `#52c41a` | 绿（语义区分） |
| 禁用 | `#8c8c8c` | 灰（语义区分） |

**② i18n 语言资源（`client/src/locales/zh-CN.js`、`en-US.js`，spec 6.6）**

- 两套资源**键结构完全一致**（spec 6.6-3），按命名空间分组（spec 6.6-4），导出默认对象：

```
{
  common:   { appTitle, appTitleSub, actions{create,edit,confirm,cancel,save,reset,back,detail,more,submit,view},
              statusFilter, all, loading, noData, total(带 {{count}} 插值), success, failed ... },
  login:    { pageTitle, username, password, usernamePlaceholder, passwordPlaceholder, usernameRequired,
              passwordRequired, loginButton, loggingIn, loginFailed ... },
  sidebar:  { appTitle, myRequests, newRequest, requestReview, employeeManagement, logout ... },
  header:   { language, languageSwitch, logout, roleLabel ... },
  table:    { columns{destination,startDate,endDate,transport,estimatedCost,status,submittedAt,operator,
              submitter,username,name,role,createdAt}, actions{detail,review,withdraw,resubmit,approve,reject,
              edit,disable,enable,resetPassword,createEmployee} ... },
  form:     { destination, startDate, endDate, purpose, transport, estimatedCost, labels, placeholders,
              validations{required,dateOrder,positiveNumber}, submit, cancel, selectPlaceholder ... },
  status:   { pending, approved, rejected, withdrawn },      // 状态标签（或由 displayMapping 承担，二选一，见下）
  role:     { administrator, employee },
  userStatus:{ active, disabled },
  modal:    { confirmTitle, withdrawTitle, withdrawMessage, toggleStatusTitle, toggleStatusMessage({{name}}),
              confirmOk, cancel ... },
  toast:    { success{submit,withdraw,approve,reject,create,edit,reset,toggle}, fail{...} ... },
  myRequests:{ pageTitle, filterLabel, createNew, loadFailed, withdrawSuccess, withdrawFailed ... },
  newRequest:{ pageTitle, submitSuccess, submitFailed ... },
  detail:   { pageTitle, basicInfo, purposeSection, approvalStatus, reviewer, reviewedAt, reviewComment,
              noComment, backToList, resubmit, steps{submitted,pending,approved,rejected} ... },
  review:   { pageTitle, filterLabel, approveSuccess, rejectSuccess, commentRequiredReject, commentLabel ... },
  employeeManagement:{ pageTitle, createSuccess, editSuccess, resetSuccess, toggleSuccess, confirmEnable,
              confirmDisable, modalTitles{create,edit,reset} ... },
  errors:   { AUTH_INVALID_CREDENTIALS, AUTH_ACCOUNT_DISABLED, AUTH_TOKEN_INVALID, FORBIDDEN,
              USER_NAME_CONFLICT, USER_NOT_FOUND, REQUEST_NOT_FOUND, STATE_CONFLICT, VALIDATION_ERROR,
              INIT_CONFIG_MISSING, STORE_WRITE_FAILED, NETWORK_ERROR, UNKNOWN ... },
}
```

- **状态/角色/用户状态/交通工具的文案策略**：页面 Tag/列标签统一走 `displayMapping.js`（与后端业务值强绑定、单一来源，决策点 D-11），不重复维护在 i18n `status/role/userStatus` 命名空间（避免双源不一致）；i18n 资源中的 `status/role/userStatus` 命名空间可保留用于非业务值场景（如审批步骤文案 Submitted/Pending/Approved/Rejected 走 `detail.steps`）。
- **翻译键引用**：页面 `t('myRequests:withdrawSuccess')`；带参数 `t('modal:toggleStatusMessage', { name })`；复数/占位经 i18next 插值。
- **英文页无残留中文验收依据（6B-9）**：en-US 资源需覆盖全部系统固有文案键，测试以"主要页面 body 不含常见中文字符"断言（6.6.2）。

**③ 显示映射表（`client/src/utils/displayMapping.js`，spec 6.7 完整表）**

| 分类 | 后端业务值 | zh（中文标签） | en（英文标签） |
|------|-----------|---------------|---------------|
| 申请状态 | 待审核 | 待审核 | Pending |
| 申请状态 | 已通过 | 已通过 | Approved |
| 申请状态 | 已拒绝 | 已拒绝 | Rejected |
| 申请状态 | 已撤回 | 已撤回 | Withdrawn |
| 角色 | 管理员 | 管理员 | Administrator |
| 角色 | 普通员工 | 普通员工 | Employee |
| 用户状态 | 启用 | 启用 | Active |
| 用户状态 | 禁用 | 禁用 | Disabled |
| 交通工具 | 火车 | 火车 | Train |
| 交通工具 | 飞机 | 飞机 | Flight |
| 交通工具 | 汽车 | 汽车 | Car/Bus |
| 交通工具 | 高铁 | 高铁 | High-speed Rail |
| 交通工具 | 轮船 | 轮船 | Ship |
| 交通工具 | 其他 | 其他 | Other |

- **未知值策略**：`DISPLAY_MAP[value]` 不存在时原样返回 value（兼容后端后续扩展业务值，不抛错）。
- **请求参数约束（spec 6.7-5）**：映射仅用于展示；筛选/提交等 API 参数仍使用后端业务值（如"待审核"、"飞机"），禁止英文标签/语言标识入库。

**④ localStorage 语言偏好（spec 6.6-2）**

```
key:   i18nLanguage
value: 'zh-CN' | 'en-US'（仅两个合法值，spec 6.6-1）
缺失/非法: 回退默认 'zh-CN'（6B-11）
```

- **对象生命周期**：应用启动时 `getSavedLanguage()` 读取一次（i18n 初始化）；切换语言时 `changeLanguage` 写入；不涉及任何 JSON 数据文件；与既有 `token`/`user` key 共存互不影响。

## 6.4 改动点清单（文件级 + 方法级）

**A. 前端新增文件**

| # | 文件 | 改动类型 | 说明 |
|---|------|---------|------|
| 1 | `client/src/i18n/index.js` | **新增** | i18next 初始化、`LANG_KEY`/`SUPPORTED_LANGS`/`DEFAULT_LANG`、`getSavedLanguage()`、`changeLanguage()` |
| 2 | `client/src/locales/zh-CN.js` | **新增** | 中文业务文案资源（命名空间分组，spec 6.6-4） |
| 3 | `client/src/locales/en-US.js` | **新增** | 英文业务文案资源（键与 zh-CN 完全一致） |
| 4 | `client/src/theme/designTokens.js` | **新增** | Design Token 常量（spec 6.5 取值，见 6.3.2） |
| 5 | `client/src/utils/displayMapping.js` | **新增** | `mapDisplay`/`displayText`/`formatDate`/`formatDateTime`/`formatCurrency`/`syncDayjsLocale`（决策点 D-11） |
| 6 | `client/src/components/LocaleProvider.jsx` | **新增** | `ConfigProvider`（theme.token + zh_CN/en_US locale）+ `<AntApp>` 包裹 |

**B. 前端修改文件**

| # | 文件 | 改动类型 | 方法/位置级改动 |
|---|------|---------|----------------|
| 7 | `client/package.json` | 修改 | dependencies 新增 `antd`、`@ant-design/icons`、`react-i18next`、`i18next`、`dayjs`（安装方式见 6.1.3.1） |
| 8 | `client/src/main.jsx` | 修改 | `import './i18n'`（副作用初始化）+ `LocaleProvider` 包裹 `App` |
| 9 | `client/src/App.jsx` | 修改 | 仅外层包裹 `LocaleProvider`（路由表与守卫不变，spec 6A-13） |
| 10 | `client/src/components/Layout.jsx` | 修改（重构） | 改 antd Layout（Sider+Header+Content）；Menu 按角色自动生成 + selectedKeys 路由联动；Header 页面标题/语言切换/Avatar/用户名+角色/版本号/登出；`navItems` prop 废弃、`title`/`children` 保留 |
| 11 | `client/src/components/StatusTag.jsx` | 修改（重构） | 内部改 antd `Tag` + token 状态色 + `displayText` 双语；props 不变 |
| 12 | `client/src/components/Toast.jsx` | 修改（重构） | 内部委托 antd `message`（`App.useApp()`）；`useToast` API 不变 |
| 13 | `client/src/components/Pagination.jsx` | 修改（重构） | 内部改 antd `Pagination`；props 不变 |
| 14 | `client/src/components/ConfirmDialog.jsx` | 修改（重构） | 内部改 antd `Modal`；props 不变 |
| 15 | `client/src/pages/Login.jsx` | 修改（重构） | SaaS 登录页（Card+Form+Input+Password+Button+统一 message）；版本号保留；登录逻辑不变 |
| 16 | `client/src/pages/employee/EmployeeRequestList.jsx` | 修改（重构） | antd Table + Select 筛选 + Tag + Spin/Empty + Primary Button + Pagination + Modal.confirm 撤回；业务与接口调用不变 |
| 17 | `client/src/pages/employee/NewRequest.jsx` | 修改（重构） | Card+Form（DatePicker/Select/Input/InputNumber/Submit/Cancel）；字段与校验不变 |
| 18 | `client/src/pages/employee/RequestDetail.jsx` | 修改（重构） | Header（标题/目的地+状态 Tag）+ 分区（基本信息/出差事由/审批状态）+ Steps；取数逻辑不变 |
| 19 | `client/src/pages/employee/ResubmitRequest.jsx` | 修改（重构） | 同 NewRequest 表单容器重构（重新提交逻辑不变） |
| 20 | `client/src/pages/admin/AdminRequestList.jsx` | 修改（重构） | antd Table + Tag（Pending 高识别）+ Select 筛选 + Pagination；业务不变 |
| 21 | `client/src/pages/admin/AdminRequestDetail.jsx` | 修改（重构） | Header + 分区 + Steps + 审批区域（TextArea + Approve/Reject）；审批意见必填规则不变 |
| 22 | `client/src/pages/admin/AdminUsers.jsx` | 修改（重构） | antd Table + Modal/Drawer + Form + 创建 Primary Button + More Dropdown（编辑/启用禁用/重置密码，决策点 D-9）；业务逻辑不变 |
| 23 | `client/index.html` | 修改 | `<html lang>` 由 JS 动态维护（i18n 初始化时设置，非静态改动；`<title>` 可保持中文） |

**C. 后端**：**零改动**（`server/**` 全部文件不变，决策点 D-12）。

**D. 测试**

| # | 文件 | 改动类型 | 说明 |
|---|------|---------|------|
| 24 | `tests/versionDisplay.test.js` | 修改 | 登录页 UI 选择器适配（`input[placeholder="用户名"]` → `page.getByPlaceholder(...)`，见 6.6.2）；其余用例保持 |
| 25 | `tests/i18n.test.js` | **新增** | 语言切换持久化、英文页无中文残留、中英全流程、组件语言同步、权限边界等 E2E（见 6.6.3） |

**明确不改动**：`client/src/api/*.js`、`client/src/api/client.js`、`client/src/context/AuthContext.jsx`、`client/src/router/ProtectedRoute.jsx`、`client/src/hooks/useVersion.js`、`client/src/constants/*.js`、`client/vite.config.js`、`client/index.html`（结构）、`tests/playwright.config.js`、`tests/helpers.js`、全部既有 API 层测试（auth/userManagement/adminReview/requestSubmit/permission/employeeManage/hardening）、`server/**` 全部文件、根 `package.json`。

## 6.5 风险与兼容性分析

| 维度 | 风险/影响 | 评估与对策 |
|------|----------|-----------|
| 接口兼容 | 后端 API 是否受影响 | 后端零改动（决策点 D-12）；前端 API 封装与请求体不变（中文业务值，spec 6B-6）；`/api/meta/version` 沿用 V1.2 |
| 数据兼容 | JSON 数据格式/业务值 | 零变更、零迁移；`users.json`/`requests.json` 业务值不变；新增前端静态资源不触碰存储 |
| 依赖兼容 | antd v5 与 React 18/Vite 5 | antd ^5.x 官方支持 React 16-18（决策点 D-1）；Vite 5 + CSS-in-JS（@ant-design/cssinjs）开箱即用；安装后需执行 `client` 构建冒烟（`npm run build`）验证 |
| 业务回归 | 页面重构改变业务行为 | 各页面仅替换展示层，数据获取/提交函数、字段与校验规则、审批意见必填、路由与权限守卫原样保留（spec 6A-13）；API 层 E2E 全量回归兜底 |
| 布局兼容 | `navItems` prop 废弃影响既有页面 | 所有页面由本版本统一重构（改动点 15-22），同步移除 `navItems` 传参；Layout 组件名/路径不变，无第三方引用 |
| 双语一致性 | 英文页残留中文（6B-9） | i18n 键全覆盖 + `t()` 强制引用（spec 6.6-3 禁止硬编码）+ E2E 英文页无中文断言兜底；`fallbackLng:'zh-CN'` 在缺键时兜底但不掩盖（测试发现即修复） |
| 双语一致性 | 状态/角色双源（i18n vs displayMapping） | 明确单一来源策略：业务值 Tag/列标签走 `displayMapping`（决策点 D-11），i18n `status/role/userStatus` 仅承载非业务值场景，文档化约束避免双源漂移 |
| 组件语言同步 | Modal/message 静态方法丢失 locale 上下文 | antd v5 `App` 组件包裹（`LocaleProvider` 内 `<AntApp>`）+ `App.useApp()` 获取实例（`Toast`/`ConfirmDialog` 内部实现），保证命令式 API 主题与语言同步（6B-10） |
| 日期兼容 | DatePicker 提交值格式 | `valueFormat="YYYY-MM-DD"` 保证提交/回填值仍为 ISO 语义（spec 6B-7）；`formatDate` 仅作用于展示 |
| 测试回归 | versionDisplay.test.js UI 选择器 | zh-CN 默认语言下 `placeholder` 文案不变、选择器仍匹配；同步更新为 `getByPlaceholder` 语义化选择器增强健壮性（6.6.2），其余 API 层测试不受前端重构影响 |
| 性能 | CSS-in-JS 运行时开销 | antd v5 样式按需注入，`workers` 可调（`@ant-design/cssinjs` 默认浏览器端）；本项目页面规模小，影响可忽略 |
| 兼容性回归 | 既有 E2E webServer 启动 | `playwright.config.js` 不变；client 新增依赖后 `npm run dev` 正常（Vite 热更新），后端 3001 端口行为不变 |

## 6.6 测试方案设计

分层验证策略（与 V1.1/V1.2 一致）：**Playwright E2E 承担页面展示、双语与交互验证**；后端无改动、API 契约不变，既有 API 层测试全量回归即满足 spec 6A-13。V1.3 无新增服务端测试需求（后端零改动）。

### 6.6.1 既有测试回归策略（spec 6A-13 无回归）

| 测试文件 | 层级 | V1.3 影响 | 处理 |
|---------|------|----------|------|
| `auth.test.js` / `userManagement.test.js` / `adminReview.test.js` / `requestSubmit.test.js` / `permission.test.js` / `employeeManage.test.js` / `hardening.test.js` | API 层（`helpers.js` 直连后端） | 不受前端 UI 重构影响 | 全量执行回归，预期零改动零失败 |
| `versionDisplay.test.js` | UI 层（浏览器交互） | 登录页重构后 UI 选择器需适配 | 见 6.6.2 适配；其余用例（版本号文本断言）不受影响 |

### 6.6.2 versionDisplay.test.js 适配（登录页 UI 选择器）

现状第 26-27 行使用 `input[placeholder="用户名"]` / `input[placeholder="密码"]`。V1.3 登录页重构为 antd `Form`+`Input` 后：

1. **兼容性结论**：antd `Input` 的 `placeholder` 属性仍直接渲染于 `<input>` 元素；默认语言 zh-CN 下 placeholder 文案仍为"用户名"/"密码"（`t('login:usernamePlaceholder')`），故 `input[placeholder="用户名"]` 在 zh-CN 默认语言下**依然匹配、用例不必然失败**。
2. **推荐适配（任务落地）**：为语义健壮性（antd 包裹结构变化、后续语言切换测试在英文态下 placeholder 变为 "Username"/"Password"），将该两行断言更新为 Playwright 语义化定位器：
   ```js
   await expect(page.getByPlaceholder('用户名')).toBeVisible();   // zh-CN 默认语言（等价语义）
   await expect(page.getByPlaceholder('密码')).toBeVisible();
   ```
   若测试用例在 en-US 语言下执行，则对应改为 `page.getByPlaceholder('Username')`/`page.getByPlaceholder('Password')`（语言相关断言统一收敛到新增 `i18n.test.js`，避免 versionDisplay.test.js 承担双语职责）。
3. **其余用例不动**：`v1.2.0` 文本断言、接口失败降级断言（`body` 不含 `v1.2.0`/`版本信息不可用`）均不受登录页重构影响（版本号仍保留在重构后登录页底部）。

### 6.6.3 新增 E2E（`tests/i18n.test.js`，Playwright）

沿用 `tests/playwright.config.js`（webServer 自动启动 server+client）与 `helpers.js`（`loginAs` 获取 token/user 注入 localStorage），覆盖 spec 6B-1~6B-12：

| # | 用例 | 步骤 | 断言（验收条件对应） |
|---|------|------|---------------------|
| 1 | 默认语言 zh-CN（6B-11） | 清空 `i18nLanguage` → 打开 `/login` | 页面出现中文文案（如"登录"/"企业差旅管理"） |
| 2 | 语言切换立即生效（6B-2） | 登录进入主界面 → Header 切换 EN | 页面（Sidebar/Header/表格列/按钮）立即变为英文，无刷新 |
| 3 | 语言持久化（6B-3） | 切换 EN → 刷新页面 → 重新登录 | 界面仍为英文（localStorage `i18nLanguage=en-US`） |
| 4 | 英文页无中文残留（6B-9） | en-US 下依次访问 登录/我的申请/新建申请/详情/审核/员工管理 | 主要页面 `body` 不含常见中文字符（正则 `/[\u4e00-\u9fa5]/` 断言；用户数据除外） |
| 5 | 业务值英文映射（6B-5） | en-US 下查看申请列表/详情、员工列表 | 状态显示 Pending/Approved/Rejected/Withdrawn、角色 Administrator/Employee、用户状态 Active/Disabled、交通工具 Flight/Train 等 |
| 6 | API 仍发送中文业务值（6B-6） | en-US 下按 "Pending" 筛选申请 → 断言请求参数 | Network 请求参数 `status=待审核`；Approve/Reject 请求体与 V1.2 一致（`{ comment }`） |
| 7 | 日期/金额本地化（6B-7/6B-8） | en-US 与 zh-CN 下查看列表/详情 | en-US 日期为英文本地化格式（如 Sep 1, 2026）、zh-CN 为 YYYY-MM-DD；金额显示 1,234.50 千分位 |
| 8 | 组件内置语言同步（6B-10） | 切换语言后打开含 DatePicker/分页/Modal/空态的页面 | DatePicker 月份/星期为对应语言、Pagination 文案、Modal 确定/取消按钮文案随语言切换 |
| 9 | 错误/校验提示双语（6B-12） | en-US 下触发表单校验（必填/审批意见）与接口错误 | 校验提示与 Toast 为英文；zh-CN 下为中文 |
| 10 | 管理员全流程（中英各跑一遍） | 登录管理员 → 员工管理创建员工 → 申请审核 Approve/Reject | 中英文两种语言下均成功；`code=0`、页面状态正确 |
| 11 | 员工全流程（中英各跑一遍） | 员工登录 → 新建申请 → 查看详情 → 重新提交（被拒后） | 中英文两种语言下均成功；最终状态展示正确（Approved/Rejected/Withdrawn） |
| 12 | 权限边界（6A-13） | en-US 下员工直接访问 `/admin/users` | 被重定向（后端权限仍生效，沿用既有 permission.test.js 语义，补充英文态验证） |
| 13 | 既有版本展示回归 | 登录页与主界面在 en-US 下仍显示 `v1.2.0` | `body` 含 `v1.2.0`（版本号与语言解耦） |

> 既有 API 层测试（`auth/userManagement/adminReview/requestSubmit/permission/employeeManage/hardening`）在 V1.3 发布后全量执行，作为 spec 6A-13「既有自动化测试无回归」的验收；versionDisplay.test.js 适配后同样全量通过。

---
