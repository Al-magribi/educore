import path from "path";
import { Router } from "express";
import multer from "multer";
import XLSX from "xlsx";
import { withQuery, withTransaction } from "../../../utils/wrapper.js";
import {
  CURRENT_CLASS_JOIN,
  academicStartYear,
  clip,
  columnSet,
  discardTuFile,
  ensureBuku,
  findStudent,
  genderLabel,
  isUniqueViolation,
  loadBukuBundle,
  predicateFromScore,
  prepareTuDir,
  sanitizeProfile,
  semesterBounds,
  setStudentStatus,
  toInt,
  toTuAssetUrl,
  uniqueMessage,
} from "./shared.js";

const router = Router();

const imageUploader = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      callback(null, prepareTuDir(req.user.homebase_id));
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase();
      callback(null, `foto-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    const allowed = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    };
    if (allowed[extension] === mime) return callback(null, true);
    return callback(new Error("Foto harus PNG, JPG, atau WEBP."));
  },
});

const uploadPhoto = (req, res, next) => {
  imageUploader.single("file")(req, res, (error) => {
    if (!error) return next();
    const message =
      error?.code === "LIMIT_FILE_SIZE"
        ? "Ukuran foto melebihi 2 MB."
        : error?.message || "Upload foto gagal.";
    return res.status(400).json({ status: "error", message });
  });
};

const mergeStoredProfile = (base, incoming) => {
  if (Array.isArray(incoming)) return incoming;
  if (incoming && typeof incoming === "object") {
    const next =
      base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};
    Object.entries(incoming).forEach(([key, value]) => {
      next[key] = mergeStoredProfile(next[key], value);
    });
    return next;
  }
  return incoming;
};

const profileValue = (profile, pathNames) => {
  let current = profile || {};
  for (const key of pathNames) {
    if (!current || typeof current !== "object") return "";
    current = current[key];
  }
  return current ?? "";
};

const listFilters = (query, homebaseId) => {
  const params = [homebaseId];
  const where = ["s.homebase_id = $1", "u.role = 'student'"];
  const search = clip(query.search, 80);
  const entryYear = toInt(query.entry_year);
  const status = clip(query.status, 20);

  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(u.full_name ILIKE $${params.length} OR COALESCE(s.nis, '') ILIKE $${params.length} OR COALESCE(s.nisn, '') ILIKE $${params.length})`,
    );
  }
  if (entryYear) {
    params.push(entryYear);
    where.push(`b.entry_year = $${params.length}`);
  }
  if (["aktif", "pindah", "lulus", "keluar"].includes(status)) {
    params.push(status);
    where.push(`COALESCE(b.student_status, 'aktif') = $${params.length}`);
  }

  return { params, where: where.join(" AND ") };
};

const studentSelect = `
  SELECT
    u.id AS student_id,
    u.full_name,
    u.gender,
    u.is_active,
    s.nis,
    s.nisn,
    b.id AS buku_id,
    b.register_no,
    b.entry_year,
    COALESCE(b.student_status, 'aktif') AS student_status,
    b.updated_at,
    cls.class_name,
    cls.grade_name
  FROM u_students s
  JOIN u_users u ON u.id = s.user_id
  LEFT JOIN tu_buku_induk b
    ON b.student_id = s.user_id AND b.homebase_id = s.homebase_id
  ${CURRENT_CLASS_JOIN}
`;

