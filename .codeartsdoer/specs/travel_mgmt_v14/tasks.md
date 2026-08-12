# 企业差旅管理系统 V1.4 编码任务规划（tasks.md）

> 版本：V1.4 ｜ 基线：V1.3（2026-08-12）｜ 对应需求：`.codeartsdoer/specs/travel_mgmt_v14/spec.md` ｜ 对应设计：`.codeartsdoer/specs/travel_mgmt_v14/design.md`（46 项文件级改动点）
> 定位：将 V1.4 技术设计（7A Dashboard 管理驾驶舱 / 7B 费用明细扩展 / 7C 审批流优化 / 7D 统计导出）转化为可执行、可验收的编码任务清单。
> 任务规划原则：垂直切割按业务功能分组；每个任务有明确完成标准；任务原子化；按依赖关系排序（被依赖者在前）；全项目 JS 技术栈（React+Vite+antd 前端、Express 后端、JSON 文件存储）。
> 验证约定：服务端契约验证用 `node:test`（`server/test/`）；交互与展示验证用 Playwright E2E（`tests/`，沿用 `helpers.js` 与 `playwright.config.js`）；其余标注「手动浏览器验证」。

---

## 任务总览

| 主任务 | 对应改动点 | 依赖 |
|-------|-----------|------|
| 1. 版本升级与依赖准备 | 18 / 30 / 43 | — |
| 2. 后端：费用明细校验与常量基础 | 7 / 11 / 16 | 1 |
| 3. 后端：费用明细落库与总费用口径 | 12 / 13 | 2 |
| 4. 后端：用户部门字段扩展 | 14 / 15 | 2 |
| 5. 后端：Dashboard 统计服务与接口 | 1 / 2 / 3 | 3、4 |
| 6. 后端：CSV 导出服务与接口 | 4 / 5 / 6 / 17 | 5 |
| 7. 后端：服务端自动化测试 | 8 / 9 / 10 | 5、6 |
| 8. 前端：i18n 资源与显示映射 | 40 / 41 / 42 / 29 | 2 |
| 9. 前端：API 封装与下载工具 | 26 / 27 / 28 | 8 |
| 10. 前端：布局菜单、路由与待办提醒 | 31 / 32 | 9 |
| 11. 前端：费用明细录入与展示 | 33 / 34 / 35 / 36 | 8、9 |
| 12. 前端：审批历史时间线 | 21 / 35 / 36 | 8、9 |
| 13. 前端：员工管理部门字段 | 39 | 8 |
| 14. 前端：Dashboard 驾驶舱页面 | 19 / 20 / 22 / 23 / 24 / 25 | 10、11 |
| 15. 前端：申请列表与统计导出入口 | 37 / 38 / 19 | 14 |
| 16. E2E 自动化测试 | 44 / 45 / 46 | 10~15 |
| 17. 集成验证与回归 | — | 16 |

---

## 1. 版本升级与依赖准备

**写作指导**
本任务组为全部后续任务的基础：同步 V1.4 版本号，并先行验证图表依赖 `@ant-design/charts` 与当前 `antd ^6.6.0` 的兼容性（设计 2.5 风险项）。

### 1.1 升级版本号至 1.4.0
- [ ] 将 `server/package.json`、`client/package.json`、根目录 `package.json` 的 `version` 同步为 `"1.4.0"`，保持 `server` 为唯一展示来源（spec 6.3-2）；验证：`npm pkg get version` 三处均为 1.4.0，`server/test/versionApi.test.js` 通过
- [ ] 更新 `CHANGELOG.md` 增加 V1.4 条目（四能力概述），并确保与 `server/package.json` 版本一致（spec 6.3-3）；验证：手动核对 CHANGELOG 顶部版本号

### 1.2 安装图表依赖并验证兼容性
- [ ] 在 `client/` 安装 `@ant-design/charts`（`^2.x`），执行 `npm run build` 冒烟验证与 antd v6 无 peer 依赖冲突（设计 2.5 风险表首项，先验证再编码）；验证：`client npm run build` 无依赖冲突报错；若存在不可调和冲突，记录并改走 2.1.3.7 降级方案（antd 原生 Statistic/Table + 轻量自绘），并同步调整任务 14
- [ ] 确认 `client/package.json` dependencies 含 `@ant-design/charts`；验证：手动核对依赖清单

## 2. 后端：费用明细校验与常量基础

**写作指导**
为费用明细（7B）与导出（7D）准备单一来源的常量与校验能力，全部为纯增量，不改变既有字段校验顺序与错误码语义（spec 1.4-9）。

