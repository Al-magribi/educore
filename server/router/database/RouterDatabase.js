import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import pool from "../../config/connection.js";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STUDENT_DOCUMENT_DIRECTORY = path.join(__dirname, "../../assets/db");
const STUDENT_DOCUMENT_TYPES = {
  ijazah: "Ijazah",
  akta_kelahiran: "Akta Kelahiran",
  kartu_keluarga: "Kartu Keluarga",
};

const ensureStudentDocumentDirectory = () => {
  if (!fs.existsSync(STUDENT_DOCUMENT_DIRECTORY)) {
    fs.mkdirSync(STUDENT_DOCUMENT_DIRECTORY, { recursive: true });
  }
};

const sanitizeFileSegment = (value) =>
  normalizeText(value)
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "dokumen";

const formatDocumentFileName = ({ documentType, studentName, extension }) => {
  const typeLabel = STUDENT_DOCUMENT_TYPES[documentType] || "Dokumen";
  const safeType = sanitizeFileSegment(typeLabel);
  const safeStudentName = sanitizeFileSegment(studentName || "Siswa");
  const safeExtension = extension?.startsWith(".") ? extension : "";

  return `${safeType}_${safeStudentName}_${Date.now()}${safeExtension}`;
};

const removeFileIfExists = (targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
};

const studentDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureStudentDocumentDirectory();
    cb(null, STUDENT_DOCUMENT_DIRECTORY);
  },
  filename: (req, file, cb) => {
    const documentType = normalizeText(req.body?.document_type).toLowerCase();
    const studentName = req.documentAccess?.student_name || "Siswa";

    cb(
      null,
      formatDocumentFileName({
        documentType,
        studentName,
        extension: path.extname(file.originalname),
      }),
    );
  },
});

const uploadStudentDocumentFile = multer({
  storage: studentDocumentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png"]);
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(fileExtension)) {
      cb(new Error("Format file tidak didukung. Gunakan PDF, JPG, JPEG, atau PNG."));
      return;
    }

    cb(null, true);
  },
});

