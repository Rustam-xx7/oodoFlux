# REST API Specification

> Complete API contract, conventions, endpoints, and error handling for the **Subscription Management System (SMS)**.

---

## 1. API Design Principles & Conventions

- **RESTful Resource Architecture:** Structured around standard HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`).
- **Global Prefix & Versioning:** All endpoints are versioned with the `/api/v1` prefix.
- **Content Type:** JSON exclusively (`Content-Type: application/json; charset=utf-8`).
- **Monetary Values:** Exchanged as integer minor units (paise/cents) to avoid client-server serialization floating-point drifts.
- **Idempotency Headers:** Sensitive mutations (e.g., payment recording or invoice generation) accept an optional `Idempotency-Key: <UUID>` header.

---

## 2. Request & Response Envelope Standards

### 2.1 Standard Success Envelope
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resource retrieved successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 2.2 Standard Error Envelope
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed on submitted payload",
  "details": [
    {
      "field": "salesPrice",
      "issue": "salesPrice must be a positive integer in minor units"
    }
  ],
  "timestamp": "2026-10-31T11:50:00.000Z",
  "path": "/api/v1/products"
}
```

---

## 3. Authentication & Authorization Strategy

### 3.1 Authentication
- Bearer JWT token strategy via `Authorization: Bearer <access_token>` header.
- Dual-token architecture:
  - **Access Token:** Short-lived (15 minutes). Signed with `AUTH_SECRET`, contains `sub`, `email`, `role`, and optional `customerId`.
  - **Refresh Token:** Long-lived (7 days). Stored in secure `HttpOnly` cookie or dedicated exchange endpoint.

### 3.2 Authorization
- Enforced server-side using NestJS Guards:
  - `@UseGuards(JwtAuthGuard, RolesGuard)`
  - `@Roles('ADMIN')`, `@Roles('ADMIN', 'STAFF')`
- **Customer Ownership Guard (`CustomerOwnershipGuard`):**
  When a request is initiated by a user with `CUSTOMER` role, queries automatically inject `where: { customerId: user.customerId }`. Any attempt to access another customer's ID returns `403 Forbidden`.

---

## 4. Pagination, Sorting & Filtering Conventions

Collection endpoints support standardized query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max 100) |
| `sortBy` | string | `'createdAt'` | Field name to sort by |
| `sortOrder` | string | `'desc'` | `'asc'` or `'desc'` |
| `search` | string | `null` | Full-text substring search across primary string columns |
| `status` | string | `null` | Exact match filter on status enum |
| `fromDate` | ISO 8601 | `null` | Filter records on or after date |
| `toDate` | ISO 8601 | `null` | Filter records on or before date |

---

## 5. Domain Endpoint Catalog

### 5.1 Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register customer account |
| `POST` | `/auth/login` | Public | Authenticate user & issue tokens |
| `POST` | `/auth/refresh` | Public | Exchange refresh token for new access token |
| `POST` | `/auth/forgot-password` | Public | Trigger password reset email with expiring token |
| `POST` | `/auth/reset-password` | Public | Reset password using valid token |
| `GET` | `/auth/me` | Authenticated | Retrieve profile of currently authenticated user |
| `POST` | `/auth/logout` | Authenticated | Invalidate session / refresh token |

---

### 5.2 Staff & User Management (`/api/v1/staff`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/staff` | Admin | List all staff members with pagination & search |
| `POST` | `/staff` | Admin | Create a new staff account |
| `GET` | `/staff/:id` | Admin | Get detailed staff record |
| `PATCH` | `/staff/:id` | Admin | Update staff details or toggle active status |

---

### 5.3 Customer Management (`/api/v1/customers`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/customers` | Admin, Staff | List customers with search & pagination |
| `POST` | `/customers` | Admin, Staff | Create a customer profile |
| `GET` | `/customers/:id` | Admin, Staff | Retrieve customer profile and associated summary |
| `PATCH` | `/customers/:id` | Admin, Staff | Update customer profile and billing address |
| `GET` | `/customers/:id/subscriptions` | Admin, Staff | View all subscriptions for customer |
| `GET` | `/customers/:id/invoices` | Admin, Staff | View all invoices for customer |

---

### 5.4 Product & Variant Catalog (`/api/v1/products`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/products` | Authenticated | List catalog products with filtering |
| `POST` | `/products` | Admin | Create a product with pricing in minor units |
| `GET` | `/products/:id` | Authenticated | Get product details with variants and plans |
| `PATCH` | `/products/:id` | Admin | Update product details |
| `POST` | `/products/:id/variants` | Admin | Add variant with additional price |
| `PATCH` | `/products/:id/variants/:variantId` | Admin | Update variant pricing or status |

