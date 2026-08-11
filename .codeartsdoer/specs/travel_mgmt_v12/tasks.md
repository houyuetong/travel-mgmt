# 企业差旅管理系统 V1.2 编码任务清单（tasks.md）

> 版本：V1.2 ｜ 基线：V1.1（加固版，2026-08-11）｜ 历史：V1.0（2026-08-11）
> 对应文档：`docs/spec.md`（V1.1 23 条 + V1.2 5A 13 条 + 5B 11 条）、`docs/design.md`（V1.1 16 项改动点 + V1.2 增量设计）
> 本文档组织：**第一部分 V1.2 任务清单（T19–T34，当前版本执行依据）**；**第二部分 V1.1 历史任务清单（T1–T18，原样保留，供版本追溯）**
> 任务拆解原则：垂直切割（按业务功能分组）、原子可验证（每任务含完成标准与验证命令）、按依赖排序（被依赖者在前）；工程任务（git 操作）标注明确命令。

## V1.2 任务总览

| 分组 | 任务范围 | 主任务编号 | 对应需求 |
|------|---------|-----------|---------|
| 9. 版本号后端能力 | versionProvider 缓存、VERSION_UNAVAILABLE 错误码、meta 路由/控制器、app.js 挂载 | T19–T22 | 5B-1/3/4/5 |
| 10. 版本号同步与前端展示 | 三处 package.json 升级 1.2.0、api/meta.js、useVersion hook、Login/Layout 展示 | T23–T27 | 5B-1/2/6/7/8/9/10 |
| 11. 服务端版本接口测试 | versionApi.test.js（node:test） | T28 | 5B-1/3/4/5 |
| 12. E2E 版本展示测试 | versionDisplay.test.js（Playwright） | T29 | 5B-2/6/7/8/9 |
| 13. 分支管理工程 | 补建 release/v1.0、release/v1.1 分支、BRANCHING.md 文档 | T30–T31 | 5A-7/13 |
| 14. 整体回归验证 | 全量测试与手工验证 | T32 | 5B-11 |
| 15. 版本发布与收尾 | CHANGELOG [1.2.0]、git 提交推送、tag v1.2、release/v1.2 | T33–T34 | 5A-1~6/8/12 |

> **依赖与并行说明**：
> - **可并行（无依赖）**：T19、T20、T23、T24、T30、T31 相互独立，可并行执行；
> - **先后依赖**：T21 ← {T19, T20}；T22 ← T21；T25 ← T24；T26/T27 ← T25；T28 ← {T19, T21, T22, T23}；T29 ← {T23, T26, T27}（另需后端接口可用）；T32 ← {T28, T29}；T33 ← T23（须在 T34 前）；T34 ← {T30, T31, T32, T33}；
> - **关键路径**：后端链 T19→T20→T21→T22→T28→T32→T34 与前端链 T24→T25→T26/T27→T29→T32→T34 两条，建议前后端并行推进；
> - **同文件编辑约束**：T21 与 T22 均属 meta 链路新增（routes/meta.js、app.js 挂载），建议由同一开发者连续完成。

---

# 第一部分：V1.2 任务清单（T19–T34）

## 9. 版本号后端能力（5B 后端链路）

### T19 新增 `server/src/utils/versionProvider.js` 版本号提供器（启动缓存）
- **涉及文件**：`server/src/utils/versionProvider.js`（新增）
- **任务描述**：
  1. 实现 `createVersionProvider(packagePath)` 工厂函数，默认读取 `server/package.json`（路径 `path.join(__dirname, '..', '..', 'package.json')`），返回 `{ getVersion() }`；
  2. `getVersion()` 首次调用时 `fs.readFileSync` + `JSON.parse` 读取 `version` 字段，并用正则 `/^\d+\.\d+\.\d+$/` 校验 X.Y.Z 格式（spec 6.3-1）；
  3. 模块级缓存：首次读取后缓存于闭包变量，后续调用直接返回缓存值，进程生命周期内不再读文件（design 4.1.3，5B-1 单一事实来源）；
  4. 容错：文件缺失 / JSON 解析失败 / version 缺失或格式非法 → 缓存 null 并输出 `logger.error('META', 'Failed to load version', ...)`，**不阻断启动**（spec 4.2-4 版本功能可降级）；
  5. 导出默认单例 `versionProvider`（供 app.js 与 metaController 使用），同时导出工厂函数供测试注入。
- **完成标准**：
  - `getVersion()` 返回 server/package.json 的 version（T23 升级后为 `1.2.0`）；
  - 连续调用仅读取一次文件（可通过修改 package.json 后取值不变验证缓存）；
  - package.json 缺失/version 非法时返回 null 且不抛错、输出 ERROR 日志；
