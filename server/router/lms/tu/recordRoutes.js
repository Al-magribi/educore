import path from "path";
import { Router } from "express";
import multer from "multer";
import { withQuery, withTransaction } from "../../../utils/wrapper.js";
import {
  clip,
  discardTuFile,
  ensureBuku,
  findStudent,
  formatDate,
  isUniqueViolation,
  mirrorRecordsIntoProfile,
  prepareTuDir,
  recomputeStudentStatus,
  toDate,
  toInt,
  toTuAssetUrl,
  uniqueMessage,
} from "./shared.js";

const router = Router();

const fileUploader = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      callback(null, prepareTuDir(req.user.homebase_id));
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase();
      callback(
        null,
        `berkas-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`,
      );
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    const allowed = {
      ".pdf": ["application/pdf"],
      ".png": ["image/png"],
      ".jpg": ["image/jpeg"],
      ".jpeg": ["image/jpeg"],
      ".webp": ["image/webp"],
    };
    if (allowed[extension]?.includes(mime)) return callback(null, true);
    return callback(new Error("Berkas harus PDF atau gambar."));
  },
});

export const uploadArchive = (req, res, next) => {
  fileUploader.single("file")(req, res, (error) => {
    if (!error) return next();
    const message =
      error?.code === "LIMIT_FILE_SIZE"
        ? "Ukuran berkas melebihi 10 MB."
        : error?.message || "Upload berkas gagal.";
    return res.status(400).json({ status: "error", message });
  });
};

const mutationPayload = (body) => {
  const direction = body?.direction === "keluar" ? "keluar" : "masuk";
  return {
    direction,
    mutation_date: toDate(body?.mutation_date),
    school_name: clip(body?.school_name, 200),
    class_name: clip(body?.class_name, 80),
    reason: clip(body?.reason, 500),
  };
};

router.get(
  "/tu/mutations",
  withQuery(async (req, res, client) => {
    const result = await client.query(
      `
        SELECT
          m.*,
          u.full_name,
          s.nis
        FROM tu_mutation m
        JOIN u_users u ON u.id = m.student_id
        JOIN u_students s ON s.user_id = m.student_id
        WHERE m.homebase_id = $1
        ORDER BY m.mutation_date DESC NULLS LAST, m.id DESC
      `,
      [req.user.homebase_id],
    );
    return res.json({
      status: "success",
      data: result.rows.map((row) => ({
        ...row,
        mutation_date: formatDate(row.mutation_date),
      })),
    });
  }),
);

router.post(
  "/tu/mutations",
  withTransaction(async (req, res, client) => {
    const studentId = toInt(req.body?.student_id);
    const student = await findStudent(client, req.user.homebase_id, studentId);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Siswa tidak ditemukan di satuan ini.",
      });
    }
    const payload = mutationPayload(req.body);
    if (!payload.school_name) {
      return res.status(400).json({
        status: "error",
        message: "Nama sekolah asal atau tujuan wajib diisi.",
      });
    }
    await ensureBuku(client, req.user.homebase_id, studentId);
    await client.query(
      `
        INSERT INTO tu_mutation (
          homebase_id, student_id, direction, mutation_date, school_name,
          class_name, reason, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        req.user.homebase_id,
        studentId,
        payload.direction,
        payload.mutation_date,
        payload.school_name,
        payload.class_name,
        payload.reason,
        req.user.id,
      ],
    );
    await mirrorRecordsIntoProfile(
      client,
      req.user.homebase_id,
      studentId,
      "mutation",
    );
    await recomputeStudentStatus(client, req.user.homebase_id, studentId);
    return res.json({ status: "success", message: "Mutasi siswa disimpan." });
  }),
);

router.put(
  "/tu/mutations/:id",
  withTransaction(async (req, res, client) => {
    const current = await client.query(
      `SELECT * FROM tu_mutation WHERE id = $1 AND homebase_id = $2`,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (current.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Mutasi tidak ditemukan." });
    }
    const payload = mutationPayload(req.body);
    if (!payload.school_name) {
      return res.status(400).json({
        status: "error",
        message: "Nama sekolah asal atau tujuan wajib diisi.",
      });
    }
    await client.query(
      `
        UPDATE tu_mutation
        SET direction = $2,
            mutation_date = $3,
            school_name = $4,
            class_name = $5,
            reason = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        current.rows[0].id,
        payload.direction,
        payload.mutation_date,
        payload.school_name,
        payload.class_name,
        payload.reason,
      ],
    );
    await mirrorRecordsIntoProfile(
      client,
      req.user.homebase_id,
      current.rows[0].student_id,
      "mutation",
    );
    await recomputeStudentStatus(
      client,
      req.user.homebase_id,
      current.rows[0].student_id,
    );
    return res.json({ status: "success", message: "Mutasi siswa diperbarui." });
  }),
);

