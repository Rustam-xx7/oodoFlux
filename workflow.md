# Subscription Management System — Project Workflow & Development Roadmap

> Single source of truth for tracking project architecture, implementation progress, decisions, and milestones.

---

## A. Project Overview

### Project Purpose
The **Subscription Management System (SMS)** is an enterprise-grade, multi-tenant capable business application built to manage the complete lifecycle of a recurring subscription business from a unified, reliable platform. It automates catalog configuration, quotation generation, customer subscription tracking, recurring invoice creation, payment recording, and executive financial analytics.

### Main Objectives
- **Single Source of Truth:** Centralize customer profiles, product catalog, pricing tiers, active subscriptions, invoices, and payment records.
- **Automated & Idempotent Billing Engine:** Scheduled background processing for invoice generation without duplicate billings or dropped cycles across daily, weekly, monthly, and yearly cadences.
- **Strict Financial Integrity:** Zero floating-point calculations; deterministic snapshotting of prices, taxes, and discounts at the time of quotation and invoice generation.
- **Granular Role-Based Access Control:** Strict authorization boundaries across Admin, Staff, and Customer users, enforcing complete data isolation for customer-facing endpoints.
- **High Performance & Usability:** Sub-2-second response times across large datasets with server-side pagination, index optimization, and intuitive role-tailored dashboards.

### Technology Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Node.js, NestJS (REST API Architecture), TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Background Processing & Queues:** Redis, BullMQ
- **Infrastructure:** Docker, Docker Compose
- **Testing:** Jest (Unit), Supertest (API Integration), Playwright (E2E)
- **Planned Integrations:** SMTP-compatible email, server-side PDF generation, S3-compatible object storage, Razorpay (optional payment gateway extension)

### Architecture Overview
The system employs a modular monorepo structure separating user-facing clients (`apps/web`), the stateless REST API gateway and business services (`apps/api`), and decoupled background job workers (`apps/worker`), backed by PostgreSQL for transactional persistence and Redis for distributed scheduling and queuing. Shared code, types, and configurations are abstracted into `packages/shared` and `packages/config`.

### User Roles
- **Admin:** Complete platform governance: staff account provisioning, catalog configuration (products, variants, plans), tax/discount rule configuration, manual payment recording, and financial reporting.
- **Staff:** Day-to-day operations: customer profile management, quotation creation from reusable templates, quotation conversion, manual subscription lifecycle management (pause/renew/close), and invoice operations within granted permissions.
- **Customer:** Self-service portal: view personal profile, inspect active and past subscriptions, view/download issued invoices, and view payment histories under strict tenant isolation.

### Major Application Modules
1. **Authentication & RBAC:** Secure token-based auth, password hashing, password reset tokens, and role-based guards.
2. **Customer Management:** Customer profile records, billing addresses, contact points, and subscription histories.
3. **Product & Catalog Management:** Base products, product variants with price add-ons, and activation lifecycles.
4. **Plan Management:** Recurring intervals (Daily, Weekly, Monthly, Yearly), minimum quantities, availability windows, and closure/pause policies.
5. **Pricing Engine:** Deterministic calculation service for base amounts, discounts, and compound/line-level taxes.
6. **Quotations:** Reusable quotation templates, draft quotations, valid-until dates, and conversion into subscriptions.
7. **Subscription Lifecycle:** State machine (`Draft → Quotation → Confirmed → Active → Closed`, plus `Paused`), renewals, and early terminations.
8. **Recurring Billing Engine:** Idempotent BullMQ scheduler, due-subscription selector, billing period locking, and invoice generator.
9. **Invoice Management:** Sequential invoice numbering, immutable transaction snapshots, PDF generation, delivery, and cancellation rules.
10. **Payments & Balances:** Multi-transaction payment recording, partial payments, and derived invoice status (`Unpaid`, `Partially Paid`, `Paid`, `Overdue`).
11. **Reporting & Analytics:** Operational dashboards, revenue collected, outstanding receivables, overdue summaries, and server-side filtering.
12. **Audit Logging & Notifications:** Immutable change log for sensitive financial mutations and asynchronous email dispatch.

---

## B. Complete Development Roadmap

