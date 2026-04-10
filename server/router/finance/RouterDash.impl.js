import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js";
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

const formatMonthLabel = (month) => {
  if (!month || month < 1 || month > 12) {
    return "-";
  }

  return MONTH_NAMES[month - 1];
};

const formatCurrencyNumber = (value) => Number(value || 0);

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
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

const ensureManagedFundTables = async (db) => {
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
    ADD COLUMN IF NOT EXISTS transaction_date date NOT NULL DEFAULT CURRENT_DATE
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

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.class_cash_transactions (
      transaction_id bigserial PRIMARY KEY,
      homebase_id int REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id int REFERENCES public.a_periode(id) ON DELETE CASCADE,
      class_id int NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
      student_id int REFERENCES public.u_students(user_id) ON DELETE SET NULL,
      transaction_type varchar(10) NOT NULL,
      amount numeric(14,2) NOT NULL,
      transaction_date timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_by int REFERENCES public.u_users(id),
      description text NOT NULL,
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
    ADD COLUMN IF NOT EXISTS transaction_date timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    ADD COLUMN IF NOT EXISTS processed_by int REFERENCES public.u_users(id)
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
    CREATE INDEX IF NOT EXISTS idx_class_cash_transactions_scope
    ON finance.class_cash_transactions(
      homebase_id,
      periode_id,
      class_id,
      transaction_date DESC,
      transaction_id DESC
    )
  `);
};

const buildActiveScopeQuery = ({ includeAllUnits, homebaseId, targetHomebaseId }) => {
  if (includeAllUnits) {
    if (targetHomebaseId) {
      return {
        params: [targetHomebaseId],
        text: `
          SELECT
            hb.id AS homebase_id,
            hb.name AS homebase_name,
            p.id AS periode_id,
            p.name AS periode_name
          FROM a_homebase hb
          JOIN LATERAL (
            SELECT id, name, created_at
            FROM a_periode
            WHERE homebase_id = hb.id
              AND is_active = true
            ORDER BY created_at DESC, id DESC
            LIMIT 1
          ) p ON true
          WHERE hb.id = $1
          ORDER BY hb.name ASC
        `,
      };
    }

    return {
      params: [],
      text: `
        SELECT
          hb.id AS homebase_id,
          hb.name AS homebase_name,
          p.id AS periode_id,
          p.name AS periode_name
        FROM a_homebase hb
        JOIN LATERAL (
          SELECT id, name, created_at
          FROM a_periode
          WHERE homebase_id = hb.id
            AND is_active = true
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ) p ON true
        ORDER BY hb.name ASC
      `,
    };
  }

  return {
    params: [homebaseId],
    text: `
      SELECT
        hb.id AS homebase_id,
        hb.name AS homebase_name,
        p.id AS periode_id,
        p.name AS periode_name
      FROM a_homebase hb
      JOIN LATERAL (
        SELECT id, name, created_at
        FROM a_periode
        WHERE homebase_id = hb.id
          AND is_active = true
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) p ON true
      WHERE hb.id = $1
      ORDER BY hb.name ASC
    `,
  };
};

const buildEmptyPayload = ({ today, currentMonth, currentMonthLabel, scopeType }) => ({
  meta: {
    generated_at: today.toISOString(),
    current_month: currentMonth,
    current_month_label: currentMonthLabel,
    scope_type: scopeType,
    active_periode: null,
    active_scope: [],
  },
  summary: {
    school_revenue: 0,
    spp_collected: 0,
    other_collected: 0,
    savings_balance: 0,
    class_cash_balance: 0,
    managed_funds: 0,
    total_students: 0,
    total_classes: 0,
    total_grades: 0,
    active_spp_tariffs: 0,
    active_other_types: 0,
    homebase_count: 0,
    active_periode_count: 0,
  },
  spp: {
    expected_current_month: 0,
    paid_current_month: 0,
    outstanding_current_month: 0,
    paid_students_current_month: 0,
    unpaid_students_current_month: 0,
    collection_rate_current_month: 0,
  },
  others: {
    total_charges: 0,
    total_due: 0,
    total_paid: 0,
    total_remaining: 0,
    paid_count: 0,
    partial_count: 0,
    unpaid_count: 0,
  },
  savings: {
    balance: 0,
    deposit_total: 0,
    withdrawal_total: 0,
    transaction_count: 0,
  },
  class_cash: {
    balance: 0,
    income_total: 0,
    expense_total: 0,
    transaction_count: 0,
  },
  channels: [],
  priorities: [],
  recent_transactions: [],
  homebases: [],
});

router.get(
  "/dashboard",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureMonthlyFinanceTables(db);
    await ensureOtherFinanceTables(db);
    await ensureManagedFundTables(db);

    const { homebase_id: userHomebaseId, admin_level: adminLevel, role } = req.user;
    const targetHomebaseId = parseOptionalInt(req.query.homebase_id);
    const includeAllUnits =
      role === "admin" && (adminLevel === "pusat" || !userHomebaseId);

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentMonthLabel = formatMonthLabel(currentMonth);
    const scopeType = includeAllUnits ? "all_units" : "single_unit";
    const basePayload = buildEmptyPayload({
      today,
      currentMonth,
      currentMonthLabel,
      scopeType,
    });

    const activeScopeQuery = buildActiveScopeQuery({
      includeAllUnits,
      homebaseId: userHomebaseId,
      targetHomebaseId,
    });

    const activeScopeResult = await db.query(
      activeScopeQuery.text,
      activeScopeQuery.params,
    );
    const activeScopes = activeScopeResult.rows;

    if (!activeScopes.length) {
      return res.json({
        status: "success",
        data: basePayload,
      });
    }

    const activeScopeSql = activeScopeQuery.text.trim();
    const scopeParams = activeScopeQuery.params;
    const activePeriode = activeScopes.length === 1 ? activeScopes[0] : null;

    const [
      populationResult,
      tariffResult,
      activeOtherTypeResult,
      sppMonthlyResult,
      sppCollectedResult,
      otherSummaryResult,
      savingsSummaryResult,
      cashSummaryResult,
      unpaidOtherChargesResult,
      recentSppResult,
      recentOtherResult,
      recentSavingsResult,
      recentCashResult,
      homebaseSummaryResult,
    ] = await Promise.all([
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT
            COUNT(DISTINCT e.student_id)::int AS total_students,
            COUNT(DISTINCT e.class_id)::int AS total_classes,
            COUNT(DISTINCT c.grade_id)::int AS total_grades
          FROM active_scope scope
          LEFT JOIN u_class_enrollments e
            ON e.homebase_id = scope.homebase_id
            AND e.periode_id = scope.periode_id
          LEFT JOIN a_class c ON c.id = e.class_id
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT COUNT(*)::int AS active_spp_tariffs
          FROM finance.spp_tariff t
          JOIN active_scope scope
            ON scope.homebase_id = t.homebase_id
            AND scope.periode_id = t.periode_id
          WHERE t.is_active = true
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT COUNT(*)::int AS active_other_types
          FROM finance.other_payment_types t
          JOIN active_scope scope ON scope.homebase_id = t.homebase_id
          WHERE t.is_active = true
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql}),
          active_students AS (
            SELECT DISTINCT
              scope.homebase_id,
              scope.periode_id,
              e.student_id,
              c.grade_id
            FROM active_scope scope
            JOIN u_class_enrollments e
              ON e.homebase_id = scope.homebase_id
              AND e.periode_id = scope.periode_id
            JOIN a_class c ON c.id = e.class_id
          ),
          expected_scope AS (
            SELECT
              student_id,
              COALESCE(t.amount, 0) AS tariff_amount
            FROM active_students s
            LEFT JOIN finance.spp_tariff t
              ON t.homebase_id = s.homebase_id
              AND t.periode_id = s.periode_id
              AND t.grade_id = s.grade_id
              AND t.is_active = true
          ),
          paid_scope AS (
            SELECT
              COUNT(DISTINCT alloc.student_id)::int AS paid_students,
              COALESCE(SUM(alloc.amount), 0) AS paid_amount
            FROM finance.spp_payment_allocation alloc
            JOIN active_scope scope
              ON scope.homebase_id = alloc.homebase_id
              AND scope.periode_id = alloc.periode_id
            WHERE alloc.bill_month = $${scopeParams.length + 1}
          )
          SELECT
            COUNT(*)::int AS total_students,
            COALESCE(SUM(tariff_amount), 0) AS expected_amount,
            COALESCE((SELECT paid_students FROM paid_scope), 0) AS paid_students,
            COALESCE((SELECT paid_amount FROM paid_scope), 0) AS paid_amount
          FROM expected_scope
        `,
        [...scopeParams, currentMonth],
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT COALESCE(SUM(tx.total_amount), 0) AS spp_collected
          FROM finance.spp_payment_transaction tx
          JOIN active_scope scope
            ON scope.homebase_id = tx.homebase_id
            AND scope.periode_id = tx.periode_id
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql}),
          charge_summary AS (
            SELECT
              c.charge_id,
              c.amount_due,
              COALESCE(SUM(i.amount_paid), 0) AS paid_amount
            FROM finance.other_payment_charges c
            JOIN active_scope scope
              ON scope.homebase_id = c.homebase_id
              AND scope.periode_id = c.periode_id
            LEFT JOIN finance.other_payment_installments i
              ON i.charge_id = c.charge_id
            GROUP BY c.charge_id, c.amount_due
          )
          SELECT
            COUNT(*)::int AS total_charges,
            COALESCE(SUM(amount_due), 0) AS total_due,
            COALESCE(SUM(paid_amount), 0) AS total_paid,
            COALESCE(SUM(GREATEST(amount_due - paid_amount, 0)), 0) AS total_remaining,
            COUNT(*) FILTER (WHERE paid_amount >= amount_due AND amount_due > 0)::int AS paid_count,
            COUNT(*) FILTER (WHERE paid_amount > 0 AND paid_amount < amount_due)::int AS partial_count,
            COUNT(*) FILTER (WHERE paid_amount = 0)::int AS unpaid_count
          FROM charge_summary
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT
            COUNT(*)::int AS transaction_count,
            COALESCE(SUM(CASE WHEN st.transaction_type = 'deposit' THEN st.amount ELSE 0 END), 0) AS deposit_total,
            COALESCE(SUM(CASE WHEN st.transaction_type = 'withdrawal' THEN st.amount ELSE 0 END), 0) AS withdrawal_total,
            COALESCE(SUM(
              CASE
                WHEN st.transaction_type = 'deposit' THEN st.amount
                WHEN st.transaction_type = 'withdrawal' THEN -st.amount
                ELSE 0
              END
            ), 0) AS balance
          FROM finance.savings_transactions st
          JOIN active_scope scope
            ON scope.homebase_id = st.homebase_id
            AND scope.periode_id = st.periode_id
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT
            COUNT(*)::int AS transaction_count,
            COALESCE(SUM(CASE WHEN tx.transaction_type = 'income' THEN tx.amount ELSE 0 END), 0) AS income_total,
            COALESCE(SUM(CASE WHEN tx.transaction_type = 'expense' THEN tx.amount ELSE 0 END), 0) AS expense_total,
            COALESCE(SUM(
              CASE
                WHEN tx.transaction_type = 'income' THEN tx.amount
                WHEN tx.transaction_type = 'expense' THEN -tx.amount
                ELSE 0
              END
            ), 0) AS balance
          FROM finance.class_cash_transactions tx
          JOIN active_scope scope
            ON scope.homebase_id = tx.homebase_id
            AND scope.periode_id = tx.periode_id
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql}),
          charge_summary AS (
            SELECT
              scope.homebase_name,
              scope.periode_name,
              c.charge_id,
              c.student_id,
              c.type_id,
              c.notes,
              t.name AS type_name,
              u.full_name AS student_name,
              s.nis,
              cls.name AS class_name,
              c.amount_due,
              COALESCE(SUM(i.amount_paid), 0) AS paid_amount
            FROM finance.other_payment_charges c
            JOIN active_scope scope
              ON scope.homebase_id = c.homebase_id
              AND scope.periode_id = c.periode_id
            JOIN finance.other_payment_types t ON t.type_id = c.type_id
            JOIN u_students s ON s.user_id = c.student_id
            JOIN u_users u ON u.id = s.user_id
            LEFT JOIN u_class_enrollments e
              ON e.student_id = c.student_id
              AND e.periode_id = c.periode_id
              AND e.homebase_id = c.homebase_id
            LEFT JOIN a_class cls ON cls.id = e.class_id
            LEFT JOIN finance.other_payment_installments i ON i.charge_id = c.charge_id
            GROUP BY
              scope.homebase_name,
              scope.periode_name,
              c.charge_id,
              c.student_id,
              c.type_id,
              c.notes,
              t.name,
              u.full_name,
              s.nis,
              cls.name,
              c.amount_due
          )
          SELECT
            charge_id,
            student_id,
            type_id,
            type_name,
            student_name,
            nis,
            class_name,
            notes,
            amount_due,
            paid_amount,
            homebase_name,
            periode_name,
            GREATEST(amount_due - paid_amount, 0) AS remaining_amount
          FROM charge_summary
          WHERE GREATEST(amount_due - paid_amount, 0) > 0
          ORDER BY remaining_amount DESC, student_name ASC
          LIMIT 5
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT
            scope.homebase_name,
            scope.periode_name,
            tx.id,
            tx.student_id,
            tx.total_amount,
            tx.payment_method,
            tx.notes,
            tx.paid_at,
            u.full_name AS student_name,
            s.nis,
            cls.name AS class_name,
            ARRAY_REMOVE(ARRAY_AGG(alloc.bill_month ORDER BY alloc.bill_month), NULL) AS bill_months
          FROM finance.spp_payment_transaction tx
          JOIN active_scope scope
            ON scope.homebase_id = tx.homebase_id
            AND scope.periode_id = tx.periode_id
          JOIN u_students s ON s.user_id = tx.student_id
          JOIN u_users u ON u.id = s.user_id
          LEFT JOIN u_class_enrollments e
            ON e.student_id = tx.student_id
            AND e.periode_id = tx.periode_id
            AND e.homebase_id = tx.homebase_id
          LEFT JOIN a_class cls ON cls.id = e.class_id
          LEFT JOIN finance.spp_payment_allocation alloc ON alloc.transaction_id = tx.id
          GROUP BY tx.id, scope.homebase_name, scope.periode_name, u.full_name, s.nis, cls.name
          ORDER BY tx.paid_at DESC, tx.id DESC
          LIMIT 12
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql}),
          installment_scope AS (
            SELECT
              scope.homebase_name,
              scope.periode_name,
              i.installment_id,
              i.charge_id,
              i.amount_paid,
              i.payment_method,
              i.notes,
              i.payment_date,
              c.amount_due,
              c.student_id,
              t.name AS type_name,
              u.full_name AS student_name,
              s.nis,
              cls.name AS class_name
            FROM finance.other_payment_installments i
            JOIN finance.other_payment_charges c ON c.charge_id = i.charge_id
            JOIN active_scope scope
              ON scope.homebase_id = c.homebase_id
              AND scope.periode_id = c.periode_id
            JOIN finance.other_payment_types t ON t.type_id = c.type_id
            JOIN u_students s ON s.user_id = c.student_id
            JOIN u_users u ON u.id = s.user_id
            LEFT JOIN u_class_enrollments e
              ON e.student_id = c.student_id
              AND e.periode_id = c.periode_id
              AND e.homebase_id = c.homebase_id
            LEFT JOIN a_class cls ON cls.id = e.class_id
          ),
          payment_totals AS (
            SELECT charge_id, COALESCE(SUM(amount_paid), 0) AS total_paid
            FROM finance.other_payment_installments
            GROUP BY charge_id
          )
          SELECT
            s.installment_id,
            s.charge_id,
            s.amount_paid,
            s.payment_method,
            s.notes,
            s.payment_date,
            s.amount_due,
            s.student_id,
            s.type_name,
            s.student_name,
            s.nis,
            s.class_name,
            s.homebase_name,
            s.periode_name,
            COALESCE(pt.total_paid, 0) AS total_paid
          FROM installment_scope s
          LEFT JOIN payment_totals pt ON pt.charge_id = s.charge_id
          ORDER BY s.payment_date DESC, s.installment_id DESC
          LIMIT 12
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT
            scope.homebase_name,
            scope.periode_name,
            st.transaction_id,
            st.student_id,
            st.transaction_type,
            st.amount,
            st.transaction_date,
            st.description,
            u.full_name AS student_name,
            s.nis
          FROM finance.savings_transactions st
          JOIN active_scope scope
            ON scope.homebase_id = st.homebase_id
            AND scope.periode_id = st.periode_id
          LEFT JOIN u_students s ON s.user_id = st.student_id
          LEFT JOIN u_users u ON u.id = st.student_id
          ORDER BY st.transaction_date DESC, st.transaction_id DESC
          LIMIT 12
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT
            scope.homebase_name,
            scope.periode_name,
            tx.transaction_id,
            tx.class_id,
            tx.transaction_type,
            tx.amount,
            tx.transaction_date,
            tx.description,
            cls.name AS class_name
          FROM finance.class_cash_transactions tx
          JOIN active_scope scope
            ON scope.homebase_id = tx.homebase_id
            AND scope.periode_id = tx.periode_id
          JOIN a_class cls ON cls.id = tx.class_id
          ORDER BY tx.transaction_date DESC, tx.transaction_id DESC
          LIMIT 12
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql}),
          population AS (
            SELECT
              scope.homebase_id,
              COUNT(DISTINCT e.student_id)::int AS total_students,
              COUNT(DISTINCT e.class_id)::int AS total_classes
            FROM active_scope scope
            LEFT JOIN u_class_enrollments e
              ON e.homebase_id = scope.homebase_id
              AND e.periode_id = scope.periode_id
            GROUP BY scope.homebase_id
          ),
          active_students AS (
            SELECT DISTINCT
              scope.homebase_id,
              scope.periode_id,
              e.student_id,
              c.grade_id
            FROM active_scope scope
            LEFT JOIN u_class_enrollments e
              ON e.homebase_id = scope.homebase_id
              AND e.periode_id = scope.periode_id
            LEFT JOIN a_class c ON c.id = e.class_id
            WHERE e.student_id IS NOT NULL
          ),
          expected_scope AS (
            SELECT
              s.homebase_id,
              COALESCE(t.amount, 0) AS tariff_amount
            FROM active_students s
            LEFT JOIN finance.spp_tariff t
              ON t.homebase_id = s.homebase_id
              AND t.periode_id = s.periode_id
              AND t.grade_id = s.grade_id
              AND t.is_active = true
          ),
          expected_summary AS (
            SELECT
              homebase_id,
              COUNT(*)::int AS total_students,
              COALESCE(SUM(tariff_amount), 0) AS expected_amount
            FROM expected_scope
            GROUP BY homebase_id
          ),
          paid_scope AS (
            SELECT
              alloc.homebase_id,
              COUNT(DISTINCT alloc.student_id)::int AS paid_students,
              COALESCE(SUM(alloc.amount), 0) AS paid_amount
            FROM finance.spp_payment_allocation alloc
            JOIN active_scope scope
              ON scope.homebase_id = alloc.homebase_id
              AND scope.periode_id = alloc.periode_id
            WHERE alloc.bill_month = $${scopeParams.length + 1}
            GROUP BY alloc.homebase_id
          ),
          spp_collected AS (
            SELECT
              tx.homebase_id,
              COALESCE(SUM(tx.total_amount), 0) AS spp_collected
            FROM finance.spp_payment_transaction tx
            JOIN active_scope scope
              ON scope.homebase_id = tx.homebase_id
              AND scope.periode_id = tx.periode_id
            GROUP BY tx.homebase_id
          ),
          other_summary AS (
            SELECT
              c.homebase_id,
              COALESCE(SUM(c.amount_due), 0) AS total_due,
              COALESCE(SUM(COALESCE(i.total_paid, 0)), 0) AS total_paid
            FROM finance.other_payment_charges c
            JOIN active_scope scope
              ON scope.homebase_id = c.homebase_id
              AND scope.periode_id = c.periode_id
            LEFT JOIN (
              SELECT charge_id, COALESCE(SUM(amount_paid), 0) AS total_paid
              FROM finance.other_payment_installments
              GROUP BY charge_id
            ) i ON i.charge_id = c.charge_id
            GROUP BY c.homebase_id
          ),
          savings_summary AS (
            SELECT
              st.homebase_id,
              COALESCE(SUM(
                CASE
                  WHEN st.transaction_type = 'deposit' THEN st.amount
                  WHEN st.transaction_type = 'withdrawal' THEN -st.amount
                  ELSE 0
                END
              ), 0) AS balance
            FROM finance.savings_transactions st
            JOIN active_scope scope
              ON scope.homebase_id = st.homebase_id
              AND scope.periode_id = st.periode_id
            GROUP BY st.homebase_id
          ),
          cash_summary AS (
            SELECT
              tx.homebase_id,
              COALESCE(SUM(
                CASE
                  WHEN tx.transaction_type = 'income' THEN tx.amount
                  WHEN tx.transaction_type = 'expense' THEN -tx.amount
                  ELSE 0
                END
              ), 0) AS balance
            FROM finance.class_cash_transactions tx
            JOIN active_scope scope
              ON scope.homebase_id = tx.homebase_id
              AND scope.periode_id = tx.periode_id
            GROUP BY tx.homebase_id
          )
          SELECT
            scope.homebase_id,
            scope.homebase_name,
            scope.periode_id,
            scope.periode_name,
            COALESCE(pop.total_students, 0) AS total_students,
            COALESCE(pop.total_classes, 0) AS total_classes,
            COALESCE(exp.expected_amount, 0) AS expected_spp_current_month,
            COALESCE(paid.paid_amount, 0) AS paid_spp_current_month,
            GREATEST(COALESCE(exp.expected_amount, 0) - COALESCE(paid.paid_amount, 0), 0) AS outstanding_spp_current_month,
            COALESCE(spp.spp_collected, 0) AS spp_collected,
            COALESCE(other.total_paid, 0) AS other_collected,
            GREATEST(COALESCE(other.total_due, 0) - COALESCE(other.total_paid, 0), 0) AS other_remaining,
            COALESCE(savings.balance, 0) AS savings_balance,
            COALESCE(cash.balance, 0) AS class_cash_balance
          FROM active_scope scope
          LEFT JOIN population pop ON pop.homebase_id = scope.homebase_id
          LEFT JOIN expected_summary exp ON exp.homebase_id = scope.homebase_id
          LEFT JOIN paid_scope paid ON paid.homebase_id = scope.homebase_id
          LEFT JOIN spp_collected spp ON spp.homebase_id = scope.homebase_id
          LEFT JOIN other_summary other ON other.homebase_id = scope.homebase_id
          LEFT JOIN savings_summary savings ON savings.homebase_id = scope.homebase_id
          LEFT JOIN cash_summary cash ON cash.homebase_id = scope.homebase_id
          ORDER BY scope.homebase_name ASC
        `,
        [...scopeParams, currentMonth],
      ),
    ]);

    const population = populationResult.rows[0] || {};
    const sppCurrentMonth = sppMonthlyResult.rows[0] || {};
    const otherSummary = otherSummaryResult.rows[0] || {};
    const savingsSummary = savingsSummaryResult.rows[0] || {};
    const cashSummary = cashSummaryResult.rows[0] || {};

    const sppCollected = formatCurrencyNumber(
      sppCollectedResult.rows[0]?.spp_collected,
    );
    const otherCollected = formatCurrencyNumber(otherSummary.total_paid);
    const savingsBalance = formatCurrencyNumber(savingsSummary.balance);
    const classCashBalance = formatCurrencyNumber(cashSummary.balance);
    const expectedSppCurrentMonth = formatCurrencyNumber(
      sppCurrentMonth.expected_amount,
    );
    const paidSppCurrentMonth = formatCurrencyNumber(sppCurrentMonth.paid_amount);
    const outstandingSppCurrentMonth = Math.max(
      expectedSppCurrentMonth - paidSppCurrentMonth,
      0,
    );
    const totalStudents = Number(
      sppCurrentMonth.total_students || population.total_students || 0,
    );
    const paidStudentsCurrentMonth = Number(sppCurrentMonth.paid_students || 0);
    const unpaidStudentsCurrentMonth = Math.max(
      totalStudents - paidStudentsCurrentMonth,
      0,
    );
    const otherRemaining = formatCurrencyNumber(otherSummary.total_remaining);

    const recentTransactions = [
      ...recentSppResult.rows.map((item) => ({
        key: `spp-${item.id}`,
        subject: item.student_name,
        channel: (() => {
          const monthLabels = (item.bill_months || [])
            .map((month) => formatMonthLabel(month))
            .filter(Boolean)
            .join(", ");

          return monthLabels ? `SPP ${monthLabels}` : `SPP ${item.periode_name}`;
        })(),
        method: item.payment_method || "-",
        amount: formatCurrencyNumber(item.total_amount),
        status: "Lunas",
        time: item.paid_at,
        note: item.class_name || item.nis || "-",
        category: "spp",
        homebase_name: item.homebase_name,
      })),
      ...recentOtherResult.rows.map((item) => ({
        key: `other-${item.installment_id}`,
        subject: item.student_name,
        channel: item.type_name,
        method: item.payment_method || "-",
        amount: formatCurrencyNumber(item.amount_paid),
        status:
          formatCurrencyNumber(item.total_paid) >=
          formatCurrencyNumber(item.amount_due)
            ? "Lunas"
            : "Cicilan",
        time: item.payment_date,
        note: item.class_name || item.nis || "-",
        category: "other",
        homebase_name: item.homebase_name,
      })),
      ...recentSavingsResult.rows.map((item) => ({
        key: `saving-${item.transaction_id}`,
        subject: item.student_name || `Siswa #${item.student_id}`,
        channel: "Tabungan",
        method: "-",
        amount:
          item.transaction_type === "withdrawal"
            ? -formatCurrencyNumber(item.amount)
            : formatCurrencyNumber(item.amount),
        status: item.transaction_type === "withdrawal" ? "Penarikan" : "Setoran",
        time: item.transaction_date,
        note: item.description || item.nis || "-",
        category: "savings",
        homebase_name: item.homebase_name,
      })),
      ...recentCashResult.rows.map((item) => ({
        key: `cash-${item.transaction_id}`,
        subject: item.class_name || `Kelas #${item.class_id}`,
        channel: "Kas Kelas",
        method: "-",
        amount:
          item.transaction_type === "expense"
            ? -formatCurrencyNumber(item.amount)
            : formatCurrencyNumber(item.amount),
        status: item.transaction_type === "expense" ? "Pengeluaran" : "Pemasukan",
        time: item.transaction_date,
        note: item.description || "-",
        category: "class_cash",
        homebase_name: item.homebase_name,
      })),
    ]
      .sort((left, right) => new Date(right.time) - new Date(left.time))
      .slice(0, 12);

    const priorities = [
      {
        key: "spp-current-month",
        title: `SPP ${currentMonthLabel} belum lunas`,
        subject: `${unpaidStudentsCurrentMonth} siswa`,
        amount: outstandingSppCurrentMonth,
        status:
          unpaidStudentsCurrentMonth > 0 ? "Perlu tindak lanjut" : "Terkendali",
        note:
          activeScopes.length > 1
            ? `Akumulasi ${activeScopes.length} satuan aktif`
            : `Target bulan berjalan ${currentMonthLabel}`,
      },
      ...unpaidOtherChargesResult.rows.map((item) => ({
        key: `charge-${item.charge_id}`,
        title: item.type_name,
        subject: `${item.student_name} • ${item.homebase_name}`,
        amount: formatCurrencyNumber(item.remaining_amount),
        status:
          formatCurrencyNumber(item.paid_amount) > 0 ? "Cicilan aktif" : "Belum bayar",
        note:
          [item.class_name, item.periode_name, item.notes]
            .filter(Boolean)
            .join(" - ") || item.nis || "-",
      })),
    ]
      .filter((item) => item.amount > 0 || item.key === "spp-current-month")
      .slice(0, 6);

    const channels = [
      {
        key: "spp",
        label: "SPP",
        amount: sppCollected,
        progress:
          expectedSppCurrentMonth > 0
            ? Math.min(
                Math.round((paidSppCurrentMonth / expectedSppCurrentMonth) * 100),
                100,
              )
            : 0,
        note: `${paidStudentsCurrentMonth}/${totalStudents} siswa lunas ${currentMonthLabel}`,
      },
      {
        key: "other",
        label: "Pembayaran Lain",
        amount: otherCollected,
        progress:
          formatCurrencyNumber(otherSummary.total_due) > 0
            ? Math.min(
                Math.round(
                  (otherCollected / formatCurrencyNumber(otherSummary.total_due)) * 100,
                ),
                100,
              )
            : 0,
        note: `${Number(otherSummary.paid_count || 0)} lunas, ${Number(otherSummary.partial_count || 0)} cicilan`,
      },
      {
        key: "savings",
        label: "Tabungan Siswa",
        amount: savingsBalance,
        progress:
          formatCurrencyNumber(savingsSummary.deposit_total) > 0
            ? Math.max(
                0,
                Math.min(
                  Math.round(
                    (savingsBalance /
                      formatCurrencyNumber(savingsSummary.deposit_total)) *
                      100,
                  ),
                  100,
                ),
              )
            : 0,
        note: `${Number(savingsSummary.transaction_count || 0)} transaksi`,
      },
      {
        key: "cash",
        label: "Kas Kelas",
        amount: classCashBalance,
        progress:
          formatCurrencyNumber(cashSummary.income_total) > 0
            ? Math.max(
                0,
                Math.min(
                  Math.round(
                    (classCashBalance /
                      formatCurrencyNumber(cashSummary.income_total)) *
                      100,
                  ),
                  100,
                ),
              )
            : 0,
        note: `${Number(cashSummary.transaction_count || 0)} transaksi`,
      },
    ];

    const homebases = homebaseSummaryResult.rows.map((item) => {
      const expectedCurrent = formatCurrencyNumber(item.expected_spp_current_month);
      const paidCurrent = formatCurrencyNumber(item.paid_spp_current_month);

      return {
        key: `homebase-${item.homebase_id}`,
        homebase_id: Number(item.homebase_id),
        homebase_name: item.homebase_name,
        periode_id: Number(item.periode_id),
        periode_name: item.periode_name,
        total_students: Number(item.total_students || 0),
        total_classes: Number(item.total_classes || 0),
        expected_spp_current_month: expectedCurrent,
        paid_spp_current_month: paidCurrent,
        outstanding_spp_current_month: formatCurrencyNumber(
          item.outstanding_spp_current_month,
        ),
        school_revenue:
          formatCurrencyNumber(item.spp_collected) +
          formatCurrencyNumber(item.other_collected),
        savings_balance: formatCurrencyNumber(item.savings_balance),
        class_cash_balance: formatCurrencyNumber(item.class_cash_balance),
        managed_funds:
          formatCurrencyNumber(item.savings_balance) +
          formatCurrencyNumber(item.class_cash_balance),
        other_remaining: formatCurrencyNumber(item.other_remaining),
        collection_rate_current_month:
          expectedCurrent > 0 ? Math.round((paidCurrent / expectedCurrent) * 100) : 0,
      };
    });

    res.json({
      status: "success",
      data: {
        meta: {
          generated_at: today.toISOString(),
          current_month: currentMonth,
          current_month_label: currentMonthLabel,
          scope_type: scopeType,
          active_periode: activePeriode,
          active_scope: activeScopes,
        },
        summary: {
          school_revenue: sppCollected + otherCollected,
          spp_collected: sppCollected,
          other_collected: otherCollected,
          savings_balance: savingsBalance,
          class_cash_balance: classCashBalance,
          managed_funds: savingsBalance + classCashBalance,
          total_students: Number(population.total_students || 0),
          total_classes: Number(population.total_classes || 0),
          total_grades: Number(population.total_grades || 0),
          active_spp_tariffs: Number(
            tariffResult.rows[0]?.active_spp_tariffs || 0,
          ),
          active_other_types: Number(
            activeOtherTypeResult.rows[0]?.active_other_types || 0,
          ),
          homebase_count: activeScopes.length,
          active_periode_count: activeScopes.length,
        },
        spp: {
          expected_current_month: expectedSppCurrentMonth,
          paid_current_month: paidSppCurrentMonth,
          outstanding_current_month: outstandingSppCurrentMonth,
          paid_students_current_month: paidStudentsCurrentMonth,
          unpaid_students_current_month: unpaidStudentsCurrentMonth,
          collection_rate_current_month:
            expectedSppCurrentMonth > 0
              ? Math.round((paidSppCurrentMonth / expectedSppCurrentMonth) * 100)
              : 0,
        },
        others: {
          total_charges: Number(otherSummary.total_charges || 0),
          total_due: formatCurrencyNumber(otherSummary.total_due),
          total_paid: otherCollected,
          total_remaining: otherRemaining,
          paid_count: Number(otherSummary.paid_count || 0),
          partial_count: Number(otherSummary.partial_count || 0),
          unpaid_count: Number(otherSummary.unpaid_count || 0),
        },
        savings: {
          balance: savingsBalance,
          deposit_total: formatCurrencyNumber(savingsSummary.deposit_total),
          withdrawal_total: formatCurrencyNumber(savingsSummary.withdrawal_total),
          transaction_count: Number(savingsSummary.transaction_count || 0),
        },
        class_cash: {
          balance: classCashBalance,
          income_total: formatCurrencyNumber(cashSummary.income_total),
          expense_total: formatCurrencyNumber(cashSummary.expense_total),
          transaction_count: Number(cashSummary.transaction_count || 0),
        },
        channels,
        priorities,
        recent_transactions: recentTransactions,
        homebases,
      },
    });
  }),
);

export default router;
