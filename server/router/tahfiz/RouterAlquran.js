import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const ALQURAN_API_BASE = "https://api.alquran.cloud/v1";
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 jam
const cache = new Map();
const DEFAULT_AUDIO_EDITION = "ar.alafasy";
const DEFAULT_AUDIO_BITRATE = 128;

const hasColumn = async (db, tableName, columnName) => {
  const result = await db.query(
     `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'tahfiz'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName],
  );

  return result.rows.length > 0;
};

const getCache = (key) => {
  const found = cache.get(key);
  if (!found) return null;

  if (Date.now() > found.expiresAt) {
    cache.delete(key);
    return null;
  }

  return found.value;
};

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

const getVerseCount = (range, totalAyat) => {
  if (!range?.start_ayat || !range?.end_ayat) return 0;
  if (!totalAyat || totalAyat < 1) return 0;
  const start = Math.max(1, range.start_ayat);
  const end = Math.min(totalAyat, range.end_ayat);
  return end >= start ? end - start + 1 : 0;
};

const normalizeAudioEdition = (value) => {
  if (typeof value !== "string") return DEFAULT_AUDIO_EDITION;
  const trimmed = value.trim();
  return trimmed || DEFAULT_AUDIO_EDITION;
};

const normalizeBitrate = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_AUDIO_BITRATE;
  return parsed;
};

const buildAudioUrl = (ayahGlobalNumber, edition, bitrate) =>
  `https://cdn.islamic.network/quran/audio/${bitrate}/${edition}/${ayahGlobalNumber}.mp3`;

const ensureQuranColumns = async (client) => {
  await client.query(`
    ALTER TABLE tahfiz.t_surah
    ADD COLUMN IF NOT EXISTS name_arabic varchar(100),
    ADD COLUMN IF NOT EXISTS name_translation varchar(100),
    ADD COLUMN IF NOT EXISTS revelation_type varchar(30)
  `);

  await client.query(`
    ALTER TABLE tahfiz.t_ayah
    ADD COLUMN IF NOT EXISTS audio_url text,
    ADD COLUMN IF NOT EXISTS audio_path text
  `);
};

const getAudioConfig = (req) => ({
  edition: normalizeAudioEdition(req.query?.audio_edition),
  bitrate: normalizeBitrate(req.query?.audio_bitrate),
});

router.post(
  "/alquran/sync",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const audioEdition = normalizeAudioEdition(req.body?.audio_edition);
    const audioBitrate = normalizeBitrate(req.body?.audio_bitrate);

    await ensureQuranColumns(client);

    const payload = await fetchJson(`${ALQURAN_API_BASE}/quran/quran-uthmani`, {
      retries: 2,
    });
    const surahs = Array.isArray(payload?.data?.surahs) ? payload.data.surahs : [];

    if (!surahs.length) {
      return res.status(502).json({ message: "Data Al-Quran dari API tidak valid." });
    }

    for (let juzNumber = 1; juzNumber <= 30; juzNumber += 1) {
      await client.query(
        `INSERT INTO tahfiz.t_juz(number)
         VALUES ($1)
         ON CONFLICT (number) DO NOTHING`,
        [juzNumber],
      );
    }

    for (const surah of surahs) {
      const totalAyat = Array.isArray(surah.ayahs) ? surah.ayahs.length : 0;
      if (totalAyat <= 0) {
        throw new Error(`Surah ${surah.number} tidak punya ayat valid.`);
      }

      await client.query(
        `INSERT INTO tahfiz.t_surah(number, name_latin, total_ayat, name_arabic, name_translation, revelation_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (number) DO UPDATE
         SET name_latin = EXCLUDED.name_latin,
             total_ayat = EXCLUDED.total_ayat,
             name_arabic = EXCLUDED.name_arabic,
             name_translation = EXCLUDED.name_translation,
             revelation_type = EXCLUDED.revelation_type`,
        [
          surah.number,
          surah.englishName || `Surah ${surah.number}`,
          totalAyat,
          surah.name || null,
          surah.englishNameTranslation || null,
          surah.revelationType || null,
        ],
      );
    }

    const surahResult = await client.query(`SELECT id, number FROM tahfiz.t_surah`);
    const surahIdMap = new Map(surahResult.rows.map((row) => [row.number, row.id]));
    const juzResult = await client.query(`SELECT id, number FROM tahfiz.t_juz`);
    const juzIdMap = new Map(juzResult.rows.map((row) => [row.number, row.id]));

    let totalAyah = 0;
    for (const surah of surahs) {
      const surahId = surahIdMap.get(surah.number);
      const ayahs = Array.isArray(surah.ayahs) ? surah.ayahs : [];

      if (!surahId) {
        throw new Error(`Surah ${surah.number} tidak ditemukan setelah upsert.`);
      }

      for (const ayah of ayahs) {
        const juzNumber = Number.parseInt(ayah.juz, 10);
        const juzId = juzIdMap.get(juzNumber);

        if (!juzId) {
          throw new Error(`Juz ${juzNumber} tidak ditemukan saat sinkronisasi ayat.`);
        }

        const ayahGlobalNumber = Number.parseInt(ayah.number, 10);
        const ayahNumber = Number.parseInt(ayah.numberInSurah, 10);

        await client.query(
          `INSERT INTO tahfiz.t_ayah(
              surah_id, juz_id, ayah_number, ayah_global_number, text_arabic, page_number, hizb_quarter, audio_url
           )
           VALUES($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (surah_id, ayah_number) DO UPDATE
           SET juz_id = EXCLUDED.juz_id,
               ayah_global_number = EXCLUDED.ayah_global_number,
               text_arabic = EXCLUDED.text_arabic,
               page_number = EXCLUDED.page_number,
               hizb_quarter = EXCLUDED.hizb_quarter,
               audio_url = EXCLUDED.audio_url`,
          [
            surahId,
            juzId,
            ayahNumber,
            ayahGlobalNumber,
            ayah.text || "",
            Number.parseInt(ayah.page, 10) || null,
            Number.parseInt(ayah.hizbQuarter, 10) || null,
            buildAudioUrl(ayahGlobalNumber, audioEdition, audioBitrate),
          ],
        );

        totalAyah += 1;
      }
    }

    cache.delete("surah_list");
    cache.delete("juz_list");

    return res.json({
      code: 200,
      message: "Sinkronisasi Al-Quran ke database lokal berhasil.",
      data: {
        surah_count: surahs.length,
        ayah_count: totalAyah,
        audio_edition: audioEdition,
        audio_bitrate: audioBitrate,
      },
    });
  }),
);

