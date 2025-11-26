
export interface ScriptTemplate {
  id: string;
  icon: string;
  title: string;
  description: string;
  systemPromptAddon: string;
}

export interface LanguageOption {
  id: string;
  label: string;
  code: string; // e.g., 'vi', 'en', 'zh'
}

export interface DurationOption {
  id: string;
  label: string;
  promptDescription: string;
}

export interface PerspectiveOption {
  id: string;
  label: string;
  description: string;
}

export interface GeneratedScriptResponse {
  title: string;
  content: string;
}

export enum InputMode {
  IDEA = 'idea',
  TEXT = 'text',
  LINK = 'link'
}

export interface HistoryItem {
  id: string;
  userId?: string; // Optional linkage to user
  timestamp: number;
  templateId: string; // Required for AI Auto-Learning
  templateTitle: string;
  inputPreview: string;
  content: string;
}

// Dữ liệu dùng để training/RAG, không gắn với user cụ thể để bảo mật
export interface GlobalKnowledgeItem {
  id: string;
  input: string;
  output: string;
  templateId: string;
  languageId: string;
  timestamp: number;
  qualityScore?: number; // Điểm chất lượng (có thể thêm sau này)
}

// --- NEW: ANALYSIS DATA TYPE ---
export interface ScriptAnalysis {
  outline: string[]; // 7 steps
  characters: string[]; // List of characters with roles
  pacingNote: string;
}

// --- AI INTEGRAION TYPES ---
export type AIProvider = 'google' | 'openai' | 'anthropic' | 'xai';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  isPremium?: boolean; // Visual badge
}
