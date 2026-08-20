import { describe, expect, it } from "vitest";
import { buildNotificationEmail } from "./notification-email.template";

describe("notification email template", () => {
  it("renders a responsive Arabic Rahal message", () => {
    const result = buildNotificationEmail({
      title: "تمت مراجعة طلبك",
      body: "افتح حسابك لمعرفة الخطوة التالية.",
      locale: "ar",
      target: "https://rahal-eg.vercel.app/account/requests?request=123",
    });

    expect(result.subject).toBe("تمت مراجعة طلبك");
    expect(result.html).toContain('lang="ar" dir="rtl"');
    expect(result.html).toContain('name="viewport"');
    expect(result.html).toContain("افتح حساب رحال");
    expect(result.text).toContain("الاستلام والإرجاع من فرع رحال فقط");
  });

  it("escapes campaign content before placing it in HTML", () => {
    const result = buildNotificationEmail({
      title: "Update <script>alert(1)</script>",
      body: "Line one\n<img src=x onerror=alert(1)>",
      locale: "en",
      target: "https://rahal-eg.vercel.app/en/account/requests",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain("<img src=x");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("Line one<br>");
  });
});
