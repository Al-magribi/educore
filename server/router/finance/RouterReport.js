import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  MONTH_NAMES,
  ensureFinalFinanceTables,
  enrichDueWithScholarship,
  formatBillingPeriod,
  loadScholarshipBenefitIndex,
  parseOptionalInt,
  resolveScopedHomebaseId,
} from "./financeHelpers.js";

const router = Router();

const SUCCESS_PAYMENT_STATUSES = ["confirmed", "paid"];
const REPORT_MODES = new Set(["periode", "bulan", "rentang"]);

const EXPENSE_CATEGORY_LABELS = {
  operational: "Operasional",
  utilities: "Utilitas",
  salary: "Gaji / Honor",
  maintenance: "Pemeliharaan",
  activity: "Kegiatan",
  supplies: "ATK / Perlengkapan",
  other: "Lainnya",
};

const numberValue = (value) => Number(value || 0);

const tableExists = async (db, qualifiedName) => {
  const result = await db.query(`SELECT to_regclass($1) AS table_ref`, [
    qualifiedName,
  ]);
  return Boolean(result.rows[0]?.table_ref);
};

// Baris baku RAPBS: sumber pendapatan dan pos pengeluaran yang dianggarkan.
const BUDGET_CATALOG = [
  { kind: "income", category: "spp", label: "Pendapatan SPP" },
  { kind: "income", category: "other", label: "Pendapatan Lainnya" },
  ...Object.entries(EXPENSE_CATEGORY_LABELS).map(([category, label]) => ({
    kind: "expense",
    category,
    label,
  })),
  { kind: "expense", category: "honorarium", label: "Honorarium" },
];

const BUDGET_KEYS = new Set(
  BUDGET_CATALOG.map((item) => `${item.kind}:${item.category}`),
);

let reportSupportSchemaReady = false;
let reportSupportSchemaPromise = null;

