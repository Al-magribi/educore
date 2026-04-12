import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  MONTH_NAMES,
  parseOptionalInt,
  parseMonthArray,
  formatBillingPeriod,
  resolveScopedHomebaseId,
  buildEnrollmentWhereClause,
  ensureGradeAndPeriode,
  ensureStudentScope,
  ensureFinalFinanceTables,
  getOrCreateSppRule,
  getOrCreateInvoice,
  getParentPayerUserId,
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
        fc.id AS component_id,
        fc.name AS component_name
      FROM finance.fee_rule fr
      JOIN finance.fee_component fc ON fc.id = fr.component_id
      WHERE fr.homebase_id = $1
        AND fr.periode_id = $2
        AND fr.grade_id = $3
        AND fr.is_active = true
        AND fc.category = 'spp'
      ORDER BY fr.updated_at DESC, fr.id DESC
      LIMIT 1
    `,
    [homebaseId, periodeId, gradeId],
  );

  return result.rows[0] || null;
};

const getOrCreateSppInvoiceItem = async ({
  client,
  homebaseId,
  studentId,
  periodeId,
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

  const existingItem = await client.query(
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

  if (existingItem.rowCount > 0) {
    return existingItem.rows[0];
  }

  const createdItem = await client.query(
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

  return createdItem.rows[0];
};

router.get(
  "/monthly/options",
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
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const search = (req.query.search || "").trim();

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    const enrollmentScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      search,
    });

    const [homebaseResult, periodeResult, gradeResult, classResult, studentResult] =
      await Promise.all([
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
            ${buildEnrollmentWhereClause({
              homebaseId,
              periodeId,
              gradeId,
              classId: null,
              studentId: null,
              search: "",
            }).whereClause}
            ORDER BY g.name ASC, c.name ASC
          `,
          buildEnrollmentWhereClause({
            homebaseId,
            periodeId,
            gradeId,
            classId: null,
            studentId: null,
            search: "",
          }).params,
        ),
        db.query(
          `
            SELECT
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
            ORDER BY u.full_name ASC
            LIMIT 100
          `,
          enrollmentScope.params,
        ),
      ]);

    res.json({
      status: "success",
      data: {
        homebases: homebaseResult.rows,
        selected_homebase_id: homebaseId,
        periodes: periodeResult.rows.map((item) => ({
          ...item,
          is_default: item.is_active,
        })),
        grades: gradeResult.rows,
        classes: classResult.rows,
        students: studentResult.rows,
        months: MONTH_NAMES.map((name, index) => ({
          value: index + 1,
          label: name,
        })),
      },
    });
  }),
);

router.get(
  "/monthly/students",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const search = (req.query.search || "").trim();
    const scope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      search,
    });

    const result = await db.query(
      `
        SELECT
          s.user_id AS id,
          u.full_name,
          s.nis,
          e.periode_id,
          p.name AS periode_name,
          c.id AS class_id,
          c.name AS class_name,
          g.id AS grade_id,
          g.name AS grade_name
        FROM u_class_enrollments e
        JOIN u_students s ON s.user_id = e.student_id
        JOIN u_users u ON u.id = s.user_id
        JOIN a_class c ON c.id = e.class_id
        JOIN a_grade g ON g.id = c.grade_id
        JOIN a_periode p ON p.id = e.periode_id
        ${scope.whereClause}
        ORDER BY u.full_name ASC
        LIMIT 100
      `,
      scope.params,
    );

    res.json({ status: "success", data: result.rows });
  }),
);

router.get(
  "/monthly/tariffs",
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
    const gradeId = parseOptionalInt(req.query.grade_id);

    const params = [homebaseId];
    let whereClause = `WHERE fr.homebase_id = $1 AND fc.category = 'spp'`;

    if (periodeId) {
      params.push(periodeId);
      whereClause += ` AND fr.periode_id = $${params.length}`;
    }

    if (gradeId) {
      params.push(gradeId);
      whereClause += ` AND fr.grade_id = $${params.length}`;
    }

    const result = await db.query(
      `
        SELECT
          fr.id,
          fr.homebase_id,
          hb.name AS homebase_name,
          fr.periode_id,
          fr.grade_id,
          fr.amount,
          fc.name AS description,
          fr.is_active,
          fr.created_at,
          fr.updated_at,
          p.name AS periode_name,
          g.name AS grade_name
        FROM finance.fee_rule fr
        JOIN finance.fee_component fc ON fc.id = fr.component_id
        JOIN a_homebase hb ON hb.id = fr.homebase_id
        JOIN a_periode p ON p.id = fr.periode_id
        JOIN a_grade g ON g.id = fr.grade_id
        ${whereClause}
        ORDER BY p.is_active DESC, p.created_at DESC, g.name ASC
      `,
      params,
    );

    res.json({ status: "success", data: result.rows });
  }),
);

