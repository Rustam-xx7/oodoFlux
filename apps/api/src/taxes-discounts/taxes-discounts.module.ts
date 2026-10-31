import { Module } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { TaxesController } from './taxes.controller';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TaxesController, DiscountsController],
  providers: [TaxesService, DiscountsService],
  exports: [TaxesService, DiscountsService],
})
export class TaxesDiscountsModule {}
