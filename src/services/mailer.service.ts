import { AppError } from "../utils/errors";

/**
 * Client for the maberc mailer (POST /email/send, Resend behind it). Authenticates as a
 * service client with MAILER_API_KEY (one of the mailer's SERVICE_API_KEYS), sent as X-Api-Key.
 * MAILER_BASE_URL defaults to the deployed mailer. Emails go out from the mailer's own sender.
 */
export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const TIMEOUT_MS = 10_000;

const DEFAULT_BASE_URL = "https://mailer.maberc.com";

const readConfig = () => ({
  baseUrl: (process.env.MAILER_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  apiKey: process.env.MAILER_API_KEY?.trim(),
});

export const isMailerConfigured = (): boolean => {
  const { baseUrl, apiKey } = readConfig();
  return Boolean(baseUrl && apiKey);
};

const unavailable = () =>
  new AppError(503, "No pudimos enviarte el correo. Intenta de nuevo en unos minutos.");

export const sendEmail = async (params: SendEmailParams): Promise<void> => {
  const { baseUrl, apiKey } = readConfig();

  if (!baseUrl || !apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mailer] MAILER_API_KEY no configurada");
      throw unavailable();
    }
    // Development: print the email so the flow can be tested without a mailer.
    console.info(`[mailer:dev] Para ${params.to} — ${params.subject}\n${params.text}`);
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[mailer] Sin respuesta del mailer:", error);
    throw unavailable();
  }

  if (!response.ok) {
    console.error(
      response.status === 401
        ? "[mailer] El mailer rechazó MAILER_API_KEY (401): revisa SERVICE_API_KEYS en el mailer"
        : `[mailer] El mailer respondió ${response.status}`
    );
    throw unavailable();
  }
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** A short branded email whose only content is a one-time code. */
export const codeEmail = (options: {
  heading: string;
  intro: string;
  code: string;
  expiryMinutes: number;
}): { text: string; html: string } => {
  const { heading, intro, code, expiryMinutes } = options;
  const outro = `El código expira en ${expiryMinutes} minutos. Si no fuiste tú, ignora este correo: nadie puede entrar a tu cuenta sin este código.`;

  return {
    text: `${heading}\n\n${intro}\n\n${code}\n\n${outro}\n\n— AutoHunt`,
    html: `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1B1F1D">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #D9D3C4">
<tr><td style="background:#0E2A23;color:#FAF7F0;padding:20px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:600">AutoHunt</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(heading)}</h1>
<p style="margin:0 0 20px;line-height:1.5;color:#565E59">${escapeHtml(intro)}</p>
<p style="margin:0 0 20px;font-size:32px;letter-spacing:8px;font-weight:700;font-family:Menlo,Consolas,monospace;color:#1C4A3C">${escapeHtml(code)}</p>
<p style="margin:0;line-height:1.5;font-size:13px;color:#565E59">${escapeHtml(outro)}</p>
</td></tr></table></td></tr></table></body></html>`,
  };
};
