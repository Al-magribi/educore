import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { authorize } from "../../middleware/authorize.js";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import {
  MONTH_NAMES,
  ensureFinalFinanceTables,
  formatBillingPeriod,
  getLinkedParentStudents,
  getOrCreateInvoice,
  getParentPayerUserId,
  getPaymentMethodId,
  parseOptionalInt,
  upsertInvoiceStatus,
} from "./financeHelpers.js";

const router = Router();
const financeAssetDir = path.join("server", "assets", "finance");

fs.mkdirSync(financeAssetDir, { recursive: true });

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, financeAssetDir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${path.parse(file.originalname).name}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

const uploadPaymentProof = multer({ storage: proofStorage });

const toCurrencyNumber = (value) => Number(value || 0);

const formatStatus = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid") {
    return "paid";
  }

  if (normalized === "partial") {
    return "partial";
  }

  return "unpaid";
};

const resolveMidtransBaseUrls = (isProduction) => ({
  snap:
    isProduction === true
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions",
  api:
    isProduction === true
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2",
});

const getHomebasePeriodes = async (db, homebaseId) => {
  const result = await db.query(
    `
      SELECT
        per.id,
        per.name,
        per.is_active,
        per.created_at
      FROM public.a_periode per
      WHERE per.homebase_id = $1
      ORDER BY per.is_active DESC, per.created_at DESC, per.id DESC
    `,
    [homebaseId],
  );

  const periodes = result.rows.sort((left, right) => {
    if (left.is_active && !right.is_active) {
      return -1;
    }

    if (!left.is_active && right.is_active) {
      return 1;
    }

    return new Date(right.created_at) - new Date(left.created_at);
  });

  return periodes;
};

const getEnrollmentContext = async (db, homebaseId, periodeId, studentId) => {
  if (!homebaseId || !periodeId || !studentId) {
    return null;
  }

  const result = await db.query(
    `
      SELECT
        s.user_id AS student_id,
        s.nis,
        u.full_name AS student_name,
        e.homebase_id,
        hb.name AS homebase_name,
        e.periode_id,
        per.name AS periode_name,
        per.is_active AS periode_is_active,
        c.id AS class_id,
        c.name AS class_name,
        g.id AS grade_id,
        g.name AS grade_name
      FROM public.u_class_enrollments e
      JOIN public.u_students s ON s.user_id = e.student_id
      JOIN public.u_users u ON u.id = s.user_id
      JOIN public.a_class c ON c.id = e.class_id
      JOIN public.a_grade g ON g.id = c.grade_id
      JOIN public.a_homebase hb ON hb.id = e.homebase_id
      JOIN public.a_periode per ON per.id = e.periode_id
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

const getSppRule = async (db, homebaseId, periodeId, gradeId) => {
  const result = await db.query(
    `
      SELECT
        fr.id,
        fr.amount,
        fc.id AS component_id,
        fc.name AS component_name,
        COALESCE(
          ARRAY_AGG(frm.month_num ORDER BY frm.month_num)
            FILTER (WHERE frm.month_num IS NOT NULL),
          '{}'::smallint[]
        ) AS active_months
      FROM finance.fee_rule fr
      JOIN finance.fee_component fc ON fc.id = fr.component_id
      LEFT JOIN finance.fee_rule_month frm ON frm.fee_rule_id = fr.id
      WHERE fr.homebase_id = $1
        AND fr.grade_id = $2
        AND fr.is_active = true
        AND fc.category = 'spp'
        AND fc.is_active = true
        AND (fr.periode_id = $3 OR fr.periode_id IS NULL)
      GROUP BY fr.id, fc.id, fc.name
      ORDER BY CASE WHEN fr.periode_id = $3 THEN 0 ELSE 1 END, fr.id DESC
      LIMIT 1
    `,
    [homebaseId, gradeId, periodeId],
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
        AND fr.grade_id = $2
        AND fr.component_id = $3
        AND fr.is_active = true
        AND fc.category = 'other'
        AND fc.is_active = true
        AND (fr.periode_id = $4 OR fr.periode_id IS NULL)
      ORDER BY CASE WHEN fr.periode_id = $4 THEN 0 ELSE 1 END, fr.id DESC
      LIMIT 1
    `,
    [homebaseId, gradeId, componentId, periodeId],
  );

  return result.rows[0] || null;
};

