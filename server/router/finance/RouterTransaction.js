import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  MONTH_NAMES,
  parseOptionalInt,
  parseMonthArray,
  formatBillingPeriod,
  buildEnrollmentWhereClause,
  ensureGradeAndPeriode,
  ensureStudentScope,
  ensureFinalFinanceTables,
  getParentPayerUserId,
  getPaymentMethodId,
  getOrCreateInvoice,
  createManualPayment,
} from "./financeHelpers.js";

const router = Router();

const detectManualMethod = (paymentMethod, bankAccountId) => {
  if (bankAccountId) {
    return "manual_bank";
  }

  const value = String(paymentMethod || "").toLowerCase();
  if (value.includes("bank") || value.includes("transfer")) {
    return "manual_bank";
  }

  return "manual_cash";
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
        AND fr.periode_id = $2
        AND fr.grade_id = $3
        AND fr.is_active = true
        AND fc.category = 'spp'
      LIMIT 1
    `,
    [homebaseId, periodeId, gradeId],
  );

  return result.rows[0] || null;
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

    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const search = (req.query.search || "").trim();

    const enrollmentScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      studentId,
      search,
    });

    const classScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId: null,
      studentId: null,
      search: "",
    });

    const [periodeResult, gradeResult, classResult, studentResult] = await Promise.all([
      db.query(
        `
          SELECT id, name, is_active
          FROM a_periode
          WHERE homebase_id = $1
          ORDER BY is_active DESC, created_at DESC
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT id, name
          FROM a_grade
          WHERE homebase_id = $1
          ORDER BY name ASC
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT DISTINCT c.id, c.name, g.id AS grade_id, g.name AS grade_name
          FROM u_class_enrollments e
          JOIN a_class c ON c.id = e.class_id
          JOIN a_grade g ON g.id = c.grade_id
          ${classScope.whereClause}
          ORDER BY g.name ASC, c.name ASC
        `,
        classScope.params,
      ),
      db.query(
        `
          SELECT *
          FROM (
            SELECT DISTINCT ON (s.user_id, e.periode_id)
              s.user_id AS id,
              u.full_name,
              s.nis,
              e.periode_id,
              c.id AS class_id,
              c.name AS class_name,
              g.id AS grade_id,
              g.name AS grade_name
            FROM u_class_enrollments e
            JOIN u_students s ON s.user_id = e.student_id
            JOIN u_users u ON u.id = s.user_id
            JOIN a_class c ON c.id = e.class_id
            JOIN a_grade g ON g.id = c.grade_id
            ${enrollmentScope.whereClause}
            ORDER BY s.user_id, e.periode_id, e.enrolled_at DESC, e.id DESC
          ) AS scoped_students
          ORDER BY grade_name ASC, class_name ASC, full_name ASC
        `,
        enrollmentScope.params,
      ),
    ]);

    let studentContext = null;
    let monthlyContext = { tariff_amount: 0, unpaid_months: [] };
    let otherCharges = [];

    if (periodeId && gradeId && studentId) {
      const studentCheck = await ensureStudentScope(
        db,
        homebaseId,
        studentId,
        periodeId,
        gradeId,
      );

      if (!studentCheck.error) {
        studentContext = studentCheck;

        const [ruleResult, paidMonthResult, otherChargeResult] = await Promise.all([
          getSppRule(db, homebaseId, periodeId, gradeId),
          db.query(
            `
              SELECT ii.bill_month
              FROM finance.invoice inv
              JOIN finance.invoice_item ii ON ii.invoice_id = inv.id
              LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
              LEFT JOIN finance.payment p ON p.id = pa.payment_id
              WHERE inv.homebase_id = $1
                AND inv.student_id = $2
                AND inv.periode_id = $3
                AND ii.item_type = 'spp'
              GROUP BY ii.id
              HAVING COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) >= ii.amount
            `,
            [homebaseId, studentId, periodeId],
          ),
          db.query(
            `
              SELECT
                ii.id AS charge_id,
                ii.component_id AS type_id,
                fc.name AS type_name,
                ii.amount AS amount_due,
                COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
              FROM finance.invoice inv
              JOIN finance.invoice_item ii ON ii.invoice_id = inv.id
              JOIN finance.fee_component fc ON fc.id = ii.component_id
              LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
              LEFT JOIN finance.payment p ON p.id = pa.payment_id
              WHERE inv.homebase_id = $1
                AND inv.student_id = $2
                AND inv.periode_id = $3
                AND ii.item_type = 'other'
              GROUP BY ii.id, fc.name
              ORDER BY fc.name ASC
            `,
            [homebaseId, studentId, periodeId],
          ),
        ]);

        const paidMonths = new Set(
          paidMonthResult.rows
            .map((item) => Number(item.bill_month))
            .filter((item) => item >= 1 && item <= 12),
        );

        monthlyContext = {
          tariff_amount: Number(ruleResult?.amount || 0),
          unpaid_months: MONTH_NAMES.map((label, index) => ({
            value: index + 1,
            label,
          })).filter((item) => !paidMonths.has(item.value)),
        };

        otherCharges = otherChargeResult.rows
          .map((item) => {
            const amountDue = Number(item.amount_due || 0);
            const paidAmount = Number(item.paid_amount || 0);
            return {
              charge_id: item.charge_id,
              type_id: item.type_id,
              type_name: item.type_name,
              amount_due: amountDue,
              paid_amount: paidAmount,
              remaining_amount: Math.max(amountDue - paidAmount, 0),
              status: paidAmount >= amountDue ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
            };
          })
          .filter((item) => item.remaining_amount > 0);
      }
    }

    res.json({
      status: "success",
      data: {
        periodes: periodeResult.rows.map((item) => ({
          ...item,
          is_default: item.is_active,
        })),
        grades: gradeResult.rows,
        classes: classResult.rows,
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

    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const page = Math.max(parseOptionalInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseOptionalInt(req.query.limit) || 10, 1), 100);
    const categoryFilter = (req.query.category || "").trim().toLowerCase();
    const search = (req.query.search || "").trim();

    const scope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      studentId,
      search,
    });

    const result = await db.query(
      `
        SELECT
          p.id,
          p.student_id,
          inv.periode_id,
          c.id AS class_id,
          g.id AS grade_id,
          p.amount,
          pm.name AS payment_method,
          p.notes,
          p.payment_date AS paid_at,
          u.full_name AS student_name,
          s.nis,
          c.name AS class_name,
          per.name AS periode_name,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT ii.bill_month ORDER BY ii.bill_month), NULL) AS bill_months,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT fc.name ORDER BY fc.name), NULL) AS item_names,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT ii.item_type ORDER BY ii.item_type), NULL) AS item_types
        FROM finance.payment p
        JOIN u_students s ON s.user_id = p.student_id
        JOIN u_users u ON u.id = s.user_id
        JOIN u_class_enrollments e
          ON e.student_id = p.student_id
          AND e.homebase_id = p.homebase_id
        JOIN a_class c ON c.id = e.class_id
        JOIN a_grade g ON g.id = c.grade_id
        LEFT JOIN finance.payment_method pm ON pm.id = p.method_id
        LEFT JOIN finance.payment_allocation pa ON pa.payment_id = p.id
        LEFT JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        LEFT JOIN finance.invoice inv ON inv.id = ii.invoice_id
        LEFT JOIN a_periode per ON per.id = inv.periode_id
        LEFT JOIN finance.fee_component fc ON fc.id = ii.component_id
        ${scope.whereClause.replace("WHERE e.homebase_id = $1", "WHERE p.homebase_id = $1")}
        GROUP BY p.id, c.id, g.id, u.full_name, s.nis, c.name, per.name, pm.name, inv.periode_id
        ORDER BY p.payment_date DESC, p.id DESC
      `,
      scope.params,
    );

    let data = result.rows.map((item) => {
      const itemTypes = item.item_types || [];
      let category = "mixed";
      if (itemTypes.length === 1 && itemTypes[0] === "spp") {
        category = "spp";
      } else if (itemTypes.length === 1 && itemTypes[0] === "other") {
        category = "other";
      }

      return {
        id: item.id,
        category,
        student_id: item.student_id,
        student_name: item.student_name,
        nis: item.nis,
        periode_id: item.periode_id,
        periode_name: item.periode_name,
        class_id: item.class_id,
        class_name: item.class_name,
        grade_id: item.grade_id,
        amount: Number(item.amount || 0),
        payment_method: item.payment_method,
        notes: item.notes,
        paid_at: item.paid_at,
        bill_months: (item.bill_months || []).sort((a, b) => a - b),
        item_names: item.item_names || [],
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
      pagination: {
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

    const { homebase_id: homebaseId, id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const paymentDate = req.body.payment_date || new Date().toISOString();
    const paymentMethod = (req.body.payment_method || "").trim() || "Tunai";
    const notes = (req.body.notes || "").trim() || null;
    const bankAccountId = parseOptionalInt(req.body.bank_account_id);
    const billMonths = parseMonthArray(req.body.bill_months).sort((left, right) => left - right);
    const otherPayments = Array.isArray(req.body.other_payments)
      ? req.body.other_payments
          .map((item) => ({
            charge_id: parseOptionalInt(item?.charge_id),
            amount_paid: Number(item?.amount_paid),
          }))
          .filter((item) => item.charge_id && !Number.isNaN(item.amount_paid))
      : [];

    if (!periodeId || !gradeId || !studentId) {
      return res.status(400).json({ message: "Periode, tingkat, dan siswa wajib diisi" });
    }

    if (billMonths.length === 0 && otherPayments.length === 0) {
      return res.status(400).json({
        message: "Pilih minimal satu pembayaran SPP atau pembayaran lainnya",
      });
    }

    const scopeCheck = await ensureGradeAndPeriode(client, homebaseId, periodeId, gradeId);
    if (scopeCheck.error) {
      return res.status(404).json({ message: scopeCheck.error });
    }

    const studentCheck = await ensureStudentScope(
      client,
      homebaseId,
      studentId,
      periodeId,
      gradeId,
    );
    if (studentCheck.error) {
      return res.status(404).json({ message: studentCheck.error });
    }

    const allocations = [];

    if (billMonths.length > 0) {
      const rule = await getSppRule(client, homebaseId, periodeId, gradeId);
      if (!rule) {
        return res.status(404).json({
          message: "Tarif SPP aktif belum tersedia untuk periode dan tingkat ini",
        });
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

        const outstanding = Number(item.amount || 0) - Number(item.paid_amount || 0);
        if (outstanding <= 0) {
          return res.status(409).json({
            message: `SPP untuk bulan ${formatBillingPeriod(month)} sudah tercatat lunas`,
          });
        }

        allocations.push({
          invoice_item_id: item.id,
          invoice_id: item.invoice_id,
          allocated_amount: outstanding,
        });
      }
    }

    for (const item of otherPayments) {
      const chargeResult = await client.query(
        `
          SELECT
            ii.id,
            ii.invoice_id,
            ii.amount,
            inv.student_id,
            inv.periode_id,
            COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
          FROM finance.invoice_item ii
          JOIN finance.invoice inv ON inv.id = ii.invoice_id
          LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
          LEFT JOIN finance.payment p ON p.id = pa.payment_id
          WHERE ii.id = $1
            AND inv.homebase_id = $2
          GROUP BY ii.id, inv.id
          LIMIT 1
        `,
        [item.charge_id, homebaseId],
      );

      if (chargeResult.rowCount === 0) {
        return res.status(404).json({
          message: `Tagihan pembayaran lainnya #${item.charge_id} tidak ditemukan`,
        });
      }

      const charge = chargeResult.rows[0];
      const remaining = Number(charge.amount || 0) - Number(charge.paid_amount || 0);
      if (charge.student_id !== studentId || charge.periode_id !== periodeId) {
        return res.status(400).json({
          message: "Tagihan pembayaran lainnya harus sesuai dengan siswa dan periode yang dipilih",
        });
      }

      if (item.amount_paid <= 0 || item.amount_paid > remaining) {
        return res.status(400).json({
          message: `Nominal pembayaran untuk tagihan #${item.charge_id} tidak valid`,
        });
      }

      allocations.push({
        invoice_item_id: charge.id,
        invoice_id: charge.invoice_id,
        allocated_amount: item.amount_paid,
      });
    }

    const payerUserId = await getParentPayerUserId(client, studentId, userId);
    const paymentId = await createManualPayment(client, {
      homebaseId,
      studentId,
      payerUserId,
      methodType: detectManualMethod(paymentMethod, bankAccountId),
      methodName: paymentMethod,
      bankAccountId,
      paymentChannel: paymentMethod,
      amount: allocations.reduce((sum, item) => sum + item.allocated_amount, 0),
      paymentDate,
      notes,
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
  "/transactions/:category/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const transactionId = parseOptionalInt(req.params.id);
    const paymentMethod = (req.body.payment_method || "").trim() || "Tunai";
    const paymentDate = req.body.payment_date || new Date().toISOString();
    const notes = (req.body.notes || "").trim() || null;
    const bankAccountId = parseOptionalInt(req.body.bank_account_id);

    if (!transactionId) {
      return res.status(400).json({ message: "Id transaksi tidak valid" });
    }

    const existing = await client.query(
      `
        SELECT p.id, p.student_id
        FROM finance.payment p
        WHERE p.id = $1 AND p.homebase_id = $2
      `,
      [transactionId, homebaseId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    const methodType = detectManualMethod(paymentMethod, bankAccountId);
    const methodId = await getPaymentMethodId(client, {
      homebaseId,
      methodType,
      name: paymentMethod,
    });

    const allocationSum = await client.query(
      `
        SELECT COALESCE(SUM(allocated_amount), 0) AS total_amount
        FROM finance.payment_allocation
        WHERE payment_id = $1
      `,
      [transactionId],
    );

    await client.query(
      `
        UPDATE finance.payment
        SET
          method_id = $1,
          bank_account_id = $2,
          payment_channel = $3,
          payment_date = $4,
          amount = $5,
          notes = $6,
          verified_by = $7,
          verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `,
      [
        methodId,
        bankAccountId,
        paymentMethod,
        paymentDate,
        Number(allocationSum.rows[0]?.total_amount || 0),
        notes,
        userId,
        transactionId,
      ],
    );

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

    const { homebase_id: homebaseId } = req.user;
    const transactionId = parseOptionalInt(req.params.id);

    if (!transactionId) {
      return res.status(400).json({ message: "Id transaksi tidak valid" });
    }

    const result = await client.query(
      `DELETE FROM finance.payment WHERE id = $1 AND homebase_id = $2`,
      [transactionId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Transaksi pembayaran berhasil dihapus",
    });
  }),
);

export default router;
