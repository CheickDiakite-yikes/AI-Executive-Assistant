/**
 * @typedef {'info' | 'warn' | 'error'} TelemetryLevel
 * @typedef {{ id: string; time: number; level: TelemetryLevel; name: string; data?: Record<string, unknown>; }} TelemetryEvent
 */

const MAX_EVENTS = 200;
/** @type {TelemetryEvent[]} */
const events = [];
/** @type {Set<(event: TelemetryEvent) => void>} */
const listeners = new Set();

const root = typeof window !== 'undefined' ? window : globalThis;
const shouldLog = () => !Boolean(root.__MAYA_TELEMETRY_SILENT || (typeof process !== 'undefined' && process?.env?.MAYA_TELEMETRY_SILENT === '1'));

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeError = (error) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Unknown error' };
  }
};

/** @param {TelemetryEvent} event */
const pushEvent = (event) => {
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  root.__mayaTelemetry = events.slice();
  listeners.forEach((listener) => listener(event));
};

/**
 * @param {string} name
 * @param {Record<string, unknown>=} data
 * @param {TelemetryLevel=} level
 */
export const trackEvent = (name, data, level = 'info') => {
  const event = {
    id: makeId(),
    time: Date.now(),
    level,
    name,
    data,
  };
  if (shouldLog()) {
    if (level === 'error') {
      console.error(`[MAYA] ${name}`, data);
    } else if (level === 'warn') {
      console.warn(`[MAYA] ${name}`, data);
    } else {
      console.info(`[MAYA] ${name}`, data);
    }
  }
  pushEvent(event);
  return event.id;
};

/**
 * @param {string} name
 * @param {unknown} error
 * @param {Record<string, unknown>=} data
 */
export const trackError = (name, error, data) => {
  return trackEvent(name, { ...data, error: normalizeError(error) }, 'error');
};

export const getTelemetryEvents = () => events.slice();

/** @param {(event: TelemetryEvent) => void} listener */
export const subscribeTelemetry = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const __resetTelemetry = () => {
  events.splice(0, events.length);
  root.__mayaTelemetry = [];
};