const ensureReportSupportTables = async (db) => {
  if (reportSupportSchemaReady) {
    return;
  }

  if (!reportSupportSchemaPromise) {
    reportSupportSchemaPromise = (async () => {
      await db.query(`CREATE SCHEMA IF NOT EXISTS finance`);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.budget (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
          kind VARCHAR(10) NOT NULL CHECK (kind IN ('income', 'expense')),
          category VARCHAR(30) NOT NULL,
          amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
          notes TEXT,
          created_by INT REFERENCES public.u_users(id),
          updated_by INT REFERENCES public.u_users(id),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE (homebase_id, periode_id, kind, category)
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.period_lock (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          year INT NOT NULL CHECK (year >= 2000 AND year <= 2100),
          month INT NOT NULL CHECK (month >= 1 AND month <= 12),
          notes TEXT,
          locked_by INT REFERENCES public.u_users(id),
          locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE (homebase_id, year, month)
        )
      `);
    })()
      .then(() => {
        reportSupportSchemaReady = true;
      })
      .catch((error) => {
        reportSupportSchemaPromise = null;
        throw error;
      });
  }

  await reportSupportSchemaPromise;
};

// Pengeluaran operasional (finance.expense) dalam cakupan filter laporan.
const loadExpenseBreakdown = async (db, { homebaseId, periodeId, mode, month, dateFrom, dateTo }) => {
  if (!(await tableExists(db, "finance.expense"))) {
    return [];
  }

  const params = [homebaseId, periodeId];
  let dateClause = "";
  if (mode === "bulan" && month) {
    params.push(month);
    dateClause = ` AND EXTRACT(MONTH FROM e.expense_date) = $${params.length}`;
  } else if (mode === "rentang" && dateFrom && dateTo) {
    params.push(dateFrom, dateTo);
    dateClause = ` AND e.expense_date BETWEEN $${params.length - 1} AND $${params.length}`;
  }

  const result = await db.query(
    `
      SELECT
        e.category,
        COUNT(*)::int AS entry_count,
        COALESCE(SUM(e.amount), 0)::float AS total
      FROM finance.expense e
      WHERE e.homebase_id = $1
        AND e.periode_id = $2
        ${dateClause}
      GROUP BY e.category
      ORDER BY total DESC
    `,
    params,
  );

  return result.rows.map((row) => ({
    category: row.category,
    category_label: EXPENSE_CATEGORY_LABELS[row.category] || row.category,
    entry_count: Number(row.entry_count || 0),
    total: numberValue(row.total),
  }));
};

// Honorarium dalam cakupan filter: locked = realisasi, draft = komitmen belum final.
const loadHonorariumSummary = async (db, { homebaseId, periodeId, mode, month, dateFrom, dateTo }) => {
  if (!(await tableExists(db, "finance.honor_payroll_period"))) {
    return { total: 0, payroll_count: 0, draft_total: 0, draft_count: 0 };
  }

  const params = [homebaseId, periodeId];
  let dateClause = "";
  if (mode === "bulan" && month) {
    params.push(month);
    dateClause = ` AND hp.month = $${params.length}`;
  } else if (mode === "rentang" && dateFrom && dateTo) {
    params.push(dateFrom, dateTo);
    dateClause = ` AND hp.start_date <= $${params.length} AND hp.end_date >= $${params.length - 1}`;
  }

  const result = await db.query(
    `
      SELECT
        hp.status,
        COALESCE(SUM(hp.grand_total), 0)::float AS total,
        COUNT(*)::int AS payroll_count
      FROM finance.honor_payroll_period hp
      WHERE hp.homebase_id = $1
        AND hp.periode_id = $2
        ${dateClause}
      GROUP BY hp.status
    `,
    params,
  );

  const summary = { total: 0, payroll_count: 0, draft_total: 0, draft_count: 0 };
  for (const row of result.rows) {
    if (row.status === "locked") {
      summary.total = numberValue(row.total);
      summary.payroll_count = Number(row.payroll_count || 0);
    } else {
      summary.draft_total += numberValue(row.total);
      summary.draft_count += Number(row.payroll_count || 0);
    }
  }
  return summary;
};

// Arus kas per bulan kalender (kunci YYYY-MM) untuk satu periode penuh.
const loadMonthlyCashflow = async (db, { homebaseId, periodeId }) => {
  const buckets = new Map();
  const ensureBucket = (key) => {
    if (!buckets.has(key)) {
      buckets.set(key, { month_key: key, cash_in: 0, cash_out: 0 });
    }
    return buckets.get(key);
  };

  const incomeResult = await db.query(
    `
      SELECT
        to_char(p.payment_date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(pa.allocated_amount), 0)::float AS total
      FROM finance.payment p
      JOIN finance.payment_allocation pa ON pa.payment_id = p.id
      JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
      JOIN finance.invoice inv ON inv.id = ii.invoice_id
      WHERE inv.homebase_id = $1
        AND inv.periode_id = $2
        AND p.status = ANY($3::text[])
        AND ii.item_type IN ('spp', 'other')
        AND p.payment_date IS NOT NULL
      GROUP BY 1
    `,
    [homebaseId, periodeId, SUCCESS_PAYMENT_STATUSES],
  );
  for (const row of incomeResult.rows) {
    ensureBucket(row.month_key).cash_in += numberValue(row.total);
  }

  if (await tableExists(db, "finance.expense")) {
    const expenseResult = await db.query(
      `
        SELECT
          to_char(e.expense_date, 'YYYY-MM') AS month_key,
          COALESCE(SUM(e.amount), 0)::float AS total
        FROM finance.expense e
        WHERE e.homebase_id = $1
          AND e.periode_id = $2
        GROUP BY 1
      `,
      [homebaseId, periodeId],
    );
    for (const row of expenseResult.rows) {
      ensureBucket(row.month_key).cash_out += numberValue(row.total);
    }
  }

  if (await tableExists(db, "finance.honor_payroll_period")) {
    const honorResult = await db.query(
      `
        SELECT
          to_char(make_date(hp.year, hp.month, 1), 'YYYY-MM') AS month_key,
          COALESCE(SUM(hp.grand_total), 0)::float AS total
        FROM finance.honor_payroll_period hp
        WHERE hp.homebase_id = $1
          AND hp.periode_id = $2
          AND hp.status = 'locked'
        GROUP BY 1
      `,
      [homebaseId, periodeId],
    );
    for (const row of honorResult.rows) {
      ensureBucket(row.month_key).cash_out += numberValue(row.total);
    }
  }

  let runningBalance = 0;
  return [...buckets.values()]
    .sort((a, b) => a.month_key.localeCompare(b.month_key))
    .map((row) => {
      const [year, month] = row.month_key.split("-").map(Number);
      const net = row.cash_in - row.cash_out;
      runningBalance += net;
      return {
        month_key: row.month_key,
        month_label: `${MONTH_NAMES[month - 1] || month} ${year}`,
        cash_in: row.cash_in,
        cash_out: row.cash_out,
        net,
        running_balance: runningBalance,
      };
    });
};

// Realisasi satu periode penuh (tanpa filter bulan/rentang) untuk pembanding RAPBS.
const loadBudgetRealization = async (db, { homebaseId, periodeId }) => {
  const incomeResult = await db.query(
    `
      SELECT
        ii.item_type,
        COALESCE(SUM(pa.allocated_amount), 0)::float AS collected
      FROM finance.payment p
      JOIN finance.payment_allocation pa ON pa.payment_id = p.id
      JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
      JOIN finance.invoice inv ON inv.id = ii.invoice_id
      WHERE inv.homebase_id = $1
        AND inv.periode_id = $2
        AND p.status = ANY($3::text[])
        AND ii.item_type IN ('spp', 'other')
      GROUP BY ii.item_type
    `,
    [homebaseId, periodeId, SUCCESS_PAYMENT_STATUSES],
  );

  const realized = new Map();
  for (const row of incomeResult.rows) {
    realized.set(`income:${row.item_type}`, numberValue(row.collected));
  }

  const fullPeriodeExpenses = await loadExpenseBreakdown(db, {
    homebaseId,
    periodeId,
    mode: "periode",
  });
  for (const row of fullPeriodeExpenses) {
    realized.set(`expense:${row.category}`, row.total);
  }

  const fullPeriodeHonor = await loadHonorariumSummary(db, {
    homebaseId,
    periodeId,
    mode: "periode",
  });
  realized.set("expense:honorarium", fullPeriodeHonor.total);

  const budgetResult = await db.query(
    `
      SELECT kind, category, amount::float AS amount
      FROM finance.budget
      WHERE homebase_id = $1
        AND periode_id = $2
    `,
    [homebaseId, periodeId],
  );

  const budgets = new Map();
  for (const row of budgetResult.rows) {
    budgets.set(`${row.kind}:${row.category}`, numberValue(row.amount));
  }

  const items = BUDGET_CATALOG.map((entry) => {
    const key = `${entry.kind}:${entry.category}`;
    const budgetAmount = budgets.get(key) || 0;
    const realizedAmount = realized.get(key) || 0;
    const percent =
      budgetAmount > 0
        ? Math.round((realizedAmount / budgetAmount) * 1000) / 10
        : null;
    return {
      kind: entry.kind,
      category: entry.category,
      label: entry.label,
      budget_amount: budgetAmount,
      realized_amount: realizedAmount,
      variance: realizedAmount - budgetAmount,
      percent,
    };
  });

  const sumBy = (kind, field) =>
    items
      .filter((item) => item.kind === kind)
      .reduce((sum, item) => sum + item[field], 0);

  return {
    items,
    totals: {
      income_budget: sumBy("income", "budget_amount"),
      income_realized: sumBy("income", "realized_amount"),
      expense_budget: sumBy("expense", "budget_amount"),
      expense_realized: sumBy("expense", "realized_amount"),
    },
  };
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : text;
};

const resolveReportHomebaseId = async (db, user, requestedHomebaseId) => {
  if (user.homebase_id) {
    return Number(user.homebase_id);
  }

  if (!requestedHomebaseId) {
    return null;
  }

  return resolveScopedHomebaseId(db, user, requestedHomebaseId);
};

const getAvailableHomebases = async (db, user) => {
  if (user.homebase_id) {
    const result = await db.query(
      `
        SELECT id, name, level
        FROM a_homebase
        WHERE id = $1
        LIMIT 1
      `,
      [user.homebase_id],
    );
    return result.rows;
  }

  const result = await db.query(
    `
      SELECT id, name, level
      FROM a_homebase
      ORDER BY name ASC
    `,
  );
  return result.rows;
};

const buildRealizationDateFilter = ({
  mode,
  month,
  dateFrom,
  dateTo,
  params,
  paymentAlias = "p",
  itemAlias = "ii",
}) => {
  if (mode === "bulan" && month) {
    params.push(month);
    const monthIdx = params.length;
    return {
      spp: ` AND ${itemAlias}.bill_month = $${monthIdx}`,
      other: ` AND EXTRACT(MONTH FROM ${paymentAlias}.payment_date) = $${monthIdx}`,
      sharedMonthIdx: monthIdx,
    };
  }

  if (mode === "rentang" && dateFrom && dateTo) {
    params.push(dateFrom, dateTo);
    const fromIdx = params.length - 1;
    const toIdx = params.length;
    const clause = ` AND ${paymentAlias}.payment_date::date BETWEEN $${fromIdx} AND $${toIdx}`;
    return { spp: clause, other: clause, sharedMonthIdx: null };
  }

  return { spp: "", other: "", sharedMonthIdx: null };
};

router.get(
  "/reports/homebases",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const search = (req.query.search || "").trim();
    let homebases = await getAvailableHomebases(db, req.user);

    if (search) {
      const needle = search.toLowerCase();
      homebases = homebases.filter((item) =>
        String(item.name || "")
          .toLowerCase()
          .includes(needle),
      );
    }

    res.json({
      status: "success",
      data: homebases,
      meta: {
        locked: Boolean(req.user.homebase_id),
      },
    });
  }),
);

router.get(
  "/reports/options",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveReportHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({ message: "Homebase wajib dipilih" });
    }

    const [homebaseResult, periodeResult] = await Promise.all([
      db.query(
        `SELECT id, name, level FROM a_homebase WHERE id = $1 LIMIT 1`,
        [homebaseId],
      ),
      db.query(
        `
          SELECT id, name, is_active, created_at
          FROM a_periode
          WHERE homebase_id = $1
          ORDER BY is_active DESC, created_at DESC, id DESC
        `,
        [homebaseId],
      ),
    ]);

    if (homebaseResult.rowCount === 0) {
      return res.status(404).json({ message: "Homebase tidak ditemukan" });
    }

    const activePeriode =
      periodeResult.rows.find((item) => item.is_active) ||
      periodeResult.rows[0] ||
      null;

    res.json({
      status: "success",
      data: {
        homebase: homebaseResult.rows[0],
        periodes: periodeResult.rows,
        months: MONTH_NAMES.map((label, index) => ({
          value: index + 1,
          label,
        })),
        modes: [
          { value: "periode", label: "Satu periode utuh" },
          { value: "bulan", label: "Bulan" },
          { value: "rentang", label: "Rentang tanggal" },
        ],
        default_periode_id: activePeriode?.id || null,
        default_month: new Date().getMonth() + 1,
      },
    });
  }),
);

router.get(
  "/reports/revenue",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveReportHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.query.periode_id);
    const mode = String(req.query.mode || "periode").trim().toLowerCase();
    const month = parseOptionalInt(req.query.month);
    const dateFrom = parseDateOnly(req.query.date_from);
    const dateTo = parseDateOnly(req.query.date_to);

    if (!homebaseId) {
      return res.status(400).json({ message: "Homebase wajib dipilih" });
    }

    if (!periodeId) {
      return res.status(400).json({ message: "Periode wajib dipilih" });
    }

    if (!REPORT_MODES.has(mode)) {
      return res.status(400).json({
        message: "Mode laporan harus periode, bulan, atau rentang",
      });
    }

    if (mode === "bulan" && (!month || month < 1 || month > 12)) {
      return res.status(400).json({ message: "Bulan wajib dipilih (1-12)" });
    }

    if (mode === "rentang" && (!dateFrom || !dateTo)) {
      return res.status(400).json({
        message: "Tanggal awal dan akhir wajib diisi untuk mode rentang",
      });
    }

    if (mode === "rentang" && dateFrom > dateTo) {
      return res.status(400).json({
        message: "Tanggal awal tidak boleh lebih besar dari tanggal akhir",
      });
    }

    const periodeCheck = await db.query(
      `
        SELECT id, name, is_active
        FROM a_periode
        WHERE id = $1 AND homebase_id = $2
        LIMIT 1
      `,
      [periodeId, homebaseId],
    );

    if (periodeCheck.rowCount === 0) {
      return res.status(404).json({
        message: "Periode tidak ditemukan pada satuan ini",
      });
    }

    const homebaseResult = await db.query(
      `SELECT id, name, level FROM a_homebase WHERE id = $1 LIMIT 1`,
      [homebaseId],
    );

    const realizationParams = [
      homebaseId,
      periodeId,
      SUCCESS_PAYMENT_STATUSES,
    ];
    const realizationFilter = buildRealizationDateFilter({
      mode,
      month,
      dateFrom,
      dateTo,
      params: realizationParams,
    });

    const realizationResult = await db.query(
      `
        SELECT
          ii.item_type,
          COALESCE(SUM(pa.allocated_amount), 0)::float AS collected
        FROM finance.payment p
        JOIN finance.payment_allocation pa ON pa.payment_id = p.id
        JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        JOIN finance.invoice inv ON inv.id = ii.invoice_id
        WHERE inv.homebase_id = $1
          AND inv.periode_id = $2
          AND p.status = ANY($3::text[])
          AND ii.item_type IN ('spp', 'other')
          AND (
            (ii.item_type = 'spp' ${realizationFilter.spp})
            OR (ii.item_type = 'other' ${realizationFilter.other})
          )
        GROUP BY ii.item_type
      `,
      realizationParams,
    );

    const collectedByType = {
      spp: 0,
      other: 0,
    };
    for (const row of realizationResult.rows) {
      collectedByType[row.item_type] = numberValue(row.collected);
    }

    const monthStart = mode === "bulan" ? month : 1;
    const monthEnd = mode === "bulan" ? month : 12;

    const sppParams = [
      homebaseId,
      periodeId,
      SUCCESS_PAYMENT_STATUSES,
      monthStart,
      monthEnd,
    ];

    const sppResult = await db.query(
      `
        WITH months AS (
          SELECT generate_series($4::int, $5::int) AS bill_month
        ),
        item_scope AS (
          SELECT
            inv.student_id,
            inv.periode_id,
            ii.id AS invoice_item_id,
            ii.fee_rule_id,
            ii.bill_month,
            ii.amount,
            ii.bruto_amount,
            ii.scholarship_cover,
            COALESCE(
              SUM(
                CASE
                  WHEN p.status = ANY($3::text[]) THEN pa.allocated_amount
                  ELSE 0
                END
              ),
              0
            ) AS paid_amount
          FROM finance.invoice inv
          JOIN finance.invoice_item ii
            ON ii.invoice_id = inv.id
           AND ii.item_type = 'spp'
          LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
          LEFT JOIN finance.payment p ON p.id = pa.payment_id
          WHERE inv.homebase_id = $1
            AND inv.periode_id = $2
          GROUP BY inv.student_id, inv.periode_id, ii.id
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
          m.bill_month,
          fr.id AS tariff_id,
          fr.amount AS tariff_amount,
          item.invoice_item_id,
          item.bruto_amount,
          item.scholarship_cover,
          item.amount AS stored_netto,
          COALESCE(item.paid_amount, 0) AS paid_amount
        FROM u_class_enrollments e
        JOIN u_students s ON s.user_id = e.student_id
        JOIN u_users u ON u.id = s.user_id
        JOIN a_class c ON c.id = e.class_id
        JOIN a_grade g ON g.id = c.grade_id
        JOIN a_periode p ON p.id = e.periode_id
        CROSS JOIN months m
        LEFT JOIN LATERAL (
          SELECT
            spp_rule.id,
            spp_rule.amount
          FROM finance.fee_rule spp_rule
          JOIN finance.fee_component spp_component
            ON spp_component.id = spp_rule.component_id
           AND spp_component.category = 'spp'
          WHERE spp_rule.homebase_id = e.homebase_id
            AND spp_rule.periode_id = e.periode_id
            AND spp_rule.grade_id = g.id
            AND spp_rule.is_active = true
          ORDER BY spp_rule.updated_at DESC NULLS LAST, spp_rule.id DESC
          LIMIT 1
        ) fr ON true
        LEFT JOIN LATERAL (
          SELECT
            scoped.invoice_item_id,
            scoped.amount,
            scoped.bruto_amount,
            scoped.scholarship_cover,
            scoped.paid_amount
          FROM item_scope scoped
          WHERE scoped.student_id = s.user_id
            AND scoped.periode_id = e.periode_id
            AND scoped.bill_month = m.bill_month
          ORDER BY
            CASE
              WHEN fr.id IS NOT NULL AND scoped.fee_rule_id = fr.id THEN 0
              ELSE 1
            END,
            scoped.invoice_item_id DESC
          LIMIT 1
        ) item ON true
        WHERE e.homebase_id = $1
          AND e.periode_id = $2
          AND (fr.id IS NOT NULL OR item.invoice_item_id IS NOT NULL)
        ORDER BY g.name ASC, c.name ASC, u.full_name ASC, m.bill_month ASC
      `,
      sppParams,
    );

    const otherParams = [homebaseId, periodeId, SUCCESS_PAYMENT_STATUSES];
    const otherResult = await db.query(
      `
        WITH enrollment_scope AS (
          SELECT
            e.homebase_id,
            e.student_id,
            e.periode_id,
            p.name AS periode_name,
            u.full_name AS student_name,
            s.nis,
            c.id AS class_id,
            c.name AS class_name,
            g.id AS grade_id,
            g.name AS grade_name
          FROM u_class_enrollments e
          JOIN u_students s ON s.user_id = e.student_id
          JOIN u_users u ON u.id = s.user_id
          JOIN a_periode p ON p.id = e.periode_id
          JOIN a_class c ON c.id = e.class_id
          JOIN a_grade g ON g.id = c.grade_id
          WHERE e.homebase_id = $1
            AND e.periode_id = $2
        ),
        grade_type_scope AS (
          SELECT
            fc.id AS type_id,
            fc.name AS type_name,
            COALESCE(fc.scope, 'grade') AS scope,
            fr.grade_id,
            fr.periode_id,
            fr.amount,
            fr.id AS fee_rule_id,
            NULL::int AS assigned_student_id
          FROM finance.fee_component fc
          JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
          WHERE fc.homebase_id = $1
            AND fc.category = 'other'
            AND fc.is_active = true
            AND COALESCE(fc.scope, 'grade') = 'grade'
            AND fr.grade_id IS NOT NULL
            AND (fr.periode_id IS NULL OR fr.periode_id = $2)
        ),
        student_type_scope AS (
          SELECT
            fc.id AS type_id,
            fc.name AS type_name,
            'student'::varchar AS scope,
            NULL::int AS grade_id,
            fa.periode_id,
            COALESCE(fa.amount, fr.amount) AS amount,
            fr.id AS fee_rule_id,
            fa.student_id AS assigned_student_id
          FROM finance.fee_component fc
          JOIN finance.fee_assignment fa
            ON fa.component_id = fc.id
            AND fa.is_active = true
          JOIN finance.fee_rule fr
            ON fr.component_id = fc.id
            AND fr.is_active = true
            AND fr.grade_id IS NULL
          WHERE fc.homebase_id = $1
            AND fc.category = 'other'
            AND fc.is_active = true
            AND COALESCE(fc.scope, 'grade') = 'student'
            AND fa.periode_id = $2
        ),
        type_scope AS (
          SELECT * FROM grade_type_scope
          UNION ALL
          SELECT * FROM student_type_scope
        ),
        item_scope AS (
          SELECT
            inv.student_id,
            inv.periode_id,
            ii.id AS charge_id,
            ii.component_id,
            ii.amount AS amount_due,
            ii.bruto_amount,
            ii.scholarship_cover,
            COALESCE(
              SUM(
                CASE
                  WHEN p.status = ANY($3::text[]) THEN pa.allocated_amount
                  ELSE 0
                END
              ),
              0
            ) AS paid_amount
          FROM finance.invoice inv
          JOIN finance.invoice_item ii
            ON ii.invoice_id = inv.id
           AND ii.item_type = 'other'
          LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
          LEFT JOIN finance.payment p ON p.id = pa.payment_id
          WHERE inv.homebase_id = $1
            AND inv.periode_id = $2
          GROUP BY inv.student_id, inv.periode_id, ii.id
        )
        SELECT
          item.charge_id,
          es.periode_id,
          es.periode_name,
          ts.type_id,
          ts.type_name,
          ts.scope AS type_scope,
          ts.amount AS tariff_amount,
          es.student_id,
          es.student_name,
          es.nis,
          es.class_id,
          es.class_name,
          es.grade_id,
          es.grade_name,
          item.bruto_amount,
          item.scholarship_cover,
          COALESCE(item.amount_due, ts.amount) AS amount_due,
          COALESCE(item.paid_amount, 0) AS paid_amount
        FROM enrollment_scope es
        JOIN type_scope ts
          ON (
            (
              ts.scope = 'grade'
              AND ts.grade_id = es.grade_id
              AND (ts.periode_id IS NULL OR ts.periode_id = es.periode_id)
            )
            OR (
              ts.scope = 'student'
              AND ts.assigned_student_id = es.student_id
              AND ts.periode_id = es.periode_id
            )
          )
        LEFT JOIN item_scope item
          ON item.student_id = es.student_id
          AND item.periode_id = es.periode_id
          AND item.component_id = ts.type_id
        ORDER BY es.grade_name ASC, es.class_name ASC, es.student_name ASC, ts.type_name ASC
      `,
      otherParams,
    );

    const studentIds = [
      ...new Set(
        [
          ...sppResult.rows.map((row) => Number(row.student_id)),
          ...otherResult.rows.map((row) => Number(row.student_id)),
        ].filter(Boolean),
      ),
    ];

    const benefitIndex = await loadScholarshipBenefitIndex(
      db,
      homebaseId,
      studentIds,
    );

    const sppRows = sppResult.rows.map((item) => {
      const tariffAmount = numberValue(item.tariff_amount);
      const hasInvoiceItem = Boolean(item.invoice_item_id);
      const enriched = enrichDueWithScholarship({
        benefitIndex,
        studentId: item.student_id,
        itemType: "spp",
        periodeId: item.periode_id,
        billMonth: item.bill_month,
        brutoAmount: tariffAmount,
        storedBruto: item.bruto_amount,
        storedCover: item.scholarship_cover,
        storedNetto: item.stored_netto,
        hasInvoiceItem,
      });
      const amount = numberValue(enriched.amount);
      const paidAmount = numberValue(item.paid_amount);
      let status = "unpaid";
      if (amount <= 0 || (paidAmount >= amount && amount > 0)) {
        status = "paid";
      } else if (paidAmount > 0) {
        status = "partial";
      }

      return {
        category: "spp",
        student_id: item.student_id,
        student_name: item.student_name,
        nis: item.nis,
        class_id: item.class_id,
        class_name: item.class_name,
        grade_id: item.grade_id,
        grade_name: item.grade_name,
        bill_month: item.bill_month,
        billing_period_label: formatBillingPeriod(item.bill_month),
        type_id: null,
        type_name: "SPP",
        bruto_amount: numberValue(enriched.bruto_amount),
        scholarship_cover: numberValue(enriched.scholarship_cover),
        amount,
        paid_amount: paidAmount,
        remaining_amount: Math.max(amount - paidAmount, 0),
        status,
      };
    });

    const otherRows = otherResult.rows.map((item) => {
      const tariffAmount = numberValue(item.tariff_amount);
      const hasInvoiceItem = Boolean(item.charge_id);
      const enriched = enrichDueWithScholarship({
        benefitIndex,
        studentId: item.student_id,
        itemType: "other",
        componentId: item.type_id,
        periodeId: item.periode_id,
        billMonth: null,
        brutoAmount: tariffAmount,
        storedBruto: item.bruto_amount,
        storedCover: item.scholarship_cover,
        storedNetto: item.amount_due,
        hasInvoiceItem,
      });
      const amount = numberValue(enriched.amount);
      const paidAmount = numberValue(item.paid_amount);
      let status = "unpaid";
      if (amount <= 0 || (paidAmount >= amount && amount > 0)) {
        status = "paid";
      } else if (paidAmount > 0) {
        status = "partial";
      }

      return {
        category: "other",
        student_id: item.student_id,
        student_name: item.student_name,
        nis: item.nis,
        class_id: item.class_id,
        class_name: item.class_name,
        grade_id: item.grade_id,
        grade_name: item.grade_name,
        bill_month: null,
        billing_period_label: "-",
        type_id: item.type_id,
        type_name: item.type_name,
        bruto_amount: numberValue(enriched.bruto_amount),
        scholarship_cover: numberValue(enriched.scholarship_cover),
        amount,
        paid_amount: paidAmount,
        remaining_amount: Math.max(amount - paidAmount, 0),
        status,
      };
    });

    const sppByClassMap = new Map();
    for (const row of sppRows) {
      if (row.amount <= 0 && row.paid_amount <= 0) continue;
      const key = row.class_id || `unknown-${row.class_name}`;
      if (!sppByClassMap.has(key)) {
        sppByClassMap.set(key, {
          class_id: row.class_id,
          class_name: row.class_name || "-",
          grade_name: row.grade_name || "-",
          student_count: new Set(),
          target_bruto: 0,
          scholarship_cover: 0,
          target: 0,
          paid_obligation: 0,
          remaining: 0,
          unpaid_count: 0,
          partial_count: 0,
          paid_count: 0,
        });
      }
      const bucket = sppByClassMap.get(key);
      bucket.student_count.add(row.student_id);
      bucket.target_bruto += row.bruto_amount;
      bucket.scholarship_cover += row.scholarship_cover;
      bucket.target += row.amount;
      bucket.paid_obligation += Math.min(row.paid_amount, row.amount);
      bucket.remaining += row.remaining_amount;
      if (row.status === "paid") bucket.paid_count += 1;
      else if (row.status === "partial") bucket.partial_count += 1;
      else bucket.unpaid_count += 1;
    }

    const spp_by_class = [...sppByClassMap.values()]
      .map((item) => {
        const target = item.target;
        const achievement =
          target > 0
            ? Math.round((item.paid_obligation / target) * 1000) / 10
            : 0;
        return {
          class_id: item.class_id,
          class_name: item.class_name,
          grade_name: item.grade_name,
          student_count: item.student_count.size,
          target_bruto: item.target_bruto,
          scholarship_cover: item.scholarship_cover,
          target,
          paid_obligation: item.paid_obligation,
          remaining: item.remaining,
          achievement,
          unpaid_count: item.unpaid_count,
          partial_count: item.partial_count,
          paid_count: item.paid_count,
        };
      })
      .sort((a, b) =>
        String(a.class_name).localeCompare(String(b.class_name), "id"),
      );

    const otherByTypeMap = new Map();
    for (const row of otherRows) {
      if (row.amount <= 0 && row.paid_amount <= 0) continue;
      const key = row.type_id || row.type_name;
      if (!otherByTypeMap.has(key)) {
        otherByTypeMap.set(key, {
          type_id: row.type_id,
          type_name: row.type_name || "-",
          student_count: new Set(),
          target_bruto: 0,
          scholarship_cover: 0,
          target: 0,
          paid_obligation: 0,
          remaining: 0,
          unpaid_count: 0,
          partial_count: 0,
          paid_count: 0,
        });
      }
      const bucket = otherByTypeMap.get(key);
      bucket.student_count.add(row.student_id);
      bucket.target_bruto += row.bruto_amount;
      bucket.scholarship_cover += row.scholarship_cover;
      bucket.target += row.amount;
      bucket.paid_obligation += Math.min(row.paid_amount, row.amount);
      bucket.remaining += row.remaining_amount;
      if (row.status === "paid") bucket.paid_count += 1;
      else if (row.status === "partial") bucket.partial_count += 1;
      else bucket.unpaid_count += 1;
    }

    const other_by_type = [...otherByTypeMap.values()]
      .map((item) => {
        const target = item.target;
        const achievement =
          target > 0
            ? Math.round((item.paid_obligation / target) * 1000) / 10
            : 0;
        return {
          type_id: item.type_id,
          type_name: item.type_name,
          student_count: item.student_count.size,
          target_bruto: item.target_bruto,
          scholarship_cover: item.scholarship_cover,
          target,
          paid_obligation: item.paid_obligation,
          remaining: item.remaining,
          achievement,
          unpaid_count: item.unpaid_count,
          partial_count: item.partial_count,
          paid_count: item.paid_count,
        };
      })
      .sort((a, b) =>
        String(a.type_name).localeCompare(String(b.type_name), "id"),
      );

    const unpaid_students = [...sppRows, ...otherRows]
      .filter((row) => row.status === "unpaid" || row.status === "partial")
      .filter((row) => row.remaining_amount > 0)
      .map((row) => ({
        key: `${row.category}-${row.student_id}-${row.type_id || "spp"}-${row.bill_month || 0}`,
        category: row.category,
        category_label: row.category === "spp" ? "SPP" : "Lainnya",
        student_id: row.student_id,
        student_name: row.student_name,
        nis: row.nis,
        class_id: row.class_id,
        class_name: row.class_name,
        grade_name: row.grade_name,
        type_name: row.type_name,
        bill_month: row.bill_month,
        billing_period_label: row.billing_period_label,
        amount: row.amount,
        paid_amount: row.paid_amount,
        remaining_amount: row.remaining_amount,
        status: row.status,
      }));

    const sppTarget = sppRows.reduce((sum, row) => sum + row.amount, 0);
    const sppScholarship = sppRows.reduce(
      (sum, row) => sum + row.scholarship_cover,
      0,
    );
    const sppRemaining = sppRows.reduce(
      (sum, row) => sum + row.remaining_amount,
      0,
    );
    const otherTarget = otherRows.reduce((sum, row) => sum + row.amount, 0);
    const otherScholarship = otherRows.reduce(
      (sum, row) => sum + row.scholarship_cover,
      0,
    );
    const otherRemaining = otherRows.reduce(
      (sum, row) => sum + row.remaining_amount,
      0,
    );

    const sppCollected = collectedByType.spp;
    const otherCollected = collectedByType.other;

    const expenseFilterArgs = {
      homebaseId,
      periodeId,
      mode,
      month,
      dateFrom,
      dateTo,
    };
    await ensureReportSupportTables(db);

    const [expense_by_category, honorarium, monthly_cashflow, budget_realization] =
      await Promise.all([
        loadExpenseBreakdown(db, expenseFilterArgs),
        loadHonorariumSummary(db, expenseFilterArgs),
        loadMonthlyCashflow(db, { homebaseId, periodeId }),
        loadBudgetRealization(db, { homebaseId, periodeId }),
      ]);

    const expenseTotal = expense_by_category.reduce(
      (sum, row) => sum + row.total,
      0,
    );
    const expenseEntryCount = expense_by_category.reduce(
      (sum, row) => sum + row.entry_count,
      0,
    );
    const feeIncomeTotal = sppCollected + otherCollected;
    const expenseGrandTotal = expenseTotal + honorarium.total;

    res.json({
      status: "success",
      data: {
        homebase: homebaseResult.rows[0],
        periode: periodeCheck.rows[0],
        filter: {
          mode,
          month: mode === "bulan" ? month : null,
          month_label: mode === "bulan" ? formatBillingPeriod(month) : null,
          date_from: mode === "rentang" ? dateFrom : null,
          date_to: mode === "rentang" ? dateTo : null,
        },
        summary: {
          spp_target: sppTarget,
          spp_scholarship_cover: sppScholarship,
          spp_collected: sppCollected,
          spp_remaining: sppRemaining,
          other_target: otherTarget,
          other_scholarship_cover: otherScholarship,
          other_collected: otherCollected,
          other_remaining: otherRemaining,
          fee_income_total: feeIncomeTotal,
          fee_target_total: sppTarget + otherTarget,
          fee_remaining_total: sppRemaining + otherRemaining,
          unpaid_student_rows: unpaid_students.length,
          unpaid_student_count: new Set(
            unpaid_students.map((item) => item.student_id),
          ).size,
          expense_total: expenseTotal,
          expense_entry_count: expenseEntryCount,
          honorarium_total: honorarium.total,
          honorarium_payroll_count: honorarium.payroll_count,
          honorarium_draft_total: honorarium.draft_total,
          honorarium_draft_count: honorarium.draft_count,
          expense_grand_total: expenseGrandTotal,
          net_balance: feeIncomeTotal - expenseGrandTotal,
        },
        spp_by_class,
        other_by_type,
        unpaid_students,
        expense_by_category,
        monthly_cashflow,
        budget_realization,
      },
    });
  }),
);

router.get(
  "/reports/budgets",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureReportSupportTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveReportHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.query.periode_id);

    if (!homebaseId || !periodeId) {
      return res
        .status(400)
        .json({ message: "Homebase dan periode wajib dipilih" });
    }

    const result = await db.query(
      `
        SELECT kind, category, amount::float AS amount, notes
        FROM finance.budget
        WHERE homebase_id = $1
          AND periode_id = $2
      `,
      [homebaseId, periodeId],
    );

    const stored = new Map();
    for (const row of result.rows) {
      stored.set(`${row.kind}:${row.category}`, row);
    }

    res.json({
      status: "success",
      data: BUDGET_CATALOG.map((entry) => {
        const row = stored.get(`${entry.kind}:${entry.category}`);
        return {
          kind: entry.kind,
          category: entry.category,
          label: entry.label,
          amount: numberValue(row?.amount),
          notes: row?.notes || null,
        };
      }),
    });
  }),
);

router.put(
  "/reports/budgets",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureReportSupportTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveReportHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.body.periode_id);
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!homebaseId || !periodeId) {
      return res
        .status(400)
        .json({ message: "Homebase dan periode wajib dipilih" });
    }

    const periodeCheck = await client.query(
      `SELECT id FROM a_periode WHERE id = $1 AND homebase_id = $2 LIMIT 1`,
      [periodeId, homebaseId],
    );
    if (periodeCheck.rowCount === 0) {
      return res
        .status(400)
        .json({ message: "Periode tidak valid untuk satuan ini" });
    }

    for (const item of items) {
      const kind = String(item.kind || "").trim();
      const category = String(item.category || "").trim();
      const amount = Number(item.amount);

      if (!BUDGET_KEYS.has(`${kind}:${category}`)) {
        return res.status(400).json({
          message: `Pos anggaran tidak dikenal: ${kind}/${category}`,
        });
      }
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({
          message: "Nominal anggaran harus angka >= 0",
        });
      }

      await client.query(
        `
          INSERT INTO finance.budget (
            homebase_id, periode_id, kind, category, amount,
            created_by, updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $6)
          ON CONFLICT (homebase_id, periode_id, kind, category)
          DO UPDATE SET
            amount = EXCLUDED.amount,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        `,
        [homebaseId, periodeId, kind, category, amount, req.user.id],
      );
    }

    res.json({
      status: "success",
      message: "Anggaran berhasil disimpan",
    });
  }),
);

router.get(
  "/reports/closings",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureReportSupportTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveReportHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const year =
      parseOptionalInt(req.query.year) || new Date().getFullYear();

    if (!homebaseId) {
      return res.status(400).json({ message: "Homebase wajib dipilih" });
    }

    const result = await db.query(
      `
        SELECT
          pl.id,
          pl.month,
          pl.notes,
          pl.locked_at,
          locker.full_name AS locked_by_name
        FROM finance.period_lock pl
        LEFT JOIN u_users locker ON locker.id = pl.locked_by
        WHERE pl.homebase_id = $1
          AND pl.year = $2
      `,
      [homebaseId, year],
    );

    const lockByMonth = new Map(
      result.rows.map((row) => [Number(row.month), row]),
    );

    res.json({
      status: "success",
      data: {
        year,
        months: MONTH_NAMES.map((label, index) => {
          const lock = lockByMonth.get(index + 1);
          return {
            month: index + 1,
            month_label: label,
            locked: Boolean(lock),
            lock_id: lock ? Number(lock.id) : null,
            locked_at: lock?.locked_at || null,
            locked_by_name: lock?.locked_by_name || null,
            notes: lock?.notes || null,
          };
        }),
      },
    });
  }),
);

router.post(
  "/reports/closings",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureReportSupportTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveReportHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const year = parseOptionalInt(req.body.year);
    const month = parseOptionalInt(req.body.month);
    const notes = String(req.body.notes || "").trim() || null;

    if (!homebaseId) {
      return res.status(400).json({ message: "Homebase wajib dipilih" });
    }
    if (!year || year < 2000 || year > 2100) {
      return res.status(400).json({ message: "Tahun tidak valid" });
    }
    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ message: "Bulan tidak valid (1-12)" });
    }

    await client.query(
      `
        INSERT INTO finance.period_lock (homebase_id, year, month, notes, locked_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (homebase_id, year, month) DO NOTHING
      `,
      [homebaseId, year, month, notes, req.user.id],
    );

    res.json({
      status: "success",
      message: `Tutup buku ${MONTH_NAMES[month - 1]} ${year} berhasil dikunci`,
    });
  }),
);

router.delete(
  "/reports/closings/:id",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureReportSupportTables(client);

    const lockId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveReportHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!lockId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const result = await client.query(
      `
        DELETE FROM finance.period_lock
        WHERE id = $1
          AND homebase_id = $2
        RETURNING id
      `,
      [lockId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Kunci periode tidak ditemukan" });
    }

    res.json({
      status: "success",
      message:
        "Kunci periode berhasil dibuka. Data bulan ini dapat dikoreksi kembali.",
    });
  }),
);

export default router;
