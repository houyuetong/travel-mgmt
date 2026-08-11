# 企业差旅管理系统 V1.3 编码任务清单（tasks.md）

> 版本：V1.3 ｜ 基线：V1.2（2026-08-11）｜ 历史：V1.1（加固版）、V1.0
> 对应文档：`docs/spec.md`（V1.1 23 条 + V1.2 5A 13 条 + 5B 11 条 + V1.3 6A 13 条 + 6B 12 条）、`docs/design.md`（V1.1 16 项改动点 + V1.2 增量设计 + V1.3 第五/六章设计）
> 本文档组织：**第一部分 V1.3 任务清单（T35–T59，当前版本执行依据）**；**第二部分 V1.2 历史任务清单（T19–T34，原样保留）**；**第三部分 V1.1 历史任务清单（T1–T18，原样保留）**
> 任务拆解原则：垂直切割（按业务功能分组）、原子可验证（每任务含完成标准与验证命令）、按依赖排序（被依赖者在前）；工程任务（git 操作）标注明确命令。
> V1.3 定位：**纯前端改造、后端零改动**（决策点 D-12）。6A（UI/UX 视觉体验升级）+ 6B（简体中文/English 双语支持），前端引入 Ant Design v5 + Design Token + react-i18next；既有路由、字段、校验、状态机、接口调用行为保持 V1.2 完全一致（spec 6A-13）。

## V1.3 任务总览

| 分组 | 任务范围 | 主任务编号 | 对应需求 |
|------|---------|-----------|---------|
| 16. 依赖安装与前端基线 | antd/icons/react-i18next/i18next/dayjs 安装与构建冒烟 | T35 | 6A-2、D-1 |
| 17. i18n 基础设施 | i18n/index.js 初始化、locales 中英资源、语言持久化 | T36–T38 | 6B-1/3/4/11、D-3/4/5 |
| 18. Design Token 与全局提供 | designTokens.js、LocaleProvider、main.jsx/App.jsx 接入 | T39–T40 | 6A-1、6B-10、D-2/7 |
| 19. 显示映射模块 | displayMapping.js（映射 + 日期/金额格式化） | T41 | 6B-5/7/8、D-10/11 |
| 20. 布局重构 | Layout.jsx 改 antd Layout（Sider+Header+Content） | T42 | 6A-5/6、6B-2/3/4 |
| 21. 自研组件适配 | StatusTag/Toast/Pagination/ConfirmDialog 委托 antd | T43–T46 | 6A-2、6B-10/12 |
| 22. 页面重构 | Login/我的申请/新建/详情/审核/员工管理 antd 化 | T47–T54 | 6A-7~12、6B-4~9/12 |
| 23. 测试适配与新增 | versionDisplay 选择器适配、i18n.test.js 13 用例 | T55–T56 | 6B-1~12、6A-13 |
| 24. 整体回归验证 | 全量测试与手工验证 | T57 | 6A-13 |
| 25. 版本发布与收尾 | 版本升 1.3.0 + 断言同步、CHANGELOG、git 流程 | T58–T59 | 5A-8、6.3-3 |

> **V1.3 依赖与并行说明**：
> - **可并行（无依赖）**：T35、T36、T37、T39 相互独立，可并行执行；T43、T44、T45、T46 四个自研组件适配相互独立（各自仅依赖 T40/T41/T39），可并行；
> - **先后依赖**：T38 ← T37（键结构对齐）；T40 ← {T35, T36, T39}；T41 ← T36；T42 ← {T40, T41}；T43 ← {T39, T41}；T44 ← T40；T45/T46 ← T40；T47 ← {T36, T41, T44}；T48 ← {T42, T43, T44, T45, T46}；T49 ← {T36, T41, T42, T44}（T49/T50 可在 T48 后并行）；T50 ← {T42, T43, T49}；T51 ← {T42, T43, T45}；T52 ← {T42, T43, T44, T50}；T53 ← {T42, T44, T46, T47}；T54 ← {T47, T48, T49, T50, T51, T52, T53}；T55 ← T47（选择器部分）且 T55 版本断言部分 ← T58；T56 ← {T36…T54, T55}；T57 ← {T55, T56, T58}；T58 ← {T47, T55}；T59 ← {T57, T58}；
> - **关键路径**：依赖链 T35→T36→T37→T38→T40→T42→T48→T49→T50→T52→T53→T54→T56→T57→T58→T59；另一条 T35→T39→T40→T42→T48…（并行主线），T43–T46 为页面前置，建议与 T40 完成后并行推进；
> - **同文件编辑约束**：T40 同时改 `main.jsx` 与 `App.jsx`，建议由同一开发者一次完成；T47 与 T55 均触及登录页 UI（一个改页面、一个改测试选择器），建议 T47 完成后紧接着做 T55 的适配部分；
> - **版本断言原子性（决策已确认）**：T58 将三处 package.json 升 1.3.0 与 versionDisplay.test.js、i18n.test.js 中 `v1.2.0`→`v1.3.0` 断言更新放在同一任务内原子完成，保证升版本后全量回归通过（spec 6.3-3）。

---

# 第一部分：V1.3 任务清单（T35–T59）

## 16. 依赖安装与前端基线验证（6A-2 组件库引入前置）

