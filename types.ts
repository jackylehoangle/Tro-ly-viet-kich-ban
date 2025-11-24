
export enum AppStatus {
  Config = 'config',
  Loading = 'loading',
  Chatting = 'chatting',
  Error = 'error',
}

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export interface ScriptConfig {
  topic: string;
  length: string;
  sections: string;
  tone: string;
  structure: string; // Narrative structure (AIDA, PAS, etc.)
  audience: string;  // Target audience
  reference: string; // Source material/background info
  language: string;  // New: Output language (Vietnamese/English)
}
