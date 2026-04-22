import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  MONTH_NAMES,
  parseOptionalInt,
  parseMonthArray,
  formatBillingPeriod,
  resolveScopedHomebaseId,
  ensureGradeAndPeriode,
  ensureStudentScope,
  ensureFinalFinanceTables,
  getParentPayerUserId,
  getPaymentMethodId,
  getOrCreateInvoice,
  createManualPayment,
  upsertInvoiceStatus,
} from "./financeHelpers.js";

const router = Router();

const getTransactionStudentContext = async (
  db,
  homebaseId,
  periodeId,
  studentId,
) => {
  if (!homebaseId || !periodeId || !studentId) {
    return null;
  }

  const result = await db.query(
    `
      SELECT
        s.user_id AS student_id,
        e.homebase_id,
        hb.name AS homebase_name,
        e.periode_id,
        per.name AS periode_name,
        per.is_active AS periode_is_active,
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
      JOIN a_homebase hb ON hb.id = e.homebase_id
      JOIN a_periode per ON per.id = e.periode_id
      WHERE e.homebase_id = $1
        AND e.periode_id = $2
        AND e.student_id = $3
      ORDER BY e.enrolled_at DESC, e.id DESC
      LIMIT 1
    `,
    [homebaseId, periodeId, studentId],
  );

  return result.rows[0] || null;
};

const normalizeBoolean = (value) =>
  value === true || value === "true" || value === 1;

const getPaymentSourceLabel = (paymentSource) => {
  if (paymentSource === "admin_manual") {
    return "Input Admin";
  }

  if (paymentSource === "parent_manual") {
    return "Transfer Bank";
  }

  if (paymentSource === "midtrans") {
    return "Midtrans";
  }

  return "Lainnya";
};

const getPaymentStatusLabel = (status) => {
  if (status === "pending") {
    return "Menunggu Konfirmasi";
  }

  if (status === "paid") {
    return "Lunas";
  }

  if (status === "failed") {
    return "Ditolak";
  }

  if (status === "cancelled") {
    return "Dibatalkan";
  }

  if (status === "expired") {
    return "Kedaluwarsa";
  }

  if (status === "refunded") {
    return "Refund";
  }

  return status || "-";
};

const buildTransactionAllocations = async ({
  client,
  homebaseId,
  periodeId,
  studentId,
  gradeId,
  userId,
  billMonths,
  otherPayments,
  excludePaymentId = null,
}) => {
  const allocations = [];

  if (billMonths.length > 0) {
    const rule = await getSppRule(client, homebaseId, periodeId, gradeId);
    if (!rule) {
      throw new Error("Tarif SPP aktif belum tersedia untuk periode dan tingkat ini");
    }

    for (const month of billMonths) {
      const item = await getOrCreateSppItem({
        client,
        homebaseId,
        periodeId,
        studentId,
        billMonth: month,
        rule,
        createdBy: userId,
      });

      const paymentScope = excludePaymentId
        ? await client.query(
            `
              SELECT
                ii.invoice_id,
                ii.amount,
                COALESCE(SUM(CASE WHEN p.status = 'paid' AND p.id <> $2 THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
              FROM finance.invoice_item ii
              LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
              LEFT JOIN finance.payment p ON p.id = pa.payment_id
              WHERE ii.id = $1
              GROUP BY ii.id
              LIMIT 1
            `,
            [item.id, excludePaymentId],
          )
        : {
            rows: [
              {
                invoice_id: item.invoice_id,
                amount: item.amount,
                paid_amount: item.paid_amount,
              },
            ],
          };

      const scopedItem = paymentScope.rows[0];
      const outstanding =
        Number(scopedItem?.amount || 0) - Number(scopedItem?.paid_amount || 0);

      if (outstanding <= 0) {
        throw new Error(
          `SPP untuk bulan ${formatBillingPeriod(month)} sudah tercatat lunas`,
        );
      }

      allocations.push({
        invoice_item_id: item.id,
        invoice_id: scopedItem?.invoice_id || item.invoice_id,
        allocated_amount: outstanding,
      });
    }
  }

  for (const item of otherPayments) {
    let charge = null;

    if (item.charge_id) {
      const chargeResult = await client.query(
        `
          SELECT
            ii.id,
            ii.invoice_id,
            ii.amount,
            inv.student_id,
            inv.periode_id,
            COALESCE(SUM(CASE WHEN p.status = 'paid' AND ($3::bigint IS NULL OR p.id <> $3) THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
          FROM finance.invoice_item ii
          JOIN finance.invoice inv ON inv.id = ii.invoice_id
          LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
          LEFT JOIN finance.payment p ON p.id = pa.payment_id
          WHERE ii.id = $1
            AND inv.homebase_id = $2
          GROUP BY ii.id, inv.id
          LIMIT 1
        `,
        [item.charge_id, homebaseId, excludePaymentId],
      );

      if (chargeResult.rowCount === 0) {
        throw new Error(
          `Tagihan pembayaran lainnya #${item.charge_id} tidak ditemukan`,
        );
      }

      charge = chargeResult.rows[0];
    } else if (item.type_id) {
      const rule = await getOtherRule(
        client,
        homebaseId,
        periodeId,
        gradeId,
        item.type_id,
      );

      if (!rule) {
        throw new Error("Jenis pembayaran lainnya belum memiliki tarif aktif");
      }

      charge = await getOrCreateOtherItem({
        client,
        homebaseId,
        periodeId,
        studentId,
        componentId: item.type_id,
        rule,
        createdBy: userId,
      });

      charge = {
        ...charge,
        student_id: studentId,
        periode_id: periodeId,
      };
    } else {
      throw new Error("Pembayaran lainnya tidak valid");
    }

    const remaining =
      Number(charge.amount || 0) - Number(charge.paid_amount || 0);

    if (
      Number(charge.student_id) !== Number(studentId) ||
      (charge.periode_id !== null &&
        Number(charge.periode_id) !== Number(periodeId))
    ) {
      throw new Error(
        "Tagihan pembayaran lainnya harus sesuai dengan siswa dan periode yang dipilih",
      );
    }

    if (item.amount_paid <= 0 || item.amount_paid > remaining) {
      throw new Error(
        item.charge_id
          ? `Nominal pembayaran untuk tagihan #${item.charge_id} tidak valid`
          : "Nominal pembayaran lainnya tidak valid",
      );
    }

    allocations.push({
      invoice_item_id: charge.id,
      invoice_id: charge.invoice_id,
      allocated_amount: item.amount_paid,
    });
  }

  return allocations;
};

