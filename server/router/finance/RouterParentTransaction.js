import { Router } from "express";
import { authorize } from "../../middleware/authorize.js";
import { withQuery } from "../../utils/wrapper.js";
import {
  MONTH_NAMES,
  ensureFinalFinanceTables,
  formatBillingPeriod,
  getLinkedParentStudents,
  parseOptionalInt,
} from "./financeHelpers.js";

const router = Router();

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

const getStudentPeriodes = async (db, homebaseId, studentId) => {
  const result = await db.query(
    `
      SELECT DISTINCT ON (per.id)
        per.id,
        per.name,
        per.is_active,
        per.created_at
      FROM public.u_class_enrollments e
      JOIN public.a_periode per ON per.id = e.periode_id
      WHERE e.homebase_id = $1
        AND e.student_id = $2
      ORDER BY per.id, per.is_active DESC, per.created_at DESC
    `,
    [homebaseId, studentId],
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

const getSppItems = async ({ db, homebaseId, periodeId, studentId, gradeId }) => {
  if (!homebaseId || !periodeId || !studentId || !gradeId) {
    return [];
  }

  const [ruleResult, itemResult] = await Promise.all([
    db.query(
      `
        SELECT
          fr.id,
          fr.amount,
          fc.name AS component_name,
          COALESCE(
            ARRAY_AGG(frm.month_num ORDER BY frm.month_num)
              FILTER (WHERE frm.month_num IS NOT NULL),
            '{}'::smallint[]
          ) AS active_months
        FROM finance.fee_rule fr
        JOIN finance.fee_component fc
          ON fc.id = fr.component_id
         AND fc.category = 'spp'
         AND fc.is_active = true
        LEFT JOIN finance.fee_rule_month frm ON frm.fee_rule_id = fr.id
        WHERE fr.homebase_id = $1
          AND fr.grade_id = $2
          AND fr.is_active = true
          AND (fr.periode_id = $3 OR fr.periode_id IS NULL)
        GROUP BY fr.id, fc.name
        ORDER BY CASE WHEN fr.periode_id = $3 THEN 0 ELSE 1 END, fr.id DESC
        LIMIT 1
      `,
      [homebaseId, gradeId, periodeId],
    ),
    db.query(
      `
        SELECT
          ii.bill_month,
          MAX(ii.id) AS invoice_item_id,
          MAX(inv.id) AS invoice_id,
          MAX(inv.invoice_no) AS invoice_no,
          MAX(ii.description) AS description,
          MAX(ii.amount) AS amount_due,
          COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount,
          MAX(p.payment_date) FILTER (WHERE p.status = 'paid') AS last_paid_at
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

  const activeRule = ruleResult.rows[0] || null;
  if (!activeRule && itemResult.rows.length === 0) {
    return [];
  }

  const activeMonths =
    activeRule?.active_months?.length > 0
      ? activeRule.active_months.map((item) => Number(item))
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
      const amountDue = toCurrencyNumber(item?.amount_due || activeRule?.amount || 0);
      const paidAmount = toCurrencyNumber(item?.paid_amount || 0);
      const remainingAmount = Math.max(amountDue - paidAmount, 0);
      const status =
        amountDue > 0
          ? paidAmount >= amountDue
            ? "paid"
            : paidAmount > 0
              ? "partial"
              : "unpaid"
          : "unpaid";

      return {
        key: `spp-${month}`,
        bill_month: month,
        billing_period_label: formatBillingPeriod(month),
        month_label: MONTH_NAMES[month - 1],
        description: item?.description || `SPP ${formatBillingPeriod(month)}`,
        amount_due: amountDue,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        status,
        invoice_item_id: Number(item?.invoice_item_id || 0) || null,
        invoice_id: Number(item?.invoice_id || 0) || null,
        invoice_no: item?.invoice_no || null,
        last_paid_at: item?.last_paid_at || null,
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
          COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount,
          MAX(p.payment_date) FILTER (WHERE p.status = 'paid') AS last_paid_at
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
         AND p.status = 'paid'
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
      const remainingAmount = Math.max(amountDue - paidAmount, 0);
      const chargeId = Number(item?.charge_id || 0) || null;
      const installments = chargeId ? installmentMap.get(chargeId) || [] : [];

      return {
        key: `other-${chargeId || componentId}`,
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
              : paidAmount > 0
                ? "partial"
                : "unpaid"
            : "unpaid",
        invoice_id: Number(item?.invoice_id || 0) || null,
        invoice_no: item?.invoice_no || null,
        last_paid_at: item?.last_paid_at || null,
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

const buildSummary = ({ sppItems, otherItems }) => {
  const allItems = [...sppItems, ...otherItems];

  return {
    total_items: allItems.length,
    total_spp_items: sppItems.length,
    total_other_items: otherItems.length,
    paid_count: allItems.filter((item) => item.status === "paid").length,
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

router.get(
  "/parent/transactions/overview",
  authorize("parent"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const linkedStudents = await getLinkedParentStudents(db, req.user.id);

    if (linkedStudents.length === 0) {
      return res.status(404).json({
        message:
          "Akun orang tua belum terhubung ke data siswa. Hubungi admin sekolah.",
      });
    }

    const requestedStudentId = parseOptionalInt(req.query.student_id);
    const selectedStudent =
      linkedStudents.find(
        (item) => Number(item.student_id) === Number(requestedStudentId),
      ) || linkedStudents[0];

    const periodes = await getStudentPeriodes(
      db,
      selectedStudent.homebase_id,
      selectedStudent.student_id,
    );
    const requestedPeriodeId = parseOptionalInt(req.query.periode_id);
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

    const [sppItems, otherItems] = await Promise.all([
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
    ]);

    const children = await Promise.all(
      linkedStudents.map(async (student) => {
        const childPeriodes = await getStudentPeriodes(
          db,
          student.homebase_id,
          student.student_id,
        );
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
        summary: buildSummary({ sppItems, otherItems }),
        spp_items: sppItems,
        other_items: otherItems,
      },
    });
  }),
);

router.get(
  "/parent/transactions/invoices/:invoiceId",
  authorize("parent"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const invoiceId = parseOptionalInt(req.params.invoiceId);

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
            COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
          FROM finance.invoice_item ii
          LEFT JOIN finance.fee_component fc ON fc.id = ii.component_id
          LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
          LEFT JOIN finance.payment p ON p.id = pa.payment_id
          WHERE ii.invoice_id = $1
          GROUP BY ii.id, fc.name
          ORDER BY
            CASE WHEN ii.item_type = 'spp' THEN 0 ELSE 1 END,
            ii.bill_month ASC NULLS LAST,
            ii.id ASC
        `,
        [invoiceId],
      ),
      db.query(
        `
          SELECT
            p.id,
            p.payment_date,
            p.amount,
            p.payment_channel,
            p.reference_no,
            COALESCE(SUM(pa.allocated_amount), 0) AS allocated_amount
          FROM finance.payment p
          JOIN finance.payment_allocation pa ON pa.payment_id = p.id
          JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
          WHERE ii.invoice_id = $1
            AND p.status = 'paid'
          GROUP BY p.id
          ORDER BY p.payment_date DESC, p.id DESC
        `,
        [invoiceId],
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
    }));

    const totalDue = items.reduce(
      (sum, item) => sum + toCurrencyNumber(item.amount_due),
      0,
    );
    const totalPaid = items.reduce(
      (sum, item) => sum + toCurrencyNumber(item.paid_amount),
      0,
    );

    res.json({
      status: "success",
      data: {
        invoice: {
          id: Number(invoice.id),
          invoice_no: invoice.invoice_no,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          status: formatStatus(invoice.status),
          source_type: invoice.source_type,
          notes: invoice.notes,
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
