# Security

Please report vulnerabilities privately through
[GitHub security advisories](https://github.com/0xcro3dile/answerui/security/advisories/new),
not in public issues. You'll get a reply within a few days.

AnswerUI runs on your machine and sends your messages only to the model provider you configure.
Its API answers only the app itself, on `localhost`, `127.0.0.1` or `[::1]` unless you add hosts
to `ANSWERUI_ALLOWED_HOSTS`, so other websites can't use your key. Keep the key in `.env.local` or
`~/.config/answerui/.env`, never in the repository.