router.get(
  "/tu/meta",
  withQuery(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const [periodes, subjects, grades, homebase] = await Promise.all([
      client.query(
        `
          SELECT id, name, is_active
          FROM a_periode
          WHERE homebase_id = $1
          ORDER BY id DESC
        `,
        [homebaseId],
      ),
      client.query(
        `
          SELECT s.id, s.name, s.kkm, c.name AS category_name
          FROM a_subject s
          LEFT JOIN a_subject_category c ON c.id = s.category_id
          WHERE s.homebase_id = $1
          ORDER BY lower(s.name)
        `,
        [homebaseId],
      ),
      client.query(
        `
          SELECT id, name
          FROM a_grade
          WHERE homebase_id = $1
          ORDER BY id
        `,
        [homebaseId],
      ),
      client.query(`SELECT name FROM a_homebase WHERE id = $1`, [homebaseId]),
    ]);

    return res.json({
      status: "success",
      data: {
        homebase_name: homebase.rows[0]?.name || "",
        periodes: periodes.rows,
        subjects: subjects.rows,
        grades: grades.rows,
      },
    });
  }),
);

router.get(
  "/tu/students",
  withQuery(async (req, res, client) => {
    const search = clip(req.query.search, 80);
    const params = [req.user.homebase_id];
    let filter = "";
    if (search) {
      params.push(`%${search}%`);
      filter = `AND (u.full_name ILIKE $2 OR COALESCE(s.nis, '') ILIKE $2 OR COALESCE(s.nisn, '') ILIKE $2)`;
    }
    const result = await client.query(
      `
        SELECT u.id, u.full_name, s.nis, s.nisn, cls.class_name
        FROM u_students s
        JOIN u_users u ON u.id = s.user_id
        ${CURRENT_CLASS_JOIN}
        WHERE s.homebase_id = $1
          AND u.role = 'student'
          ${filter}
        ORDER BY lower(u.full_name)
        LIMIT 40
      `,
      params,
    );
    return res.json({ status: "success", data: result.rows });
  }),
);

router.get(
  "/tu/buku-induk",
  withQuery(async (req, res, client) => {
    const { params, where } = listFilters(req.query, req.user.homebase_id);
    const result = await client.query(
      `
        ${studentSelect}
        WHERE ${where}
        ORDER BY b.entry_year DESC NULLS LAST, b.register_no NULLS LAST, lower(u.full_name)
        LIMIT 2000
      `,
      params,
    );
    return res.json({ status: "success", data: result.rows });
  }),
);