const getOrCreateSppInvoiceItem = async ({
  client,
  homebaseId,
  periodeId,
  studentId,
  billMonth,
  rule,
  createdBy,
}) => {
  const existing = await client.query(
    `
      SELECT
        ii.id,
        ii.invoice_id,
        ii.amount,
        COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
      FROM finance.invoice inv
      JOIN finance.invoice_item ii ON ii.invoice_id = inv.id
      LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
      LEFT JOIN finance.payment p ON p.id = pa.payment_id
      WHERE inv.homebase_id = $1
        AND inv.student_id = $2
        AND COALESCE(inv.periode_id, 0) = COALESCE($3, 0)
        AND inv.status <> 'cancelled'
        AND ii.item_type = 'spp'
        AND ii.fee_rule_id = $4
        AND ii.bill_month = $5
      GROUP BY ii.id
      ORDER BY MAX(inv.created_at) DESC, ii.id DESC
      LIMIT 1
    `,
    [homebaseId, studentId, periodeId, rule.id, billMonth],
  );

  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  const invoice = await getOrCreateInvoice(client, {
    homebaseId,
    studentId,
    periodeId,
    sourceType: "spp",
    createdBy,
    notes: `Invoice SPP ${formatBillingPeriod(billMonth)}`,
    reuseExisting: false,
  });

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

const getOrCreateOtherInvoiceItem = async ({
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
        COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
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

const getParentPaymentSetup = async (db, homebaseId) => {
  const [gatewayResult, bankResult, methodResult] = await Promise.all([
    db.query(
      `
        SELECT
          id,
          homebase_id,
          merchant_id,
          client_key,
          server_key_encrypted,
          is_production,
          is_active,
          snap_enabled
        FROM finance.payment_gateway_config
        WHERE homebase_id = $1
          AND provider = 'midtrans'
        LIMIT 1
      `,
      [homebaseId],
    ),
    db.query(
      `
        SELECT
          ba.id,
          ba.bank_name,
          ba.account_name,
          ba.account_number,
          ba.branch
        FROM finance.bank_account ba
        JOIN finance.payment_method pm ON pm.id = ba.payment_method_id
        WHERE ba.homebase_id = $1
          AND ba.is_active = true
          AND pm.method_type = 'manual_bank'
          AND pm.is_active = true
        ORDER BY ba.bank_name ASC, ba.account_name ASC
      `,
      [homebaseId],
    ),
    db.query(
      `
        SELECT method_type, is_active
        FROM finance.payment_method
        WHERE homebase_id = $1
          AND method_type IN ('manual_bank', 'midtrans')
      `,
      [homebaseId],
    ),
  ]);

  const gateway = gatewayResult.rows[0] || null;
  const methodMap = new Map(
    methodResult.rows.map((item) => [
      String(item.method_type || "").toLowerCase(),
      item.is_active === true || item.is_active === "true" || item.is_active === 1,
    ]),
  );
  const bankAccounts = bankResult.rows.map((item) => ({
    id: Number(item.id),
    bank_name: item.bank_name,
    account_name: item.account_name,
    account_number: item.account_number,
    branch: item.branch,
  }));

  if (
    methodMap.get("midtrans") === true &&
    gateway?.is_active === true &&
    gateway?.snap_enabled === true &&
    gateway?.client_key &&
    gateway?.server_key_encrypted
  ) {
    return {
      mode: "midtrans",
      homebase_id: Number(homebaseId),
      gateway: {
        merchant_id: gateway.merchant_id,
        client_key: gateway.client_key,
        is_production: Boolean(gateway.is_production),
      },
      bank_accounts: [],
      requires_proof_upload: false,
    };
  }

  if (methodMap.get("manual_bank") === true && bankAccounts.length > 0) {
    return {
      mode: "bank_transfer",
      homebase_id: Number(homebaseId),
      gateway: null,
      bank_accounts: bankAccounts,
      requires_proof_upload: true,
    };
  }

  return {
    mode: "unavailable",
    homebase_id: Number(homebaseId),
    gateway: null,
    bank_accounts: [],
    requires_proof_upload: false,
  };
};

const buildSummary = ({ sppItems, otherItems }) => {
  const allItems = [...sppItems, ...otherItems];

  return {
    total_items: allItems.length,
    total_spp_items: sppItems.length,
    total_other_items: otherItems.length,
    paid_count: allItems.filter((item) => item.status === "paid").length,
    pending_count: allItems.filter((item) => item.status === "pending").length,
    partial_count: allItems.filter((item) => item.status === "partial").length,
    unpaid_count: allItems.filter((item) => item.status === "unpaid").length,
    total_due: allItems.reduce(
      (sum, item) => sum + toCurrencyNumber(item.amount_due),
      0,
    ),
    total_paid: allItems.reduce(
      (sum, item) => sum + toCurrencyNumber(item.paid_amount),
      0,
    ),
    total_remaining: allItems.reduce(
      (sum, item) => sum + toCurrencyNumber(item.remaining_amount),
      0,
    ),
  };
};

const getSppItems = async ({ db, homebaseId, periodeId, studentId, gradeId }) => {
  if (!homebaseId || !periodeId || !studentId || !gradeId) {
    return [];
  }

  const [rule, itemResult] = await Promise.all([
    getSppRule(db, homebaseId, periodeId, gradeId),
    db.query(
      `
        SELECT
          ii.bill_month,
          MAX(ii.id) AS invoice_item_id,
          MAX(inv.id) AS invoice_id,
          MAX(inv.invoice_no) AS invoice_no,
          MAX(ii.description) AS description,
          MAX(ii.amount) AS amount_due,
          COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount,
          COALESCE(SUM(CASE WHEN p.status = 'pending' THEN pa.allocated_amount ELSE 0 END), 0) AS pending_amount,
          COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'pending') AS pending_payment_count,
          MAX(p.payment_date) FILTER (WHERE p.status = 'confirmed') AS last_paid_at,
          MAX(p.payment_date) FILTER (WHERE p.status = 'pending') AS last_pending_at
        FROM finance.invoice inv
        JOIN finance.invoice_item ii
          ON ii.invoice_id = inv.id
         AND ii.item_type = 'spp'
        LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
        LEFT JOIN finance.payment p ON p.id = pa.payment_id
        WHERE inv.homebase_id = $1
          AND inv.student_id = $2
          AND COALESCE(inv.periode_id, 0) = COALESCE($3, 0)
        GROUP BY ii.bill_month
      `,
      [homebaseId, studentId, periodeId],
    ),
  ]);

  if (!rule && itemResult.rows.length === 0) {
    return [];
  }

  const activeMonths =
    rule?.active_months?.length > 0
      ? rule.active_months.map((item) => Number(item))
      : Array.from({ length: 12 }, (_, index) => index + 1);

  const monthMap = new Map(activeMonths.map((month) => [month, true]));
  itemResult.rows.forEach((item) => {
    if (item.bill_month) {
      monthMap.set(Number(item.bill_month), true);
    }
  });

  const itemLookup = new Map(
    itemResult.rows.map((item) => [Number(item.bill_month), item]),
  );

  return Array.from(monthMap.keys())
    .sort((left, right) => left - right)
    .map((month) => {
      const item = itemLookup.get(month) || null;
      const amountDue = toCurrencyNumber(item?.amount_due || rule?.amount || 0);
      const paidAmount = toCurrencyNumber(item?.paid_amount || 0);
      const pendingAmount = toCurrencyNumber(item?.pending_amount || 0);
      const remainingAmount = Math.max(amountDue - paidAmount, 0);

      return {
        key: `spp-${month}`,
        item_type: "spp",
        bill_month: month,
        billing_period_label: formatBillingPeriod(month),
        month_label: MONTH_NAMES[month - 1],
        description: item?.description || `SPP ${formatBillingPeriod(month)}`,
        amount_due: amountDue,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        status:
          amountDue > 0
            ? paidAmount >= amountDue
              ? "paid"
              : pendingAmount > 0
                ? "pending"
              : paidAmount > 0
                ? "partial"
                : "unpaid"
            : "unpaid",
        pending_amount: pendingAmount,
        pending_payment_count: Number(item?.pending_payment_count || 0),
        invoice_item_id: Number(item?.invoice_item_id || 0) || null,
        invoice_id:
          paidAmount > 0 ? Number(item?.invoice_id || 0) || null : null,
        invoice_no: paidAmount > 0 ? item?.invoice_no || null : null,
        can_view_invoice: paidAmount > 0,
        can_pay: remainingAmount > 0 && pendingAmount <= 0,
        last_paid_at: item?.last_paid_at || null,
        last_pending_at: item?.last_pending_at || null,
      };
    });
};

const getOtherItems = async ({
  db,
  homebaseId,
  periodeId,
  studentId,
  gradeId,
}) => {
  if (!homebaseId || !periodeId || !studentId || !gradeId) {
    return [];
  }

  const [componentResult, itemResult, installmentResult] = await Promise.all([
    db.query(
      `
        SELECT DISTINCT ON (fc.id)
          fc.id AS component_id,
          fc.name AS component_name,
          fr.id AS fee_rule_id,
          fr.amount
        FROM finance.fee_component fc
        JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
        WHERE fc.homebase_id = $1
          AND fc.category = 'other'
          AND fc.is_active = true
          AND fr.grade_id = $2
          AND (fr.periode_id = $3 OR fr.periode_id IS NULL)
        ORDER BY
          fc.id,
          CASE WHEN fr.periode_id = $3 THEN 0 ELSE 1 END,
          fr.id DESC
      `,
      [homebaseId, gradeId, periodeId],
    ),
    db.query(
      `
        SELECT
          ii.id AS charge_id,
          ii.component_id,
          ii.fee_rule_id,
          ii.description,
          ii.amount AS amount_due,
          inv.id AS invoice_id,
          inv.invoice_no,
          COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount,
          COALESCE(SUM(CASE WHEN p.status = 'pending' THEN pa.allocated_amount ELSE 0 END), 0) AS pending_amount,
          COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'pending') AS pending_payment_count,
          MAX(p.payment_date) FILTER (WHERE p.status = 'confirmed') AS last_paid_at,
          MAX(p.payment_date) FILTER (WHERE p.status = 'pending') AS last_pending_at
        FROM finance.invoice inv
        JOIN finance.invoice_item ii
          ON ii.invoice_id = inv.id
         AND ii.item_type = 'other'
        LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
        LEFT JOIN finance.payment p ON p.id = pa.payment_id
        WHERE inv.homebase_id = $1
          AND inv.student_id = $2
          AND COALESCE(inv.periode_id, 0) = COALESCE($3, 0)
        GROUP BY ii.id, inv.id
        ORDER BY ii.id DESC
      `,
      [homebaseId, studentId, periodeId],
    ),
    db.query(
      `
        SELECT
          ii.id AS charge_id,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'payment_id', p.id,
                'payment_date', p.payment_date,
                'allocated_amount', pa.allocated_amount,
                'reference_no', p.reference_no
              )
              ORDER BY p.payment_date DESC, p.id DESC
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
          ) AS installments
        FROM finance.invoice inv
        JOIN finance.invoice_item ii
          ON ii.invoice_id = inv.id
         AND ii.item_type = 'other'
        LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
        LEFT JOIN finance.payment p
          ON p.id = pa.payment_id
         AND p.status = 'confirmed'
        WHERE inv.homebase_id = $1
          AND inv.student_id = $2
          AND COALESCE(inv.periode_id, 0) = COALESCE($3, 0)
        GROUP BY ii.id
      `,
      [homebaseId, studentId, periodeId],
    ),
  ]);

  const itemMap = new Map(
    itemResult.rows.map((item) => [Number(item.component_id), item]),
  );
  const installmentMap = new Map(
    installmentResult.rows.map((item) => [
      Number(item.charge_id),
      Array.isArray(item.installments) ? item.installments : [],
    ]),
  );

  const mergedComponentIds = new Set([
    ...componentResult.rows.map((item) => Number(item.component_id)),
    ...itemResult.rows.map((item) => Number(item.component_id)),
  ]);

  return Array.from(mergedComponentIds)
    .map((componentId) => {
      const component = componentResult.rows.find(
        (item) => Number(item.component_id) === componentId,
      );
      const item = itemMap.get(componentId) || null;
      const amountDue = toCurrencyNumber(item?.amount_due || component?.amount || 0);
      const paidAmount = toCurrencyNumber(item?.paid_amount || 0);
      const pendingAmount = toCurrencyNumber(item?.pending_amount || 0);
      const remainingAmount = Math.max(amountDue - paidAmount, 0);
      const chargeId = Number(item?.charge_id || 0) || null;
      const installments = chargeId ? installmentMap.get(chargeId) || [] : [];

      return {
        key: `other-${chargeId || componentId}`,
        item_type: "other",
        charge_id: chargeId,
        component_id: componentId,
        fee_rule_id: Number(item?.fee_rule_id || component?.fee_rule_id || 0) || null,
        type_name: component?.component_name || item?.description || "Pembayaran Lainnya",
        description:
          item?.description ||
          component?.component_name ||
          "Pembayaran lainnya",
        amount_due: amountDue,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        status:
          amountDue > 0
            ? paidAmount >= amountDue
              ? "paid"
              : pendingAmount > 0
                ? "pending"
              : paidAmount > 0
                ? "partial"
                : "unpaid"
            : "unpaid",
        pending_amount: pendingAmount,
        pending_payment_count: Number(item?.pending_payment_count || 0),
        invoice_id:
          paidAmount > 0 ? Number(item?.invoice_id || 0) || null : null,
        invoice_no: paidAmount > 0 ? item?.invoice_no || null : null,
        can_view_invoice: paidAmount > 0,
        can_pay: remainingAmount > 0 && pendingAmount <= 0,
        last_paid_at: item?.last_paid_at || null,
        last_pending_at: item?.last_pending_at || null,
        installments: installments.map((installment) => ({
          payment_id: Number(installment?.payment_id || 0) || null,
          payment_date: installment?.payment_date || null,
          allocated_amount: toCurrencyNumber(installment?.allocated_amount || 0),
          reference_no: installment?.reference_no || null,
        })),
      };
    })
    .sort((left, right) =>
      String(left.type_name || "").localeCompare(String(right.type_name || ""), "id", {
        sensitivity: "base",
      }),
    );
};

const resolveParentScopedContext = async ({
  db,
  parentUserId,
  requestedStudentId,
  requestedPeriodeId,
}) => {
  const linkedStudents = await getLinkedParentStudents(db, parentUserId);

  if (linkedStudents.length === 0) {
    return { error: "Akun orang tua belum terhubung ke data siswa. Hubungi admin sekolah." };
  }

  const selectedStudent =
    linkedStudents.find(
      (item) => Number(item.student_id) === Number(requestedStudentId),
    ) || linkedStudents[0];

  const periodes = await getHomebasePeriodes(db, selectedStudent.homebase_id);
  const selectedPeriode =
    periodes.find((item) => Number(item.id) === Number(requestedPeriodeId)) ||
    periodes.find((item) => item.is_active) ||
    periodes[0] ||
    null;

  const enrollment = selectedPeriode
    ? await getEnrollmentContext(
        db,
        selectedStudent.homebase_id,
        selectedPeriode.id,
        selectedStudent.student_id,
      )
    : null;

  return {
    linkedStudents,
    selectedStudent,
    periodes,
    selectedPeriode,
    enrollment,
  };
};

const ensureParentPayableItem = async ({
  client,
  userId,
  homebaseId,
  periodeId,
  studentId,
  gradeId,
  itemType,
  billMonth,
  chargeId,
  componentId,
}) => {
  if (itemType === "spp") {
    if (!billMonth) {
      throw new Error("Bulan SPP wajib dipilih");
    }

    const rule = await getSppRule(client, homebaseId, periodeId, gradeId);
    if (!rule) {
      throw new Error("Tarif SPP aktif belum tersedia untuk periode dan tingkat ini");
    }

    const item = await getOrCreateSppInvoiceItem({
      client,
      homebaseId,
      periodeId,
      studentId,
      billMonth,
      rule,
      createdBy: userId,
    });

    return {
      invoice_item_id: Number(item.id),
      invoice_id: Number(item.invoice_id),
      amount_due: toCurrencyNumber(item.amount),
      paid_amount: toCurrencyNumber(item.paid_amount),
      remaining_amount: Math.max(
        toCurrencyNumber(item.amount) - toCurrencyNumber(item.paid_amount),
        0,
      ),
      description: `SPP ${formatBillingPeriod(billMonth)}`,
    };
  }

  if (itemType === "other") {
    let item = null;

    if (chargeId) {
      const result = await client.query(
        `
          SELECT
            ii.id,
            ii.invoice_id,
            ii.amount,
            ii.description,
            ii.component_id,
            inv.student_id,
            inv.periode_id,
            COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
          FROM finance.invoice_item ii
          JOIN finance.invoice inv ON inv.id = ii.invoice_id
          LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
          LEFT JOIN finance.payment p ON p.id = pa.payment_id
          WHERE ii.id = $1
            AND inv.homebase_id = $2
          GROUP BY ii.id, inv.id
          LIMIT 1
        `,
        [chargeId, homebaseId],
      );

      if (result.rowCount === 0) {
        throw new Error("Tagihan pembayaran lainnya tidak ditemukan");
      }

      item = result.rows[0];

      if (
        Number(item.student_id) !== Number(studentId) ||
        Number(item.periode_id || 0) !== Number(periodeId || 0)
      ) {
        throw new Error("Tagihan pembayaran lainnya tidak sesuai dengan siswa terpilih");
      }
    } else {
      if (!componentId) {
        throw new Error("Jenis pembayaran lainnya wajib dipilih");
      }

      const rule = await getOtherRule(
        client,
        homebaseId,
        periodeId,
        gradeId,
        componentId,
      );

      if (!rule) {
        throw new Error("Jenis pembayaran lainnya belum memiliki tarif aktif");
      }

      item = await getOrCreateOtherInvoiceItem({
        client,
        homebaseId,
        periodeId,
        studentId,
        componentId,
        rule,
        createdBy: userId,
      });
      item.description = rule.component_name;
    }

    return {
      invoice_item_id: Number(item.id),
      invoice_id: Number(item.invoice_id),
      amount_due: toCurrencyNumber(item.amount),
      paid_amount: toCurrencyNumber(item.paid_amount),
      remaining_amount: Math.max(
        toCurrencyNumber(item.amount) - toCurrencyNumber(item.paid_amount),
        0,
      ),
      description: item.description || "Pembayaran lainnya",
    };
  }

  throw new Error("Jenis tagihan tidak dikenali");
};

const createPendingParentPayment = async ({
  client,
  homebaseId,
  studentId,
  payerUserId,
  methodType,
  methodName,
  bankAccountId = null,
  paymentChannel = null,
  amount,
  notes = null,
  proofUrl = null,
  allocation,
  paymentSource = "parent_manual",
  initialStatus = "pending",
}) => {
  const methodId = await getPaymentMethodId(client, {
    homebaseId,
    methodType,
    name: methodName,
  });

  const paymentResult = await client.query(
    `
      INSERT INTO finance.payment (
        homebase_id,
        student_id,
        payer_user_id,
        method_id,
        bank_account_id,
        payment_channel,
        payment_source,
        payment_date,
        amount,
        status,
        proof_url,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12)
      RETURNING id
    `,
    [
      homebaseId,
      studentId,
      payerUserId,
      methodId,
      bankAccountId,
      paymentChannel,
      paymentSource,
      amount,
      initialStatus,
      proofUrl,
      notes,
      payerUserId,
    ],
  );

  const paymentId = paymentResult.rows[0].id;

  await client.query(
    `
      INSERT INTO finance.payment_allocation (
        payment_id,
        invoice_item_id,
        allocated_amount
      )
      VALUES ($1, $2, $3)
    `,
    [paymentId, allocation.invoice_item_id, allocation.allocated_amount],
  );

  return paymentId;
};

const createMidtransSnapTransaction = async ({
  gatewayConfig,
  orderId,
  grossAmount,
  itemDescription,
  student,
  parentName,
}) => {
  const { snap } = resolveMidtransBaseUrls(gatewayConfig.is_production);
  const authHeader = `Basic ${Buffer.from(`${gatewayConfig.server_key_encrypted}:`).toString("base64")}`;

  const response = await fetch(snap, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: Number(grossAmount),
      },
      item_details: [
        {
          id: orderId,
          price: Number(grossAmount),
          quantity: 1,
          name: itemDescription.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: parentName || "Orang Tua",
        last_name: "",
        billing_address: {
          first_name: parentName || "Orang Tua",
          address: student.homebase_name || "Satuan",
        },
        shipping_address: {
          first_name: student.student_name || "Siswa",
          address: student.homebase_name || "Satuan",
        },
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error_messages?.join(", ") || payload?.status_message || "Gagal membuat transaksi Midtrans");
  }

  return payload;
};

const fetchMidtransTransactionStatus = async ({ gatewayConfig, orderId }) => {
  const { api } = resolveMidtransBaseUrls(gatewayConfig.is_production);
  const authHeader = `Basic ${Buffer.from(`${gatewayConfig.server_key_encrypted}:`).toString("base64")}`;

  const response = await fetch(`${api}/${encodeURIComponent(orderId)}/status`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("Gagal memverifikasi status transaksi Midtrans");
  }

  return response.json();
};

const deriveFinancePaymentStatus = (midtransStatus, fraudStatus) => {
  const normalizedStatus = String(midtransStatus || "").toLowerCase();
  const normalizedFraud = String(fraudStatus || "").toLowerCase();

  if (
    ["capture", "settlement"].includes(normalizedStatus) &&
    (!normalizedFraud || normalizedFraud === "accept")
  ) {
    return "confirmed";
  }

  if (normalizedStatus === "pending") {
    return "pending";
  }

  if (normalizedStatus === "expire") {
    return "expired";
  }

  if (normalizedStatus === "cancel") {
    return "cancelled";
  }

  if (normalizedStatus === "refund" || normalizedStatus === "partial_refund") {
    return "refunded";
  }

  return "rejected";
};

router.get(
  "/parent/transactions/overview",
  authorize("parent"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const scoped = await resolveParentScopedContext({
      db,
      parentUserId: req.user.id,
      requestedStudentId: parseOptionalInt(req.query.student_id),
      requestedPeriodeId: parseOptionalInt(req.query.periode_id),
    });

    if (scoped.error) {
      return res.status(404).json({ message: scoped.error });
    }

    const {
      linkedStudents,
      selectedStudent,
      periodes,
      selectedPeriode,
      enrollment,
    } = scoped;

    const [sppItems, otherItems, paymentSetup] = await Promise.all([
      getSppItems({
        db,
        homebaseId: selectedStudent.homebase_id,
        periodeId: selectedPeriode?.id || null,
        studentId: selectedStudent.student_id,
        gradeId: enrollment?.grade_id || selectedStudent.current_grade_id,
      }),
      getOtherItems({
        db,
        homebaseId: selectedStudent.homebase_id,
        periodeId: selectedPeriode?.id || null,
        studentId: selectedStudent.student_id,
        gradeId: enrollment?.grade_id || selectedStudent.current_grade_id,
      }),
      getParentPaymentSetup(db, selectedStudent.homebase_id),
    ]);

    const children = await Promise.all(
      linkedStudents.map(async (student) => {
        const childPeriodes = await getHomebasePeriodes(db, student.homebase_id);
        const activePeriode =
          childPeriodes.find((item) => item.is_active) || childPeriodes[0] || null;

        return {
          student_id: Number(student.student_id),
          student_name: student.student_name,
          nis: student.nis,
          homebase_id: Number(student.homebase_id || 0) || null,
          homebase_name: student.homebase_name,
          relationship: student.relationship || "wali",
          is_primary: Boolean(student.is_primary),
          current_class_name: student.current_class_name,
          current_grade_name: student.current_grade_name,
          active_periode_id: Number(activePeriode?.id || 0) || null,
          active_periode_name: activePeriode?.name || null,
          periodes: childPeriodes.map((periode) => ({
            id: Number(periode.id),
            name: periode.name,
            is_active: Boolean(periode.is_active),
          })),
        };
      }),
    );

    res.json({
      status: "success",
      data: {
        children,
        selected_student_id: Number(selectedStudent.student_id),
        selected_periode_id: Number(selectedPeriode?.id || 0) || null,
        student: enrollment
          ? {
              ...enrollment,
              student_id: Number(enrollment.student_id),
              homebase_id: Number(enrollment.homebase_id),
              periode_id: Number(enrollment.periode_id),
              class_id: Number(enrollment.class_id),
              grade_id: Number(enrollment.grade_id),
            }
          : {
              student_id: Number(selectedStudent.student_id),
              student_name: selectedStudent.student_name,
              nis: selectedStudent.nis,
              homebase_id: Number(selectedStudent.homebase_id || 0) || null,
              homebase_name: selectedStudent.homebase_name,
              periode_id: Number(selectedPeriode?.id || 0) || null,
              periode_name: selectedPeriode?.name || null,
              periode_is_active: Boolean(selectedPeriode?.is_active),
              class_id: null,
              class_name: selectedStudent.current_class_name,
              grade_id: Number(selectedStudent.current_grade_id || 0) || null,
              grade_name: selectedStudent.current_grade_name,
            },
        periodes: periodes.map((periode) => ({
          id: Number(periode.id),
          name: periode.name,
          is_active: Boolean(periode.is_active),
        })),
        payment_setup: paymentSetup,
        summary: buildSummary({ sppItems, otherItems }),
        spp_items: sppItems,
        other_items: otherItems,
      },
    });
  }),
);

router.post(
  "/parent/transactions/payments/proof-upload",
  authorize("parent"),
  uploadPaymentProof.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "File bukti transfer wajib diunggah" });
    }

    return res.json({
      status: "success",
      data: {
        url: `/assets/finance/${req.file.filename}`,
      },
    });
  },
);

