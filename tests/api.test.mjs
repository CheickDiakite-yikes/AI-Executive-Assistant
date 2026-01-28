import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../services/api.ts';

// Mock global fetch
const originalFetch = global.fetch;
let mockResponse = {};

test.beforeEach(() => {
    mockResponse = {};
    global.fetch = async () => ({
        ok: true,
        json: async () => mockResponse,
        ...mockResponse
    });
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
