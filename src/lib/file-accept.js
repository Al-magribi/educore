const BARE_TOKEN_TO_MIME = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export const FILE_ACCEPT_PRESETS = [
  {
    value: "image",
    label: "Gambar",
    accept: "image/jpeg,image/png,image/webp,image/gif",
  },
  {
    value: "pdf",
    label: "PDF",
    accept: "application/pdf,.pdf",
  },
  {
    value: "doc",
    label: "DOC",
    accept:
      "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx",
  },
  {
    value: "excel",
    label: "Excel",
    accept:
      "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,.xlsx",
  },
];

export const fileAcceptPresetOptions = FILE_ACCEPT_PRESETS.map(({ value, label }) => ({
  value,
  label,
}));

const PRESET_BY_VALUE = Object.fromEntries(
  FILE_ACCEPT_PRESETS.map((preset) => [preset.value, preset])
);

/** Normalizes admin input like "pdf" into a valid HTML accept string. */
export function normalizeFileAccept(accept) {
  if (!accept?.trim()) return "";

  return accept
    .split(",")
    .map((part) => {
      const token = part.trim();
      if (!token) return "";
      if (token.includes("/") || token.startsWith(".")) return token;
      return BARE_TOKEN_TO_MIME[token.toLowerCase()] ?? `.${token.replace(/^\./, "")}`;
    })
    .filter(Boolean)
    .join(",");
}

function acceptTokens(accept) {
  return normalizeFileAccept(accept)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function getFileAcceptForPreset(presetValue) {
  return PRESET_BY_VALUE[presetValue]?.accept ?? FILE_ACCEPT_PRESETS[0].accept;
}

export function resolveFileAcceptPreset(accept) {
  const normalized = normalizeFileAccept(accept);
  const exact = FILE_ACCEPT_PRESETS.find(
    (preset) => normalizeFileAccept(preset.accept) === normalized
  );
  if (exact) return exact.value;

  const tokens = new Set(acceptTokens(accept));
  const onlyTokens = (allowed) =>
    tokens.size > 0 && [...tokens].every((token) => allowed.has(token));

  if (onlyTokens(new Set(["application/pdf", ".pdf"]))) return "pdf";
  if (
    onlyTokens(
      new Set([
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc",
        ".docx",
      ])
    )
  ) {
    return "doc";
  }
  if (
    onlyTokens(
      new Set([
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls",
        ".xlsx",
      ])
    )
  ) {
    return "excel";
  }

  return "image";
}

/** Client-side check before upload. */
export function fileMatchesAccept(file, accept) {
  const tokens = acceptTokens(accept);
  if (tokens.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith(".")) {
      return fileName.endsWith(token);
    }

    if (token.endsWith("/*")) {
      const prefix = token.slice(0, -1);
      return mime.startsWith(prefix);
    }

    if (token.includes("/")) {
      return mime === token;
    }

    return fileName.endsWith(`.${token}`);
  });
}

const ACCEPT_LABELS = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  ".pdf": "PDF",
  ".doc": "DOC",
  ".docx": "DOCX",
  ".xls": "XLS",
  ".xlsx": "XLSX",
};

export function describeFileAccept(accept) {
  const preset = PRESET_BY_VALUE[resolveFileAcceptPreset(accept)];
  if (preset) return preset.label;

  const normalized = normalizeFileAccept(accept);
  if (!normalized) return "";

  return normalized
    .split(",")
    .map((part) => {
      const token = part.trim();
      if (ACCEPT_LABELS[token]) return ACCEPT_LABELS[token];
      if (token.startsWith("image/")) return token.replace("image/", "").toUpperCase();
      if (token.startsWith(".")) return token.slice(1).toUpperCase();
      return token.toUpperCase();
    })
    .join(", ");
}
