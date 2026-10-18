/**
 * Stub mailer client. Replace with real HTTP calls when credentials are provided.
 */
export type SendEmailParams = {
  to: string;
  subject: string;
  body: string;
};

export const sendEmail = async (params: SendEmailParams): Promise<void> => {
  const baseUrl = process.env.MAILER_BASE_URL?.trim();
  const apiKey = process.env.MAILER_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    console.info("[mailer:stub] Email no enviado (MAILER no configurado)", {
      to: params.to,
      subject: params.subject,
    });
    return;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Mailer API error: ${response.status}`);
  }
};
