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
    expect(Buffer.from(config.mfaEncryptionKey, "base64url")).toHaveLength(32);
  });

  it("requires a 32-byte MFA encryption key when configured", () => {
    expect(() => loadApiConfig({ ...baseEnv, MFA_ENCRYPTION_KEY: "too-short" })).toThrow(
      "MFA_ENCRYPTION_KEY must be a base64url-encoded 32-byte key.",
    );
    const key = Buffer.alloc(32, 7).toString("base64url");
    expect(loadApiConfig({ ...baseEnv, MFA_ENCRYPTION_KEY: key }).mfaEncryptionKey).toBe(key);
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

  it("fails closed when production transport or account-delivery providers are incomplete", () => {
    const production = {
      ...baseEnv,
      NODE_ENV: "production",
      MFA_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64url"),
    };

    expect(() => loadApiConfig(production)).toThrow("WEB_URL must use HTTPS in production.");
    expect(() => loadApiConfig({ ...production, WEB_URL: "https://rahal.example" })).toThrow(
      "RESEND_API_KEY and VERIFICATION_EMAIL_FROM are required in production.",
    );
    expect(() =>
      loadApiConfig({
        ...production,
        WEB_URL: "https://rahal.example",
        RESEND_API_KEY: "re_production",
        VERIFICATION_EMAIL_FROM: "RAHAL <accounts@rahal.example>",
      }),
    ).toThrow(
      "Approved WhatsApp Business authentication-template credentials are required in production.",
    );

    expect(() =>
      loadApiConfig({
        ...production,
        WEB_URL: "https://rahal.example",
        RESEND_API_KEY: "re_production",
        VERIFICATION_EMAIL_FROM: "RAHAL <accounts@rahal.example>",
        WHATSAPP_CLOUD_ACCESS_TOKEN: "token",
        WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123",
        WHATSAPP_AUTH_TEMPLATE_NAME: "rahal_account_verification",
        WHATSAPP_GRAPH_API_VERSION: "v23.0",
      }),
    ).toThrow("Private S3 document storage is required in production.");

    expect(() =>
      loadApiConfig({
        ...production,
        WEB_URL: "https://rahal.example",
        RESEND_API_KEY: "re_production",
        VERIFICATION_EMAIL_FROM: "RAHAL <accounts@rahal.example>",
        WHATSAPP_CLOUD_ACCESS_TOKEN: "token",
        WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123",
        WHATSAPP_AUTH_TEMPLATE_NAME: "rahal_account_verification",
        WHATSAPP_GRAPH_API_VERSION: "v23.0",
        PRIVATE_S3_REGION: "eu-central-1",
        PRIVATE_S3_BUCKET: "rahal-private",
        PRIVATE_S3_ACCESS_KEY_ID: "test-access",
        PRIVATE_S3_SECRET_ACCESS_KEY: "test-secret",
      }),
    ).toThrow("REDIS_URL is required in production.");

    expect(() =>
      loadApiConfig({
        ...production,
        WEB_URL: "https://rahal.example",
        RESEND_API_KEY: "re_production",
        VERIFICATION_EMAIL_FROM: "RAHAL <accounts@rahal.example>",
        WHATSAPP_CLOUD_ACCESS_TOKEN: "token",
        WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123",
        WHATSAPP_AUTH_TEMPLATE_NAME: "rahal_account_verification",
        WHATSAPP_GRAPH_API_VERSION: "v23.0",
        PRIVATE_S3_REGION: "eu-central-1",
        PRIVATE_S3_BUCKET: "rahal-private",
        PRIVATE_S3_ACCESS_KEY_ID: "test-access",
        PRIVATE_S3_SECRET_ACCESS_KEY: "test-secret",
        REDIS_URL: "rediss://default:secret@redis.example.test:6379",
      }),
    ).toThrow("Document malware scanning is required in production.");
  });

  it("maps private S3 storage and rejects unsafe production storage", () => {
    const storageEnv = {
      ...baseEnv,
      PRIVATE_S3_REGION: "eu-central-1",
      PRIVATE_S3_BUCKET: "rahal-private",
      PRIVATE_S3_ACCESS_KEY_ID: "test-access",
      PRIVATE_S3_SECRET_ACCESS_KEY: "test-secret",
      PRIVATE_S3_FORCE_PATH_STYLE: "true",
    };
    expect(loadApiConfig(storageEnv).privateDocumentStorageS3).toEqual({
      endpoint: undefined,
      region: "eu-central-1",
      bucket: "rahal-private",
      accessKeyId: "test-access",
      secretAccessKey: "test-secret",
      forcePathStyle: true,
    });
    expect(() =>
      loadApiConfig({
        ...storageEnv,
        PRIVATE_DOCUMENT_STORAGE_PATH: ".private-storage",
      }),
    ).toThrow("Configure either PRIVATE_DOCUMENT_STORAGE_PATH or private S3 storage, not both.");
  });

  it("requires a complete encrypted Web Push configuration", () => {
    expect(() =>
      loadApiConfig({
        ...baseEnv,
        WEB_PUSH_PUBLIC_KEY: "public-key",
      }),
    ).toThrow(
      "WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY, WEB_PUSH_SUBJECT, PUSH_SUBSCRIPTION_ENCRYPTION_KEY must be configured together.",
    );
    const encryptionKey = Buffer.alloc(32, 5).toString("base64url");
    expect(
      loadApiConfig({
        ...baseEnv,
        WEB_PUSH_PUBLIC_KEY: "public-key",
        WEB_PUSH_PRIVATE_KEY: "private-key",
        WEB_PUSH_SUBJECT: "mailto:operations@example.test",
        PUSH_SUBSCRIPTION_ENCRYPTION_KEY: encryptionKey,
      }).webPush,
    ).toEqual({
      publicKey: "public-key",
      privateKey: "private-key",
      subject: "mailto:operations@example.test",
      encryptionKey,
    });
  });
});
