import { describe, expect, it } from "vitest";
import { readSceneMessage } from "@/scene/protocol";

describe("readSceneMessage", () => {
  it("reads ready, report and error messages", () => {
    expect(readSceneMessage({ type: "ready" })).toEqual({ type: "ready" });
    expect(readSceneMessage({ type: "report", values: { period: 2.5 } })).toEqual({
      type: "report",
      values: { period: 2.5 },
    });
    expect(readSceneMessage({ type: "error", message: "boom" })).toEqual({
      type: "error",
      message: "boom",
    });
  });

  it("ignores anything else", () => {
    const junk = [
      null,
      "ready",
      [],
      { type: "navigate", url: "https://evil.example" },
      { type: "report", values: [1] },
    ];
    for (const data of junk) expect(readSceneMessage(data)).toBeNull();
  });

  it("keeps only plain, finite and short reported values", () => {
    const values = {
      period: 2,
      label: "Earth",
      on: true,
      bad: Number.NaN,
      huge: "x".repeat(201),
      nested: { a: 1 },
      list: [1],
    };

    expect(readSceneMessage({ type: "report", values })).toEqual({
      type: "report",
      values: { period: 2, label: "Earth", on: true },
    });
  });

  it("caps how many values one report can set", () => {
    const values = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`v${i}`, i]));

    const message = readSceneMessage({ type: "report", values });

    expect(message?.type === "report" && Object.keys(message.values)).toHaveLength(20);
  });

  it("shortens long error messages", () => {
    expect(readSceneMessage({ type: "error", message: "x".repeat(2000) })).toEqual({
      type: "error",
      message: "x".repeat(500),
    });
  });
});