router.get(
  "/tu/buku-induk/export",
  withQuery(async (req, res, client) => {
    const { params, where } = listFilters(req.query, req.user.homebase_id);
    const students = await client.query(
      `
        ${studentSelect.replace(
          "b.updated_at,",
          "b.updated_at, b.profile,",
        )}
        WHERE ${where}
        ORDER BY b.entry_year DESC NULLS LAST, b.register_no NULLS LAST, lower(u.full_name)
        LIMIT 2000
      `,
      params,
    );

    const ids = students.rows.map((row) => row.buku_id).filter(Boolean);
    let scores = [];
    let attendance = [];
    if (ids.length) {
      const [scoreResult, attendanceResult] = await Promise.all([
        client.query(
          `
            SELECT sc.*, b.student_id
            FROM tu_buku_score sc
            JOIN tu_buku_induk b ON b.id = sc.buku_id
            WHERE sc.buku_id = ANY($1::int[])
            ORDER BY b.student_id, sc.periode_id, sc.semester, sc.sort_order
          `,
          [ids],
        ),
        client.query(
          `
            SELECT a.*, p.name AS periode_name, b.student_id
            FROM tu_buku_attendance a
            JOIN tu_buku_induk b ON b.id = a.buku_id
            JOIN a_periode p ON p.id = a.periode_id
            WHERE a.buku_id = ANY($1::int[])
            ORDER BY b.student_id, a.periode_id, a.semester
          `,
          [ids],
        ),
      ]);
      scores = scoreResult.rows;
      attendance = attendanceResult.rows;
    }

    const byStudent = new Map(students.rows.map((row) => [row.student_id, row]));
    const identityRows = students.rows.map((row) => {
      const profile = row.profile || {};
      const pick = (...keys) => profileValue(profile, keys);
      return {
        "No Urut": row.register_no ?? "",
        Angkatan: row.entry_year ?? "",
        NIS: row.nis || "",
        NISN: row.nisn || "",
        "Nama Lengkap": row.full_name || "",
        "Nama Panggilan": pick("nickname"),
        "Jenis Kelamin": genderLabel(row.gender),
        "Tempat Lahir": pick("birth_place"),
        "Tanggal Lahir": pick("birth_date"),
        Agama: pick("religion"),
        Kewarganegaraan: pick("citizenship"),
        "Anak Ke": pick("child_order"),
        "Saudara Kandung": pick("sibling_full"),
        "Saudara Tiri": pick("sibling_step"),
        "Saudara Angkat": pick("sibling_adopted"),
        Status: pick("family_status"),
        "Bahasa Sehari-hari": pick("daily_language"),
        Jalan: pick("address", "street"),
        Kecamatan: pick("address", "district"),
        Kabupaten: pick("address", "regency"),
        Provinsi: pick("address", "province"),
        "Kode Pos": pick("address", "postal_code"),
        Telepon: pick("address", "phone"),
        "Tinggal Bersama": pick("living_with"),
        "Tinggi Saat Diterima": pick("health", "height_entry"),
        "Tinggi Saat Meninggalkan": pick("health", "height_leave"),
        "Berat Saat Diterima": pick("health", "weight_entry"),
        "Berat Saat Meninggalkan": pick("health", "weight_leave"),
        "Media Sosial": pick("health", "social_media"),
        Penyakit: pick("health", "illness"),
        "Kelainan Jasmani": pick("health", "physical_note"),
        "Sekolah Asal": pick("prior_education", "school"),
        "Tanggal Ijazah Asal": pick("prior_education", "diploma_date"),
        "No Ijazah Asal": pick("prior_education", "diploma_no"),
        "No SKHUN": pick("prior_education", "skhun_no"),
        "No Peserta Ujian Asal": pick("prior_education", "exam_no"),
        "Diterima di Kelas": pick("accepted", "class_name"),
        "Tanggal Diterima": pick("accepted", "date"),
        "Pindahan Dari": pick("transfer_in", "school"),
        "Tanggal Pindahan": pick("transfer_in", "date"),
        "Kelas Pindahan": pick("transfer_in", "class_name"),
        "Alasan Masuk": pick("transfer_in", "reason"),
        "Nama Ayah": pick("father", "name"),
        "TTL Ayah": [pick("father", "birth_place"), pick("father", "birth_date")]
          .filter(Boolean)
          .join(", "),
        "Pendidikan Ayah": pick("father", "education"),
        "Pekerjaan Ayah": pick("father", "job"),
        "Penghasilan Ayah": pick("father", "income"),
        "Nama Ibu": pick("mother", "name"),
        "TTL Ibu": [pick("mother", "birth_place"), pick("mother", "birth_date")]
          .filter(Boolean)
          .join(", "),
        "Pendidikan Ibu": pick("mother", "education"),
        "Pekerjaan Ibu": pick("mother", "job"),
        "Penghasilan Ibu": pick("mother", "income"),
        "Nama Wali": pick("guardian", "name"),
        "Pekerjaan Wali": pick("guardian", "job"),
        "Melanjutkan Ke": pick("after", "continue_to"),
        Jurusan: pick("after", "major"),
        "Bekerja di": pick("after", "workplace"),
        "Penghasilan Setelah Lulus": pick("after", "income"),
        "Kelas Sekarang": row.class_name || "",
        "Status Siswa": row.student_status,
      };
    });

    const effective = (override, source) =>
      override === null || override === undefined || override === ""
        ? source
        : override;
    const scoreRows = scores.map((row) => {
      const student = byStudent.get(row.student_id);
      const score = effective(row.score_override, row.score_lms);
      const predicate = effective(row.predicate_override, row.predicate_lms);
      return {
        NIS: student?.nis || "",
        Nama: student?.full_name || "",
        Periode: row.periode_name || "",
        Semester: row.semester === 3 ? "US" : row.semester,
        Jenis: row.kind,
        "Mata Pelajaran": row.subject_name,
        Kategori: row.category_name || "",
        "Nilai LMS": row.score_lms ?? "",
        "Predikat LMS": row.predicate_lms || "",
        Koreksi: row.score_override ?? "",
        "Predikat Koreksi": row.predicate_override || "",
        "Nilai Pakai": score ?? "",
        "Predikat Pakai": predicate || "",
        Kelas: row.class_name || "",
        "Wali Kelas": row.homeroom_name || "",
      };
    });
    const attendanceRows = attendance.map((row) => {
      const student = byStudent.get(row.student_id);
      return {
        NIS: student?.nis || "",
        Nama: student?.full_name || "",
        Periode: row.periode_name || "",
        Semester: row.semester,
        Sakit: effective(row.sick_override, row.sick_lms) ?? "",
        Izin: effective(row.permit_override, row.permit_lms) ?? "",
        Alpa: effective(row.absent_override, row.absent_lms) ?? "",
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(identityRows),
      "Data Siswa",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(scoreRows),
      "Nilai",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(attendanceRows),
      "Ketidakhadiran",
    );
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const year = toInt(req.query.entry_year);
    const filename = `buku-induk${year ? `-${year}` : ""}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  }),
);

router.post(
  "/tu/buku-induk/open",
  withTransaction(async (req, res, client) => {
    const studentId = toInt(req.body?.student_id);
    const student = await findStudent(client, req.user.homebase_id, studentId);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Siswa tidak ditemukan di satuan ini.",
      });
    }
    const entryYear = toInt(req.body?.entry_year);
    const buku = await ensureBuku(
      client,
      req.user.homebase_id,
      studentId,
      entryYear && entryYear >= 1900 && entryYear <= 2100 ? entryYear : null,
    );
    return res.json({
      status: "success",
      data: { id: buku.id, student_id: studentId },
    });
  }),
);

router.get(
  "/tu/buku-induk/:id",
  withQuery(async (req, res, client) => {
    const bukuId = toInt(req.params.id);
    const bundle = await loadBukuBundle(client, req.user.homebase_id, bukuId);
    if (!bundle) {
      return res.status(404).json({
        status: "error",
        message: "Buku induk tidak ditemukan.",
      });
    }
    return res.json({ status: "success", data: bundle });
  }),
);

router.put(
  "/tu/buku-induk/:id",
  withTransaction(async (req, res, client) => {
    const bukuId = toInt(req.params.id);
    const current = await client.query(
      `SELECT * FROM tu_buku_induk WHERE id = $1 AND homebase_id = $2`,
      [bukuId, req.user.homebase_id],
    );
    if (current.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Buku induk tidak ditemukan.",
      });
    }

    const registerNo = toInt(req.body?.register_no);
    const entryYear = toInt(req.body?.entry_year);
    const status = clip(req.body?.student_status, 20);
    const allowedStatus = ["aktif", "pindah", "lulus", "keluar"];
    if (registerNo !== null && (registerNo < 1 || registerNo > 100000)) {
      return res.status(400).json({
        status: "error",
        message: "Nomor urut tidak valid.",
      });
    }
    if (entryYear !== null && (entryYear < 1900 || entryYear > 2100)) {
      return res.status(400).json({
        status: "error",
        message: "Tahun masuk tidak valid.",
      });
    }
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Status siswa tidak valid.",
      });
    }

    const previous = current.rows[0].profile || {};
    const incoming = sanitizeProfile(req.body?.profile || {});
    const merged = mergeStoredProfile(previous, incoming);
    const profile = {
      ...merged,
      photo_entry: previous.photo_entry || incoming.photo_entry || "",
      photo_leave: previous.photo_leave || incoming.photo_leave || "",
    };

    try {
      await client.query(
        `
          UPDATE tu_buku_induk
          SET register_no = $2,
              entry_year = $3,
              student_status = COALESCE($4, student_status),
              profile = $5::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          bukuId,
          registerNo,
          entryYear,
          status || null,
          JSON.stringify(profile),
        ],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ status: "error", message: uniqueMessage(error) });
      }
      throw error;
    }

    if (status) {
      await setStudentStatus(
        client,
        bukuId,
        current.rows[0].student_id,
        status,
      );
    }

    return res.json({
      status: "success",
      message: "Buku induk disimpan.",
    });
  }),
);

