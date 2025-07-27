import ProjectWithInitPrompt from "@/components/ProjectInitPrompts";
import { WORKER_URL } from "@/config";

interface Params {
  params: Promise<{ projectId: string }>;
}

const ProjectArena = async ({ params }: Params) => {
  const projectId = (await params).projectId;

  return <ProjectWithInitPrompt projectId={projectId} workerUrl={WORKER_URL}/>;
};

export default ProjectArena;
