import { test, expect } from '@playwright/test';

test.describe('System Status & Application Shell', () => {
  test('should load the status page and render main title', async ({
    page,
  }) => {
    await page.goto('/');

    // Check title presence
    await expect(page).toHaveTitle(/Subscription Management System/);

    // Check header branding
    const headerTitle = page.locator('text=Subscription Management System');
    await expect(headerTitle.first()).toBeVisible();

    // Check infrastructure cards
    await expect(page.locator('text=NestJS REST API')).toBeVisible();
    await expect(page.locator('text=BullMQ Worker')).toBeVisible();
    await expect(page.locator('text=PostgreSQL & Prisma')).toBeVisible();
  });
});
