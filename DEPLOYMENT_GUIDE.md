# 智能班级管理系统 - 生产环境部署指南

## 📋 目录

1. [快速开始](#快速开始)
2. [服务器配置](#服务器配置)
3. [数据库与存储](#数据库与存储)
4. [域名与 SSL](#域名与 ssl)
5. [文件存储方案](#文件存储方案)
6. [安全加固](#安全加固)
7. [性能优化](#性能优化)
8. [备份策略](#备份策略)

---

## 🚀 快速开始

### 方案选择

| 需求 | 推荐方案 | 成本 | 难度 |
|------|---------|------|------|
| 单个班级测试 | Vercel + Supabase 免费版 | ¥0 | ⭐ |
| 全校使用（<500 人） | Vercel + Supabase Pro | ¥180/月 | ⭐⭐ |
| 多校合作（>5000 人） | 自建服务器 + PostgreSQL + OSS | ¥800+/月 | ⭐⭐⭐⭐ |

---

## 🔧 服务器配置

### 选项 A：Vercel（推荐新手）

**优点：**
- ✅ 零运维，一键部署
- ✅ 自动 HTTPS
- ✅ 免费额度充足
- ✅ CDN 加速全球访问

**限制：**
- ⚠️ 函数执行时间最长 10 秒
- ⚠️ 内存限制 1GB

**部署步骤：**

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
cd projects
vercel --prod
```

### 选项 B：自建服务器（Linux）

**最低配置：**
```yaml
CPU: 2 核心
内存：4GB
硬盘：40GB SSD
带宽：5Mbps
```

**推荐服务商：**
- 阿里云 ECS（学生优惠后约¥100/月）
- 腾讯云 CVM
- AWS EC2

**系统要求：**
```bash
# 安装 Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装 PM2（进程管理）
sudo npm install -g pm2

# 安装 Nginx（反向代理）
sudo yum install -y nginx
```

**启动服务：**

```bash
# 构建项目
pnpm build

# 启动生产环境
pm2 start "pnpm start" --name class-management-system

# 设置开机自启
pm2 startup
pm2 save
```

---

## 💾 数据库与存储

### Supabase 配置

#### 免费版（适合开发/小规模）
- 数据库：500MB
- 带宽：2GB/月
- 用户数：5,000
- 适用：< 200 人

#### Pro 版（$25/月 ≈ ¥180）
- 数据库：20GB
- 带宽：100GB/月
- 用户数：无限制
- 适用：200-5000 人

**升级步骤：**
1. 访问 https://supabase.com/dashboard
2. Project Settings → Billing
3. 选择 Pro plan
4. 输入支付信息

### 文件存储方案对比

#### 方案 1：Supabase Storage（最简单）

```sql
-- 创建存储桶
INSERT INTO storage.buckets (id, name, public) VALUES
('homework-files', '作业文件', false),
('teacher-docs', '教师资料', false),
('system-files', '系统文件', false);
```

**价格计算示例：**
- 50GB 存储：$0.023/GB × 50 = $1.15/月
- 100 万次下载：$0.008/次 × 100 万 = $8/月
- **总计：约¥70/月**

#### 方案 2：阿里云 OSS（国内访问快）

**优势：**
- 国内访问速度快
- 首次购买便宜
- 支持 CDN 加速

**价格参考（华东 1）：**
```
存储费：0.12 元/GB/月
下行流量：0.25 元/GB
请求次数：0.01 元/万次

50GB 存储 + 100GB 流量 = ¥6 + ¥25 = ¥31/月
```

**配置步骤：**

```bash
# 1. 注册阿里云账号并完成实名认证
# 2. 创建 OSS Bucket
# 3. 创建 AccessKey
# 4. 配置环境变量

# .env.local
NEXT_PUBLIC_OSS_BUCKET=your-bucket-name
NEXT_PUBLIC_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_ACCESS_KEY_ID=your-access-key
OSS_ACCESS_KEY_SECRET=your-secret
```

#### 方案 3：AWS S3（国际通用）

**适合场景：**
- 面向海外用户
- 需要全球访问
- 已有 AWS 生态

**价格参考：**
```
标准存储：$0.023/GB/月
请求费用：$0.005/千次
数据传输：$0.09/GB（首 10TB）

50GB + 少量请求 ≈ $2-3/月
```

---

## 🌐 域名与 SSL

### 购买域名

**推荐平台：**
- 阿里云：https://wanwang.aliyun.com/
- 腾讯云：https://www.tencentcloud.com/
- Namecheap（国际）：https://namecheap.com/

**价格参考：**
- `.com` / `.cn`: ¥50-70/年
- `.edu.cn`（需教育资质）：¥80/年

### DNS 解析配置

**Vercel 部署：**
```
@       CNAME   your-project.vercel.app
www     CNAME   your-project.vercel.app
```

**自建服务器：**
```
@       A       你的服务器 IP
www     A       你的服务器 IP
```

### SSL 证书

**免费方案：**
- Vercel：自动签发
- Let's Encrypt：手动配置（免费，90 天有效期）

**Nginx 配置（自建服务器）：**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书路径
    ssl_certificate /etc/nginx/ssl/your-domain.crt;
    ssl_certificate_key /etc/nginx/ssl/your-domain.key;
    
    # SSL 优化
    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:...;
    
    # Next.js 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 安全加固

### 1. 环境变量加密

```bash
# .env.production
# 不要明文存储敏感信息

# 生成随机密钥
openssl rand -base64 32

# Supabase 密钥轮换
# 定期更换 ANON_KEY 和 SERVICE_ROLE_KEY
```

### 2. CORS 配置

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://your-domain.com' 
              : '*',
          },
        ],
      },
    ]
  },
}
```

### 3. 速率限制

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";

export const apiRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
});
```

### 4. SQL 注入防护

```typescript
// 始终使用参数化查询
// ❌ 错误
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ 正确
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);
```

---

## ⚡ 性能优化

### 1. 数据库索引优化

已添加的索引：
```sql
-- 常用查询优化
CREATE INDEX idx_assignments_class_created ON assignments(class_id, created_at DESC);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_class_members_role ON class_members(role);
```

### 2. 前端优化

```typescript
// next.config.ts
const nextConfig = {
  // 启用图像优化
  images: {
    domains: ['your-storage.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // 启用压缩
  compress: true,
  
  // 缓存策略
  swcMinify: true,
}
```

### 3. CDN 加速

**阿里云 CDN 配置：**
```
1. 在 OSS 控制台绑定 CDN 域名
2. 配置缓存规则：
   - 图片：30 天
   - CSS/JS：1 年
   - HTML：0 秒（不缓存）
3. 开启 Gzip 压缩
```

---

## 💿 备份策略

### 数据库备份

**Supabase 自动备份：**
- Pro 计划：每日自动备份
- 保留期限：7 天

**手动备份脚本：**

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups/db"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE_URL=$SUPABASE_DB_URL

# 创建备份
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# 压缩备份
gzip $BACKUP_DIR/backup_$DATE.sql

# 上传到 OSS
ossutil cp $BACKUP_DIR/backup_$DATE.sql.gz oss://backup-bucket/db/

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### 文件备份

**OSS 版本控制：**
```bash
# 启用版本控制防止误删
ossutil versioning enable oss://your-bucket
```

### 恢复演练

每月执行一次恢复测试：
```bash
# 测试恢复流程
pg_restore -d new_database backup_20240101.sql.gz
```

---

## 📊 监控与告警

### 应用监控

**推荐工具：**
- **Vercel Analytics**（免费）
- **Sentry**（错误追踪）
- **Upstash**（API 调用统计）

### 数据库监控

```sql
-- 查看表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🎯 上线检查清单

### 功能测试
- [ ] 注册/登录功能正常
- [ ] 邮箱确认功能开启
- [ ] 文件上传/下载正常
- [ ] 权限控制正确
- [ ] 响应式布局适配

### 安全测试
- [ ] HTTPS 强制启用
- [ ] CORS 配置正确
- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] CSRF Token 验证

### 性能测试
- [ ] 首屏加载 < 3 秒
- [ ] API 响应 < 500ms
- [ ] 并发测试通过
- [ ] 压力测试达标

### 运维准备
- [ ] 监控告警配置
- [ ] 备份策略实施
- [ ] 日志收集配置
- [ ] 灾难恢复预案

---

## 💰 成本估算

### 小型部署（< 500 用户）

```
Vercel Pro:         ¥0/月（免费额度内）
Supabase Pro:       ¥180/月
阿里云 OSS:         ¥50/月
域名：              ¥5/月
--------------------------
总计：             ¥235/月
```

### 中型部署（500-5000 用户）

```
Vercel Pro:         ¥180/月
Supabase Pro:       ¥180/月
阿里云 OSS + CDN:   ¥200/月
自建服务器（可选）：¥200/月
域名 + SSL:         ¥5/月
--------------------------
总计：             ¥565-765/月
```

### 大型部署（> 5000 用户）

```
独立服务器集群：    ¥2000+/月
RDS PostgreSQL:     ¥1000+/月
云存储 + CDN:       ¥1000+/月
监控告警：          ¥500+/月
--------------------------
总计：             ¥4500+/月
```

---

## 📞 技术支持

遇到问题？

1. **Supabase 文档**: https://supabase.com/docs
2. **Vercel 支持**: https://vercel.com/support
3. **阿里云帮助**: https://help.aliyun.com/
4. **本项目 Issues**: 提交 GitHub Issue

---

## 🎉 总结

根据你的实际需求选择合适的方案：

- **个人/单班级**: 使用免费套餐即可
- **全校推广**: Supabase Pro + Vercel
- **多校合作**: 考虑自建服务器 + 对象存储

记住：**先小规模试运行，根据数据再扩容！**

祝部署顺利！🚀
