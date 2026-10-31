import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName, ProductType } from '@prisma/client';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Public/Client accessible: View product models and options
  @Get()
  async findAll() {
    const products = await this.productsService.findAll();
    return { success: true, data: products };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return { success: true, data: product };
  }

  // Admin only: Create base product
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  async create(
    @Body()
    body: {
      name: string;
      sku: string;
      productType?: ProductType;
      salesPrice: number;
      costPrice: number;
      description?: string;
    },
  ) {
    const product = await this.productsService.create(body);
    return {
      success: true,
      message: 'Product created successfully',
      data: product,
    };
  }

  // Admin only: Update product
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      salesPrice?: number;
      costPrice?: number;
      description?: string;
      isActive?: boolean;
    },
  ) {
    const updated = await this.productsService.update(id, body);
    return {
      success: true,
      message: 'Product updated successfully',
      data: updated,
    };
  }

  // Admin only: Add variant
  @Post(':id/variants')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  async addVariant(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      additionalPrice: number;
      skuSuffix?: string;
    },
  ) {
    const variant = await this.productsService.addVariant(id, body);
    return {
      success: true,
      message: 'Variant created successfully',
      data: variant,
    };
  }
}
