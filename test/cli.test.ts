import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { version } from "../package.json";

const cli = join(import.meta.dirname, "..", "bin", "answerui.mjs");

// Stands in for Next's server: reports the environment the CLI starts it with.
const STUB_SERVER = `
const { createServer } = require("node:http");
const names = ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "HOSTNAME", "PORT"];
const env = Object.fromEntries(names.map((name) => [name, process.env[name]]));
if (!process.env.STUB_NEVER_LISTENS) {
  createServer((_, res) => res.end(JSON.stringify(env))).listen(Number(process.env.PORT), process.env.HOSTNAME);
}
`;

const running: ChildProcess[] = [];
const blockers: Server[] = [];

afterEach(() => {
  running.splice(0).forEach((child) => child.kill());
  blockers.splice(0).forEach((server) => server.close());
});

function installApp() {
  const root = mkdtempSync(join(tmpdir(), "answerui-app-"));
  mkdirSync(join(root, "bin"));
  mkdirSync(join(root, "app"));
  copyFileSync(cli, join(root, "bin", "answerui.mjs"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ version }));
  writeFileSync(join(root, "app", "server.js"), STUB_SERVER);
  return join(root, "bin", "answerui.mjs");
}

function configHome(saved?: string) {
  const home = mkdtempSync(join(tmpdir(), "answerui-config-"));
  if (saved !== undefined) {
    mkdirSync(join(home, "answerui"));
    writeFileSync(join(home, "answerui", ".env"), saved);
  }
  return home;
}

function cleanEnv(env: Record<string, string>, saved?: string) {
  const base: NodeJS.ProcessEnv = { ...process.env, XDG_CONFIG_HOME: configHome(saved) };
  for (const name of ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "PORT"])
    delete base[name];
  return { ...base, ...env };
}

function run(args: string[], { input = "", env = {}, saved }: RunOptions = {}) {
  return spawnSync(process.execPath, [installApp(), ...args], {
    input,
    encoding: "utf8",
    timeout: 20_000,
    env: cleanEnv(env, saved),
  });
}

type RunOptions = { input?: string; env?: Record<string, string>; saved?: string };

async function start(args: string[] = [], { env = {}, saved }: RunOptions = {}) {
  const child = spawn(process.execPath, [installApp(), "--no-open", ...args], {
    env: cleanEnv(env, saved),
  });
  running.push(child);
  let output = "";
  const url = await new Promise<string>((resolve, reject) => {
    child.stdout?.on("data", (chunk) => {
      output += chunk;
      const ready = /running at (\S+)/.exec(output);
      if (ready) resolve(ready[1]);
    });
    child.on("exit", (code) => reject(new Error(`answerui exited with ${code}: ${output}`)));
  });
  const seen = (await (await fetch(url)).json()) as Record<string, string | undefined>;
  return { url, output, env: seen };
}

async function occupy(port: number) {
  const server = createServer().on("error", () => {});
  blockers.push(server);
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve).on("error", () => resolve()),
  );
  return server;
}

function setup(answers: string) {
  const configHome = mkdtempSync(join(tmpdir(), "answerui-config-"));
  const result = spawnSync(process.execPath, [cli, "--setup"], {
    input: answers,
    encoding: "utf8",
    env: { ...process.env, XDG_CONFIG_HOME: configHome },
  });
  return { ...result, configFile: join(configHome, "answerui", ".env") };
}

describe("answerui", () => {
  it("prints its version", () => {
    expect(run(["--version"]).stdout.trim()).toBe(version);
  });

  it("prints usage", () => {
    expect(run(["--help"]).stdout).toMatch(/Usage: answerui/);
  });

  it("rejects unknown options with the usage", () => {
    const { status, stderr } = run(["--bogus"]);

    expect(status).toBe(1);
    expect(stderr).toMatch(/Usage: answerui/);
  });
});

describe("answerui --setup", () => {
  it("saves the provider settings", () => {
    const answers = "sk-test\nhttps://openrouter.ai/api/v1\nqwen/qwen3\n";

    const { status, configFile } = setup(answers);

    expect(status).toBe(0);
    expect(readFileSync(configFile, "utf8")).toBe(
      "OPENAI_API_KEY=sk-test\nOPENAI_BASE_URL=https://openrouter.ai/api/v1\nOPENAI_MODEL=qwen/qwen3\n",
    );
  });

  it("saves only the answers that were given", () => {
    const { configFile } = setup("\nhttp://localhost:1234/v1\n\n");

    expect(readFileSync(configFile, "utf8")).toBe("OPENAI_BASE_URL=http://localhost:1234/v1\n");
  });

  it.skipIf(process.platform === "win32")("keeps the saved key readable only by the user", () => {
    const { configFile } = setup("sk-test\n\n\n");

    expect(statSync(configFile).mode & 0o777).toBe(0o600);
  });

  it("suggests a bigger context window when Ollama will be used", () => {
    expect(setup("\n\n\n").stdout).toMatch(/OLLAMA_CONTEXT_LENGTH/);
  });
});

describe("answerui start", () => {
  it("uses the saved provider settings as a whole, ignoring the shell's", async () => {
    const app = await start([], {
      env: { OPENAI_API_KEY: "sk-from-shell" },
      saved: "OPENAI_BASE_URL=http://localhost:1234/v1\n",
    });

    expect(app.env.OPENAI_BASE_URL).toBe("http://localhost:1234/v1");
    expect(app.env.OPENAI_API_KEY).toBeUndefined();
    expect(app.output).toMatch(/saved in/);
  });

  it("uses the shell's provider settings when nothing is saved", async () => {
    const app = await start([], { env: { OPENAI_API_KEY: "sk-from-shell" } });

    expect(app.env.OPENAI_API_KEY).toBe("sk-from-shell");
    expect(app.output).toMatch(/from your environment/);
  });

  it("listens only on 127.0.0.1 by default", async () => {
    expect((await start()).env.HOSTNAME).toBe("127.0.0.1");
  });

  it("starts on the next free port when the default one is taken", async () => {
    await occupy(3210);

    const app = await start();

    expect(app.url).not.toBe("http://127.0.0.1:3210");
  });

  it("explains when the chosen port is taken", async () => {
    const server = await occupy(0);
    const port = (server.address() as { port: number }).port;

    const { status, stderr } = run(["--no-open", "--port", String(port)]);

    expect(status).toBe(1);
    expect(stderr).toMatch(new RegExp(`Port ${port} is in use`));
  });

  it("explains when the port isn't a number", () => {
    const { status, stderr } = run(["--no-open", "--port", "abc"]);

    expect(status).toBe(1);
    expect(stderr).toMatch(/--port must be a number/);
  });

  it("explains when the app doesn't start", { timeout: 20_000 }, () => {
    const { status, stderr } = run(["--no-open"], { env: { STUB_NEVER_LISTENS: "1" } });

    expect(status).toBe(1);
    expect(stderr).toMatch(/didn't start/);
  });
});
