/// <reference types="vite/client" />
import axios from 'axios';
import { SessionResponse, PredefinedPrompt, CreatePromptRequest, UpdatePromptRequest, LlmSettings, UpdateLlmSettingsRequest } from '../types';

// Simple: use relative URLs (same domain through reverse proxy) or direct backend port
const API_URL = import.meta.env.VITE_API_URL || '';

console.log('[API Client] Using API URL:', API_URL || 'relative URLs');

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Types for API responses
interface CreateSessionResponse {
  success: boolean;
  data: SessionResponse;
  error?: string;
}

interface GetSessionResponse {
  success: boolean;
  data: SessionResponse;
  error?: string;
}

interface GetAllSessionsResponse {
  success: boolean;
  data: SessionResponse[];
  error?: string;
}

interface RunPromptResponse {
  success: boolean;
  result: {
    id: string;
    prompt: string;
    response: string;
    model: string;
    timestamp: string;
  };
  data: SessionResponse;
  error?: string;
}

interface GetPromptsResponse {
  success: boolean;
  data: PredefinedPrompt[];
}

// API functions
export const apiClient = {
  // Create a new session
  async createSession(youtubeUrl: string, cleanText: boolean = false, downloadVideo: boolean = false): Promise<CreateSessionResponse> {
    const response = await api.post<CreateSessionResponse>('/api/session', {
      youtubeUrl,
      cleanText,
      downloadVideo
    });
    return response.data;
  },

  // Download video file
  async downloadVideo(id: string): Promise<Blob> {
    const response = await api.get(`/api/session/${id}/video`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get session by ID
  async getSession(id: string): Promise<GetSessionResponse> {
    const response = await api.get<GetSessionResponse>(`/api/session/${id}`);
    return response.data;
  },

  // Get all sessions
  async getAllSessions(): Promise<GetAllSessionsResponse> {
    const response = await api.get<GetAllSessionsResponse>('/api/session');
    return response.data;
  },

  // Download SRT file
  async downloadSrt(id: string): Promise<Blob> {
    const response = await api.get(`/api/session/${id}/srt`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Run AI prompt
  async runPrompt(id: string, prompt: string): Promise<RunPromptResponse> {
    console.log(`[API] Running prompt on session ${id}:`, prompt.substring(0, 100));
    const startTime = Date.now();
    
    const response = await api.post<RunPromptResponse>(`/api/session/${id}/run-prompt`, {
      prompt
    });
    
    const duration = Date.now() - startTime;
    console.log(`[API] Prompt completed in ${duration}ms`);
    
    return response.data;
  },

  // Get predefined prompts
  async getPrompts(): Promise<GetPromptsResponse> {
    const response = await api.get<GetPromptsResponse>('/api/session/prompts/list');
    return response.data;
  },

  // Delete session
  async deleteSession(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/session/${id}`);
    return response.data;
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get('/health');
    return response.data;
  },

  // Settings API methods
  
  // Get all prompts
  async getAllPrompts(): Promise<{ success: boolean; data: PredefinedPrompt[] }> {
    const response = await api.get('/api/settings/prompts');
    return response.data;
  },

  // Create new prompt
  async createPrompt(data: CreatePromptRequest): Promise<{ success: boolean; data: PredefinedPrompt }> {
    const response = await api.post('/api/settings/prompts', data);
    return response.data;
  },

  // Update prompt
  async updatePrompt(id: string, data: UpdatePromptRequest): Promise<{ success: boolean; data: PredefinedPrompt }> {
    const response = await api.put(`/api/settings/prompts/${id}`, data);
    return response.data;
  },

  // Delete prompt
  async deletePrompt(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/settings/prompts/${id}`);
    return response.data;
  },

  // Get LLM settings
  async getLlmSettings(): Promise<{ success: boolean; data: LlmSettings }> {
    const response = await api.get('/api/settings/llm');
    return response.data;
  },

  // Update LLM settings
  async updateLlmSettings(data: UpdateLlmSettingsRequest): Promise<{ success: boolean; data: LlmSettings }> {
    const response = await api.put('/api/settings/llm', data);
    return response.data;
  }
};

export default apiClient;
