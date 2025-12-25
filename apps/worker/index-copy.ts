import express, { type Request, type Response } from "express";
import cors from "cors";
import { primaClient } from "@repo/db/client";
import { AzureOpenAI } from "openai";
import { systemPrompt } from "./system_prompt";
import { ArtifactProcessor } from "./runArtifacts";

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'worker' });
});

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_BASE,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
});

app.post("/prompt", async (req: Request, res: Response) => {
  const { prompt, projectId } = req.body;
  // here we need to create a new chat message

  // 1. Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const resp = await primaClient.prompt.create({
    data: {
      content: prompt,
      projectId: projectId,
      type: "USER",
    },
  });

  // then get all the message in the current prompt
  const prompts = await primaClient.prompt.findMany({
    where: {
      projectId: projectId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  // now i have access to the all the prompt in the conversations,
  // now i have to preprocess the fetched prompts in the conversations
  // i actually need to call the llm
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [];

  messages.push({
    role: "system",
    content: systemPrompt("REACT_NATIVE"),
  });

  // Add all conversation history
  prompts.forEach((msg) => {
    messages.push({
      role: msg.type === "USER" ? "user" : "assistant",
      content: msg.content,
    });
  });

  console.log("all message", messages);

  const stream = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
    messages: messages,
    stream: true,
  })

  // Initialize artifact processor - use projectPath if provided, otherwise default to cwd
  const artifactProcessor = new ArtifactProcessor("/tmp/sapphires-worker"); // pass the dir here as well
  let assistantResponse = "";

  // 3. Loop over chunks and forward them as `data:` messages
  try {
    for await (const chunk of stream) {
      for (const choice of chunk.choices) {
        const text = choice.delta?.content;
        if (!text) continue;

        // Process artifacts in the background
        await artifactProcessor.processChunk(text);
        
        // Accumulate the full response for saving to database
        assistantResponse += text;

        // SSE format: each message starts with "data: "
        process.stdout.write(text);
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    
    // Finalize any remaining artifacts
    await artifactProcessor.finalize();
    
    // Save the assistant's response to the database
    if (assistantResponse.trim()) {
      await primaClient.prompt.create({
        data: {
          content: assistantResponse,
          projectId: projectId,
          type: "AI",
        },
      });
    }
    
    // Signal the end
    res.write(`event: done\ndata: [DONE]\n\n`);
  } catch (err: any) {
    console.error("Stream error:", err);
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`
    );
  } finally {
    res.end();
  }
});

// Fetch full conversation history for a project (user + AI prompts) ordered ascending
app.get('/conversation/:projectId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ error: 'projectId missing' });
    const prompts = await primaClient.prompt.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  console.log('[worker] conversation fetch', projectId, prompts.length);
    return res.json({
      messages: prompts.map(p => ({
        id: p.id,
        type: p.type === 'USER' ? 'user' : 'ai',
        content: p.content,
        createdAt: p.createdAt,
      }))
    });
  } catch (e: any) {
    console.error('conversation fetch error', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.listen(9090, () => {
  console.log(`server is running at http://localhost:9090`);
});