router.post(
  "/tu/buku-induk/:id/photo",
  uploadPhoto,
  withTransaction(async (req, res, client) => {
    const bukuId = toInt(req.params.id);
    const slot = req.body?.slot === "leave" ? "leave" : "entry";
    const column = slot === "leave" ? "photo_leave" : "photo_entry";
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "File foto kosong." });
    }

    const current = await client.query(
      `SELECT id, profile FROM tu_buku_induk WHERE id = $1 AND homebase_id = $2`,
      [bukuId, req.user.homebase_id],
    );
    if (current.rowCount === 0) {
      discardTuFile(req.user.homebase_id, toTuAssetUrl(req.user.homebase_id, req.file.filename));
      return res.status(404).json({
        status: "error",
        message: "Buku induk tidak ditemukan.",
      });
    }

    const profile = { ...(current.rows[0].profile || {}) };
    const nextUrl = toTuAssetUrl(req.user.homebase_id, req.file.filename);
    const previousUrl = profile[column];
    profile[column] = nextUrl;
    await client.query(
      `
        UPDATE tu_buku_induk
        SET profile = $2::jsonb, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [bukuId, JSON.stringify(profile)],
    );
    if (previousUrl && previousUrl !== nextUrl) {
      discardTuFile(req.user.homebase_id, previousUrl);
    }
    return res.json({
      status: "success",
      message: "Foto buku induk disimpan.",
      data: { [column]: nextUrl },
    });
  }),
);

const pullScores = async (client, homebaseId, studentId) => {
  const schemas = ["lms", "public"];
  let located = null;
  for (const schema of schemas) {
    const columns = await columnSet(client, schema, "l_score_final");
    if (columns.size > 0) {
      located = { schema, columns };
      break;
    }
  }
  if (!located || !located.columns.has("final_grade") || !located.columns.has("subject_id")) {
    return [];
  }

  const semesterExpr = located.columns.has("semester") ? "sf.semester" : "1";
  const classExpr = located.columns.has("class_id") ? "sf.class_id" : "NULL::integer";
  const result = await client.query(
    `
      SELECT DISTINCT ON (periode_id, semester, subject_id)
        id,
        periode_id,
        periode_name,
        semester,
        subject_id,
        final_grade,
        class_id,
        subject_name,
        category_name,
        class_name,
        homeroom_name
      FROM (
        SELECT
          sf.id,
          sf.periode_id,
          p.name AS periode_name,
          ${semesterExpr} AS semester,
          sf.subject_id,
          sf.final_grade,
          ${classExpr} AS class_id,
          sub.name AS subject_name,
          cat.name AS category_name,
          c.name AS class_name,
          hu.full_name AS homeroom_name
        FROM ${located.schema}.l_score_final sf
        JOIN a_periode p ON p.id = sf.periode_id
        JOIN a_subject sub ON sub.id = sf.subject_id
        LEFT JOIN a_subject_category cat ON cat.id = sub.category_id
        LEFT JOIN a_class c ON c.id = ${classExpr}
        LEFT JOIN u_users hu ON hu.id = c.homeroom_teacher_id
        WHERE sf.student_id = $1
          AND p.homebase_id = $2
          AND sub.homebase_id = $2
      ) src
      ORDER BY periode_id, semester, subject_id, id DESC
    `,
    [studentId, homebaseId],
  );
  return result.rows;
};

const pullAttendance = async (client, homebaseId, studentId, periodeName, semester) => {
  const relation = await client.query(
    `SELECT to_regclass('attendance.daily_attendance') AS name`,
  );
  if (!relation.rows[0]?.name) return null;
  const bounds = semesterBounds(academicStartYear(periodeName), semester);
  if (!bounds) return null;
  const result = await client.query(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE attendance_status = 'excused'
            AND COALESCE(notes, '') ILIKE '%sakit%'
        )::int AS sick,
        COUNT(*) FILTER (
          WHERE attendance_status = 'excused'
            AND COALESCE(notes, '') NOT ILIKE '%sakit%'
        )::int AS permit,
        COUNT(*) FILTER (WHERE attendance_status = 'absent')::int AS absent
      FROM attendance.daily_attendance
      WHERE homebase_id = $1
        AND user_id = $2
        AND target_role = 'student'
        AND attendance_date BETWEEN $3::date AND $4::date
    `,
    [homebaseId, studentId, bounds[0], bounds[1]],
  );
  return result.rows[0];
};

