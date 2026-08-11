# 企业差旅管理系统 V1 编码任务清单

> 基于 `spec.md` 需求规格与 `design.md` 技术设计生成。
> 技术栈：前端 React + Vite；后端 Node.js + Express；本地 JSON 文件持久化；JWT + bcrypt 认证；Playwright MCP E2E 测试；单仓库前后台分离；前后端统一 JavaScript。

---

## 1. 项目脚手架与基础设施搭建

### 1.1 初始化单仓库目录结构
- [ ] 在仓库根目录创建 `server/`（后端）与 `client/`（前端）两个子目录，并建立 `server/src/{routes,middlewares,controllers,services,repositories,store,utils,init,constants,errors}` 与 `server/data/` 目录结构
- [ ] 在仓库根目录创建 `tests/`（E2E 测试）目录，并建立 `.env.example`、`README.md` 占位文件

### 1.2 后端依赖与启动脚本配置
- [ ] 在 `server/` 下初始化 `package.json`，安装依赖：`express`、`jsonwebtoken`、`bcryptjs`、`dotenv`、`cors`、`morgan`（日志）；开发依赖：`nodemon`
- [ ] 配置 `server/package.json` 的 `scripts`：`dev`（nodemon 启动）、`start`（node 启动），入口指向 `server/src/app.js`

### 1.3 后端环境变量与配置加载
- [ ] 在 `server/src/config.js` 中使用 `dotenv` 读取并导出配置项：`PORT`（默认 3001）、`INIT_ADMIN_USERNAME`、`INIT_ADMIN_PASSWORD`、`JWT_SECRET`、`JWT_EXPIRES_IN`（默认 `8h`）、`DATA_DIR`（默认 `server/data`）
- [ ] 在 `.env.example` 中列出全部环境变量及说明；启动时校验 `JWT_SECRET`、`INIT_ADMIN_USERNAME`、`INIT_ADMIN_PASSWORD` 必填，缺失则抛 `INIT_CONFIG_MISSING` 错误终止启动

### 1.4 后端常量与错误码集中定义
- [ ] 在 `server/src/constants/roles.js`、`userStatus.js`、`requestStatus.js`、`transports.js` 中分别导出角色、账号状态、申请状态、交通工具枚举
- [ ] 在 `server/src/constants/errorCodes.js` 中集中定义全部错误码常量（`AUTH_INVALID_CREDENTIALS` / `AUTH_ACCOUNT_DISABLED` / `AUTH_TOKEN_INVALID` / `FORBIDDEN` / `USER_NAME_CONFLICT` / `USER_NOT_FOUND` / `REQUEST_NOT_FOUND` / `STATE_CONFLICT` / `VALIDATION_ERROR` / `INIT_CONFIG_MISSING` / `STORE_WRITE_FAILED` 等）

### 1.5 后端统一响应封装与错误处理
- [ ] 在 `server/src/utils/response.js` 实现 `success(data)` 与 `fail(code, message)` 统一 envelope 封装（`{code:0,data}` / `{code,message}`）
- [ ] 在 `server/src/errors/BusinessError.js` 定义业务错误类（携带 errorCode 与 httpStatus），供 service 层抛出
- [ ] 在 `server/src/middlewares/errorHandler.js` 实现统一错误处理中间件，将 `BusinessError` 映射为对应 HTTP 状态码与 envelope，未知错误映射为 500

### 1.6 后端结构化日志中间件
- [ ] 在 `server/src/utils/logger.js` 实现结构化日志输出（包含时间戳、日志级别、操作模块、关键业务标识）
- [ ] 在 `server/src/middlewares/logger.js` 实现请求日志中间件，记录请求方法、路径、时间戳、用户ID（若已认证）

## 2. 存储引擎与系统初始化

### 2.1 实现 JSON 存储引擎
- [ ] 在 `server/src/store/JsonStoreEngine.js` 实现按集合的 JSON 持久化引擎：启动时将 `users.json`、`requests.json`、`audit-logs.json`、`token-blacklist.json` 加载到内存态镜像（文件不存在视为空数组并创建空文件）
- [ ] 实现 `read(collection)`（直接读内存态镜像）与 `write(collection, data)`（进程内互斥锁串行化 → 修改内存态 → `fs.writeFileSync` 同步全量覆写 → 释放锁；写入异常时回滚内存态并抛 `STORE_WRITE_FAILED`）

