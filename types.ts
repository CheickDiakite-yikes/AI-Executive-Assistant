
export interface CanvasItem {
  id: string;
  type: 'email' | 'email-draft' | 'calendar' | 'image' | 'code' | 'memory' | 'generated-image' | 'system-notification' | 'chart' | 'web-search' | 'note' | 'note-search-results' | 'dossier' | 'financial-ticker' | 'strategy-memo';
  title: string;
  content: any;
  timestamp: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  attachmentUrl?: string; // For screenshots or images associated with the note
  tags?: string[];
}

export interface EmailData {
  from: string;
  subject: string;
  body: string;
  avatar: string;
}

export interface CalendarEvent {
  title: string;
  time: string;
  participants: string[];
  location: string;
}

export interface FinancialData {
  ticker: string;
  companyName: string;
  price: number;
  changeAmount: number;
  changePercent: number;
  volume: string;
  peRatio: number;
  marketCap: string;
  history: number[]; // Array of prices for sparkline
}

export interface DossierContent {
  name: string;
  role: string;
  company: string;
  imageUrl?: string;
  recentNews: Array<{ title: string; source: string; date: string }>;
  lastInteraction: string;
}

export interface StrategyMemoContent {
  title: string;
  date: string;
  risks: string[];
  decisions: string[];
  actionItems: Array<{ task: string; assignee: string; dueDate: string }>;
}

export enum AgentState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
}

export interface AgentPersona {
  id: string;
  name: string;
  description: string;
  voiceName: string;
  color: string;
}