- **验证方式**：`cd server && node -e "console.log(require('./src/utils/versionProvider').getVersion())"` 输出 1.2.0（T23 升级后）；正式验证由 T28 用例覆盖。
- **依赖**：无

### T20 新增 `VERSION_UNAVAILABLE` 错误码
- **涉及文件**：`server/src/constants/errorCodes.js`
- **任务描述**：新增常量 `VERSION_UNAVAILABLE: 'VERSION_UNAVAILABLE'`，仅版本接口使用（versionProvider 返回 null 时由 metaController 抛出，spec 5.5.3-2）；既有对外错误码集合保持不变。
- **完成标准**：常量存在且被 metaController（T21）引用；既有错误码语义不变。
- **验证方式**：`cd server && node -e "console.log(require('./src/constants/errorCodes').VERSION_UNAVAILABLE)"` 输出 VERSION_UNAVAILABLE；T28 用例断言 500 + code=VERSION_UNAVAILABLE。
- **依赖**：无

### T21 新增 `server/src/controllers/metaController.js` 与 `server/src/routes/meta.js`（GET /api/meta/version 免鉴权）
- **涉及文件**：`server/src/controllers/metaController.js`（新增）、`server/src/routes/meta.js`（新增）
- **任务描述**：
  1. `metaController.getVersion(req, res, next)`：调用 `versionProvider.getVersion()`，返回 `res.json(success({ version }))`（即 `{ code: 0, data: { version } }`，design 4.2.2-A）；
  2. version 为 null 时 `next(new BusinessError(VERSION_UNAVAILABLE, '版本信息不可用', 500))` → errorHandler 返回 500 + `{ code: 'VERSION_UNAVAILABLE', message: '版本信息不可用' }`；
  3. `routes/meta.js`：`router.get('/version', metaController.getVersion)`，**不挂 `authRequired`/`requireAdmin` 中间件**（5B-4 免鉴权，与 /api/auth/login 同属公开路径）。
- **完成标准**：匿名 GET /api/meta/version 返回 200 + `{ code: 0, data: { version } }`；版本不可用时返回 500 + `VERSION_UNAVAILABLE`；接口为公开只读、不返回敏感业务数据（spec 4.3-5）。
- **验证方式**：`cd server && node --test test/versionApi.test.js`（T28）全通过。
- **依赖**：T19、T20

### T22 在 `server/src/app.js` 挂载 `/api/meta` 并启动预热版本缓存
- **涉及文件**：`server/src/app.js`
- **任务描述**：
  1. 文件头部引入 `versionProvider` 与 `metaRoutes`；
  2. `startServer()` 中、`app.listen()` 之前调用一次 `versionProvider.getVersion()` 触发启动预热缓存（design 4.1.3，listen 前）；
  3. 与既有路由并列挂载 `app.use('/api/meta', metaRoutes)`（位于 errorHandler 之前、SPA fallback 之前；`app.get('*')` 对 `/api` 前缀直接 `next()`，版本接口不被 SPA 兜底吞掉）；
  4. 不改动 `authRequired`/`errorHandler` 及既有路由任何行为。
- **完成标准**：服务启动日志正常；`/api/meta/version` 匿名可访问且返回版本号；既有接口行为不变（5B-11）。
- **验证方式**：`cd server && node src/app.js` 启动后访问 `http://localhost:3001/api/meta/version` 返回 `{code:0,data:{version:"1.2.0"}}`；T28 用例覆盖。
- **依赖**：T21

## 10. 版本号同步与前端展示（5B 前端链路）

### T23 三处 package.json 版本号同步升级为 1.2.0
- **涉及文件**：`package.json`（根）、`client/package.json`、`server/package.json`
- **任务描述**：将三处 `version` 字段由 `1.0.0` 统一改为 `1.2.0`（design 4.1.4 已确认决策 4）；展示唯一来源仍为 `server/package.json`，client/根 package.json 仅同步元数据不参与展示（5B-1/5B-10）。
- **完成标准**：三处 version 均为 `"1.2.0"`；server/package.json 的 version 与 CHANGELOG [1.2.0]、tag v1.2 保持一致（spec 6.3-3）。
- **验证方式**：`node -e "console.log(require('./package.json').version)"` 等三处输出 1.2.0；T28/T29 断言接口与页面展示 v1.2.0。
- **依赖**：无