const isFilled = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const calculateCompletion = (student) => {
  const requiredFields = [
    student.nis,
    student.full_name,
    student.gender,
    student.birth_place,
    student.birth_date,
    student.father_name,
    student.mother_name,
  ];

  const totalFields = requiredFields.length + 1;
  const filledRequired = requiredFields.filter(isFilled).length;
  const filledSiblings = Array.isArray(student.siblings)
    ? student.siblings.length > 0
      ? 1
      : 0
    : 0;

  const filledFields = filledRequired + filledSiblings;
  const completionPercent = Math.round((filledFields / totalFields) * 100);

  return {
    completionPercent,
    isComplete: completionPercent === 100,
  };
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeSearch = (value) => `%${normalizeText(value).toLowerCase()}%`;

const normalizeStudentIds = (studentIds) => {
  if (!Array.isArray(studentIds)) return [];

  return [...new Set(studentIds.map((item) => parseInt(item, 10)).filter(Number.isInteger))];
};

const getStudentDocumentTypeOptions = () =>
  Object.entries(STUDENT_DOCUMENT_TYPES).map(([value, label]) => ({
    value,
    label,
  }));

const mapStudentDocumentRow = (row) => ({
  id: row.id,
  student_id: row.student_id,
  document_type: row.document_type,
  document_label: STUDENT_DOCUMENT_TYPES[row.document_type] || row.document_type,
  file_name: row.file_name,
  original_file_name: row.original_file_name,
  mime_type: row.mime_type,
  file_size: Number(row.file_size || 0),
  uploaded_by: row.uploaded_by,
  uploader_name: row.uploader_name,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const listStudentDocuments = async (client, studentId) => {
  const result = await client.query(
    `
      SELECT
        d.id,
        d.student_id,
        d.document_type,
        d.file_name,
        d.original_file_name,
        d.mime_type,
        d.file_size,
        d.uploaded_by,
        d.created_at,
        d.updated_at,
        uploader.full_name AS uploader_name
      FROM "database".u_student_documents d
      LEFT JOIN u_users uploader ON uploader.id = d.uploaded_by
      WHERE d.student_id = $1
      ORDER BY d.document_type ASC, d.updated_at DESC, d.id DESC
    `,
    [studentId],
  );

  return result.rows.map(mapStudentDocumentRow);
};

const getStudentDocumentById = async (client, studentId, documentId) => {
  const result = await client.query(
    `
      SELECT
        d.id,
        d.student_id,
        d.document_type,
        d.file_name,
        d.original_file_name,
        d.file_path,
        d.mime_type,
        d.file_size,
        d.uploaded_by,
        d.created_at,
        d.updated_at,
        uploader.full_name AS uploader_name
      FROM "database".u_student_documents d
      LEFT JOIN u_users uploader ON uploader.id = d.uploaded_by
      WHERE d.student_id = $1
        AND d.id = $2
      LIMIT 1
    `,
    [studentId, documentId],
  );

  return result.rows[0] || null;
};

const getStudentDocumentAccess = async ({ client, user, studentId }) => {
  if (!Number.isInteger(studentId)) {
    throw Object.assign(new Error("ID siswa tidak valid."), { statusCode: 400 });
  }

  if (user.role === "student") {
    const result = await client.query(
      `
        SELECT u.id AS student_id, u.full_name AS student_name, s.homebase_id
        FROM u_users u
        JOIN u_students s ON s.user_id = u.id
        WHERE u.id = $1
          AND u.role = 'student'
      `,
      [user.id],
    );

    if (result.rows.length === 0 || result.rows[0].student_id !== studentId) {
      throw Object.assign(new Error("Anda tidak memiliki akses ke dokumen siswa ini."), {
        statusCode: 403,
      });
    }

    return result.rows[0];
  }

  if (user.role === "parent") {
    const result = await client.query(
      `
        SELECT u.id AS student_id, u.full_name AS student_name, s.homebase_id
        FROM u_parents p
        JOIN u_students s ON s.user_id = p.student_id
        JOIN u_users u ON u.id = s.user_id
        WHERE p.user_id = $1
          AND p.student_id = $2
        LIMIT 1
      `,
      [user.id, studentId],
    );

    if (result.rows.length === 0) {
      throw Object.assign(new Error("Anda tidak memiliki akses ke dokumen siswa ini."), {
        statusCode: 403,
      });
    }

    return result.rows[0];
  }

  if (user.role === "teacher") {
    const activePeriode = await client.query(
      `
        SELECT id
        FROM a_periode
        WHERE is_active = true
          AND homebase_id = $1
        LIMIT 1
      `,
      [user.homebase_id],
    );

    if (activePeriode.rows.length === 0) {
      throw Object.assign(new Error("Tidak ada periode aktif untuk satuan ini."), {
        statusCode: 400,
      });
    }

    const result = await client.query(
      `
        SELECT DISTINCT
          u.id AS student_id,
          u.full_name AS student_name,
          s.homebase_id
        FROM u_users u
        JOIN u_students s ON s.user_id = u.id
        JOIN u_class_enrollments ce
          ON ce.student_id = u.id
         AND ce.periode_id = $3
        JOIN a_class c ON c.id = ce.class_id
        WHERE u.id = $1
          AND u.role = 'student'
          AND s.homebase_id = $2
          AND c.homeroom_teacher_id = $4
        LIMIT 1
      `,
      [studentId, user.homebase_id, activePeriode.rows[0].id, user.id],
    );

    if (result.rows.length === 0) {
      throw Object.assign(
        new Error("Guru hanya dapat mengelola dokumen siswa pada kelas wali aktif."),
        { statusCode: 403 },
      );
    }

    return result.rows[0];
  }

  if (user.role === "admin" && user.admin_level === "satuan") {
    const result = await client.query(
      `
        SELECT u.id AS student_id, u.full_name AS student_name, s.homebase_id
        FROM u_users u
        JOIN u_students s ON s.user_id = u.id
        WHERE u.id = $1
          AND u.role = 'student'
          AND s.homebase_id = $2
        LIMIT 1
      `,
      [studentId, user.homebase_id],
    );

    if (result.rows.length === 0) {
      throw Object.assign(new Error("Data siswa tidak ditemukan."), { statusCode: 404 });
    }

    return result.rows[0];
  }

  throw Object.assign(new Error("Akses dilarang."), { statusCode: 403 });
};

const resolveStudentDocumentAccess = () =>
  async (req, res, next) => {
    const studentId = parseInt(req.params.studentId || req.params.id, 10);
    let client;

    try {
      client = await pool.connect();
      const access = await getStudentDocumentAccess({
        client,
        user: req.user,
        studentId,
      });

      req.documentAccess = access;
      next();
    } catch (error) {
      res.status(error.statusCode || 500).json({
        message: error.message || "Gagal memvalidasi akses dokumen siswa.",
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  };

const runStudentDocumentUpload = (req, res) =>
  new Promise((resolve, reject) => {
    uploadStudentDocumentFile.single("file")(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const getParentTableMetadata = async (client) => {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'u_parents'
    `,
  );

  const columns = new Set(result.rows.map((item) => item.column_name));

  return {
    hasId: columns.has("id"),
    hasUserId: columns.has("user_id"),
    hasStudentId: columns.has("student_id"),
    hasPhone: columns.has("phone"),
    hasEmail: columns.has("email"),
  };
};

const syncParentIdSequenceIfNeeded = async (client, metadata) => {
  if (!metadata?.hasId) return;

  await client.query(
    `
      SELECT setval(
        pg_get_serial_sequence('public.u_parents', 'id'),
        COALESCE((SELECT MAX(id) FROM public.u_parents), 0) + 1,
        false
      )
    `,
  );
};

const getParentAccessScope = async ({ db, user, scope = "all" }) => {
  const homebaseId = user.homebase_id;
  const userRole = user.role;

  const activePeriodeResult = await db.query(
    `
      SELECT id
      FROM a_periode
      WHERE is_active = true
        AND homebase_id = $1
      LIMIT 1
    `,
    [homebaseId],
  );

  if (activePeriodeResult.rows.length === 0) {
    throw new Error("Tidak ada periode aktif untuk satuan ini.");
  }

  if (userRole !== "teacher" || scope !== "homeroom") {
    return {
      homebaseId,
      classIds: [],
      activePeriodeId: activePeriodeResult.rows[0].id,
      restrictToHomeroom: false,
    };
  }

  const classResult = await db.query(
    `
      SELECT id
      FROM a_class
      WHERE homebase_id = $1
        AND homeroom_teacher_id = $2
      ORDER BY name
    `,
    [homebaseId, user.id],
  );

  const classIds = classResult.rows.map((item) => item.id);

  if (classIds.length === 0) {
    throw new Error("Akses tab orang tua hanya untuk guru yang menjadi wali kelas aktif.");
  }

  return {
    homebaseId,
    classIds,
    activePeriodeId: activePeriodeResult.rows[0].id,
    restrictToHomeroom: true,
  };
};

const ensureParentStudentIds = async ({
  client,
  homebaseId,
  studentIds,
  parentUserId = null,
  classIds = [],
  activePeriodeId = null,
  restrictToHomeroom = false,
}) => {
  const normalizedStudentIds = normalizeStudentIds(studentIds);

  if (normalizedStudentIds.length === 0) {
    throw new Error("Pilih minimal satu siswa.");
  }

  const studentResult = await client.query(
    `
      SELECT
        u.id AS student_id,
        u.full_name,
        s.nis,
        cl.name AS class_name,
        gr.name AS grade_name
      FROM u_users u
      JOIN u_students s ON s.user_id = u.id
      JOIN u_class_enrollments ce
        ON ce.student_id = u.id
       AND ($4::int IS NULL OR ce.periode_id = $4)
      LEFT JOIN a_class cl ON cl.id = ce.class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      WHERE u.role = 'student'
        AND s.homebase_id = $1
        AND u.id = ANY($2::int[])
        AND ($3::boolean = false OR ce.class_id = ANY($5::int[]))
    `,
    [
      homebaseId,
      normalizedStudentIds,
      restrictToHomeroom,
      activePeriodeId,
      classIds,
    ],
  );

  if (studentResult.rows.length !== normalizedStudentIds.length) {
    throw new Error("Beberapa siswa tidak ditemukan di satuan aktif.");
  }

  const linkedStudentsResult = await client.query(
    `
      SELECT
        p.student_id,
        u.full_name AS parent_name,
        su.full_name AS student_name,
        s.nis
      FROM u_parents p
      JOIN u_users u ON u.id = p.user_id
      JOIN u_students s ON s.user_id = p.student_id
      JOIN u_users su ON su.id = s.user_id
      JOIN u_class_enrollments ce
        ON ce.student_id = s.user_id
       AND ($4::int IS NULL OR ce.periode_id = $4)
      WHERE p.student_id = ANY($1::int[])
        AND ($2::int IS NULL OR p.user_id <> $2)
        AND s.homebase_id = $5
        AND ($3::boolean = false OR ce.class_id = ANY($6::int[]))
    `,
    [
      normalizedStudentIds,
      parentUserId,
      restrictToHomeroom,
      activePeriodeId,
      homebaseId,
      classIds,
    ],
  );

  if (linkedStudentsResult.rows.length > 0) {
    const linkedNames = linkedStudentsResult.rows
      .map(
        (item) =>
          `${item.student_name || "Siswa"} (${item.nis || "-"}) sudah terhubung ke ${item.parent_name || "akun lain"}`,
      )
      .join(", ");

    throw new Error(`Siswa sudah terhubung dengan orang tua lain: ${linkedNames}.`);
  }

  return studentResult.rows;
};

const syncParentAccount = async ({
  client,
  homebaseId,
  parentUserId,
  username,
  password,
  fullName,
  phone,
  email,
  isActive = true,
  studentIds,
  classIds = [],
  activePeriodeId = null,
  restrictToHomeroom = false,
}) => {
  const parentTableMetadata = await getParentTableMetadata(client);

  const normalizedUsername = normalizeText(username);
  const normalizedFullName = normalizeText(fullName);
  const normalizedPhone = normalizeText(phone) || null;
  const normalizedEmail = normalizeText(email) || null;
  const validStudents = await ensureParentStudentIds({
    client,
    homebaseId,
    studentIds,
    parentUserId,
    classIds,
    activePeriodeId,
    restrictToHomeroom,
  });

  if (!normalizedUsername) {
    throw new Error("Username wajib diisi.");
  }

  if (!normalizedFullName) {
    throw new Error("Nama lengkap wajib diisi.");
  }

  let targetUserId = parentUserId;
  const existingUser = await client.query(
    `
      SELECT id, role
      FROM u_users
      WHERE username = $1
        AND ($2::int IS NULL OR id <> $2)
      LIMIT 1
    `,
    [normalizedUsername, parentUserId || null],
  );

  if (existingUser.rows.length > 0) {
    throw new Error("Username sudah digunakan akun lain.");
  }

  if (!parentUserId) {
    if (!normalizeText(password)) {
      throw new Error("Password wajib diisi.");
    }

    const hashedPassword = await bcrypt.hash(normalizeText(password), 10);
    const insertUser = await client.query(
      `
        INSERT INTO u_users (username, password, full_name, role, is_active)
        VALUES ($1, $2, $3, 'parent', $4)
        RETURNING id
      `,
      [normalizedUsername, hashedPassword, normalizedFullName, Boolean(isActive)],
    );

    targetUserId = insertUser.rows[0].id;
  } else {
    const parentUser = await client.query(
      `
        SELECT u.id
        FROM u_users u
        WHERE u.id = $1
          AND u.role = 'parent'
          AND EXISTS (
            SELECT 1
            FROM u_parents p
            JOIN u_students s ON s.user_id = p.student_id
            WHERE p.user_id = u.id
              AND s.homebase_id = $2
          )
      `,
      [parentUserId, homebaseId],
    );

    if (parentUser.rows.length === 0) {
      throw new Error("Akun orang tua tidak ditemukan di satuan ini.");
    }

    const passwordValue = normalizeText(password);
    if (passwordValue) {
      const hashedPassword = await bcrypt.hash(passwordValue, 10);
      await client.query(
        `
          UPDATE u_users
          SET username = $1,
              full_name = $2,
              is_active = $3,
              password = $4
          WHERE id = $5
        `,
        [
          normalizedUsername,
          normalizedFullName,
          Boolean(isActive),
          hashedPassword,
          parentUserId,
        ],
      );
    } else {
      await client.query(
        `
          UPDATE u_users
          SET username = $1,
              full_name = $2,
              is_active = $3
          WHERE id = $4
        `,
        [normalizedUsername, normalizedFullName, Boolean(isActive), parentUserId],
      );
    }

    await client.query(
      `
        DELETE FROM u_parents
        WHERE user_id = $1
          AND student_id <> ALL($2::int[])
      `,
      [parentUserId, validStudents.map((item) => item.student_id)],
    );
  }

  await client.query(`DELETE FROM u_parents WHERE user_id = $1 AND student_id IS NULL`, [
    targetUserId,
  ]);

  for (const student of validStudents) {
    const existingRelation = await client.query(
      `
        SELECT user_id, student_id
        FROM u_parents
        WHERE user_id = $1
          AND student_id = $2
        LIMIT 1
      `,
      [targetUserId, student.student_id],
    );

    if (existingRelation.rows.length > 0) {
      await client.query(
        `
          UPDATE u_parents
          SET phone = $1,
              email = $2
          WHERE user_id = $3
            AND student_id = $4
        `,
        [
          normalizedPhone,
          normalizedEmail,
          existingRelation.rows[0].user_id,
          existingRelation.rows[0].student_id,
        ],
      );
    } else {
      await syncParentIdSequenceIfNeeded(client, parentTableMetadata);

      if (parentTableMetadata.hasId) {
        await client.query(
          `
            INSERT INTO u_parents (id, user_id, student_id, phone, email)
            VALUES (
              (SELECT COALESCE(MAX(id), 0) + 1 FROM u_parents),
              $1,
              $2,
              $3,
              $4
            )
          `,
          [targetUserId, student.student_id, normalizedPhone, normalizedEmail],
        );
      } else {
        await client.query(
          `
            INSERT INTO u_parents (user_id, student_id, phone, email)
            VALUES ($1, $2, $3, $4)
          `,
          [targetUserId, student.student_id, normalizedPhone, normalizedEmail],
        );
      }
    }
  }

  await client.query(
    `
      UPDATE u_parents
      SET phone = $1,
          email = $2
      WHERE user_id = $3
    `,
    [normalizedPhone, normalizedEmail, targetUserId],
  );

  return { userId: targetUserId, students: validStudents };
};

const updateStudentProfileData = async (client, studentId, payload) => {
  const {
    full_name,
    gender,
    nis,
    nisn,
    birth_place,
    birth_date,
    height,
    weight,
    head_circumference,
    order_number,
    siblings_count,
    postal_code,
    address,
    father_name,
    father_nik,
    father_birth_place,
    father_birth_date,
    father_phone,
    mother_name,
    mother_nik,
    mother_birth_place,
    mother_birth_date,
    mother_phone,
    siblings = [],
  } = payload;

  await client.query(
    `
      UPDATE u_users
      SET
        full_name = COALESCE($1, full_name),
        gender = COALESCE($2, gender)
      WHERE id = $3
    `,
    [full_name || null, gender || null, studentId],
  );

  await client.query(
    `
      UPDATE u_students
      SET
        nis = COALESCE($1, nis),
        nisn = COALESCE($2, nisn),
        birth_place = $3,
        birth_date = $4,
        height = $5,
        weight = $6,
        head_circumference = $7,
        order_number = $8,
        siblings_count = $9,
        postal_code = $10,
        address = $11
      WHERE user_id = $12
    `,
    [
      nis || null,
      nisn || null,
      birth_place || null,
      birth_date || null,
      height || null,
      weight || null,
      head_circumference || null,
      order_number || null,
      siblings_count || null,
      postal_code || null,
      address || null,
      studentId,
    ],
  );

  const existingFamily = await client.query(
    `SELECT id FROM "database".u_student_families WHERE student_id = $1 ORDER BY id DESC LIMIT 1`,
    [studentId],
  );

  const familyValues = [
    father_nik || null,
    father_name || null,
    father_birth_place || null,
    father_birth_date || null,
    father_phone || null,
    mother_nik || null,
    mother_name || null,
    mother_birth_place || null,
    mother_birth_date || null,
    mother_phone || null,
  ];

  if (existingFamily.rows.length > 0) {
    await client.query(
      `
        UPDATE "database".u_student_families
        SET
          father_nik = $1,
          father_name = $2,
          father_birth_place = $3,
          father_birth_date = $4,
          father_phone = $5,
          mother_nik = $6,
          mother_name = $7,
          mother_birth_place = $8,
          mother_birth_date = $9,
          mother_phone = $10
        WHERE id = $11
      `,
      [...familyValues, existingFamily.rows[0].id],
    );
  } else {
    await client.query(
      `
        INSERT INTO "database".u_student_families (
          student_id,
          father_nik,
          father_name,
          father_birth_place,
          father_birth_date,
          father_phone,
          mother_nik,
          mother_name,
          mother_birth_place,
          mother_birth_date,
          mother_phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [studentId, ...familyValues],
    );
  }

  await client.query(`DELETE FROM "database".u_student_siblings WHERE student_id = $1`, [
    studentId,
  ]);

  const cleanSiblings = Array.isArray(siblings)
    ? siblings.filter((item) => item?.name?.trim())
    : [];

  for (const sibling of cleanSiblings) {
    await client.query(
      `
        INSERT INTO "database".u_student_siblings (student_id, name, gender, birth_date)
        VALUES ($1, $2, $3, $4)
      `,
      [
        studentId,
        sibling.name.trim(),
        sibling.gender || null,
        sibling.birth_date || null,
      ],
    );
  }
};

router.get(
  "/students",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      page = "1",
      limit = "10",
      search = "",
      grade_id: gradeId = "",
      class_id: classId = "",
      scope = "all",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const activePeriodeResult = await pool.query(
      `
          SELECT id, name
          FROM a_periode
          WHERE is_active = true
            AND homebase_id = $1
          LIMIT 1
        `,
      [homebaseId],
    );

    if (activePeriodeResult.rows.length === 0) {
      return res.status(200).json({
        data: [],
        summary: {
          total_students: 0,
          complete_students: 0,
          incomplete_students: 0,
          average_completion: 0,
          complete_students_on_page: 0,
          complete_percentage: 0,
        },
        filters: {
          grades: [],
          classes: [],
        },
        active_periode: null,
        teacher_scope: {
          is_homeroom: false,
          classes: [],
        },
        meta: {
          page: pageNum,
          limit: limitNum,
          total_data: 0,
          total_pages: 0,
        },
      });
    }

    const activePeriodeId = activePeriodeResult.rows[0].id;
    const activePeriodeName = activePeriodeResult.rows[0].name;

    const isHomeroomScope = userRole === "teacher" || scope === "homeroom";
    let homeroomClasses = [];

    if (isHomeroomScope) {
      const homeroomResult = await pool.query(
        `
          SELECT id, name
          FROM a_class
          WHERE homebase_id = $1
            AND homeroom_teacher_id = $2
          ORDER BY name
        `,
        [homebaseId, userId],
      );
      homeroomClasses = homeroomResult.rows.map((item) => ({
        class_id: item.id,
        class_name: item.name,
      }));
    }

    const homeroomClassIds = homeroomClasses.map((item) => item.class_id);
    const isHomeroom = homeroomClassIds.length > 0;

    const classFilterEnabled = !isHomeroomScope || isHomeroom;

    const filtersQuery = isHomeroomScope
      ? `
      SELECT
        (
          SELECT COALESCE(
            json_agg(json_build_object('value', x.id, 'label', x.name) ORDER BY x.name),
            '[]'::json
          )
          FROM (
            SELECT DISTINCT g.id, g.name
            FROM a_class c
            JOIN a_grade g ON g.id = c.grade_id
            WHERE c.homebase_id = $1
              AND c.id = ANY($2::int[])
          ) x
        ) AS grades,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'value', c.id,
                'label', c.name,
                'grade_id', c.grade_id
              )
              ORDER BY c.name
            ),
            '[]'::json
          )
          FROM a_class c
          WHERE c.homebase_id = $1
            AND c.id = ANY($2::int[])
        ) AS classes
    `
      : `
      SELECT
        (
          SELECT COALESCE(json_agg(json_build_object('value', g.id, 'label', g.name) ORDER BY g.name), '[]'::json)
          FROM a_grade g
          WHERE g.homebase_id = $1
        ) AS grades,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'value', c.id,
                'label', c.name,
                'grade_id', c.grade_id
              )
              ORDER BY c.name
            ),
            '[]'::json
          )
          FROM a_class c
          WHERE c.homebase_id = $1
        ) AS classes
    `;

    const filtersResult = await pool.query(
      filtersQuery,
      isHomeroomScope ? [homebaseId, homeroomClassIds] : [homebaseId],
    );

    if (isHomeroomScope && !isHomeroom) {
      return res.status(200).json({
        data: [],
        summary: {
          total_students: 0,
          complete_students: 0,
          incomplete_students: 0,
          average_completion: 0,
          complete_students_on_page: 0,
          complete_percentage: 0,
        },
        filters: filtersResult.rows[0],
        active_periode: {
          id: activePeriodeId,
          name: activePeriodeName,
        },
        teacher_scope: {
          is_homeroom: false,
          classes: [],
        },
        meta: {
          page: pageNum,
          limit: limitNum,
          total_data: 0,
          total_pages: 0,
        },
      });
    }

    const dataQuery = `
      SELECT
        u.id AS student_id,
        u.full_name,
        u.gender,
        s.nis,
        s.nisn,
        s.birth_place,
        s.birth_date,
        s.height,
        s.weight,
        s.head_circumference,
        s.order_number,
        s.siblings_count,
        s.address,
        s.postal_code,

        pr.name AS province,
        ci.name AS city,
        di.name AS district,
        vi.name AS village,

        hb.name AS education_unit,
        pe.name AS academic_year,

        gr.id AS grade_id,
        gr.name AS grade_name,
        cl.id AS class_id,
        cl.name AS class_name,

        fam.father_name,
        fam.father_nik,
        fam.father_birth_place,
        fam.father_birth_date,
        fam.father_phone,
        fam.mother_name,
        fam.mother_nik,
        fam.mother_birth_place,
        fam.mother_birth_date,
        fam.mother_phone,

        COALESCE(sib.siblings, '[]'::json) AS siblings
      FROM u_users u
      JOIN u_students s ON s.user_id = u.id
      LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
      JOIN u_class_enrollments ce ON ce.student_id = u.id
      LEFT JOIN a_class cl ON cl.id = ce.class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      LEFT JOIN a_periode pe ON pe.id = ce.periode_id

      LEFT JOIN "database".db_province pr ON pr.id = s.province_id
      LEFT JOIN "database".db_city ci ON ci.id = s.city_id
      LEFT JOIN "database".db_district di ON di.id = s.district_id
      LEFT JOIN "database".db_village vi ON vi.id = s.village_id

      LEFT JOIN LATERAL (
        SELECT
          sf.father_name,
          sf.father_nik,
          sf.father_birth_place,
          sf.father_birth_date,
          sf.father_phone,
          sf.mother_name,
          sf.mother_nik,
          sf.mother_birth_place,
          sf.mother_birth_date,
          sf.mother_phone
        FROM "database".u_student_families sf
        WHERE sf.student_id = u.id
        ORDER BY sf.id DESC
        LIMIT 1
      ) fam ON true

      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', ss.id,
            'name', ss.name,
            'gender', ss.gender,
            'birth_date', ss.birth_date
          )
          ORDER BY ss.birth_date ASC NULLS LAST, ss.id ASC
        ) AS siblings
        FROM "database".u_student_siblings ss
        WHERE ss.student_id = u.id
      ) sib ON true

      WHERE u.role = 'student'
        AND s.homebase_id = $1
        AND ($2 = '' OR u.full_name ILIKE $3 OR s.nis ILIKE $3 OR s.nisn ILIKE $3)
        AND ($4 = '' OR gr.id = $4::integer)
        AND ($5 = '' OR cl.id = $5::integer)
        AND ce.periode_id = $6
        AND ($9::boolean = false OR cl.id = ANY($10::int[]))
      ORDER BY u.full_name ASC
      LIMIT $7 OFFSET $8
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM u_users u
      JOIN u_students s ON s.user_id = u.id
      JOIN u_class_enrollments ce ON ce.student_id = u.id
      LEFT JOIN a_class cl ON cl.id = ce.class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      WHERE u.role = 'student'
        AND s.homebase_id = $1
        AND ($2 = '' OR u.full_name ILIKE $3 OR s.nis ILIKE $3 OR s.nisn ILIKE $3)
        AND ($4 = '' OR gr.id = $4::integer)
        AND ($5 = '' OR cl.id = $5::integer)
        AND ce.periode_id = $6
        AND ($7::boolean = false OR cl.id = ANY($8::int[]))
    `;

    const summaryQuery = `
      SELECT
        u.id AS student_id,
        u.full_name,
        u.gender,
        s.nis,
        s.nisn,
        s.birth_place,
        s.birth_date,
        s.height,
        s.weight,
        s.head_circumference,
        s.order_number,
        s.siblings_count,
        s.address,
        s.postal_code,
        pr.name AS province,
        ci.name AS city,
        di.name AS district,
        vi.name AS village,
        hb.name AS education_unit,
        pe.name AS academic_year,
        fam.father_name,
        fam.father_nik,
        fam.father_birth_place,
        fam.father_birth_date,
        fam.father_phone,
        fam.mother_name,
        fam.mother_nik,
        fam.mother_birth_place,
        fam.mother_birth_date,
        fam.mother_phone,
        COALESCE(sib.siblings, '[]'::json) AS siblings
      FROM u_users u
      JOIN u_students s ON s.user_id = u.id
      LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
      JOIN u_class_enrollments ce ON ce.student_id = u.id
      LEFT JOIN a_class cl ON cl.id = ce.class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      LEFT JOIN a_periode pe ON pe.id = ce.periode_id
      LEFT JOIN "database".db_province pr ON pr.id = s.province_id
      LEFT JOIN "database".db_city ci ON ci.id = s.city_id
      LEFT JOIN "database".db_district di ON di.id = s.district_id
      LEFT JOIN "database".db_village vi ON vi.id = s.village_id
      LEFT JOIN LATERAL (
        SELECT
          sf.father_name,
          sf.father_nik,
          sf.father_birth_place,
          sf.father_birth_date,
          sf.father_phone,
          sf.mother_name,
          sf.mother_nik,
          sf.mother_birth_place,
          sf.mother_birth_date,
          sf.mother_phone
        FROM "database".u_student_families sf
        WHERE sf.student_id = u.id
        ORDER BY sf.id DESC
        LIMIT 1
      ) fam ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', ss.id,
            'name', ss.name,
            'gender', ss.gender,
            'birth_date', ss.birth_date
          )
          ORDER BY ss.birth_date ASC NULLS LAST, ss.id ASC
        ) AS siblings
        FROM "database".u_student_siblings ss
        WHERE ss.student_id = u.id
      ) sib ON true
      WHERE u.role = 'student'
        AND s.homebase_id = $1
        AND ($2 = '' OR u.full_name ILIKE $3 OR s.nis ILIKE $3 OR s.nisn ILIKE $3)
        AND ($4 = '' OR gr.id = $4::integer)
        AND ($5 = '' OR cl.id = $5::integer)
        AND ce.periode_id = $6
        AND ($7::boolean = false OR cl.id = ANY($8::int[]))
    `;

    const [dataResult, countResult, summaryResult] = await Promise.all([
      pool.query(dataQuery, [
        homebaseId,
        search,
        `%${search}%`,
        gradeId,
        classFilterEnabled ? classId : "",
        activePeriodeId,
        limitNum,
        offset,
        isHomeroomScope,
        homeroomClassIds,
      ]),
      pool.query(countQuery, [
        homebaseId,
        search,
        `%${search}%`,
        gradeId,
        classFilterEnabled ? classId : "",
        activePeriodeId,
        isHomeroomScope,
        homeroomClassIds,
      ]),
      pool.query(summaryQuery, [
        homebaseId,
        search,
        `%${search}%`,
        gradeId,
        classFilterEnabled ? classId : "",
        activePeriodeId,
        isHomeroomScope,
        homeroomClassIds,
      ]),
    ]);

    const rowsWithCompletion = dataResult.rows.map((row) => {
      const completion = calculateCompletion(row);
      return {
        ...row,
        completion_percent: completion.completionPercent,
        completion_status: completion.isComplete ? "Terisi" : "Belum Terisi",
      };
    });

    const summaryRows = summaryResult.rows.map((row) => {
      const completion = calculateCompletion(row);
      return completion.completionPercent;
    });

    const totalStudents = summaryRows.length;
    const completeStudents = summaryRows.filter(
      (item) => item === 100,
    ).length;
    const incompleteStudents = totalStudents - completeStudents;
    const averageCompletion = totalStudents
      ? Math.round(
          summaryRows.reduce((total, item) => total + item, 0) / totalStudents,
        )
      : 0;

    const completeStudentsOnPage = rowsWithCompletion.filter(
      (item) => item.completion_percent === 100,
    ).length;

    const totalData = parseInt(countResult.rows[0]?.total || "0", 10);

    res.status(200).json({
      data: rowsWithCompletion,
      summary: {
        total_students: totalStudents,
        complete_students: completeStudents,
        incomplete_students: incompleteStudents,
        average_completion: averageCompletion,
        complete_students_on_page: completeStudentsOnPage,
        complete_percentage: totalStudents
          ? Math.round((completeStudents / totalStudents) * 100)
          : 0,
      },
      filters: filtersResult.rows[0],
      active_periode: {
        id: activePeriodeId,
        name: activePeriodeName,
      },
      teacher_scope: {
        is_homeroom: isHomeroomScope ? isHomeroom : true,
        classes: homeroomClasses,
      },
      meta: {
        page: pageNum,
        limit: limitNum,
        total_data: totalData,
        total_pages: Math.ceil(totalData / limitNum),
      },
    });
  }),
);

router.put(
  "/students/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;
    const studentId = parseInt(id, 10);

    if (!Number.isInteger(studentId)) {
      return res.status(400).json({ message: "ID siswa tidak valid." });
    }

    let ownershipResult;

    if (userRole === "teacher") {
      const activePeriode = await client.query(
        `SELECT id FROM a_periode WHERE is_active = true AND homebase_id = $1 LIMIT 1`,
        [homebaseId],
      );

      if (activePeriode.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "Tidak ada periode aktif untuk satuan ini." });
      }

      ownershipResult = await client.query(
        `
          SELECT u.id
          FROM u_users u
          JOIN u_students s ON s.user_id = u.id
          JOIN u_class_enrollments ce ON ce.student_id = u.id
          JOIN a_class c ON c.id = ce.class_id
          WHERE u.id = $1
            AND u.role = 'student'
            AND s.homebase_id = $2
            AND ce.periode_id = $3
            AND c.homeroom_teacher_id = $4
        `,
        [studentId, homebaseId, activePeriode.rows[0].id, userId],
      );
    } else {
      ownershipResult = await client.query(
        `
          SELECT u.id
          FROM u_users u
          JOIN u_students s ON s.user_id = u.id
          WHERE u.id = $1
            AND u.role = 'student'
            AND s.homebase_id = $2
        `,
        [studentId, homebaseId],
      );
    }

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ message: "Data siswa tidak ditemukan." });
    }

    await updateStudentProfileData(client, studentId, req.body);

    res.status(200).json({ message: "Data siswa berhasil diperbarui." });
  }),
);