```
Phase 0: Requirement Analysis & Architecture Planning
Phase 1: Project Initialization & Infrastructure Setup
Phase 2: Authentication, Users & Customer Management
Phase 3: Products, Variants, Plans, Taxes & Discounts
Phase 4: Quotations & Subscription Management
Phase 5: Recurring Billing & Invoice Management
Phase 6: Payments & Reconciliation
Phase 7: Dashboards, Analytics & Customer Portal
Phase 8: Testing, Optimization & Deployment
```

---

### Phase 0: Requirement Analysis & Architecture Planning
- **Objectives:** Dissect all business requirements, analyze edge cases, address specification gaps, design the relational schema, map API contracts, and establish architectural safeguards.
- **Tasks & Subtasks:**
  - Task 0.1: Comprehensive requirement analysis across all 12 system domains.
  - Task 0.2: Clarification of ambiguous specifications (pause/resume rules, month-end billing, partial payments, discount/tax ordering, scope boundaries).
  - Task 0.3: High-level and modular architecture design with Mermaid diagrams.
  - Task 0.4: Relational database planning with entity relationships, indexes, constraints, and integer-minor-unit currency strategy.
  - Task 0.5: RESTful API design with versioning, pagination, validation, and error contract.
  - Task 0.6: Comprehensive architectural risk assessment and mitigation strategy.
- **Dependencies:** None.
- **Deliverables:** `workflow.md`, `docs/requirement-clarifications.md`, `docs/architecture.md`, `docs/database-design.md`, `docs/api-specification.md`.
- **Testing Requirements:** Architectural sanity checks, schema referential integrity verification via design review.
- **Completion Criteria:** All core design documents approved and aligned with README specifications.

---

### Phase 1: Project Initialization & Infrastructure Setup
- **Objectives:** Establish the monorepo foundation, development environments, container definitions, application shells, and baseline automated test pipelines.
- **Tasks & Subtasks:**
  - Task 1.1: Monorepo initialization with npm workspaces, shared configs (`packages/config`, `packages/shared`), and root scripts.
  - Task 1.2: Frontend initialization (`apps/web`) with Next.js App Router, TypeScript, Tailwind CSS, and a status/health shell page.
  - Task 1.3: Backend initialization (`apps/api`) with NestJS, modular structure, global validation pipes, exception filters, CORS, logging, and health endpoint.
  - Task 1.4: Database initialization with PostgreSQL configuration and Prisma ORM schema foundation.
  - Task 1.5: Redis and BullMQ initialization with worker application (`apps/worker`) and verification of a test background job.
  - Task 1.6: Docker Compose configuration for local PostgreSQL, Redis, and containerized app definitions.
  - Task 1.7: Automated testing setup with Jest (unit), Supertest (API integration), and Playwright (E2E), including health endpoint test verification.
  - Task 1.8: Environment template (`.env.example`) and root `README.md` setup.
- **Dependencies:** Phase 0 design documentation.
- **Deliverables:** Operational monorepo with running Web, API, Worker, Prisma, and automated test suite.
- **Testing Requirements:** Passing API health test via Supertest, passing build check for all apps.
- **Completion Criteria:** API responds on `/api/health`, worker successfully processes a test job, Next.js renders status shell, database and Redis connections configured.

---

### Phase 2: Authentication, Users & Customer Management
- **Objectives:** Implement secure user management, authentication flows, RBAC enforcement, and customer records with tenant isolation.
- **Tasks & Subtasks:**
  - Task 2.1: Implement User entity, Roles (`Admin`, `Staff`, `Customer`), and password hashing with Argon2/Bcrypt.
  - Task 2.2: Implement password policy validation (min 8 chars, 1 uppercase, 1 lowercase, 1 special character).
  - Task 2.3: Implement JWT authentication (access & refresh tokens) and session revocation.
  - Task 2.4: Implement email-based password reset with secure single-use expiring tokens.
  - Task 2.5: Implement Admin-only Staff user creation and permission management.
  - Task 2.6: Implement Customer profile management (contact, billing address, company details).
  - Task 2.7: Implement server-side authorization guards (`RolesGuard`, `CustomerOwnershipGuard`).
  - Task 2.8: Unit and integration tests for auth, password policies, and data isolation.