### T35 安装 antd 等 5 项前端依赖并执行构建冒烟
- **涉及文件**：`client/package.json`、`client/package-lock.json`（修改）
- **任务描述**：执行 `cd client && npm install antd @ant-design/icons react-i18next i18next dayjs`：
  1. `antd ^5.x`（React 18 兼容，决策点 D-1）、`@ant-design/icons ^5.x`（配合 antd v5）；
  2. `react-i18next` + `i18next`（决策点 D-3，管理业务文案）；
  3. `dayjs` 为 antd v5 内置时间库，显式安装以便直接 import（6B-7 DatePicker 与格式化使用）；
  4. 安装完成后执行 `cd client && npm run build` 构建冒烟，验证 antd v5 CSS-in-JS（@ant-design/cssinjs）与 Vite 5 兼容（design 6.5 依赖兼容风险）；确认 `npm run dev` 正常启动（playwright webServer 依赖）。
- **完成标准**：`client/package.json` dependencies 追加 5 项依赖；`npm run build` 成功无报错；client dev server 正常启动。
- **验证方式**：`cd client && npm run build`；`cd client && npm run dev` 冒烟启动。
- **依赖**：无

## 17. i18n 基础设施（6B-1/3/4/11，决策点 D-3/4/5）

### T36 新增 `client/src/i18n/index.js`（i18next 初始化 + 语言读写与持久化）
- **涉及文件**：`client/src/i18n/index.js`（新增）
- **任务描述**：按 design 6.1.3.2 实现：
  1. `i18n.use(initReactI18next).init(...)`：resources 挂载 `zh-CN`/`en-US` 两套（import `../locales/zh-CN`、`../locales/en-US`）；`lng: getSavedLanguage()`；`fallbackLng: 'zh-CN'`（spec 5.7.3-1 缺失键/加载失败兜底）；`interpolation: { escapeValue: false }`；`returnNull: false`；
  2. 常量：`LANG_KEY='i18nLanguage'`、`SUPPORTED_LANGS=['zh-CN','en-US']`、`DEFAULT_LANG='zh-CN'`（spec 6.6-1/2、6B-11）；
  3. `getSavedLanguage()`：读取 localStorage，无记录/非法值回退 `DEFAULT_LANG`（6B-11）；localStorage 读写失败 try/catch 忽略（spec 5.7.3-2）；
  4. `changeLanguage(lang)`：白名单校验（仅 zh-CN/en-US）→ `localStorage.setItem(LANG_KEY, lang)`（try/catch 忽略失败）→ `i18n.changeLanguage(lang)` 立即生效（6B-2）→ 同步 `document.documentElement.lang`（en-US→'en'、zh-CN→'zh-CN'，spec 6B-3 持久化+刷新保持）。
- **完成标准**：应用启动默认加载 zh-CN（6B-11）；切换语言立即生效且持久化、刷新保持（6B-2/3）；非法语言被忽略；localStorage 不可用不阻断界面使用。
- **验证方式**：`cd tests && npx playwright test i18n.test.js`（T56）用例 1/2/3 覆盖；dev 环境手工验证切换与刷新。
- **依赖**：T35

### T37 新增 `client/src/locales/zh-CN.js`（中文业务文案资源）
- **涉及文件**：`client/src/locales/zh-CN.js`（新增）
- **任务描述**：按 spec 6.6-4 与 design 6.3.2 ② 命名空间分组，导出默认对象，键结构作为 en-US 对齐基准：
  1. 命名空间：`common`（appTitle/appTitleSub/actions/statusFilter/all/loading/noData/total({{count}})/success/failed）、`login`、`sidebar`、`header`、`table`（columns/actions）、`form`（labels/placeholders/validations）、`status`、`role`、`userStatus`、`modal`（含 toggleStatusMessage {{name}}）、`toast`、`myRequests`、`newRequest`、`detail`（含 steps.submitted/pending/approved/rejected）、`review`、`employeeManagement`、`errors`（原 `constants/errorCodes.js` 的 ERROR_MESSAGES 中文提示迁移至此，design 5.2.2）；
  2. 覆盖 6B-4 全部文案类别：Login/Sidebar/Header/页面标题/按钮/表格列/状态/角色/表单 Label/Placeholder/校验/Modal/Drawer/Toast/Empty/分页/DatePicker/Logout；
  3. 业务值标签（状态/角色/用户状态/交通工具）**不在此维护**（由 displayMapping 单一来源，design 6.3.2 双源规避策略）。
- **完成标准**：命名空间齐全、键覆盖全部用户可见文案（6B-4）；与 en-US 键结构一致（spec 6.6-3）；无硬编码中文残留待 T54 复核。
- **验证方式**：人工检视 + T56 英文无中文残留用例反向校验；`cd client && node -e "import('./src/locales/zh-CN.js').then(m=>console.log(Object.keys(m.default).join(',')))"`。
- **依赖**：无（与 T38 紧邻依序完成）

### T38 新增 `client/src/locales/en-US.js`（英文资源，键与 zh-CN 完全一致）
- **涉及文件**：`client/src/locales/en-US.js`（新增）
- **任务描述**：英文资源与 zh-CN 键结构**完全一致**（spec 6.6-3）；状态/角色/用户状态/交通工具业务值标签不在此维护（displayMapping 单一来源）；`detail.steps` 审批步骤文案 Submitted/Pending/Approved/Rejected 等非业务值场景走 i18n（design 6.3.2）；翻译质量满足"英文页无残留中文"（6B-9）。
- **完成标准**：en-US 与 zh-CN 键集合完全一致；英文翻译准确、无中文残留（6B-9）；业务值无双源（6B-5）。
- **验证方式**：脚本对比两文件键一致性；T56 用例 4/5 覆盖。
- **依赖**：T37

