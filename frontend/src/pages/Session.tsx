import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiClient } from '../api/client';
import { SessionResponse, PredefinedPrompt } from '../types';
import SrtViewer from '../components/SrtViewer';
import PromptRunner from '../components/PromptRunner';

function Session() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [prompts, setPrompts] = useState<PredefinedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get summary from AI results
  const getSummary = (): string | null => {
    if (!session?.ai_results || session.ai_results.length === 0) {
      return null;
    }
    
    // Find the most recent summarize result
    const summaryResult = session.ai_results
      .slice()
      .reverse()
      .find(result => 
        result.prompt.toLowerCase().includes('summary') || 
        result.prompt.toLowerCase().includes('summarize')
      );
    
    return summaryResult?.response || null;
  };

  const summary = getSummary();

  useEffect(() => {
    if (id) {
      loadSession();
      loadPrompts();
    }
  }, [id]);

  const loadSession = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await apiClient.getSession(id);
      if (response.success && response.data) {
        setSession(response.data);
      } else {
        setError(response.error || 'Session not found');
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const loadPrompts = async () => {
    try {
      const response = await apiClient.getPrompts();
      if (response.success) {
        setPrompts(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load prompts:', err);
    }
  };

  const handleDownloadSrt = async () => {
    if (!id || !session?.video_title) return;

    try {
      const blob = await apiClient.downloadSrt(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subtitles_${session.video_title}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download SRT:', err);
      setError('Failed to download SRT file');
    }
  };

  const handleDownloadVideo = async () => {
    if (!id || !session?.video_title) return;

    try {
      const blob = await apiClient.downloadVideo(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.video_title}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download video:', err);
      setError('Failed to download video file');
    }
  };

  const copyVideoUrl = () => {
    if (!id) return;
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const videoUrl = `${backendUrl}/api/session/${id}/video`;
    navigator.clipboard.writeText(videoUrl);
    // Could add a toast notification here
  };

  const handleRunPrompt = async (prompt: string) => {
    if (!id) return;

    try {
      const response = await apiClient.runPrompt(id, prompt);
      if (response.success && response.data) {
        setSession(response.data);
      } else {
        setError(response.error || 'Failed to run prompt');
      }
    } catch (err) {
      console.error('Failed to run prompt:', err);
      setError('Failed to run AI prompt. Please try again.');
    }
  };

  const handleRefresh = () => {
    loadSession();
  };

  const handleDeleteSession = async () => {
    if (!id || !session) return;
    
    if (!confirm(`Are you sure you want to delete "${session.video_title || 'this session'}"? This will also delete any associated video files and cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiClient.deleteSession(id);
      if (response.success) {
        // Navigate back to home
        window.location.href = '/';
      } else {
        setError('Failed to delete session');
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete session');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-slate-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Error Loading Session
          </h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Page metadata for SEO and web scrapers */}
      <Helmet>
        <title>{session.video_title || 'Session'} - YT Insight</title>
        <meta name="description" content={summary || session.video_title || 'YouTube video analysis session'} />
        <meta property="og:title" content={session.video_title || 'Session'} />
        <meta property="og:description" content={summary || session.video_title || 'YouTube video analysis session'} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={session.video_title || 'Session'} />
        <meta name="twitter:description" content={summary || session.video_title || 'YouTube video analysis session'} />
      </Helmet>

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Link
                to="/"
                className="flex items-center text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                <svg
                  className="w-5 h-5 mr-1 sm:mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-6 w-px bg-slate-600 hidden sm:block"></div>
              <h1 className="text-base sm:text-lg font-medium text-white truncate">
                {session.video_title || 'Untitled Session'}
              </h1>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={handleRefresh}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                title="Refresh session"
                aria-label="Refresh session"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                onClick={handleDownloadSrt}
                disabled={!session.srt_text}
                className="flex items-center px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
              >
                <svg
                  className="w-4 h-4 sm:mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="hidden sm:inline">Download Subtitles</span>
                <span className="sm:hidden">Subs</span>
              </button>
              {session.video_file_path && (
                <button
                  onClick={handleDownloadVideo}
                  className="flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                >
                  <svg
                    className="w-4 h-4 sm:mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Download Video</span>
                  <span className="sm:hidden">Video</span>
                </button>
              )}
              <button
                onClick={handleDeleteSession}
                className="flex items-center gap-1 sm:gap-2 p-2 sm:px-4 sm:py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                title="Delete session"
                aria-label="Delete session"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500">
            {session && (
              <span className="truncate">Created: {formatDate(session.created_at)}</span>
            )}
            {session && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">{session.youtube_url}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Video URL Display */}
      {session.video_file_path && (
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-sm text-slate-400 flex-shrink-0">Video URL:</span>
              <div className="flex-1 flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2 min-w-0">
                <code className="text-xs sm:text-sm text-slate-300 font-mono truncate flex-1">
                  {`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/session/${id}/video`}
                </code>
                <button
                  onClick={copyVideoUrl}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors flex-shrink-0"
                  title="Copy to clipboard"
                  aria-label="Copy video URL"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 h-full">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 h-full">
            {/* Left Panel - SRT Viewer */}
            <div className="flex flex-col min-h-[400px] lg:h-full">
              <SrtViewer
                srtText={session.srt_text}
                videoTitle={session.video_title}
                summary={summary}
              />
            </div>

            {/* Right Panel - AI Analysis */}
            <div className="flex flex-col min-h-[400px] lg:h-full">
              <PromptRunner
                prompts={prompts}
                aiResults={session.ai_results}
                onRunPrompt={handleRunPrompt}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Session;
