import { describe, expect, it } from "vitest";
import { createStateLineHolder } from "./state-lines";

describe("createStateLineHolder", () => {
  it("holds a half-written state line until its newline arrives", () => {
    const holder = createStateLineHolder();

    expect(holder.push("root = Stack([a])\n$level = [")).toBe("root = Stack([a])\n");
    expect(holder.push("3]\nreadout = ")).toBe("$level = [3]\nreadout = ");
  });

  it("passes every other line through as it arrives", () => {
    const holder = createStateLineHolder();

    expect(holder.push('intro = TextContent("Hel')).toBe('intro = TextContent("Hel');
    expect(holder.push('lo")\n')).toBe('lo")\n');
  });

  it("doesn't hold a $variable used inside a line", () => {
    const holder = createStateLineHolder();

    expect(holder.push('readout = TextContent("Level: " + $lev')).toBe(
      'readout = TextContent("Level: " + $lev',
    );
  });

  it("holds a state line split right after its $", () => {
    const holder = createStateLineHolder();
    holder.push("x = 1\n");

    expect(holder.push("$")).toBe("");
    expect(holder.push("a = [1]\n")).toBe("$a = [1]\n");
  });

  it("lets an unfinished last line out when the answer ends", () => {
    const holder = createStateLineHolder();
    holder.push("$sim = {a: 1}");

    expect(holder.flush()).toBe("$sim = {a: 1}");
    expect(holder.flush()).toBe("");
  });
});