## 18. Design Token 与全局提供（6A-1、6B-10，决策点 D-2/7）

### T39 新增 `client/src/theme/designTokens.js`（Design Token 常量表）
- **涉及文件**：`client/src/theme/designTokens.js`（新增）
- **任务描述**：按 spec 6.5 取值导出 `DESIGN_TOKENS`（供 ConfigProvider theme.token）：
  1. `colorPrimary '#1677ff'`、`colorBgLayout '#f5f5f5'`、`colorBgContainer '#ffffff'`、`colorBorder '#d9d9d9'`、`colorBorderSecondary '#f0f0f0'`；
  2. `borderRadius 6`（组件）、`borderRadiusLG 8`（卡片）、`borderRadiusSM 4`（Tag）；
  3. 字体：`fontSize 14`、`fontSizeSM 12`、`fontSizeHeading 16~20`（页面标题 20/Card 标题 16）、`fontWeightStrong 600`、`lineHeight 1.5`；`colorText/colorTextSecondary/colorTextTertiary`；
  4. 语义色：`colorError '#ff4d4f'`、`colorWarning '#faad14'`、`colorSuccess '#52c41a'`；
  5. 同时导出状态色常量 `STATUS_COLORS`（spec 6.5-7 / design 6.3.2 ②）：待审核 `#faad14`、已通过 `#52c41a`、已拒绝 `#f5222d`、已撤回 `#8c8c8c`、启用 `#52c41a`、禁用 `#8c8c8c`。
- **完成标准**：token 取值与 spec 6.5 完全一致；全站样式统一引用 token，无散落硬编码（6A-1）；状态色与既有 StatusTag 配色语义一致。
- **验证方式**：`cd client && node -e "import('./src/theme/designTokens.js').then(m=>console.log(m.DESIGN_TOKENS.colorPrimary))"` 输出 `#1677ff`；代码检视无散落硬编码色值/圆角/间距。
- **依赖**：T35

### T40 新增 `client/src/components/LocaleProvider.jsx` 并在 main.jsx/App.jsx 全局接入
- **涉及文件**：`client/src/components/LocaleProvider.jsx`（新增）、`client/src/main.jsx`（修改）、`client/src/App.jsx`（修改）
- **任务描述**：
  1. `LocaleProvider`：`useTranslation()` 读 `i18n.language` → `locale = language === 'en-US' ? enUS : zhCN`（`antd/locale/zh_CN`、`antd/locale/en_US`，决策点 D-7）→ `<ConfigProvider locale={locale} theme={{ token: DESIGN_TOKENS }}><AntApp>{children}</AntApp></ConfigProvider>`（AntApp 为 message/modal 命令式 API 提供主题与语言上下文，design 6.1.3.1）；
  2. `main.jsx`：`import './i18n'`（副作用初始化，新增）+ `import LocaleProvider from './components/LocaleProvider'`；在 `AuthProvider` 内包裹 `<LocaleProvider><App /></LocaleProvider>`（design 6.1.3.1 层级）；
  3. `App.jsx`：仅保持现有包裹层级（ToastProvider + Routes），路由表与守卫**不动**（spec 6A-13）。
- **完成标准**：全局 ConfigProvider 生效；语言切换后 antd 组件内置文案（DatePicker/Pagination/Modal/Empty）随 locale 同步（6B-10）；AntApp 上下文可用（T44/T46 委托依赖）；既有路由/权限行为不变。
- **验证方式**：`cd tests && npx playwright test i18n.test.js`（T56）用例 8；dev 手工切换语言观察组件内置文案。
- **依赖**：T35、T36、T39

## 19. 显示映射模块（6B-5/7/8，决策点 D-10/11）

### T41 新增 `client/src/utils/displayMapping.js`（业务值双语映射 + 日期/金额格式化）
- **涉及文件**：`client/src/utils/displayMapping.js`（新增）
- **任务描述**：按 design 6.1.3.3 与 spec 6.7 完整映射表实现：
  1. `DISPLAY_MAP`：申请状态（待审核→Pending、已通过→Approved、已拒绝→Rejected、已撤回→Withdrawn）、角色（管理员→Administrator、普通员工→Employee）、用户状态（启用→Active、禁用→Disabled）、交通工具（火车→Train、飞机→Flight、汽车→Car/Bus、高铁→High-speed Rail、轮船→Ship、其他→Other），结构 `{ zh, en }`；
  2. `mapDisplay(value, lang = i18n.language)`：未知值原样返回（后端扩展兼容不抛错）；`displayText(value)` 便捷包装；
  3. 日期/金额本地化（决策点 D-10）：`formatDate`/`formatDateTime`（zh-CN：`YYYY-MM-DD`/`YYYY-MM-DD HH:mm`；en-US：`MMM D, YYYY`/`MMM D, YYYY HH:mm`，dayjs 格式化）、`formatCurrency`（`toLocaleString` 千分位 + 2 位小数如 `1,234.50`，非法输入原样返回）；
  4. `syncDayjsLocale(lang)`：`dayjs.locale(lang === 'en-US' ? 'en' : 'zh-cn')`，`import 'dayjs/locale/zh-cn'`；
  5. **关键约束（spec 6B-6/6.7-5）**：映射仅作用于界面展示；任何 API 请求参数/请求体（状态筛选值、创建/编辑、审批意见）必须使用后端真实中文业务值，禁止英文标签或语言标识。