router.post(
  "/tu/buku-induk/:id/sync",
  withTransaction(async (req, res, client) => {
    const bundle = await loadBukuBundle(
      client,
      req.user.homebase_id,
      toInt(req.params.id),
    );
    if (!bundle) {
      return res.status(404).json({
        status: "error",
        message: "Buku induk tidak ditemukan.",
      });
    }

    let sourceRows = [];
    try {
      sourceRows = await pullScores(
        client,
        req.user.homebase_id,
        bundle.buku.student_id,
      );
    } catch (error) {
      console.error("[tu] gagal menarik nilai LMS", error);
      return res.status(500).json({
        status: "error",
        message: "Nilai LMS tidak dapat ditarik.",
      });
    }

    let sortOrder = 0;
    for (const row of sourceRows) {
      const semester = Number(row.semester) === 2 ? 2 : 1;
      const score = row.final_grade === null ? null : Number(row.final_grade);
      sortOrder += 1;
      await client.query(
        `
          INSERT INTO tu_buku_score (
            buku_id, periode_id, periode_name, semester, subject_id, subject_name,
            category_name, kind, class_name, homeroom_name, score_lms, predicate_lms, sort_order
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,'mapel',$8,$9,$10,$11,$12)
          ON CONFLICT (buku_id, periode_id, semester, subject_id) WHERE subject_id IS NOT NULL
          DO UPDATE SET
            periode_name = EXCLUDED.periode_name,
            subject_name = EXCLUDED.subject_name,
            category_name = EXCLUDED.category_name,
            class_name = EXCLUDED.class_name,
            homeroom_name = EXCLUDED.homeroom_name,
            score_lms = EXCLUDED.score_lms,
            predicate_lms = EXCLUDED.predicate_lms,
            sort_order = EXCLUDED.sort_order,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          bundle.buku.id,
          row.periode_id,
          row.periode_name,
          semester,
          row.subject_id,
          row.subject_name,
          row.category_name,
          row.class_name,
          row.homeroom_name,
          Number.isFinite(score) ? score : null,
          predicateFromScore(score),
          sortOrder,
        ],
      );
    }

    const periods = new Map();
    sourceRows.forEach((row) => {
      if (!periods.has(row.periode_id)) {
        periods.set(row.periode_id, row.periode_name);
      }
    });
    if (periods.size === 0) {
      const active = await client.query(
        `
          SELECT id, name
          FROM a_periode
          WHERE homebase_id = $1
          ORDER BY is_active DESC, id DESC
          LIMIT 6
        `,
        [req.user.homebase_id],
      );
      active.rows.forEach((row) => periods.set(row.id, row.name));
    }

    let attendanceCount = 0;
    for (const [periodeId, periodeName] of periods) {
      for (const semester of [1, 2]) {
        const counts = await pullAttendance(
          client,
          req.user.homebase_id,
          bundle.buku.student_id,
          periodeName,
          semester,
        );
        if (!counts) continue;
        attendanceCount += 1;
        await client.query(
          `
            INSERT INTO tu_buku_attendance (
              buku_id, periode_id, semester, sick_lms, permit_lms, absent_lms
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (buku_id, periode_id, semester)
            DO UPDATE SET
              sick_lms = EXCLUDED.sick_lms,
              permit_lms = EXCLUDED.permit_lms,
              absent_lms = EXCLUDED.absent_lms,
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            bundle.buku.id,
            periodeId,
            semester,
            counts.sick || 0,
            counts.permit || 0,
            counts.absent || 0,
          ],
        );
      }
    }

    const fresh = await loadBukuBundle(client, req.user.homebase_id, bundle.buku.id);
    return res.json({
      status: "success",
      message:
        sourceRows.length > 0
          ? "Nilai LMS ditarik. Koreksi yang sudah diisi tetap tersimpan."
          : "Belum ada nilai akhir LMS untuk siswa ini. Ketidakhadiran tetap diperbarui bila tersedia.",
      data: {
        ...fresh,
        pulled_scores: sourceRows.length,
        pulled_attendance: attendanceCount,
      },
    });
  }),
);

