// YouTube SRT download service using yt-dlp
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { YoutubeDownloadResult } from '../types';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

// Global event emitter for progress tracking
export const progressEmitter = new EventEmitter();

/**
 * Downloads subtitles from a YouTube video using yt-dlp
 * @param youtubeUrl - The YouTube video URL
 * @param sessionId - Optional session ID for progress tracking
 * @returns Promise<YoutubeDownloadResult>
 */
export async function downloadSubtitles(youtubeUrl: string, sessionId?: string): Promise<YoutubeDownloadResult> {
  const tempDir = '/tmp';
  const tempId = uuidv4();
  const tempOutputPattern = path.join(tempDir, tempId);

  try {
    // Validate YouTube URL format
    if (!isValidYouTubeUrl(youtubeUrl)) {
      return {
        success: false,
        title: '',
        srtContent: '',
        error: 'Invalid YouTube URL format'
      };
    }

    // Step 1: Get video title
    if (sessionId) {
      progressEmitter.emit('progress', { sessionId, stage: 'title', progress: 10 });
    }
    
    console.log(`[YouTubeService] Fetching title for: ${youtubeUrl}`);
    const { stdout: titleOutput } = await execAsync(
      `yt-dlp --get-title "${youtubeUrl}"`,
      { timeout: 30000 }
    );
    const videoTitle = titleOutput.trim();

    // Step 2: Download subtitles (try auto-generated first, then any available)
    if (sessionId) {
      progressEmitter.emit('progress', { sessionId, stage: 'subtitles', progress: 30 });
    }
    
    console.log(`[YouTubeService] Downloading subtitles for: ${youtubeUrl}`);

    let subtitleDownloaded = false;
    try {
      // Try to download auto-generated English subtitles
      await execAsync(
        `yt-dlp --write-auto-sub --sub-lang en --skip-download -o "${tempOutputPattern}" "${youtubeUrl}"`,
        { timeout: 120000 }
      );
      subtitleDownloaded = true;
    } catch (subError: unknown) {
      console.log(`[YouTubeService] Auto-generated subs not available, trying manual subs`);
      // Try downloading manual English subtitles
      try {
        await execAsync(
          `yt-dlp --write-subs --sub-lang en --skip-download -o "${tempOutputPattern}" "${youtubeUrl}"`,
          { timeout: 120000 }
        );
        subtitleDownloaded = true;
      } catch (allSubError: unknown) {
        const errorMsg = allSubError instanceof Error ? allSubError.message : 'Unknown error';
        console.error(`[YouTubeService] Failed to download subtitles: ${errorMsg}`);
        return {
          success: false,
          title: videoTitle,
          srtContent: '',
          error: 'No subtitles available for this video'
        };
      }
    }

    // Step 3: Find the VTT file (yt-dlp creates files with specific naming)
    const files = fs.readdirSync(tempDir);
    const vttFile = files.find(f => f.startsWith(tempId) && f.endsWith('.vtt'));
    
    if (!vttFile) {
      console.error(`[YouTubeService] VTT file not found in ${tempDir}. Files: ${files.join(', ')}`);
      return {
        success: false,
        title: videoTitle,
        srtContent: '',
        error: 'Subtitle file was not created'
      };
    }

    const tempVttPath = path.join(tempDir, vttFile);

    // Step 4: Convert VTT to SRT format
    console.log(`[YouTubeService] Converting VTT to SRT: ${vttFile}`);
    const vttContent = fs.readFileSync(tempVttPath, 'utf-8');
    const srtContent = convertVttToSrt(vttContent);

    // Step 5: Clean up temporary files
    try {
      fs.unlinkSync(tempVttPath);
    } catch (cleanupError) {
      console.warn('[YouTubeService] Failed to clean up temp VTT file');
    }

    console.log(`[YouTubeService] Successfully downloaded subtitles for: ${videoTitle}`);

    if (sessionId) {
      progressEmitter.emit('progress', { sessionId, stage: 'subtitles_complete', progress: 50 });
    }

    return {
      success: true,
      title: videoTitle,
      srtContent
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[YouTubeService] Error downloading subtitles: ${errorMessage}`);

    // Clean up any partial files
    try {
      const files = fs.readdirSync(tempDir);
      files.filter(f => f.startsWith(tempId)).forEach(f => {
        fs.unlinkSync(path.join(tempDir, f));
      });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    return {
      success: false,
      title: '',
      srtContent: '',
      error: `Failed to download subtitles: ${errorMessage}`
    };
  }
}

/**
 * Validates if a string is a valid YouTube URL
 * @param url - The URL to validate
 * @returns boolean
 */
function isValidYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return youtubeRegex.test(url);
}

/**
 * Converts VTT (WebVTT) subtitle format to SRT format
 * @param vttContent - The VTT formatted content
 * @returns string - SRT formatted content
 */
function convertVttToSrt(vttContent: string): string {
  // Remove WebVTT header if present
  let content = vttContent.replace(/^WEBVTT.*?\n\n/s, '');

  // Get SRT counter
  let counter = 1;

  // Split into subtitle blocks (separated by double newlines or timestamps)
  const blocks = content.split(/\n\n+/);

  const srtLines: string[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length === 0) continue;

    let textLines: string[] = [];
    let timestampLine = '';

    // Find the timestamp line and text lines
    for (const line of lines) {
      if (line.includes('-->')) {
        timestampLine = line;
      } else if (line.trim() && !line.match(/^\d+$/)) {
        // Remove inline timecodes like <00:00:15.000> that cause duplication
        const cleanLine = line.trim().replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '');
        if (cleanLine) {
          textLines.push(cleanLine);
        }
      }
    }

    if (!timestampLine || textLines.length === 0) continue;

    // Convert timestamp format from VTT to SRT
    const convertedTimestamp = convertVttTimestampToSrt(timestampLine);

    // Build SRT block
    srtLines.push(String(counter));
    srtLines.push(convertedTimestamp);
    srtLines.push(textLines.join('\n'));
    srtLines.push(''); // Empty line between blocks

    counter++;
  }

  return srtLines.join('\n');
}

/**
 * Converts VTT timestamp format to SRT timestamp format
 * VTT uses format: MM:SS.mmm -> SRT uses: HH:MM:SS,mmm
 * @param vttTimestamp - The VTT timestamp
 * @returns string - SRT formatted timestamp
 */
function convertVttTimestampToSrt(vttTimestamp: string): string {
  // Extract hours if present, otherwise add them
  const parts = vttTimestamp.split('-->');
  if (parts.length !== 2) return vttTimestamp;

  const startTime = parts[0].trim();
  const endTime = parts[1].trim();

  const convertTime = (time: string): string => {
    // VTT format: MM:SS.mmm or HH:MM:SS.mmm
    const timeParts = time.split(':');

    if (timeParts.length === 2) {
      // MM:SS.mmm -> HH:MM:SS,mmm
      return `00:${timeParts[0]}:${timeParts[1].replace('.', ',')}`;
    } else if (timeParts.length === 3) {
      // HH:MM:SS.mmm -> HH:MM:SS,mmm
      return `${timeParts[0]}:${timeParts[1]}:${timeParts[2].replace('.', ',')}`;
    }
    return time;
  };

  return `${convertTime(startTime)} --> ${convertTime(endTime)}`;
}

/**
 * Downloads the highest quality video from YouTube
 * @param youtubeUrl - The YouTube video URL
 * @param sessionId - The session ID for file naming
 * @returns Promise<{success: boolean, filePath?: string, error?: string}>
 */
export async function downloadVideo(youtubeUrl: string, sessionId: string): Promise<{success: boolean, filePath?: string, error?: string}> {
  const tempDir = '/tmp';
  const outputPath = path.join(tempDir, `${sessionId}.%(ext)s`);

  try {
    progressEmitter.emit('progress', { sessionId, stage: 'video', progress: 60 });
    console.log(`[YouTubeService] Downloading video for: ${youtubeUrl}`);
    
    // Download best quality video (merges video+audio if needed)
    await execAsync(
      `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${youtubeUrl}"`,
      { timeout: 600000 } // 10 minute timeout for large videos
    );

    // Find the downloaded file
    const files = fs.readdirSync(tempDir);
    const videoFile = files.find(f => f.startsWith(sessionId) && (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv')));
    
    if (!videoFile) {
      console.error(`[YouTubeService] Video file not found after download`);
      return {
        success: false,
        error: 'Video file was not created'
      };
    }

    const videoFilePath = path.join(tempDir, videoFile);
    console.log(`[YouTubeService] Successfully downloaded video: ${videoFile}`);
    progressEmitter.emit('progress', { sessionId, stage: 'complete', progress: 100 });
    return {
      success: true,
      filePath: videoFilePath
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[YouTubeService] Error downloading video: ${errorMessage}`);

    return {
      success: false,
      error: `Failed to download video: ${errorMessage}`
    };
  }
}

/**
 * Gets the SRT file path for a session
 * @param sessionId - The session ID
 * @returns string - The file path
 */
export function getSrtFilePath(sessionId: string): string {
  return `/tmp/${sessionId}.srt`;
}

/**
 * Gets the video file path for a session
 * @param sessionId - The session ID
 * @returns string | null - The file path if exists
 */
export function getVideoFilePath(sessionId: string): string | null {
  const tempDir = '/tmp';
  const files = fs.readdirSync(tempDir);
  const videoFile = files.find(f => f.startsWith(sessionId) && (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv')));
  
  if (!videoFile) {
    return null;
  }
  
  return path.join(tempDir, videoFile);
}

/**
 * Saves SRT content to a file
 * @param sessionId - The session ID
 * @param content - The SRT content
 */
export function saveSrtToFile(sessionId: string, content: string): void {
  const filePath = getSrtFilePath(sessionId);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Reads SRT content from a file
 * @param sessionId - The session ID
 * @returns string | null - The SRT content or null if file doesn't exist
 */
export function readSrtFromFile(sessionId: string): string | null {
  const filePath = getSrtFilePath(sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Cleans SRT content by removing sequence numbers, timestamps, and formatting
 * Returns only the spoken text for cleaner LLM processing
 * @param srtContent - The SRT content to clean
 * @returns string - Clean text content
 */
export function cleanSrtContent(srtContent: string): string {
  const lines = srtContent.split('\n');
  const cleanedLines: string[] = [];
  const seenLines = new Set<string>(); // Track unique lines to avoid duplicates
  
  for (const line of lines) {
    let trimmed = line.trim();
    
    // Skip sequence numbers
    if (trimmed.match(/^\d+$/)) continue;
    
    // Skip timestamp lines
    if (trimmed.includes('-->')) continue;
    
    // Skip alignment/position tags
    if (trimmed.match(/^align:/i) || trimmed.match(/^position:/i)) continue;
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Remove all VTT tags: <c>, </c>, <v>, </v>, <i>, </i>, <b>, </b>, etc.
    trimmed = trimmed.replace(/<\/?[^>]+>/g, '');
    
    // Remove inline timecodes like <00:00:00.000>
    trimmed = trimmed.replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '');
    
    // Remove HTML entities like &gt;&gt;, &lt;, &amp;, etc.
    trimmed = trimmed.replace(/&[a-z]+;/gi, '');
    
    // Clean up any remaining artifacts
    trimmed = trimmed.trim();
    
    // Skip if empty after cleaning
    if (!trimmed) continue;
    
    // Skip duplicate lines
    if (seenLines.has(trimmed)) continue;
    
    seenLines.add(trimmed);
    cleanedLines.push(trimmed);
  }
  
  return cleanedLines.join('\n');
}
