import React from 'react';

interface StreamingTextRendererProps {
  streamedText: string;
  combinedText: string;
  isStreaming: boolean;
  className?: string;
}

export const StreamingTextRenderer: React.FC<StreamingTextRendererProps> = ({
  streamedText,
  combinedText,
  isStreaming,
  className = '',
}) => {
  // Remove artifact markup from display text
  const cleanText = (text: string) => {
    return text
      .replace(/<sapphiresArtifact[^>]*>[\s\S]*?<\/sapphiresArtifact>/g, '')
      .replace(/<sapphiresAction[^>]*>[\s\S]*?<\/sapphiresAction>/g, '')
      .trim();
  };

  const displayText = isStreaming ? cleanText(streamedText) : cleanText(combinedText);

  return (
    <div className={`streaming-text-container ${className}`}>
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed">
          {displayText}
          {isStreaming && (
            <span className="animate-pulse text-blue-500">▋</span>
          )}
        </pre>
      </div>
    </div>
  );
};
