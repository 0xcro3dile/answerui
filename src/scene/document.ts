import type { SceneSetup } from "./protocol";

// The page a scene runs in, for an iframe's srcdoc: a CSP that blocks all network access, our runtime,
// the setup, the model's code, then start(). start() also gets a scene or camera the model made itself,
// so a model that ignores the ready-made ones still shows its work.
export function sceneDocument(setup: SceneSetup, code: string, runtimeUrl: string): string {
  const policy = [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${runtimeUrl}`,
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "base-uri 'none'",
  ].join("; ");

  return `<!doctype html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="${policy}">
<style>html,body{margin:0;height:100%;overflow:hidden;background:transparent}</style>
<script src="${runtimeUrl}"></script>
<script>AnswerUIScene.setup(${embed(setup)})</script>
</head>
<body>
<script>
${escapeScript(code)}
</script>
<script>AnswerUIScene.start(typeof scene === "object" ? scene : null, typeof camera === "object" ? camera : null)</script>
</body>
</html>`;
}

// Model code can't close the script element it sits in.
function escapeScript(code: string): string {
  return code.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
}

function embed(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
