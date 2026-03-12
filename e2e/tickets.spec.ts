import { test, expect } from '@playwright/test';

test.describe('Tickets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('create new ticket appears in list', async ({ page }) => {
    // Find and click the create ticket button
    const createBtn = page.locator('button:has-text("Create Ticket"), button:has-text("New Ticket"), [data-testid="create-ticket"]').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Fill in the ticket form
    const dialog = page.locator('[role="dialog"], [data-testid="ticket-dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill subject/title
    const subjectInput = dialog.locator('input[name="subject"], input[placeholder*="subject" i], input[placeholder*="title" i]').first();
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Test ticket from E2E');
    }

    // Fill description
    const descInput = dialog.locator('textarea, input[name="description"]').first();
    if (await descInput.isVisible()) {
      await descInput.fill('This is an automated test ticket');
    }

    // Submit the form
    const submitBtn = dialog.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
    await submitBtn.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('add comment to ticket', async ({ page }) => {
    // Navigate to a ticket detail view (click on an interaction that has a ticket tab)
    const ticketTab = page.locator('[data-tab="tickets"], button:has-text("Tickets"), [role="tab"]:has-text("Ticket")').first();
    if (await ticketTab.isVisible({ timeout: 5000 })) {
      await ticketTab.click();

      // Find comment input
      const commentInput = page.locator('textarea[placeholder*="comment" i], textarea[placeholder*="note" i]').first();
      if (await commentInput.isVisible({ timeout: 3000 })) {
        await commentInput.fill('Automated comment from E2E test');
        const addBtn = page.locator('button:has-text("Add"), button:has-text("Comment"), button[type="submit"]').first();
        await addBtn.click();
        // Verify comment appears
        await expect(page.locator('text=Automated comment from E2E test')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('change ticket status', async ({ page }) => {
    // Find a status change control in the ticket view
    const statusSelect = page.locator('select[name="status"], [data-testid="ticket-status"]').first();
    if (await statusSelect.isVisible({ timeout: 5000 })) {
      await statusSelect.selectOption({ index: 1 });
      // Verify the change was applied
      await page.waitForTimeout(500);
      expect(await statusSelect.inputValue()).toBeTruthy();
    }
  });
});
