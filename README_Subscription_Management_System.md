# Subscription Management System

> A unified platform for managing products, subscription plans, customer
> subscriptions, recurring invoices, payments, and revenue reporting .

## Project Overview

The **Subscription Management System (SMS)** is a business application
designed to manage the complete lifecycle of a subscription-based
business from one centralized platform.

It enables an organization to configure products and plans, prepare
quotations, onboard customers, manage subscriptions, generate recurringhackathon-odoo
invoices, record payments, and monitor revenue and outstanding balances.

The system is designed around three user roles:

-   **Admin:** Configures and controls the platform, including products,
    plans, taxes, discounts, staff accounts, and reporting.
-   **Staff:** Handles permitted day-to-day customer, quotation,
    subscription, invoice, and payment operations.
-   **Customer:** Uses a self-service portal to view their own
    subscriptions and invoices.

The project is based on the supplied *Subscription Management System*
problem statement. Where this README proposes implementation details
beyond the stated requirements---for example, a job queue, audit logs,
payment gateway integration, or refunds---they are identified as
**recommended implementation decisions or optional extensions**, not as
mandatory requirements from the brief.

------------------------------------------------------------------------

## Table of Contents

1.  [Objectives](#1-objectives)
2.  [Users and Permissions](#2-users-and-permissions)
3.  [Functional Requirements and
    Features](#3-functional-requirements-and-features)
4.  [End-to-End Business Workflow](#4-end-to-end-business-workflow)
5.  [Technology Stack](#5-technology-stack)
6.  [System Architecture](#6-system-architecture)
7.  [Core Data Model](#7-core-data-model)
8.  [Business Rules and State
    Management](#8-business-rules-and-state-management)
9.  [Implementation Roadmap](#9-implementation-roadmap)
10. [API Design Plan](#10-api-design-plan)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Critical Engineering
    Challenges](#12-critical-engineering-challenges)
13. [Testing Strategy](#13-testing-strategy)
14. [Security and Reliability](#14-security-and-reliability)
15. [Suggested Repository Structure](#15-suggested-repository-structure)
16. [Development Setup](#16-development-setup)
17. [Definition of Done](#17-definition-of-done)
18. [Scope Boundaries and Future
    Enhancements](#18-scope-boundaries-and-future-enhancements)

------------------------------------------------------------------------

## 1. Objectives

The system aims to replace fragmented manual processes with a reliable,
centralized workflow.

### Problems addressed

  -----------------------------------------------------------------------
  Existing problem                    System capability
  ----------------------------------- -----------------------------------
  Subscriptions tracked in            Central subscription records and
  spreadsheets                        lifecycle tracking

  Renewals depend on manual reminders Scheduled billing and renewal
                                      processing

  Invoices prepared manually          Invoice generation from
                                      subscription data

  Payments matched manually           Payment records linked to invoices

  Discounts are difficult to track    Configurable discount rules and
                                      automatic application

  Revenue reports prepared manually   Filterable dashboard and financial
                                      summaries
  -----------------------------------------------------------------------

### Primary objectives

-   Maintain a single source of truth for customers, products, plans,
    subscriptions, invoices, and payments.
-   Automate recurring invoice generation.
-   Apply configured taxes and eligible discounts consistently.
-   Make subscription and invoice status visible to authorized users.
-   Give customers self-service access to their own subscription and
    invoice information.
-   Provide finance users with timely revenue, payment, and
    overdue-invoice summaries.
-   Keep application pages responsive as the number of records grows.

------------------------------------------------------------------------

## 2. Users and Permissions

Access must be enforced on the server and in data queries. Hiding a
button in the frontend is not sufficient authorization.

  ---------------------------------------------------------------------------
  Capability             Admin               Staff             Customer
  --------------- ------------------- ------------------- -------------------
  Sign in / sign          Yes                 Yes                 Yes
  out                                                     

  View admin              Yes             Limited, if             No
  dashboard                                permitted      

  Create staff            Yes                 No                  No
  accounts                                                

  Manage products         Yes            As permitted             No
  and variants                                            

  Manage plans            Yes            As permitted             No
  and plan rules                                          

  Configure taxes         Yes             No, unless              No
                                      explicitly granted  

  Create discount         Yes                 No                  No
  rules                                                   

  Manage customer         Yes            As permitted      Own profile only
  records                                                 

  Create                  Yes                 Yes                 No
  quotations                                              

  Manage                  Yes            As permitted     View own; permitted
  subscriptions                                              self-service
                                                             actions only

  Manage invoices         Yes            As permitted      View/download own

  Record payments         Yes            As permitted        No; customer
                                                           payment flow is a
                                                               separate
                                                              integration

  View financial          Yes            As permitted             No
  reports                                                 
  ---------------------------------------------------------------------------

**Permission design:** Use role-based access control (RBAC), with
explicit permission checks for sensitive actions. Staff permissions
should be configurable or clearly defined by the project team. The brief
specifies limited staff access but does not enumerate every staff
permission.

### Authentication requirements

-   Registration with email and password.
-   Email address must be unique.
-   Password must be more than eight characters and contain:
    -   At least one uppercase letter.
    -   At least one lowercase letter.
    -   At least one special character.
-   Password reset link sent to the registered email address.
-   Secure password hashing; never store plaintext passwords.
-   Admin-only staff account creation.
-   Customer data isolation: customers must only access their own
    records.

------------------------------------------------------------------------

## 3. Functional Requirements and Features

This section is the primary feature checklist for implementation and
review.

### 3.1 Authentication and User Management

-   [ ] Customer registration.
-   [ ] Unique email validation.
-   [ ] Password policy validation on the server.
-   [ ] Secure login and logout.
-   [ ] Forgot-password workflow.
-   [ ] Email-based password reset with expiring, single-use token.
-   [ ] Role assignment: Admin, Staff, Customer.
-   [ ] Admin-only staff creation.
-   [ ] Protected frontend routes.
-   [ ] Backend authorization middleware/guards.
-   [ ] Customer-level ownership checks on every customer-facing
    resource.
-   [ ] Appropriate session/token expiry and revocation behavior.

### 3.2 Customer Management

-   [ ] Create and maintain customer profiles.
-   [ ] Store customer contact and billing information.
-   [ ] Search customers by name, email, or customer identifier.
-   [ ] View a customer's subscriptions.
-   [ ] View a customer's invoices and payment history.
-   [ ] Filter and paginate customer lists.
-   [ ] Prevent unauthorized access to another customer's information.

The brief requires customer accounts and customer-specific
subscription/invoice access. The exact customer profile fields should be
finalized during database design.

### 3.3 Product Management

Admin capabilities:

-   [ ] Create a product.
-   [ ] Edit product details.
-   [ ] Record product name.
-   [ ] Record product type.
-   [ ] Record sales price.
-   [ ] Record cost price.
-   [ ] Add notes or description.
-   [ ] Create and manage product variants.
-   [ ] Configure variant-specific additional pricing.
-   [ ] Activate/deactivate products where appropriate.
-   [ ] Prevent destructive changes to products referenced by historical
    transactions.

**Variant pricing example**

If a product has a base sales price of ₹999 and selecting the Odoo brand
adds ₹560:

`Final unit price = ₹999 + ₹560 = ₹1,559`

The pricing calculation must be performed by the backend and reflected
consistently in quotations, subscriptions, and invoices.

### 3.4 Plan Management

Admin capabilities:

-   [ ] Create and edit plans.
-   [ ] Associate plans with the relevant product/product offering.
-   [ ] Set plan price.
-   [ ] Configure billing frequency:
    -   Daily
    -   Weekly
    -   Monthly
    -   Yearly
-   [ ] Set minimum quantity.
-   [ ] Configure plan availability start date.
-   [ ] Configure plan availability end date.
-   [ ] Configure whether a plan closes automatically at its end date.
-   [ ] Configure whether early closure is allowed.
-   [ ] Configure whether pausing is allowed.
-   [ ] Configure whether renewal is allowed.
-   [ ] Validate plan availability when a quotation or subscription is
    created.

Plan rules should be checked by the backend, not only by the user
interface.

### 3.5 Quotation Management

-   [ ] Create quotation templates.
-   [ ] Save reusable product and plan lines in a template.
-   [ ] Create a quotation from a template.
-   [ ] Set the customer.
-   [ ] Add products/plans and quantities.
-   [ ] Set unit prices and applicable taxes.
-   [ ] Calculate line totals and quotation total.
-   [ ] Set quotation validity in days or an explicit valid-until date.
-   [ ] Display quotation status.
-   [ ] Convert an accepted/confirmed quotation into a subscription.
-   [ ] Preserve the agreed commercial values when converting the
    quotation.
-   [ ] Prevent expired quotations from being accepted unless an
    authorized user renews their validity.

The brief requires reusable quotation templates and conversion into
subscriptions. The exact quotation status vocabulary should be agreed
during implementation.

### 3.6 Subscription Management

Each subscription must have:

-   [ ] Unique subscription number.
-   [ ] Customer reference.
-   [ ] Plan reference.
-   [ ] Start date.
-   [ ] Expiry date.
-   [ ] Payment terms.
-   [ ] One or more subscription lines.
-   [ ] Product reference per line.
-   [ ] Quantity.
-   [ ] Unit price.
-   [ ] Tax details.
-   [ ] Line amount and subscription total.

Required lifecycle:

`Draft → Quotation → Confirmed → Active → Closed`

Additional capabilities:

-   [ ] Create subscription directly where the business workflow
    permits.
-   [ ] Convert quotation to subscription.
-   [ ] Confirm a subscription.
-   [ ] Activate a subscription according to the defined activation
    rule.
-   [ ] Pause a subscription when permitted by its plan.
-   [ ] Resume a paused subscription.
-   [ ] Renew a subscription when permitted.
-   [ ] Close a subscription early when permitted.
-   [ ] Automatically close subscriptions according to plan/end-date
    rules.
-   [ ] Search and filter subscriptions by customer, plan, date, and
    status.
-   [ ] View subscription history and related invoices.
-   [ ] Validate all status transitions on the server.

**Important:** The brief lists five primary lifecycle statuses and
separately describes pause, early closure, and renewal actions. The
implementation should define whether `Paused` is an additional status or
a separate state/flag, and document the rules for resuming and renewing.

### 3.7 Recurring Billing Engine

This is a central system capability.

-   [ ] Identify subscriptions whose next billing date is due.
-   [ ] Select only subscriptions eligible for billing.
-   [ ] Generate invoices from subscription data.
-   [ ] Copy customer billing details to the invoice.
-   [ ] Copy product lines, quantities, prices, and tax details.
-   [ ] Apply valid discounts.
-   [ ] Calculate totals using a consistent monetary calculation
    service.
-   [ ] Record the billing period covered by each invoice.
-   [ ] Update the next billing date only after the billing operation is
    safely recorded.
-   [ ] Support daily, weekly, monthly, and yearly billing frequencies.
-   [ ] Avoid duplicate invoices for the same subscription and billing
    period.
-   [ ] Record successful, skipped, and failed billing attempts.
-   [ ] Handle retryable failures safely.
-   [ ] Respect subscription status, expiry, pause, and plan-specific
    rules.

**Reliability requirement:** Billing must be idempotent. If a scheduled
job runs more than once, or is retried after a crash, it must not create
duplicate invoices for the same billing period.

### 3.8 Invoice Management

Invoice information:

-   [ ] Unique invoice number.
-   [ ] Customer and billing details.
-   [ ] Related subscription.
-   [ ] Invoice date.
-   [ ] Due date.
-   [ ] Billing period.
-   [ ] Product/service line descriptions.
-   [ ] Quantities and unit prices.
-   [ ] Tax breakdown.
-   [ ] Discount breakdown.
-   [ ] Subtotal and final total.
-   [ ] Amount paid and outstanding amount.

Invoice operations:

-   [ ] Generate invoice from a subscription.
-   [ ] Create invoice in Draft state.
-   [ ] Confirm invoice.
-   [ ] Cancel invoice according to defined rules.
-   [ ] Mark invoice as paid when payment conditions are met.
-   [ ] Send invoice to customer.
-   [ ] Generate a printable/downloadable PDF.
-   [ ] View invoice history.
-   [ ] Filter invoices by date, customer, status, and due date.
-   [ ] Identify overdue invoices.
-   [ ] Prevent unauthorized edits to confirmed financial records.

The brief specifies the invoice lifecycle `Draft → Confirmed → Paid`.
For a robust implementation, invoice lifecycle and payment status should
be represented separately so that partial payments and outstanding
balances can be handled without losing information.

### 3.9 Tax Management

Admin capabilities:

-   [ ] Create tax rules.
-   [ ] Set tax name/description.
-   [ ] Set tax rate or configured calculation rule.
-   [ ] Define applicability to products or invoice lines.
-   [ ] Activate/deactivate tax rules.
-   [ ] Apply the relevant tax during quotation/invoice calculation.
-   [ ] Store the tax details/rate used on each invoice line so
    historical invoices do not change when a tax rule is edited.

The brief requires automatic tax calculation from admin-configured
rules. It does not prescribe a jurisdiction or specific tax structure.
GST-specific behavior should only be added if confirmed as a project
requirement.

### 3.10 Discount Management

Admin-only discount rule creation:

-   [ ] Fixed-amount discount.
-   [ ] Percentage discount.
-   [ ] Minimum purchase amount.
-   [ ] Minimum quantity.
-   [ ] Start date.
-   [ ] End date.
-   [ ] Maximum number of uses.
-   [ ] Product-specific applicability.
-   [ ] Whole-subscription applicability.
-   [ ] Validate eligibility before applying a discount.
-   [ ] Apply eligible discounts automatically to the next invoice.
-   [ ] Stop applying discounts after expiry or usage limit is reached.
-   [ ] Track discount usage to prevent exceeding the configured limit.
-   [ ] Store the applied discount details on the invoice for historical
    accuracy.

### 3.11 Payment Management

The stated requirement is to record payments against invoices.

-   [ ] Record payment amount.
-   [ ] Record payment method.
-   [ ] Record payment date.
-   [ ] Record a note/reference.
-   [ ] Link payment to the correct invoice.
-   [ ] View payments for an invoice.
-   [ ] View invoice payment status.
-   [ ] Calculate amount paid.
-   [ ] Calculate outstanding balance.
-   [ ] Identify fully paid invoices.
-   [ ] Identify partially paid invoices.
-   [ ] Identify unpaid and overdue invoices.
-   [ ] Prevent duplicate payment records.
-   [ ] Validate that a payment cannot exceed the allowed outstanding
    amount unless an explicit overpayment policy exists.

**Scope clarification:** The brief requires payment recording but does
not explicitly require an online payment gateway. Manual payment
recording is sufficient to meet the stated requirement. Online
collection through Razorpay or another provider can be treated as an
extension.

### 3.12 Customer Self-Service Portal

-   [ ] Customer login.
-   [ ] Customer dashboard.
-   [ ] View own active and past subscriptions.
-   [ ] View subscription details and status.
-   [ ] View own invoices.
-   [ ] Download/print own invoices.
-   [ ] View payment records and outstanding amounts.
-   [ ] Show relevant renewal/expiry information.
-   [ ] Ensure all queries are scoped to the authenticated customer.

Only self-service actions explicitly permitted by the business rules
should be exposed. The brief requires customers to view and manage their
own subscriptions, but the precise actions they may perform should be
agreed before implementation.

### 3.13 Dashboard and Reporting

Admin/authorized finance dashboard:

-   [ ] Total active subscriptions.
-   [ ] Revenue received.
-   [ ] Outstanding amount.
-   [ ] Overdue invoice count and list.
-   [ ] Invoice totals and status summary.
-   [ ] Payment summary.
-   [ ] Subscription summary.
-   [ ] Filter by date range.
-   [ ] Filter by customer.
-   [ ] Filter by subscription status.
-   [ ] Filter by invoice status.
-   [ ] Filter by payment method.
-   [ ] Filter by plan.
-   [ ] Provide a clear summary view.
-   [ ] Paginate large result sets.
-   [ ] Export reports as CSV/PDF (recommended enhancement).

**Metric definitions must be explicit.** "Revenue" can mean cash
collected, invoiced amount, or recognized revenue. The first release
should label the metric accurately---for example, "Payments
received"---rather than treating these measures as interchangeable.

------------------------------------------------------------------------

## 4. End-to-End Business Workflow

The following workflow connects the modules into one business process.

``` mermaid
flowchart TD
    A[Customer registers] --> B[Admin configures products and variants]
    B --> C[Admin configures plans, taxes and discounts]
    C --> D[Staff prepares quotation from template]
    D --> E[Customer / authorized user accepts quotation]
    E --> F[Subscription is created]
    F --> G[Subscription is confirmed and activated]
    G --> H{Billing date due?}
    H -- No --> I[Wait until next billing date]
    I --> H
    H -- Yes --> J[Billing engine validates subscription]
    J --> K[Calculate line items, discounts and taxes]
    K --> L[Generate invoice]
    L --> M[Record payment against invoice]
    M --> N{Outstanding balance is zero?}
    N -- Yes --> O[Invoice marked paid]
    N -- No --> P[Invoice remains outstanding]
    O --> Q[Dashboard and reports updated]
    P --> Q
    Q --> R[Finance team reviews revenue and overdue invoices]
```

### Example monthly cycle

1.  Admin creates a product and a monthly plan.
2.  Staff prepares a quotation using a template.
3.  The quotation is accepted and converted into a subscription.
4.  The subscription becomes active.
5.  On its billing date, the billing worker finds the subscription.
6.  The system calculates the invoice using the applicable prices,
    taxes, and discounts.
7.  The invoice is created and made available to the customer.
8.  Staff records the payment against the invoice, or an integrated
    payment provider reports the payment.
9.  The invoice's paid and outstanding amounts are updated.
10. Finance reviews collected payments and overdue invoices from the
    dashboard.

------------------------------------------------------------------------

## 5. Technology Stack

The following stack is recommended for the project.

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                Next.js + TypeScript    Admin, staff, and
                                                  customer interfaces

  UI                      Tailwind CSS            Styling and responsive
                                                  layouts

  Backend                 Node.js + NestJS        API, business logic,
                                                  validation,
                                                  authorization

  API style               REST                    Communication between
                                                  frontend and backend

  Database                PostgreSQL              Relational business and
                                                  financial data

  ORM                     Prisma                  Schema, migrations, and
                                                  type-safe database
                                                  access

  Background jobs         Redis + BullMQ          Scheduled and retryable
                                                  billing jobs

  Authentication          Secure session/JWT      Authentication and
                          strategy                authorization

  Email                   SMTP-compatible email   Password reset and
                          provider                invoice notifications

  PDF generation          Server-side PDF library Invoice documents

  File storage            S3-compatible object    Generated invoice PDFs
                          storage                 and documents

  Testing                 Jest + Supertest +      Unit, API integration,
                          Playwright              and end-to-end tests

  Version control         Git + GitHub            Source control and
                                                  collaboration

  Deployment              Docker                  Consistent application
                                                  and worker environments
  -----------------------------------------------------------------------

### Why this stack?

-   **Next.js + TypeScript:** Supports structured frontend development
    and reliable API integration.
-   **NestJS:** Encourages modular backend architecture, validation,
    guards, and testable services. Express can also be used, but NestJS
    is the recommended choice for this multi-module application.
-   **PostgreSQL:** Well suited to relational entities and financial
    transactions requiring constraints and database transactions.
-   **Prisma:** Makes schema management and migrations easier to
    maintain.
-   **Redis + BullMQ:** Keeps scheduled billing and other background
    work outside normal user-facing requests.
-   **Docker:** Makes the API, worker, database, and Redis environments
    reproducible.

### High-level stack decision

Use one backend codebase with separate runtime processes for:

1.  The API server.
2.  The background worker.

Both processes use the same business modules and PostgreSQL database.
The worker additionally uses Redis/BullMQ to process scheduled jobs.

------------------------------------------------------------------------

## 6. System Architecture

### 6.1 Logical architecture

``` mermaid
flowchart TB
    subgraph Clients
      A[Admin Dashboard]
      B[Staff Dashboard]
      C[Customer Portal]
    end

    A --> D[Next.js Frontend]
    B --> D
    C --> D

    D --> E[REST API - NestJS]

    subgraph Backend Modules
      E --> F[Auth and RBAC]
      E --> G[Customer and Product]
      E --> H[Plan and Quotation]
      E --> I[Subscription]
      E --> J[Billing and Invoice]
      E --> K[Payment]
      E --> L[Reporting]
    end

    F --> M[(PostgreSQL)]
    G --> M
    H --> M
    I --> M
    J --> M
    K --> M
    L --> M

    J --> N[Redis / BullMQ]
    N --> O[Billing Worker]
    O --> M
    O --> P[Email Provider]
    O --> Q[PDF / Object Storage]
```

### 6.2 Backend module boundaries

  Module          Main responsibility
  --------------- --------------------------------------------------
  Auth            Registration, login, reset password, sessions
  Users & Roles   Staff accounts, roles, permissions
  Customers       Customer profiles and ownership
  Products        Product catalog and variants
  Plans           Billing frequency and plan rules
  Quotations      Templates, quotation lines, conversion
  Subscriptions   Lifecycle, renewal, pause, expiry
  Pricing         Price calculation, taxes, discounts
  Billing         Due-subscription selection and billing execution
  Invoices        Invoice creation, status, PDF and delivery
  Payments        Payment recording and invoice balances
  Notifications   Email and other system notifications
  Reports         Dashboard summaries and filters
  Audit           Recommended record of sensitive changes

### 6.3 Request and billing execution flow

**Normal API request**

1.  User interacts with the Next.js application.
2.  Frontend sends a request to the NestJS API.
3.  Authentication identifies the user.
4.  Authorization checks the requested action.
5.  DTO validation checks the request.
6.  The relevant service applies business rules.
7.  Prisma executes database operations.
8.  The API returns a structured response.

**Scheduled billing**

1.  A scheduler enqueues a billing job.
2.  A BullMQ worker receives the job.
3.  The worker loads subscriptions due for billing.
4.  The billing service validates eligibility.
5.  A database transaction creates the invoice and billing-period
    record.
6.  A uniqueness constraint prevents duplicate billing for the same
    period.
7.  The worker records the outcome.
8.  Invoice email/PDF work is dispatched safely.

Do not keep a database transaction open while waiting for an external
email or payment provider.

------------------------------------------------------------------------

## 7. Core Data Model

The following is the proposed initial relational model. Exact fields and
cardinalities should be finalized during schema design.

  -----------------------------------------------------------------------------
  Entity/table                 Purpose                 Important relationships
  ---------------------------- ----------------------- ------------------------
  `users`                      Login identities        Role; optionally
                                                       customer profile

  `roles`                      Role definitions        Users and permissions

  `permissions`                Individual access       Roles
                               rights                  

  `customers`                  Customer/business       Users, subscriptions,
                               profile                 quotations, invoices

  `products`                   Product catalog         Product variants, plans,
                                                       line items

  `product_variants`           Variant options and     Products
                               price adjustments       

  `plans`                      Price and recurring     Products, subscriptions
                               terms                   

  `quotation_templates`        Reusable quotation      Template lines
                               structure               

  `quotation_template_items`   Template product/plan   Templates, products,
                               lines                   plans

  `quotations`                 Customer offers         Customers, quotation
                                                       items

  `quotation_items`            Quoted products and     Quotations, products,
                               prices                  plans

  `subscriptions`              Customer subscription   Customers, plans, items,
                               records                 invoices

  `subscription_items`         Products, quantities,   Subscriptions, products,
                               agreed prices           variants

  `discount_rules`             Discount conditions     Products and discount
                                                       usage

  `discount_usages`            Tracks rule usage       Discount rules,
                                                       invoices/subscriptions

  `tax_rules`                  Configured tax rules    Invoice items

  `invoices`                   Billing documents       Customers,
                                                       subscriptions, invoice
                                                       items, payments

  `invoice_items`              Snapshot of billed      Invoices, products
                               lines                   

  `payments`                   Recorded payment        Invoices
                               transactions            

  `billing_periods`            One record per          Subscriptions, invoices
                               subscription billing    
                               period                  

  `billing_events`             Billing attempt/result  Subscriptions, invoices
                               log                     

  `audit_logs`                 Recommended change      Users and affected
                               history                 records
  -----------------------------------------------------------------------------

### Important data design principles

1.  Use primary keys and foreign keys for relational integrity.
2.  Add unique constraints for user email, subscription number, invoice
    number, and billing-period uniqueness.
3.  Use indexes for frequently filtered fields such as customer ID,
    status, due date, and next billing date.
4.  Store monetary values as integer minor units (for example, paise) or
    use an explicitly precise decimal strategy. Do not use
    floating-point values for money.
5.  Store invoice line descriptions, unit prices, discounts, and tax
    details as historical snapshots. Editing a product or tax rule must
    not rewrite an already-issued invoice.
6.  Use UTC timestamps in storage and display dates in the appropriate
    business/customer timezone.
7.  Use database transactions for operations that must succeed or fail
    together.
8.  Prefer deactivation/archival over deleting records referenced by
    financial history.

### Key relationships

``` mermaid
erDiagram
    CUSTOMER ||--o{ SUBSCRIPTION : owns
    CUSTOMER ||--o{ QUOTATION : receives
    CUSTOMER ||--o{ INVOICE : billed
    PRODUCT ||--o{ PRODUCT_VARIANT : has
    PRODUCT ||--o{ PLAN : offered_as
    PLAN ||--o{ SUBSCRIPTION : selected_for
    SUBSCRIPTION ||--o{ SUBSCRIPTION_ITEM : contains
    SUBSCRIPTION ||--o{ INVOICE : generates
    QUOTATION ||--o{ QUOTATION_ITEM : contains
    INVOICE ||--o{ INVOICE_ITEM : contains
    INVOICE ||--o{ PAYMENT : receives
    SUBSCRIPTION ||--o{ BILLING_PERIOD : billed_for
```

------------------------------------------------------------------------

## 8. Business Rules and State Management

State transitions must be validated by backend services. Clients must
not be able to set arbitrary statuses through a generic update request.

### Subscription lifecycle

Required lifecycle from the brief:

``` text
Draft → Quotation → Confirmed → Active → Closed
```

Additional actions described in the brief:

-   Pause.
-   Resume, if supported by the chosen pause model.
-   Renew.
-   Early close.
-   Automatic closure at the configured end date.

Before implementation, decide and document:

-   Whether a paused subscription has a `Paused` status or a separate
    pause record.
-   Whether pause extends the expiry date.
-   Whether billing is suspended while paused.
-   How renewal changes the subscription period.
-   Whether early closure is immediate or end-of-period.
-   What happens to an invoice already generated when a subscription is
    paused or closed.

### Invoice and payment states

The brief's invoice lifecycle is:

``` text
Draft → Confirmed → Paid
```

Recommended implementation: keep document lifecycle and settlement state
separate.

For example:

-   Invoice lifecycle: Draft, Confirmed, Cancelled.
-   Settlement state: Unpaid, Partially Paid, Paid, Overdue.

This separation supports partial payments and overdue tracking without
treating a partially paid invoice as fully paid.

### Billing-period uniqueness

Each subscription billing period should have a stable identity, such as:

`subscription_id + period_start + period_end`

Enforce uniqueness in PostgreSQL. The billing worker should be safe to
retry.

### Monetary calculation order

A recommended calculation sequence is:

1.  Calculate line base amount (`quantity × unit price`).
2.  Apply eligible line-level discounts.
3.  Calculate taxable amount according to the configured tax rules.
4.  Calculate tax.
5.  Add line totals and any permitted subscription-level adjustments.
6.  Round according to the configured currency/tax rules.
7.  Persist the calculation breakdown on the invoice.

The exact discount/tax ordering must be confirmed as a business rule
before release.

------------------------------------------------------------------------

## 9. Implementation Roadmap

Build the system in dependency order. Complete and test each phase
before relying on it in later modules.

### Phase 0 --- Requirement and design confirmation

-   [ ] Confirm user roles and staff permissions.
-   [ ] Define customer registration and account ownership.
-   [ ] Define quotation statuses and acceptance rules.
-   [ ] Define subscription pause, resume, renewal, and closure
    behavior.
-   [ ] Define billing date rules for month-end and leap-year cases.
-   [ ] Define tax and discount calculation order.
-   [ ] Define invoice cancellation and partial-payment behavior.
-   [ ] Decide whether payment gateway integration is in the first
    release.
-   [ ] Confirm currency and timezone assumptions.
-   [ ] Approve database ER diagram and API conventions.

**Deliverables:** Finalized requirements, workflow diagrams, ER diagram,
initial API contract.

### Phase 1 --- Project foundation

-   [ ] Create repository and branch strategy.
-   [ ] Initialize Next.js with TypeScript.
-   [ ] Initialize NestJS backend.
-   [ ] Configure Tailwind CSS and shared UI conventions.
-   [ ] Set up PostgreSQL and Prisma.
-   [ ] Set up Redis and BullMQ.
-   [ ] Configure environment variables.
-   [ ] Add Docker Compose for local dependencies.
-   [ ] Add linting, formatting, and basic CI checks.
-   [ ] Establish API response/error conventions.

**Deliverables:** Running frontend, API, database, and Redis
environments.

### Phase 2 --- Authentication, users, and customers

-   [ ] Implement registration and login.
-   [ ] Implement password policy and secure password hashing.
-   [ ] Implement password reset email flow.
-   [ ] Implement roles and permission guards.
-   [ ] Implement admin-only staff creation.
-   [ ] Implement customer profiles.
-   [ ] Implement ownership checks and protected routes.
-   [ ] Test role and customer data isolation.

**Deliverables:** Secure role-aware application foundation.

### Phase 3 --- Products, variants, plans, tax, and discounts

-   [ ] Implement product CRUD.
-   [ ] Implement product variants and price adjustments.
-   [ ] Implement plan CRUD.
-   [ ] Implement billing frequency and minimum quantity.
-   [ ] Implement availability dates and plan lifecycle rules.
-   [ ] Implement tax rule configuration.
-   [ ] Implement discount rule configuration.
-   [ ] Implement reusable pricing calculation service.
-   [ ] Add validation and unit tests for price calculations.

**Deliverables:** Configurable catalog and pricing engine.

### Phase 4 --- Quotations and subscriptions

-   [ ] Implement quotation templates.
-   [ ] Implement quotation creation and line items.
-   [ ] Implement quotation validity.
-   [ ] Implement quotation-to-subscription conversion.
-   [ ] Implement subscription creation and unique numbering.
-   [ ] Implement required subscription statuses.
-   [ ] Implement pause, renewal, early closure, and expiry rules.
-   [ ] Implement subscription search, filters, and history.
-   [ ] Test all allowed and disallowed state transitions.

**Deliverables:** Complete quote-to-subscription workflow.

### Phase 5 --- Recurring billing and invoices

-   [ ] Implement due-subscription selection.
-   [ ] Implement daily/weekly/monthly/yearly billing calculations.
-   [ ] Implement scheduler and BullMQ worker.
-   [ ] Implement billing-period records and uniqueness constraints.
-   [ ] Implement invoice creation from subscription snapshots.
-   [ ] Implement automatic tax and discount application.
-   [ ] Implement invoice numbering and due dates.
-   [ ] Implement invoice confirmation/cancellation rules.
-   [ ] Implement PDF generation.
-   [ ] Implement invoice email delivery.
-   [ ] Implement retry handling and billing logs.
-   [ ] Test duplicate execution and worker restart scenarios.

**Deliverables:** Reliable recurring invoice generation.

### Phase 6 --- Payments and reconciliation

-   [ ] Implement manual payment recording.
-   [ ] Link payments to invoices.
-   [ ] Calculate paid and outstanding balances.
-   [ ] Support partial payments.
-   [ ] Derive invoice settlement status.
-   [ ] Identify overdue invoices.
-   [ ] Add payment history and filters.
-   [ ] Test duplicate and invalid payment attempts.

**Deliverables:** Payment and outstanding-balance management.

### Phase 7 --- Dashboards and customer portal

-   [ ] Build admin dashboard.
-   [ ] Build staff operational views.
-   [ ] Build customer dashboard.
-   [ ] Add subscription detail views.
-   [ ] Add invoice list and invoice detail views.
-   [ ] Add dashboard filters.
-   [ ] Add revenue/payment summaries.
-   [ ] Add overdue invoice view.
-   [ ] Add pagination and server-side filtering.
-   [ ] Verify customer portal isolation.

**Deliverables:** Role-specific operational interfaces and reporting.

### Phase 8 --- Hardening and release

-   [ ] Run unit, integration, and end-to-end test suites.
-   [ ] Run security and authorization tests.
-   [ ] Test concurrent billing workers.
-   [ ] Test month-end, leap-year, and timezone scenarios.
-   [ ] Optimize slow database queries.
-   [ ] Add monitoring and structured logs.
-   [ ] Verify backups and recovery process.
-   [ ] Run performance tests against the agreed dataset.
-   [ ] Prepare deployment and environment documentation.
-   [ ] Complete mentor/demo acceptance checklist.

**Deliverables:** Tested, documented, deployable release.

------------------------------------------------------------------------

## 10. API Design Plan

Use versioned REST endpoints, for example `/api/v1/...`.

The following is an initial endpoint plan, not a claim that these
endpoints have already been implemented.

  -----------------------------------------------------------------------
  Domain                              Example endpoints
  ----------------------------------- -----------------------------------
  Authentication                      `POST /auth/register`,
                                      `POST /auth/login`,
                                      `POST /auth/forgot-password`,
                                      `POST /auth/reset-password`

  Staff                               `POST /staff`, `GET /staff`,
                                      `PATCH /staff/:id`

  Customers                           `GET /customers`,
                                      `POST /customers`,
                                      `GET /customers/:id`,
                                      `PATCH /customers/:id`

  Products                            `GET /products`, `POST /products`,
                                      `PATCH /products/:id`,
                                      `POST /products/:id/variants`

  Plans                               `GET /plans`, `POST /plans`,
                                      `PATCH /plans/:id`

  Quotations                          `GET /quotations`,
                                      `POST /quotations`,
                                      `POST /quotations/:id/convert`

  Subscriptions                       `GET /subscriptions`,
                                      `POST /subscriptions`,
                                      `GET /subscriptions/:id`,
                                      `POST /subscriptions/:id/pause`,
                                      `POST /subscriptions/:id/renew`,
                                      `POST /subscriptions/:id/close`

  Discounts                           `GET /discount-rules`,
                                      `POST /discount-rules`,
                                      `PATCH /discount-rules/:id`

  Taxes                               `GET /tax-rules`,
                                      `POST /tax-rules`,
                                      `PATCH /tax-rules/:id`

  Invoices                            `GET /invoices`,
                                      `GET /invoices/:id`,
                                      `POST /invoices/:id/confirm`,
                                      `POST /invoices/:id/cancel`,
                                      `GET /invoices/:id/pdf`

  Payments                            `GET /payments`, `POST /payments`,
                                      `GET /invoices/:id/payments`

  Reports                             `GET /reports/overview`,
                                      `GET /reports/revenue`,
                                      `GET /reports/overdue-invoices`

  Customer portal                     `GET /me/subscriptions`,
                                      `GET /me/invoices`,
                                      `GET /me/invoices/:id`
  -----------------------------------------------------------------------

### API conventions

-   Validate all request payloads with DTOs.
-   Apply authentication and permission guards.
-   Scope customer endpoints to the authenticated customer.
-   Use pagination for collection endpoints.
-   Use consistent error response formats.
-   Use idempotency protection for operations that may be retried.
-   Avoid exposing internal database errors or sensitive fields.
-   Keep business calculations in backend services, not frontend
    components.

------------------------------------------------------------------------

## 11. Non-Functional Requirements

### Performance

The problem statement specifies that every page should respond in
**under two seconds**, even with thousands of subscriptions.

To work toward this target:

-   Use pagination and server-side filtering.
-   Add indexes for common query patterns.
-   Avoid loading entire tables into memory.
-   Avoid N+1 database queries.
-   Select only required fields.
-   Optimize dashboard aggregation queries.
-   Cache suitable read-heavy summaries where appropriate.
-   Run load tests using representative data.

The team should define the exact measurement conditions for the
two-second target, including dataset size, test environment, and
percentile (for example, p95).

### Reliability

-   Billing jobs must be retryable and idempotent.
-   Financial updates must use database transactions where appropriate.
-   Failed jobs must be observable.
-   Invoice and payment history must be preserved.
-   Scheduled jobs must not depend on a user keeping a browser open.

### Maintainability

-   Use modular backend boundaries.
-   Keep pricing and billing calculations in dedicated services.
-   Use database migrations.
-   Document business rules and state transitions.
-   Use consistent naming and API conventions.
-   Add tests for financial calculations and lifecycle transitions.

### Usability

-   Provide separate role-appropriate dashboards.
-   Use clear status indicators.
-   Provide search, filters, and pagination.
-   Show actionable validation messages.
-   Make invoice and subscription details easy to locate.

------------------------------------------------------------------------

## 12. Critical Engineering Challenges

  -----------------------------------------------------------------------
  Challenge               Why it matters          Planned mitigation
  ----------------------- ----------------------- -----------------------
  Duplicate billing       Can create duplicate    Idempotency keys,
                          invoices and incorrect  unique billing-period
                          customer balances       constraints, safe
                                                  retries

  Billing date edge cases Month lengths, leap     Central date service
                          years, and timezones    and explicit billing
                          can shift due dates     rules

  Concurrent workers      Two workers may process Database
                          the same due            locking/claiming
                          subscription            strategy and unique
                                                  constraints

  Partial payments        An invoice may be       Payment ledger and
                          settled through         derived outstanding
                          multiple transactions   balance

  Tax/discount            Incorrect calculation   Central calculation
  consistency             creates incorrect       service and immutable
                          invoices                invoice snapshots

  Historical price        Catalog edits must not  Snapshot prices and tax
  changes                 rewrite old invoices    details on transaction
                                                  records

  Customer data exposure  A user may attempt to   Server-side ownership
                          access another          checks and
                          customer's record       authorization tests

  Slow dashboards         Large lists and         Indexing, pagination,
                          aggregations can delay  query optimization,
                          pages                   caching

  External service        Email, storage, or      Retries, timeouts, job
  failures                payment services may be status, and safe
                          unavailable             failure handling
  -----------------------------------------------------------------------

### Highest-priority engineering risks

1.  **Billing correctness:** No duplicate or missed billing periods.
2.  **Financial correctness:** Accurate totals, taxes, discounts, and
    payment balances.
3.  **Access control:** Strict separation of admin, staff, and customer
    data.
4.  **Lifecycle correctness:** Predictable pause, renewal, expiry, and
    closure behavior.
5.  **Performance:** Meet the stated page-response target with realistic
    data.

------------------------------------------------------------------------

## 13. Testing Strategy

Testing should focus especially on financial correctness and state
transitions.

### Unit tests

-   Password validation.
-   Product variant price calculation.
-   Plan billing date calculation.
-   Tax calculation.
-   Discount eligibility and usage limits.
-   Invoice total calculation.
-   Outstanding balance calculation.
-   Subscription transition rules.

### Integration tests

-   Registration and unique email constraint.
-   Role and permission enforcement.
-   Customer ownership checks.
-   Quotation conversion.
-   Subscription-to-invoice generation.
-   Billing-period uniqueness.
-   Payment-to-invoice association.
-   Partial payment settlement.
-   Invoice cancellation rules.

### End-to-end tests

-   Customer registration and login.
-   Admin creates product and plan.
-   Staff creates quotation.
-   Quotation converts to subscription.
-   Billing worker generates invoice.
-   Staff records payment.
-   Customer views their invoice.
-   Finance user sees updated dashboard values.

### Critical edge-case tests

-   Billing worker executes twice for the same period.
-   Worker crashes during processing and retries.
-   Two workers process due subscriptions concurrently.
-   Subscription expires on the billing date.
-   Subscription is paused before billing.
-   Subscription is renewed near expiry.
-   Monthly billing starts on the 29th, 30th, or 31st.
-   Billing crosses February 29 in a leap year.
-   Discount expires on the billing date.
-   Discount usage limit is reached by concurrent purchases.
-   Invoice receives multiple partial payments.
-   Customer changes an invoice ID to access another customer's record.
-   Email provider is unavailable after invoice creation.

------------------------------------------------------------------------

## 14. Security and Reliability

-   Hash passwords using a modern password-hashing algorithm.
-   Never store plaintext passwords or reset tokens.
-   Use HTTPS in deployed environments.
-   Store secrets in environment variables or a secret manager.
-   Validate and sanitize user input.
-   Enforce RBAC and customer ownership in the backend.
-   Apply rate limits to authentication and sensitive endpoints.
-   Protect password reset and email verification flows.
-   Use secure cookie/session settings where cookie-based authentication
    is used.
-   Verify payment-provider webhook signatures if gateway integration is
    added.
-   Record sensitive financial actions in audit logs (recommended).
-   Use database backups and test restoration.
-   Avoid logging passwords, tokens, or sensitive payment information.

### Environment variables

Example names only; actual secrets must never be committed:

``` env
NODE_ENV=development

DATABASE_URL=
REDIS_URL=

AUTH_SECRET=
APP_BASE_URL=

EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=

OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=
OBJECT_STORAGE_ACCESS_KEY=
OBJECT_STORAGE_SECRET_KEY=

# Optional payment gateway integration
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

------------------------------------------------------------------------

## 15. Suggested Repository Structure

A monorepo is recommended so the frontend, API, and worker can share
types and development conventions.

``` text
subscription-management-system/
│
├── apps/
│   ├── web/                         # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── admin/
│   │   │   ├── staff/
│   │   │   └── portal/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   └── public/
│   │
│   ├── api/                         # NestJS REST API
│   │   └── src/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── roles/
│   │       ├── customers/
│   │       ├── products/
│   │       ├── plans/
│   │       ├── quotations/
│   │       ├── subscriptions/
│   │       ├── pricing/
│   │       ├── discounts/
│   │       ├── taxes/
│   │       ├── billing/
│   │       ├── invoices/
│   │       ├── payments/
│   │       ├── reports/
│   │       ├── notifications/
│   │       └── audit/
│   │
│   └── worker/                      # BullMQ background workers
│       └── src/
│           ├── billing/
│           ├── notifications/
│           └── jobs/
│
├── packages/
│   ├── shared/                      # Shared types/constants
│   └── config/                      # Shared lint/TypeScript config
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docs/
│   ├── architecture.md
│   ├── database-design.md
│   ├── api-specification.md
│   └── business-rules.md
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

This is a proposed structure. It can be adjusted to the team's chosen
package manager and deployment approach.

------------------------------------------------------------------------

## 16. Development Setup

### Prerequisites

Install:

-   Node.js LTS.
-   npm, pnpm, or the package manager selected by the team.
-   PostgreSQL.
-   Redis.
-   Git.
-   Docker and Docker Compose (recommended).
-   A code editor such as VS Code.

### Setup sequence

The commands below are an outline. Exact workspace scripts should be
added when the repository is initialized.

``` bash
# 1. Clone the repository
git clone <repository-url>
cd subscription-management-system

# 2. Install dependencies
npm install

# 3. Create local environment file
cp .env.example .env

# 4. Start PostgreSQL and Redis
docker compose up -d

# 5. Apply database migrations
npx prisma migrate dev

# 6. Generate Prisma client
npx prisma generate

# 7. Start the API, frontend, and worker
# Use the workspace scripts defined by the team
npm run dev
```

### Development practices

-   Create feature branches from the agreed base branch.
-   Keep pull requests focused on one module or feature.
-   Include migrations with database changes.
-   Add tests for new business rules.
-   Never commit `.env` or real credentials.
-   Review authorization changes carefully.
-   Update API and architecture documentation when contracts change.

------------------------------------------------------------------------

## 17. Definition of Done

A feature is not complete merely because its UI is visible.

A feature is considered complete when:

-   [ ] The user interface is implemented and usable.
-   [ ] The backend endpoint and business logic are implemented.
-   [ ] Input validation is present.
-   [ ] Authentication and authorization are enforced.
-   [ ] Database constraints and migrations are included.
-   [ ] Loading, empty, and error states are handled.
-   [ ] Relevant unit and integration tests pass.
-   [ ] Sensitive actions are logged where appropriate.
-   [ ] API/documentation is updated.
-   [ ] The feature has been reviewed and merged.

### Project acceptance checklist

-   [ ] Admin, staff, and customer roles work as specified.
-   [ ] Admin can create staff accounts.
-   [ ] Admin can manage products, variants, plans, taxes, and
    discounts.
-   [ ] Staff can prepare quotations from templates.
-   [ ] Quotations can be converted into subscriptions.
-   [ ] Subscription lifecycle and plan-specific rules work.
-   [ ] Due subscriptions generate invoices automatically.
-   [ ] Re-running billing does not create duplicate invoices.
-   [ ] Invoice totals include correct product, discount, and tax
    calculations.
-   [ ] Invoices can be confirmed, cancelled, sent, and
    printed/downloaded.
-   [ ] Payments can be recorded against the correct invoice.
-   [ ] Outstanding and overdue balances are visible.
-   [ ] Customers can only access their own subscriptions and invoices.
-   [ ] Finance dashboard displays active subscriptions, received
    revenue/payments, outstanding amounts, and overdue invoices.
-   [ ] Search, filters, and pagination work.
-   [ ] Performance is measured against the stated under-two-second
    page-response target using a documented test setup.

------------------------------------------------------------------------

## 18. Scope Boundaries and Future Enhancements

The first release should prioritize the requirements explicitly stated
in the problem statement.

### Core scope

-   Authentication and roles.
-   Customer management.
-   Products and variants.
-   Plans and billing frequencies.
-   Quotation templates and conversion.
-   Subscription lifecycle.
-   Recurring invoice generation.
-   Tax and discount rules.
-   Payment recording.
-   Customer portal.
-   Finance dashboard and filters.
-   Performance and reliability requirements.

### Recommended extensions (only after core scope)

-   Online payment gateway integration.
-   Automated payment collection and payment retries.
-   Refund management.
-   Proration for mid-cycle plan changes.
-   Multi-currency support.
-   Multiple organizations/tenants.
-   Advanced revenue recognition and MRR/ARR analytics.
-   CSV/Excel exports.
-   SMS/WhatsApp notifications.
-   Advanced audit trail and approval workflows.
-   Subscription upgrade/downgrade workflows.

These extensions should not delay the reliable implementation of the
core billing and subscription workflow.

------------------------------------------------------------------------

## Project Principle

> **Build the business rules and transaction reliability first; build
> the dashboards around them.**

The most important measure of success is not the number of screens
delivered. It is whether the system can reliably manage the subscription
lifecycle, generate accurate invoices, record payments correctly,
protect customer data, and provide trustworthy financial information.
