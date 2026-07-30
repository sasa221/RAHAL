import { createHash } from "node:crypto";

export type ApiConfig = {
  port: number;
  webUrl: string;
  databaseUrl: string;
  authSecret: string;
  mfaEncryptionKey: string;
  production: boolean;
  releaseTier: "staging" | "production";
  backgroundJobs: {
    mode: "interval" | "request";
    cronSecret?: string;
  };
  redisUrl?: string;
  privateDocumentStoragePath?: string;
  privateDocumentStorageS3?: {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
  };
  documentScan?: {
    url: string;
    secret: string;
  };
  webPush?: {
    publicKey: string;
    privateKey: string;
    subject: string;
    encryptionKey: string;
  };
  verificationDelivery?: {
    url: string;
    secret: string;
  };
  verificationEmail?: {
    apiKey: string;
    from: string;
  };
  verificationBrevo?: {
    apiKey: string;
    senderEmail: string;
    senderName: string;
  };
  verificationGmail?: {
    user: string;
    appPassword: string;
  };
  verificationWhatsApp?: {
    accessToken: string;
    phoneNumberId: string;
    templateName: string;
    notificationTemplateName?: string;
    graphApiVersion: string;
  };
  verificationTwilioVerifyWhatsApp?: {
    accountSid: string;
    authToken: string;
    serviceSid: string;
  };
};

function readCompleteGroup(env: NodeJS.ProcessEnv, names: string[]) {
  const values = names.map((name) => env[name]?.trim() || undefined);
  if (values.some(Boolean) && !values.every(Boolean)) {
    throw new Error(`${names.join(", ")} must be configured together.`);
  }
  return values.every(Boolean) ? (values as string[]) : undefined;
}

