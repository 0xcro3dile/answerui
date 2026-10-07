# Contributing

## Setup

```bash
git clone https://github.com/0xcro3dile/answerui.git
cd answerui
pnpm install
cp .env.example .env.local   # or run Ollama locally and skip this
pnpm dev
```

## Checks

```bash
pnpm lint && pnpm format:check && pnpm typecheck
pnpm test                         # unit and demo tests, no API key needed
pnpm build && pnpm package        # builds the npm package into dist/
pnpm test:e2e                     # browser tests against dist/ and a fake model server
```

Run `pnpm exec playwright install chromium` once before the first e2e run.

## Layout

- `src/core`: the rules, meaning provider resolution and the system prompt. It must not import
  Next.js, React or the OpenAI SDK.
- `src/server`: talks to the model provider.
- `src/app`: thin Next.js routes and the page.
- `bin`: the `answerui` command.
- `scripts`: packaging and the smoke test.
- `test/fixtures`: recorded model answers, used by the tests and by the fake model server.

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) for PR titles. PRs are squash
  merged, so the title becomes the commit message.
- Add or update a test for every behavior change.
- Keep PRs small and focused.

## Releases

Push a version tag from `main`:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

CI tests and builds that version, publishes it to npm and the GitHub Container Registry, then
creates the GitHub release with notes generated from the merged PRs.
