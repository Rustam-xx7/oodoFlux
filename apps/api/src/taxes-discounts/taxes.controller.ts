import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';

@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get()
  async findAll() {
    const taxes = await this.taxesService.findAll();
    return { success: true, data: taxes };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  async create(
    @Body()
    body: {
      name: string;
      rateBasisPoints: number;
      description?: string;
    },
  ) {
    const tax = await this.taxesService.create(body);
    return { success: true, message: 'Tax rule created', data: tax };
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; rateBasisPoints?: number; isActive?: boolean },
  ) {
    const updated = await this.taxesService.update(id, body);
    return { success: true, message: 'Tax rule updated', data: updated };
  }
}
