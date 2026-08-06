import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js";
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

const numberValue = (value) => Number(value || 0);

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
          fee_income_total: sppCollected + otherCollected,
          fee_target_total: sppTarget + otherTarget,
          fee_remaining_total: sppRemaining + otherRemaining,
          unpaid_student_rows: unpaid_students.length,
          unpaid_student_count: new Set(
            unpaid_students.map((item) => item.student_id),
          ).size,
        },
        spp_by_class,
        other_by_type,
        unpaid_students,
      },
    });
  }),
);

export default router;
