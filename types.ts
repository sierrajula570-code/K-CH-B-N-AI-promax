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
  timestamp: number;
  templateTitle: string;
  inputPreview: string;
  content: string;
}