const getSppRule = async (db, homebaseId, periodeId, gradeId) => {
  const result = await db.query(
    `
      SELECT
        fr.id,
        fr.amount,
        fc.id AS component_id
      FROM finance.fee_rule fr
      JOIN finance.fee_component fc ON fc.id = fr.component_id
      WHERE fr.homebase_id = $1
        AND fr.grade_id = $3
        AND fr.is_active = true
        AND fc.category = 'spp'
        AND (fr.periode_id = $2 OR fr.periode_id IS NULL)
      ORDER BY CASE WHEN fr.periode_id = $2 THEN 0 ELSE 1 END, fr.id DESC
      LIMIT 1
    `,
    [homebaseId, periodeId, gradeId],
  );

  return result.rows[0] || null;
};

const getOtherRule = async (db, homebaseId, periodeId, gradeId, componentId) => {
  const result = await db.query(
    `
      SELECT
        fr.id,
        fr.amount,
        fc.id AS component_id,
        fc.name AS component_name
      FROM finance.fee_rule fr
      JOIN finance.fee_component fc ON fc.id = fr.component_id
      WHERE fr.homebase_id = $1
        AND fr.grade_id = $3
        AND fr.component_id = $4
        AND fr.is_active = true
        AND fc.category = 'other'
        AND fc.is_active = true
        AND (fr.periode_id = $2 OR fr.periode_id IS NULL)
      ORDER BY CASE WHEN fr.periode_id = $2 THEN 0 ELSE 1 END, fr.id DESC
      LIMIT 1
    `,
    [homebaseId, periodeId, gradeId, componentId],
  );

  return result.rows[0] || null;
};

const getOrCreateOtherItem = async ({
  client,
  homebaseId,
  periodeId,
  studentId,
  componentId,
  rule,
  createdBy,
}) => {
  const invoice = await getOrCreateInvoice(client, {
    homebaseId,
    studentId,
    periodeId,
    sourceType: "other",
    createdBy,
    notes: "Invoice pembayaran lainnya",
  });

  const existing = await client.query(
    `
      SELECT
        ii.id,
        ii.invoice_id,
        ii.amount,
        COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
      FROM finance.invoice_item ii
      LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
      LEFT JOIN finance.payment p ON p.id = pa.payment_id
      WHERE ii.invoice_id = $1
        AND ii.item_type = 'other'
        AND ii.component_id = $2
      GROUP BY ii.id
      LIMIT 1
    `,
    [invoice.id, componentId],
  );

  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  const created = await client.query(
    `
      INSERT INTO finance.invoice_item (
        invoice_id,
        component_id,
        fee_rule_id,
        description,
        qty,
        unit_amount,
        item_type,
        reference_type
      )
      VALUES ($1, $2, $3, $4, 1, $5, 'other', 'manual_charge')
      RETURNING id, invoice_id, amount, 0::numeric AS paid_amount
    `,
    [
      invoice.id,
      componentId,
      rule.id,
      rule.component_name,
      Number(rule.amount || 0),
    ],
  );

  return created.rows[0];
};

