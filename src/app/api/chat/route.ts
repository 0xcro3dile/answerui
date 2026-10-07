import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { SETUP_NEEDED, errorResponse, findProvider, streamAnswer } from "@/server/models";

type ChatBody = { model?: string; messages: ChatCompletionMessageParam[] };

export async function POST(req: Request) {
  const provider = await findProvider();
  if (!provider) return Response.json({ error: SETUP_NEEDED }, { status: 503 });

  const { model, messages } = (await req.json()) as ChatBody;
  try {
    const stream = await streamAnswer(provider, { model, messages, signal: req.signal });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
