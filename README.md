# 🚀 NezhaDash Pro

### AI-Powered VPS Monitoring Dashboard

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/clowlove/nezha-dash-pro)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.3-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

A modern, AI-powered server monitoring dashboard with real-time analytics, alerts, and beautiful UI.

---

## ✨ Features

- 🖥️ **Server Monitoring** — Real-time CPU, memory, disk, and network metrics
- 🚨 **Smart Alerts** — AI-powered anomaly detection and notifications
- 📊 **Dashboard** — Beautiful, responsive dark-mode interface
- 🔌 **REST API** — Health, servers, and alerts endpoints
- 🎨 **Modern UI** — Glass morphism design with smooth animations
- 📱 **Responsive** — Works on desktop, tablet, and mobile
- ⚡ **Fast** — Built with Next.js 16 and Turbopack

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: 22+)
- pnpm (or npm/yarn)

### Installation

```bash
# Clone the repository
git clone https://github.com/clowlove/nezha-dash-pro.git
cd nezha-dash-pro

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3040](http://localhost:3040) in your browser.

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Docker

```bash
# Build Docker image
docker build -t nezha-dash-pro .

# Run container
docker run -p 3040:3040 nezha-dash-pro
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/servers` | GET | List all servers |
| `/api/alerts` | GET | List recent alerts |

### Example Response

```json
// GET /api/health
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-05-30T15:57:03.499Z",
  "uptime": 13.27
}
```

---

## 🏗️ Tech Stack

- **Framework**: Next.js 16 with Turbopack
- **UI**: React 19 + Tailwind CSS 4.3
- **Language**: TypeScript 6.0
- **Styling**: Tailwind CSS with dark mode
- **Deployment**: Docker, Vercel, or self-hosted

---

## 📁 Project Structure

```
nezha-dash-pro/
├── app/
│   ├── api/
│   │   ├── alerts/route.ts    # Alerts API
│   │   ├── health/route.ts    # Health check
│   │   └── servers/route.ts   # Servers API
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   ├── not-found.tsx          # 404 page
│   └── page.tsx               # Home page
├── components/
│   └── Dashboard.tsx          # Dashboard component
├── public/                    # Static assets
├── package.json
├── tsconfig.json
├── next.config.mjs
└── Dockerfile
```

---

## ⚙️ Environment Variables

Create a `.env.local` file:

```bash
# Optional: Custom port
PORT=3040

# Optional: API keys for external services
# OPENAI_API_KEY=your-key
# TELEGRAM_BOT_TOKEN=your-token
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md).

```bash
# Fork & Clone
git clone https://github.com/your-username/nezha-dash-pro.git

# Create branch
git checkout -b feature/my-feature

# Develop & Test
pnpm dev
pnpm check

# Commit & Push
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

---

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

---

## 🙏 Acknowledgments

- [nezha-dash](https://github.com/hamster1963/nezha-dash) — Original project
- [Next.js](https://nextjs.org) — React framework
- [Tailwind CSS](https://tailwindcss.com) — Utility-first CSS
- [Vercel](https://vercel.com) — Deployment platform

---

<div align="center">

**⭐ If this project helps you, please give it a star! ⭐**

[![Star History Chart](https://api.star-history.com/svg?repos=clowlove/nezha-dash-pro&type=Date)](https://star-history.com/#clowlove/nezha-dash-pro&Date)

</div>
