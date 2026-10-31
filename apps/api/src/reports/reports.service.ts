import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();

    // 1. Active Subscriptions Count
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    // 2. Total Subscriptions
    const totalSubscriptions = await this.prisma.subscription.count();

    // 3. Total Revenue Received (sum of payments)
    const paymentAggregate = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { id: true },
    });
    const totalRevenueCollected = paymentAggregate._sum.amount || 0;

    // 4. Total Outstanding Receivables
    const invoiceAggregate = await this.prisma.invoice.aggregate({
      where: { status: InvoiceStatus.CONFIRMED },
      _sum: { outstandingBalance: true, totalAmount: true },
      _count: { id: true },
    });
    const totalOutstanding = invoiceAggregate._sum.outstandingBalance || 0;
    const totalInvoiced = invoiceAggregate._sum.totalAmount || 0;

    // 5. Overdue Invoices
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.CONFIRMED,
        dueDate: { lt: now },
        outstandingBalance: { gt: 0 },
      },
      include: {
        customer: { select: { companyName: true, contactName: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + inv.outstandingBalance,
      0,
    );

    // 6. Recent Subscriptions
    const recentSubscriptions = await this.prisma.subscription.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { companyName: true, contactName: true } },
        plan: { select: { name: true, billingFrequency: true } },
      },
    });

    // 7. Recent Invoices
    const recentInvoices = await this.prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { companyName: true, contactName: true } },
      },
    });

    return {
      kpis: {
        activeSubscriptions,
        totalSubscriptions,
        totalRevenueCollected, // paise
        totalOutstanding,      // paise
        totalInvoiced,         // paise
        overdueCount: overdueInvoices.length,
        overdueAmount,         // paise
      },
      overdueInvoices,
      recentSubscriptions,
      recentInvoices,
    };
  }
}