- **完成标准**：映射表与 spec 6.7 完全一致；日期/金额本地化正确；未知业务值不抛错；请求参数不经过映射层。
- **验证方式**：`cd client && node -e` 纯函数冒烟；T56 用例 5/6/7 覆盖。
- **依赖**：T36

## 20. 布局重构（6A-5/6、6B-2/3/4，决策点 D-8）

### T42 重构 `client/src/components/Layout.jsx` 为 antd Layout（Sider + Header + Content）
- **涉及文件**：`client/src/components/Layout.jsx`（修改重构）
- **任务描述**：组件名/路径/导出**保持不变**（各页面 import 零改动）；props 保留 `title`/`children`、**废弃 `navItems`**（design 6.1.3.4，Menu 按角色自动生成）：
  1. `AntLayout`（minHeight 100vh）+ `Sider theme="dark" width={220}`：顶部 `t('common:appTitle')` 双语系统名"企业差旅管理/Travel Management"（6A-5）；`Menu theme="dark" mode="inline"`，`items` 由 `MENU_BY_ROLE` 按 `user.role` 生成——员工：`/employee/requests`（layout:myRequests）、`/employee/requests/new`（layout:newRequest）；管理员：`/admin/requests`（layout:requestReview）、`/admin/users`（layout:employeeManagement）；
  2. `selectedKeys` 与 `useLocation` 联动（含 /:id 详情、/new 二级路径归一化，design 6.1.3.4 的 selectedKey 计算逻辑）；`onClick` navigate(key)；
  3. `Header` 白底：左侧页面标题（`title`，各页面传 `t('xxx:pageTitle')`）+ 右侧 `Space`——中文/EN 语言切换 Dropdown（`changeLanguage('zh-CN'/'en-US')`，6B-2）+ 版本号（复用 `useVersion`，V1.2 同源）+ Avatar + 用户名 `displayText(user.role)` 角色 + 登出按钮（`handleLogout`，6A-6）；
  4. `Content`（margin 24、透明背景）：`{children}`；
  5. Sider 固定桌面宽度、中等宽度（768-1280px）下 Table 横向滚动/表单换行（6A-4）。
- **完成标准**：登录后主界面呈现 Sidebar+Header+Content 企业后台布局（6A-5）；员工/管理员菜单按角色正确渲染；Header 六要素齐全（页面标题/语言切换/Avatar/用户名/角色/登出 + 版本号，6A-6）；语言切换立即生效并持久化（6B-2/3）；版本号与登录页一致。
- **验证方式**：`cd tests && npx playwright test i18n.test.js versionDisplay.test.js`（T56/T55）；dev 手工验证。
- **依赖**：T40、T41

## 21. 自研组件适配（6A-2、6B-10/12，props 与 V1.2 完全兼容）

### T43 重构 `StatusTag.jsx` 委托 antd Tag（props 不变）
- **涉及文件**：`client/src/components/StatusTag.jsx`（修改重构）
- **任务描述**：props `{ status }` 不变（design 6.2.2-C 稳定契约）：内部改 antd `Tag`；色值收敛为 T39 的 `STATUS_COLORS`（spec 6.5-7）；label 经 `displayText(status)` 双语（6B-5）；未知状态灰色兜底；待审核可用 warning 语义色突出（6A-11 高识别）。
- **完成标准**：各页面调用点零改动（6A-13）；zh/en 界面状态标签正确切换（6B-5）；配色与 V1.2 视觉语义一致。
- **验证方式**：T56 用例 5（业务值英文映射）覆盖；`cd tests && npx playwright test i18n.test.js`。
- **依赖**：T39、T41

### T44 重构 `Toast.jsx` 委托 antd message（useToast API 不变）
- **涉及文件**：`client/src/components/Toast.jsx`（修改重构）
- **任务描述**：`useToast()` 对外 API 不变（各页面调用点零改动）：`ToastProvider` 保留 context 提供；`show(message, type)` 内部经 `App.useApp()` 获取 message 实例并委托 `message[type]`（error/success/info），移除自研 toast UI（design 6.1.3.1 AntApp 上下文 + design 5.2.3）；message 文案随 ConfigProvider 主题/语言同步（6B-10/12）。
- **完成标准**：既有 useToast 调用零改动；错误/成功提示以 antd message 呈现；语言切换后 message 上下文正确（6B-12）。
- **验证方式**：T56 用例 9（错误/校验提示双语）；dev 手工验证。
- **依赖**：T40

### T45 重构 `Pagination.jsx` 委托 antd Pagination（props 不变）
- **涉及文件**：`client/src/components/Pagination.jsx`（修改重构）
- **任务描述**：props `{ page, pageSize, total, onChange }` 不变，`page` 从 1 开始、onChange 传回目标页号语义保持（design 5.2.3）：内部改 antd `Pagination`（内置"共 N 条/上一页/下一页"文案随 ConfigProvider locale 自动双语，6B-10）；`total === 0` 不渲染（保持既有行为）。
- **完成标准**：既有调用点零改动；分页交互行为与 V1.2 一致；分页内置文案随语言切换（6B-10）。
- **验证方式**：T56 用例 8；既有 E2E 分页回归（adminReview/requestSubmit）。
- **依赖**：T40

