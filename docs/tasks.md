# 企业差旅管理系统 V1.1 加固版 编码任务清单（tasks.md）

> 版本：V1.1（加固版）｜基线：V1.0（2026-08-11）
> 对应文档：`docs/spec.md`（23 条需求）、`docs/design.md`（16 项改动点清单）
> 任务拆解原则：垂直切割（按业务功能分组）、原子可验证（每任务含完成标准与验证命令）、按依赖排序（被依赖者在前）。

## 任务总览

| 分组 | 任务范围 | 主任务编号 |
|------|---------|-----------|
| 1. 存储引擎并发原语 | 新增 `runExclusive` 串行临界区 API | T1 |
| 2. 配置与错误码基础 | 错误码、NODE_ENV、密钥校验模块、.env.example | T2–T4, T11 |
| 3. 令牌黑名单定期清理 | 仓储改造、登录/登出/启动三时机触发 | T5–T7 |
| 4. 用户唯一性并发原子化 | 用户仓储原子方法、服务层改造 | T8–T9 |
| 5. JWT_SECRET 启动校验集成 | app.js 监听前校验 | T10 |
| 6. 服务端自动化测试 | test 脚本 + 4 个 node:test 测试文件 | T12–T16 |
| 7. E2E 加固回归 | Playwright 加固用例 | T17 |
| 8. 整体回归验证 | 全量测试与手工验证 | T18 |

> 说明：T7 与 T10 均修改 `server/src/app.js`，T10 依赖 T7 以避免同一文件编辑冲突，建议由同一开发者连续完成两处改动。

---

## 1. 存储引擎并发原语（基础能力，全部加固点的前置）

### T1 在 JsonStoreEngine 中新增 `runExclusive(collection, task)` 串行临界区 API
- **涉及文件**：`server/src/store/JsonStoreEngine.js`
- **任务描述**：新增 `async runExclusive(collection, task)` 公共方法，复用既有 `this.locks[collection]` 锁链实现 per-collection 串行临界区（与 `write()` 天然 FIFO 串行），并遵循设计契约：
  1. task 内禁止调用 `write()`/`runExclusive()` 自身（防止链上自引用死锁），允许调用同步 `read()` 读取当前集合快照；
  2. task 返回「变更后的完整集合数据（新数组/不可变更新）」时在锁内同步落盘（`JSON.stringify(data, null, 2)`），落盘失败回滚 `this.memory[collection]` 并抛 `BusinessError(STORE_WRITE_FAILED, '数据写入失败', 500)`；
  3. task 返回 `null`/`undefined` 视为无变更，不落盘（保证清理幂等、无副作用）；
  4. task 抛错（含业务冲突）时以 `run.catch(() => {})` 维持锁链连续，错误向上冒泡给调用方，后续操作不被阻塞；
  5. 可选重构：将 `write()` 中"更新内存 + 同步落盘 + 回滚"逻辑提取为私有 `_persist(collection, data)` 供 `write()` 与 `runExclusive` 共享（行为保持不变）。
- **完成标准**：
  - 锁链 FIFO 串行：多个 `runExclusive` 调用按提交顺序执行；
  - task 抛错后锁链不中断，下一次 `runExclusive`/`write` 仍可正常执行；
  - task 返回新数组后文件落盘成功；task 返回 `null` 时文件内容不变（mtime 不变）；
  - 落盘失败（模拟）时内存态回滚且抛出 `STORE_WRITE_FAILED`；
  - task 内调用 `write()` 会触发死锁契约违规（该场景通过代码评审确认规避，不引入运行时检测）。
- **验证方式**：
  - 临时冒烟脚本：`cd server && node -e "const s=require('./src/store/JsonStoreEngine'); s.runExclusive('users',()=>{const l=s.read('users');return [...l,{id:'x'}]}).then(()=>console.log('ok'))"`；
  - 正式验证由 T14/T15 的自动化用例覆盖。
- **依赖**：无

---

## 2. 配置与错误码基础（JWT_SECRET 校验的支撑件）

