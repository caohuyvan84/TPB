import { test, expect } from '@playwright/test';

const TEST_USER = { username: 'agent1', password: 'Agent1234!' };
const INVALID_USER = { username: 'agent1', password: 'wrongpassword' };

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('login with valid credentials redirects to agent desktop', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[id*="username" i]', TEST_USER.username);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).not.toHaveURL(/\/login/);
  });

  test('login with invalid credentials shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[id*="username" i]', INVALID_USER.username);
    await page.fill('input[type="password"]', INVALID_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login/);
    const errorMessage = page.locator('[role="alert"], .error, [class*="error"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('logout redirects to login page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[id*="username" i]', TEST_USER.username);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), [data-testid="logout"]').first();
    await logoutBtn.click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('session persists on page reload', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[id*="username" i]', TEST_USER.username);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
  });
});
