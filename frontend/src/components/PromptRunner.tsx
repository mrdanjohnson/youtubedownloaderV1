import { useState } from 'react';
import { PredefinedPrompt, AiResult } from '../types';

interface PromptRunnerProps {
  prompts: PredefinedPrompt[];
  aiResults: AiResult[];
  onRunPrompt: (prompt: string) => Promise<void>;
  loading: boolean;
}

function PromptRunner({ prompts, aiResults, onRunPrompt }: PromptRunnerProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const handleRun = async () => {
    let promptToRun: string;
    
    if (useCustom) {
      promptToRun = customPrompt;
    } else {
      // For preset prompts, use the actual prompt text from the database, not the ID
      const presetPrompt = prompts.find(p => p.id === selectedPrompt);
      if (!presetPrompt) return;
      promptToRun = presetPrompt.prompt;
    }
    
    if (!promptToRun.trim()) return;

    setIsRunning(true);
    try {
      await onRunPrompt(promptToRun);
      if (useCustom) {
        setCustomPrompt('');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const toggleExpand = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedPromptDetails = prompts.find(p => p.id === selectedPrompt);

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="font-medium text-white">AI Analysis</h2>
      </div>

      {/* Prompt Selection */}
      <div className="p-4 border-b border-slate-700">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Choose a prompt or write your own
          </label>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setUseCustom(false)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                !useCustom
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Preset
            </button>
            <button
              type="button"
              onClick={() => setUseCustom(true)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                useCustom
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {!useCustom ? (
          <select
            value={selectedPrompt}
            onChange={(e) => setSelectedPrompt(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select a prompt...</option>
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name}
              </option>
            ))}
          </select>
        ) : (
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter your custom prompt..."
            disabled={isRunning}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        )}

        {/* Prompt Preview */}
        {!useCustom && selectedPrompt && selectedPromptDetails && (
          <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">{selectedPromptDetails.description}</p>
            <p className="text-xs text-slate-500 mt-2 italic">Full prompt:</p>
            <p className="text-xs text-slate-300 mt-1 font-mono whitespace-pre-wrap">{selectedPromptDetails.prompt}</p>
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={isRunning || (!useCustom && !selectedPrompt) || (useCustom && !customPrompt.trim())}
          className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isRunning ? (
            <>
              <div className="spinner w-4 h-4 mr-2 border-white/30 border-t-white"></div>
              Processing...
            </>
          ) : (
            <>
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Run Analysis
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4">
            Analysis Results
            {aiResults.length > 0 && (
              <span className="ml-2 text-xs text-slate-500">
                ({aiResults.length})
              </span>
            )}
          </h3>

          {aiResults.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">🤖</div>
              <p className="text-slate-400 text-sm">
                Run an analysis to see results here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Reverse the array to show newest first */}
              {[...aiResults].reverse().map((result, index) => {
                const resultId = result.id || `result-${index}`;
                const isNewest = index === 0; // First item after reverse is the newest
                const isExpanded = isNewest || expandedResults.has(resultId);
                
                return (
                  <div
                    key={resultId}
                    className="bg-slate-700/50 rounded-lg overflow-hidden animate-fade-in"
                  >
                    {/* Collapsible Header */}
                    <button
                      onClick={() => toggleExpand(resultId)}
                      className="w-full p-4 flex items-start justify-between hover:bg-slate-700/70 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-1">
                          Prompt: {result.prompt.substring(0, 80)}{result.prompt.length > 80 ? '...' : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(result.timestamp)} • {result.model}
                        </p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
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
                    </button>
                    
                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-600/50">
                        <div className="prose prose-invert prose-sm max-w-none mt-3">
                          <pre className="whitespace-pre-wrap text-slate-300 text-sm font-normal">
                            {result.response}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PromptRunner;
