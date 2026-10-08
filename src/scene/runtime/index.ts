// Runs inside a scene's sandboxed frame. The frame's document loads this bundle, calls setup(), runs the
// model's code, then calls start(). Calling each frame's handlers inside try/catch is adapted from the
// three.js editor's app.js (MIT, three.js authors).
import type { FromScene, SceneSetup, ToScene } from "../protocol";
import { createClock } from "./clock";
import { createReporter } from "./reporter";
import { mount2d } from "./stage2d";
import { mount3d } from "./stage3d";

type FrameHandler = (t: number, dt: number) => void;
type Stage = { render(): void; adopt?(scene: unknown, camera: unknown): void };

const handlers: FrameHandler[] = [];
const clock = createClock();
const report = createReporter((values) => send({ type: "report", values }));
let params: Record<string, unknown> = {};
let stage: Stage | undefined;
let paused = false;
let failed = false;
let scheduled = false;

export function setup({ title, mode, theme, params: initial, paused: startPaused }: SceneSetup) {
  addEventListener("error", (event) => fail(event.error ?? event.message));
  addEventListener("unhandledrejection", (event) => fail(event.reason));
  params = { ...initial };
  paused = startPaused;
  const mounted = mode === "3d" ? mount3d(title, theme) : mount2d(title);
  stage = mounted;
  const onFrame = (handler: FrameHandler) => void handlers.push(handler);
  Object.assign(globalThis, mounted.globals, { params, theme, onFrame, report });
}

export function start(scene: unknown, camera: unknown) {
  if (failed) return;
  stage?.adopt?.(scene, camera);
  addEventListener("message", receive);
  addEventListener("resize", () => {
    if (paused) draw(0);
  });
  send({ type: "ready" });
  if (paused) draw(0);
  else schedule();
}

function receive(event: MessageEvent<ToScene>) {
  if (event.source !== parent) return;
  const message = event.data;
  if (message?.type === "params") {
    Object.assign(params, message.values);
    if (paused) draw(0);
  } else if (message?.type === "pause") {
    paused = true;
    clock.hold();
  } else if (message?.type === "play") {
    paused = false;
    schedule();
  }
}

function schedule() {
  if (scheduled || paused || failed) return;
  scheduled = true;
  requestAnimationFrame((now) => {
    scheduled = false;
    if (paused || failed) return;
    draw(clock.tick(now));
    schedule();
  });
}

function draw(dt: number) {
  if (failed) return;
  try {
    for (const handler of handlers) handler(clock.time, dt);
    stage?.render();
  } catch (error) {
    fail(error);
  }
}

function fail(error: unknown) {
  if (failed) return;
  failed = true;
  send({ type: "error", message: error instanceof Error ? error.message : String(error) });
}

function send(message: FromScene) {
  parent.postMessage(message, "*");
}
