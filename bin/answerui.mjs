#!/usr/bin/env node
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";

const USAGE = `Usage: answerui [options]

Options:
  --setup        Choose a model provider and save it
  --port <port>  Port to listen on (default: the first free one from 3210)
  --host <host>  Address to listen on (default: 127.0.0.1)
  --no-open      Don't open the browser
  -v, --version  Print the version
  -h, --help     Print this help`;

const DEFAULT_PORT = 3210;

const configFile = join(
  process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
  "answerui",
  ".env",
);

const { values: options } = parseArgs({
  options: {
    setup: { type: "boolean" },
    port: { type: "string" },
    host: { type: "string", default: "127.0.0.1" },
    "no-open": { type: "boolean" },
    version: { type: "boolean", short: "v" },
    help: { type: "boolean", short: "h" },
  },
});

if (options.help) console.log(USAGE);
else if (options.version) console.log(packageVersion());
else if (options.setup) await setup();
else await start();

async function start() {
  if (!existsSync(configFile) && !hasProviderInEnv() && process.stdin.isTTY) await setup();
  if (existsSync(configFile)) process.loadEnvFile(configFile);

  const port = options.port || process.env.PORT || String(await firstFreePort(DEFAULT_PORT));
  Object.assign(process.env, {
    PORT: port,
    HOSTNAME: options.host,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    OPENUI_TELEMETRY_DISABLED: "1",
  });
  await import("../app/server.js");

  const url = `http://${options.host}:${port}`;
  await waitUntilReady(url);
  console.log(`AnswerUI is running at ${url}`);
  if (!options["no-open"]) openBrowser(url);
}

async function setup() {
  console.log("AnswerUI works with any OpenAI-compatible provider, or a local server like Ollama.");
  const answers = await ask([
    ["OPENAI_API_KEY", "API key (Enter to skip for a local server): "],
    ["OPENAI_BASE_URL", "Base URL (Enter for OpenAI, or Ollama when there is no key): "],
    ["OPENAI_MODEL", "Model (Enter to pick one in the app): "],
  ]);
  const settings = answers.filter(([, value]) => value).map(([key, value]) => `${key}=${value}\n`);

  mkdirSync(dirname(configFile), { recursive: true });
  writeFileSync(configFile, settings.join(""));
  chmodSync(configFile, 0o600);
  console.log(`Saved to ${configFile}. Run answerui --setup to change it.`);
}

async function ask(questions) {
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  const lines = reader[Symbol.asyncIterator]();
  const answers = [];
  for (const [key, question] of questions) {
    process.stdout.write(question);
    const { value = "" } = await lines.next();
    answers.push([key, value.trim()]);
  }
  reader.close();
  return answers;
}

function firstFreePort(port) {
  return new Promise((resolve) => {
    const probe = createServer()
      .once("error", () => resolve(firstFreePort(port + 1)))
      .once("listening", () => probe.close(() => resolve(port)))
      .listen(port, options.host);
  });
}

function hasProviderInEnv() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL);
}

async function waitUntilReady(url) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await isUp(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function isUp(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

function openBrowser(url) {
  const [command, ...args] =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  spawn(command, args, { stdio: "ignore", detached: true })
    .on("error", () => {})
    .unref();
}

function packageVersion() {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}
