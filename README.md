<div align="center">

# 🚀 NezhaDash Pro

### 新一代AI驱动服务器监控面板 — 强大、优雅、可扩展

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/clowlove/nezha-dash-pro)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.3-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://docker.com)

基于 [nezha-dash](https://github.com/hamster1963/nezha-dash) 深度优化的 **Pro 版本**，新增 **30+ 功能模块**、**45,000+ 行代码**、**120+ 项优化**。

</div>

---

## 📋 目录

- [✨ 核心功能](#-核心功能)
- [🧠 AI智能引擎](#-ai智能引擎)
- [⚡ 核心架构升级](#-核心架构升级)
- [🎨 UI革命](#-ui革命)
- [🏭 生产级基础设施](#-生产级基础设施)
- [🏗️ 技术架构](#️-技术架构)
- [📊 优化清单](#-优化清单)
- [🚀 快速开始](#-快速开始)
- [⚙️ 环境变量](#️-环境变量)
- [📖 API文档](#-api文档)
- [🔌 插件开发](#-插件开发)
- [💰 商业化](#-商业化)
- [🤝 贡献](#-贡献)
- [📄 许可证](#-许可证)

---

## ✨ 核心功能

### 🔌 四种数据源支持

| 数据源 | 状态 | 环境变量 |
|--------|------|----------|
| [哪吒监控](https://github.com/naiba/nezha) | ✅ 完整支持 | `NezhaBaseUrl` + `NezhaAuth` |
| [Komari](https://github.com/komari-app/komari) | ✅ 完整支持 | `NEXT_PUBLIC_Komari=true` |
| [MyNodeQuery](https://github.com/mhqs/mynodequery) | ✅ 完整支持 | `NEXT_PUBLIC_MyNodeQuery=true` |
| [Uptime Kuma](https://github.com/louislam/uptime-kuma) | ✅ 完整支持 | `NEXT_PUBLIC_UptimeKuma=true` |

### 🆕 Pro 版新增功能

#### 🚨 AI智能告警系统
- 阈值检测（CPU/内存/磁盘/丢包/离线）
- 5条默认规则 + 自定义规则CRUD
- AI智能诊断（调用LLM分析异常原因）
- 持续时间+冷却期机制
- O(1)告警索引查找

#### 📱 多渠道通知
- **Telegram Bot** — HTML格式化消息
- **Discord Webhook** — Embed富文本
- **通用Webhook** — HMAC-SHA256签名
- 15秒超时保护
- 3次指数退避重试

#### 📊 历史数据持久化
- SQLite WAL模式存储
- 渐进式聚合（5s→1min→5min→30min→2h→1d）
- 10张表 + 18个索引
- 写透缓存（内存L1 + SQLite L2）
- 24h/7d/30d/90d时间范围查询

#### 🎨 主题系统
- 10个预设主题（Dark Pro/Cyberpunk/Ocean/Forest/Sunset/Minimal/Corporate/Dracula/Nord/Tokyo Night）
- 自定义颜色编辑器（19个颜色字段）
- CSS变量引擎 + localStorage持久化
- 主题导出/导入JSON

#### 🔐 2FA双因素认证
- TOTP实现（RFC 4648 Base32 + RFC 4226 HOTP）
- AES-256-GCM加密存储密钥
- QR码扫描 + 恢复码
- 常量时间比较（防时序攻击）

#### 🚀 一键批量部署
- SSH连接池（并行+并发控制）
- 密码/密钥两种认证
- 一键安装Nezha Agent
- 实时进度条 + 失败重试
- 部署面板UI

#### 💰 流量/成本统计
- 流量快照记录（每小时）
- 多币种支持（USD/CNY/EUR）
- 月度成本估算 + 突增检测
- 月度报告生成 + CSV导出
- 流量图表（24h/7d/30d/90d）

#### 👥 用户系统 + 多租户
- RBAC权限模型（4角色12权限）
- 密码哈希（PBKDF2-SHA512，100k轮次）
- 团队管理 + 邀请链接
- 3级套餐（Free/Pro/Team/Enterprise）
- 配额强制执行

#### 📱 移动端PWA优化
- 底部Tab导航（5个标签）
- 触摸友好服务器卡片（滑动/展开）
- 下拉刷新组件
- 底部Sheet弹窗
- 44px最小触摸目标
- Safe Area适配（刘海屏）

#### 📈 高级图表系统
- **MetricChart** — 通用面积/折线/柱状图
- **ComparisonChart** — 多服务器对比
- **HeatmapChart** — 365天活跃度热力图
- **GaugeChart** — 动画环形仪表盘
- **NetworkTopology** — SVG网络拓扑图
- **ExportButton** — PNG/SVG/CSV导出

#### 🔌 插件系统
- 沙箱执行（new Function隔离）
- 4种Hook（onServerData/onAlert/onNotification/onDeploy）
- 5种权限（read:servers/read:alerts/write:notifications等）
- 热重载支持
- 示例健康检查插件

#### 🪝 Webhook系统
- 5种事件类型（server.online/offline/alert.triggered/resolved/deploy.completed）
- HMAC-SHA256签名验证
- 3次指数退避重试（1s/5s/15s）
- 交付日志记录

#### 📦 JavaScript SDK
- 零依赖TypeScript客户端
- 完整类型安全
- 可配置重试/超时
- CJS/ESM双构建
- 完整文档 + 示例

#### 💰 SaaS计费平台
- 4级套餐（Free 3台/Pro 20台/Team 100台/Enterprise无限）
- 订阅生命周期（试用→活跃→逾期→取消）
- 按比例计算（升级/降级）
- 优惠券系统（百分比/固定金额）
- 功能门控（11个功能×4级套餐）
- 定价页面 + 用量仪表盘

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ SWR轮询   │  │ React 19 │  │ PWA      │  │ 主题引擎  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
├───────┴──────────────┴────────────┴──────────────┴──────────┤
│                    Next.js 16 App Router                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Server Comp  │  │ Client Comp  │  │ Context Providers│  │
│  │ (RSC)        │  │ (交互)       │  │ (4层嵌套)        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
├─────────┴──────────────────┴───────────────────┴────────────┤
│                    功能模块层                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│  │告警 │ │通知 │ │存储 │ │部署 │ │计费 │ │用户 │ │插件 │ │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ │
├─────┴────────┴───────┴───────┴───────┴───────┴───────┴──────┤
│                    数据源驱动层                               │
│  ┌──────┐  ┌──────┐  ┌──────────┐  ┌───────────┐          │
│  │ Nezha│  │Komari│  │MyNodeQry │  │UptimeKuma│           │
│  └──┬───┘  └──┬───┘  └────┬─────┘  └─────┬────┘           │
├─────┴──────────┴───────────┴───────────────┴────────────────┤
│                    存储层                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  SQLite   │  │ 内存L1   │  │ localStorage│              │
│  │  (持久化) │  │ (缓存)   │  │ (主题/偏好) │              │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 优化清单

### 🔒 安全优化（7项）

| # | 优化 | 文件 | 说明 |
|---|------|------|------|
| 1 | 移除eval() | `lib/plugins/loader.ts` | → new Function()沙箱 |
| 2 | SSH密码保护 | `lib/deploy/ssh-manager.ts` | → 环境变量传递 |
| 3 | SSH主机密钥 | `lib/deploy/ssh-manager.ts` | → accept-new |
| 4 | 2FA加密密钥 | `lib/auth/2fa-setup.ts` | → 必须配置环境变量 |
| 5 | 密码时序攻击 | `lib/users/user-manager.ts` | → timingSafeEqual |
| 6 | Webhook SSRF | `lib/webhooks/webhook-manager.ts` | → 私有IP验证 |
| 7 | base64编码 | `lib/users/user-manager.ts` | → base64url |

### ⚡ 性能优化（13项）

| # | 优化 | 文件 | 影响 |
|---|------|------|------|
| 1 | React.memo | ServerCard.tsx | 防止列表重渲染 |
| 2 | React.memo | ServerCardInline.tsx | 防止列表重渲染 |
| 3 | 5个useMemo | ServerListClient.tsx | 排序/筛选缓存 |
| 4 | useMemo GeoJSON | Global.tsx | JSON解析缓存 |
| 5 | useMemo国家统计 | Global.tsx | 统计缓存 |
| 6 | useMemo D3投影 | InteractiveMap.tsx | 地图投影缓存 |
| 7 | useMemo国家索引 | InteractiveMap.tsx | hover O(1)查找 |
| 8 | 修复数组变异 | DashCommand.tsx | 不污染Context |
| 9 | useMemo排序 | DashCommand.tsx | 排序缓存 |
| 10 | 7个useMemo | ServerDetailChartClient.tsx | 图表数据缓存 |
| 11 | 命名导入 | chart.tsx | Tree-shaking |
| 12 | O(1)告警索引 | alert-manager.ts | Map索引查找 |
| 13 | Math.max修复 | 3个文件 | 防止栈溢出 |

### 🏗️ 架构优化（8项）

| # | 优化 | 文件 | 说明 |
|---|------|------|------|
| 1 | SQLite持久化 | `lib/shared/database.ts` | WAL模式单例 |
| 2 | 数据库迁移 | `lib/shared/migrations.ts` | 10表18索引 |
| 3 | 写透缓存 | users/alerts/webhooks/notifications | 内存L1+SQLite L2 |
| 4 | 类型统一 | `lib/shared/types.ts` | 单一真相源 |
| 5 | serverId统一 | 4个模块 | 全部number类型 |
| 6 | ID生成统一 | 2个模块 | crypto.randomUUID() |
| 7 | fetch超时 | 3个通知器 | 15秒AbortController |
| 8 | 错误处理 | 4个API路由 | try-catch包装 |

### 🛡️ 安全加固（4项）

| # | 优化 | 文件 | 说明 |
|---|------|------|------|
| 1 | poweredByHeader | next.config.mjs | 移除X-Powered-By |
| 2 | 非root用户 | Dockerfile | nextjs用户运行 |
| 3 | 健康检查 | Dockerfile | 30秒间隔 |
| 4 | OG元数据 | layout.tsx | 社交分享优化 |

### 📦 依赖优化（3项）

| # | 优化 | 文件 | 说明 |
|---|------|------|------|
| 1 | Node 22 LTS | Dockerfile | 替换Node 25 |
| 2 | AVIF/WebP | next.config.mjs | 现代图片格式 |
| 3 | docker-compose | docker/ | 健康检查+数据卷 |

### 🧠 AI优化（6项）

| # | 优化 | 文件 | 说明 |
|---|------|------|------|
| 1 | 异常检测 | anomaly-detector.ts | Z-score/IQR/移动平均 |
| 2 | 预测分析 | predictor.ts | 趋势预测+容量规划 |
| 3 | 事件总线 | event-bus.ts | 解耦通信 |
| 4 | 多级缓存 | cache.ts | L1内存+L2 Redis |
| 5 | 实时推送 | realtime.ts | WebSocket |
| 6 | 结构化日志 | logger.ts | 请求追踪 |

---

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/clowlove/nezha-dash-pro.git
cd nezha-dash-pro/docker

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的配置

# 3. 启动
docker compose up -d

# 4. 访问
open http://localhost:4123
```

### Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/clowlove/nezha-dash-pro)

### 手动部署

```bash
# 1. 克隆
git clone https://github.com/clowlove/nezha-dash-pro.git
cd nezha-dash-pro

# 2. 安装依赖
pnpm install

# 3. 配置
cp .env.example .env
# 编辑 .env

# 4. 构建
pnpm build

# 5. 启动
pnpm start
```

---

## ⚙️ 环境变量

### 核心配置

| 变量 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `NezhaBaseUrl` | ✅ | 哪吒面板地址 | `http://1.2.3.4:8008` |
| `NezhaAuth` | ✅ | API Token | `your-token` |
| `SITE_PASSWORD` | ❌ | 登录密码 | `your-password` |
| `DefaultLocale` | ❌ | 默认语言 | `zh` / `en` / `ja` |

### 告警配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `AI_DIAGNOSIS_API_KEY` | AI诊断API Key | `sk-xxx` |
| `AI_DIAGNOSIS_BASE_URL` | API地址 | `https://api.openai.com/v1` |
| `AI_DIAGNOSIS_MODEL` | 模型名 | `gpt-4o` |

### 通知配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | `123:ABC` |
| `TELEGRAM_CHAT_ID` | Chat ID | `-100123` |
| `DISCORD_WEBHOOK_URL` | Discord Webhook | `https://discord.com/...` |

### 存储配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `STORAGE_PATH` | SQLite路径 | `./data/nezha.db` |
| `METRICS_RETENTION_DAYS` | 数据保留天数 | `90` |

### 安全配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `TWO_FACTOR_ENCRYPTION_KEY` | 2FA加密密钥 | 32位随机字符串 |
| `TWO_FACTOR_ISSUER` | 2FA发行者 | `NezhaDashPro` |

---

## 📖 API文档

完整API文档见 [docs/API.md](docs/API.md)

### 核心端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/server` | GET | 服务器列表 |
| `/api/detail` | GET | 服务器详情 |
| `/api/monitor` | GET | 监控数据 |
| `/api/alerts` | GET/POST | 告警管理 |
| `/api/notifications` | GET/POST | 通知管理 |
| `/api/history` | GET | 历史数据 |
| `/api/deploy` | POST | 批量部署 |
| `/api/billing` | GET | 流量/成本 |
| `/api/users` | GET/POST | 用户管理 |
| `/api/themes` | GET/POST | 主题管理 |
| `/api/plugins` | GET/POST | 插件管理 |
| `/api/webhooks` | GET/POST | Webhook管理 |
| `/api/saas/plans` | GET | 套餐查询 |
| `/api/v1/*` | * | 版本化API |

### SDK使用

```typescript
import { createClient } from '@nezha-dash-pro/sdk'

const client = createClient({
  baseUrl: 'https://your-dashboard.com',
  apiKey: 'your-api-key',
})

// 获取服务器列表
const servers = await client.getServers()

// 获取告警
const alerts = await client.getAlerts({ status: 'active' })

// 创建Webhook
await client.createWebhook({
  url: 'https://your-handler.com/webhook',
  events: ['server.offline', 'alert.triggered'],
})
```

---

## 🔌 插件开发

```typescript
// plugins/my-plugin/manifest.json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My custom plugin",
  "hooks": ["onServerData", "onAlert"],
  "permissions": ["read:servers", "read:alerts"]
}

// plugins/my-plugin/index.ts
export function onServerData(ctx, servers) {
  for (const server of servers) {
    if (server.cpu > 90) {
      console.warn(`High CPU: ${server.name}`)
    }
  }
}

export function onAlert(ctx, alert) {
  ctx.notifications.send({
    title: `Alert: ${alert.serverName}`,
    body: alert.message,
    severity: alert.severity,
  })
}
```

---

## 💰 商业化

### 定价方案

| 套餐 | 价格 | 服务器数 | 功能 |
|------|------|----------|------|
| **免费版** | ¥0/月 | 3台 | 基础监控 |
| **Pro版** | ¥29/月 | 20台 | +告警+通知+历史 |
| **团队版** | ¥99/月 | 100台 | +协作+API |
| **企业版** | ¥299/月 | 无限 | +多租户+SSO |

### 自部署Pro版

| 套餐 | 价格 | 功能 |
|------|------|------|
| **开源版** | ¥0 | 基础监控+3种数据源 |
| **Pro版** | ¥299永久 | 全部功能 |
| **Enterprise** | ¥999永久 | +定制开发+优先支持 |

---

## 🧠 AI智能引擎

### 异常检测
- Z-score统计检测
- IQR四分位距检测
- 移动平均偏差检测
- 集成投票（任意/多数/全部）
- 自动阈值调整

### 预测分析
- 线性回归趋势预测
- 磁盘容量预估
- 成本趋势投影
- 置信度分类（高/中/低）
- 可操作建议生成

## ⚡ 核心架构升级

### 事件驱动架构
- 类型化事件总线
- 通配符订阅（server:*）
- 异步处理器
- 优先级排序
- 事件回放

### 多级缓存
- L1内存缓存（TTL+LRU）
- L2 Redis接口
- 标签失效
- 防惊跳

### 中间件管道
- 可组合中间件
- 速率限制（滑动窗口）
- CORS
- 请求日志
- 错误边界

### 实时通信
- WebSocket服务器
- 频道订阅
- 实时指标推送
- 告警通知

### 结构化日志
- 5级日志（debug→fatal）
- 请求追踪
- 日志轮转

## 🎨 UI革命

### 新组件
- 玻璃拟态卡片（GlassCard）
- 5种骨架屏加载器
- 动画指标徽章（计数器+趋势箭头+迷你图）
- 状态脉冲指示器
- 快捷操作面板
- 服务器网格（拖拽排序）
- 告警时间线
- 系统健康仪表盘

### CSS动画库
- 淡入/滑入/缩放/脉冲/闪光/打字机
- 渐变背景（网格/头部/发光）
- 毛玻璃效果

## 🏭 生产级基础设施

### Kubernetes
- Deployment（2副本+资源限制+探针）
- Service（HTTP+WebSocket）
- Ingress（TLS+限流+HSTS）

### Docker生产版
- 多服务（App+Redis+Nginx）
- 资源限制+日志+健康检查
- Nginx反向代理（gzip+缓存+安全头）

### 测试
- 告警管理器测试
- 通知器测试
- SQLite存储测试
- Vitest配置（70%覆盖率目标）

### 运维工具
- 种子数据脚本
- 数据库备份脚本（gzip+旋转+S3接口）
- 安全策略文档

## 🤝 贡献

欢迎贡献！请阅读 [贡献指南](docs/CONTRIBUTING.md)。

```bash
# 1. Fork & Clone
git clone https://github.com/your-username/nezha-dash-pro.git

# 2. 创建分支
git checkout -b feature/my-feature

# 3. 开发 & 测试
pnpm dev
pnpm check

# 4. 提交
git commit -m "feat: add my feature"

# 5. 推送 & PR
git push origin feature/my-feature
```

---

## 📄 许可证

本项目基于 [Apache License 2.0](LICENSE) 开源。

Pro版商业功能需购买商业许可证。详见 [定价方案](#-商业化)。

---

## 🙏 致谢

- [nezha-dash](https://github.com/hamster1963/nezha-dash) — 原始项目
- [哪吒监控](https://github.com/naiba/nezha) — 监控后端
- [Next.js](https://nextjs.org) — React框架
- [Vercel](https://vercel.com) — 部署平台
- [shadcn/ui](https://ui.shadcn.com) — UI组件库

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！⭐**

[![Star History Chart](https://api.star-history.com/svg?repos=clowlove/nezha-dash-pro&type=Date)](https://star-history.com/#clowlove/nezha-dash-pro&Date)

</div>
