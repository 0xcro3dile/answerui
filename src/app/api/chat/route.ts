import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { findProvider, streamAnswer } from "@/server/llm";
import { failure, providerFailed, setupNeeded, untrustedRequest } from "@/server/responses";

type ChatRequest = { model?: string; messages: ChatCompletionMessageParam[] };

export async function POST(req: Request) {
  const untrusted = untrustedRequest(req);
  if (untrusted) return untrusted;

  const body = await readChatRequest(req);
  if (!body) return failure("Expected JSON with a non-empty messages array.", 400);

  const provider = await findProvider().catch((error: Error) => error);
  if (provider instanceof Error) return failure(provider.message, 500);
  if (!provider) return setupNeeded();

  const model = body.model || provider.model;
  if (!model) return failure("Choose a model in the app, or set OPENAI_MODEL.", 400);

  try {
    const stream = await streamAnswer(provider, {
      model,
      messages: body.messages,
      signal: req.signal,
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return providerFailed(error, provider);
  }
}

async function readChatRequest(req: Request): Promise<ChatRequest | null> {
  const body = await req.json().catch(() => null);
  return Array.isArray(body?.messages) && body.messages.length > 0 ? body : null;
}
