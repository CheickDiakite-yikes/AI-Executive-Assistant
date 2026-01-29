import test from 'node:test';
import assert from 'node:assert/strict';
import { __resetTelemetry, getTelemetryEvents, trackEvent, trackError, trackToolExecution } from '../utils/telemetry.js';

globalThis.__MAYA_TELEMETRY_SILENT = true;

test('telemetry tracks events', () => {
  __resetTelemetry();
  const id = trackEvent('unit_test', { hello: 'world' });
  const events = getTelemetryEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].id, id);
  assert.equal(events[0].name, 'unit_test');
});

test('telemetry caps event buffer', () => {
  __resetTelemetry();
  for (let i = 0; i < 250; i += 1) {
    trackEvent('spam', { i });
  }
  const events = getTelemetryEvents();
  assert.equal(events.length, 200);
  assert.equal(events[0].name, 'spam');
});

test('telemetry logs errors with details', () => {
  __resetTelemetry();
  trackError('bad_stuff', new Error('boom'), { code: 500 });
  const events = getTelemetryEvents();
  assert.equal(events[0].level, 'error');
  assert.equal(events[0].name, 'bad_stuff');
});

test('telemetry tracks tool executions', () => {
  __resetTelemetry();
  trackToolExecution('display_email', { query: 'elon' }, { result: 'ok' }, 42);
  const events = getTelemetryEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].name, 'tool_display_email');
  assert.equal(events[0].level, 'info');
});