### T46 重构 `ConfirmDialog.jsx` 委托 antd Modal（props 不变）
- **涉及文件**：`client/src/components/ConfirmDialog.jsx`（修改重构）
- **任务描述**：props `{ open, title, message, onConfirm, onCancel }` 不变：内部改 antd `Modal`（`open` 控制、footer 确定/取消，内置"确定/取消"文案随 locale，6B-10）；`open=false` 不渲染（design 5.2.3）。
- **完成标准**：既有调用点零改动；确认/取消交互与 V1.2 一致；按钮文案随语言切换（6B-10/12）。
- **验证方式**：T56 用例 8；既有 E2E 撤回/启禁用确认弹窗回归。
- **依赖**：T40

## 22. 页面重构（6A-7~12、6B-4~9/12）

### T47 重构 `client/src/pages/Login.jsx` 为 SaaS 登录页（Card + Form）
- **涉及文件**：`client/src/pages/Login.jsx`（修改重构）
- **任务描述**：design 6.1.3.5 ①：
  1. 居中 `Card`（白底 + token 阴影，背景 `colorBgLayout`）+ `Typography.Title` 系统标题 `t('common:appTitle')` + `Form`（`onFinish={handleSubmit}`、size="large"）；
  2. `Form.Item` 用户名 `Input`（`prefix={<UserOutlined/>}`、placeholder `t('login:usernamePlaceholder')`、required 校验 message `t('login:usernameRequired')`）+ 密码 `Input.Password`（`prefix={<LockOutlined/>}`、placeholder `t('login:passwordPlaceholder')`、required message `t('login:passwordRequired')`）（6B-4/12）；
  3. 提交 `Button type="primary" htmlType="submit" block loading`（`t('login:loginButton')`）；错误提示统一 antd `message`（经 `App.useApp()`）替代原 `useToast`（6B-12）；
  4. 版本号保留卡片底部（复用 `useVersion`，V1.2 行为不变）；登录逻辑（凭证校验、角色跳转 admin→/admin/users、employee→/employee/requests）与 V1.2 完全一致（6A-7/13）。
- **完成标准**：呈现 SaaS 风格登录页（系统标题+Username+Password+Login+统一错误提示，6A-7a）；错误凭证统一 message 提示（6A-7b）；版本号展示；登录逻辑零变更。
- **验证方式**：T55（选择器适配）、T56 用例 1/9；`cd tests && npx playwright test i18n.test.js`。
- **依赖**：T36、T41、T44

### T48 重构 `client/src/pages/employee/EmployeeRequestList.jsx`（我的申请：antd Table）
- **涉及文件**：`client/src/pages/employee/EmployeeRequestList.jsx`（修改重构）
- **任务描述**：design 6.1.3.5 ②：
  1. `Select` 状态筛选（options：`STATUS_OPTIONS` → value 中文业务值 / label `displayText` 双语；变更时重置 page=1，行为与 V1.2 一致）；
  2. 新建申请 `Button type="primary"`（6A-8b 醒目）；`Table` 列：目的地/出发/返回/交通工具/预计费用/状态/提交时间/操作；`loading` 用 `Spin`、空数据 `Empty`（6A-8a）；
  3. 状态列 `StatusTag`；日期/金额经 `formatDate`/`formatDateTime`/`formatCurrency`（6B-7/8）；
  4. `Pagination`；撤回用 `Modal.confirm`（确认文案双语 6B-12）；操作列：详情、撤回（仅待审核）、重新提交（仅已拒绝）；
  5. `fetchData`/`handleWithdraw` 业务逻辑与 API 调用**不变**（6A-13）；移除 `navItems` 传参。
- **完成标准**：Table/筛选/分页/撤回/重新提交行为与 V1.2 一致（6A-8）；筛选提交 value 仍为中文业务值（6B-6）；Spin/Empty 状态正确。
- **验证方式**：T56 用例 5/6/7/11；`cd tests && npx playwright test i18n.test.js`。
- **依赖**：T42、T43、T44、T45、T46

### T49 重构 `NewRequest.jsx` 与 `ResubmitRequest.jsx`（新建/重新提交：Card + Form）
- **涉及文件**：`client/src/pages/employee/NewRequest.jsx`、`client/src/pages/employee/ResubmitRequest.jsx`（修改重构）
- **任务描述**：design 6.1.3.5 ③（两页同构处理）：
  1. `Card` + `Form`（layout="vertical"）：目的地 `Input`（maxLength 100、required）、出发/返回 `DatePicker`（`format`/`valueFormat="YYYY-MM-DD"`，提交值保持 ISO 语义，spec 6B-7）、事由 `Input.TextArea`（maxLength 500、required）、交通工具 `Select`（options value 中文值 / label 双语）、预计费用 `InputNumber`（min 0、precision 2、prefix ¥、required）；
  2. 提交 `Button type="primary" htmlType="submit"` + 取消按钮（回跳列表页）；
  3. 字段与校验规则**不新增不删减**（6A-9/13）；标签/占位符/校验提示/Toast 全部走 `t()`（6B-4/12）；
  4. `ResubmitRequest` 回填逻辑（`slice(0,10)`）保持不变；提交/重新提交 API 调用不变。