### 2.2 实现各集合仓储层
- [ ] 在 `server/src/repositories/userRepository.js` 封装用户集合读写：`findAll`、`findByUsername`、`findById`、`create`、`update`，使用 `crypto.randomUUID()` 生成 ID
- [ ] 在 `server/src/repositories/requestRepository.js` 封装申请集合读写：`findAll`、`findById`、`create`、`update`，ID 生成同上
- [ ] 在 `server/src/repositories/auditRepository.js` 封装审计集合追加写：`append`
- [ ] 在 `server/src/repositories/blacklistRepository.js` 封装令牌黑名单：`add`、`isBlacklisted`、`cleanupExpired`（惰性清理已过期条目）

### 2.3 实现系统初始化模块
- [ ] 在 `server/src/init/initAdmin.js` 实现启动初始化逻辑：检查 `users.json` 是否为空 → 为空则读取 `.env` 的 `INIT_ADMIN_USERNAME` / `INIT_ADMIN_PASSWORD` → bcrypt 加密 → 创建管理员账号（角色"管理员"、状态"启用"）→ 落盘；已存在数据则跳过；配置缺失则抛 `INIT_CONFIG_MISSING` 终止启动
- [ ] 在 `server/src/app.js` 启动流程中按顺序调用：加载配置 → 初始化 `JsonStoreEngine` → 执行 `initAdmin` → 注册中间件与路由 → 监听端口

## 3. 认证与鉴权后端

### 3.1 实现 JWT 与 bcrypt 工具
- [ ] 在 `server/src/utils/jwt.js` 实现 `sign(payload)`（使用 `JWT_SECRET` 与 `JWT_EXPIRES_IN` 签发）与 `verify(token)`（校验签名与有效期，失败抛 `AUTH_TOKEN_INVALID`）
- [ ] 在 `server/src/utils/bcrypt.js` 实现 `hash(plain)` 与 `compare(plain, hash)` 加密与比对

### 3.2 实现认证鉴权中间件
- [ ] 在 `server/src/middlewares/auth.js` 实现 `authRequired` 中间件：从 `Authorization: Bearer <token>` 解析 → 校验 JWT 签名与有效期 → 查询 `token-blacklist` 是否在黑名单 → 注入 `{userId, username, role}` 到 `req.user`；任一失败返回 401 `AUTH_TOKEN_INVALID`
- [ ] 在 `server/src/middlewares/auth.js` 实现 `requireAdmin` 与 `requireEmployee` 角色鉴权中间件，角色不匹配返回 403 `FORBIDDEN`

### 3.3 实现认证服务与控制器
- [ ] 在 `server/src/services/authService.js` 实现 `login(username, password)`：校验用户存在 → 校验账号启用（禁用抛 `AUTH_ACCOUNT_DISABLED`）→ bcrypt 比对密码（不匹配抛 `AUTH_INVALID_CREDENTIALS`）→ 签发 JWT 返回 `{token, user}`（user 不含 passwordHash）
- [ ] 在 `server/src/services/authService.js` 实现 `logout(token)`：解码 token 获取 `exp` → 写入 `token-blacklist`（记录 `expiresAt`）→ 返回成功
- [ ] 在 `server/src/controllers/authController.js` 实现登录与登出控制器：入参解析与校验、调用 service、统一响应封装

### 3.4 实现认证路由
- [ ] 在 `server/src/routes/auth.js` 注册 `POST /api/auth/login`（公开）与 `POST /api/auth/logout`（需 `authRequired` 中间件），挂载至 `app.js`

## 4. 员工管理后端

