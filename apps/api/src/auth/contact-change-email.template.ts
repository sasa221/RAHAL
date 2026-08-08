type ContactChangeEmailInput = {
  locale: string;
  code: string;
  expiresAt: Date;
};

export function buildContactChangeEmail(input: ContactChangeEmailInput) {
  const arabic = input.locale !== "en";
  const minutes = Math.max(1, Math.round((input.expiresAt.getTime() - Date.now()) / 60_000));
  const subject = arabic ? "رمز تأكيد تغيير بريد حساب رحال" : "Confirm your Rahal email change";
  const heading = arabic ? "تأكيد البريد الجديد" : "Confirm your new email";
  const intro = arabic
    ? "استخدم هذا الرمز لإتمام تغيير البريد الإلكتروني لحسابك في رحال."
    : "Use this code to complete the email change for your Rahal account.";
  const expiry = arabic
    ? `ينتهي الرمز خلال ${minutes} دقائق.`
    : `This code expires in ${minutes} minutes.`;
  const safety = arabic
    ? "إذا لم تطلب هذا التغيير، تجاهل الرسالة وسيبقى بريد حسابك الحالي كما هو."
    : "If you did not request this change, ignore this email and your current account email will remain unchanged.";
  const text = `${heading}\n\n${intro}\n\n${input.code}\n\n${expiry}\n${safety}`;
  const html = `<!doctype html>
<html lang="${arabic ? "ar" : "en"}" dir="${arabic ? "rtl" : "ltr"}">
  <body style="margin:0;background:#f2eee5;color:#1d1e1a;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fffdf8;border:1px solid #d8cfbd">
          <tr><td style="height:5px;background:#b7882f"></td></tr>
          <tr><td style="padding:34px">
            <p style="margin:0;color:#9a6d1e;font-size:12px;font-weight:bold;letter-spacing:2px">RAHAL / SECURE ACCOUNT</p>
            <h1 style="margin:18px 0 12px;font-size:34px;line-height:1.2">${heading}</h1>
            <p style="margin:0 0 24px;color:#6f6b63;font-size:16px;line-height:1.7">${intro}</p>
            <div style="background:#1d1e1a;color:#e2b95e;font-size:34px;font-weight:bold;letter-spacing:10px;text-align:center;padding:22px">${input.code}</div>
            <p style="margin:22px 0 8px;color:#55524b">${expiry}</p>
            <p style="margin:0;padding:16px;background:#eee7d9;color:#6b665d;font-size:13px;line-height:1.7">${safety}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, text, html };
}
