// Example API endpoint for handling streaming prompts
// This would go in your backend (apps/backend or similar)

import { Request, Response } from 'express';

export const streamingPromptHandler = async (req: Request, res: Response) => {
  const { prompt } = req.body;

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  try {
    // Example: Process the prompt and stream response
    // Replace this with your actual AI/LLM integration
    const response = await processPromptWithStreaming(prompt);
    
    // Stream the response chunk by chunk
    for await (const chunk of response) {
      const data = JSON.stringify({ text: chunk });
      res.write(`data: ${data}\n\n`);
      
      // Add small delay to simulate real streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Send completion signal
    res.write(`event: done\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'An error occurred' })}\n\n`);
    res.end();
  }
};

// Mock function - replace with your actual AI integration
async function* processPromptWithStreaming(prompt: string) {
  // Example streaming response that includes artifacts
  const exampleResponse = `Here's a complete chess app for Expo + Expo Router:

<sapphiresArtifact id="expo-chess-complete" title="Complete Chess App for Expo + Expo Router">
  <sapphiresAction type="shell">
    npm install chess.js
  </sapphiresAction>

  <sapphiresAction type="file" filePath="components/ChessBoard.tsx">
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';

// Your chess board component code here...
  </sapphiresAction>

  <sapphiresAction type="file" filePath="app/chess.tsx">
import React, { useState } from 'react';
import { ScrollView, Text, Button, StyleSheet, View } from 'react-native';
import { Chess, Move } from 'chess.js';
import { ChessBoard } from '../components/ChessBoard';

// Your chess game logic here...
  </sapphiresAction>
</sapphiresArtifact>`;

  // Simulate streaming by yielding character by character
  for (let i = 0; i < exampleResponse.length; i++) {
    yield exampleResponse[i];
  }
}

// Example shell execution endpoint
export const executeShellHandler = async (req: Request, res: Response) => {
  const { command } = req.body;
  
  try {
    // SECURITY WARNING: In production, you should validate and sanitize commands
    // Consider using a whitelist of allowed commands
    const { exec } = require('child_process');
    
    exec(command, (error: any, stdout: string, stderr: string) => {
      if (error) {
        return res.status(500).json({ 
          success: false, 
          error: error.message,
          stderr 
        });
      }
      
      res.json({ 
        success: true, 
        stdout, 
        stderr 
      });
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to execute command' 
    });
  }
};

// Example file creation endpoint
export const createFileHandler = async (req: Request, res: Response) => {
  const { filePath, content } = req.body;
  
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // SECURITY WARNING: In production, validate file paths
    // Ensure they're within allowed directories
    const fullPath = path.resolve(process.cwd(), filePath);
    
    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write the file
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
};
