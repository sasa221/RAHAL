import { loadApiConfig } from "./config";

const baseEnv: NodeJS.ProcessEnv = {
  AUTH_SECRET: "test-auth-secret-with-at-least-32-characters",
  DATABASE_URL: "postgresql://rahal:test@localhost:5432/rahal",
};

describe("loadApiConfig verification delivery", () => {
  it("keeps delivery disabled when no provider credentials are present", () => {
    const config = loadApiConfig(baseEnv);

    expect(config.verificationBrevo).toBeUndefined();
    expect(config.verificationEmail).toBeUndefined();
    expect(config.verificationGmail).toBeUndefined();
    expect(config.backgroundJobs).toEqual({ mode: "interval" });
    expect(Buffer.from(config.mfaEncryptionKey, "base64url")).toHaveLength(32);
  });

  it("uses request-driven background jobs on Vercel and validates cron secrets", () => {
    expect(loadApiConfig({ ...baseEnv, VERCEL: "1" }).backgroundJobs).toEqual({
      mode: "request",
    });
    expect(() => loadApiConfig({ ...baseEnv, RAHAL_BACKGROUND_JOB_MODE: "sometimes" })).toThrow(
      "RAHAL_BACKGROUND_JOB_MODE must be interval or request.",
    );
    expect(() => loadApiConfig({ ...baseEnv, CRON_SECRET: "too-short" })).toThrow(
      "CRON_SECRET must contain at least 32 characters.",
    );
    expect(
      loadApiConfig({
        ...baseEnv,
        VERCEL: "1",
        CRON_SECRET: "test-cron-secret-with-at-least-32-characters",
      }).backgroundJobs,
    ).toEqual({
      mode: "request",
      cronSecret: "test-cron-secret-with-at-least-32-characters",
    });
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

  it("requires complete Brevo credentials and validates its sender", () => {
    expect(() => loadApiConfig({ ...baseEnv, BREVO_API_KEY: "brevo-test-key" })).toThrow(
      "BREVO_API_KEY, BREVO_SENDER_EMAIL must be configured together.",
    );
    expect(() =>
      loadApiConfig({
        ...baseEnv,
        BREVO_API_KEY: "brevo-test-key",
        BREVO_SENDER_EMAIL: "not-an-email",
      }),
    ).toThrow("BREVO_SENDER_EMAIL must be a valid email address.");
    expect(() =>
      loadApiConfig({
        ...baseEnv,
        BREVO_API_KEY: "brevo-test-key",
        BREVO_SENDER_EMAIL: "sender@example.com",
        BREVO_SENDER_NAME: "RAHAL\nInjected",
      }),
    ).toThrow("BREVO_SENDER_NAME must be a single line of at most 100 characters.");
  });

  it("requires complete Gmail SMTP credentials", () => {
    expect(() => loadApiConfig({ ...baseEnv, GMAIL_SMTP_USER: "sender@gmail.com" })).toThrow(
      "GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD must be configured together.",
    );
  });

  it("maps complete direct-provider credentials", () => {
    const config = loadApiConfig({
      ...baseEnv,
      BREVO_API_KEY: "brevo-test-key",
      BREVO_SENDER_EMAIL: "sender@gmail.com",
      BREVO_SENDER_NAME: "RAHAL | رحال",
      RESEND_API_KEY: "re_test",
      VERIFICATION_EMAIL_FROM: "RAHAL <accounts@rahal.example>",
      GMAIL_SMTP_USER: "sender@gmail.com",
      GMAIL_SMTP_APP_PASSWORD: "test-app-password",
    });

    expect(config.verificationBrevo).toEqual({
      apiKey: "brevo-test-key",
      senderEmail: "sender@gmail.com",
      senderName: "RAHAL | رحال",
    });
    expect(config.verificationEmail).toEqual({
      apiKey: "re_test",
      from: "RAHAL <accounts@rahal.example>",
    });
    expect(config.verificationGmail).toEqual({
      user: "sender@gmail.com",
      appPassword: "test-app-password",
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
      "A configured Brevo or Resend email provider is required in production.",
    );
    expect(() =>
      loadApiConfig({
        ...production,
        WEB_URL: "https://rahal.example",
        BREVO_API_KEY: "brevo-production-key",
        BREVO_SENDER_EMAIL: "sender@example.com",
        RAHAL_PROTECTED_DOCUMENT_UPLOADS_ENABLED: "true",
      }),
    ).toThrow("Private S3 document storage is required in production.");
    expect(() =>
      loadApiConfig({
        ...production,
        WEB_URL: "https://rahal.example",
        RESEND_API_KEY: "re_production",
        VERIFICATION_EMAIL_FROM: "RAHAL <accounts@rahal.example>",
        RAHAL_PROTECTED_DOCUMENT_UPLOADS_ENABLED: "true",
      }),
    ).toThrow("Private S3 document storage is required in production.");

    expect(() =>
      loadApiConfig({
        ...production,
        WEB_URL: "https://rahal.example",
        RESEND_API_KEY: "re_production",
        VERIFICATION_EMAIL_FROM: "RAHAL <accounts@rahal.example>",
        RAHAL_PROTECTED_DOCUMENT_UPLOADS_ENABLED: "true",
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
        RAHAL_PROTECTED_DOCUMENT_UPLOADS_ENABLED: "true",
        PRIVATE_S3_REGION: "eu-central-1",
        PRIVATE_S3_BUCKET: "rahal-private",
        PRIVATE_S3_ACCESS_KEY_ID: "test-access",
        PRIVATE_S3_SECRET_ACCESS_KEY: "test-secret",
        REDIS_URL: "rediss://default:secret@redis.example.test:6379",
      }),
    ).toThrow("Document malware scanning is required in production.");
  });

  it("keeps staging HTTPS and secrets production-safe while unavailable launch providers fail at their feature boundaries", () => {
    const config = loadApiConfig({
      ...baseEnv,
      NODE_ENV: "production",
      RAHAL_RELEASE_TIER: "staging",
      WEB_URL: "https://rahal-eg.vercel.app",
      MFA_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64url"),
      REDIS_URL: "rediss://default:secret@redis.example.test:6379",
    });

    expect(config.production).toBe(true);
    expect(config.releaseTier).toBe("staging");
    expect(config.privateDocumentStoragePath).toBeUndefined();
    expect(config.privateDocumentStorageS3).toBeUndefined();
    expect(config.documentScan).toBeUndefined();
    expect(config.protectedDocumentUploadsEnabled).toBe(false);
  });

  it("allows a production release with protected uploads explicitly disabled", () => {
    const config = loadApiConfig({
      ...baseEnv,
      NODE_ENV: "production",
      RAHAL_RELEASE_TIER: "production",
      RAHAL_BACKGROUND_JOB_MODE: "request",
      CRON_SECRET: "test-cron-secret-with-at-least-32-characters",
      WEB_URL: "https://rahal-eg.vercel.app",
      MFA_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64url"),
      REDIS_URL: "rediss://default:secret@redis.example.test:6379",
      BREVO_API_KEY: "brevo-production-key",
      BREVO_SENDER_EMAIL: "sender@example.com",
      WEB_PUSH_PUBLIC_KEY: "public-key",
      WEB_PUSH_PRIVATE_KEY: "private-key",
      WEB_PUSH_SUBJECT: "mailto:security@example.com",
      PUSH_SUBSCRIPTION_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString("base64url"),
      RAHAL_PROTECTED_DOCUMENT_UPLOADS_ENABLED: "false",
    });

    expect(config.releaseTier).toBe("production");
    expect(config.protectedDocumentUploadsEnabled).toBe(false);
    expect(config.privateDocumentStorageS3).toBeUndefined();
    expect(config.documentScan).toBeUndefined();
  });

  it("keeps protected uploads enabled for local tests but supports an explicit delivery lock", () => {
    expect(loadApiConfig(baseEnv).protectedDocumentUploadsEnabled).toBe(true);
    expect(
      loadApiConfig({
        ...baseEnv,
        RAHAL_PROTECTED_DOCUMENT_UPLOADS_ENABLED: "false",
      }).protectedDocumentUploadsEnabled,
    ).toBe(false);
    expect(() =>
      loadApiConfig({
        ...baseEnv,
        RAHAL_PROTECTED_DOCUMENT_UPLOADS_ENABLED: "maybe",
      }),
    ).toThrow("RAHAL_PROTECTED_DOCUMENT_UPLOADS_ENABLED must be true or false.");
  });

  it("rejects unknown release tiers", () => {
    expect(() => loadApiConfig({ ...baseEnv, RAHAL_RELEASE_TIER: "demo" })).toThrow(
      "RAHAL_RELEASE_TIER must be staging or production.",
    );
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
