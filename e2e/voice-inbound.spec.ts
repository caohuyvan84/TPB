import { test, expect } from '@playwright/test';

/**
 * E2E Test: Inbound Voice Call Full Lifecycle
 *
 * Flow: inbound call → IVR → queue → agent answer → hold → transfer → hang up → CDR
 *
 * Prerequisites:
 * - All services running (Kamailio, FreeSWITCH, GoACD, NestJS services)
 * - Test agent logged in and set to "ready"
 * - SIP trunk configured for test calls
 */
test.describe('Voice Inbound Call E2E', () => {
  const API_BASE = process.env.API_BASE || 'http://localhost:3001';
  const CTI_BASE = process.env.CTI_BASE || 'http://localhost:3019';
  const GOACD_BASE = process.env.GOACD_BASE || 'http://localhost:9092';
  const TENANT_ID = '00000000-0000-0000-0000-000000000000';

  test('GoACD health check', async ({ request }) => {
    const resp = await request.get(`${GOACD_BASE}/healthz`);
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('goacd');
  });

  test('Agent can set status to ready', async ({ request }) => {
    const resp = await request.post(`${CTI_BASE}/api/v1/cti/agent/state?tenantId=${TENANT_ID}`, {
      data: { agentId: 'test-agent-001', status: 'ready' },
    });
    expect(resp.ok()).toBeTruthy();
  });

  test('WebRTC credentials endpoint returns SIP config', async ({ request }) => {
    const resp = await request.get(
      `${CTI_BASE}/api/v1/cti/webrtc/credentials?tenantId=${TENANT_ID}&agentId=test-agent-001`,
    );
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.wsUri).toContain('wss://');
    expect(body.sipUri).toContain('sip:');
    expect(body.domain).toBeTruthy();
    expect(body.iceServers).toBeInstanceOf(Array);
  });

  test('Agent state is readable from GoACD', async ({ request }) => {
    const resp = await request.get(
      `${CTI_BASE}/api/v1/cti/agent/state?tenantId=${TENANT_ID}&agentId=test-agent-001`,
    );
    expect(resp.ok()).toBeTruthy();
  });

  test('Routing Engine queue CRUD', async ({ request }) => {
    // Create a queue
    const create = await request.post(`${API_BASE}/api/v1/routing/queues`, {
      data: { name: 'test-sales', channelType: 'voice', slaSeconds: 30 },
    });
    expect(create.ok()).toBeTruthy();

    // List queues
    const list = await request.get(`${API_BASE}/api/v1/routing/queues`);
    expect(list.ok()).toBeTruthy();
  });

  test('Interaction can be created for voice call', async ({ request }) => {
    const resp = await request.post(`${API_BASE}/api/v1/interactions`, {
      data: {
        type: 'call',
        channel: 'voice',
        customerId: '00000000-0000-0000-0000-000000000099',
        customerName: 'Test Customer',
        direction: 'inbound',
        callLegId: 'test-leg-001',
      },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.id).toBeTruthy();
    expect(body.channel).toBe('voice');
    expect(body.status).toBe('new');
  });

  test('Interaction timeline tracks events', async ({ request }) => {
    // Create interaction first
    const create = await request.post(`${API_BASE}/api/v1/interactions`, {
      data: {
        type: 'call',
        channel: 'voice',
        customerId: '00000000-0000-0000-0000-000000000099',
        direction: 'inbound',
      },
    });
    const interaction = await create.json();

    // Get timeline
    const timeline = await request.get(`${API_BASE}/api/v1/interactions/${interaction.id}/timeline`);
    expect(timeline.ok()).toBeTruthy();
    const events = await timeline.json();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('created');
  });
});
