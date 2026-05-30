# Contributing to NezhaDash Pro

Thank you for your interest in contributing! This guide covers everything
you need to get started.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Adding a New Driver](#adding-a-new-driver)
- [Reporting Issues](#reporting-issues)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 20.x | [nodejs.org](https://nodejs.org/) |
| pnpm | >= 9.x | `npm i -g pnpm` |
| Git | >= 2.x | [git-scm.com](https://git-scm.com/) |

---

## Getting Started

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/pro.git
cd pro

# 3. Install dependencies
pnpm install

# 4. Copy environment template
cp .env.example .env
# Edit .env with your configuration

# 5. Initialize the database
pnpm db:push

# 6. Start development server
pnpm dev
```

The app will be available at `http://localhost:3000` with hot reload.

---

## Project Structure

```
nezha-dash-pro/
├── app/                     # Next.js App Router
│   ├── api/                 # REST API routes
│   │   ├── alerts/          # Alert management
│   │   ├── auth/            # Authentication & 2FA
│   │   ├── billing/         # Billing & cost tracking
│   │   ├── deploy/          # Agent deployment
│   │   ├── history/         # Historical metrics
│   │   ├── notifications/   # Notification channels
│   │   ├── themes/          # Theme management
│   │   ├── server.ts        # Server list endpoint
│   │   ├── detail.ts        # Server detail endpoint
│   │   └── monitor.ts       # Monitor data endpoint
│   ├── (auth)/              # Auth pages (login, etc.)
│   └── (dashboard)/         # Dashboard pages
├── components/              # React components
│   ├── ui/                  # Base UI components (shadcn/ui)
│   ├── charts/              # Chart components (Recharts)
│   └── dashboard/           # Dashboard-specific components
├── lib/                     # Core library code
│   ├── drivers/             # Data source drivers
│   │   ├── base/            # BaseDriver abstract class
│   │   ├── types/           # Shared types & interfaces
│   │   ├── nezha/           # Nezha monitoring driver
│   │   ├── komari/          # Komari driver
│   │   ├── mynodequery/     # MyNodeQuery driver
│   │   ├── uptimekuma/      # Uptime Kuma driver
│   │   ├── factory.ts       # Driver factory & registry
│   │   └── manager.ts       # Driver manager (lifecycle)
│   ├── alerts/              # Alert engine & rules
│   ├── billing/             # Billing & cost calculation
│   ├── notifications/       # Notification channel adapters
│   ├── storage/             # SQLite storage & aggregation
│   ├── themes/              # Theme engine & presets
│   ├── deploy/              # Deployment task runner & SSH
│   ├── auth/                # TOTP & 2FA utilities
│   └── geo/                 # Geolocation utilities
├── docs/                    # Documentation
├── public/                  # Static assets
└── config/                  # App configuration
```

---

## Code Style

### General Rules

- **TypeScript** — all code must be properly typed, avoid `any` where possible
- **Functional components** — use React function components with hooks
- **Server Components** — prefer RSC where interactivity is not needed
- **ES Modules** — use `import`/`export`, not `require()`
- **Async/await** — prefer over `.then()` chains

### Formatting

The project uses **Biome** for formatting and linting:

```bash
# Check formatting
pnpm lint

# Auto-fix formatting issues
pnpm lint:fix

# Type checking
pnpm typecheck
```

### Naming Conventions

| Kind | Convention | Example |
|------|-----------|---------|
| Files (components) | PascalCase | `ServerCard.tsx` |
| Files (utilities) | kebab-case | `server-fetch.ts` |
| Files (drivers) | PascalCase class | `NezhaDriver.ts` |
| Components | PascalCase | `function ServerCard()` |
| Hooks | `use` prefix | `useServerData()` |
| Constants | UPPER_SNAKE | `MAX_NODES` |
| Types/Interfaces | PascalCase | `interface ServerApi` |
| API routes | kebab-case dirs | `app/api/alerts/rules/` |

### Import Order

```typescript
// 1. External packages
import { NextResponse } from "next/server"

// 2. Internal absolute imports (@/)
import { BaseDriver } from "@/lib/drivers/base"

// 3. Relative imports
import type { DriverConfig } from "../types"
```

---

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|------------|---------|
| `feat` | New feature | `feat(alerts): add Slack notification channel` |
| `fix` | Bug fix | `fix(driver): handle timeout in KomariDriver` |
| `docs` | Documentation | `docs(api): add billing endpoint examples` |
| `style` | Formatting (no logic change) | `style: run biome format` |
| `refactor` | Code restructuring | `refactor(drivers): extract BaseDriver` |
| `perf` | Performance improvement | `perf(history): add metric aggregation` |
| `test` | Adding/updating tests | `test(alerts): add rule evaluation tests` |
| `chore` | Build/tooling changes | `chore: upgrade next to 16.x` |

### Scopes

Common scopes: `drivers`, `alerts`, `billing`, `deploy`, `notifications`,
`themes`, `auth`, `storage`, `api`, `ui`, `docs`

---

## Pull Request Process

### Before Submitting

1. Ensure your branch is up-to-date with `main`
2. Run all checks:

```bash
pnpm lint          # Linting
pnpm typecheck     # Type checking
pnpm test          # Unit tests
pnpm build         # Production build
```

3. Write/update tests for new features
4. Update documentation if needed

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactor

## Testing
How was this tested?

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Tests pass locally
- [ ] Documentation updated
```

### Review Process

1. All PRs require at least one review
2. CI must pass (lint, typecheck, tests, build)
3. Squash commits on merge
4. Delete the feature branch after merge

---

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run with watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Writing Tests

Place test files next to the source with `.test.ts` suffix:

```
lib/alerts/rules.ts
lib/alerts/rules.test.ts
```

### Test Patterns

```typescript
import { describe, it, expect } from "vitest"
import { evaluateRule } from "./rules"

describe("evaluateRule", () => {
  it("should trigger alert when threshold exceeded", () => {
    const rule = { metric: "cpu", operator: ">", threshold: 90 }
    expect(evaluateRule(rule, { cpu: 95 })).toBe(true)
  })

  it("should not trigger when within threshold", () => {
    const rule = { metric: "cpu", operator: ">", threshold: 90 }
    expect(evaluateRule(rule, { cpu: 50 })).toBe(false)
  })
})
```

---

## Adding a New Driver

1. Create the driver directory:

```
lib/drivers/mydriver/
├── MyDriver.ts
└── index.ts
```

2. Implement `BaseDriver`:

```typescript
import { BaseDriver } from "../base"
import type { DriverConfig, ServerApi, NezhaAPI } from "../types"

export class MyDriver extends BaseDriver {
  constructor() {
    super("mydriver", {
      supportsMonitoring: true,
      supportsRealTimeData: true,
      supportsHistoricalData: false,
      supportsIpInfo: false,
      supportsPacketLoss: false,
      supportsAlerts: false,
    })
  }

  protected async onInitialize(config: DriverConfig): Promise<void> {
    // Validate config, establish connection
  }

  async getServers(): Promise<ServerApi> {
    // Fetch and convert to Nezha format
  }

  async getServerDetail(serverId: number): Promise<NezhaAPI> {
    // Fetch server detail
  }

  protected async onGetServerMonitor(serverId: number) {
    return []
  }

  protected async onGetServerIP(serverId: number) {
    return ""
  }

  protected async onHealthCheck(): Promise<void> {
    // Verify connectivity
  }
}
```

3. Register in `lib/drivers/factory.ts`:

```typescript
import { MyDriver } from "./mydriver"

const DRIVER_REGISTRY = {
  // ...existing drivers
  mydriver: () => new MyDriver(),
}
```

4. Add config support in `lib/drivers/manager.ts`:

```typescript
case "mydriver": {
  const baseUrl = getEnv("MyDriverBaseUrl") || ""
  return { baseUrl, timeout: 30000, revalidate: 0 }
}
```

5. Export from `lib/drivers/index.ts`

6. Add tests and update documentation

---

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, browser)
- Screenshots if applicable
- Driver and configuration details

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternatives considered
- Impact on existing functionality

### Security Issues

For security vulnerabilities, please **do not** open a public issue.
Email security concerns privately to the maintainers.

---

## Questions?

- Open a [Discussion](https://github.com/nezha-dash/pro/discussions)
- Join our [Telegram](https://t.me/nezha_dash)
