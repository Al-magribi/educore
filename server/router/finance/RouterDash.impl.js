import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import { ensureFinalFinanceTables, parseOptionalInt } from "./financeHelpers.js";

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

const numberValue = (value) => Number(value || 0);

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

const buildEmptyPayload = ({
  now,
  currentMonth,
  currentMonthLabel,
  scopeType,
  selectedHomebaseId = null,
}) => ({
  meta: {
    generated_at: now.toISOString(),
    current_month: currentMonth,
    current_month_label: currentMonthLabel,
    scope_type: scopeType,
    selected_homebase_id: selectedHomebaseId,
    active_periode: null,
    active_scope: [],
    available_homebases: [],
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
    await ensureFinalFinanceTables(db);

    const { homebase_id: userHomebaseId, admin_level: adminLevel, role } = req.user;
    const targetHomebaseId = parseOptionalInt(req.query.homebase_id);
    const includeAllUnits =
      role === "admin" && (adminLevel === "pusat" || !userHomebaseId);
    const selectedHomebaseId = includeAllUnits
      ? targetHomebaseId || null
      : Number(userHomebaseId || 0) || null;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentMonthLabel = formatMonthLabel(currentMonth);
    const scopeType = includeAllUnits && !targetHomebaseId ? "all_units" : "single_unit";
    const basePayload = buildEmptyPayload({
      now,
      currentMonth,
      currentMonthLabel,
      scopeType,
      selectedHomebaseId,
    });

    const availableScopeQuery = buildActiveScopeQuery({
      includeAllUnits,
      homebaseId: userHomebaseId,
      targetHomebaseId: null,
    });
    const activeScopeQuery = buildActiveScopeQuery({
      includeAllUnits,
      homebaseId: userHomebaseId,
      targetHomebaseId,
    });

    const availableScopeResult = await db.query(
      availableScopeQuery.text,
      availableScopeQuery.params,
    );
    const availableScopes = availableScopeResult.rows;

    const activeScopeResult = await db.query(
      activeScopeQuery.text,
      activeScopeQuery.params,
    );
    const activeScopes = activeScopeResult.rows;

    if (!activeScopes.length) {
      return res.json({
        status: "success",
        data: {
          ...basePayload,
          meta: {
            ...basePayload.meta,
            available_homebases: availableScopes.map((item) => ({
              homebase_id: Number(item.homebase_id),
              homebase_name: item.homebase_name,
              periode_id: Number(item.periode_id),
              periode_name: item.periode_name,
            })),
          },
        },
      });
    }

    const activeScopeSql = activeScopeQuery.text.trim();
    const scopeParams = activeScopeQuery.params;
    const activePeriode = activeScopes.length === 1 ? activeScopes[0] : null;

    const [
      populationResult,
      activeSppRuleResult,
      activeOtherTypeResult,
      sppCurrentResult,
      otherSummaryResult,
      savingsSummaryResult,
      cashSummaryResult,
      recentPaymentResult,
      recentSavingResult,
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
          FROM finance.fee_rule fr
          JOIN finance.fee_component fc ON fc.id = fr.component_id
          JOIN active_scope scope
            ON scope.homebase_id = fr.homebase_id
            AND scope.periode_id = fr.periode_id
          WHERE fr.is_active = true
            AND fc.category = 'spp'
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT COUNT(*)::int AS active_other_types
          FROM finance.fee_component fc
          JOIN active_scope scope ON scope.homebase_id = fc.homebase_id
          WHERE fc.category = 'other'
            AND fc.is_active = true
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql}),
          expected_scope AS (
            SELECT
              e.student_id,
              COALESCE(fr.amount, 0) AS expected_amount
            FROM active_scope scope
            JOIN u_class_enrollments e
              ON e.homebase_id = scope.homebase_id
              AND e.periode_id = scope.periode_id
            JOIN a_class c ON c.id = e.class_id
            LEFT JOIN finance.fee_rule fr
              ON fr.homebase_id = e.homebase_id
              AND fr.periode_id = e.periode_id
              AND fr.grade_id = c.grade_id
              AND fr.is_active = true
            LEFT JOIN finance.fee_component fc
              ON fc.id = fr.component_id
              AND fc.category = 'spp'
          ),
          paid_scope AS (
            SELECT
              inv.student_id,
              SUM(pa.allocated_amount) AS paid_amount
            FROM active_scope scope
            JOIN finance.invoice inv
              ON inv.homebase_id = scope.homebase_id
              AND inv.periode_id = scope.periode_id
            JOIN finance.invoice_item ii
              ON ii.invoice_id = inv.id
              AND ii.item_type = 'spp'
              AND ii.bill_month = $${scopeParams.length + 1}
            JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
            JOIN finance.payment p
              ON p.id = pa.payment_id
              AND p.status = 'paid'
            GROUP BY inv.student_id
          )
          SELECT
            COUNT(*)::int AS total_students,
            COALESCE(SUM(expected.expected_amount), 0) AS expected_amount,
            COUNT(*) FILTER (
              WHERE COALESCE(paid.paid_amount, 0) >= COALESCE(expected.expected_amount, 0)
                AND COALESCE(expected.expected_amount, 0) > 0
            )::int AS paid_students,
            COALESCE(SUM(paid.paid_amount), 0) AS paid_amount
          FROM expected_scope expected
          LEFT JOIN paid_scope paid ON paid.student_id = expected.student_id
        `,
        [...scopeParams, currentMonth],
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql}),
          item_summary AS (
            SELECT
              ii.id,
              ii.amount,
              COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
            FROM active_scope scope
            JOIN finance.invoice inv
              ON inv.homebase_id = scope.homebase_id
              AND inv.periode_id = scope.periode_id
            JOIN finance.invoice_item ii
              ON ii.invoice_id = inv.id
              AND ii.item_type = 'other'
            LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
            LEFT JOIN finance.payment p ON p.id = pa.payment_id
            GROUP BY ii.id
          )
          SELECT
            COUNT(*)::int AS total_charges,
            COALESCE(SUM(amount), 0) AS total_due,
            COALESCE(SUM(paid_amount), 0) AS total_paid,
            COALESCE(SUM(GREATEST(amount - paid_amount, 0)), 0) AS total_remaining,
            COUNT(*) FILTER (WHERE paid_amount >= amount AND amount > 0)::int AS paid_count,
            COUNT(*) FILTER (WHERE paid_amount > 0 AND paid_amount < amount)::int AS partial_count,
            COUNT(*) FILTER (WHERE paid_amount <= 0)::int AS unpaid_count
          FROM item_summary
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT
            COALESCE(SUM(CASE WHEN st.transaction_type = 'deposit' THEN st.amount ELSE 0 END), 0) AS deposit_total,
            COALESCE(SUM(CASE WHEN st.transaction_type = 'withdrawal' THEN st.amount ELSE 0 END), 0) AS withdrawal_total,
            COALESCE(SUM(CASE WHEN st.transaction_type = 'deposit' THEN st.amount ELSE -st.amount END), 0) AS balance,
            COUNT(*)::int AS transaction_count
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
            COALESCE(SUM(CASE WHEN tx.transaction_type = 'income' THEN tx.amount ELSE 0 END), 0) AS income_total,
            COALESCE(SUM(CASE WHEN tx.transaction_type = 'expense' THEN tx.amount ELSE 0 END), 0) AS expense_total,
            COALESCE(SUM(CASE WHEN tx.transaction_type = 'income' THEN tx.amount ELSE -tx.amount END), 0) AS balance,
            COUNT(*)::int AS transaction_count
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
          payment_items AS (
            SELECT
              p.id,
              p.payment_date,
              p.amount,
              pm.name AS payment_method,
              p.notes,
              u.full_name AS student_name,
              s.nis,
              c.name AS class_name,
              scope.homebase_name,
              COALESCE(
                CASE
                  WHEN COUNT(DISTINCT ii.item_type) = 1 THEN MAX(ii.item_type)
                  ELSE 'mixed'
                END,
                'mixed'
              ) AS category,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT ii.bill_month ORDER BY ii.bill_month), NULL) AS bill_months,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT fc.name ORDER BY fc.name), NULL) AS item_names
            FROM finance.payment p
            JOIN active_scope scope ON scope.homebase_id = p.homebase_id
            LEFT JOIN u_students s ON s.user_id = p.student_id
            LEFT JOIN u_users u ON u.id = s.user_id
            LEFT JOIN u_class_enrollments e
              ON e.student_id = p.student_id
              AND e.periode_id = scope.periode_id
              AND e.homebase_id = scope.homebase_id
            LEFT JOIN a_class c ON c.id = e.class_id
            LEFT JOIN finance.payment_method pm ON pm.id = p.method_id
            LEFT JOIN finance.payment_allocation pa ON pa.payment_id = p.id
            LEFT JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
            LEFT JOIN finance.fee_component fc ON fc.id = ii.component_id
            WHERE p.status = 'paid'
            GROUP BY p.id, pm.name, u.full_name, s.nis, c.name, scope.homebase_name
            ORDER BY p.payment_date DESC, p.id DESC
            LIMIT 12
          )
          SELECT * FROM payment_items
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT
            st.transaction_id,
            st.transaction_type,
            st.amount,
            st.transaction_date,
            st.description,
            u.full_name AS student_name,
            s.nis,
            scope.homebase_name
          FROM finance.savings_transactions st
          JOIN active_scope scope
            ON scope.homebase_id = st.homebase_id
            AND scope.periode_id = st.periode_id
          LEFT JOIN u_students s ON s.user_id = st.student_id
          LEFT JOIN u_users u ON u.id = s.user_id
          ORDER BY st.transaction_date DESC, st.transaction_id DESC
          LIMIT 12
        `,
        scopeParams,
      ),
      db.query(
        `
          WITH active_scope AS (${activeScopeSql})
          SELECT
            tx.transaction_id,
            tx.transaction_type,
            tx.amount,
            tx.transaction_date,
            tx.description,
            cls.name AS class_name,
            scope.homebase_name
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
          expected_scope AS (
            SELECT
              scope.homebase_id,
              e.student_id,
              COALESCE(fr.amount, 0) AS expected_amount
            FROM active_scope scope
            JOIN u_class_enrollments e
              ON e.homebase_id = scope.homebase_id
              AND e.periode_id = scope.periode_id
            JOIN a_class c ON c.id = e.class_id
            LEFT JOIN finance.fee_rule fr
              ON fr.homebase_id = e.homebase_id
              AND fr.periode_id = e.periode_id
              AND fr.grade_id = c.grade_id
              AND fr.is_active = true
            LEFT JOIN finance.fee_component fc
              ON fc.id = fr.component_id
              AND fc.category = 'spp'
          ),
          paid_scope AS (
            SELECT
              scope.homebase_id,
              inv.student_id,
              SUM(pa.allocated_amount) AS paid_amount
            FROM active_scope scope
            JOIN finance.invoice inv
              ON inv.homebase_id = scope.homebase_id
              AND inv.periode_id = scope.periode_id
            JOIN finance.invoice_item ii
              ON ii.invoice_id = inv.id
              AND ii.item_type = 'spp'
              AND ii.bill_month = $${scopeParams.length + 1}
            JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
            JOIN finance.payment p
              ON p.id = pa.payment_id
              AND p.status = 'paid'
            GROUP BY scope.homebase_id, inv.student_id
          ),
          other_scope AS (
            SELECT
              scope.homebase_id,
              COALESCE(SUM(ii.amount), 0) AS total_due,
              COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS total_paid
            FROM active_scope scope
            LEFT JOIN finance.invoice inv
              ON inv.homebase_id = scope.homebase_id
              AND inv.periode_id = scope.periode_id
            LEFT JOIN finance.invoice_item ii
              ON ii.invoice_id = inv.id
              AND ii.item_type = 'other'
            LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
            LEFT JOIN finance.payment p ON p.id = pa.payment_id
            GROUP BY scope.homebase_id
          ),
          revenue_scope AS (
            SELECT
              scope.homebase_id,
              COALESCE(SUM(CASE WHEN ii.item_type = 'spp' THEN pa.allocated_amount ELSE 0 END), 0) AS spp_collected,
              COALESCE(SUM(CASE WHEN ii.item_type = 'other' THEN pa.allocated_amount ELSE 0 END), 0) AS other_collected
            FROM active_scope scope
            LEFT JOIN finance.payment p
              ON p.homebase_id = scope.homebase_id
              AND p.status = 'paid'
            LEFT JOIN finance.payment_allocation pa ON pa.payment_id = p.id
            LEFT JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
            LEFT JOIN finance.invoice inv
              ON inv.id = ii.invoice_id
              AND inv.periode_id = scope.periode_id
            GROUP BY scope.homebase_id
          ),
          savings_scope AS (
            SELECT
              scope.homebase_id,
              COALESCE(SUM(CASE WHEN st.transaction_type = 'deposit' THEN st.amount ELSE -st.amount END), 0) AS balance
            FROM active_scope scope
            LEFT JOIN finance.savings_transactions st
              ON st.homebase_id = scope.homebase_id
              AND st.periode_id = scope.periode_id
            GROUP BY scope.homebase_id
          ),
          cash_scope AS (
            SELECT
              scope.homebase_id,
              COALESCE(SUM(CASE WHEN tx.transaction_type = 'income' THEN tx.amount ELSE -tx.amount END), 0) AS balance
            FROM active_scope scope
            LEFT JOIN finance.class_cash_transactions tx
              ON tx.homebase_id = scope.homebase_id
              AND tx.periode_id = scope.periode_id
            GROUP BY scope.homebase_id
          )
          SELECT
            scope.homebase_id,
            scope.homebase_name,
            scope.periode_id,
            scope.periode_name,
            COALESCE(pop.total_students, 0) AS total_students,
            COALESCE(pop.total_classes, 0) AS total_classes,
            COALESCE(SUM(expected.expected_amount), 0) AS expected_spp_current_month,
            COALESCE(SUM(COALESCE(paid.paid_amount, 0)), 0) AS paid_spp_current_month,
            GREATEST(COALESCE(SUM(expected.expected_amount), 0) - COALESCE(SUM(COALESCE(paid.paid_amount, 0)), 0), 0) AS outstanding_spp_current_month,
            COALESCE(rev.spp_collected, 0) AS spp_collected,
            COALESCE(rev.other_collected, 0) AS other_collected,
            GREATEST(COALESCE(other.total_due, 0) - COALESCE(other.total_paid, 0), 0) AS other_remaining,
            COALESCE(savings.balance, 0) AS savings_balance,
            COALESCE(cash.balance, 0) AS class_cash_balance
          FROM active_scope scope
          LEFT JOIN population pop ON pop.homebase_id = scope.homebase_id
          LEFT JOIN expected_scope expected ON expected.homebase_id = scope.homebase_id
          LEFT JOIN paid_scope paid
            ON paid.homebase_id = expected.homebase_id
            AND paid.student_id = expected.student_id
          LEFT JOIN other_scope other ON other.homebase_id = scope.homebase_id
          LEFT JOIN revenue_scope rev ON rev.homebase_id = scope.homebase_id
          LEFT JOIN savings_scope savings ON savings.homebase_id = scope.homebase_id
          LEFT JOIN cash_scope cash ON cash.homebase_id = scope.homebase_id
          GROUP BY
            scope.homebase_id,
            scope.homebase_name,
            scope.periode_id,
            scope.periode_name,
            pop.total_students,
            pop.total_classes,
            rev.spp_collected,
            rev.other_collected,
            other.total_due,
            other.total_paid,
            savings.balance,
            cash.balance
          ORDER BY scope.homebase_name ASC
        `,
        [...scopeParams, currentMonth],
      ),
    ]);

    const population = populationResult.rows[0] || {};
    const sppCurrent = sppCurrentResult.rows[0] || {};
    const others = otherSummaryResult.rows[0] || {};
    const savings = savingsSummaryResult.rows[0] || {};
    const cash = cashSummaryResult.rows[0] || {};

    const sppCollected = numberValue(
      recentPaymentResult.rows.reduce((sum, item) => {
        if (item.category === "spp") {
          return sum + numberValue(item.amount);
        }
        if (item.category === "mixed") {
          return sum + numberValue(item.amount);
        }
        return sum;
      }, 0),
    );
    const otherCollected = numberValue(others.total_paid);
    const savingsBalance = numberValue(savings.balance);
    const classCashBalance = numberValue(cash.balance);
    const expectedSppCurrentMonth = numberValue(sppCurrent.expected_amount);
    const paidSppCurrentMonth = numberValue(sppCurrent.paid_amount);
    const outstandingSppCurrentMonth = Math.max(
      expectedSppCurrentMonth - paidSppCurrentMonth,
      0,
    );
    const totalStudents = Number(
      sppCurrent.total_students || population.total_students || 0,
    );
    const paidStudentsCurrentMonth = Number(sppCurrent.paid_students || 0);
    const unpaidStudentsCurrentMonth = Math.max(
      totalStudents - paidStudentsCurrentMonth,
      0,
    );

    const recentTransactions = [
      ...recentPaymentResult.rows.map((item) => ({
        key: `payment-${item.id}`,
        subject: item.student_name,
        channel:
          item.category === "spp"
            ? `SPP ${(item.bill_months || []).map(formatMonthLabel).join(", ")}`
            : item.category === "other"
              ? (item.item_names || []).join(", ")
              : (item.item_names || []).join(", "),
        method: item.payment_method || "-",
        amount: numberValue(item.amount),
        status: "Lunas",
        time: item.payment_date,
        note: item.class_name || item.nis || "-",
        category: item.category,
        homebase_name: item.homebase_name,
      })),
      ...recentSavingResult.rows.map((item) => ({
        key: `saving-${item.transaction_id}`,
        subject: item.student_name || `Siswa #${item.student_id}`,
        channel: "Tabungan",
        method: "-",
        amount:
          item.transaction_type === "withdrawal"
            ? -numberValue(item.amount)
            : numberValue(item.amount),
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
            ? -numberValue(item.amount)
            : numberValue(item.amount),
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
    ].filter((item) => item.amount > 0 || item.key === "spp-current-month");

    const channels = [
      {
        key: "spp",
        label: "SPP",
        amount: paidSppCurrentMonth,
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
          numberValue(others.total_due) > 0
            ? Math.min(
                Math.round((otherCollected / numberValue(others.total_due)) * 100),
                100,
              )
            : 0,
        note: `${Number(others.paid_count || 0)} lunas, ${Number(others.partial_count || 0)} cicilan`,
      },
      {
        key: "savings",
        label: "Tabungan Siswa",
        amount: savingsBalance,
        progress:
          numberValue(savings.deposit_total) > 0
            ? Math.max(
                0,
                Math.min(
                  Math.round((savingsBalance / numberValue(savings.deposit_total)) * 100),
                  100,
                ),
              )
            : 0,
        note: `${Number(savings.transaction_count || 0)} transaksi`,
      },
      {
        key: "cash",
        label: "Kas Kelas",
        amount: classCashBalance,
        progress:
          numberValue(cash.income_total) > 0
            ? Math.max(
                0,
                Math.min(
                  Math.round((classCashBalance / numberValue(cash.income_total)) * 100),
                  100,
                ),
              )
            : 0,
        note: `${Number(cash.transaction_count || 0)} transaksi`,
      },
    ];

    const homebases = homebaseSummaryResult.rows.map((item) => {
      const expectedCurrent = numberValue(item.expected_spp_current_month);
      const paidCurrent = numberValue(item.paid_spp_current_month);

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
        outstanding_spp_current_month: numberValue(
          item.outstanding_spp_current_month,
        ),
        school_revenue:
          numberValue(item.spp_collected) + numberValue(item.other_collected),
        savings_balance: numberValue(item.savings_balance),
        class_cash_balance: numberValue(item.class_cash_balance),
        managed_funds:
          numberValue(item.savings_balance) + numberValue(item.class_cash_balance),
        other_remaining: numberValue(item.other_remaining),
        collection_rate_current_month:
          expectedCurrent > 0 ? Math.round((paidCurrent / expectedCurrent) * 100) : 0,
      };
    });

    res.json({
      status: "success",
      data: {
        meta: {
          generated_at: now.toISOString(),
          current_month: currentMonth,
          current_month_label: currentMonthLabel,
          scope_type: scopeType,
          selected_homebase_id: selectedHomebaseId,
          active_periode: activePeriode,
          active_scope: activeScopes,
          available_homebases: availableScopes.map((item) => ({
            homebase_id: Number(item.homebase_id),
            homebase_name: item.homebase_name,
            periode_id: Number(item.periode_id),
            periode_name: item.periode_name,
          })),
        },
        summary: {
          school_revenue: paidSppCurrentMonth + otherCollected,
          spp_collected: paidSppCurrentMonth,
          other_collected: otherCollected,
          savings_balance: savingsBalance,
          class_cash_balance: classCashBalance,
          managed_funds: savingsBalance + classCashBalance,
          total_students: Number(population.total_students || 0),
          total_classes: Number(population.total_classes || 0),
          total_grades: Number(population.total_grades || 0),
          active_spp_tariffs: Number(
            activeSppRuleResult.rows[0]?.active_spp_tariffs || 0,
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
          total_charges: Number(others.total_charges || 0),
          total_due: numberValue(others.total_due),
          total_paid: otherCollected,
          total_remaining: numberValue(others.total_remaining),
          paid_count: Number(others.paid_count || 0),
          partial_count: Number(others.partial_count || 0),
          unpaid_count: Number(others.unpaid_count || 0),
        },
        savings: {
          balance: savingsBalance,
          deposit_total: numberValue(savings.deposit_total),
          withdrawal_total: numberValue(savings.withdrawal_total),
          transaction_count: Number(savings.transaction_count || 0),
        },
        class_cash: {
          balance: classCashBalance,
          income_total: numberValue(cash.income_total),
          expense_total: numberValue(cash.expense_total),
          transaction_count: Number(cash.transaction_count || 0),
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