router.post(
  "/parent/transactions/payments",
  authorize("parent"),
  uploadPaymentProof.single("proof_file"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const studentId = parseOptionalInt(req.body.student_id);
    const periodeId = parseOptionalInt(req.body.periode_id);
    const itemType = String(req.body.item_type || "").trim().toLowerCase();
    const billMonth = parseOptionalInt(req.body.bill_month);
    const chargeId = parseOptionalInt(req.body.charge_id);
    const componentId = parseOptionalInt(req.body.component_id);
    const bankAccountId = parseOptionalInt(req.body.bank_account_id);
    const notes = String(req.body.notes || "").trim() || null;
    const requestedPaymentAmount = Number(req.body.payment_amount);

    const scoped = await resolveParentScopedContext({
      db: client,
      parentUserId: req.user.id,
      requestedStudentId: studentId,
      requestedPeriodeId: periodeId,
    });

    if (scoped.error) {
      return res.status(404).json({ message: scoped.error });
    }

    const { selectedStudent, selectedPeriode, enrollment } = scoped;
    const paymentSetup = await getParentPaymentSetup(client, selectedStudent.homebase_id);

    if (!selectedPeriode || !enrollment) {
      return res.status(400).json({
        message: "Periode aktif siswa belum tersedia untuk memproses pembayaran",
      });
    }

    if (paymentSetup.mode === "unavailable") {
      return res.status(400).json({
        message: "Metode pembayaran belum dikonfigurasi untuk satuan siswa ini",
      });
    }

    const payableItem = await ensureParentPayableItem({
      client,
      userId: req.user.id,
      homebaseId: selectedStudent.homebase_id,
      periodeId: selectedPeriode.id,
      studentId: selectedStudent.student_id,
      gradeId: enrollment.grade_id,
      itemType,
      billMonth,
      chargeId,
      componentId,
    });

    if (payableItem.remaining_amount <= 0) {
      return res.status(400).json({
        message: "Tagihan ini sudah lunas dan tidak perlu dibayarkan lagi",
      });
    }

    const payableAmount =
      itemType === "other" && Number.isFinite(requestedPaymentAmount)
        ? requestedPaymentAmount
        : payableItem.remaining_amount;

    if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
      return res.status(400).json({
        message: "Nominal pembayaran tidak valid",
      });
    }

    if (payableAmount > payableItem.remaining_amount) {
      return res.status(400).json({
        message: "Nominal pembayaran melebihi sisa tagihan",
      });
    }

    const pendingDuplicateResult = await client.query(
      `
        SELECT p.id
        FROM finance.payment p
        JOIN finance.payment_allocation pa ON pa.payment_id = p.id
        WHERE p.homebase_id = $1
          AND p.student_id = $2
          AND p.status = 'pending'
          AND p.payment_source IN ('parent_manual', 'midtrans')
          AND pa.invoice_item_id = $3
        ORDER BY p.id DESC
        LIMIT 1
      `,
      [selectedStudent.homebase_id, selectedStudent.student_id, payableItem.invoice_item_id],
    );

    if (pendingDuplicateResult.rowCount > 0) {
      return res.status(400).json({
        message:
          "Masih ada pembayaran yang menunggu proses untuk tagihan ini. Selesaikan atau tunggu status sebelumnya terlebih dahulu",
      });
    }

    const payerUserId = await getParentPayerUserId(
      client,
      selectedStudent.student_id,
      req.user.id,
    );

    if (paymentSetup.mode === "midtrans") {
      const gatewayConfigResult = await client.query(
        `
          SELECT *
          FROM finance.payment_gateway_config
          WHERE homebase_id = $1
            AND provider = 'midtrans'
            AND is_active = true
            AND snap_enabled = true
          LIMIT 1
        `,
        [selectedStudent.homebase_id],
      );
      const gatewayConfig = gatewayConfigResult.rows[0] || null;

      if (!gatewayConfig?.server_key_encrypted) {
        return res.status(400).json({
          message: "Konfigurasi Midtrans belum lengkap untuk satuan siswa ini",
        });
      }

      const paymentId = await createPendingParentPayment({
        client,
        homebaseId: selectedStudent.homebase_id,
        studentId: selectedStudent.student_id,
        payerUserId,
        methodType: "midtrans",
        methodName: "Midtrans",
        paymentChannel: "Verifikasi Midtrans",
        amount: payableAmount,
        notes: notes || "Menunggu verifikasi Midtrans",
        allocation: {
          invoice_item_id: payableItem.invoice_item_id,
          allocated_amount: payableAmount,
        },
        paymentSource: "midtrans",
        initialStatus: "pending",
      });

      const orderId = `PARENT-${paymentId}-${Date.now()}`;
      const snapPayload = await createMidtransSnapTransaction({
        gatewayConfig,
        orderId,
        grossAmount: payableAmount,
        itemDescription: payableItem.description,
        student: {
          student_name: selectedStudent.student_name,
          homebase_name: selectedStudent.homebase_name,
        },
        parentName: req.user.full_name,
      });

      await client.query(
        `
          INSERT INTO finance.gateway_transaction (
            payment_id,
            provider,
            order_id,
            transaction_id,
            transaction_status,
            snap_token,
            snap_redirect_url,
            gross_amount,
            currency,
            raw_response,
            last_synced_at
          )
          VALUES ($1, 'midtrans', $2, NULL, 'pending', $3, $4, $5, 'IDR', $6::jsonb, CURRENT_TIMESTAMP)
        `,
        [
          paymentId,
          orderId,
          snapPayload?.token || null,
          snapPayload?.redirect_url || null,
          payableAmount,
          JSON.stringify(snapPayload),
        ],
      );

      return res.status(201).json({
        status: "success",
        message: "Transaksi Midtrans berhasil dibuat",
        data: {
          payment_id: paymentId,
          order_id: orderId,
          snap_token: snapPayload?.token || null,
          snap_redirect_url: snapPayload?.redirect_url || null,
          method: "midtrans",
        },
      });
    }

    if (!req.file || !bankAccountId) {
      return res.status(400).json({
        message: "Pilih rekening bank dan unggah bukti transfer terlebih dahulu",
      });
    }

    const bankAccountResult = await client.query(
      `
        SELECT
          ba.id,
          ba.bank_name,
          ba.account_name,
          ba.account_number
        FROM finance.bank_account ba
        JOIN finance.payment_method pm ON pm.id = ba.payment_method_id
        WHERE ba.id = $1
          AND ba.homebase_id = $2
          AND ba.is_active = true
          AND pm.method_type = 'manual_bank'
          AND pm.is_active = true
        LIMIT 1
      `,
      [bankAccountId, selectedStudent.homebase_id],
    );

    if (bankAccountResult.rowCount === 0) {
      return res.status(400).json({
        message: "Rekening bank tidak ditemukan untuk satuan siswa ini",
      });
    }

    const bankAccount = bankAccountResult.rows[0];
    const proofUrl = `/assets/finance/${req.file.filename}`;
    const paymentId = await createPendingParentPayment({
      client,
      homebaseId: selectedStudent.homebase_id,
      studentId: selectedStudent.student_id,
      payerUserId,
      methodType: "manual_bank",
      methodName: "Transfer Bank",
      bankAccountId: bankAccount.id,
      paymentChannel: `${bankAccount.bank_name} Transfer`,
      amount: payableAmount,
      notes,
      proofUrl,
      allocation: {
        invoice_item_id: payableItem.invoice_item_id,
        allocated_amount: payableAmount,
      },
      paymentSource: "parent_manual",
    });

    return res.status(201).json({
      status: "success",
      message: "Bukti transfer berhasil dikirim dan menunggu verifikasi",
      data: {
        payment_id: paymentId,
        proof_url: proofUrl,
        method: "bank_transfer",
      },
    });
  }),
);