router.get(
  "/student-profile",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const studentId = req.user.id;

    const query = `
      SELECT
        u.id AS student_id,
        u.full_name,
        u.gender,
        s.nis,
        s.nisn,
        s.birth_place,
        s.birth_date,
        s.height,
        s.weight,
        s.head_circumference,
        s.order_number,
        s.siblings_count,
        s.address,
        s.postal_code,
        hb.name AS education_unit,
        pe.name AS academic_year,
        cl.name AS class_name,
        gr.name AS grade_name,
        fam.father_name,
        fam.father_nik,
        fam.father_birth_place,
        fam.father_birth_date,
        fam.father_phone,
        fam.mother_name,
        fam.mother_nik,
        fam.mother_birth_place,
        fam.mother_birth_date,
        fam.mother_phone,
        COALESCE(sib.siblings, '[]'::json) AS siblings
      FROM u_users u
      JOIN u_students s ON s.user_id = u.id
      LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
      LEFT JOIN a_class cl ON cl.id = s.current_class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      LEFT JOIN a_periode pe ON pe.id = s.current_periode_id
      LEFT JOIN LATERAL (
        SELECT
          sf.father_name,
          sf.father_nik,
          sf.father_birth_place,
          sf.father_birth_date,
          sf.father_phone,
          sf.mother_name,
          sf.mother_nik,
          sf.mother_birth_place,
          sf.mother_birth_date,
          sf.mother_phone
        FROM "database".u_student_families sf
        WHERE sf.student_id = u.id
        ORDER BY sf.id DESC
        LIMIT 1
      ) fam ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', ss.id,
            'name', ss.name,
            'gender', ss.gender,
            'birth_date', ss.birth_date
          )
          ORDER BY ss.birth_date ASC NULLS LAST, ss.id ASC
        ) AS siblings
        FROM "database".u_student_siblings ss
        WHERE ss.student_id = u.id
      ) sib ON true
      WHERE u.id = $1
        AND u.role = 'student'
      LIMIT 1
    `;

    const result = await pool.query(query, [studentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Data siswa tidak ditemukan." });
    }

    const row = result.rows[0];
    const completion = calculateCompletion(row);

    res.status(200).json({
      data: {
        ...row,
        completion_percent: completion.completionPercent,
        completion_status: completion.isComplete ? "Terisi" : "Belum Terisi",
      },
    });
  }),
);

