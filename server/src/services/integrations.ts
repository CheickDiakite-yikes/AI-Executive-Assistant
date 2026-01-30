import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { clearIntegrationRecord, getIntegrationRecord, upsertIntegrationRecord, updateIntegrationMetadata } from './integrationStore';

type Credentials = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
};

export type EmailMessage = {
  id: string;
  from: string;
  subject: string;
  body: string;
  avatar?: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  participants: string[];
  location?: string;
};

export class IntegrationError extends Error {
  status: number;
  code: string;

  constructor(message: string, code: string, status = 500) {
    super(message);
    this.name = 'IntegrationError';
    this.status = status;
    this.code = code;
  }
}

// --- Mock Data & Helpers ---

export const mockEmails: EmailMessage[] = [
  {
    id: 'e1',
    from: 'Elon M.',
    subject: 'Re: Starship Updates',
    body: 'The trajectory looks good. Can we schedule a review for the landing sequence tomorrow?',
    avatar: 'https://picsum.photos/id/1/50/50',
  },
  {
    id: 'e2',
    from: 'Sarah Connor',
    subject: 'Project Skynet',
    body: "We need to talk about the neural net processor timeline. It's moving too fast.",
    avatar: 'https://picsum.photos/id/2/50/50',
  },
  {
    id: 'e3',
    from: 'Investments Team',
    subject: 'Q4 Portfolio Review',
    body: "Attached is the summary of Q4 performance. We beat the S&P 500 by 12%. Let's discuss allocation.",
    avatar: 'https://picsum.photos/id/4/50/50',
  },
];

export const mockCalendar: CalendarEvent[] = [
  {
    id: 'c1',
    title: 'Q4 Earnings Prep',
    time: '09:00 AM - 10:00 AM',
    participants: ['CFO', 'Investor Relations'],
    location: 'Boardroom',
  },
  {
    id: 'c2',
    title: 'Strategy Sync',
    time: '10:30 AM - 11:30 AM',
    participants: ['Alice (COO)', 'Product Team'],
    location: 'Conference Room A',
  },
  {
    id: 'c3',
    title: 'Lunch with Jensen',
    time: '12:30 PM - 1:30 PM',
    participants: ['Jensen Huang'],
    location: 'Sushirrito',
  },
  {
    id: 'c4',
    title: 'Board Meeting',
    time: '02:00 PM - 04:00 PM',
    participants: ['Board Members'],
    location: 'Executive Suite',
  },
];

export const searchEmail = (query: string) => {
  const q = query.toLowerCase();
  return mockEmails.find((email) =>
    email.from.toLowerCase().includes(q) || email.subject.toLowerCase().includes(q)
  ) || null;
};

export const listCalendar = () => {
  return [...mockCalendar];
};

export const scheduleCalendarEvent = (event: { title: string; time: string; participants?: string }) => {
  const newEvent: CalendarEvent = {
    id: `c-${Date.now()}`,
    title: event.title,
    time: event.time,
    participants: [event.participants || 'User'],
    location: 'TBD',
  };
  mockCalendar.push(newEvent);
  return newEvent;
};

export const generateMarketData = (ticker: string) => {
  const basePrice = Math.random() * 1000 + 50;
  const changePercent = (Math.random() * 10) - 4;
  const changeAmount = basePrice * (changePercent / 100);
  const history = Array.from({ length: 20 }, () => basePrice * (1 + (Math.random() * 0.1 - 0.05)));

  return {
    ticker: ticker.toUpperCase(),
    companyName: ticker.toUpperCase() === 'TSLA' ? 'Tesla, Inc.' : ticker.toUpperCase() === 'NVDA' ? 'NVIDIA Corp' : `${ticker.toUpperCase()} Corp`,
    price: parseFloat(basePrice.toFixed(2)),
    changeAmount: parseFloat(changeAmount.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    volume: `${(Math.random() * 50 + 10).toFixed(1)}M`,
    peRatio: parseFloat((Math.random() * 50 + 10).toFixed(2)),
    marketCap: `${(Math.random() * 2 + 0.1).toFixed(1)}T`,
    history,
  };
};

// --- Integration Provider Layer ---

const DEFAULT_GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_OAUTH_REDIRECT_URI,
};

