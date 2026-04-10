import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const MONTH_NAMES = [
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

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const resolveScopedHomebaseId = async (db, user, requestedHomebaseId) => {
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

const parseMonthArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => parseOptionalInt(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => parseOptionalInt(item.trim()))
      .filter(Boolean);
  }

  return [];
};

const formatBillingPeriod = (month) => {
  if (!month || month < 1 || month > 12) {
    return "-";
  }

  return MONTH_NAMES[month - 1];
};

const ensureMonthlyFinanceTables = async (db) => {
  await db.query(`CREATE SCHEMA IF NOT EXISTS finance`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.spp_tariff (
      id bigserial PRIMARY KEY,
      homebase_id int NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id int NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
      grade_id int NOT NULL REFERENCES public.a_grade(id) ON DELETE CASCADE,
      amount numeric(14,2) NOT NULL CHECK (amount >= 0),
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_by int REFERENCES public.u_users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (homebase_id, periode_id, grade_id)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_spp_tariff_scope
    ON finance.spp_tariff(homebase_id, periode_id, grade_id, is_active)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.spp_payment_transaction (
      id bigserial PRIMARY KEY,
      homebase_id int NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id int NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
      grade_id int NOT NULL REFERENCES public.a_grade(id) ON DELETE CASCADE,
      student_id int NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      total_amount numeric(14,2) NOT NULL CHECK (total_amount >= 0),
      payment_method varchar(50),
      notes text,
      paid_at timestamptz NOT NULL DEFAULT now(),
      processed_by int REFERENCES public.u_users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.spp_payment_allocation (
      id bigserial PRIMARY KEY,
      transaction_id bigint NOT NULL REFERENCES finance.spp_payment_transaction(id) ON DELETE CASCADE,
      homebase_id int NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id int NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
      student_id int NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      bill_month smallint NOT NULL CHECK (bill_month BETWEEN 1 AND 12),
      amount numeric(14,2) NOT NULL CHECK (amount >= 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (student_id, periode_id, bill_month)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_spp_payment_transaction_scope
    ON finance.spp_payment_transaction(homebase_id, periode_id, grade_id, student_id, paid_at DESC)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_spp_payment_allocation_scope
    ON finance.spp_payment_allocation(homebase_id, periode_id, bill_month, student_id)
  `);
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

router.get(
  "/monthly/options",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const search = (req.query.search || "").trim();

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const enrollmentScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      search,
    });

    const [homebaseResult, periodeResult, gradeResult, classResult, studentResult] =
      await Promise.all([
        req.user.homebase_id
          ? db.query(
              `
                SELECT id, name
                FROM a_homebase
                WHERE id = $1
                ORDER BY name ASC
              `,
              [homebaseId],
            )
          : db.query(
              `
                SELECT id, name
                FROM a_homebase
                ORDER BY name ASC
              `,
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
          ${buildEnrollmentWhereClause({
            homebaseId,
            periodeId,
            gradeId,
            classId: null,
            studentId: null,
            search: "",
          }).whereClause}
          ORDER BY g.name ASC, c.name ASC
        `,
        buildEnrollmentWhereClause({
          homebaseId,
          periodeId,
          gradeId,
          classId: null,
          studentId: null,
          search: "",
        }).params,
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
      ]);

    res.json({
      status: "success",
      data: {
        homebases: homebaseResult.rows,
        selected_homebase_id: homebaseId,
        periodes: periodeResult.rows.map((item) => ({
          ...item,
          is_default: item.is_active,
        })),
        grades: gradeResult.rows,
        classes: classResult.rows,
        students: studentResult.rows,
        months: MONTH_NAMES.map((name, index) => ({
          value: index + 1,
          label: name,
        })),
      },
    });
  }),
);

router.get(
  "/monthly/students",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const search = (req.query.search || "").trim();
    const scope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      search,
    });

    const result = await db.query(
      `
        SELECT
          s.user_id AS id,
          u.full_name,
          s.nis,
          e.periode_id,
          p.name AS periode_name,
          c.id AS class_id,
          c.name AS class_name,
          g.id AS grade_id,
          g.name AS grade_name
        FROM u_class_enrollments e
        JOIN u_students s ON s.user_id = e.student_id
        JOIN u_users u ON u.id = s.user_id
        JOIN a_class c ON c.id = e.class_id
        JOIN a_grade g ON g.id = c.grade_id
        JOIN a_periode p ON p.id = e.periode_id
        ${scope.whereClause}
        ORDER BY u.full_name ASC
        LIMIT 100
      `,
      scope.params,
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  }),
);

