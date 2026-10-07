<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.png">
    <img alt="AnswerUI" src=".github/assets/logo-light.png" width="420">
  </picture>
</p>

<p align="center">
  <strong>Answers you can use, not just read.</strong> Open source, any AI model.
</p>

<p align="center">
  <a href="https://github.com/0xcro3dile/answerui/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/0xcro3dile/answerui/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#models">Models</a> ·
  <a href="#try-these">Try these</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

AnswerUI is a chat app that answers with live interfaces. Ask it to split a bill and you get a
bill splitter. Ask how your savings could grow and you get sliders and a chart. Change a number
and the answer updates on the spot, without another call to the model. When a plain sentence is
the better answer, you get a plain sentence.

It's an open-source alternative to ChatGPT's Intelligent UI that works with any
OpenAI-compatible model, in the cloud or on your own machine.

## Quick start

```bash
npx answerui
```

The first run asks for an API key, or press Enter to use a local model server such as
[Ollama](https://ollama.com). AnswerUI opens in your browser at `http://127.0.0.1:3210`.

<details>
<summary>Docker</summary>

```bash
docker run -p 127.0.0.1:3000:3000 -e OPENAI_API_KEY=sk-... ghcr.io/0xcro3dile/answerui
```

To use Ollama on the host, pass `-e OLLAMA_HOST=host.docker.internal` (on Linux, also
`--add-host=host.docker.internal:host-gateway`).

</details>

<details>
<summary>From source</summary>

```bash
git clone https://github.com/0xcro3dile/answerui.git
cd answerui
pnpm install
pnpm dev
```

</details>

## Models

AnswerUI talks to any OpenAI-compatible API. Set these in your environment, in `.env.local`
when running from source, or with `npx answerui --setup`:

| Variable          | What it does                                 |
| ----------------- | -------------------------------------------- |
| `OPENAI_API_KEY`  | Your provider's API key                      |
| `OPENAI_BASE_URL` | Your provider's endpoint (default: OpenAI)   |
| `OPENAI_MODEL`    | The default model; you can switch in the app |
| `OLLAMA_HOST`     | Where to find Ollama (default: `localhost`)  |

| Provider   | `OPENAI_BASE_URL`                |
| ---------- | -------------------------------- |
| OpenAI     | leave empty                      |
| OpenRouter | `https://openrouter.ai/api/v1`   |
| Groq       | `https://api.groq.com/openai/v1` |
| LM Studio  | `http://localhost:1234/v1`       |
| Ollama     | leave everything empty           |

Larger models build better interfaces. Small local models may fall back to plain text more often.

## Try these

- _Split our dinner bill: burrata $15.99 shared by all four of us, margherita $19.50 for Ana and
  Ben, carbonara $22 for Cara, steak $34 for Dev, tiramisu $7.50 for Ana and Cara. Tax is 8.875%._
- _I have $5,000 saved and can add $500 a month. How could it grow over 10 years?_
- _Plan a roast beef dinner for 6 people, with amounts that rescale when I change the guest count._

## How it works

Answers are written in [OpenUI Lang](https://github.com/thesysdev/openui), a compact language for
interfaces that renders while it streams. AnswerUI teaches the model to bind inputs to variables
and compute results from them, so a tool keeps working in your browser after the model is done.

## Privacy

AnswerUI has no telemetry. Your messages go only to the model provider you configure, and your key
stays on your machine. It listens on `127.0.0.1` by default; don't expose it to the internet
without authentication in front of it, because anyone who can reach it can use your key.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

Built on [OpenUI](https://github.com/thesysdev/openui) (MIT). AnswerUI is not affiliated with
OpenAI.

## License

[MIT](LICENSE)