const getOrCreateSppItem = async ({
  client,
  homebaseId,
  periodeId,
  studentId,
  billMonth,
  rule,
  createdBy,
}) => {
  const invoice = await getOrCreateInvoice(client, {
    homebaseId,
    studentId,
    periodeId,
    sourceType: "spp",
    createdBy,
    notes: "Invoice SPP",
  });

  const existing = await client.query(
    `
      SELECT
        ii.id,
        ii.invoice_id,
        ii.amount,
        COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
      FROM finance.invoice_item ii
      LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
      LEFT JOIN finance.payment p ON p.id = pa.payment_id
      WHERE ii.invoice_id = $1
        AND ii.item_type = 'spp'
        AND ii.fee_rule_id = $2
        AND ii.bill_month = $3
      GROUP BY ii.id
      LIMIT 1
    `,
    [invoice.id, rule.id, billMonth],
  );

  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  const created = await client.query(
    `
      INSERT INTO finance.invoice_item (
        invoice_id,
        component_id,
        fee_rule_id,
        bill_year,
        bill_month,
        description,
        qty,
        unit_amount,
        item_type,
        reference_type
      )
      VALUES ($1, $2, $3, EXTRACT(YEAR FROM CURRENT_DATE)::smallint, $4, $5, 1, $6, 'spp', 'monthly_rule')
      RETURNING id, invoice_id, amount, 0::numeric AS paid_amount
    `,
    [
      invoice.id,
      rule.component_id,
      rule.id,
      billMonth,
      `SPP ${formatBillingPeriod(billMonth)}`,
      Number(rule.amount || 0),
    ],
  );

  return created.rows[0];
};

