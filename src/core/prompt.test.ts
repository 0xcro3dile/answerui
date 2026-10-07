import { describe, expect, it } from "vitest";
import { systemPrompt } from "./prompt";

describe("systemPrompt", () => {
  it("enables reactive $variables so tools update without another model call", () => {
    expect(systemPrompt).toContain("Declare mutable state with `$varName = defaultValue`");
  });

  it("teaches arithmetic and built-ins like @Sum", () => {
    expect(systemPrompt).toContain("Arithmetic operators");
    expect(systemPrompt).toContain("@Sum(numbers[])");
  });

  it("tells the model to answer simple questions as plain text", () => {
    expect(systemPrompt).toContain('root = Stack([TextContent("');
  });

  it("explains how to compound without a power operator", () => {
    expect(systemPrompt).toMatch(/no power operator/i);
  });

  it("explains that slider values are arrays", () => {
    expect(systemPrompt).toContain("$var[0]");
  });
});
