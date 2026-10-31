import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  InvoiceStatus,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { customerId?: string; paymentStatus?: PaymentStatus }) {
    return this.prisma.invoice.findMany({
      where: {
        customerId: filters.customerId,
        paymentStatus: filters.paymentStatus,
      },
      include: {
        customer: { select: { companyName: true, contactName: true, email: true } },
        payments: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: { include: { plan: true } },
        items: true,
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async generateDueInvoices() {
    const now = new Date();

    // Select subscriptions due for billing
    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: { lte: now },
      },
      include: {
        customer: true,
        items: true,
        plan: true,
      },
    });

    const generatedInvoices: any[] = [];

    for (const sub of dueSubscriptions) {
      const periodStart = sub.nextBillingDate || now;
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Check for existing billing period to guarantee idempotency
      const existingPeriod = await this.prisma.billingPeriod.findUnique({
        where: {
          subscriptionId_periodStart_periodEnd: {
            subscriptionId: sub.id,
            periodStart,
            periodEnd,
          },
        },
      });

      if (existingPeriod) continue; // Already billed

      const invoiceCount = await this.prisma.invoice.count();
      const invoiceNumber = `INV-2026-${String(invoiceCount + 1).padStart(4, '0')}`;

      const dueDate = new Date(periodStart);
      dueDate.setDate(dueDate.getDate() + 15); // NET_15

      const result = await this.prisma.$transaction(async (tx) => {
        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId: sub.customerId,
            subscriptionId: sub.id,
            status: InvoiceStatus.CONFIRMED,
            paymentStatus: PaymentStatus.UNPAID,
            invoiceDate: periodStart,
            dueDate,
            subtotal: sub.subtotal,
            discountAmount: 0,
            taxAmount: sub.taxAmount,
            totalAmount: sub.totalAmount,
            paidAmount: 0,
            outstandingBalance: sub.totalAmount,
            customerNameSnapshot:
              sub.customer.companyName || sub.customer.contactName,
            billingAddressSnapshot: {
              address: sub.customer.billingAddressLine1,
              city: sub.customer.city,
              state: sub.customer.state,
              postalCode: sub.customer.postalCode,
              country: sub.customer.country,
            },
            items: {
              create: sub.items.map((item) => ({
                productId: item.productId,
                productVariantId: item.productVariantId,
                itemDescription: `${sub.plan.name} (${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()})`,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRateBasisPoints: item.taxRateBasisPoints,
                taxAmount: Math.round((item.lineTotal * item.taxRateBasisPoints) / 10000),
                lineTotal: item.lineTotal,
              })),
            },
          },
        });

        // Record billing period
        await tx.billingPeriod.create({
          data: {
            subscriptionId: sub.id,
            periodStart,
            periodEnd,
            invoiceId: invoice.id,
          },
        });

        // Advance subscription next billing date
        await tx.subscription.update({
          where: { id: sub.id },
          data: { nextBillingDate: periodEnd },
        });

        return invoice;
      });

      generatedInvoices.push(result);
    }

    return {
      processedCount: dueSubscriptions.length,
      generatedCount: generatedInvoices.length,
      invoices: generatedInvoices,
    };
  }

  async confirm(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be confirmed');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CONFIRMED },
    });
  }

  async cancel(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.paidAmount > 0) {
      throw new BadRequestException(
        'Cannot cancel invoice with recorded payments. Issue a refund or credit note.',
      );
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });
  }
}
