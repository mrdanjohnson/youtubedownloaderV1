// Session controller - handles all session-related API operations
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  SessionResponse,
  RunPromptRequest,
  RunPromptResponse,
  ErrorResponse,
  CreateSessionRequest,
  AppSettings
} from '../types';
import { downloadSubtitles, saveSrtToFile, cleanSrtContent, downloadVideo, getVideoFilePath, progressEmitter } from '../services/youtube.service';
import { processWithAi, validateAiConfig } from '../services/ai.service';

const prisma = new PrismaClient();

/**
 * Creates a new session and downloads subtitles from YouTube
 * POST /api/session
 */
export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    const { youtubeUrl, cleanText = false, downloadVideo: shouldDownloadVideo = false } = req.body as CreateSessionRequest & { cleanText?: boolean, downloadVideo?: boolean };

    // Validate input
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      res.status(400).json({
        success: false,
        error: 'YouTube URL is required and must be a string'
      } as ErrorResponse);
      return;
    }

    // Generate session ID first for progress tracking
    const sessionId = uuidv4();

    // Download subtitles
    console.log(`[SessionController] Creating session for URL: ${youtubeUrl}, cleanText: ${cleanText}, downloadVideo: ${shouldDownloadVideo}`);
    const downloadResult = await downloadSubtitles(youtubeUrl, sessionId);

    if (!downloadResult.success) {
      console.error(`[SessionController] Download failed: ${downloadResult.error}`);
      res.status(400).json({
        success: false,
        error: downloadResult.error || 'Failed to download subtitles',
        details: { title: downloadResult.title }
      } as ErrorResponse);
      return;
    }

    // Clean subtitles if requested
    const finalSrtContent = cleanText 
      ? cleanSrtContent(downloadResult.srtContent)
      : downloadResult.srtContent;

    // Download video if requested
    let videoFilePath: string | null = null;
    if (shouldDownloadVideo) {
      console.log(`[SessionController] Downloading video for session: ${sessionId}`);
      const videoResult = await downloadVideo(youtubeUrl, sessionId);
      if (videoResult.success && videoResult.filePath) {
        videoFilePath = videoResult.filePath;
        console.log(`[SessionController] Video downloaded: ${videoFilePath}`);
      } else {
        console.warn(`[SessionController] Video download failed: ${videoResult.error}`);
      }
    }

    // Create session in database
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        youtube_url: youtubeUrl,
        video_title: downloadResult.title,
        srt_text: finalSrtContent,
        video_file_path: videoFilePath
      }
    });

    // Save SRT to file for download
    saveSrtToFile(session.id, finalSrtContent);

    console.log(`[SessionController] Session created: ${session.id}`);

    // Return session data immediately (don't wait for AI summary)
    res.status(201).json({
      success: true,
      data: formatSessionResponse(session)
    });

    // Auto-run summarize prompt in background (non-blocking)
    setImmediate(async () => {
      try {
        const summarizePrompt = await prisma.prompt.findUnique({
          where: { id: 'summarize' }
        });

        if (summarizePrompt && finalSrtContent) {
          console.log(`[SessionController] Auto-running summarize prompt for session: ${session.id}`);
          
          // Get LLM settings
          const llmSettings = await prisma.appSetting.findMany({
            where: {
              key: {
                in: ['llm_model', 'llm_max_tokens', 'llm_temperature']
              }
            }
          });

          const appSettings: AppSettings = {
            model: llmSettings.find(s => s.key === 'llm_model')?.value || 'gpt-3.5-turbo',
            maxTokens: parseInt(llmSettings.find(s => s.key === 'llm_max_tokens')?.value || '4000'),
            temperature: parseFloat(llmSettings.find(s => s.key === 'llm_temperature')?.value || '0.7')
          };

          // Run AI summary
          const aiResult = await processWithAi(finalSrtContent, summarizePrompt.prompt, appSettings);

          // Update session with summary (cast to JSON for Prisma)
          await prisma.session.update({
            where: { id: session.id },
            data: {
              ai_results: [aiResult] as any
            }
          });

          console.log(`[SessionController] Auto-summary completed for session: ${session.id}`);
        }
      } catch (summaryError) {
        console.error(`[SessionController] Failed to auto-run summary:`, summaryError);
        // Don't fail - summary is non-critical
      }
    });

  } catch (error: unknown) {
    console.error('[SessionController] Error creating session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Gets session details by ID
 * GET /api/session/:id
 */
export async function getSession(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!isValidUuid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      } as ErrorResponse);
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      } as ErrorResponse);
      return;
    }

    res.json({
      success: true,
      data: formatSessionResponse(session)
    });

  } catch (error: unknown) {
    console.error('[SessionController] Error fetching session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Downloads SRT file for a session
 * GET /api/session/:id/srt
 */
export async function downloadSrt(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!isValidUuid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      } as ErrorResponse);
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      } as ErrorResponse);
      return;
    }

    if (!session.srt_text) {
      res.status(404).json({
        success: false,
        error: 'No SRT content available for this session'
      } as ErrorResponse);
      return;
    }

    // Set headers for file download
    const filename = `subtitles_${session.video_title || session.id}.srt`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(session.srt_text);

  } catch (error: unknown) {
    console.error('[SessionController] Error downloading SRT:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to download SRT file',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Downloads video file for a session
 * GET /api/session/:id/video
 */
export async function downloadVideoFile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!isValidUuid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      } as ErrorResponse);
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      } as ErrorResponse);
      return;
    }

    if (!session.video_file_path) {
      res.status(404).json({
        success: false,
        error: 'No video file available for this session'
      } as ErrorResponse);
      return;
    }

    // Get the video file path
    const videoPath = await getVideoFilePath(session.id);
    if (!videoPath) {
      res.status(404).json({
        success: false,
        error: 'Video file not found on server'
      } as ErrorResponse);
      return;
    }

    // Import fs for streaming
    const fs = await import('fs');
    const path = await import('path');

    // Set headers for video download
    const filename = `${session.video_title || session.id}${path.extname(videoPath)}`;
    const stat = fs.statSync(videoPath);
    
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // Stream the file
    const readStream = fs.createReadStream(videoPath);
    readStream.pipe(res);

  } catch (error: unknown) {
    console.error('[SessionController] Error downloading video:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to download video file',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Updates a session
 * PUT /api/session/:id
 */
export async function updateSession(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate UUID format
    if (!isValidUuid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      } as ErrorResponse);
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      } as ErrorResponse);
      return;
    }

    // Update session
    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        ...updates,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      data: formatSessionResponse(updatedSession)
    });

  } catch (error: unknown) {
    console.error('[SessionController] Error updating session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to update session',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Deletes a session
 * DELETE /api/session/:id
 */
export async function deleteSession(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!isValidUuid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      } as ErrorResponse);
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      } as ErrorResponse);
      return;
    }

    // Delete associated video file if it exists
    if (session.video_file_path) {
      try {
        const fs = await import('fs');
        const videoPath = await getVideoFilePath(session.id);
        if (videoPath && fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
          console.log(`[SessionController] Deleted video file: ${videoPath}`);
        }
      } catch (fileError) {
        console.warn(`[SessionController] Failed to delete video file:`, fileError);
        // Continue with session deletion even if file deletion fails
      }
    }

    await prisma.session.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error: unknown) {
    console.error('[SessionController] Error deleting session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Runs an AI prompt on session content
 * POST /api/session/:id/run-prompt
 */
export async function runPrompt(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { prompt, customPrompt } = req.body as RunPromptRequest;

    // Validate UUID format
    if (!isValidUuid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      } as ErrorResponse);
      return;
    }

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a non-empty string'
      } as ErrorResponse);
      return;
    }

    if (prompt.length > 5000) {
      res.status(400).json({
        success: false,
        error: 'Prompt is too long (maximum 5000 characters)'
      } as ErrorResponse);
      return;
    }

    // Get session
    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      } as ErrorResponse);
      return;
    }

    if (!session.srt_text) {
      res.status(400).json({
        success: false,
        error: 'No subtitle content available for analysis'
      } as ErrorResponse);
      return;
    }

    // Parse existing AI results
    const existingResults = Array.isArray(session.ai_results) ? session.ai_results : [];

    // Get global LLM settings from database
    const llmSettings = await prisma.appSetting.findMany({
      where: {
        key: {
          in: ['llm_model', 'llm_max_tokens', 'llm_temperature']
        }
      }
    });

    // Convert database settings to AppSettings format
    const appSettings: AppSettings = {
      model: llmSettings.find(s => s.key === 'llm_model')?.value || 'gpt-3.5-turbo',
      maxTokens: parseInt(llmSettings.find(s => s.key === 'llm_max_tokens')?.value || '4000'),
      temperature: parseFloat(llmSettings.find(s => s.key === 'llm_temperature')?.value || '0.7')
    };

    console.log(`[SessionController] Using LLM settings: model=${appSettings.model}, maxTokens=${appSettings.maxTokens}, temperature=${appSettings.temperature}`);

    // Validate AI configuration
    if (!validateAiConfig(appSettings)) {
      res.status(400).json({
        success: false,
        error: 'Invalid AI configuration'
      } as ErrorResponse);
      return;
    }

    // Process with AI
    console.log(`[SessionController] Running prompt on session: ${id}`);
    const aiResult = await processWithAi(session.srt_text, prompt, appSettings);

    // Add new result to existing results
    const updatedResults = [...existingResults, aiResult];

    // Update session with new AI result
    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        ai_results: updatedResults as any,
        updated_at: new Date()
      }
    });

    console.log(`[SessionController] AI prompt completed for session: ${id}`);

    res.json({
      success: true,
      result: aiResult,
      data: formatSessionResponse(updatedSession)
    } as RunPromptResponse & { data: SessionResponse });

  } catch (error: unknown) {
    console.error('[SessionController] Error running prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to run AI prompt',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Gets list of all sessions
 * GET /api/sessions
 */
export async function getAllSessions(req: Request, res: Response): Promise<void> {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        youtube_url: true,
        video_title: true,
        created_at: true,
        updated_at: true
      }
    });

    res.json({
      success: true,
      data: sessions
    });

  } catch (error: unknown) {
    console.error('[SessionController] Error fetching sessions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Gets list of predefined prompts from database
 * GET /api/prompts
 */
export async function getPredefinedPrompts(req: Request, res: Response): Promise<void> {
  try {
    const prompts = await prisma.prompt.findMany({
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'asc' }
      ]
    });
    
    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prompts'
    });
  }
}

