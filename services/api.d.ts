import type { Note } from '../types';

export const api: {
  health: () => Promise<boolean>;
  getNotes: () => Promise<Note[]>;
  getNotesByTag: (tag: string) => Promise<Note[]>;
  createNote: (note: Omit<Note, 'id' | 'timestamp'>) => Promise<Note>;
  email: {
    search: (query: string) => Promise<any | null>;
    draft: (recipient: string, subject: string, body: string) => Promise<any>;
    send: (recipient: string, subject: string, body: string) => Promise<any>;
  };
  calendar: {
    list: () => Promise<any[]>;
    schedule: (payload: { title: string; time: string; participants?: string }) => Promise<any>;
  };
  market: {
    get: (ticker: string) => Promise<any>;
  };
  integrations: {
    status: () => Promise<{
      provider: 'mock' | 'google' | string;
      mode: string;
      googleConfigured: boolean;
      gmailConnected: boolean;
      calendarConnected: boolean;
      connectedAt: number | null;
    }>;
    connectGoogle: () => Promise<{ authUrl: string }>;
    disconnectGoogle: () => Promise<{ success: boolean }>;
  };
};