### T24 新增 `client/src/api/meta.js` 封装版本号请求
- **涉及文件**：`client/src/api/meta.js`（新增）
- **任务描述**：新增 `export const fetchVersion = () => apiClient.get('/meta/version')`；经既有 apiClient（baseURL=/api、响应拦截器已解包 response.data）resolve 为 `{ code: 0, data: { version } }`，取 `.data.version`（design 4.2.2-A 调用示例）；不修改 `client/src/api/client.js`。
- **完成标准**：fetchVersion 返回 Promise，成功时结构为 `{ code, data: { version } }`。
- **验证方式**：由 T25/T29 间接验证；浏览器 Network 面板确认请求 /api/meta/version。
- **依赖**：无

### T25 新增 `client/src/hooks/useVersion.js`（模块级单例缓存 + 失败静默降级）
- **涉及文件**：`client/src/hooks/useVersion.js`（新增）
- **任务描述**：按 design 4.1.3 前端设计实现：
  1. 模块级单例 `versionPromise`：首次调用 `loadVersion()` 时执行 `fetchVersion().then(res => res.data.version).catch(() => null)`，结果 Promise 缓存复用（登录页与 Layout 共享同一请求与结果，5B-8 同源一致，全运行实例仅一次请求）；
  2. `useVersion()` hook：`useState(null)` + `useEffect`（带 mounted 防泄漏标志），从单例 Promise 取版本号；
  3. 返回 `version ? \`v${version}\` : null`（1.2.0 → v1.2.0，5B-2）；version 为空/非法时返回 null 隐藏；
  4. 失败静默降级：`.catch(() => null)` 吞掉一切异常（网络错误/500/超时），不抛出、不弹 Toast、不跳转、不影响登录/主界面使用（5B-9）；
  5. 不引入任何状态库（无 Redux/Zustand，React 18 原生 useState + 模块级单例即可）。
- **完成标准**：两处组件共享同一接口响应与版本值；接口失败时返回 null 且页面正常；刷新页面可重试。
- **验证方式**：`cd tests && npx playwright test versionDisplay.test.js`（T29）覆盖展示与降级用例。
- **依赖**：T24

### T26 在 `client/src/pages/Login.jsx` 卡片底部展示版本号
- **涉及文件**：`client/src/pages/Login.jsx`
- **任务描述**：引入 `useVersion` hook；在卡片内 `</form>` 之后新增版本号区域，`{version && <div style=…>{version}</div>}`（design 4.1.3）；version 为 null（加载中/失败）时不渲染任何占位；不改动表单与登录逻辑。
- **完成标准**：登录页卡片底部可见 `v1.2.0`（5B-6）；版本接口失败时页面无版本号文本、表单可用、无错误提示（5B-9）。
- **验证方式**：`cd tests && npx playwright test versionDisplay.test.js`（T29）「登录页展示版本号」「登录页失败降级」用例。
- **依赖**：T25

### T27 在 `client/src/components/Layout.jsx` 顶栏右侧展示版本号
- **涉及文件**：`client/src/components/Layout.jsx`
- **任务描述**：引入 `useVersion` hook；在顶栏右侧 flex 容器中、用户信息与登出按钮之间（或之后）并列新增 `{version && <span style=…>{version}</span>}`（design 4.1.3 已确认决策 2）；version 为 null 时不渲染；所有主界面页面均经 Layout 渲染，改动一处即全局生效（5B-7）。
- **完成标准**：登录后主界面顶栏右侧可见 `v1.2.0`，且与登录页展示一致（同源 5B-8）；失败时隐藏且页面正常。
- **验证方式**：`cd tests && npx playwright test versionDisplay.test.js`（T29）「主界面展示版本号」「主界面失败降级」用例。
- **依赖**：T25（T26 与 T27 可并行）

## 11. 服务端版本接口测试（node:test）

### T28 新增 `server/test/versionApi.test.js`（版本接口单测）
- **涉及文件**：`server/test/versionApi.test.js`（新增）
- **任务描述**：使用 `node:test` + `node:assert`，沿用 V1.1 测试隔离约定（文件顶部设置临时 DATA_DIR、强 JWT_SECRET，after 清理临时目录），覆盖（design 4.6.1）：
  1. 版本接口正常返回：无 token 调用 GET /api/meta/version → 200、code=0、data.version 等于 server/package.json 的 version（1.2.0）；
  2. 免鉴权访问：不带 Authorization 头 → 200（而非 401，5B-4）；
  3. 单一来源一致性：versionProvider.getVersion() 与 `require('../../package.json').version` 完全一致（5B-1）；
  4. 缓存生效：连续调用 getVersion() 仅读取一次文件（注入计数器或修改临时 package.json 后取值不变验证）；
  5. version 缺失/格式非法降级：`createVersionProvider(临时 package.json)` → getVersion() 返回 null；接口路径返回 500 + VERSION_UNAVAILABLE（spec 5.5.3-2）；
  6. package.json 读取失败：`createVersionProvider(不存在的路径)` → 返回 null 且不抛错（容错）。
