import { buildVerificationEmail } from "./verification-email.template";

describe("buildVerificationEmail", () => {
  it("builds an English one-time-code email", () => {
    const email = buildVerificationEmail({ code: "123456", locale: "en" });

    expect(email.subject).toBe("Verify your Rahal account");
    expect(email.text).toContain("123456");
    expect(email.html).toContain('lang="en" dir="ltr"');
    expect(email.html).toContain("RAHAL | رحال");
    expect(email.html).toContain("10 minutes");
  });

  it("builds an Arabic RTL one-time-code email", () => {
    const email = buildVerificationEmail({ code: "654321", locale: "ar" });

    expect(email.subject).toBe("رمز التحقق من حساب رحال");
    expect(email.text).toContain("654321");
    expect(email.html).toContain('lang="ar" dir="rtl"');
    expect(email.html).toContain("10 دقائق");
  });
});
