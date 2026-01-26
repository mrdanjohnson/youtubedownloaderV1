import { useState } from 'react';

interface UrlInputProps {
  onSubmit: (url: string, cleanText: boolean, downloadVideo: boolean) => Promise<void>;
  loading: boolean;
  progress?: { stage: string; progress: number } | null;
  processingError?: string | null;
}

function UrlInput({ onSubmit, loading, progress, processingError }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cleanText, setCleanText] = useState(true); // Default to ON
  const [downloadVideo, setDownloadVideo] = useState(false); // Default to OFF

  const validateUrl = (input: string): boolean => {
    const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(url, cleanText, downloadVideo);
    } catch (err) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
          <input
            type="url"
            value={url}
            onChange={handleChange}
            placeholder="Paste YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
            disabled={isSubmitting || loading}
            className="block w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={cleanText}
                onChange={(e) => setCleanText(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              <span>Clean text</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={downloadVideo}
                onChange={(e) => setDownloadVideo(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              <span>Download video</span>
            </label>
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting || loading || !url.trim()}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
              {isSubmitting ? (
                <>
                  <div className="spinner w-4 h-4 mr-2 border-white/30 border-t-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  Analyze
                  <svg
                    className="ml-2 w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </>
              )}
            </button>
        </div>

        {/* Error Message */}
        {(error || processingError) && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center animate-fade-in">
            <svg
              className="w-4 h-4 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error || processingError}
          </div>
        )}

        {/* Progress Bar */}
        {progress && progress.progress > 0 && (
          <div className="mt-3 space-y-2 animate-fade-in">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{getStageLabel(progress.stage)}</span>
              <span className="text-indigo-400">{progress.progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 transition-all duration-300 ease-out"
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Helper Text */}
        <div className="mt-4 text-center text-slate-500 text-sm">
          <p>Supports YouTube videos with subtitles</p>
        </div>
      </form>
    </div>
  );
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    'starting': 'Starting download...',
    'connected': 'Connecting...',
    'title': 'Fetching video info...',
    'subtitles': 'Downloading subtitles...',
    'subtitles_complete': 'Subtitles downloaded',
    'video': 'Downloading video...',
    'complete': 'Complete!',
    'error': 'Error occurred'
  };
  return labels[stage] || 'Processing...';
}

export default UrlInput;
