function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = String(baseUrl ?? "").replace(/\/$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return base ? `${base}${path}` : trimmed;
}

function formatFieldCellContent(field, baseUrl) {
  if (!field.hasValue) return escapeHtml("—");

  if (field.type === "file" && field.value?.type === "file") {
    const absoluteUrl = toAbsoluteUrl(field.value.url, baseUrl);
    if (!absoluteUrl) return escapeHtml("—");
    const safeUrl = escapeHtml(absoluteUrl);
    return `<a href="${safeUrl}">${safeUrl}</a>`;
  }

  return escapeHtml(String(field.value ?? "—"));
}

function buildFieldRows(section, baseUrl) {
  return (section.fields ?? [])
    .map((field) => {
      const label = escapeHtml(field.label);
      const value = formatFieldCellContent(field, baseUrl);
      return `<tr>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600;width:35%;vertical-align:top;">${label}</td>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;vertical-align:top;">${value}</td>
      </tr>`;
    })
    .join("");
}

export function buildApplicationFormWordHtml(detail, baseUrl = "") {
  const formTitle = escapeHtml(detail.formDefinition?.name ?? "Formulir Pendaftaran");
  const periodLine =
    detail.periodName && detail.academicYear
      ? `${escapeHtml(detail.periodName)} · ${escapeHtml(detail.academicYear)}`
      : detail.periodName
        ? escapeHtml(detail.periodName)
        : "";

  const sectionsHtml = (detail.sections ?? [])
    .map((section) => {
      const title = escapeHtml(section.title);
      const description = section.description
        ? `<p style="margin:0 0 12px;color:#64748b;font-size:13px;">${escapeHtml(section.description)}</p>`
        : "";
      const rows = buildFieldRows(section, baseUrl);
      if (!rows) return "";

      return `<h2 style="margin:24px 0 8px;font-size:16px;color:#0f172a;">${title}</h2>
        ${description}
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:13px;">
          <tbody>${rows}</tbody>
        </table>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <title>${formTitle}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; color: #0f172a; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #475569; font-size: 13px; margin: 0 0 16px; }
  </style>
</head>
<body>
  <h1>${formTitle}</h1>
  ${periodLine ? `<p class="meta">${periodLine}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;margin:16px 0 24px;font-size:13px;">
    <tbody>
      <tr>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600;width:35%;">Nama</td>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;">${escapeHtml(detail.name)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600;">Email</td>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;">${escapeHtml(detail.email)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600;">Telepon</td>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;">${escapeHtml(detail.phone)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600;">Asal sekolah</td>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;">${escapeHtml(detail.school)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600;">Tanggal ajuan</td>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;">${escapeHtml(detail.submittedAtFormatted ?? detail.submittedAt ?? "Belum diajukan")}</td>
      </tr>
    </tbody>
  </table>
  ${sectionsHtml || "<p>Belum ada data formulir.</p>"}
</body>
</html>`;
}

function buildExportFilename(detail) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = String(detail.name ?? "pendaftar")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return `formulir-${slug}-${date}.doc`;
}

export function downloadApplicationFormWord(detail) {
  if (!detail) {
    throw new Error("Data formulir tidak tersedia");
  }

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const html = buildApplicationFormWordHtml(detail, baseUrl);
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildExportFilename(detail);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
