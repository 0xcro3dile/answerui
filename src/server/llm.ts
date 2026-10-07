import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { systemPrompt } from "@/core/prompt";
import { resolveProvider, type Provider } from "@/core/provider";

export const SETUP_NEEDED =
  "No model provider found. Set OPENAI_API_KEY (and optionally OPENAI_BASE_URL and OPENAI_MODEL), or start Ollama.";

export function findProvider(): Promise<Provider | null> {
  return resolveProvider(process.env, isReachable);
}

export async function listModels(provider: Provider): Promise<string[]> {
  const page = await client(provider).models.list();
  return page.data.map((model) => model.id);
}

export async function streamAnswer(
  provider: Provider,
  request: { model?: string; messages: ChatCompletionMessageParam[]; signal: AbortSignal },
): Promise<ReadableStream> {
  const model = request.model || provider.model || (await listModels(provider))[0];
  const stream = await client(provider).chat.completions.create(
    {
      model,
      messages: [{ role: "system", content: systemPrompt }, ...request.messages],
      stream: true,
    },
    { signal: request.signal },
  );
  return stream.toReadableStream();
}

export function errorResponse(error: unknown): Response {
  const status = error instanceof OpenAI.APIError && error.status ? error.status : 502;
  const message = error instanceof Error ? error.message : "The model provider failed.";
  return Response.json({ error: message }, { status });
}

function client({ baseURL, apiKey }: Provider) {
  return new OpenAI({ baseURL, apiKey });
}

async function isReachable(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(500) })).ok;
  } catch {
    return false;
  }
}
