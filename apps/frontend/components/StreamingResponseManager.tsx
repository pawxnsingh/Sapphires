import React, { useState } from 'react';
import { useStreamingResponse, ArtifactAction } from '../hooks/useStreamingResponse';
import { StreamingTextRenderer } from '../components/StreamingTextRenderer';
import { MarkdownStreamingRenderer } from '../components/MarkdownStreamingRenderer';
import { ArtifactRenderer } from '../components/ArtifactRenderer';

interface StreamingResponseManagerProps {
  endpoint?: string;
  onExecuteShellCommand?: (command: string) => Promise<void>;
  onCreateFile?: (filePath: string, content: string) => Promise<void>;
  renderMode?: 'text' | 'markdown';
  className?: string;
}

export const StreamingResponseManager: React.FC<StreamingResponseManagerProps> = ({
  endpoint = '/api/prompt',
  onExecuteShellCommand,
  onCreateFile,
  renderMode = 'text',
  className = '',
}) => {
  const [prompt, setPrompt] = useState('');
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());
  
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

    await startStreaming(endpoint, { prompt });
  };

  const handleExecuteAction = async (action: ArtifactAction, actionId: string) => {
    setExecutingActions(prev => new Set([...prev, actionId]));
    
    try {
      if (action.type === 'shell' && action.command && onExecuteShellCommand) {
        await onExecuteShellCommand(action.command);
      } else if (action.type === 'file' && action.filePath && action.content && onCreateFile) {
        await onCreateFile(action.filePath, action.content);
      }
    } catch (err) {
      console.error('Failed to execute action:', err);
    } finally {
      setExecutingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  return (
    <div className={`streaming-response-manager ${className}`}>
      {/* Input Form */}
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

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Streaming Text Display */}
        {(streamedText || combinedText) && (
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              Response 
              {isStreaming && (
                <span className="text-blue-500 text-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Streaming...
                </span>
              )}
            </h2>
            
            {renderMode === 'markdown' ? (
              <MarkdownStreamingRenderer
                streamedText={streamedText}
                combinedText={combinedText}
                isStreaming={isStreaming}
                className="bg-gray-50 p-3 rounded"
              />
            ) : (
              <StreamingTextRenderer
                streamedText={streamedText}
                combinedText={combinedText}
                isStreaming={isStreaming}
                className="bg-gray-50 p-3 rounded"
              />
            )}
          </div>
        )}

        {/* Artifacts Display */}
        {artifacts.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Generated Artifacts</h2>
            <div className="space-y-4">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="artifact-card border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">
                    {artifact.title}
                  </h3>
                  
                  <div className="actions-list space-y-3">
                    {artifact.actions.map((action, index) => {
                      const actionId = `${artifact.id}-${index}`;
                      const isExecuting = executingActions.has(actionId);
                      
                      return (
                        <div key={index} className="action-item">
                          {action.type === 'shell' && (
                            <div className="shell-action">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-600">
                                  Shell Command
                                </span>
                                {onExecuteShellCommand && (
                                  <button
                                    onClick={() => handleExecuteAction(action, actionId)}
                                    disabled={isExecuting}
                                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                  >
                                    {isExecuting ? 'Executing...' : 'Execute'}
                                  </button>
                                )}
                              </div>
                              <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
                                {action.command}
                              </pre>
                            </div>
                          )}
                          
                          {action.type === 'file' && (
                            <div className="file-action">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-green-600">
                                  File: {action.filePath}
                                </span>
                                {onCreateFile && (
                                  <button
                                    onClick={() => handleExecuteAction(action, actionId)}
                                    disabled={isExecuting}
                                    className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                  >
                                    {isExecuting ? 'Creating...' : 'Create/Update'}
                                  </button>
                                )}
                              </div>
                              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto max-h-60 overflow-y-auto">
                                {action.content}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {isStreaming && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm">
              Streaming response... ({streamedText.length} characters received)
            </span>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <div>Streaming: {String(isStreaming)}</div>
          <div>Streamed Text Length: {streamedText.length}</div>
          <div>Combined Text Length: {combinedText.length}</div>
          <div>Artifacts Count: {artifacts.length}</div>
          <div>Executing Actions: {Array.from(executingActions).join(', ')}</div>
        </div>
      )}
    </div>
  );
};