router.put(
  "/student-profile",
  authorize("student"),
  withTransaction(async (req, res, client) => {
    const studentId = req.user.id;

    const ownershipResult = await client.query(
      `
        SELECT u.id
        FROM u_users u
        JOIN u_students s ON s.user_id = u.id
        WHERE u.id = $1
          AND u.role = 'student'
      `,
      [studentId],
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ message: "Data siswa tidak ditemukan." });
    }

    await updateStudentProfileData(client, studentId, req.body);
    res.status(200).json({ message: "Profil siswa berhasil diperbarui." });
  }),
);

router.get(
  "/students/:studentId/documents",
  authorize("satuan", "teacher", "student", "parent"),
  resolveStudentDocumentAccess(),
  withQuery(async (req, res, client) => {
    const studentId = parseInt(req.params.studentId, 10);
    const documents = await listStudentDocuments(client, studentId);

    res.status(200).json({
      data: documents,
      options: getStudentDocumentTypeOptions(),
    });
  }),
);

router.post(
  "/students/:studentId/documents",
  authorize("satuan", "teacher", "student", "parent"),
  resolveStudentDocumentAccess(),
  withTransaction(async (req, res, client) => {
    const studentId = parseInt(req.params.studentId, 10);
    let uploadedFilePath = null;

    try {
      await runStudentDocumentUpload(req, res);

      if (!req.file) {
        return res.status(400).json({ message: "File berkas wajib diunggah." });
      }

      uploadedFilePath = req.file.path;
      const documentType = normalizeText(req.body?.document_type).toLowerCase();
      if (!documentType || !STUDENT_DOCUMENT_TYPES[documentType]) {
        const invalidTypeError = new Error(
          "Jenis berkas tidak valid. Pilih Ijazah, Akta Kelahiran, atau Kartu Keluarga.",
        );
        invalidTypeError.statusCode = 400;
        throw invalidTypeError;
      }

      const existingDocument = await client.query(
        `
          SELECT id, file_path
          FROM "database".u_student_documents
          WHERE student_id = $1
            AND document_type = $2
          LIMIT 1
        `,
        [studentId, documentType],
      );

      let documentId;
      if (existingDocument.rows.length > 0) {
        documentId = existingDocument.rows[0].id;
        await client.query(
          `
            UPDATE "database".u_student_documents
            SET
              file_name = $1,
              original_file_name = $2,
              file_path = $3,
              mime_type = $4,
              file_size = $5,
              uploaded_by = $6,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
          `,
          [
            req.file.filename,
            req.file.originalname,
            req.file.path,
            req.file.mimetype,
            req.file.size,
            req.user.id,
            documentId,
          ],
        );
        removeFileIfExists(existingDocument.rows[0].file_path);
      } else {
        const insertResult = await client.query(
          `
            INSERT INTO "database".u_student_documents (
              student_id,
              document_type,
              file_name,
              original_file_name,
              file_path,
              mime_type,
              file_size,
              uploaded_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
          `,
          [
            studentId,
            documentType,
            req.file.filename,
            req.file.originalname,
            req.file.path,
            req.file.mimetype,
            req.file.size,
            req.user.id,
          ],
        );
        documentId = insertResult.rows[0].id;
      }

      const document = await getStudentDocumentById(client, studentId, documentId);

      res.status(existingDocument.rows.length > 0 ? 200 : 201).json({
        message: `Berkas ${STUDENT_DOCUMENT_TYPES[documentType]} berhasil disimpan.`,
        data: mapStudentDocumentRow(document),
      });
    } catch (error) {
      if (uploadedFilePath) {
        removeFileIfExists(uploadedFilePath);
      }

      if (error instanceof multer.MulterError) {
        error.statusCode = 400;
        if (error.code === "LIMIT_FILE_SIZE") {
          error.message = "Ukuran file melebihi 5 MB. Gunakan file yang lebih kecil.";
        } else {
          error.message = error.message || "Upload file gagal diproses.";
        }
      } else if (/Format file/i.test(error.message)) {
        error.statusCode = 400;
      } else {
        error.statusCode = error.statusCode || 500;
      }

      error.message = error.message || "Gagal mengunggah berkas siswa.";
      throw error;
    }
  }),
);

