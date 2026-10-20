import fs from "fs";
import path from "path";
import pool from "../../../config/connection.js";
import { ensureDir, safeUnlink } from "../../../utils/helper.js";

const SCHEMA_PATH = path.join(process.cwd(), "database", "tu_schema.sql");

let ensurePromise = null;

export const ensureTuSchema = async () => {
  if (!ensurePromise) {
    const sql = fs.readFileSync(SCHEMA_PATH, "utf8");
    ensurePromise = pool.query(sql).catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
};

export const clip = (value, max = 300) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

export const toInt = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

export const toDate = (value) => {
  const text = clip(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

export const formatDate = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
};

export const predicateFromScore = (score) => {
  if (score === null || score === undefined || score === "") return null;
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  if (value >= 90) return "A";
  if (value >= 80) return "B";
  if (value >= 70) return "C";
  return "D";
};

export const genderLabel = (value) => {
  const text = clip(value, 20).toLowerCase();
  if (["l", "laki-laki", "laki", "male", "m"].includes(text)) return "Laki-laki";
  if (["p", "perempuan", "female", "f"].includes(text)) return "Perempuan";
  return clip(value, 30);
};

export const academicStartYear = (periodeName) => {
  const match = String(periodeName || "").match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
};

export const semesterBounds = (startYear, semester) => {
  if (!startYear) return null;
  if (semester === 1) {
    return [`${startYear}-07-01`, `${startYear}-12-31`];
  }
  if (semester === 2) {
    return [`${startYear + 1}-01-01`, `${startYear + 1}-06-30`];
  }
  return null;
};

const ROMAN_MONTHS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

export const formatLetterNo = (sequence, direction, letterDate) => {
  const parsed = letterDate ? new Date(`${letterDate}T00:00:00`) : new Date();
  const when = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const code = direction === "masuk" ? "SM" : "SK";
  const serial = String(sequence).padStart(3, "0");
  return `${serial}/${code}/${ROMAN_MONTHS[when.getMonth()]}/${when.getFullYear()}`;
};

export const sanitizeProfile = (value, depth = 0) => {
  if (depth > 6) return "";
  if (Array.isArray(value)) {
    return value.slice(0, 24).map((item) => sanitizeProfile(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const next = {};
    Object.entries(value).forEach(([key, item]) => {
      if (!/^[a-z0-9_]{1,40}$/i.test(key)) return;
      next[key] = sanitizeProfile(item, depth + 1);
    });
    return next;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return "";
  return clip(value, 500);
};

export const isUniqueViolation = (error) => error?.code === "23505";

export const uniqueMessage = (error) => {
  const name = String(error?.constraint || "");
  if (name.includes("register")) {
    return "Nomor urut sudah dipakai pada angkatan ini.";
  }
  if (name.includes("diploma_no")) return "Nomor ijazah sudah digunakan.";
  if (name.includes("letter")) return "Nomor surat sudah digunakan.";
  if (name.includes("facility")) return "Kode barang sudah digunakan.";
  if (name.includes("alumni")) return "Siswa ini sudah ada di data alumni.";
  if (name.includes("diploma_student")) {
    return "Ijazah jenis ini sudah ada untuk siswa tersebut.";
  }
  if (name.includes("score")) return "Nilai untuk mata pelajaran ini sudah ada.";
  return "Data bentrok dengan catatan yang sudah ada.";
};

export const getTuDir = (homebaseId) =>
  path.join(process.cwd(), "server", "assets", "tu", String(homebaseId));

export const toTuAssetUrl = (homebaseId, filename) =>
  `/assets/tu/${homebaseId}/${filename}`;

export const discardTuFile = (homebaseId, assetUrl) => {
  if (!assetUrl || typeof assetUrl !== "string") return;
  const prefix = `/assets/tu/${homebaseId}/`;
  if (!assetUrl.startsWith(prefix)) return;
  const filename = path.basename(assetUrl);
  safeUnlink(path.join(getTuDir(homebaseId), filename));
};

export const prepareTuDir = (homebaseId) => {
  const dir = getTuDir(homebaseId);
  ensureDir(dir);
  return dir;
};

const CURRENT_CLASS_JOIN = `
  LEFT JOIN LATERAL (
    SELECT c.name AS class_name, g.name AS grade_name
    FROM u_class_enrollments e
    JOIN a_class c ON c.id = e.class_id
    LEFT JOIN a_grade g ON g.id = c.grade_id
    JOIN a_periode p ON p.id = e.periode_id
    WHERE e.student_id = s.user_id
      AND p.homebase_id = s.homebase_id
    ORDER BY p.is_active DESC, p.id DESC
    LIMIT 1
  ) cls ON true
`;

export const findStudent = async (client, homebaseId, studentId) => {
  const result = await client.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.gender,
        u.is_active,
        s.nis,
        s.nisn,
        cls.class_name,
        cls.grade_name
      FROM u_students s
      JOIN u_users u ON u.id = s.user_id
      ${CURRENT_CLASS_JOIN}
      WHERE s.user_id = $1
        AND s.homebase_id = $2
        AND u.role = 'student'
      LIMIT 1
    `,
    [studentId, homebaseId],
  );
  return result.rows[0] || null;
};

export const ensureBuku = async (client, homebaseId, studentId, entryYear = null) => {
  const existing = await client.query(
    `
      SELECT *
      FROM tu_buku_induk
      WHERE homebase_id = $1 AND student_id = $2
      LIMIT 1
    `,
    [homebaseId, studentId],
  );
  if (existing.rowCount > 0) return existing.rows[0];

  const created = await client.query(
    `
      INSERT INTO tu_buku_induk (homebase_id, student_id, entry_year)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [homebaseId, studentId, entryYear],
  );
  return created.rows[0];
};

export const setStudentStatus = async (client, bukuId, studentId, status) => {
  await client.query(
    `
      UPDATE tu_buku_induk
      SET student_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [bukuId, status],
  );
  await client.query(
    `
      UPDATE u_users
      SET is_active = $2
      WHERE id = $1 AND role = 'student'
    `,
    [studentId, status === "aktif"],
  );
};

export const recomputeStudentStatus = async (client, homebaseId, studentId) => {
  const buku = await ensureBuku(client, homebaseId, studentId);
  const [alumni, latest] = await Promise.all([
    client.query(
      `SELECT 1 FROM tu_alumni WHERE homebase_id = $1 AND student_id = $2 LIMIT 1`,
      [homebaseId, studentId],
    ),
    client.query(
      `
        SELECT direction
        FROM tu_mutation
        WHERE homebase_id = $1 AND student_id = $2
        ORDER BY mutation_date DESC NULLS LAST, id DESC
        LIMIT 1
      `,
      [homebaseId, studentId],
    ),
  ]);

  let status = "aktif";
  if (alumni.rowCount > 0) status = "lulus";
  else if (latest.rows[0]?.direction === "keluar") status = "pindah";

  await setStudentStatus(client, buku.id, studentId, status);
  return status;
};

const readProfile = (buku) =>
  buku?.profile && typeof buku.profile === "object" && !Array.isArray(buku.profile)
    ? { ...buku.profile }
    : {};

export const mirrorRecordsIntoProfile = async (
  client,
  homebaseId,
  studentId,
  scope,
  kind,
) => {
  const buku = await ensureBuku(client, homebaseId, studentId);
  const profile = readProfile(buku);

  const [masuk, keluar, alumni, diplomas] = await Promise.all([
    client.query(
      `
        SELECT *
        FROM tu_mutation
        WHERE homebase_id = $1 AND student_id = $2 AND direction = 'masuk'
        ORDER BY mutation_date DESC NULLS LAST, id DESC
        LIMIT 1
      `,
      [homebaseId, studentId],
    ),
    client.query(
      `
        SELECT *
        FROM tu_mutation
        WHERE homebase_id = $1 AND student_id = $2 AND direction = 'keluar'
        ORDER BY mutation_date DESC NULLS LAST, id DESC
        LIMIT 1
      `,
      [homebaseId, studentId],
    ),
    client.query(
      `
        SELECT *
        FROM tu_alumni
        WHERE homebase_id = $1 AND student_id = $2
        LIMIT 1
      `,
      [homebaseId, studentId],
    ),
    client.query(
      `
        SELECT *
        FROM tu_diploma
        WHERE homebase_id = $1 AND student_id = $2
      `,
      [homebaseId, studentId],
    ),
  ]);

  if (scope === "mutation") {
    const rowIn = masuk.rows[0];
    profile.transfer_in = rowIn
      ? {
          school: rowIn.school_name || "",
          date: formatDate(rowIn.mutation_date),
          class_name: rowIn.class_name || "",
          reason: rowIn.reason || "",
        }
      : { school: "", date: "", class_name: "", reason: "" };
    const rowOut = keluar.rows[0];
    profile.transfer_out = rowOut
      ? {
          school: rowOut.school_name || "",
          date: formatDate(rowOut.mutation_date),
          class_name: rowOut.class_name || "",
          reason: rowOut.reason || "",
        }
      : { school: "", date: "", class_name: "", reason: "" };
  }

  if (scope === "alumni") {
    const row = alumni.rows[0];
    profile.after = row
      ? {
          continue_to: row.continue_to || "",
          major: row.major_name || "",
          workplace: row.workplace || "",
          income: row.income || "",
        }
      : { continue_to: "", major: "", workplace: "", income: "" };
  }

  if (scope === "diploma") {
    const asal = diplomas.rows.find((row) => row.kind === "asal");
    const terbit = diplomas.rows.find((row) => row.kind === "terbit");
    if (!kind || kind === "asal") {
      profile.prior_education = {
        ...(profile.prior_education || {}),
        school: asal?.school_name || profile.prior_education?.school || "",
        diploma_date: asal ? formatDate(asal.diploma_date) : "",
        diploma_no: asal?.diploma_no || "",
        skhun_no: asal?.skhun_no || "",
        exam_no: asal?.exam_no || "",
      };
    }
    if (!kind || kind === "terbit") {
      profile.graduation = terbit
        ? {
            date: formatDate(terbit.diploma_date),
            diploma_no: terbit.diploma_no || "",
            exam_no: terbit.exam_no || "",
          }
        : { date: "", diploma_no: "", exam_no: "" };
    }
  }

  await client.query(
    `
      UPDATE tu_buku_induk
      SET profile = $2::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [buku.id, JSON.stringify(profile)],
  );
};

export const loadBukuBundle = async (client, homebaseId, bukuId) => {
  const bukuResult = await client.query(
    `
      SELECT b.*, h.name AS homebase_name
      FROM tu_buku_induk b
      JOIN a_homebase h ON h.id = b.homebase_id
      WHERE b.id = $1 AND b.homebase_id = $2
      LIMIT 1
    `,
    [bukuId, homebaseId],
  );
  const buku = bukuResult.rows[0];
  if (!buku) return null;

  const student = await findStudent(client, homebaseId, buku.student_id);
  const [scores, attendance, decisions] = await Promise.all([
    client.query(
      `
        SELECT *
        FROM tu_buku_score
        WHERE buku_id = $1
        ORDER BY periode_id NULLS LAST, semester, sort_order, lower(subject_name)
      `,
      [buku.id],
    ),
    client.query(
      `
        SELECT a.*, p.name AS periode_name
        FROM tu_buku_attendance a
        JOIN a_periode p ON p.id = a.periode_id
        WHERE a.buku_id = $1
        ORDER BY a.periode_id, a.semester
      `,
      [buku.id],
    ),
    client.query(
      `
        SELECT d.*, p.name AS periode_name
        FROM tu_buku_decision d
        JOIN a_periode p ON p.id = d.periode_id
        WHERE d.buku_id = $1
        ORDER BY d.periode_id
      `,
      [buku.id],
    ),
  ]);

  return {
    homebase_name: buku.homebase_name,
    student,
    buku: {
      id: buku.id,
      student_id: buku.student_id,
      register_no: buku.register_no,
      entry_year: buku.entry_year,
      student_status: buku.student_status,
      profile: readProfile(buku),
      updated_at: buku.updated_at,
    },
    scores: scores.rows.map((row) => ({
      ...row,
      score_lms: row.score_lms === null ? null : Number(row.score_lms),
      score_override:
        row.score_override === null ? null : Number(row.score_override),
    })),
    attendance: attendance.rows,
    decisions: decisions.rows,
  };
};

export const columnSet = async (client, schema, table) => {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
    `,
    [schema, table],
  );
  return new Set(result.rows.map((row) => row.column_name));
};

export { CURRENT_CLASS_JOIN };
