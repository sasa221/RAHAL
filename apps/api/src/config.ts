type ApiConfig = {
  port: number;
  webUrl: string;
  databaseUrl: string;
  authSecret: string;
  production: boolean;
  verificationDelivery?: {
    url: string;
    secret: string;
  };
  verificationEmail?: {
    apiKey: string;
    from: string;
  };
  verificationGmail?: {
    user: string;
    appPassword: string;
  };
  verificationWhatsApp?: {
    accessToken: string;
    phoneNumberId: string;
    templateName: string;
    graphApiVersion: string;
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
  const databaseUrl = readUrl(
    "DATABASE_URL",
    env.DATABASE_URL,
    "postgresql://rahal:rahal_dev_password@127.0.0.1:5433/rahal?schema=public",
  );

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  const production = env.NODE_ENV === "production";
  const authSecret = env.AUTH_SECRET ?? "rahal-local-development-auth-secret-change-me";
  if (authSecret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  if (production && !env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is required in production.");
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

  const gmailDelivery = readCompleteGroup(env, ["GMAIL_SMTP_USER", "GMAIL_SMTP_APP_PASSWORD"]);
  const verificationGmail = gmailDelivery
    ? { user: gmailDelivery[0]!, appPassword: gmailDelivery[1]! }
    : undefined;

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
    };
  }

  return {
    port: readPort(env.PORT),
    webUrl: readUrl("WEB_URL", env.WEB_URL, "http://localhost:3000"),
    databaseUrl,
    authSecret,
    production,
    verificationDelivery,
    verificationEmail,
    verificationGmail,
    verificationWhatsApp,
  };
}
