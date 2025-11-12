"use client";
import { useAuth } from "@clerk/nextjs";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import HeaderWithSidebar from "@/components/arenaNavbar";
import { Button } from "@/components/ui/button";
import AIAppBuilder from "@/components/ChatConversation";

function Project({
  projectId,
  workerUrl,
  initPrompt,
}: {
  projectId: string;
  workerUrl: string;
  initPrompt?: string;
}) {
  const { getToken } = useAuth();
  // Local UI state (future expansion for editors, etc.)
  const [tab, setTab] = useState("code");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Remove initPrompt from query after first mount so refresh doesn't re-trigger
  useEffect(() => {
    if (!initPrompt) return;
    // Build new params excluding initPrompt
    const params = new URLSearchParams(searchParams?.toString());
    if (params.has('initPrompt')) {
      params.delete('initPrompt');
      const newQuery = params.toString();
      const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Legacy onSubmit removed: streaming handled internally in ChatConversation

  return (
    <div className="bg-black text-neutral-100 h-screen flex flex-col">
      <HeaderWithSidebar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar or panels */}
        <div className="border-r border-neutral-800 h-full flex flex-col">
          <AIAppBuilder initialMessages={initPrompt ? [{ id: 'init', type: 'user', content: initPrompt, timestamp: new Date() }] : []} />
        </div>

        {/* Draggable divider here if needed */}

        {/* Main content area */}
        <div className="flex-1 min-w-0 overflow-hidden p-4 flex flex-col">
          <div className="flex items-center justify-end gap-2 pb-2">
            <Button
              className={`${tab !== "code" ? `text-black` : ``} `}
              variant={tab === "code" ? "default" : "outline"}
              onClick={() => setTab("code")}
            >
              Code
            </Button>
            <Button
              className={`${tab !== "preview" ? `text-black` : ``} `}
              variant={tab === "preview" ? "default" : "outline"}
              onClick={() => setTab("preview")}
            >
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => setTab("split")}
              className={`${tab !== "split" ? `text-black` : ``} `}
            >
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
