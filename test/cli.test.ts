import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { version } from "../package.json";

const cli = join(import.meta.dirname, "..", "bin", "answerui.mjs");

function run(args: string[], input = "") {
  const configHome = mkdtempSync(join(tmpdir(), "answerui-"));
  const result = spawnSync(process.execPath, [cli, ...args], {
    input,
    encoding: "utf8",
    env: { ...process.env, XDG_CONFIG_HOME: configHome },
  });
  return { ...result, configFile: join(configHome, "answerui", ".env") };
}

describe("answerui CLI", () => {
  it("prints its version", () => {
    expect(run(["--version"]).stdout.trim()).toBe(version);
  });

  it("prints usage", () => {
    expect(run(["--help"]).stdout).toMatch(/Usage: answerui/);
  });

  it("saves the provider settings with --setup", () => {
    const answers = "sk-test\nhttps://openrouter.ai/api/v1\nqwen/qwen3\n";

    const { status, configFile } = run(["--setup"], answers);

    expect(status).toBe(0);
    expect(readFileSync(configFile, "utf8")).toBe(
      "OPENAI_API_KEY=sk-test\nOPENAI_BASE_URL=https://openrouter.ai/api/v1\nOPENAI_MODEL=qwen/qwen3\n",
    );
  });

  it("saves only the answers that were given", () => {
    const { configFile } = run(["--setup"], "\nhttp://localhost:1234/v1\n\n");

    expect(readFileSync(configFile, "utf8")).toBe("OPENAI_BASE_URL=http://localhost:1234/v1\n");
  });

  it.skipIf(process.platform === "win32")("keeps the saved key readable only by the user", () => {
    const { configFile } = run(["--setup"], "sk-test\n\n\n");

    expect(statSync(configFile).mode & 0o777).toBe(0o600);
  });
});
