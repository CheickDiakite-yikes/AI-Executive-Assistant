import { Note } from '../types';

const API_BASE = 'http://localhost:3001/api';

export const api = {
    health: async (): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE}/health`);
            return res.ok;
        } catch (e) {
            console.error("Health check failed:", e);
            return false;
        }
    },

    getNotes: async (): Promise<Note[]> => {
        const res = await fetch(`${API_BASE}/notes`);
        if (!res.ok) throw new Error('Failed to fetch notes');
        const data = await res.json();
        // Convert DB fields (createdAt) to Note interface (timestamp)
        return data.map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            attachmentUrl: n.attachmentUrl,
            tags: n.tags,
            timestamp: new Date(n.createdAt).getTime()
        }));
    },

    createNote: async (note: Omit<Note, 'id' | 'timestamp'>): Promise<Note> => {
        const res = await fetch(`${API_BASE}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(note)
        });
        if (!res.ok) throw new Error('Failed to create note');
        const n = await res.json();
        return {
            id: n.id,
            title: n.title,
            content: n.content,
            attachmentUrl: n.attachmentUrl,
            tags: n.tags,
            timestamp: new Date(n.createdAt).getTime()
        };
    }
};
