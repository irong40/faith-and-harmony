import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sendWithResend } from "./resend.ts";

const payload = {
  to: "dradamopierce@gmail.com",
  subject: "Review draft",
  html: "<p>Review</p>",
  text: "Review",
};

Deno.test("sends the stored payload through the Resend HTTP API", async () => {
  const captured: Array<{ url: string; init?: RequestInit }> = [];
  const result = await sendWithResend(
    async (url, init) => {
      captured.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    { apiKey: "resend-secret", from: "Sentinel <review@example.com>" },
    payload,
  );

  assertEquals(result, { id: "email_123" });
  const call = captured[0];
  assertExists(call);
  assertEquals(call.url, "https://api.resend.com/emails");
  assertEquals(call.init?.method, "POST");
  assertEquals(
    new Headers(call.init?.headers).get("Authorization"),
    "Bearer resend-secret",
  );
  assertEquals(JSON.parse(String(call.init?.body)), {
    from: "Sentinel <review@example.com>",
    to: ["dradamopierce@gmail.com"],
    subject: "Review draft",
    html: "<p>Review</p>",
    text: "Review",
  });
});

Deno.test("returns null when Resend rejects the message", async () => {
  const result = await sendWithResend(
    async () => new Response(JSON.stringify({ message: "rejected" }), { status: 422 }),
    { apiKey: "resend-secret", from: "Sentinel <review@example.com>" },
    payload,
  );

  assertEquals(result, null);
});
