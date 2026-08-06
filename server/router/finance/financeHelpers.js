export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

let financeSchemaReady = false;
let financeSchemaReadyPromise = null;

export const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
};

export const parseAmount = (value) => {
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
};

export const parseMonthArray = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => parseOptionalInt(item)).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [
      ...new Set(
        value
          .split(",")
          .map((item) => parseOptionalInt(item.trim()))
          .filter(Boolean),
      ),
    ];
  }

  return [];
};

export const parseIntArray = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => parseOptionalInt(item)).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [
      ...new Set(
        value
          .split(",")
          .map((item) => parseOptionalInt(item.trim()))
          .filter(Boolean),
      ),
    ];
  }

  return [];
};

export const formatBillingPeriod = (month) => {
  if (!month || month < 1 || month > 12) {
    return "-";
  }

  return MONTH_NAMES[month - 1];
};

const buildCodeFromName = (name, fallbackPrefix = "ITEM") => {
  const slug = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

  const suffix = Date.now().toString().slice(-6);
  return `${slug || fallbackPrefix}_${suffix}`;
};

const buildInvoiceNo = ({ homebaseId, studentId, periodeId, sourceType }) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return `INV-${sourceType.toUpperCase()}-${homebaseId}-${studentId}-${periodeId || 0}-${suffix}`;
};

export const resolveScopedHomebaseId = async (db, user, requestedHomebaseId) => {
  if (user.homebase_id) {
    return Number(user.homebase_id);
  }

  const result = requestedHomebaseId
    ? await db.query(`SELECT id FROM a_homebase WHERE id = $1 LIMIT 1`, [
        requestedHomebaseId,
      ])
    : await db.query(
        `
          SELECT id
          FROM a_homebase
          ORDER BY name ASC, id ASC
          LIMIT 1
        `,
      );

  return result.rowCount > 0 ? Number(result.rows[0].id) : null;
};

export const buildEnrollmentWhereClause = ({
  homebaseId,
  periodeId,
  gradeId,
  classId,
  studentId,
  search,
}) => {
  const params = [];
  let whereClause = `WHERE 1=1`;

  if (homebaseId) {
    params.push(homebaseId);
    whereClause += ` AND e.homebase_id = $${params.length}`;
  }

  if (periodeId) {
    params.push(periodeId);
    whereClause += ` AND e.periode_id = $${params.length}`;
  }

  if (gradeId) {
    params.push(gradeId);
    whereClause += ` AND g.id = $${params.length}`;
  }

  if (classId) {
    params.push(classId);
    whereClause += ` AND c.id = $${params.length}`;
  }

  if (studentId) {
    params.push(studentId);
    whereClause += ` AND s.user_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (u.full_name ILIKE $${params.length} OR COALESCE(s.nis, '') ILIKE $${params.length} OR COALESCE(s.nisn, '') ILIKE $${params.length})`;
  }

  return { params, whereClause };
};

export const ensureGradeAndPeriode = async (
  client,
  homebaseId,
  periodeId,
  gradeId,
) => {
  const periodeCheck = await client.query(
    `SELECT id, name FROM a_periode WHERE id = $1 AND homebase_id = $2`,
    [periodeId, homebaseId],
  );

  if (periodeCheck.rowCount === 0) {
    return { error: "Periode tidak ditemukan pada satuan ini" };
  }

  const gradeCheck = await client.query(
    `SELECT id, name FROM a_grade WHERE id = $1 AND homebase_id = $2`,
    [gradeId, homebaseId],
  );

  if (gradeCheck.rowCount === 0) {
    return { error: "Tingkat tidak ditemukan pada satuan ini" };
  }

  return { periode: periodeCheck.rows[0], grade: gradeCheck.rows[0] };
};

export const ensurePeriode = async (client, homebaseId, periodeId) => {
  const periodeCheck = await client.query(
    `SELECT id, name FROM a_periode WHERE id = $1 AND homebase_id = $2`,
    [periodeId, homebaseId],
  );

  if (periodeCheck.rowCount === 0) {
    return { error: "Periode tidak ditemukan pada satuan ini" };
  }

  return { periode: periodeCheck.rows[0] };
};

