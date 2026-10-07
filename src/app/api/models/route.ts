import { SETUP_NEEDED, errorResponse, findProvider, listModels } from "@/server/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = await findProvider();
  if (!provider) return Response.json({ error: SETUP_NEEDED }, { status: 503 });

  try {
    const models = await listModels(provider);
    return Response.json({ models, selected: provider.model ?? models[0] });
  } catch (error) {
    return errorResponse(error);
  }
}