### 2.1 新增费用类别枚举常量
- [ ] 新建 `server/src/constants/expenseCategories.js`，导出 `['交通', '住宿', '餐饮', '其他']`（7B-2、D-5，费用类别单一来源）；验证：`node -e "console.log(require('./server/src/constants/expenseCategories'))"` 输出四枚举

### 2.2 新增导出错误码
- [ ] 在 `server/src/constants/errorCodes.js` 新增 `EXPORT_TOO_LARGE: 'EXPORT_TOO_LARGE'`（仅导出接口使用，不改既有错误码语义，D-9）；验证：`node -e "require('./server/src/constants/errorCodes').EXPORT_TOO_LARGE"` 有值

### 2.3 validator.js 新增费用明细校验
- [ ] 在 `server/src/utils/validator.js` 新增 `validateExpenseItems(payload)`：未提供/非数组/空数组直接通过（7B-1/7B-11）；数组长度 >20 抛 `VALIDATION_ERROR`「费用明细数量不能超过20条」（7B-5）；每条校验 `category` 在枚举内（7B-2）、`amount` 为数字且 >0 且最多两位小数（7B-3，复用 estimatedCost 精度判定模式）、`description` 存在时长度 ≤200（7B-4）；失败统一抛 `BusinessError(VALIDATION_ERROR, 中文提示, 400)`；验证：后续任务 7.2 `expenseValidation.test.js` 全量用例通过

## 3. 后端：费用明细落库与总费用口径

**写作指导**
申请创建/重新提交透传可选 `expenseItems`，并建立全项目唯一费用口径 `totalCost`（7B-8、spec 4.4-7）。派生字段必须浅拷贝附加，禁止原地改内存对象（设计 1.2.1 约束）。

### 3.1 申请创建/重新提交透传费用明细
- [ ] 在 `server/src/services/requestService.js` 的 `createRequest` 与 `resubmitRequest` 中，于 `validateRequestFields` 之后追加 `validateExpenseItems(payload)`；`expenseItems` 存在且非空时浅拷贝写入申请对象，否则不写该字段（存量格式零变化，7B-1）；验证：手动构造带 2 条明细的申请请求，`server/data/requests.json` 正确落库 expenseItems

### 3.2 新增 totalCost 口径函数
- [ ] 在 `requestService.js` 新增内部函数 `getTotalCost(request)`：含非空 `expenseItems` 时返回明细金额之和（`Math.round(sum*100)/100` 保留两位），否则返回 `request.estimatedCost`（7A-7、7B-8 唯一口径实现）；验证：后续 7.1 `statsService.test.js` 费用口径用例通过

### 3.3 员工申请列表与详情附加派生字段
- [ ] 在 `requestService.js` 的 `listMyRequests` 与 `getMyRequest` 返回前，以浅拷贝附加 `totalCost`（经 `getTotalCost`）与 `reviewerName`（`userRepository.findByUsername(reviewerUsername)?.name`，缺失回退 username，7C-3），不改变既有字段；验证：`GET /api/requests` 与 `GET /api/requests/:id` 响应含 totalCost/reviewerName

### 3.4 管理员申请列表与详情附加派生字段
- [ ] 在 `server/src/services/reviewService.js` 的 `listAllRequests` 与 `getRequestDetail` 的 `enriched` 映射中，同样附加 `totalCost` 与 `reviewerName`（审批行为零改动）；验证：`GET /api/admin/requests` 与 `/api/admin/requests/:id` 响应含 totalCost/reviewerName

## 4. 后端：用户部门字段扩展

**写作指导**
`users` 新增可选 `department`（≤50 字符，D-3），支撑部门排行（7A-11）；不影响既有认证鉴权（spec 4.3-8）。

### 4.1 用户服务支持部门字段
- [ ] 在 `server/src/services/userService.js` 的 `createUser` 支持可选 `department`（非空时校验 `typeof string && length ≤ 50`，超长抛 `VALIDATION_ERROR(400)`；空/缺省不落字段）；`updateUser` 的 `updates` 支持 `department`（`''` 表示清空并落空串，沿用"有值才写"模式）；`sanitize` 后用户对象携带 `department`；审计 detail 在值变化时附加 department；验证：创建带部门员工、编辑清空部门、超长 51 字符拒绝

### 4.2 用户控制器透传部门字段
- [ ] 在 `server/src/controllers/userController.js` 的 `createUser`/`updateUser` 从 `req.body` 透传 `department`；验证：`POST /api/admin/users` 带 department 创建成功且响应含该字段，`PUT /api/admin/users/:id` 更新部门成功

## 5. 后端：Dashboard 统计服务与接口