- **Dependencies:** Phase 1 infrastructure.
- **Deliverables:** Fully authenticated REST endpoints for `/auth`, `/staff`, and `/customers`.
- **Testing Requirements:** Integration tests verifying customer data cannot be accessed by other customers.
- **Completion Criteria:** Registration, login, password reset, and RBAC guards fully operational and tested.

---

### Phase 3: Products, Variants, Plans, Taxes & Discounts
- **Objectives:** Create the catalog management engine, variant pricing logic, recurring plan rules, and centralized pricing engine.
- **Tasks & Subtasks:**
  - Task 3.1: Implement Product CRUD with sales price, cost price, SKU, and activation status.
  - Task 3.2: Implement Product Variants with differential additive pricing.
  - Task 3.3: Implement Plan CRUD supporting Daily, Weekly, Monthly, and Yearly billing frequencies.
  - Task 3.4: Implement Plan lifecycle parameters (minimum quantity, availability dates, auto-close, pause allowed, renew allowed).
  - Task 3.5: Implement Tax Rule engine (fixed and percentage tax rates, applicability rules).
  - Task 3.6: Implement Discount Rule engine (percentage vs fixed amount, min purchase amount, min quantity, date windows, max usage limits).
  - Task 3.7: Implement isolated deterministic Pricing Calculation Service using integer minor units (paise/cents).
  - Task 3.8: Comprehensive unit tests for price computations, variant add-ons, discounts, and taxes.
- **Dependencies:** Phase 2 (Admin authorization).
- **Deliverables:** Product, Variant, Plan, Tax, Discount CRUD APIs and tested Pricing Service.
- **Testing Requirements:** 100% unit test coverage for `PricingService` calculation order and boundary conditions.
- **Completion Criteria:** Accurate catalog pricing with deterministic rounding and snapshot persistence.

---

### Phase 4: Quotations & Subscription Management
- **Objectives:** Build the quotation generation and conversion workflow, along with the complete subscription lifecycle state machine.
- **Tasks & Subtasks:**
  - Task 4.1: Implement Quotation Templates with reusable product/plan items.
  - Task 4.2: Implement Quotation generation with validity dates and snapshot pricing.
  - Task 4.3: Implement Quotation conversion into active or confirmed Subscriptions.
  - Task 4.4: Implement Subscription state machine (`Draft → Quotation → Confirmed → Active → Closed`).
  - Task 4.5: Implement Subscription pause and resume logic respecting plan permissions.
  - Task 4.6: Implement Subscription renewal logic and early closure handling.
  - Task 4.7: Implement Subscription filtering, search, and detail endpoints.
  - Task 4.8: Integration tests for all valid and invalid state transitions.
- **Dependencies:** Phase 3 (Catalog & Pricing).
- **Deliverables:** Endpoints for quotations, conversion, and subscription lifecycle management.
- **Testing Requirements:** State transition tests preventing invalid transitions (e.g., Closed to Active).
- **Completion Criteria:** Quotation created, approved, converted to Subscription, and transitionable through valid lifecycle states.

---

### Phase 5: Recurring Billing & Invoice Management
- **Objectives:** Implement the automated, idempotent BullMQ recurring billing engine and complete invoice lifecycle.
- **Tasks & Subtasks:**
  - Task 5.1: Implement Due-Subscription selector query with billing frequency handling (leap year, month-end edge cases).
  - Task 5.2: Implement BullMQ recurring billing processor with Redis-backed locks and retry strategies.
  - Task 5.3: Implement `billing_periods` table and database unique constraint (`subscription_id + period_start + period_end`) for idempotency.
  - Task 5.4: Implement Invoice generation with immutable line-item snapshots and sequential invoice numbering.
  - Task 5.5: Implement Invoice lifecycle management (`Draft → Confirmed → Cancelled`).
  - Task 5.6: Implement PDF generation service for invoices.
  - Task 5.7: Implement asynchronous email dispatch for invoice delivery.
  - Task 5.8: Resilience and concurrency tests (worker crash, duplicate jobs, concurrent workers).
- **Dependencies:** Phase 4 (Subscriptions).
- **Deliverables:** Automated billing worker, invoice generation endpoints, and PDF delivery pipeline.
- **Testing Requirements:** Test verifying that executing the billing job 5 times produces exactly 1 invoice for a period.
- **Completion Criteria:** Subscriptions automatically billed on schedule with zero duplicates and verified PDF output.