/**
 * SSE endpoint for progress tracking
 * GET /api/session/:id/progress
 */
export async function getProgress(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ stage: 'connected', progress: 0 })}\n\n`);

  // Listen for progress events for this session
  const progressHandler = (data: { sessionId: string; stage: string; progress: number }) => {
    if (data.sessionId === id) {
      res.write(`data: ${JSON.stringify({ stage: data.stage, progress: data.progress })}\n\n`);
      
      // Close connection when complete
      if (data.stage === 'complete' || data.stage === 'error') {
        setTimeout(() => {
          progressEmitter.removeListener('progress', progressHandler);
          res.end();
        }, 500);
      }
    }
  };

  progressEmitter.on('progress', progressHandler);

  // Clean up on client disconnect
  req.on('close', () => {
    progressEmitter.removeListener('progress', progressHandler);
    res.end();
  });
}

/**
 * Formats session data for API response
 */
function formatSessionResponse(session: any): SessionResponse {
  return {
    id: session.id,
    youtube_url: session.youtube_url,
    video_title: session.video_title,
    srt_text: session.srt_text,
    created_at: session.created_at.toISOString(),
    updated_at: session.updated_at.toISOString(),
    ai_results: Array.isArray(session.ai_results) ? session.ai_results : [],
    app_settings: session.app_settings || {},
    video_file_path: session.video_file_path || undefined
  };
}

/**
 * Validates UUID format
 */
function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
