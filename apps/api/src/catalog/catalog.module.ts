import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController, PlansController],
  providers: [ProductsService, PlansService],
  exports: [ProductsService, PlansService],
})
export class CatalogModule {}
