import { findProvider, listModels } from "@/server/llm";
import { failure, providerFailed, setupNeeded, untrustedRequest } from "@/server/responses";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const untrusted = untrustedRequest(req);
  if (untrusted) return untrusted;

  const provider = await findProvider().catch((error: Error) => error);
  if (provider instanceof Error) return failure(provider.message, 500);
  if (!provider) return setupNeeded();

  try {
    return Response.json({ models: await listModels(provider), selected: provider.model ?? null });
  } catch (error) {
    return providerFailed(error, provider);
  }
}
