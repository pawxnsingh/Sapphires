import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { Badge } from "./ui/badge";
import axios from "axios";
import { WORKER_URL } from "@/config";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { time } from "console";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  code?: string;
}

interface AIAppBuilderProps {
  initialMessages?: Message[];
  onSendMessage?: (message: string) => void;
  onRunCode?: (code: string) => void;
}

const AIAppBuilder: React.FC<AIAppBuilderProps> = ({
  initialMessages = [
    {
      id: "1",
      type: "ai",
      content: "Hello! I'm your AI assistant",
      timestamp: new Date(),
    },
  ],
  onSendMessage = () => {},
  onRunCode = () => {},
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const { projectId } = useParams();
  const [inputValue, setInputValue] = useState("");
  const { getToken } = useAuth();
  const [currentCode, setCurrentCode] = useState(
    initialMessages.find((m) => m.code)?.code || ""
  );
  const [activeTab, setActiveTab] = useState("code");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    onSendMessage(inputValue);
    setInputValue("");
    try {
      const token = await getToken();
      const res = await axios.post(
        `${WORKER_URL}/prompt`,
        {
          prompt: inputValue,
          projectId: projectId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "stream",
        }
      );

      // i need to parse the response
      const stream: Readable = res.data as any;
      let buffer = "";

      stream.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!; // keep incomplete

        for (const part of parts) {
          for (const line of part.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const json = line.replace(/^data:\s*/, "").trim();
            if (json === "[DONE]") {
              // onDone();
              stream.destroy();
              return;
            }
            try {
              const payload = JSON.parse(json);
              // onMessage(payload);
            } catch (err) {
              console.warn("Invalid JSON chunk:", json);
            }
          }
        }
      });

      const uuid = randomUUID();
      const aiMessage: Message = {
        id: uuid,
        timestamp: new Date(),
        content: buffer,
        type: "ai",
        code: buffer,
      };
      
      setMessages([...messages, aiMessage]);
    } catch (err) {
      // stream.on('end', onDone);
      // stream.on('error', onError);
      // onError(err);
      console.error(err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white">
      {/* Left Panel - Chat */}
      <div className="flex flex-col h-full w-[3 50px] border-r border-zinc-800 bg-zinc-900/50">
        {/* Messages */}
        <ScrollArea className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div
                  className={`flex gap-2 items-start ${message.type === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === "ai"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500"
                        : "bg-zinc-700"
                    }`}
                  >
                    {message.type === "ai" ? (
                      <Sparkles className="w-3 h-3 text-white" />
                    ) : (
                      <User className="w-3 h-3 text-white" />
                    )}
                  </div>

                  <div
                    className={`flex-1 ${message.type === "user" ? "text-right" : ""}`}
                  >
                    <div
                      className={`text-xs px-3 py-2 rounded-lg max-w-[85%] inline-block ${
                        message.type === "user"
                          ? "bg-blue-600 text-white ml-auto"
                          : "bg-zinc-800 text-zinc-100"
                      }`}
                    >
                      {message.content}
                    </div>

                    {message.code && (
                      <div className="mt-2 p-2 bg-zinc-800 rounded-lg border border-zinc-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            <Code className="w-3 h-3 text-purple-400" />
                            <span className="text-xs text-purple-400">
                              Generated Code
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
                            onClick={() => setCurrentCode(message.code || "")}
                          >
                            View
                          </Button>
                        </div>
                        <pre className="text-xs text-zinc-300 bg-zinc-900 p-2 rounded overflow-x-auto">
                          <code>{message.code.substring(0, 150)}...</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="flex-none p-3 border-t border-zinc-800 bg-zinc-900">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask Orchids to make anything..."
              className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm h-9"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 h-9 w-9 p-0"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAppBuilder;
