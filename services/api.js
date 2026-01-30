const resolveApiBase = () => {
  if (typeof window !== 'undefined') {
    return window.__MAYA_API_BASE || '';
  }
  return process.env.MAYA_API_BASE || 'http://localhost:3001';
};

const API_BASE = resolveApiBase();

const getUserId = () => {
  if (typeof window === 'undefined') {
    return process.env.MAYA_USER_ID || 'default';
  }
  if (window.__MAYA_USER_ID) {
    return window.__MAYA_USER_ID;
  }
  const storageKey = 'maya_user_id';
  let userId = window.localStorage.getItem(storageKey);
  if (!userId) {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      userId = crypto.randomUUID();
    } else {
      userId = `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    window.localStorage.setItem(storageKey, userId);
  }
  return userId;
};

const request = async (path, options = {}) => {
  const baseHeaders = {
    'x-user-id': getUserId(),
  };
  const mergedHeaders = {
    ...baseHeaders,
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

export const api = {
  health: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      return res.ok;
    } catch (e) {
      console.error('Health check failed:', e);
      return false;
    }
  },

  getNotes: async () => {
    const data = await request('/api/notes');
    return data.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      attachmentUrl: n.attachmentUrl,
      tags: n.tags,
      timestamp: new Date(n.createdAt).getTime(),
    }));
  },

  getNotesByTag: async (tag) => {
    const data = await request(`/api/notes/tag/${encodeURIComponent(tag)}`);
    return data.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      attachmentUrl: n.attachmentUrl,
      tags: n.tags,
      timestamp: new Date(n.createdAt).getTime(),
    }));
  },

  createNote: async (note) => {
    const n = await request('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    return {
      id: n.id,
      title: n.title,
      content: n.content,
      attachmentUrl: n.attachmentUrl,
      tags: n.tags,
      timestamp: new Date(n.createdAt).getTime(),
    };
  },

  email: {
    search: async (query) => {
      const data = await request(`/api/email/search?query=${encodeURIComponent(query)}`);
      return data.email || null;
    },
    draft: async (recipient, subject, body) => {
      return request('/api/email/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, subject, body }),
      });
    },
    send: async (recipient, subject, body) => {
      return request('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, subject, body }),
      });
    },
  },

  calendar: {
    list: async () => {
      const data = await request('/api/calendar');
      return data.events || [];
    },
    schedule: async (payload) => {
      return request('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
  },

  market: {
    get: async (ticker) => {
      return request(`/api/market/${encodeURIComponent(ticker)}`);
    },
  },

  integrations: {
    status: async () => {
      return request('/api/integrations/status');
    },
    connectGoogle: async () => {
      return request('/api/integrations/google/connect', {
        method: 'POST',
      });
    },
    disconnectGoogle: async () => {
      return request('/api/integrations/google/disconnect', {
        method: 'POST',
      });
    },
    health: async () => {
      return request('/api/integrations/health');
    },
  },
};