const integrationMode = () => (process.env.MAYA_INTEGRATIONS_PROVIDER || 'mock').toLowerCase();
const googleScopes = () => {
  const raw = process.env.GOOGLE_OAUTH_SCOPES || '';
  if (!raw.trim()) return DEFAULT_GOOGLE_SCOPES;
  return raw.split(',').map((scope) => scope.trim()).filter(Boolean);
};

const isGoogleConfigured = () => Boolean(googleConfig.clientId && googleConfig.clientSecret && googleConfig.redirectUri);

const oauthStateToUserId = new Map<string, string>();
const tokenCache = new Map<string, Credentials>();
const connectedAtCache = new Map<string, number>();

const cacheKey = (userId: string) => `google:${userId}`;

const loadTokensFromStore = async (userId: string) => {
  const record = await getIntegrationRecord(userId, 'google');
  if (!record) return null;
  const tokens: Credentials = {
    access_token: record.accessToken || undefined,
    refresh_token: record.refreshToken || undefined,
    token_type: record.tokenType || undefined,
    scope: record.scope || undefined,
    expiry_date: record.expiryDate ? record.expiryDate.getTime() : undefined,
  };
  tokenCache.set(cacheKey(userId), tokens);
  if (record.connectedAt) {
    connectedAtCache.set(cacheKey(userId), record.connectedAt.getTime());
  }
  return tokens;
};

const getCachedTokens = async (userId: string) => {
  const existing = tokenCache.get(cacheKey(userId));
  if (existing) return existing;
  return loadTokensFromStore(userId);
};

const mergeGoogleTokens = async (userId: string, tokens: Credentials) => {
  if (!tokens) return null;
  const key = cacheKey(userId);
  const merged = { ...(tokenCache.get(key) || {}), ...tokens };
  tokenCache.set(key, merged);
  connectedAtCache.set(key, Date.now());

  await upsertIntegrationRecord({
    userId,
    provider: 'google',
    accessToken: merged.access_token || null,
    refreshToken: merged.refresh_token || null,
    tokenType: merged.token_type || null,
    scope: merged.scope || null,
    expiryDate: merged.expiry_date ? new Date(merged.expiry_date) : null,
  });

  return merged;
};

const TOKEN_REFRESH_BUFFER_MS = 60_000;

const requireGoogleConfig = () => {
  if (!isGoogleConfigured()) {
    throw new IntegrationError('Google OAuth is not configured', 'google_not_configured', 503);
  }
};

const exchangeCodeForTokens = async (code: string) => {
  requireGoogleConfig();
  const params = new URLSearchParams();
  params.set('code', code);
  params.set('client_id', googleConfig.clientId || '');
  params.set('client_secret', googleConfig.clientSecret || '');
  params.set('redirect_uri', googleConfig.redirectUri || '');
  params.set('grant_type', 'authorization_code');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    logger.error({ status: res.status, error: data?.error }, 'Google token exchange failed');
    throw new IntegrationError(`Google token exchange failed: ${data.error || res.status}`, 'google_token_exchange_failed', 502);
  }
  const expiryDate = data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : undefined;
  return { ...data, expiry_date: expiryDate } as Credentials;
};

const refreshAccessToken = async (refreshToken: string) => {
  requireGoogleConfig();
  const params = new URLSearchParams();
  params.set('refresh_token', refreshToken);
  params.set('client_id', googleConfig.clientId || '');
  params.set('client_secret', googleConfig.clientSecret || '');
  params.set('grant_type', 'refresh_token');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    logger.error({ status: res.status, error: data?.error }, 'Google token refresh failed');
    throw new IntegrationError(`Google token refresh failed: ${data.error || res.status}`, 'google_token_refresh_failed', 502);
  }
  const expiryDate = data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : undefined;
  return { ...data, expiry_date: expiryDate } as Credentials;
};

