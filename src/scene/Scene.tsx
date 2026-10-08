"use client";
// A model-written 3D or 2D scene in a sandboxed frame, driven by the answer's own controls. The iframe
// setup is adapted from OpenUI's html-artifact example (MIT, Thesys).
import {
  defineComponent,
  reactive,
  useIsStreaming,
  useStateField,
  useTriggerAction,
  type ComponentRenderProps,
} from "@openuidev/react-lang";
import { useSystemThemeMode } from "@openuidev/react-ui";
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { z } from "zod/v4";
import { sceneDocument } from "./document";
import {
  readSceneMessage,
  type SceneSetup,
  type SceneTheme,
  type SceneValues,
  type ToScene,
} from "./protocol";

const THEMES: Record<"light" | "dark", SceneTheme> = {
  light: { dark: false, text: "#1f2328", accent: "#2563eb" },
  dark: { dark: true, text: "#e6edf3", accent: "#60a5fa" },
};

// Rules for three.js condensed from three.js's docs/llms.txt (MIT) and the failure lists in
// Impertio-Studio/Three.js-Claude-Skill-Package and kndoshn/threejs-skill-plugin (MIT).
const description = [
  "A live 3D or 2D animation that runs the JavaScript in code inside a sandbox, for 3D shapes, motion and simulations.",
  "Ready-made: params (the live values passed in), onFrame((t, dt) => ...) called every frame, report({name: value}) to send numbers to results, and theme (text and accent colors).",
  "3d has THREE (r186), scene, camera, controls and lights, plus label(object, text). 2d has ctx on an 800×450 area.",
  "In three.js use BufferGeometry and setAttribute, keep objects within 10 units of the center, remember Y is up, and give materials with opacity transparent: true.",
  "Move things by dt and run code right away; don't wait for load events.",
].join(" ");

const SceneSchema = z.object({
  title: z.string(),
  mode: z.enum(["3d", "2d"]),
  code: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  results: reactive(z.record(z.string(), z.unknown()).optional()),
});

export const Scene = defineComponent({
  name: "Scene",
  description,
  props: SceneSchema,
  component: SceneView,
});

function SceneView({ props }: ComponentRenderProps<z.infer<typeof SceneSchema>>) {
  const streaming = useIsStreaming();
  const triggerAction = useTriggerAction();
  const results = useStateField(props.title, props.results);
  const theme = THEMES[useSystemThemeMode()];
  const box = useRef<HTMLElement>(null);
  const nearby = useNearScreen(box);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [run, setRun] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function report(values: SceneValues) {
    if (results.isReactive) results.setValue({ ...results.value, ...values });
  }

  function askForFix(message: string) {
    const request = `Fix the scene "${props.title}". It failed with: ${message}`;
    triggerAction(request, undefined, { type: "continue_conversation" });
  }

  if (error) {
    return (
      <div className="scene-error" role="alert">
        <p>This scene couldn&apos;t run: {error}</p>
        <button type="button" onClick={() => askForFix(error)}>
          Fix it
        </button>
      </div>
    );
  }

  return (
    <figure ref={box} className="scene">
      <div className="scene-stage">
        {streaming ? (
          <p className="scene-note">Building the scene…</p>
        ) : nearby ? (
          <SceneFrame
            key={`${run}-${theme.dark}`}
            setup={{
              title: props.title,
              mode: props.mode,
              theme,
              params: props.params ?? {},
              paused,
            }}
            code={props.code}
            onReport={report}
            onError={setError}
          />
        ) : (
          <p className="scene-note">{props.title}</p>
        )}
      </div>
      <figcaption className="scene-bar">
        <span>{props.title}</span>
        <button type="button" disabled={streaming} onClick={() => setPaused(!paused)}>
          {paused ? "Play" : "Pause"}
        </button>
        <button type="button" disabled={streaming} onClick={() => setRun(run + 1)}>
          Restart
        </button>
        <button type="button" disabled={streaming} onClick={() => box.current?.requestFullscreen()}>
          Fullscreen
        </button>
      </figcaption>
    </figure>
  );
}

type FrameProps = {
  setup: SceneSetup;
  code: string;
  onReport: (values: SceneValues) => void;
  onError: (message: string) => void;
};

// One run of a scene. Restart, a theme change or scrolling back remounts it, which rebuilds the document
// with the values at that moment; later values go by message, so moving a slider never reloads it.
function SceneFrame({ setup, code, onReport, onError }: FrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [srcDoc] = useState(() =>
    sceneDocument(setup, code, `${location.origin}/scene/runtime.js`),
  );
  const [ready, setReady] = useState(false);
  const loads = useRef(0);
  const params = JSON.stringify(setup.params);

  // The frame loads its document once. Another load means the scene navigated away, which the app's
  // frame-src policy blocks, so say what happened instead of leaving a browser error page.
  function onLoad() {
    loads.current += 1;
    if (loads.current > 1) onError("The scene tried to leave its sandbox.");
  }

  const receive = useEffectEvent((event: MessageEvent) => {
    if (event.source !== frame.current?.contentWindow) return;
    const message = readSceneMessage(event.data);
    if (message?.type === "ready") setReady(true);
    if (message?.type === "report") onReport(message.values);
    if (message?.type === "error") onError(message.message);
  });

  useEffect(() => {
    const listener = (event: MessageEvent) => receive(event);
    addEventListener("message", listener);
    return () => removeEventListener("message", listener);
  }, []);

  useEffect(() => {
    if (ready) post(frame.current, { type: "params", values: JSON.parse(params) });
  }, [ready, params]);

  useEffect(() => {
    if (ready) post(frame.current, { type: setup.paused ? "pause" : "play" });
  }, [ready, setup.paused]);

  return (
    <iframe
      ref={frame}
      title={setup.title}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      onLoad={onLoad}
    />
  );
}

function post(frame: HTMLIFrameElement | null, message: ToScene) {
  frame?.contentWindow?.postMessage(message, "*");
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Whether the element is within one screen height of view. Far scenes unload to free their WebGL context. */
function useNearScreen(element: RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = useState(true);
  useEffect(() => {
    const target = element.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      root: scrollParent(target),
      rootMargin: "100% 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [element]);
  return near;
}

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}
