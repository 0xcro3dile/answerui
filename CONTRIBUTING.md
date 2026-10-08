# Contributing

## Setup

```bash
git clone https://github.com/0xcro3dile/answerui.git
cd answerui
pnpm install
pnpm dev
```

## Checks

```bash
pnpm lint && pnpm format:check && pnpm typecheck
pnpm test
pnpm build && pnpm package && pnpm test:e2e
```

Run `pnpm exec playwright install chromium` once before the first `test:e2e`.

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) for PR titles. PRs are squash
  merged, so the title becomes the commit message.
- Add or update a test for every change in behavior.
- Keep PRs small and focused.

## Releases

Push a version tag from `main`, and CI publishes the release:

```bash
git tag v0.1.0 && git push origin v0.1.0
```
