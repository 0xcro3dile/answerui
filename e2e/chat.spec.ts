import { expect, test, type Page } from "@playwright/test";

async function ask(page: Page, question: string) {
  await page.goto("/");
  const composer = page.getByRole("textbox");
  await composer.fill(question);
  await composer.press("Enter");
}

test("answers with a bill splitter that recalculates as you click", async ({ page }) => {
  await ask(page, "Split our dinner bill");
  await expect(page.getByText("Total with tax and tip: $125.59")).toBeVisible();

  await page.getByRole("button", { name: "20%" }).click();

  await expect(page.getByText("Total with tax and tip: $127.57")).toBeVisible();
});

test("answers a simple question in plain text", async ({ page }) => {
  await ask(page, "What is the capital of France?");

  await expect(page.getByText("The capital of France is Paris.")).toBeVisible();
});

test("shows the provider's error instead of an empty answer", async ({ page }) => {
  await ask(page, "Please fail this request");

  await expect(page.getByText(/The model rejected this request/)).toBeVisible();
});

test("keeps a slider's default when the model writes root before its state", async ({ page }) => {
  await ask(page, "Pick a level");

  await expect(page.getByText("Level: 3")).toBeVisible();
});
