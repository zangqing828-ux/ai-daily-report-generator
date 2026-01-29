# 豆包 API 申请和配置指南

## 📋 目录

1. [注册火山引擎账号](#第一步注册火山引擎账号)
2. [开通豆包语音服务](#第二步开通豆包语音服务)
3. [创建应用获取凭证](#第三步创建应用并获取凭证)
4. [配置到项目](#第四步配置到项目)
5. [测试连接](#第五步测试连接)
6. [常见问题](#常见问题)

---

## 第一步：注册火山引擎账号

### 1.1 访问官网

🌐 **网址**: https://www.volcengine.com/

### 1.2 注册流程

1. 点击右上角"**注册/登录**"
2. 选择注册方式：
   - ✅ 手机号注册（推荐）
   - ✅ 邮箱注册
3. 设置密码并完成注册

### 1.3 实名认证（必需）

⚠️ **重要**: 开通API服务前必须完成实名认证

**准备材料**:
- 身份证件（身份证或护照）
- 手机号码（接收验证码）

**认证步骤**:
1. 登录后进入"**账号中心**" → "**实名认证**"
2. 选择"**个人认证**"或"**企业认证**"
3. 上传身份证照片（正反面）
4. 进行人脸识别（手机扫码）
5. 提交审核

⏰ **审核时间**:
- 个人认证：**5-30分钟**
- 企业认证：**1-2个工作日**

---

## 第二步：开通豆包语音服务

### 2.1 进入控制台

🌐 **控制台地址**: https://console.volcengine.com/

### 2.2 找到豆包语音产品

方法1 - 搜索查找:
1. 在控制台首页搜索框输入"**豆包语音**"
2. 点击搜索结果进入产品页

方法2 - 产品列表:
1. 点击左侧导航"**产品**"
2. 找到"**人工智能**"分类
3. 点击"**语音技术**" → "**豆包语音**"

### 2.3 开通服务

1. 在豆包语音产品页，找到"**端到端实时语音大模型**"
2. 点击"**立即开通**"按钮
3. 阅读并同意服务协议
4. 点击"**确认开通**"

💰 **新用户福利**:
- 首次开通通常赠送免费额度
- 具体额度以官方活动为准

---

## 第三步：创建应用并获取凭证

### 3.1 创建应用

1. 进入"**应用管理**"页面
2. 点击"**创建应用**"按钮
3. 填写应用信息:

   ```
   应用名称: AI日报生成器
   应用描述: 智能语音日报生成助手，通过语音对话自动生成结构化工作日报
   ```

4. 点击"**确定**"创建

### 3.2 获取 API 凭证

创建成功后，在应用详情页找到以下信息：

| 字段 | 说明 | 示例值 | 位置 |
|------|------|--------|------|
| **AppID** | 应用ID | `123456789` | 应用详情 → 基本信息 |
| **Access Key** | 访问密钥 | `your-access-key-xxx` | 应用详情 → API密钥 |
| **API Endpoint** | 接口地址 | `wss://openspeech.bytedance.com/api/v3/realtime/dialogue` | 文档中固定值 |

⚠️ **重要提示**:
- **Access Key 只显示一次**，请立即复制保存
- 建议保存到密码管理器（如 1Password、Bitwarden）
- 不要泄露给他人或提交到公开代码仓库

### 3.3 配置应用参数（可选）

在应用详情页，你可以配置：

#### 模型版本选择

推荐选择：**O版本**（通用对话模型）

| 版本 | 特点 | 价格 | 推荐场景 |
|------|------|------|----------|
| **O** | 4个精品音色、通用对话 | 标准 | ✅ 日报助手 |
| O2.0 | 增强唱歌能力、热修复 | 略高 | 娱乐场景 |
| SC | 声音复刻、角色扮演 | 较高 | 特定角色场景 |
| SC2.0 | 角色演绎增强 | 最高 | 高级角色扮演 |

#### 音色配置

推荐音色：`zh_male_yunzhou_jupiter_bigtts`（清爽沉稳男声）

所有可选音色（O版本）:
1. `zh_female_vv_jupiter_bigtts` - 活泼灵动女声
2. `zh_female_xiaohe_jupiter_bigtts` - 甜美活泼女声（台湾口音）
3. `zh_male_yunzhou_jupiter_bigtts` - 清爽沉稳男声 ✅
4. `zh_male_xiaotian_jupiter_bigtts` - 清爽磁性男声

---

## 第四步：配置到项目

### 4.1 更新 `.env` 文件

打开文件: `backend/.env`

找到以下配置部分：

```env
# Doubao Realtime API Configuration
DOUBAO_APP_ID=your-app-id-here
DOUBAO_ACCESS_KEY=your-access-key-here
DOUBAO_MODEL=O
DOUBAO_DEFAULT_SPEAKER=zh_male_yunzhou_jupiter_bigtts
DOUBAO_API_ENDPOINT=wss://openspeech.bytedance.com/api/v3/realtime/dialogue
```

**替换步骤**:
1. 将 `your-app-id-here` 替换为你从控制台获取的 **AppID**
2. 将 `your-access-key-here` 替换为你从控制台获取的 **Access Key**

**示例**:
```env
DOUBAO_APP_ID=123456789
DOUBAO_ACCESS_KEY=abcd1234efgh5678ijkl9012mnop3456
DOUBAO_MODEL=O
DOUBAO_DEFAULT_SPEAKER=zh_male_yunzhou_jupiter_bigtts
DOUBAO_API_ENDPOINT=wss://openspeech.bytedance.com/api/v3/realtime/dialogue
```

### 4.2 保存文件

保存 `.env` 文件后，重启后端服务：

```bash
cd backend
npm run dev
```

### 4.3 验证配置

运行以下命令验证配置是否正确：

```bash
cd backend
node -e "console.log(require('dotenv').config()); console.log('DOUBAO_APP_ID:', process.env.DOUBAO_APP_ID);"
```

应该输出你的 AppID。

---

## 第五步：测试连接

### 5.1 安装依赖

确保已安装 `ws` 和 `uuid` 依赖：

```bash
cd backend
npm install ws uuid @types/ws
```

### 5.2 创建测试脚本

创建测试文件: `backend/test-doubao-connection.js`

```javascript
const WebSocket = require('ws');
require('dotenv').config();

const APP_ID = process.env.DOUBAO_APP_ID;
const ACCESS_KEY = process.env.DOUBAO_ACCESS_KEY;
const API_URL = process.env.DOUBAO_API_ENDPOINT || 'wss://openspeech.bytedance.com/api/v3/realtime/dialogue';

console.log('🔌 开始连接豆包 Realtime API...');
console.log('API URL:', API_URL);
console.log('AppID:', APP_ID);

const ws = new WebSocket(API_URL, {
  headers: {
    'X-Api-App-ID': APP_ID,
    'X-Api-Access-Key': ACCESS_KEY,
    'X-Api-Resource-Id': 'volc.speech.dialog',
    'X-Api-App-Key': 'PlgvMymc7f3tQnJ6',
    'X-Api-Connect-Id': generateUUID()
  }
});

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

ws.on('open', () => {
  console.log('✅ WebSocket 连接成功！');

  // 发送 StartConnection 事件
  const event = {
    event_id: 1,
    payload: {}
  };

  try {
    // 这里需要实现二进制协议编码
    // 暂时发送空 JSON 测试连接
    ws.send(JSON.stringify(event));
    console.log('📤 已发送 StartConnection 事件');
  } catch (error) {
    console.error('❌ 发送事件失败:', error);
  }

  // 5秒后断开连接
  setTimeout(() => {
    console.log('🔌 断开连接...');
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  console.log('📥 收到消息:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket 错误:', error.message);
});

ws.on('close', (code, reason) => {
  console.log('🔌 连接已关闭');
  console.log('关闭码:', code);
  console.log('关闭原因:', reason.toString());
  process.exit(code === 1000 ? 0 : 1);
});
```

### 5.3 运行测试

```bash
cd backend
node test-doubao-connection.js
```

**预期输出**:
```
🔌 开始连接豆包 Realtime API...
API URL: wss://openspeech.bytedance.com/api/v3/realtime/dialogue
AppID: 123456789
✅ WebSocket 连接成功！
📤 已发送 StartConnection 事件
📥 收到消息: ...
🔌 断开连接...
🔌 连接已关闭
```

### 5.4 故障排查

如果连接失败，检查以下项：

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| `401 Unauthorized` | Access Key 错误 | 检查 `.env` 中的 `DOUBAO_ACCESS_KEY` |
| `403 Forbidden` | AppID 错误或未开通服务 | 检查 `DOUBAO_APP_ID`，确认已开通豆包语音 |
| `Connection timeout` | 网络问题 | 检查网络连接，尝试使用 VPN |
| `Handshake failed` | Header 缺失 | 检查请求头是否完整 |

---

## 常见问题

### Q1: 如何查看当前账户余额？

1. 进入"**费用中心**" → "**账户概览**"
2. 查看余额和消费明细
3. 设置余额告警（推荐）

### Q2: 豆包语音如何计费？

**按量计费**（推荐刚开始）:
- 输入音频：**80元/百万token**
- 输入文本（cached）：**5元/百万token**
- 输出音频/文本：根据模型版本不同

**资源包**（适合确定使用量后）:
- 购买资源包可享受折扣
- 支持7折-9折优惠

**计算示例**:
一次5分钟对话（约30轮）：
- 输入音频：约 150,000 tokens = **12元**
- 输出文本+音频：约 100,000 tokens = **8元**
- **单次成本约 20元**

### Q3: 如何设置告警？

1. 进入"**费用中心**" → "**告警管理**"
2. 创建告警规则：
   - 余额告警：低于100元
   - 用量告警：每日超过100次调用
3. 绑定手机/邮箱接收通知

### Q4: Access Key 泄露了怎么办？

⚠️ **紧急处理步骤**:

1. 立即登录控制台
2. 进入"**应用管理**" → 选择你的应用
3. 点击"**重置密钥**"或"**删除密钥**"
4. 创建新的 Access Key
5. 更新项目中的 `.env` 文件
6. 监控异常调用记录

### Q5: 开发环境和生产环境如何隔离？

**推荐方案**:
1. 创建两个应用：
   - `AI日报生成器-开发`（测试用）
   - `AI日报生成器-生产`（正式用）
2. 使用不同的 Access Key
3. 在 `.env.development` 和 `.env.production` 中分别配置

### Q6: 免费额度有多少？

以官方实际政策为准，通常：
- 新用户首次开通赠送免费额度
- 具体额度根据活动可能不同
- 建议登录控制台查看"**优惠活动**"

### Q7: 如何联系技术支持？

**官方支持渠道**:
1. **工单系统**: 控制台 → "工单" → "提交工单"
2. **技术社区**: https://developer.volcengine.com/
3. **客服热线**: 400-850-0089（工作日 9:00-21:00）

### Q8: API 调用失败如何排查？

**排查步骤**:

1. **检查凭证**:
   ```bash
   echo $DOUBAO_APP_ID
   echo $DOUBAO_ACCESS_KEY
   ```

2. **查看日志**:
   - 后端日志: `backend/logs/`
   - 控制台日志: 查看响应的 `X-Tt-Logid` 用于工单排查

3. **验证权限**:
   - 确认已开通"豆包语音"
   - 确认账户余额充足

4. **检查限流**:
   - QPM (每分钟查询数) 是否超限
   - TPM (每分钟token数) 是否超限

### Q9: 支持哪些语言和方言？

**豆包 Realtime API 支持**:
- ✅ 中文（普通话）
- ✅ 英文
- ⚠️ 其他语言效果有待验证

**方言支持**（以实际为准）:
- 粤语
- 四川话
- 上海话
- 等

### Q10: 如何降低延迟？

**优化建议**:

1. **网络优化**:
   - 使用 CDN 加速（如果支持）
   - 部署服务器到离豆包机房近的区域

2. **音频处理**:
   - 使用 20ms 音频包（推荐）
   - 启用音频压缩

3. **模型选择**:
   - O版本延迟最低
   - SC/SC2.0版本略高（因为角色扮演计算）

---

## 📞 需要帮助？

如果按照本指南操作后仍有问题，可以：

1. **查看官方文档**:
   - 豆包 Realtime API: https://www.volcengine.com/docs/6561/1594356?lang=zh
   - 计费说明: https://www.volcengine.com/docs/6561/1359370

2. **提交工单**:
   - 登录控制台 → 工单 → 提交工单
   - 选择"语音技术" → "豆包语音"

3. **联系开发团队**:
   - 提供错误日志和 `X-Tt-Logid`
   - 详细描述问题和复现步骤

---

## ✅ 配置检查清单

完成以下所有项后，即可开始集成：

- [ ] 已注册火山引擎账号
- [ ] 已完成实名认证
- [ ] 已开通豆包语音服务
- [ ] 已创建应用并获取 AppID
- [ ] 已复制 Access Key
- [ ] 已更新 `.env` 文件
- [ ] 已运行测试脚本验证连接
- [ ] 已设置费用告警
- [ ] 已阅读官方文档

---

**下一步**: 配置完成后，通知开发团队开始集成豆包 Realtime API 到项目中。

**相关文档**:
- [DOUBAO_INTEGRATION_PLAN.md](./DOUBAO_INTEGRATION_PLAN.md) - 豆包集成技术方案
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - 数据库配置指南
