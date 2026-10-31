import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { contactName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { customerNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        subscriptions: { select: { id: true, subscriptionNumber: true, status: true } },
        invoices: { select: { id: true, invoiceNumber: true, status: true, paymentStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
        },
        invoices: {
          include: { payments: true },
        },
        quotations: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async create(data: {
    companyName?: string;
    contactName: string;
    email: string;
    phone?: string;
    billingAddressLine1: string;
    billingAddressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    taxId?: string;
  }) {
    const count = await this.prisma.customer.count();
    const customerNumber = `CUST-2026-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.customer.create({
      data: {
        customerNumber,
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        billingAddressLine1: data.billingAddressLine1,
        billingAddressLine2: data.billingAddressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country || 'India',
        taxId: data.taxId,
      },
    });
  }

  async update(
    id: string,
    data: {
      companyName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      billingAddressLine1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      taxId?: string;
      isActive?: boolean;
    },
  ) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }
}
