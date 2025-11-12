import React, { useState } from 'react';
import { useStreamingResponse } from '../hooks/useStreamingResponse';
import { StreamingTextRenderer } from '../components/StreamingTextRenderer';
import { ArtifactRenderer } from '../components/ArtifactRenderer';

export const StreamingDemo: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const {
    isStreaming,
    streamedText,
    combinedText,
    artifacts,
    error,
    startStreaming,
    stopStreaming,
    reset,
  } = useStreamingResponse();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    await startStreaming('/api/prompt', { prompt });
  };

  const handleExecuteAction = async (action: any) => {
    console.log('Executing action:', action);
    // Here you would implement the actual execution logic
    // For shell commands, you might send to a backend endpoint
    // For file operations, you might create/update files via API
  };

  return (
    <div className="streaming-demo max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Streaming Response Demo</h1>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming || !prompt.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? 'Streaming...' : 'Submit'}
          </button>
          {isStreaming && (
            <button
              type="button"
              onClick={stopStreaming}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Streaming Text Display */}
        {(streamedText || combinedText) && (
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">
              Response {isStreaming && <span className="text-blue-500">(Streaming...)</span>}
            </h2>
            <StreamingTextRenderer
              streamedText={streamedText}
              combinedText={combinedText}
              isStreaming={isStreaming}
              className="bg-gray-50 p-3 rounded"
            />
          </div>
        )}

        {/* Artifacts Display */}
        {artifacts.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Generated Artifacts</h2>
            <ArtifactRenderer
              artifacts={artifacts}
              onExecuteAction={handleExecuteAction}
            />
          </div>
        )}
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <div>Streaming: {String(isStreaming)}</div>
          <div>Streamed Text Length: {streamedText.length}</div>
          <div>Combined Text Length: {combinedText.length}</div>
          <div>Artifacts Count: {artifacts.length}</div>
        </div>
      )}
    </div>
  );
};
