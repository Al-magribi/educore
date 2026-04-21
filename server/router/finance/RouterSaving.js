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

const ensureSavingsFinanceTables = async (db) => {
  await db.query(`CREATE SCHEMA IF NOT EXISTS finance`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.savings_transactions (
      transaction_id bigserial PRIMARY KEY,
      homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id int REFERENCES public.a_periode(id) ON DELETE CASCADE,
      class_id int REFERENCES public.a_class(id) ON DELETE CASCADE,
      student_id int NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
      transaction_type varchar(10) NOT NULL,
      amount numeric(14,2) NOT NULL,
      transaction_date date NOT NULL DEFAULT CURRENT_DATE,
      processed_by int REFERENCES public.u_users(id),
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    ALTER TABLE finance.savings_transactions
    ADD COLUMN IF NOT EXISTS homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE
  `);
  await db.query(`
    ALTER TABLE finance.savings_transactions
    ADD COLUMN IF NOT EXISTS periode_id int REFERENCES public.a_periode(id) ON DELETE CASCADE
  `);
  await db.query(`
    ALTER TABLE finance.savings_transactions
    ADD COLUMN IF NOT EXISTS class_id int REFERENCES public.a_class(id) ON DELETE CASCADE
  `);
  await db.query(`
    ALTER TABLE finance.savings_transactions
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()
  `);
  await db.query(`
    ALTER TABLE finance.savings_transactions
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `);
  await db.query(`
    ALTER TABLE finance.savings_transactions
    ADD COLUMN IF NOT EXISTS processed_by int REFERENCES public.u_users(id)
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'savings_transactions_type_check'
          AND conrelid = 'finance.savings_transactions'::regclass
      ) THEN
        ALTER TABLE finance.savings_transactions
        ADD CONSTRAINT savings_transactions_type_check
        CHECK (transaction_type IN ('deposit', 'withdrawal'));
      END IF;
    END $$;
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'savings_transactions_amount_check'
          AND conrelid = 'finance.savings_transactions'::regclass
      ) THEN
        ALTER TABLE finance.savings_transactions
        ADD CONSTRAINT savings_transactions_amount_check
        CHECK (amount > 0);
      END IF;
    END $$;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_savings_transactions_scope
    ON finance.savings_transactions(
      homebase_id,
      periode_id,
      class_id,
      student_id,
      transaction_date DESC,
      transaction_id DESC
    )
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

const getParentLinkedStudents = async (db, parentUserId) => {
  const result = await db.query(
    `
      WITH parent_links AS (
        SELECT
          ups.homebase_id,
          ups.student_id,
          ups.is_primary
        FROM public.u_parent_students ups
        WHERE ups.parent_user_id = $1

        UNION

        SELECT
          s.homebase_id,
          p.student_id,
          true AS is_primary
        FROM public.u_parents p
        JOIN public.u_students s ON s.user_id = p.student_id
        WHERE p.user_id = $1
          AND p.student_id IS NOT NULL
      )
      SELECT DISTINCT ON (pl.student_id)
        pl.student_id,
        pl.is_primary,
        COALESCE(pl.homebase_id, s.homebase_id) AS homebase_id,
        u.full_name AS student_name,
        s.nis,
        c.name AS class_name
      FROM parent_links pl
      JOIN public.u_students s ON s.user_id = pl.student_id
      JOIN public.u_users u ON u.id = s.user_id
      LEFT JOIN public.a_class c ON c.id = s.current_class_id
      ORDER BY pl.student_id, pl.is_primary DESC
    `,
    [parentUserId],
  );

  return result.rows.sort((left, right) => {
    if (left.is_primary && !right.is_primary) {
      return -1;
    }

    if (!left.is_primary && right.is_primary) {
      return 1;
    }

    return String(left.student_name || "").localeCompare(
      String(right.student_name || ""),
      "id",
      { sensitivity: "base" },
    );
  });
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

const getSavingsAccessContext = async (db, user) => {
  const homebaseId = user.homebase_id;
  const activePeriode = homebaseId
    ? await getActivePeriode(db, homebaseId)
    : null;

  if (user.role === "teacher" && (!activePeriode || !activePeriode.is_active)) {
    return {
      error:
        "Periode aktif untuk satuan ini belum tersedia. Aktifkan periode terlebih dahulu.",
    };
  }

  if (user.role === "teacher") {
    const homeroomClass = await getTeacherHomeroomClass(
      db,
      homebaseId,
      user.id,
    );

    if (!homeroomClass) {
      return {
        error:
          "Guru belum ditugaskan sebagai wali kelas aktif sehingga tidak dapat mengelola tabungan.",
      };
    }

    return {
      homebaseId,
      activePeriode,
      roleScope: "teacher",
      homeroomClass,
      isFinanceAdmin: false,
    };
  }

  if (
    user.role === "admin" &&
    ["keuangan", "satuan"].includes(user.admin_level)
  ) {
    return {
      homebaseId,
      activePeriode,
      roleScope: "admin",
      homeroomClass: null,
      isFinanceAdmin: true,
      isGlobalFinanceAdmin: !homebaseId,
    };
  }

  return {
    error: "Akses ke modul tabungan siswa tidak diizinkan.",
  };
};

const buildSavingsEnrollmentScope = ({
  accessContext,
  classId,
  studentId,
  search,
}) => {
  const params = [accessContext.homebaseId, accessContext.activePeriode.id];
  let whereClause = `WHERE e.homebase_id = $1 AND e.periode_id = $2`;

  if (accessContext.homeroomClass) {
    params.push(accessContext.homeroomClass.id);
    whereClause += ` AND e.class_id = $${params.length}`;
  } else if (classId) {
    params.push(classId);
    whereClause += ` AND e.class_id = $${params.length}`;
  }

  if (studentId) {
    params.push(studentId);
    whereClause += ` AND s.user_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (
      u.full_name ILIKE $${params.length}
      OR COALESCE(s.nis, '') ILIKE $${params.length}
      OR COALESCE(c.name, '') ILIKE $${params.length}
    )`;
  }

  return { params, whereClause };
};

const buildSavingsStudentScopeQuery = ({
  accessContext,
  classId,
  studentId,
  search,
}) => {
  const isGlobalFinanceAdmin = Boolean(accessContext.isGlobalFinanceAdmin);
  const params = isGlobalFinanceAdmin
    ? []
    : [accessContext.homebaseId, accessContext.activePeriode.id];
  const whereClauses = [`u.role = 'student'`, `u.is_active = true`];

  if (accessContext.homeroomClass) {
    params.push(accessContext.homeroomClass.id);
    whereClauses.push(`e.class_id = $${params.length}`);
  } else if (classId) {
    params.push(classId);
    whereClauses.push(`e.class_id = $${params.length}`);
  }

  if (studentId) {
    params.push(studentId);
    whereClauses.push(`s.user_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    whereClauses.push(`(
      u.full_name ILIKE $${params.length}
      OR COALESCE(s.nis, '') ILIKE $${params.length}
    )`);
  }

  return {
    params,
    cte: `
      WITH student_scope AS (
        SELECT
          s.user_id AS id,
          s.user_id AS student_id,
          u.full_name,
          u.full_name AS student_name,
          s.nis,
          hb.id AS homebase_id,
          hb.name AS homebase_name,
          per.id AS periode_id,
          per.name AS periode_name,
          e.class_id AS class_id,
          c.name AS class_name,
          g.id AS grade_id,
          g.name AS grade_name
        FROM u_students s
        JOIN u_users u ON u.id = s.user_id
        JOIN u_class_enrollments e
          ON e.student_id = s.user_id
        JOIN a_homebase hb ON hb.id = e.homebase_id
        JOIN a_periode per ON per.id = e.periode_id
        JOIN a_class c ON c.id = e.class_id
        LEFT JOIN a_grade g ON g.id = c.grade_id
        WHERE ${
          isGlobalFinanceAdmin
            ? "per.is_active = true"
            : "e.homebase_id = $1 AND e.periode_id = $2 AND c.homebase_id = $1"
        }
          AND ${whereClauses.join("\n          AND ")}
      ),
      ranked_student_scope AS (
        SELECT
          *,
          ROW_NUMBER() OVER (
            PARTITION BY student_id
            ORDER BY class_name ASC, student_name ASC
          ) AS row_num
        FROM student_scope
      )
    `,
  };
};

const ensureClassScope = async (db, accessContext, classId) => {
  if (!classId) {
    return { data: accessContext.homeroomClass || null };
  }

  if (
    accessContext.homeroomClass &&
    classId !== accessContext.homeroomClass.id
  ) {
    return {
      error:
        "Guru hanya dapat mengakses siswa dari kelas wali yang ditugaskan.",
    };
  }

  if (accessContext.isGlobalFinanceAdmin) {
    const result = await db.query(
      `
        SELECT id, name, grade_id, homebase_id
        FROM a_class
        WHERE id = $1
          AND is_active = true
        LIMIT 1
      `,
      [classId],
    );

    if (result.rowCount === 0) {
      return { error: "Kelas tidak ditemukan pada satuan aktif." };
    }

    return { data: result.rows[0] };
  }

  const result = await db.query(
    `
      SELECT id, name, grade_id
      FROM a_class
      WHERE id = $1
        AND homebase_id = $2
        AND is_active = true
      LIMIT 1
    `,
    [classId, accessContext.homebaseId],
  );

  if (result.rowCount === 0) {
    return { error: "Kelas tidak ditemukan pada satuan aktif." };
  }

  return { data: result.rows[0] };
};

const getStudentEnrollment = async (db, accessContext, studentId) => {
  const scope = buildSavingsStudentScopeQuery({
    accessContext,
    classId: null,
    studentId,
    search: "",
  });

  const result = await db.query(
    `
      ${scope.cte}
      SELECT
        student_id,
        nis,
        student_name,
        homebase_id,
        homebase_name,
        periode_id,
        periode_name,
        class_id,
        class_name,
        grade_id,
        grade_name
      FROM ranked_student_scope
      WHERE row_num = 1
      LIMIT 1
    `,
    scope.params,
  );

  return result.rowCount > 0 ? result.rows[0] : null;
};

const getStudentBalance = async (
  db,
  scopeContext,
  studentId,
  excludeTransactionId = null,
) => {
  const params = [scopeContext.homebaseId, scopeContext.periodeId, studentId];
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
            WHEN transaction_type = 'deposit' THEN amount
            WHEN transaction_type = 'withdrawal' THEN -amount
            ELSE 0
          END
        ),
        0
      ) AS balance
      FROM finance.savings_transactions
      WHERE homebase_id = $1
        AND periode_id = $2
        AND student_id = $3
        ${exclusionClause}
    `,
    params,
  );

  return Number(result.rows[0]?.balance || 0);
};

const getTransactionScope = async (db, accessContext, transactionId) => {
  const params = [transactionId];
  let whereClause = `WHERE st.transaction_id = $1`;

  if (!accessContext.isGlobalFinanceAdmin) {
    params.push(accessContext.homebaseId, accessContext.activePeriode.id);
    whereClause += ` AND st.homebase_id = $2 AND st.periode_id = $3`;
  }

  const result = await db.query(
    `
      SELECT
        st.transaction_id,
        st.homebase_id,
        st.periode_id,
        st.class_id,
        st.student_id,
        st.transaction_type,
        st.amount,
        st.transaction_date,
        st.description,
        u.full_name AS student_name,
        s.nis,
        c.name AS class_name
      FROM finance.savings_transactions st
      JOIN u_students s ON s.user_id = st.student_id
      JOIN u_users u ON u.id = s.user_id
      LEFT JOIN a_class c ON c.id = st.class_id
      ${whereClause}
      LIMIT 1
    `,
    params,
  );

  if (result.rowCount === 0) {
    return null;
  }

  const transaction = result.rows[0];

  if (
    accessContext.homeroomClass &&
    Number(transaction.class_id) !== Number(accessContext.homeroomClass.id)
  ) {
    return null;
  }

  return transaction;
};

router.get(
  "/saving/me",
  authorize("student", "parent"),
  withQuery(async (req, res, db) => {
    await ensureSavingsFinanceTables(db);

    let studentId = req.user.id;
    let homebaseId = req.user.homebase_id;
    let linkedStudents = [];
    const requestedStudentId = parseOptionalInt(req.query.student_id);

    if (req.user.role === "parent") {
      linkedStudents = await getParentLinkedStudents(db, req.user.id);

      if (linkedStudents.length === 0) {
        return res.status(404).json({
          message:
            "Akun orang tua belum terhubung ke data siswa. Hubungi admin sekolah.",
        });
      }

      const selectedStudent =
        linkedStudents.find(
          (item) => Number(item.student_id) === Number(requestedStudentId),
        ) || linkedStudents[0];

      studentId = selectedStudent.student_id;
      homebaseId = selectedStudent.homebase_id || homebaseId;
    }

    const activePeriode = await getActivePeriode(db, homebaseId);

    if (!activePeriode || !activePeriode.is_active) {
      return res.status(404).json({
        message:
          "Periode aktif untuk satuan ini belum tersedia. Hubungi admin sekolah.",
      });
    }

    const studentScope = await db.query(
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
        LEFT JOIN a_grade g ON g.id = c.grade_id
        WHERE e.homebase_id = $1
          AND e.periode_id = $2
          AND e.student_id = $3
        LIMIT 1
      `,
      [homebaseId, activePeriode.id, studentId],
    );

    if (studentScope.rowCount === 0) {
      return res.status(404).json({
        message:
          "Data kelas siswa pada periode aktif belum tersedia. Hubungi admin sekolah.",
      });
    }

    const transactionResult = await db.query(
      `
        SELECT
          st.transaction_id,
          st.transaction_type,
          st.amount,
          st.transaction_date,
          st.description,
          st.created_at,
          processor.full_name AS processed_by_name
        FROM finance.savings_transactions st
        LEFT JOIN u_users processor ON processor.id = st.processed_by
        WHERE st.homebase_id = $1
          AND st.periode_id = $2
          AND st.student_id = $3
        ORDER BY st.transaction_date DESC, st.transaction_id DESC
      `,
      [homebaseId, activePeriode.id, studentId],
    );

    const transactions = transactionResult.rows.map((item) => ({
      ...item,
      amount: Number(item.amount || 0),
    }));

    const totalDeposit = transactions
      .filter((item) => item.transaction_type === "deposit")
      .reduce((sum, item) => sum + item.amount, 0);
    const totalWithdrawal = transactions
      .filter((item) => item.transaction_type === "withdrawal")
      .reduce((sum, item) => sum + item.amount, 0);

    res.json({
      status: "success",
      data: {
        active_periode: activePeriode,
        children:
          req.user.role === "parent"
            ? linkedStudents.map((item) => ({
                student_id: Number(item.student_id),
                student_name: item.student_name,
                nis: item.nis,
                class_name: item.class_name,
                homebase_id: Number(item.homebase_id || 0) || null,
                is_primary: Boolean(item.is_primary),
              }))
            : [],
        selected_student_id:
          req.user.role === "parent" ? Number(studentId) : null,
        student: studentScope.rows[0],
        summary: {
          balance: totalDeposit - totalWithdrawal,
          total_deposit: totalDeposit,
          total_withdrawal: totalWithdrawal,
          transaction_count: transactions.length,
          deposit_count: transactions.filter(
            (item) => item.transaction_type === "deposit",
          ).length,
          withdrawal_count: transactions.filter(
            (item) => item.transaction_type === "withdrawal",
          ).length,
          latest_transaction_date: transactions[0]?.transaction_date || null,
        },
        transactions,
      },
    });
  }),
);

router.get(
  "/saving/options",
  authorize("satuan", "teacher", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureSavingsFinanceTables(db);

    const accessContext = await getSavingsAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const classId = parseOptionalInt(req.query.class_id);
    const classScope = await ensureClassScope(db, accessContext, classId);
    if (classScope.error) {
      return res.status(400).json({ message: classScope.error });
    }

    const studentScope = buildSavingsStudentScopeQuery({
      accessContext,
      classId: classScope.data?.id || null,
      studentId: null,
      search: "",
    });

    const classesResult = await db.query(
      `
        ${studentScope.cte}
        SELECT DISTINCT
          class_id AS id,
          class_name AS name,
          grade_id,
          grade_name
        FROM ranked_student_scope
        WHERE row_num = 1
        ORDER BY grade_name ASC NULLS LAST, name ASC
      `,
      studentScope.params,
    );

    const studentsResult = await db.query(
      `
        ${studentScope.cte}
        SELECT
          id,
          full_name,
          nis,
          homebase_id,
          homebase_name,
          periode_id,
          periode_name,
          class_id,
          class_name,
          grade_id,
          grade_name
        FROM ranked_student_scope
        WHERE row_num = 1
        ORDER BY class_name ASC, full_name ASC
      `,
      studentScope.params,
    );

    res.json({
      status: "success",
      data: {
        access: {
          role_scope: accessContext.roleScope,
          can_manage_all_classes: accessContext.isFinanceAdmin,
          homeroom_class: accessContext.homeroomClass,
        },
        active_periode: accessContext.activePeriode,
        classes: classesResult.rows,
        students: studentsResult.rows,
      },
    });
  }),
);

router.get(
  "/saving/students",
  authorize("satuan", "teacher", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureSavingsFinanceTables(db);

    const accessContext = await getSavingsAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const classId = parseOptionalInt(req.query.class_id);
    const search = (req.query.search || "").trim();
    const classScope = await ensureClassScope(db, accessContext, classId);
    if (classScope.error) {
      return res.status(400).json({ message: classScope.error });
    }

    const scope = buildSavingsStudentScopeQuery({
      accessContext,
      classId: classScope.data?.id || null,
      studentId: null,
      search,
    });

    const result = await db.query(
      `
        ${scope.cte}
        SELECT
          ss.student_id,
          ss.student_name,
          ss.nis,
          ss.homebase_id,
          ss.homebase_name,
          ss.periode_id,
          ss.periode_name,
          ss.class_id,
          ss.class_name,
          ss.grade_id,
          ss.grade_name,
          COUNT(st.transaction_id)::int AS transaction_count,
          COALESCE(
            SUM(CASE WHEN st.transaction_type = 'deposit' THEN st.amount ELSE 0 END),
            0
          ) AS deposit_total,
          COALESCE(
            SUM(CASE WHEN st.transaction_type = 'withdrawal' THEN st.amount ELSE 0 END),
            0
          ) AS withdrawal_total,
          COALESCE(
            SUM(
              CASE
                WHEN st.transaction_type = 'deposit' THEN st.amount
                WHEN st.transaction_type = 'withdrawal' THEN -st.amount
                ELSE 0
              END
            ),
            0
          ) AS balance,
          MAX(st.transaction_date) AS last_transaction_date
        FROM ranked_student_scope ss
        LEFT JOIN finance.savings_transactions st
          ON st.homebase_id = ss.homebase_id
          AND st.periode_id = ss.periode_id
          AND st.student_id = ss.student_id
        WHERE ss.row_num = 1
        GROUP BY
          ss.student_id,
          ss.student_name,
          ss.nis,
          ss.homebase_id,
          ss.homebase_name,
          ss.periode_id,
          ss.periode_name,
          ss.class_id,
          ss.class_name,
          ss.grade_id,
          ss.grade_name
        ORDER BY ss.class_name ASC, ss.student_name ASC
      `,
      scope.params,
    );

    const data = result.rows.map((item) => ({
      ...item,
      transaction_count: Number(item.transaction_count || 0),
      deposit_total: Number(item.deposit_total || 0),
      withdrawal_total: Number(item.withdrawal_total || 0),
      balance: Number(item.balance || 0),
    }));

    res.json({
      status: "success",
      data,
      summary: {
        total_students: data.length,
        active_students: data.filter((item) => item.transaction_count > 0)
          .length,
        total_balance: data.reduce((sum, item) => sum + item.balance, 0),
        total_deposit: data.reduce((sum, item) => sum + item.deposit_total, 0),
        total_withdrawal: data.reduce(
          (sum, item) => sum + item.withdrawal_total,
          0,
        ),
      },
    });
  }),
);

router.get(
  "/saving/transactions",
  authorize("satuan", "teacher", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureSavingsFinanceTables(db);

    const accessContext = await getSavingsAccessContext(db, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const classId = parseOptionalInt(req.query.class_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const transactionType = (req.query.transaction_type || "").trim() || null;
    const search = (req.query.search || "").trim();

    if (
      transactionType &&
      !["deposit", "withdrawal"].includes(transactionType)
    ) {
      return res.status(400).json({ message: "Jenis transaksi tidak valid." });
    }

    const classScope = await ensureClassScope(db, accessContext, classId);
    if (classScope.error) {
      return res.status(400).json({ message: classScope.error });
    }

    const studentScope = buildSavingsStudentScopeQuery({
      accessContext,
      classId: classScope.data?.id || null,
      studentId,
      search,
    });

    const params = [...studentScope.params];
    let transactionFilterClause = accessContext.isGlobalFinanceAdmin
      ? `WHERE 1=1`
      : `WHERE st.homebase_id = $1 AND st.periode_id = $2`;

    if (transactionType) {
      params.push(transactionType);
      transactionFilterClause += ` AND st.transaction_type = $${params.length}`;
    }

    const result = await db.query(
      `
        ${studentScope.cte}
        SELECT
          st.transaction_id,
          st.student_id,
          st.class_id,
          st.transaction_type,
          st.amount,
          st.transaction_date,
          st.description,
          st.created_at,
          st.updated_at,
          student.full_name AS student_name,
          s.nis,
          c.name AS class_name,
          processor.full_name AS processed_by_name
        FROM finance.savings_transactions st
        JOIN ranked_student_scope ss
          ON ss.student_id = st.student_id
         AND ss.row_num = 1
        JOIN u_students s ON s.user_id = st.student_id
        JOIN u_users student ON student.id = s.user_id
        LEFT JOIN a_class c ON c.id = st.class_id
        LEFT JOIN u_users processor ON processor.id = st.processed_by
        ${transactionFilterClause}
        ORDER BY st.transaction_date DESC, st.transaction_id DESC
      `,
      params,
    );

    const data = result.rows.map((item) => ({
      ...item,
      amount: Number(item.amount || 0),
    }));

    res.json({
      status: "success",
      data,
      summary: {
        total_transactions: data.length,
        total_deposit: data
          .filter((item) => item.transaction_type === "deposit")
          .reduce((sum, item) => sum + item.amount, 0),
        total_withdrawal: data
          .filter((item) => item.transaction_type === "withdrawal")
          .reduce((sum, item) => sum + item.amount, 0),
      },
    });
  }),
);

router.post(
  "/saving/transactions",
  authorize("satuan", "teacher", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureSavingsFinanceTables(client);

    const accessContext = await getSavingsAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const studentId = parseOptionalInt(req.body.student_id);
    const transactionType = (req.body.transaction_type || "").trim();
    const amount = parseAmount(req.body.amount);

    if (!studentId || !transactionType || amount === null) {
      return res
        .status(400)
        .json({ message: "Data transaksi tabungan belum lengkap." });
    }

    if (!["deposit", "withdrawal"].includes(transactionType)) {
      return res.status(400).json({ message: "Jenis transaksi tidak valid." });
    }

    if (amount <= 0) {
      return res
        .status(400)
        .json({ message: "Nominal transaksi harus lebih dari 0." });
    }

    const studentEnrollment = await getStudentEnrollment(
      client,
      accessContext,
      studentId,
    );

    if (!studentEnrollment) {
      return res.status(404).json({
        message:
          "Siswa tidak ditemukan pada periode aktif atau di luar akses pengguna.",
      });
    }

    const currentBalance = await getStudentBalance(
      client,
      {
        homebaseId: studentEnrollment.homebase_id,
        periodeId: studentEnrollment.periode_id,
      },
      studentId,
    );
    if (transactionType === "withdrawal" && amount > currentBalance) {
      return res.status(400).json({
        message:
          "Nominal penarikan melebihi saldo tabungan siswa pada periode aktif.",
      });
    }

    const result = await client.query(
      `
        INSERT INTO finance.savings_transactions (
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
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, NULL)
        RETURNING transaction_id
      `,
      [
        studentEnrollment.homebase_id,
        studentEnrollment.periode_id,
        studentEnrollment.class_id,
        studentId,
        transactionType,
        amount,
        req.user.id,
      ],
    );

    res.status(201).json({
      status: "success",
      message: "Transaksi tabungan berhasil ditambahkan.",
      data: { id: result.rows[0].transaction_id },
    });
  }),
);

router.put(
  "/saving/transactions/:id",
  authorize("satuan", "teacher", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureSavingsFinanceTables(client);

    const accessContext = await getSavingsAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const transactionId = parseOptionalInt(req.params.id);
    const studentId = parseOptionalInt(req.body.student_id);
    const transactionType = (req.body.transaction_type || "").trim();
    const amount = parseAmount(req.body.amount);

    if (!transactionId || !studentId || !transactionType || amount === null) {
      return res
        .status(400)
        .json({ message: "Data transaksi tabungan belum lengkap." });
    }

    if (!["deposit", "withdrawal"].includes(transactionType)) {
      return res.status(400).json({ message: "Jenis transaksi tidak valid." });
    }

    if (amount <= 0) {
      return res
        .status(400)
        .json({ message: "Nominal transaksi harus lebih dari 0." });
    }

    const existingTransaction = await getTransactionScope(
      client,
      accessContext,
      transactionId,
    );

    if (!existingTransaction) {
      return res.status(404).json({
        message:
          "Transaksi tabungan tidak ditemukan pada akses pengguna saat ini.",
      });
    }

    const studentEnrollment = await getStudentEnrollment(
      client,
      accessContext,
      studentId,
    );

    if (!studentEnrollment) {
      return res.status(404).json({
        message:
          "Siswa tidak ditemukan pada periode aktif atau di luar akses pengguna.",
      });
    }

    const currentBalance = await getStudentBalance(
      client,
      {
        homebaseId: studentEnrollment.homebase_id,
        periodeId: studentEnrollment.periode_id,
      },
      studentId,
      transactionId,
    );

    if (transactionType === "withdrawal" && amount > currentBalance) {
      return res.status(400).json({
        message:
          "Nominal penarikan melebihi saldo tabungan siswa setelah transaksi lama dikecualikan.",
      });
    }

    await client.query(
      `
        UPDATE finance.savings_transactions
        SET
          homebase_id = $1,
          periode_id = $2,
          class_id = $3,
          student_id = $4,
          transaction_type = $5,
          amount = $6,
          processed_by = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $8
      `,
      [
        studentEnrollment.homebase_id,
        studentEnrollment.periode_id,
        studentEnrollment.class_id,
        studentId,
        transactionType,
        amount,
        req.user.id,
        transactionId,
      ],
    );

    res.json({
      status: "success",
      message: "Transaksi tabungan berhasil diperbarui.",
    });
  }),
);

router.delete(
  "/saving/transactions/:id",
  authorize("satuan", "teacher", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureSavingsFinanceTables(client);

    const accessContext = await getSavingsAccessContext(client, req.user);
    if (accessContext.error) {
      return res.status(403).json({ message: accessContext.error });
    }

    const transactionId = parseOptionalInt(req.params.id);
    if (!transactionId) {
      return res.status(400).json({ message: "ID transaksi tidak valid." });
    }

    const transactionScope = await getTransactionScope(
      client,
      accessContext,
      transactionId,
    );

    if (!transactionScope) {
      return res.status(404).json({
        message:
          "Transaksi tabungan tidak ditemukan pada akses pengguna saat ini.",
      });
    }

    await client.query(
      `DELETE FROM finance.savings_transactions WHERE transaction_id = $1`,
      [transactionId],
    );

    res.json({
      status: "success",
      message: "Transaksi tabungan berhasil dihapus.",
    });
  }),
);

export default router;
