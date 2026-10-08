import OpenAI from "openai";
import type { Provider } from "@/core/provider";
import { rejectUntrusted } from "@/core/request-guard";

const SETUP_HELP = "https://github.com/0xcro3dile/answerui#models";

export function untrustedRequest(request: Request): Response | null {
  const rejection = rejectUntrusted(request, process.env.ANSWERUI_ALLOWED_HOSTS);
  return rejection && failure(rejection.error, rejection.status);
}

export function setupNeeded(): Response {
  return failure(
    "No model provider found. Run npx answerui-app --setup, set OPENAI_API_KEY (and optionally OPENAI_BASE_URL and OPENAI_MODEL), or start Ollama.",
    503,
  );
}

export function providerFailed(error: unknown, provider: Provider): Response {
  if (error instanceof OpenAI.APIError && error.status) {
    const host = new URL(provider.baseURL).host;
    return failure(
      `${host} returned ${error.message}. Check your settings: ${SETUP_HELP}`,
      error.status,
    );
  }
  const reason = error instanceof Error ? error.message : "unknown error";
  return failure(
    `Couldn't reach ${provider.baseURL} (${reason}). Check your settings: ${SETUP_HELP}`,
    502,
  );
}

export function failure(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
