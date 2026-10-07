import { defineConfig, devices } from "@playwright/test";

const providerPort = 4010;
const appPort = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://127.0.0.1:${appPort}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON test/fake-openai.ts",
      env: { PORT: String(providerPort) },
      url: `http://127.0.0.1:${providerPort}/v1/models`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `node dist/bin/answerui.mjs --no-open --port ${appPort}`,
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
        XDG_CONFIG_HOME: "test-results/config",
      },
      url: `http://127.0.0.1:${appPort}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