function readPort(value: string | undefined) {
  if (!value) {
    return 4000;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function readUrl(name: string, value: string | undefined, fallback: string) {
  const url = value ?? fallback;

  try {
    return new URL(url).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const production = env.NODE_ENV === "production";
  const configuredReleaseTier = env.RAHAL_RELEASE_TIER?.trim().toLowerCase() || "production";
  if (!["staging", "production"].includes(configuredReleaseTier)) {
    throw new Error("RAHAL_RELEASE_TIER must be staging or production.");
  }
  const releaseTier = configuredReleaseTier as ApiConfig["releaseTier"];
  const launchValidated = production && releaseTier === "production";
  const configuredBackgroundJobMode = env.RAHAL_BACKGROUND_JOB_MODE?.trim().toLowerCase();
  if (
    configuredBackgroundJobMode &&
    !["interval", "request"].includes(configuredBackgroundJobMode)
  ) {
    throw new Error("RAHAL_BACKGROUND_JOB_MODE must be interval or request.");
  }
  const backgroundJobMode = (configuredBackgroundJobMode ||
    (env.VERCEL ? "request" : "interval")) as ApiConfig["backgroundJobs"]["mode"];
  const cronSecret = env.CRON_SECRET?.trim();
  if (cronSecret && cronSecret.length < 32) {
    throw new Error("CRON_SECRET must contain at least 32 characters.");
  }
  if (launchValidated && backgroundJobMode === "request" && !cronSecret) {
    throw new Error("CRON_SECRET is required for request-mode production background jobs.");
  }
  const webUrl = readUrl("WEB_URL", env.WEB_URL, "http://localhost:3000");
  if (production && new URL(webUrl).protocol !== "https:") {
    throw new Error("WEB_URL must use HTTPS in production.");
  }

  const databaseUrl = readUrl(
    "DATABASE_URL",
    env.DATABASE_URL,
    "postgresql://rahal:rahal_dev_password@127.0.0.1:5433/rahal?schema=public",
  );

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  const authSecret = env.AUTH_SECRET ?? "rahal-local-development-auth-secret-change-me";
  if (authSecret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  if (production && !env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is required in production.");
  }

  const configuredMfaKey = env.MFA_ENCRYPTION_KEY?.trim();
  if (production && !configuredMfaKey) {
    throw new Error("MFA_ENCRYPTION_KEY is required in production.");
  }
  let mfaKeyBytes: Buffer;
  if (configuredMfaKey) {
    try {
      mfaKeyBytes = Buffer.from(configuredMfaKey, "base64url");
    } catch {
      throw new Error("MFA_ENCRYPTION_KEY must be a base64url-encoded 32-byte key.");
    }
    if (mfaKeyBytes.length !== 32) {
      throw new Error("MFA_ENCRYPTION_KEY must be a base64url-encoded 32-byte key.");
    }
  } else {
    mfaKeyBytes = createHash("sha256").update(`rahal-staff-mfa:${authSecret}`).digest();
  }

  const verificationUrl = env.VERIFICATION_DELIVERY_WEBHOOK_URL?.trim();
  const verificationSecret = env.VERIFICATION_DELIVERY_WEBHOOK_SECRET?.trim();
  if (Boolean(verificationUrl) !== Boolean(verificationSecret)) {
    throw new Error(
      "VERIFICATION_DELIVERY_WEBHOOK_URL and VERIFICATION_DELIVERY_WEBHOOK_SECRET must be configured together.",
    );
  }

  let verificationDelivery: ApiConfig["verificationDelivery"];
  if (verificationUrl && verificationSecret) {
    const url = readUrl("VERIFICATION_DELIVERY_WEBHOOK_URL", verificationUrl, verificationUrl);
    const protocol = new URL(url).protocol;
    if (protocol !== "http:" && protocol !== "https:") {
      throw new Error("VERIFICATION_DELIVERY_WEBHOOK_URL must use HTTP or HTTPS.");
    }
    if (production && protocol !== "https:") {
      throw new Error("VERIFICATION_DELIVERY_WEBHOOK_URL must use HTTPS in production.");
    }
    if (verificationSecret.length < 32) {
      throw new Error("VERIFICATION_DELIVERY_WEBHOOK_SECRET must contain at least 32 characters.");
    }
    verificationDelivery = { url, secret: verificationSecret };
  }

  const emailDelivery = readCompleteGroup(env, ["RESEND_API_KEY", "VERIFICATION_EMAIL_FROM"]);
  const verificationEmail = emailDelivery
    ? { apiKey: emailDelivery[0]!, from: emailDelivery[1]! }
    : undefined;

  const brevoDelivery = readCompleteGroup(env, ["BREVO_API_KEY", "BREVO_SENDER_EMAIL"]);
  const verificationBrevo = brevoDelivery
    ? {
        apiKey: brevoDelivery[0]!,
        senderEmail: brevoDelivery[1]!,
        senderName: env.BREVO_SENDER_NAME?.trim() || "RAHAL | رحال",
      }
    : undefined;
  if (verificationBrevo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationBrevo.senderEmail)) {
    throw new Error("BREVO_SENDER_EMAIL must be a valid email address.");
  }
  if (
    verificationBrevo &&
    (/[\r\n]/.test(verificationBrevo.senderName) || verificationBrevo.senderName.length > 100)
  ) {
    throw new Error("BREVO_SENDER_NAME must be a single line of at most 100 characters.");
  }

  const gmailDelivery = readCompleteGroup(env, ["GMAIL_SMTP_USER", "GMAIL_SMTP_APP_PASSWORD"]);
  const verificationGmail = gmailDelivery
    ? { user: gmailDelivery[0]!, appPassword: gmailDelivery[1]! }
    : undefined;
  if (production && verificationGmail) {
    throw new Error("Gmail SMTP is development-only; production email must use Brevo or Resend.");
  }

  const whatsAppDelivery = readCompleteGroup(env, [
    "WHATSAPP_CLOUD_ACCESS_TOKEN",
    "WHATSAPP_CLOUD_PHONE_NUMBER_ID",
    "WHATSAPP_AUTH_TEMPLATE_NAME",
    "WHATSAPP_GRAPH_API_VERSION",
  ]);
  let verificationWhatsApp: ApiConfig["verificationWhatsApp"];
  if (whatsAppDelivery) {
    const [accessToken, phoneNumberId, templateName, graphApiVersion] = whatsAppDelivery;
    if (!/^v\d+\.\d+$/.test(graphApiVersion!)) {
      throw new Error("WHATSAPP_GRAPH_API_VERSION must use the v00.0 format.");
    }
    verificationWhatsApp = {
      accessToken: accessToken!,
      phoneNumberId: phoneNumberId!,
      templateName: templateName!,
      graphApiVersion: graphApiVersion!,
      ...(env.WHATSAPP_NOTIFICATION_TEMPLATE_NAME?.trim()
        ? { notificationTemplateName: env.WHATSAPP_NOTIFICATION_TEMPLATE_NAME.trim() }
        : {}),
    };
  }

  const twilioVerifyDelivery = readCompleteGroup(env, [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_VERIFY_SERVICE_SID",
  ]);
  let verificationTwilioVerifyWhatsApp: ApiConfig["verificationTwilioVerifyWhatsApp"];
  if (twilioVerifyDelivery) {
    const [accountSid, authToken, serviceSid] = twilioVerifyDelivery;
    if (!/^AC[0-9a-f]{32}$/i.test(accountSid!)) {
      throw new Error("TWILIO_ACCOUNT_SID must be a valid account SID.");
    }
    if (!/^VA[0-9a-f]{32}$/i.test(serviceSid!)) {
      throw new Error("TWILIO_VERIFY_SERVICE_SID must be a valid Verify service SID.");
    }
    verificationTwilioVerifyWhatsApp = {
      accountSid: accountSid!,
      authToken: authToken!,
      serviceSid: serviceSid!,
    };
  }
  if (launchValidated && !verificationBrevo && !verificationEmail) {
    throw new Error("A configured Brevo or Resend email provider is required in production.");
  }
  if (launchValidated && !verificationWhatsApp) {
    throw new Error(
      "Approved WhatsApp Business authentication-template credentials are required in production.",
    );
  }

  const s3Delivery = readCompleteGroup(env, [
    "PRIVATE_S3_REGION",
    "PRIVATE_S3_BUCKET",
    "PRIVATE_S3_ACCESS_KEY_ID",
    "PRIVATE_S3_SECRET_ACCESS_KEY",
  ]);
  const privateDocumentStoragePath = env.PRIVATE_DOCUMENT_STORAGE_PATH?.trim() || undefined;
  const privateS3Endpoint = env.PRIVATE_S3_ENDPOINT?.trim();
  const forcePathStyleValue = env.PRIVATE_S3_FORCE_PATH_STYLE?.trim().toLowerCase();
  if (forcePathStyleValue && !["true", "false"].includes(forcePathStyleValue)) {
    throw new Error("PRIVATE_S3_FORCE_PATH_STYLE must be true or false.");
  }

  let privateDocumentStorageS3: ApiConfig["privateDocumentStorageS3"];
  if (s3Delivery) {
    const [region, bucket, accessKeyId, secretAccessKey] = s3Delivery;
    let endpoint: string | undefined;
    if (privateS3Endpoint) {
      endpoint = readUrl("PRIVATE_S3_ENDPOINT", privateS3Endpoint, privateS3Endpoint);
      if (production && new URL(endpoint).protocol !== "https:") {
        throw new Error("PRIVATE_S3_ENDPOINT must use HTTPS in production.");
      }
    }
    privateDocumentStorageS3 = {
      endpoint,
      region: region!,
      bucket: bucket!,
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      forcePathStyle: forcePathStyleValue === "true",
    };
  }
  if (privateS3Endpoint && !s3Delivery) {
    throw new Error(
      "PRIVATE_S3_ENDPOINT requires the complete private S3 storage credential group.",
    );
  }
  if (privateDocumentStoragePath && privateDocumentStorageS3) {
    throw new Error(
      "Configure either PRIVATE_DOCUMENT_STORAGE_PATH or private S3 storage, not both.",
    );
  }
  if (production && privateDocumentStoragePath) {
    throw new Error("PRIVATE_DOCUMENT_STORAGE_PATH is development-only.");
  }
  if (launchValidated && !privateDocumentStorageS3) {
    throw new Error("Private S3 document storage is required in production.");
  }

  const redisUrl = env.REDIS_URL?.trim();
  if (redisUrl) {
    let parsedRedisUrl: URL;
    try {
      parsedRedisUrl = new URL(redisUrl);
    } catch {
      throw new Error("REDIS_URL must be a valid Redis URL.");
    }
    if (!["redis:", "rediss:"].includes(parsedRedisUrl.protocol)) {
      throw new Error("REDIS_URL must use redis:// or rediss://.");
    }
    if (production && parsedRedisUrl.protocol !== "rediss:") {
      throw new Error("REDIS_URL must use TLS (rediss://) in production.");
    }
  }
  if (launchValidated && !redisUrl) {
    throw new Error("REDIS_URL is required in production.");
  }

  const documentScanGroup = readCompleteGroup(env, [
    "DOCUMENT_SCAN_WEBHOOK_URL",
    "DOCUMENT_SCAN_WEBHOOK_SECRET",
  ]);
  let documentScan: ApiConfig["documentScan"];
  if (documentScanGroup) {
    const url = readUrl("DOCUMENT_SCAN_WEBHOOK_URL", documentScanGroup[0], documentScanGroup[0]!);
    if (production && new URL(url).protocol !== "https:") {
      throw new Error("DOCUMENT_SCAN_WEBHOOK_URL must use HTTPS in production.");
    }
    if (documentScanGroup[1]!.length < 32) {
      throw new Error("DOCUMENT_SCAN_WEBHOOK_SECRET must contain at least 32 characters.");
    }
    documentScan = { url, secret: documentScanGroup[1]! };
  }
  if (launchValidated && !documentScan) {
    throw new Error("Document malware scanning is required in production.");
  }

  const webPushGroup = readCompleteGroup(env, [
    "WEB_PUSH_PUBLIC_KEY",
    "WEB_PUSH_PRIVATE_KEY",
    "WEB_PUSH_SUBJECT",
    "PUSH_SUBSCRIPTION_ENCRYPTION_KEY",
  ]);
  let webPush: ApiConfig["webPush"];
  if (webPushGroup) {
    const [publicKey, privateKey, subject, encryptionKey] = webPushGroup;
    if (!subject!.startsWith("mailto:") && !subject!.startsWith("https://")) {
      throw new Error("WEB_PUSH_SUBJECT must use mailto: or https://.");
    }
    if (Buffer.from(encryptionKey!, "base64url").length !== 32) {
      throw new Error("PUSH_SUBSCRIPTION_ENCRYPTION_KEY must be a base64url-encoded 32-byte key.");
    }
    webPush = {
      publicKey: publicKey!,
      privateKey: privateKey!,
      subject: subject!,
      encryptionKey: encryptionKey!,
    };
  }
  if (launchValidated && !webPush) {
    throw new Error(
      "Web Push VAPID and subscription-encryption settings are required in production.",
    );
  }
  if (launchValidated && !verificationWhatsApp?.notificationTemplateName) {
    throw new Error("WHATSAPP_NOTIFICATION_TEMPLATE_NAME is required in production.");
  }

  return {
    port: readPort(env.PORT),
    webUrl,
    databaseUrl,
    authSecret,
    mfaEncryptionKey: mfaKeyBytes.toString("base64url"),
    production,
    releaseTier,
    backgroundJobs: {
      mode: backgroundJobMode,
      ...(cronSecret ? { cronSecret } : {}),
    },
    redisUrl,
    privateDocumentStoragePath:
      privateDocumentStoragePath || (production ? undefined : ".private-storage"),
    privateDocumentStorageS3,
    documentScan,
    webPush,
    verificationDelivery,
    verificationBrevo,
    verificationEmail,
    verificationGmail,
    verificationWhatsApp,
    verificationTwilioVerifyWhatsApp,
  };
}