### 4.1 实现员工管理服务
- [ ] 在 `server/src/services/userService.js` 实现 `listUsers()`：返回全量用户脱敏列表（不含 passwordHash）
- [ ] 实现 `createUser({username, name, password})`：校验用户名格式 `^[A-Za-z0-9_]{3,20}$`、姓名长度 1-50、密码长度 ≥6 → 校验用户名唯一性（冲突抛 `USER_NAME_CONFLICT`）→ bcrypt 加密 → 角色固定"普通员工"、状态默认"启用" → 落盘 → 触发审计
- [ ] 实现 `updateUser(id, {username?, name?, status?})`：校验员工存在（不存在抛 `USER_NOT_FOUND`）→ 校验目标为普通员工 → 用户名唯一性校验 → 更新字段与 `updatedAt` → 落盘 → 触发审计；禁止改密码或改角色
- [ ] 实现 `updateUserStatus(id, status)`：校验员工存在 → 校验 status 取值 → 更新状态 → 落盘 → 触发审计
- [ ] 实现 `resetPassword(id, newPassword)`：校验员工存在 → 校验新密码长度 ≥6 → bcrypt 加密存储 → 落盘 → 触发审计

### 4.2 实现员工管理控制器与路由
- [ ] 在 `server/src/controllers/userController.js` 实现列表、创建、编辑、状态切换、重置密码控制器：入参解析与校验、调用 service、统一响应封装
- [ ] 在 `server/src/routes/admin.js` 注册 `GET /api/admin/users`、`POST /api/admin/users`、`PUT /api/admin/users/:id`、`PATCH /api/admin/users/:id/status`、`POST /api/admin/users/:id/reset-password`，全部挂 `authRequired` + `requireAdmin` 中间件，挂载至 `app.js`

## 5. 差旅申请后端（员工侧）

### 5.1 实现申请字段校验工具
- [ ] 在 `server/src/utils/validator.js` 实现 `validateRequestFields(payload)`：校验目的地 1-100、出差事由 1-500、交通工具枚举、费用非负且两位小数、日期格式合法、返回日期 ≥ 出发日期；任一失败抛 `VALIDATION_ERROR` 并指明具体字段

### 5.2 实现员工侧申请服务
- [ ] 在 `server/src/services/requestService.js` 实现 `createRequest(username, payload)`：调用 `validateRequestFields` → 创建"待审核"申请，记录 `submitterUsername` 与 `submittedAt` → 落盘
- [ ] 实现 `listMyRequests(username, {status, page, pageSize})`：按状态筛选本人申请、按提交时间倒序、分页（默认 pageSize=100），返回 `{list, total, page, pageSize}`
- [ ] 实现 `getMyRequest(username, id)`：校验申请存在（不存在抛 `REQUEST_NOT_FOUND`）→ 校验归属本人（非本人抛 `FORBIDDEN`）→ 返回详情
- [ ] 实现 `withdrawRequest(username, id)`：校验归属 → 校验状态为"待审核"（非待审核抛 `STATE_CONFLICT`）→ 置"已撤回" → 落盘
- [ ] 实现 `resubmitRequest(username, id, payload)`：校验归属 → 校验状态为"已拒绝"（非已拒绝抛 `STATE_CONFLICT`）→ `validateRequestFields` → 生成新"待审核"申请，记录 `resubmittedFrom = 原申请ID` → 落盘；原申请保持不变

### 5.3 实现员工侧申请控制器与路由
- [ ] 在 `server/src/controllers/requestController.js` 实现提交、列表、详情、撤回、重新提交控制器：入参解析与校验、调用 service、统一响应封装
- [ ] 在 `server/src/routes/request.js` 注册 `POST /api/requests`、`GET /api/requests`、`GET /api/requests/:id`、`POST /api/requests/:id/withdraw`、`POST /api/requests/:id/resubmit`，全部挂 `authRequired` + `requireEmployee` 中间件，挂载至 `app.js`

## 6. 差旅申请审核后端（管理员侧）

