import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingFrequency } from '@prisma/client';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            variants: true,
          },
        },
      },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        product: {
          include: { variants: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return plan;
  }

  async create(data: {
    productId: string;
    name: string;
    code: string;
    billingFrequency: BillingFrequency;
    price: number;
    minimumQuantity?: number;
    isAutoClose?: boolean;
    isPauseAllowed?: boolean;
    isRenewalAllowed?: boolean;
  }) {
    return this.prisma.plan.create({
      data: {
        productId: data.productId,
        name: data.name,
        code: data.code,
        billingFrequency: data.billingFrequency,
        price: data.price,
        minimumQuantity: data.minimumQuantity ?? 1,
        isAutoClose: data.isAutoClose ?? true,
        isPauseAllowed: data.isPauseAllowed ?? true,
        isRenewalAllowed: data.isRenewalAllowed ?? true,
      },
      include: { product: true },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      price?: number;
      minimumQuantity?: number;
      isAutoClose?: boolean;
      isPauseAllowed?: boolean;
      isRenewalAllowed?: boolean;
      isActive?: boolean;
    },
  ) {
    await this.findOne(id);
    return this.prisma.plan.update({
      where: { id },
      data,
      include: { product: true },
    });
  }
}
