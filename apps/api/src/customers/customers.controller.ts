import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';

@Controller('customers')
@UseGuards(AuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async findAll(@Query('search') search?: string) {
    const customers = await this.customersService.findAll(search);
    return { success: true, data: customers };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    // If customer role, only allow accessing their own customer ID
    if (req.user.role === RoleName.CUSTOMER && req.user.customerId !== id) {
      throw new ForbiddenException(
        'Access denied: You can only view your own customer profile.',
      );
    }
    const customer = await this.customersService.findOne(id);
    return { success: true, data: customer };
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async create(
    @Body()
    body: {
      companyName?: string;
      contactName: string;
      email: string;
      phone?: string;
      billingAddressLine1: string;
      billingAddressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      taxId?: string;
    },
  ) {
    const customer = await this.customersService.create(body);
    return {
      success: true,
      message: 'Customer onboarded successfully',
      data: customer,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    if (req.user.role === RoleName.CUSTOMER && req.user.customerId !== id) {
      throw new ForbiddenException('Access denied');
    }
    const updated = await this.customersService.update(id, body);
    return {
      success: true,
      message: 'Customer profile updated',
      data: updated,
    };
  }
}
