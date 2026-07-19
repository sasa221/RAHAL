import { loadApiConfig } from "./config";

const baseEnv: NodeJS.ProcessEnv = {
  AUTH_SECRET: "test-auth-secret-with-at-least-32-characters",
  DATABASE_URL: "postgresql://rahal:test@localhost:5432/rahal",
};

describe("loadApiConfig verification delivery", () => {
  it("keeps delivery disabled when no provider credentials are present", () => {
    const config = loadApiConfig(baseEnv);

    expect(config.verificationEmail).toBeUndefined();
    expect(config.verificationGmail).toBeUndefined();
    expect(config.verificationWhatsApp).toBeUndefined();
  });

  it("requires complete Resend credentials", () => {
    expect(() => loadApiConfig({ ...baseEnv, RESEND_API_KEY: "re_test" })).toThrow(
      "RESEND_API_KEY, VERIFICATION_EMAIL_FROM must be configured together.",
    );
  });

  it("requires complete Gmail SMTP credentials", () => {
    expect(() => loadApiConfig({ ...baseEnv, GMAIL_SMTP_USER: "sender@gmail.com" })).toThrow(
      "GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD must be configured together.",
    );
  });

  it("requires complete WhatsApp credentials and an explicit Graph API version", () => {
    expect(() =>
      loadApiConfig({
        ...baseEnv,
        WHATSAPP_CLOUD_ACCESS_TOKEN: "token",
        WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123",
        WHATSAPP_AUTH_TEMPLATE_NAME: "rahal_account_verification",
      }),
    ).toThrow(
      "WHATSAPP_CLOUD_ACCESS_TOKEN, WHATSAPP_CLOUD_PHONE_NUMBER_ID, WHATSAPP_AUTH_TEMPLATE_NAME, WHATSAPP_GRAPH_API_VERSION must be configured together.",
    );
  });

  it("rejects an invalid WhatsApp Graph API version", () => {
    expect(() =>
      loadApiConfig({
        ...baseEnv,
        WHATSAPP_CLOUD_ACCESS_TOKEN: "token",
        WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123",
        WHATSAPP_AUTH_TEMPLATE_NAME: "rahal_account_verification",
        WHATSAPP_GRAPH_API_VERSION: "latest",
      }),
    ).toThrow("WHATSAPP_GRAPH_API_VERSION must use the v00.0 format.");
  });

  it("maps complete direct-provider credentials", () => {
    const config = loadApiConfig({
      ...baseEnv,
      RESEND_API_KEY: "re_test",
      VERIFICATION_EMAIL_FROM: "RAHAL <accounts@rahal.example>",
      GMAIL_SMTP_USER: "sender@gmail.com",
      GMAIL_SMTP_APP_PASSWORD: "test-app-password",
      WHATSAPP_CLOUD_ACCESS_TOKEN: "token",
      WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123",
      WHATSAPP_AUTH_TEMPLATE_NAME: "rahal_account_verification",
      WHATSAPP_GRAPH_API_VERSION: "v23.0",
    });

    expect(config.verificationEmail).toEqual({
      apiKey: "re_test",
      from: "RAHAL <accounts@rahal.example>",
    });
    expect(config.verificationGmail).toEqual({
      user: "sender@gmail.com",
      appPassword: "test-app-password",
    });
    expect(config.verificationWhatsApp).toEqual({
      accessToken: "token",
      phoneNumberId: "123",
      templateName: "rahal_account_verification",
      graphApiVersion: "v23.0",
    });
  });
});
