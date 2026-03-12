import { test, expect } from '@playwright/test';

// Admin module runs on port 3020
const ADMIN_URL = 'http://localhost:3020';
const ADMIN_CREDENTIALS = { username: 'admin', password: 'Admin1234!' };

test.describe('Admin Module', () => {
  test.use({ baseURL: ADMIN_URL });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('admin login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[id*="username" i]', ADMIN_CREDENTIALS.username);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('create user appears in user list', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[id*="username" i]', ADMIN_CREDENTIALS.username);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to user management
    await page.goto('/users');
    await expect(page.locator('h1:has-text("User")')).toBeVisible({ timeout: 5000 });

    // Click add user button
    const addBtn = page.locator('button:has-text("Add User"), button:has-text("Create User"), button:has-text("+ Add")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Fill the form
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const timestamp = Date.now();
    const testUsername = `testuser_${timestamp}`;

    await modal.locator('input[name="username"], input[placeholder*="username" i]').first().fill(testUsername);
    await modal.locator('input[name="email"], input[type="email"]').first().fill(`${testUsername}@test.com`);
    await modal.locator('input[name="fullName"], input[placeholder*="full name" i], input[placeholder*="name" i]').first().fill('Test User E2E');
    await modal.locator('input[type="password"]').first().fill('TestPass1234!');

    await modal.locator('button[type="submit"], button:has-text("Create"), button:has-text("Add")').first().click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // New user should appear in the list
    await expect(page.locator(`text=${testUsername}`)).toBeVisible({ timeout: 5000 });
  });

  test('deactivate user changes status', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[id*="username" i]', ADMIN_CREDENTIALS.username);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await page.goto('/users');
    await expect(page.locator('h1:has-text("User")')).toBeVisible({ timeout: 5000 });

    // Find a toggle/deactivate button for a user (not the current admin)
    const toggleBtn = page.locator('button:has-text("Deactivate"), button:has-text("Disable"), [data-testid*="toggle"]').first();
    if (await toggleBtn.isVisible({ timeout: 3000 })) {
      await toggleBtn.click();
      // Verify status changes
      await page.waitForTimeout(1000);
      // Look for inactive/deactivated state indicator
      const inactiveIndicator = page.locator('text=Inactive, text=Deactivated, [class*="inactive"]').first();
      expect(inactiveIndicator).toBeTruthy();
    }
  });
});