router.get(
  "/alquran/surah",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const cached = getCache("surah_list");
    if (cached) {
      return res.json({
        code: 200,
        message: "Daftar surah berhasil dimuat",
        data: cached,
      });
    }

    const hasNameArabic = await hasColumn(pool, "t_surah", "name_arabic");
    const hasNameTranslation = await hasColumn(pool, "t_surah", "name_translation");
    const hasRevelationType = await hasColumn(pool, "t_surah", "revelation_type");

    const query = `
      SELECT
        number,
        ${hasNameArabic ? "name_arabic" : "NULL::varchar AS name_arabic"},
        name_latin,
        ${hasNameTranslation ? "name_translation" : "NULL::varchar AS name_translation"},
        ${hasRevelationType ? "revelation_type" : "NULL::varchar AS revelation_type"},
        total_ayat AS number_of_verses
      FROM tahfiz.t_surah
      ORDER BY number
    `;
    const result = await pool.query(query);
    const data = result.rows;
    setCache("surah_list", data);

    return res.json({
      code: 200,
      message: "Daftar surah berhasil dimuat",
      data,
    });
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

    const hasJuzLineCount = await hasColumn(pool, "t_juz", "line_count");
    const juzLineSelect = hasJuzLineCount ? "j.line_count" : "NULL::integer AS line_count";
    const detailsQuery = await pool.query(
      `
      SELECT
        j.id AS juz_id,
        j.number AS juz_number,
        ${juzLineSelect},
        jd.start_ayat,
        jd.end_ayat,
        s.number AS surah_number,
        COALESCE(s.name_arabic, s.name_latin, 'Surah ' || s.number::text) AS surah_name,
        s.total_ayat
      FROM tahfiz.t_juz j
      LEFT JOIN tahfiz.t_juz_detail jd ON jd.juz_id = j.id
      LEFT JOIN tahfiz.t_surah s ON s.id = jd.surah_id
      ORDER BY j.number, s.number, jd.start_ayat
      `,
    );

    const grouped = new Map();
    for (const row of detailsQuery.rows) {
      if (!grouped.has(row.juz_number)) {
        grouped.set(row.juz_number, {
          number: row.juz_number,
          line_count: row.line_count ?? null,
          start_surah_number: null,
          start_ayah: null,
          end_surah_number: null,
          end_ayah: null,
          start_surah_name: null,
          end_surah_name: null,
          verse_count: 0,
          surah_list: [],
          _surahSet: new Set(),
        });
      }

      const item = grouped.get(row.juz_number);
      if (!row.surah_number) continue;

      if (item.start_surah_number === null) {
        item.start_surah_number = row.surah_number;
        item.start_ayah = row.start_ayat;
        item.start_surah_name = row.surah_name;
      }

      item.end_surah_number = row.surah_number;
      item.end_ayah = row.end_ayat;
      item.end_surah_name = row.surah_name;
      item.verse_count += getVerseCount(row, row.total_ayat);

      if (!item._surahSet.has(row.surah_number)) {
        item._surahSet.add(row.surah_number);
        item.surah_list.push({
          number: row.surah_number,
          name: row.surah_name,
        });
      }
    }

    const data = Array.from(grouped.values())
      .sort((a, b) => a.number - b.number)
      .map((item) => {
        delete item._surahSet;
        return item;
      });

    setCache("juz_list", data);

    return res.json({
      code: 200,
      message: "Daftar juz berhasil dimuat",
      data,
    });
  }),
);

