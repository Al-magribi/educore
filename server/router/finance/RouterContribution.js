import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const parseAmount = (value) => {
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const resolveContributionTimestamp = (value) => value || new Date().toISOString();

const buildStudentIncomeDescription = (studentEnrollment) =>
  `Pembayaran kas kelas oleh ${studentEnrollment.student_name}`;

const buildContributionTransactionDescription = (
  transactionType,
  studentEnrollment = null,
) =>
  transactionType === "income" && studentEnrollment
    ? buildStudentIncomeDescription(studentEnrollment)
    : "Pengeluaran kas kelas";

const ensureContributionFinanceTables = async (db) => {
  await db.query(`CREATE SCHEMA IF NOT EXISTS finance`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.class_cash_officers (
      officer_id bigserial PRIMARY KEY,
      homebase_id int NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id int NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
      class_id int NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
      student_id int NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      assigned_by int NOT NULL REFERENCES public.u_users(id) ON DELETE RESTRICT,
      assigned_at timestamptz NOT NULL DEFAULT now(),
      is_active boolean NOT NULL DEFAULT true,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (periode_id, class_id, student_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.class_cash_transactions (
      transaction_id bigserial PRIMARY KEY,
      class_id int NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
      transaction_type varchar(10) NOT NULL,
      amount numeric(14,2) NOT NULL,
      transaction_date timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_by int REFERENCES public.u_users(id) ON DELETE RESTRICT,
      description text NOT NULL,
      homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id int REFERENCES public.a_periode(id) ON DELETE CASCADE,
      student_id int REFERENCES public.u_students(user_id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    ALTER TABLE finance.class_cash_transactions
    ADD COLUMN IF NOT EXISTS homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE
  `);
  await db.query(`
    ALTER TABLE finance.class_cash_transactions
    ADD COLUMN IF NOT EXISTS periode_id int REFERENCES public.a_periode(id) ON DELETE CASCADE
  `);
  await db.query(`
    ALTER TABLE finance.class_cash_transactions
    ADD COLUMN IF NOT EXISTS student_id int REFERENCES public.u_students(user_id) ON DELETE SET NULL
  `);
  await db.query(`
    ALTER TABLE finance.class_cash_transactions
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()
  `);
  await db.query(`
    ALTER TABLE finance.class_cash_transactions
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `);
  await db.query(`
    ALTER TABLE finance.class_cash_transactions
    ALTER COLUMN amount TYPE numeric(14,2)
  `);
  await db.query(`
    ALTER TABLE finance.class_cash_transactions
    ALTER COLUMN transaction_date SET DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'class_cash_transactions_type_check'
          AND conrelid = 'finance.class_cash_transactions'::regclass
      ) THEN
        ALTER TABLE finance.class_cash_transactions
        ADD CONSTRAINT class_cash_transactions_type_check
        CHECK (transaction_type IN ('income', 'expense'));
      END IF;
    END $$;
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'class_cash_transactions_amount_check'
          AND conrelid = 'finance.class_cash_transactions'::regclass
      ) THEN
        ALTER TABLE finance.class_cash_transactions
        ADD CONSTRAINT class_cash_transactions_amount_check
        CHECK (amount > 0);
      END IF;
    END $$;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_class_cash_officers_scope
    ON finance.class_cash_officers(homebase_id, periode_id, class_id, is_active)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_class_cash_transactions_scope
    ON finance.class_cash_transactions(
      homebase_id,
      periode_id,
      class_id,
      transaction_date DESC,
      transaction_id DESC
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_class_cash_transactions_student
    ON finance.class_cash_transactions(periode_id, class_id, student_id, transaction_type)
  `);
};

const getActivePeriode = async (db, homebaseId) => {
  const result = await db.query(
    `
      SELECT id, name, is_active, created_at
      FROM a_periode
      WHERE homebase_id = $1
      ORDER BY is_active DESC, created_at DESC, id DESC
      LIMIT 1
    `,
    [homebaseId],
  );

  return result.rows[0] || null;
};

const getTeacherHomeroomClass = async (db, homebaseId, teacherId) => {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.name,
        c.grade_id,
        g.name AS grade_name
      FROM a_class c
      LEFT JOIN a_grade g ON g.id = c.grade_id
      WHERE c.homebase_id = $1
        AND c.homeroom_teacher_id = $2
        AND c.is_active = true
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT 1
    `,
    [homebaseId, teacherId],
  );

  return result.rows[0] || null;
};

const getContributionAccessContext = async (db, user) => {
  const homebaseId = user.homebase_id;
  const activePeriode = await getActivePeriode(db, homebaseId);

  if (!activePeriode || !activePeriode.is_active) {
    return {
      error:
        "Periode aktif untuk satuan ini belum tersedia. Aktifkan periode terlebih dahulu.",
    };
  }

  if (user.role !== "teacher") {
    return {
      error: "Akses kas kelas saat ini hanya tersedia untuk wali kelas.",
    };
  }

  const homeroomClass = await getTeacherHomeroomClass(db, homebaseId, user.id);

  if (!homeroomClass) {
    return {
      error:
        "Guru belum ditugaskan sebagai wali kelas aktif sehingga tidak dapat mengelola kas kelas.",
    };
  }

  return {
    homebaseId,
    activePeriode,
    homeroomClass,
    roleScope: "teacher",
  };
};

const getStudentActiveEnrollment = async (db, homebaseId, periodeId, studentId) => {
  const result = await db.query(
    `
      SELECT
        s.user_id AS student_id,
        s.nis,
        u.full_name AS student_name,
        c.id,
        c.name,
        c.grade_id,
        g.name AS grade_name
      FROM u_class_enrollments e
      JOIN u_students s ON s.user_id = e.student_id
      JOIN u_users u ON u.id = s.user_id
      JOIN a_class c ON c.id = e.class_id
      LEFT JOIN a_grade g ON g.id = c.grade_id
      WHERE e.homebase_id = $1
        AND e.periode_id = $2
        AND e.student_id = $3
      LIMIT 1
    `,
    [homebaseId, periodeId, studentId],
  );

  return result.rows[0] || null;
};

const getOfficerStatus = async (db, accessContext, studentId) => {
  const result = await db.query(
    `
      SELECT officer_id, is_active
      FROM finance.class_cash_officers
      WHERE homebase_id = $1
        AND periode_id = $2
        AND class_id = $3
        AND student_id = $4
      ORDER BY assigned_at DESC, officer_id DESC
      LIMIT 1
    `,
    [
      accessContext.homebaseId,
      accessContext.activePeriode.id,
      accessContext.homeroomClass.id,
      studentId,
    ],
  );

  const officer = result.rows[0];

  return {
    officerId: officer?.officer_id || null,
    isOfficer:
      officer?.is_active === true ||
      officer?.is_active === "true" ||
      officer?.is_active === 1,
  };
};

const getStudentContributionAccessContext = async (db, user) => {
  const homebaseId = user.homebase_id;
  const activePeriode = await getActivePeriode(db, homebaseId);

  if (!activePeriode || !activePeriode.is_active) {
    return {
      error:
        "Periode aktif untuk satuan ini belum tersedia. Aktifkan periode terlebih dahulu.",
    };
  }

  if (user.role !== "student") {
    return {
      error: "Akses ini hanya tersedia untuk siswa.",
    };
  }

  const activeClass = await getStudentActiveEnrollment(
    db,
    homebaseId,
    activePeriode.id,
    user.id,
  );

  if (!activeClass) {
    return {
      error: "Siswa belum terdaftar pada kelas aktif di periode berjalan.",
    };
  }

  const baseContext = {
    homebaseId,
    activePeriode,
    homeroomClass: {
      id: activeClass.id,
      name: activeClass.name,
      grade_id: activeClass.grade_id,
      grade_name: activeClass.grade_name,
    },
    ownStudentId: user.id,
    ownStudent: {
      student_id: activeClass.student_id,
      nis: activeClass.nis,
      student_name: activeClass.student_name,
    },
    roleScope: "student",
  };

  const officerStatus = await getOfficerStatus(db, baseContext, user.id);

  return {
    ...baseContext,
    isOfficer: officerStatus.isOfficer,
    officerId: officerStatus.officerId,
  };
};

const getClassStudents = async (db, accessContext, search = "") => {
  const params = [
    accessContext.homebaseId,
    accessContext.activePeriode.id,
    accessContext.homeroomClass.id,
  ];
  let whereClause = `
    WHERE e.homebase_id = $1
      AND e.periode_id = $2
      AND e.class_id = $3
  `;

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (
      u.full_name ILIKE $${params.length}
      OR COALESCE(s.nis, '') ILIKE $${params.length}
    )`;
  }

  const result = await db.query(
    `
      WITH income_scope AS (
        SELECT
          student_id,
          COUNT(*)::int AS payment_count,
          COALESCE(SUM(amount), 0) AS total_paid,
          MAX(transaction_date) AS last_paid_at
        FROM finance.class_cash_transactions
        WHERE homebase_id = $1
          AND periode_id = $2
          AND class_id = $3
          AND transaction_type = 'income'
          AND student_id IS NOT NULL
        GROUP BY student_id
      ),
      officer_scope AS (
        SELECT student_id, bool_or(is_active) AS is_officer
        FROM finance.class_cash_officers
        WHERE homebase_id = $1
          AND periode_id = $2
          AND class_id = $3
        GROUP BY student_id
      )
      SELECT
        s.user_id AS student_id,
        s.nis,
        u.full_name AS student_name,
        c.id AS class_id,
        c.name AS class_name,
        g.id AS grade_id,
        g.name AS grade_name,
        COALESCE(i.payment_count, 0) AS payment_count,
        COALESCE(i.total_paid, 0) AS total_paid,
        i.last_paid_at,
        COALESCE(o.is_officer, false) AS is_officer
      FROM u_class_enrollments e
      JOIN u_students s ON s.user_id = e.student_id
      JOIN u_users u ON u.id = s.user_id
      JOIN a_class c ON c.id = e.class_id
      LEFT JOIN a_grade g ON g.id = c.grade_id
      LEFT JOIN income_scope i ON i.student_id = s.user_id
      LEFT JOIN officer_scope o ON o.student_id = s.user_id
      ${whereClause}
      ORDER BY u.full_name ASC
    `,
    params,
  );

  return result.rows.map((item) => ({
    ...item,
    payment_count: Number(item.payment_count || 0),
    total_paid: Number(item.total_paid || 0),
    is_paid: Number(item.payment_count || 0) > 0,
    is_officer:
      item.is_officer === true ||
      item.is_officer === "true" ||
      item.is_officer === 1,
  }));
};

const getOfficers = async (db, accessContext) => {
  const result = await db.query(
    `
      SELECT
        o.officer_id,
        o.student_id,
        o.class_id,
        o.periode_id,
        o.assigned_by,
        o.assigned_at,
        o.is_active,
        o.notes,
        u.full_name AS student_name,
        s.nis,
        c.name AS class_name,
        assigner.full_name AS assigned_by_name
      FROM finance.class_cash_officers o
      JOIN u_students s ON s.user_id = o.student_id
      JOIN u_users u ON u.id = s.user_id
      JOIN a_class c ON c.id = o.class_id
      LEFT JOIN u_users assigner ON assigner.id = o.assigned_by
      WHERE o.homebase_id = $1
        AND o.periode_id = $2
        AND o.class_id = $3
      ORDER BY o.is_active DESC, u.full_name ASC
    `,
    [
      accessContext.homebaseId,
      accessContext.activePeriode.id,
      accessContext.homeroomClass.id,
    ],
  );

  return result.rows.map((item) => ({
    ...item,
    is_active:
      item.is_active === true ||
      item.is_active === "true" ||
      item.is_active === 1,
  }));
};

const getClassCashBalance = async (
  db,
  accessContext,
  excludeTransactionId = null,
) => {
  const params = [
    accessContext.homebaseId,
    accessContext.activePeriode.id,
    accessContext.homeroomClass.id,
  ];
  let exclusionClause = "";

  if (excludeTransactionId) {
    params.push(excludeTransactionId);
    exclusionClause = `AND transaction_id <> $${params.length}`;
  }

  const result = await db.query(
    `
      SELECT COALESCE(
        SUM(
          CASE
            WHEN transaction_type = 'income' THEN amount
            WHEN transaction_type = 'expense' THEN -amount
            ELSE 0
          END
        ),
        0
      ) AS balance
      FROM finance.class_cash_transactions
      WHERE homebase_id = $1
        AND periode_id = $2
        AND class_id = $3
        ${exclusionClause}
    `,
    params,
  );

  return Number(result.rows[0]?.balance || 0);
};

const getContributionTransactions = async (
  db,
  accessContext,
  { studentId = null, transactionType = null, search = "" } = {},
) => {
  const params = [
    accessContext.homebaseId,
    accessContext.activePeriode.id,
    accessContext.homeroomClass.id,
  ];
  let whereClause = `
    WHERE tx.homebase_id = $1
      AND tx.periode_id = $2
      AND tx.class_id = $3
  `;

  if (studentId) {
    params.push(studentId);
    whereClause += ` AND tx.student_id = $${params.length}`;
  }

  if (transactionType) {
    params.push(transactionType);
    whereClause += ` AND tx.transaction_type = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (
      COALESCE(student.full_name, '') ILIKE $${params.length}
      OR COALESCE(s.nis, '') ILIKE $${params.length}
      OR COALESCE(tx.description, '') ILIKE $${params.length}
    )`;
  }

  const result = await db.query(
    `
      SELECT
        tx.transaction_id,
        tx.homebase_id,
        tx.periode_id,
        tx.class_id,
        tx.student_id,
        tx.transaction_type,
        tx.amount,
        tx.transaction_date,
        tx.description,
        tx.created_at,
        tx.updated_at,
        c.name AS class_name,
        student.full_name AS student_name,
        s.nis,
        processor.full_name AS processed_by_name,
        tx.processed_by
      FROM finance.class_cash_transactions tx
      JOIN a_class c ON c.id = tx.class_id
      LEFT JOIN u_students s ON s.user_id = tx.student_id
      LEFT JOIN u_users student ON student.id = s.user_id
      LEFT JOIN u_users processor ON processor.id = tx.processed_by
      ${whereClause}
      ORDER BY tx.transaction_date DESC, tx.transaction_id DESC
    `,
    params,
  );

  return result.rows.map((item) => ({
    ...item,
    amount: Number(item.amount || 0),
  }));
};

const getTransactionScope = async (db, accessContext, transactionId) => {
  const result = await db.query(
    `
      SELECT
        transaction_id,
        homebase_id,
        periode_id,
        class_id,
        student_id,
        transaction_type,
        amount,
        transaction_date,
        description
      FROM finance.class_cash_transactions
      WHERE transaction_id = $1
        AND homebase_id = $2
        AND periode_id = $3
        AND class_id = $4
      LIMIT 1
    `,
    [
      transactionId,
      accessContext.homebaseId,
      accessContext.activePeriode.id,
      accessContext.homeroomClass.id,
    ],
  );

  return result.rows[0] || null;
};

const getStudentEnrollment = async (db, accessContext, studentId) => {
  const result = await db.query(
    `
      SELECT
        s.user_id AS student_id,
        s.nis,
        u.full_name AS student_name,
        c.id AS class_id,
        c.name AS class_name
      FROM u_class_enrollments e
      JOIN u_students s ON s.user_id = e.student_id
      JOIN u_users u ON u.id = s.user_id
      JOIN a_class c ON c.id = e.class_id
      WHERE e.homebase_id = $1
        AND e.periode_id = $2
        AND e.class_id = $3
        AND s.user_id = $4
      LIMIT 1
    `,
    [
      accessContext.homebaseId,
      accessContext.activePeriode.id,
      accessContext.homeroomClass.id,
      studentId,
    ],
  );

  return result.rows[0] || null;
};

router.get(
  "/contribution/options",
  authorize("teacher"),
  withQuery(async (req, res, db) => {
    await ensureContributionFinanceTables(db);

    const accessContext = await getContributionAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const [students, officers, transactions] = await Promise.all([
      getClassStudents(db, accessContext),
      getOfficers(db, accessContext),
      getContributionTransactions(db, accessContext),
    ]);

    const incomeTotal = transactions
      .filter((item) => item.transaction_type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = transactions
      .filter((item) => item.transaction_type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    res.json({
      status: "success",
      data: {
        access: {
          role_scope: accessContext.roleScope,
          homeroom_class: accessContext.homeroomClass,
        },
        active_periode: accessContext.activePeriode,
        class_summary: {
          total_students: students.length,
          paid_students: students.filter((item) => item.is_paid).length,
          unpaid_students: students.filter((item) => !item.is_paid).length,
          active_officers: officers.filter((item) => item.is_active).length,
          balance: incomeTotal - expenseTotal,
          income_total: incomeTotal,
          expense_total: expenseTotal,
          transaction_count: transactions.length,
        },
        students,
        officers,
      },
    });
  }),
);

router.get(
  "/contribution/students",
  authorize("teacher"),
  withQuery(async (req, res, db) => {
    await ensureContributionFinanceTables(db);

    const accessContext = await getContributionAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const search = (req.query.search || "").trim();
    const status = (req.query.status || "").trim();

    if (status && !["paid", "unpaid"].includes(status)) {
      return res.status(400).json({ message: "Filter status siswa tidak valid." });
    }

    let data = await getClassStudents(db, accessContext, search);

    if (status === "paid") {
      data = data.filter((item) => item.is_paid);
    }

    if (status === "unpaid") {
      data = data.filter((item) => !item.is_paid);
    }

    res.json({
      status: "success",
      data,
      summary: {
        total_students: data.length,
        paid_students: data.filter((item) => item.is_paid).length,
        unpaid_students: data.filter((item) => !item.is_paid).length,
        officer_students: data.filter((item) => item.is_officer).length,
        total_paid_amount: data.reduce((sum, item) => sum + item.total_paid, 0),
      },
    });
  }),
);

router.get(
  "/contribution/transactions",
  authorize("teacher"),
  withQuery(async (req, res, db) => {
    await ensureContributionFinanceTables(db);

    const accessContext = await getContributionAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const studentId = parseOptionalInt(req.query.student_id);
    const transactionType = (req.query.transaction_type || "").trim() || null;
    const search = (req.query.search || "").trim();

    if (transactionType && !["income", "expense"].includes(transactionType)) {
      return res.status(400).json({ message: "Jenis transaksi tidak valid." });
    }

    if (studentId) {
      const studentEnrollment = await getStudentEnrollment(
        db,
        accessContext,
        studentId,
      );

      if (!studentEnrollment) {
        return res.status(404).json({
          message: "Siswa tidak ditemukan pada kelas wali di periode aktif.",
        });
      }
    }

    const data = await getContributionTransactions(db, accessContext, {
      studentId,
      transactionType,
      search,
    });

    res.json({
      status: "success",
      data,
      summary: {
        total_transactions: data.length,
        income_total: data
          .filter((item) => item.transaction_type === "income")
          .reduce((sum, item) => sum + item.amount, 0),
        expense_total: data
          .filter((item) => item.transaction_type === "expense")
          .reduce((sum, item) => sum + item.amount, 0),
        balance: data.reduce(
          (sum, item) =>
            sum + (item.transaction_type === "expense" ? -item.amount : item.amount),
          0,
        ),
      },
    });
  }),
);

router.post(
  "/contribution/transactions",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    await ensureContributionFinanceTables(client);

    const accessContext = await getContributionAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const studentId = parseOptionalInt(req.body.student_id);
    const transactionType = (req.body.transaction_type || "").trim();
    const amount = parseAmount(req.body.amount);
    const transactionDate = resolveContributionTimestamp(req.body.transaction_date);
    if (!transactionType || amount === null) {
      return res.status(400).json({ message: "Data transaksi kas kelas belum lengkap." });
    }

    if (!["income", "expense"].includes(transactionType)) {
      return res.status(400).json({ message: "Jenis transaksi tidak valid." });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Nominal transaksi harus lebih dari 0." });
    }

    let studentEnrollment = null;

    if (transactionType === "income") {
      if (!studentId) {
        return res.status(400).json({
          message: "Siswa pembayar wajib dipilih untuk transaksi pemasukan.",
        });
      }

      studentEnrollment = await getStudentEnrollment(client, accessContext, studentId);

      if (!studentEnrollment) {
        return res.status(404).json({
          message: "Siswa tidak ditemukan pada kelas wali di periode aktif.",
        });
      }
    }

    if (transactionType === "expense") {
      const currentBalance = await getClassCashBalance(client, accessContext);

      if (amount > currentBalance) {
        return res.status(400).json({
          message: "Nominal pengeluaran melebihi saldo kas kelas saat ini.",
        });
      }
    }

    const description = buildContributionTransactionDescription(
      transactionType,
      studentEnrollment,
    );

    const result = await client.query(
      `
        INSERT INTO finance.class_cash_transactions (
          homebase_id,
          periode_id,
          class_id,
          student_id,
          transaction_type,
          amount,
          transaction_date,
          processed_by,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING transaction_id
      `,
      [
        accessContext.homebaseId,
        accessContext.activePeriode.id,
        accessContext.homeroomClass.id,
        transactionType === "income" ? studentId : null,
        transactionType,
        amount,
        transactionDate,
        req.user.id,
        description,
      ],
    );

    res.status(201).json({
      status: "success",
      message: "Transaksi kas kelas berhasil ditambahkan.",
      data: { id: result.rows[0].transaction_id },
    });
  }),
);

router.put(
  "/contribution/transactions/:id",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    await ensureContributionFinanceTables(client);

    const accessContext = await getContributionAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const transactionId = parseOptionalInt(req.params.id);
    const studentId = parseOptionalInt(req.body.student_id);
    const transactionType = (req.body.transaction_type || "").trim();
    const amount = parseAmount(req.body.amount);
    const transactionDate = resolveContributionTimestamp(req.body.transaction_date);
    if (!transactionId || !transactionType || amount === null) {
      return res.status(400).json({ message: "Data transaksi kas kelas belum lengkap." });
    }

    if (!["income", "expense"].includes(transactionType)) {
      return res.status(400).json({ message: "Jenis transaksi tidak valid." });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Nominal transaksi harus lebih dari 0." });
    }

    const existingTransaction = await getTransactionScope(
      client,
      accessContext,
      transactionId,
    );

    if (!existingTransaction) {
      return res.status(404).json({
        message: "Transaksi kas kelas tidak ditemukan pada akses pengguna saat ini.",
      });
    }

    let studentEnrollment = null;

    if (transactionType === "income") {
      if (!studentId) {
        return res.status(400).json({
          message: "Siswa pembayar wajib dipilih untuk transaksi pemasukan.",
        });
      }

      studentEnrollment = await getStudentEnrollment(client, accessContext, studentId);

      if (!studentEnrollment) {
        return res.status(404).json({
          message: "Siswa tidak ditemukan pada kelas wali di periode aktif.",
        });
      }
    }

    if (transactionType === "expense") {
      const currentBalance = await getClassCashBalance(
        client,
        accessContext,
        transactionId,
      );

      if (amount > currentBalance) {
        return res.status(400).json({
          message:
            "Nominal pengeluaran melebihi saldo kas kelas setelah transaksi lama dikecualikan.",
        });
      }
    }

    const description = buildContributionTransactionDescription(
      transactionType,
      studentEnrollment,
    );

    await client.query(
      `
        UPDATE finance.class_cash_transactions
        SET
          student_id = $1,
          transaction_type = $2,
          amount = $3,
          transaction_date = $4,
          processed_by = $5,
          description = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $7
      `,
      [
        transactionType === "income" ? studentId : null,
        transactionType,
        amount,
        transactionDate,
        req.user.id,
        description,
        transactionId,
      ],
    );

    res.json({
      status: "success",
      message: "Transaksi kas kelas berhasil diperbarui.",
    });
  }),
);

router.delete(
  "/contribution/transactions/:id",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    await ensureContributionFinanceTables(client);

    const accessContext = await getContributionAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const transactionId = parseOptionalInt(req.params.id);
    if (!transactionId) {
      return res.status(400).json({ message: "ID transaksi tidak valid." });
    }

    const existingTransaction = await getTransactionScope(
      client,
      accessContext,
      transactionId,
    );

    if (!existingTransaction) {
      return res.status(404).json({
        message: "Transaksi kas kelas tidak ditemukan pada akses pengguna saat ini.",
      });
    }

    await client.query(
      `DELETE FROM finance.class_cash_transactions WHERE transaction_id = $1`,
      [transactionId],
    );

    res.json({
      status: "success",
      message: "Transaksi kas kelas berhasil dihapus.",
    });
  }),
);

router.get(
  "/contribution/officers",
  authorize("teacher"),
  withQuery(async (req, res, db) => {
    await ensureContributionFinanceTables(db);

    const accessContext = await getContributionAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const data = await getOfficers(db, accessContext);

    res.json({
      status: "success",
      data,
    });
  }),
);

router.post(
  "/contribution/officers",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    await ensureContributionFinanceTables(client);

    const accessContext = await getContributionAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const studentId = parseOptionalInt(req.body.student_id);
    const notes = (req.body.notes || "").trim() || null;

    if (!studentId) {
      return res.status(400).json({ message: "Siswa petugas wajib dipilih." });
    }

    const studentEnrollment = await getStudentEnrollment(
      client,
      accessContext,
      studentId,
    );

    if (!studentEnrollment) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan pada kelas wali di periode aktif.",
      });
    }

    await client.query(
      `
        INSERT INTO finance.class_cash_officers (
          homebase_id,
          periode_id,
          class_id,
          student_id,
          assigned_by,
          notes,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (periode_id, class_id, student_id)
        DO UPDATE SET
          is_active = true,
          notes = EXCLUDED.notes,
          assigned_by = EXCLUDED.assigned_by,
          assigned_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        accessContext.homebaseId,
        accessContext.activePeriode.id,
        accessContext.homeroomClass.id,
        studentId,
        req.user.id,
        notes,
      ],
    );

    res.status(201).json({
      status: "success",
      message: "Petugas kas kelas berhasil ditetapkan.",
    });
  }),
);

router.delete(
  "/contribution/officers/:studentId",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    await ensureContributionFinanceTables(client);

    const accessContext = await getContributionAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const studentId = parseOptionalInt(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ message: "ID siswa tidak valid." });
    }

    const result = await client.query(
      `
        UPDATE finance.class_cash_officers
        SET
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE homebase_id = $1
          AND periode_id = $2
          AND class_id = $3
          AND student_id = $4
          AND is_active = true
        RETURNING officer_id
      `,
      [
        accessContext.homebaseId,
        accessContext.activePeriode.id,
        accessContext.homeroomClass.id,
        studentId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Petugas aktif untuk siswa tersebut tidak ditemukan.",
      });
    }

    res.json({
      status: "success",
      message: "Petugas kas kelas berhasil dinonaktifkan.",
    });
  }),
);

