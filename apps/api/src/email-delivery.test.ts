import { afterEach, describe, expect, it, vi } from "vitest";
import { sendConfiguredEmail } from "./email-delivery";

const message = {
  to: "customer@example.com",
  subject: "Verify your Rahal account",
  text: "Your code is 123456",
  html: "<p>Your code is <strong>123456</strong></p>",
  category: "account_verification",
};

describe("sendConfiguredEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Brevo first and sends to the requested customer address", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ messageId: "brevo-message-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendConfiguredEmail(
        {
          verificationBrevo: {
            apiKey: "brevo-test-key",
            senderEmail: "rahal.sender@gmail.com",
            senderName: "RAHAL | رحال",
          },
          verificationEmail: {
            apiKey: "resend-fallback-key",
            from: "RAHAL <accounts@rahal.example>",
          },
        },
        message,
      ),
    ).resolves.toEqual({ provider: "brevo", providerId: "brevo-message-1" });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.brevo.com/v3/smtp/email");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(
      expect.objectContaining({ "api-key": "brevo-test-key" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      sender: { email: string; name: string };
      to: Array<{ email: string }>;
      textContent: string;
      htmlContent: string;
    };
    expect(body.sender).toEqual({
      email: "rahal.sender@gmail.com",
      name: "RAHAL | رحال",
    });
    expect(body.to).toEqual([{ email: message.to }]);
    expect(body.textContent).toContain("123456");
    expect(body.htmlContent).toContain("123456");
  });

  it("keeps Resend as a fallback when Brevo is not configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: "resend-message-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendConfiguredEmail(
        {
          verificationEmail: {
            apiKey: "resend-test-key",
            from: "RAHAL <accounts@rahal.example>",
          },
        },
        message,
      ),
    ).resolves.toEqual({ provider: "resend", providerId: "resend-message-1" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.resend.com/emails");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(
      expect.objectContaining({ authorization: "Bearer resend-test-key" }),
    );
  });

  it("fails closed when no provider is configured", async () => {
    await expect(sendConfiguredEmail({}, message)).rejects.toThrow(
      "Email provider is not configured.",
    );
  });
});