---

### Phase 6: Payments & Reconciliation
- **Objectives:** Enable manual payment recording, balance reconciliation, partial payment tracking, and overdue status derivation.
- **Tasks & Subtasks:**
  - Task 6.1: Implement Payment recording against confirmed invoices (amount, payment method, transaction reference, date).
  - Task 6.2: Implement balance tracking (`paid_amount`, `outstanding_balance`) via atomic database transactions.
  - Task 6.3: Implement settlement status derivation (`Unpaid`, `Partially Paid`, `Paid`, `Overdue`).
  - Task 6.4: Prevent overpayment unless explicitly configured.
  - Task 6.5: Implement payment history logs and filterable queries.
  - Task 6.6: Integration tests for partial payments, full settlement, and race-condition prevention during concurrent payments.
- **Dependencies:** Phase 5 (Invoices).
- **Deliverables:** Payment recording APIs and invoice balance reconciliation services.
- **Testing Requirements:** Concurrent payment settlement tests verifying balance precision.
- **Completion Criteria:** Invoices correctly transition settlement states upon receiving single or multiple payments.

---

### Phase 7: Dashboards, Analytics & Customer Portal
- **Objectives:** Deliver rich, responsive frontend user interfaces for Admin, Staff, and Customer users.
- **Tasks & Subtasks:**
  - Task 7.1: Build Admin Dashboard with high-level KPI cards (Active Subscriptions, Revenue Collected, Total Outstanding, Overdue Invoices).
  - Task 7.2: Build Staff operational portal for customer management, quotations, and payment entry.
  - Task 7.3: Build Customer Self-Service Portal with subscription overview, invoice downloads, and payment history.
  - Task 7.4: Implement server-side filtering, searching, and pagination across all tables.
  - Task 7.5: Build responsive visual analytics charts with time-range filters.
  - Task 7.6: Verify customer tenant isolation in the UI and network layer.
- **Dependencies:** Phases 2 through 6.
- **Deliverables:** Complete Next.js frontend with role-specific views and dashboard charts.
- **Testing Requirements:** Playwright E2E tests validating login, dashboard rendering, and customer boundary isolation.
- **Completion Criteria:** Sub-2-second page loads verified; customer unable to observe other customer data.

---

### Phase 8: Testing, Optimization & Deployment
- **Objectives:** System hardening, performance tuning, security audits, and production containerization.
- **Tasks & Subtasks:**
  - Task 8.1: Execute end-to-end integration and load testing against representative datasets (thousands of subscriptions).
  - Task 8.2: Query optimization, database index verification, and N+1 query elimination.
  - Task 8.3: Verification of sub-2-second response times across all list and dashboard queries.
  - Task 8.4: Security vulnerability audit (OWASP Top 10, rate limiting, header hardening with Helmet).
  - Task 8.5: Docker production multi-stage builds and compose deployment verification.
  - Task 8.6: Final documentation review and demo readiness checklist.
- **Dependencies:** All previous phases.
- **Deliverables:** Production-ready container images, verified test reports, and operational documentation.
- **Testing Requirements:** Full suite passing (Jest, Supertest, Playwright) under load.
- **Completion Criteria:** System passes all acceptance criteria and operates stably under load.

---

## C. Task Tracking

### Phase 0: Requirement Analysis & Architecture Planning
- [x] Task 0.1: Review README and perform comprehensive requirement analysis
- [x] Task 0.2: Identify specification gaps and create `docs/requirement-clarifications.md`
- [x] Task 0.3: Design system architecture and create `docs/architecture.md`
- [x] Task 0.4: Plan database schema and create `docs/database-design.md` with ER diagram
- [x] Task 0.5: Plan REST API conventions and create `docs/api-specification.md`
- [x] Task 0.6: Conduct architecture review for scalability, financial integrity, and reliability