---

### 5.5 Plan Management (`/api/v1/plans`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/plans` | Authenticated | List all active plans |
| `POST` | `/plans` | Admin | Create subscription plan (frequency, pricing, rules) |
| `GET` | `/plans/:id` | Authenticated | Get plan details |
| `PATCH` | `/plans/:id` | Admin | Update plan rules or deactivate |

---

### 5.6 Taxes & Discounts (`/api/v1/taxes`, `/api/v1/discounts`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/taxes` | Admin, Staff | List configured tax rules |
| `POST` | `/taxes` | Admin | Create a tax rule (basis points) |
| `PATCH` | `/taxes/:id` | Admin | Update tax rule status |
| `GET` | `/discounts` | Admin, Staff | List discount rules with usage stats |
| `POST` | `/discounts` | Admin | Create fixed or percentage discount rule |
| `PATCH` | `/discounts/:id` | Admin | Update discount availability or limits |

---

### 5.7 Quotations (`/api/v1/quotations`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/quotations` | Admin, Staff | List quotations with status filter |
| `POST` | `/quotations` | Admin, Staff | Create quotation from template or direct lines |
| `GET` | `/quotations/:id` | Admin, Staff | Get quotation details and line items |
| `POST` | `/quotations/:id/convert` | Admin, Staff | Convert accepted quotation to active subscription |
| `GET` | `/quotation-templates` | Admin, Staff | List reusable quotation templates |
| `POST` | `/quotation-templates` | Admin, Staff | Create a reusable template |

---

### 5.8 Subscriptions (`/api/v1/subscriptions`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/subscriptions` | Admin, Staff | List subscriptions with filters |
| `POST` | `/subscriptions` | Admin, Staff | Directly create a subscription |
| `GET` | `/subscriptions/:id` | Admin, Staff | Get subscription details and billing history |
| `POST` | `/subscriptions/:id/confirm` | Admin, Staff | Confirm subscription |
| `POST` | `/subscriptions/:id/activate` | Admin, Staff | Activate confirmed subscription |
| `POST` | `/subscriptions/:id/pause` | Admin, Staff | Pause active subscription |
| `POST` | `/subscriptions/:id/resume` | Admin, Staff | Resume paused subscription |
| `POST` | `/subscriptions/:id/renew` | Admin, Staff | Renew subscription |
| `POST` | `/subscriptions/:id/close` | Admin, Staff | Early close or terminate subscription |

---

### 5.9 Invoices (`/api/v1/invoices`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/invoices` | Admin, Staff | List invoices with status & date filters |
| `GET` | `/invoices/:id` | Admin, Staff | Get invoice details, snapshots & payment history |
| `POST` | `/invoices/:id/confirm` | Admin, Staff | Confirm draft invoice |
| `POST` | `/invoices/:id/cancel` | Admin, Staff | Cancel invoice (subject to balance rules) |
| `GET` | `/invoices/:id/pdf` | Admin, Staff | Stream / download generated PDF invoice |
| `POST` | `/invoices/:id/send` | Admin, Staff | Resend invoice email notification |

---

### 5.10 Payments (`/api/v1/payments`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/payments` | Admin, Staff | List payment ledger records |
| `POST` | `/payments` | Admin, Staff | Record manual payment against invoice |
| `GET` | `/payments/:id` | Admin, Staff | Get payment receipt details |

---

### 5.11 Customer Self-Service Portal (`/api/v1/portal`)

*Enforces strict tenant isolation to the logged-in customer's ID.*

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/portal/me` | Customer | Customer profile and billing address |
| `PATCH` | `/portal/me` | Customer | Update contact phone / address |
| `GET` | `/portal/subscriptions` | Customer | List own subscriptions |
| `GET` | `/portal/subscriptions/:id` | Customer | View own subscription details |
| `GET` | `/portal/invoices` | Customer | List own invoices |
| `GET` | `/portal/invoices/:id` | Customer | View own invoice details |
| `GET` | `/portal/invoices/:id/pdf` | Customer | Download own invoice PDF |
| `GET` | `/portal/payments` | Customer | View own payment history |

---

### 5.12 Reporting & Dashboards (`/api/v1/reports`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/reports/overview` | Admin, Staff | Key metrics (Active subs, Total collected, Outstanding, Overdue) |
| `GET` | `/reports/revenue` | Admin, Staff | Revenue time series filtered by date range |
| `GET` | `/reports/overdue` | Admin, Staff | Overdue invoices aging report |

---

### 5.13 Health & Diagnostics (`/api/health`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | System liveness, PostgreSQL, and Redis connectivity status |
