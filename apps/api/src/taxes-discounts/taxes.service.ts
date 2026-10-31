import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.taxRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    name: string;
    rateBasisPoints: number; // 1800 = 18.00%
    description?: string;
  }) {
    return this.prisma.taxRule.create({
      data: {
        name: data.name,
        rateBasisPoints: data.rateBasisPoints,
        description: data.description,
      },
    });
  }

  async update(id: string, data: { name?: string; rateBasisPoints?: number; isActive?: boolean }) {
    const existing = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tax rule not found');
    return this.prisma.taxRule.update({ where: { id }, data });
  }
}