### T2 新增 `INIT_CONFIG_WEAK_SECRET` 错误码
- **涉及文件**：`server/src/constants/errorCodes.js`
- **任务描述**：新增常量 `INIT_CONFIG_WEAK_SECRET: 'INIT_CONFIG_WEAK_SECRET'`。该错误码**仅用于启动期内部错误日志**（配合 `BusinessError` 抛出后由 `app.js` 的 `startServer().catch()` 记录并 `process.exit(1)`），不得出现在任何对外 HTTP 接口响应中。
- **完成标准**：常量存在且被 `secretValidator.assertJwtSecretStrength`（T4）引用；既有对外错误码集合保持不变。
- **验证方式**：`cd server && node -e "console.log(require('./src/constants/errorCodes').INIT_CONFIG_WEAK_SECRET)"` 输出该常量；T13/T16 用例断言生产模式错误日志包含该错误码。
- **依赖**：无

### T3 在 config.js 中新增 `NODE_ENV` 配置项
- **涉及文件**：`server/src/config.js`
- **任务描述**：在配置对象中新增 `NODE_ENV: process.env.NODE_ENV` 字段（纯环境变量透传），供 `secretValidator` 启动校验分支使用；其余字段不做任何改动。
- **完成标准**：`config.NODE_ENV` 正确反映进程环境变量（未设置时为 `undefined`）；既有字段 `PORT`/`JWT_SECRET`/`DATA_DIR` 等行为不变。
- **验证方式**：`cd server && node -e "console.log(require('./src/config').NODE_ENV)"` 输出环境变量值。
- **依赖**：无

### T4 新增 `server/src/utils/secretValidator.js` 密钥强度校验模块
- **涉及文件**：`server/src/utils/secretValidator.js`（新增）
- **任务描述**：实现 JWT_SECRET 强度判定与启动期校验入口：
  1. 常量 `MIN_JWT_SECRET_LENGTH = 32`；
  2. 常量 `WEAK_JWT_SECRETS = ['dev-jwt-secret-key-for-testing-only', 'your-jwt-secret-key-change-in-production']`（spec 指定两个示例值）；
  3. `validateJwtSecret(secret)` 纯函数：缺失返回 `{ valid: false, reason: 'missing' }`；长度 < 32 返回 `{ valid: false, reason: 'too-short' }`；命中黑名单返回 `{ valid: false, reason: 'blacklisted' }`；否则返回 `{ valid: true, reason: null }`；
  4. `assertJwtSecretStrength(secret, nodeEnv)` 启动期入口：
     - 缺失（任何模式）→ 抛 `BusinessError(INIT_CONFIG_MISSING, 'JWT_SECRET 配置缺失', 500)`，保持 V1.0 语义；
     - `nodeEnv === 'production'` 且弱密钥 → 抛 `BusinessError(INIT_CONFIG_WEAK_SECRET, <含失败原因类别的消息>, 500)`，消息须明确标注"缺失/长度不足/命中示例黑名单"（spec 5.3.1-6）；
     - 非生产模式且弱密钥 → `logger.warn('CONFIG', 'JWT_SECRET 为弱密钥，仅限开发环境使用', { reason })` 后返回 `{ ok: true, reason }` 放行；
     - 强密钥 → 无告警，返回 `{ ok: true, reason: null }`。
- **完成标准**：函数签名与返回结构符合设计 2.1.3.3；无任何对外 HTTP 接口依赖此模块。
- **验证方式**：`cd server && node --test test/secretValidator.test.js`（T13）全通过。
- **依赖**：T2、T3

### T11 新增 `server/.env.example` 配置示例文件
- **涉及文件**：`server/.env.example`（新增）
- **任务描述**：新增示例配置文件，包含 `PORT`、`INIT_ADMIN_USERNAME`、`INIT_ADMIN_PASSWORD`、`JWT_SECRET`、`JWT_EXPIRES_IN`、`DATA_DIR` 全部变量；其中 `JWT_SECRET` 使用 ≥32 字符强密钥占位（如 `please-change-me-to-a-random-secret-at-least-32-chars`）并加注释说明必须替换；`server/.env` 现有文件保持不动。
- **完成标准**：文件存在；`JWT_SECRET` 占位长度 ≥ 32 且未命中 `WEAK_JWT_SECRETS`；注释说明生产环境必须使用随机强密钥。
- **验证方式**：`cd server && node -e "const r=require('fs').readFileSync('.env.example','utf8'); console.log(r.includes('JWT_SECRET='))"`。
- **依赖**：无

