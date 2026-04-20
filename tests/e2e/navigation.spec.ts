import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('/ loads GuestPage with step indicator', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.step-indicator')).toBeVisible();
  });

  test('/owner loads OwnerPage with title', async ({ page }) => {
    await page.goto('/owner');
    await expect(page.locator('.page-title')).toContainText('Панель владельца');
  });

  test('"Владелец" nav link navigates to /owner', async ({ page }) => {
    await page.goto('/');
    await page.click('a.nav-link:has-text("Владелец")');
    await expect(page).toHaveURL(/\/owner/);
    await expect(page.locator('.page-title')).toContainText('Панель владельца');
  });

  test('"Гость" nav link navigates to /', async ({ page }) => {
    await page.goto('/owner');
    await page.click('a.nav-link:has-text("Гость")');
    await expect(page).toHaveURL(/^http:\/\/localhost:5173\/?$/);
    await expect(page.locator('.step-indicator')).toBeVisible();
  });

  test('active nav link has "active" class', async ({ page }) => {
    await page.goto('/owner');
    const ownerLink = page.locator('a.nav-link:has-text("Владелец")');
    await expect(ownerLink).toHaveClass(/active/);

    const guestLink = page.locator('a.nav-link:has-text("Гость")');
    await expect(guestLink).not.toHaveClass(/active/);
  });

  test('nav brand is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-brand')).toContainText('Запись на звонок');
  });
});
