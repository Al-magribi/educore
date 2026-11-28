import dayjs from "dayjs";
import "dayjs/locale/id";

dayjs.locale("id");

/** Ambang wajar: jam mati = sesi/minggu, jam hidup = sesi/bulan */
export const JAM_THRESHOLD = {
  mati: 48,
  hidup: 220,
};

/**
 * Normalize pg DATE / ISO string to YYYY-MM-DD in local calendar.
 * Avoids showing 2026-07-31T17:00:00.000Z for tanggal 1 Agustus (WIB).
 */
export const toDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const matched = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (matched && !value.includes("T")) {
      return matched[1];
    }
  }

  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return null;
  }

  return parsed.format("YYYY-MM-DD");
};

export const formatHonorDate = (value, pattern = "DD MMM YYYY") => {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) {
    return "-";
  }
  return dayjs(dateOnly).format(pattern);
};

export const formatHonorDateRange = (start, end) => {
  const from = formatHonorDate(start);
  const to = formatHonorDate(end);
  if (from === "-" && to === "-") {
    return "-";
  }
  return `${from} – ${to}`;
};

export const getJamThreshold = (jamMode) =>
  jamMode === "hidup" ? JAM_THRESHOLD.hidup : JAM_THRESHOLD.mati;

export const isSuspiciousJam = (jam, jamMode) =>
  Number(jam || 0) > getJamThreshold(jamMode);

export const findSuspiciousJamLines = (lines = [], jamMode = "mati") =>
  lines.filter(
    (line) =>
      line.person_type === "teacher" &&
      isSuspiciousJam(line.jam_final ?? line.jam_auto, jamMode),
  );
