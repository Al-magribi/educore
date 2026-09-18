import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  parseAmount,
  parseOptionalInt,
  resolveScopedHomebaseId,
} from "./financeHelpers.js";
import { buildHonorariumPreview } from "../../services/finance/honorariumPreview.js";

const router = Router();

const HONOR_ROLES = ["keuangan", "pusat", "finance"];

const DEFAULT_UNITS = [
  { name: "Yayasan", code: "YAYASAN", sort_order: 1 },
  { name: "Guru", code: "GURU", sort_order: 2 },
  { name: "Tata Usaha", code: "TATA_USAHA", sort_order: 3 },
];

const DEFAULT_RATES = [
  {
    code: "TEACHING_RATE",
    name: "Rate per Jam Mengajar",
    amount: 45000,
    description: "Honor mengajar per jam / sesi",
    sort_order: 1,
  },
  {
    code: "TRANSPORT_DAILY",
    name: "Transport Harian",
    amount: 10000,
    description: "Tunjangan transport per hari hadir",
    sort_order: 2,
  },
  {
    code: "HOMEROOM_ALLOWANCE",
    name: "Honor Wali Kelas",
    amount: 150000,
    description: "Tunjangan wali kelas per bulan",
    sort_order: 3,
  },
];

const HONOR_SCHEMA_VERSION = 4;
let honorSchemaVersion = 0;
let honorSchemaReadyPromise = null;