### Phase 1: Project Initialization & Infrastructure Setup
- [x] Task 1.1: Monorepo initialization with npm workspaces, TypeScript, ESLint, and Prettier
- [x] Task 1.2: Frontend initialization (`apps/web`) with Next.js App Router and Tailwind CSS
- [x] Task 1.3: Backend initialization (`apps/api`) with NestJS, global validation, filters, and health check
- [x] Task 1.4: Database initialization with PostgreSQL configuration and Prisma ORM
- [x] Task 1.5: Redis & BullMQ initialization with worker application (`apps/worker`) and test job
- [x] Task 1.6: Docker & Docker Compose configuration for development dependencies
- [x] Task 1.7: Testing infrastructure setup (Jest, Supertest, Playwright) with health endpoint test
- [x] Task 1.8: Environment variables template (`.env.example`) and root `README.md` update

### Phase 2: Authentication, Users & Customer Management
- [x] Task 2.1: User entity and password hashing
- [x] Task 2.2: Password policy validation
- [x] Task 2.3: JWT auth and refresh token flow
- [x] Task 2.4: Email password reset workflow
- [x] Task 2.5: Admin-only staff account creation
- [x] Task 2.6: Customer profile management
- [x] Task 2.7: Server-side RBAC and customer ownership guards
- [x] Task 2.8: Auth and isolation test suite

### Phase 3: Products, Variants, Plans, Taxes & Discounts
- [x] Task 3.1: Product catalog CRUD
- [x] Task 3.2: Product variant additive pricing
- [x] Task 3.3: Plan CRUD and billing frequencies
- [x] Task 3.4: Plan availability and lifecycle rules
- [x] Task 3.5: Tax rule engine
- [x] Task 3.6: Discount rule engine and limits
- [x] Task 3.7: Integer-minor-unit pricing calculation service
- [x] Task 3.8: Pricing calculation unit test suite

### Phase 4: Quotations & Subscription Management
- [x] Task 4.1: Quotation templates
- [x] Task 4.2: Quotation creation and validity rules
- [x] Task 4.3: Quotation-to-subscription conversion
- [x] Task 4.4: Subscription lifecycle state machine
- [x] Task 4.5: Subscription pause and resume logic
- [x] Task 4.6: Subscription renewal and early closure
- [x] Task 4.7: Subscription search, filters, and history
- [x] Task 4.8: State transition integration tests

### Phase 5: Recurring Billing & Invoice Management
- [x] Task 5.1: Due-subscription selector query
- [x] Task 5.2: BullMQ recurring billing scheduler and worker
- [x] Task 5.3: Idempotent billing period uniqueness enforcement
- [x] Task 5.4: Invoice creation from immutable snapshots
- [x] Task 5.5: Invoice lifecycle and cancellation logic
- [x] Task 5.6: Server-side PDF invoice generation
- [x] Task 5.7: Asynchronous invoice notification delivery
- [x] Task 5.8: Concurrency and failure recovery tests

### Phase 6: Payments & Reconciliation
- [x] Task 6.1: Manual payment recording
- [x] Task 6.2: Transactional balance reconciliation
- [x] Task 6.3: Multi-tier settlement status derivation
- [x] Task 6.4: Overpayment prevention checks
- [x] Task 6.5: Payment history and filters
- [x] Task 6.6: Payment settlement integration tests

### Phase 7: Dashboards, Analytics & Customer Portal
- [x] Task 7.1: Admin KPI dashboard
- [x] Task 7.2: Staff operational views
- [x] Task 7.3: Customer self-service portal
- [x] Task 7.4: Server-side pagination and filters
- [x] Task 7.5: Financial analytics charts
- [x] Task 7.6: Playwright customer isolation tests

### Phase 8: Testing, Optimization & Deployment
- [x] Task 8.1: Full system load testing
- [x] Task 8.2: Query profiling and index tuning
- [x] Task 8.3: Verification of sub-2-second page response target
- [x] Task 8.4: Security audit and header hardening
- [x] Task 8.5: Production Docker container builds
- [x] Task 8.6: Final acceptance walkthrough

---

## D. Development Progress

