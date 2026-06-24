# Netlify 部署指南（推荐）

## 为什么选择 Netlify？

✅ 国内可以正常访问  
✅ 支持 Next.js  
✅ 免费额度充足  
✅ 一键部署  

## 快速部署步骤

### 1. 注册账号
访问 https://www.netlify.com 注册账号

### 2. 创建项目

#### 方式一：通过 Git 仓库（推荐）

1. 将代码上传到 GitHub/Gitee
2. 登录 Netlify Dashboard
3. 点击"Add new site" → "Import an existing project"
4. 选择你的代码托管平台
5. 配置构建设置：

```
Build command: pnpm build
Publish directory: .next
```

6. 添加环境变量：
```
NEXT_PUBLIC_SUPABASE_URL=https://ehisogcgaegdnwciljhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon key
```

7. 点击"Deploy site"

#### 方式二：手动部署

1. 本地构建项目：
```bash
cd projects
pnpm install
pnpm build
```

2. 在 Netlify Dashboard 点击"Deploys" → "Manual deploy"
3. 拖拽 `.next` 文件夹到上传区域
4. 等待部署完成

### 3. 自定义域名（可选）

1. 购买域名（阿里云/腾讯云）
2. 在 Netlify 中添加自定义域名
3. 配置 DNS：
   ```
   Type: CNAME
   Name: www
   Value: your-site-name.netlify.app
   ```

---

## 成本

| 资源 | 规格 | 价格 |
|------|------|------|
| 带宽 | 100GB/月 | 免费 |
| 构建分钟数 | 300 分钟/月 | 免费 |
| 团队成员 | 3 人 | 免费 |

完全适合班级系统使用！

---

## 优势对比

| 特性 | Netlify | Vercel |
|------|---------|--------|
| 国内访问 | ✅ 可访问 | ❌ 被墙 |
| Next.js 支持 | ✅ 完美 | ✅ 完美 |
| 免费额度 | ✅ 充足 | ✅ 充足 |
| 中文支持 | ⚠️ 英文界面 | ⚠️ 英文界面 |

**结论：Netlify 是 Vercel 的最佳替代品！**
