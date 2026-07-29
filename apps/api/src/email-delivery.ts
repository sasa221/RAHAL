import { randomBytes } from "node:crypto";
import type { ApiConfig } from "./config";

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  category?: string;
};

export async function sendConfiguredEmail(
  config: Pick<ApiConfig, "verificationBrevo" | "verificationEmail">,
  email: TransactionalEmail,
) {
  if (config.verificationBrevo) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.verificationBrevo.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: config.verificationBrevo.senderEmail,
          name: config.verificationBrevo.senderName,
        },
        to: [{ email: email.to }],
        subject: email.subject,
        textContent: email.text,
        htmlContent: email.html,
        ...(email.category ? { tags: [email.category] } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(`Brevo returned HTTP ${response.status}.`);
    }
    const result = (await response.json()) as { messageId?: string };
    return { provider: "brevo" as const, providerId: result.messageId };
  }

  if (config.verificationEmail) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.verificationEmail.apiKey}`,
        "content-type": "application/json",
        "idempotency-key": `rahal-email-${randomBytes(16).toString("hex")}`,
        "user-agent": "rahal-platform/1.0",
      },
      body: JSON.stringify({
        from: config.verificationEmail.from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(email.category ? { tags: [{ name: "category", value: email.category }] } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend returned HTTP ${response.status}.`);
    }
    const result = (await response.json()) as { id?: string };
    return { provider: "resend" as const, providerId: result.id };
  }

  throw new Error("Email provider is not configured.");
}
