import { expect, test } from "@playwright/test";

test("refuses API calls addressed to another host, which blocks DNS rebinding", async ({
  request,
}) => {
  const response = await request.get("/api/models", { headers: { host: "rebind.evil.example" } });

  expect(response.status()).toBe(403);
});

test("refuses API calls from other sites", async ({ request }) => {
  const response = await request.post("/api/chat", {
    headers: { origin: "https://evil.example", "content-type": "text/plain" },
    data: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
  });

  expect(response.status()).toBe(403);
});

test("can't be framed by other sites", async ({ request }) => {
  const response = await request.get("/");

  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});
