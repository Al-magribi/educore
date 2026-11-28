import { useEffect, useState } from "react";

/** Waktu sekarang (ms) yang diperbarui berkala, agar render tetap murni. */
const useNow = (intervalMs = 60_000) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
};

export const getGreeting = (now) => {
  const hour = new Date(now).getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
};

/** Kunci hari jadwal: 1 = Senin ... 7 = Minggu. */
export const getScheduleDayKey = (now) => {
  const weekday = new Date(now).getDay();
  return weekday === 0 ? 7 : weekday;
};

export default useNow;
