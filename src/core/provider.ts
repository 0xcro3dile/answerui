export type Provider = {
  baseURL: string;
  apiKey: string;
  model?: string;
  extraBody?: Record<string, unknown>;
};

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
  const extraBody = parseExtraBody(env.OPENAI_EXTRA_BODY);

  if (apiKey) {
    const url = baseURL ?? OPENAI_URL;
    return { baseURL: url, apiKey, model: model ?? defaultModel(url), extraBody };
  }
  if (baseURL) return { baseURL, apiKey: KEYLESS, model, extraBody };

  const ollama = ollamaURL(env.OLLAMA_HOST || "localhost");
  if (ollama && (await isReachable(`${ollama}/models`))) {
    return { baseURL: ollama, apiKey: KEYLESS, model, extraBody };
  }
  return null;
}

function parseExtraBody(json: string | undefined): Record<string, unknown> | undefined {
  if (!json) return undefined;
  const value = parseJson(json);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      'OPENAI_EXTRA_BODY must be a JSON object, like {"thinking":{"type":"disabled"}}.',
    );
  }
  return value as Record<string, unknown>;
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
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
