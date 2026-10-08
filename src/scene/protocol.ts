// Messages between the app and a scene's sandboxed frame. The frame runs model-written code, so the app
// reads everything it sends through readSceneMessage.

export type SceneMode = "3d" | "2d";

export type SceneTheme = { dark: boolean; text: string; accent: string };

export type SceneValue = number | string | boolean;
export type SceneValues = Record<string, SceneValue>;

export type SceneSetup = {
  title: string;
  mode: SceneMode;
  theme: SceneTheme;
  params: Record<string, unknown>;
  paused: boolean;
};

export type ToScene =
  { type: "params"; values: Record<string, unknown> } | { type: "pause" } | { type: "play" };

export type FromScene =
  { type: "ready" } | { type: "report"; values: SceneValues } | { type: "error"; message: string };

const MAX_KEYS = 20;
const MAX_TEXT = 200;
const MAX_ERROR = 500;

export function readSceneMessage(data: unknown): FromScene | null {
  if (!isRecord(data)) return null;
  switch (data.type) {
    case "ready":
      return { type: "ready" };
    case "error":
      return { type: "error", message: String(data.message).slice(0, MAX_ERROR) };
    case "report":
      return isRecord(data.values) ? { type: "report", values: readValues(data.values) } : null;
    default:
      return null;
  }
}

function readValues(values: Record<string, unknown>): SceneValues {
  const valid = Object.entries(values).filter(([, value]) => isSceneValue(value));
  return Object.fromEntries(valid.slice(0, MAX_KEYS)) as SceneValues;
}

function isSceneValue(value: unknown): value is SceneValue {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length <= MAX_TEXT;
  return typeof value === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
