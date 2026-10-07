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
pnpm lint
pnpm typecheck
pnpm test        # unit and demo tests, no API key needed
pnpm test:e2e    # browser tests against a fake model server
```

Run `pnpm exec playwright install chromium` once before the first e2e run.

## Layout

- `src/core` holds the rules: provider resolution and the system prompt. It must not import
  Next.js, React or the OpenAI SDK.
- `src/server` talks to the model provider.
- `src/app` holds thin Next.js routes and the page.
- `src/ui` holds React components.
- `test/fixtures` holds recorded model answers used by tests and the fake server.

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and PR titles.
- Add or update a test for every behavior change.
- Keep PRs small and focused.
