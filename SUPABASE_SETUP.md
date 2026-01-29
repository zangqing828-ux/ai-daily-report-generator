# Supabase 数据库配置指南

## 步骤 1: 创建 Supabase 项目

1. 访问 https://supabase.com
2. 注册/登录账户
3. 点击 **"New Project"**
4. 填写项目信息：
   - **Name**: `ai-daily-report`
   - **Database Password**: 设置一个强密码（请记住！）
   - **Region**: 选择 `Southeast Asia (Singapore)` 或离你最近的区域
5. 点击 **"Create new project"**
6. 等待 2-3 分钟，项目初始化完成

## 步骤 2: 获取数据库连接字符串

1. 在左侧菜单点击 **Settings** → **Database**
2. 找到 **Connection string** 部分
3. 点击 **URI** 标签页
4. 复制连接字符串，格式类似：
   ```
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

## 步骤 3: 更新 .env 文件

打开 `backend/.env` 文件，将 `DATABASE_URL` 替换为你从 Supabase 复制的连接字符串：

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

**重要提示：**
- 将 `[YOUR-PASSWORD]` 替换为你在步骤 1 中设置的密码
- 确保密码中的特殊字符被正确转义（如 `@` 需要改为 `%40`）

## 步骤 4: 运行数据库迁移

在项目根目录执行：

```bash
cd backend

# 生成 Prisma Client
npx prisma generate

# 推送数据库 schema（创建表）
npx prisma db push

# 或者使用迁移（推荐生产环境）
npx prisma migrate dev --name init
```

## 步骤 5: 验证数据库连接

1. 在 Supabase 控制台，点击 **Table Editor**
2. 你应该能看到自动创建的表：
   - `User` (用户表)
   - `Project` (项目表)
   - `DailyReport` (日报表)

3. 或者使用 Prisma Studio 查看数据：
   ```bash
   npx prisma studio
   ```

## 步骤 6: 启动应用

```bash
# 后端
cd backend
npm run dev

# 前端（新终端）
cd frontend
npm run dev
```

访问 http://localhost:5173 开始使用！

## 常见问题

### Q: 连接失败怎么办？
**A:** 检查以下几点：
1. 密码是否正确
2. 密码中的特殊字符是否正确转义（如 `@` → `%40`, `#` → `%23`）
3. Supabase 项目是否已完全初始化（等待状态变为 "Active"）

### Q: 如何重置数据库？
**A:** 在 Supabase 控制台：
1. Settings → Database
2. 找到 **Reset Database Password**
3. 或使用 SQL Editor 执行 `TRUNCATE` 或 `DROP` 命令

### Q: 免费账户的限制是什么？
**A:** Supabase 免费计划包括：
- 500 MB 数据库存储
- 1 GB 文件存储
- 50 MB 带宽/月
- 2 个 API 项目
- 对于开发和测试完全够用

## 数据库 Schema 说明

### User (用户表)
- `id`: UUID (主键)
- `email`: String (唯一)
- `passwordHash`: String (可选)
- `name`: String (可选)
- `projects`: 关联到 Project 表
- `reports`: 关联到 DailyReport 表

### Project (项目表)
- `id`: UUID (主键)
- `name`: String
- `description`: String (可选)
- `userId`: UUID (外键)
- `createdAt`: DateTime
- `updatedAt`: DateTime
- 唯一约束: `(userId, name)`

### DailyReport (日报表)
- `id`: UUID (主键)
- `date`: String (格式: YYYY-MM-DD)
- `userId`: UUID (外键)
- `projectId`: UUID (外键)
- `todayWork`: JSON (分类的工作项)
- `tomorrowPlan`: JSON 数组
- `summary`: String
- `conversation`: JSON (对话历史)
- `duration`: String (可选)
- 唯一约束: `(userId, projectId, date)`

## 下一步

数据库配置完成后，你还可以：

1. **配置 Row Level Security (RLS)** - 添加数据安全策略
2. **设置实时订阅** - 使用 Supabase Realtime 功能
3. **配置文件存储** - 用于存储导出的 PDF 文件
4. **添加数据备份** - 定期自动备份数据库
