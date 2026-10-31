import { Injectable } from '@nestjs/common';
import { DiscountType } from '@prisma/client';

export interface PricingLineItem {
  quantity: number;
  unitPrice: number; // minor units (paise)
  variantAdditionalPrice?: number;
  taxRateBasisPoints?: number; // 1800 = 18.00%
}

export interface AppliedDiscountInput {
  discountType: DiscountType;
  value: number; // basis points (2000 = 20%) or minor units
}

export interface PricingCalculationResult {
  subtotal: number;
  discountAmount: number;
  netTaxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  lineItems: Array<{
    basePrice: number;
    unitPrice: number;
    quantity: number;
    discountAmount: number;
    taxRateBasisPoints: number;
    taxAmount: number;
    lineTotal: number;
  }>;
}

@Injectable()
export class PricingService {
  calculate(
    lines: PricingLineItem[],
    discount?: AppliedDiscountInput,
  ): PricingCalculationResult {
    let subtotal = 0;
    let totalLineDiscount = 0;
    let totalTax = 0;

    const calculatedLines = lines.map((line) => {
      const effectiveUnitPrice =
        line.unitPrice + (line.variantAdditionalPrice || 0);
      const lineBase = effectiveUnitPrice * line.quantity;
      subtotal += lineBase;

      // Line discount
      let lineDiscount = 0;
      if (discount) {
        if (discount.discountType === DiscountType.PERCENTAGE) {
          lineDiscount = Math.round((lineBase * discount.value) / 10000);
        } else if (discount.discountType === DiscountType.FIXED_AMOUNT) {
          lineDiscount = Math.min(discount.value, lineBase);
        }
      }
      totalLineDiscount += lineDiscount;

      const lineNet = Math.max(0, lineBase - lineDiscount);

      // Tax calculation on net amount
      const taxRate = line.taxRateBasisPoints || 0;
      const lineTax = Math.round((lineNet * taxRate) / 10000);
      totalTax += lineTax;

      const lineTotal = lineNet + lineTax;

      return {
        basePrice: effectiveUnitPrice,
        unitPrice: effectiveUnitPrice,
        quantity: line.quantity,
        discountAmount: lineDiscount,
        taxRateBasisPoints: taxRate,
        taxAmount: lineTax,
        lineTotal,
      };
    });

    const netTaxableAmount = Math.max(0, subtotal - totalLineDiscount);
    const totalAmount = netTaxableAmount + totalTax;

    return {
      subtotal,
      discountAmount: totalLineDiscount,
      netTaxableAmount,
      taxAmount: totalTax,
      totalAmount,
      lineItems: calculatedLines,
    };
  }
}
