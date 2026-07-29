import { afterEach, describe, expect, it, vi } from "vitest";
import { PushSubscriptionCryptoService } from "./push-subscription-crypto.service";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PushSubscriptionCryptoService", () => {
  it("encrypts subscription endpoints with user-bound authenticated encryption", () => {
    vi.stubEnv("WEB_PUSH_PUBLIC_KEY", "test-public-key");
    vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "test-private-key");
    vi.stubEnv("WEB_PUSH_SUBJECT", "mailto:operations@example.test");
    vi.stubEnv("PUSH_SUBSCRIPTION_ENCRYPTION_KEY", Buffer.alloc(32, 4).toString("base64url"));
    const crypto = new PushSubscriptionCryptoService();
    const subscription = {
      endpoint: "https://push.example.test/subscription/opaque",
      keys: { p256dh: "public-key-material", auth: "auth-secret" },
    };

    const encrypted = crypto.encrypt("user-1", subscription);

    expect(encrypted).not.toContain(subscription.endpoint);
    expect(crypto.decrypt("user-1", encrypted)).toEqual(subscription);
    expect(() => crypto.decrypt("user-2", encrypted)).toThrow(
      "The push subscription cannot be read.",
    );
  });
});
