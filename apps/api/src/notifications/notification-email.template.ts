type NotificationEmailInput = {
  title: string;
  body: string;
  locale: "ar" | "en";
  target: string;
};

export function buildNotificationEmail({ title, body, locale, target }: NotificationEmailInput) {
  const arabic = locale === "ar";
  const direction = arabic ? "rtl" : "ltr";
  const language = arabic ? "ar" : "en";
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replace(/\r?\n/g, "<br>");
  const safeTarget = escapeHtml(target);
  const eyebrow = arabic ? "تحديث جديد من رحال" : "A new Rahal update";
  const action = arabic ? "افتح حساب رحال" : "Open your Rahal account";
  const context = arabic
    ? "ستجد التفاصيل والخطوة التالية داخل حسابك. لا ترسل مستندات الهوية أو بياناتها عبر البريد."
    : "You will find the details and next action in your account. Never send identity documents or their details by email.";
  const footer = arabic
    ? "رحال لتأجير السيارات في مصر — الاستلام والإرجاع من فرع رحال فقط."
    : "RAHAL car rental in Egypt — pickup and return at the Rahal branch only.";

  return {
    subject: title,
    text: `${title}\n\n${body}\n\n${context}\n${target}\n\n${footer}`,
    html: `<!doctype html>
<html lang="${language}" dir="${direction}">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;background:#f1ece3;color:#1a1916;font-family:Arial,Tahoma,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f1ece3;padding:24px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:#fffaf1;border:1px solid #ddd1bc;border-collapse:separate;">
            <tr>
              <td style="padding:24px 28px;background:#191815;color:#d5ae5a;text-align:${arabic ? "right" : "left"};">
                <div style="font-size:19px;font-weight:800;letter-spacing:2px;">RAHAL | رحال</div>
                <div style="margin-top:6px;color:#aaa397;font-size:11px;letter-spacing:.8px;">EGYPT · CUSTOMER UPDATE</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 28px 18px;text-align:${arabic ? "right" : "left"};">
                <div style="color:#9a7127;font-size:12px;font-weight:800;letter-spacing:.8px;">${eyebrow}</div>
                <h1 style="margin:13px 0 18px;color:#191815;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.2;font-weight:500;">${safeTitle}</h1>
                <div style="margin:0;color:#555047;font-size:16px;line-height:1.9;">${safeBody}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 32px;text-align:${arabic ? "right" : "left"};">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="background:#c9a451;">
                      <a href="${safeTarget}" style="display:inline-block;padding:15px 24px;color:#171612;text-decoration:none;font-size:15px;font-weight:800;">${action}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;padding:17px 0 0;border-top:1px solid #e3d9c8;color:#766f64;font-size:13px;line-height:1.75;">${context}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#eeE7da;color:#6f685e;font-size:12px;line-height:1.7;text-align:${arabic ? "right" : "left"};">${footer}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}
