import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../services/api.js';

// Mock global fetch
const originalFetch = global.fetch;
let mockResponse = {};
let lastUrl = '';
let lastOptions = undefined;

test.beforeEach(() => {
    mockResponse = {};
    lastUrl = '';
    lastOptions = undefined;
    global.fetch = async (url, options) => {
        lastUrl = url;
        lastOptions = options;
        return ({
        ok: true,
        json: async () => mockResponse,
        ...mockResponse
        });
    };
});

test.afterEach(() => {
    global.fetch = originalFetch;
});

test('api.health returns true on 200 OK', async () => {
    mockResponse = { ok: true };
    const result = await api.health();
    assert.equal(result, true);
});

test('api.getNotes maps properties correctly', async () => {
    const now = Date.now();
    mockResponse = [{
        id: '1',
        title: 'Test',
        content: 'Content',
        createdAt: new Date(now).toISOString(),
        tags: ['a']
    }];

    const notes = await api.getNotes();
    assert.equal(notes.length, 1);
    assert.equal(notes[0].timestamp, now);
});

test('api.email.search calls email search endpoint', async () => {
    mockResponse = { email: { id: 'e1' } };
    await api.email.search('elon');
    assert.ok(lastUrl.includes('/api/email/search'));
});

test('api.calendar.list calls calendar endpoint', async () => {
    mockResponse = { events: [] };
    await api.calendar.list();
    assert.ok(lastUrl.includes('/api/calendar'));
});

test('api.integrations.status calls integrations status endpoint', async () => {
    mockResponse = { provider: 'mock' };
    await api.integrations.status();
    assert.ok(lastUrl.includes('/api/integrations/status'));
});

test('api requests include x-user-id header', async () => {
    mockResponse = { provider: 'mock' };
    await api.integrations.status();
    assert.ok(lastOptions.headers['x-user-id']);
});

test('api.integrations.connectGoogle calls connect endpoint', async () => {
    mockResponse = { authUrl: 'https://example.com' };
    await api.integrations.connectGoogle();
    assert.ok(lastUrl.includes('/api/integrations/google/connect'));
    assert.equal(lastOptions.method, 'POST');
});

test('api.integrations.disconnectGoogle calls disconnect endpoint', async () => {
    mockResponse = { success: true };
    await api.integrations.disconnectGoogle();
    assert.ok(lastUrl.includes('/api/integrations/google/disconnect'));
    assert.equal(lastOptions.method, 'POST');
});

test('api.integrations.health calls health endpoint', async () => {
    mockResponse = { healthy: true };
    await api.integrations.health();
    assert.ok(lastUrl.includes('/api/integrations/health'));
});
