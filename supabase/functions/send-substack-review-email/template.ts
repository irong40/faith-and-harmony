export const REVIEW_EMAIL = "dradamopierce@gmail.com";

export type ReviewEmailVersion = Readonly<{
  id: string;
  draft_id: string;
  version: number;
  status: string;
  selected_headline: string;
  subtitle: string;
  article_markdown: string;
  notes_teaser: string;
  subscribe_call: string;
  content_hash: string;
  token_hash: string;
  published_url: string | null;
}>;

export type EmailPayload = Readonly<{
  to: string;
  subject: string;
  html: string;
  text: string;
}>;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function articleHtml(value: string): string {
  const normalized = escapeHtml(value).replaceAll("\r\n", "\n");
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function reviewUrl(
  baseUrl: string,
  rawToken: string,
  intent: "approve" | "changes",
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}/substack/review/${encodeURIComponent(rawToken)}?intent=${intent}`;
}

function shell(content: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f2f7;color:#24152b;font-family:Arial,sans-serif;">
    <main style="max-width:720px;margin:0 auto;padding:32px 20px;">
      <section style="background:#ffffff;border:1px solid #e4dce8;border-radius:12px;padding:28px;">
        ${content}
      </section>
    </main>
  </body>
</html>`;
}

export function buildReviewEmail(
  version: ReviewEmailVersion,
  rawToken: string,
  reviewBaseUrl: string,
): EmailPayload {
  const approveUrl = reviewUrl(reviewBaseUrl, rawToken, "approve");
  const changesUrl = reviewUrl(reviewBaseUrl, rawToken, "changes");
  const headline = escapeHtml(version.selected_headline);
  const subtitle = escapeHtml(version.subtitle);
  const teaser = escapeHtml(version.notes_teaser);
  const subscribeCall = escapeHtml(version.subscribe_call);
  const draftId = escapeHtml(version.draft_id);

  const warning =
    "Confirmation on the review page publishes the article publicly and emails all Substack subscribers immediately.";

  return {
    to: REVIEW_EMAIL,
    subject: `Review Substack draft: ${version.selected_headline}`,
    html: shell(`
      <p style="margin:0 0 8px;color:#6d5a73;font-size:13px;">Draft ${draftId} | Version ${version.version}</p>
      <h1 style="margin:0 0 8px;font-size:30px;line-height:1.2;">${headline}</h1>
      <p style="margin:0 0 24px;color:#6d5a73;font-size:17px;">${subtitle}</p>
      <div style="font-size:16px;line-height:1.65;">${articleHtml(version.article_markdown)}</div>
      <hr style="border:0;border-top:1px solid #e4dce8;margin:28px 0;">
      <h2 style="font-size:18px;">Substack Notes teaser</h2>
      <p>${teaser}</p>
      <h2 style="font-size:18px;">Subscribe call</h2>
      <p>${subscribeCall}</p>
      <p style="background:#fff7df;border:1px solid #e4c66a;border-radius:8px;padding:14px;font-weight:600;">${warning}</p>
      <p style="margin:24px 0 8px;">
        <a href="${escapeHtml(approveUrl)}" style="display:inline-block;background:#5b2c6f;color:#ffffff;padding:12px 18px;border-radius:7px;text-decoration:none;font-weight:700;">Approve and Publish</a>
      </p>
      <p style="margin:8px 0 0;">
        <a href="${escapeHtml(changesUrl)}" style="display:inline-block;border:1px solid #5b2c6f;color:#5b2c6f;padding:11px 18px;border-radius:7px;text-decoration:none;font-weight:700;">Request Changes</a>
      </p>
    `),
    text: [
      `Draft ${version.draft_id} | Version ${version.version}`,
      version.selected_headline,
      version.subtitle,
      "",
      version.article_markdown,
      "",
      "Substack Notes teaser",
      version.notes_teaser,
      "",
      "Subscribe call",
      version.subscribe_call,
      "",
      warning,
      "",
      `Approve and Publish: ${approveUrl}`,
      `Request Changes: ${changesUrl}`,
    ].join("\n"),
  };
}

export function buildPublishedEmail(
  version: ReviewEmailVersion,
): EmailPayload {
  if (!version.published_url) {
    throw new Error("A published email requires a verified live URL");
  }

  const headline = escapeHtml(version.selected_headline);
  const publishedUrl = escapeHtml(version.published_url);
  return {
    to: REVIEW_EMAIL,
    subject: `Published: ${version.selected_headline}`,
    html: shell(`
      <p style="margin:0 0 8px;color:#6d5a73;font-size:13px;">Publication verified</p>
      <h1 style="margin:0 0 18px;font-size:28px;">${headline}</h1>
      <p>The public post and RSS entry were verified.</p>
      <p><a href="${publishedUrl}" style="display:inline-block;background:#5b2c6f;color:#ffffff;padding:12px 18px;border-radius:7px;text-decoration:none;font-weight:700;">Open the live post</a></p>
      <p style="word-break:break-all;color:#6d5a73;">${publishedUrl}</p>
    `),
    text: [
      "Publication verified",
      version.selected_headline,
      version.published_url,
    ].join("\n"),
  };
}
