import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as chat } from "@/app/api/chat/route";
import { GET as models } from "@/app/api/models/route";
import { systemPrompt } from "@/core/prompt";
import { FAKE_MODELS, REJECTED_KEY, fixture, startFakeOpenAI } from "./fake-openai";

const APP = "http://127.0.0.1:3210";

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
  vi.stubEnv("OPENAI_MODEL", "fake-small");
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

function useNoProvider() {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_BASE_URL", "");
  vi.stubEnv("OLLAMA_HOST", "127.0.0.1:9");
}

type RequestOptions = { url?: string; headers?: Record<string, string> };

function chatRequest(body: unknown, { url = `${APP}/api/chat`, headers }: RequestOptions = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const question = (content: string, model?: string) => ({
  model,
  messages: [{ role: "user", content }],
});

const ask = (content: string, model?: string) => chat(chatRequest(question(content, model)));

const listModels = ({ url = `${APP}/api/models`, headers }: RequestOptions = {}) =>
  models(new Request(url, { headers }));

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
    useFakeProvider();

    await (await ask("Hi", "fake-large")).text();

    expect(fake.requests[0].model).toBe("fake-large");
  });

  it("falls back to the configured model", async () => {
    useFakeProvider({ OPENAI_MODEL: "fake-large" });

    await (await ask("Hi")).text();

    expect(fake.requests[0].model).toBe("fake-large");
  });

  it("adds OPENAI_EXTRA_BODY to each request, for options like a model's fast mode", async () => {
    useFakeProvider({ OPENAI_EXTRA_BODY: '{"thinking":{"type":"disabled"}}' });

    await (await ask("Hi")).text();

    expect(fake.requests[0]).toMatchObject({ thinking: { type: "disabled" }, model: "fake-small" });
  });

  it("explains a malformed OPENAI_EXTRA_BODY", async () => {
    useFakeProvider({ OPENAI_EXTRA_BODY: "fast please" });

    const response = await ask("Hi");

    expect(response.status).toBe(500);
    expect((await response.json()).error).toMatch(/OPENAI_EXTRA_BODY must be a JSON object/);
  });

  it("asks for a model when none is picked or configured", async () => {
    useFakeProvider({ OPENAI_MODEL: "" });

    const response = await ask("Hi");

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/model/i);
    expect(fake.requests).toHaveLength(0);
  });

  it("rejects a request without messages", async () => {
    useFakeProvider();

    const response = await chat(chatRequest("{"));

    expect(response.status).toBe(400);
    expect(fake.requests).toHaveLength(0);
  });

  it("rejects an empty conversation", async () => {
    useFakeProvider();

    const response = await chat(chatRequest({ messages: [] }));

    expect(response.status).toBe(400);
  });

  it("explains how to set up a provider when none is available", async () => {
    useNoProvider();

    const response = await ask("Hi");
    const { error } = await response.json();

    expect(response.status).toBe(503);
    expect(error).toMatch(/npx answerui-app --setup/);
    expect(error).toMatch(/OPENAI_API_KEY/);
    expect(error).toMatch(/Ollama/);
  });

  it("names the provider when it rejects the request", async () => {
    useFakeProvider({ OPENAI_API_KEY: REJECTED_KEY });

    const response = await ask("Hi");
    const { error } = await response.json();

    expect(response.status).toBe(401);
    expect(error).toContain(new URL(fake.url).host);
    expect(error).toMatch(/Incorrect API key/);
  });

  it("explains when the provider can't be reached", async () => {
    useFakeProvider({ OPENAI_BASE_URL: "http://127.0.0.1:9/v1" });

    const response = await ask("Hi");

    expect(response.status).toBe(502);
    expect((await response.json()).error).toMatch(/Couldn't reach http:\/\/127\.0\.0\.1:9\/v1/);
  });
});

describe("GET /api/models", () => {
  it("lists the provider's models with the configured one selected", async () => {
    useFakeProvider({ OPENAI_MODEL: "fake-large" });

    const response = await listModels();

    expect(await response.json()).toEqual({ models: FAKE_MODELS, selected: "fake-large" });
  });

  it("leaves the choice to the user when no model is configured", async () => {
    useFakeProvider({ OPENAI_MODEL: "" });

    expect((await (await listModels()).json()).selected).toBeNull();
  });

  it("reports that setup is needed when no provider is available", async () => {
    useNoProvider();

    const response = await listModels();

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/OPENAI_API_KEY/);
  });
});

describe("requests from outside the app", () => {
  it("are refused for hosts the app doesn't serve, which blocks DNS rebinding", async () => {
    useFakeProvider();

    const response = await chat(
      chatRequest(question("Hi"), { url: "http://rebind.evil.example/api/chat" }),
    );

    expect(response.status).toBe(403);
    expect(fake.requests).toHaveLength(0);
  });

  it("are served for hosts listed in ANSWERUI_ALLOWED_HOSTS", async () => {
    useFakeProvider({ ANSWERUI_ALLOWED_HOSTS: "answerui.internal" });

    const response = await chat(
      chatRequest(question("Hi"), { url: "http://answerui.internal:3000/api/chat" }),
    );

    expect(response.status).toBe(200);
  });

  it("are refused when they come from another site", async () => {
    useFakeProvider();

    const response = await chat(
      chatRequest(question("Hi"), { headers: { origin: "https://evil.example" } }),
    );

    expect(response.status).toBe(403);
    expect(fake.requests).toHaveLength(0);
  });

  it("are refused when the browser marks them as cross-site", async () => {
    useFakeProvider();

    const response = await listModels({ headers: { "sec-fetch-site": "cross-site" } });

    expect(response.status).toBe(403);
  });

  it("are served when they come from the app itself", async () => {
    useFakeProvider();
    const headers = { origin: APP, "sec-fetch-site": "same-origin" };

    const response = await chat(chatRequest(question("Hi"), { headers }));

    expect(response.status).toBe(200);
  });

  it("are refused when the chat body isn't JSON", async () => {
    useFakeProvider();

    const response = await chat(
      chatRequest(question("Hi"), { headers: { "content-type": "text/plain" } }),
    );

    expect(response.status).toBe(415);
    expect(fake.requests).toHaveLength(0);
  });
});
