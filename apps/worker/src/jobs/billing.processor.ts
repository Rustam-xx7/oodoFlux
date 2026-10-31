import { Job } from 'bullmq';
import { PrismaClient, SubscriptionStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function processRecurringBillingJob(job: Job) {
  console.log(`[BullMQ Worker] ⚙️ Processing Recurring Billing Job #${job.id}...`);

  const now = new Date();
  const dueSubscriptions = await prisma.subscription.findMany({
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

  console.log(
    `[BullMQ Worker] 📋 Found ${dueSubscriptions.length} subscriptions eligible for billing.`,
  );

  let billedCount = 0;

  for (const sub of dueSubscriptions) {
    const periodStart = sub.nextBillingDate || now;
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Enforce idempotency: check existing billing period
    const existing = await prisma.billingPeriod.findUnique({
      where: {
        subscriptionId_periodStart_periodEnd: {
          subscriptionId: sub.id,
          periodStart,
          periodEnd,
        },
      },
    });

    if (existing) continue;

    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-2026-${String(count + 1).padStart(4, '0')}`;

    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + 15);

    await prisma.$transaction(async (tx) => {
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
            country: sub.customer.country,
          },
          items: {
            create: sub.items.map((it) => ({
              productId: it.productId,
              productVariantId: it.productVariantId,
              itemDescription: `${sub.plan.name} Recurring Cycle`,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxRateBasisPoints: it.taxRateBasisPoints,
              taxAmount: Math.round((it.lineTotal * it.taxRateBasisPoints) / 10000),
              lineTotal: it.lineTotal,
            })),
          },
        },
      });

      await tx.billingPeriod.create({
        data: {
          subscriptionId: sub.id,
          periodStart,
          periodEnd,
          invoiceId: invoice.id,
        },
      });

      await tx.subscription.update({
        where: { id: sub.id },
        data: { nextBillingDate: periodEnd },
      });
    });

    billedCount++;
  }

  return {
    processed: true,
    totalDue: dueSubscriptions.length,
    invoicesCreated: billedCount,
    executedAt: new Date().toISOString(),
  };
}
