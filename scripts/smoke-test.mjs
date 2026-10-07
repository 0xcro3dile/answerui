// Checks that a running AnswerUI with no provider serves the page and explains the setup.
// Usage: node scripts/smoke-test.mjs [url]
const url = process.argv[2] ?? "http://127.0.0.1:3210";

const page = await waitFor(url);
const models = await fetch(`${url}/api/models`);
const { error } = await models.json();

if (page.status !== 200) fail(`page returned ${page.status}`);
if (models.status !== 503 || !/No model provider found/.test(error)) {
  fail(`/api/models returned ${models.status}: ${error}`);
}
console.log(`Smoke test passed for ${url}`);

async function waitFor(target) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      return await fetch(target);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  fail(`${target} did not respond within a minute`);
}

function fail(message) {
  console.error(`Smoke test failed: ${message}`);
  process.exit(1);
}
