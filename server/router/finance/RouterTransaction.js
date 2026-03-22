import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
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

const parseMonthArray = (value) => {
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

const formatBillingPeriod = (month) => {
  if (!month || month < 1 || month > 12) {
    return "-";
  }

  return MONTH_NAMES[month - 1];
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
      updated_at timestamptz NOT NULL DEFAULT now(),
      amount numeric(14,2) NOT NULL DEFAULT 0,
      grade_ids int[] NOT NULL DEFAULT '{}'
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.other_payment_charges (
      charge_id bigserial PRIMARY KEY,
      homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id int REFERENCES public.a_periode(id) ON DELETE CASCADE,
      type_id bigint NOT NULL REFERENCES finance.other_payment_types(type_id) ON DELETE RESTRICT,
      student_id int NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      amount_due numeric(14,2) NOT NULL CHECK (amount_due >= 0),
      notes text,
      status varchar(20) NOT NULL DEFAULT 'unpaid',
      created_by int REFERENCES public.u_users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
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

router.get(
  "/transactions/options",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureMonthlyFinanceTables(db);
    await ensureOtherFinanceTables(db);

    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const search = (req.query.search || "").trim();

    const enrollmentScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      studentId,
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

    const [periodeResult, gradeResult, classResult, studentResult] = await Promise.all([
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
          SELECT *
          FROM (
            SELECT DISTINCT ON (s.user_id, e.periode_id)
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
            ORDER BY s.user_id, e.periode_id, e.enrolled_at DESC, e.id DESC
          ) AS scoped_students
          ORDER BY
            grade_name ASC,
            class_name ASC,
            full_name ASC
        `,
        enrollmentScope.params,
      ),
    ]);

    let studentContext = null;
    let monthlyContext = {
      tariff_amount: 0,
      unpaid_months: [],
    };
    let otherCharges = [];

    if (periodeId && gradeId && studentId) {
      const studentCheck = await ensureStudentScope(
        db,
        homebaseId,
        studentId,
        periodeId,
        gradeId,
      );

      if (!studentCheck.error) {
        studentContext = studentCheck;

        const [tariffResult, paidMonthsResult, otherChargeResult] = await Promise.all([
          db.query(
            `
              SELECT amount
              FROM finance.spp_tariff
              WHERE homebase_id = $1
                AND periode_id = $2
                AND grade_id = $3
                AND is_active = true
              LIMIT 1
            `,
            [homebaseId, periodeId, gradeId],
          ),
          db.query(
            `
              SELECT bill_month
              FROM finance.spp_payment_allocation
              WHERE homebase_id = $1
                AND periode_id = $2
                AND student_id = $3
            `,
            [homebaseId, periodeId, studentId],
          ),
          db.query(
            `
              SELECT
                c.charge_id,
                c.periode_id,
                c.student_id,
                c.amount_due,
                c.notes,
                c.status,
                t.type_id,
                t.name AS type_name,
                t.description AS type_description,
                t.amount AS type_amount,
                COALESCE(SUM(i.amount_paid), 0) AS paid_amount,
                COUNT(i.installment_id)::int AS installment_count
              FROM finance.other_payment_types t
              LEFT JOIN finance.other_payment_charges c
                ON c.type_id = t.type_id
                AND c.homebase_id = $1
                AND c.periode_id = $2
                AND c.student_id = $3
              LEFT JOIN finance.other_payment_installments i ON i.charge_id = c.charge_id
              WHERE t.homebase_id = $1
                AND t.is_active = true
                AND (
                  COALESCE(array_length(t.grade_ids, 1), 0) = 0
                  OR $4 = ANY(t.grade_ids)
                )
              GROUP BY
                c.charge_id,
                c.periode_id,
                c.student_id,
                c.amount_due,
                c.notes,
                c.status,
                t.type_id,
                t.name,
                t.description,
                t.amount
              ORDER BY t.name ASC
            `,
            [homebaseId, periodeId, studentId, gradeId],
          ),
        ]);

        const paidMonths = new Set(
          paidMonthsResult.rows
            .map((item) => Number(item.bill_month))
            .filter((item) => item >= 1 && item <= 12),
        );

        monthlyContext = {
          tariff_amount: Number(tariffResult.rows[0]?.amount || 0),
          unpaid_months: MONTH_NAMES.map((label, index) => ({
            value: index + 1,
            label,
          })).filter((item) => !paidMonths.has(item.value)),
        };

        otherCharges = otherChargeResult.rows
          .map((item) => {
            const amountDue = Number(item.amount_due || item.type_amount || 0);
            const paidAmount = Number(item.paid_amount || 0);
            const remainingAmount = Math.max(amountDue - paidAmount, 0);

            return {
              charge_id: item.charge_id,
              periode_id: item.periode_id,
              student_id: item.student_id,
              type_id: item.type_id,
              type_name: item.type_name,
              type_description: item.type_description,
              amount_due: amountDue,
              paid_amount: paidAmount,
              remaining_amount: remainingAmount,
              installment_count: Number(item.installment_count || 0),
              status: deriveChargeStatus(amountDue, paidAmount),
              notes: item.notes,
            };
          })
          .filter((item) => item.remaining_amount > 0);
      }
    }

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
        months: MONTH_NAMES.map((label, index) => ({
          value: index + 1,
          label,
        })),
        student: studentContext,
        spp: monthlyContext,
        other_charges: otherCharges,
      },
    });
  }),
);

router.get(
  "/transactions",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureMonthlyFinanceTables(db);
    await ensureOtherFinanceTables(db);

    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const page = Math.max(parseOptionalInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseOptionalInt(req.query.limit) || 10, 1), 100);
    const categoryFilter = (req.query.category || "").trim().toLowerCase();
    const search = (req.query.search || "").trim();

    const scope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      studentId,
      search,
    });

    const [sppResult, otherResult] = await Promise.all([
      db.query(
        `
          SELECT
            tx.id,
            tx.student_id,
            tx.periode_id,
            tx.grade_id,
            c.id AS class_id,
            tx.total_amount AS amount,
            tx.payment_method,
            tx.notes,
            tx.paid_at,
            u.full_name AS student_name,
            s.nis,
            c.name AS class_name,
            p.name AS periode_name,
            ARRAY_REMOVE(ARRAY_AGG(alloc.bill_month ORDER BY alloc.bill_month), NULL) AS bill_months
          FROM finance.spp_payment_transaction tx
          JOIN u_students s ON s.user_id = tx.student_id
          JOIN u_users u ON u.id = s.user_id
          JOIN u_class_enrollments e
            ON e.student_id = tx.student_id
            AND e.periode_id = tx.periode_id
            AND e.homebase_id = tx.homebase_id
          JOIN a_class c ON c.id = e.class_id
          JOIN a_grade g ON g.id = c.grade_id
          JOIN a_periode p ON p.id = tx.periode_id
          LEFT JOIN finance.spp_payment_allocation alloc ON alloc.transaction_id = tx.id
          ${scope.whereClause.replace("WHERE e.homebase_id = $1", "WHERE tx.homebase_id = $1")}
          GROUP BY tx.id, u.full_name, s.nis, c.id, c.name, p.name
          ORDER BY tx.paid_at DESC
        `,
        scope.params,
      ),
      db.query(
        `
          SELECT
            i.installment_id,
            charge.charge_id,
            charge.type_id,
            charge.student_id,
            charge.periode_id,
            g.id AS grade_id,
            c.id AS class_id,
            charge.amount_due,
            COALESCE(charge_paid.total_paid, 0) AS charge_total_paid,
            i.amount_paid AS amount,
            i.payment_method,
            i.notes,
            i.payment_date,
            u.full_name AS student_name,
            s.nis,
            c.name AS class_name,
            p.name AS periode_name,
            t.name AS type_name,
            i.installment_number
          FROM finance.other_payment_installments i
          JOIN finance.other_payment_charges charge ON charge.charge_id = i.charge_id
          JOIN finance.other_payment_types t ON t.type_id = charge.type_id
          JOIN u_students s ON s.user_id = charge.student_id
          JOIN u_users u ON u.id = s.user_id
          LEFT JOIN (
            SELECT charge_id, COALESCE(SUM(amount_paid), 0) AS total_paid
            FROM finance.other_payment_installments
            GROUP BY charge_id
          ) charge_paid ON charge_paid.charge_id = charge.charge_id
          JOIN u_class_enrollments e
            ON e.student_id = charge.student_id
            AND e.periode_id = charge.periode_id
            AND e.homebase_id = charge.homebase_id
          JOIN a_class c ON c.id = e.class_id
          JOIN a_grade g ON g.id = c.grade_id
          JOIN a_periode p ON p.id = charge.periode_id
          ${scope.whereClause.replace("WHERE e.homebase_id = $1", "WHERE charge.homebase_id = $1")}
          ORDER BY i.payment_date DESC, i.installment_id DESC
        `,
        scope.params,
      ),
    ]);

    const monthlyTransactions = sppResult.rows.map((item) => ({
      key: `spp-${item.id}`,
      id: item.id,
      category: "spp",
      student_id: item.student_id,
      periode_id: item.periode_id,
      grade_id: item.grade_id,
      class_id: item.class_id,
      student_name: item.student_name,
      nis: item.nis,
      class_name: item.class_name,
      periode_name: item.periode_name,
      amount: Number(item.amount || 0),
      payment_method: item.payment_method,
      notes: item.notes,
      paid_at: item.paid_at,
      bill_months: item.bill_months || [],
      description: `SPP ${((item.bill_months || []).map((month) => formatBillingPeriod(month))).join(", ")}`,
    }));

    const otherTransactions = otherResult.rows.map((item) => ({
      key: `other-${item.installment_id}`,
      id: item.installment_id,
      category: "other",
      charge_id: item.charge_id,
      type_id: item.type_id,
      student_id: item.student_id,
      periode_id: item.periode_id,
      grade_id: item.grade_id,
      class_id: item.class_id,
      student_name: item.student_name,
      nis: item.nis,
      class_name: item.class_name,
      periode_name: item.periode_name,
      amount: Number(item.amount || 0),
      amount_due: Number(item.amount_due || 0),
      charge_total_paid: Number(item.charge_total_paid || 0),
      editable_max_amount:
        Number(item.amount_due || 0) - (Number(item.charge_total_paid || 0) - Number(item.amount || 0)),
      payment_method: item.payment_method,
      notes: item.notes,
      paid_at: item.payment_date,
      description: `${item.type_name} - Termin ${item.installment_number}`,
    }));

    const combinedData = [...monthlyTransactions, ...otherTransactions]
      .filter((item) => !categoryFilter || item.category === categoryFilter)
      .sort((left, right) => new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime());
    const totalRecords = combinedData.length;
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 1;
    const offset = (page - 1) * limit;
    const data = combinedData.slice(offset, offset + limit);

    res.json({
      status: "success",
      data,
      summary: {
        total_records: totalRecords,
        total_amount: combinedData.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        page,
        limit,
        total_pages: totalPages,
      },
    });
  }),
);

router.put(
  "/transactions/:category/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureMonthlyFinanceTables(client);
    await ensureOtherFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const category = (req.params.category || "").trim().toLowerCase();
    const transactionId = parseOptionalInt(req.params.id);

    if (!transactionId || !["spp", "other"].includes(category)) {
      return res.status(400).json({ message: "Kategori atau id transaksi tidak valid" });
    }

    if (category === "spp") {
      const periodeId = parseOptionalInt(req.body.periode_id);
      const gradeId = parseOptionalInt(req.body.grade_id);
      const studentId = parseOptionalInt(req.body.student_id);
      const paymentDate = req.body.payment_date || new Date().toISOString().slice(0, 10);
      const paymentMethod = (req.body.payment_method || "").trim() || null;
      const notes = (req.body.notes || "").trim() || null;
      const billMonths = [...new Set(parseMonthArray(req.body.bill_months))].sort(
        (left, right) => left - right,
      );

      if (!periodeId || !gradeId || !studentId || billMonths.length === 0) {
        return res.status(400).json({ message: "Data pembayaran SPP belum lengkap" });
      }

      const currentPayment = await client.query(
        `
          SELECT id
          FROM finance.spp_payment_transaction
          WHERE id = $1 AND homebase_id = $2
        `,
        [transactionId, homebaseId],
      );

      if (currentPayment.rowCount === 0) {
        return res.status(404).json({ message: "Transaksi SPP tidak ditemukan" });
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
          WHERE homebase_id = $1
            AND student_id = $2
            AND periode_id = $3
            AND bill_month = ANY($4::int[])
            AND transaction_id <> $5
        `,
        [homebaseId, studentId, periodeId, billMonths, transactionId],
      );

      if (duplicateCheck.rowCount > 0) {
        const duplicateMonths = duplicateCheck.rows
          .map((item) => formatBillingPeriod(item.bill_month))
          .join(", ");
        return res.status(409).json({
          message: `SPP untuk bulan ${duplicateMonths} sudah tercatat lunas`,
        });
      }

      const monthlyAmount = Number(tariffResult.rows[0].amount || 0);
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
            paid_at = $7,
            processed_by = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
        `,
        [
          periodeId,
          gradeId,
          studentId,
          monthlyAmount * billMonths.length,
          paymentMethod,
          notes,
          paymentDate,
          userId,
          transactionId,
        ],
      );

      await client.query(
        `DELETE FROM finance.spp_payment_allocation WHERE transaction_id = $1`,
        [transactionId],
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
          [transactionId, homebaseId, periodeId, studentId, month, monthlyAmount],
        );
      }

      return res.json({
        status: "success",
        message: "Transaksi SPP berhasil diperbarui",
      });
    }

    const amountPaid = Number(req.body.amount_paid);
    const paymentDate = req.body.payment_date || new Date().toISOString().slice(0, 10);
    const paymentMethod = (req.body.payment_method || "").trim() || null;
    const notes = (req.body.notes || "").trim() || null;

    if (Number.isNaN(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ message: "Nominal pembayaran lainnya tidak valid" });
    }

    const installmentScope = await client.query(
      `
        SELECT i.installment_id, i.charge_id
        FROM finance.other_payment_installments i
        JOIN finance.other_payment_charges c ON c.charge_id = i.charge_id
        WHERE i.installment_id = $1 AND c.homebase_id = $2
        LIMIT 1
      `,
      [transactionId, homebaseId],
    );

    if (installmentScope.rowCount === 0) {
      return res.status(404).json({ message: "Transaksi pembayaran lainnya tidak ditemukan" });
    }

    const chargeId = installmentScope.rows[0].charge_id;
    const chargeScope = await client.query(
      `
        SELECT amount_due
        FROM finance.other_payment_charges
        WHERE charge_id = $1 AND homebase_id = $2
        LIMIT 1
      `,
      [chargeId, homebaseId],
    );

    const paidSummary = await client.query(
      `
        SELECT COALESCE(SUM(amount_paid), 0) AS paid_amount
        FROM finance.other_payment_installments
        WHERE charge_id = $1 AND installment_id <> $2
      `,
      [chargeId, transactionId],
    );

    const amountDue = Number(chargeScope.rows[0]?.amount_due || 0);
    const paidAmount = Number(paidSummary.rows[0]?.paid_amount || 0);

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
      [amountPaid, paymentDate, paymentMethod, userId, notes, transactionId],
    );

    await syncChargeStatus(client, chargeId);

    return res.json({
      status: "success",
      message: "Transaksi pembayaran lainnya berhasil diperbarui",
    });
  }),
);

router.delete(
  "/transactions/:category/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureMonthlyFinanceTables(client);
    await ensureOtherFinanceTables(client);

    const { homebase_id: homebaseId } = req.user;
    const category = (req.params.category || "").trim().toLowerCase();
    const transactionId = parseOptionalInt(req.params.id);

    if (!transactionId || !["spp", "other"].includes(category)) {
      return res.status(400).json({ message: "Kategori atau id transaksi tidak valid" });
    }

    if (category === "spp") {
      const result = await client.query(
        `
          DELETE FROM finance.spp_payment_transaction
          WHERE id = $1 AND homebase_id = $2
        `,
        [transactionId, homebaseId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Transaksi SPP tidak ditemukan" });
      }

      return res.json({
        status: "success",
        message: "Transaksi SPP berhasil dihapus",
      });
    }

    const installmentScope = await client.query(
      `
        SELECT i.installment_id, i.charge_id
        FROM finance.other_payment_installments i
        JOIN finance.other_payment_charges c ON c.charge_id = i.charge_id
        WHERE i.installment_id = $1 AND c.homebase_id = $2
        LIMIT 1
      `,
      [transactionId, homebaseId],
    );

    if (installmentScope.rowCount === 0) {
      return res.status(404).json({ message: "Transaksi pembayaran lainnya tidak ditemukan" });
    }

    const chargeId = installmentScope.rows[0].charge_id;

    await client.query(
      `
        DELETE FROM finance.other_payment_installments
        WHERE installment_id = $1
      `,
      [transactionId],
    );

    await syncChargeStatus(client, chargeId);

    return res.json({
      status: "success",
      message: "Transaksi pembayaran lainnya berhasil dihapus",
    });
  }),
);

router.post(
  "/transactions",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureMonthlyFinanceTables(client);
    await ensureOtherFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const paymentDate = req.body.payment_date || new Date().toISOString().slice(0, 10);
    const paymentMethod = (req.body.payment_method || "").trim() || null;
    const notes = (req.body.notes || "").trim() || null;
    const billMonths = parseMonthArray(req.body.bill_months).sort((left, right) => left - right);
    const otherPayments = Array.isArray(req.body.other_payments)
      ? req.body.other_payments
          .map((item) => ({
            charge_id: parseOptionalInt(item?.charge_id),
            type_id: parseOptionalInt(item?.type_id),
            amount_paid: Number(item?.amount_paid),
          }))
          .filter(
            (item) =>
              (item.charge_id || item.type_id) && !Number.isNaN(item.amount_paid),
          )
      : [];

    if (!periodeId || !gradeId || !studentId) {
      return res.status(400).json({ message: "Periode, tingkat, dan siswa wajib diisi" });
    }

    if (billMonths.length === 0 && otherPayments.length === 0) {
      return res.status(400).json({
        message: "Pilih minimal satu pembayaran SPP atau pembayaran lainnya",
      });
    }

    if (billMonths.some((month) => month < 1 || month > 12)) {
      return res.status(400).json({ message: "Bulan SPP harus antara 1 sampai 12" });
    }

    if (otherPayments.some((item) => item.amount_paid <= 0)) {
      return res.status(400).json({
        message: "Nominal pembayaran lainnya harus lebih dari 0",
      });
    }

    const uniqueOtherKeys = new Set(
      otherPayments.map((item) => item.charge_id || `type-${item.type_id}`),
    );
    if (uniqueOtherKeys.size !== otherPayments.length) {
      return res.status(400).json({
        message: "Setiap tagihan pembayaran lainnya hanya boleh dipilih satu kali",
      });
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

    let sppTransactionId = null;
    const paidOtherChargeIds = [];

    if (billMonths.length > 0) {
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

      const duplicateCheck = await client.query(
        `
          SELECT bill_month
          FROM finance.spp_payment_allocation
          WHERE homebase_id = $1
            AND student_id = $2
            AND periode_id = $3
            AND bill_month = ANY($4::int[])
        `,
        [homebaseId, studentId, periodeId, billMonths],
      );

      if (duplicateCheck.rowCount > 0) {
        const duplicateMonths = duplicateCheck.rows
          .map((item) => formatBillingPeriod(item.bill_month))
          .join(", ");
        return res.status(409).json({
          message: `SPP untuk bulan ${duplicateMonths} sudah tercatat lunas`,
        });
      }

      const monthlyAmount = Number(tariffResult.rows[0].amount || 0);
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
            paid_at,
            processed_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `,
        [
          homebaseId,
          periodeId,
          gradeId,
          studentId,
          monthlyAmount * billMonths.length,
          paymentMethod,
          notes,
          paymentDate,
          userId,
        ],
      );

      sppTransactionId = transactionResult.rows[0].id;

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
          [sppTransactionId, homebaseId, periodeId, studentId, month, monthlyAmount],
        );
      }
    }

    for (const item of otherPayments) {
      let charge = null;

      if (item.charge_id) {
        const chargeResult = await client.query(
          `
            SELECT
              c.charge_id,
              c.type_id,
              c.amount_due,
              c.student_id,
              c.periode_id,
              c.homebase_id,
              COALESCE(MAX(i.installment_number), 0) AS last_installment_number,
              COALESCE(SUM(i.amount_paid), 0) AS paid_amount
            FROM finance.other_payment_charges c
            LEFT JOIN finance.other_payment_installments i ON i.charge_id = c.charge_id
            WHERE c.charge_id = $1
              AND c.homebase_id = $2
            GROUP BY c.charge_id
            LIMIT 1
          `,
          [item.charge_id, homebaseId],
        );

        if (chargeResult.rowCount === 0) {
          return res.status(404).json({
            message: `Tagihan pembayaran lainnya #${item.charge_id} tidak ditemukan`,
          });
        }

        charge = chargeResult.rows[0];
      } else {
        const typeResult = await client.query(
          `
            SELECT type_id, name, amount, grade_ids
            FROM finance.other_payment_types
            WHERE type_id = $1
              AND homebase_id = $2
              AND is_active = true
            LIMIT 1
          `,
          [item.type_id, homebaseId],
        );

        if (typeResult.rowCount === 0) {
          return res.status(404).json({
            message: `Jenis pembayaran lainnya #${item.type_id} tidak ditemukan`,
          });
        }

        const type = typeResult.rows[0];
        if (
          Array.isArray(type.grade_ids) &&
          type.grade_ids.length > 0 &&
          !type.grade_ids.includes(gradeId)
        ) {
          return res.status(400).json({
            message: `Jenis pembayaran ${type.name} tidak berlaku untuk tingkat yang dipilih`,
          });
        }

        const existingChargeResult = await client.query(
          `
            SELECT
              c.charge_id,
              c.type_id,
              c.amount_due,
              c.student_id,
              c.periode_id,
              c.homebase_id,
              COALESCE(MAX(i.installment_number), 0) AS last_installment_number,
              COALESCE(SUM(i.amount_paid), 0) AS paid_amount
            FROM finance.other_payment_charges c
            LEFT JOIN finance.other_payment_installments i ON i.charge_id = c.charge_id
            WHERE c.homebase_id = $1
              AND c.periode_id = $2
              AND c.student_id = $3
              AND c.type_id = $4
            GROUP BY c.charge_id
            LIMIT 1
          `,
          [homebaseId, periodeId, studentId, item.type_id],
        );

        if (existingChargeResult.rowCount > 0) {
          charge = existingChargeResult.rows[0];
        } else {
          const createdChargeResult = await client.query(
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
              RETURNING charge_id, type_id, amount_due, student_id, periode_id, homebase_id
            `,
            [homebaseId, periodeId, item.type_id, studentId, Number(type.amount || 0), notes, userId],
          );

          charge = {
            ...createdChargeResult.rows[0],
            last_installment_number: 0,
            paid_amount: 0,
          };
        }
      }

      if (Number(charge.student_id) !== studentId || Number(charge.periode_id) !== periodeId) {
        return res.status(400).json({
          message: "Tagihan pembayaran lainnya harus sesuai dengan siswa dan periode yang dipilih",
        });
      }

      const amountDue = Number(charge.amount_due || 0);
      const paidAmount = Number(charge.paid_amount || 0);
      const remainingAmount = Math.max(amountDue - paidAmount, 0);

      if (item.amount_paid > remainingAmount) {
        return res.status(400).json({
          message: `Nominal pembayaran untuk tagihan #${item.charge_id} melebihi sisa tagihan`,
        });
      }

      await client.query(
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
        `,
        [
          item.charge_id,
          Number(charge.last_installment_number || 0) + 1,
          item.amount_paid,
          paymentDate,
          paymentMethod,
          userId,
          notes,
        ],
      );

      await syncChargeStatus(client, item.charge_id);
      paidOtherChargeIds.push(item.charge_id);
    }

    res.status(201).json({
      status: "success",
      message: "Transaksi pembayaran berhasil disimpan",
      data: {
        student_id: studentId,
        spp_transaction_id: sppTransactionId,
        other_charge_ids: paidOtherChargeIds,
      },
    });
  }),
);

export default router;
