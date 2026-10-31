import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName, BillingFrequency } from '@prisma/client';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // Public/Client accessible: View all available subscription plans & models
  @Get()
  async findAll() {
    const plans = await this.plansService.findAll();
    return { success: true, data: plans };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const plan = await this.plansService.findOne(id);
    return { success: true, data: plan };
  }

  // Admin only: Create new subscription plan
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  async create(
    @Body()
    body: {
      productId: string;
      name: string;
      code: string;
      billingFrequency: BillingFrequency;
      price: number;
      minimumQuantity?: number;
      isAutoClose?: boolean;
      isPauseAllowed?: boolean;
      isRenewalAllowed?: boolean;
    },
  ) {
    const plan = await this.plansService.create(body);
    return {
      success: true,
      message: 'Plan created successfully',
      data: plan,
    };
  }

  // Admin only: Update plan rules & prices
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      price?: number;
      minimumQuantity?: number;
      isAutoClose?: boolean;
      isPauseAllowed?: boolean;
      isRenewalAllowed?: boolean;
      isActive?: boolean;
    },
  ) {
    const updated = await this.plansService.update(id, body);
    return {
      success: true,
      message: 'Plan updated successfully',
      data: updated,
    };
  }
}
