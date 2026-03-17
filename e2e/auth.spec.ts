import { test, expect } from '@playwright/test';

const MOCK_USER = {
  id: 'user-1',
  agentId: 'agent-1',
  fullName: 'Test Agent',
  roles: ['AGENT'],
  permissions: ['interactions:read'],
};

const MOCK_AUTH_RESPONSE = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 900,
  tokenType: 'Bearer',
  user: MOCK_USER,
};

test.describe('Authentication', () => {
  test('login with valid credentials redirects to /agent', async ({ page }) => {
    // Mock successful login
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_RESPONSE) })
    );
    await page.route('**/api/users/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) })
    );
    // Mock any other API calls the agent desktop makes
    await page.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));

    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Agent Desktop');

    await page.fill('#username', 'agent1');
    await page.fill('#password', 'Agent1234!');
    await page.click('button[type="submit"]:has-text("Sign in")');

    await expect(page).toHaveURL(/\/agent/, { timeout: 10000 });
  });

  test('login with invalid credentials shows error toast', async ({ page }) => {
    // Mock failed login
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid credentials' }) })
    );

    await page.goto('/login');
    await page.fill('#username', 'agent1');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]:has-text("Sign in")');

    // Stay on login page
    await expect(page).toHaveURL(/\/login/);
    // Sonner toast appears
    await expect(page.locator('[data-sonner-toaster]')).toBeVisible({ timeout: 5000 });
  });

  test('logout redirects to /login', async ({ page }) => {
    // Mock auth
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_RESPONSE) })
    );
    await page.route('**/api/users/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) })
    );
    await page.route('**/api/auth/logout', (route) => route.fulfill({ status: 200 }));
    await page.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));

    await page.goto('/login');
    await page.fill('#username', 'agent1');
    await page.fill('#password', 'Agent1234!');
    await page.click('button[type="submit"]:has-text("Sign in")');
    await expect(page).toHaveURL(/\/agent/, { timeout: 10000 });

    // Open user dropdown and click logout ("Đăng xuất")
    const userMenuTrigger = page.locator('[data-radix-dropdown-menu-trigger], button[aria-haspopup="menu"]').first();
    await userMenuTrigger.click();
    await page.locator('text=Đăng xuất').click();

    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('session persists on page reload when token exists', async ({ page }) => {
    // Pre-seed token in localStorage and mock /users/me
    await page.goto('/login');
    await page.route('**/api/users/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) })
    );
    await page.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));

    await page.evaluate((token) => localStorage.setItem('accessToken', token), 'mock-access-token');
    await page.goto('/agent');

    await expect(page).not.toHaveURL(/\/login/, { timeout: 8000 });
    await expect(page).toHaveURL(/\/agent/);
  });
});