router.get(
  "/alquran/surah/:number/ayah",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const surahNumber = Number.parseInt(req.params.number, 10);
    if (Number.isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      return res.status(400).json({ message: "Nomor surah tidak valid." });
    }

    const { edition, bitrate } = getAudioConfig(req);

    const result = await pool.query(
      `
      SELECT
        s.number AS surah_number,
        COALESCE(s.name_arabic, s.name_latin, 'Surah ' || s.number::text) AS surah_name,
        a.ayah_number,
        a.ayah_global_number,
        a.text_arabic,
        a.page_number,
        a.hizb_quarter,
        j.number AS juz_number
      FROM tahfiz.t_ayah a
      JOIN tahfiz.t_surah s ON s.id = a.surah_id
      JOIN tahfiz.t_juz j ON j.id = a.juz_id
      WHERE s.number = $1
      ORDER BY a.ayah_number
      `,
      [surahNumber],
    );

    const data = result.rows.map((row) => ({
      ...row,
      audio_url: buildAudioUrl(row.ayah_global_number, edition, bitrate),
      audio_source: "api",
    }));

    return res.json({
      code: 200,
      message: "Daftar ayat surah berhasil dimuat",
      data,
    });
  }),
);

router.get(
  "/alquran/juz/:number/ayah",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const juzNumber = Number.parseInt(req.params.number, 10);
    if (Number.isNaN(juzNumber) || juzNumber < 1 || juzNumber > 30) {
      return res.status(400).json({ message: "Nomor juz tidak valid." });
    }

    const { edition, bitrate } = getAudioConfig(req);

    const result = await pool.query(
      `
      SELECT
        j.number AS juz_number,
        s.number AS surah_number,
        COALESCE(s.name_arabic, s.name_latin, 'Surah ' || s.number::text) AS surah_name,
        a.ayah_number,
        a.ayah_global_number,
        a.text_arabic,
        a.page_number,
        a.hizb_quarter
      FROM tahfiz.t_ayah a
      JOIN tahfiz.t_surah s ON s.id = a.surah_id
      JOIN tahfiz.t_juz j ON j.id = a.juz_id
      WHERE j.number = $1
      ORDER BY s.number, a.ayah_number
      `,
      [juzNumber],
    );

    const data = result.rows.map((row) => ({
      ...row,
      audio_url: buildAudioUrl(row.ayah_global_number, edition, bitrate),
      audio_source: "api",
    }));

    return res.json({
      code: 200,
      message: "Daftar ayat juz berhasil dimuat",
      data,
    });
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
      `INSERT INTO tahfiz.t_juz (number, line_count)
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
