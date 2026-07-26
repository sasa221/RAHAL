function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!,
  );
}

export function buildPasswordResetEmail(input: { locale: string; code: string }) {
  const arabic = input.locale === "ar";
  const code = escapeHtml(input.code);
  const subject = arabic ? "رمز استعادة حساب رحال" : "Your Rahal password reset code";
  const intro = arabic
    ? "استخدم الرمز التالي لاستعادة كلمة مرور حساب رحال."
    : "Use the following code to reset the password for your Rahal account.";
  const warning = arabic
    ? "تنتهي صلاحية الرمز خلال 10 دقائق. إذا لم تطلب الاستعادة، تجاهل الرسالة ولا تشارك الرمز."
    : "The code expires in 10 minutes. If you did not request this, ignore the email and never share the code.";
  return {
    subject,
    text: `${intro}\n\n${input.code}\n\n${warning}`,
    html: `<div dir="${arabic ? "rtl" : "ltr"}" style="background:#f3efe6;padding:32px;font-family:Arial,sans-serif;color:#1b1a17"><div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-top:4px solid #b68a3a"><p style="color:#9c6f22;font-weight:700">RAHAL | رحال</p><h1 style="font-size:24px">${intro}</h1><p style="font-size:34px;letter-spacing:8px;font-weight:800">${code}</p><p style="color:#6f6a61;line-height:1.7">${warning}</p></div></div>`,
  };
}