### 6.1 实现管理员审核服务
- [ ] 在 `server/src/services/reviewService.js` 实现 `listAllRequests({status, page, pageSize})`：按状态筛选全量申请、按提交时间倒序、分页，返回含提交人姓名信息
- [ ] 实现 `getRequestDetail(id)`：校验申请存在 → 返回详情含提交人信息
- [ ] 实现 `approveRequest(reviewerUsername, id, comment?)`：校验申请存在 → 校验状态"待审核"（非待审核抛 `STATE_CONFLICT`）→ 置"已通过"，记录 `reviewerUsername`/`reviewedAt`/`reviewComment`（comment 可选，0-500）→ 落盘 → 触发审计
- [ ] 实现 `rejectRequest(reviewerUsername, id, comment)`：校验申请存在 → 校验状态"待审核" → 校验 comment 非空（缺失抛 `VALIDATION_ERROR` "拒绝申请必须填写审核意见"）→ 置"已拒绝"，记录审核信息 → 落盘 → 触发审计

### 6.2 实现管理员审核控制器与路由
- [ ] 在 `server/src/controllers/reviewController.js` 实现列表、详情、通过、拒绝控制器：入参解析与校验、调用 service、统一响应封装
- [ ] 在 `server/src/routes/admin.js` 追加注册 `GET /api/admin/requests`、`GET /api/admin/requests/:id`、`POST /api/admin/requests/:id/approve`、`POST /api/admin/requests/:id/reject`，全部挂 `authRequired` + `requireAdmin` 中间件

## 7. 审计模块后端

### 7.1 实现审计服务
- [ ] 在 `server/src/services/auditService.js` 实现 `record({operatorUsername, operatorRole, action, targetType, targetId, detail})`：组装审计条目（含 `id` 与 `timestamp`）→ 调用 `auditRepository.append` 落盘
- [ ] 在员工管理 service（创建/编辑/禁用启用/重置密码）与审核 service（通过/拒绝）的关键操作中调用 `auditService.record`，记录操作人、操作时间、操作类型、目标对象、操作详情

## 8. 前端公共基础

### 8.1 初始化前端脚手架与依赖
- [ ] 在 `client/` 下使用 Vite 初始化 React 项目，安装依赖：`react`、`react-dom`、`react-router-dom`、`axios`；开发依赖：`vite`、`@vitejs/plugin-react`
- [ ] 配置 `client/vite.config.js`：开发代理将 `/api` 转发至 `http://localhost:3001`；构建产物输出目录指向 `server/public`（供生产时 Express 静态托管）

### 8.2 前端常量与 API 封装
- [ ] 在 `client/src/constants/` 维护与后端一致的枚举（roles、userStatus、requestStatus、transports、errorCodes），用于表单校验与错误提示
- [ ] 在 `client/src/api/client.js` 创建 axios 实例，配置请求拦截器（注入 `Authorization: Bearer <token>`）、响应拦截器（统一解包 envelope、401 清登录态跳登录页、业务错误码 Toast 提示）
- [ ] 在 `client/src/api/auth.js`、`user.js`、`request.js`、`review.js` 分别封装认证、员工管理、员工申请、管理员审核的 API 调用函数

### 8.3 前端认证上下文与路由守卫
- [ ] 在 `client/src/context/AuthContext.js` 实现登录态管理：`login`、`logout`、`user`、`token`（持久化至 localStorage），提供 `useAuth` hook
- [ ] 在 `client/src/router/ProtectedRoute.js` 实现受保护路由组件：未登录跳 `/login`，角色不匹配跳转对应首页或提示权限不足
- [ ] 在 `client/src/App.jsx` 配置路由表：`/login`、`/employee/*`、`/admin/*`，分别挂载对应角色守卫

### 8.4 前端通用组件
- [ ] 在 `client/src/components/` 实现通用组件：`Form`（含字段校验）、`Table`、`Pagination`、`StatusTag`（申请状态标签）、`ConfirmDialog`（确认弹窗）、`Toast`（错误提示），供各页面复用

## 9. 前端登录页

### 9.1 实现登录页面
- [ ] 在 `client/src/pages/Login.jsx` 实现登录表单（用户名、密码、提交按钮），调用 `authApi.login` → 写入 `AuthContext` → 按角色跳转（管理员跳 `/admin/users`，员工跳 `/employee/requests`）
- [ ] 处理登录错误提示：`AUTH_INVALID_CREDENTIALS` 显示"用户名或密码错误"、`AUTH_ACCOUNT_DISABLED` 显示"账号已禁用，请联系管理员"

## 10. 前端员工页面

