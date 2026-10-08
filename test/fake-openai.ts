import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";

export const FAKE_MODELS = ["fake-small", "fake-large"];
export const REJECTED_KEY = "bad-key";
export const REJECTED_QUESTION = /please fail/i;

const fixtureByKeyword: [RegExp, string][] = [
  [/bill|split/i, "bill-splitter"],
  [/sav(e|ings)|retire/i, "savings"],
  [/roast/i, "roast-planner"],
  [/orbit|planet/i, "orbit"],
  [/pendulum/i, "pendulum"],
  [/spinning cube/i, "broken-scene"],
  [/bouncing ball/i, "scene-typo"],
  [/scene of its own/i, "own-scene"],
  [/pick a level/i, "root-first"],
];

// Streamed with pauses like a real model, so the app renders the answer while it's still partial.
const PAUSED_FIXTURES = new Set(["root-first"]);

export function fixture(name: string): string {
  return readFileSync(join(import.meta.dirname, "fixtures", `${name}.oui`), "utf8");
}

export type ChatRequest = { model: string; messages: { role: string; content: string }[] };

export async function startFakeOpenAI(port = 0) {
  const requests: ChatRequest[] = [];
  const server = createServer(async (req, res) => {
    if (req.headers.authorization === `Bearer ${REJECTED_KEY}`) {
      return sendJson(res, 401, { error: { message: "Incorrect API key provided" } });
    }
    if (req.method === "GET" && req.url === "/v1/models") {
      return sendJson(res, 200, { object: "list", data: FAKE_MODELS.map((id) => ({ id })) });
    }
    if (req.method === "POST" && req.url === "/v1/chat/completions") {
      const body = JSON.parse(await readBody(req)) as ChatRequest;
      requests.push(body);
      if (REJECTED_QUESTION.test(lastQuestion(body))) {
        return sendJson(res, 400, { error: { message: "The model rejected this request" } });
      }
      const name = pickFixture(body);
      return streamAnswer(res, fixture(name), PAUSED_FIXTURES.has(name) ? 40 : 0);
    }
    sendJson(res, 404, { error: { message: "Not found" } });
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const { port: actual } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${actual}/v1`,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function lastQuestion({ messages }: ChatRequest): string {
  return messages.findLast((m) => m.role === "user")?.content ?? "";
}

function pickFixture(request: ChatRequest): string {
  const question = lastQuestion(request);
  return fixtureByKeyword.find(([pattern]) => pattern.test(question))?.[1] ?? "plain";
}

async function streamAnswer(res: ServerResponse, answer: string, pauseMs: number) {
  res.writeHead(200, { "Content-Type": "text/event-stream" });
  for (const piece of answer.match(/[\s\S]{1,24}/g) ?? []) {
    if (pauseMs) await new Promise((resolve) => setTimeout(resolve, pauseMs));
    const chunk = { id: "fake", object: "chat.completion.chunk", created: 0, model: "fake" };
    const choices = [{ index: 0, delta: { content: piece }, finish_reason: null }];
    res.write(`data: ${JSON.stringify({ ...chunk, choices })}\n\n`);
  }
  res.end("data: [DONE]\n\n");
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

if (import.meta.main) {
  const { url } = await startFakeOpenAI(Number(process.env.PORT ?? 4010));
  console.log(`Fake OpenAI listening on ${url}`);
}