const getValidAccessToken = async (userId: string) => {
  const tokens = await getCachedTokens(userId);
  if (!tokens) {
    logger.warn({ userId }, 'Google integration not connected');
    throw new IntegrationError('Google integration not connected', 'google_not_connected', 401);
  }
  const accessToken = tokens.access_token;
  const expiryDate = tokens.expiry_date || 0;
  if (accessToken && expiryDate - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
    return accessToken;
  }
  if (tokens.refresh_token) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    const merged = await mergeGoogleTokens(userId, refreshed);
    if (merged?.access_token) {
      return merged.access_token;
    }
  }
  logger.warn({ userId }, 'Google access token expired');
  throw new IntegrationError('Google access token expired', 'google_token_expired', 401);
};

const googleApiFetch = async (userId: string, url: string, options: RequestInit = {}) => {
  const accessToken = await getValidAccessToken(userId);
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const status = res.status;
    const code = status === 401 ? 'google_not_connected' : 'google_api_error';
    logger.error({ status, url }, 'Google API request failed');
    throw new IntegrationError(`Google API error (${status}): ${text || res.statusText}`, code, status === 401 ? 401 : 502);
  }
  if (res.status === 204) return null;
  return res.json();
};

const selectProvider = () => {
  const mode = integrationMode();
  if (mode === 'google') return 'google';
  if (mode === 'auto') return isGoogleConfigured() ? 'google' : 'mock';
  return 'mock';
};

const formatTimeRange = (start?: string | null, end?: string | null) => {
  if (!start) return 'TBD';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  if (Number.isNaN(startDate.getTime())) return 'TBD';
  const startStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (endDate && !Number.isNaN(endDate.getTime())) {
    const endStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${startStr} - ${endStr}`;
  }
  return startStr;
};

const parseTimePart = (value: string) => {
  const match = value.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number.parseInt(match[1], 10);
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return { hour, minute };
};

const parseTimeRangeInput = (value?: string) => {
  const now = new Date();
  if (!value) {
    const start = new Date(now.getTime() + 15 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return { start, end };
  }

  const rangeParts = value.split('-');
  if (rangeParts.length === 2) {
    const [startRaw, endRaw] = rangeParts;
    const startDate = new Date(startRaw.trim());
    const endDate = new Date(endRaw.trim());
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      return { start: startDate, end: endDate };
    }

    const startTime = parseTimePart(startRaw);
    const endTime = parseTimePart(endRaw);
    if (startTime) {
      const start = new Date(now);
      start.setHours(startTime.hour, startTime.minute, 0, 0);
      const end = new Date(start);
      if (endTime) {
        end.setHours(endTime.hour, endTime.minute, 0, 0);
      } else {
        end.setTime(start.getTime() + 30 * 60 * 1000);
      }
      return { start, end };
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const start = parsed;
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return { start, end };
  }

  const fallbackStart = new Date(now.getTime() + 15 * 60 * 1000);
  const fallbackEnd = new Date(fallbackStart.getTime() + 30 * 60 * 1000);
  return { start: fallbackStart, end: fallbackEnd };
};

const getHeaderValue = (headers: { name?: string; value?: string }[] | undefined, headerName: string) => {
  if (!headers) return null;
  const found = headers.find((h) => h.name?.toLowerCase() === headerName.toLowerCase());
  return found?.value || null;
};

const encodeMessage = (recipient: string, subject: string, body: string) => {
  const message = [
    `To: ${recipient}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const mockEmailProvider = {
  provider: 'mock',
  async search(query: string) {
    const email = query ? searchEmail(query) : mockEmails[0];
    return { email, results: mockEmails };
  },
  async draft(recipient: string, subject: string, body: string) {
    return { status: 'drafted', draft: { recipient, subject, body } };
  },
  async send(recipient: string, subject: string, body: string) {
    return { status: 'sent', recipient, subject, bodyLength: body.length };
  },
};

const createGoogleEmailProvider = (userId: string) => ({
  provider: 'google',
  async search(query: string) {
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    listUrl.searchParams.set('q', query);
    listUrl.searchParams.set('maxResults', '5');
    const list = await googleApiFetch(userId, listUrl.toString(), { method: 'GET' });
    const ids = (list.messages || []).map((msg: { id?: string }) => msg.id).filter(Boolean) as string[];
    if (!ids || ids.length === 0) {
      return { email: null, results: [] };
    }
    const messages = await Promise.all(
      ids.map(async (id) => {
        const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
        msgUrl.searchParams.set('format', 'metadata');
        msgUrl.searchParams.append('metadataHeaders', 'From');
        msgUrl.searchParams.append('metadataHeaders', 'Subject');
        msgUrl.searchParams.append('metadataHeaders', 'Date');
        const msg = await googleApiFetch(userId, msgUrl.toString(), { method: 'GET' });
        const headers = msg.payload?.headers;
        return {
          id,
          from: getHeaderValue(headers, 'From') || 'Unknown',
          subject: getHeaderValue(headers, 'Subject') || 'No subject',
          body: msg.snippet || '',
          avatar: null,
        } as EmailMessage;
      }),
    );

    return { email: messages[0] || null, results: messages };
  },
  async draft(recipient: string, subject: string, body: string) {
    const raw = encodeMessage(recipient, subject, body);
    return googleApiFetch(userId, 'https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      body: JSON.stringify({ message: { raw } }),
    });
  },
  async send(recipient: string, subject: string, body: string) {
    const raw = encodeMessage(recipient, subject, body);
    return googleApiFetch(userId, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw }),
    });
  },
});