router.get(
  "/transactions/options",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const requestedPeriodeId = parseOptionalInt(req.query.periode_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const search = (req.query.search || "").trim();

    if (!homebaseId) {
      return res
        .status(400)
        .json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    const [homebaseResult, periodeResult] = await Promise.all([
      req.user.homebase_id
        ? db.query(`SELECT id, name FROM a_homebase WHERE id = $1`, [homebaseId])
        : db.query(`SELECT id, name FROM a_homebase ORDER BY name ASC`),
      db.query(
        `
          SELECT id, name, is_active
          FROM a_periode
          WHERE homebase_id = $1
          ORDER BY is_active DESC, created_at DESC
        `,
        [homebaseId],
      ),
    ]);

    const effectivePeriodeId =
      requestedPeriodeId ||
      Number(
        periodeResult.rows.find((item) => item.is_active)?.id ||
          periodeResult.rows[0]?.id ||
          0,
      ) ||
      null;

    const studentParams = [homebaseId];
    let studentWhereClause = `WHERE e.homebase_id = $1`;

    if (effectivePeriodeId) {
      studentParams.push(effectivePeriodeId);
      studentWhereClause += ` AND e.periode_id = $${studentParams.length}`;
    }

    if (studentId) {
      studentParams.push(studentId);
      studentWhereClause += ` AND s.user_id = $${studentParams.length}`;
    }

    if (search) {
      studentParams.push(`%${search}%`);
      studentWhereClause += ` AND (u.full_name ILIKE $${studentParams.length} OR COALESCE(s.nis, '') ILIKE $${studentParams.length})`;
    }

    const shouldLoadStudents = Boolean(studentId || search);
    const studentResult = shouldLoadStudents
      ? await db.query(
          `
            SELECT
              s.user_id AS id,
              e.homebase_id,
              hb.name AS homebase_name,
              e.periode_id,
              per.name AS periode_name,
              per.is_active AS periode_is_active,
              u.full_name,
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
            JOIN a_homebase hb ON hb.id = e.homebase_id
            JOIN a_periode per ON per.id = e.periode_id
            ${studentWhereClause}
            ORDER BY g.name ASC, c.name ASC, u.full_name ASC
            LIMIT 20
          `,
          studentParams,
        )
      : { rows: [] };

    let studentContext = null;
    let monthlyContext = { tariff_amount: 0, unpaid_months: [] };
    let otherCharges = [];

    if (effectivePeriodeId && studentId) {
      const scopedStudent = await getTransactionStudentContext(
        db,
        homebaseId,
        effectivePeriodeId,
        studentId,
      );

      if (scopedStudent) {
        studentContext = scopedStudent;

        const [monthlyRuleResult, paidMonthResult, otherChargeResult] = await Promise.all([
          db.query(
            `
              SELECT
                fr.id AS tariff_id,
                COALESCE(fr.amount, 0) AS amount
              FROM finance.fee_rule fr
              JOIN finance.fee_component fc
                ON fc.id = fr.component_id
               AND fc.category = 'spp'
               AND fc.is_active = true
              WHERE fr.homebase_id = $1
                AND fr.grade_id = $2
                AND fr.is_active = true
                AND (fr.periode_id = $3 OR fr.periode_id IS NULL)
              ORDER BY CASE WHEN fr.periode_id = $3 THEN 0 ELSE 1 END, fr.id DESC
              LIMIT 1
            `,
            [homebaseId, scopedStudent.grade_id, effectivePeriodeId],
          ),
          db.query(
            `
              WITH item_scope AS (
                SELECT
                  ii.id AS invoice_item_id,
                  ii.bill_month,
                  ii.amount,
                  COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
                FROM finance.invoice inv
                JOIN finance.invoice_item ii ON ii.invoice_id = inv.id
                LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
                LEFT JOIN finance.payment p ON p.id = pa.payment_id
                WHERE inv.homebase_id = $1
                  AND inv.student_id = $2
                  AND ii.item_type = 'spp'
                  AND (inv.periode_id = $3 OR inv.periode_id IS NULL)
                GROUP BY ii.id
              )
              SELECT ARRAY_REMOVE(
                ARRAY_AGG(DISTINCT item.bill_month ORDER BY item.bill_month)
                  FILTER (
                    WHERE COALESCE(item.paid_amount, 0) >= item.amount
                      AND item.bill_month IS NOT NULL
                  ),
                NULL
              ) AS paid_months
              FROM item_scope item
            `,
            [homebaseId, studentId, effectivePeriodeId],
          ),
          db.query(
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
                WHERE e.homebase_id = $1
                  AND e.periode_id = $2
                  AND e.student_id = $3
              ),
              type_scope AS (
                SELECT DISTINCT ON (fc.id)
                  fc.id AS type_id,
                  fc.name AS type_name,
                  fr.amount,
                  fr.id AS fee_rule_id
                FROM finance.fee_component fc
                JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
                WHERE fc.homebase_id = $1
                  AND fc.category = 'other'
                  AND fc.is_active = true
                  AND fr.grade_id = $4
                  AND (fr.periode_id = $2 OR fr.periode_id IS NULL)
                ORDER BY
                  fc.id,
                  CASE WHEN fr.periode_id = $2 THEN 0 ELSE 1 END,
                  fr.id DESC
              ),
              item_scope AS (
                SELECT
                  inv.student_id,
                  inv.periode_id,
                  ii.id AS charge_id,
                  ii.invoice_id,
                  ii.component_id,
                  ii.amount AS amount_due,
                  ii.description,
                  COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
                FROM finance.invoice inv
                JOIN finance.invoice_item ii ON ii.invoice_id = inv.id AND ii.item_type = 'other'
                LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
                LEFT JOIN finance.payment p ON p.id = pa.payment_id
                WHERE inv.homebase_id = $1
                  AND inv.student_id = $3
                  AND (inv.periode_id = $2 OR inv.periode_id IS NULL)
                GROUP BY inv.student_id, inv.periode_id, ii.id
              )
              SELECT
                item.charge_id,
                $1::int AS homebase_id,
                es.periode_id,
                ts.type_id,
                es.student_id,
                COALESCE(item.amount_due, ts.amount) AS amount_due,
                COALESCE(item.description, ts.type_name) AS description,
                ts.type_name,
                es.student_name,
                es.nis,
                es.class_id,
                es.class_name,
                es.grade_id,
                es.grade_name,
                COALESCE(item.paid_amount, 0) AS paid_amount
              FROM enrollment_scope es
              JOIN type_scope ts ON true
              LEFT JOIN item_scope item
                ON item.student_id = es.student_id
                AND (item.periode_id = es.periode_id OR item.periode_id IS NULL)
                AND item.component_id = ts.type_id
              ORDER BY ts.type_name ASC
            `,
            [homebaseId, effectivePeriodeId, studentId, scopedStudent.grade_id],
          ),
        ]);

        const monthlyRow = monthlyRuleResult.rows[0] || null;
        const paidMonths = new Set(
          (paidMonthResult.rows[0]?.paid_months || [])
            .map((item) => Number(item))
            .filter((item) => item >= 1 && item <= 12),
        );

        monthlyContext = {
          tariff_amount: Number(monthlyRow?.amount || 0),
          unpaid_months:
            Number(monthlyRow?.amount || 0) > 0
              ? MONTH_NAMES.map((label, index) => ({
                  value: index + 1,
                  label,
                })).filter((item) => !paidMonths.has(item.value))
              : [],
        };

        otherCharges = otherChargeResult.rows
          .map((item) => {
            const amountDue = Number(item.amount_due || 0);
            const paidAmount = Number(item.paid_amount || 0);
            return {
              charge_id: item.charge_id,
              type_id: item.type_id,
              type_name: item.type_name,
              fee_rule_id: item.fee_rule_id,
              amount_due: amountDue,
              paid_amount: paidAmount,
              remaining_amount: Math.max(amountDue - paidAmount, 0),
              description: item.description,
              is_existing_charge: Boolean(item.charge_id),
              status: paidAmount >= amountDue ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
            };
          })
          .filter((item) => item.remaining_amount > 0);
      }
    }

    res.json({
      status: "success",
      data: {
        homebases: homebaseResult.rows,
        selected_homebase_id: homebaseId,
        selected_periode_id: effectivePeriodeId,
        periodes: periodeResult.rows.map((item) => ({
          ...item,
          is_default: item.is_active,
        })),
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
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.query.periode_id);
    const page = Math.max(parseOptionalInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseOptionalInt(req.query.limit) || 10, 1), 100);
    const categoryFilter = (req.query.category || "").trim().toLowerCase();
    const statusFilter = (req.query.status || "").trim().toLowerCase();
    const paymentSourceFilter = (req.query.payment_source || "").trim().toLowerCase();
    const search = (req.query.search || "").trim();

    if (!homebaseId) {
      return res
        .status(400)
        .json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    const params = [homebaseId];
    let whereClause = `WHERE p.homebase_id = $1`;

    if (periodeId) {
      params.push(periodeId);
      whereClause += ` AND inv.periode_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (u.full_name ILIKE $${params.length} OR COALESCE(s.nis, '') ILIKE $${params.length})`;
    }

    if (
      statusFilter &&
      ["pending", "paid", "failed", "expired", "cancelled", "refunded"].includes(
        statusFilter,
      )
    ) {
      params.push(statusFilter);
      whereClause += ` AND p.status = $${params.length}`;
    }

    if (
      paymentSourceFilter &&
      ["admin_manual", "parent_manual", "midtrans"].includes(paymentSourceFilter)
    ) {
      params.push(paymentSourceFilter);
      whereClause += ` AND p.payment_source = $${params.length}`;
    }

    const result = await db.query(
      `
        SELECT
          p.id,
          p.homebase_id,
          hb.name AS homebase_name,
          p.student_id,
          inv.periode_id,
          enr.class_id,
          enr.grade_id,
          p.amount,
          p.notes,
          p.status,
          p.payment_source,
          p.reference_no,
          p.proof_url,
          p.verified_at,
          p.payment_date AS paid_at,
          pm.name AS payment_method_name,
          pm.method_type,
          ba.bank_name,
          ba.account_name,
          ba.account_number,
          u.full_name AS student_name,
          s.nis,
          enr.class_name,
          enr.grade_name,
          per.name AS periode_name,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT ii.id ORDER BY ii.id), NULL) AS invoice_item_ids,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT ii.component_id ORDER BY ii.component_id), NULL) AS component_ids,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT ii.bill_month ORDER BY ii.bill_month), NULL) AS bill_months,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT fc.name ORDER BY fc.name), NULL) AS item_names,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT ii.item_type ORDER BY ii.item_type), NULL) AS item_types,
          COALESCE(
            JSONB_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'charge_id', ii.id,
                'type_id', ii.component_id,
                'type_name', fc.name,
                'item_type', ii.item_type,
                'bill_month', ii.bill_month,
                'amount_due', ii.amount,
                'amount_paid', pa.allocated_amount
              )
            ) FILTER (WHERE ii.id IS NOT NULL),
            '[]'::jsonb
          ) AS payment_items
        FROM finance.payment p
        JOIN a_homebase hb ON hb.id = p.homebase_id
        JOIN u_students s ON s.user_id = p.student_id
        JOIN u_users u ON u.id = s.user_id
        LEFT JOIN finance.payment_method pm ON pm.id = p.method_id
        LEFT JOIN finance.bank_account ba ON ba.id = p.bank_account_id
        LEFT JOIN finance.payment_allocation pa ON pa.payment_id = p.id
        LEFT JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        LEFT JOIN finance.invoice inv ON inv.id = ii.invoice_id
        LEFT JOIN a_periode per ON per.id = inv.periode_id
        LEFT JOIN finance.fee_component fc ON fc.id = ii.component_id
        LEFT JOIN LATERAL (
          SELECT
            e.class_id,
            c.name AS class_name,
            g.id AS grade_id,
            g.name AS grade_name
          FROM u_class_enrollments e
          JOIN a_class c ON c.id = e.class_id
          JOIN a_grade g ON g.id = c.grade_id
          WHERE e.student_id = p.student_id
            AND e.homebase_id = p.homebase_id
            AND (
              inv.periode_id IS NULL
              OR e.periode_id = inv.periode_id
            )
          ORDER BY e.enrolled_at DESC, e.id DESC
          LIMIT 1
        ) AS enr ON true
        ${whereClause}
        GROUP BY
          p.id,
          hb.name,
          u.full_name,
          s.nis,
          enr.class_id,
          enr.class_name,
          enr.grade_id,
          enr.grade_name,
          per.name,
          inv.periode_id,
          pm.name,
          pm.method_type,
          ba.bank_name,
          ba.account_name,
          ba.account_number
        ORDER BY p.payment_date DESC, p.id DESC
      `,
      params,
    );

    let data = result.rows.map((item) => {
      const itemTypes = item.item_types || [];
      const itemNames = item.item_names || [];
      const billMonths = (item.bill_months || []).sort((a, b) => a - b);
      let category = "mixed";
      if (itemTypes.length === 1 && itemTypes[0] === "spp") {
        category = "spp";
      } else if (itemTypes.length === 1 && itemTypes[0] === "other") {
        category = "other";
      }

      const description =
        category === "spp"
          ? `SPP ${billMonths.map((month) => formatBillingPeriod(month)).join(", ")}`
          : category === "other"
            ? itemNames.join(", ")
            : `SPP ${billMonths.map((month) => formatBillingPeriod(month)).join(", ")} + ${itemNames.join(", ")}`;

      return {
        id: item.id,
        category,
        student_id: item.student_id,
        student_name: item.student_name,
        nis: item.nis,
        homebase_id: item.homebase_id,
        homebase_name: item.homebase_name,
        periode_id: item.periode_id,
        periode_name: item.periode_name,
        class_id: item.class_id,
        class_name: item.class_name,
        grade_id: item.grade_id,
        grade_name: item.grade_name,
        amount: Number(item.amount || 0),
        notes: item.notes,
        status: item.status,
        status_label: getPaymentStatusLabel(item.status),
        payment_source: item.payment_source,
        payment_source_label: getPaymentSourceLabel(item.payment_source),
        paid_at: item.paid_at,
        verified_at: item.verified_at,
        reference_no: item.reference_no || null,
        proof_url: item.proof_url || null,
        payment_method_name: item.payment_method_name || null,
        method_type: item.method_type || null,
        bank_name: item.bank_name || null,
        account_name: item.account_name || null,
        account_number: item.account_number || null,
        charge_id:
          category === "other" ? Number(item.invoice_item_ids?.[0] || 0) || null : null,
        type_id:
          category === "other" ? Number(item.component_ids?.[0] || 0) || null : null,
        description,
        bill_months: billMonths,
        item_names: itemNames,
        payment_items: Array.isArray(item.payment_items)
          ? item.payment_items.map((paymentItem) => ({
              charge_id: Number(paymentItem?.charge_id || 0) || null,
              type_id: Number(paymentItem?.type_id || 0) || null,
              type_name: paymentItem?.type_name || null,
              item_type: paymentItem?.item_type || null,
              bill_month: Number(paymentItem?.bill_month || 0) || null,
              amount_due: Number(paymentItem?.amount_due || 0),
              amount_paid: Number(paymentItem?.amount_paid || 0),
            }))
          : [],
        can_manage: item.payment_source === "admin_manual" && item.status === "paid",
        can_confirm: item.payment_source === "parent_manual" && item.status === "pending",
      };
    });

    if (categoryFilter && ["spp", "other", "mixed"].includes(categoryFilter)) {
      data = data.filter((item) => item.category === categoryFilter);
    }

    const totalRecords = data.length;
    const paginated = data.slice((page - 1) * limit, page * limit);

    res.json({
      status: "success",
      data: paginated,
      summary: {
        page,
        limit,
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limit),
      },
    });
  }),
);

router.post(
  "/transactions",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const { id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const paymentDate = new Date().toISOString();
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
              (item.charge_id || item.type_id) &&
              !Number.isNaN(item.amount_paid),
          )
      : [];

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    if (!periodeId || !studentId) {
      return res.status(400).json({ message: "Periode dan siswa wajib diisi" });
    }

    if (billMonths.length === 0 && otherPayments.length === 0) {
      return res.status(400).json({
        message: "Pilih minimal satu pembayaran SPP atau pembayaran lainnya",
      });
    }

    const studentContext = await getTransactionStudentContext(
      client,
      homebaseId,
      periodeId,
      studentId,
    );
    if (!studentContext) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan pada kombinasi satuan dan periode tersebut",
      });
    }

    const derivedGradeId = Number(studentContext.grade_id);
    const scopeCheck = await ensureGradeAndPeriode(
      client,
      homebaseId,
      periodeId,
      derivedGradeId,
    );
    if (scopeCheck.error) {
      return res.status(404).json({ message: scopeCheck.error });
    }

    const studentCheck = await ensureStudentScope(client, homebaseId, studentId, periodeId, derivedGradeId);
    if (studentCheck.error) {
      return res.status(404).json({ message: studentCheck.error });
    }

    let allocations = [];
    try {
      allocations = await buildTransactionAllocations({
        client,
        homebaseId,
        periodeId,
        studentId,
        gradeId: derivedGradeId,
        userId,
        billMonths,
        otherPayments,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const payerUserId = await getParentPayerUserId(client, studentId, userId);
    const paymentId = await createManualPayment(client, {
      homebaseId,
      studentId,
      payerUserId,
      methodType: "manual_cash",
      methodName: "Cash",
      bankAccountId: null,
      paymentChannel: "Cash",
      amount: allocations.reduce((sum, item) => sum + item.allocated_amount, 0),
      paymentDate,
      notes: null,
      createdBy: userId,
      verifiedBy: userId,
      allocations,
    });

    res.status(201).json({
      status: "success",
      message: "Transaksi pembayaran berhasil disimpan",
      data: { id: paymentId },
    });
  }),
);

router.put(
  "/transactions/confirmations/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const paymentId = parseOptionalInt(req.params.id);
    const action = String(req.body.action || "").trim().toLowerCase();
    const notes = String(req.body.notes || "").trim() || null;

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    if (!paymentId || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Permintaan konfirmasi pembayaran tidak valid" });
    }

    const paymentResult = await client.query(
      `
        SELECT
          p.id,
          p.status,
          p.payment_source,
          p.notes
        FROM finance.payment p
        WHERE p.id = $1
          AND p.homebase_id = $2
        LIMIT 1
      `,
      [paymentId, homebaseId],
    );

    if (paymentResult.rowCount === 0) {
      return res.status(404).json({ message: "Pembayaran tidak ditemukan" });
    }

    const payment = paymentResult.rows[0];

    if (payment.payment_source !== "parent_manual") {
      return res.status(400).json({
        message: "Hanya pembayaran transfer manual dari orang tua yang dapat dikonfirmasi dari tab ini",
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        message: "Pembayaran ini sudah diproses dan tidak bisa dikonfirmasi ulang",
      });
    }

    const allocationResult = await client.query(
      `
        SELECT
          pa.invoice_item_id,
          pa.allocated_amount,
          ii.invoice_id,
          ii.amount,
          COALESCE(
            SUM(
              CASE
                WHEN p2.status = 'paid' AND p2.id <> $1 THEN pa2.allocated_amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount_excluding_current
        FROM finance.payment_allocation pa
        JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        LEFT JOIN finance.payment_allocation pa2 ON pa2.invoice_item_id = pa.invoice_item_id
        LEFT JOIN finance.payment p2 ON p2.id = pa2.payment_id
        WHERE pa.payment_id = $1
        GROUP BY pa.invoice_item_id, pa.allocated_amount, ii.invoice_id, ii.amount
      `,
      [paymentId],
    );

    if (action === "approve") {
      for (const item of allocationResult.rows) {
        const remainingAmount =
          Number(item.amount || 0) - Number(item.paid_amount_excluding_current || 0);

        if (Number(item.allocated_amount || 0) > remainingAmount) {
          return res.status(400).json({
            message:
              "Salah satu tagihan sudah berubah atau telah dilunasi oleh pembayaran lain. Muat ulang daftar konfirmasi terlebih dahulu",
          });
        }
      }
    }

    await client.query(
      `
        UPDATE finance.payment
        SET
          status = $1,
          notes = COALESCE($2, notes),
          verified_by = CASE WHEN $1 = 'paid' THEN $3 ELSE verified_by END,
          verified_at = CASE WHEN $1 = 'paid' THEN CURRENT_TIMESTAMP ELSE verified_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `,
      [action === "approve" ? "paid" : "failed", notes, req.user.id, paymentId],
    );

    const invoiceIds = [
      ...new Set(
        allocationResult.rows.map((item) => Number(item.invoice_id || 0)).filter(Boolean),
      ),
    ];

    for (const invoiceId of invoiceIds) {
      await upsertInvoiceStatus(client, invoiceId);
    }

    res.json({
      status: "success",
      message:
        action === "approve"
          ? "Pembayaran berhasil dikonfirmasi"
          : "Pembayaran berhasil ditolak",
    });
  }),
);

router.put(
  "/transactions/:category/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const { id: userId } = req.user;
    const transactionId = parseOptionalInt(req.params.id);
    const periodeId = parseOptionalInt(req.body.periode_id);
    const studentId = parseOptionalInt(req.body.student_id);
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
              (item.charge_id || item.type_id) &&
              !Number.isNaN(item.amount_paid),
          )
      : [];

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    if (!transactionId || !periodeId || !studentId) {
      return res.status(400).json({ message: "Id transaksi, periode, dan siswa wajib diisi" });
    }

    if (billMonths.length === 0 && otherPayments.length === 0) {
      return res.status(400).json({
        message: "Pilih minimal satu pembayaran SPP atau pembayaran lainnya",
      });
    }

    const existing = await client.query(
      `
        SELECT p.id, p.student_id, p.payment_date, p.notes
        FROM finance.payment p
        WHERE p.id = $1 AND p.homebase_id = $2
      `,
      [transactionId, homebaseId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    const studentContext = await getTransactionStudentContext(
      client,
      homebaseId,
      periodeId,
      studentId,
    );
    if (!studentContext) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan pada kombinasi satuan dan periode tersebut",
      });
    }

    const derivedGradeId = Number(studentContext.grade_id);
    const scopeCheck = await ensureGradeAndPeriode(
      client,
      homebaseId,
      periodeId,
      derivedGradeId,
    );
    if (scopeCheck.error) {
      return res.status(404).json({ message: scopeCheck.error });
    }

    const studentCheck = await ensureStudentScope(
      client,
      homebaseId,
      studentId,
      periodeId,
      derivedGradeId,
    );
    if (studentCheck.error) {
      return res.status(404).json({ message: studentCheck.error });
    }

    let allocations = [];
    try {
      allocations = await buildTransactionAllocations({
        client,
        homebaseId,
        periodeId,
        studentId,
        gradeId: derivedGradeId,
        userId,
        billMonths,
        otherPayments,
        excludePaymentId: transactionId,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const previousAllocationScope = await client.query(
      `
        SELECT DISTINCT ii.invoice_id
        FROM finance.payment_allocation
        JOIN finance.invoice_item ii ON ii.id = finance.payment_allocation.invoice_item_id
        WHERE payment_id = $1
      `,
      [transactionId],
    );
    const previousInvoiceIds = previousAllocationScope.rows
      .map((item) => item.invoice_id)
      .filter(Boolean);

    await client.query(`DELETE FROM finance.payment_allocation WHERE payment_id = $1`, [
      transactionId,
    ]);

    for (const allocation of allocations) {
      await client.query(
        `
          INSERT INTO finance.payment_allocation (
            payment_id,
            invoice_item_id,
            allocated_amount
          )
          VALUES ($1, $2, $3)
        `,
        [transactionId, allocation.invoice_item_id, allocation.allocated_amount],
      );
    }

    const methodId = await getPaymentMethodId(client, {
      homebaseId,
      methodType: "manual_cash",
      name: "Cash",
    });

    await client.query(
      `
        UPDATE finance.payment
        SET
          student_id = $1,
          homebase_id = $2,
          payer_user_id = $3,
          method_id = $4,
          bank_account_id = NULL,
          payment_channel = 'Cash',
          payment_date = $5,
          amount = $6,
          notes = $7,
          verified_by = $8,
          verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
      `,
      [
        studentId,
        homebaseId,
        await getParentPayerUserId(client, studentId, userId),
        methodId,
        existing.rows[0].payment_date,
        allocations.reduce((sum, item) => sum + item.allocated_amount, 0),
        existing.rows[0].notes,
        userId,
        transactionId,
      ],
    );

    const nextInvoiceIds = allocations
      .map((item) => item.invoice_id)
      .filter(Boolean);
    const affectedInvoiceIds = [...new Set([...previousInvoiceIds, ...nextInvoiceIds])];
    for (const invoiceId of affectedInvoiceIds) {
      await upsertInvoiceStatus(client, invoiceId);
    }

    res.json({
      status: "success",
      message: "Transaksi pembayaran berhasil diperbarui",
    });
  }),
);

router.delete(
  "/transactions/:category/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const transactionId = parseOptionalInt(req.params.id);

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    if (!transactionId) {
      return res.status(400).json({ message: "Id transaksi tidak valid" });
    }

    const invoiceResult = await client.query(
      `
        SELECT DISTINCT ii.invoice_id
        FROM finance.payment_allocation pa
        JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        JOIN finance.payment p ON p.id = pa.payment_id
        WHERE pa.payment_id = $1
          AND p.homebase_id = $2
      `,
      [transactionId, homebaseId],
    );

    const result = await client.query(
      `DELETE FROM finance.payment WHERE id = $1 AND homebase_id = $2`,
      [transactionId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    for (const item of invoiceResult.rows) {
      if (item.invoice_id) {
        await upsertInvoiceStatus(client, item.invoice_id);
      }
    }

    res.json({
      status: "success",
      message: "Transaksi pembayaran berhasil dihapus",
    });
  }),
);

export default router;
