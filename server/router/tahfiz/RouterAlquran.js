import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const ALQURAN_API_BASE = "https://api.alquran.cloud/v1";
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 jam
const cache = new Map();

const hasColumn = async (db, tableName, columnName) => {
  const result = await db.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName],
  );

  return result.rows.length > 0;
};

const JUZ_RANGES = [
  { number: 1, start_surah_number: 1, start_ayah: 1, end_surah_number: 2, end_ayah: 141 },
  { number: 2, start_surah_number: 2, start_ayah: 142, end_surah_number: 2, end_ayah: 252 },
  { number: 3, start_surah_number: 2, start_ayah: 253, end_surah_number: 3, end_ayah: 92 },
  { number: 4, start_surah_number: 3, start_ayah: 93, end_surah_number: 4, end_ayah: 23 },
  { number: 5, start_surah_number: 4, start_ayah: 24, end_surah_number: 4, end_ayah: 147 },
  { number: 6, start_surah_number: 4, start_ayah: 148, end_surah_number: 5, end_ayah: 81 },
  { number: 7, start_surah_number: 5, start_ayah: 82, end_surah_number: 6, end_ayah: 110 },
  { number: 8, start_surah_number: 6, start_ayah: 111, end_surah_number: 7, end_ayah: 87 },
  { number: 9, start_surah_number: 7, start_ayah: 88, end_surah_number: 8, end_ayah: 40 },
  { number: 10, start_surah_number: 8, start_ayah: 41, end_surah_number: 9, end_ayah: 92 },
  { number: 11, start_surah_number: 9, start_ayah: 93, end_surah_number: 11, end_ayah: 5 },
  { number: 12, start_surah_number: 11, start_ayah: 6, end_surah_number: 12, end_ayah: 52 },
  { number: 13, start_surah_number: 12, start_ayah: 53, end_surah_number: 14, end_ayah: 52 },
  { number: 14, start_surah_number: 15, start_ayah: 1, end_surah_number: 16, end_ayah: 128 },
  { number: 15, start_surah_number: 17, start_ayah: 1, end_surah_number: 18, end_ayah: 74 },
  { number: 16, start_surah_number: 18, start_ayah: 75, end_surah_number: 20, end_ayah: 135 },
  { number: 17, start_surah_number: 21, start_ayah: 1, end_surah_number: 22, end_ayah: 78 },
  { number: 18, start_surah_number: 23, start_ayah: 1, end_surah_number: 25, end_ayah: 20 },
  { number: 19, start_surah_number: 25, start_ayah: 21, end_surah_number: 27, end_ayah: 55 },
  { number: 20, start_surah_number: 27, start_ayah: 56, end_surah_number: 29, end_ayah: 45 },
  { number: 21, start_surah_number: 29, start_ayah: 46, end_surah_number: 33, end_ayah: 30 },
  { number: 22, start_surah_number: 33, start_ayah: 31, end_surah_number: 36, end_ayah: 27 },
  { number: 23, start_surah_number: 36, start_ayah: 28, end_surah_number: 39, end_ayah: 31 },
  { number: 24, start_surah_number: 39, start_ayah: 32, end_surah_number: 41, end_ayah: 46 },
  { number: 25, start_surah_number: 41, start_ayah: 47, end_surah_number: 45, end_ayah: 37 },
  { number: 26, start_surah_number: 46, start_ayah: 1, end_surah_number: 51, end_ayah: 30 },
  { number: 27, start_surah_number: 51, start_ayah: 31, end_surah_number: 57, end_ayah: 29 },
  { number: 28, start_surah_number: 58, start_ayah: 1, end_surah_number: 66, end_ayah: 12 },
  { number: 29, start_surah_number: 67, start_ayah: 1, end_surah_number: 77, end_ayah: 50 },
  { number: 30, start_surah_number: 78, start_ayah: 1, end_surah_number: 114, end_ayah: 6 },
];

const getCache = (key) => {
  const found = cache.get(key);
  if (!found) return null;

  if (Date.now() > found.expiresAt) {
    cache.delete(key);
    return null;
  }

  return found.value;
};

const getCacheAny = (key) => cache.get(key)?.value || null;

const setCache = (key, value) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (url, options = {}) => {
  const { retries = 3 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) {
        return response.json();
      }

      const status = response.status;
      const shouldRetry = status === 429 || status >= 500;

      if (!shouldRetry || attempt === retries) {
        throw new Error(`External API error: ${status}`);
      }

      await wait(350 * 2 ** attempt);
    }
  } finally {
    clearTimeout(timeout);
  }
};

const formatSurahName = (surah, fallback = "Unknown") =>
  surah?.name_arabic || surah?.name || fallback;

const getSurahListForJuz = (juzRange, surahMap) => {
  const startSurah = juzRange.start_surah_number;
  const endSurah = juzRange.end_surah_number;
  if (!startSurah || !endSurah) return [];

  const list = [];
  for (let number = startSurah; number <= endSurah; number += 1) {
    const surah = surahMap.get(number);
    list.push({
      number,
      name: formatSurahName(surah, `Surah ${number}`),
    });
  }
  return list;
};

const getSurahTotalAyat = (surah) =>
  surah?.number_of_verses || surah?.numberOfAyahs || surah?.total_ayat || 0;