**写作指导**
全新统计链路（7A/7C-4~6）：纯内存实时聚合、无快照、只读（spec 4.2-5/6）；按角色隔离数据（spec 4.3-5）；统计口径在 2.1.3.1 固化并文档化（spec 4.4-4）。

### 5.1 新增统计服务 statsService.js
- [ ] 新建 `server/src/services/statsService.js`，实现 `getAdminDashboard(months=6)`（核心指标 core：total/pending/approved/rejected/withdrawn/approvalRate 保留 1 位小数且分母为 0 时返回 '0%'（7A-5）；费用汇总 cost：totalCost/approvedCost/pendingCost 按 totalCost 口径分组求和（7A-6/7）；月度趋势 trend：按 submittedAt 自然月 YYYY-MM 分组、默认近 6 个月含当月、months 参数 3/12 生效（7A-8）；状态分布 statusDistribution 含占比且数量之和=总申请数（7A-9）；交通工具分布 transportDistribution 按 transports 枚举分组（7A-10）；部门排行 departmentRanking 空部门归入"未分配"、降序 Top 10（7A-11）；员工排行 employeeRanking 关联用户姓名、降序 Top 10（7A-12））、`getEmployeeStats(username, months=6)`（复用同一聚合函数按 submitterUsername 过滤，仅本人数据，7A-13）、`getPendingCount()`（待审核申请总数，7C-4）；金额求和保留两位；聚合仅读内存态不触发 write；JSDoc 类型标注；验证：后续 7.1 `statsService.test.js` 全量用例通过

### 5.2 新增统计控制器 statsController.js
- [ ] 新建 `server/src/controllers/statsController.js`，实现 `getDashboard`（透传并白名单校验 `months ∈ {3,6,12}`，缺省 6、非法回退 6）、`getMe`（硬编码按 `req.user.username` 过滤本人）、`getPendingCount` 三个处理器，用 `success()` 包装响应；验证：调用三个接口返回 `{ code: 0, data }` 结构且无 undefined 字段

### 5.3 新增统计路由 routes/stats.js
- [ ] 新建 `server/src/routes/stats.js`：`GET /api/stats/dashboard`（`authRequired`+`requireAdmin`）、`GET /api/stats/me`（`authRequired`+`requireEmployee`）、`GET /api/stats/pending-count`（`authRequired`+`requireAdmin`）；验证：未认证 401、员工访问 dashboard 403、员工访问 me 仅本人数据（7A-3）

## 6. 后端：CSV 导出服务与接口

**写作指导**
全新导出链路（7D）：UTF-8 含 BOM（D-8）、字段转义、双语列名、上限 5000 条（D-9）、后端生成文件流（D-10）、权限与列表查询一致（7D-7）。

### 6.1 新增 CSV 生成服务 csvService.js
- [ ] 新建 `server/src/services/csvService.js`：`toCsv(headers, rows, { lang })` 前置 `\uFEFF` BOM、含逗号/引号/换行/制表符字段双引号包裹并转义 `""`、金额两位小数、日期 ISO 原样；内置 `COLUMN_LABELS` 双语映射与业务值（状态/交通工具/费用类别）双语映射表（与 `displayMapping.js` 取值一致）；实现 `buildRequestExportCsv(requests, { lang })`（字段：提交人/目的地/出发日期/返回日期/事由/交通工具/总费用/状态/提交时间/审核人/审核时间/审核意见，提交人/审核人以"姓名(username)"格式，spec 6.10-1）与 `buildStatsSnapshotCsv(stats, { lang })`（核心指标/月度趋势/状态分布/交通工具分布/部门排行/员工排行分区块、空行分隔、区块标题双语，7D-5）；验证：后续 7.3 `csvExport.test.js` 用例通过

### 6.2 新增导出控制器 exportController.js
- [ ] 新建 `server/src/controllers/exportController.js`，实现 `exportMyRequests`（复用 `listMyRequests` 过滤口径：本人 + status 筛选、忽略分页、导出全部符合筛选记录，7D-1/4）、`exportAdminRequests`（复用 `listAllRequests` 口径，7D-2）、`exportAdminStats`（复用 `getAdminDashboard` 全量结果，7D-5）；导出前校验记录数 >5000 抛 `BusinessError(EXPORT_TOO_LARGE, '数据量过大，请缩小筛选范围后重试', 400)`（D-9）；接收 `lang` 查询参数（白名单 `zh-CN|en-US`，缺省/非法回退 `zh-CN`）；响应 `Content-Type: text/csv; charset=utf-8` 与 `Content-Disposition: attachment`（文件名 `travel-requests-YYYYMMDD-HHmmss.csv` / `travel-stats-YYYYMMDD-HHmmss.csv`，RFC 5987 编码）；验证：后续 7.3 `csvExport.test.js` 用例通过

