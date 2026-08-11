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