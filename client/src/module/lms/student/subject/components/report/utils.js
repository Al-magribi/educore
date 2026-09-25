export const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

export const formatDateDisplay = (value) => {
  if (!value) return "-";
  const raw = String(value).split("T")[0];
  const [year, month, day] = raw.split("-");
  if (!year || !month || !day) return raw;
  return `${day}-${month}-${year}`;
};

export const statusTagColor = (statusCode) => {
  if (statusCode === "H") return "green";
  if (statusCode === "T") return "gold";
  if (statusCode === "S") return "blue";
  if (statusCode === "I") return "purple";
  if (statusCode === "A") return "red";
  return "default";
};
