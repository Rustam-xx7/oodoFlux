import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { QuotationStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  async findAll(customerId?: string) {
    return this.prisma.quotation.findMany({
      where: customerId ? { customerId } : undefined,
      include: {
        customer: { select: { companyName: true, contactName: true, email: true } },
        items: { include: { product: true, plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true, plan: true } },
      },
    });

    if (!quote) throw new NotFoundException('Quotation not found');
    return quote;
  }

  async create(data: {
    customerId: string;
    createdByUserId: string;
    validDays?: number;
    notes?: string;
    items: Array<{
      productId: string;
      planId?: string;
      quantity: number;
      taxRateBasisPoints?: number;
    }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Quotation must contain at least one line item');
    }

    const count = await this.prisma.quotation.count();
    const quotationNumber = `QT-2026-${String(count + 1).padStart(4, '0')}`;

    // Load products and plans to snapshot agreed commercial values
    const pricingLines: any[] = [];
    const itemRecords: any[] = [];

    for (const item of data.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

      let unitPrice = product.salesPrice;
      if (item.planId) {
        const plan = await this.prisma.plan.findUnique({
          where: { id: item.planId },
        });
        if (plan) unitPrice = plan.price;
      }

      pricingLines.push({
        quantity: item.quantity,
        unitPrice,
        taxRateBasisPoints: item.taxRateBasisPoints || 1800,
      });

      itemRecords.push({
        productId: item.productId,
        planId: item.planId,
        itemDescription: product.name,
        quantity: item.quantity,
        unitPrice,
        taxRateBasisPoints: item.taxRateBasisPoints || 1800,
      });
    }

    const calculated = this.pricingService.calculate(pricingLines);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (data.validDays || 15));

    return this.prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: data.customerId,
        createdByUserId: data.createdByUserId,
        status: QuotationStatus.DRAFT,
        validUntil,
        subtotal: calculated.subtotal,
        discountAmount: calculated.discountAmount,
        taxAmount: calculated.taxAmount,
        totalAmount: calculated.totalAmount,
        notes: data.notes,
        items: {
          create: itemRecords.map((rec, i) => ({
            productId: rec.productId,
            planId: rec.planId,
            itemDescription: rec.itemDescription,
            quantity: rec.quantity,
            unitPrice: rec.unitPrice,
            taxRateBasisPoints: rec.taxRateBasisPoints,
            lineTotal: calculated.lineItems[i].lineTotal,
          })),
        },
      },
      include: { items: true, customer: true },
    });
  }

  async convertToSubscription(id: string) {
    const quote = await this.findOne(id);

    if (quote.status === QuotationStatus.CONVERTED) {
      throw new BadRequestException('Quotation has already been converted to a subscription');
    }

    const primaryPlanItem = quote.items.find((i) => i.planId);
    if (!primaryPlanItem || !primaryPlanItem.planId) {
      throw new BadRequestException('Quotation must contain at least one recurring Plan item to convert to a subscription');
    }

    const subCount = await this.prisma.subscription.count();
    const subscriptionNumber = `SUB-2026-${String(subCount + 1).padStart(4, '0')}`;

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark quote converted
      await tx.quotation.update({
        where: { id },
        data: { status: QuotationStatus.CONVERTED },
      });

      // 2. Create subscription
      const subscription = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: quote.customerId,
          planId: primaryPlanItem.planId!,
          quotationId: quote.id,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          expiryDate,
          anchorBillingDay: startDate.getDate(),
          nextBillingDate,
          paymentTerms: 'NET_15',
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          totalAmount: quote.totalAmount,
          items: {
            create: quote.items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxRateBasisPoints: it.taxRateBasisPoints,
              lineTotal: it.lineTotal,
            })),
          },
        },
        include: { items: true, plan: true },
      });

      return subscription;
    });
  }
}
