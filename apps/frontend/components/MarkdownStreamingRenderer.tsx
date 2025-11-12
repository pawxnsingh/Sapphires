import React from 'react';

interface MarkdownStreamingRendererProps {
  streamedText: string;
  combinedText: string;
  isStreaming: boolean;
  className?: string;
}

export const MarkdownStreamingRenderer: React.FC<MarkdownStreamingRendererProps> = ({
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

  // Basic markdown-like rendering
  const formatText = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold mt-3 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-bold mt-2 mb-1">{line.slice(4)}</h3>;
        }
        
        // Code blocks (basic)
        if (line.startsWith('```')) {
          return null; // Handle in separate logic if needed
        }
        
        // Empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // Regular paragraphs
        return <p key={index} className="mb-2">{line}</p>;
      });
  };

  const displayText = isStreaming ? cleanText(streamedText) : cleanText(combinedText);

  return (
    <div className={`markdown-streaming-container ${className}`}>
      <div className="prose max-w-none">
        {formatText(displayText)}
        {isStreaming && (
          <span className="animate-pulse text-blue-500 ml-1">▋</span>
        )}
      </div>
    </div>
  );
};
