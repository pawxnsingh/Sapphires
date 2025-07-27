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

app.listen(3001, () => {
  console.log(`Server is running on {http://localhost:3001}`);
});
