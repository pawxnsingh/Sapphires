import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { spawn } from "bun";

type Action =
  | { kind: "file"; filepath: string; content: string }
  | { kind: "shell"; dir: string; cmd: string };

// simple helpers ------------------------------------------------------------
const ACTION_OPEN  = /<sapphiresAction\b([^>]*)>/;
const ACTION_CLOSE = /<\/sapphiresAction>/;

// take one <sapphiresAction …> … </sapphiresAction> and turn it into an Action
function parseAction(xml: string): Action {
  const match = xml.match(/^<sapphiresAction\b([^>]*)>/);
  if (!match) throw new Error("Invalid action XML");
  
  const attrStr = match[1] || "";
  const attrs = Object.fromEntries(
    [...attrStr.matchAll(/(\w+)="([^"]*)"/g)].map(([, k, v]) => [k, v])
  );

  const inner = xml
    .replace(/^<sapphiresAction\b[^>]*>/, "")
    .replace(/<\/sapphiresAction>$/, "");

  if (attrs["type"] === "file") {
    return {
      kind: "file",
      filepath: attrs["filePath"],
      content: inner,
    };
  }
  // default to shell
  return {
    kind: "shell",
    dir: attrs["cwd"] ?? ".",
    cmd: inner.trim(),
  };
}

// dispatch: write file or run command ---------------------------------------
async function dispatch(a: Action, root: string) {
  if (a.kind === "file") {
    const full = resolve(root, a.filepath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, a.content, "utf8");
    console.log(`[file] wrote ${a.filepath}`);
  } else {
    const proc = spawn({
      cmd: ["sh", "-c", a.cmd],
      cwd: resolve(root, a.dir),
      stdout: "pipe",
      stderr: "inherit",
    });
    
    // Read stdout using Bun's stream API
    const chunks: Uint8Array[] = [];
    const reader = proc.stdout!.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    
    // Combine chunks and decode
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    const txt = new TextDecoder().decode(combined);
    console.log(`[shell] ${a.cmd}\n${txt.trim()}`);
    
    await proc.exited;
    if (proc.exitCode !== 0)
      throw new Error(`Shell command failed (${proc.exitCode})`);
  }
}

// the main incremental runner ----------------------------------------------
export async function runTextStream(
  stream: ReadableStream<Uint8Array>,
  projectRoot = process.cwd(),
) {
  const dec = new TextDecoder();
  let buf = "";

  for await (const chunk of stream) {
    buf += dec.decode(chunk);

    // keep pulling actions out of the buffer as soon as they're complete
    // (open‑tag must appear before close‑tag)
    while (true) {
      const openIdx = buf.search(ACTION_OPEN);
      if (openIdx === -1) break;

      const closeIdx = buf.search(ACTION_CLOSE);
      if (closeIdx === -1 || closeIdx < openIdx) break; // wait for more text

      const actionXml = buf.slice(openIdx, closeIdx + "</sapphiresAction>".length);
      buf = buf.slice(closeIdx + "</sapphiresAction>".length); // consume it

      await dispatch(parseAction(actionXml), projectRoot);
    }
  }
}

// Helper class for processing streaming text with artifact parsing
export class ArtifactProcessor {
  private buffer = "";
  private projectRoot: string;
  
  constructor(projectRoot: any) {
    this.projectRoot = projectRoot;
  }

  async processChunk(text: string): Promise<string> {
    this.buffer += text;
    
    // Process any complete actions
    while (true) {
      const openIdx = this.buffer.search(ACTION_OPEN);
      if (openIdx === -1) break;

      const closeIdx = this.buffer.search(ACTION_CLOSE);
      if (closeIdx === -1 || closeIdx < openIdx) break; // wait for more text

      const actionXml = this.buffer.slice(openIdx, closeIdx + "</sapphiresAction>".length);
      this.buffer = this.buffer.slice(closeIdx + "</sapphiresAction>".length); // consume it

      try {
        await dispatch(parseAction(actionXml), this.projectRoot);
      } catch (error) {
        console.error("Error processing artifact:", error);
      }
    }

    return text; // Return the original text for streaming to client
  }

  // Process any remaining buffer content at the end
  async finalize(): Promise<void> {
    // If there's any remaining content in buffer, it might be incomplete
    // You can add logic here to handle partial actions if needed
    if (this.buffer.trim()) {
      console.log("Remaining buffer content:", this.buffer);
    }
  }
}