router.put(
  "/tu/buku-induk/:id/overrides",
  withTransaction(async (req, res, client) => {
    const bukuId = toInt(req.params.id);
    const owned = await client.query(
      `SELECT id FROM tu_buku_induk WHERE id = $1 AND homebase_id = $2`,
      [bukuId, req.user.homebase_id],
    );
    if (owned.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Buku induk tidak ditemukan.",
      });
    }

    const scores = Array.isArray(req.body?.scores) ? req.body.scores : [];
    const attendance = Array.isArray(req.body?.attendance) ? req.body.attendance : [];
    const decisions = Array.isArray(req.body?.decisions) ? req.body.decisions : [];

    for (const item of scores) {
      const id = toInt(item?.id);
      if (!id) continue;
      const score = item?.score_override === "" || item?.score_override === null
        ? null
        : Number(item.score_override);
      if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
        return res.status(400).json({
          status: "error",
          message: "Nilai koreksi harus di antara 0 dan 100.",
        });
      }
      const predicate = clip(item?.predicate_override, 4).toUpperCase();
      if (predicate && !["A", "B", "C", "D"].includes(predicate)) {
        return res.status(400).json({
          status: "error",
          message: "Predikat koreksi memakai A, B, C, atau D.",
        });
      }
      await client.query(
        `
          UPDATE tu_buku_score
          SET score_override = $3,
              predicate_override = NULLIF($4, ''),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND buku_id = $2
        `,
        [id, bukuId, score, predicate],
      );
    }

    for (const item of attendance) {
      const id = toInt(item?.id);
      if (!id) continue;
      const values = ["sick_override", "permit_override", "absent_override"].map(
        (key) => {
          if (item[key] === "" || item[key] === null || item[key] === undefined) {
            return null;
          }
          const parsed = toInt(item[key]);
          return parsed !== null && parsed >= 0 && parsed <= 366 ? parsed : null;
        },
      );
      await client.query(
        `
          UPDATE tu_buku_attendance
          SET sick_override = $3,
              permit_override = $4,
              absent_override = $5,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND buku_id = $2
        `,
        [id, bukuId, ...values],
      );
    }

    for (const item of decisions) {
      const periodeId = toInt(item?.periode_id);
      if (!periodeId) continue;
      const decision = clip(item?.decision, 20);
      if (!decision) {
        await client.query(
          `DELETE FROM tu_buku_decision WHERE buku_id = $1 AND periode_id = $2`,
          [bukuId, periodeId],
        );
        continue;
      }
      if (!["naik", "tinggal", "lulus"].includes(decision)) {
        return res.status(400).json({
          status: "error",
          message: "Ketetapan diisi naik, tinggal, atau lulus.",
        });
      }
      const periode = await client.query(
        `SELECT name FROM a_periode WHERE id = $1 AND homebase_id = $2`,
        [periodeId, req.user.homebase_id],
      );
      if (periode.rowCount === 0) continue;
      await client.query(
        `
          INSERT INTO tu_buku_decision (buku_id, periode_id, year_label, decision, note)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (buku_id, periode_id)
          DO UPDATE SET
            year_label = EXCLUDED.year_label,
            decision = EXCLUDED.decision,
            note = EXCLUDED.note,
            updated_at = CURRENT_TIMESTAMP
        `,
        [bukuId, periodeId, periode.rows[0].name, decision, clip(item?.note, 300)],
      );
    }

    const fresh = await loadBukuBundle(client, req.user.homebase_id, bukuId);
    return res.json({
      status: "success",
      message: "Koreksi buku induk disimpan.",
      data: fresh,
    });
  }),
);

