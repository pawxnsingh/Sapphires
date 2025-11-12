import { primaClient } from "@repo/db/client";
import { redisClient } from "@repo/redis/client";
import { authMiddleware } from "./middleware";

import express, { type Request, type Response } from "express";
import cors from "cors";

// so i need an endpoint that basically allow me to create a new project and fetch all the project
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "keep the hope alive!!!!",
  });
});

// create a new project
app.post(
  "/project",
  authMiddleware,
  async (req: Request, res: Response): Promise<any> => {
    const { projname } = req.body;
    const userId = req.userId!;

    const project = await primaClient.project.create({
      data: {
        userId,
        description: projname,
      },
    });

    return res.status(200).json({
      projectId: project.id,
    });
  }
);

// get the list of all the projects
app.get("/projects", authMiddleware, (req: Request, res: Response) => {
  const userId = req.userId;
  const project = primaClient.project.findFirst({
    where: {
      userId: userId,
    },
  });
  res.status(200).json(project);
});

// Fetch conversation history (user + ai prompts) for a project the user owns
app.get('/conversation/:projectId', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectId } = req.params;
    const userId = req.userId!;
    if (!projectId) return res.status(400).json({ error: 'projectId missing' });

    const project = await primaClient.project.findFirst({ where: { id: projectId, userId } });
    if (!project) return res.status(404).json({ error: 'project not found' });

    const prompts = await primaClient.prompt.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });
    return res.json({
      messages: prompts.map(p => ({
        id: p.id,
        type: p.type === 'USER' ? 'user' : 'ai',
        content: p.content,
        createdAt: p.createdAt
      }))
    });
  } catch (e: any) {
    console.error('[backend] conversation fetch error', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.listen(3001, () => {
  console.log(`Server is running on {http://localhost:3001}`);
});