const getJuzVerseCount = (juzRange, surahMap) => {
  const {
    start_surah_number: startSurah,
    start_ayah: startAyah,
    end_surah_number: endSurah,
    end_ayah: endAyah,
  } = juzRange;

  if (!startSurah || !startAyah || !endSurah || !endAyah) return null;

  if (startSurah === endSurah) {
    return endAyah - startAyah + 1;
  }

  let total = 0;
  for (let surahNumber = startSurah; surahNumber <= endSurah; surahNumber += 1) {
    const surah = surahMap.get(surahNumber);
    const surahTotal = getSurahTotalAyat(surah);

    if (!surahTotal) return null;

    if (surahNumber === startSurah) {
      total += surahTotal - startAyah + 1;
    } else if (surahNumber === endSurah) {
      total += endAyah;
    } else {
      total += surahTotal;
    }
  }

  return total;
};

router.get(
  "/alquran/surah",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res) => {
    const cached = getCache("surah_list");
    if (cached) {
      return res.json({
        code: 200,
        message: "Daftar surah berhasil dimuat",
        data: cached,
      });
    }

    try {
      const payload = await fetchJson(`${ALQURAN_API_BASE}/surah`);
      const surahs = Array.isArray(payload?.data) ? payload.data : [];

      const data = surahs.map((item) => ({
        number: item.number,
        name_arabic: item.name,
        name_latin: item.englishName,
        name_translation: item.englishNameTranslation,
        revelation_type: item.revelationType,
        number_of_verses: item.numberOfAyahs,
      }));

      setCache("surah_list", data);

      return res.json({
        code: 200,
        message: "Daftar surah berhasil dimuat",
        data,
      });
    } catch (error) {
      const stale = getCacheAny("surah_list");
      if (stale) {
        return res.json({
          code: 200,
          message: "Daftar surah dimuat dari cache",
          data: stale,
        });
      }

      throw error;
    }
  }),
);

router.get(
  "/alquran/juz",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const cached = getCache("juz_list");
    if (cached) {
      return res.json({
        code: 200,
        message: "Daftar juz berhasil dimuat",
        data: cached,
      });
    }

    try {
      let surahRows = getCache("surah_list") || [];
      if (!surahRows.length) {
        try {
          const surahPayload = await fetchJson(`${ALQURAN_API_BASE}/surah`, {
            retries: 2,
          });
          surahRows = Array.isArray(surahPayload?.data) ? surahPayload.data : [];
          if (surahRows.length) {
            setCache(
              "surah_list",
              surahRows.map((item) => ({
                number: item.number,
                name_arabic: item.name,
                name_latin: item.englishName,
                name_translation: item.englishNameTranslation,
                revelation_type: item.revelationType,
                number_of_verses: item.numberOfAyahs,
              })),
            );
          }
        } catch {
          surahRows = [];
        }
      }

      const surahMap = new Map(surahRows.map((item) => [item.number, item]));
      const hasJuzLineCount = await hasColumn(pool, "t_juz", "line_count");
      const juzLineSelect = hasJuzLineCount ? "line_count" : "NULL::integer AS line_count";
      const dbJuz = await pool.query(
        `SELECT number, ${juzLineSelect}
         FROM t_juz`,
      );
      const lineMap = new Map(dbJuz.rows.map((row) => [row.number, row.line_count]));

      const data = JUZ_RANGES.map((item) => ({
        ...item,
        verse_count: getJuzVerseCount(item, surahMap),
        line_count: lineMap.get(item.number) ?? null,
        surah_list: getSurahListForJuz(item, surahMap),
        start_surah_name: formatSurahName(
          surahMap.get(item.start_surah_number),
          `Surah ${item.start_surah_number}`,
        ),
        end_surah_name: formatSurahName(
          surahMap.get(item.end_surah_number),
          `Surah ${item.end_surah_number}`,
        ),
      }));

      setCache("juz_list", data);

      return res.json({
        code: 200,
        message: "Daftar juz berhasil dimuat",
        data,
      });
    } catch (error) {
      const stale = getCacheAny("juz_list");
      if (stale) {
        return res.json({
          code: 200,
          message: "Daftar juz dimuat dari cache",
          data: stale,
        });
      }

      throw error;
    }
  }),
);

router.put(
  "/alquran/juz/:number/line-count",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const juzNumber = Number.parseInt(req.params.number, 10);
    const lineCount = Number.parseInt(req.body.line_count, 10);

    if (Number.isNaN(juzNumber) || juzNumber < 1 || juzNumber > 30) {
      return res.status(400).json({ message: "Nomor juz tidak valid." });
    }

    if (Number.isNaN(lineCount) || lineCount < 0) {
      return res.status(400).json({ message: "Jumlah baris harus berupa angka >= 0." });
    }

    await client.query(
      `INSERT INTO t_juz (number, line_count)
       VALUES ($1, $2)
       ON CONFLICT (number)
       DO UPDATE SET line_count = EXCLUDED.line_count`,
      [juzNumber, lineCount],
    );

    cache.delete("juz_list");

    return res.json({
      code: 200,
      message: "Jumlah baris juz berhasil diperbarui.",
    });
  }),
);

export default router;
