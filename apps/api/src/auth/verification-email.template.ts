type VerificationEmailInput = {
  code: string;
  locale: string;
};

export function buildVerificationEmail({ code, locale }: VerificationEmailInput) {
  const arabic = locale !== "en";
  const direction = arabic ? "rtl" : "ltr";
  const language = arabic ? "ar" : "en";
  const subject = arabic ? "رمز التحقق من حساب رحال" : "Verify your Rahal account";
  const heading = arabic ? "تحقق من حسابك" : "Verify your account";
  const intro = arabic
    ? "استخدم الرمز التالي لإكمال التحقق من بريدك الإلكتروني في رحال."
    : "Use the following code to complete email verification for your Rahal account.";
  const expiry = arabic
    ? "ينتهي هذا الرمز خلال 10 دقائق، ويمكن استخدامه مرة واحدة فقط."
    : "This code expires in 10 minutes and can only be used once.";
  const warning = arabic
    ? "لم تطلب هذا الرمز؟ تجاهل الرسالة ولا تشاركه مع أي شخص."
    : "Didn’t request this code? Ignore this email and never share the code.";
  const footer = arabic
    ? "رحال لتأجير السيارات في مصر — الاستلام والتسليم من فرع رحال فقط."
    : "RAHAL car rental in Egypt — pickup and return at the Rahal branch only.";

  return {
    subject,
    text: `${heading}\n\n${intro}\n\n${code}\n\n${expiry}\n${warning}\n\n${footer}`,
    html: `<!doctype html>
<html lang="${language}" dir="${direction}">
  <body style="margin:0;background:#f3eee4;color:#191815;font-family:Arial,Tahoma,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3eee4;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fffaf1;border:1px solid #ded4c2;">
            <tr>
              <td style="padding:28px 36px;background:#191815;color:#d5b264;font-size:20px;font-weight:700;letter-spacing:3px;">RAHAL | رحال</td>
            </tr>
            <tr>
              <td style="padding:40px 36px;text-align:${arabic ? "right" : "left"};">
                <div style="color:#9d7424;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">ACCOUNT VERIFICATION</div>
                <h1 style="margin:14px 0 12px;font-family:Georgia,serif;font-size:38px;line-height:1.15;font-weight:500;">${heading}</h1>
                <p style="margin:0;color:#6f6b63;font-size:16px;line-height:1.8;">${intro}</p>
                <div style="margin:30px 0;padding:22px;background:#191815;color:#e1bf70;text-align:center;font-family:Courier New,monospace;font-size:34px;font-weight:700;letter-spacing:10px;">${code}</div>
                <p style="margin:0 0 8px;color:#4d4942;font-size:14px;line-height:1.7;">${expiry}</p>
                <p style="margin:0;color:#8a6a2a;font-size:14px;line-height:1.7;">${warning}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 36px;border-top:1px solid #ded4c2;color:#7a746b;font-size:12px;line-height:1.7;text-align:${arabic ? "right" : "left"};">${footer}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}