router.post(
  "/tu/buku-induk/:id/scores",
  withTransaction(async (req, res, client) => {
    const bukuId = toInt(req.params.id);
    const owned = await client.query(
      `SELECT id FROM tu_buku_induk WHERE id = $1 AND homebase_id = $2`,
      [bukuId, req.user.homebase_id],
    );
    if (owned.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Buku induk tidak ditemukan.",
      });
    }

    const kind = ["mapel", "ekskul", "us"].includes(req.body?.kind)
      ? req.body.kind
      : "ekskul";
    const subjectName = clip(req.body?.subject_name, 120);
    if (!subjectName) {
      return res.status(400).json({
        status: "error",
        message: "Nama mata pelajaran atau ekstrakurikuler wajib diisi.",
      });
    }
    const periodeId = toInt(req.body?.periode_id);
    let semester = toInt(req.body?.semester) || 1;
    if (kind === "us") semester = 3;
    if (![1, 2, 3].includes(semester)) semester = 1;

    let periodeName = "";
    if (periodeId) {
      const periode = await client.query(
        `SELECT name FROM a_periode WHERE id = $1 AND homebase_id = $2`,
        [periodeId, req.user.homebase_id],
      );
      if (periode.rowCount === 0) {
        return res.status(400).json({
          status: "error",
          message: "Periode tidak ditemukan.",
        });
      }
      periodeName = periode.rows[0].name;
    }

    const score = req.body?.score_override === "" || req.body?.score_override === null
      ? null
      : Number(req.body?.score_override);
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
      return res.status(400).json({
        status: "error",
        message: "Nilai harus di antara 0 dan 100.",
      });
    }

    try {
      await client.query(
        `
          INSERT INTO tu_buku_score (
            buku_id, periode_id, periode_name, semester, subject_name, category_name,
            kind, score_override, predicate_override
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          bukuId,
          periodeId,
          periodeName,
          semester,
          subjectName,
          clip(req.body?.category_name, 120),
          kind,
          score,
          predicateFromScore(score),
        ],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ status: "error", message: uniqueMessage(error) });
      }
      throw error;
    }

    const fresh = await loadBukuBundle(client, req.user.homebase_id, bukuId);
    return res.json({
      status: "success",
      message: "Baris nilai ditambahkan.",
      data: fresh,
    });
  }),
);

router.delete(
  "/tu/buku-induk/:id/scores/:scoreId",
  withTransaction(async (req, res, client) => {
    const result = await client.query(
      `
        DELETE FROM tu_buku_score sc
        USING tu_buku_induk b
        WHERE sc.id = $1
          AND sc.buku_id = $2
          AND b.id = sc.buku_id
          AND b.homebase_id = $3
          AND sc.subject_id IS NULL
        RETURNING sc.id
      `,
      [toInt(req.params.scoreId), toInt(req.params.id), req.user.homebase_id],
    );
    if (result.rowCount === 0) {
      return res.status(400).json({
        status: "error",
        message: "Hanya baris yang ditambahkan manual yang dapat dihapus.",
      });
    }
    return res.json({ status: "success", message: "Baris nilai dihapus." });
  }),
);

export default router;
