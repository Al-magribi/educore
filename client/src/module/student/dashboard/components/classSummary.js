/** Ringkas data kelas siswa: "X IPA 1 · Kelas X · IPA". */
export const buildClassSummary = (classInfo) =>
  [
    classInfo?.name && classInfo.name !== "-" ? classInfo.name : "Belum ada kelas",
    classInfo?.grade && classInfo.grade !== "-" ? classInfo.grade : null,
    classInfo?.major && classInfo.major !== "-" ? classInfo.major : null,
  ]
    .filter(Boolean)
    .join(" · ");
