import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { PricingModule } from './pricing/pricing.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { CatalogModule } from './catalog/catalog.module';
import { TaxesDiscountsModule } from './taxes-discounts/taxes-discounts.module';
import { QuotationsModule } from './quotations/quotations.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    PricingModule,
    HealthModule,
    AuthModule,
    CustomersModule,
    CatalogModule,
    TaxesDiscountsModule,
    QuotationsModule,
    SubscriptionsModule,
    InvoicesModule,
    PaymentsModule,
    ReportsModule,
  ],
})
export class AppModule {}