### 10.1 实现员工申请列表页
- [ ] 在 `client/src/pages/employee/EmployeeRequestList.jsx` 实现本人申请列表：状态筛选（全部/待审核/已通过/已拒绝）、分页、按提交时间倒序展示；每行提供"查看详情""撤回"（仅待审核）"重新提交"（仅已拒绝）操作入口
- [ ] 调用 `requestApi.listMyRequests`，处理撤回确认弹窗与状态冲突错误提示

### 10.2 实现新建申请页
- [ ] 在 `client/src/pages/employee/NewRequest.jsx` 实现提交新申请表单：目的地、出发日期、返回日期、出差事由、交通工具（下拉枚举）、预计费用金额；前端校验字段约束与日期顺序
- [ ] 调用 `requestApi.createRequest`，成功后跳转列表页，处理字段校验错误提示

### 10.3 实现申请详情页（员工侧）
- [ ] 在 `client/src/pages/employee/RequestDetail.jsx` 实现本人申请详情展示：全部业务字段、状态、审核信息（审核人/审核时间/审核意见）；提供"撤回""重新提交"操作入口（按状态显隐）
- [ ] 调用 `requestApi.getMyRequest`，处理 `FORBIDDEN`（非本人申请）与 `REQUEST_NOT_FOUND` 错误提示

### 10.4 实现重新提交页
- [ ] 在 `client/src/pages/employee/ResubmitRequest.jsx` 实现重新提交表单：预填原申请字段（可修改），校验字段合法性，调用 `requestApi.resubmitRequest`，成功后跳转列表页

## 11. 前端管理员页面

### 11.1 实现员工管理页
- [ ] 在 `client/src/pages/admin/AdminUsers.jsx` 实现员工列表（含管理员），展示用户名、姓名、角色、状态、创建时间；提供"创建员工""编辑""禁用/启用""重置密码"操作入口
- [ ] 实现创建员工弹窗表单（用户名、姓名、密码），调用 `userApi.createUser`，处理 `USER_NAME_CONFLICT` 与字段校验错误
- [ ] 实现编辑员工弹窗表单（用户名、姓名、状态），调用 `userApi.updateUser`；实现禁用/启用切换调用 `userApi.updateUserStatus`；实现重置密码弹窗调用 `userApi.resetPassword`

### 11.2 实现管理员申请列表页
- [ ] 在 `client/src/pages/admin/AdminRequestList.jsx` 实现全量申请列表：状态筛选、分页、按提交时间倒序；展示提交人、目的地、出发/返回日期、状态、提交时间；每行提供"查看详情""通过""拒绝"操作入口

### 11.3 实现申请详情与审核页（管理员侧）
- [ ] 在 `client/src/pages/admin/AdminRequestDetail.jsx` 实现申请详情展示（含提交人信息）与审核操作区：通过（审核意见可选）、拒绝（审核意见必填）
- [ ] 调用 `reviewApi.approveRequest` / `reviewApi.rejectRequest`，处理 `STATE_CONFLICT` 与 `VALIDATION_ERROR`（拒绝意见缺失）错误提示

## 12. E2E 测试（Playwright MCP）

### 12.1 测试环境与数据准备
- [ ] 在 `tests/` 下配置 Playwright MCP 测试脚本与启动夹具：自动启动后端（含 `.env` 初始管理员配置）与前端 dev server，测试结束后清理
- [ ] 编写测试辅助模块：封装登录操作、创建员工、提交申请等常用流程，供各测试用例复用

### 12.2 认证流程 E2E 测试
- [ ] 编写登录登出测试：初始管理员用 `.env` 配置可登录成功；错误密码返回 `AUTH_INVALID_CREDENTIALS`；禁用账号登录返回 `AUTH_ACCOUNT_DISABLED`；登出后 token 失效，后续请求返回 401

### 12.3 员工管理 E2E 测试
- [ ] 编写员工管理测试：管理员创建员工成功；用户名冲突返回 `USER_NAME_CONFLICT`；编辑员工、禁用/启用、重置密码后员工可用新密码登录；普通员工访问 `/api/admin/users` 返回 403 `FORBIDDEN`

