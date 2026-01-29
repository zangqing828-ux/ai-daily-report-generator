# 数据库配置检查清单

## ✅ Supabase 配置步骤

### 1. 创建 Supabase 项目
- [ ] 访问 https://supabase.com 并登录
- [ ] 创建新项目，命名为 `ai-daily-report`
- [ ] 设置强密码（请妥善保存！）
- [ ] 选择最近的区域（如 Singapore）
- [ ] 等待项目初始化完成（约 2-3 分钟）

### 2. 获取连接信息
- [ ] 进入 Settings → Database
- [ ] 在 Connection string 部分，选择 "URI" 标签
- [ ] 复制连接字符串

### 3. 更新环境变量
- [ ] 打开 `backend/.env` 文件
- [ ] 替换 `DATABASE_URL` 为 Supabase 连接字符串
- [ ] 注意：密码中的特殊字符需要转义
  - `@` → `%40`
  - `#` → `%23`
  - `:` → `%3A`
  - 空格 → `%20`

### 4. 初始化数据库

**方法 A: 使用 Prisma Push（推荐）**
```bash
cd backend
npx prisma generate
npx prisma db push
```

**方法 B: 在 Supabase SQL Editor 执行**
- [ ] 打开 Supabase 控制台
- [ ] 点击 SQL Editor
- [ ] 创建新查询
- [ ] 复制并执行 `backend/prisma/migrations/0001_init.sql` 的内容

### 5. 验证配置
- [ ] 在 Supabase 控制台查看 Table Editor
- [ ] 确认看到 3 个表：User, Project, DailyReport
- [ ] 或运行 `npx prisma studio` 查看数据

### 6. 启动应用
```bash
# 终端 1: 启动后端
cd backend
npm run dev

# 终端 2: 启动前端
cd frontend
npm run dev
```

- [ ] 后端运行在 http://localhost:3001
- [ ] 前端运行在 http://localhost:5173
- [ ] 访问健康检查 http://localhost:3001/health

### 7. 测试完整流程
- [ ] 创建项目
- [ ] 开始对话（模拟）
- [ ] 生成日报
- [ ] 查看历史记录
- [ ] 编辑日报
- [ ] 导出日报

## 📝 重要提示

### 安全建议
1. **永远不要提交 .env 文件到 Git**
2. 使用强密码（至少 16 位，包含大小写字母、数字、符号）
3. 定期更换数据库密码
4. 生产环境使用环境变量管理服务（如 Supabase Vault）

### 连接字符串示例
```
# Supabase 连接字符串格式
DATABASE_URL="postgresql://postgres.project-ref:YOUR-PASSWORD%40HERE@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

### 常见端口
- Supabase 默认使用 `5432` 或 `6543` 端口
- 连接字符串中会自动包含正确的端口

## 🚀 下一步

数据库配置完成后，你可以：

1. **添加用户认证**（暂未实现）
2. **配置 Row Level Security (RLS)** - 数据安全策略
3. **设置实时功能** - 使用 Supabase Realtime
4. **配置文件存储** - 用于 PDF 导出
5. **启用数据备份** - 自动备份策略

## 🆘 遇到问题？

### 连接失败
- 检查密码是否正确
- 确认特殊字符已转义
- 等待 Supabase 项目完全初始化

### Prisma 错误
```bash
# 重新生成 Prisma Client
npx prisma generate

# 查看数据库状态
npx prisma db pull
```

### 查看日志
```bash
# 后端日志
npm run dev

# 查看数据库连接
npx prisma studio
```

## 📚 参考资源

- [Supabase 文档](https://supabase.com/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
