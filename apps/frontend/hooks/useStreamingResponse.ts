import { useState, useCallback, useRef } from 'react';

export interface StreamingChunk {
  text: string;
}

export interface ArtifactAction {
  type: 'shell' | 'file';
  filePath?: string;
  content?: string;
  command?: string;
}

export interface StreamingArtifact {
  id: string;
  title: string;
  actions: ArtifactAction[];
}

export interface StreamingState {
  isStreaming: boolean;
  streamedText: string;
  combinedText: string;
  artifacts: StreamingArtifact[];
  error: string | null;
}

export const useStreamingResponse = () => {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    streamedText: '',
    combinedText: '',
    artifacts: [],
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const parseArtifacts = (text: string): StreamingArtifact[] => {
    const artifacts: StreamingArtifact[] = [];
    const artifactRegex = /<sapphiresArtifact\s+id="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/sapphiresArtifact>/g;
    
    let match;
    while ((match = artifactRegex.exec(text)) !== null) {
      const [, id, title, content] = match;
      const actions: ArtifactAction[] = [];
      
      // Parse shell actions
      const shellRegex = /<sapphiresAction\s+type="shell">\s*([\s\S]*?)\s*<\/sapphiresAction>/g;
      let shellMatch;
      while ((shellMatch = shellRegex.exec(content)) !== null) {
        actions.push({
          type: 'shell',
          command: shellMatch[1].trim(),
        });
      }
      
      // Parse file actions
      const fileRegex = /<sapphiresAction\s+type="file"\s+filePath="([^"]+)">\s*([\s\S]*?)\s*<\/sapphiresAction>/g;
      let fileMatch;
      while ((fileMatch = fileRegex.exec(content)) !== null) {
        actions.push({
          type: 'file',
          filePath: fileMatch[1],
          content: fileMatch[2].trim(),
        });
      }
      
      artifacts.push({ id, title, actions });
    }
    
    return artifacts;
  };

  const startStreaming = useCallback(async (endpoint: string, payload?: any) => {
    // Cleanup previous connections
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isStreaming: true,
      streamedText: '',
      combinedText: '',
      artifacts: [],
      error: null,
    }));

    try {
      abortControllerRef.current = new AbortController();
      
      // Start the streaming request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            
            if (dataStr === '[DONE]') {
              setState(prev => ({
                ...prev,
                isStreaming: false,
                combinedText: accumulatedText,
                artifacts: parseArtifacts(accumulatedText),
              }));
              return;
            }

            try {
              const data: StreamingChunk = JSON.parse(dataStr);
              accumulatedText += data.text;
              
              setState(prev => ({
                ...prev,
                streamedText: accumulatedText,
              }));
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error.message || 'An error occurred during streaming',
        }));
      }
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    stopStreaming();
    setState({
      isStreaming: false,
      streamedText: '',
      combinedText: '',
      artifacts: [],
      error: null,
    });
  }, [stopStreaming]);

  return {
    ...state,
    startStreaming,
    stopStreaming,
    reset,
  };
};
