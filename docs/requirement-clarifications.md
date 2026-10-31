# Requirement Clarifications & Specification Gap Analysis

This document analyzes the requirements for the **Subscription Management System (SMS)** based on the project specification (`README_Subscription_Management_System.md`).

To preserve software architecture integrity, this document explicitly separates:
1. **Requirements explicitly stated in the project brief**
2. **Recommended implementation decisions** (architectural and technical best practices)
3. **Decisions that require confirmation / stakeholder input**

---

## 1. Subscription Pause and Resume Behavior

### Explicitly Stated Requirements
- Plans define whether pausing is permitted (`is_pause_allowed: boolean`).
- Subscriptions can be paused if permitted by the associated plan.
- The subscription lifecycle specifies states: `Draft → Quotation → Confirmed → Active → Closed`.

### Recommended Implementation Decisions
- **State Representation:** Add a distinct state `PAUSED` to the subscription lifecycle enum:
  $$\text{DRAFT} \to \text{QUOTATION} \to \text{CONFIRMED} \to \text{ACTIVE} \underset{\text{Resume}}{\overset{\text{Pause}}{\rightleftharpoons}} \text{PAUSED} \to \text{CLOSED}$$
- **Billing Behavior During Pause:** While in `PAUSED` state, the subscription is excluded from recurring billing queries. No invoices will be generated for billing cycles falling completely within the paused duration.
- **Audit Tracking:** Record pause events in a `subscription_pause_intervals` or audit log table with `paused_at`, `resumed_at`, and `reason`.

### Decisions Requiring Confirmation
- **Expiry Extension Policy:**
  - *Option A (Default Recommended):* Resuming extends the subscription `expiry_date` by the exact number of days the subscription was paused ($T_{\text{new\_expiry}} = T_{\text{orig\_expiry}} + \Delta_{\text{paused}}$).
  - *Option B (Fixed End-Date):* The `expiry_date` remains rigid; the customer simply forfeits or avoids paying for the paused period.
- **Mid-Cycle Pause & Billing Proration:** If a subscription billed monthly is paused mid-month, should the upcoming bill be prorated, or does pausing only take effect at the end of the current paid billing cycle?
  - *Recommendation:* Pausing takes effect immediately, and resume recalculates the next billing date by advancing it by the paused duration.

---

## 2. Subscription Renewal Rules

### Explicitly Stated Requirements
- Plans define whether renewal is permitted (`is_renewal_allowed: boolean`).
- Subscriptions can be renewed if permitted by the plan.

### Recommended Implementation Decisions
- **Renewal Eligibility:** A subscription can be renewed only if:
  1. Its associated plan has `is_renewal_allowed = true`.
  2. The subscription is currently `ACTIVE` or within a configurable grace period after expiry (e.g., 7 days).
  3. The subscription is not `CLOSED`.
- **Renewal Mechanics:**
  - Renewal advances the `expiry_date` by the plan's duration (e.g. +1 year or +1 month from current `expiry_date`).
  - The commercial terms (unit price, products, discount rules) snapshot from the current subscription or re-evaluated based on active catalog rates depending on configuration.
  - A new billing cycle schedule continues seamlessly from the existing `next_billing_date`.

### Decisions Requiring Confirmation
- **Auto-Renewal vs. Manual Renewal:** Should renewals be automatic upon payment of the renewal invoice, or must an Admin/Staff/Customer trigger an explicit renewal action?
  - *Recommendation:* Default to manual renewal with an optional auto-renew flag configured on the subscription.

---

## 3. Monthly Billing Date Calculations & Edge Cases

### Explicitly Stated Requirements
- System must support `Daily`, `Weekly`, `Monthly`, and `Yearly` billing frequencies.
- High reliability: Idempotent billing with zero duplicate invoices.

### Recommended Implementation Decisions
- **Anchor Day of the Month (DOM):** Store an `anchor_billing_day: integer (1-31)` derived from the subscription `start_date`.
- **Month-End Rule (Clamping Strategy):**
  - If `anchor_billing_day` is 31 and the target month has 30 days (e.g., April, June, September, November), the next billing date is clamped to the last day of that month (April 30).
  - For February:
    - Non-leap year: Clamped to February 28.
    - Leap year: Clamped to February 29.
  - For subsequent 31-day months (e.g., March or May), the billing date restores to the original `anchor_billing_day` (31st), rather than remaining stuck at 28 or 30.
- **Timezone Standardization:** All billing timestamps and cron triggers run strictly in UTC (`00:00:00 UTC`), with billing dates stored as ISO 8601 UTC dates.

