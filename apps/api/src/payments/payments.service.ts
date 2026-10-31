import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId?: string) {
    return this.prisma.payment.findMany({
      where: customerId
        ? {
            invoice: { customerId },
          }
        : undefined,
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            totalAmount: true,
            customer: { select: { companyName: true, contactName: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async recordPayment(data: {
    invoiceId: string;
    amount: number; // minor units (paise)
    paymentMethod: PaymentMethod;
    paymentDate?: Date;
    referenceNote?: string;
    recordedByUserId?: string;
  }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.outstandingBalance <= 0) {
      throw new BadRequestException('Invoice is already fully settled');
    }

    if (data.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (data.amount > invoice.outstandingBalance) {
      throw new BadRequestException(
        `Payment amount (₹${data.amount / 100}) exceeds outstanding balance (₹${invoice.outstandingBalance / 100})`,
      );
    }

    const count = await this.prisma.payment.count();
    const paymentNumber = `PAY-2026-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: data.invoiceId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate || new Date(),
          referenceNote: data.referenceNote,
          recordedByUserId: data.recordedByUserId,
        },
      });

      // 2. Calculate new balance
      const newPaidAmount = invoice.paidAmount + data.amount;
      const newOutstanding = Math.max(0, invoice.totalAmount - newPaidAmount);

      let newStatus: PaymentStatus = PaymentStatus.PARTIALLY_PAID;
      if (newOutstanding === 0) {
        newStatus = PaymentStatus.PAID;
      }

      // 3. Update Invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          outstandingBalance: newOutstanding,
          paymentStatus: newStatus,
        },
      });

      return { payment, invoice: updatedInvoice };
    });
  }
}