### 6.3 新增导出路由 routes/export.js
- [ ] 新建 `server/src/routes/export.js`：`GET /api/requests/export`（`requireEmployee`）、`GET /api/admin/requests/export`、`GET /api/admin/stats/export`（均 `requireAdmin`）；验证：未认证调用导出 401（7D-7）、员工调用 admin 导出 403

### 6.4 挂载统计与导出路由
- [ ] 在 `server/src/app.js` 挂载 `/api/stats` 与 `/api/export` 路由（与既有路由并列、errorHandler 之前），保证 `app.get('*')` 对 `/api` 前缀 `next()` 不受影响；验证：`npm start` 后新接口可达，既有接口回归正常

## 7. 后端：服务端自动化测试

**写作指导**
`node:test` 承担统计口径、明细校验、CSV 生成与导出权限的契约验证（设计 2.6.1）；沿用既有隔离约定（临时 DATA_DIR、强 JWT_SECRET、after 清理）。

### 7.1 统计服务单测 statsService.test.js
- [ ] 新建 `server/test/statsService.test.js`，覆盖：通过率公式（分母为 0 返回 0%、保留 1 位小数，7A-5）；费用口径（含明细按合计、无明细按 estimatedCost，7A-7/7B-8）；趋势（按自然月聚合、默认近 6 个月含当月、months 3/12 生效）；状态分布数量之和=总申请数；部门排行空部门归入"未分配"、降序 Top 10；员工排行关联姓名；`getEmployeeStats` 仅含本人数据（7A-13、spec 4.3-5）；`getPendingCount` 等于待审核总数；验证：`cd server && node --test test/statsService.test.js` 全部通过

### 7.2 费用明细校验单测 expenseValidation.test.js
- [ ] 新建 `server/test/expenseValidation.test.js`，覆盖：无明细/空数组通过（7B-1）；21 条拒绝（7B-5）；类别非法拒绝（7B-2）；金额 0/负数/超两位小数拒绝（7B-3）；说明 201 字符拒绝（7B-4）；含明细创建后 expenseItems 正确落库且响应 totalCost=明细合计；验证：`cd server && node --test test/expenseValidation.test.js` 全部通过

### 7.3 CSV 生成与导出接口单测 csvExport.test.js
- [ ] 新建 `server/test/csvExport.test.js`，覆盖：UTF-8 BOM 前缀存在（7D-6）；含逗号/引号/换行字段正确转义；列名随 lang 双语；员工导出仅本人数据、管理员导出全量/按状态筛选（7D-1/2/4）；超 5000 条返回 `EXPORT_TOO_LARGE(400)`（D-9）；统计快照含六大区块（7D-5）；未认证 401、越权 403（7D-7）；验证：`cd server && node --test test/csvExport.test.js` 全部通过

## 8. 前端：i18n 资源与显示映射

**写作指导**
新增页面/文案完整支持中英双语（7A-15/7C-9，spec 4.4-2/3）；两套资源键严格一致；新增命名空间 `dashboard`/`expense`/`timeline`/`export` 及既有命名空间增量键（设计 1.2.5）。

### 8.1 中文本地化资源扩展
- [ ] 在 `client/src/locales/zh-CN.js` 新增 `dashboard` 命名空间（页面标题、指标名、费用汇总、图表标题/图例/Tooltip/空态、时间范围选项、`unassigned` 部门分组标签、导出统计按钮）、`expense` 命名空间（费用明细、类别、金额、说明、明细合计、新增/删除明细按钮、各校验提示）、`timeline` 命名空间（提交/待审核/已通过/已拒绝/已撤回/审核人/审核时间/审核意见/无审核意见）、`export` 命名空间（导出按钮、导出中、导出成功/失败提示、数据量过大提示、无数据提示），以及 `layout`（数据看板/我的统计菜单、待办提醒）、`table`/`form`/`common` 增量键；验证：`zh-CN.js` 可正常 import 且键齐全

### 8.2 英文本地化资源扩展
- [ ] 在 `client/src/locales/en-US.js` 新增与 zh-CN 键完全一致的英文资源（Dashboard/My Stats、Expense Items、Approval History、Export 等全部对应文案）；验证：两文件顶层命名空间键集合一致（可用脚本比对，沿用 i18n.test.js 模式）

### 8.3 显示映射新增费用类别
- [ ] 在 `client/src/utils/displayMapping.js` 的 `DISPLAY_MAP` 新增费用类别映射（交通/住宿/餐饮/其他 → {zh, en}）；"未分配"分组标签走 i18n `dashboard:unassigned`，不入 DISPLAY_MAP（设计 1.2.5）；验证：`displayText('交通')` 按语言返回正确文案