router.delete(
  "/students/:studentId/documents/:documentId",
  authorize("satuan", "teacher", "student", "parent"),
  resolveStudentDocumentAccess(),
  withTransaction(async (req, res, client) => {
    const studentId = parseInt(req.params.studentId, 10);
    const documentId = parseInt(req.params.documentId, 10);

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({ message: "ID dokumen tidak valid." });
    }

    const document = await getStudentDocumentById(client, studentId, documentId);

    if (!document) {
      return res.status(404).json({ message: "Dokumen siswa tidak ditemukan." });
    }

    await client.query(`DELETE FROM "database".u_student_documents WHERE id = $1`, [documentId]);
    removeFileIfExists(document.file_path);

    res.status(200).json({
      message: `Berkas ${STUDENT_DOCUMENT_TYPES[document.document_type] || "siswa"} berhasil dihapus.`,
    });
  }),
);

router.get(
  "/students/:studentId/documents/:documentId/download",
  authorize("satuan", "teacher", "student", "parent"),
  resolveStudentDocumentAccess(),
  withQuery(async (req, res, client) => {
    const studentId = parseInt(req.params.studentId, 10);
    const documentId = parseInt(req.params.documentId, 10);

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({ message: "ID dokumen tidak valid." });
    }

    const document = await getStudentDocumentById(client, studentId, documentId);

    if (!document) {
      return res.status(404).json({ message: "Dokumen siswa tidak ditemukan." });
    }

    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ message: "File dokumen tidak ditemukan di server." });
    }

    res.download(document.file_path, document.file_name);
  }),
);

