import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName, SubscriptionStatus } from '@prisma/client';

@Controller('subscriptions')
@UseGuards(AuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('status') status?: SubscriptionStatus,
  ) {
    const customerId =
      req.user.role === RoleName.CUSTOMER ? req.user.customerId : undefined;
    const subs = await this.subscriptionsService.findAll({ customerId, status });
    return { success: true, data: subs };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const sub = await this.subscriptionsService.findOne(id);
    if (
      req.user.role === RoleName.CUSTOMER &&
      sub.customerId !== req.user.customerId
    ) {
      throw new ForbiddenException(
        'Access denied: You do not own this subscription',
      );
    }
    return { success: true, data: sub };
  }

  @Post()
  async create(
    @Request() req: any,
    @Body()
    body: {
      customerId?: string;
      planId: string;
    },
  ) {
    // If customer, ensure customerId matches their own profile
    const targetCustomerId =
      req.user.role === RoleName.CUSTOMER
        ? req.user.customerId
        : body.customerId;

    if (!targetCustomerId) {
      throw new ForbiddenException('A valid customer account is required to subscribe');
    }

    const sub = await this.subscriptionsService.createDirect({
      customerId: targetCustomerId,
      planId: body.planId,
    });

    return {
      success: true,
      message: 'Subscription created successfully',
      data: sub,
    };
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string, @Request() req: any) {
    const sub = await this.subscriptionsService.findOne(id);
    if (
      req.user.role === RoleName.CUSTOMER &&
      sub.customerId !== req.user.customerId
    ) {
      throw new ForbiddenException('Access denied');
    }
    const updated = await this.subscriptionsService.pause(id);
    return { success: true, message: 'Subscription paused', data: updated };
  }

  @Post(':id/resume')
  async resume(@Param('id') id: string, @Request() req: any) {
    const sub = await this.subscriptionsService.findOne(id);
    if (
      req.user.role === RoleName.CUSTOMER &&
      sub.customerId !== req.user.customerId
    ) {
      throw new ForbiddenException('Access denied');
    }
    const updated = await this.subscriptionsService.resume(id);
    return { success: true, message: 'Subscription resumed', data: updated };
  }

  @Post(':id/renew')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async renew(@Param('id') id: string) {
    const updated = await this.subscriptionsService.renew(id);
    return { success: true, message: 'Subscription renewed', data: updated };
  }

  @Post(':id/close')
  async close(@Param('id') id: string, @Request() req: any) {
    const sub = await this.subscriptionsService.findOne(id);
    if (
      req.user.role === RoleName.CUSTOMER &&
      sub.customerId !== req.user.customerId
    ) {
      throw new ForbiddenException('Access denied');
    }
    const updated = await this.subscriptionsService.close(id);
    return { success: true, message: 'Subscription closed', data: updated };
  }
}
