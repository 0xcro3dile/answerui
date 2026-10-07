export type Provider = { baseURL: string; apiKey: string; model?: string };

export type Env = Record<string, string | undefined>;

const OPENAI_URL = "https://api.openai.com/v1";
const OPENAI_DEFAULT_MODEL = "gpt-5.2";
const OLLAMA_PORT = "11434";
const KEYLESS = "local";

export async function resolveProvider(
  env: Env,
  isReachable: (url: string) => Promise<boolean>,
): Promise<Provider | null> {
  const apiKey = env.OPENAI_API_KEY || undefined;
  const baseURL = env.OPENAI_BASE_URL || undefined;
  const model = env.OPENAI_MODEL || undefined;

  if (apiKey) {
    const url = baseURL ?? OPENAI_URL;
    return { baseURL: url, apiKey, model: model ?? defaultModel(url) };
  }
  if (baseURL) return { baseURL, apiKey: KEYLESS, model };

  const ollama = ollamaURL(env.OLLAMA_HOST || "localhost");
  if (ollama && (await isReachable(`${ollama}/models`))) {
    return { baseURL: ollama, apiKey: KEYLESS, model };
  }
  return null;
}

function defaultModel(baseURL: string): string | undefined {
  return baseURL === OPENAI_URL ? OPENAI_DEFAULT_MODEL : undefined;
}

// Same rules as Ollama itself: a bare host gets port 11434, a URL keeps its scheme's port.
function ollamaURL(host: string): string | null {
  try {
    const hasScheme = /^https?:\/\//.test(host);
    const url = new URL(hasScheme ? host : `http://${host}`);
    if (!hasScheme) url.port ||= OLLAMA_PORT;
    return `${url.origin}/v1`;
  } catch {
    return null;
  }
}
