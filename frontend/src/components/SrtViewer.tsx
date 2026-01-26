import { useState } from 'react';

interface SrtViewerProps {
  srtText: string | null;
  videoTitle: string | null;
  summary?: string | null;
}

function SrtViewer({ srtText, summary }: SrtViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!srtText) {
    return (
      <div className="flex flex-col bg-slate-800 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="font-medium text-white">Subtitles</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-slate-400 mb-2">No subtitles available</p>
            <p className="text-slate-500 text-sm">
              The video may not have subtitles or closed captions enabled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const lineCount = srtText.split('\n').filter(line => line.trim() && !line.match(/^\d+$/) && !line.includes('-->')).length;

  return (
    <div className="flex flex-col bg-slate-800 rounded-lg border border-slate-700">
      <div className="px-4 py-3 border-b border-slate-700">
        {/* Summary Section */}
        {summary ? (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-sm font-medium text-indigo-400">AI Summary</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {summary}
            </p>
          </div>
        ) : (
          <div className="mb-2 text-slate-400 text-sm flex items-center gap-2">
            <div className="spinner-small"></div>
            <span>Generating summary...</span>
          </div>
        )}
        
        {/* Collapsible Transcript Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full hover:bg-slate-700/30 -mx-2 px-2 py-1 rounded transition-colors"
        >
          <h2 className="font-medium text-white text-sm">Full Transcript</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {lineCount} lines
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>
      </div>
      {isExpanded && (
        <div className="overflow-auto p-4 max-h-[600px]">
          <pre className="srt-content text-sm text-slate-300 leading-relaxed">
            {srtText}
          </pre>
        </div>
      )}
    </div>
  );
}

export default SrtViewer;
