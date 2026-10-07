import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

test("starts on the next free port when the default one is taken", async () => {
  const blocker = createServer()
    .on("error", () => {})
    .listen(3210, "127.0.0.1");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPENAI_API_KEY: "test-key",
    XDG_CONFIG_HOME: "test-results/cli",
  };
  delete env.PORT;
  const app = spawn(process.execPath, ["dist/bin/answerui.mjs", "--no-open"], { env });

  try {
    const url = await new Promise<string>((resolve) => {
      app.stdout.on("data", (chunk) => {
        const running = /running at (\S+)/.exec(String(chunk));
        if (running) resolve(running[1]);
      });
    });

    expect(url).not.toBe("http://127.0.0.1:3210");
    expect((await fetch(url)).ok).toBe(true);
  } finally {
    app.kill();
    blocker.close();
  }
});
