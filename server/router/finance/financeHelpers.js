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
  const params = [homebaseId];
  let whereClause = `WHERE e.homebase_id = $1`;

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
    whereClause += ` AND (u.full_name ILIKE $${params.length} OR COALESCE(s.nis, '') ILIKE $${params.length})`;
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

export const ensureFinalFinanceTables = async (db) => {
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
      category VARCHAR(20) NOT NULL CHECK (category IN ('spp', 'other', 'savings')),
      charge_type VARCHAR(20) NOT NULL CHECK (charge_type IN ('monthly', 'once', 'custom')),
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
  if (totalDue > 0 && totalPaid >= totalDue) {
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