router.get(
  "/parents/reference/students",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    try {
      const accessScope = await getParentAccessScope({
        db: pool,
        user: req.user,
        scope: req.query.scope || "all",
      });

      const result = await pool.query(
        `
          SELECT DISTINCT
            u.id AS student_id,
            u.full_name,
            s.nis,
            cl.name AS class_name,
            gr.name AS grade_name
          FROM u_users u
          JOIN u_students s ON s.user_id = u.id
          JOIN u_class_enrollments ce
            ON ce.student_id = u.id
           AND ce.periode_id = $3
          LEFT JOIN a_class cl ON cl.id = ce.class_id
          LEFT JOIN a_grade gr ON gr.id = cl.grade_id
          LEFT JOIN u_parents p ON p.student_id = u.id
          WHERE u.role = 'student'
            AND s.homebase_id = $1
            AND ($2::boolean = false OR ce.class_id = ANY($4::int[]))
            AND p.user_id IS NULL
          ORDER BY u.full_name ASC
        `,
        [
          accessScope.homebaseId,
          accessScope.restrictToHomeroom,
          accessScope.activePeriodeId,
          accessScope.classIds,
        ],
      );

      res.status(200).json({ data: result.rows });
    } catch (error) {
      res.status(403).json({ message: error.message || "Akses ditolak." });
    }
  }),
);

