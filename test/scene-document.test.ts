import { describe, expect, it } from "vitest";
import { sceneDocument } from "@/scene/document";
import type { SceneSetup } from "@/scene/protocol";

const runtime = "http://127.0.0.1:3210/scene/runtime.js";
const setup: SceneSetup = {
  title: "Orbit",
  mode: "3d",
  theme: { dark: false, text: "#000000", accent: "#0000ff" },
  params: { speed: 1 },
  paused: false,
};

function policyOf(html: string): string[] {
  return /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1].split("; ") ?? [];
}

const closingTags = (html: string) => html.match(/<\/script>/g)?.length;

describe("sceneDocument", () => {
  it("blocks all network access and loads no script but the runtime", () => {
    const policy = policyOf(sceneDocument(setup, "", runtime));

    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain(`script-src 'unsafe-inline' ${runtime}`);
    expect(policy.some((directive) => directive.startsWith("connect-src"))).toBe(false);
  });

  it("runs the setup, then the model's code, then start", () => {
    const html = sceneDocument(setup, "spin();", runtime);

    const positions = ["AnswerUIScene.setup(", "spin();", "AnswerUIScene.start("].map((text) =>
      html.indexOf(text),
    );

    expect(positions).not.toContain(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("keeps the model's code inside its script element", () => {
    const html = sceneDocument(
      setup,
      "label(box, '</script><script>alert(1)</script>'); <!-- x",
      runtime,
    );

    expect(closingTags(html)).toBe(4);
    expect(html).not.toContain("<!-- x");
  });

  it("keeps embedded values from closing the setup script", () => {
    const html = sceneDocument({ ...setup, title: "</script><b>Orbit</b>" }, "", runtime);

    expect(closingTags(html)).toBe(4);
    expect(html).toContain("\\u003c/script>");
  });

  it("hands start a scene or camera the model made itself", () => {
    const html = sceneDocument(setup, "const scene = new THREE.Scene();", runtime);

    expect(html).toContain(
      'AnswerUIScene.start(typeof scene === "object" ? scene : null, typeof camera === "object" ? camera : null)',
    );
  });
});
