import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  async findAll(filters: { customerId?: string; status?: SubscriptionStatus }) {
    return this.prisma.subscription.findMany({
      where: {
        customerId: filters.customerId,
        status: filters.status,
      },
      include: {
        customer: { select: { companyName: true, contactName: true, email: true } },
        plan: { select: { name: true, billingFrequency: true, price: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: { include: { product: true } },
        items: { include: { product: true, productVariant: true } },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
        billingPeriods: true,
      },
    });

    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async createDirect(data: {
    customerId: string;
    planId: string;
    items?: Array<{
      productId: string;
      productVariantId?: string;
      quantity: number;
    }>;
  }) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: data.planId },
      include: { product: { include: { variants: true } } },
    });
    if (!plan || !plan.isActive) {
      throw new BadRequestException('Selected plan is not active or available');
    }

    const count = await this.prisma.subscription.count();
    const subscriptionNumber = `SUB-2026-${String(count + 1).padStart(4, '0')}`;

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const lines = [
      {
        quantity: 1,
        unitPrice: plan.price,
        taxRateBasisPoints: 1800,
      },
    ];

    const calculated = this.pricingService.calculate(lines);

    return this.prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId: data.customerId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        expiryDate,
        anchorBillingDay: startDate.getDate(),
        nextBillingDate,
        subtotal: calculated.subtotal,
        taxAmount: calculated.taxAmount,
        totalAmount: calculated.totalAmount,
        items: {
          create: [
            {
              productId: plan.productId,
              quantity: 1,
              unitPrice: plan.price,
              taxRateBasisPoints: 1800,
              lineTotal: calculated.totalAmount,
            },
          ],
        },
      },
      include: { plan: true, items: true, customer: true },
    });
  }

  async pause(id: string) {
    const sub = await this.findOne(id);
    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be paused');
    }
    if (!sub.plan.isPauseAllowed) {
      throw new BadRequestException('Plan policy does not permit pausing this subscription');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.PAUSED },
    });
  }

  async resume(id: string) {
    const sub = await this.findOne(id);
    if (sub.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Subscription is not paused');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  }

  async renew(id: string) {
    const sub = await this.findOne(id);
    if (!sub.plan.isRenewalAllowed) {
      throw new BadRequestException('Plan policy does not permit renewal');
    }

    const currentExpiry = new Date(sub.expiryDate);
    currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);

    return this.prisma.subscription.update({
      where: { id },
      data: {
        expiryDate: currentExpiry,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  async close(id: string) {
    const sub = await this.findOne(id);
    if (sub.status === SubscriptionStatus.CLOSED) {
      throw new BadRequestException('Subscription is already closed');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CLOSED, nextBillingDate: null },
    });
  }
}