### Decisions Requiring Confirmation
- Confirm if the organization operates in a specific domestic timezone (e.g., `Asia/Kolkata` IST / UTC+05:30) where billing jobs should fire at local midnight rather than UTC midnight.
  - *Recommendation:* Store UTC in the database; schedule BullMQ cron at `18:30 UTC` (which corresponds to `00:00 IST`).

---

## 4. Invoice Cancellation Rules

### Explicitly Stated Requirements
- Invoices support lifecycle: `Draft → Confirmed → Paid`.
- Invoices can be cancelled according to defined rules.

### Recommended Implementation Decisions
- **Cancellation Boundaries:**
  - `DRAFT` invoices can be cancelled directly by authorized Admin/Staff without financial impact.
  - `CONFIRMED` invoices can only be cancelled if:
    1. Zero payments have been recorded against them (`paid_amount == 0`).
    2. Cancellation reason is supplied and logged in the audit trail.
  - Invoices with recorded payments (`PARTIALLY_PAID` or `PAID`) **CANNOT** be cancelled directly. To preserve accounting integrity, payments must first be refunded/reversed or a Credit Note must be issued.
- **Effect on Billing Period:** Cancelling an invoice releases or marks the associated `billing_period` as `CANCELLED`, allowing an admin to regenerate the billing if appropriate.

### Decisions Requiring Confirmation
- Does invoice cancellation require a formal Credit Note generation for tax/statutory compliance, or is marking status as `CANCELLED` sufficient for Phase 5?
  - *Recommendation:* Status marking as `CANCELLED` for initial release, with Credit Notes deferred to future accounting extensions.

---

## 5. Partial Payments & Settlement Tracking

### Explicitly Stated Requirements
- Payments are recorded against invoices (amount, payment method, date, reference/note).
- System must calculate amount paid, outstanding balance, and identify fully paid, partially paid, and overdue invoices.

