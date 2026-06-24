# 智能班级管理系统

## 项目概览

这是一个基于 Next.js 16 (App Router) 的智能班级管理系统，支持学生提交作业、统计未提交学生、内置AI助手和QQ文件发送功能。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase
- **AI**: DeepSeek API (通过 coze-coding-dev-sdk)

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── login/          # 登录页面
│   │   ├── register/       # 注册页面
│   │   ├── dashboard/      # 主控制台
│   │   ├── classes/        # 班级管理
│   │   ├── assignments/    # 作业管理
│   │   ├── ai-assistant/   # AI助手
│   │   └── api/            # API路由
│   │       ├── ai/chat/    # AI对话接口
│   │       ├── assignments/statistics/ # 作业统计
│   │       └── files/send/ # 文件发送
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   ├── supabase-config-inject.tsx  # Supabase配置注入
│   │   ├── supabase-browser.ts         # Supabase浏览器客户端
│   │   └── utils.ts                    # 通用工具函数
│   ├── storage/            # 数据存储
│   │   └── database/       # 数据库相关
│   │       ├── shared/schema.ts        # 数据库Schema定义
│   │       └── supabase-client.ts      # Supabase客户端
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

## 核心功能

### 1. 用户认证系统
- 教师和学生角色区分
- 邮箱登录（基于Supabase Auth）
- 用户信息存储在数据库中

### 2. 班级管理
- 创建班级（教师）
- 加入班级（学生）
- 班级成员管理
- 班级邀请码生成

### 3. 作业管理
- 创建作业（教师）
- 作业提交（学生）
- 文件上传支持
- 截止日期设置

### 4. 未提交统计
- 实时统计未提交学生名单
- 查看提交详情
- QQ号码显示（用于发送提醒）

### 5. AI助手
- 集成DeepSeek AI
- 流式对话响应
- 智能问答功能

### 6. QQ文件发送
- 批量压缩提交的文件
- 通过QQ发送给教师
- 支持按作业筛选文件

## 数据库Schema

### users表
- id (UUID, 主键)
- name (用户名)
- email (邮箱)
- qq_number (QQ号码，可选)
- created_at (创建时间)

### classes表
- id (UUID, 主键)
- name (班级名称)
- description (班级描述)
- invite_code (邀请码)
- creator_id (创建者ID，外键)
- created_at (创建时间)

### class_members表
- id (UUID, 主键)
- class_id (班级ID，外键)
- user_id (用户ID，外键)
- role (角色：teacher/student)
- joined_at (加入时间)

### assignments表
- id (UUID, 主键)
- class_id (班级ID，外键)
- title (作业标题)
- description (作业描述)
- deadline (截止时间)
- creator_id (创建者ID，外键)
- created_at (创建时间)

### submissions表
- id (UUID, 主键)
- assignment_id (作业ID，外键)
- user_id (用户ID，外键)
- files (提交文件列表，JSON)
- submitted_at (提交时间)
- status (状态)

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范
- 默认按 TypeScript `strict` 心智写代码
- 禁止隐式 `any` 和 `as any`
- 函数参数、返回值应有明确类型标注
- 优先复用已声明变量，避免引用未声明标识符

### next.config 配置规范
- 配置路径使用动态拼接（`path.resolve(__dirname, ...)`）
- 禁止硬编码绝对路径

### Hydration 问题防范
- 严禁在 JSX 渲染逻辑中直接使用动态数据（`typeof window`、`Date.now()`等）
- 必须使用 'use client' + useEffect + useState 确保客户端渲染
- 严禁非法 HTML 嵌套（如 `<p>` 嵌套 `<div>`）

### head 标签使用规范
- 禁止使用 head 标签
- 优先使用 metadata API
- CSS/字体通过 globals.css 或 next/font 引入
- preload/preconnect 通过 ReactDOM 方法引入

## UI 设计规范

- 使用 shadcn/ui 组件库（位于 `src/components/ui/`）
- Tailwind CSS 进行样式定制
- 遵循现代、简洁、专业的教育系统设计风格
- 主色调：蓝色系（代表知识和信任）
- 辅助色：绿色系（代表成长和活力）

## 构建和测试命令

```bash
# 开发环境启动
pnpm run dev

# 类型检查
pnpm ts-check

# 构建检查
pnpm lint:build --quiet

# 构建生产版本
pnpm run build

# 启动生产环境
pnpm run start
```

## 环境变量

项目使用以下环境变量（通过 Supabase SDK 自动获取）：
- `COZE_SUPABASE_URL` - Supabase 项目 URL
- `COZE_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `COZE_SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥（可选）
- `DEPLOY_RUN_PORT` - 服务运行端口（默认5000）
- `COZE_PROJECT_DOMAIN_DEFAULT` - 项目域名

## API 接口

### /api/ai/chat
- POST - AI对话接口（流式响应）
- 参数：messages（对话历史）
- 返回：SSE流式数据

### /api/assignments/statistics
- GET - 获取作业统计信息
- 参数：assignment_id
- 返回：未提交学生列表、提交学生列表

### /api/files/send
- POST - 发送文件压缩包
- 参数：assignment_id, teacher_qq
- 返回：压缩文件URL

## 安全注意事项

- 用户认证基于 Supabase Auth
- 数据库访问使用 RLS（行级安全）策略
- API 接口需验证用户身份（通过 x-session header）
- 文件上传需验证用户权限
- QQ发送功能需教师授权

## 常见问题修复

1. **Hydration 错误**：检查是否有动态数据直接渲染，添加 'use client' 和 useEffect
2. **类型错误**：检查是否使用了隐式 any，添加明确类型标注
3. **数据库连接错误**：检查 Supabase 配置是否正确加载
4. **AI助手无响应**：检查 DeepSeek API 配置和网络连接

## 开发建议

1. 新功能开发前先理解数据库Schema
2. API开发遵循前后端分离原则
3. UI开发优先使用 shadcn/ui 组件
4. AI功能集成遵循流式输出优先原则
5. 文件处理注意权限和安全性验证