---

## 3. 令牌黑名单定期清理

### T5 改造 blacklistRepository：`add()` 与 `cleanupExpired()` 纳入临界区 + 容错 + 结构化日志
- **涉及文件**：`server/src/repositories/blacklistRepository.js`
- **任务描述**：
  1. `add(token, expiresAt)`：改为 `store.runExclusive('token-blacklist', ...)` 临界区内"读-改-写"，采用不可变更新返回新数组（`[...list, { id: crypto.randomUUID(), token, expiresAt }]`），替换 V1.0 的原地 `list.push` + `write()` 模式；
  2. `cleanupExpired()`：改为 `runExclusive` 临界区内仅过滤 `expiresAt` 晚于当前时间的条目（`expiresAt` 为唯一过期判据）；`filtered.length === list.length` 时返回 `null`（不落盘，保证幂等）；临界区返回后统计前后条目数并输出 `logger.info('BLACKLIST', 'Expired tokens cleaned', { before, after })`；
  3. 容错：整个 `cleanupExpired()` 用 try/catch 包裹，落盘失败（`runExclusive` 已回滚内存态并抛 `STORE_WRITE_FAILED`）或数据文件损坏导致读取失败时，记录 `logger.error('BLACKLIST', 'Cleanup expired tokens failed', { error })` 并**吞掉错误不向外抛**；
  4. `isBlacklisted(token)` 保持同步读，**不做任何改造**（纯读接口不进临界区，不增加鉴权路径等待）。
- **完成标准**：
  - 清理仅删过期条目，未过期条目完整保留；
  - 无过期条目时不落盘（文件 mtime/内容不变，幂等）；
  - 并发 `add` + `cleanupExpired` 不丢失任何条目；
  - 模拟落盘失败时 `cleanupExpired` 不抛错、内存态回滚、输出 ERROR 日志。
- **验证方式**：`cd server && node --test test/blacklistCleanup.test.js`（T14）全通过；E2E 由 T17 覆盖登出主流程。
- **依赖**：T1

### T6 在 authService 中触发按需清理（登录成功 / 登出后）
- **涉及文件**：`server/src/services/authService.js`
- **任务描述**：
  1. `login()`：在用户名/密码校验通过、签发 token 之后，`await blacklistRepository.cleanupExpired()`；清理的完成或失败均**不影响本次登录返回值**（cleanupExpired 内部已容错）；
  2. `logout()`：在 `blacklistRepository.add(token, expiresAt)` 之后，`await blacklistRepository.cleanupExpired()`；add 与 cleanup 为两次独立临界区调用，在锁链上串行执行；
  3. 除上述两时机外不得引入任何其他清理入口（禁止定时任务）。
- **完成标准**：登录成功时清理被触发（日志出现 `Expired tokens cleaned`）；登出时先入黑名单再清理；清理失败不影响登录/登出响应（`code=0` 照常返回）；黑名单校验语义不变（已登出令牌访问接口仍返回 `AUTH_TOKEN_INVALID`/401）。
- **验证方式**：`cd server && node --test test/blacklistCleanup.test.js`（T14）；E2E `cd tests && npx playwright test hardening.test.js`（T17）覆盖"登录/登出主流程冒烟"用例。
- **依赖**：T5

### T7 在 app.js 启动流程中插入启动清理（`store.init()` 之后）
- **涉及文件**：`server/src/app.js`
- **任务描述**：在 `startServer()` 的 `store.init()` 之后、`initAdmin()` 之前，`await blacklistRepository.cleanupExpired()`（内部容错，失败不阻断启动）；需在文件头部引入 `blacklistRepository`。该改动与 T10 的密钥校验改动同属 `startServer()` 编排，合并编辑避免冲突。
- **完成标准**：服务启动时自动清理一次过期黑名单条目并落盘；清理失败不影响启动成功；日志输出清理前后条目数。
- **验证方式**：`cd server && node src/app.js` 观察启动日志出现 `Expired tokens cleaned`；`cd tests && npx playwright test hardening.test.js` 冒烟用例通过。
- **依赖**：T5

---

## 4. 用户唯一性并发原子化

