import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { PredefinedPrompt, LlmSettings, CreatePromptRequest, UpdatePromptRequest } from '../types';

type TabType = 'prompts' | 'llm';

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('prompts');
  const [prompts, setPrompts] = useState<PredefinedPrompt[]>([]);
  const [llmSettings, setLlmSettings] = useState<LlmSettings>({
    model: 'gpt-3.5-turbo',
    maxTokens: 2000,
    temperature: 0.7
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  
  // Prompt form state
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState<CreatePromptRequest>({
    name: '',
    description: '',
    prompt: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'prompts') {
        const response = await apiClient.getAllPrompts();
        setPrompts(response.data);
      } else {
        const response = await apiClient.getLlmSettings();
        setLlmSettings(response.data);
      }
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Prompt handlers
  const handleCreatePrompt = async () => {
    if (!promptForm.name || !promptForm.description || !promptForm.prompt) {
      setError('All fields are required');
      return;
    }

    try {
      await apiClient.createPrompt(promptForm);
      showSuccess('Prompt created successfully');
      setPromptForm({ name: '', description: '', prompt: '' });
      setIsEditingPrompt(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create prompt');
    }
  };

  const handleUpdatePrompt = async () => {
    if (!editingPromptId) return;

    try {
      const updateData: UpdatePromptRequest = {};
      if (promptForm.name) updateData.name = promptForm.name;
      if (promptForm.description) updateData.description = promptForm.description;
      if (promptForm.prompt) updateData.prompt = promptForm.prompt;

      await apiClient.updatePrompt(editingPromptId, updateData);
      showSuccess('Prompt updated successfully');
      setPromptForm({ name: '', description: '', prompt: '' });
      setIsEditingPrompt(false);
      setEditingPromptId(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update prompt');
    }
  };

  const handleEditPrompt = (prompt: PredefinedPrompt) => {
    if (prompt.is_default) {
      setError('Cannot edit default prompts');
      return;
    }
    setEditingPromptId(prompt.id);
    setPromptForm({
      name: prompt.name,
      description: prompt.description,
      prompt: prompt.prompt
    });
    setIsEditingPrompt(true);
    // Scroll to top where the edit form is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePrompt = async (id: string, isDefault?: boolean) => {
    if (isDefault) {
      setError('Cannot delete default prompts');
      return;
    }

    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      await apiClient.deletePrompt(id);
      showSuccess('Prompt deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete prompt');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingPrompt(false);
    setEditingPromptId(null);
    setPromptForm({ name: '', description: '', prompt: '' });
  };

  // LLM settings handlers
  const handleUpdateLlmSettings = async () => {
    try {
      await apiClient.updateLlmSettings(llmSettings);
      showSuccess('LLM settings updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update LLM settings');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors self-start"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 mb-6 border-b border-slate-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-4 sm:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'prompts'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Prompts
          </button>
          <button
            onClick={() => setActiveTab('llm')}
            className={`px-4 sm:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'llm'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            LLM Configuration
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-900 font-bold">×</button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <p className="mt-4 text-slate-400">Loading...</p>
          </div>
        ) : activeTab === 'prompts' ? (
          <div>
            {/* Create/Edit Prompt Form */}
            <div className="bg-slate-800 rounded-lg shadow-md p-6 mb-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                {isEditingPrompt ? (editingPromptId ? 'Edit Prompt' : 'Create New Prompt') : 'Create New Prompt'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={promptForm.name}
                    onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Summarize Video"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={promptForm.description}
                    onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Create a concise summary of the video content"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Prompt Template</label>
                  <textarea
                    value={promptForm.prompt}
                    onChange={(e) => setPromptForm({ ...promptForm, prompt: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Enter the prompt template here..."
                  />
                </div>
                <div className="flex gap-2">
                  {editingPromptId ? (
                    <>
                      <button
                        onClick={handleUpdatePrompt}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Update Prompt
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCreatePrompt}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create Prompt
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Prompts List */}
            <div className="bg-slate-800 rounded-lg shadow-md overflow-hidden border border-slate-700">
              <div className="px-6 py-4 bg-slate-700 border-b border-slate-600">
                <h2 className="text-xl font-semibold text-white">Available Prompts</h2>
              </div>
              <div className="divide-y divide-slate-700">
                {prompts.map((prompt) => {
                  const isExpanded = expandedPrompts.has(prompt.id);
                  return (
                    <div key={prompt.id} className="transition-colors">
                      <div 
                        className="p-6 hover:bg-slate-700/50 cursor-pointer flex justify-between items-start"
                        onClick={() => {
                          const newExpanded = new Set(expandedPrompts);
                          if (isExpanded) {
                            newExpanded.delete(prompt.id);
                          } else {
                            newExpanded.add(prompt.id);
                          }
                          setExpandedPrompts(newExpanded);
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <svg 
                              className={`w-5 h-5 text-slate-400 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <h3 className="text-lg font-semibold text-white">{prompt.name}</h3>
                            {prompt.is_default && (
                              <span className="px-2 py-1 text-xs bg-blue-900 text-blue-300 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                        {!prompt.is_default && (
                          <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleEditPrompt(prompt)}
                              className="px-4 py-2 text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(prompt.id, prompt.is_default)}
                              className="px-4 py-2 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-0">
                          <p className="text-slate-300 mb-3">{prompt.description}</p>
                          <div className="bg-slate-900 p-3 rounded border border-slate-600">
                            <p className="text-sm font-mono text-slate-300 whitespace-pre-wrap">{prompt.prompt}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg shadow-md p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">LLM Configuration</h2>
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
                <select
                  value={llmSettings.model}
                  onChange={(e) => setLlmSettings({ ...llmSettings, model: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (max 4k output, fast, cheap)</option>
                  <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16k (max 4k output)</option>
                  <option value="gpt-4">GPT-4 (max 8k output, high quality)</option>
                  <option value="gpt-4-turbo-2024-04-09">GPT-4 Turbo (max 4k output)</option>
                  <option value="gpt-4o">GPT-4o (max 16k output, recommended for long responses)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (max 16k output, fast & cheap)</option>
                </select>
                <div className="mt-3 p-3 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300">
                  <p className="font-semibold text-blue-400 mb-2">📊 When to use each model:</p>
                  <ul className="space-y-1 ml-4">
                    <li><strong>Short responses (500-2000 tokens):</strong> GPT-3.5 Turbo or GPT-4o Mini - fastest, cheapest</li>
                    <li><strong>Medium responses (2000-4000 tokens):</strong> Any model except GPT-4 Turbo</li>
                    <li><strong>Long responses (4000-8000 tokens):</strong> GPT-4 only (8k max)</li>
                    <li><strong>Very long responses (8000-16000 tokens):</strong> GPT-4o or GPT-4o Mini ONLY</li>
                  </ul>
                  <p className="mt-2 text-xs text-slate-400 italic">
                    ⚠️ Important: Max tokens = maximum OUTPUT length only. Your transcript size doesn't count toward this limit.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Tokens: {llmSettings.maxTokens}
                </label>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="500"
                  value={llmSettings.maxTokens}
                  onChange={(e) => setLlmSettings({ ...llmSettings, maxTokens: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>500</span>
                  <span>16,000</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">Maximum tokens in OUTPUT response. GPT-3.5/GPT-4 Turbo max: 4k. GPT-4 max: 8k. GPT-4o/4o-mini max: 16k. Set according to your model choice.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Temperature: {llmSettings.temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={llmSettings.temperature}
                  onChange={(e) => setLlmSettings({ ...llmSettings, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>0 (Focused)</span>
                  <span>2 (Creative)</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">Controls randomness in responses</p>
              </div>

              <button
                onClick={handleUpdateLlmSettings}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save LLM Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