router.get(
  "/parents",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    try {
      const accessScope = await getParentAccessScope({
        db: pool,
        user: req.user,
        scope: req.query.scope || "all",
      });
      const homebaseId = accessScope.homebaseId;
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
      const offset = (page - 1) * limit;
      const search = normalizeText(req.query.search);
      const searchValue = normalizeSearch(search);

      const countResult = await pool.query(
        `
          SELECT COUNT(*) AS total
          FROM u_users u
          WHERE u.role = 'parent'
            AND EXISTS (
              SELECT 1
              FROM u_parents p
              JOIN u_students s ON s.user_id = p.student_id
              LEFT JOIN u_class_enrollments ce
                ON ce.student_id = s.user_id
               AND ($4::boolean = false OR ce.periode_id = $5)
              WHERE p.user_id = u.id
                AND s.homebase_id = $1
                AND ($4::boolean = false OR ce.class_id = ANY($6::int[]))
            )
            AND (
              $2 = ''
              OR LOWER(u.full_name) LIKE $3
              OR LOWER(u.username) LIKE $3
              OR EXISTS (
                SELECT 1
                FROM u_parents p2
                WHERE p2.user_id = u.id
                  AND (
                    LOWER(COALESCE(p2.email, '')) LIKE $3
                    OR LOWER(COALESCE(p2.phone, '')) LIKE $3
                  )
              )
              OR EXISTS (
                SELECT 1
                FROM u_parents p3
                JOIN u_students s3 ON s3.user_id = p3.student_id
                JOIN u_users su3 ON su3.id = s3.user_id
                LEFT JOIN u_class_enrollments ce3
                  ON ce3.student_id = s3.user_id
                 AND ($4::boolean = false OR ce3.periode_id = $5)
                WHERE p3.user_id = u.id
                  AND s3.homebase_id = $1
                  AND ($4::boolean = false OR ce3.class_id = ANY($6::int[]))
                  AND (
                    LOWER(su3.full_name) LIKE $3
                    OR LOWER(COALESCE(s3.nis, '')) LIKE $3
                  )
              )
            )
        `,
        [
          homebaseId,
          search,
          searchValue,
          accessScope.restrictToHomeroom,
          accessScope.activePeriodeId,
          accessScope.classIds,
        ],
      );

      const summaryResult = await pool.query(
        `
          SELECT
            COUNT(*) AS total_parents,
            COUNT(*) FILTER (WHERE u.is_active = true) AS active_parents,
            COALESCE(SUM(link_count.total_students), 0) AS total_student_links,
            COUNT(*) FILTER (WHERE link_count.total_students > 1) AS parents_with_multiple_students
          FROM u_users u
          JOIN LATERAL (
            SELECT COUNT(*) AS total_students
            FROM u_parents p
            JOIN u_students s ON s.user_id = p.student_id
            LEFT JOIN u_class_enrollments ce
              ON ce.student_id = s.user_id
             AND ($2::boolean = false OR ce.periode_id = $3)
            WHERE p.user_id = u.id
              AND s.homebase_id = $1
              AND ($2::boolean = false OR ce.class_id = ANY($4::int[]))
          ) link_count ON true
          WHERE u.role = 'parent'
            AND link_count.total_students > 0
        `,
        [
          homebaseId,
          accessScope.restrictToHomeroom,
          accessScope.activePeriodeId,
          accessScope.classIds,
        ],
      );

      const result = await pool.query(
        `
        SELECT
          u.id AS parent_user_id,
          u.username,
          u.full_name,
          u.is_active,
          contact.phone,
          contact.email,
          students.total_students,
          students.items AS students
        FROM u_users u
        JOIN LATERAL (
          SELECT
            MAX(p.phone) AS phone,
            MAX(p.email) AS email
          FROM u_parents p
          JOIN u_students s ON s.user_id = p.student_id
          LEFT JOIN u_class_enrollments ce
            ON ce.student_id = s.user_id
           AND ($4::boolean = false OR ce.periode_id = $5)
          WHERE p.user_id = u.id
            AND s.homebase_id = $1
            AND ($4::boolean = false OR ce.class_id = ANY($6::int[]))
        ) contact ON true
        JOIN LATERAL (
          SELECT
            COUNT(*) AS total_students,
            COALESCE(
              json_agg(
                json_build_object(
                  'student_id', su.id,
                  'full_name', su.full_name,
                  'nis', s.nis,
                  'class_name', cl.name,
                  'grade_name', gr.name
                )
                ORDER BY su.full_name ASC
              ),
              '[]'::json
            ) AS items
          FROM u_parents p
          JOIN u_students s ON s.user_id = p.student_id
          JOIN u_users su ON su.id = s.user_id
          LEFT JOIN u_class_enrollments ce
            ON ce.student_id = s.user_id
           AND ($4::boolean = false OR ce.periode_id = $5)
          LEFT JOIN a_class cl ON cl.id = COALESCE(ce.class_id, s.current_class_id)
          LEFT JOIN a_grade gr ON gr.id = cl.grade_id
          WHERE p.user_id = u.id
            AND s.homebase_id = $1
            AND ($4::boolean = false OR ce.class_id = ANY($6::int[]))
        ) students ON true
        WHERE u.role = 'parent'
          AND students.total_students > 0
          AND (
            $2 = ''
            OR LOWER(u.full_name) LIKE $3
            OR LOWER(u.username) LIKE $3
            OR LOWER(COALESCE(contact.email, '')) LIKE $3
            OR LOWER(COALESCE(contact.phone, '')) LIKE $3
            OR EXISTS (
              SELECT 1
              FROM u_parents p3
              JOIN u_students s3 ON s3.user_id = p3.student_id
              JOIN u_users su3 ON su3.id = s3.user_id
              LEFT JOIN u_class_enrollments ce3
                ON ce3.student_id = s3.user_id
               AND ($4::boolean = false OR ce3.periode_id = $5)
              WHERE p3.user_id = u.id
                AND s3.homebase_id = $1
                AND ($4::boolean = false OR ce3.class_id = ANY($6::int[]))
                AND (
                  LOWER(su3.full_name) LIKE $3
                  OR LOWER(COALESCE(s3.nis, '')) LIKE $3
                )
            )
          )
        ORDER BY u.full_name ASC
        LIMIT $7 OFFSET $8
      `,
        [
          homebaseId,
          search,
          searchValue,
          accessScope.restrictToHomeroom,
          accessScope.activePeriodeId,
          accessScope.classIds,
          limit,
          offset,
        ],
      );

      res.status(200).json({
        data: result.rows,
        summary: {
          total_parents: parseInt(summaryResult.rows[0]?.total_parents || "0", 10),
          active_parents: parseInt(summaryResult.rows[0]?.active_parents || "0", 10),
          total_student_links: parseInt(
            summaryResult.rows[0]?.total_student_links || "0",
            10,
          ),
          parents_with_multiple_students: parseInt(
            summaryResult.rows[0]?.parents_with_multiple_students || "0",
            10,
          ),
        },
        meta: {
          page,
          limit,
          total_data: parseInt(countResult.rows[0]?.total || "0", 10),
        },
      });
    } catch (error) {
      res.status(403).json({ message: error.message || "Akses ditolak." });
    }
  }),
);

router.post(
  "/parents",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    try {
      const accessScope = await getParentAccessScope({
        db: client,
        user: req.user,
        scope: req.body.scope || "all",
      });

      const result = await syncParentAccount({
        client,
        homebaseId: accessScope.homebaseId,
        username: req.body.username,
        password: req.body.password,
        fullName: req.body.full_name,
        phone: req.body.phone,
        email: req.body.email,
        isActive: req.body.is_active ?? true,
        studentIds: req.body.student_ids,
        classIds: accessScope.classIds,
        activePeriodeId: accessScope.activePeriodeId,
        restrictToHomeroom: accessScope.restrictToHomeroom,
      });

      res.status(201).json({
        message: "Akun orang tua berhasil dibuat.",
        data: result,
      });
    } catch (error) {
      res.status(400).json({ message: error.message || "Data tidak valid." });
    }
  }),
);

