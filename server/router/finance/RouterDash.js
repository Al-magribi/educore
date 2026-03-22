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
      student_id int NOT NULL,
      transaction_type varchar(10) NOT NULL,
      amount numeric(12,2) NOT NULL,
      transaction_date timestamptz DEFAULT CURRENT_TIMESTAMP,
      processed_by int,
      description text
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance.class_cash_transactions (
      transaction_id bigserial PRIMARY KEY,
      class_id int NOT NULL,
      transaction_type varchar(10) NOT NULL,
      amount numeric(12,2) NOT NULL,
      transaction_date timestamptz DEFAULT CURRENT_TIMESTAMP,
      processed_by int,
      description text NOT NULL
    )
  `);
};

router.get(
  "/dashboard",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureMonthlyFinanceTables(db);
    await ensureOtherFinanceTables(db);
    await ensureManagedFundTables(db);

    const { homebase_id: homebaseId } = req.user;
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentMonthLabel = formatMonthLabel(currentMonth);

    const activePeriodeResult = await db.query(
      `
        SELECT id, name, is_active
        FROM a_periode
        WHERE homebase_id = $1
        ORDER BY is_active DESC, created_at DESC
        LIMIT 1
      `,
      [homebaseId],
    );

    const activePeriode = activePeriodeResult.rows[0] || null;

    const basePayload = {
      meta: {
        generated_at: today.toISOString(),
        current_month: currentMonth,
        current_month_label: currentMonthLabel,
        active_periode: activePeriode,
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
    };

    if (!activePeriode) {
      return res.json({
        status: "success",
        data: basePayload,
      });
    }

    const periodeId = activePeriode.id;

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
    ] = await Promise.all([
      db.query(
        `
          SELECT
            COUNT(DISTINCT e.student_id)::int AS total_students,
            COUNT(DISTINCT e.class_id)::int AS total_classes,
            COUNT(DISTINCT c.grade_id)::int AS total_grades
          FROM u_class_enrollments e
          JOIN a_class c ON c.id = e.class_id
          WHERE e.homebase_id = $1
            AND e.periode_id = $2
        `,
        [homebaseId, periodeId],
      ),
      db.query(
        `
          SELECT COUNT(*)::int AS active_spp_tariffs
          FROM finance.spp_tariff
          WHERE homebase_id = $1
            AND periode_id = $2
            AND is_active = true
        `,
        [homebaseId, periodeId],
      ),
      db.query(
        `
          SELECT COUNT(*)::int AS active_other_types
          FROM finance.other_payment_types
          WHERE homebase_id = $1
            AND is_active = true
        `,
        [homebaseId],
      ),
      db.query(
        `
          WITH active_students AS (
            SELECT DISTINCT
              e.student_id,
              c.grade_id
            FROM u_class_enrollments e
            JOIN a_class c ON c.id = e.class_id
            WHERE e.homebase_id = $1
              AND e.periode_id = $2
          ),
          expected_scope AS (
            SELECT
              student_id,
              COALESCE(t.amount, 0) AS tariff_amount
            FROM active_students s
            LEFT JOIN finance.spp_tariff t
              ON t.homebase_id = $1
              AND t.periode_id = $2
              AND t.grade_id = s.grade_id
              AND t.is_active = true
          ),
          paid_scope AS (
            SELECT
              COUNT(DISTINCT student_id)::int AS paid_students,
              COALESCE(SUM(amount), 0) AS paid_amount
            FROM finance.spp_payment_allocation
            WHERE homebase_id = $1
              AND periode_id = $2
              AND bill_month = $3
          )
          SELECT
            COUNT(*)::int AS total_students,
            COALESCE(SUM(tariff_amount), 0) AS expected_amount,
            COALESCE((SELECT paid_students FROM paid_scope), 0) AS paid_students,
            COALESCE((SELECT paid_amount FROM paid_scope), 0) AS paid_amount
          FROM expected_scope
        `,
        [homebaseId, periodeId, currentMonth],
      ),
      db.query(
        `
          SELECT COALESCE(SUM(total_amount), 0) AS spp_collected
          FROM finance.spp_payment_transaction
          WHERE homebase_id = $1
            AND periode_id = $2
        `,
        [homebaseId, periodeId],
      ),
      db.query(
        `
          WITH charge_summary AS (
            SELECT
              c.charge_id,
              c.amount_due,
              COALESCE(SUM(i.amount_paid), 0) AS paid_amount
            FROM finance.other_payment_charges c
            LEFT JOIN finance.other_payment_installments i ON i.charge_id = c.charge_id
            WHERE c.homebase_id = $1
              AND c.periode_id = $2
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
        [homebaseId, periodeId],
      ),
      db.query(
        `
          SELECT
            COUNT(*)::int AS transaction_count,
            COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) AS deposit_total,
            COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0) AS withdrawal_total,
            COALESCE(SUM(
              CASE
                WHEN transaction_type = 'deposit' THEN amount
                WHEN transaction_type = 'withdrawal' THEN -amount
                ELSE 0
              END
            ), 0) AS balance
          FROM finance.savings_transactions st
          WHERE EXISTS (
            SELECT 1
            FROM u_class_enrollments e
            WHERE e.student_id = st.student_id
              AND e.homebase_id = $1
          )
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT
            COUNT(*)::int AS transaction_count,
            COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) AS income_total,
            COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS expense_total,
            COALESCE(SUM(
              CASE
                WHEN transaction_type = 'income' THEN amount
                WHEN transaction_type = 'expense' THEN -amount
                ELSE 0
              END
            ), 0) AS balance
          FROM finance.class_cash_transactions tx
          JOIN a_class c ON c.id = tx.class_id
          WHERE c.homebase_id = $1
        `,
        [homebaseId],
      ),
      db.query(
        `
          WITH charge_summary AS (
            SELECT
              c.charge_id,
              c.amount_due,
              c.student_id,
              c.type_id,
              c.notes,
              t.name AS type_name,
              u.full_name AS student_name,
              s.nis,
              cls.name AS class_name,
              COALESCE(SUM(i.amount_paid), 0) AS paid_amount
            FROM finance.other_payment_charges c
            JOIN finance.other_payment_types t ON t.type_id = c.type_id
            JOIN u_students s ON s.user_id = c.student_id
            JOIN u_users u ON u.id = s.user_id
            LEFT JOIN u_class_enrollments e
              ON e.student_id = c.student_id
              AND e.periode_id = c.periode_id
              AND e.homebase_id = c.homebase_id
            LEFT JOIN a_class cls ON cls.id = e.class_id
            LEFT JOIN finance.other_payment_installments i ON i.charge_id = c.charge_id
            WHERE c.homebase_id = $1
              AND c.periode_id = $2
            GROUP BY
              c.charge_id,
              c.amount_due,
              c.student_id,
              c.type_id,
              c.notes,
              t.name,
              u.full_name,
              s.nis,
              cls.name
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
            GREATEST(amount_due - paid_amount, 0) AS remaining_amount
          FROM charge_summary
          WHERE GREATEST(amount_due - paid_amount, 0) > 0
          ORDER BY remaining_amount DESC, student_name ASC
          LIMIT 5
        `,
        [homebaseId, periodeId],
      ),
      db.query(
        `
          SELECT
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
          JOIN u_students s ON s.user_id = tx.student_id
          JOIN u_users u ON u.id = s.user_id
          LEFT JOIN u_class_enrollments e
            ON e.student_id = tx.student_id
            AND e.periode_id = tx.periode_id
            AND e.homebase_id = tx.homebase_id
          LEFT JOIN a_class cls ON cls.id = e.class_id
          LEFT JOIN finance.spp_payment_allocation alloc ON alloc.transaction_id = tx.id
          WHERE tx.homebase_id = $1
            AND tx.periode_id = $2
          GROUP BY tx.id, u.full_name, s.nis, cls.name
          ORDER BY tx.paid_at DESC, tx.id DESC
          LIMIT 8
        `,
        [homebaseId, periodeId],
      ),
      db.query(
        `
          WITH installment_scope AS (
            SELECT
              i.installment_id,
              i.charge_id,
              i.amount_paid,
              i.payment_method,
              i.notes,
              i.payment_date,
              c.amount_due,
              c.student_id,
              c.periode_id,
              t.name AS type_name,
              u.full_name AS student_name,
              s.nis,
              cls.name AS class_name
            FROM finance.other_payment_installments i
            JOIN finance.other_payment_charges c ON c.charge_id = i.charge_id
            JOIN finance.other_payment_types t ON t.type_id = c.type_id
            JOIN u_students s ON s.user_id = c.student_id
            JOIN u_users u ON u.id = s.user_id
            LEFT JOIN u_class_enrollments e
              ON e.student_id = c.student_id
              AND e.periode_id = c.periode_id
              AND e.homebase_id = c.homebase_id
            LEFT JOIN a_class cls ON cls.id = e.class_id
            WHERE c.homebase_id = $1
              AND c.periode_id = $2
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
            COALESCE(pt.total_paid, 0) AS total_paid
          FROM installment_scope s
          LEFT JOIN payment_totals pt ON pt.charge_id = s.charge_id
          ORDER BY s.payment_date DESC, s.installment_id DESC
          LIMIT 8
        `,
        [homebaseId, periodeId],
      ),
      db.query(
        `
          SELECT
            st.transaction_id,
            st.student_id,
            st.transaction_type,
            st.amount,
            st.transaction_date,
            st.description,
            u.full_name AS student_name,
            s.nis
          FROM finance.savings_transactions st
          LEFT JOIN u_students s ON s.user_id = st.student_id
          LEFT JOIN u_users u ON u.id = s.user_id
          WHERE EXISTS (
            SELECT 1
            FROM u_class_enrollments e
            WHERE e.student_id = st.student_id
              AND e.homebase_id = $1
          )
          ORDER BY st.transaction_date DESC, st.transaction_id DESC
          LIMIT 8
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT
            tx.transaction_id,
            tx.class_id,
            tx.transaction_type,
            tx.amount,
            tx.transaction_date,
            tx.description,
            cls.name AS class_name
          FROM finance.class_cash_transactions tx
          JOIN a_class cls ON cls.id = tx.class_id
          WHERE cls.homebase_id = $1
          ORDER BY tx.transaction_date DESC, tx.transaction_id DESC
          LIMIT 8
        `,
        [homebaseId],
      ),
    ]);

    const population = populationResult.rows[0] || {};
    const sppCurrentMonth = sppMonthlyResult.rows[0] || {};
    const otherSummary = otherSummaryResult.rows[0] || {};
    const savingsSummary = savingsSummaryResult.rows[0] || {};
    const cashSummary = cashSummaryResult.rows[0] || {};

    const sppCollected = formatCurrencyNumber(sppCollectedResult.rows[0]?.spp_collected);
    const otherCollected = formatCurrencyNumber(otherSummary.total_paid);
    const savingsBalance = formatCurrencyNumber(savingsSummary.balance);
    const classCashBalance = formatCurrencyNumber(cashSummary.balance);
    const expectedSppCurrentMonth = formatCurrencyNumber(sppCurrentMonth.expected_amount);
    const paidSppCurrentMonth = formatCurrencyNumber(sppCurrentMonth.paid_amount);
    const outstandingSppCurrentMonth = Math.max(
      expectedSppCurrentMonth - paidSppCurrentMonth,
      0,
    );
    const totalStudents = Number(sppCurrentMonth.total_students || population.total_students || 0);
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
        channel: `SPP ${((item.bill_months || []).map((month) => formatMonthLabel(month))).join(", ")}`,
        method: item.payment_method || "-",
        amount: formatCurrencyNumber(item.total_amount),
        status: "Lunas",
        time: item.paid_at,
        note: item.class_name || item.nis || "-",
        category: "spp",
      })),
      ...recentOtherResult.rows.map((item) => ({
        key: `other-${item.installment_id}`,
        subject: item.student_name,
        channel: item.type_name,
        method: item.payment_method || "-",
        amount: formatCurrencyNumber(item.amount_paid),
        status:
          formatCurrencyNumber(item.total_paid) >= formatCurrencyNumber(item.amount_due)
            ? "Lunas"
            : "Cicilan",
        time: item.payment_date,
        note: item.class_name || item.nis || "-",
        category: "other",
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
      })),
    ]
      .sort((left, right) => new Date(right.time) - new Date(left.time))
      .slice(0, 10);

    const priorities = [
      {
        key: "spp-current-month",
        title: `SPP ${currentMonthLabel} belum lunas`,
        subject: `${unpaidStudentsCurrentMonth} siswa`,
        amount: outstandingSppCurrentMonth,
        status: unpaidStudentsCurrentMonth > 0 ? "Perlu tindak lanjut" : "Terkendali",
        note: `Target bulan berjalan ${currentMonthLabel}`,
      },
      ...unpaidOtherChargesResult.rows.map((item) => ({
        key: `charge-${item.charge_id}`,
        title: item.type_name,
        subject: item.student_name,
        amount: formatCurrencyNumber(item.remaining_amount),
        status:
          formatCurrencyNumber(item.paid_amount) > 0 ? "Cicilan aktif" : "Belum bayar",
        note: [item.class_name, item.notes].filter(Boolean).join(" - ") || item.nis || "-",
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
                    (savingsBalance / formatCurrencyNumber(savingsSummary.deposit_total)) * 100,
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
                    (classCashBalance / formatCurrencyNumber(cashSummary.income_total)) * 100,
                  ),
                  100,
                ),
              )
            : 0,
        note: `${Number(cashSummary.transaction_count || 0)} transaksi`,
      },
    ];

    res.json({
      status: "success",
      data: {
        meta: {
          generated_at: today.toISOString(),
          current_month: currentMonth,
          current_month_label: currentMonthLabel,
          active_periode: activePeriode,
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
          active_spp_tariffs: Number(tariffResult.rows[0]?.active_spp_tariffs || 0),
          active_other_types: Number(
            activeOtherTypeResult.rows[0]?.active_other_types || 0,
          ),
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
      },
    });
  }),
);

export default router;
