const DEFAULT_FROM = "Table Heroes <noreply@table-heroes.de>";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id?: string; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY fehlt — E-Mail nicht versendet:", input.subject, input.to);
    return { ok: true, skipped: true, reason: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text ?? stripHtml(input.html),
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) {
      return { ok: false, error: data.message ?? `Resend HTTP ${response.status}` };
    }

    return { ok: true, id: data.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "E-Mail-Versand fehlgeschlagen.",
    };
  }
}

export function emailLayout(args: {
  title: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  footer?: string;
}): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://table-heroes.de").replace(
    /\/$/,
    "",
  );
  return `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#0f1410;color:#e8e4dc;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1410;padding:24px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1a231c;border:1px solid #3d4f3a;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:24px 28px;background:#122018;border-bottom:1px solid #3d4f3a;">
          <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#c9a227;">Table Heroes</div>
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;color:#f5f0e6;">${args.title}</h1>
        </td></tr>
        <tr><td style="padding:24px 28px;font-size:16px;line-height:1.6;color:#d8d2c8;">
          <p style="margin:0 0 16px;">${args.intro}</p>
          <p style="margin:24px 0 0;">
            <a href="${args.ctaUrl}" style="display:inline-block;padding:12px 18px;background:#c9a227;color:#111;text-decoration:none;border-radius:8px;font-family:Arial,sans-serif;font-weight:700;font-size:14px;">${args.ctaLabel}</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;font-size:12px;line-height:1.5;color:#8a9488;font-family:Arial,sans-serif;">
          ${args.footer ?? `Du erhältst diese E-Mail, weil du Benachrichtigungen in deinem Table-Heroes-Profil aktiviert hast. Einstellungen: ${siteUrl}/dashboard/settings`}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
