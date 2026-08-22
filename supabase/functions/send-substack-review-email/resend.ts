import type { EmailPayload } from "./template.ts";

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type ResendConfig = Readonly<{
  apiKey: string;
  from: string;
}>;

export async function sendWithResend(
  fetcher: FetchLike,
  config: ResendConfig,
  payload: EmailPayload,
): Promise<{ id: string } | null> {
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) return null;
  const body = await response.json() as { id?: unknown };
  return typeof body.id === "string" && body.id ? { id: body.id } : null;
}
