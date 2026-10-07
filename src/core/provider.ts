export type Provider = { baseURL: string; apiKey: string; model?: string };

export type Env = Record<string, string | undefined>;

const OPENAI_URL = "https://api.openai.com/v1";
const OLLAMA_PORT = "11434";
const KEYLESS = "local";

export async function resolveProvider(
  env: Env,
  isReachable: (url: string) => Promise<boolean>,
): Promise<Provider | null> {
  const apiKey = env.OPENAI_API_KEY || undefined;
  const baseURL = env.OPENAI_BASE_URL || undefined;
  const model = env.OPENAI_MODEL || undefined;

  if (apiKey) return { baseURL: baseURL ?? OPENAI_URL, apiKey, model };
  if (baseURL) return { baseURL, apiKey: KEYLESS, model };

  const ollama = `${ollamaOrigin(env.OLLAMA_HOST || "localhost")}/v1`;
  return (await isReachable(`${ollama}/models`))
    ? { baseURL: ollama, apiKey: KEYLESS, model }
    : null;
}

// Same rules as Ollama itself: a bare host gets port 11434, a URL keeps its scheme's port.
function ollamaOrigin(host: string): string {
  if (/^https?:\/\//.test(host)) return new URL(host).origin;
  const url = new URL(`http://${host}`);
  url.port ||= OLLAMA_PORT;
  return url.origin;
}