const mockCalendarProvider = {
  provider: 'mock',
  async list() {
    return listCalendar();
  },
  async schedule(payload: { title: string; time: string; participants?: string }) {
    const event = scheduleCalendarEvent(payload);
    return { event, events: listCalendar() };
  },
};

const createGoogleCalendarProvider = (userId: string) => ({
  provider: 'google',
  async list() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const listUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    listUrl.searchParams.set('timeMin', startOfDay.toISOString());
    listUrl.searchParams.set('timeMax', endOfDay.toISOString());
    listUrl.searchParams.set('singleEvents', 'true');
    listUrl.searchParams.set('orderBy', 'startTime');

    const res = await googleApiFetch(userId, listUrl.toString(), { method: 'GET' });
    const items = res.items || [];
    return items.map((evt) => {
      const start = evt.start?.dateTime || evt.start?.date || '';
      const end = evt.end?.dateTime || evt.end?.date || '';
      const participants = (evt.attendees || []).map((att) => att.email).filter(Boolean) as string[];
      return {
        id: evt.id || `evt-${Math.random().toString(16).slice(2)}`,
        title: evt.summary || 'Untitled Event',
        time: formatTimeRange(start, end),
        participants: participants.length ? participants : ['You'],
        location: evt.location || 'TBD',
      } as CalendarEvent;
    });
  },
  async schedule(payload: { title: string; time: string; participants?: string }) {
    const { start, end } = parseTimeRangeInput(payload.time);
    const attendees = payload.participants
      ? payload.participants.split(',').map((email) => ({ email: email.trim() })).filter((att) => att.email)
      : undefined;

    const response = await googleApiFetch(userId, 'https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify({
        summary: payload.title,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees,
      }),
    });

    const evt = response;
    const mapped = {
      id: evt.id || `evt-${Math.random().toString(16).slice(2)}`,
      title: evt.summary || payload.title,
      time: formatTimeRange(evt.start?.dateTime || evt.start?.date, evt.end?.dateTime || evt.end?.date),
      participants: attendees ? attendees.map((att) => att.email || 'Unknown') : ['You'],
      location: evt.location || 'TBD',
    } as CalendarEvent;

    return { event: mapped, events: await createGoogleCalendarProvider(userId).list() };
  },
});

const mockMarketProvider = {
  provider: 'mock',
  async get(ticker: string) {
    return generateMarketData(ticker);
  },
};

