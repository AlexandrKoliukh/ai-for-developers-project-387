import { test, expect } from '@playwright/test';

test.describe('Guest Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Step 1: event type cards are visible', async ({ page }) => {
    // Step indicator shows 3 items
    await expect(page.locator('.step-indicator')).toBeVisible();
    const stepItems = page.locator('.step-item');
    await expect(stepItems).toHaveCount(3);

    // Event type cards load from API
    const cards = page.locator('.event-type-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Step 1 → Step 2: clicking a card advances to calendar', async ({
    page,
  }) => {
    const cards = page.locator('.event-type-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });

    await cards.first().click();

    // Calendar should appear
    await expect(page.locator('.calendar-section')).toBeVisible();
    // Selection summary shows the chosen event type
    await expect(page.locator('.selection-summary')).toBeVisible();

    // Step 2 is now active
    const activeStep = page.locator('.step-item.active');
    await expect(activeStep).toContainText('Дата и время');
  });

  test('Step 2: calendar shows 14 day cells', async ({ page }) => {
    const cards = page.locator('.event-type-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await cards.first().click();

    await expect(page.locator('.days-grid')).toBeVisible();
    const dayCells = page.locator('.day-cell');
    await expect(dayCells).toHaveCount(14);
  });

  test('Step 2: clicking a day cell selects it and shows slots', async ({
    page,
  }) => {
    const cards = page.locator('.event-type-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await cards.first().click();

    // Find a day cell that is NOT marked no-avail (has available slots)
    // Try clicking today first; if today has no slots, try the next few cells
    const dayCells = page.locator('.day-cell');
    await expect(dayCells.first()).toBeVisible();

    // Click the first day
    await dayCells.first().click();
    await expect(dayCells.first()).toHaveClass(/selected/);

    // The slots panel should appear below
    await expect(page.locator('.slots-panel')).toBeVisible({ timeout: 10_000 });
  });

  test('Step 2: selecting a slot enables "Продолжить →" button', async ({
    page,
  }) => {
    const cards = page.locator('.event-type-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await cards.first().click();

    // Find a day cell with available slots by trying each cell
    const dayCells = page.locator('.day-cell');
    await expect(dayCells.first()).toBeVisible();

    let foundSlot = false;
    const cellCount = await dayCells.count();

    for (let i = 0; i < cellCount; i++) {
      const cell = dayCells.nth(i);
      const hasNoAvail = await cell.evaluate((el) =>
        el.classList.contains('no-avail'),
      );
      if (hasNoAvail) continue;

      await cell.click();

      // Wait for slots to load — use .last() to avoid strict-mode violation when
      // the old panel is still animating out while the new one enters
      const slotsPanel = page.locator('.slots-panel').last();
      await expect(slotsPanel).toBeVisible({ timeout: 5_000 });

      const availableSlot = page.locator('.slot-btn:not(.unavailable)').first();
      const slotVisible = await availableSlot.isVisible().catch(() => false);
      if (!slotVisible) continue;

      await availableSlot.click();
      await expect(availableSlot).toHaveClass(/selected/);

      // "Продолжить →" button should appear
      const continueBtn = page.locator('button:has-text("Продолжить")');
      await expect(continueBtn).toBeVisible({ timeout: 5_000 });

      foundSlot = true;
      break;
    }

    // If no slots are available today (e.g. after business hours), the flow
    // still works — just skip this test assertion gracefully
    test.skip(!foundSlot, 'No available slots in the 14-day window');
  });

  test('Full booking flow: Step 1 → 2 → 3 → 4 (confirmation)', async ({
    page,
  }) => {
    // Step 1: select event type
    const cards = page.locator('.event-type-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await cards.first().click();

    // Step 2: find a day with available slots
    const dayCells = page.locator('.day-cell');
    await expect(dayCells.first()).toBeVisible();

    let slotFound = false;
    const cellCount = await dayCells.count();

    for (let i = 0; i < cellCount; i++) {
      const cell = dayCells.nth(i);
      const hasNoAvail = await cell.evaluate((el) =>
        el.classList.contains('no-avail'),
      );
      if (hasNoAvail) continue;

      await cell.click();

      const slotsPanel = page.locator('.slots-panel').last();
      await expect(slotsPanel).toBeVisible({ timeout: 5_000 });

      const slot = page.locator('.slot-btn:not(.unavailable)').first();
      if (!(await slot.isVisible().catch(() => false))) continue;

      await slot.click();

      const continueBtn = page.locator('button:has-text("Продолжить")');
      await expect(continueBtn).toBeVisible({ timeout: 5_000 });
      await continueBtn.click();

      slotFound = true;
      break;
    }

    test.skip(!slotFound, 'No available slots in the 14-day window');
    if (!slotFound) return;

    // Step 3: fill the form
    await expect(page.locator('.form-section')).toBeVisible();

    const nameInput = page.locator('input[placeholder="Иван Иванов"]');
    const emailInput = page.locator('input[placeholder="ivan@example.com"]');
    const submitBtn = page.locator('button:has-text("Подтвердить")');

    // Button disabled while fields are empty
    await expect(submitBtn).toBeDisabled();

    await nameInput.fill('Тест Пользователь');
    await emailInput.fill('test@playwright.example.com');

    // Button enabled after filling required fields
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Step 4: confirmation screen
    await expect(page.locator('.conf-title')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.conf-title')).toContainText('Запись подтверждена');
    await expect(page.locator('.conf-id')).toBeVisible();

    // Detail rows show booking info
    const rows = page.locator('.detail-row');
    await expect(rows.first()).toBeVisible();
  });

  test('Confirmation: "← К списку встреч" resets to step 1', async ({
    page,
  }) => {
    // Navigate to confirmation via full flow
    const cards = page.locator('.event-type-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await cards.first().click();

    const dayCells = page.locator('.day-cell');
    await expect(dayCells.first()).toBeVisible();

    let slotFound = false;
    const cellCount = await dayCells.count();

    for (let i = 0; i < cellCount; i++) {
      const cell = dayCells.nth(i);
      if (await cell.evaluate((el) => el.classList.contains('no-avail'))) continue;

      await cell.click();

      const slotsPanel = page.locator('.slots-panel').last();
      await expect(slotsPanel).toBeVisible({ timeout: 5_000 });

      const slot = page.locator('.slot-btn:not(.unavailable)').first();
      if (!(await slot.isVisible().catch(() => false))) continue;

      await slot.click();
      const continueBtn = page.locator('button:has-text("Продолжить")');
      await expect(continueBtn).toBeVisible({ timeout: 5_000 });
      await continueBtn.click();

      slotFound = true;
      break;
    }

    test.skip(!slotFound, 'No available slots in the 14-day window');
    if (!slotFound) return;

    await page.locator('input[placeholder="Иван Иванов"]').fill('Reset Test');
    await page.locator('input[placeholder="ivan@example.com"]').fill('reset@example.com');
    await page.locator('button:has-text("Подтвердить")').click();

    await expect(page.locator('.conf-title')).toBeVisible({ timeout: 10_000 });

    // Click "back to list"
    await page.locator('button:has-text("← К списку встреч")').click();

    // Should be back on step 1 — event type cards visible again
    await expect(page.locator('.event-type-card').first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator('.step-indicator')).toBeVisible();
  });

  test('Step 3: form — "Подтвердить" disabled without required fields', async ({
    page,
  }) => {
    const cards = page.locator('.event-type-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await cards.first().click();

    const dayCells = page.locator('.day-cell');
    await expect(dayCells.first()).toBeVisible();

    let reached = false;
    const cellCount = await dayCells.count();

    for (let i = 0; i < cellCount; i++) {
      const cell = dayCells.nth(i);
      if (await cell.evaluate((el) => el.classList.contains('no-avail'))) continue;

      await cell.click();

      const slotsPanel = page.locator('.slots-panel').last();
      await expect(slotsPanel).toBeVisible({ timeout: 5_000 });

      const slot = page.locator('.slot-btn:not(.unavailable)').first();
      if (!(await slot.isVisible().catch(() => false))) continue;

      await slot.click();
      const continueBtn = page.locator('button:has-text("Продолжить")');
      await expect(continueBtn).toBeVisible({ timeout: 5_000 });
      await continueBtn.click();

      reached = true;
      break;
    }

    test.skip(!reached, 'No available slots in the 14-day window');
    if (!reached) return;

    const submitBtn = page.locator('button:has-text("Подтвердить")');
    await expect(submitBtn).toBeDisabled();

    // Fill only name — still disabled
    await page.locator('input[placeholder="Иван Иванов"]').fill('Test');
    await expect(submitBtn).toBeDisabled();

    // Fill email — now enabled
    await page.locator('input[placeholder="ivan@example.com"]').fill('test@example.com');
    await expect(submitBtn).toBeEnabled();
  });
});