router.delete(
  "/tu/mutations/:id",
  withTransaction(async (req, res, client) => {
    const result = await client.query(
      `
        DELETE FROM tu_mutation
        WHERE id = $1 AND homebase_id = $2
        RETURNING student_id
      `,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Mutasi tidak ditemukan." });
    }
    await mirrorRecordsIntoProfile(
      client,
      req.user.homebase_id,
      result.rows[0].student_id,
      "mutation",
    );
    await recomputeStudentStatus(
      client,
      req.user.homebase_id,
      result.rows[0].student_id,
    );
    return res.json({ status: "success", message: "Mutasi siswa dihapus." });
  }),
);

const alumniPayload = (body) => ({
  graduation_year: toInt(body?.graduation_year),
  continue_to: clip(body?.continue_to, 200),
  major_name: clip(body?.major_name, 200),
  workplace: clip(body?.workplace, 200),
  income: clip(body?.income, 120),
  phone: clip(body?.phone, 40),
  note: clip(body?.note, 500),
});

router.get(
  "/tu/alumni",
  withQuery(async (req, res, client) => {
    const search = clip(req.query.search, 80);
    const params = [req.user.homebase_id];
    let filter = "";
    if (search) {
      params.push(`%${search}%`);
      filter = `AND (u.full_name ILIKE $2 OR COALESCE(s.nis, '') ILIKE $2 OR COALESCE(a.continue_to, '') ILIKE $2)`;
    }
    const result = await client.query(
      `
        SELECT a.*, u.full_name, s.nis, s.nisn
        FROM tu_alumni a
        JOIN u_users u ON u.id = a.student_id
        JOIN u_students s ON s.user_id = a.student_id
        WHERE a.homebase_id = $1
          ${filter}
        ORDER BY a.graduation_year DESC NULLS LAST, lower(u.full_name)
      `,
      params,
    );
    return res.json({ status: "success", data: result.rows });
  }),
);

router.post(
  "/tu/alumni",
  withTransaction(async (req, res, client) => {
    const studentId = toInt(req.body?.student_id);
    const student = await findStudent(client, req.user.homebase_id, studentId);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Siswa tidak ditemukan di satuan ini.",
      });
    }
    const payload = alumniPayload(req.body);
    if (
      payload.graduation_year &&
      (payload.graduation_year < 1900 || payload.graduation_year > 2100)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Tahun lulus tidak valid.",
      });
    }
    try {
      await client.query(
        `
          INSERT INTO tu_alumni (
            homebase_id, student_id, graduation_year, continue_to, major_name,
            workplace, income, phone, note
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          req.user.homebase_id,
          studentId,
          payload.graduation_year,
          payload.continue_to,
          payload.major_name,
          payload.workplace,
          payload.income,
          payload.phone,
          payload.note,
        ],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ status: "error", message: uniqueMessage(error) });
      }
      throw error;
    }
    await ensureBuku(client, req.user.homebase_id, studentId);
    await mirrorRecordsIntoProfile(client, req.user.homebase_id, studentId, "alumni");
    await recomputeStudentStatus(client, req.user.homebase_id, studentId);
    return res.json({ status: "success", message: "Data alumni disimpan." });
  }),
);

router.put(
  "/tu/alumni/:id",
  withTransaction(async (req, res, client) => {
    const current = await client.query(
      `SELECT * FROM tu_alumni WHERE id = $1 AND homebase_id = $2`,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (current.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Alumni tidak ditemukan." });
    }
    const payload = alumniPayload(req.body);
    await client.query(
      `
        UPDATE tu_alumni
        SET graduation_year = $2,
            continue_to = $3,
            major_name = $4,
            workplace = $5,
            income = $6,
            phone = $7,
            note = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        current.rows[0].id,
        payload.graduation_year,
        payload.continue_to,
        payload.major_name,
        payload.workplace,
        payload.income,
        payload.phone,
        payload.note,
      ],
    );
    await mirrorRecordsIntoProfile(
      client,
      req.user.homebase_id,
      current.rows[0].student_id,
      "alumni",
    );
    return res.json({ status: "success", message: "Data alumni diperbarui." });
  }),
);

