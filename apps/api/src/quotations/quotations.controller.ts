import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';

@Controller('quotations')
@UseGuards(AuthGuard, RolesGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  async findAll(@Request() req: any) {
    const customerId =
      req.user.role === RoleName.CUSTOMER ? req.user.customerId : undefined;
    const quotes = await this.quotationsService.findAll(customerId);
    return { success: true, data: quotes };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const quote = await this.quotationsService.findOne(id);
    return { success: true, data: quote };
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async create(
    @Request() req: any,
    @Body()
    body: {
      customerId: string;
      validDays?: number;
      notes?: string;
      items: Array<{
        productId: string;
        planId?: string;
        quantity: number;
        taxRateBasisPoints?: number;
      }>;
    },
  ) {
    const quote = await this.quotationsService.create({
      ...body,
      createdByUserId: req.user.sub,
    });
    return {
      success: true,
      message: 'Quotation created successfully',
      data: quote,
    };
  }

  @Post(':id/convert')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async convert(@Param('id') id: string) {
    const sub = await this.quotationsService.convertToSubscription(id);
    return {
      success: true,
      message: 'Quotation successfully converted to active subscription',
      data: sub,
    };
  }
}