- **完成标准**：两页字段/校验/提交行为与 V1.2 完全一致（6A-9）；DatePicker 提交值保持 ISO；英文界面表单为英文（6B-9）。
- **验证方式**：T56 用例 7/11；`cd tests && npx playwright test i18n.test.js`。
- **依赖**：T36、T41、T42、T44

### T50 重构 `client/src/pages/employee/RequestDetail.jsx`（申请详情：分区 + Steps）
- **涉及文件**：`client/src/pages/employee/RequestDetail.jsx`（修改重构）
- **任务描述**：design 6.1.3.5 ④：
  1. Header 区：标题（目的地）+ 状态 `StatusTag`（6A-10 顶部展示）；
  2. 分区 `Card`：基本信息（目的地/出发/返回/交通工具/预计费用/提交时间）、出差事由（purpose）、审批状态（审核人/审核时间/审核意见，已审核时展示）；
  3. `Steps` 展示 Submitted→Pending→Approved/Rejected：`current` 由状态映射（待审核=1、已通过=2、已拒绝=2 status="error"、已撤回展示撤回说明）；**不新增审批阶段**（spec 1.4-12）；步骤文案走 i18n `detail.steps`；
  4. 日期/金额格式化；操作：返回列表；已拒绝时"重新提交"（跳 `/employee/requests/:id/resubmit`）；取数逻辑不变。
- **完成标准**：信息分区清晰（6A-10a）；Steps 流程正确且不新增阶段；审批字段双语展示；英文无残留中文。
- **验证方式**：T56 用例 5/7/11；`cd tests && npx playwright test i18n.test.js`。
- **依赖**：T42、T43、T49

### T51 重构 `client/src/pages/admin/AdminRequestList.jsx`（申请审核：统一 Table）
- **涉及文件**：`client/src/pages/admin/AdminRequestList.jsx`（修改重构）
- **任务描述**：design 6.1.3.5 ⑤：`Table`（列：提交人/目的地/出发/返回/状态/提交时间/操作-审核）；`Select` 筛选 + `Pagination`（同 T48 参数语义）；`StatusTag` 待审核 warning 高识别（6A-11）；loading `Spin`、空 `Empty`；`fetchData` 逻辑与 API 调用不变。
- **完成标准**：列表视觉与我的申请统一（6A-11）；待审核 Tag 易识别；筛选/分页行为一致。
- **验证方式**：T56 用例 5/10；`cd tests && npx playwright test i18n.test.js`。
- **依赖**：T42、T43、T45

### T52 重构 `client/src/pages/admin/AdminRequestDetail.jsx`（详情与审批：Steps + 审批区）
- **涉及文件**：`client/src/pages/admin/AdminRequestDetail.jsx`（修改重构）
- **任务描述**：design 6.1.3.5 ⑥：
  1. Header + 基本信息/出差事由/审批状态分区 + `Steps`（同 T50 结构，待审核=1、已通过=2、已拒绝=2 error）；
  2. 管理员审批区（`status==='待审核'` 时）：`Card` 内 `Input.TextArea`（审核意见）+ `Button type="primary"`（通过 Approve）+ `Button danger`（拒绝 Reject）+ 返回按钮；
  3. **审批意见规则不变**：拒绝必填（前端校验，提示双语 6B-12）；通过/拒绝请求体 `{ comment }` 与 V1.2 完全一致（6B-6）；成功 message 提示并 `fetchDetail()` 刷新（行为不变）。
- **完成标准**：审批流程/必填规则/请求体与 V1.2 一致（6A-11/13）；Steps 状态正确；双语展示。
- **验证方式**：T56 用例 6/10；`cd tests && npx playwright test i18n.test.js`。
- **依赖**：T42、T43、T44、T50

### T53 重构 `client/src/pages/admin/AdminUsers.jsx`（员工管理：Table + Modal + More Dropdown）
- **涉及文件**：`client/src/pages/admin/AdminUsers.jsx`（修改重构）
- **任务描述**：design 6.1.3.5 ⑦（决策点 D-9）：
  1. `Table`（列：用户名/姓名/角色/状态/创建时间/操作；角色/用户状态经 `displayText` 双语；管理员行不显示操作——既有逻辑保持）；
  2. 创建员工 `Button type="primary"` → `Modal` + `Form`（用户名/姓名/密码 ≥6 位）；
  3. 低频操作 `Dropdown`（"更多/More"）收纳：编辑、启用/禁用、重置密码（决策点 D-9）；
  4. 编辑 `Modal` + `Form`（用户名/姓名/状态 `Select` 启用/禁用）；启用/禁用 `Modal.confirm`（确认文案双语 6B-12）；重置密码 `Modal` + `Form`（新密码 ≥6 位）；
  5. `handleCreate`/`handleEdit`/`handleToggleStatus`/`handleResetPassword` 业务逻辑与 API 调用复用（6A-12/13）。
- **完成标准**：Table/Modal/Dropdown 完整呈现；创建/编辑/启禁用/重置密码行为与 V1.2 一致（6A-12）；角色状态双语（6B-5）；管理员行操作隐藏逻辑不变。
- **验证方式**：T56 用例 5/10；`cd tests && npx playwright test i18n.test.js`。
- **依赖**：T42、T44、T46、T47