router.delete(
  "/tu/alumni/:id",
  withTransaction(async (req, res, client) => {
    const result = await client.query(
      `
        DELETE FROM tu_alumni
        WHERE id = $1 AND homebase_id = $2
        RETURNING student_id
      `,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Alumni tidak ditemukan." });
    }
    await mirrorRecordsIntoProfile(
      client,
      req.user.homebase_id,
      result.rows[0].student_id,
      "alumni",
    );
    await recomputeStudentStatus(
      client,
      req.user.homebase_id,
      result.rows[0].student_id,
    );
    return res.json({ status: "success", message: "Data alumni dihapus." });
  }),
);

const diplomaFields = (body) => {
  const kind = body?.kind === "terbit" ? "terbit" : "asal";
  return {
    kind,
    diploma_date: toDate(body?.diploma_date),
    diploma_no: clip(body?.diploma_no, 80),
    skhun_no: clip(body?.skhun_no, 80),
    exam_no: clip(body?.exam_no, 80),
    school_name: clip(body?.school_name, 200),
    note: clip(body?.note, 500),
  };
};

router.get(
  "/tu/diplomas",
  withQuery(async (req, res, client) => {
    const kind = req.query.kind === "terbit" || req.query.kind === "asal" ? req.query.kind : "";
    const params = [req.user.homebase_id];
    let filter = "";
    if (kind) {
      params.push(kind);
      filter = "AND d.kind = $2";
    }
    const result = await client.query(
      `
        SELECT d.*, u.full_name, s.nis
        FROM tu_diploma d
        JOIN u_users u ON u.id = d.student_id
        JOIN u_students s ON s.user_id = d.student_id
        WHERE d.homebase_id = $1
          ${filter}
        ORDER BY d.diploma_date DESC NULLS LAST, lower(u.full_name)
      `,
      params,
    );
    return res.json({
      status: "success",
      data: result.rows.map((row) => ({
        ...row,
        diploma_date: formatDate(row.diploma_date),
      })),
    });
  }),
);