router.get(
  "/monthly/tariffs",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureMonthlyFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const params = [homebaseId];
    let whereClause = `WHERE st.homebase_id = $1`;

    if (periodeId) {
      params.push(periodeId);
      whereClause += ` AND st.periode_id = $${params.length}`;
    }

    if (gradeId) {
      params.push(gradeId);
      whereClause += ` AND st.grade_id = $${params.length}`;
    }

    const result = await db.query(
      `
        SELECT
          st.id,
          st.homebase_id,
          hb.name AS homebase_name,
          st.periode_id,
          st.grade_id,
          st.amount,
          st.description,
          st.is_active,
          st.created_at,
          st.updated_at,
          p.name AS periode_name,
          g.name AS grade_name
        FROM finance.spp_tariff st
        JOIN a_homebase hb ON hb.id = st.homebase_id
        JOIN a_periode p ON p.id = st.periode_id
        JOIN a_grade g ON g.id = st.grade_id
        ${whereClause}
        ORDER BY p.is_active DESC, p.created_at DESC, g.name ASC
      `,
      params,
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  }),
);

router.post(
  "/monthly/tariffs",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureMonthlyFinanceTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const { id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const amount = Number(req.body.amount);
    const description = (req.body.description || "").trim() || null;
    const isActive = req.body.is_active !== false;

    if (!homebaseId || !periodeId || !gradeId || Number.isNaN(amount)) {
      return res.status(400).json({
        message: "Satuan, periode, tingkat, dan nominal tarif wajib diisi",
      });
    }

    if (amount < 0) {
      return res.status(400).json({ message: "Nominal tarif tidak boleh negatif" });
    }

    const scopeCheck = await ensureGradeAndPeriode(client, homebaseId, periodeId, gradeId);
    if (scopeCheck.error) {
      return res.status(404).json({ message: scopeCheck.error });
    }

    const existing = await client.query(
      `
        SELECT id
        FROM finance.spp_tariff
        WHERE homebase_id = $1 AND periode_id = $2 AND grade_id = $3
        LIMIT 1
      `,
      [homebaseId, periodeId, gradeId],
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        message: "Tarif SPP untuk satuan, periode, dan tingkat ini sudah ada",
      });
    }

    const result = await client.query(
      `
        INSERT INTO finance.spp_tariff (
          homebase_id,
          periode_id,
          grade_id,
          amount,
          description,
          is_active,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [homebaseId, periodeId, gradeId, amount, description, isActive, userId],
    );

    res.status(201).json({
      status: "success",
      message: "Tarif SPP berhasil ditambahkan",
      data: { id: result.rows[0].id },
    });
  }),
);

router.put(
  "/monthly/tariffs/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureMonthlyFinanceTables(client);

    const tariffId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const amount = Number(req.body.amount);
    const description = (req.body.description || "").trim() || null;
    const isActive = req.body.is_active !== false;

    if (!tariffId || !homebaseId || !periodeId || !gradeId || Number.isNaN(amount)) {
      return res.status(400).json({ message: "Data tarif tidak lengkap" });
    }

    if (amount < 0) {
      return res.status(400).json({ message: "Nominal tarif tidak boleh negatif" });
    }

    const currentTariff = await client.query(
      `SELECT id FROM finance.spp_tariff WHERE id = $1 AND homebase_id = $2`,
      [tariffId, homebaseId],
    );

    if (currentTariff.rowCount === 0) {
      return res.status(404).json({ message: "Tarif SPP tidak ditemukan" });
    }

    const scopeCheck = await ensureGradeAndPeriode(client, homebaseId, periodeId, gradeId);
    if (scopeCheck.error) {
      return res.status(404).json({ message: scopeCheck.error });
    }

    const duplicateCheck = await client.query(
      `
        SELECT id
        FROM finance.spp_tariff
        WHERE homebase_id = $1 AND periode_id = $2 AND grade_id = $3 AND id <> $4
        LIMIT 1
      `,
      [homebaseId, periodeId, gradeId, tariffId],
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Tarif SPP untuk satuan, periode, dan tingkat ini sudah ada",
      });
    }

    await client.query(
      `
        UPDATE finance.spp_tariff
        SET
          periode_id = $1,
          grade_id = $2,
          amount = $3,
          description = $4,
          is_active = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `,
      [periodeId, gradeId, amount, description, isActive, tariffId],
    );

    res.json({
      status: "success",
      message: "Tarif SPP berhasil diperbarui",
    });
  }),
);

router.delete(
  "/monthly/tariffs/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureMonthlyFinanceTables(client);

    const tariffId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;

    const result = await client.query(
      `DELETE FROM finance.spp_tariff WHERE id = $1 AND homebase_id = $2`,
      [tariffId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Tarif SPP tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Tarif SPP berhasil dihapus",
    });
  }),
);

router.get(
  "/monthly/payments",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureMonthlyFinanceTables(db);

    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const billMonth = parseOptionalInt(req.query.bill_month);
    const search = (req.query.search || "").trim();

    const scope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      studentId,
      search,
    });

    const selectedMonth = billMonth || 1;
    const result = await db.query(
      `
        WITH paid_history AS (
          SELECT
            homebase_id,
            periode_id,
            student_id,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT bill_month ORDER BY bill_month), NULL) AS paid_months
          FROM finance.spp_payment_allocation
          GROUP BY homebase_id, periode_id, student_id
        ),
        transaction_months AS (
          SELECT
            transaction_id,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT bill_month ORDER BY bill_month), NULL) AS bill_months
          FROM finance.spp_payment_allocation
          GROUP BY transaction_id
        )
        SELECT
          s.user_id AS student_id,
          u.full_name AS student_name,
          s.nis,
          e.periode_id,
          p.name AS periode_name,
          c.id AS class_id,
          c.name AS class_name,
          g.id AS grade_id,
          g.name AS grade_name,
          t.id AS tariff_id,
          COALESCE(t.amount, 0) AS amount,
          tx.id AS transaction_id,
          tx.payment_method,
          tx.notes,
          tx.paid_at,
          alloc.bill_month,
          COALESCE(ph.paid_months, '{}') AS paid_months,
          COALESCE(tm.bill_months, '{}') AS transaction_months
        FROM u_class_enrollments e
        JOIN u_students s ON s.user_id = e.student_id
        JOIN u_users u ON u.id = s.user_id
        JOIN a_class c ON c.id = e.class_id
        JOIN a_grade g ON g.id = c.grade_id
        JOIN a_periode p ON p.id = e.periode_id
        LEFT JOIN finance.spp_tariff t
          ON t.homebase_id = e.homebase_id
          AND t.periode_id = e.periode_id
          AND t.grade_id = g.id
          AND t.is_active = true
        LEFT JOIN finance.spp_payment_allocation alloc
          ON alloc.homebase_id = e.homebase_id
          AND alloc.periode_id = e.periode_id
          AND alloc.student_id = s.user_id
          AND alloc.bill_month = $${scope.params.length + 1}
        LEFT JOIN finance.spp_payment_transaction tx
          ON tx.id = alloc.transaction_id
        LEFT JOIN paid_history ph
          ON ph.homebase_id = e.homebase_id
          AND ph.periode_id = e.periode_id
          AND ph.student_id = s.user_id
        LEFT JOIN transaction_months tm ON tm.transaction_id = tx.id
        ${scope.whereClause}
        GROUP BY
          s.user_id, u.full_name, s.nis, e.periode_id, p.name,
          c.id, c.name, g.id, g.name, t.id, t.amount,
          tx.id, tx.payment_method, tx.notes, tx.paid_at, alloc.bill_month,
          ph.paid_months, tm.bill_months
        ORDER BY u.full_name ASC
      `,
      [...scope.params, selectedMonth],
    );

    const data = result.rows.map((item) => ({
      id: item.transaction_id,
      student_id: item.student_id,
      student_name: item.student_name,
      nis: item.nis,
      periode_id: item.periode_id,
      periode_name: item.periode_name,
      class_id: item.class_id,
      class_name: item.class_name,
      grade_id: item.grade_id,
      grade_name: item.grade_name,
      bill_month: selectedMonth,
      billing_period_label: formatBillingPeriod(selectedMonth),
      amount: Number(item.amount || 0),
      status: item.transaction_id ? "paid" : "unpaid",
      payment_method: item.payment_method,
      notes: item.notes,
      paid_at: item.paid_at,
      paid_months: (item.paid_months || []).sort((a, b) => a - b),
      bill_months: (item.transaction_months || []).sort((a, b) => a - b),
    }));

    const paidCount = data.filter((item) => item.status === "paid").length;
    const unpaidCount = data.length - paidCount;

    res.json({
      status: "success",
      data,
      summary: {
        total_records: data.length,
        total_amount: data.reduce((sum, item) => sum + item.amount, 0),
        paid_count: paidCount,
        unpaid_count: unpaidCount,
        overdue_count: 0,
        paid_amount: data
          .filter((item) => item.status === "paid")
          .reduce((sum, item) => sum + item.amount, 0),
      },
    });
  }),
);

router.post(
  "/monthly/payments",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureMonthlyFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const billMonths = [...new Set(parseMonthArray(req.body.bill_months))].sort(
      (left, right) => left - right,
    );
    const paymentMethod = (req.body.payment_method || "").trim() || null;
    const notes = (req.body.notes || "").trim() || null;

    if (!periodeId || !gradeId || !studentId || billMonths.length === 0) {
      return res.status(400).json({ message: "Data pembayaran SPP belum lengkap" });
    }

    if (billMonths.some((month) => month < 1 || month > 12)) {
      return res.status(400).json({ message: "Bulan tagihan harus antara 1-12" });
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

    const tariffResult = await client.query(
      `
        SELECT id, amount
        FROM finance.spp_tariff
        WHERE homebase_id = $1 AND periode_id = $2 AND grade_id = $3 AND is_active = true
        LIMIT 1
      `,
      [homebaseId, periodeId, gradeId],
    );

    if (tariffResult.rowCount === 0) {
      return res.status(404).json({
        message: "Tarif SPP aktif belum tersedia untuk periode dan tingkat ini",
      });
    }

    const tariff = tariffResult.rows[0];
    const duplicateCheck = await client.query(
      `
        SELECT bill_month
        FROM finance.spp_payment_allocation
        WHERE student_id = $1 AND periode_id = $2 AND bill_month = ANY($3::int[])
      `,
      [studentId, periodeId, billMonths],
    );

    if (duplicateCheck.rowCount > 0) {
      const duplicateMonths = duplicateCheck.rows
        .map((item) => formatBillingPeriod(item.bill_month))
        .join(", ");
      return res.status(409).json({
        message: `SPP untuk bulan ${duplicateMonths} sudah tercatat lunas`,
      });
    }

    const totalAmount = Number(tariff.amount) * billMonths.length;
    const transactionResult = await client.query(
      `
        INSERT INTO finance.spp_payment_transaction (
          homebase_id,
          periode_id,
          grade_id,
          student_id,
          total_amount,
          payment_method,
          notes,
          processed_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [homebaseId, periodeId, gradeId, studentId, totalAmount, paymentMethod, notes, userId],
    );

    const transactionId = transactionResult.rows[0].id;
    for (const month of billMonths) {
      await client.query(
        `
          INSERT INTO finance.spp_payment_allocation (
            transaction_id,
            homebase_id,
            periode_id,
            student_id,
            bill_month,
            amount
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [transactionId, homebaseId, periodeId, studentId, month, Number(tariff.amount)],
      );
    }

    res.status(201).json({
      status: "success",
      message: "Pembayaran SPP berhasil ditambahkan",
      data: { id: transactionId },
    });
  }),
);

router.put(
  "/monthly/payments/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureMonthlyFinanceTables(client);

    const paymentId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId, id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const billMonths = [...new Set(parseMonthArray(req.body.bill_months))].sort(
      (left, right) => left - right,
    );
    const paymentMethod = (req.body.payment_method || "").trim() || null;
    const notes = (req.body.notes || "").trim() || null;

    if (!paymentId || !periodeId || !gradeId || !studentId || billMonths.length === 0) {
      return res.status(400).json({ message: "Data pembayaran SPP belum lengkap" });
    }

    const currentPayment = await client.query(
      `
        SELECT id
        FROM finance.spp_payment_transaction
        WHERE id = $1 AND homebase_id = $2
      `,
      [paymentId, homebaseId],
    );

    if (currentPayment.rowCount === 0) {
      return res.status(404).json({ message: "Data pembayaran SPP tidak ditemukan" });
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

    const tariffResult = await client.query(
      `
        SELECT amount
        FROM finance.spp_tariff
        WHERE homebase_id = $1 AND periode_id = $2 AND grade_id = $3 AND is_active = true
        LIMIT 1
      `,
      [homebaseId, periodeId, gradeId],
    );

    if (tariffResult.rowCount === 0) {
      return res.status(404).json({
        message: "Tarif SPP aktif belum tersedia untuk periode dan tingkat ini",
      });
    }

    const duplicateCheck = await client.query(
      `
        SELECT bill_month
        FROM finance.spp_payment_allocation
        WHERE student_id = $1
          AND periode_id = $2
          AND bill_month = ANY($3::int[])
          AND transaction_id <> $4
      `,
      [studentId, periodeId, billMonths, paymentId],
    );

    if (duplicateCheck.rowCount > 0) {
      const duplicateMonths = duplicateCheck.rows
        .map((item) => formatBillingPeriod(item.bill_month))
        .join(", ");
      return res.status(409).json({
        message: `SPP untuk bulan ${duplicateMonths} sudah tercatat lunas`,
      });
    }

    const monthlyAmount = Number(tariffResult.rows[0].amount);
    await client.query(
      `
        UPDATE finance.spp_payment_transaction
        SET
          periode_id = $1,
          grade_id = $2,
          student_id = $3,
          total_amount = $4,
          payment_method = $5,
          notes = $6,
          processed_by = $7,
          paid_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `,
      [
        periodeId,
        gradeId,
        studentId,
        monthlyAmount * billMonths.length,
        paymentMethod,
        notes,
        userId,
        paymentId,
      ],
    );

    await client.query(
      `DELETE FROM finance.spp_payment_allocation WHERE transaction_id = $1`,
      [paymentId],
    );

    for (const month of billMonths) {
      await client.query(
        `
          INSERT INTO finance.spp_payment_allocation (
            transaction_id,
            homebase_id,
            periode_id,
            student_id,
            bill_month,
            amount
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [paymentId, homebaseId, periodeId, studentId, month, monthlyAmount],
      );
    }

    res.json({
      status: "success",
      message: "Pembayaran SPP berhasil diperbarui",
    });
  }),
);

router.delete(
  "/monthly/payments/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureMonthlyFinanceTables(client);

    const paymentId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;

    const result = await client.query(
      `
        DELETE FROM finance.spp_payment_transaction
        WHERE id = $1 AND homebase_id = $2
      `,
      [paymentId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Data pembayaran SPP tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Pembayaran SPP berhasil dihapus",
    });
  }),
);

export default router;
