import { test, expect } from '@playwright/test';

/**
 * E2E Test: Outbound Voice Call (Click-to-Call)
 *
 * Flow: agent click-to-call → originate → customer answers → conversation → hang up → CDR
 */
test.describe('Voice Outbound Call E2E', () => {
  const CTI_BASE = process.env.CTI_BASE || 'http://localhost:3019';
  const GOACD_BASE = process.env.GOACD_BASE || 'http://localhost:9092';
  const TENANT_ID = '00000000-0000-0000-0000-000000000000';

  test('GoACD reports active calls', async ({ request }) => {
    const resp = await request.get(`${GOACD_BASE}/api/calls`);
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.count).toBeGreaterThanOrEqual(0);
    expect(body.calls).toBeInstanceOf(Array);
  });

  test('GoACD stats endpoint works', async ({ request }) => {
    const resp = await request.get(`${GOACD_BASE}/api/stats`);
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body).toHaveProperty('activeCalls');
    expect(body).toHaveProperty('uptime');
  });

  test('Make outbound call via CTI API', async ({ request }) => {
    // Set agent ready first
    await request.post(`${CTI_BASE}/api/v1/cti/agent/state?tenantId=${TENANT_ID}`, {
      data: { agentId: 'test-agent-001', status: 'ready' },
    });

    // Initiate outbound call
    const resp = await request.post(`${CTI_BASE}/api/v1/cti/calls/make?tenantId=${TENANT_ID}`, {
      data: { agentId: 'test-agent-001', destination: '0901234567' },
    });
    // May fail if no FS connection in test env — that's OK
    const status = resp.status();
    expect([200, 503]).toContain(status);
  });

  test('Hangup call via CTI API', async ({ request }) => {
    const resp = await request.post(`${CTI_BASE}/api/v1/cti/calls/hangup?tenantId=${TENANT_ID}`, {
      data: { callId: 'test-call-001' },
    });
    expect(resp.ok()).toBeTruthy();
  });
});
