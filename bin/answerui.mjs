#!/usr/bin/env node
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs, parseEnv } from "node:util";

const USAGE = `Usage: answerui [options]

Options:
  --setup        Choose a model provider and save it
  --port <port>  Port to listen on (default: the first free one from 3210)
  --host <host>  Address to listen on (default: 127.0.0.1)
  --no-open      Don't open the browser
  -v, --version  Print the version
  -h, --help     Print this help`;

const DEFAULT_PORT = 3210;
const PORTS_TO_TRY = 20;
const PROVIDER_SETTINGS = ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL"];

const configFile = join(
  process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
  "answerui",
  ".env",
);

const options = readOptions();

if (options.help) console.log(USAGE);
else if (options.version) console.log(packageVersion());
else if (options.setup) await setup();
else await start();

function readOptions() {
  try {
    return parseArgs({
      options: {
        setup: { type: "boolean" },
        port: { type: "string" },
        host: { type: "string", default: "127.0.0.1" },
        "no-open": { type: "boolean" },
        version: { type: "boolean", short: "v" },
        help: { type: "boolean", short: "h" },
      },
    }).values;
  } catch (error) {
    fail(`${error.message}\n\n${USAGE}`);
  }
}

async function start() {
  if (!existsSync(configFile) && !hasProviderInEnv() && process.stdin.isTTY) await setup();
  console.log(applyProviderSettings());

  const port = await choosePort();
  Object.assign(process.env, {
    PORT: String(port),
    HOSTNAME: options.host,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    OPENUI_TELEMETRY_DISABLED: "1",
  });
  await import("../app/server.js");

  const url = `http://${options.host}:${port}`;
  if (!(await waitUntilReady(url))) fail(`AnswerUI didn't start on ${url}.`);
  console.log(`AnswerUI is running at ${url}`);
  if (!options["no-open"]) openBrowser(url);
}

// Saved settings replace the shell's as a whole, so a key never goes to the wrong provider.
function applyProviderSettings() {
  if (existsSync(configFile)) {
    for (const name of PROVIDER_SETTINGS) delete process.env[name];
    Object.assign(process.env, parseEnv(readFileSync(configFile, "utf8")));
    return `Using the model provider saved in ${configFile}. Run npx answerui-app --setup to change it.`;
  }
  if (hasProviderInEnv()) return "Using the model provider from your environment.";
  return "No model provider set, so AnswerUI will use Ollama if it's running. Run npx answerui-app --setup to choose another.";
}

async function setup() {
  console.log("AnswerUI works with any OpenAI-compatible provider, or a local server like Ollama.");
  const answers = await ask([
    ["OPENAI_API_KEY", "API key (Enter to skip for a local server): "],
    ["OPENAI_BASE_URL", "Base URL (Enter for OpenAI, or Ollama when there is no key): "],
    ["OPENAI_MODEL", "Model (Enter to pick one in the app): "],
  ]);
  const saved = Object.fromEntries(answers.filter(([, value]) => value));
  const lines = Object.entries(saved).map(([name, value]) => `${name}=${value}\n`);

  mkdirSync(dirname(configFile), { recursive: true });
  writeFileSync(configFile, lines.join(""), { mode: 0o600 });
  chmodSync(configFile, 0o600);
  console.log(`Saved to ${configFile}. Run npx answerui-app --setup to change it.`);
  if (!saved.OPENAI_API_KEY && !saved.OPENAI_BASE_URL) {
    console.log("Using Ollama? Start it with OLLAMA_CONTEXT_LENGTH=16384 so the instructions fit.");
  }
}

async function ask(questions) {
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  const lines = reader[Symbol.asyncIterator]();
  const answers = [];
  for (const [name, question] of questions) {
    process.stdout.write(question);
    const { value = "" } = await lines.next();
    answers.push([name, value.trim()]);
  }
  reader.close();
  return answers;
}

async function choosePort() {
  const requested = options.port || process.env.PORT;
  if (requested) return requestedPort(requested);

  for (let port = DEFAULT_PORT; port < DEFAULT_PORT + PORTS_TO_TRY; port++) {
    if (await isFree(port)) return port;
  }
  fail(
    `Ports ${DEFAULT_PORT}-${DEFAULT_PORT + PORTS_TO_TRY - 1} are in use. Choose one with --port.`,
  );
}

async function requestedPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail("--port must be a number from 1 to 65535.");
  }
  if (!(await isFree(port))) fail(`Port ${port} is in use. Choose another with --port.`);
  return port;
}

function isFree(port) {
  return new Promise((resolve) => {
    const probe = createServer()
      .once("error", (error) => {
        if (error.code === "EADDRINUSE") resolve(false);
        else fail(`Can't listen on ${options.host}:${port} (${error.code}).`);
      })
      .once("listening", () => probe.close(() => resolve(true)))
      .listen(port, options.host);
  });
}

function hasProviderInEnv() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL);
}

async function waitUntilReady(url) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await isUp(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
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

function fail(message) {
  console.error(message);
  process.exit(1);
}
