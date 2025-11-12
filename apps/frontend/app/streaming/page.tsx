import React from 'react';
import { StreamingResponseManager } from '../../components/StreamingResponseManager';

export default function StreamingPage() {
  // Example handlers for executing actions
  const handleExecuteShellCommand = async (command: string) => {
    console.log('Executing shell command:', command);
    
    // Example: Send to your backend API to execute the command
    try {
      const response = await fetch('/api/execute-shell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Shell command result:', result);
    } catch (error) {
      console.error('Failed to execute shell command:', error);
      throw error;
    }
  };

  const handleCreateFile = async (filePath: string, content: string) => {
    console.log('Creating file:', filePath);
    
    // Example: Send to your backend API to create/update the file
    try {
      const response = await fetch('/api/create-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath, content }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('File creation result:', result);
    } catch (error) {
      console.error('Failed to create file:', error);
      throw error;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Streaming Response Demo
      </h1>
      
      <StreamingResponseManager
        endpoint="/api/prompt"
        onExecuteShellCommand={handleExecuteShellCommand}
        onCreateFile={handleCreateFile}
        renderMode="text" // or "markdown"
        className="max-w-4xl mx-auto"
      />
      
      {/* Example usage instructions */}
      <div className="max-w-4xl mx-auto mt-12 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">How to Use</h2>
        <div className="space-y-2 text-sm">
          <p>1. Enter a prompt in the input field above</p>
          <p>2. The response will stream in real-time as it's generated</p>
          <p>3. Any artifacts (shell commands or files) will be extracted and displayed below</p>
          <p>4. Click "Execute" or "Create/Update" buttons to run the generated actions</p>
          <p>5. Use "Stop" to halt streaming or "Reset" to clear everything</p>
        </div>
      </div>
    </div>
  );
}
