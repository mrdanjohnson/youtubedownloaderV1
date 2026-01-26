// Type definitions for the backend application

export interface CreateSessionRequest {
  youtubeUrl: string;
}

export interface SessionResponse {
  id: string;
  youtube_url: string;
  video_title: string | null;
  srt_text: string | null;
  created_at: string;
  updated_at: string;
  ai_results: AiResult[];
  app_settings: AppSettings;
  video_file_path?: string;
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

export interface RunPromptRequest {
  prompt: string;
  customPrompt?: boolean;
}

export interface RunPromptResponse {
  success: boolean;
  result: AiResult;
  error?: string;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  details?: unknown;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  database: 'connected' | 'disconnected';
}

// Predefined prompts configuration
export interface PredefinedPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  is_default?: boolean;
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

export interface YoutubeDownloadResult {
  success: boolean;
  title: string;
  srtContent: string;
  error?: string;
}
