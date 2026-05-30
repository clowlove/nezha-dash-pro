<div align="center">

# 🚀 NezhaDash Pro

### 新一代服务器监控面板 — 强大、优雅、可扩展

[![版本](https://img.shields.io/badge/版本-v3.0.0-blue?style=for-the-badge)](https://github.com/nezha-dash/pro/releases)
[![许可证](https://img.shields.io/badge/许可证-MIT-green?style=for-the-badge)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-支持-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![Stars](https://img.shields.io/github/stars/nezha-dash/pro?style=for-the-badge&logo=github)](https://github.com/nezha-dash/pro)

**NezhaDash Pro** 是一款基于现代技术栈构建的高性能服务器监控面板，兼容 **哪吒监控**、**Komari** 和 **MyNodeQuery** 等主流数据源。提供实时数据可视化、告警通知、多节点管理等专业功能，适用于个人开发者与企业级运维场景。

[📖 文档](https://nezha-dash.pro/docs) · [🐛 提交 Issue](https://github.com/nezha-dash/pro/issues) · [💬 加入社区](https://t.me/nezha_dash) · [🔄 更新日志](https://github.com/nezha-dash/pro/releases)

---

![演示截图](https://via.placeholder.com/1200x700/1a1a2e/00d4ff?text=NezhaDash+Pro+%E6%BC%94%E7%A4%BA+%F0%9F%92%BB)

</div>

---

## 📑 目录

- [✨ 功能特性](#-功能特性)
- [🆚 功能对比](#-功能对比开源版-vs-专业版)
- [📸 界面截图](#-界面截图)
- [🚀 快速开始](#-快速开始)
- [⚙️ 配置参考](#️-配置参考)
- [🔌 支持的数据源](#-支持的数据源)
- [🛠️ 技术栈](#️-技术栈)
- [📂 项目结构](#-项目结构)
- [🤝 参与贡献](#-参与贡献)
- [📄 许可证](#-许可证)
- [⭐ Star 历史](#-star-历史)
- [🙏 致谢](#-致谢)

---

## ✨ 功能特性

| 功能 | 说明 |
|:---|:---|
| 📊 **实时监控** | CPU、内存、磁盘、网络流量实时图表，毫秒级刷新 |
| 🌍 **全球节点地图** | 基于地理位置的节点分布可视化 |
| 🔔 **智能告警** | 支持 Telegram、Discord、邮件、Webhook 等多种通知渠道 |
| 🎨 **主题定制** | 内置多套主题，支持自定义 CSS 与品牌配色 |
| 📱 **响应式设计** | 完美适配桌面端、平板和移动设备 |
| 🔐 **安全认证** | 支持 OAuth2、TOTP 二步验证、API Token 鉴权 |
| 📈 **历史数据** | 长期数据存储与趋势分析，支持自定义保留策略 |
| 🌐 **多语言** | 内置中文、英文、日文等多语言支持 |
| 🔌 **多数据源** | 同时接入哪吒监控、Komari、MyNodeQuery 等平台 |
| ⚡ **极致性能** | 基于 SSR/ISR 的服务端渲染，首屏加载 < 1s |
| 🧩 **插件系统** | 可扩展的插件架构，自定义数据展示和告警规则 |
| 📤 **数据导出** | 支持导出 CSV、JSON、PNG 等格式的报告 |

---

## 🆚 功能对比（开源版 vs 专业版）

| 功能模块 | 🆓 开源版 | 💎 专业版 |
|:---|:---:|:---:|
| 实时监控面板 | ✅ | ✅ |
| 基础图表展示 | ✅ | ✅ |
| 单数据源接入 | ✅ | ✅ |
| 深色/浅色主题 | ✅ | ✅ |
| 多数据源同时接入 | ❌ | ✅ |
| 全球节点地图 | ❌ | ✅ |
| 智能告警与通知 | ❌ | ✅ |
| 历史数据趋势分析 | ❌ | ✅ |
| 自定义主题/品牌 | ❌ | ✅ |
| 插件系统 | ❌ | ✅ |
| 数据导出与报告 | ❌ | ✅ |
| OAuth2 / TOTP 认证 | ❌ | ✅ |
| API Token 管理 | ❌ | ✅ |
| 优先技术支持 | ❌ | ✅ |
| 白标定制 | ❌ | ✅ |

> 💡 **提示**：开源版已能满足个人用户的基础监控需求，专业版则面向需要高级功能和企业级支持的用户。

---

## 📸 界面截图

<div align="center">

### 🖥️ 仪表盘总览

![仪表盘](https://via.placeholder.com/1200x650/0f0f23/00d4ff?text=Dashboard+Overview+%F0%9F%96%A5%EF%B8%8F)

### 📊 实时监控图表

![监控图表](https://via.placeholder.com/1200x650/0f0f23/00ff88?text=Real-time+Charts+%F0%9F%93%88)

### 🌍 全球节点地图

![节点地图](https://via.placeholder.com/1200x650/0f0f23/ff6b6b?text=Global+Node+Map+%F0%9F%8C%8D)

### 🔔 告警管理

![告警管理](https://via.placeholder.com/1200x650/0f0f23/ffd93d?text=Alert+Management+%F0%9F%94%94)

</div>

---

## 🚀 快速开始

### 📋 环境要求

| 依赖 | 最低版本 | 推荐版本 |
|:---|:---:|:---:|
| Node.js | 20.x | 22.x LTS |
| pnpm | 9.x | 10.x |
| Docker（可选） | 24.x | 26.x |

---

### 🐳 方式一：Docker 部署（推荐）

最简单的部署方式，适合生产环境：

```bash
# 拉取镜像
docker pull nezha-dash/pro:latest

# 运行容器
docker run -d \
  --name nezha-dash-pro \
  -p 3000:3000 \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/data:/app/data \
  -e DATABASE_URL="file:./data/prod.db" \
  -e NEXTAUTH_SECRET="your-secret-key" \
  nezha-dash/pro:latest
```

**使用 Docker Compose：**

```yaml
# docker-compose.yml
version: "3.9"

services:
  nezha-dash:
    image: nezha-dash/pro:latest
    container_name: nezha-dash-pro
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:./data/prod.db
      - NEXTAUTH_SECRET=your-secret-key-here
      - TZ=Asia/Shanghai
```

```bash
docker compose up -d
```

> 🌐 访问 `http://your-server-ip:3000` 即可打开面板。

---

### ▲ 方式二：Vercel 一键部署

适合快速体验，零运维成本：

1. **Fork** 本仓库到你的 GitHub 账号
2. 登录 [Vercel](https://vercel.com) 并导入项目
3. 配置以下环境变量：

| 变量名 | 说明 | 示例值 |
|:---|:---|:---|
| `DATABASE_URL` | 数据库连接地址 | `file:./data/prod.db` |
| `NEXTAUTH_SECRET` | 认证密钥 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 站点地址 | `https://your-domain.vercel.app` |

4. 点击 **Deploy**，等待部署完成

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nezha-dash/pro)

---

### 🔧 方式三：手动部署

适合开发者或需要深度定制的场景：

```bash
# 1. 克隆仓库
git clone https://github.com/nezha-dash/pro.git
cd pro

# 2. 安装依赖
pnpm install

# 3. 初始化数据库
pnpm db:push

# 4. 复制并编辑配置文件
cp .env.example .env
# 编辑 .env 填入你的配置

# 5. 构建生产版本
pnpm build

# 6. 启动服务
pnpm start
```

**开发模式：**

```bash
# 启动开发服务器（支持热更新）
pnpm dev
```

---

## ⚙️ 配置参考

### 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|:---|:---:|:---|:---|
| `DATABASE_URL` | ✅ | `file:./data/prod.db` | 数据库连接字符串（SQLite / PostgreSQL） |
| `NEXTAUTH_SECRET` | ✅ | — | NextAuth.js 加密密钥，建议 32+ 字符 |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | 应用公开访问地址 |
| `PORT` | ❌ | `3000` | 服务监听端口 |
| `TZ` | ❌ | `Asia/Shanghai` | 时区设置 |
| `LOG_LEVEL` | ❌ | `info` | 日志级别：`debug` / `info` / `warn` / `error` |
| `THEME` | ❌ | `dark` | 默认主题：`dark` / `light` / `auto` |
| `TELEGRAM_BOT_TOKEN` | ❌ | — | Telegram 机器人 Token（告警用） |
| `TELEGRAM_CHAT_ID` | ❌ | — | Telegram 通知群组 ID |
| `DISCORD_WEBHOOK_URL` | ❌ | — | Discord Webhook 地址 |
| `SMTP_HOST` | ❌ | — | 邮件服务器地址 |
| `SMTP_PORT` | ❌ | `587` | 邮件服务器端口 |
| `SMTP_USER` | ❌ | — | 邮件账号 |
| `SMTP_PASS` | ❌ | — | 邮件密码 |
| `OAUTH_CLIENT_ID` | ❌ | — | OAuth2 客户端 ID |
| `OAUTH_CLIENT_SECRET` | ❌ | — | OAuth2 客户端密钥 |
| `OAUTH_ISSUER` | ❌ | — | OAuth2 Issuer URL |
| `MAX_NODES` | ❌ | `500` | 最大节点数限制 |
| `DATA_RETENTION_DAYS` | ❌ | `30` | 历史数据保留天数 |

### 配置文件

配置文件位于 `config/` 目录下：

```yaml
# config/app.yml
app:
  name: "我的监控面板"
  description: "服务器状态监控"
  logo: "/logo.png"
  footer: "© 2026 My Dashboard"

nodes:
  refresh_interval: 5  # 数据刷新间隔（秒）
  timeout: 10          # 节点超时时间（秒）

alerts:
  enabled: true
  channels:
    - type: telegram
      enabled: true
    - type: discord
      enabled: false
    - type: email
      enabled: false
```

---

## 🔌 支持的数据源

NezhaDash Pro 兼容多种主流服务器监控数据源，支持同时接入多个平台：

### 🟢 哪吒监控（Nezha）

| 项目 | 说明 |
|:---|:---|
| 官网 | [https://nezha.wiki](https://nezha.wiki) |
| 接入方式 | API v2 / gRPC |
| 支持功能 | 节点状态、流量统计、告警规则 |
| 最低版本 | v1.x |

```yaml
# 数据源配置示例
sources:
  - name: "nezhahq"
    type: nezha
    endpoint: "https://your-nezha.example.com"
    token: "your-api-token"
```

### 🔵 Komari

| 项目 | 说明 |
|:---|:---|
| 官网 | [https://komari.moe](https://komari.moe) |
| 接入方式 | REST API |
| 支持功能 | 节点监控、性能统计、自定义面板 |
| 最低版本 | v0.5+ |

```yaml
sources:
  - name: "komari"
    type: komari
    endpoint: "https://your-komari.example.com"
    token: "your-api-token"
```

### 🟣 MyNodeQuery

| 项目 | 说明 |
|:---|:---|
| 官网 | [https://mynodequery.com](https://mynodequery.com) |
| 接入方式 | REST API |
| 支持功能 | 节点状态查询、位置信息、网络测试 |
| 最低版本 | v2.0+ |

```yaml
sources:
  - name: "mynodequery"
    type: mynodequery
    endpoint: "https://api.mynodequery.com"
    token: "your-api-key"
```

> 💡 **提示**：你可以同时配置多个数据源，面板会自动聚合所有节点数据进行统一展示。

---

## 🛠️ 技术栈

<div align="center">

| 层级 | 技术 | 说明 |
|:---|:---|:---|
| 🎯 **框架** | [Next.js 16](https://nextjs.org/) | React 全栈框架，App Router + RSC |
| ⚛️ **UI 库** | [React 19](https://react.dev/) | 用户界面构建，支持 Server Components |
| 🔷 **语言** | [TypeScript 5.x](https://www.typescriptlang.org/) | 类型安全，提升开发体验 |
| 🎨 **样式** | [Tailwind CSS 4.x](https://tailwindcss.com/) | 原子化 CSS，快速构建 UI |
| 🧱 **组件** | [shadcn/ui](https://ui.shadcn.com/) | 可复用组件库，基于 Radix UI |
| 📊 **图表** | [Recharts](https://recharts.org/) | 基于 D3 的 React 图表库 |
| 🗄️ **数据库** | [Drizzle ORM](https://orm.drizzle.team/) | TypeScript ORM，支持 SQLite / PostgreSQL |
| 🔐 **认证** | [NextAuth.js](https://next-auth.js.org/) | 身份认证与授权 |
| 🐳 **容器** | [Docker](https://www.docker.com/) | 容器化部署 |
| ▲ **部署** | [Vercel](https://vercel.com) | 一键部署，边缘网络加速 |

</div>

---

## 📂 项目结构

```
nezha-dash-pro/
├── 📁 app/                    # Next.js App Router
│   ├── 📁 (auth)/             # 认证相关页面
│   ├── 📁 (dashboard)/        # 仪表盘页面
│   ├── 📁 api/                # API 路由
│   └── 📄 layout.tsx          # 根布局
├── 📁 components/             # React 组件
│   ├── 📁 ui/                 # 基础 UI 组件
│   ├── 📁 charts/             # 图表组件
│   └── 📁 dashboard/          # 仪表盘组件
├── 📁 config/                 # 配置文件
├── 📁 lib/                    # 工具函数
│   ├── 📁 db/                 # 数据库相关
│   ├── 📁 sources/            # 数据源适配器
│   └── 📁 utils/              # 通用工具
├── 📁 public/                 # 静态资源
├── 📁 styles/                 # 全局样式
├── 📄 docker-compose.yml      # Docker 编排
├── 📄 Dockerfile              # Docker 构建文件
├── 📄 drizzle.config.ts       # Drizzle ORM 配置
├── 📄 next.config.ts          # Next.js 配置
├── 📄 tailwind.config.ts      # Tailwind 配置
└── 📄 package.json            # 项目依赖
```

---

## 🤝 参与贡献

我们欢迎所有形式的贡献！无论是 Bug 修复、功能开发、文档改进还是问题反馈。

### 🐛 提交 Bug

1. 前往 [Issues](https://github.com/nezha-dash/pro/issues) 页面
2. 使用 **Bug Report** 模板创建新 Issue
3. 提供详细的复现步骤和环境信息

### 💡 提出新功能

1. 前往 [Discussions](https://github.com/nezha-dash/pro/discussions) 发起讨论
2. 说明使用场景和预期效果
3. 获得社区认可后提交 PR

### 🔧 提交代码

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/YOUR_USERNAME/pro.git
cd pro

# 2. 创建功能分支
git checkout -b feature/amazing-feature

# 3. 进行开发并确保通过检查
pnpm lint        # 代码规范检查
pnpm typecheck   # 类型检查
pnpm test        # 运行测试

# 4. 提交代码
git commit -m "feat: add amazing feature"

# 5. 推送并创建 PR
git push origin feature/amazing-feature
```

### 📝 Commit 规范

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

| 类型 | 说明 | 示例 |
|:---|:---|:---|
| `feat` | 新功能 | `feat: 添加节点地图功能` |
| `fix` | 修复 Bug | `fix: 修复内存泄漏问题` |
| `docs` | 文档更新 | `docs: 更新部署指南` |
| `style` | 代码格式 | `style: 格式化代码风格` |
| `refactor` | 重构 | `refactor: 优化数据源适配器` |
| `perf` | 性能优化 | `perf: 优化图表渲染性能` |
| `test` | 测试 | `test: 添加单元测试` |
| `chore` | 构建/工具 | `chore: 升级依赖版本` |

---

## 📄 许可证

本项目基于 **[MIT License](./LICENSE)** 开源发布。

```
MIT License

Copyright (c) 2024-2026 NezhaDash

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

> ⚠️ **注意**：MIT 许可证适用于开源版本。专业版（Pro）的功能模块受独立的商业许可协议约束，详见 [LICENSE-PRO](./LICENSE-PRO)。

---

## ⭐ Star 历史

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=nezha-dash/pro&type=Date)](https://star-history.com/#nezha-dash/pro&Date)

> 🌟 如果觉得项目有帮助，请给我们一个 Star！你的支持是我们持续更新的动力。

</div>

---

## 🙏 致谢

感谢以下开源项目和社区的支持：

- [哪吒监控](https://nezha.wiki) — 优秀的服务器监控方案
- [Komari](https://komari.moe) — 轻量级节点监控平台
- [Next.js](https://nextjs.org/) — React 全栈框架
- [Vercel](https://vercel.com) — 部署平台
- [shadcn/ui](https://ui.shadcn.com/) — UI 组件库
- [Drizzle ORM](https://orm.drizzle.team/) — TypeScript ORM

---

<div align="center">

**由 ❤️ 和 ☕ 驱动开发**

[⬆ 回到顶部](#-nezhadash-pro)

</div>