router.get(
  "/contribution/student/overview",
  authorize("student"),
  withQuery(async (req, res, db) => {
    await ensureContributionFinanceTables(db);

    const accessContext = await getStudentContributionAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const [students, officers, transactions] = await Promise.all([
      getClassStudents(db, accessContext),
      getOfficers(db, accessContext),
      getContributionTransactions(db, accessContext),
    ]);

    const ownStudent =
      students.find((item) => item.student_id === accessContext.ownStudentId) || null;
    const incomeTotal = transactions
      .filter((item) => item.transaction_type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = transactions
      .filter((item) => item.transaction_type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    res.json({
      status: "success",
      data: {
        access: {
          role_scope: accessContext.roleScope,
          class_scope: accessContext.homeroomClass,
          is_officer: accessContext.isOfficer,
        },
        active_periode: accessContext.activePeriode,
        own_student: ownStudent,
        class_summary: {
          total_students: students.length,
          paid_students: students.filter((item) => item.is_paid).length,
          unpaid_students: students.filter((item) => !item.is_paid).length,
          active_officers: officers.filter((item) => item.is_active).length,
          balance: incomeTotal - expenseTotal,
          income_total: incomeTotal,
          expense_total: expenseTotal,
          transaction_count: transactions.length,
        },
        officers,
      },
    });
  }),
);

router.get(
  "/contribution/student/students",
  authorize("student"),
  withQuery(async (req, res, db) => {
    await ensureContributionFinanceTables(db);

    const accessContext = await getStudentContributionAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const search = (req.query.search || "").trim();
    const status = (req.query.status || "").trim();

    if (status && !["paid", "unpaid"].includes(status)) {
      return res.status(400).json({ message: "Filter status siswa tidak valid." });
    }

    let data = await getClassStudents(db, accessContext, search);

    if (status === "paid") {
      data = data.filter((item) => item.is_paid);
    }

    if (status === "unpaid") {
      data = data.filter((item) => !item.is_paid);
    }

    res.json({
      status: "success",
      data,
      summary: {
        total_students: data.length,
        paid_students: data.filter((item) => item.is_paid).length,
        unpaid_students: data.filter((item) => !item.is_paid).length,
        officer_students: data.filter((item) => item.is_officer).length,
        total_paid_amount: data.reduce((sum, item) => sum + item.total_paid, 0),
      },
    });
  }),
);

router.get(
  "/contribution/student/transactions",
  authorize("student"),
  withQuery(async (req, res, db) => {
    await ensureContributionFinanceTables(db);

    const accessContext = await getStudentContributionAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const studentId = parseOptionalInt(req.query.student_id);
    const transactionType = (req.query.transaction_type || "").trim() || null;
    const search = (req.query.search || "").trim();

    if (transactionType && !["income", "expense"].includes(transactionType)) {
      return res.status(400).json({ message: "Jenis transaksi tidak valid." });
    }

    if (studentId) {
      const studentEnrollment = await getStudentEnrollment(
        db,
        accessContext,
        studentId,
      );

      if (!studentEnrollment) {
        return res.status(404).json({
          message: "Siswa tidak ditemukan pada kelas aktif di periode berjalan.",
        });
      }
    }

    const data = await getContributionTransactions(db, accessContext, {
      studentId,
      transactionType,
      search,
    });

    res.json({
      status: "success",
      data,
      summary: {
        total_transactions: data.length,
        income_total: data
          .filter((item) => item.transaction_type === "income")
          .reduce((sum, item) => sum + item.amount, 0),
        expense_total: data
          .filter((item) => item.transaction_type === "expense")
          .reduce((sum, item) => sum + item.amount, 0),
        balance: data.reduce(
          (sum, item) =>
            sum + (item.transaction_type === "expense" ? -item.amount : item.amount),
          0,
        ),
      },
    });
  }),
);

router.post(
  "/contribution/student/transactions",
  authorize("student"),
  withTransaction(async (req, res, client) => {
    await ensureContributionFinanceTables(client);

    const accessContext = await getStudentContributionAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    if (!accessContext.isOfficer) {
      return res.status(403).json({
        message: "Hanya siswa petugas kas yang dapat mencatat transaksi.",
      });
    }

    const studentId = parseOptionalInt(req.body.student_id);
    const transactionType = (req.body.transaction_type || "").trim();
    const amount = parseAmount(req.body.amount);
    const transactionDate = req.body.transaction_date || null;
    const description = (req.body.description || "").trim();

    if (!transactionType || amount === null || !transactionDate || !description) {
      return res.status(400).json({ message: "Data transaksi kas kelas belum lengkap." });
    }

    if (!["income", "expense"].includes(transactionType)) {
      return res.status(400).json({ message: "Jenis transaksi tidak valid." });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Nominal transaksi harus lebih dari 0." });
    }

    if (transactionType === "income" && !studentId) {
      return res.status(400).json({
        message: "Siswa pembayar wajib dipilih untuk transaksi pemasukan.",
      });
    }

    if (transactionType === "income") {
      const studentEnrollment = await getStudentEnrollment(
        client,
        accessContext,
        studentId,
      );

      if (!studentEnrollment) {
        return res.status(404).json({
          message: "Siswa tidak ditemukan pada kelas aktif di periode berjalan.",
        });
      }

      const description = rawDescription || buildStudentIncomeDescription(studentEnrollment);

      const result = await client.query(
        `
          INSERT INTO finance.class_cash_transactions (
            homebase_id,
            periode_id,
            class_id,
            student_id,
            transaction_type,
            amount,
            transaction_date,
            processed_by,
            description
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING transaction_id
        `,
        [
          accessContext.homebaseId,
          accessContext.activePeriode.id,
          accessContext.homeroomClass.id,
          studentId,
          transactionType,
          amount,
          transactionDate,
          req.user.id,
          description,
        ],
      );

      return res.status(201).json({
        status: "success",
        message: "Pembayaran kas kelas berhasil dicatat.",
        data: { id: result.rows[0].transaction_id },
      });
    }

    if (transactionType === "expense") {
      const description = rawDescription;

      if (!description) {
        return res.status(400).json({
          message: "Keterangan pengeluaran wajib diisi.",
        });
      }

      const currentBalance = await getClassCashBalance(client, accessContext);

      if (amount > currentBalance) {
        return res.status(400).json({
          message: "Nominal pengeluaran melebihi saldo kas kelas saat ini.",
        });
      }

      const result = await client.query(
        `
          INSERT INTO finance.class_cash_transactions (
            homebase_id,
            periode_id,
            class_id,
            student_id,
            transaction_type,
            amount,
            transaction_date,
            processed_by,
            description
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING transaction_id
        `,
        [
          accessContext.homebaseId,
          accessContext.activePeriode.id,
          accessContext.homeroomClass.id,
          null,
          transactionType,
          amount,
          transactionDate,
          req.user.id,
          description,
        ],
      );

      return res.status(201).json({
        status: "success",
        message: "Pengeluaran kas kelas berhasil dicatat.",
        data: { id: result.rows[0].transaction_id },
      });
    }

    return res.status(400).json({ message: "Jenis transaksi tidak valid." });
  }),
);

router.put(
  "/contribution/student/transactions/:id",
  authorize("student"),
  withTransaction(async (req, res, client) => {
    await ensureContributionFinanceTables(client);

    const accessContext = await getStudentContributionAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    if (!accessContext.isOfficer) {
      return res.status(403).json({
        message: "Hanya siswa petugas kas yang dapat mengubah transaksi.",
      });
    }

    const transactionId = parseOptionalInt(req.params.id);
    const studentId = parseOptionalInt(req.body.student_id);
    const transactionType = (req.body.transaction_type || "").trim();
    const amount = parseAmount(req.body.amount);
    const transactionDate = req.body.transaction_date || null;
    const description = (req.body.description || "").trim();

    if (
      !transactionId ||
      !transactionType ||
      amount === null ||
      !transactionDate ||
      !description
    ) {
      return res.status(400).json({ message: "Data transaksi kas kelas belum lengkap." });
    }

    if (!["income", "expense"].includes(transactionType)) {
      return res.status(400).json({ message: "Jenis transaksi tidak valid." });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Nominal transaksi harus lebih dari 0." });
    }

    const existingTransaction = await getTransactionScope(
      client,
      accessContext,
      transactionId,
    );

    if (!existingTransaction) {
      return res.status(404).json({
        message: "Transaksi kas kelas tidak ditemukan pada kelas aktif saat ini.",
      });
    }

    if (transactionType === "income" && !studentId) {
      return res.status(400).json({
        message: "Siswa pembayar wajib dipilih untuk transaksi pemasukan.",
      });
    }

    if (transactionType === "income") {
      const studentEnrollment = await getStudentEnrollment(
        client,
        accessContext,
        studentId,
      );

      if (!studentEnrollment) {
        return res.status(404).json({
          message: "Siswa tidak ditemukan pada kelas aktif di periode berjalan.",
        });
      }

      const description = rawDescription || buildStudentIncomeDescription(studentEnrollment);

      await client.query(
        `
          UPDATE finance.class_cash_transactions
          SET
            student_id = $1,
            transaction_type = $2,
            amount = $3,
            transaction_date = $4,
            processed_by = $5,
            description = $6,
            updated_at = CURRENT_TIMESTAMP
          WHERE transaction_id = $7
        `,
        [
          studentId,
          transactionType,
          amount,
          transactionDate,
          req.user.id,
          description,
          transactionId,
        ],
      );

      return res.json({
        status: "success",
        message: "Pembayaran kas kelas berhasil diperbarui.",
      });
    }

    if (transactionType === "expense") {
      const description = rawDescription;

      if (!description) {
        return res.status(400).json({
          message: "Keterangan pengeluaran wajib diisi.",
        });
      }

      const currentBalance = await getClassCashBalance(
        client,
        accessContext,
        transactionId,
      );

      if (amount > currentBalance) {
        return res.status(400).json({
          message:
            "Nominal pengeluaran melebihi saldo kas kelas setelah transaksi lama dikecualikan.",
        });
      }

      await client.query(
        `
          UPDATE finance.class_cash_transactions
          SET
            student_id = $1,
            transaction_type = $2,
            amount = $3,
            transaction_date = $4,
            processed_by = $5,
            description = $6,
            updated_at = CURRENT_TIMESTAMP
          WHERE transaction_id = $7
        `,
        [
          null,
          transactionType,
          amount,
          transactionDate,
          req.user.id,
          description,
          transactionId,
        ],
      );

      return res.json({
        status: "success",
        message: "Pengeluaran kas kelas berhasil diperbarui.",
      });
    }

    return res.status(400).json({ message: "Jenis transaksi tidak valid." });
  }),
);

router.delete(
  "/contribution/student/transactions/:id",
  authorize("student"),
  withTransaction(async (req, res, client) => {
    await ensureContributionFinanceTables(client);

    const accessContext = await getStudentContributionAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    if (!accessContext.isOfficer) {
      return res.status(403).json({
        message: "Hanya siswa petugas kas yang dapat menghapus transaksi.",
      });
    }

    const transactionId = parseOptionalInt(req.params.id);
    if (!transactionId) {
      return res.status(400).json({ message: "ID transaksi tidak valid." });
    }

    const existingTransaction = await getTransactionScope(
      client,
      accessContext,
      transactionId,
    );

    if (!existingTransaction) {
      return res.status(404).json({
        message: "Transaksi kas kelas tidak ditemukan pada kelas aktif saat ini.",
      });
    }

    await client.query(
      `DELETE FROM finance.class_cash_transactions WHERE transaction_id = $1`,
      [transactionId],
    );

    res.json({
      status: "success",
      message: "Transaksi kas kelas berhasil dihapus.",
    });
  }),
);

export default router;
