"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Project from "@/app/project/[projectId]/Project";
import axios from "axios";
import { WORKER_URL } from "@/config";

function ProjectWithInitRequest({
  projectId,
  workerUrl,
}: {
  projectId: string;
  workerUrl: string;
}) {
  const searchParams = useSearchParams();
  const initPrompt = searchParams.get("initPrompt") || undefined;
  const { getToken } = useAuth();
  const hasPostedRef = useRef(false);

  // Fire the initial prompt only once when present
  useEffect(() => {
    if (!initPrompt || hasPostedRef.current) return;
    hasPostedRef.current = true;
    (async () => {
      try {
        const token = await getToken();
        await axios.post(
          `${WORKER_URL}/prompt`,
          {
            prompt: initPrompt,
            projectId: projectId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (e) {
        console.error("Failed to send init prompt", e);
      }
    })();
  }, [projectId, initPrompt, getToken]);

  return <Project projectId={projectId} workerUrl={workerUrl} initPrompt={initPrompt} />;
}

export default ProjectWithInitRequest;
