export type Provider = { baseURL: string; apiKey: string; model?: string };

export type Env = Partial<
  Record<"OPENAI_API_KEY" | "OPENAI_BASE_URL" | "OPENAI_MODEL" | "OLLAMA_HOST", string>
>;

const OPENAI_URL = "https://api.openai.com/v1";
const OLLAMA_URL = "http://localhost:11434";
const KEYLESS = "local";

export async function resolveProvider(
  env: Env,
  isReachable: (url: string) => Promise<boolean>,
): Promise<Provider | null> {
  const apiKey = env.OPENAI_API_KEY || undefined;
  const baseURL = env.OPENAI_BASE_URL || undefined;
  const model = env.OPENAI_MODEL ? { model: env.OPENAI_MODEL } : {};

  if (apiKey) return { baseURL: baseURL ?? OPENAI_URL, apiKey, ...model };
  if (baseURL) return { baseURL, apiKey: KEYLESS, ...model };

  const ollama = `${withScheme(env.OLLAMA_HOST || OLLAMA_URL)}/v1`;
  if (await isReachable(`${ollama}/models`)) return { baseURL: ollama, apiKey: KEYLESS, ...model };

  return null;
}

function withScheme(host: string): string {
  const url = /^https?:\/\//.test(host) ? host : `http://${host}`;
  return url.replace(/\/+$/, "");
}
