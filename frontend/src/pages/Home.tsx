import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UrlInput from '../components/UrlInput';
import { apiClient } from '../api/client';
import { SessionResponse } from '../types';

function Home() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ stage: string; progress: number } | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllSessions();
      if (response.success) {
        setSessions(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${sessionTitle}"? This will also delete any associated video files.`)) {
      return;
    }

    try {
      const response = await apiClient.deleteSession(sessionId);
      if (response.success) {
        // Refresh the sessions list
        await loadSessions();
      } else {
        setError('Failed to delete session');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete session');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUrlSubmit = async (url: string, cleanText: boolean, downloadVideo: boolean) => {
    try {
      setProcessingError(null);
      setProgress({ stage: 'starting', progress: 5 });
      
      // Start creating the session (this will be synchronous on backend)
      const responsePromise = apiClient.createSession(url, cleanText, downloadVideo);
      
      // Show progress incrementally while waiting
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev || prev.progress >= 95) return prev;
          return { ...prev, progress: Math.min(prev.progress + 5, 95) };
        });
      }, 500);
      
      const response = await responsePromise;
      clearInterval(progressInterval);
      
      if (response.success && response.data) {
        const sessionId = response.data.id;
        
        // Show completion
        setProgress({ stage: 'complete', progress: 100 });
        
        // Navigate to session after brief delay
        setTimeout(() => {
          setProgress(null);
          navigate(`/session/${sessionId}`);
        }, 500);
      } else {
        const errorMsg = response.error || 'Failed to create session';
        setProcessingError(errorMsg);
        setProgress(null);
        setTimeout(() => setProcessingError(null), 5000);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to create session. Please try again.';
      setProcessingError(errorMsg);
      setProgress(null);
      setTimeout(() => setProcessingError(null), 5000);
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

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Dan's Youtube AI Analyzer
              </h1>
              <p className="text-sm sm:text-base text-slate-400">
                Download YouTube subtitles and run AI-powered analysis
              </p>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* URL Input Section */}
        <section className="mb-8 sm:mb-16">
          <UrlInput 
            onSubmit={handleUrlSubmit} 
            loading={false} 
            progress={progress}
            processingError={processingError}
          />
        </section>

        {/* Processing Error Display */}
        {processingError && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{processingError}</span>
            </div>
            <button
              onClick={() => setProcessingError(null)}
              className="text-red-400 hover:text-red-300 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        {/* Recent Sessions Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">
            Recent Sessions
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner mr-3"></div>
              <span className="text-slate-400">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-white mb-2">
                No sessions yet
              </h3>
              <p className="text-slate-400">
                Paste a YouTube URL above to get started
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="relative p-4 sm:p-6 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-all animate-fade-in group"
                >
                  <a
                    href={`/session/${session.id}`}
                    className="block"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate mb-1 text-sm sm:text-base">
                          {session.video_title || 'Untitled Session'}
                        </h3>
                      <p className="text-xs sm:text-sm text-slate-400 truncate mb-2">
                        {session.youtube_url}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500">
                        <span className="truncate">Created: {formatDate(session.created_at)}</span>
                        {session.ai_results && session.ai_results.length > 0 && (
                          <span className="truncate">
                            {session.ai_results.length} AI analysis
                            {session.ai_results.length > 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteSession(session.id, session.video_title || 'Untitled Session');
                        }}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all sm:opacity-0 sm:group-hover:opacity-100"
                        title="Delete session"
                        aria-label="Delete session"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <svg
                        className="w-5 h-5 text-slate-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </a>
              </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-slate-500 text-sm">
          Built with React, Node.js, and Docker
        </div>
      </footer>
    </div>
  );
}

export default Home;
