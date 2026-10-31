/**
 * Core Enums and Types for Subscription Management System
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export enum SubscriptionStatus {
  DRAFT = 'DRAFT',
  QUOTATION = 'QUOTATION',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum BillingFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  CREDIT_CARD_MANUAL = 'CREDIT_CARD_MANUAL',
  ONLINE = 'ONLINE',
}

/**
 * Standard API Response Structures
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  error?: string;
  details?: unknown[];
  timestamp?: string;
  path?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Monetary Helper Utilities (Integer Minor Units / Paise)
 */
export class MoneyUtil {
  /**
   * Converts major currency (e.g. Rupees: 99.50) to minor units (Paise: 9950)
   */
  static toMinorUnits(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Converts minor units (Paise: 9950) to major currency string (e.g. "99.50")
   */
  static toMajorUnits(minorUnits: number): number {
    return minorUnits / 100;
  }

  /**
   * Formats minor units into localized INR currency string (e.g. "₹99.50")
   */
  static formatINR(minorUnits: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(minorUnits / 100);
  }
}
