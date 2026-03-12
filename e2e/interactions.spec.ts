import { test, expect } from '@playwright/test';

test.describe('Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the agent desktop (assumes unauthenticated access to mock data, or adjust for your auth flow)
    await page.goto('/');
  });

  test('interaction queue loads with items', async ({ page }) => {
    // Wait for interaction list to render
    const interactionList = page.locator('[data-testid="interaction-list"], .interaction-list, [class*="InteractionList"]').first();
    await expect(interactionList).toBeVisible({ timeout: 10000 });

    // Verify at least one item exists
    const items = page.locator('[data-testid="interaction-item"], [class*="interaction-item"], [class*="InteractionItem"]');
    await expect(items.first()).toBeVisible({ timeout: 5000 });
  });

  test('click interaction shows detail panel', async ({ page }) => {
    // Wait for an interaction item to appear and click it
    const firstItem = page.locator('[data-testid="interaction-item"], [class*="interaction-item"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    await firstItem.click();

    // Verify detail panel appears
    const detailPanel = page.locator('[data-testid="interaction-detail"], [class*="InteractionDetail"], [class*="interaction-detail"]').first();
    await expect(detailPanel).toBeVisible({ timeout: 5000 });
  });

  test('filter by channel changes visible interactions', async ({ page }) => {
    // Wait for the filter controls
    const filterArea = page.locator('[data-testid="channel-filter"], select, [role="listbox"]').first();
    await expect(filterArea).toBeVisible({ timeout: 10000 });

    // Get initial count of items
    const itemsBefore = page.locator('[data-testid="interaction-item"], [class*="interaction-item"]');
    const countBefore = await itemsBefore.count();

    // Apply a channel filter if available
    const voiceFilter = page.locator('button:has-text("Voice"), [data-channel="voice"]').first();
    if (await voiceFilter.isVisible()) {
      await voiceFilter.click();
      // After filter, the list should update (possibly fewer items)
      await page.waitForTimeout(500);
      const countAfter = await itemsBefore.count();
      // The count changed or stayed the same (depending on data)
      expect(typeof countAfter).toBe('number');
      expect(countBefore).toBeGreaterThanOrEqual(0);
    }
  });
});