router.post(
  "/parent/transactions/midtrans/webhook",
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const orderId = String(req.body?.order_id || "").trim();

    if (!orderId) {
      return res.status(400).json({ message: "order_id Midtrans wajib tersedia" });
    }

    const gatewayResult = await client.query(
      `
        SELECT
          gt.id AS gateway_transaction_id,
          gt.payment_id,
          gt.order_id,
          p.id,
          p.homebase_id,
          p.status AS payment_status,
          cfg.server_key_encrypted,
          cfg.is_production
        FROM finance.gateway_transaction gt
        JOIN finance.payment p ON p.id = gt.payment_id
        JOIN finance.payment_gateway_config cfg
          ON cfg.homebase_id = p.homebase_id
         AND cfg.provider = 'midtrans'
        WHERE gt.order_id = $1
        LIMIT 1
      `,
      [orderId],
    );

    if (gatewayResult.rowCount === 0) {
      return res.status(404).json({ message: "Transaksi gateway tidak ditemukan" });
    }

    const gateway = gatewayResult.rows[0];
    const rawGrossAmount = String(req.body?.gross_amount || "");
    const rawStatusCode = String(req.body?.status_code || "");
    const providedSignature = String(req.body?.signature_key || "");
    const expectedSignature = crypto
      .createHash("sha512")
      .update(
        `${orderId}${rawStatusCode}${rawGrossAmount}${gateway.server_key_encrypted}`,
      )
      .digest("hex");

    const signatureMatches =
      !providedSignature || providedSignature === expectedSignature;

    const verifiedStatus = await fetchMidtransTransactionStatus({
      gatewayConfig: {
        server_key_encrypted: gateway.server_key_encrypted,
        is_production: gateway.is_production,
      },
      orderId,
    });

    const financePaymentStatus = deriveFinancePaymentStatus(
      verifiedStatus?.transaction_status,
      verifiedStatus?.fraud_status,
    );

    await client.query(
      `
        UPDATE finance.gateway_transaction
        SET
          transaction_id = $1,
          transaction_status = $2,
          fraud_status = $3,
          payment_type = $4,
          gross_amount = $5,
          raw_response = $6::jsonb,
          webhook_payload = jsonb_set(
            COALESCE($7::jsonb, '{}'::jsonb),
            '{signature_verified}',
            to_jsonb($8::boolean),
            true
          ),
          last_synced_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
      `,
      [
        verifiedStatus?.transaction_id || null,
        verifiedStatus?.transaction_status || null,
        verifiedStatus?.fraud_status || null,
        verifiedStatus?.payment_type || null,
        verifiedStatus?.gross_amount || null,
        JSON.stringify(verifiedStatus || {}),
        JSON.stringify(req.body || {}),
        signatureMatches,
        gateway.gateway_transaction_id,
      ],
    );

    await client.query(
      `
        UPDATE finance.payment
        SET
          status = $1,
          reference_no = $2,
          payment_channel = COALESCE($3, payment_channel),
          notes = CASE
            WHEN $1 = 'confirmed' THEN 'Pembayaran terverifikasi melalui Midtrans'
            WHEN $1 = 'pending' THEN 'Menunggu verifikasi Midtrans'
            WHEN $1 IN ('expired', 'cancelled', 'rejected', 'refunded') THEN 'Status transaksi diperbarui dari Midtrans'
            ELSE notes
          END,
          verified_at = CASE WHEN $1 = 'confirmed' THEN CURRENT_TIMESTAMP ELSE verified_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `,
      [
        financePaymentStatus,
        verifiedStatus?.transaction_id || null,
        verifiedStatus?.payment_type || null,
        gateway.payment_id,
      ],
    );

    const invoiceResult = await client.query(
      `
        SELECT DISTINCT ii.invoice_id
        FROM finance.payment_allocation pa
        JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        WHERE pa.payment_id = $1
      `,
      [gateway.payment_id],
    );

    for (const row of invoiceResult.rows) {
      if (row.invoice_id) {
        await upsertInvoiceStatus(client, row.invoice_id);
      }
    }

    return res.json({ status: "success" });
  }),
);

