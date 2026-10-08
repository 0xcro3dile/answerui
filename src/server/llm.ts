import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { systemPrompt } from "@/core/prompt";
import { resolveProvider, type Provider } from "@/core/provider";

export function findProvider(): Promise<Provider | null> {
  return resolveProvider(process.env, isReachable);
}

export async function listModels(provider: Provider): Promise<string[]> {
  const page = await client(provider).models.list();
  return page.data.map((model) => model.id);
}

export async function streamAnswer(
  provider: Provider,
  request: { model: string; messages: ChatCompletionMessageParam[]; signal: AbortSignal },
): Promise<ReadableStream> {
  const stream = await client(provider).chat.completions.create(
    {
      ...provider.extraBody,
      model: request.model,
      messages: [{ role: "system", content: systemPrompt }, ...request.messages],
      stream: true,
    },
    { signal: request.signal },
  );
  return stream.toReadableStream();
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
