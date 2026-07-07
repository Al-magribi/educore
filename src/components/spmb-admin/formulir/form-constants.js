import { getFileAcceptForPreset } from "@/lib/file-accept.js";

export const FIELD_TYPES = [
  { value: "text", label: "Teks singkat" },
  { value: "textarea", label: "Teks panjang" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Telepon" },
  { value: "number", label: "Angka" },
  { value: "date", label: "Tanggal" },
  { value: "select", label: "Pilihan (dropdown)" },
  { value: "radio", label: "Pilihan (radio)" },
  { value: "checkbox", label: "Centang" },
  { value: "file", label: "Upload berkas" },
];

export const OPTION_TYPES = new Set(["select", "radio"]);

export const defaultFormMeta = {
  name: "Formulir SPMB",
  description: "Formulir pendaftaran calon siswa",
};

export const defaultFormGroups = [
  {
    id: "student",
    title: "Data Calon Siswa",
    description: "Identitas dan biodata peserta didik",
    fields: [
      { id: "full_name", type: "text", label: "Nama Lengkap", required: true, placeholder: "" },
      { id: "birth_date", type: "date", label: "Tanggal Lahir", required: true, placeholder: "" },
      {
        id: "gender",
        type: "select",
        label: "Jenis Kelamin",
        required: true,
        options: ["Laki-laki", "Perempuan"],
      },
    ],
  },
  {
    id: "parents",
    title: "Data Orang Tua",
    description: "Informasi ayah dan ibu calon siswa",
    fields: [
      { id: "father_name", type: "text", label: "Nama Ayah", required: true, placeholder: "" },
      { id: "mother_name", type: "text", label: "Nama Ibu", required: true, placeholder: "" },
      { id: "parent_phone", type: "tel", label: "Nomor HP Orang Tua", required: true, placeholder: "" },
    ],
  },
  {
    id: "address",
    title: "Data Alamat",
    description: "Alamat domisili calon siswa",
    fields: [
      { id: "street", type: "textarea", label: "Alamat Lengkap", required: true, placeholder: "" },
      { id: "city", type: "text", label: "Kota/Kabupaten", required: true, placeholder: "" },
      { id: "postal_code", type: "text", label: "Kode Pos", required: false, placeholder: "" },
    ],
  },
  {
    id: "documents",
    title: "Berkas",
    description: "Dokumen pendukung pendaftaran",
    fields: [
      {
        id: "photo",
        type: "file",
        label: "Pas Foto 3x4",
        required: true,
        accept: getFileAcceptForPreset("image"),
      },
      {
        id: "birth_certificate",
        type: "file",
        label: "Akta Kelahiran",
        required: true,
        accept: "application/pdf,.pdf",
      },
    ],
  },
];

export function slugifyId(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

/** Sanitize manual ID input while typing — preserves underscores (incl. trailing). */
export function sanitizeIdInput(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 40);
}

/** Finalize ID before save — trim edge underscores, collapse repeats. */
export function finalizeId(value) {
  return sanitizeIdInput(value)
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function isFieldIdTaken(groups, candidateId, excludeFieldId) {
  const normalized = finalizeId(candidateId);
  if (!normalized) return false;

  for (const group of groups) {
    for (const field of group.fields) {
      if (field.id === excludeFieldId) continue;
      if (finalizeId(field.id) === normalized) return true;
    }
  }

  return false;
}

export function findDuplicateFieldIds(groups) {
  const seen = new Set();
  const duplicates = new Set();

  for (const group of groups) {
    for (const field of group.fields) {
      const id = finalizeId(field.id);
      if (!id) continue;
      if (seen.has(id)) duplicates.add(id);
      else seen.add(id);
    }
  }

  return [...duplicates];
}

export function normalizeGroup(group) {
  const title = (group?.title ?? group?.name ?? "").trim();

  return {
    id: group?.id?.trim() || slugifyId(title || "grup") || "grup",
    title: title || "Grup",
    description: typeof group?.description === "string" ? group.description.trim() : "",
    fields: Array.isArray(group?.fields) ? group.fields : [],
  };
}

export function normalizeFormGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map(normalizeGroup);
}

export function createGroup(title = "Grup Baru") {
  const base = slugifyId(title) || "grup";
  return {
    id: `${base}_${Date.now().toString(36)}`,
    title,
    description: "",
    fields: [],
  };
}

export function createField(type = "text") {
  const label = "Field baru";
  return {
    id: `${slugifyId(label)}_${Date.now().toString(36)}`,
    type,
    label,
    required: false,
    placeholder: "",
    options: OPTION_TYPES.has(type) ? ["Opsi 1", "Opsi 2"] : undefined,
    accept: type === "file" ? getFileAcceptForPreset("image") : undefined,
  };
}

export function findFieldLocation(groups, fieldId) {
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const fieldIndex = group.fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex >= 0) {
      return { group, groupIndex, fieldIndex, field: group.fields[fieldIndex] };
    }
  }
  return null;
}

export function createBlankFormDraft() {
  return {
    id: null,
    name: defaultFormMeta.name,
    isActive: false,
    version: 0,
    schema: {
      meta: { ...defaultFormMeta },
      groups: normalizeFormGroups(structuredClone(defaultFormGroups)),
    },
  };
}
