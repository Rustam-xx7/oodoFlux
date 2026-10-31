import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        variants: true,
        plans: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        plans: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(data: {
    name: string;
    sku: string;
    productType?: ProductType;
    salesPrice: number;
    costPrice: number;
    description?: string;
  }) {
    return this.prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        productType: data.productType || ProductType.SOFTWARE,
        salesPrice: data.salesPrice,
        costPrice: data.costPrice,
        description: data.description,
      },
      include: { variants: true, plans: true },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      salesPrice?: number;
      costPrice?: number;
      description?: string;
      isActive?: boolean;
    },
  ) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data,
      include: { variants: true, plans: true },
    });
  }

  async addVariant(
    productId: string,
    data: {
      name: string;
      additionalPrice: number;
      skuSuffix?: string;
    },
  ) {
    await this.findOne(productId);
    return this.prisma.productVariant.create({
      data: {
        productId,
        name: data.name,
        additionalPrice: data.additionalPrice,
        skuSuffix: data.skuSuffix,
      },
    });
  }
}
