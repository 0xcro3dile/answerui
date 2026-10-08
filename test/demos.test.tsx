// @vitest-environment jsdom
import { createParser, type LibraryJSONSchema } from "@openuidev/lang-core";
import { Renderer } from "@openuidev/react-lang";
import { sceneExample } from "@/core/prompt";
import { library } from "@/lib/library";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import spec from "@/generated/spec.json";
import { fixture } from "./fake-openai";

const parser = createParser(spec.schema as unknown as LibraryJSONSchema);

afterEach(cleanup);

describe.each([
  "plain",
  "bill-splitter",
  "savings",
  "roast-planner",
  "orbit",
  "pendulum",
  "broken-scene",
  "scene-typo",
  "own-scene",
  "root-first",
])("%s answer", (name) => {
  it("parses with no errors, gaps or unused statements", () => {
    const { root, meta } = parser.parse(fixture(name));

    expect(root).not.toBeNull();
    expect(meta).toMatchObject({ incomplete: false, errors: [], unresolved: [], orphaned: [] });
  });
});

function renderAnswer(name: string) {
  render(<Renderer response={fixture(name)} library={library} />);
}

function nudgeSlider(currentValue: number) {
  const slider = screen
    .getAllByRole("slider")
    .find((thumb) => thumb.getAttribute("aria-valuenow") === String(currentValue));
  fireEvent.keyDown(slider!, { key: "ArrowRight" });
}

describe("bill splitter", () => {
  const findPays = (diner: string, amount: string) =>
    screen.findByRole("row", { name: `${diner} ${amount}` });

  it("splits each dish between the people who shared it, with tax and tip", async () => {
    renderAnswer("bill-splitter");

    expect(await findPays("Ana", "22.2")).toBeTruthy();
    expect(await findPays("Dev", "48.21")).toBeTruthy();
    expect(await screen.findByText("Total with tax and tip: $125.59")).toBeTruthy();
  });

  it("recalculates when a tip preset is picked", async () => {
    renderAnswer("bill-splitter");

    fireEvent.click(await screen.findByRole("button", { name: "20%" }));

    expect(await screen.findByText("Total with tax and tip: $127.57")).toBeTruthy();
  });

  it("re-splits a dish when someone didn't share it", async () => {
    renderAnswer("bill-splitter");

    fireEvent.click((await screen.findAllByRole("checkbox", { name: "Dev" }))[0]);

    expect(await findPays("Ana", "23.89")).toBeTruthy();
    expect(await findPays("Dev", "43.14")).toBeTruthy();
  });

  it("recalculates when a price is edited", async () => {
    renderAnswer("bill-splitter");

    fireEvent.change(await screen.findByRole("spinbutton", { name: "Steak ($)" }), {
      target: { value: "40" },
    });

    expect(await findPays("Dev", "55.82")).toBeTruthy();
    expect(await screen.findByText("Total with tax and tip: $133.21")).toBeTruthy();
  });
});

describe("savings calculator", () => {
  function balanceAfterTenYears({ start = 5000, monthly = 500, rate = 5 } = {}) {
    let balance = start;
    for (let year = 0; year < 10; year++) balance = (balance + monthly * 12) * (1 + rate / 100);
    return Math.round(balance);
  }

  it("compounds the starting balance and deposits over ten years", async () => {
    renderAnswer("savings");

    expect(await screen.findByText(`After 10 years: $${balanceAfterTenYears()}`)).toBeTruthy();
  });

  it("recalculates when the deposit slider moves", async () => {
    renderAnswer("savings");

    nudgeSlider(500);

    expect(
      await screen.findByText(`After 10 years: $${balanceAfterTenYears({ monthly: 550 })}`),
    ).toBeTruthy();
  });
});

describe("roast planner", () => {
  it("rescales the shopping list and cooking time with the guest count", async () => {
    renderAnswer("roast-planner");
    expect(await screen.findByRole("row", { name: "Beef roasting joint 1.5 kg" })).toBeTruthy();
    expect(await screen.findByText("Roast for 87 minutes at 180°C.")).toBeTruthy();

    nudgeSlider(6);

    expect(await screen.findByRole("row", { name: "Beef roasting joint 1.75 kg" })).toBeTruthy();
    expect(await screen.findByText("Roast for 98 minutes at 180°C.")).toBeTruthy();
  });
});

describe("orbit example", () => {
  it("is the exact example the prompt teaches", () => {
    expect(fixture("orbit").trim()).toBe(sceneExample);
  });
});
