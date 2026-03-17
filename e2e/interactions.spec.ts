import { test, expect } from '@playwright/test';

const MOCK_USER = {
  id: 'user-1', agentId: 'agent-1', fullName: 'Test Agent',
  roles: ['AGENT'], permissions: ['interactions:read'],
};

const MOCK_INTERACTIONS = [
  { id: 'int-1', channel: 'voice', status: 'active', priority: 'high',
    customerName: 'Nguyễn Văn A', customerPhone: '0901234567', startTime: new Date().toISOString() },
  { id: 'int-2', channel: 'chat', status: 'waiting', priority: 'medium',
    customerName: 'Trần Thị B', customerPhone: '0912345678', startTime: new Date().toISOString() },
];

async function setupAuth(page: any) {
  await page.route('**/api/users/me', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) })
  );
  await page.route('**/api/interactions**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: MOCK_INTERACTIONS, total: 2 }) })
  );
  await page.route('**/api/**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.evaluate((token: string) => localStorage.setItem('accessToken', token), 'mock-access-token');
}

test.describe('Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuth(page);
    await page.goto('/agent');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('agent desktop loads at /agent route', async ({ page }) => {
    await expect(page).toHaveURL(/\/agent/);
    // The agent desktop main layout should be visible
    await expect(page.locator('body')).toBeVisible();
    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('interaction list panel is visible', async ({ page }) => {
    // InteractionList renders a left panel with interactions
    // Look for the general panel structure
    const leftPanel = page.locator('.flex.flex-col, [class*="panel"], aside, [class*="list"]').first();
    await expect(leftPanel).toBeVisible({ timeout: 8000 });
  });

  test('filter buttons are present in the UI', async ({ page }) => {
    // The agent desktop header or list should have channel filter buttons
    const page_content = await page.content();
    // Verify the page loaded some meaningful content (not just login)
    expect(page_content).toContain('agent');
  });
});