### 8.4 前端费用类别常量
- [ ] 新建 `client/src/constants/expenseCategories.js`，导出 `['交通','住宿','餐饮','其他']`（与后端枚举同源镜像，下拉数据源）；验证：手动核对与 `server/src/constants/expenseCategories.js` 一致

## 9. 前端：API 封装与下载工具

**写作指导**
统计走既有 axios `client.js`（不改造）；导出因需 Blob，用原生 fetch 独立封装（设计 1.2.5，避免影响既有拦截器）。

### 9.1 统计 API 封装
- [ ] 新建 `client/src/api/stats.js`，导出 `getAdminDashboard(months=6)`、`getEmployeeStats(months=6)`、`getPendingCount()`（axios 封装，走既有 client.js）；验证：登录后调用返回解包后的 `data` 结构

### 9.2 导出 API 封装
- [ ] 新建 `client/src/api/export.js`，用原生 `fetch` 封装 `exportMyRequests(params)`、`exportAdminRequests(params)`、`exportAdminStats(params)`（携带 Authorization 头与 `lang` 参数，成功返回 Blob，非 ok 时解析 JSON 错误体抛错含 code/message）；验证：浏览器 DevTools 观察导出请求带 Authorization 与 lang 参数

### 9.3 下载工具
- [ ] 新建 `client/src/utils/download.js`，实现 `downloadBlob(blob, filename)`（`URL.createObjectURL` + 临时 `<a download>` 触发 + revokeObjectURL 释放）；验证：手动点击导出触发浏览器下载且文件名正确

## 10. 前端：布局菜单、路由与待办提醒

**写作指导**
在既有布局上增量挂载 Dashboard 入口（7A-1/2）与管理员待办 Badge（7C-4~6，D-7/D-11）；路由复用既有守卫满足越权重定向（7A-3）。

### 10.1 新增 Dashboard 路由
- [ ] 在 `client/src/App.jsx` 路由表新增 `/employee/dashboard`（`EmployeeRoute` 包裹）与 `/admin/dashboard`（`AdminRoute` 包裹），`*` 兜底重定向不变；验证：员工访问 `/admin/dashboard` 被重定向到 `/employee/requests`，管理员反向同理（7A-3）

### 10.2 菜单与选中态扩展
- [ ] 在 `client/src/components/Layout.jsx` 的 `MENU_BY_ROLE` 为员工追加 `/employee/dashboard`（"我的统计"）、为管理员追加 `/admin/dashboard`（"数据看板"）；`selectedKey` 推导追加 `/admin/dashboard` 与 `/employee/dashboard` 前缀分支；验证：手动点击菜单进入对应页面且菜单高亮正确（7A-1/2）

### 10.3 管理员待办 Badge 提醒
- [ ] 在 `Layout.jsx` Header 的 Space 内（语言切换与版本号之间）为管理员渲染 `Badge count={pendingCount}`（count 为 0 时 `showZero` 显示 0，7C-6）；挂载时 `useEffect` 首次拉取 `getPendingCount()`；监听 `useLocation().pathname` 路由变化重新拉取（D-11）；监听 `window` 的 `pending-count-refresh` 事件重新拉取；拉取失败静默隐藏 Badge 不阻塞主界面（spec 5.10.3-1）；仅 `user.role === ADMIN` 发起请求；验证：后续 12.3 审核完成后徽标数量实时减少（7C-5）

## 11. 前端：费用明细录入与展示

**写作指导**
申请表单支持 0~N 条明细录入与实时合计（7B-6/7）；详情页展示明细列表与合计、总费用统一消费 `totalCost`（7B-8/9/10）；存量无明细申请不报错（7B-11）。

### 11.1 新建申请表单费用明细区
- [ ] 在 `client/src/pages/employee/NewRequest.jsx` 表单新增 `Form.List` 费用明细编辑区：每条明细含类别 `Select`（选项来自前端 expenseCategories 常量，7B-2）、金额 `InputNumber`（min=0、precision=2）、说明 `Input`（maxLength 200）、删除按钮；提供"新增明细"按钮；明细下方实时展示合计（各条金额之和，7B-7）；提交时明细随 `expenseItems` 一并提交；不录明细时正常提交（7B-1）；验证：后续 16.2 `expenseDetail.test.js` 用例通过；手动验证实时合计与增删改

### 11.2 重新提交表单费用明细区
- [ ] 在 `client/src/pages/employee/ResubmitRequest.jsx` 复用同一明细编辑能力，进入页面时回填原申请 `expenseItems`（重新提交可修改明细，7B-6），明细合计随编辑实时更新；验证：后续 16.2 `expenseDetail.test.js` 用例通过