export const getIntegrationStatus = async (userId: string) => {
  const provider = selectProvider();
  const googleConfigured = isGoogleConfigured();
  let record = null;

  if (provider === 'google') {
    record = await getIntegrationRecord(userId, 'google');
  }

  const connected = provider === 'google' ? Boolean(record?.refreshToken || record?.accessToken) : false;
  const metadata = (record?.metadata || {}) as Record<string, unknown>;

  return {
    provider,
    mode: integrationMode(),
    googleConfigured,
    gmailConnected: connected,
    calendarConnected: connected,
    connectedAt: record?.connectedAt ? record.connectedAt.getTime() : null,
    tokenExpiresAt: record?.expiryDate ? record.expiryDate.getTime() : null,
    metadata,
  };
};

export const getGoogleAuthUrl = (userId: string) => {
  requireGoogleConfig();
  const state = randomUUID();
  oauthStateToUserId.set(state, userId);
  const params = new URLSearchParams();
  params.set('client_id', googleConfig.clientId || '');
  params.set('redirect_uri', googleConfig.redirectUri || '');
  params.set('response_type', 'code');
  params.set('access_type', 'offline');
  params.set('prompt', 'consent');
  params.set('include_granted_scopes', 'true');
  params.set('scope', googleScopes().join(' '));
  params.set('state', state);

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
};

export const handleGoogleCallback = async (code: string, state?: string) => {
  if (!code) {
    throw new IntegrationError('Missing OAuth code', 'missing_code', 400);
  }
  const userId = state ? oauthStateToUserId.get(state) : undefined;
  if (state && !userId) {
    throw new IntegrationError('Invalid OAuth state', 'invalid_state', 400);
  }
  if (state) {
    oauthStateToUserId.delete(state);
  }
  const resolvedUserId = userId || 'default';
  const tokens = await exchangeCodeForTokens(code);
  await mergeGoogleTokens(resolvedUserId, tokens);
  logger.info({ provider: 'google', userId: resolvedUserId }, 'Google OAuth connected');
  return { userId: resolvedUserId, tokens };
};

export const disconnectGoogle = async (userId: string) => {
  tokenCache.delete(cacheKey(userId));
  connectedAtCache.delete(cacheKey(userId));
  await clearIntegrationRecord(userId, 'google');
};

export const getEmailProvider = (userId: string) => {
  const provider = selectProvider();
  return provider === 'google' ? createGoogleEmailProvider(userId) : mockEmailProvider;
};

export const getCalendarProvider = (userId: string) => {
  const provider = selectProvider();
  return provider === 'google' ? createGoogleCalendarProvider(userId) : mockCalendarProvider;
};

export const getMarketProvider = () => {
  return mockMarketProvider;
};

export const runIntegrationHealthCheck = async (userId: string) => {
  const provider = selectProvider();
  const mode = integrationMode();
  const googleConfigured = isGoogleConfigured();

  if (provider !== 'google') {
    return {
      provider,
      mode,
      googleConfigured,
      healthy: true,
      email: { status: 'mock' },
      calendar: { status: 'mock' },
    };
  }

  const result = {
    provider,
    mode,
    googleConfigured,
    healthy: false,
    email: { ok: false as boolean, address: null as string | null, error: null as string | null },
    calendar: { ok: false as boolean, error: null as string | null },
  };

  try {
    const profile = await googleApiFetch(userId, 'https://gmail.googleapis.com/gmail/v1/users/me/profile', { method: 'GET' });
    result.email.ok = true;
    result.email.address = profile.emailAddress || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.email.error = message;
    logger.error({ error, userId }, 'Gmail health check failed');
  }

  try {
    const listUrl = new URL('https://www.googleapis.com/calendar/v3/users/me/calendarList');
    listUrl.searchParams.set('maxResults', '1');
    await googleApiFetch(userId, listUrl.toString(), { method: 'GET' });
    result.calendar.ok = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.calendar.error = message;
    logger.error({ error, userId }, 'Calendar health check failed');
  }

  result.healthy = result.email.ok && result.calendar.ok;

  try {
    await updateIntegrationMetadata(userId, 'google', {
      lastHealthCheckAt: new Date().toISOString(),
      lastHealthStatus: result.healthy ? 'ok' : 'error',
      lastHealthError: !result.healthy ? { email: result.email.error, calendar: result.calendar.error } : null,
      emailAddress: result.email.address,
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to store integration health metadata');
  }

  return result;
};
