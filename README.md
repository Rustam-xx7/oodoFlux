# Subscription Management System (SMS)

> Enterprise-grade, multi-tenant capable platform for subscription lifecycle tracking, automated recurring billing, deterministic invoice snapshots, and financial analytics.

---

## 1. Architectural Highlights

- **Monorepo Architecture:** Clean domain separation with npm workspaces (`apps/web`, `apps/api`, `apps/worker`, `packages/shared`, `packages/config`).
- **Precision Financials:** Zero floating-point calculations. All currency values are calculated and stored in integer minor units (e.g., paise).
- **Idempotent Recurring Billing:** BullMQ job processor with PostgreSQL compound constraints on `(subscription_id, period_start, period_end)` to guarantee zero duplicate invoicing.
- **Strict Role Isolation:** Enforced server-side via NestJS guards for `Admin`, `Staff`, and `Customer` roles.
- **High Performance:** Designed to sustain sub-2-second page response times across large datasets.

---

## 2. Repository Structure

```text
oodoFlux/
├── apps/
│   ├── web/                         # Next.js 14 App Router (Tailwind CSS, Glassmorphic UI)
│   ├── api/                         # NestJS REST API Server (Modules, Pipes, Filters)
│   └── worker/                      # BullMQ Background Job Worker (Redis 7)
│
├── packages/
│   ├── shared/                      # Core Enums, Interfaces, Money Utilities
│   └── config/                      # Base TypeScript and Lint configurations
│
├── prisma/
│   └── schema.prisma                # PostgreSQL Schema (Prisma ORM)
│
├── docs/
│   ├── architecture.md              # System Architecture & Risk Assessment
│   ├── database-design.md           # Relational Schema Design & ER Diagram
│   ├── api-specification.md         # REST API Contract & Domain Endpoints
│   └── requirement-clarifications.md # Gap Analysis & Edge Case Specifications
│
├── docker-compose.yml               # Multi-container orchestration (PostgreSQL, Redis, Apps)
├── .env.example                     # Environment variable template
├── .gitignore                       # Git exclusions
├── package.json                     # Monorepo root workspaces & scripts
├── README.md                        # Master project guide
└── workflow.md                      # Development roadmap and single source of truth
```

---

## 3. Technology Stack

| Layer | Technology | Primary Purpose |
|---|---|---|
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS | High-performance, responsive role dashboards |
| **Backend** | Node.js, NestJS, REST API Architecture | Modular business logic, guards, validation |
| **Persistence** | PostgreSQL, Prisma ORM | Relational data, foreign keys, transactions |
| **Queues & Jobs** | Redis 7, BullMQ | Decoupled recurring billing & email dispatch |
| **Testing** | Jest, Supertest, Playwright | Unit, API integration, and E2E testing |
| **Containerization** | Docker, Docker Compose | Reproducible local & production runtime |

---

## 4. Getting Started

### Prerequisites
- Node.js >= 20.x (Node 24 LTS verified)
- npm >= 10.x
- Docker & Docker Compose (or local PostgreSQL 16 & Redis 7)

### Local Setup Instructions

```bash
# 1. Install all monorepo dependencies
npm install

# 2. Build shared packages
npm run --workspace=@sms/shared build

# 3. Configure environment variables
cp .env.example .env

# 4. Start local backing services (PostgreSQL & Redis)
docker compose up -d postgres redis

# 5. Generate Prisma Client
npm run prisma:generate

# 6. Apply database migrations
npm run prisma:migrate

# 7. Start the development environment (API, Worker, Web)
npm run dev
```

The services will be available at:
- **Web Status & Portal:** [http://localhost:3000](http://localhost:3000)
- **REST API Server:** [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **API Health Check:** [http://localhost:4000/health](http://localhost:4000/health)
- **PostgreSQL Database:** `localhost:5432`
- **Redis Server:** `localhost:6379`

---

## 5. Automated Testing

```bash
# Run backend unit tests
npm test

# Run API integration tests (Supertest)
npm run test:e2e

# Run worker test job verification
npm run --workspace=@sms/worker test:job

# Run frontend E2E tests (Playwright)
npm run --workspace=@sms/web test
```

---

## 6. Development Tracking & Progress

All project milestones, decisions, task checkboxes, and Phase-by-Phase deliverables are strictly tracked in:

👉 [`workflow.md`](./workflow.md)
