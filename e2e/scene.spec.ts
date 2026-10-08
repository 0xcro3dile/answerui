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

test("shows a scene the model built itself, fitted and lit like the ready-made one", async ({
  page,
}) => {
  await ask(page, "Show me a scene of its own");

  await expect(page.getByText("Aspect 1.8, lit 2")).toBeVisible();
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

test("says so when the browser drops a scene's graphics, and restarts it", async ({ page }) => {
  await ask(page, "Show me a planet orbit");
  const element = page.locator('iframe[title="A planet orbiting the Sun"]');
  await expect(element).toBeAttached();
  const frame = (await (await element.elementHandle())!.contentFrame())!;

  await frame.evaluate(() => {
    const context = document.querySelector("canvas")!.getContext("webgl2");
    context!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.getByText(/This scene couldn't run: /)).toContainText("dropped");
  await page.getByRole("button", { name: "Restart" }).click();

  await expect(element).toBeAttached();
  await expect(page.getByText(/This scene couldn't run/)).toHaveCount(0);
});

test("keeps the scene toolbar readable in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await ask(page, "Show me a planet orbit");
  const title = page.locator(".scene-bar span");
  await expect(title).toHaveText("A planet orbiting the Sun");

  const lightness = await title.evaluate((element) => {
    const context = document.createElement("canvas").getContext("2d")!;
    context.fillStyle = getComputedStyle(element).color;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
    return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  });

  expect(lightness).toBeGreaterThan(0.6);
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