router.get(
  "/parent/transactions/invoices/:invoiceId",
  authorize("parent"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const invoiceId = parseOptionalInt(req.params.invoiceId);
    const invoiceItemId = parseOptionalInt(req.query.invoice_item_id);

    if (!invoiceId) {
      return res.status(400).json({ message: "Invoice tidak valid" });
    }

    const linkedStudents = await getLinkedParentStudents(db, req.user.id);
    const linkedStudentIds = linkedStudents.map((item) => Number(item.student_id));

    if (linkedStudentIds.length === 0) {
      return res.status(404).json({
        message:
          "Akun orang tua belum terhubung ke data siswa. Hubungi admin sekolah.",
      });
    }

    const invoiceResult = await db.query(
      `
        SELECT
          inv.id,
          inv.invoice_no,
          inv.issue_date,
          inv.due_date,
          inv.status,
          inv.source_type,
          inv.notes,
          inv.homebase_id,
          inv.student_id,
          hb.name AS homebase_name,
          per.id AS periode_id,
          per.name AS periode_name,
          u.full_name AS student_name,
          s.nis,
          enr.class_name,
          enr.grade_name,
          fs.officer_name,
          fs.officer_signature_url
        FROM finance.invoice inv
        JOIN public.a_homebase hb ON hb.id = inv.homebase_id
        JOIN public.u_students s ON s.user_id = inv.student_id
        JOIN public.u_users u ON u.id = s.user_id
        LEFT JOIN public.a_periode per ON per.id = inv.periode_id
        LEFT JOIN finance.finance_setting fs ON fs.homebase_id = inv.homebase_id
        LEFT JOIN LATERAL (
          SELECT
            c.name AS class_name,
            g.name AS grade_name
          FROM public.u_class_enrollments e
          JOIN public.a_class c ON c.id = e.class_id
          JOIN public.a_grade g ON g.id = c.grade_id
          WHERE e.student_id = inv.student_id
            AND e.homebase_id = inv.homebase_id
            AND (
              inv.periode_id IS NULL
              OR e.periode_id = inv.periode_id
            )
          ORDER BY e.enrolled_at DESC, e.id DESC
          LIMIT 1
        ) AS enr ON true
        WHERE inv.id = $1
        LIMIT 1
      `,
      [invoiceId],
    );

    if (invoiceResult.rowCount === 0) {
      return res.status(404).json({ message: "Invoice tidak ditemukan" });
    }

    const invoice = invoiceResult.rows[0];

    if (!linkedStudentIds.includes(Number(invoice.student_id))) {
      return res.status(403).json({
        message: "Invoice ini tidak termasuk dalam akses akun orang tua Anda",
      });
    }

    if (invoiceItemId) {
      const scopedItemResult = await db.query(
        `
          SELECT
            ii.id,
            ii.invoice_id,
            ii.item_type,
            ii.bill_month,
            ii.description,
            fc.name AS component_name
          FROM finance.invoice_item ii
          LEFT JOIN finance.fee_component fc ON fc.id = ii.component_id
          WHERE ii.id = $1
            AND ii.invoice_id = $2
          LIMIT 1
        `,
        [invoiceItemId, invoiceId],
      );

      if (scopedItemResult.rowCount === 0) {
        return res.status(404).json({
          message: "Item invoice tidak ditemukan pada invoice yang dipilih",
        });
      }
    }

    const [itemResult, paymentResult] = await Promise.all([
      db.query(
        `
          SELECT
            ii.id,
            ii.item_type,
            ii.description,
            ii.bill_month,
            ii.qty,
            ii.unit_amount,
            ii.amount,
            fc.name AS component_name,
            COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
          FROM finance.invoice_item ii
          LEFT JOIN finance.fee_component fc ON fc.id = ii.component_id
          LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
          LEFT JOIN finance.payment p ON p.id = pa.payment_id
          WHERE ii.invoice_id = $1
            AND ($2::bigint IS NULL OR ii.id = $2)
          GROUP BY ii.id, fc.name
          ORDER BY
            CASE WHEN ii.item_type = 'spp' THEN 0 ELSE 1 END,
            ii.bill_month ASC NULLS LAST,
            ii.id ASC
        `,
        [invoiceId, invoiceItemId],
      ),
      db.query(
        `
          SELECT
            p.id,
            p.payment_date,
            p.amount,
            p.payment_channel,
            p.reference_no,
            p.status,
            p.proof_url,
            p.notes,
            COALESCE(SUM(pa.allocated_amount), 0) AS allocated_amount
          FROM finance.payment p
          JOIN finance.payment_allocation pa ON pa.payment_id = p.id
          JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
          WHERE ii.invoice_id = $1
            AND ($2::bigint IS NULL OR ii.id = $2)
          GROUP BY p.id
          ORDER BY p.payment_date DESC, p.id DESC
        `,
        [invoiceId, invoiceItemId],
      ),
    ]);

    const items = itemResult.rows.map((item) => {
      const amountDue = toCurrencyNumber(item.amount);
      const paidAmount = toCurrencyNumber(item.paid_amount);

      return {
        id: Number(item.id),
        item_type: item.item_type,
        description: item.description || item.component_name || "-",
        component_name: item.component_name || null,
        bill_month: Number(item.bill_month || 0) || null,
        billing_period_label: item.bill_month
          ? formatBillingPeriod(Number(item.bill_month))
          : null,
        qty: Number(item.qty || 0),
        unit_amount: toCurrencyNumber(item.unit_amount),
        amount_due: amountDue,
        paid_amount: paidAmount,
        remaining_amount: Math.max(amountDue - paidAmount, 0),
        status:
          paidAmount >= amountDue && amountDue > 0
            ? "paid"
            : paidAmount > 0
              ? "partial"
              : "unpaid",
      };
    });

    const payments = paymentResult.rows.map((payment) => ({
      id: Number(payment.id),
      payment_date: payment.payment_date,
      amount: toCurrencyNumber(payment.amount),
      allocated_amount: toCurrencyNumber(payment.allocated_amount),
      payment_channel: payment.payment_channel || "Pembayaran manual",
      reference_no: payment.reference_no || null,
      status: payment.status,
      proof_url: payment.proof_url || null,
      notes: payment.notes || null,
    }));

    const totalDue = items.reduce(
      (sum, item) => sum + toCurrencyNumber(item.amount_due),
      0,
    );
    const totalPaid = items.reduce(
      (sum, item) => sum + toCurrencyNumber(item.paid_amount),
      0,
    );
    const scopedStatus =
      totalPaid >= totalDue && totalDue > 0
        ? "paid"
        : totalPaid > 0
          ? "partial"
          : "unpaid";
    const scopeItem = items[0] || null;
    const scopedNotes =
      invoiceItemId && scopeItem
        ? scopeItem.item_type === "spp" && scopeItem.bill_month
          ? `Invoice SPP ${formatBillingPeriod(scopeItem.bill_month)}`
          : scopeItem.description || invoice.notes
        : invoice.notes;

    if (totalPaid <= 0) {
      return res.status(404).json({
        message: "Invoice baru tersedia setelah pembayaran mulai tercatat",
      });
    }

    res.json({
      status: "success",
      data: {
        invoice: {
          id: Number(invoice.id),
          invoice_no: invoice.invoice_no,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          status: scopedStatus,
          source_type: invoice.source_type,
          notes: scopedNotes,
          homebase_id: Number(invoice.homebase_id),
          homebase_name: invoice.homebase_name,
          periode_id: Number(invoice.periode_id || 0) || null,
          periode_name: invoice.periode_name,
          student_id: Number(invoice.student_id),
          student_name: invoice.student_name,
          nis: invoice.nis,
          class_name: invoice.class_name,
          grade_name: invoice.grade_name,
          total_due: totalDue,
          total_paid: totalPaid,
          total_remaining: Math.max(totalDue - totalPaid, 0),
          invoice_item_id: invoiceItemId || null,
        },
        officer: {
          name: invoice.officer_name || null,
          signature_url: invoice.officer_signature_url || null,
        },
        items,
        payments,
      },
    });
  }),
);
export default router;
