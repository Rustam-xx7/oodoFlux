import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName, PaymentStatus } from '@prisma/client';

@Controller('invoices')
@UseGuards(AuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ) {
    const customerId =
      req.user.role === RoleName.CUSTOMER ? req.user.customerId : undefined;
    const invoices = await this.invoicesService.findAll({
      customerId,
      paymentStatus,
    });
    return { success: true, data: invoices };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const invoice = await this.invoicesService.findOne(id);
    if (
      req.user.role === RoleName.CUSTOMER &&
      invoice.customerId !== req.user.customerId
    ) {
      throw new ForbiddenException('Access denied: You do not own this invoice');
    }
    return { success: true, data: invoice };
  }

  // Admin / Staff trigger: Process recurring billing engine for due subscriptions
  @Post('generate-due')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async generateDue() {
    const result = await this.invoicesService.generateDueInvoices();
    return {
      success: true,
      message: `Recurring billing executed. Generated ${result.generatedCount} invoices.`,
      data: result,
    };
  }

  @Post(':id/confirm')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async confirm(@Param('id') id: string) {
    const updated = await this.invoicesService.confirm(id);
    return { success: true, message: 'Invoice confirmed', data: updated };
  }

  @Post(':id/cancel')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async cancel(@Param('id') id: string) {
    const updated = await this.invoicesService.cancel(id);
    return { success: true, message: 'Invoice cancelled', data: updated };
  }
}
