import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName, DiscountType } from '@prisma/client';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  async findAll() {
    const discounts = await this.discountsService.findAll();
    return { success: true, data: discounts };
  }

  @Get(':code')
  async findByCode(@Param('code') code: string) {
    const discount = await this.discountsService.findByCode(code);
    return { success: true, data: discount };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  async create(
    @Body()
    body: {
      code: string;
      description?: string;
      discountType: DiscountType;
      value: number;
      minPurchaseAmount?: number;
      minQuantity?: number;
      maxUses?: number;
      productId?: string;
    },
  ) {
    const discount = await this.discountsService.create(body);
    return {
      success: true,
      message: 'Discount rule created',
      data: discount,
    };
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() body: { isActive?: boolean; maxUses?: number; description?: string },
  ) {
    const updated = await this.discountsService.update(id, body);
    return { success: true, message: 'Discount rule updated', data: updated };
  }
}