router.post(
  "/monthly/tariffs",
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
    const gradeId = parseOptionalInt(req.body.grade_id);
    const amount = Number(req.body.amount);
    const description = (req.body.description || "SPP").trim();

    if (!homebaseId || !periodeId || !gradeId || Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: "Data tarif SPP belum lengkap" });
    }

    const scopeCheck = await ensureGradeAndPeriode(client, homebaseId, periodeId, gradeId);
    if (scopeCheck.error) {
      return res.status(404).json({ message: scopeCheck.error });
    }

    const existing = await getSppRule(client, homebaseId, periodeId, gradeId);
    if (existing) {
      return res.status(409).json({
        message: "Tarif SPP untuk satuan, periode, dan tingkat ini sudah ada",
      });
    }

    const { ruleId } = await getOrCreateSppRule(client, {
      homebaseId,
      periodeId,
      gradeId,
      amount,
      createdBy: userId,
      description,
    });

    res.status(201).json({
      status: "success",
      message: "Tarif SPP berhasil ditambahkan",
      data: { id: ruleId },
    });
  }),
);

router.put(
  "/monthly/tariffs/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const tariffId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const amount = Number(req.body.amount);
    const isActive = req.body.is_active !== false;

    if (!tariffId || !homebaseId || !periodeId || !gradeId || Number.isNaN(amount)) {
      return res.status(400).json({ message: "Data tarif tidak lengkap" });
    }

    const currentTariff = await client.query(
      `
        SELECT fr.id
        FROM finance.fee_rule fr
        JOIN finance.fee_component fc ON fc.id = fr.component_id
        WHERE fr.id = $1
          AND fr.homebase_id = $2
          AND fc.category = 'spp'
      `,
      [tariffId, homebaseId],
    );

    if (currentTariff.rowCount === 0) {
      return res.status(404).json({ message: "Tarif SPP tidak ditemukan" });
    }

    const duplicateCheck = await client.query(
      `
        SELECT fr.id
        FROM finance.fee_rule fr
        JOIN finance.fee_component fc ON fc.id = fr.component_id
        WHERE fr.homebase_id = $1
          AND fr.periode_id = $2
          AND fr.grade_id = $3
          AND fc.category = 'spp'
          AND fr.id <> $4
        LIMIT 1
      `,
      [homebaseId, periodeId, gradeId, tariffId],
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Tarif SPP untuk satuan, periode, dan tingkat ini sudah ada",
      });
    }

    await client.query(
      `
        UPDATE finance.fee_rule
        SET
          periode_id = $1,
          grade_id = $2,
          amount = $3,
          is_active = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `,
      [periodeId, gradeId, amount, isActive, tariffId],
    );

    res.json({ status: "success", message: "Tarif SPP berhasil diperbarui" });
  }),
);

router.delete(
  "/monthly/tariffs/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const tariffId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;

    const linkedItem = await client.query(
      `SELECT id FROM finance.invoice_item WHERE fee_rule_id = $1 LIMIT 1`,
      [tariffId],
    );

    if (linkedItem.rowCount > 0) {
      return res.status(409).json({
        message: "Tarif SPP sudah dipakai pada tagihan dan tidak dapat dihapus",
      });
    }

    const result = await client.query(
      `DELETE FROM finance.fee_rule WHERE id = $1 AND homebase_id = $2`,
      [tariffId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Tarif SPP tidak ditemukan" });
    }

    res.json({ status: "success", message: "Tarif SPP berhasil dihapus" });
  }),
);