### 12.4 申请提交 E2E 测试
- [ ] 编写申请提交测试：员工提交合法申请成功且状态为"待审核"；返回日期早于出发日期返回 `VALIDATION_ERROR`；交通工具非枚举返回 `VALIDATION_ERROR`；费用为负返回 `VALIDATION_ERROR`；管理员提交申请返回 403

### 12.5 员工侧申请管理 E2E 测试
- [ ] 编写员工侧管理测试：本人列表按状态筛选与分页正确；查看他人申请返回 403；撤回待审核申请成功；撤回非待审核申请返回 `STATE_CONFLICT`；重新提交已拒绝申请生成新申请且原申请不变；重新提交非已拒绝申请返回 `STATE_CONFLICT`

### 12.6 管理员审核 E2E 测试
- [ ] 编写管理员审核测试：全量列表展示所有员工申请；通过待审核申请（意见可选）成功且状态变"已通过"；拒绝待审核申请（意见必填）成功；拒绝未填意见返回 `VALIDATION_ERROR`；审核非待审核申请返回 `STATE_CONFLICT`；审核记录写入审核人/审核时间/审核意见

### 12.7 权限隔离 E2E 测试
- [ ] 编写权限隔离测试：员工访问 `/api/admin/*` 接口全部返回 403；员工访问他人申请详情/撤回/重新提交返回 403；未认证访问业务接口返回 401

## 13. 集成构建与部署配置

### 13.1 生产构建与静态托管配置
- [ ] 配置 `client/` 构建脚本 `npm run build`，产物输出至 `server/public`；在 `server/src/app.js` 注册 Express 静态中间件托管 `server/public`，生产模式前后端同源单端口
- [ ] 在仓库根目录 `package.json` 配置聚合脚本：`install:all`（安装前后端依赖）、`dev:all`（并发启动前后端 dev）、`build`（前端构建）、`start`（后端启动托管前端产物）

### 13.2 环境配置与启动文档
- [ ] 完善 `.env.example`，列出全部配置项及取值说明（`PORT`、`INIT_ADMIN_USERNAME`、`INIT_ADMIN_PASSWORD`、`JWT_SECRET`、`JWT_EXPIRES_IN`、`DATA_DIR`）
- [ ] 在 `README.md` 编写启动说明：开发模式启动步骤、生产构建与启动步骤、初始管理员配置说明、数据文件目录说明

## 14. 审查与验证

### 14.1 代码审查
- [ ] 审查后端分层架构一致性：路由 → 控制器 → 服务 → 仓储 → 存储引擎调用链清晰，无跨层调用
- [ ] 审查安全实现：所有业务接口挂载认证与角色鉴权中间件；密码均 bcrypt 加密存储；响应均不含密码字段；关键操作均触发审计
- [ ] 审查前端路由守卫：未登录与角色不匹配均正确跳转；axios 拦截器正确处理 401 与业务错误码

### 14.2 设计一致性核对
- [ ] 核对接口清单：`design.md` 2.2 节列出的 16 个接口全部实现且路径、方法、请求/响应结构一致
- [ ] 核对数据模型：`User`/`TravelRequest`/`AuditLog`/`TokenBlacklistEntry` 字段与 `design.md` 2.3 节一致；枚举值与 spec 第 6 章数据约束对齐
- [ ] 核对状态机：申请状态流转（待审核→已通过/已拒绝/已撤回、已拒绝→重新提交生成新待审核）与 `design.md` 2.1.3.1 节一致，非法迁移均返回 `STATE_CONFLICT`

### 14.3 变更范围确认
- [ ] 确认全部 spec 第 5 章核心能力（登录登出、员工管理、申请提交、员工侧查看管理、管理员审核、系统初始化）均有对应实现任务与测试用例覆盖
- [ ] 确认 spec 第 4 章 DFX 约束（性能响应 ≤2s、列表上限 100、同步落盘、密码加密、权限隔离、审计、结构化日志、统一错误码）均在任务中体现
- [ ] 确认 spec 第 1.4 节职责边界外的功能（报销、多级审批、政策引擎、行程预订、组织架构、消息通知、统计报表、考勤核算）均未纳入本版本任务