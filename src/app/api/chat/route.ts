import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { SETUP_NEEDED, errorResponse, findProvider, streamAnswer } from "@/server/llm";

type ChatRequest = { model?: string; messages: ChatCompletionMessageParam[] };

export async function POST(req: Request) {
  const body = await readChatRequest(req);
  if (!body)
    return Response.json({ error: "Expected JSON with a messages array." }, { status: 400 });

  const provider = await findProvider();
  if (!provider) return Response.json({ error: SETUP_NEEDED }, { status: 503 });

  try {
    const stream = await streamAnswer(provider, { ...body, signal: req.signal });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function readChatRequest(req: Request): Promise<ChatRequest | null> {
  const body = await req.json().catch(() => null);
  return Array.isArray(body?.messages) ? body : null;
}