router.get(
  "/monthly/payments",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const billMonth = parseOptionalInt(req.query.bill_month) || 1;
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
        WITH item_scope AS (
          SELECT
            inv.student_id,
            inv.periode_id,
            ii.id AS invoice_item_id,
            ii.bill_month,
            ii.amount,
            COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
          FROM finance.invoice inv
          JOIN finance.invoice_item ii ON ii.invoice_id = inv.id
          LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
          LEFT JOIN finance.payment p ON p.id = pa.payment_id
          WHERE inv.homebase_id = $1
            AND ii.item_type = 'spp'
          GROUP BY inv.student_id, inv.periode_id, ii.id
        ),
        paid_history AS (
          SELECT
            inv.student_id,
            inv.periode_id,
            ARRAY_REMOVE(
              ARRAY_AGG(DISTINCT ii.bill_month ORDER BY ii.bill_month)
                FILTER (
                  WHERE COALESCE(paid.paid_amount, 0) >= ii.amount
                    AND ii.bill_month IS NOT NULL
                ),
              NULL
            ) AS paid_months
          FROM finance.invoice inv
          JOIN finance.invoice_item ii ON ii.invoice_id = inv.id
          LEFT JOIN item_scope paid ON paid.invoice_item_id = ii.id
          WHERE inv.homebase_id = $1
            AND ii.item_type = 'spp'
          GROUP BY inv.student_id, inv.periode_id
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
          fr.id AS tariff_id,
          COALESCE(fr.amount, 0) AS amount,
          item.invoice_item_id,
          item.paid_amount,
          COALESCE(ph.paid_months, '{}') AS paid_months
        FROM u_class_enrollments e
        JOIN u_students s ON s.user_id = e.student_id
        JOIN u_users u ON u.id = s.user_id
        JOIN a_class c ON c.id = e.class_id
        JOIN a_grade g ON g.id = c.grade_id
        JOIN a_periode p ON p.id = e.periode_id
        LEFT JOIN finance.fee_rule fr
          ON fr.homebase_id = e.homebase_id
          AND fr.periode_id = e.periode_id
          AND fr.grade_id = g.id
          AND fr.is_active = true
        LEFT JOIN finance.fee_component fc
          ON fc.id = fr.component_id
          AND fc.category = 'spp'
        LEFT JOIN item_scope item
          ON item.student_id = s.user_id
          AND item.periode_id = e.periode_id
          AND item.bill_month = $${scope.params.length + 1}
        LEFT JOIN paid_history ph
          ON ph.student_id = s.user_id
          AND ph.periode_id = e.periode_id
        ${scope.whereClause}
        ORDER BY u.full_name ASC
      `,
      [...scope.params, billMonth],
    );

    const data = result.rows.map((item) => {
      const amount = Number(item.amount || 0);
      const paidAmount = Number(item.paid_amount || 0);
      let status = "unpaid";
      if (paidAmount >= amount && amount > 0) {
        status = "paid";
      } else if (paidAmount > 0) {
        status = "partial";
      }

      return {
        id: item.invoice_item_id,
        student_id: item.student_id,
        student_name: item.student_name,
        nis: item.nis,
        periode_id: item.periode_id,
        periode_name: item.periode_name,
        class_id: item.class_id,
        class_name: item.class_name,
        grade_id: item.grade_id,
        grade_name: item.grade_name,
        bill_month: billMonth,
        billing_period_label: formatBillingPeriod(billMonth),
        amount,
        paid_amount: paidAmount,
        status,
        paid_months: (item.paid_months || []).sort((a, b) => a - b),
      };
    });

    res.json({
      status: "success",
      data,
      summary: {
        total_records: data.length,
        total_amount: data.reduce((sum, item) => sum + item.amount, 0),
        paid_count: data.filter((item) => item.status === "paid").length,
        partial_count: data.filter((item) => item.status === "partial").length,
        unpaid_count: data.filter((item) => item.status === "unpaid").length,
      },
    });
  }),
);

router.post(
  "/monthly/payments",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const billMonths = [...new Set(parseMonthArray(req.body.bill_months))].sort(
      (left, right) => left - right,
    );
    const paymentMethod = (req.body.payment_method || "").trim() || "Tunai";
    const notes = (req.body.notes || "").trim() || null;
    const bankAccountId = parseOptionalInt(req.body.bank_account_id);
    const paymentDate = req.body.payment_date || new Date().toISOString();

    if (!periodeId || !gradeId || !studentId || billMonths.length === 0) {
      return res.status(400).json({ message: "Data pembayaran SPP belum lengkap" });
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

    const rule = await getSppRule(client, homebaseId, periodeId, gradeId);
    if (!rule) {
      return res.status(404).json({
        message: "Tarif SPP aktif belum tersedia untuk periode dan tingkat ini",
      });
    }

    const allocations = [];
    for (const month of billMonths) {
      const item = await getOrCreateSppInvoiceItem({
        client,
        homebaseId,
        studentId,
        periodeId,
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
      message: "Pembayaran SPP berhasil ditambahkan",
      data: { id: paymentId },
    });
  }),
);

router.put(
  "/monthly/payments/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const paymentId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId, id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const billMonths = [...new Set(parseMonthArray(req.body.bill_months))].sort(
      (left, right) => left - right,
    );
    const paymentMethod = (req.body.payment_method || "").trim() || "Tunai";
    const notes = (req.body.notes || "").trim() || null;
    const bankAccountId = parseOptionalInt(req.body.bank_account_id);
    const paymentDate = req.body.payment_date || new Date().toISOString();

    if (!paymentId || !periodeId || !gradeId || !studentId || billMonths.length === 0) {
      return res.status(400).json({ message: "Data pembayaran SPP belum lengkap" });
    }

    const existing = await client.query(
      `
        SELECT id
        FROM finance.payment
        WHERE id = $1 AND homebase_id = $2
      `,
      [paymentId, homebaseId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Data pembayaran SPP tidak ditemukan" });
    }

    const rule = await getSppRule(client, homebaseId, periodeId, gradeId);
    if (!rule) {
      return res.status(404).json({
        message: "Tarif SPP aktif belum tersedia untuk periode dan tingkat ini",
      });
    }

    const oldInvoiceIds = await client.query(
      `
        SELECT DISTINCT ii.invoice_id
        FROM finance.payment_allocation pa
        JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        WHERE pa.payment_id = $1
      `,
      [paymentId],
    );

    await client.query(`DELETE FROM finance.payment_allocation WHERE payment_id = $1`, [paymentId]);

    const allocations = [];
    for (const month of billMonths) {
      const item = await getOrCreateSppInvoiceItem({
        client,
        homebaseId,
        studentId,
        periodeId,
        billMonth: month,
        rule,
        createdBy: userId,
      });

      const paidWithoutCurrent = await client.query(
        `
          SELECT COALESCE(SUM(pa.allocated_amount), 0) AS paid_amount
          FROM finance.payment_allocation pa
          JOIN finance.payment p ON p.id = pa.payment_id
          WHERE pa.invoice_item_id = $1
            AND p.status = 'paid'
        `,
        [item.id],
      );

      const outstanding =
        Number(item.amount || 0) - Number(paidWithoutCurrent.rows[0]?.paid_amount || 0);

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

    for (const allocation of allocations) {
      await client.query(
        `
          INSERT INTO finance.payment_allocation (payment_id, invoice_item_id, allocated_amount)
          VALUES ($1, $2, $3)
        `,
        [paymentId, allocation.invoice_item_id, allocation.allocated_amount],
      );
    }

    const methodType = detectManualMethod(paymentMethod, bankAccountId);
    const methodResult = await client.query(
      `
        SELECT id
        FROM finance.payment_method
        WHERE homebase_id = $1 AND method_type = $2 AND lower(name) = lower($3)
        LIMIT 1
      `,
      [homebaseId, methodType, paymentMethod],
    );

    let methodId = methodResult.rows[0]?.id || null;
    if (!methodId) {
      const createdMethod = await client.query(
        `
          INSERT INTO finance.payment_method (homebase_id, method_type, name)
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [homebaseId, methodType, paymentMethod],
      );
      methodId = createdMethod.rows[0].id;
    }

    const payerUserId = await getParentPayerUserId(client, studentId, userId);
    await client.query(
      `
        UPDATE finance.payment
        SET
          student_id = $1,
          payer_user_id = $2,
          method_id = $3,
          bank_account_id = $4,
          payment_channel = $5,
          payment_date = $6,
          amount = $7,
          notes = $8,
          verified_by = $9,
          verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
      `,
      [
        studentId,
        payerUserId,
        methodId,
        bankAccountId,
        paymentMethod,
        paymentDate,
        allocations.reduce((sum, item) => sum + item.allocated_amount, 0),
        notes,
        userId,
        paymentId,
      ],
    );

    for (const row of oldInvoiceIds.rows) {
      await client.query(
        `
          UPDATE finance.invoice
          SET updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [row.invoice_id],
      );
    }

    res.json({ status: "success", message: "Pembayaran SPP berhasil diperbarui" });
  }),
);

router.delete(
  "/monthly/payments/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const paymentId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;

    const invoiceIds = await client.query(
      `
        SELECT DISTINCT ii.invoice_id
        FROM finance.payment_allocation pa
        JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        JOIN finance.payment p ON p.id = pa.payment_id
        WHERE p.id = $1 AND p.homebase_id = $2
      `,
      [paymentId, homebaseId],
    );

    const result = await client.query(
      `DELETE FROM finance.payment WHERE id = $1 AND homebase_id = $2`,
      [paymentId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Data pembayaran SPP tidak ditemukan" });
    }

    res.json({ status: "success", message: "Pembayaran SPP berhasil dihapus" });
  }),
);

export default router;
