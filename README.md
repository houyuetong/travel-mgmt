# 企业差旅管理系统 V1

## 技术栈
- 前端：React + Vite
- 后端：Node.js + Express
- 数据存储：本地 JSON 文件持久化
- 认证：JWT + bcrypt
- E2E 测试：Playwright

## 目录结构
```
├── server/          # 后端
│   ├── src/
│   │   ├── routes/        # 路由层
│   │   ├── controllers/   # 控制器层
│   │   ├── services/      # 服务层
│   │   ├── repositories/  # 仓储层
│   │   ├── store/         # 存储引擎
│   │   ├── middlewares/   # 中间件
│   │   ├── utils/         # 工具类
│   │   ├── constants/     # 常量
│   │   ├── errors/        # 错误类
│   │   ├── init/          # 初始化
│   │   ├── config.js      # 配置
│   │   └── app.js         # 入口
│   ├── data/              # JSON 数据文件
│   └── .env               # 环境变量
├── client/          # 前端
│   ├── src/
│   │   ├── pages/         # 页面
│   │   ├── components/    # 通用组件
│   │   ├── context/       # 上下文
│   │   ├── api/           # API 封装
│   │   ├── router/        # 路由守卫
│   │   └── constants/     # 常量
│   └── vite.config.js
└── tests/           # E2E 测试
```

## 一键启动（推荐）

**Windows 用户双击根目录的版本化启动脚本**即可打开对应版本：

| 脚本 | 版本 | 端口 | 说明 |
|------|------|------|------|
| `start.bat` | V1.4 | 3001 | 主版本快捷入口（同 `start-v1.4.bat`） |
| `start-v1.0.bat` | V1.0 | 3010 | 历史版本（`.v10worktree/`） |
| `start-v1.1.bat` | V1.1 | 3011 | 历史版本（`.v11worktree/`） |
| `start-v1.2.bat` | V1.2 | 3012 | 历史版本（`.v12worktree/`） |
| `start-v1.3.bat` | V1.3 | 3013 | 历史版本（`.v13worktree/`） |
| `start-v1.4.bat` | V1.4 | 3001 | 当前版本 |

每个脚本会自动检测对应端口是否已监听，未运行则启动服务并打开浏览器。各版本端口互不冲突，**可同时运行多个版本**。前提：对应目录已执行过依赖安装且 `.env` 已配置。

> 注意：脚本启动的是**生产模式**（访问已构建好的 `server/public` 前端产物）。若修改了前端源码需先执行 `npm run build` 再访问。

## 开发模式启动

1. 安装依赖：
```bash
npm run install:all
```

2. 启动后端（终端 1）：
```bash
cd server
npm run dev
```

3. 启动前端（终端 2）：
```bash
cd client
npm run dev
```

4. 访问 http://localhost:5173

## 生产构建与启动

```bash
# 构建前端产物到 server/public
cd client
npm run build

# 启动后端（静态托管前端）
cd ../server
npm start
```

访问 http://localhost:3001

## 初始管理员配置

在 `server/.env` 中配置：
```
INIT_ADMIN_USERNAME=admin
INIT_ADMIN_PASSWORD=admin123456
JWT_SECRET=your-jwt-secret
```

系统首次启动时自动创建初始管理员账号。

## 数据文件

JSON 数据文件存储在 `server/data/` 目录：
- `users.json` - 用户数据
- `requests.json` - 差旅申请
- `audit-logs.json` - 审计日志
- `token-blacklist.json` - 令牌黑名单

## E2E 测试

```bash
cd tests
npm install
npx playwright install
npm test
```