const ensureHonorTables = async (db) => {
  if (honorSchemaVersion >= HONOR_SCHEMA_VERSION) {
    return;
  }

  if (
    honorSchemaVersion > 0 &&
    honorSchemaVersion < HONOR_SCHEMA_VERSION
  ) {
    honorSchemaReadyPromise = null;
  }

  if (!honorSchemaReadyPromise) {
    honorSchemaReadyPromise = (async () => {
      await db.query(`CREATE SCHEMA IF NOT EXISTS finance`);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.honor_unit (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          code VARCHAR(50),
          sort_order INT NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT honor_unit_name_not_blank CHECK (length(trim(name)) > 0)
        )
      `);

      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_unit_homebase_name
        ON finance.honor_unit (homebase_id, lower(trim(name)))
      `);

      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_unit_homebase_code
        ON finance.honor_unit (homebase_id, lower(trim(code)))
        WHERE code IS NOT NULL AND length(trim(code)) > 0
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_unit_homebase_sort
        ON finance.honor_unit (homebase_id, sort_order ASC, id ASC)
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.honor_position (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          unit_id BIGINT NOT NULL REFERENCES finance.honor_unit(id) ON DELETE CASCADE,
          name VARCHAR(120) NOT NULL,
          allowance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0
            CHECK (allowance_amount >= 0),
          base_salary NUMERIC(14, 2) NOT NULL DEFAULT 0
            CHECK (base_salary >= 0),
          sort_order INT NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT honor_position_name_not_blank CHECK (length(trim(name)) > 0)
        )
      `);

      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_position_unit_name
        ON finance.honor_position (unit_id, lower(trim(name)))
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_position_homebase_unit
        ON finance.honor_position (homebase_id, unit_id, sort_order ASC, id ASC)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_position_unit_active
        ON finance.honor_position (unit_id, is_active)
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.honor_rate_item (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          code VARCHAR(50) NOT NULL,
          name VARCHAR(120) NOT NULL,
          amount NUMERIC(14, 2) NOT NULL DEFAULT 0
            CHECK (amount >= 0),
          description TEXT,
          valid_from DATE,
          valid_to DATE,
          sort_order INT NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT honor_rate_item_code_not_blank CHECK (length(trim(code)) > 0),
          CONSTRAINT honor_rate_item_name_not_blank CHECK (length(trim(name)) > 0),
          CONSTRAINT honor_rate_item_valid_range
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
        )
      `);

      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_rate_item_homebase_code
        ON finance.honor_rate_item (homebase_id, lower(trim(code)))
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_rate_item_homebase_sort
        ON finance.honor_rate_item (homebase_id, sort_order ASC, id ASC)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_rate_item_active_window
        ON finance.honor_rate_item (homebase_id, is_active, valid_from, valid_to)
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.honor_staff (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          full_name VARCHAR(150) NOT NULL,
          nip VARCHAR(50),
          phone VARCHAR(30),
          email VARCHAR(120),
          notes TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT honor_staff_name_not_blank CHECK (length(trim(full_name)) > 0)
        )
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_staff_homebase_name
        ON finance.honor_staff (homebase_id, lower(trim(full_name)))
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_staff_homebase_active
        ON finance.honor_staff (homebase_id, is_active)
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.honor_assignment (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          position_id BIGINT NOT NULL REFERENCES finance.honor_position(id) ON DELETE RESTRICT,
          person_type VARCHAR(20) NOT NULL
            CHECK (person_type IN ('teacher', 'staff')),
          teacher_id INT REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
          staff_id BIGINT REFERENCES finance.honor_staff(id) ON DELETE CASCADE,
          valid_from DATE,
          valid_to DATE,
          notes TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT honor_assignment_person_check CHECK (
            (person_type = 'teacher' AND teacher_id IS NOT NULL AND staff_id IS NULL)
            OR (person_type = 'staff' AND staff_id IS NOT NULL AND teacher_id IS NULL)
          ),
          CONSTRAINT honor_assignment_valid_range
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
        )
      `);

      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_assignment_teacher_position
        ON finance.honor_assignment (position_id, teacher_id)
        WHERE person_type = 'teacher'
          AND teacher_id IS NOT NULL
          AND is_active = true
      `);

      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_assignment_staff_position
        ON finance.honor_assignment (position_id, staff_id)
        WHERE person_type = 'staff'
          AND staff_id IS NOT NULL
          AND is_active = true
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_assignment_homebase_active
        ON finance.honor_assignment (homebase_id, is_active, position_id)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_assignment_teacher
        ON finance.honor_assignment (teacher_id)
        WHERE teacher_id IS NOT NULL
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_assignment_staff
        ON finance.honor_assignment (staff_id)
        WHERE staff_id IS NOT NULL
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.honor_payroll_period (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          periode_id INT REFERENCES public.a_periode(id) ON DELETE SET NULL,
          year INT NOT NULL CHECK (year >= 2000 AND year <= 2100),
          month INT NOT NULL CHECK (month >= 1 AND month <= 12),
          jam_mode VARCHAR(10) NOT NULL DEFAULT 'mati'
            CHECK (jam_mode IN ('mati', 'hidup')),
          status VARCHAR(20) NOT NULL DEFAULT 'draft'
            CHECK (status IN ('draft', 'locked')),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          teaching_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (teaching_rate >= 0),
          transport_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (transport_rate >= 0),
          homeroom_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (homeroom_rate >= 0),
          grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
          notes TEXT,
          generated_at TIMESTAMP WITH TIME ZONE,
          locked_at TIMESTAMP WITH TIME ZONE,
          locked_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE (homebase_id, year, month)
        )
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_payroll_period_homebase
        ON finance.honor_payroll_period (homebase_id, year DESC, month DESC)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_payroll_period_status
        ON finance.honor_payroll_period (homebase_id, status)
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.honor_payroll_line (
          id BIGSERIAL PRIMARY KEY,
          payroll_id BIGINT NOT NULL REFERENCES finance.honor_payroll_period(id) ON DELETE CASCADE,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          assignment_id BIGINT REFERENCES finance.honor_assignment(id) ON DELETE SET NULL,
          unit_id BIGINT REFERENCES finance.honor_unit(id) ON DELETE SET NULL,
          position_id BIGINT REFERENCES finance.honor_position(id) ON DELETE SET NULL,
          person_type VARCHAR(20) NOT NULL
            CHECK (person_type IN ('teacher', 'staff')),
          teacher_id INT REFERENCES public.u_teachers(user_id) ON DELETE SET NULL,
          staff_id BIGINT REFERENCES finance.honor_staff(id) ON DELETE SET NULL,
          person_name VARCHAR(150) NOT NULL,
          person_nip VARCHAR(50),
          unit_name VARCHAR(100),
          unit_code VARCHAR(50),
          unit_sort_order INT NOT NULL DEFAULT 0,
          position_name VARCHAR(120),
          subjects_text TEXT,
          jam_mode VARCHAR(10) NOT NULL DEFAULT 'mati'
            CHECK (jam_mode IN ('mati', 'hidup')),
          jam_mati NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (jam_mati >= 0),
          jam_hidup NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (jam_hidup >= 0),
          jam_auto NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (jam_auto >= 0),
          jam_final NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (jam_final >= 0),
          jam_overridden BOOLEAN NOT NULL DEFAULT false,
          hadir_auto NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (hadir_auto >= 0),
          hadir_final NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (hadir_final >= 0),
          hadir_overridden BOOLEAN NOT NULL DEFAULT false,
          rp_per_jam NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (rp_per_jam >= 0),
          transport_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (transport_rate >= 0),
          is_homeroom BOOLEAN NOT NULL DEFAULT false,
          honor_mengajar NUMERIC(14, 2) NOT NULL DEFAULT 0,
          jumlah_transport NUMERIC(14, 2) NOT NULL DEFAULT 0,
          tunjangan_wali_kelas NUMERIC(14, 2) NOT NULL DEFAULT 0,
          tunjangan_jabatan NUMERIC(14, 2) NOT NULL DEFAULT 0,
          gapok NUMERIC(14, 2) NOT NULL DEFAULT 0,
          total_penerimaan NUMERIC(14, 2) NOT NULL DEFAULT 0,
          notes TEXT,
          sort_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_payroll_line_payroll
        ON finance.honor_payroll_line (payroll_id, unit_sort_order ASC, sort_order ASC, id ASC)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_honor_payroll_line_assignment
        ON finance.honor_payroll_line (assignment_id)
      `);
    })()
      .then(() => {
        honorSchemaVersion = HONOR_SCHEMA_VERSION;
      })
      .catch((error) => {
        honorSchemaReadyPromise = null;
        throw error;
      });
  }

  await honorSchemaReadyPromise;
};

export const prepareHonorHomebase = async (db, homebaseId, userId = null) => {
  await ensureHonorTables(db);
  await ensureDefaultUnits(db, homebaseId, userId);
  await ensureDefaultRates(db, homebaseId, userId);
};

const getAvailableHomebases = async (db, user) => {
  if (user.homebase_id) {
    const result = await db.query(
      `
        SELECT id, name, level
        FROM a_homebase
        WHERE id = $1
        LIMIT 1
      `,
      [user.homebase_id],
    );
    return result.rows;
  }

  const result = await db.query(
    `
      SELECT id, name, level
      FROM a_homebase
      ORDER BY name ASC
    `,
  );
  return result.rows;
};

const normalizeUnit = (row = {}) => ({
  ...row,
  id: Number(row.id || 0) || null,
  homebase_id: Number(row.homebase_id || 0) || null,
  sort_order: Number(row.sort_order || 0),
  position_count: Number(row.position_count || 0),
  is_active: Boolean(row.is_active),
  created_by: row.created_by ? Number(row.created_by) : null,
  updated_by: row.updated_by ? Number(row.updated_by) : null,
});

const normalizePosition = (row = {}) => ({
  ...row,
  id: Number(row.id || 0) || null,
  homebase_id: Number(row.homebase_id || 0) || null,
  unit_id: Number(row.unit_id || 0) || null,
  allowance_amount: Number(row.allowance_amount || 0),
  base_salary: Number(row.base_salary || 0),
  sort_order: Number(row.sort_order || 0),
  is_active: Boolean(row.is_active),
  created_by: row.created_by ? Number(row.created_by) : null,
  updated_by: row.updated_by ? Number(row.updated_by) : null,
});

const normalizeRate = (row = {}) => ({
  ...row,
  id: Number(row.id || 0) || null,
  homebase_id: Number(row.homebase_id || 0) || null,
  amount: Number(row.amount || 0),
  sort_order: Number(row.sort_order || 0),
  is_active: Boolean(row.is_active),
  created_by: row.created_by ? Number(row.created_by) : null,
  updated_by: row.updated_by ? Number(row.updated_by) : null,
});

const normalizeStaff = (row = {}) => ({
  ...row,
  id: Number(row.id || 0) || null,
  homebase_id: Number(row.homebase_id || 0) || null,
  is_active: Boolean(row.is_active),
  assignment_count: Number(row.assignment_count || 0),
  created_by: row.created_by ? Number(row.created_by) : null,
  updated_by: row.updated_by ? Number(row.updated_by) : null,
});

const normalizeAssignment = (row = {}) => ({
  ...row,
  id: Number(row.id || 0) || null,
  homebase_id: Number(row.homebase_id || 0) || null,
  position_id: Number(row.position_id || 0) || null,
  unit_id: row.unit_id ? Number(row.unit_id) : null,
  teacher_id: row.teacher_id ? Number(row.teacher_id) : null,
  staff_id: row.staff_id ? Number(row.staff_id) : null,
  allowance_amount: Number(row.allowance_amount || 0),
  base_salary: Number(row.base_salary || 0),
  is_active: Boolean(row.is_active),
  created_by: row.created_by ? Number(row.created_by) : null,
  updated_by: row.updated_by ? Number(row.updated_by) : null,
});

const normalizeTeacherOption = (row = {}) => ({
  id: Number(row.id || 0) || null,
  full_name: row.full_name || "",
  nip: row.nip || null,
  is_active: Boolean(row.is_active),
  person_type: "teacher",
});

const parseOptionalDate = (value) => {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return null;
  }

  return raw.slice(0, 10);
};

const normalizeCode = (value) => {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);

  return raw || null;
};

const ensureDefaultUnits = async (db, homebaseId, userId = null) => {
  const existing = await db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM finance.honor_unit
      WHERE homebase_id = $1
    `,
    [homebaseId],
  );

  if (Number(existing.rows[0]?.total || 0) > 0) {
    return { seeded: false };
  }

  for (const item of DEFAULT_UNITS) {
    await db.query(
      `
        INSERT INTO finance.honor_unit (
          homebase_id,
          name,
          code,
          sort_order,
          is_active,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, true, $5, $5)
      `,
      [homebaseId, item.name, item.code, item.sort_order, userId],
    );
  }

  return { seeded: true };
};