### T8 在 userRepository 中新增 `createIfUsernameFree` 与 `updateIfUsernameFree` 原子方法
- **涉及文件**：`server/src/repositories/userRepository.js`
- **任务描述**：新增两个原子方法（既有 `create`/`update` 保留，供 `initAdmin`、`updateUserStatus`、`resetPassword` 等继续使用）：
  1. `async createIfUsernameFree(user)`：在 `store.runExclusive('users', ...)` 临界区内完成"用户名唯一性检查 + 生成 id + 写入"；已存在同名用户时抛 `BusinessError(USER_NAME_CONFLICT, '用户名已存在', 409)`（与 V1.0 语义一致）；通过闭包捕获并返回创建后的用户（含 id）；
  2. `async updateIfUsernameFree(id, updates)`：在临界区内"重新定位用户 → 校验新用户名唯一（`updates.username` 存在时检查，排除自身 `id`）→ 合并写入并刷新 `updatedAt`（`new Date().toISOString()`）"；用户不存在返回 `null`（服务层映射 404）；新用户名冲突抛 `USER_NAME_CONFLICT`(409)；
  3. 入参校验与冲突检查顺序遵守"400 字段校验 → 409 唯一性冲突 → 404 不存在 → 403 越权"的 V1.0 兼容约束（校验在服务层完成，仓储只做唯一性检查与写入）。
- **完成标准**：并发调用两个相同 username 的 `createIfUsernameFree`，恰一个成功、一个抛 `USER_NAME_CONFLICT`(409)；`updateIfUsernameFree` 改为已有用户名（排除自身）时抛 409；写入失败回滚内存态并抛 `STORE_WRITE_FAILED`；`users.json` 任意时刻无重复 username。
- **验证方式**：`cd server && node --test test/userConcurrency.test.js`（T15）全通过。
- **依赖**：T1

### T9 改造 userService：`createUser` / `updateUser` 移交原子方法，bcrypt.hash 移出临界区
- **涉及文件**：`server/src/services/userService.js`
- **任务描述**：
  1. `createUser()`：保留原有字段校验（400，临界区外，顺序与 V1.0 一致）→ 删除临界区外 `findByUsername` 查重 → `await bcrypt.hash(password)` **提前到临界区外**执行（耗时异步操作不占锁）→ 调用 `createIfUsernameFree({ username, name, passwordHash, role, status, createdAt, updatedAt })` → 审计 → 返回脱敏用户（不变）；
  2. `updateUser()`：保留 `findById`(404) + 角色校验(403) + 字段校验(400) 于临界区外（只读快照）→ 删除临界区外新用户名查重 → 调用 `updateIfUsernameFree(id, updates)` → 返回 `null` 时抛 `USER_NOT_FOUND`(404)（设计保证临界区内不会出现该情况，但保留防御映射）→ 审计 → 返回脱敏用户（不变）；
  3. `updateUserStatus` / `resetPassword` 不涉及用户名变更，**保持调用既有 `update()` 不变**。
- **完成标准**：对外接口请求参数、成功响应结构、错误码与 HTTP 状态与 V1.0 完全一致（400 校验 → 409 冲突 → 404 → 403）；重名时多消耗一次 bcrypt.hash 属设计接受项；并发重名创建仅一成功（HTTP 409 语义）。
- **验证方式**：`cd server && node --test test/userConcurrency.test.js`（T15，含 HTTP 层并发用例）；E2E 既有用例（`cd tests && npx playwright test userManagement.test.js employeeManage.test.js`）回归通过。
- **依赖**：T8

---

## 5. JWT_SECRET 启动校验集成

### T10 在 app.js 中集成 `assertJwtSecretStrength`（端口监听前 fail-fast）
- **涉及文件**：`server/src/app.js`
- **任务描述**：在 `startServer()` **最前**（`store.init()` 之前、`app.listen()` 之前）调用 `assertJwtSecretStrength(config.JWT_SECRET, config.NODE_ENV)`：
  1. 以该调用**替换**现有 V1.0 的 `if (!config.JWT_SECRET) throw INIT_CONFIG_MISSING` 缺失检查（语义保留：缺失任何模式均拒绝启动）；
  2. 生产模式弱密钥 → 抛 `INIT_CONFIG_WEAK_SECRET`（消息含原因类别），经 `startServer().catch()` 记录 ERROR 日志后 `process.exit(1)`，**不进入监听**；
  3. 非生产模式弱密钥 → `CONFIG` 模块 WARN 告警后放行（`server/.env` 现有弱密钥值在开发/E2E 下照常启动）；
  4. 需在文件头部引入 `secretValidator`。与 T7 同为 `startServer()` 编排改动，合并编辑避免冲突。
