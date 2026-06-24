# 腾讯云云开发部署指南

## 快速开始

### 1. 注册腾讯云账号
访问 https://cloud.tencent.com 并完成实名认证

### 2. 创建云开发环境
1. 进入 [云开发控制台](https://console.cloud.tencent.com/tcb)
2. 点击"创建环境"
3. 选择"静态网站托管"或"云函数"
4. 填写环境名称，例如：`class-system-dev`

### 3. 部署代码

#### 方式一：使用 CLI 工具

```bash
# 安装腾讯云 CLI
npm install -g tencent-cloud-cli

# 登录
tccli tcb login

# 部署
cd projects
tencent-deploy --env class-system-dev
```

#### 方式二：手动上传

1. 构建项目：
```bash
pnpm build
```

2. 将 `.next` 文件夹和 `public` 文件夹打包

3. 在云开发控制台上传压缩包

### 4. 配置环境变量

在云开发控制台的"环境变量"中设置：
```
NEXT_PUBLIC_SUPABASE_URL=https://ehisogcgaegdnwciljhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon key
```

### 5. 绑定域名（可选）

1. 购买自定义域名（如需要）
2. 在云开发控制台绑定域名
3. 配置 DNS 解析

---

## 成本估算

| 资源 | 规格 | 价格 |
|------|------|------|
| 云函数 | 10 万次调用/月 | 免费 |
| 云存储 | 10GB 存储 | 免费 |
| 带宽 | 100GB/月 | 免费 |
| 域名 | .com 域名 | ¥50/年 |

适合小型班级系统使用！

---

## 优势

✅ 国内访问速度快  
✅ 无需备案（使用腾讯默认域名）  
✅ 中文界面友好  
✅ 客服响应及时  
