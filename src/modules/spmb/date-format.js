const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDateId(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateFmt.format(date);
}

export function formatDateRange(opensAt, closesAt) {
  const open = new Date(opensAt);
  const close = new Date(closesAt);
  if (Number.isNaN(open.getTime()) || Number.isNaN(close.getTime())) return "—";
  return `${dateFmt.format(open)} – ${dateFmt.format(close)}`;
}
