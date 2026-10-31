import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountType } from '@prisma/client';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.discountRule.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCode(code: string) {
    const rule = await this.prisma.discountRule.findUnique({
      where: { code },
    });
    if (!rule || !rule.isActive) {
      throw new NotFoundException('Invalid or expired discount code');
    }
    return rule;
  }

  async create(data: {
    code: string;
    description?: string;
    discountType: DiscountType;
    value: number;
    minPurchaseAmount?: number;
    minQuantity?: number;
    maxUses?: number;
    productId?: string;
  }) {
    return this.prisma.discountRule.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        discountType: data.discountType,
        value: data.value,
        minPurchaseAmount: data.minPurchaseAmount ?? 0,
        minQuantity: data.minQuantity ?? 1,
        maxUses: data.maxUses,
        productId: data.productId,
      },
    });
  }

  async update(id: string, data: { isActive?: boolean; maxUses?: number; description?: string }) {
    return this.prisma.discountRule.update({ where: { id }, data });
  }
}