### T54 全页面 i18n 文案收口与无残留自查
- **涉及文件**：`client/src/pages/**`（全部重构后页面）、`client/src/components/**`
- **任务描述**：
  1. 全量检查重构后所有页面/组件：系统固有文案零硬编码（统一走 `t()`/`displayText`，spec 6.6-3）；页面标题传 `t('xxx:pageTitle')`；
  2. 错误码提示统一经 `t(\`errors:${err.code}\`)`（原 `ERROR_MESSAGES` 常量中文提示迁移 errors 命名空间，design 5.2.2；`constants/errorCodes.js` 常量本身不动）；
  3. 校验提示/Toast/Modal/Empty/Steps 文案双语覆盖自查；`grep` 检索排除用户数据后的中文残留。
- **完成标准**：en-US 下主要页面无系统固有中文（6B-9）；无硬编码中文残留；`ERROR_MESSAGES` 不再被页面直接引用。
- **验证方式**：T56 用例 4（英文无中文残留）；`grep -rn "[\u4e00-\u9fa5]" client/src/pages client/src/components` 检视（排除注释与用户数据）。
- **依赖**：T47、T48、T49、T50、T51、T52、T53

## 23. 测试适配与新增（6B-1~12、6A-13）

### T55 适配 `tests/versionDisplay.test.js`（登录页 UI 选择器 + 版本断言）
- **涉及文件**：`tests/versionDisplay.test.js`（修改）
- **任务描述**：
  1. **UI 选择器适配**（第 26-27 行）：`input[placeholder="用户名"]` → `page.getByPlaceholder('用户名')`、`input[placeholder="密码"]` → `page.getByPlaceholder('密码')`（design 6.6.2 语义化定位器；antd Input 的 placeholder 仍直接渲染于 `<input>`，zh-CN 默认语言下语义等价；英文态断言收敛到 T56，不落入本文件）；
  2. **版本断言更新**（第 7/17/25/40 行）：`v1.2.0` → `v1.3.0`（与 T58 升版本原子配对，决策 Q1-A，spec 6.3-3）；
  3. 接口失败降级断言（body 不含 `v1.3.0`/`版本信息不可用`）保持；其余用例不动。
- **完成标准**：`cd tests && npx playwright test versionDisplay.test.js` 全通过（T58 升版本后执行）；选择器与 antd 重构后登录页匹配。
- **验证方式**：`cd tests && npx playwright test versionDisplay.test.js`
- **依赖**：T47（登录页重构后适配选择器）、T58（版本断言与升版本原子完成）

### T56 新增 `tests/i18n.test.js`（双语 E2E，13 用例，文件级单任务）
- **涉及文件**：`tests/i18n.test.js`（新增）
- **任务描述**：沿用 `tests/playwright.config.js`（webServer 自动启动 server+client）与 `helpers.js`（`loginAs` 直连后端获取 token/user + `addInitScript` 注入 localStorage），实现 design 6.6.3 全部 13 用例：
  1. **默认语言 zh-CN**（6B-11）：清空 `i18nLanguage` → 打开 /login → 出现中文文案（"登录"/"企业差旅管理"）；
  2. **切换立即生效**（6B-2）：登录进入主界面 → Header 切换 EN → Sidebar/Header/表格列/按钮立即变英文，无刷新；
  3. **语言持久化**（6B-3）：切 EN → 刷新 → 重新登录 → 仍英文（localStorage `i18nLanguage=en-US`）；
  4. **英文页无中文残留**（6B-9）：en-US 下依次访问 登录/我的申请/新建/详情/审核/员工管理 → 主要页面 body 不含常见中文字符（`/[\u4e00-\u9fa5]/` 断言，用户数据除外）；
  5. **业务值英文映射**（6B-5）：状态 Pending/Approved/Rejected/Withdrawn、角色 Administrator/Employee、用户状态 Active/Disabled、交通工具 Flight/Train 等；
  6. **API 仍发送中文业务值**（6B-6）：en-US 按 "Pending" 筛选 → Network 请求参数 `status=待审核`；Approve/Reject 请求体与 V1.2 一致（`{ comment }`）；
  7. **日期/金额本地化**（6B-7/8）：en-US 日期为 `Sep 1, 2026`、zh-CN 为 `2026-09-01`；金额 `1,234.50` 千分位；
  8. **组件内置语言同步**（6B-10）：切换语言后 DatePicker 月份/星期、Pagination 文案、Modal 确定/取消按钮随语言切换；
  9. **错误/校验提示双语**（6B-12）：en-US 触发表单校验（必填/审批意见）与接口错误 → 提示英文；zh-CN → 中文；
  10. **管理员全流程（中英各一遍）**：登录管理员 → 员工管理创建员工 → 申请审核 Approve/Reject → `code=0`、页面状态正确；
  11. **员工全流程（中英各一遍）**：员工登录 → 新建申请 → 查看详情 → 被拒后重新提交 → 最终状态展示正确（Approved/Rejected/Withdrawn）；
  12. **权限边界**（6A-13）：en-US 下员工直接访问 `/admin/users` → 被重定向（后端权限仍生效，补充英文态验证）；
  13. **既有版本展示回归**：登录页与主界面在 en-US 下仍显示版本号（开发期断言 `v1.2.0`，T58 升版本后原子更新为 `v1.3.0`，与语言解耦）。
  - 数据构造（创建员工/提交申请/审批）与清理流程须可重复执行。
- **完成标准**：13 用例全部通过；覆盖 6B-1~12 全部验收条件；数据可重复执行。
- **验证方式**：`cd tests && npx playwright test i18n.test.js`
- **依赖**：T36、T37、T38、T39、T40、T41、T42、T43、T44、T45、T46、T47、T48、T49、T50、T51、T52、T53、T54、T55、T58

