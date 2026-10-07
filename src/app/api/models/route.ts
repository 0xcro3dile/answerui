import { findProvider, listModels } from "@/server/llm";
import { providerFailed, setupNeeded, untrustedRequest } from "@/server/responses";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const untrusted = untrustedRequest(req);
  if (untrusted) return untrusted;

  const provider = await findProvider();
  if (!provider) return setupNeeded();

  try {
    return Response.json({ models: await listModels(provider), selected: provider.model ?? null });
  } catch (error) {
    return providerFailed(error, provider);
  }
}
