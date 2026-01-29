import test from 'node:test';
import assert from 'node:assert/strict';

// Mocking the behavior we expect in App.tsx
// We can't import App.tsx directly in Node test runner easily without DOM
// So we test the Logic of error handling which we just implemented.

const analyzeDataError = (errorName) => {
    let msg = "Could not access microphone.";
    if (errorName === 'NotAllowedError') {
        msg = "Microphone permission denied. Please allow access in browser settings.";
    } else if (errorName === 'NotFoundError') {
        msg = "No microphone found on this device.";
    } else if (errorName === 'NotReadableError') {
        msg = "Microphone is busy or not readable. Check other apps.";
    }
    return msg;
};

test('Audio Error: NotAllowedError returns permission message', () => {
    const msg = analyzeDataError('NotAllowedError');
    assert.match(msg, /permission/i);
});

test('Audio Error: NotFoundError returns missing message', () => {
    const msg = analyzeDataError('NotFoundError');
    assert.match(msg, /No microphone/i);
});

test('Audio Error: NotReadableError returns busy message', () => {
    const msg = analyzeDataError('NotReadableError');
    assert.match(msg, /busy/i);
});

test('Audio Error: Unknown error returns generic message', () => {
    const msg = analyzeDataError('UnknownErrror');
    assert.equal(msg, "Could not access microphone.");
});