### 11.3 员工详情页费用明细展示
- [ ] 在 `client/src/pages/employee/RequestDetail.jsx` 新增费用明细区块：展示每条明细（类别/金额/说明）与明细合计，费用展示统一使用响应中的 `totalCost`（7B-8/9/10）；无明细时展示空态不报错（7B-9b/11）；验证：后续 16.2 `expenseDetail.test.js` 用例通过

### 11.4 管理员详情页费用明细展示
- [ ] 在 `client/src/pages/admin/AdminRequestDetail.jsx` 同样新增费用明细区块（类别/金额/说明/合计，消费 totalCost），无明细空态兼容；验证：手动以管理员查看含明细申请详情正常展示

## 12. 前端：审批历史时间线

**写作指导**
由既有字段推导时间线（D-6），不新增历史数组；覆盖全部状态、兼容存量申请（7C-1/2/3/7）；双语（7C-9）。

### 12.1 审批历史时间线组件
- [ ] 新建 `client/src/components/ApprovalTimeline.jsx`，入参 `{ request }`，基于 `submittedAt` + 审核字段（reviewerUsername/reviewedAt/reviewComment，含 `reviewerName` 派生字段）推导节点：待审核=提交节点+"待审核"标注（7C-2）；已通过=提交+通过（含审核人/时间/意见）；已拒绝=提交+拒绝（error 色）；已撤回=提交+撤回说明（7C-7）；不虚构任何节点（7C-3）；审核意见为空显示 `detail:noComment`；时间用 `formatDateTime`；文案全走 `timeline` 命名空间；验证：后续 16.2 `expenseDetail.test.js` 用例通过

### 12.2 员工详情页挂载时间线
- [ ] 在 `client/src/pages/employee/RequestDetail.jsx` 将审批状态区升级为 `ApprovalTimeline`（保留 Steps 作顶部状态概览或并列展示，数据同源）；验证：手动打开待审核/已通过/已拒绝/已撤回申请均正确渲染时间线（7C-1/2）

### 12.3 管理员详情页挂载时间线并触发待办刷新
- [ ] 在 `client/src/pages/admin/AdminRequestDetail.jsx` 挂载 `ApprovalTimeline`；审批成功回调中 `window.dispatchEvent(new Event('pending-count-refresh'))` 触发待办徽标刷新（D-11、7C-5）；验证：管理员完成一次审批后回到列表，Header 待办徽标数量相应减少

## 13. 前端：员工管理部门字段

**写作指导**
员工管理支持部门录入与展示（7A-11 数据基础的前端部分，spec 6.2-6）。

- [ ] 在 `client/src/pages/admin/AdminUsers.jsx` 创建/编辑 Modal 增加部门字段（`Input`，maxLength 50，可选，编辑时预填原值、空串清空）；列表新增部门列（空值显示 `-` 或 i18n"未分配"文案）；验证：手动创建带部门员工、编辑部门、清空部门后列表与详情正确展示；后续 16.1 `dashboard.test.js` 部门排行含"未分配"分组用例依赖此数据

## 14. 前端：Dashboard 驾驶舱页面

**写作指导**
全新图表页面（7A，D-1）；指标卡片/费用汇总/趋势/分布/排行复用组件化；空态与错误降级不白屏（7A-16）；图表懒加载避免首屏阻塞（设计 2.5）。

### 14.1 图表复用组件 stat/*
- [ ] 新建 `client/src/components/stat/StatCards.jsx`（`Card`+`Statistic` 指标卡片行，含通过率百分比展示）、`TrendChart.jsx`（Ant Design Charts `Line`，申请数量/费用双系列，双 Y 轴或归一化，含 Tooltip/图例）、`DistributionCharts.jsx`（状态分布 `Pie` 含占比 Tooltip + 交通工具分布 `Column`）、`RankingLists.jsx`（部门/员工排行 `Table`/`List` Top 10 降序）；组件统一接收 `data`/`loading` 纯展示，空数据显示 `Empty`；全部文案走 i18n（7A-15）；验证：后续 16.1 `dashboard.test.js` 用例通过；手动在 zh/en 下检查图表标题/图例/Tooltip

