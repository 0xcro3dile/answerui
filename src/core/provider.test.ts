import { describe, expect, it } from "vitest";
import { resolveProvider } from "./provider";

const nothingReachable = async () => false;
const reachable =
  (...urls: string[]) =>
  async (url: string) =>
    urls.includes(url);

describe("resolveProvider", () => {
  it("uses OpenAI when only a key is set", async () => {
    const provider = await resolveProvider({ OPENAI_API_KEY: "sk-test" }, nothingReachable);

    expect(provider).toEqual({ baseURL: "https://api.openai.com/v1", apiKey: "sk-test" });
  });

  it("uses the configured base URL and model with the key", async () => {
    const env = {
      OPENAI_API_KEY: "sk-or",
      OPENAI_BASE_URL: "https://openrouter.ai/api/v1",
      OPENAI_MODEL: "qwen/qwen3-coder",
    };

    expect(await resolveProvider(env, nothingReachable)).toEqual({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: "sk-or",
      model: "qwen/qwen3-coder",
    });
  });

  it("accepts a keyless local server when a base URL is set", async () => {
    const provider = await resolveProvider(
      { OPENAI_BASE_URL: "http://localhost:1234/v1" },
      nothingReachable,
    );

    expect(provider).toEqual({ baseURL: "http://localhost:1234/v1", apiKey: "local" });
  });

  it("falls back to a running Ollama when nothing is configured", async () => {
    const provider = await resolveProvider({}, reachable("http://localhost:11434/v1/models"));

    expect(provider).toEqual({ baseURL: "http://localhost:11434/v1", apiKey: "local" });
  });

  it("finds Ollama on OLLAMA_HOST, with or without a scheme", async () => {
    const provider = await resolveProvider(
      { OLLAMA_HOST: "127.0.0.1:9000" },
      reachable("http://127.0.0.1:9000/v1/models"),
    );

    expect(provider?.baseURL).toBe("http://127.0.0.1:9000/v1");
  });

  it("uses Ollama's default port when OLLAMA_HOST has none", async () => {
    const provider = await resolveProvider(
      { OLLAMA_HOST: "0.0.0.0" },
      reachable("http://0.0.0.0:11434/v1/models"),
    );

    expect(provider?.baseURL).toBe("http://0.0.0.0:11434/v1");
  });

  it("treats empty values as unset", async () => {
    const env = { OPENAI_API_KEY: "", OPENAI_BASE_URL: "", OPENAI_MODEL: "" };

    expect(await resolveProvider(env, nothingReachable)).toBeNull();
  });

  it("returns null when no provider is configured or reachable", async () => {
    expect(await resolveProvider({}, nothingReachable)).toBeNull();
  });
});
