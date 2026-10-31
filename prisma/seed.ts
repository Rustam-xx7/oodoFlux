import { PrismaClient, RoleName, ProductType, BillingFrequency, DiscountType, QuotationStatus, SubscriptionStatus, InvoiceStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Subscription Management System...');

  // 1. Roles
  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: {
      name: RoleName.ADMIN,
      description: 'System Administrator with full governance rights',
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: RoleName.STAFF },
    update: {},
    create: {
      name: RoleName.STAFF,
      description: 'Operations staff managing customers, quotes, and billing',
    },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: RoleName.CUSTOMER },
    update: {},
    create: {
      name: RoleName.CUSTOMER,
      description: 'Customer user with access to self-service portal',
    },
  });

  // 2. Users
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@oodoflux.com' },
    update: {},
    create: {
      email: 'admin@oodoflux.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Vance',
      roleId: adminRole.id,
      phone: '+91 9876543210',
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@oodoflux.com' },
    update: {},
    create: {
      email: 'staff@oodoflux.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      roleId: staffRole.id,
      phone: '+91 9876543211',
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@acme.com' },
    update: {},
    create: {
      email: 'customer@acme.com',
      passwordHash,
      firstName: 'Bruce',
      lastName: 'Wayne',
      roleId: customerRole.id,
      phone: '+91 9876543212',
    },
  });

  // 3. Customer Profile
  const customerProfile = await prisma.customer.upsert({
    where: { customerNumber: 'CUST-2026-0001' },
    update: {},
    create: {
      customerNumber: 'CUST-2026-0001',
      userId: customerUser.id,
      companyName: 'Acme Enterprise Solutions',
      contactName: 'Bruce Wayne',
      email: 'customer@acme.com',
      phone: '+91 9876543212',
      billingAddressLine1: 'Wayne Tower, Suite 400, Financial District',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
      taxId: '27AABCU9603R1ZM',
    },
  });

  // 4. Products & Variants
  const productErp = await prisma.product.upsert({
    where: { sku: 'ERP-CORE-01' },
    update: {},
    create: {
      name: 'OodoFlux Enterprise ERP Core',
      sku: 'ERP-CORE-01',
      productType: ProductType.SOFTWARE,
      salesPrice: 999900, // ₹9,999.00
      costPrice: 400000,
      description: 'Comprehensive business management system including inventory, accounting, and supply chain.',
      variants: {
        create: [
          {
            name: 'Cloud Hosted Managed Infrastructure',
            additionalPrice: 250000, // +₹2,500.00
            skuSuffix: 'CLOUD',
          },
          {
            name: '24/7 Dedicated Enterprise SLA Support',
            additionalPrice: 500000, // +₹5,000.00
            skuSuffix: 'SLA247',
          },
        ],
      },
    },
  });

  const productCrm = await prisma.product.upsert({
    where: { sku: 'CRM-AUTO-01' },
    update: {},
    create: {
      name: 'Smart CRM & Sales Automation',
      sku: 'CRM-AUTO-01',
      productType: ProductType.SOFTWARE,
      salesPrice: 499900, // ₹4,999.00
      costPrice: 200000,
      description: 'Lead tracking, deal pipelines, customer interactions, and communication workflows.',
    },
  });

  const productBi = await prisma.product.upsert({
    where: { sku: 'BI-ANALYTICS-01' },
    update: {},
    create: {
      name: 'Executive Analytics & BI Dashboard',
      sku: 'BI-ANALYTICS-01',
      productType: ProductType.SERVICE,
      salesPrice: 299900, // ₹2,999.00
      costPrice: 100000,
      description: 'Real-time financial charts, MRR/ARR tracking, and automated forecasting.',
    },
  });

  // 5. Subscription Plans
  const starterPlan = await prisma.plan.upsert({
    where: { code: 'PLAN-STARTER-MO' },
    update: {},
    create: {
      productId: productErp.id,
      name: 'Starter Business Monthly',
      code: 'PLAN-STARTER-MO',
      billingFrequency: BillingFrequency.MONTHLY,
      price: 199900, // ₹1,999.00 / mo
      minimumQuantity: 1,
      isAutoClose: false,
      isPauseAllowed: true,
      isRenewalAllowed: true,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { code: 'PLAN-PRO-MO' },
    update: {},
    create: {
      productId: productErp.id,
      name: 'Professional Scale Monthly',
      code: 'PLAN-PRO-MO',
      billingFrequency: BillingFrequency.MONTHLY,
      price: 499900, // ₹4,999.00 / mo
      minimumQuantity: 1,
      isAutoClose: false,
      isPauseAllowed: true,
      isRenewalAllowed: true,
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { code: 'PLAN-ENT-YR' },
    update: {},
    create: {
      productId: productErp.id,
      name: 'Enterprise Unlimited Annual',
      code: 'PLAN-ENT-YR',
      billingFrequency: BillingFrequency.YEARLY,
      price: 4999900, // ₹49,999.00 / yr
      minimumQuantity: 1,
      isAutoClose: true,
      isPauseAllowed: true,
      isRenewalAllowed: true,
    },
  });

  // 6. Taxes & Discounts
  await prisma.taxRule.createMany({
    data: [
      { name: 'GST Standard 18%', rateBasisPoints: 1800, description: 'Standard Goods & Services Tax' },
      { name: 'VAT Reduced 5%', rateBasisPoints: 500, description: 'Reduced Value Added Tax' },
    ],
    skipDuplicates: true,
  });

  await prisma.discountRule.upsert({
    where: { code: 'LAUNCH20' },
    update: {},
    create: {
      code: 'LAUNCH20',
      description: 'Special 20% discount on first-time subscription orders',
      discountType: DiscountType.PERCENTAGE,
      value: 2000, // 20.00%
      minPurchaseAmount: 100000,
      maxUses: 100,
      currentUses: 1,
    },
  });

  // 7. Active Subscription for Acme
  const sampleSubscription = await prisma.subscription.upsert({
    where: { subscriptionNumber: 'SUB-2026-0001' },
    update: {},
    create: {
      subscriptionNumber: 'SUB-2026-0001',
      customerId: customerProfile.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
      anchorBillingDay: 1,
      nextBillingDate: new Date('2026-11-01'),
      paymentTerms: 'NET_15',
      subtotal: 499900,
      taxAmount: 89982,
      totalAmount: 589882,
      items: {
        create: [
          {
            productId: productErp.id,
            quantity: 1,
            unitPrice: 499900,
            taxRateBasisPoints: 1800,
            lineTotal: 589882,
          },
        ],
      },
    },
  });

  // 8. Sample Confirmed Invoice with Partial Payment
  const sampleInvoice = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-0001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-0001',
      customerId: customerProfile.id,
      subscriptionId: sampleSubscription.id,
      status: InvoiceStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      invoiceDate: new Date('2026-10-01'),
      dueDate: new Date('2026-10-15'),
      subtotal: 499900,
      discountAmount: 0,
      taxAmount: 89982,
      totalAmount: 589882,
      paidAmount: 300000, // ₹3,000.00 paid
      outstandingBalance: 289882, // ₹2,898.82 remaining
      customerNameSnapshot: 'Acme Enterprise Solutions',
      billingAddressSnapshot: {
        address: 'Wayne Tower, Suite 400',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
      items: {
        create: [
          {
            itemDescription: 'Professional Scale Monthly Subscription (Oct 2026)',
            quantity: 1,
            unitPrice: 499900,
            taxRateBasisPoints: 1800,
            taxAmount: 89982,
            lineTotal: 589882,
          },
        ],
      },
    },
  });

  // 9. Payment Record
  await prisma.payment.upsert({
    where: { paymentNumber: 'PAY-2026-0001' },
    update: {},
    create: {
      paymentNumber: 'PAY-2026-0001',
      invoiceId: sampleInvoice.id,
      amount: 300000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentDate: new Date('2026-10-05'),
      referenceNote: 'NEFT Transfer Ref: HDFC92847192',
      recordedByUserId: staffUser.id,
    },
  });

  console.log('✅ Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