### Recommended Implementation Decisions
- **Decoupled Settlement Status:**
  Maintain two distinct status fields on each invoice:
  - `status: InvoiceLifecycleStatus` (`DRAFT`, `CONFIRMED`, `CANCELLED`)
  - `payment_status: InvoicePaymentStatus` (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`)
- **Balance Calculation:**
  $$\text{outstanding\_balance} = \text{total\_amount} - \text{paid\_amount}$$
  - $\text{paid\_amount} == 0 \implies \text{UNPAID}$ (or $\text{OVERDUE}$ if current date $>$ due date)
  - $0 < \text{paid\_amount} < \text{total\_amount} \implies \text{PARTIALLY\_PAID}$
  - $\text{paid\_amount} \ge \text{total\_amount} \implies \text{PAID}$
- **Transaction Safety:** Each recorded payment creates a record in `payments`, and an atomic database transaction recalculates and updates `paid_amount` and `payment_status` on the parent invoice. Overpayments are rejected by default.

### Decisions Requiring Confirmation
- Should overpayments (payment amount $>$ outstanding balance) be rejected with an error, or allowed and recorded as customer credit?
  - *Recommendation:* Reject overpayments with a validation error (`400 Bad Request: Payment exceeds outstanding balance`).

---

## 6. Discount & Tax Calculation Order

### Explicitly Stated Requirements
- Fixed-amount and percentage discounts.
- Tax rules with configured rates applied to product lines or invoice totals.
- Calculations must avoid floating-point errors.

### Recommended Implementation Decisions
- **Monetary Storage:** All monetary figures are stored as integer minor units (paise in INR, cents in USD). For example, ₹999.00 is stored as `99900`.
- **Standardized Calculation Sequence:**
  1. **Line Base Amount:**
     $$\text{LineBase} = \text{Quantity} \times \text{Unit Price}$$
  2. **Line Discount Application:**
     - Percentage: $\text{DiscountAmount} = \text{round}\left(\frac{\text{LineBase} \times \text{DiscountPercent}}{100}\right)$
     - Fixed: $\text{DiscountAmount} = \min(\text{FixedDiscount}, \text{LineBase})$
     - Line Net Amount: $\text{LineNet} = \text{LineBase} - \text{DiscountAmount}$
  3. **Line Tax Application:**
     - $\text{TaxAmount} = \text{round}\left(\frac{\text{LineNet} \times \text{TaxRatePercent}}{100}\right)$
  4. **Invoice Subtotal & Totals:**
     - $\text{Subtotal} = \sum \text{LineBase}$
     - $\text{TotalDiscount} = \sum \text{DiscountAmount} + \text{SubscriptionDiscount}$
     - $\text{TotalTax} = \sum \text{TaxAmount}$
     - $\text{TotalAmount} = \text{Subtotal} - \text{TotalDiscount} + \text{TotalTax}$
- **Snapshot Immutability:** When an invoice is created, the unit price, variant add-ons, applied discount rules, and tax percentages are saved as immutable snapshot fields on `invoice_items`. Changing tax or discount rules later has zero impact on historical invoices.

### Decisions Requiring Confirmation
- Are taxes calculated on the discounted net amount (standard commercial practice) or on the gross base amount?
  - *Recommendation:* Calculate taxes on the net amount after eligible discounts are deducted.

---

## 7. Customer Self-Service Permissions

### Explicitly Stated Requirements
- Customer role has access to a self-service portal to view own profile, subscriptions, invoices, and payments.
- Strict data isolation.

### Recommended Implementation Decisions
- **Read-Only by Default:** Customer can view and download invoices (PDF), inspect subscription status, and view payment history.
- **Allowed Self-Service Mutations:**
  - Update personal contact profile and notification preferences.
  - Accept or decline draft quotations addressed directly to them.
  - Request subscription cancellation or pause (subject to plan rules).
- **Prohibited Customer Actions:** Customers cannot create staff accounts, edit product catalog, configure tax/discount rules, alter pricing, confirm invoices, or manually record payments.

### Decisions Requiring Confirmation
- Can customers directly execute a subscription Pause or Cancellation from the portal, or does it generate a request for Staff approval?
  - *Recommendation:* Allow direct cancellation/pause only if the subscription's plan explicitly allows it (`is_pause_allowed = true`, `is_early_close_allowed = true`).

---

## 8. Staff Permission Boundaries

### Explicitly Stated Requirements
- Admin has full platform control.
- Staff handles day-to-day operations as permitted.
- Staff cannot create other staff accounts.

### Recommended Implementation Decisions
- **Staff Default Capabilities:**
  - Can create and update customer records.
  - Can create quotations from templates and convert them to subscriptions.
  - Can view products, plans, and catalog items.
  - Can record manual payments against invoices.
  - Can pause, resume, or close subscriptions.
- **Staff Restrictions:**
  - Cannot create, update, or deactivate Staff/Admin user accounts.
  - Cannot alter global Tax Rules or Discount Rules.
  - Cannot alter core billing engine configuration or purge audit logs.

### Decisions Requiring Confirmation
- Should staff permissions be hardcoded by role (`Staff`), or dynamic via an RBAC `permissions` table?
  - *Recommendation:* Implement a foundational `permissions` junction table linked to `roles` to allow granular toggles in future phases while defaulting to standard Staff role guards.

---

## 9. Payment Gateway Scope

### Explicitly Stated Requirements
- Phase 6 requires manual payment recording against invoices.
- Payment gateways (such as Razorpay) are identified as optional extensions.

### Recommended Implementation Decisions
- **Phase 6 Scope:** Focus on manual payment recording: payment method (`CASH`, `BANK_TRANSFER`, `CHEQUE`, `CREDIT_CARD_MANUAL`, `OTHER`), reference/UTR number, payment date, and staff notes.
- **Extensible Architecture:** The `Payment` entity includes nullable fields `gateway_provider`, `gateway_transaction_id`, and `gateway_order_id`, ensuring that integrating Razorpay or Stripe in Phase 8 or post-release requires zero schema alterations.

---

## Summary Matrix

| Area | Stated in Brief | Recommended Default | Needs Confirmation |
|---|---|---|---|
| Subscription Pause | Plan flag `is_pause_allowed` | `PAUSED` state; extends expiry date | Expiry extension vs. fixed expiry |
| Billing on Pause | Plan rules govern pause | Exclude from recurring billing | Mid-cycle proration policy |
| Billing Anchor Day | Daily, Weekly, Monthly, Yearly | Clamping (31st $\to$ 28/29/30th) | Operating timezone (UTC vs IST) |
| Invoice Cancellation | Rules must govern cancellation | Allowed only if uncollected | Credit note requirement |
| Partial Payments | Record payments; calculate balances | Multi-status (`UNPAID`, `PARTIAL`, `PAID`) | Overpayment credit handling |
| Tax/Discount Order | Calculate automatically | Base $\to$ Discount $\to$ Tax on Net | Tax on gross vs. tax on net |
| Customer Actions | View own subscriptions & invoices | Read-only + Quote acceptance | Direct portal pause/cancellation |
| Payment Gateway | Manual payment recording | Schema ready for Razorpay/Stripe | Immediate vs. post-core release |