const ensureDefaultRates = async (db, homebaseId, userId = null) => {
  const existing = await db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM finance.honor_rate_item
      WHERE homebase_id = $1
    `,
    [homebaseId],
  );

  if (Number(existing.rows[0]?.total || 0) > 0) {
    return { seeded: false };
  }

  for (const item of DEFAULT_RATES) {
    await db.query(
      `
        INSERT INTO finance.honor_rate_item (
          homebase_id,
          code,
          name,
          amount,
          description,
          sort_order,
          is_active,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7)
      `,
      [
        homebaseId,
        item.code,
        item.name,
        item.amount,
        item.description,
        item.sort_order,
        userId,
      ],
    );
  }

  return { seeded: true };
};

const validateUnitPayload = (body = {}) => {
  const name = String(body.name || "").trim();
  const code = normalizeCode(body.code);
  const sortOrderRaw = parseOptionalInt(body.sort_order);
  const sortOrder = sortOrderRaw === null ? 0 : sortOrderRaw;
  const isActive =
    body.is_active === undefined ? true : Boolean(body.is_active);

  if (!name) {
    return { error: "Nama unit wajib diisi" };
  }

  if (name.length > 100) {
    return { error: "Nama unit maksimal 100 karakter" };
  }

  return {
    data: {
      name,
      code,
      sort_order: sortOrder,
      is_active: isActive,
    },
  };
};

const validatePositionPayload = (body = {}) => {
  const name = String(body.name || "").trim();
  const unitId = parseOptionalInt(body.unit_id);
  const allowanceAmount = parseAmount(
    body.allowance_amount === undefined || body.allowance_amount === ""
      ? 0
      : body.allowance_amount,
  );
  const baseSalary = parseAmount(
    body.base_salary === undefined || body.base_salary === ""
      ? 0
      : body.base_salary,
  );
  const sortOrderRaw = parseOptionalInt(body.sort_order);
  const sortOrder = sortOrderRaw === null ? 0 : sortOrderRaw;
  const isActive =
    body.is_active === undefined ? true : Boolean(body.is_active);

  if (!unitId) {
    return { error: "Unit jabatan wajib dipilih" };
  }

  if (!name) {
    return { error: "Nama jabatan wajib diisi" };
  }

  if (name.length > 120) {
    return { error: "Nama jabatan maksimal 120 karakter" };
  }

  if (allowanceAmount === null || allowanceAmount < 0) {
    return { error: "Tunjangan jabatan tidak valid" };
  }

  if (baseSalary === null || baseSalary < 0) {
    return { error: "Gaji pokok default tidak valid" };
  }

  return {
    data: {
      unit_id: unitId,
      name,
      allowance_amount: allowanceAmount,
      base_salary: baseSalary,
      sort_order: sortOrder,
      is_active: isActive,
    },
  };
};

const validateRatePayload = (body = {}) => {
  const code = normalizeCode(body.code);
  const name = String(body.name || "").trim();
  const amount = parseAmount(
    body.amount === undefined || body.amount === "" ? 0 : body.amount,
  );
  const description = String(body.description || "").trim() || null;
  const validFrom = parseOptionalDate(body.valid_from);
  const validTo = parseOptionalDate(body.valid_to);
  const sortOrderRaw = parseOptionalInt(body.sort_order);
  const sortOrder = sortOrderRaw === null ? 0 : sortOrderRaw;
  const isActive =
    body.is_active === undefined ? true : Boolean(body.is_active);

  if (!code) {
    return { error: "Kode item honor wajib diisi" };
  }

  if (!name) {
    return { error: "Nama item honor wajib diisi" };
  }

  if (name.length > 120) {
    return { error: "Nama item honor maksimal 120 karakter" };
  }

  if (amount === null || amount < 0) {
    return { error: "Nominal item honor tidak valid" };
  }

  if (validFrom && validTo && validTo < validFrom) {
    return { error: "Tanggal akhir tidak boleh sebelum tanggal mulai" };
  }

  if (body.valid_from && !validFrom) {
    return { error: "Tanggal mulai tidak valid (YYYY-MM-DD)" };
  }

  if (body.valid_to && !validTo) {
    return { error: "Tanggal akhir tidak valid (YYYY-MM-DD)" };
  }

  return {
    data: {
      code,
      name,
      amount,
      description,
      valid_from: validFrom,
      valid_to: validTo,
      sort_order: sortOrder,
      is_active: isActive,
    },
  };
};

const validateStaffPayload = (body = {}) => {
  const fullName = String(body.full_name || "").trim();
  const nip = String(body.nip || "").trim() || null;
  const phone = String(body.phone || "").trim() || null;
  const email = String(body.email || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;
  const isActive =
    body.is_active === undefined ? true : Boolean(body.is_active);

  if (!fullName) {
    return { error: "Nama tendik wajib diisi" };
  }

  if (fullName.length > 150) {
    return { error: "Nama tendik maksimal 150 karakter" };
  }

  if (email && email.length > 120) {
    return { error: "Email maksimal 120 karakter" };
  }

  return {
    data: {
      full_name: fullName,
      nip,
      phone,
      email,
      notes,
      is_active: isActive,
    },
  };
};

const validateAssignmentPayload = (body = {}) => {
  const positionId = parseOptionalInt(body.position_id);
  const personType = String(body.person_type || "")
    .trim()
    .toLowerCase();
  const teacherId = parseOptionalInt(body.teacher_id);
  const staffId = parseOptionalInt(body.staff_id);
  const validFrom = parseOptionalDate(body.valid_from);
  const validTo = parseOptionalDate(body.valid_to);
  const notes = String(body.notes || "").trim() || null;
  const isActive =
    body.is_active === undefined ? true : Boolean(body.is_active);

  if (!positionId) {
    return { error: "Jabatan wajib dipilih" };
  }

  if (!["teacher", "staff"].includes(personType)) {
    return { error: "Tipe personel harus teacher atau staff" };
  }

  if (personType === "teacher" && !teacherId) {
    return { error: "Guru wajib dipilih" };
  }

  if (personType === "staff" && !staffId) {
    return { error: "Tendik wajib dipilih" };
  }

  if (validFrom && validTo && validTo < validFrom) {
    return { error: "Tanggal akhir tidak boleh sebelum tanggal mulai" };
  }

  if (body.valid_from && !validFrom) {
    return { error: "Tanggal mulai tidak valid (YYYY-MM-DD)" };
  }

  if (body.valid_to && !validTo) {
    return { error: "Tanggal akhir tidak valid (YYYY-MM-DD)" };
  }

  return {
    data: {
      position_id: positionId,
      person_type: personType,
      teacher_id: personType === "teacher" ? teacherId : null,
      staff_id: personType === "staff" ? staffId : null,
      valid_from: validFrom,
      valid_to: validTo,
      notes,
      is_active: isActive,
    },
  };
};

const isUniqueViolation = (error) =>
  error?.code === "23505" ||
  String(error?.message || "").includes("uq_honor_unit") ||
  String(error?.message || "").includes("uq_honor_position") ||
  String(error?.message || "").includes("uq_honor_rate_item") ||
  String(error?.message || "").includes("uq_honor_assignment");

router.get(
  "/honorarium/options",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    await ensureHonorTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const homebases = await getAvailableHomebases(db, req.user);

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    await ensureDefaultUnits(db, homebaseId, req.user?.id || null);
    await ensureDefaultRates(db, homebaseId, req.user?.id || null);

    const [unitResult, rateResult, periodeResult] = await Promise.all([
      db.query(
        `
          SELECT
            u.*,
            COUNT(p.id)::int AS position_count
          FROM finance.honor_unit u
          LEFT JOIN finance.honor_position p ON p.unit_id = u.id
          WHERE u.homebase_id = $1
          GROUP BY u.id
          ORDER BY u.sort_order ASC, u.id ASC
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT *
          FROM finance.honor_rate_item
          WHERE homebase_id = $1
          ORDER BY sort_order ASC, id ASC
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT id, name, is_active
          FROM a_periode
          WHERE homebase_id = $1
          ORDER BY is_active DESC, created_at DESC
        `,
        [homebaseId],
      ),
    ]);

    res.json({
      status: "success",
      data: {
        homebases,
        selected_homebase_id: homebaseId,
        units: unitResult.rows.map(normalizeUnit),
        rates: rateResult.rows.map(normalizeRate),
        periodes: periodeResult.rows.map((item) => ({
          ...item,
          id: Number(item.id),
          is_default: Boolean(item.is_active),
        })),
        default_units: DEFAULT_UNITS,
        default_rates: DEFAULT_RATES,
      },
    });
  }),
);

router.get(
  "/honorarium/units",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    await ensureHonorTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const activeOnly = String(req.query.active_only || "") === "1";

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    await ensureDefaultUnits(db, homebaseId, req.user?.id || null);

    const params = [homebaseId];
    let whereClause = `WHERE u.homebase_id = $1`;

    if (activeOnly) {
      whereClause += ` AND u.is_active = true`;
    }

    const result = await db.query(
      `
        SELECT
          u.*,
          COUNT(p.id)::int AS position_count
        FROM finance.honor_unit u
        LEFT JOIN finance.honor_position p ON p.unit_id = u.id
        ${whereClause}
        GROUP BY u.id
        ORDER BY u.sort_order ASC, u.id ASC
      `,
      params,
    );

    res.json({
      status: "success",
      data: result.rows.map(normalizeUnit),
    });
  }),
);

router.post(
  "/honorarium/units",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const validated = validateUnitPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    try {
      const result = await client.query(
        `
          INSERT INTO finance.honor_unit (
            homebase_id,
            name,
            code,
            sort_order,
            is_active,
            created_by,
            updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $6)
          RETURNING id
        `,
        [
          homebaseId,
          validated.data.name,
          validated.data.code,
          validated.data.sort_order,
          validated.data.is_active,
          req.user.id,
        ],
      );

      res.status(201).json({
        status: "success",
        message: "Unit honorarium berhasil ditambahkan",
        data: { id: Number(result.rows[0].id) },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(400).json({
          message: "Nama atau kode unit sudah digunakan di satuan ini",
        });
      }
      throw error;
    }
  }),
);

router.put(
  "/honorarium/units/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const unitId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!unitId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const validated = validateUnitPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    try {
      const result = await client.query(
        `
          UPDATE finance.honor_unit
          SET
            name = $1,
            code = $2,
            sort_order = $3,
            is_active = $4,
            updated_by = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
            AND homebase_id = $7
          RETURNING id
        `,
        [
          validated.data.name,
          validated.data.code,
          validated.data.sort_order,
          validated.data.is_active,
          req.user.id,
          unitId,
          homebaseId,
        ],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Unit tidak ditemukan" });
      }

      res.json({
        status: "success",
        message: "Unit honorarium berhasil diperbarui",
        data: { id: Number(result.rows[0].id) },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(400).json({
          message: "Nama atau kode unit sudah digunakan di satuan ini",
        });
      }
      throw error;
    }
  }),
);

router.delete(
  "/honorarium/units/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const unitId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!unitId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const positionCheck = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM finance.honor_position
        WHERE unit_id = $1
          AND homebase_id = $2
      `,
      [unitId, homebaseId],
    );

    if (Number(positionCheck.rows[0]?.total || 0) > 0) {
      return res.status(400).json({
        message:
          "Unit masih memiliki jabatan. Hapus atau pindahkan jabatan terlebih dahulu.",
      });
    }

    const result = await client.query(
      `
        DELETE FROM finance.honor_unit
        WHERE id = $1
          AND homebase_id = $2
        RETURNING id
      `,
      [unitId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Unit tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Unit honorarium berhasil dihapus",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

router.get(
  "/honorarium/positions",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    await ensureHonorTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const unitId = parseOptionalInt(req.query.unit_id);
    const activeOnly = String(req.query.active_only || "") === "1";

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const params = [homebaseId];
    let whereClause = `WHERE p.homebase_id = $1`;

    if (unitId) {
      params.push(unitId);
      whereClause += ` AND p.unit_id = $${params.length}`;
    }

    if (activeOnly) {
      whereClause += ` AND p.is_active = true`;
    }

    const result = await db.query(
      `
        SELECT
          p.*,
          u.name AS unit_name,
          u.code AS unit_code
        FROM finance.honor_position p
        INNER JOIN finance.honor_unit u ON u.id = p.unit_id
        ${whereClause}
        ORDER BY u.sort_order ASC, p.sort_order ASC, p.id ASC
      `,
      params,
    );

    res.json({
      status: "success",
      data: result.rows.map(normalizePosition),
    });
  }),
);

