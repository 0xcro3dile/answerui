import { afterEach, describe, expect, it, vi } from "vitest";
import { createClock, MAX_STEP } from "@/scene/runtime/clock";
import { createReporter } from "@/scene/runtime/reporter";
import { HEIGHT, letterbox, WIDTH } from "@/scene/runtime/stage2d";

afterEach(() => vi.useRealTimers());

describe("clock", () => {
  it("advances by the real time between frames", () => {
    const clock = createClock();

    expect(clock.tick(1000)).toBe(0);
    expect(clock.tick(1016)).toBeCloseTo(0.016);
    expect(clock.time).toBeCloseTo(0.016);
  });

  it("caps a long frame so simulations stay stable", () => {
    const clock = createClock();
    clock.tick(0);

    expect(clock.tick(5000)).toBe(MAX_STEP);
  });

  it("doesn't jump over a pause", () => {
    const clock = createClock();
    clock.tick(0);
    clock.tick(16);

    clock.hold();

    expect(clock.tick(10_000)).toBe(0);
    expect(clock.time).toBeCloseTo(0.016);
  });
});

describe("reporter", () => {
  it("sends the latest values at most once per interval", () => {
    vi.useFakeTimers();
    const sent: unknown[] = [];
    const report = createReporter((values) => sent.push(values), 100);

    report({ a: 1 });
    report({ a: 2 });
    report({ b: 3 });
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(100);

    expect(sent).toEqual([{ a: 2, b: 3 }]);
  });

  it("skips values that didn't change", () => {
    vi.useFakeTimers();
    const sent: unknown[] = [];
    const report = createReporter((values) => sent.push(values), 100);
    report({ a: 1 });
    vi.advanceTimersByTime(100);

    report({ a: 1 });
    vi.advanceTimersByTime(100);

    expect(sent).toHaveLength(1);
  });
});

describe("letterbox", () => {
  it("fits the 800×450 drawing area inside the frame, centered", () => {
    expect([WIDTH, HEIGHT]).toEqual([800, 450]);
    expect(letterbox(1600, 900)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(letterbox(1000, 450)).toEqual({ scale: 1, x: 100, y: 0 });
    expect(letterbox(800, 900)).toEqual({ scale: 1, x: 0, y: 225 });
  });
});
