import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { systemPrompt } from "@/core/prompt";
import { resolveProvider, type Provider } from "@/core/provider";
import { createStateLineHolder } from "@/core/state-lines";

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
  return stream.toReadableStream().pipeThrough(holdUnfinishedStateLines());
}

// The stream is NDJSON, one chat completion chunk per line. Passes each chunk's text through the
// state line holder, and releases anything still held with the chunk that finishes the answer.
function holdUnfinishedStateLines(): TransformStream<Uint8Array, Uint8Array> {
  const holder = createStateLineHolder();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffered = "";
  let last: ChatCompletionChunk | undefined;
  const emit = (controller: TransformStreamDefaultController<Uint8Array>, chunk: object) =>
    controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));

  return new TransformStream({
    transform(bytes, controller) {
      buffered += decoder.decode(bytes, { stream: true });
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      for (const line of lines.filter((text) => text.trim())) {
        const chunk = JSON.parse(line) as ChatCompletionChunk;
        const choice = chunk.choices[0];
        if (choice) {
          const text = holder.push(choice.delta?.content ?? "");
          choice.delta = {
            ...choice.delta,
            content: choice.finish_reason ? text + holder.flush() : text,
          };
        }
        last = chunk;
        emit(controller, chunk);
      }
    },
    flush(controller) {
      const rest = holder.flush();
      if (rest && last) {
        emit(controller, {
          ...last,
          choices: [{ index: 0, delta: { content: rest }, finish_reason: null }],
        });
      }
    },
  });
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
