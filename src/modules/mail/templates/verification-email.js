/**
 * Template HTML email verifikasi akun SPMB.
 */
export function buildVerificationEmailHtml({
  schoolName,
  schoolTagline,
  logoUrl,
  hasLogo,
  recipientName,
  code,
  expiresMinutes = 15,
}) {
  const year = new Date().getFullYear();
  const safeName = escapeHtml(recipientName || "Calon Siswa");
  const safeSchool = escapeHtml(schoolName || "EduCore SPMB");
  const safeTagline = escapeHtml(schoolTagline || "Portal Penerimaan Siswa Baru");
  const safeLogoUrl = logoUrl ? escapeHtml(logoUrl) : "";
  const initial = escapeHtml((schoolName || "E").trim().charAt(0).toUpperCase());

  const logoMarkup = hasLogo && safeLogoUrl
    ? `<img src="${safeLogoUrl}" alt="${safeSchool}" width="56" height="56" style="display:block;margin:0 auto 12px;border-radius:12px;background:#ffffff;padding:6px;object-fit:contain;" />`
    : `<div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:rgba(255,255,255,0.15);color:#ffffff;font-size:20px;font-weight:700;margin-bottom:12px;">${initial}</div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verifikasi Email — ${safeSchool}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#1e40af 100%);padding:32px 28px;text-align:center;">
              ${logoMarkup}
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">${safeSchool}</h1>
              <p style="margin:8px 0 0;color:rgba(219,234,254,0.95);font-size:14px;">${safeTagline}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 8px;color:#0f172a;font-size:16px;font-weight:600;">Halo, ${safeName}!</p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Terima kasih telah mendaftar di <strong>${safeSchool}</strong>. Gunakan kode verifikasi berikut untuk mengaktifkan akun Anda:
              </p>
              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:20px;background-color:#eff6ff;border:2px dashed #93c5fd;border-radius:12px;">
                    <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Kode Verifikasi</p>
                    <p style="margin:0;color:#1d4ed8;font-size:36px;font-weight:700;letter-spacing:0.35em;font-family:'Courier New',Courier,monospace;">${code}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;text-align:center;">
                Kode berlaku <strong style="color:#334155;">${expiresMinutes} menit</strong>.
                Jangan bagikan kode ini kepada siapa pun.
              </p>
              <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;" />
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
                Jika Anda tidak mendaftar di ${safeSchool}, abaikan email ini.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                &copy; ${year} ${safeSchool}. Email otomatis — mohon tidak membalas.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildVerificationEmailText({
  schoolName,
  schoolTagline,
  recipientName,
  code,
  expiresMinutes = 15,
}) {
  const name = schoolName || "EduCore SPMB";
  const tagline = schoolTagline || "Portal Penerimaan Siswa Baru";

  return `${name}
${tagline}

Halo ${recipientName || "Calon Siswa"},

Terima kasih telah mendaftar di ${name}.

Kode verifikasi Anda: ${code}

Kode berlaku ${expiresMinutes} menit. Jangan bagikan kode ini kepada siapa pun.

Jika Anda tidak mendaftar, abaikan email ini.`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
