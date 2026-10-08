import { expect, test, type Page } from "@playwright/test";

async function ask(page: Page, question: string) {
  await page.goto("/");
  const composer = page.getByRole("textbox");
  await composer.fill(question);
  await composer.press("Enter");
}

test("answers with a live 3D scene that the slider drives", async ({ page }) => {
  await ask(page, "How does a planet's distance change its orbit?");
  await expect(page.getByText("Years per orbit: 1", { exact: true })).toBeVisible();

  await page.getByRole("slider").press("ArrowRight");

  await expect(page.getByText("Years per orbit: 2.83")).toBeVisible();
});

test("draws 2D scenes too", async ({ page }) => {
  await ask(page, "How does length change a pendulum's swing?");
  await expect(page.getByText("Seconds per swing: 2.84")).toBeVisible();

  await page.getByRole("slider").press("ArrowRight");

  await expect(page.getByText("Seconds per swing: 3.47")).toBeVisible();
});

test("keeps a scene away from the network, the page and storage", async ({ page }) => {
  await ask(page, "Show me a planet orbit");
  const element = page.locator('iframe[title="A planet orbiting the Sun"]');
  await expect(element).toBeAttached();
  const frame = (await (await element.elementHandle())!.contentFrame())!;

  const reach = await frame.evaluate(async () => {
    const attempt = async (action: () => unknown) => {
      try {
        await action();
        return "allowed";
      } catch {
        return "blocked";
      }
    };
    return {
      network: await attempt(() => fetch("/api/models")),
      page: await attempt(() => parent.document.title),
      storage: await attempt(() => localStorage.length),
    };
  });

  expect(reach).toEqual({ network: "blocked", page: "blocked", storage: "blocked" });
});

test("keeps a scene from navigating its frame to another page", async ({ page }) => {
  await ask(page, "Show me a planet orbit");
  const element = page.locator('iframe[title="A planet orbiting the Sun"]');
  await expect(element).toBeAttached();
  const frame = (await (await element.elementHandle())!.contentFrame())!;
  const leaked = page.waitForRequest(/leak-sentinel/, { timeout: 2000 }).then(
    () => true,
    () => false,
  );

  await frame
    .evaluate(() => {
      location.href = "/leak-sentinel?values=1";
    })
    .catch(() => {});

  expect(await leaked).toBe(false);
  await expect(page.getByText(/This scene couldn't run: /)).toContainText("leave its sandbox");
});

test("still follows the slider when paused for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ask(page, "Show me a planet orbit");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

  await page.getByRole("slider").press("ArrowRight");

  await expect(page.getByText("Years per orbit: 2.83")).toBeVisible();
});

for (const [kind, question, error] of [
  ["a runtime error", "Show me a spinning cube", /box is not defined/],
  ["a syntax error", "Show me a bouncing ball", /missing \) after argument list|Unexpected token/],
] as const) {
  test(`replaces a scene with ${kind} with a notice and Fix it`, async ({ page }) => {
    await ask(page, question);
    await expect(page.getByText(/This scene couldn't run: /)).toContainText(error);

    await page.getByRole("button", { name: "Fix it" }).click();

    // The fake model answers the fix request with the same fixture, so match the first copy.
    await expect(page.getByText(/Fix the scene "/).first()).toBeVisible();
  });
}