export const ensureStudentsInPeriode = async (
  client,
  homebaseId,
  periodeId,
  studentIds = [],
) => {
  const uniqueIds = [...new Set(studentIds.map((id) => Number(id)).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { error: "Minimal satu siswa wajib dipilih" };
  }

  const result = await client.query(
    `
      SELECT DISTINCT e.student_id
      FROM u_class_enrollments e
      WHERE e.homebase_id = $1
        AND e.periode_id = $2
        AND e.student_id = ANY($3::int[])
    `,
    [homebaseId, periodeId, uniqueIds],
  );

  if (result.rowCount !== uniqueIds.length) {
    return {
      error: "Ada siswa yang tidak terdaftar pada satuan dan periode yang dipilih",
    };
  }

  return { studentIds: uniqueIds };
};

export const ensureStudentsInHomebase = async (
  client,
  homebaseId,
  studentIds = [],
) => {
  const uniqueIds = [...new Set(studentIds.map((id) => Number(id)).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { error: "Minimal satu siswa wajib dipilih" };
  }

  const result = await client.query(
    `
      SELECT DISTINCT e.student_id
      FROM u_class_enrollments e
      WHERE e.homebase_id = $1
        AND e.student_id = ANY($2::int[])
    `,
    [homebaseId, uniqueIds],
  );

  if (result.rowCount !== uniqueIds.length) {
    return {
      error: "Ada siswa yang tidak terdaftar pada satuan yang dipilih",
    };
  }

  return { studentIds: uniqueIds };
};

export const ensureStudentScope = async (
  client,
  homebaseId,
  studentId,
  periodeId,
  gradeId,
) => {
  const studentResult = await client.query(
    `
      SELECT
        s.user_id AS student_id,
        u.full_name AS student_name,
        s.nis,
        c.id AS class_id,
        c.name AS class_name,
        g.id AS grade_id,
        g.name AS grade_name
      FROM u_class_enrollments e
      JOIN u_students s ON s.user_id = e.student_id
      JOIN u_users u ON u.id = s.user_id
      JOIN a_class c ON c.id = e.class_id
      JOIN a_grade g ON g.id = c.grade_id
      WHERE e.homebase_id = $1
        AND e.student_id = $2
        AND e.periode_id = $3
        AND g.id = $4
      LIMIT 1
    `,
    [homebaseId, studentId, periodeId, gradeId],
  );

  if (studentResult.rowCount === 0) {
    return {
      error: "Siswa tidak ditemukan pada kombinasi satuan, periode, dan tingkat tersebut",
    };
  }

  return studentResult.rows[0];
};

const runEnsureFinalFinanceTables = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.u_parent_students (
      id SERIAL PRIMARY KEY,
      parent_user_id INT NOT NULL REFERENCES public.u_users(id) ON DELETE CASCADE,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      relationship VARCHAR(50),
      is_primary BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_parent_student_owner'
          AND conrelid = 'public.u_parent_students'::regclass
      ) THEN
        ALTER TABLE public.u_parent_students
        DROP CONSTRAINT uq_parent_student_owner;
      END IF;
    END $$;
  `);

  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_parent_student'
          AND conrelid = 'public.u_parent_students'::regclass
      ) THEN
        ALTER TABLE public.u_parent_students
        DROP CONSTRAINT uq_parent_student;
      END IF;
    END $$;
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_u_parent_students_parent_student
    ON public.u_parent_students(parent_user_id, student_id)
  `);

  await db.query(`
    ALTER TABLE public.u_parent_students
    ADD COLUMN IF NOT EXISTS homebase_id INT REFERENCES public.a_homebase(id) ON DELETE CASCADE
  `);

  await db.query(`
    ALTER TABLE public.u_parent_students
    ADD COLUMN IF NOT EXISTS relationship VARCHAR(50)
  `);

  await db.query(`
    ALTER TABLE public.u_parent_students
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false
  `);

  await db.query(`
    ALTER TABLE public.u_parent_students
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  await db.query(`
    ALTER TABLE public.u_parent_students
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  await db.query(`
    UPDATE public.u_parent_students ups
    SET homebase_id = s.homebase_id
    FROM public.u_students s
    WHERE s.user_id = ups.student_id
      AND (
        ups.homebase_id IS NULL
        OR ups.homebase_id <> s.homebase_id
      )
  `);

  await db.query(`
    UPDATE public.u_parent_students ups
    SET
      homebase_id = src.homebase_id,
      relationship = COALESCE(ups.relationship, src.relationship),
      is_primary = ups.is_primary OR src.is_primary,
      updated_at = CURRENT_TIMESTAMP
    FROM (
      SELECT
        p.user_id AS parent_user_id,
        s.homebase_id,
        p.student_id,
        'wali'::varchar AS relationship,
        true AS is_primary
      FROM public.u_parents p
      JOIN public.u_users parent_user ON parent_user.id = p.user_id
      JOIN public.u_students s ON s.user_id = p.student_id
      WHERE p.student_id IS NOT NULL
        AND p.user_id IS NOT NULL
    ) AS src
    WHERE ups.parent_user_id = src.parent_user_id
      AND ups.student_id = src.student_id
  `);

  await db.query(`
    INSERT INTO public.u_parent_students (
      parent_user_id,
      homebase_id,
      student_id,
      relationship,
      is_primary
    )
    SELECT
      p.user_id,
      s.homebase_id,
      p.student_id,
      'wali',
      true
    FROM public.u_parents p
    JOIN public.u_users parent_user ON parent_user.id = p.user_id
    JOIN public.u_students s ON s.user_id = p.student_id
    WHERE p.student_id IS NOT NULL
      AND p.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.u_parent_students ups
        WHERE ups.parent_user_id = p.user_id
          AND ups.student_id = p.student_id
      )
  `);

  await db.query(`CREATE SCHEMA IF NOT EXISTS finance`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.fee_component (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT,
      category VARCHAR(20) NOT NULL CHECK (category IN ('spp', 'other', 'savings')),
      charge_type VARCHAR(20) NOT NULL CHECK (charge_type IN ('monthly', 'once', 'custom')),
      scope VARCHAR(20) NOT NULL DEFAULT 'grade'
        CHECK (scope IN ('grade', 'student')),
      is_savings BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by INT REFERENCES public.u_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (homebase_id, code)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.fee_rule (
      id BIGSERIAL PRIMARY KEY,
      component_id BIGINT NOT NULL REFERENCES finance.fee_component(id) ON DELETE CASCADE,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      grade_id INT REFERENCES public.a_grade(id) ON DELETE SET NULL,
      periode_id INT REFERENCES public.a_periode(id) ON DELETE SET NULL,
      billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'once', 'custom')),
      amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      valid_from DATE,
      valid_to DATE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by INT REFERENCES public.u_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.fee_rule_month (
      id BIGSERIAL PRIMARY KEY,
      fee_rule_id BIGINT NOT NULL REFERENCES finance.fee_rule(id) ON DELETE CASCADE,
      month_num SMALLINT NOT NULL CHECK (month_num BETWEEN 1 AND 12),
      UNIQUE (fee_rule_id, month_num)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.invoice (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id),
      student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      periode_id INT REFERENCES public.a_periode(id),
      invoice_no VARCHAR(60) NOT NULL UNIQUE,
      issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
      due_date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'issued'
        CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'cancelled', 'expired')),
      source_type VARCHAR(20) NOT NULL
        CHECK (source_type IN ('spp', 'other', 'mixed')),
      notes TEXT,
      created_by INT NOT NULL REFERENCES public.u_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.invoice_item (
      id BIGSERIAL PRIMARY KEY,
      invoice_id BIGINT NOT NULL REFERENCES finance.invoice(id) ON DELETE CASCADE,
      component_id BIGINT NOT NULL REFERENCES finance.fee_component(id),
      fee_rule_id BIGINT REFERENCES finance.fee_rule(id),
      bill_year SMALLINT,
      bill_month SMALLINT CHECK (bill_month BETWEEN 1 AND 12),
      description TEXT,
      qty NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
      unit_amount NUMERIC(14,2) NOT NULL CHECK (unit_amount >= 0),
      amount NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_amount) STORED,
      item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('spp', 'other')),
      reference_type VARCHAR(30),
      reference_id BIGINT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.payment_method (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('manual_cash', 'manual_bank', 'midtrans')),
      name VARCHAR(100) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.bank_account (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      payment_method_id BIGINT NOT NULL REFERENCES finance.payment_method(id) ON DELETE CASCADE,
      bank_name VARCHAR(100) NOT NULL,
      account_name VARCHAR(120) NOT NULL,
      account_number VARCHAR(60) NOT NULL,
      branch VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.payment (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id),
      student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      payer_user_id INT NOT NULL REFERENCES public.u_users(id),
      method_id BIGINT NOT NULL REFERENCES finance.payment_method(id),
      bank_account_id BIGINT REFERENCES finance.bank_account(id),
      payment_channel VARCHAR(50),
      payment_source VARCHAR(20) NOT NULL
        CHECK (payment_source IN ('parent_manual', 'admin_manual', 'midtrans')),
      payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
      status VARCHAR(20) NOT NULL
        CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired', 'cancelled', 'refunded')),
      reference_no VARCHAR(120),
      proof_url TEXT,
      notes TEXT,
      created_by INT REFERENCES public.u_users(id),
      verified_by INT REFERENCES public.u_users(id),
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.payment_allocation (
      id BIGSERIAL PRIMARY KEY,
      payment_id BIGINT NOT NULL REFERENCES finance.payment(id) ON DELETE CASCADE,
      invoice_item_id BIGINT NOT NULL REFERENCES finance.invoice_item(id) ON DELETE CASCADE,
      allocated_amount NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (payment_id, invoice_item_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.gateway_transaction (
      id BIGSERIAL PRIMARY KEY,
      payment_id BIGINT NOT NULL UNIQUE REFERENCES finance.payment(id) ON DELETE CASCADE,
      provider VARCHAR(30) NOT NULL DEFAULT 'midtrans',
      order_id VARCHAR(120) NOT NULL UNIQUE,
      transaction_id VARCHAR(120),
      transaction_status VARCHAR(40),
      fraud_status VARCHAR(40),
      payment_type VARCHAR(50),
      snap_token TEXT,
      snap_redirect_url TEXT,
      gross_amount NUMERIC(14,2),
      currency VARCHAR(10) DEFAULT 'IDR',
      expiry_time TIMESTAMPTZ,
      raw_response JSONB,
      webhook_payload JSONB,
      last_synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.payment_gateway_config (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      provider VARCHAR(30) NOT NULL DEFAULT 'midtrans',
      merchant_id VARCHAR(120) NOT NULL,
      client_key TEXT NOT NULL,
      server_key_encrypted TEXT NOT NULL,
      is_production BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      snap_enabled BOOLEAN NOT NULL DEFAULT true,
      va_fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_by INT REFERENCES public.u_users(id),
      updated_by INT REFERENCES public.u_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (homebase_id, provider)
    )
  `);

  await db.query(`
    ALTER TABLE finance.payment
    DROP CONSTRAINT IF EXISTS payment_status_check
  `);

  await db.query(`
    ALTER TABLE finance.payment
    DROP CONSTRAINT IF EXISTS finance_payment_status_check
  `);

  await db.query(`
    DO $$
    DECLARE
      constraint_row RECORD;
    BEGIN
      FOR constraint_row IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'finance.payment'::regclass
          AND contype = 'c'
          AND (
            conname ILIKE '%status%'
            OR pg_get_constraintdef(oid) ILIKE '%status%'
          )
      LOOP
        EXECUTE format(
          'ALTER TABLE finance.payment DROP CONSTRAINT %I',
          constraint_row.conname
        );
      END LOOP;

      UPDATE finance.payment
      SET status = CASE
        WHEN status = 'paid' THEN 'confirmed'
        WHEN status = 'failed' THEN 'rejected'
        ELSE status
      END
      WHERE status IN ('paid', 'failed');

      ALTER TABLE finance.payment
      ADD CONSTRAINT finance_payment_status_check
      CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired', 'cancelled', 'refunded'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.query(`
    ALTER TABLE finance.payment_gateway_config
    ADD COLUMN IF NOT EXISTS va_fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.finance_setting (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      officer_name VARCHAR(150),
      officer_signature_url TEXT,
      created_by INT REFERENCES public.u_users(id),
      updated_by INT REFERENCES public.u_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (homebase_id)
    )
  `);

  await db.query(`
    ALTER TABLE finance.bank_account
    ADD COLUMN IF NOT EXISTS homebase_id INT
  `);

  await db.query(`
    UPDATE finance.bank_account ba
    SET homebase_id = pm.homebase_id
    FROM finance.payment_method pm
    WHERE ba.payment_method_id = pm.id
      AND ba.homebase_id IS NULL
  `);

  await db.query(`
    ALTER TABLE finance.finance_setting
    ADD COLUMN IF NOT EXISTS officer_name VARCHAR(150)
  `);

  await db.query(`
    ALTER TABLE finance.finance_setting
    ADD COLUMN IF NOT EXISTS officer_signature_url TEXT
  `);

  await db.query(`
    ALTER TABLE finance.fee_component
    ADD COLUMN IF NOT EXISTS description TEXT
  `);

  await db.query(`
    ALTER TABLE finance.fee_component
    ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'grade'
  `);

  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE finance.fee_component
      ADD CONSTRAINT fee_component_scope_check
      CHECK (scope IN ('grade', 'student'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.query(`
    UPDATE finance.fee_component
    SET scope = 'grade'
    WHERE scope IS NULL OR scope = ''
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.fee_assignment (
      id BIGSERIAL PRIMARY KEY,
      component_id BIGINT NOT NULL REFERENCES finance.fee_component(id) ON DELETE CASCADE,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
      student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      amount NUMERIC(14,2) CHECK (amount IS NULL OR amount >= 0),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by INT REFERENCES public.u_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (component_id, periode_id, student_id)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_fee_assignment_scope
    ON finance.fee_assignment(homebase_id, periode_id, component_id, is_active)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_fee_assignment_student
    ON finance.fee_assignment(student_id, periode_id, is_active)
  `);

  // --- Scholarship (beasiswa) ---
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.scholarship (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      code VARCHAR(50),
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by INT REFERENCES public.u_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.scholarship_benefit (
      id BIGSERIAL PRIMARY KEY,
      scholarship_id BIGINT NOT NULL
        REFERENCES finance.scholarship(id) ON DELETE CASCADE,
      benefit_target VARCHAR(20) NOT NULL
        CHECK (benefit_target IN ('spp', 'other')),
      benefit_type VARCHAR(20) NOT NULL
        CHECK (benefit_type IN ('fixed', 'full')),
      amount NUMERIC(14,2)
        CHECK (amount IS NULL OR amount >= 0),
      component_id BIGINT REFERENCES finance.fee_component(id) ON DELETE CASCADE,
      periode_id INT REFERENCES public.a_periode(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (
        (benefit_type = 'full')
        OR (benefit_type = 'fixed' AND amount IS NOT NULL AND amount > 0)
      ),
      CHECK (
        (benefit_target = 'spp' AND component_id IS NULL)
        OR (benefit_target = 'other' AND component_id IS NOT NULL)
      )
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.scholarship_benefit_month (
      id BIGSERIAL PRIMARY KEY,
      benefit_id BIGINT NOT NULL
        REFERENCES finance.scholarship_benefit(id) ON DELETE CASCADE,
      periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
      month_num SMALLINT NOT NULL CHECK (month_num BETWEEN 1 AND 12),
      UNIQUE (benefit_id, periode_id, month_num)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.scholarship_student (
      id BIGSERIAL PRIMARY KEY,
      scholarship_id BIGINT NOT NULL
        REFERENCES finance.scholarship(id) ON DELETE CASCADE,
      student_id INT NOT NULL
        REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      notes TEXT,
      assigned_by INT REFERENCES public.u_users(id),
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (scholarship_id, student_id)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scholarship_homebase
    ON finance.scholarship(homebase_id, is_active)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scholarship_benefit_scholarship
    ON finance.scholarship_benefit(scholarship_id, benefit_target)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scholarship_benefit_month_lookup
    ON finance.scholarship_benefit_month(benefit_id, periode_id, month_num)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scholarship_student_lookup
    ON finance.scholarship_student(student_id, is_active)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scholarship_student_scholarship
    ON finance.scholarship_student(scholarship_id, is_active)
  `);

  await db.query(`
    ALTER TABLE finance.invoice_item
    ADD COLUMN IF NOT EXISTS bruto_amount NUMERIC(14,2)
  `);

  await db.query(`
    ALTER TABLE finance.invoice_item
    ADD COLUMN IF NOT EXISTS scholarship_cover NUMERIC(14,2) NOT NULL DEFAULT 0
  `);

  await db.query(`
    UPDATE finance.invoice_item
    SET bruto_amount = unit_amount
    WHERE bruto_amount IS NULL
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.invoice_item_scholarship (
      id BIGSERIAL PRIMARY KEY,
      invoice_item_id BIGINT NOT NULL
        REFERENCES finance.invoice_item(id) ON DELETE CASCADE,
      scholarship_id BIGINT NOT NULL
        REFERENCES finance.scholarship(id) ON DELETE CASCADE,
      benefit_id BIGINT
        REFERENCES finance.scholarship_benefit(id) ON DELETE SET NULL,
      cover_amount NUMERIC(14,2) NOT NULL CHECK (cover_amount >= 0),
      benefit_type VARCHAR(20) NOT NULL
        CHECK (benefit_type IN ('fixed', 'full')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (invoice_item_id, scholarship_id, benefit_id)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_invoice_item_scholarship_item
    ON finance.invoice_item_scholarship(invoice_item_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_invoice_item_scholarship_scholarship
    ON finance.invoice_item_scholarship(scholarship_id)
  `);
};

export const ensureFinalFinanceTables = async (db) => {
  if (financeSchemaReady) {
    return;
  }

  if (!financeSchemaReadyPromise) {
    financeSchemaReadyPromise = runEnsureFinalFinanceTables(db)
      .then(() => {
        financeSchemaReady = true;
      })
      .catch((error) => {
        financeSchemaReadyPromise = null;
        throw error;
      });
  }

  await financeSchemaReadyPromise;
};

/**
 * Kontrak resolver beasiswa (Tahap 0).
 * Dipakai Tahap 2+ saat membentuk due SPP/others.
 *
 * @param {object} db - pool atau client transaksi
 * @param {object} params
 * @param {number} params.homebaseId
 * @param {number} params.studentId
 * @param {'spp'|'other'} params.itemType
 * @param {number|null} [params.componentId] - wajib untuk other
 * @param {number|null} [params.periodeId] - wajib untuk spp; opsional filter other
 * @param {number|null} [params.billMonth] - wajib untuk spp (1-12)
 * @param {number} params.brutoAmount - nominal tarif sebelum beasiswa
 * @returns {Promise<{
 *   bruto: number,
 *   scholarship_cover: number,
 *   netto: number,
 *   breakdown: Array<{
 *     scholarship_id: number,
 *     scholarship_name: string,
 *     benefit_id: number,
 *     benefit_target: string,
 *     benefit_type: 'fixed'|'full',
 *     benefit_amount: number|null,
 *     cover_amount: number
 *   }>
 * }>}
 *
 * Aturan stack:
 * - Semua beasiswa aktif siswa diterapkan.
 * - Jika ada benefit `full` yang match → cover = bruto, netto = 0.
 * - Jika hanya `fixed` → jumlahkan nominal (FIFO), cap agar due >= 0.
 */
export const resolveScholarshipDue = async (
  db,
  {
    homebaseId,
    studentId,
    itemType,
    componentId = null,
    periodeId = null,
    billMonth = null,
    brutoAmount,
  },
) => {
  const bruto = Math.max(0, Number(brutoAmount) || 0);
  const normalizedType = itemType === "other" ? "other" : "spp";

  if (!homebaseId || !studentId || bruto <= 0) {
    return {
      bruto,
      scholarship_cover: 0,
      netto: bruto,
      breakdown: [],
    };
  }

  let benefitResult;

  if (normalizedType === "spp") {
    if (!periodeId || !billMonth) {
      return {
        bruto,
        scholarship_cover: 0,
        netto: bruto,
        breakdown: [],
      };
    }

    benefitResult = await db.query(
      `
        SELECT
          s.id AS scholarship_id,
          s.name AS scholarship_name,
          sb.id AS benefit_id,
          sb.benefit_target,
          sb.benefit_type,
          sb.amount AS benefit_amount
        FROM finance.scholarship_student ss
        JOIN finance.scholarship s
          ON s.id = ss.scholarship_id
        JOIN finance.scholarship_benefit sb
          ON sb.scholarship_id = s.id
        JOIN finance.scholarship_benefit_month sbm
          ON sbm.benefit_id = sb.id
        WHERE s.homebase_id = $1
          AND ss.student_id = $2
          AND ss.is_active = true
          AND s.is_active = true
          AND sb.benefit_target = 'spp'
          AND sbm.periode_id = $3
          AND sbm.month_num = $4
        ORDER BY
          CASE WHEN sb.benefit_type = 'full' THEN 0 ELSE 1 END,
          sb.id ASC
      `,
      [homebaseId, studentId, periodeId, billMonth],
    );
  } else {
    if (!componentId) {
      return {
        bruto,
        scholarship_cover: 0,
        netto: bruto,
        breakdown: [],
      };
    }

    benefitResult = await db.query(
      `
        SELECT
          s.id AS scholarship_id,
          s.name AS scholarship_name,
          sb.id AS benefit_id,
          sb.benefit_target,
          sb.benefit_type,
          sb.amount AS benefit_amount
        FROM finance.scholarship_student ss
        JOIN finance.scholarship s
          ON s.id = ss.scholarship_id
        JOIN finance.scholarship_benefit sb
          ON sb.scholarship_id = s.id
        WHERE s.homebase_id = $1
          AND ss.student_id = $2
          AND ss.is_active = true
          AND s.is_active = true
          AND sb.benefit_target = 'other'
          AND sb.component_id = $3
          AND (sb.periode_id IS NULL OR sb.periode_id = $4)
        ORDER BY
          CASE WHEN sb.benefit_type = 'full' THEN 0 ELSE 1 END,
          sb.id ASC
      `,
      [homebaseId, studentId, componentId, periodeId],
    );
  }

  const benefits = benefitResult.rows || [];
  if (benefits.length === 0) {
    return {
      bruto,
      scholarship_cover: 0,
      netto: bruto,
      breakdown: [],
    };
  }

  const fullBenefit = benefits.find((item) => item.benefit_type === "full");
  if (fullBenefit) {
    return {
      bruto,
      scholarship_cover: bruto,
      netto: 0,
      breakdown: [
        {
          scholarship_id: Number(fullBenefit.scholarship_id),
          scholarship_name: fullBenefit.scholarship_name,
          benefit_id: Number(fullBenefit.benefit_id),
          benefit_target: fullBenefit.benefit_target,
          benefit_type: "full",
          benefit_amount: null,
          cover_amount: bruto,
        },
      ],
    };
  }

  let remaining = bruto;
  const breakdown = [];

  for (const benefit of benefits) {
    const benefitAmount = Math.max(0, Number(benefit.benefit_amount) || 0);
    const coverAmount = Math.min(benefitAmount, remaining);
    remaining -= coverAmount;

    breakdown.push({
      scholarship_id: Number(benefit.scholarship_id),
      scholarship_name: benefit.scholarship_name,
      benefit_id: Number(benefit.benefit_id),
      benefit_target: benefit.benefit_target,
      benefit_type: "fixed",
      benefit_amount: benefitAmount,
      cover_amount: coverAmount,
    });

    if (remaining <= 0) {
      break;
    }
  }

  const scholarshipCover = bruto - remaining;

  return {
    bruto,
    scholarship_cover: scholarshipCover,
    netto: remaining,
    breakdown,
  };
};

/**
 * Terapkan daftar benefit yang sudah dimuat ke nominal bruto (pure).
 */
export const applyScholarshipBenefitsToAmount = (benefits = [], brutoAmount) => {
  const bruto = Math.max(0, Number(brutoAmount) || 0);
  if (bruto <= 0 || !benefits.length) {
    return {
      bruto,
      scholarship_cover: 0,
      netto: bruto,
      breakdown: [],
    };
  }

  const fullBenefit = benefits.find((item) => item.benefit_type === "full");
  if (fullBenefit) {
    return {
      bruto,
      scholarship_cover: bruto,
      netto: 0,
      breakdown: [
        {
          scholarship_id: Number(fullBenefit.scholarship_id),
          scholarship_name: fullBenefit.scholarship_name,
          benefit_id: Number(fullBenefit.benefit_id),
          benefit_target: fullBenefit.benefit_target,
          benefit_type: "full",
          benefit_amount: null,
          cover_amount: bruto,
        },
      ],
    };
  }

  let remaining = bruto;
  const breakdown = [];

  for (const benefit of benefits) {
    const benefitAmount = Math.max(0, Number(benefit.benefit_amount) || 0);
    const coverAmount = Math.min(benefitAmount, remaining);
    remaining -= coverAmount;

    breakdown.push({
      scholarship_id: Number(benefit.scholarship_id),
      scholarship_name: benefit.scholarship_name,
      benefit_id: Number(benefit.benefit_id),
      benefit_target: benefit.benefit_target,
      benefit_type: "fixed",
      benefit_amount: benefitAmount,
      cover_amount: coverAmount,
    });

    if (remaining <= 0) {
      break;
    }
  }

  return {
    bruto,
    scholarship_cover: bruto - remaining,
    netto: remaining,
    breakdown,
  };
};

/**
 * Muat indeks benefit aktif untuk banyak siswa (hindari N+1 di list).
 * Map: studentId -> { spp: Benefit[], other: Benefit[] }
 * Benefit spp punya periode_id + month_num; other punya component_id + periode_id (nullable).
 */
export const loadScholarshipBenefitIndex = async (
  db,
  homebaseId,
  studentIds = [],
) => {
  const uniqueIds = [
    ...new Set(studentIds.map((id) => Number(id)).filter(Boolean)),
  ];
  const index = new Map();

  if (!homebaseId || uniqueIds.length === 0) {
    return index;
  }

  for (const studentId of uniqueIds) {
    index.set(studentId, { spp: [], other: [] });
  }

  const [sppResult, otherResult] = await Promise.all([
    db.query(
      `
        SELECT
          ss.student_id,
          s.id AS scholarship_id,
          s.name AS scholarship_name,
          sb.id AS benefit_id,
          sb.benefit_target,
          sb.benefit_type,
          sb.amount AS benefit_amount,
          sbm.periode_id,
          sbm.month_num
        FROM finance.scholarship_student ss
        JOIN finance.scholarship s ON s.id = ss.scholarship_id
        JOIN finance.scholarship_benefit sb ON sb.scholarship_id = s.id
        JOIN finance.scholarship_benefit_month sbm ON sbm.benefit_id = sb.id
        WHERE s.homebase_id = $1
          AND ss.student_id = ANY($2::int[])
          AND ss.is_active = true
          AND s.is_active = true
          AND sb.benefit_target = 'spp'
        ORDER BY
          CASE WHEN sb.benefit_type = 'full' THEN 0 ELSE 1 END,
          sb.id ASC
      `,
      [homebaseId, uniqueIds],
    ),
    db.query(
      `
        SELECT
          ss.student_id,
          s.id AS scholarship_id,
          s.name AS scholarship_name,
          sb.id AS benefit_id,
          sb.benefit_target,
          sb.benefit_type,
          sb.amount AS benefit_amount,
          sb.component_id,
          sb.periode_id
        FROM finance.scholarship_student ss
        JOIN finance.scholarship s ON s.id = ss.scholarship_id
        JOIN finance.scholarship_benefit sb ON sb.scholarship_id = s.id
        WHERE s.homebase_id = $1
          AND ss.student_id = ANY($2::int[])
          AND ss.is_active = true
          AND s.is_active = true
          AND sb.benefit_target = 'other'
        ORDER BY
          CASE WHEN sb.benefit_type = 'full' THEN 0 ELSE 1 END,
          sb.id ASC
      `,
      [homebaseId, uniqueIds],
    ),
  ]);

  for (const row of sppResult.rows) {
    const studentId = Number(row.student_id);
    const bucket = index.get(studentId) || { spp: [], other: [] };
    bucket.spp.push(row);
    index.set(studentId, bucket);
  }

  for (const row of otherResult.rows) {
    const studentId = Number(row.student_id);
    const bucket = index.get(studentId) || { spp: [], other: [] };
    bucket.other.push(row);
    index.set(studentId, bucket);
  }

  return index;
};

export const resolveDueFromBenefitIndex = (
  benefitIndex,
  {
    studentId,
    itemType,
    componentId = null,
    periodeId = null,
    billMonth = null,
    brutoAmount,
  },
) => {
  const bruto = Math.max(0, Number(brutoAmount) || 0);
  const bucket = benefitIndex?.get(Number(studentId));
  if (!bucket || bruto <= 0) {
    return {
      bruto,
      scholarship_cover: 0,
      netto: bruto,
      breakdown: [],
    };
  }

  let benefits = [];
  if (itemType === "other") {
    benefits = (bucket.other || []).filter((item) => {
      if (Number(item.component_id) !== Number(componentId)) {
        return false;
      }
      if (item.periode_id == null) {
        return true;
      }
      return Number(item.periode_id) === Number(periodeId);
    });
  } else {
    benefits = (bucket.spp || []).filter(
      (item) =>
        Number(item.periode_id) === Number(periodeId) &&
        Number(item.month_num) === Number(billMonth),
    );
  }

  return applyScholarshipBenefitsToAmount(benefits, bruto);
};

export const enrichDueWithScholarship = ({
  benefitIndex,
  studentId,
  itemType,
  componentId = null,
  periodeId = null,
  billMonth = null,
  brutoAmount,
  storedBruto = null,
  storedCover = null,
  storedNetto = null,
  hasInvoiceItem = false,
}) => {
  const resolved = resolveDueFromBenefitIndex(benefitIndex, {
    studentId,
    itemType,
    componentId,
    periodeId,
    billMonth,
    brutoAmount,
  });
  const scholarshipNames = [
    ...new Set(
      (resolved.breakdown || [])
        .map((item) => item.scholarship_name)
        .filter(Boolean),
    ),
  ];

  if (hasInvoiceItem && storedNetto != null) {
    const bruto =
      storedBruto != null
        ? Number(storedBruto)
        : Number(storedNetto || 0) + Number(storedCover || 0);
    const cover =
      storedCover != null
        ? Number(storedCover)
        : Math.max(0, bruto - Number(storedNetto || 0));
    return {
      bruto_amount: bruto,
      scholarship_cover: cover,
      amount: Number(storedNetto || 0),
      has_scholarship: cover > 0,
      scholarship_names: cover > 0 ? scholarshipNames : [],
      scholarship_breakdown: cover > 0 ? resolved.breakdown || [] : [],
    };
  }

  return {
    bruto_amount: resolved.bruto,
    scholarship_cover: resolved.scholarship_cover,
    amount: resolved.netto,
    has_scholarship: resolved.scholarship_cover > 0,
    scholarship_names: scholarshipNames,
    scholarship_breakdown: resolved.breakdown || [],
  };
};

const SCHOLARSHIP_SUCCESS_PAYMENT_STATUSES = ["confirmed", "paid"];
const SCHOLARSHIP_RESERVED_PAYMENT_STATUSES = [
  "confirmed",
  "paid",
  "pending",
];

const scaleScholarshipBreakdown = (breakdown = [], appliedCover = 0) => {
  const targetCover = Math.max(0, Number(appliedCover) || 0);
  if (targetCover <= 0) {
    return [];
  }

  const rows = (breakdown || [])
    .map((row) => ({
      ...row,
      cover_amount: Math.max(0, Number(row.cover_amount) || 0),
    }))
    .filter((row) => row.cover_amount > 0 && row.scholarship_id);

  if (rows.length === 0) {
    return [];
  }

  const entitlementCover = rows.reduce(
    (sum, row) => sum + row.cover_amount,
    0,
  );

  if (entitlementCover <= 0) {
    return [];
  }

  if (Math.abs(entitlementCover - targetCover) < 0.005) {
    return rows;
  }

  const scale = targetCover / entitlementCover;
  const scaled = rows.map((row) => ({
    ...row,
    cover_amount: Math.round(row.cover_amount * scale * 100) / 100,
  }));

  const scaledSum = scaled.reduce((sum, row) => sum + row.cover_amount, 0);
  const delta = Math.round((targetCover - scaledSum) * 100) / 100;
  if (scaled.length > 0 && Math.abs(delta) >= 0.01) {
    scaled[scaled.length - 1].cover_amount = Math.max(
      0,
      Math.round((scaled[scaled.length - 1].cover_amount + delta) * 100) / 100,
    );
  }

  return scaled.filter((row) => row.cover_amount > 0);
};

export const resolveInvoiceItemAmounts = async (
  db,
  {
    homebaseId,
    studentId,
    itemType,
    componentId = null,
    periodeId = null,
    billMonth = null,
    brutoAmount,
  },
) => {
  const resolved = await resolveScholarshipDue(db, {
    homebaseId,
    studentId,
    itemType,
    componentId,
    periodeId,
    billMonth,
    brutoAmount,
  });

  return {
    bruto_amount: resolved.bruto,
    scholarship_cover: resolved.scholarship_cover,
    unit_amount: resolved.netto,
    breakdown: resolved.breakdown,
  };
};

export const replaceInvoiceItemScholarshipBreakdown = async (
  client,
  invoiceItemId,
  breakdown = [],
) => {
  await client.query(
    `DELETE FROM finance.invoice_item_scholarship WHERE invoice_item_id = $1`,
    [invoiceItemId],
  );

  for (const row of breakdown) {
    const coverAmount = Math.max(0, Number(row.cover_amount) || 0);
    if (coverAmount <= 0 || !row.scholarship_id) {
      continue;
    }

    await client.query(
      `
        INSERT INTO finance.invoice_item_scholarship (
          invoice_item_id,
          scholarship_id,
          benefit_id,
          cover_amount,
          benefit_type
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        invoiceItemId,
        row.scholarship_id,
        row.benefit_id || null,
        coverAmount,
        row.benefit_type === "full" ? "full" : "fixed",
      ],
    );
  }
};

export const insertInvoiceItemWithScholarship = async (
  client,
  {
    invoiceId,
    componentId,
    feeRuleId = null,
    billYear = null,
    billMonth = null,
    description = null,
    itemType,
    referenceType = null,
    homebaseId,
    studentId,
    periodeId = null,
    brutoAmount,
  },
) => {
  const amounts = await resolveInvoiceItemAmounts(client, {
    homebaseId,
    studentId,
    itemType,
    componentId,
    periodeId,
    billMonth,
    brutoAmount,
  });

  const created = await client.query(
    `
      INSERT INTO finance.invoice_item (
        invoice_id,
        component_id,
        fee_rule_id,
        bill_year,
        bill_month,
        description,
        qty,
        unit_amount,
        bruto_amount,
        scholarship_cover,
        item_type,
        reference_type
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, 1, $7, $8, $9, $10, $11
      )
      RETURNING
        id,
        invoice_id,
        amount,
        unit_amount,
        bruto_amount,
        scholarship_cover,
        0::numeric AS paid_amount
    `,
    [
      invoiceId,
      componentId,
      feeRuleId,
      billYear,
      billMonth,
      description,
      amounts.unit_amount,
      amounts.bruto_amount,
      amounts.scholarship_cover,
      itemType,
      referenceType,
    ],
  );

  await replaceInvoiceItemScholarshipBreakdown(
    client,
    created.rows[0].id,
    amounts.breakdown,
  );

  if (amounts.unit_amount <= 0) {
    await upsertInvoiceStatus(client, invoiceId);
  }

  return {
    ...created.rows[0],
    bruto_amount: amounts.bruto_amount,
    scholarship_cover: amounts.scholarship_cover,
    breakdown: amounts.breakdown,
  };
};

export const refreshInvoiceItemScholarship = async (client, invoiceItemId) => {
  const itemResult = await client.query(
    `
      SELECT
        ii.id,
        ii.invoice_id,
        ii.component_id,
        ii.fee_rule_id,
        ii.bill_month,
        ii.item_type,
        ii.unit_amount,
        ii.bruto_amount,
        ii.scholarship_cover,
        ii.amount,
        inv.homebase_id,
        inv.student_id,
        inv.periode_id,
        fr.amount AS rule_amount,
        COALESCE(
          SUM(
            CASE
              WHEN p.status = ANY($2::text[]) THEN pa.allocated_amount
              ELSE 0
            END
          ),
          0
        ) AS paid_amount,
        COALESCE(
          SUM(
            CASE
              WHEN p.status = ANY($3::text[]) THEN pa.allocated_amount
              ELSE 0
            END
          ),
          0
        ) AS reserved_amount
      FROM finance.invoice_item ii
      JOIN finance.invoice inv ON inv.id = ii.invoice_id
      LEFT JOIN finance.fee_rule fr ON fr.id = ii.fee_rule_id
      LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
      LEFT JOIN finance.payment p ON p.id = pa.payment_id
      WHERE ii.id = $1
      GROUP BY
        ii.id,
        inv.homebase_id,
        inv.student_id,
        inv.periode_id,
        fr.amount
      LIMIT 1
    `,
    [
      invoiceItemId,
      SCHOLARSHIP_SUCCESS_PAYMENT_STATUSES,
      SCHOLARSHIP_RESERVED_PAYMENT_STATUSES,
    ],
  );

  if (itemResult.rowCount === 0) {
    return null;
  }

  const item = itemResult.rows[0];
  const paidAmount = Number(item.paid_amount || 0);
  const reservedAmount = Number(item.reserved_amount || 0);
  const floorAmount = Math.max(paidAmount, reservedAmount);

  const brutoAmount = Math.max(
    0,
    Number(
      item.bruto_amount ??
        item.rule_amount ??
        Number(item.unit_amount || 0) + Number(item.scholarship_cover || 0),
    ) || 0,
  );

  // Sudah bayar/reservasi penuh sampai bruto → tidak ada ruang beasiswa; jejak cover dibersihkan.
  if (brutoAmount > 0 && floorAmount >= brutoAmount) {
    await client.query(
      `
        UPDATE finance.invoice_item
        SET
          unit_amount = $1,
          bruto_amount = $1,
          scholarship_cover = 0
        WHERE id = $2
      `,
      [brutoAmount, invoiceItemId],
    );
    await replaceInvoiceItemScholarshipBreakdown(client, invoiceItemId, []);
    await upsertInvoiceStatus(client, item.invoice_id);

    return {
      id: Number(item.id),
      invoice_id: Number(item.invoice_id),
      amount: brutoAmount,
      paid_amount: paidAmount,
      reserved_amount: reservedAmount,
      bruto_amount: brutoAmount,
      scholarship_cover: 0,
      unit_amount: brutoAmount,
      skipped: false,
      settled_at_bruto: true,
    };
  }

  const amounts = await resolveInvoiceItemAmounts(client, {
    homebaseId: Number(item.homebase_id),
    studentId: Number(item.student_id),
    itemType: item.item_type,
    componentId: Number(item.component_id),
    periodeId: item.periode_id ? Number(item.periode_id) : null,
    billMonth: item.bill_month ? Number(item.bill_month) : null,
    brutoAmount,
  });

  // Jangan turunkan due di bawah yang sudah dibayar / pending.
  // Jika hak beasiswa mengecil, due boleh naik kembali ke atas paid.
  const unitAmount = Math.max(amounts.unit_amount, floorAmount);
  const scholarshipCover = Math.max(0, brutoAmount - unitAmount);
  const breakdown = scaleScholarshipBreakdown(
    amounts.breakdown,
    scholarshipCover,
  );

  await client.query(
    `
      UPDATE finance.invoice_item
      SET
        unit_amount = $1,
        bruto_amount = $2,
        scholarship_cover = $3
      WHERE id = $4
    `,
    [unitAmount, brutoAmount, scholarshipCover, invoiceItemId],
  );

  await replaceInvoiceItemScholarshipBreakdown(client, invoiceItemId, breakdown);
  await upsertInvoiceStatus(client, item.invoice_id);

  return {
    id: Number(item.id),
    invoice_id: Number(item.invoice_id),
    amount: unitAmount,
    paid_amount: paidAmount,
    reserved_amount: reservedAmount,
    bruto_amount: brutoAmount,
    scholarship_cover: scholarshipCover,
    unit_amount: unitAmount,
    skipped: false,
  };
};

export const syncScholarshipForStudent = async (client, homebaseId, studentId) => {
  // Refresh semua item aktif: unpaid, due 0, floored, maupun yang cover-nya perlu naik/turun.
  const items = await client.query(
    `
      SELECT ii.id
      FROM finance.invoice_item ii
      JOIN finance.invoice inv ON inv.id = ii.invoice_id
      WHERE inv.homebase_id = $1
        AND inv.student_id = $2
        AND inv.status <> 'cancelled'
      ORDER BY ii.id ASC
    `,
    [homebaseId, studentId],
  );

  const results = [];
  for (const row of items.rows) {
    results.push(await refreshInvoiceItemScholarship(client, row.id));
  }

  return {
    student_id: Number(studentId),
    synced_count: results.filter((item) => item && !item.skipped).length,
    results,
  };
};

export const syncScholarshipForScholarship = async (
  client,
  homebaseId,
  scholarshipId,
) => {
  const students = await client.query(
    `
      SELECT DISTINCT ss.student_id
      FROM finance.scholarship_student ss
      JOIN finance.scholarship s ON s.id = ss.scholarship_id
      WHERE s.id = $1
        AND s.homebase_id = $2
    `,
    [scholarshipId, homebaseId],
  );

  // Juga siswa yang punya jejak cover dari beasiswa ini (meski sudah di-unassign),
  // plus penerima yang masih punya cover di tagihan agar reverse sync tetap jalan.
  const linkedStudents = await client.query(
    `
      SELECT DISTINCT inv.student_id
      FROM finance.invoice_item_scholarship iis
      JOIN finance.invoice_item ii ON ii.id = iis.invoice_item_id
      JOIN finance.invoice inv ON inv.id = ii.invoice_id
      WHERE iis.scholarship_id = $1
        AND inv.homebase_id = $2
      UNION
      SELECT DISTINCT inv.student_id
      FROM finance.invoice_item ii
      JOIN finance.invoice inv ON inv.id = ii.invoice_id
      JOIN finance.scholarship_student ss
        ON ss.student_id = inv.student_id
       AND ss.scholarship_id = $1
      WHERE inv.homebase_id = $2
        AND COALESCE(ii.scholarship_cover, 0) > 0
        AND inv.status <> 'cancelled'
    `,
    [scholarshipId, homebaseId],
  );

  const studentIds = [
    ...new Set(
      [...students.rows, ...linkedStudents.rows]
        .map((row) => Number(row.student_id))
        .filter(Boolean),
    ),
  ];

  const results = [];
  for (const studentId of studentIds) {
    results.push(await syncScholarshipForStudent(client, homebaseId, studentId));
  }

  return {
    scholarship_id: Number(scholarshipId),
    student_count: studentIds.length,
    synced_count: results.reduce((sum, item) => sum + (item.synced_count || 0), 0),
    results,
  };
};

export const getOrCreateComponent = async (
  client,
  {
    homebaseId,
    code,
    name,
    category,
    chargeType,
    createdBy = null,
    isSavings = false,
  },
) => {
  const componentResult = await client.query(
    `
      SELECT id, code, name, category, charge_type
      FROM finance.fee_component
      WHERE homebase_id = $1
        AND category = $2
        AND code = $3
      LIMIT 1
    `,
    [homebaseId, category, code],
  );

  if (componentResult.rowCount > 0) {
    return componentResult.rows[0];
  }

  const created = await client.query(
    `
      INSERT INTO finance.fee_component (
        homebase_id,
        code,
        name,
        category,
        charge_type,
        is_savings,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, code, name, category, charge_type
    `,
    [homebaseId, code, name, category, chargeType, isSavings, createdBy],
  );

  return created.rows[0];
};

export const getParentPayerUserId = async (client, studentId, fallbackUserId) => {
  const result = await client.query(
    `
      SELECT parent_user_id AS user_id
      FROM public.u_parent_students
      WHERE student_id = $1
      UNION
      SELECT user_id
      FROM public.u_parents
      WHERE student_id = $1
      ORDER BY user_id ASC
      LIMIT 1
    `,
    [studentId],
  );

  return result.rows[0]?.user_id || fallbackUserId;
};

export const getLinkedParentStudents = async (client, parentUserId) => {
  const result = await client.query(
    `
      WITH parent_links AS (
        SELECT
          ups.parent_user_id,
          ups.homebase_id,
          ups.student_id,
          ups.relationship,
          ups.is_primary
        FROM public.u_parent_students ups
        WHERE ups.parent_user_id = $1

        UNION

        SELECT
          p.user_id AS parent_user_id,
          s.homebase_id,
          p.student_id,
          'wali'::varchar AS relationship,
          true AS is_primary
        FROM public.u_parents p
        JOIN public.u_students s ON s.user_id = p.student_id
        WHERE p.user_id = $1
          AND p.student_id IS NOT NULL
      )
      SELECT DISTINCT ON (pl.student_id)
        pl.parent_user_id,
        pl.student_id,
        pl.relationship,
        pl.is_primary,
        u.full_name AS student_name,
        s.nis,
        COALESCE(pl.homebase_id, s.homebase_id) AS homebase_id,
        hb.name AS homebase_name,
        s.current_periode_id,
        current_per.name AS current_periode_name,
        current_per.is_active AS current_periode_is_active,
        s.current_class_id,
        c.name AS current_class_name,
        g.id AS current_grade_id,
        g.name AS current_grade_name
      FROM parent_links pl
      JOIN public.u_students s ON s.user_id = pl.student_id
      JOIN public.u_users u ON u.id = s.user_id
      LEFT JOIN public.a_homebase hb ON hb.id = COALESCE(pl.homebase_id, s.homebase_id)
      LEFT JOIN public.a_periode current_per ON current_per.id = s.current_periode_id
      LEFT JOIN public.a_class c ON c.id = s.current_class_id
      LEFT JOIN public.a_grade g ON g.id = c.grade_id
      ORDER BY pl.student_id, pl.is_primary DESC, pl.parent_user_id ASC
    `,
    [parentUserId],
  );

  return result.rows;
};

export const getPaymentMethodId = async (
  client,
  { homebaseId, methodType, name },
) => {
  const existing = await client.query(
    `
      SELECT id
      FROM finance.payment_method
      WHERE homebase_id = $1
        AND method_type = $2
        AND lower(name) = lower($3)
      LIMIT 1
    `,
    [homebaseId, methodType, name],
  );

  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }

  const created = await client.query(
    `
      INSERT INTO finance.payment_method (homebase_id, method_type, name)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [homebaseId, methodType, name],
  );

  return created.rows[0].id;
};

export const getOrCreateInvoice = async (
  client,
  {
    homebaseId,
    studentId,
    periodeId,
    sourceType,
    createdBy,
    notes = null,
    reuseExisting = true,
  },
) => {
  if (reuseExisting) {
    const invoiceResult = await client.query(
      `
        SELECT id, source_type
        FROM finance.invoice
        WHERE homebase_id = $1
          AND student_id = $2
          AND COALESCE(periode_id, 0) = COALESCE($3, 0)
          AND status <> 'cancelled'
          AND source_type = $4
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [homebaseId, studentId, periodeId, sourceType],
    );

    if (invoiceResult.rowCount > 0) {
      return invoiceResult.rows[0];
    }
  }

  const invoiceNo = buildInvoiceNo({
    homebaseId,
    studentId,
    periodeId,
    sourceType,
  });

  const created = await client.query(
    `
      INSERT INTO finance.invoice (
        homebase_id,
        student_id,
        periode_id,
        invoice_no,
        source_type,
        status,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, 'issued', $6, $7)
      RETURNING id, source_type
    `,
    [homebaseId, studentId, periodeId, invoiceNo, sourceType, notes, createdBy],
  );

  return created.rows[0];
};

export const upsertInvoiceStatus = async (client, invoiceId) => {
  const result = await client.query(
    `
      SELECT
        COALESCE(SUM(ii.amount), 0) AS total_due,
        COALESCE(SUM(pa.allocated_amount), 0) AS total_paid
      FROM finance.invoice_item ii
      LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
      LEFT JOIN finance.payment p ON p.id = pa.payment_id AND p.status = 'confirmed'
      WHERE ii.invoice_id = $1
    `,
    [invoiceId],
  );

  const totalDue = Number(result.rows[0]?.total_due || 0);
  const totalPaid = Number(result.rows[0]?.total_paid || 0);

  let status = "issued";
  if (totalDue <= 0 || (totalDue > 0 && totalPaid >= totalDue)) {
    status = "paid";
  } else if (totalPaid > 0) {
    status = "partial";
  }

  await client.query(
    `
      UPDATE finance.invoice
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
    [status, invoiceId],
  );

  return { totalDue, totalPaid, status };
};

export const createManualPayment = async (
  client,
  {
    homebaseId,
    studentId,
    payerUserId,
    methodType,
    methodName,
    bankAccountId = null,
    paymentChannel = null,
    amount,
    paymentDate,
    referenceNo = null,
    proofUrl = null,
    notes = null,
    createdBy = null,
    verifiedBy = null,
    allocations,
  },
) => {
  const methodId = await getPaymentMethodId(client, {
    homebaseId,
    methodType,
    name: methodName,
  });

  const paymentResult = await client.query(
    `
      INSERT INTO finance.payment (
        homebase_id,
        student_id,
        payer_user_id,
        method_id,
        bank_account_id,
        payment_channel,
        payment_source,
        payment_date,
        amount,
        status,
        reference_no,
        proof_url,
        notes,
        created_by,
        verified_by,
        verified_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, 'admin_manual', $7, $8, 'confirmed',
        $9, $10, $11, $12, $13, CURRENT_TIMESTAMP
      )
      RETURNING id
    `,
    [
      homebaseId,
      studentId,
      payerUserId,
      methodId,
      bankAccountId,
      paymentChannel,
      paymentDate,
      amount,
      referenceNo,
      proofUrl,
      notes,
      createdBy,
      verifiedBy,
    ],
  );

  const paymentId = paymentResult.rows[0].id;

  for (const allocation of allocations) {
    await client.query(
      `
        INSERT INTO finance.payment_allocation (
          payment_id,
          invoice_item_id,
          allocated_amount
        )
        VALUES ($1, $2, $3)
      `,
      [paymentId, allocation.invoice_item_id, allocation.allocated_amount],
    );
  }

  const invoiceIds = [
    ...new Set(allocations.map((item) => item.invoice_id).filter(Boolean)),
  ];
  for (const invoiceId of invoiceIds) {
    await upsertInvoiceStatus(client, invoiceId);
  }

  return paymentId;
};

export const getOrCreateSppRule = async (
  client,
  { homebaseId, periodeId, gradeId, amount, createdBy, description = "SPP" },
) => {
  const component = await getOrCreateComponent(client, {
    homebaseId,
    code: "SPP",
    name: description || "SPP",
    category: "spp",
    chargeType: "monthly",
    createdBy,
  });

  const existingRule = await client.query(
    `
      SELECT id
      FROM finance.fee_rule
      WHERE component_id = $1
        AND homebase_id = $2
        AND periode_id = $3
        AND grade_id = $4
      LIMIT 1
    `,
    [component.id, homebaseId, periodeId, gradeId],
  );

  let ruleId = existingRule.rows[0]?.id || null;

  if (ruleId) {
    await client.query(
      `
        UPDATE finance.fee_rule
        SET
          amount = $1,
          billing_cycle = 'monthly',
          is_active = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [amount, ruleId],
    );
  } else {
    const createdRule = await client.query(
      `
        INSERT INTO finance.fee_rule (
          component_id,
          homebase_id,
          grade_id,
          periode_id,
          billing_cycle,
          amount,
          is_active,
          created_by
        )
        VALUES ($1, $2, $3, $4, 'monthly', $5, true, $6)
        RETURNING id
      `,
      [component.id, homebaseId, gradeId, periodeId, amount, createdBy],
    );
    ruleId = createdRule.rows[0].id;
  }

  for (let month = 1; month <= 12; month += 1) {
    await client.query(
      `
        INSERT INTO finance.fee_rule_month (fee_rule_id, month_num)
        VALUES ($1, $2)
        ON CONFLICT (fee_rule_id, month_num) DO NOTHING
      `,
      [ruleId, month],
    );
  }

  return { componentId: component.id, ruleId };
};

export const slugCode = (name, prefix = "OTHER") =>
  buildCodeFromName(name, prefix);

/**
 * Resolve active other-payment rule for a student.
 * Supports grade-scoped (fee_rule.grade_id) and student-scoped (fee_assignment) types.
 */
export const resolveOtherChargeRule = async (
  db,
  { homebaseId, periodeId, gradeId, componentId, studentId },
) => {
  if (!homebaseId || !componentId) {
    return null;
  }

  const componentResult = await db.query(
    `
      SELECT
        id,
        name,
        COALESCE(scope, 'grade') AS scope
      FROM finance.fee_component
      WHERE id = $1
        AND homebase_id = $2
        AND category = 'other'
        AND is_active = true
      LIMIT 1
    `,
    [componentId, homebaseId],
  );

  if (componentResult.rowCount === 0) {
    return null;
  }

  const component = componentResult.rows[0];

  if (component.scope === "student") {
    if (!studentId || !periodeId) {
      return null;
    }

    const assignmentResult = await db.query(
      `
        SELECT
          fr.id,
          COALESCE(fa.amount, fr.amount) AS amount,
          fc.id AS component_id,
          fc.name AS component_name,
          fa.periode_id
        FROM finance.fee_assignment fa
        JOIN finance.fee_component fc ON fc.id = fa.component_id
        JOIN finance.fee_rule fr
          ON fr.component_id = fc.id
          AND fr.is_active = true
          AND fr.grade_id IS NULL
        WHERE fa.component_id = $1
          AND fa.homebase_id = $2
          AND fa.periode_id = $3
          AND fa.student_id = $4
          AND fa.is_active = true
          AND fc.is_active = true
        ORDER BY fr.id DESC
        LIMIT 1
      `,
      [componentId, homebaseId, periodeId, studentId],
    );

    if (assignmentResult.rowCount === 0) {
      return null;
    }

    return {
      ...assignmentResult.rows[0],
      scope: "student",
    };
  }

  if (!gradeId) {
    return null;
  }

  const ruleResult = await db.query(
    `
      SELECT
        fr.id,
        fr.amount,
        fc.id AS component_id,
        fc.name AS component_name,
        fr.periode_id
      FROM finance.fee_rule fr
      JOIN finance.fee_component fc ON fc.id = fr.component_id
      WHERE fr.homebase_id = $1
        AND fr.grade_id = $2
        AND fr.component_id = $3
        AND fr.is_active = true
        AND fc.category = 'other'
        AND fc.is_active = true
        AND COALESCE(fc.scope, 'grade') = 'grade'
        AND (fr.periode_id = $4 OR fr.periode_id IS NULL)
      ORDER BY CASE WHEN fr.periode_id = $4 THEN 0 ELSE 1 END, fr.id DESC
      LIMIT 1
    `,
    [homebaseId, gradeId, componentId, periodeId],
  );

  if (ruleResult.rowCount === 0) {
    return null;
  }

  return {
    ...ruleResult.rows[0],
    scope: "grade",
  };
};

