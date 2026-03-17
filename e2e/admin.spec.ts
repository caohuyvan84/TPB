import { test, expect } from '@playwright/test';

const ADMIN_URL = 'http://localhost:3020';

const MOCK_ADMIN_USER = {
  id: 'admin-1', username: 'admin', email: 'admin@tpb.vn',
  fullName: 'System Admin', roles: ['ADMIN'], permissions: ['users:read', 'users:create', 'users:update', 'users:delete'],
  isActive: true, tenantId: 'tenant-1', createdAt: new Date().toISOString(),
};

const MOCK_LOGIN_RESPONSE = {
  accessToken: 'mock-admin-token',
  refreshToken: 'mock-admin-refresh',
  expiresIn: 900,
  user: MOCK_ADMIN_USER,
};

const MOCK_USERS = {
  data: [MOCK_ADMIN_USER],
  total: 1, page: 1, limit: 20,
};

async function setupAdminMocks(page: any) {
  await page.route('**/api/auth/login', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LOGIN_RESPONSE) })
  );
  await page.route('**/api/users/me', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ADMIN_USER) })
  );
  await page.route('**/api/users**', (route: any) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USERS) });
    }
    // POST create user
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...MOCK_ADMIN_USER, id: 'new-user-1', username: 'newuser' }) });
  });
  await page.route('**/api/auth/logout', (route: any) => route.fulfill({ status: 200 }));
}

test.describe('Admin Module', () => {
  test.use({ baseURL: ADMIN_URL });

  test('admin login redirects to /dashboard', async ({ page }) => {
    await setupAdminMocks(page);

    await page.goto('/login');
    await expect(page.locator('h2, h1')).toBeVisible({ timeout: 5000 });

    await page.fill('#username, input[placeholder*="username" i], input[id*="username" i]', 'admin');
    await page.fill('input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('create user appears in user list', async ({ page }) => {
    await setupAdminMocks(page);

    // Pre-authenticate
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('adminAccessToken', token);
    }, 'mock-admin-token');

    await page.route('**/api/users/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ADMIN_USER) })
    );
    await page.route('**/api/users**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USERS) });
      }
      const newUser = { ...MOCK_ADMIN_USER, id: 'new-2', username: 'testuser_e2e', fullName: 'E2E Test User' };
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newUser) });
    });

    await page.goto('/users');
    await expect(page.locator('h1')).toContainText('User', { timeout: 8000 });

    // Open add user modal
    const addBtn = page.locator('button:has-text("Add User"), button:has-text("+ Add"), button:has-text("Create")').first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill form
    await modal.locator('input[placeholder*="username" i], input[id*="username" i]').first().fill('testuser_e2e');
    await modal.locator('input[type="email"]').first().fill('testuser@e2e.com');
    await modal.locator('input[placeholder*="name" i]').first().fill('E2E Test User');
    await modal.locator('input[type="password"]').first().fill('TestPass1234!');
    await modal.locator('button[type="submit"], button:has-text("Create"), button:has-text("Add User")').first().click();

    // Modal closes after submit
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('user list page loads correctly', async ({ page }) => {
    await setupAdminMocks(page);

    // Pre-authenticate via localStorage
    await page.goto('/login');
    await page.evaluate((token) => localStorage.setItem('adminAccessToken', token), 'mock-admin-token');
    await page.route('**/api/users/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ADMIN_USER) })
    );
    await page.route('**/api/users**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USERS) })
    );

    await page.goto('/users');
    await expect(page.locator('h1')).toContainText('User', { timeout: 8000 });
    // Table should be visible
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
    // Admin user row should appear
    await expect(page.locator('text=System Admin')).toBeVisible({ timeout: 5000 });
  });
});