router.put(
  "/parents/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const parentUserId = parseInt(req.params.id, 10);

    if (!Number.isInteger(parentUserId)) {
      return res.status(400).json({ message: "ID akun orang tua tidak valid." });
    }

    try {
      const accessScope = await getParentAccessScope({
        db: client,
        user: req.user,
        scope: req.body.scope || "all",
      });

      await syncParentAccount({
        client,
        homebaseId: accessScope.homebaseId,
        parentUserId,
        username: req.body.username,
        password: req.body.password,
        fullName: req.body.full_name,
        phone: req.body.phone,
        email: req.body.email,
        isActive: req.body.is_active ?? true,
        studentIds: req.body.student_ids,
        classIds: accessScope.classIds,
        activePeriodeId: accessScope.activePeriodeId,
        restrictToHomeroom: accessScope.restrictToHomeroom,
      });

      res.status(200).json({ message: "Akun orang tua berhasil diperbarui." });
    } catch (error) {
      res.status(400).json({ message: error.message || "Data tidak valid." });
    }
  }),
);

router.delete(
  "/parents/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const parentUserId = parseInt(req.params.id, 10);

    if (!Number.isInteger(parentUserId)) {
      return res.status(400).json({ message: "ID akun orang tua tidak valid." });
    }

    const accessScope = await getParentAccessScope({
      db: client,
      user: req.user,
      scope: req.body?.scope || req.query?.scope || "all",
    });

    const existingParent = await client.query(
      `
        SELECT u.id
        FROM u_users u
        WHERE u.id = $1
          AND u.role = 'parent'
          AND EXISTS (
            SELECT 1
            FROM u_parents p
            JOIN u_students s ON s.user_id = p.student_id
            LEFT JOIN u_class_enrollments ce
              ON ce.student_id = s.user_id
             AND ($3::boolean = false OR ce.periode_id = $4)
            WHERE p.user_id = u.id
              AND s.homebase_id = $2
              AND ($3::boolean = false OR ce.class_id = ANY($5::int[]))
          )
      `,
      [
        parentUserId,
        accessScope.homebaseId,
        accessScope.restrictToHomeroom,
        accessScope.activePeriodeId,
        accessScope.classIds,
      ],
    );

    if (existingParent.rows.length === 0) {
      return res.status(404).json({ message: "Akun orang tua tidak ditemukan." });
    }

    const deletedLinks = await client.query(
      `
        DELETE FROM u_parents
        WHERE user_id = $1
        RETURNING student_id
      `,
      [parentUserId],
    );

    await client.query(`DELETE FROM u_users WHERE id = $1`, [parentUserId]);

    res.status(200).json({
      message: "Akun orang tua berhasil dihapus.",
      data: {
        released_student_ids: deletedLinks.rows.map((item) => item.student_id),
      },
    });
  }),
);

router.post(
  "/parents/import",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const parents = Array.isArray(req.body?.parents) ? req.body.parents : [];

    if (parents.length === 0) {
      return res.status(400).json({ message: "Data import orang tua kosong." });
    }

    const created = [];
    const updated = [];
    const failed = [];
    const accessScope = await getParentAccessScope({
      db: client,
      user: req.user,
      scope: req.body.scope || "all",
    });

    for (const [index, item] of parents.entries()) {
      try {
        const existingUser = await client.query(
          `
            SELECT id
            FROM u_users
            WHERE username = $1
              AND role = 'parent'
            LIMIT 1
          `,
          [normalizeText(item.username)],
        );

        const result = await syncParentAccount({
          client,
          homebaseId: accessScope.homebaseId,
          parentUserId: existingUser.rows[0]?.id || null,
          username: item.username,
          password: item.password,
          fullName: item.full_name,
          phone: item.phone,
          email: item.email,
          isActive: item.is_active ?? true,
          studentIds: item.student_ids,
          classIds: accessScope.classIds,
          activePeriodeId: accessScope.activePeriodeId,
          restrictToHomeroom: accessScope.restrictToHomeroom,
        });

        if (existingUser.rows.length > 0) {
          updated.push({
            row: index + 1,
            username: normalizeText(item.username),
            student_count: result.students.length,
          });
        } else {
          created.push({
            row: index + 1,
            username: normalizeText(item.username),
            student_count: result.students.length,
          });
        }
      } catch (error) {
        failed.push({
          row: index + 1,
          username: normalizeText(item.username),
          message: error.message || "Data gagal diproses.",
        });
      }
    }

    const messageText = `Import selesai. ${created.length} dibuat, ${updated.length} diperbarui, ${failed.length} gagal.`;

    res.status(200).json({
      message: messageText,
      data: { created, updated, failed },
    });
  }),
);

router.get(
  "/parent/students",
  authorize("parent"),
  withQuery(async (req, res, pool) => {
    const parentUserId = req.user.id;

    const query = `
      SELECT
        u.id AS student_id,
        u.full_name,
        u.gender,
        s.nis,
        s.nisn,
        s.birth_place,
        s.birth_date,
        s.height,
        s.weight,
        s.head_circumference,
        s.order_number,
        s.siblings_count,
        s.address,
        s.postal_code,
        hb.name AS education_unit,
        pe.name AS academic_year,
        cl.name AS class_name,
        gr.name AS grade_name,
        fam.father_name,
        fam.father_nik,
        fam.father_birth_place,
        fam.father_birth_date,
        fam.father_phone,
        fam.mother_name,
        fam.mother_nik,
        fam.mother_birth_place,
        fam.mother_birth_date,
        fam.mother_phone,
        COALESCE(sib.siblings, '[]'::json) AS siblings
      FROM u_parents p
      JOIN u_students s ON s.user_id = p.student_id
      JOIN u_users u ON u.id = s.user_id
      LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
      LEFT JOIN a_class cl ON cl.id = s.current_class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      LEFT JOIN a_periode pe ON pe.id = s.current_periode_id
      LEFT JOIN LATERAL (
        SELECT
          sf.father_name,
          sf.father_nik,
          sf.father_birth_place,
          sf.father_birth_date,
          sf.father_phone,
          sf.mother_name,
          sf.mother_nik,
          sf.mother_birth_place,
          sf.mother_birth_date,
          sf.mother_phone
        FROM "database".u_student_families sf
        WHERE sf.student_id = s.user_id
        ORDER BY sf.id DESC
        LIMIT 1
      ) fam ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', ss.id,
            'name', ss.name,
            'gender', ss.gender,
            'birth_date', ss.birth_date
          )
          ORDER BY ss.birth_date ASC NULLS LAST, ss.id ASC
        ) AS siblings
        FROM "database".u_student_siblings ss
        WHERE ss.student_id = s.user_id
      ) sib ON true
      WHERE p.user_id = $1
      ORDER BY u.full_name ASC
    `;

    const result = await pool.query(query, [parentUserId]);
    const data = result.rows.map((row) => {
      const completion = calculateCompletion(row);
      return {
        ...row,
        completion_percent: completion.completionPercent,
        completion_status: completion.isComplete ? "Terisi" : "Belum Terisi",
      };
    });

    res.status(200).json({ data });
  }),
);

router.put(
  "/parent/students/:studentId",
  authorize("parent"),
  withTransaction(async (req, res, client) => {
    const parentUserId = req.user.id;
    const studentId = parseInt(req.params.studentId, 10);

    if (!Number.isInteger(studentId)) {
      return res.status(400).json({ message: "ID siswa tidak valid." });
    }

    const ownership = await client.query(
      `
        SELECT 1
        FROM u_parents p
        WHERE p.user_id = $1
          AND p.student_id = $2
        LIMIT 1
      `,
      [parentUserId, studentId],
    );

    if (ownership.rows.length === 0) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses untuk memperbarui data siswa ini.",
      });
    }

    await updateStudentProfileData(client, studentId, req.body);
    res.status(200).json({ message: "Data siswa berhasil diperbarui." });
  }),
);
export default router;
