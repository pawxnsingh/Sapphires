import React from 'react';
import { StreamingArtifact, ArtifactAction } from '../hooks/useStreamingResponse';

interface ArtifactRendererProps {
  artifacts: StreamingArtifact[];
  onExecuteAction?: (action: ArtifactAction) => void;
}

export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({
  artifacts,
  onExecuteAction,
}) => {
  if (artifacts.length === 0) return null;

  return (
    <div className="artifacts-container space-y-4">
      {artifacts.map((artifact) => (
        <div key={artifact.id} className="artifact-card border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            {artifact.title}
          </h3>
          
          <div className="actions-list space-y-3">
            {artifact.actions.map((action, index) => (
              <div key={index} className="action-item">
                {action.type === 'shell' && (
                  <div className="shell-action">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-600">
                        Shell Command
                      </span>
                      {onExecuteAction && (
                        <button
                          onClick={() => onExecuteAction(action)}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Execute
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
                      {onExecuteAction && (
                        <button
                          onClick={() => onExecuteAction(action)}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Create/Update
                        </button>
                      )}
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto max-h-60 overflow-y-auto">
                      {action.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