router.post(
  "/honorarium/positions",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const validated = validatePositionPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const unitCheck = await client.query(
      `
        SELECT id
        FROM finance.honor_unit
        WHERE id = $1
          AND homebase_id = $2
        LIMIT 1
      `,
      [validated.data.unit_id, homebaseId],
    );

    if (unitCheck.rowCount === 0) {
      return res.status(400).json({
        message: "Unit tidak valid untuk satuan ini",
      });
    }

    try {
      const result = await client.query(
        `
          INSERT INTO finance.honor_position (
            homebase_id,
            unit_id,
            name,
            allowance_amount,
            base_salary,
            sort_order,
            is_active,
            created_by,
            updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
          RETURNING id
        `,
        [
          homebaseId,
          validated.data.unit_id,
          validated.data.name,
          validated.data.allowance_amount,
          validated.data.base_salary,
          validated.data.sort_order,
          validated.data.is_active,
          req.user.id,
        ],
      );

      res.status(201).json({
        status: "success",
        message: "Jabatan berhasil ditambahkan",
        data: { id: Number(result.rows[0].id) },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(400).json({
          message: "Nama jabatan sudah digunakan di unit ini",
        });
      }
      throw error;
    }
  }),
);

router.put(
  "/honorarium/positions/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const positionId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!positionId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const validated = validatePositionPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const unitCheck = await client.query(
      `
        SELECT id
        FROM finance.honor_unit
        WHERE id = $1
          AND homebase_id = $2
        LIMIT 1
      `,
      [validated.data.unit_id, homebaseId],
    );

    if (unitCheck.rowCount === 0) {
      return res.status(400).json({
        message: "Unit tidak valid untuk satuan ini",
      });
    }

    try {
      const result = await client.query(
        `
          UPDATE finance.honor_position
          SET
            unit_id = $1,
            name = $2,
            allowance_amount = $3,
            base_salary = $4,
            sort_order = $5,
            is_active = $6,
            updated_by = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
            AND homebase_id = $9
          RETURNING id
        `,
        [
          validated.data.unit_id,
          validated.data.name,
          validated.data.allowance_amount,
          validated.data.base_salary,
          validated.data.sort_order,
          validated.data.is_active,
          req.user.id,
          positionId,
          homebaseId,
        ],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Jabatan tidak ditemukan" });
      }

      res.json({
        status: "success",
        message: "Jabatan berhasil diperbarui",
        data: { id: Number(result.rows[0].id) },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(400).json({
          message: "Nama jabatan sudah digunakan di unit ini",
        });
      }
      throw error;
    }
  }),
);