const saveDiploma = async (client, req, existing) => {
  const studentId = existing
    ? existing.student_id
    : toInt(req.body?.student_id);
  const student = await findStudent(client, req.user.homebase_id, studentId);
  if (!student) {
    return { error: "Siswa tidak ditemukan di satuan ini.", status: 404 };
  }
  const fields = diplomaFields(req.body);
  if (!fields.diploma_no && !fields.school_name) {
    return {
      error: "Isi nomor ijazah atau nama sekolah.",
      status: 400,
    };
  }
  const fileUrl = req.file
    ? toTuAssetUrl(req.user.homebase_id, req.file.filename)
    : existing?.file_url || null;

  try {
    if (existing) {
      await client.query(
        `
          UPDATE tu_diploma
          SET kind = $2,
              diploma_date = $3,
              diploma_no = NULLIF($4, ''),
              skhun_no = NULLIF($5, ''),
              exam_no = NULLIF($6, ''),
              school_name = NULLIF($7, ''),
              file_url = $8,
              note = NULLIF($9, ''),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          existing.id,
          fields.kind,
          fields.diploma_date,
          fields.diploma_no,
          fields.skhun_no,
          fields.exam_no,
          fields.school_name,
          fileUrl,
          fields.note,
        ],
      );
      if (req.file && existing.file_url && existing.file_url !== fileUrl) {
        discardTuFile(req.user.homebase_id, existing.file_url);
      }
    } else {
      await client.query(
        `
          INSERT INTO tu_diploma (
            homebase_id, student_id, kind, diploma_date, diploma_no, skhun_no,
            exam_no, school_name, file_url, note
          )
          VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), $9, NULLIF($10, ''))
        `,
        [
          req.user.homebase_id,
          studentId,
          fields.kind,
          fields.diploma_date,
          fields.diploma_no,
          fields.skhun_no,
          fields.exam_no,
          fields.school_name,
          fileUrl,
          fields.note,
        ],
      );
    }
  } catch (error) {
    if (req.file) discardTuFile(req.user.homebase_id, fileUrl);
    if (isUniqueViolation(error)) {
      return { error: uniqueMessage(error), status: 409 };
    }
    throw error;
  }

  await ensureBuku(client, req.user.homebase_id, studentId);
  if (fields.kind === "terbit") {
    const year = fields.diploma_date
      ? Number(fields.diploma_date.slice(0, 4))
      : null;
    await client.query(
      `
        INSERT INTO tu_alumni (homebase_id, student_id, graduation_year)
        VALUES ($1, $2, $3)
        ON CONFLICT (homebase_id, student_id) DO NOTHING
      `,
      [req.user.homebase_id, studentId, year],
    );
  }
  await mirrorRecordsIntoProfile(
    client,
    req.user.homebase_id,
    studentId,
    "diploma",
    fields.kind,
  );
  if (fields.kind === "terbit") {
    await mirrorRecordsIntoProfile(client, req.user.homebase_id, studentId, "alumni");
    await recomputeStudentStatus(client, req.user.homebase_id, studentId);
  }
  return { ok: true };
};

router.post(
  "/tu/diplomas",
  uploadArchive,
  withTransaction(async (req, res, client) => {
    const result = await saveDiploma(client, req, null);
    if (result.error) {
      return res.status(result.status).json({ status: "error", message: result.error });
    }
    return res.json({ status: "success", message: "Data ijazah disimpan." });
  }),
);

router.put(
  "/tu/diplomas/:id",
  uploadArchive,
  withTransaction(async (req, res, client) => {
    const current = await client.query(
      `SELECT * FROM tu_diploma WHERE id = $1 AND homebase_id = $2`,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (current.rowCount === 0) {
      if (req.file) {
        discardTuFile(
          req.user.homebase_id,
          toTuAssetUrl(req.user.homebase_id, req.file.filename),
        );
      }
      return res.status(404).json({ status: "error", message: "Ijazah tidak ditemukan." });
    }
    const result = await saveDiploma(client, req, current.rows[0]);
    if (result.error) {
      return res.status(result.status).json({ status: "error", message: result.error });
    }
    return res.json({ status: "success", message: "Data ijazah diperbarui." });
  }),
);

router.delete(
  "/tu/diplomas/:id",
  withTransaction(async (req, res, client) => {
    const result = await client.query(
      `
        DELETE FROM tu_diploma
        WHERE id = $1 AND homebase_id = $2
        RETURNING student_id, file_url, kind
      `,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Ijazah tidak ditemukan." });
    }
    discardTuFile(req.user.homebase_id, result.rows[0].file_url);
    await mirrorRecordsIntoProfile(
      client,
      req.user.homebase_id,
      result.rows[0].student_id,
      "diploma",
      result.rows[0].kind,
    );
    if (result.rows[0].kind === "terbit") {
      await recomputeStudentStatus(
        client,
        req.user.homebase_id,
        result.rows[0].student_id,
      );
    }
    return res.json({ status: "success", message: "Data ijazah dihapus." });
  }),
);

export default router;
