import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Send,
  Copy,
  Play,
  Code,
  Eye,
  User,
  Bot,
  Sparkles,
  Terminal,
  Settings,
  Square,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "./ui/badge";
import axios from "axios";
import { WORKER_URL, BACKEND_URL } from "@/config";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Readable } from "stream";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  artifacts?: Array<{
    id: string;
    title: string;
    type: 'shell' | 'file';
    content: string;
    filePath?: string;
    isComplete?: boolean;
  }>;
  rawContent?: string;
}

interface AIAppBuilderProps {
  initialMessages?: Message[]; // Pre-hydrated conversation (e.g. init prompt as user message)
  onSendMessage?: (message: string) => void; // Optional external side-effects
}

const AIAppBuilder: React.FC<AIAppBuilderProps> = ({ initialMessages = [], onSendMessage = () => {} }) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const { projectId } = useParams();
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const { getToken } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef<string>('');
  const [showRawIds, setShowRawIds] = useState<Set<string>>(new Set());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // Resizable sidebar width (persisted)
  const [sideWidth, setSideWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('chatSidebarWidth');
      if (stored) {
        const parsed = parseInt(stored, 10);
  if (!isNaN(parsed)) return Math.max(380, parsed);
      }
    }
    return 420; // default width
  });
  const resizingRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  // Bubble width now auto-calculated from panel width (no manual slider)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sideWidth;
    resizingRef.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      if (expanded) setExpanded(false);
      const delta = ev.clientX - startX;
      let next = startWidth + delta;
      const max = typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 1400) : 1400;
  if (next < 380) next = 380;
      if (next > max) next = max;
      setSideWidth(next);
    };
    const onUp = () => {
      resizingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      try { window.localStorage.setItem('chatSidebarWidth', String(Math.round(sideWidth))); } catch {}
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sideWidth]);

  // Enforce minimum width even if a smaller value was persisted
  useEffect(() => {
    if (sideWidth < 380) setSideWidth(380);
  }, [sideWidth]);

  // Cleanup resize flag
  useEffect(() => {
    return () => { resizingRef.current = false; };
  }, []);

  // Keep bubble width within panel bounds
  // Compute dynamic bubble max width (leave comfortable margins)
  const dynamicBubbleMax = useMemo(() => {
    const panel = expanded && typeof window !== 'undefined' ? window.innerWidth : sideWidth;
    return Math.max(260, panel - 90); // 90 accounts for avatar + gaps + scroll padding
  }, [sideWidth, expanded]);

  const parseArtifacts = useCallback((text: string) => {
    const artifacts: Array<{ id: string; title: string; type: 'shell' | 'file'; content: string; filePath?: string; isComplete?: boolean; }> = [];
    const artifactRegex = /<sapphiresArtifact[^>]*id="([^"]+)"[^>]*title="([^"]+)"[^>]*>([\s\S]*?)(?:<\/sapphiresArtifact>|$)/g;
    let artifactMatch;
    while ((artifactMatch = artifactRegex.exec(text)) !== null) {
      const [fullMatch, id, title, content] = artifactMatch;
      const isArtifactComplete = fullMatch.endsWith('</sapphiresArtifact>');
  // moved isLoadingHistory state to top-level
      const shellRegex = /<sapphiresAction\s+type="shell"[^>]*>\s*([\s\S]*?)(?:<\/sapphiresAction>|$)/g;
      let shellMatch;
      while ((shellMatch = shellRegex.exec(content)) !== null) {
        const isActionComplete = shellMatch[0].endsWith('</sapphiresAction>');
        artifacts.push({ id: `${id}-shell-${artifacts.length}`, title: `${title} - Shell Command`, type: 'shell', content: shellMatch[1].trim(), isComplete: isActionComplete && isArtifactComplete });
      }
      const fileRegex = /<sapphiresAction\s+type="file"[^>]*filePath="([^"]+)"[^>]*>\s*([\s\S]*?)(?:<\/sapphiresAction>|$)/g;
      let fileMatch;
      while ((fileMatch = fileRegex.exec(content)) !== null) {
        const isActionComplete = fileMatch[0].endsWith('</sapphiresAction>');
        artifacts.push({ id: `${id}-file-${artifacts.length}`, title: `${title} - ${fileMatch[1]}`, type: 'file', content: fileMatch[2].trim(), filePath: fileMatch[1], isComplete: isActionComplete && isArtifactComplete });
      }
    }
    return artifacts;
  }, []);

  const cleanTextFromArtifacts = useCallback((text: string) => {
    return text
      .replace(/<sapphiresArtifact[^>]*>[\s\S]*?<\/sapphiresArtifact>/g, '')
      .trim();
  }, []);

  // Throttled update function to reduce re-renders
  const updateStreamingMessage = useCallback((messageId: string, newText: string) => {
    accumulatedTextRef.current = newText;
    
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Only update if there's actual content
    if (!newText.trim()) return;
    
    // Throttle updates to every 200ms to reduce re-renders significantly
    updateTimeoutRef.current = setTimeout(() => {
      const currentArtifacts = parseArtifacts(accumulatedTextRef.current);
      const cleanContent = cleanTextFromArtifacts(accumulatedTextRef.current);
      
      // Only update if there's meaningful content
      if (cleanContent.trim() || currentArtifacts.length > 0) {
  setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, content: cleanContent, rawContent: accumulatedTextRef.current, artifacts: currentArtifacts } : msg));
      }
    }, 200); // Increased from 100ms to 200ms for better batching
  }, [parseArtifacts, cleanTextFromArtifacts]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
    accumulatedTextRef.current = '';
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Central streaming starter. If addUserMessage=false, assumes user message already present (e.g. init).
  const startAIStream = useCallback(async (prompt: string, addUserMessage: boolean) => {
    if (!prompt.trim() || isStreaming) return;

    let userMessageId: string | null = null;
    if (addUserMessage) {
      const newMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: prompt,
        timestamp: new Date(),
      };
      userMessageId = newMessage.id;
      setMessages(prev => [...prev, newMessage]);
      onSendMessage(prompt);
      // Force scroll so user immediately sees their message
      requestAnimationFrame(() => scrollToBottom());
    }

    setIsStreaming(true);
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, aiMessage]);
    setStreamingMessageId(aiMessageId);
    accumulatedTextRef.current = '';

    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      const token = await getToken();
      const res = await fetch(`${WORKER_URL}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, projectId }),
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Failed to get response reader');
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6);
            if (dataStr === '[DONE]') {
              if (updateTimeoutRef.current) { clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = null; }
              const finalArtifacts = parseArtifacts(accumulatedTextRef.current);
              const cleanContent = cleanTextFromArtifacts(accumulatedTextRef.current);
              setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, content: cleanContent, rawContent: accumulatedTextRef.current, isStreaming: false, artifacts: finalArtifacts } : m));
              setIsStreaming(false);
              setStreamingMessageId(null);
              accumulatedTextRef.current = '';
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                accumulatedTextRef.current += data.text;
                updateStreamingMessage(aiMessageId, accumulatedTextRef.current);
              }
            } catch (e) {
              // Non-fatal parse issue.
            }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Streaming error:', err);
  setMessages(prev => prev.map(m => m.id === streamingMessageId ? { ...m, content: 'Sorry, I encountered an error. Please try again.', rawContent: accumulatedTextRef.current, isStreaming: false } : m));
      }
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  }, [isStreaming, getToken, projectId, parseArtifacts, cleanTextFromArtifacts, updateStreamingMessage]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isStreaming) return;
    const current = inputValue;
    setInputValue('');
    startAIStream(current, true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Fetch conversation history from worker
  const lastHistoryFetchRef = useRef<number>(0);
  const fetchHistory = useCallback(async (opts: { cancelStreaming?: boolean; force?: boolean } = {}) => {
    if (!projectId) return;
    if (opts.cancelStreaming) {
      stopStreaming();
    }
    const now = Date.now();
    if (!opts.force && now - lastHistoryFetchRef.current < 1500) {
      return; // throttle rapid consecutive fetches
    }
    lastHistoryFetchRef.current = now;
    setIsLoadingHistory(true);
    setHistoryLoaded(false);
    try {
      const token = await getToken();
      let res = await fetch(`${WORKER_URL}/conversation/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.status === 404) {
        // Fallback to backend service
        res = await fetch(`${BACKEND_URL}/conversation/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token || ''}` }
        });
      }
      if (!res.ok) throw new Error('failed history fetch');
      const data = await res.json();
      const mapped: Message[] = (data.messages || []).map((m: any) => {
        const raw = m.content || '';
        const artifacts = parseArtifacts(raw);
        const clean = cleanTextFromArtifacts(raw);
        return {
          id: m.id,
          type: m.type,
          content: clean,
          rawContent: raw,
          timestamp: new Date(m.createdAt),
          artifacts,
        } as Message;
      });
      // Skip merge if currently streaming to avoid UI churn hiding the user message
      if (isStreaming) {
        setIsLoadingHistory(false); setHistoryLoaded(true); return;
      }
      setMessages(prev => {
        if (prev.length === 0) return mapped; // simple case
        const byId: Record<string, Message> = {};
        prev.forEach(p => { byId[p.id] = p; });
        mapped.forEach(m => {
          const existing = byId[m.id];
          if (!existing) {
            byId[m.id] = m;
          } else {
            // Preserve streaming state/artifacts if local is streaming
            byId[m.id] = {
              ...m,
              isStreaming: existing.isStreaming || m.isStreaming,
              artifacts: existing.isStreaming ? existing.artifacts : m.artifacts,
              rawContent: existing.isStreaming ? existing.rawContent : m.rawContent,
            };
          }
        });
        // Keep any local messages not yet persisted (ids starting with 'ai-' or timestamp-based) if not in fetched list
        prev.forEach(p => { if (!byId[p.id]) byId[p.id] = p; });
        const merged = Object.values(byId).sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
        return merged;
      });
    } catch (err) {
      console.error('[ChatConversation] history load error', err);
    } finally {
      setIsLoadingHistory(false);
      setHistoryLoaded(true);
    }
  }, [projectId, getToken, parseArtifacts, cleanTextFromArtifacts, stopStreaming]);

  // Initial load
  // Initial load only when projectId changes
  useEffect(() => {
    fetchHistory({ force: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Auto-refresh on tab focus / visibility (lightweight) without button
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !isStreaming && !isLoadingHistory) {
        fetchHistory();
      }
    };
    const handleFocus = () => {
      if (!isStreaming && !isLoadingHistory) fetchHistory();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchHistory, isStreaming, isLoadingHistory]);

  // Enhanced markdown renderer with memoization
  const MarkdownRenderer = React.memo<{ content: string; isStreaming?: boolean }>(({ 
    content, 
    isStreaming = false 
  }) => {
    const renderMarkdown = (text: string) => {
      // Split text into lines for processing
      const lines = text.split('\n');
      const elements: React.ReactNode[] = [];
      let currentIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Headers
        if (line.startsWith('### ')) {
          elements.push(
            <h3 key={currentIndex++} className="text-base font-semibold text-zinc-200 mt-3 mb-2">
              {line.slice(4)}
            </h3>
          );
        } else if (line.startsWith('## ')) {
          elements.push(
            <h2 key={currentIndex++} className="text-lg font-semibold text-zinc-100 mt-4 mb-3">
              {line.slice(3)}
            </h2>
          );
        } else if (line.startsWith('# ')) {
          elements.push(
            <h1 key={currentIndex++} className="text-xl font-bold text-white mt-4 mb-3">
              {line.slice(2)}
            </h1>
          );
        }
        // Code blocks
        else if (line.startsWith('```')) {
          const language = line.slice(3).trim();
          const codeLines: string[] = [];
          i++; // Skip the opening ```
          
          while (i < lines.length && !lines[i].startsWith('```')) {
            codeLines.push(lines[i]);
            i++;
          }
          
          elements.push(
            <div key={currentIndex++} className="my-3 bg-zinc-900 rounded-lg border border-zinc-700">
              {language && (
                <div className="px-3 py-2 border-b border-zinc-700 text-xs text-zinc-400 bg-zinc-800 rounded-t-lg">
                  {language}
                </div>
              )}
              <pre className="p-3 text-sm text-zinc-200 overflow-x-auto">
                <code>{codeLines.join('\n')}</code>
              </pre>
            </div>
          );
        }
        // Inline code
        else if (line.includes('`')) {
          const parts = line.split('`');
          const renderedParts = parts.map((part, index) => {
            if (index % 2 === 1) {
              return (
                <code key={index} className="bg-zinc-800 text-zinc-200 px-1 py-0.5 rounded text-sm">
                  {part}
                </code>
              );
            }
            return part;
          });
          
          elements.push(
            <p key={currentIndex++} className="text-sm text-zinc-300 mb-2 leading-relaxed">
              {renderedParts}
            </p>
          );
        }
        // Lists
        else if (line.startsWith('- ') || line.startsWith('* ')) {
          elements.push(
            <li key={currentIndex++} className="text-sm text-zinc-300 ml-4 mb-1">
              • {line.slice(2)}
            </li>
          );
        }
        // Numbered lists
        else if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            elements.push(
              <li key={currentIndex++} className="text-sm text-zinc-300 ml-4 mb-1">
                {match[1]}. {match[2]}
              </li>
            );
          }
        }
        // Empty lines
        else if (line.trim() === '') {
          elements.push(<br key={currentIndex++} />);
        }
        // Regular paragraphs
        else if (line.trim() !== '') {
          // Handle bold and italic text without dangerouslySetInnerHTML
          const renderTextWithFormatting = (text: string) => {
            const parts: React.ReactNode[] = [];
            let remaining = text;
            let key = 0;

            // Process bold text **text**
            while (remaining.includes('**')) {
              const start = remaining.indexOf('**');
              if (start === -1) break;
              
              const end = remaining.indexOf('**', start + 2);
              if (end === -1) break;

              // Add text before bold
              if (start > 0) {
                parts.push(remaining.slice(0, start));
              }

              // Add bold text
              const boldText = remaining.slice(start + 2, end);
              parts.push(<strong key={key++}>{boldText}</strong>);

              // Continue with remaining text
              remaining = remaining.slice(end + 2);
            }

            // Process italic text *text* in remaining text
            let tempRemaining = remaining;
            remaining = '';
            while (tempRemaining.includes('*')) {
              const start = tempRemaining.indexOf('*');
              if (start === -1) break;
              
              const end = tempRemaining.indexOf('*', start + 1);
              if (end === -1) break;

              // Add text before italic
              if (start > 0) {
                parts.push(tempRemaining.slice(0, start));
              }

              // Add italic text
              const italicText = tempRemaining.slice(start + 1, end);
              parts.push(<em key={key++}>{italicText}</em>);

              // Continue with remaining text
              tempRemaining = tempRemaining.slice(end + 1);
            }

            // Add any remaining text
            if (tempRemaining) {
              parts.push(tempRemaining);
            }
            if (remaining) {
              parts.push(remaining);
            }

            return parts.length > 0 ? parts : [text];
          };
          
          elements.push(
            <p 
              key={currentIndex++} 
              className="text-sm text-zinc-300 mb-2 leading-relaxed"
            >
              {renderTextWithFormatting(line)}
            </p>
          );
        }
      }

      return elements;
    };

    return (
      <div className="prose prose-sm max-w-none text-zinc-300">
        {renderMarkdown(content)}
        {isStreaming && (
          <span className="animate-pulse text-blue-400 ml-1">▋</span>
        )}
      </div>
    );
  });

  // Enhanced artifact display component with memoization
  const ArtifactDisplay = React.memo<{ artifacts: Message['artifacts'] }>(({ artifacts }) => {
    if (!artifacts || artifacts.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <div className="text-xs text-zinc-400 font-medium mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Generated Artifacts
        </div>
        {artifacts.map((artifact) => (
          <Card key={artifact.id} className={`border-zinc-700 transition-all duration-300 ${
            artifact.isComplete 
              ? "bg-zinc-800/50" 
              : "bg-zinc-800/30 border-dashed animate-pulse"
          }`}>
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {artifact.type === 'shell' ? (
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${
                        artifact.isComplete 
                          ? "bg-green-500/20" 
                          : "bg-green-500/10"
                      }`}>
                        <Terminal className={`w-3 h-3 ${
                          artifact.isComplete 
                            ? "text-green-400" 
                            : "text-green-300"
                        }`} />
                      </div>
                      <div>
                        <div className={`text-sm font-medium flex items-center gap-2 ${
                          artifact.isComplete 
                            ? "text-green-400" 
                            : "text-green-300"
                        }`}>
                          Shell Command
                          {!artifact.isComplete && (
                            <div className="flex space-x-0.5">
                              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">{artifact.title}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${
                        artifact.isComplete 
                          ? "bg-blue-500/20" 
                          : "bg-blue-500/10"
                      }`}>
                        <FileText className={`w-3 h-3 ${
                          artifact.isComplete 
                            ? "text-blue-400" 
                            : "text-blue-300"
                        }`} />
                      </div>
                      <div>
                        <div className={`text-sm font-medium flex items-center gap-2 ${
                          artifact.isComplete 
                            ? "text-blue-400" 
                            : "text-blue-300"
                        }`}>
                          {artifact.filePath || 'File'}
                          {!artifact.isComplete && (
                            <div className="flex space-x-0.5">
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">{artifact.title}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {artifact.isComplete && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700"
                        onClick={() => {
                          navigator.clipboard.writeText(artifact.content);
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700"
                        onClick={() => {
                          if (artifact.type === 'shell') {
                            console.log('Execute shell command:', artifact.content);
                            // You can implement shell command execution here
                          } else {
                            navigator.clipboard.writeText(artifact.content);
                          }
                        }}
                      >
                        {artifact.type === 'shell' ? (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Run
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="relative">
                <pre className={`text-xs p-3 rounded border overflow-x-auto max-h-40 overflow-y-auto transition-all duration-300 ${
                  artifact.isComplete 
                    ? "text-zinc-300 bg-zinc-900/70 border-zinc-700" 
                    : "text-zinc-400 bg-zinc-900/50 border-zinc-600 border-dashed"
                }`}>
                  <code>{artifact.content}</code>
                  {!artifact.isComplete && (
                    <span className="animate-pulse text-blue-400 ml-1">▋</span>
                  )}
                </pre>
                
                {artifact.type === 'file' && artifact.filePath && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className={`text-xs border-zinc-600 ${
                      artifact.isComplete 
                        ? "bg-zinc-800 text-zinc-400" 
                        : "bg-zinc-700 text-zinc-500"
                    }`}>
                      {artifact.filePath?.split('.').pop()?.toUpperCase() || 'FILE'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  });

  // Memoized message component to prevent unnecessary re-renders
  const toggleRaw = (id: string) => {
    setShowRawIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const MessageItem = React.memo<{ message: Message }>(({ message }) => {
    const showRaw = showRawIds.has(message.id);
    return (
      <div className="space-y-2">
        <div className={`flex gap-3 items-start ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow ring-1 ring-zinc-700/50 ${
              message.type === 'ai'
                ? 'bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-indigo-500'
                : 'bg-zinc-700'
            }`}
          >
            {message.type === 'ai' ? <Sparkles className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
          </div>
      <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
            <div
              className={`group relative px-4 py-3 rounded-xl inline-block align-top text-sm leading-relaxed border whitespace-pre-wrap break-words ${
                message.type === 'user'
                  ? 'bg-blue-600 border-blue-500/60 text-white shadow-lg shadow-blue-900/30 ml-auto'
                  : 'bg-zinc-900/70 backdrop-blur border-zinc-700/60 text-zinc-100 shadow-inner'
              }`}
              style={{
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              width: '100%',
              maxWidth: dynamicBubbleMax,
              minWidth: Math.min(360, dynamicBubbleMax),
              }}
            >
              {message.type === 'ai' ? (
                showRaw && message.rawContent ? (
                  <pre className="text-xs whitespace-pre-wrap font-mono text-zinc-300 max-h-60 overflow-auto pr-2">{message.rawContent}</pre>
                ) : (
                  <MarkdownRenderer content={message.content} isStreaming={message.isStreaming || false} />
                )
              ) : (
                <div>{message.content}</div>
              )}
              {message.type === 'ai' && (
                <div className="absolute -top-2 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {message.rawContent && (
                    <Button
                      onClick={() => toggleRaw(message.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] bg-zinc-800/70 hover:bg-zinc-700/80 border border-zinc-600/50 leading-none"
                    >
                      {showRaw ? 'Parsed' : 'Raw'}
                    </Button>
                  )}
                  <Button
                    onClick={() => navigator.clipboard.writeText(showRaw && message.rawContent ? message.rawContent : message.content)}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] bg-zinc-800/70 hover:bg-zinc-700/80 border border-zinc-600/50 leading-none"
                  >
                    Copy
                  </Button>
                </div>
              )}
            </div>
            {message.artifacts && message.artifacts.length > 0 && <ArtifactDisplay artifacts={message.artifacts} />}
          </div>
        </div>
      </div>
    );
  });

  // Auto-start AI response for a single pre-seeded user message (init prompt) without duplicating it.
  const hasBootstrappedRef = useRef(false);
  useEffect(() => {
    // Wait until history loaded to decide on bootstrapping
    if (!historyLoaded) return;
    if (hasBootstrappedRef.current) return;
    if (!initialMessages || initialMessages.length === 0) return;
    const first = initialMessages[0];
    if (first.type !== 'user') return;
    // If history already has content, don't auto-bootstrap unless empty.
    if (messages.length > 0) return;
    hasBootstrappedRef.current = true;
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[ChatConversation] Bootstrapping init prompt after history load', first.content);
    }
    setMessages([first]);
    setTimeout(() => startAIStream(first.content, false), 50);
  }, [historyLoaded, initialMessages, messages, startAIStream]);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[ChatConversation] messages state before render:', messages);
  }
  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white">
      {/* Left Panel - Chat */}
  <div data-chat-panel className={`relative flex flex-col h-full flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 transition-[width] duration-150`} style={{ width: expanded ? '100%' : sideWidth }}>
        {/* Resize Handle */}
        {!expanded && (
          <div onMouseDown={startResize} className="absolute top-0 -right-1 w-2 cursor-col-resize h-full group select-none">
            <div className="w-1 mx-auto h-full rounded-full bg-zinc-700/30 group-hover:bg-zinc-400/70 transition-colors" />
          </div>
        )}
  {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 backdrop-blur bg-zinc-900/60">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-medium flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Builder Chat
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
            {isLoadingHistory && <span className="px-2 py-1 rounded bg-zinc-800/70 text-zinc-300 border border-zinc-700/60">Syncing…</span>}
            {isStreaming && <span className="px-2 py-1 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30">Streaming</span>}
          </div>
        </div>
        {/* Messages */}
        <ScrollArea className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
          {isLoadingHistory && messages.length === 0 ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    <div className="h-3 bg-zinc-800 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="flex-none p-3 border-t border-zinc-800 bg-zinc-900">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isLoadingHistory ? 'Loading conversation…' : (isStreaming ? 'AI is crafting response...' : 'Ask Orchids to build anything...')}
              disabled={isStreaming || isLoadingHistory}
              className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm h-10 disabled:opacity-60"
            />
            {isStreaming ? (
              <Button
                onClick={stopStreaming}
                size="sm"
                variant="destructive"
                className="h-10 w-10 p-0 bg-red-600 hover:bg-red-700"
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
          {isStreaming && (
            <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>AI is analyzing and generating response...</span>
              </div>
              <div className="flex items-center gap-1 text-xs bg-zinc-800 px-2 py-1 rounded">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-zinc-300">Processing</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAppBuilder;