router.delete(
  "/honorarium/positions/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const positionId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!positionId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const assignmentCheck = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM finance.honor_assignment
        WHERE position_id = $1
          AND homebase_id = $2
      `,
      [positionId, homebaseId],
    );

    if (Number(assignmentCheck.rows[0]?.total || 0) > 0) {
      return res.status(400).json({
        message:
          "Jabatan masih dipakai assignment personel. Hapus assignment terlebih dahulu.",
      });
    }

    const result = await client.query(
      `
        DELETE FROM finance.honor_position
        WHERE id = $1
          AND homebase_id = $2
        RETURNING id
      `,
      [positionId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Jabatan tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Jabatan berhasil dihapus",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

router.get(
  "/honorarium/rates",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    await ensureHonorTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const activeOnly = String(req.query.active_only || "") === "1";

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    await ensureDefaultRates(db, homebaseId, req.user?.id || null);

    const params = [homebaseId];
    let whereClause = `WHERE homebase_id = $1`;

    if (activeOnly) {
      whereClause += ` AND is_active = true`;
    }

    const result = await db.query(
      `
        SELECT *
        FROM finance.honor_rate_item
        ${whereClause}
        ORDER BY sort_order ASC, id ASC
      `,
      params,
    );

    res.json({
      status: "success",
      data: result.rows.map(normalizeRate),
    });
  }),
);

router.get(
  "/honorarium/rates/active",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    await ensureHonorTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const asOf =
      parseOptionalDate(req.query.as_of) ||
      new Date().toISOString().slice(0, 10);

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    await ensureDefaultRates(db, homebaseId, req.user?.id || null);

    const result = await db.query(
      `
        SELECT *
        FROM finance.honor_rate_item
        WHERE homebase_id = $1
          AND is_active = true
          AND (valid_from IS NULL OR valid_from <= $2::date)
          AND (valid_to IS NULL OR valid_to >= $2::date)
        ORDER BY sort_order ASC, id ASC
      `,
      [homebaseId, asOf],
    );

    const rates = result.rows.map(normalizeRate);
    const byCode = rates.reduce((accumulator, item) => {
      if (item.code) {
        accumulator[item.code] = item;
      }
      return accumulator;
    }, {});

    res.json({
      status: "success",
      data: {
        as_of: asOf,
        rates,
        by_code: byCode,
      },
    });
  }),
);

router.post(
  "/honorarium/rates",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const validated = validateRatePayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    try {
      const result = await client.query(
        `
          INSERT INTO finance.honor_rate_item (
            homebase_id,
            code,
            name,
            amount,
            description,
            valid_from,
            valid_to,
            sort_order,
            is_active,
            created_by,
            updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
          RETURNING id
        `,
        [
          homebaseId,
          validated.data.code,
          validated.data.name,
          validated.data.amount,
          validated.data.description,
          validated.data.valid_from,
          validated.data.valid_to,
          validated.data.sort_order,
          validated.data.is_active,
          req.user.id,
        ],
      );

      res.status(201).json({
        status: "success",
        message: "Item honor berhasil ditambahkan",
        data: { id: Number(result.rows[0].id) },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(400).json({
          message: "Kode item honor sudah digunakan di satuan ini",
        });
      }
      throw error;
    }
  }),
);

router.put(
  "/honorarium/rates/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const rateId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!rateId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const validated = validateRatePayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    try {
      const result = await client.query(
        `
          UPDATE finance.honor_rate_item
          SET
            code = $1,
            name = $2,
            amount = $3,
            description = $4,
            valid_from = $5,
            valid_to = $6,
            sort_order = $7,
            is_active = $8,
            updated_by = $9,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $10
            AND homebase_id = $11
          RETURNING id
        `,
        [
          validated.data.code,
          validated.data.name,
          validated.data.amount,
          validated.data.description,
          validated.data.valid_from,
          validated.data.valid_to,
          validated.data.sort_order,
          validated.data.is_active,
          req.user.id,
          rateId,
          homebaseId,
        ],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Item honor tidak ditemukan" });
      }

      res.json({
        status: "success",
        message: "Item honor berhasil diperbarui",
        data: { id: Number(result.rows[0].id) },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(400).json({
          message: "Kode item honor sudah digunakan di satuan ini",
        });
      }
      throw error;
    }
  }),
);

router.delete(
  "/honorarium/rates/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const rateId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!rateId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const result = await client.query(
      `
        DELETE FROM finance.honor_rate_item
        WHERE id = $1
          AND homebase_id = $2
        RETURNING id
      `,
      [rateId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Item honor tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Item honor berhasil dihapus",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

router.get(
  "/honorarium/people",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    await ensureHonorTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const activeOnly = String(req.query.active_only || "") !== "0";

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const teacherParams = [homebaseId];
    let teacherWhere = `WHERE t.homebase_id = $1`;
    if (activeOnly) {
      teacherWhere += ` AND u.is_active = true`;
    }

    const staffParams = [homebaseId];
    let staffWhere = `WHERE s.homebase_id = $1`;
    if (activeOnly) {
      staffWhere += ` AND s.is_active = true`;
    }

    const [teacherResult, staffResult] = await Promise.all([
      db.query(
        `
          SELECT
            t.user_id AS id,
            u.full_name,
            t.nip,
            u.is_active
          FROM u_teachers t
          INNER JOIN u_users u ON u.id = t.user_id
          ${teacherWhere}
          ORDER BY u.full_name ASC
        `,
        teacherParams,
      ),
      db.query(
        `
          SELECT
            s.id,
            s.full_name,
            s.nip,
            s.is_active
          FROM finance.honor_staff s
          ${staffWhere}
          ORDER BY s.full_name ASC
        `,
        staffParams,
      ),
    ]);

    res.json({
      status: "success",
      data: {
        teachers: teacherResult.rows.map(normalizeTeacherOption),
        staff: staffResult.rows.map((row) => ({
          ...normalizeStaff(row),
          person_type: "staff",
        })),
      },
    });
  }),
);

router.get(
  "/honorarium/staff",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    await ensureHonorTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const activeOnly = String(req.query.active_only || "") === "1";
    const search = String(req.query.search || "").trim();

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const params = [homebaseId];
    let whereClause = `WHERE s.homebase_id = $1`;

    if (activeOnly) {
      whereClause += ` AND s.is_active = true`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += `
        AND (
          s.full_name ILIKE $${params.length}
          OR COALESCE(s.nip, '') ILIKE $${params.length}
          OR COALESCE(s.phone, '') ILIKE $${params.length}
          OR COALESCE(s.email, '') ILIKE $${params.length}
        )
      `;
    }

    const result = await db.query(
      `
        SELECT
          s.*,
          COUNT(a.id)::int AS assignment_count
        FROM finance.honor_staff s
        LEFT JOIN finance.honor_assignment a
          ON a.staff_id = s.id
         AND a.person_type = 'staff'
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.full_name ASC, s.id ASC
      `,
      params,
    );

    res.json({
      status: "success",
      data: result.rows.map(normalizeStaff),
    });
  }),
);

router.post(
  "/honorarium/staff",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const validated = validateStaffPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const result = await client.query(
      `
        INSERT INTO finance.honor_staff (
          homebase_id,
          full_name,
          nip,
          phone,
          email,
          notes,
          is_active,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        RETURNING id
      `,
      [
        homebaseId,
        validated.data.full_name,
        validated.data.nip,
        validated.data.phone,
        validated.data.email,
        validated.data.notes,
        validated.data.is_active,
        req.user.id,
      ],
    );

    res.status(201).json({
      status: "success",
      message: "Tendik berhasil ditambahkan",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

router.put(
  "/honorarium/staff/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const staffId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!staffId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const validated = validateStaffPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const result = await client.query(
      `
        UPDATE finance.honor_staff
        SET
          full_name = $1,
          nip = $2,
          phone = $3,
          email = $4,
          notes = $5,
          is_active = $6,
          updated_by = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
          AND homebase_id = $9
        RETURNING id
      `,
      [
        validated.data.full_name,
        validated.data.nip,
        validated.data.phone,
        validated.data.email,
        validated.data.notes,
        validated.data.is_active,
        req.user.id,
        staffId,
        homebaseId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Tendik tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Tendik berhasil diperbarui",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

router.delete(
  "/honorarium/staff/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const staffId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!staffId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const assignmentCheck = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM finance.honor_assignment
        WHERE staff_id = $1
          AND homebase_id = $2
      `,
      [staffId, homebaseId],
    );

    if (Number(assignmentCheck.rows[0]?.total || 0) > 0) {
      return res.status(400).json({
        message:
          "Tendik masih memiliki assignment jabatan. Hapus assignment terlebih dahulu.",
      });
    }

    const result = await client.query(
      `
        DELETE FROM finance.honor_staff
        WHERE id = $1
          AND homebase_id = $2
        RETURNING id
      `,
      [staffId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Tendik tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Tendik berhasil dihapus",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

router.get(
  "/honorarium/assignments",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    await ensureHonorTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const unitId = parseOptionalInt(req.query.unit_id);
    const positionId = parseOptionalInt(req.query.position_id);
    const personType = String(req.query.person_type || "")
      .trim()
      .toLowerCase();
    const activeOnly = String(req.query.active_only || "") === "1";
    const search = String(req.query.search || "").trim();

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const params = [homebaseId];
    let whereClause = `WHERE a.homebase_id = $1`;

    if (unitId) {
      params.push(unitId);
      whereClause += ` AND u.id = $${params.length}`;
    }

    if (positionId) {
      params.push(positionId);
      whereClause += ` AND a.position_id = $${params.length}`;
    }

    if (personType === "teacher" || personType === "staff") {
      params.push(personType);
      whereClause += ` AND a.person_type = $${params.length}`;
    }

    if (activeOnly) {
      whereClause += ` AND a.is_active = true`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += `
        AND (
          COALESCE(tu.full_name, st.full_name, '') ILIKE $${params.length}
          OR p.name ILIKE $${params.length}
          OR u.name ILIKE $${params.length}
        )
      `;
    }

    const result = await db.query(
      `
        SELECT
          a.*,
          p.name AS position_name,
          p.allowance_amount,
          p.base_salary,
          u.id AS unit_id,
          u.name AS unit_name,
          u.code AS unit_code,
          CASE
            WHEN a.person_type = 'teacher' THEN tu.full_name
            ELSE st.full_name
          END AS person_name,
          CASE
            WHEN a.person_type = 'teacher' THEN t.nip
            ELSE st.nip
          END AS person_nip
        FROM finance.honor_assignment a
        INNER JOIN finance.honor_position p ON p.id = a.position_id
        INNER JOIN finance.honor_unit u ON u.id = p.unit_id
        LEFT JOIN u_teachers t ON t.user_id = a.teacher_id
        LEFT JOIN u_users tu ON tu.id = t.user_id
        LEFT JOIN finance.honor_staff st ON st.id = a.staff_id
        ${whereClause}
        ORDER BY u.sort_order ASC, p.sort_order ASC, person_name ASC, a.id ASC
      `,
      params,
    );

    res.json({
      status: "success",
      data: result.rows.map(normalizeAssignment),
    });
  }),
);

router.post(
  "/honorarium/assignments",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const validated = validateAssignmentPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const positionCheck = await client.query(
      `
        SELECT id
        FROM finance.honor_position
        WHERE id = $1
          AND homebase_id = $2
        LIMIT 1
      `,
      [validated.data.position_id, homebaseId],
    );

    if (positionCheck.rowCount === 0) {
      return res.status(400).json({
        message: "Jabatan tidak valid untuk satuan ini",
      });
    }

    if (validated.data.person_type === "teacher") {
      const teacherCheck = await client.query(
        `
          SELECT t.user_id
          FROM u_teachers t
          INNER JOIN u_users u ON u.id = t.user_id
          WHERE t.user_id = $1
            AND t.homebase_id = $2
          LIMIT 1
        `,
        [validated.data.teacher_id, homebaseId],
      );

      if (teacherCheck.rowCount === 0) {
        return res.status(400).json({
          message: "Guru tidak valid untuk satuan ini",
        });
      }
    } else {
      const staffCheck = await client.query(
        `
          SELECT id
          FROM finance.honor_staff
          WHERE id = $1
            AND homebase_id = $2
          LIMIT 1
        `,
        [validated.data.staff_id, homebaseId],
      );

      if (staffCheck.rowCount === 0) {
        return res.status(400).json({
          message: "Tendik tidak valid untuk satuan ini",
        });
      }
    }

    try {
      const result = await client.query(
        `
          INSERT INTO finance.honor_assignment (
            homebase_id,
            position_id,
            person_type,
            teacher_id,
            staff_id,
            valid_from,
            valid_to,
            notes,
            is_active,
            created_by,
            updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
          RETURNING id
        `,
        [
          homebaseId,
          validated.data.position_id,
          validated.data.person_type,
          validated.data.teacher_id,
          validated.data.staff_id,
          validated.data.valid_from,
          validated.data.valid_to,
          validated.data.notes,
          validated.data.is_active,
          req.user.id,
        ],
      );

      res.status(201).json({
        status: "success",
        message: "Assignment jabatan berhasil ditambahkan",
        data: { id: Number(result.rows[0].id) },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(400).json({
          message:
            "Personel ini sudah memiliki assignment aktif pada jabatan yang sama",
        });
      }
      throw error;
    }
  }),
);

router.put(
  "/honorarium/assignments/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const assignmentId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!assignmentId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const validated = validateAssignmentPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const positionCheck = await client.query(
      `
        SELECT id
        FROM finance.honor_position
        WHERE id = $1
          AND homebase_id = $2
        LIMIT 1
      `,
      [validated.data.position_id, homebaseId],
    );

    if (positionCheck.rowCount === 0) {
      return res.status(400).json({
        message: "Jabatan tidak valid untuk satuan ini",
      });
    }

    if (validated.data.person_type === "teacher") {
      const teacherCheck = await client.query(
        `
          SELECT t.user_id
          FROM u_teachers t
          WHERE t.user_id = $1
            AND t.homebase_id = $2
          LIMIT 1
        `,
        [validated.data.teacher_id, homebaseId],
      );

      if (teacherCheck.rowCount === 0) {
        return res.status(400).json({
          message: "Guru tidak valid untuk satuan ini",
        });
      }
    } else {
      const staffCheck = await client.query(
        `
          SELECT id
          FROM finance.honor_staff
          WHERE id = $1
            AND homebase_id = $2
          LIMIT 1
        `,
        [validated.data.staff_id, homebaseId],
      );

      if (staffCheck.rowCount === 0) {
        return res.status(400).json({
          message: "Tendik tidak valid untuk satuan ini",
        });
      }
    }

    try {
      const result = await client.query(
        `
          UPDATE finance.honor_assignment
          SET
            position_id = $1,
            person_type = $2,
            teacher_id = $3,
            staff_id = $4,
            valid_from = $5,
            valid_to = $6,
            notes = $7,
            is_active = $8,
            updated_by = $9,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $10
            AND homebase_id = $11
          RETURNING id
        `,
        [
          validated.data.position_id,
          validated.data.person_type,
          validated.data.teacher_id,
          validated.data.staff_id,
          validated.data.valid_from,
          validated.data.valid_to,
          validated.data.notes,
          validated.data.is_active,
          req.user.id,
          assignmentId,
          homebaseId,
        ],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Assignment tidak ditemukan" });
      }

      res.json({
        status: "success",
        message: "Assignment jabatan berhasil diperbarui",
        data: { id: Number(result.rows[0].id) },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(400).json({
          message:
            "Personel ini sudah memiliki assignment aktif pada jabatan yang sama",
        });
      }
      throw error;
    }
  }),
);

router.delete(
  "/honorarium/assignments/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    await ensureHonorTables(client);

    const assignmentId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!assignmentId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const result = await client.query(
      `
        DELETE FROM finance.honor_assignment
        WHERE id = $1
          AND homebase_id = $2
        RETURNING id
      `,
      [assignmentId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Assignment tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Assignment jabatan berhasil dihapus",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

router.get(
  "/honorarium/preview",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    await ensureHonorTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    await ensureDefaultUnits(db, homebaseId, req.user?.id || null);
    await ensureDefaultRates(db, homebaseId, req.user?.id || null);

    const now = new Date();
    const year = parseOptionalInt(req.query.year) || now.getFullYear();
    const month = parseOptionalInt(req.query.month) || now.getMonth() + 1;
    const jamMode =
      String(req.query.jam_mode || "mati").trim().toLowerCase() === "hidup"
        ? "hidup"
        : "mati";
    const periodeId = parseOptionalInt(req.query.periode_id);

    const preview = await buildHonorariumPreview({
      db,
      homebaseId,
      year,
      month,
      jamMode,
      periodeId,
    });

    if (preview.error) {
      return res.status(400).json({ message: preview.error });
    }

    res.json({
      status: "success",
      data: preview.data,
    });
  }),
);

export default router;
