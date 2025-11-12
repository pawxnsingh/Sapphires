/**
 * Streaming Response System
 * 
 * This system provides a complete solution for handling streaming responses
 * from your /prompt endpoint, including real-time text display and artifact
 * parsing/execution.
 * 
 * Architecture:
 * 
 * 1. useStreamingResponse Hook:
 *    - Manages the streaming connection
 *    - Parses incoming SSE data
 *    - Extracts artifacts from the response
 *    - Provides state management for streaming status
 * 
 * 2. StreamingTextRenderer Component:
 *    - Displays streaming text with cursor animation
 *    - Removes artifact markup from display
 *    - Shows both streaming and final states
 * 
 * 3. MarkdownStreamingRenderer Component:
 *    - Alternative renderer with basic markdown support
 *    - Formats headers, paragraphs, etc.
 *    - Can be extended with more markdown features
 * 
 * 4. ArtifactRenderer Component:
 *    - Displays parsed artifacts (shell commands, files)
 *    - Provides execution buttons
 *    - Shows loading states during execution
 * 
 * 5. StreamingResponseManager Component:
 *    - Main orchestrator component
 *    - Combines all the above components
 *    - Provides a complete UI for streaming interactions
 * 
 * Usage Examples:
 * 
 * Basic Usage:
 * ```tsx
 * import { StreamingResponseManager } from './components/StreamingResponseManager';
 * 
 * function MyPage() {
 *   return (
 *     <StreamingResponseManager
 *       endpoint="/api/prompt"
 *       renderMode="text"
 *     />
 *   );
 * }
 * ```
 * 
 * Advanced Usage with Action Handlers:
 * ```tsx
 * function MyPage() {
 *   const handleShellCommand = async (command: string) => {
 *     // Your shell execution logic
 *     await fetch('/api/execute', { 
 *       method: 'POST', 
 *       body: JSON.stringify({ command }) 
 *     });
 *   };
 * 
 *   const handleCreateFile = async (filePath: string, content: string) => {
 *     // Your file creation logic
 *     await fetch('/api/files', { 
 *       method: 'POST', 
 *       body: JSON.stringify({ filePath, content }) 
 *     });
 *   };
 * 
 *   return (
 *     <StreamingResponseManager
 *       endpoint="/api/prompt"
 *       onExecuteShellCommand={handleShellCommand}
 *       onCreateFile={handleCreateFile}
 *       renderMode="markdown"
 *     />
 *   );
 * }
 * ```
 * 
 * Custom Hook Usage:
 * ```tsx
 * import { useStreamingResponse } from './hooks/useStreamingResponse';
 * 
 * function CustomComponent() {
 *   const {
 *     isStreaming,
 *     streamedText,
 *     combinedText,
 *     artifacts,
 *     startStreaming,
 *     stopStreaming,
 *   } = useStreamingResponse();
 * 
 *   // Your custom implementation
 * }
 * ```
 * 
 * Data Flow:
 * 
 * 1. User submits prompt
 * 2. Hook establishes SSE connection to /prompt endpoint
 * 3. Server sends data in format: data: {"text": "chunk"}
 * 4. Hook accumulates text chunks in real-time
 * 5. Components display streaming text with cursor
 * 6. When complete, artifacts are parsed from full response
 * 7. Artifacts are rendered with execution buttons
 * 8. User can execute shell commands or create files
 * 
 * Expected Server Response Format:
 * 
 * ```
 * data: {"text": "Hello"}
 * data: {"text": " world"}
 * data: {"text": "\n\n<sapphiresArtifact id=\"demo\" title=\"Demo\">"}
 * data: {"text": "<sapphiresAction type=\"shell\">npm install</sapphiresAction>"}
 * data: {"text": "</sapphiresArtifact>"}
 * event: done
 * data: [DONE]
 * ```
 * 
 * Features:
 * 
 * - Real-time streaming text display
 * - Automatic artifact extraction
 * - Shell command execution
 * - File creation/updating
 * - Error handling
 * - Loading states
 * - Progress indicators
 * - Debug information
 * - Stop/reset functionality
 * - Responsive design
 * - TypeScript support
 */

export {};
