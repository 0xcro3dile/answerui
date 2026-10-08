// @vitest-environment jsdom
import { Renderer } from "@openuidev/react-lang";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { library } from "@/lib/library";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const answer = `$speed = [2]
$sim = {turns: 0}
root = Stack([summary, spin])
summary = TextContent("Turns: " + $sim.turns)
spin = Scene("A spinning cube", "3d", "onFrame((t) => report({ turns: t }));", {speed: $speed[0]}, $sim)`;

function renderAnswer(
  props: { response?: string; isStreaming?: boolean; onAction?: () => void } = {},
) {
  render(<Renderer response={answer} library={library} {...props} />);
  return screen.queryByTitle("A spinning cube") as HTMLIFrameElement | null;
}

function fromScene(frame: HTMLIFrameElement, data: unknown, source: unknown = frame.contentWindow) {
  const event = new MessageEvent("message", { data });
  Object.defineProperty(event, "source", { value: source });
  act(() => void window.dispatchEvent(event));
}

describe("Scene", () => {
  it("waits for the answer to finish before running", () => {
    expect(renderAnswer({ isStreaming: true })).toBeNull();
    expect(screen.getByText("Building the scene…")).toBeTruthy();
  });

  it("runs the code in a frame that may only run scripts", () => {
    const frame = renderAnswer()!;

    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.getAttribute("srcdoc")).toContain("report({ turns: t })");
  });

  it("sends the controls' values once the scene is ready", () => {
    const frame = renderAnswer()!;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");

    fromScene(frame, { type: "ready" });

    expect(post).toHaveBeenCalledWith({ type: "params", values: { speed: 2 } }, "*");
  });

  it("shows the numbers the scene reports", async () => {
    const frame = renderAnswer()!;

    fromScene(frame, { type: "report", values: { turns: 3 } });

    expect(await screen.findByText("Turns: 3")).toBeTruthy();
  });

  it("ignores messages from other windows", () => {
    const frame = renderAnswer()!;
    expect(frame).not.toBeNull();

    fromScene(frame, { type: "report", values: { turns: 3 } }, window);

    expect(screen.getByText("Turns: 0")).toBeTruthy();
  });

  it("replaces a failed scene with a notice that asks the model to fix it", async () => {
    const onAction = vi.fn();
    const frame = renderAnswer({ onAction })!;

    fromScene(frame, { type: "error", message: "cube is not defined" });
    fireEvent.click(await screen.findByRole("button", { name: "Fix it" }));

    expect(screen.getByText("This scene couldn't run: cube is not defined")).toBeTruthy();
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "continue_conversation",
        humanFriendlyMessage:
          'Fix the scene "A spinning cube". It failed with: cube is not defined',
      }),
    );
  });

  it("starts paused when the user prefers reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener() {},
          removeEventListener() {},
        }) as unknown as MediaQueryList,
    );

    const frame = renderAnswer()!;

    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
    expect(frame.getAttribute("srcdoc")).toContain('"paused":true');
  });

  it("unloads scenes far from the screen", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private notify: (entries: { isIntersecting: boolean }[]) => void) {}
        observe() {
          this.notify([{ isIntersecting: false }]);
        }
        disconnect() {}
      },
    );

    expect(renderAnswer()).toBeNull();
    expect(screen.getAllByText("A spinning cube").length).toBeGreaterThan(0);
  });

  it("keeps the rest of the answer when the scene's code breaks its string", () => {
    const response = `root = Stack([summary, spin])
summary = TextContent("Still here")
spin = Scene("A spinning cube", "3d", "label(cube, "Cube");")`;

    renderAnswer({ response });

    expect(screen.getByText("Still here")).toBeTruthy();
  });
});
