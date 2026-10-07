export type Rejection = { error: string; status: 403 | 415 };

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

// The API spends the user's key, so only the app itself may call it: no other hosts (DNS
// rebinding), no other sites (cross-site requests), and JSON only (no preflight-free posts).
export function rejectUntrusted(request: Request, allowedHosts = ""): Rejection | null {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const hostname = hostnameOf(host);

  if (!hostname || !isServed(hostname, allowedHosts)) {
    return {
      error: `${host} isn't an allowed host. Add it to ANSWERUI_ALLOWED_HOSTS to serve it.`,
      status: 403,
    };
  }
  if (isCrossSite(request.headers, host)) {
    return { error: "Requests from other sites aren't allowed.", status: 403 };
  }
  if (request.method === "POST" && mediaType(request.headers) !== "application/json") {
    return { error: "Send the request as JSON.", status: 415 };
  }
  return null;
}

function isServed(hostname: string, allowedHosts: string): boolean {
  const allowed = [...LOOPBACK_HOSTS, ...allowedHosts.split(",").map((entry) => entry.trim())];
  return allowed.includes("*") || allowed.includes(hostname);
}

function isCrossSite(headers: Headers, host: string): boolean {
  const site = headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = headers.get("origin");
  return origin !== null && hostOf(origin) !== host;
}

function hostnameOf(host: string): string | null {
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return null;
  }
}

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

function mediaType(headers: Headers): string | undefined {
  return headers.get("content-type")?.split(";")[0].trim().toLowerCase();
}