- **完成标准**：校验在监听前完成（弱密钥进程不对外提供服务）；生产弱密钥退出码非 0 且错误消息含失败原因类别；开发弱密钥启动成功且日志含 WARN。
- **验证方式**：`cd server && node --test test/startupValidation.test.js`（T16，子进程覆盖 4 种场景）全通过。
- **依赖**：T4、T7（同一文件，须在 T7 之后编辑）

---

## 6. 服务端自动化测试（node:test，零新增依赖）

> 测试隔离约定（所有服务端测试文件统一遵守）：文件顶部在 require 被测模块之前设置 `process.env.DATA_DIR = <os.tmpdir() 下临时目录>` 与 `process.env.JWT_SECRET = <≥32 字符强密钥>`（启动校验用例除外），`after` 钩子清理临时目录，杜绝污染真实 `server/data/`。

### T12 在 server/package.json 中新增 test 脚本
- **涉及文件**：`server/package.json`
- **任务描述**：在 `scripts` 中新增 `"test": "node --test test/"`（Node 18+ 内置 test runner，零新增依赖）；不改动既有 `dev`/`start` 脚本。
- **完成标准**：`cd server && npm test` 可正常启动测试 runner（测试文件未创建前不报错或正常跳过）。
- **验证方式**：`cd server && npm test` 执行无异常。
- **依赖**：无（后续 T13–T16 依赖本任务）

### T13 新增 `server/test/secretValidator.test.js`（密钥判定单测）
- **涉及文件**：`server/test/secretValidator.test.js`（新增）
- **任务描述**：使用 `node:test` + `node:assert` 覆盖 `secretValidator` 全部行为：
  1. `validateJwtSecret`：缺失 → `{valid:false, reason:'missing'}`；31 字符 → `'too-short'`；两个黑名单示例值 → `'blacklisted'`；≥32 字符非黑名单 → `valid:true`；
  2. `assertJwtSecretStrength`：开发模式弱密钥 → 返回 `{ok:true}` 且日志输出 WARN（捕获 console 断言）；生产模式弱密钥 → 抛出且消息含原因类别（缺失/长度不足/命中示例黑名单）；生产模式强密钥 → 不抛错。
- **完成标准**：全部用例通过；文件顶部设置测试隔离环境变量。
- **验证方式**：`cd server && node --test test/secretValidator.test.js`
- **依赖**：T4、T12

### T14 新增 `server/test/blacklistCleanup.test.js`（清理逻辑 + 并发安全）
- **涉及文件**：`server/test/blacklistCleanup.test.js`（新增）
- **任务描述**：覆盖黑名单清理与并发安全：
  1. 仅删 `expiresAt < now` 条目，未过期条目完整保留；
  2. 无过期条目时不落盘（文件 mtime/内容不变，验证幂等）；
  3. 并发 `Promise.all` 发起多条 `add` + 一次 `cleanupExpired`，断言全部未过期新条目与清理结果一致、无条目丢失；
  4. 模拟写入失败（注入引擎写异常，如将 `writeFileSync` 临时替换为抛错）时 `cleanupExpired` 不抛错、内存态回滚为清理前、输出 ERROR 日志；
  5. 每个用例在独立临时 `DATA_DIR` 下运行，`after` 清理。
- **完成标准**：全部用例通过；真实触达 `JsonStoreEngine.runExclusive` 的串行语义。
- **验证方式**：`cd server && node --test test/blacklistCleanup.test.js`
- **依赖**：T1、T5、T12

### T15 新增 `server/test/userConcurrency.test.js`（用户唯一性并发原子化）
- **涉及文件**：`server/test/userConcurrency.test.js`（新增）
- **任务描述**：覆盖用户唯一性原子化：
  1. 并发 `createIfUsernameFree` 两个相同 username（`Promise.all`，利用 bcrypt.hash 异步让出制造真实竞态），断言恰一个成功、一个抛 `USER_NAME_CONFLICT`；
  2. `updateIfUsernameFree` 改为已有用户名（排除自身）→ 抛 409；用户不存在 → 返回 `null`；
  3. HTTP 层：`app.listen(随机端口)` + Node 内置 `fetch`，并发 POST `/api/admin/users` 相同 username，断言一 200 一 409 且错误码 `USER_NAME_CONFLICT`、提示"用户名已存在"；
  4. 断言 `users.json` 最终无重复 username。
