import { test, expect } from '@playwright/test';

test.describe('Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/owner');
  });

  test('page title is visible', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('Панель владельца');
  });

  test('event types section loads with data table', async ({ page }) => {
    // OwnerPage has two .owner-section elements; EventTypeManager is the second one
    const etSection = page.locator('.owner-section').nth(1);
    await expect(etSection.locator('.section-title')).toContainText('Типы событий');
    // Table loads with at least the two seeded event types
    await expect(etSection.locator('.data-table')).toBeVisible({ timeout: 10_000 });
    const rows = etSection.locator('.table-row:not(.t-head)');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('"+ Добавить" button opens the create form', async ({ page }) => {
    const addBtn = page.locator('button.btn-primary:has-text("Добавить")');
    await expect(addBtn).toBeVisible();

    await addBtn.click();

    // Inline form should appear
    await expect(page.locator('.inline-form')).toBeVisible({ timeout: 3_000 });
    await expect(
      page.locator('input[placeholder="30-минутный звонок"]'),
    ).toBeVisible();
  });

  test('clicking "Добавить" again closes the form', async ({ page }) => {
    const addBtn = page.locator('button.btn-primary:has-text("Добавить")');
    await addBtn.click();
    await expect(page.locator('.inline-form')).toBeVisible({ timeout: 3_000 });

    // Button now shows "✕ Отмена" — clicking toggles form closed
    const cancelBtn = page.locator('button.btn-primary');
    await cancelBtn.click();
    await expect(page.locator('.inline-form')).not.toBeVisible({ timeout: 3_000 });
  });

  test('Create: filling form and clicking "Создать" adds a new row', async ({
    page,
  }) => {
    const addBtn = page.locator('button.btn-primary:has-text("Добавить")');
    await addBtn.click();

    await expect(page.locator('.inline-form')).toBeVisible({ timeout: 3_000 });

    const titleInput = page.locator('input[placeholder="30-минутный звонок"]');
    const durationInput = page.locator('.inline-form input[type="number"]');
    const createBtn = page.locator('button.btn-solid:has-text("Создать")');

    const uniqueTitle = `Playwright Test ${Date.now()}`;
    await titleInput.fill(uniqueTitle);
    await durationInput.fill('45');
    await createBtn.click();

    // Form should close
    await expect(page.locator('.inline-form')).not.toBeVisible({ timeout: 5_000 });

    // New row should appear in the table
    const table = page.locator('.owner-section').nth(1).locator('.data-table');
    await expect(table.locator(`text=${uniqueTitle}`)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('Cancel create form: clicking "Отмена" closes form without saving', async ({
    page,
  }) => {
    const addBtn = page.locator('button.btn-primary:has-text("Добавить")');
    await addBtn.click();
    await expect(page.locator('.inline-form')).toBeVisible({ timeout: 3_000 });

    const titleInput = page.locator('input[placeholder="30-минутный звонок"]');
    await titleInput.fill('Should Not Be Saved');

    await page.locator('button.btn-ghost:has-text("Отмена")').click();

    // Form should close
    await expect(page.locator('.inline-form')).not.toBeVisible({ timeout: 3_000 });

    // The filled title should NOT appear in the table
    const etTable = page.locator('.owner-section').nth(1).locator('.data-table');
    await expect(
      etTable.locator('text=Should Not Be Saved'),
    ).not.toBeVisible();
  });

  test('Edit: clicking edit button opens pre-filled form', async ({ page }) => {
    // Wait for first edit button to be visible (scope to event-types table)
    const etTable = page.locator('.owner-section').nth(1).locator('.data-table');
    await expect(etTable).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('.row-actions .icon-btn').first(),
    ).toBeVisible({ timeout: 10_000 });

    const editBtn = page.locator('.row-actions .icon-btn[title="Редактировать"]').first();
    await editBtn.click();

    // Inline edit form opens
    await expect(page.locator('.inline-form')).toBeVisible({ timeout: 3_000 });

    // Form should be pre-filled (title field is not empty)
    const titleInput = page.locator('input[placeholder="30-минутный звонок"]');
    const currentTitle = await titleInput.inputValue();
    expect(currentTitle.length).toBeGreaterThan(0);

    // Save button shows "Сохранить"
    await expect(
      page.locator('button.btn-solid:has-text("Сохранить")'),
    ).toBeVisible();
  });

  test('Edit: updating title and saving reflects change in table', async ({
    page,
  }) => {
    const etTable = page.locator('.owner-section').nth(1).locator('.data-table');
    await expect(etTable).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('.row-actions .icon-btn[title="Редактировать"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    const editBtn = page.locator('.row-actions .icon-btn[title="Редактировать"]').first();
    await editBtn.click();

    await expect(page.locator('.inline-form')).toBeVisible({ timeout: 3_000 });

    const titleInput = page.locator('input[placeholder="30-минутный звонок"]');
    const updatedTitle = `Updated ${Date.now()}`;
    await titleInput.fill(updatedTitle);

    await page.locator('button.btn-solid:has-text("Сохранить")').click();

    // Form closes
    await expect(page.locator('.inline-form')).not.toBeVisible({ timeout: 5_000 });

    // Updated title appears in table
    await expect(
      etTable.locator(`text=${updatedTitle}`),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Edit cancel: discards changes', async ({ page }) => {
    const etTable = page.locator('.owner-section').nth(1).locator('.data-table');
    await expect(etTable).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('.row-actions .icon-btn[title="Редактировать"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    const editBtn = page.locator('.row-actions .icon-btn[title="Редактировать"]').first();
    await editBtn.click();

    await expect(page.locator('.inline-form')).toBeVisible({ timeout: 3_000 });

    const titleInput = page.locator('input[placeholder="30-минутный звонок"]');
    const originalTitle = await titleInput.inputValue();

    await titleInput.fill('Discarded Change');
    await page.locator('button.btn-ghost:has-text("Отмена")').click();

    await expect(page.locator('.inline-form')).not.toBeVisible({ timeout: 3_000 });

    // Original title still there, discarded title not present
    await expect(
      etTable.locator(`text=${originalTitle}`),
    ).toBeVisible();
    await expect(
      etTable.locator('text=Discarded Change'),
    ).not.toBeVisible();
  });

  test('Delete: creates new event type then deletes it', async ({ page }) => {
    // First create a fresh event type so deleting it is safe
    const addBtn = page.locator('button.btn-primary:has-text("Добавить")');
    await addBtn.click();
    await expect(page.locator('.inline-form')).toBeVisible({ timeout: 3_000 });

    const uniqueTitle = `To Delete ${Date.now()}`;
    await page.locator('input[placeholder="30-минутный звонок"]').fill(uniqueTitle);
    await page.locator('.inline-form input[type="number"]').fill('30');
    await page.locator('button.btn-solid:has-text("Создать")').click();

    // Wait for the new row to appear
    const newRow = page.locator('.data-table').locator(`text=${uniqueTitle}`);
    await expect(newRow).toBeVisible({ timeout: 5_000 });

    // Find the delete button in the same row
    const rowContainer = page
      .locator('.data-table .table-row')
      .filter({ hasText: uniqueTitle });
    const deleteBtn = rowContainer.locator(
      '.row-actions .icon-btn[title="Удалить"]',
    );
    await deleteBtn.click();

    // Row should disappear
    await expect(newRow).not.toBeVisible({ timeout: 5_000 });
  });
});
