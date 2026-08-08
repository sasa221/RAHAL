import { describe, expect, it } from "vitest";
import { buildContactChangeEmail } from "./contact-change-email.template";

describe("contact change email", () => {
  it("builds a branded English safety-focused message", () => {
    const result = buildContactChangeEmail({
      locale: "en",
      code: "123456",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    expect(result.subject).toContain("Rahal email change");
    expect(result.text).toContain("123456");
    expect(result.text).toContain("current account email will remain unchanged");
    expect(result.html).toContain('dir="ltr"');
  });

  it("builds an Arabic RTL equivalent", () => {
    const result = buildContactChangeEmail({
      locale: "ar",
      code: "654321",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    expect(result.subject).toContain("رحال");
    expect(result.text).toContain("654321");
    expect(result.text).toContain("إذا لم تطلب هذا التغيير");
    expect(result.html).toContain('dir="rtl"');
  });
});
