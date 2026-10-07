import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as chat } from "@/app/api/chat/route";
import { GET as models } from "@/app/api/models/route";
import { systemPrompt } from "@/core/prompt";
import { FAKE_MODELS, REJECTED_KEY, fixture, startFakeOpenAI } from "./fake-openai";

let fake: Awaited<ReturnType<typeof startFakeOpenAI>>;

beforeAll(async () => {
  fake = await startFakeOpenAI();
});
afterAll(() => fake.close());
afterEach(() => {
  vi.unstubAllEnvs();
  fake.requests.length = 0;
});

function useFakeProvider(env: Record<string, string> = {}) {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_BASE_URL", fake.url);
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

function useNoProvider() {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_BASE_URL", "");
  vi.stubEnv("OLLAMA_HOST", "127.0.0.1:9");
}

function ask(question: string, model?: string) {
  const body = { model, messages: [{ role: "user", content: question }] };
  return chat(new Request("http://app/api/chat", { method: "POST", body: JSON.stringify(body) }));
}

async function answerText(response: Response): Promise<string> {
  const lines = (await response.text()).split("\n").filter(Boolean);
  return lines.map((line) => JSON.parse(line).choices[0]?.delta?.content ?? "").join("");
}

describe("POST /api/chat", () => {
  it("streams the model's answer", async () => {
    useFakeProvider();

    const response = await ask("What is the capital of France?");

    expect(response.status).toBe(200);
    expect(await answerText(response)).toBe(fixture("plain"));
  });

  it("sends the system prompt before the conversation", async () => {
    useFakeProvider();

    await (await ask("Hi")).text();

    expect(fake.requests[0].messages[0]).toEqual({ role: "system", content: systemPrompt });
    expect(fake.requests[0].messages[1]).toEqual({ role: "user", content: "Hi" });
  });

  it("uses the model the user picked", async () => {
    useFakeProvider({ OPENAI_MODEL: "fake-small" });

    await (await ask("Hi", "fake-large")).text();

    expect(fake.requests[0].model).toBe("fake-large");
  });

  it("falls back to the configured model, then the first available one", async () => {
    useFakeProvider({ OPENAI_MODEL: "fake-large" });
    await (await ask("Hi")).text();
    vi.stubEnv("OPENAI_MODEL", "");
    await (await ask("Hi")).text();

    expect(fake.requests.map((r) => r.model)).toEqual(["fake-large", FAKE_MODELS[0]]);
  });

  it("explains how to set up a provider when none is available", async () => {
    useNoProvider();

    const response = await ask("Hi");

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/OPENAI_API_KEY.*Ollama/);
  });

  it("passes the provider's error and status through", async () => {
    useFakeProvider({ OPENAI_API_KEY: REJECTED_KEY });

    const response = await ask("Hi");

    expect(response.status).toBe(401);
    expect((await response.json()).error).toMatch(/Incorrect API key/);
  });
});

describe("GET /api/models", () => {
  it("lists the provider's models with the configured one selected", async () => {
    useFakeProvider({ OPENAI_MODEL: "fake-large" });

    const response = await models();

    expect(await response.json()).toEqual({ models: FAKE_MODELS, selected: "fake-large" });
  });

  it("selects the first model when none is configured", async () => {
    useFakeProvider();

    expect((await (await models()).json()).selected).toBe(FAKE_MODELS[0]);
  });

  it("reports that setup is needed when no provider is available", async () => {
    useNoProvider();

    const response = await models();

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/OPENAI_API_KEY/);
  });
});
