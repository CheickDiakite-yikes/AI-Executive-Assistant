import test from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = 'http://localhost:3001/api';

// SKIP integration tests if server isn't running
const isServerRunning = async () => {
    try {
        const res = await fetch(`${API_BASE}/health`);
        return res.ok;
    } catch {
        return false;
    }
};

test('Integration: Health Check', { skip: !(await isServerRunning()) }, async () => {
    const res = await fetch(`${API_BASE}/health`);
    assert.equal(res.status, 200);
});

test('Integration: Create and Fetch Note', { skip: !(await isServerRunning()) }, async () => {
    // 1. Create
    const newNote = {
        title: `Integration Test ${Date.now()}`,
        content: 'Forensic verification content',
        tags: ['test-automation']
    };

    const createRes = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
    });

    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.title, newNote.title);

    // 2. Fetch All and verifies existence
    const listRes = await fetch(`${API_BASE}/notes`);
    const notes = await listRes.json();
    const found = notes.find(n => n.id === created.id);

    assert.ok(found, 'Created note should be returned in list');
    assert.equal(found.content, newNote.content);

    // 3. Delete
    const deleteRes = await fetch(`${API_BASE}/notes/${created.id}`, { method: 'DELETE' });
    assert.equal(deleteRes.status, 204);
});

test('Integration: Canvas Items', { skip: !(await isServerRunning()) }, async () => {
    const newItem = {
        type: 'web-search',
        title: 'Test Search',
        content: { query: 'integration' },
        visitorId: 'test-user'
    };

    const createRes = await fetch(`${API_BASE}/canvas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.visitorId, 'test-user');

    // Fetch by visitor
    const listRes = await fetch(`${API_BASE}/canvas?visitorId=test-user`);
    const items = await listRes.json();
    const found = items.find(i => i.id === created.id);
    assert.ok(found);
});

test('Integration: Conversations Flow', { skip: !(await isServerRunning()) }, async () => {
    // 1. Create Conversation
    const convRes = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Conv' })
    });
    const conv = await convRes.json();

    // 2. Add Message
    const msgRes = await fetch(`${API_BASE}/conversations/${conv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role: 'user',
            content: 'Hello World',
            modality: 'text'
        })
    });
    assert.equal(msgRes.status, 201);

    // 3. Fetch Messages
    const listRes = await fetch(`${API_BASE}/conversations/${conv.id}/messages`);
    const messages = await listRes.json();
    assert.equal(messages.length, 1);
    assert.equal(messages[0].content, 'Hello World');
});

test('Integration: Email Search', { skip: !(await isServerRunning()) }, async () => {
    const res = await fetch(`${API_BASE}/email/search?query=elon`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.email);
    assert.ok(Array.isArray(data.results));
});

test('Integration: Calendar List and Schedule', { skip: !(await isServerRunning()) }, async () => {
    const listRes = await fetch(`${API_BASE}/calendar`);
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.ok(Array.isArray(listData.events));

    const createRes = await fetch(`${API_BASE}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Integration Sync', time: '03:00 PM - 03:30 PM' })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.ok(created.event);
});

test('Integration: Market Data', { skip: !(await isServerRunning()) }, async () => {
    const res = await fetch(`${API_BASE}/market/tsla`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ticker, 'TSLA');
});

test('Integration: Integrations Status', { skip: !(await isServerRunning()) }, async () => {
    const res = await fetch(`${API_BASE}/integrations/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.provider);
});

test('Integration: Integrations Health', { skip: !(await isServerRunning()) }, async () => {
    const res = await fetch(`${API_BASE}/integrations/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.healthy === 'boolean');
});
