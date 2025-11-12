# Streaming Response System

A comprehensive solution for handling streaming responses from your `/prompt` endpoint with real-time text display and artifact parsing/execution.

## Features

- 🔄 **Real-time streaming** - Display text as it arrives
- 🎯 **Artifact parsing** - Extract and display shell commands and files
- ⚡ **Action execution** - Execute shell commands and create files
- 🎨 **Multiple renderers** - Plain text or markdown formatting
- 🛠️ **TypeScript support** - Fully typed components and hooks
- 🔧 **Error handling** - Graceful error states and recovery
- 📱 **Responsive design** - Works on desktop and mobile

## Quick Start

### 1. Install the Components

Copy the provided files to your frontend project:

```
apps/frontend/
├── hooks/
│   └── useStreamingResponse.ts
├── components/
│   ├── StreamingTextRenderer.tsx
│   ├── MarkdownStreamingRenderer.tsx
│   ├── ArtifactRenderer.tsx
│   └── StreamingResponseManager.tsx
└── app/
    └── streaming/
        └── page.tsx
```

### 2. Basic Usage

```tsx
import { StreamingResponseManager } from '../components/StreamingResponseManager';

export default function MyPage() {
  return (
    <StreamingResponseManager
      endpoint="/api/prompt"
      renderMode="text"
    />
  );
}
```

### 3. Advanced Usage with Action Handlers

```tsx
import { StreamingResponseManager } from '../components/StreamingResponseManager';

export default function MyPage() {
  const handleExecuteShellCommand = async (command: string) => {
    const response = await fetch('/api/execute-shell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    // Handle response...
  };

  const handleCreateFile = async (filePath: string, content: string) => {
    const response = await fetch('/api/create-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, content }),
    });
    // Handle response...
  };

  return (
    <StreamingResponseManager
      endpoint="/api/prompt"
      onExecuteShellCommand={handleExecuteShellCommand}
      onCreateFile={handleCreateFile}
      renderMode="markdown"
    />
  );
}
```

## Components

### StreamingResponseManager

The main orchestrator component that combines all functionality.

**Props:**
- `endpoint?: string` - API endpoint (default: '/api/prompt')
- `onExecuteShellCommand?: (command: string) => Promise<void>` - Shell command handler
- `onCreateFile?: (filePath: string, content: string) => Promise<void>` - File creation handler
- `renderMode?: 'text' | 'markdown'` - Text rendering mode
- `className?: string` - Additional CSS classes

### useStreamingResponse Hook

Core hook for managing streaming responses.

**Returns:**
- `isStreaming: boolean` - Whether currently streaming
- `streamedText: string` - Text received so far
- `combinedText: string` - Final complete text
- `artifacts: StreamingArtifact[]` - Parsed artifacts
- `error: string | null` - Error message if any
- `startStreaming: (endpoint: string, payload?: any) => Promise<void>` - Start streaming
- `stopStreaming: () => void` - Stop current stream
- `reset: () => void` - Reset all state

### StreamingTextRenderer

Displays streaming text with a cursor animation.

**Props:**
- `streamedText: string` - Current streaming text
- `combinedText: string` - Final complete text
- `isStreaming: boolean` - Streaming status
- `className?: string` - Additional CSS classes

### ArtifactRenderer

Displays parsed artifacts with execution buttons.

**Props:**
- `artifacts: StreamingArtifact[]` - Array of artifacts to display
- `onExecuteAction?: (action: ArtifactAction) => void` - Action execution handler

## Backend Integration

### Expected Response Format

Your `/prompt` endpoint should return Server-Sent Events (SSE) in this format:

```
data: {"text": "Hello"}
data: {"text": " world"}
data: {"text": "\n\n<sapphiresArtifact id=\"demo\" title=\"Demo\">"}
data: {"text": "<sapphiresAction type=\"shell\">npm install</sapphiresAction>"}
data: {"text": "</sapphiresArtifact>"}
event: done
data: [DONE]
```

### Example Backend Handler