## 24. 整体回归验证（spec 6A-13 无回归）

### T57 全量回归验证
- **涉及文件**：全项目（无代码改动）
- **任务描述**：
  1. `cd server && npm test`：既有服务端测试（V1.1 四个文件 + V1.2 versionApi.test.js）全通过（后端零改动，决策点 D-12）；
  2. `cd tests && npx playwright test`：全部 E2E 通过——**API 层测试**（`auth`/`userManagement`/`adminReview`/`requestSubmit`/`permission`/`employeeManage`/`hardening`，基于 `helpers.js` 直连后端 3001，不受前端重构影响，零改动回归）+ **UI 层测试**（`versionDisplay.test.js` 已适配 T55、`i18n.test.js` 新增 T56）；
  3. 手工验证：dev 启动，zh/en 各浏览登录/我的申请/新建/详情/审核/员工管理，确认布局/双语/版本号/无残留；
  4. 接口兼容性检查：`/api/auth/*`、`/api/admin/*`、`/api/requests`、`/api/meta/version` 请求/响应结构与错误码语义与 V1.2 一致；
  5. 版本一致性核对：`server/package.json version=1.3.0 ↔ CHANGELOG [1.3.0] ↔ tag v1.3`（spec 6.3-3）。
- **完成标准**：全部自动化测试通过；无破坏性变更；spec V1.3 6A（13 条）+ 6B（12 条）共 25 条需求全部满足。
- **验证方式**：上述命令逐条执行并确认通过。
- **依赖**：T55、T56、T58

## 25. 版本发布与收尾（5A-8 发布流程 + spec 6.3-3 一致性）

### T58 三处 package.json 升 1.3.0 + 测试版本断言同步更新（原子，决策 Q1-A）
- **涉及文件**：`package.json`（根）、`client/package.json`、`server/package.json`（修改）；`tests/versionDisplay.test.js`、`tests/i18n.test.js`（版本断言同步）
- **任务描述**：
  1. 三处 `version` 由 `1.2.0` 统一改为 `1.3.0`（展示唯一来源仍为 `server/package.json`，spec 6.3-1/4）；
  2. **同步原子更新**：`versionDisplay.test.js` 4 处 `v1.2.0` → `v1.3.0`；`i18n.test.js` 用例 13 版本断言同步更新（决策 Q1-A，保证升版本后全量回归通过，spec 6.3-3）；
  3. 立即执行 `cd tests && npx playwright test versionDisplay.test.js` 确认升版本后展示与断言一致。
- **完成标准**：三处 version 均为 `1.3.0`；两测试文件版本断言为 `v1.3.0` 且测试通过；无其他文件硬编码 `v1.2.0`。
- **验证方式**：`node -e "console.log(require('./package.json').version)"`（根）与 `client`/`server` 同理；`cd tests && npx playwright test versionDisplay.test.js`。
- **依赖**：T47（登录页展示版本号）、T55（选择器已适配）

### T59 V1.3 发布流程：CHANGELOG [1.3.0]、feature 合并、tag v1.3、release/v1.3（5A-8 收尾）
- **涉及文件**：`CHANGELOG.md`（修改）、git 操作
- **任务描述**：
  1. `CHANGELOG.md` 顶部在 `## [1.2.0]` 之上追加 `## [1.3.0] - 2026-08-11`（或按发布规范填日期）章节，按 `### 新增`/`### 变更`/`### 内部` 描述：
     - 新增：Ant Design 组件库与 Design Token 设计体系、Sidebar+Header 企业后台布局、SaaS 登录页、简体中文/English 双语支持与语言切换持久化、业务值双语映射与日期金额本地化；
     - 变更：三处 package.json 版本 1.3.0、versionDisplay 测试选择器适配；
     - 内部：i18n 基础设施、displayMapping、LocaleProvider、i18n.test.js 13 用例；
  2. **git 流程**（BRANCHING.md）：确认全部变更已在 `feature/travel-mgmt-v1.3` 提交（5A-2/3）→ `git checkout main && git merge --no-ff feature/travel-mgmt-v1.3`（5A-4）→ 删除 feature 分支；
  3. 检查 CHANGELOG 已含 `## [1.3.0]` 且版本号与 package.json（1.3.0）一致（T58，5A-12）→ `git tag -a v1.3 -m "release v1.3"`（5A-5，tag 名唯一 5A-11）→ `git branch release/v1.3 v1.3`（5A-6）→ `git push origin main v1.3`、`git push -u origin release/v1.3`；
  4. 发布后验证：`git tag` 含 v1.3；`git branch --list 'release/*'` 含 release/v1.0、v1.1、v1.2、v1.3；`git rev-parse release/v1.3` 与 `git rev-parse v1.3^{commit}` 一致；CHANGELOG/tag/package.json 三者一致（spec 6.3-3）。
- **完成标准**：发布流程完整执行（feature 开发 → 合并 main → tag v1.3 → release/v1.3）；远端 main/tag/release 分支均已推送。
- **验证方式**：上述命令逐条执行核对。
- **依赖**：T57（全量回归通过）、T58（版本号已升）

---

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

# 第二部分：V1.2 任务清单（T19–T34，原样保留）

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

# 第三部分：V1.1 历史任务清单（T1–T18，原样保留）
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