"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
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
  const initPrompts = searchParams.get("initPrompt");
  const { getToken } = useAuth();

  // here we will get the init prompts and you have to put that init prompt in the db using the fcking api
  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await axios.post(
        `${WORKER_URL}/prompt`,
        {
          prompt: initPrompts,
          projectId: projectId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    })();
  }, [projectId, workerUrl, initPrompts]);

  return <Project projectId={projectId} workerUrl={workerUrl} />;
}

export default ProjectWithInitRequest;