- **Current Phase:** All Phases Completed & Verified (Production Ready)
- **Current Task:** Full Stack Operational & Verified on PostgreSQL (Docker), Redis (Docker), Next.js 14, and NestJS API
- **Completed Tasks:**
  - Phase 0: Requirement Analysis & Architecture Planning
  - Phase 1: Project Initialization & Infrastructure Setup
  - Phase 2: Authentication, Users & Customer Management (JWT, bcryptjs, Admin/Staff/Customer RBAC)
  - Phase 3: Products, Variants, Plans, Taxes & Discounts (Deterministic integer minor units pricing engine)
  - Phase 4: Quotations & Subscription Management (Quotation generation, snapshot pricing, conversion to subscriptions, lifecycle transitions)
  - Phase 5: Recurring Billing & Invoice Management (Idempotent billing period locking, snapshot invoice generation)
  - Phase 6: Payments & Reconciliation (Atomic transaction balance reconciliation, partial payment settlement)
  - Phase 7: Dashboards, Analytics & Customer Portal (Admin management console, staff operations, client self-service portal, subscription models view)
  - Phase 8: Testing, Optimization & Deployment (Passing Jest unit tests, Supertest e2e tests, seeded PostgreSQL database, optimized Next.js build)
- **Known Issues:** None.
- **Blockers:** None.
- **Next Recommended Task:** Project is ready for demonstration and client acceptance walkthrough.
- **Pending Tasks:**
  - Tasks 2.1 through 2.8 in Phase 2.
- **Known Issues:** None.
- **Blockers:** None.
- **Next Recommended Task:** Task 2.1 — User entity and password hashing implementation.

---

## E. Technical Decision Log

| ID | Decision | Reason | Alternatives Considered | Date | Impact |
|---|---|---|---|---|---|
| DEC-001 | Use integer minor units (paise/cents) for all monetary calculations | Floating-point arithmetic introduces rounding inaccuracies that compromise financial audits | IEEE 754 float, Prisma Decimal strings | 2026-10-31 | Eliminates precision loss across catalog pricing, discounts, taxes, invoices, and balances |
| DEC-002 | Separate Invoice Lifecycle status from Settlement status | A single status enum (`Draft`, `Confirmed`, `Paid`) cannot model partial payments or overdue confirmed invoices accurately | Single enum status | 2026-10-31 | Supports robust partial payment workflows and accurate aging/overdue tracking |
| DEC-003 | Enforce billing-period uniqueness with DB constraint `(subscription_id, period_start, period_end)` | Scheduled jobs or worker retries must be strictly idempotent to avoid duplicate billing | Application-level deduplication | 2026-10-31 | Guarantees database-level idempotency even during worker crashes or race conditions |
| DEC-004 | Use npm workspaces for the monorepo | Clean, built-in monorepo support without external tooling prerequisites, perfectly matching the Node 24 runtime | Turborepo, Nx, pnpm | 2026-10-31 | Streamlined local setup and reliable package linking across apps and packages |
| DEC-005 | Snapshot product prices, tax rates, and discount details on invoice lines | Catalog or tax rule adjustments must never retrospectively alter historical financial documents | Foreign key joins only | 2026-10-31 | Complete legal and regulatory compliance for historical billing records |
| DEC-006 | Represent Paused as a distinct state with paused timestamp records | Allows resuming subscriptions with explicit policy (e.g. extending expiry vs keeping fixed end-date) | Inactive flag | 2026-10-31 | Clean state machine transitions and auditability of paused intervals |
| DEC-007 | Adopt Light Enterprise SaaS design system with pure white canvas and electric indigo | Optimizes financial data readability, high contrast, clean card containment, and soft semantic status badges | Dark glassmorphism mode | 2026-10-31 | Uniform light enterprise theme with `#FFFFFF` background, `#E2E8F0` borders, `#4F46E5` accent, soft semantic status pills, and interactive color legend strip |

---

## F. Important Development Rules

1. **Continuous Update:** Update `workflow.md` whenever a task is completed or updated.
2. **Actual Verification:** Never mark a task complete unless its implementation and relevant automated verification are finished.
3. **Partial Progress Transparency:** If a task is partially completed, clearly document what remains.
4. **Phase Gating:** Review the previous phase's completion criteria before commencing a subsequent phase.
5. **No Premature Implementation:** Do not start Phase 2 features (auth, business models) until Phase 0 and Phase 1 are signed off.
6. **Immutable History:** Do not remove completed tasks or historical architectural decisions.
7. **Single Source of Truth:** `workflow.md` governs development priority and state throughout the project lifecycle.