- **完成标准**：全部用例通过；真实触达 meta 路由挂载与 versionProvider 缓存/容错语义。
- **验证方式**：`cd server && node --test test/versionApi.test.js`
- **依赖**：T19、T21、T22、T23

## 12. E2E 版本展示测试（Playwright）

### T29 新增 `tests/versionDisplay.test.js`（版本展示与降级 E2E）
- **涉及文件**：`tests/versionDisplay.test.js`（新增）
- **任务描述**：沿用 `tests/playwright.config.js`（webServer 自动启动 server+client）与既有 E2E 风格（Playwright 浏览器交互），覆盖（design 4.6.2）：
  1. 登录页展示版本号：打开 `/login` → 页面出现文本 `v1.2.0`（卡片底部）；
  2. 主界面展示版本号：登录管理员 → 进入任一主界面页 → 顶栏右侧出现 `v1.2.0`；与登录页展示一致（同源 5B-8）；
  3. 接口失败降级（登录页）：`page.route('/api/meta/version')` 拦截返回 500 → 打开 /login → 页面无版本号文本、登录表单可用、无错误弹窗（5B-9）；
  4. 接口失败降级（主界面）：同上拦截 → 登录进入主界面 → 页面正常加载、无版本号、无错误弹窗；
  5. 既有主流程回归：既有 E2E 用例全量执行（5B-11 不影响既有接口）。
- **完成标准**：`cd tests && npx playwright test versionDisplay.test.js` 全通过；既有 E2E 全量无回归。
- **验证方式**：`cd tests && npx playwright test versionDisplay.test.js`
- **依赖**：T23、T26、T27（另需后端接口可用）

## 13. 分支管理工程（5A 工程流程）

### T30 补建历史归档分支 release/v1.0、release/v1.1 并推送（5A-7）
- **涉及文件**：git 操作（无代码改动）
- **任务描述**（具体命令，design 4.1.4）：
  1. 从既有 tag 补建历史归档分支（指向 tag 对应提交）：
     ```bash
     git branch release/v1.0 v1.0
     git branch release/v1.1 v1.1
     ```
  2. 推送远端（仓库已存在 origin）：
     ```bash
     git push -u origin release/v1.0
     git push -u origin release/v1.1
     ```
- **完成标准**：`git branch --list 'release/*'` 显示 release/v1.0、release/v1.1；`git rev-parse release/v1.0` 与 `git rev-parse v1.0^{commit}` 一致（release/v1.1 同理），满足 5A-7 验收条件；远端已推送。
- **验证方式**：`git branch --list 'release/*'`、`git rev-parse release/v1.0 v1.0` 比对输出。
- **依赖**：无（可在开发期任意时刻执行）

### T31 新增根目录 `BRANCHING.md` 分支策略文档（5A-13）
- **涉及文件**：`BRANCHING.md`（新增，仓库根目录）
- **任务描述**：按 design 4.1.4 内容大纲编写 GitHub Flow 简化版策略文档：
  1. 分支模型总览：单主干（main 兼任功能集成与版本发布），不设 develop 分支；
  2. 分支角色与命名规范：main（唯一开发主分支，禁止直接提交新功能，仅允许合并 feature、打 tag、文档/配置类维护，5A-1/10）；feature/<功能名>（从 main 检出、完成后合并回 main 并删除，5A-2/3/4）；release/vX.Y（从 tag 创建、仅该版本缺陷修复，5A-6/9）；tag vX.Y（从 main 创建，5A-5）；
  3. 开发流程：`git checkout -b feature/<功能名> main` → 开发提交 → `git checkout main && git merge --no-ff feature/<功能名>` → 删除 feature 分支；
  4. 发布流程：合并 feature → 更新三处 package.json version → 追加 CHANGELOG 对应章节 → 打 tag → 补建 release 分支 → 推送；
  5. 约束与检查：分支/tag 命名唯一性（5A-11）；打 tag 前 CHANGELOG 必须已含对应版本章节且版本号一致（5A-12）；违规处理（main 直接开发新功能 / release 混入新功能时回退并改走规范流程）；
  6. 常用命令速查表：检出/合并/打 tag/补建分支/推送命令。