```typescript
// Express.js example
app.post('/api/prompt', async (req, res) => {
  const { prompt } = req.body;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    // Process prompt and stream response
    for await (const chunk of generateResponse(prompt)) {
      const data = JSON.stringify({ text: chunk });
      res.write(`data: ${data}\\n\\n`);
    }

    // Signal completion
    res.write(`event: done\\n`);
    res.write(`data: [DONE]\\n\\n`);
    res.end();

  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: 'An error occurred' })}\\n\\n`);
    res.end();
  }
});
```

### Shell Command Execution

```typescript
app.post('/api/execute-shell', async (req, res) => {
  const { command } = req.body;
  
  // SECURITY: Validate and sanitize commands in production
  const { exec } = require('child_process');
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    res.json({ 
      success: true, 
      stdout, 
      stderr 
    });
  });
});
```

### File Creation

```typescript
app.post('/api/create-file', async (req, res) => {
  const { filePath, content } = req.body;
  
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // SECURITY: Validate file paths in production
    const fullPath = path.resolve(process.cwd(), filePath);
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    
    res.json({ 
      success: true, 
      message: `File created: ${filePath}` 
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create file' 
    });
  }
});
```

## Artifact Format

Artifacts are embedded in the response using XML-like tags:

```xml
<sapphiresArtifact id="unique-id" title="Artifact Title">
  <sapphiresAction type="shell">
    npm install package-name
  </sapphiresAction>
  
  <sapphiresAction type="file" filePath="src/component.tsx">
    import React from 'react';
    
    export default function Component() {
      return <div>Hello World</div>;
    }
  </sapphiresAction>
</sapphiresArtifact>
```

## Styling

The components use Tailwind CSS classes. If you're not using Tailwind, you can replace the classes with your own CSS:

```css
/* Example custom styles */
.streaming-text-container {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 0.5rem;
}

.artifact-card {
  border: 1px solid #e9ecef;
  border-radius: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
}

.shell-action pre {
  background: #1a1a1a;
  color: #00ff00;
  padding: 0.75rem;
  border-radius: 0.25rem;
  overflow-x: auto;
}
```

## Error Handling

The system includes comprehensive error handling:

- Network errors during streaming
- Malformed response data
- Action execution failures
- Graceful fallbacks and user feedback

## Security Considerations

⚠️ **Important Security Notes:**

1. **Shell Command Execution**: Never execute arbitrary shell commands in production without proper validation and sandboxing.

2. **File Path Validation**: Always validate file paths to prevent directory traversal attacks.

3. **Input Sanitization**: Sanitize all user inputs before processing.

4. **Rate Limiting**: Implement rate limiting on your streaming endpoints.

5. **Authentication**: Add proper authentication and authorization.

## Customization

### Custom Renderers

You can create custom text renderers by following the same pattern:

```tsx
interface CustomRendererProps {
  streamedText: string;
  combinedText: string;
  isStreaming: boolean;
  className?: string;
}

export const CustomRenderer: React.FC<CustomRendererProps> = ({
  streamedText,
  combinedText,
  isStreaming,
  className,
}) => {
  // Your custom rendering logic
  return (
    <div className={className}>
      {/* Custom formatted text */}
    </div>
  );
};
```

### Custom Artifact Types

Extend the system to support custom artifact types:

```typescript
interface CustomArtifactAction extends ArtifactAction {
  type: 'custom' | 'shell' | 'file';
  customData?: any;
}
```

## Troubleshooting

### Common Issues

1. **Streaming not working**: Check that your backend sets proper SSE headers
2. **CORS errors**: Ensure proper CORS configuration on your backend
3. **Memory leaks**: The hook properly cleans up connections, but ensure you're not creating multiple instances
4. **Performance**: For very long responses, consider implementing text virtualization

### Debug Mode

Enable debug mode by setting `NODE_ENV=development`. This will show debug information including:
- Streaming status
- Text lengths
- Artifact counts
- Active connections

## Contributing

To contribute to this system:

1. Follow the existing TypeScript patterns
2. Add proper error handling
3. Include comprehensive prop documentation
4. Test with various response formats
5. Ensure accessibility compliance

## License

This code is provided as-is for your project. Feel free to modify and extend as needed.
