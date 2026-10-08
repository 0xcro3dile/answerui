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

  it("warns that input values are text, so + would join them", () => {
    expect(systemPrompt).toMatch(/Input values are text/);
  });

  it("steers values the user edits into bound inputs, since table edits aren't reactive", () => {
    expect(systemPrompt).toMatch(/EditableTable edits can't feed calculations/);
  });

  it("asks for every computed number to be rounded before it's shown", () => {
    expect(systemPrompt).toMatch(/Show every computed number through @Round/);
  });

  it("explains that slider values are arrays", () => {
    expect(systemPrompt).toContain("$var[0]");
  });
});
