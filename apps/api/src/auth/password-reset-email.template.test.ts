import { describe, expect, it } from "vitest";
import { buildPasswordResetEmail } from "./password-reset-email.template";

describe("password reset email", () => {
  it("creates bilingual code-only recovery content without passwords or links", () => {
    const english = buildPasswordResetEmail({ locale: "en", code: "123456" });
    const arabic = buildPasswordResetEmail({ locale: "ar", code: "654321" });
    expect(english.subject).toContain("password reset");
    expect(english.text).toContain("123456");
    expect(arabic.text).toContain("654321");
    expect(english.html).not.toContain("currentPassword");
    expect(english.html).not.toContain("http");
  });
});