### 14.2 管理员驾驶舱页面
- [ ] 新建 `client/src/pages/admin/AdminDashboard.jsx`（路由 `/admin/dashboard`，`AdminRoute` 守卫）：顶部六项指标卡片（总申请数/待审核/已通过/已拒绝/已撤回/审批通过率，7A-4/5）+ 费用汇总（总预计费用/已通过申请费用/待审核申请费用，`formatCurrency` 千分位两位小数，7A-6）；工具栏时间范围切换 `Select`（近 3/6/12 月，7A-8）与"导出统计"按钮（7D-5 入口）；图表区复用 stat/* 组件（趋势/状态分布/交通工具分布）；排行区部门/员工排行（7A-11/12）；数据经 `getAdminDashboard(months)` 拉取，`Spin` 加载、失败 `Alert`+重试按钮（7A-16）；页面标题/图表文案全走 i18n；验证：后续 16.1 `dashboard.test.js` 用例通过

### 14.3 员工个人驾驶舱页面
- [ ] 新建 `client/src/pages/employee/EmployeeDashboard.jsx`（路由 `/employee/dashboard`，`EmployeeRoute` 守卫）：本人指标卡片（申请总数/待审核/已通过/已拒绝/已撤回）、本人费用汇总、本人月度趋势、本人状态分布（7A-13）；数据仅经 `getEmployeeStats(months)`（spec 4.3-5）；空态/错误降级同 14.2；验证：后续 16.1 `dashboard.test.js` 员工用例通过（本人数据 ≠ 全量数据）

## 15. 前端：申请列表与统计导出入口

**写作指导**
三个导出入口（7D-1/2/5），复用 `api/export.js` + `download.js`，携带当前筛选与语言；失败明确提示不产生空文件（7D-8）。

### 15.1 员工申请列表导出按钮
- [ ] 在 `client/src/pages/employee/EmployeeRequestList.jsx` 工具栏增加"导出 CSV"按钮：调用 `exportMyRequests`（携带当前 status 筛选与当前语言），成功 `downloadBlob` 触发下载，失败按错误码 Toast 提示（超 5000 条提示缩小范围）；导出中禁用按钮防重复点击；验证：后续 16.3 `exportFlow.test.js` 用例通过

### 15.2 管理员申请列表导出按钮
- [ ] 在 `client/src/pages/admin/AdminRequestList.jsx` 工具栏增加"导出 CSV"按钮：调用 `exportAdminRequests`（携带当前 status 筛选与语言），行为与 15.1 一致；验证：后续 16.3 `exportFlow.test.js` 用例通过

### 15.3 管理员驾驶舱导出统计按钮
- [ ] 在 `AdminDashboard.jsx` 的"导出统计"按钮接入 `exportAdminStats`（携带当前语言），成功下载 `travel-stats-*.csv`；验证：后续 16.3 `exportFlow.test.js` 用例通过

## 16. E2E 自动化测试

**写作指导**
Playwright E2E 承担用户可感知的交互与展示路径验证（设计 2.6.2），沿用 `tests/helpers.js` 与 `playwright.config.js`；真实并发/权限隔离由服务端 node:test 兜底。

### 16.1 Dashboard 驾驶舱 E2E
- [ ] 新建 `tests/dashboard.test.js`：管理员打开 `/admin/dashboard` 展示六项指标卡片且数值与列表一致（7A-4/5）；切换时间范围后趋势图刷新（7A-8）；状态分布数量之和等于总申请数（7A-9）；部门排行含"未分配"分组（7A-11）；员工访问 `/admin/dashboard` 被重定向（7A-3）；接口失败时展示错误提示与重试、不白屏（7A-16）；en-US 下图表标题/图例/指标名为英文（7A-15）；员工 `/employee/dashboard` 仅本人指标与状态分布、不等于全量（7A-13）；验证：`cd tests && npx playwright test dashboard.test.js` 全部通过

### 16.2 费用明细与审批时间线 E2E
- [ ] 新建 `tests/expenseDetail.test.js`：新建申请录入多条明细→提交成功→详情页展示明细列表与合计（7B-6/7/9）；明细合计即列表费用列与详情总费用（7B-10）；不录明细提交成功且无明细区域（7B-1）；金额为 0/类别非法提示对应错误（7B-2/3）；重新提交回填并修改明细（7B-6）；存量无明细申请详情不报错（7B-11）；审批历史时间线：待审核展示"提交+待审核"节点（7C-2）、已审核展示审核人/时间/意见（7C-1）、最终节点与当前状态一致（7C-7）、en-US 下时间线文案为英文（7C-9）；管理员完成审核后待办徽标数量减少（7C-5）；验证：`cd tests && npx playwright test expenseDetail.test.js` 全部通过

### 16.3 导出流程 E2E
- [ ] 新建 `tests/exportFlow.test.js`：员工"我的申请"导出 CSV 触发下载且仅含本人记录（7D-1）；管理员"申请审核"导出按当前筛选（7D-2/4）；管理员"数据看板"导出统计快照（7D-5）；下载文件以 BOM 开头、含中文列名、Excel 可解析（7D-6）；导出接口未认证被拒（7D-7）；导出失败前端明确提示、无空文件（7D-8）；验证：`cd tests && npx playwright test exportFlow.test.js` 全部通过

## 17. 集成验证与回归

**写作指导**
最终验证确保交付质量：既有自动化测试全量回归（spec 4.5-3 兼容承诺）、设计回顾与变更确认（设计 2.5 风险项逐项核销）。

### 17.1 既有测试全量回归
- [ ] 服务端既有 `node:test` 全量通过：`cd server && node --test test/`（auth/blacklistCleanup/secretValidator/startupValidation/userConcurrency/versionApi 等）；验证：无失败用例
- [ ] 既有 Playwright E2E 全量回归通过：`cd tests && npx playwright test`（auth/userManagement/adminReview/requestSubmit/permission/employeeManage/hardening/i18n/versionDisplay 等）；验证：无失败用例（spec 4.5-3）
- [ ] 前端构建与冒烟：`cd client && npm run build` 无报错，生产构建可访问；验证：构建产物正常加载

### 17.2 手动浏览器验证与设计回顾
- [ ] 双语完整性抽查：zh-CN 与 en-US 下逐页检查新增页面（Dashboard/费用明细/审批时间线/导出提示）无系统固有中文残留（7A-15/7C-9）；验证：en-US 页面文案全部英文
- [ ] 权限与安全抽查：员工无法访问管理员页面与统计/导出接口、导出 CSV 不含密码哈希等敏感字段（spec 4.3-5/6/7）；验证：DevTools 与下载文件核对
- [ ] 存量兼容抽查：查看 V1.3 存量申请（无明细/无部门/仅单次审核字段）在列表/详情/统计/导出中均正常展示与计算（7B-11/7C-3）；验证：手动逐项核对
- [ ] 设计实现一致性回顾：对照 design.md 2.4 改动点清单 46 项逐项核销（新增/修改文件均在位、无越界改动），确认"明确不改动"清单文件零改动（设计 2.4 末尾）；验证：`git status` 核对变更文件集合
- [ ] 变更确认：向用户汇总 V1.4 交付内容（四能力 + 6 个新增接口 + 测试结果），确认无误后完成版本收尾（CHANGELOG/tag 由发布流程执行）；验证：交付清单与用户确认

---

## 覆盖矩阵（需求 ↔ 任务）

| 需求 | 覆盖任务 | 需求 | 覆盖任务 |
|------|---------|------|---------|
| 7A-1/2 | 10.2、14.2/14.3 | 7B-1 | 2.3、3.1、11.1、16.2 |
| 7A-3 | 10.1、5.3、16.1 | 7B-2 | 2.1/2.3、8.4、11.1、16.2 |
| 7A-4/5 | 5.1、7.1、14.2、16.1 | 7B-3 | 2.3、7.2、11.1、16.2 |
| 7A-6/7 | 5.1、7.1、14.2 | 7B-4 | 2.3、7.2 |
| 7A-8 | 5.1、7.1、14.1/14.2、16.1 | 7B-5 | 2.3、7.2 |
| 7A-9 | 5.1、7.1、14.1、16.1 | 7B-6/7 | 11.1/11.2、16.2 |
| 7A-10 | 5.1、7.1、14.1 | 7B-8 | 3.2/3.3/3.4、7.1、11.3/11.4 |
| 7A-11 | 4、13、5.1、7.1、16.1 | 7B-9 | 11.3/11.4、16.2 |
| 7A-12 | 5.1、7.1、14.2 | 7B-10 | 3、11.3/11.4、16.2 |
| 7A-13 | 5.1、7.1、14.3、16.1 | 7B-11 | 2.3、3.1、11.3、16.2、17.2 |
| 7A-14 | 5.1（实时聚合） | 7C-1/2/3 | 12.1/12.2、16.2 |
| 7A-15 | 8、14、16.1、17.2 | 7C-4 | 5.1、10.3 |
| 7A-16 | 14.2/14.3、16.1 | 7C-5 | 10.3、12.3、16.2 |
| 7D-1 | 6、15.1、16.3 | 7C-6 | 10.3 |
| 7D-2/4 | 6.2/6.3、15.2、16.3 | 7C-7 | 12.1、16.2 |
| 7D-3 | 6.1 | 7C-8 | 3.4（审批行为零改动）+ 17.1 回归 |
| 7D-5 | 6.1/6.2、15.3、16.3 | 7C-9 | 8、12.1、16.2、17.2 |
| 7D-6 | 6.1、7.3、16.3 | 7D-7 | 6.2/6.3、7.3、16.3 |
| 7D-8 | 6.2、15、16.3 | 7D | 6（5000 上限 EXPORT_TOO_LARGE） |