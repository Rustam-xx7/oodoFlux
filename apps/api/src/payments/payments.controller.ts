import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName, PaymentMethod } from '@prisma/client';

@Controller('payments')
@UseGuards(AuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async findAll(@Request() req: any) {
    const customerId =
      req.user.role === RoleName.CUSTOMER ? req.user.customerId : undefined;
    const payments = await this.paymentsService.findAll(customerId);
    return { success: true, data: payments };
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async recordPayment(
    @Request() req: any,
    @Body()
    body: {
      invoiceId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      paymentDate?: string;
      referenceNote?: string;
    },
  ) {
    const result = await this.paymentsService.recordPayment({
      invoiceId: body.invoiceId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
      referenceNote: body.referenceNote,
      recordedByUserId: req.user.sub,
    });

    return {
      success: true,
      message: 'Payment recorded and invoice balance updated successfully',
      data: result,
    };
  }
}
