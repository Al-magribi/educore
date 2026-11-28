const address = () => ({
  street: "",
  village: "",
  district: "",
  regency: "",
  province: "",
  postal_code: "",
  phone: "",
});

const person = () => ({
  name: "",
  birth_place: "",
  birth_date: "",
  education: "",
  job: "",
  income: "",
  religion: "",
  citizenship: "",
  condition: "",
  phone: "",
  address: address(),
});

export const emptyProfile = () => ({
  nickname: "",
  birth_place: "",
  birth_date: "",
  religion: "",
  citizenship: "",
  child_order: "",
  sibling_full: "",
  sibling_step: "",
  sibling_adopted: "",
  family_status: "",
  daily_language: "",
  address: address(),
  living_with: "",
  health: {
    height_entry: "",
    height_leave: "",
    weight_entry: "",
    weight_leave: "",
    social_media: "",
    illness: "",
    physical_note: "",
  },
  prior_education: {
    school: "",
    diploma_date: "",
    diploma_no: "",
    skhun_no: "",
    exam_no: "",
  },
  accepted: { class_name: "", date: "" },
  transfer_in: { school: "", date: "", class_name: "", reason: "" },
  transfer_out: { school: "", date: "", class_name: "", reason: "" },
  father: person(),
  mother: person(),
  guardian: person(),
  scholarships: [{ year_label: "", note: "" }],
  achievements: { art: "", sport: "", academic: "", other: "" },
  graduation: { date: "", diploma_no: "", exam_no: "" },
  after: { continue_to: "", major: "", workplace: "", income: "" },
  photo_entry: "",
  photo_leave: "",
});

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mergeInto = (base, extra) => {
  const next = { ...base };
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeInto(next[key], value);
      return;
    }
    if (value !== undefined && value !== null) next[key] = value;
  });
  return next;
};

export const mergeProfile = (value) => {
  const merged = mergeInto(emptyProfile(), isPlainObject(value) ? value : {});
  if (Array.isArray(value?.scholarships)) {
    merged.scholarships = value.scholarships.length
      ? value.scholarships
      : [{ year_label: "", note: "" }];
  }
  return merged;
};

export const shownValue = (override, source) =>
  override === null || override === undefined || override === ""
    ? source
    : override;

export const STATUS_OPTIONS = [
  { value: "aktif", label: "Aktif" },
  { value: "pindah", label: "Pindah" },
  { value: "lulus", label: "Lulus" },
  { value: "keluar", label: "Keluar" },
];

export const statusColor = {
  aktif: "green",
  pindah: "gold",
  lulus: "blue",
  keluar: "default",
};

export const errorMessage = (error, fallback) =>
  error?.data?.message || fallback;
