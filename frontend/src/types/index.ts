// Type definitions for the frontend application

export interface SessionResponse {
  id: string;
  youtube_url: string;
  video_title: string | null;
  srt_text: string | null;  video_file_path: string | null;  created_at: string;
  updated_at: string;
  ai_results: AiResult[];
  app_settings: AppSettings;
}

export interface AiResult {
  id: string;
  prompt: string;
  response: string;
  model: string;
  timestamp: string;
}

export interface AppSettings {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface PredefinedPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePromptRequest {
  name: string;
  description: string;
  prompt: string;
}

export interface UpdatePromptRequest {
  name?: string;
  description?: string;
  prompt?: string;
}

export interface LlmSettings {
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface UpdateLlmSettingsRequest {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  details?: unknown;
}

export interface CreateSessionRequest {
  youtubeUrl: string;
}

export interface RunPromptRequest {
  prompt: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
