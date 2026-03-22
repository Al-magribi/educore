import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const parseIntArray = (value) => {
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

const formatChargeStatus = (status) => {
  const statusMap = {
    unpaid: "Belum Bayar",
    partial: "Cicilan",
    paid: "Lunas",
  };

  return statusMap[status] || "Belum Bayar";
};

const deriveChargeStatus = (amountDue, paidAmount) => {
  if (paidAmount >= amountDue && amountDue > 0) {
    return "paid";
  }

  if (paidAmount > 0) {
    return "partial";
  }

  return "unpaid";
};

const buildEnrollmentWhereClause = ({
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

const ensureStudentScope = async (client, homebaseId, studentId, periodeId, gradeId) => {
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

const ensureGradeAndPeriode = async (client, homebaseId, periodeId, gradeId) => {
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

const ensureOtherFinanceTables = async (db) => {
  await db.query(`CREATE SCHEMA IF NOT EXISTS finance`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.other_payment_types (
      type_id bigserial PRIMARY KEY,
      homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      name varchar(100) NOT NULL,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_by int REFERENCES public.u_users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    ALTER TABLE finance.other_payment_types
    ADD COLUMN IF NOT EXISTS homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_types
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_types
    ADD COLUMN IF NOT EXISTS created_by int REFERENCES public.u_users(id)
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_types
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_types
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_types
    ADD COLUMN IF NOT EXISTS amount numeric(14,2) NOT NULL DEFAULT 0
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_types
    ADD COLUMN IF NOT EXISTS grade_ids int[] NOT NULL DEFAULT '{}'
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_other_payment_types_homebase_name
    ON finance.other_payment_types(homebase_id, lower(name))
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.other_payment_charges (
      charge_id bigserial PRIMARY KEY,
      homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id int REFERENCES public.a_periode(id) ON DELETE CASCADE,
      type_id bigint NOT NULL REFERENCES finance.other_payment_types(type_id) ON DELETE RESTRICT,
      student_id int NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      amount_due numeric(14,2) NOT NULL CHECK (amount_due >= 0),
      due_date date,
      notes text,
      status varchar(20) NOT NULL DEFAULT 'unpaid',
      created_by int REFERENCES public.u_users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    ALTER TABLE finance.other_payment_charges
    ADD COLUMN IF NOT EXISTS homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_charges
    ADD COLUMN IF NOT EXISTS periode_id int REFERENCES public.a_periode(id) ON DELETE CASCADE
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_charges
    ADD COLUMN IF NOT EXISTS notes text
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_charges
    ADD COLUMN IF NOT EXISTS created_by int REFERENCES public.u_users(id)
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_charges
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_charges
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `);
  await db.query(`
    ALTER TABLE finance.other_payment_charges
    DROP COLUMN IF EXISTS due_date
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'other_payment_charges_status_check'
          AND conrelid = 'finance.other_payment_charges'::regclass
      ) THEN
        ALTER TABLE finance.other_payment_charges
        ADD CONSTRAINT other_payment_charges_status_check
        CHECK (status IN ('unpaid', 'partial', 'paid'));
      END IF;
    END $$;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_other_payment_charges_scope
    ON finance.other_payment_charges(homebase_id, periode_id, student_id, type_id, status)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.other_payment_installments (
      installment_id bigserial PRIMARY KEY,
      charge_id bigint NOT NULL REFERENCES finance.other_payment_charges(charge_id) ON DELETE CASCADE,
      installment_number int NOT NULL DEFAULT 1,
      amount_paid numeric(14,2) NOT NULL CHECK (amount_paid > 0),
      payment_date date NOT NULL DEFAULT CURRENT_DATE,
      payment_method varchar(50),
      processed_by int REFERENCES public.u_users(id),
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    ALTER TABLE finance.other_payment_installments
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_other_payment_installments_charge
    ON finance.other_payment_installments(charge_id, payment_date DESC, installment_id DESC)
  `);
};

const syncChargeStatus = async (client, chargeId) => {
  const summaryResult = await client.query(
    `
      SELECT
        c.amount_due,
        COALESCE(SUM(i.amount_paid), 0) AS paid_amount
      FROM finance.other_payment_charges c
      LEFT JOIN finance.other_payment_installments i ON i.charge_id = c.charge_id
      WHERE c.charge_id = $1
      GROUP BY c.charge_id, c.amount_due
    `,
    [chargeId],
  );

  if (summaryResult.rowCount === 0) {
    return null;
  }

  const summary = summaryResult.rows[0];
  const amountDue = Number(summary.amount_due || 0);
  const paidAmount = Number(summary.paid_amount || 0);

  const status = deriveChargeStatus(amountDue, paidAmount);

  await client.query(
    `
      UPDATE finance.other_payment_charges
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE charge_id = $2
    `,
    [status, chargeId],
  );

  return {
    amountDue,
    paidAmount,
    remainingAmount: Math.max(amountDue - paidAmount, 0),
    status,
  };
};

const getChargeScopeById = async (client, chargeId, homebaseId) => {
  const result = await client.query(
    `
      SELECT charge_id, homebase_id, periode_id, type_id, student_id, amount_due
      FROM finance.other_payment_charges
      WHERE charge_id = $1 AND homebase_id = $2
      LIMIT 1
    `,
    [chargeId, homebaseId],
  );

  return result.rowCount > 0 ? result.rows[0] : null;
};

router.get(
  "/others/options",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureOtherFinanceTables(db);

    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const search = (req.query.search || "").trim();
    const enrollmentScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      search,
    });

    const classScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId: null,
      studentId: null,
      search: "",
    });

    const [periodeResult, gradeResult, classResult, studentResult, typeResult] =
      await Promise.all([
        db.query(
          `
            SELECT id, name, is_active
            FROM a_periode
            WHERE homebase_id = $1
            ORDER BY is_active DESC, created_at DESC
          `,
          [homebaseId],
        ),
        db.query(
          `
            SELECT id, name
            FROM a_grade
            WHERE homebase_id = $1
            ORDER BY name ASC
          `,
          [homebaseId],
        ),
        db.query(
          `
            SELECT DISTINCT c.id, c.name, g.id AS grade_id, g.name AS grade_name
            FROM u_class_enrollments e
            JOIN a_class c ON c.id = e.class_id
            JOIN a_grade g ON g.id = c.grade_id
            ${classScope.whereClause}
            ORDER BY g.name ASC, c.name ASC
          `,
          classScope.params,
        ),
        db.query(
          `
            SELECT
              s.user_id AS id,
              u.full_name,
              s.nis,
              e.periode_id,
              c.id AS class_id,
              c.name AS class_name,
              g.id AS grade_id,
              g.name AS grade_name
            FROM u_class_enrollments e
            JOIN u_students s ON s.user_id = e.student_id
            JOIN u_users u ON u.id = s.user_id
            JOIN a_class c ON c.id = e.class_id
            JOIN a_grade g ON g.id = c.grade_id
            ${enrollmentScope.whereClause}
            ORDER BY u.full_name ASC
            LIMIT 100
          `,
          enrollmentScope.params,
        ),
        db.query(
          `
            SELECT
              t.type_id,
              t.name,
              t.description,
              t.is_active,
              t.amount,
              t.grade_ids,
              COALESCE(
                ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL),
                '{}'
              ) AS grade_names
            FROM finance.other_payment_types
            AS t
            LEFT JOIN a_grade g ON g.id = ANY(t.grade_ids)
            WHERE t.homebase_id = $1
            GROUP BY t.type_id
            ORDER BY t.is_active DESC, t.name ASC
          `,
          [homebaseId],
        ),
      ]);

    res.json({
      status: "success",
      data: {
        periodes: periodeResult.rows.map((item) => ({
          ...item,
          is_default: item.is_active,
        })),
        grades: gradeResult.rows,
        classes: classResult.rows,
        students: studentResult.rows,
        types: typeResult.rows,
      },
    });
  }),
);

router.get(
  "/others/types",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureOtherFinanceTables(db);

    const { homebase_id: homebaseId } = req.user;
    const result = await db.query(
      `
        SELECT
          t.type_id,
          t.homebase_id,
          t.name,
          t.description,
          t.amount,
          t.grade_ids,
          t.is_active,
          t.created_at,
          t.updated_at,
          COUNT(c.charge_id)::int AS charge_count,
          COALESCE(
            ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL),
            '{}'
          ) AS grade_names
        FROM finance.other_payment_types t
        LEFT JOIN finance.other_payment_charges c ON c.type_id = t.type_id
        LEFT JOIN a_grade g ON g.id = ANY(t.grade_ids)
        WHERE t.homebase_id = $1
        GROUP BY t.type_id
        ORDER BY t.is_active DESC, t.name ASC
      `,
      [homebaseId],
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  }),
);

router.post(
  "/others/types",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureOtherFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const name = (req.body.name || "").trim();
    const description = (req.body.description || "").trim() || null;
    const amount = Number(req.body.amount);
    const gradeIds = parseIntArray(req.body.grade_ids).sort((left, right) => left - right);
    const isActive = req.body.is_active !== false;

    if (!name || Number.isNaN(amount) || gradeIds.length === 0) {
      return res.status(400).json({
        message: "Nama jenis pembayaran, nominal, dan tingkat wajib diisi",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Nominal jenis pembayaran harus lebih dari 0" });
    }

    const gradeCheck = await client.query(
      `
        SELECT id
        FROM a_grade
        WHERE homebase_id = $1 AND id = ANY($2::int[])
      `,
      [homebaseId, gradeIds],
    );

    if (gradeCheck.rowCount !== gradeIds.length) {
      return res.status(404).json({ message: "Sebagian tingkat tidak ditemukan pada satuan ini" });
    }

    const duplicateCheck = await client.query(
      `
        SELECT type_id
        FROM finance.other_payment_types
        WHERE homebase_id = $1 AND lower(name) = lower($2)
        LIMIT 1
      `,
      [homebaseId, name],
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Jenis pembayaran dengan nama yang sama sudah ada",
      });
    }

    const result = await client.query(
      `
        INSERT INTO finance.other_payment_types (
          homebase_id,
          name,
          description,
          amount,
          grade_ids,
          is_active,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING type_id
      `,
      [homebaseId, name, description, amount, gradeIds, isActive, userId],
    );

    res.status(201).json({
      status: "success",
      message: "Jenis pembayaran berhasil ditambahkan",
      data: { id: result.rows[0].type_id },
    });
  }),
);

router.put(
  "/others/types/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureOtherFinanceTables(client);

    const typeId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;
    const name = (req.body.name || "").trim();
    const description = (req.body.description || "").trim() || null;
    const amount = Number(req.body.amount);
    const gradeIds = parseIntArray(req.body.grade_ids).sort((left, right) => left - right);
    const isActive = req.body.is_active !== false;

    if (!typeId || !name || Number.isNaN(amount) || gradeIds.length === 0) {
      return res.status(400).json({
        message: "Data jenis pembayaran belum lengkap",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Nominal jenis pembayaran harus lebih dari 0" });
    }

    const currentType = await client.query(
      `
        SELECT type_id
        FROM finance.other_payment_types
        WHERE type_id = $1 AND homebase_id = $2
      `,
      [typeId, homebaseId],
    );

    if (currentType.rowCount === 0) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    const duplicateCheck = await client.query(
      `
        SELECT type_id
        FROM finance.other_payment_types
        WHERE homebase_id = $1 AND lower(name) = lower($2) AND type_id <> $3
        LIMIT 1
      `,
      [homebaseId, name, typeId],
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Jenis pembayaran dengan nama yang sama sudah ada",
      });
    }

    const gradeCheck = await client.query(
      `
        SELECT id
        FROM a_grade
        WHERE homebase_id = $1 AND id = ANY($2::int[])
      `,
      [homebaseId, gradeIds],
    );

    if (gradeCheck.rowCount !== gradeIds.length) {
      return res.status(404).json({ message: "Sebagian tingkat tidak ditemukan pada satuan ini" });
    }

    await client.query(
      `
        UPDATE finance.other_payment_types
        SET
          name = $1,
          description = $2,
          amount = $3,
          grade_ids = $4,
          is_active = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE type_id = $6
      `,
      [name, description, amount, gradeIds, isActive, typeId],
    );

    res.json({
      status: "success",
      message: "Jenis pembayaran berhasil diperbarui",
    });
  }),
);

router.delete(
  "/others/types/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureOtherFinanceTables(client);

    const typeId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;

    const usageCheck = await client.query(
      `
        SELECT charge_id
        FROM finance.other_payment_charges
        WHERE type_id = $1 AND homebase_id = $2
        LIMIT 1
      `,
      [typeId, homebaseId],
    );

    if (usageCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Jenis pembayaran masih dipakai di tagihan dan tidak dapat dihapus",
      });
    }

    const result = await client.query(
      `
        DELETE FROM finance.other_payment_types
        WHERE type_id = $1 AND homebase_id = $2
      `,
      [typeId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Jenis pembayaran berhasil dihapus",
    });
  }),
);

router.get(
  "/others/charges",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureOtherFinanceTables(db);

    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const typeId = parseOptionalInt(req.query.type_id);
    const status = (req.query.status || "").trim();
    const search = (req.query.search || "").trim();

    const scope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      studentId,
      search,
    });

    const params = [...scope.params];
    let typeWhereClause = `WHERE t.homebase_id = $1 AND t.is_active = true`;

    if (typeId) {
      params.push(typeId);
      typeWhereClause += ` AND t.type_id = $${params.length}`;
    }

    const chargeResult = await db.query(
      `
        WITH enrollment_scope AS (
          SELECT
            e.student_id,
            e.periode_id,
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
          ${scope.whereClause}
        ),
        type_scope AS (
          SELECT
            t.type_id,
            t.homebase_id,
            t.name,
            t.description,
            t.amount,
            t.grade_ids,
            t.is_active
          FROM finance.other_payment_types t
          ${typeWhereClause}
        )
        SELECT
          c.charge_id,
          $1::int AS homebase_id,
          es.periode_id,
          ts.type_id,
          es.student_id,
          COALESCE(c.amount_due, ts.amount) AS amount_due,
          c.notes,
          c.status AS charge_status,
          c.created_at,
          c.updated_at,
          p.name AS periode_name,
          ts.name AS type_name,
          ts.description AS type_description,
          ts.amount AS type_amount,
          ts.grade_ids AS type_grade_ids,
          es.student_name,
          es.nis,
          es.class_id,
          es.class_name,
          es.grade_id,
          es.grade_name,
          COALESCE(SUM(i.amount_paid), 0) AS paid_amount,
          COUNT(i.installment_id)::int AS installment_count
        FROM enrollment_scope es
        JOIN type_scope ts
          ON COALESCE(array_length(ts.grade_ids, 1), 0) = 0
          OR es.grade_id = ANY(ts.grade_ids)
        JOIN a_periode p ON p.id = es.periode_id
        LEFT JOIN finance.other_payment_charges c
          ON c.homebase_id = $1
          AND c.periode_id = es.periode_id
          AND c.student_id = es.student_id
          AND c.type_id = ts.type_id
        LEFT JOIN finance.other_payment_installments i ON i.charge_id = c.charge_id
        GROUP BY
          c.charge_id, c.amount_due, c.notes, c.status, c.created_at, c.updated_at,
          p.name, ts.type_id, ts.name, ts.description, ts.amount, ts.grade_ids,
          es.student_id, es.student_name, es.nis, es.periode_id, es.class_id, es.class_name, es.grade_id, es.grade_name
        ORDER BY
          ts.name ASC,
          es.student_name ASC
      `,
      params,
    );

    const chargeIds = chargeResult.rows.map((item) => item.charge_id);
    const installmentMap = new Map();

    if (chargeIds.length > 0) {
      const installmentResult = await db.query(
        `
          SELECT
            i.installment_id,
            i.charge_id,
            i.installment_number,
            i.amount_paid,
            i.payment_date,
            i.payment_method,
            i.notes,
            i.created_at,
            processor.full_name AS processed_by_name
          FROM finance.other_payment_installments i
          LEFT JOIN u_users processor ON processor.id = i.processed_by
          WHERE i.charge_id = ANY($1::bigint[])
          ORDER BY i.payment_date DESC, i.installment_id DESC
        `,
        [chargeIds],
      );

      installmentResult.rows.forEach((item) => {
        if (!installmentMap.has(item.charge_id)) {
          installmentMap.set(item.charge_id, []);
        }

        installmentMap.get(item.charge_id).push({
          ...item,
          amount_paid: Number(item.amount_paid || 0),
        });
      });
    }

    const data = chargeResult.rows.map((item) => {
      const amountDue = Number(item.amount_due || 0);
      const paidAmount = Number(item.paid_amount || 0);
      const remainingAmount = Math.max(amountDue - paidAmount, 0);
      const derivedStatus = deriveChargeStatus(amountDue, paidAmount);

      return {
        ...item,
        amount_due: amountDue,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        installment_count: Number(item.installment_count || 0),
        status: derivedStatus,
        status_label: formatChargeStatus(derivedStatus),
        installments: installmentMap.get(item.charge_id) || [],
      };
    });

    const filteredData = status ? data.filter((item) => item.status === status) : data;

    res.json({
      status: "success",
      data: filteredData,
      summary: {
        total_records: filteredData.length,
        unpaid_count: filteredData.filter((item) => item.status === "unpaid").length,
        partial_count: filteredData.filter((item) => item.status === "partial").length,
        paid_count: filteredData.filter((item) => item.status === "paid").length,
        total_due: filteredData.reduce((sum, item) => sum + item.amount_due, 0),
        total_paid: filteredData.reduce((sum, item) => sum + item.paid_amount, 0),
        total_remaining: filteredData.reduce((sum, item) => sum + item.remaining_amount, 0),
      },
    });
  }),
);

router.post(
  "/others/charges",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureOtherFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const typeId = parseOptionalInt(req.body.type_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const notes = (req.body.notes || "").trim() || null;

    if (!periodeId || !gradeId || !typeId || !studentId) {
      return res.status(400).json({ message: "Data tagihan pembayaran lainnya belum lengkap" });
    }

    const scopeCheck = await ensureGradeAndPeriode(client, homebaseId, periodeId, gradeId);
    if (scopeCheck.error) {
      return res.status(404).json({ message: scopeCheck.error });
    }

    const studentCheck = await ensureStudentScope(
      client,
      homebaseId,
      studentId,
      periodeId,
      gradeId,
    );
    if (studentCheck.error) {
      return res.status(404).json({ message: studentCheck.error });
    }

    const typeCheck = await client.query(
      `
        SELECT type_id, amount, grade_ids, name
        FROM finance.other_payment_types
        WHERE type_id = $1 AND homebase_id = $2 AND is_active = true
        LIMIT 1
      `,
      [typeId, homebaseId],
    );

    if (typeCheck.rowCount === 0) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan atau nonaktif" });
    }

    const type = typeCheck.rows[0];
    const amountDue = Number(type.amount || 0);

    if (amountDue <= 0) {
      return res.status(400).json({
        message: "Nominal pada jenis pembayaran belum diatur",
      });
    }

    if (Array.isArray(type.grade_ids) && type.grade_ids.length > 0 && !type.grade_ids.includes(gradeId)) {
      return res.status(400).json({
        message: "Jenis pembayaran ini tidak berlaku untuk tingkat yang dipilih",
      });
    }

    const duplicateCheck = await client.query(
      `
        SELECT charge_id
        FROM finance.other_payment_charges
        WHERE homebase_id = $1
          AND periode_id = $2
          AND type_id = $3
          AND student_id = $4
        LIMIT 1
      `,
      [homebaseId, periodeId, typeId, studentId],
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Tagihan untuk siswa dan jenis biaya ini sudah ada",
      });
    }

    const result = await client.query(
      `
        INSERT INTO finance.other_payment_charges (
          homebase_id,
          periode_id,
          type_id,
          student_id,
          amount_due,
          notes,
          status,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'unpaid', $7)
        RETURNING charge_id
      `,
      [homebaseId, periodeId, typeId, studentId, amountDue, notes, userId],
    );

    res.status(201).json({
      status: "success",
      message: "Tagihan pembayaran lainnya berhasil ditambahkan",
      data: { id: result.rows[0].charge_id },
    });
  }),
);

router.put(
  "/others/charges/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureOtherFinanceTables(client);

    const chargeId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const typeId = parseOptionalInt(req.body.type_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const notes = (req.body.notes || "").trim() || null;

    if (!chargeId || !periodeId || !gradeId || !typeId || !studentId) {
      return res.status(400).json({ message: "Data tagihan pembayaran lainnya belum lengkap" });
    }

    const chargeScope = await getChargeScopeById(client, chargeId, homebaseId);
    if (!chargeScope) {
      return res.status(404).json({ message: "Tagihan pembayaran lainnya tidak ditemukan" });
    }

    const scopeCheck = await ensureGradeAndPeriode(client, homebaseId, periodeId, gradeId);
    if (scopeCheck.error) {
      return res.status(404).json({ message: scopeCheck.error });
    }

    const studentCheck = await ensureStudentScope(
      client,
      homebaseId,
      studentId,
      periodeId,
      gradeId,
    );
    if (studentCheck.error) {
      return res.status(404).json({ message: studentCheck.error });
    }

    const typeCheck = await client.query(
      `
        SELECT type_id, amount, grade_ids
        FROM finance.other_payment_types
        WHERE type_id = $1 AND homebase_id = $2
        LIMIT 1
      `,
      [typeId, homebaseId],
    );

    if (typeCheck.rowCount === 0) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    const type = typeCheck.rows[0];
    const amountDue = Number(type.amount || 0);

    if (amountDue <= 0) {
      return res.status(400).json({
        message: "Nominal pada jenis pembayaran belum diatur",
      });
    }

    if (Array.isArray(type.grade_ids) && type.grade_ids.length > 0 && !type.grade_ids.includes(gradeId)) {
      return res.status(400).json({
        message: "Jenis pembayaran ini tidak berlaku untuk tingkat yang dipilih",
      });
    }

    const paidSummary = await client.query(
      `
        SELECT COALESCE(SUM(amount_paid), 0) AS paid_amount
        FROM finance.other_payment_installments
        WHERE charge_id = $1
      `,
      [chargeId],
    );

    const paidAmount = Number(paidSummary.rows[0]?.paid_amount || 0);
    if (amountDue < paidAmount) {
      return res.status(400).json({
        message: "Nominal tagihan tidak boleh lebih kecil dari total pembayaran yang sudah masuk",
      });
    }

    const duplicateCheck = await client.query(
      `
        SELECT charge_id
        FROM finance.other_payment_charges
        WHERE homebase_id = $1
          AND periode_id = $2
          AND type_id = $3
          AND student_id = $4
          AND charge_id <> $5
        LIMIT 1
      `,
      [homebaseId, periodeId, typeId, studentId, chargeId],
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Tagihan untuk siswa dan jenis biaya ini sudah ada",
      });
    }

    await client.query(
      `
        UPDATE finance.other_payment_charges
        SET
          periode_id = $1,
          type_id = $2,
          student_id = $3,
          amount_due = $4,
          notes = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE charge_id = $6
      `,
      [periodeId, typeId, studentId, amountDue, notes, chargeId],
    );

    await syncChargeStatus(client, chargeId);

    res.json({
      status: "success",
      message: "Tagihan pembayaran lainnya berhasil diperbarui",
    });
  }),
);

router.delete(
  "/others/charges/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureOtherFinanceTables(client);

    const chargeId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;

    const chargeScope = await getChargeScopeById(client, chargeId, homebaseId);
    if (!chargeScope) {
      return res.status(404).json({ message: "Tagihan pembayaran lainnya tidak ditemukan" });
    }

    const installmentCheck = await client.query(
      `
        SELECT installment_id
        FROM finance.other_payment_installments
        WHERE charge_id = $1
        LIMIT 1
      `,
      [chargeId],
    );

    if (installmentCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Tagihan yang sudah memiliki riwayat pembayaran tidak dapat dihapus",
      });
    }

    await client.query(
      `
        DELETE FROM finance.other_payment_charges
        WHERE charge_id = $1 AND homebase_id = $2
      `,
      [chargeId, homebaseId],
    );

    res.json({
      status: "success",
      message: "Tagihan pembayaran lainnya berhasil dihapus",
    });
  }),
);

router.post(
  "/others/installments",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureOtherFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const chargeId = parseOptionalInt(req.body.charge_id);
    const amountPaid = Number(req.body.amount_paid);
    const paymentDate = req.body.payment_date || null;
    const paymentMethod = (req.body.payment_method || "").trim() || null;
    const notes = (req.body.notes || "").trim() || null;

    if (!chargeId || Number.isNaN(amountPaid) || !paymentDate) {
      return res.status(400).json({ message: "Data pembayaran belum lengkap" });
    }

    if (amountPaid <= 0) {
      return res.status(400).json({ message: "Nominal pembayaran harus lebih dari 0" });
    }

    const chargeScope = await getChargeScopeById(client, chargeId, homebaseId);
    if (!chargeScope) {
      return res.status(404).json({ message: "Tagihan pembayaran lainnya tidak ditemukan" });
    }

    const paidSummary = await client.query(
      `
        SELECT COALESCE(SUM(amount_paid), 0) AS paid_amount
        FROM finance.other_payment_installments
        WHERE charge_id = $1
      `,
      [chargeId],
    );

    const paidAmount = Number(paidSummary.rows[0]?.paid_amount || 0);
    const amountDue = Number(chargeScope.amount_due || 0);

    if (paidAmount + amountPaid > amountDue) {
      return res.status(400).json({
        message: "Nominal pembayaran melebihi sisa tagihan",
      });
    }

    const nextInstallmentResult = await client.query(
      `
        SELECT COALESCE(MAX(installment_number), 0) + 1 AS next_installment_number
        FROM finance.other_payment_installments
        WHERE charge_id = $1
      `,
      [chargeId],
    );

    const installmentResult = await client.query(
      `
        INSERT INTO finance.other_payment_installments (
          charge_id,
          installment_number,
          amount_paid,
          payment_date,
          payment_method,
          processed_by,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING installment_id
      `,
      [
        chargeId,
        Number(nextInstallmentResult.rows[0].next_installment_number),
        amountPaid,
        paymentDate,
        paymentMethod,
        userId,
        notes,
      ],
    );

    await syncChargeStatus(client, chargeId);

    res.status(201).json({
      status: "success",
      message: "Pembayaran berhasil ditambahkan",
      data: { id: installmentResult.rows[0].installment_id },
    });
  }),
);

router.put(
  "/others/installments/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureOtherFinanceTables(client);

    const installmentId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId, id: userId } = req.user;
    const amountPaid = Number(req.body.amount_paid);
    const paymentDate = req.body.payment_date || null;
    const paymentMethod = (req.body.payment_method || "").trim() || null;
    const notes = (req.body.notes || "").trim() || null;

    if (!installmentId || Number.isNaN(amountPaid) || !paymentDate) {
      return res.status(400).json({ message: "Data pembayaran belum lengkap" });
    }

    if (amountPaid <= 0) {
      return res.status(400).json({ message: "Nominal pembayaran harus lebih dari 0" });
    }

    const installmentScope = await client.query(
      `
        SELECT i.installment_id, i.charge_id
        FROM finance.other_payment_installments i
        JOIN finance.other_payment_charges c ON c.charge_id = i.charge_id
        WHERE i.installment_id = $1 AND c.homebase_id = $2
        LIMIT 1
      `,
      [installmentId, homebaseId],
    );

    if (installmentScope.rowCount === 0) {
      return res.status(404).json({ message: "Riwayat pembayaran tidak ditemukan" });
    }

    const chargeId = installmentScope.rows[0].charge_id;
    const chargeScope = await getChargeScopeById(client, chargeId, homebaseId);

    const paidSummary = await client.query(
      `
        SELECT COALESCE(SUM(amount_paid), 0) AS paid_amount
        FROM finance.other_payment_installments
        WHERE charge_id = $1 AND installment_id <> $2
      `,
      [chargeId, installmentId],
    );

    const paidAmount = Number(paidSummary.rows[0]?.paid_amount || 0);
    const amountDue = Number(chargeScope?.amount_due || 0);

    if (paidAmount + amountPaid > amountDue) {
      return res.status(400).json({
        message: "Nominal pembayaran melebihi sisa tagihan",
      });
    }

    await client.query(
      `
        UPDATE finance.other_payment_installments
        SET
          amount_paid = $1,
          payment_date = $2,
          payment_method = $3,
          processed_by = $4,
          notes = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE installment_id = $6
      `,
      [amountPaid, paymentDate, paymentMethod, userId, notes, installmentId],
    );

    await syncChargeStatus(client, chargeId);

    res.json({
      status: "success",
      message: "Riwayat pembayaran berhasil diperbarui",
    });
  }),
);

router.delete(
  "/others/installments/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureOtherFinanceTables(client);

    const installmentId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;

    const installmentScope = await client.query(
      `
        SELECT i.installment_id, i.charge_id
        FROM finance.other_payment_installments i
        JOIN finance.other_payment_charges c ON c.charge_id = i.charge_id
        WHERE i.installment_id = $1 AND c.homebase_id = $2
        LIMIT 1
      `,
      [installmentId, homebaseId],
    );

    if (installmentScope.rowCount === 0) {
      return res.status(404).json({ message: "Riwayat pembayaran tidak ditemukan" });
    }

    const chargeId = installmentScope.rows[0].charge_id;

    await client.query(
      `
        DELETE FROM finance.other_payment_installments
        WHERE installment_id = $1
      `,
      [installmentId],
    );

    await syncChargeStatus(client, chargeId);

    res.json({
      status: "success",
      message: "Riwayat pembayaran berhasil dihapus",
    });
  }),
);

export default router;
