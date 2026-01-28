import test from 'node:test';
import assert from 'node:assert/strict';
import { getPathForViewMode, getViewModeFromPath } from '../utils/routing.js';

test('routing maps /text path to text mode', () => {
  assert.equal(getViewModeFromPath('/text'), 'text');
  assert.equal(getViewModeFromPath('/text/'), 'text');
  assert.equal(getViewModeFromPath('/text/anything'), 'text');
});

test('routing maps other paths to voice mode', () => {
  assert.equal(getViewModeFromPath('/'), 'voice');
  assert.equal(getViewModeFromPath('/voice'), 'voice');
  assert.equal(getViewModeFromPath(''), 'voice');
});

test('routing generates canonical paths', () => {
  assert.equal(getPathForViewMode('voice'), '/');
  assert.equal(getPathForViewMode('text'), '/text');
});