- **完成标准**：文件存在且覆盖 main/feature/release/tag 角色、开发/发布流程与命名规范（5A-13 验收条件）。
- **验证方式**：人工检视文档内容完整性。
- **依赖**：无

## 14. 整体回归验证

### T32 全量测试与回归验证
- **涉及文件**：全项目（无代码改动）
- **任务描述**：
  1. `cd server && npm test`：全部服务端测试（V1.1 四个测试文件 + 新增 versionApi.test.js）通过；
  2. `cd tests && npx playwright test`：全部 E2E（既有 + 新增 versionDisplay.test.js）通过；
  3. 手工验证：`cd server && node src/app.js` 启动 → 浏览器打开 /login 与登录后主界面，确认两处版本号均为 v1.2.0 且一致（5B-8）；
  4. 接口兼容性检查：/api/auth/login、/api/auth/logout、/api/admin/users 请求/响应结构与错误码语义与 V1.1 一致（5B-11）；
  5. 版本一致性核对：server/package.json version=1.2.0 ↔ CHANGELOG [1.2.0] ↔ tag v1.2（spec 6.3-3）。
- **完成标准**：全部测试通过；无破坏性变更；spec V1.2 5A（13 条）+ 5B（11 条）共 24 条需求全部满足。
- **验证方式**：上述命令逐条执行并确认通过。
- **依赖**：T28、T29（T30、T31 可在本任务前完成）

## 15. 版本发布与收尾（5A-8 发布流程 + 文档收尾）

### T33 在 CHANGELOG.md 顶部新增 [1.2.0] 版本章节
- **涉及文件**：`CHANGELOG.md`
- **任务描述**：在 `## [1.1.0]` 章节之上追加 `## [1.2.0] - 未发布`（按发布规范，发布后补填日期）章节，按 `### 新增`、`### 变更`、`### 内部` 分类描述 V1.2 变更：
  - 新增：版本号展示（登录页/主界面 vX.Y.Z）、公开版本接口 GET /api/meta/version、版本分支管理策略 BRANCHING.md、历史 release 分支补建；
  - 变更：三处 package.json 版本同步 1.2.0；
  - 内部：服务端版本接口测试、E2E 版本展示与降级用例。
- **完成标准**：文档顶部存在 `## [1.2.0]` 章节且版本号与 server/package.json（1.2.0）一致，满足 5A-12（打 tag 前 CHANGELOG 已含对应版本章节且版本号一致）。
- **验证方式**：人工检视 CHANGELOG.md 顶部；T34 打 tag 前对照。
- **依赖**：T23

### T34 V1.2 发布流程：git 提交推送、tag v1.2、补建 release/v1.2（5A-8 收尾）
- **涉及文件**：git 操作（发布步骤，无新代码改动）
- **任务描述**（按 design 4.1.4 发布流程表，所有前置开发/文档任务完成后执行）：
  1. 确认 V1.2 全部变更已在 feature 分支 `feature/travel-mgmt-v1.2` 提交（5A-2/3）；若开发直接在 main 工作区完成，发布时按规范补齐 feature 流程或整理提交记录；
  2. 合并回 main：`git checkout main && git merge --no-ff feature/travel-mgmt-v1.2`（5A-4），合并后删除 feature 分支；
  3. 检查 CHANGELOG.md 已含 `## [1.2.0]` 且版本号与 package.json 一致（T33，5A-12）；
  4. 打 tag：`git tag -a v1.2 -m "release v1.2"`（5A-5，tag 名唯一 5A-11）；
  5. 补建归档分支：`git branch release/v1.2 v1.2`（5A-6）；
  6. 推送：`git push origin main v1.2`、`git push -u origin release/v1.2`；
  7. 发布后验证：`git tag` 含 v1.2；`git branch --list 'release/*'` 含 release/v1.0、release/v1.1、release/v1.2；`git rev-parse release/v1.2` 与 `git rev-parse v1.2^{commit}` 一致；CHANGELOG/tag/package.json 三者一致（spec 6.3-3）。
- **完成标准**：发布流程完整执行（feature 开发 → 合并 main → tag v1.2 → release/v1.2），仓库状态满足 5A-8 验收条件；远端 main/tag/release 分支均已推送。
- **验证方式**：上述命令逐条执行并核对输出。
- **依赖**：T30（历史分支已补建）、T31（BRANCHING.md 已存在）、T32（全量测试通过）、T33（CHANGELOG [1.2.0] 已追加）

---

# 第二部分：V1.1 历史任务清单（T1–T18，原样保留）
## 企业差旅管理系统 V1.1 加固版 编码任务清单（tasks.md，原样保留）

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