- **完成标准**：全部用例通过；验证锁链串行 + 错误码兼容语义。
- **验证方式**：`cd server && node --test test/userConcurrency.test.js`
- **依赖**：T8、T9、T12

### T16 新增 `server/test/startupValidation.test.js`（启动期校验，子进程）
- **涉及文件**：`server/test/startupValidation.test.js`（新增）
- **任务描述**：使用 `node:child_process.spawn` 在子进程内启动真实 `src/app.js`，覆盖启动期校验 4 种场景：
  1. `NODE_ENV=production` + 弱密钥 → 退出码非 0、日志含原因类别（如 `命中示例黑名单`）；
  2. `NODE_ENV=production` + 缺失 JWT_SECRET → 退出码非 0、日志含 `INIT_CONFIG_MISSING`；
  3. 非生产 + 弱密钥 → 退出码 0、日志含 WARN、端口可访问（发送健康请求或检测监听）；
  4. 生产 + 强密钥 → 正常启动（退出码 0 或端口可达后终止）。
  - 每个子进程设置独立 `DATA_DIR` 临时目录与随机 `PORT`，`after` 钩子清理并确保子进程终止。
- **完成标准**：全部用例通过；验证 fail-fast / WARN 放行 / 监听前校验语义。
- **验证方式**：`cd server && node --test test/startupValidation.test.js`
- **依赖**：T4、T10、T12

---

## 7. E2E 加固回归（Playwright）

### T17 新增 `tests/hardening.test.js` 加固回归用例
- **涉及文件**：`tests/hardening.test.js`（新增）
- **任务描述**：沿用 `tests/helpers.js` 的 `loginAs` / `apiCall` / `createEmployee` 封装，仅追加加固点回归用例（不重构既有用例）：
  1. **创建重名员工仍返回 409（串行回归）**：登录管理员 → 创建员工 X → 再次创建同名员工 X → 断言第二次响应 `status=409`、`code=USER_NAME_CONFLICT`、提示"用户名已存在"；
  2. **登出后令牌失效且登出流程不受清理影响**：登录管理员 → 登出 → 携带已登出 token 访问 `/api/admin/users` → 断言登出返回 `code=0`、后续请求 `status=401`、`code=AUTH_TOKEN_INVALID`；
  3. **登录/登出主流程冒烟回归（覆盖清理触发路径）**：管理员登录 → 登出 → 重新登录 → 创建员工 → 每一步均 `code=0`，验证三时机清理未破坏主流程。
- **完成标准**：`cd tests && npx playwright test hardening.test.js` 全通过（webServer 依赖 `server/.env` 弱密钥在开发模式下 WARN 放行启动，符合 spec 4.5.3）。
- **验证方式**：`cd tests && npx playwright test hardening.test.js`
- **依赖**：T5、T6、T7、T9、T10（后端全部改动完成后）

---

## 8. 整体回归验证

### T18 全量测试与回归验证
- **涉及文件**：全项目（无代码改动）
- **任务描述**：
  1. `cd server && npm test`：4 个服务端测试文件全部通过；
  2. `cd tests && npx playwright test`：既有全部 E2E 用例 + 新增 `hardening.test.js` 全通过（确认 V1.0 业务无回归）；
  3. 手工验证：`cd server && node src/app.js` 观察启动日志——开发模式弱密钥输出 `CONFIG` 模块 WARN、出现启动清理日志 `Expired tokens cleaned`、服务正常监听；
  4. 检查对外接口兼容性：`/api/auth/login`、`/api/auth/logout`、`/api/admin/users` 的请求/响应结构与错误码语义与 V1.0 一致；
  5. 确认无新增自动清理入口（仅启动/登录/登出三时机）。
- **完成标准**：全部测试通过；无破坏性变更；spec 23 条需求全部满足。
- **验证方式**：上述命令逐条执行并确认通过。
- **依赖**：T13–T17