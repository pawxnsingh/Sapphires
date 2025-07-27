"use client";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import React, { useCallback, useState } from "react";
import HeaderWithSidebar from "@/components/arenaNavbar";
import { Button } from "@/components/ui/button";
import AIAppBuilder from "@/components/ChatConversation";

function Project({
  projectId,
  workerUrl,
}: {
  projectId: string;
  workerUrl: string;
}) {
  const { getToken } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [openEditor, setOpenEditor] = useState("false");
  const [tab, setTab] = useState("code");

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = await getToken();

    await axios.post(
      "/prompt",
      {
        projectId: projectId,
        prompt: prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    setPrompt("");
  }, []);

  return (
    <div className="bg-black text-neutral-100 h-screen flex flex-col">
      <HeaderWithSidebar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar or panels */}
        <div className="border-r border-neutral-800 h-full flex flex-col">
          <AIAppBuilder />
        </div>

        {/* Draggable divider here if needed */}

        {/* Main content area */}
        <div className="flex-1 min-w-0 overflow-hidden p-4 flex flex-col">
          <div className="flex items-center justify-end gap-2 pb-2">
            <Button
              variant={tab === "code" ? "default" : "outline"}
              onClick={() => setTab("code")}
            >
              Code
            </Button>
            <Button
              variant={tab === "preview" ? "default" : "outline"}
              onClick={() => setTab("preview")}
            >
              Preview
            </Button>
            <Button variant="outline" onClick={() => setTab("split")}>
              Split
            </Button>
          </div>

          {/* Content views */}
          <div className="flex-1 relative flex gap-2">
            <div
              className={`${
                tab === "code"
                  ? "flex-1"
                  : tab === "split"
                    ? "flex-1"
                    : "flex-0"
              } transition-all duration-300 h-full`}
            >
              <iframe
                src={"http://localhost:8080"}
                className="w-full h-full rounded-lg"
                title="Project Worker"
              />
            </div>
            <div
              className={`${
                tab === "preview"
                  ? "flex-1"
                  : tab === "split"
                    ? "flex-1"
                    : "flex-0"
              } transition-all duration-300 h-full`}
            >
              <iframe
                src={"http://localhost:8081"}
                className="w-full h-full rounded-lg"
                title="Project preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Project;
