import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  parseOptionalInt,
  parseIntArray,
  parseAmount,
  resolveScopedHomebaseId,
  buildEnrollmentWhereClause,
  ensureGradeAndPeriode,
  ensureStudentScope,
  ensureFinalFinanceTables,
  getOrCreateComponent,
  slugCode,
  getOrCreateInvoice,
  getParentPayerUserId,
  createManualPayment,
} from "./financeHelpers.js";

const router = Router();

const formatChargeStatus = (status) => {
  const statusMap = {
    unpaid: "Belum Bayar",
    partial: "Cicilan",
    paid: "Lunas",
  };

  return statusMap[status] || "Belum Bayar";
};

const deriveChargeStatus = (amountDue, paidAmount) => {
  if (paidAmount >= amountDue && amountDue > 0) {
    return "paid";
  }

  if (paidAmount > 0) {
    return "partial";
  }

  return "unpaid";
};

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

const getOtherTypeById = async (db, homebaseId, typeId) => {
  const result = await db.query(
    `
      SELECT
        fc.id AS type_id,
        fc.homebase_id,
        fc.code,
        fc.name,
        fc.is_active,
        COALESCE(MAX(fr.amount), 0) AS amount,
        COALESCE(ARRAY_AGG(DISTINCT fr.grade_id) FILTER (WHERE fr.grade_id IS NOT NULL), '{}') AS grade_ids,
        COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS grade_names,
        MAX(fc.created_at) AS created_at,
        MAX(fc.updated_at) AS updated_at
      FROM finance.fee_component fc
      LEFT JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
      LEFT JOIN a_grade g ON g.id = fr.grade_id
      WHERE fc.homebase_id = $1
        AND fc.category = 'other'
        AND fc.id = $2
      GROUP BY fc.id
      LIMIT 1
    `,
    [homebaseId, typeId],
  );

  return result.rows[0] || null;
};

const getOtherRuleForGrade = async (db, componentId, homebaseId, gradeId) => {
  const result = await db.query(
    `
      SELECT id, amount
      FROM finance.fee_rule
      WHERE component_id = $1
        AND homebase_id = $2
        AND grade_id = $3
        AND is_active = true
      LIMIT 1
    `,
    [componentId, homebaseId, gradeId],
  );

  return result.rows[0] || null;
};

const getOrCreateOtherInvoiceItem = async ({
  client,
  homebaseId,
  periodeId,
  studentId,
  componentId,
  feeRuleId,
  amount,
  description,
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
        AND ii.item_type = 'other'
        AND ii.component_id = $2
      GROUP BY ii.id
      LIMIT 1
    `,
    [invoice.id, componentId],
  );

  if (existingItem.rowCount > 0) {
    return existingItem.rows[0];
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
    [invoice.id, componentId, feeRuleId, description, amount],
  );

  return created.rows[0];
};

router.get(
  "/others/options",
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

    const classScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId: null,
      studentId: null,
      search: "",
    });

    const [homebaseResult, periodeResult, gradeResult, classResult, studentResult, typeResult] =
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
            ${classScope.whereClause}
            ORDER BY g.name ASC, c.name ASC
          `,
          classScope.params,
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
        db.query(
          `
            SELECT
              fc.id AS type_id,
              fc.name,
              fc.code,
              fc.is_active,
              COALESCE(MAX(fr.amount), 0) AS amount,
              COALESCE(ARRAY_AGG(DISTINCT fr.grade_id) FILTER (WHERE fr.grade_id IS NOT NULL), '{}') AS grade_ids,
              COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS grade_names
            FROM finance.fee_component fc
            LEFT JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
            LEFT JOIN a_grade g ON g.id = fr.grade_id
            WHERE fc.homebase_id = $1
              AND fc.category = 'other'
            GROUP BY fc.id
            ORDER BY fc.is_active DESC, fc.name ASC
          `,
          [homebaseId],
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
        types: typeResult.rows,
      },
    });
  }),
);

router.get(
  "/others/types",
  authorize("satuan", "keuangan"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    const result = await db.query(
      `
        SELECT
          fc.id AS type_id,
          fc.homebase_id,
          hb.name AS homebase_name,
          fc.name,
          fc.code,
          fc.is_active,
          fc.created_at,
          fc.updated_at,
          COALESCE(MAX(fr.amount), 0) AS amount,
          COUNT(DISTINCT ii.id)::int AS charge_count,
          COALESCE(ARRAY_AGG(DISTINCT fr.grade_id) FILTER (WHERE fr.grade_id IS NOT NULL), '{}') AS grade_ids,
          COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS grade_names
        FROM finance.fee_component fc
        LEFT JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
        LEFT JOIN a_grade g ON g.id = fr.grade_id
        LEFT JOIN finance.invoice_item ii ON ii.component_id = fc.id AND ii.item_type = 'other'
        JOIN a_homebase hb ON hb.id = fc.homebase_id
        WHERE fc.homebase_id = $1
          AND fc.category = 'other'
        GROUP BY fc.id, hb.id
        ORDER BY fc.is_active DESC, fc.name ASC
      `,
      [homebaseId],
    );

    res.json({ status: "success", data: result.rows });
  }),
);

router.post(
  "/others/types",
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
    const name = (req.body.name || "").trim();
    const amount = Number(req.body.amount);
    const gradeIds = parseIntArray(req.body.grade_ids).sort((left, right) => left - right);
    const isActive = req.body.is_active !== false;

    if (!name || Number.isNaN(amount) || gradeIds.length === 0 || amount <= 0) {
      return res.status(400).json({
        message: "Nama jenis pembayaran, nominal, dan tingkat wajib diisi",
      });
    }

    const duplicateCheck = await client.query(
      `
        SELECT id
        FROM finance.fee_component
        WHERE homebase_id = $1
          AND category = 'other'
          AND lower(name) = lower($2)
        LIMIT 1
      `,
      [homebaseId, name],
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Jenis pembayaran dengan nama yang sama sudah ada",
      });
    }

    const component = await getOrCreateComponent(client, {
      homebaseId,
      code: slugCode(name),
      name,
      category: "other",
      chargeType: "once",
      createdBy: userId,
    });

    for (const gradeId of gradeIds) {
      await client.query(
        `
          INSERT INTO finance.fee_rule (
            component_id,
            homebase_id,
            grade_id,
            periode_id,
            billing_cycle,
            amount,
            is_active,
            created_by
          )
          VALUES ($1, $2, $3, NULL, 'once', $4, $5, $6)
        `,
        [component.id, homebaseId, gradeId, amount, isActive, userId],
      );
    }

    res.status(201).json({
      status: "success",
      message: "Jenis pembayaran berhasil ditambahkan",
      data: { id: component.id },
    });
  }),
);

router.put(
  "/others/types/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const typeId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const name = (req.body.name || "").trim();
    const amount = Number(req.body.amount);
    const gradeIds = parseIntArray(req.body.grade_ids).sort((left, right) => left - right);
    const isActive = req.body.is_active !== false;

    if (!typeId || !name || Number.isNaN(amount) || gradeIds.length === 0 || amount <= 0) {
      return res.status(400).json({ message: "Data jenis pembayaran belum lengkap" });
    }

    const current = await getOtherTypeById(client, homebaseId, typeId);
    if (!current) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    await client.query(
      `
        UPDATE finance.fee_component
        SET
          name = $1,
          is_active = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [name, isActive, typeId],
    );

    await client.query(`DELETE FROM finance.fee_rule WHERE component_id = $1`, [typeId]);
    for (const gradeId of gradeIds) {
      await client.query(
        `
          INSERT INTO finance.fee_rule (
            component_id,
            homebase_id,
            grade_id,
            periode_id,
            billing_cycle,
            amount,
            is_active
          )
          VALUES ($1, $2, $3, NULL, 'once', $4, $5)
        `,
        [typeId, homebaseId, gradeId, amount, isActive],
      );
    }

    res.json({ status: "success", message: "Jenis pembayaran berhasil diperbarui" });
  }),
);

router.delete(
  "/others/types/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const typeId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    const itemCheck = await client.query(
      `SELECT id FROM finance.invoice_item WHERE component_id = $1 LIMIT 1`,
      [typeId],
    );

    if (itemCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Jenis pembayaran yang sudah dipakai pada tagihan tidak dapat dihapus",
      });
    }

    await client.query(`DELETE FROM finance.fee_rule WHERE component_id = $1`, [typeId]);
    const result = await client.query(
      `
        DELETE FROM finance.fee_component
        WHERE id = $1 AND homebase_id = $2 AND category = 'other'
      `,
      [typeId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    res.json({ status: "success", message: "Jenis pembayaran berhasil dihapus" });
  }),
);

router.get(
  "/others/charges",
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
    const studentId = parseOptionalInt(req.query.student_id);
    const status = (req.query.status || "").trim();
    const search = (req.query.search || "").trim();

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

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
          ${scope.whereClause}
        ),
        type_scope AS (
          SELECT
            fc.id AS type_id,
            fc.name AS type_name,
            fr.grade_id,
            fr.amount,
            fr.id AS fee_rule_id
          FROM finance.fee_component fc
          JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
          WHERE fc.homebase_id = $1
            AND fc.category = 'other'
            AND fc.is_active = true
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
          GROUP BY inv.student_id, inv.periode_id, ii.id
        )
        SELECT
          item.charge_id,
          $1::int AS homebase_id,
          es.periode_id,
          ts.type_id,
          es.student_id,
          COALESCE(item.amount_due, ts.amount) AS amount_due,
          item.description AS notes,
          ts.type_name,
          es.student_name,
          es.nis,
          es.class_id,
          es.class_name,
          es.grade_id,
          es.grade_name,
          COALESCE(item.paid_amount, 0) AS paid_amount
        FROM enrollment_scope es
        JOIN type_scope ts ON ts.grade_id = es.grade_id
        LEFT JOIN item_scope item
          ON item.student_id = es.student_id
          AND item.periode_id = es.periode_id
          AND item.component_id = ts.type_id
        ORDER BY es.grade_name ASC, es.class_name ASC, es.student_name ASC, ts.type_name ASC
      `,
      scope.params,
    );

    const chargeIds = result.rows
      .map((item) => item.charge_id)
      .filter(Boolean);
    const installmentMap = new Map();

    if (chargeIds.length > 0) {
      const installmentResult = await db.query(
        `
          SELECT
            pa.invoice_item_id AS charge_id,
            p.id AS installment_id,
            pa.allocated_amount AS amount_paid,
            p.payment_date,
            pm.name AS payment_method,
            p.notes,
            processor.full_name AS processed_by_name
          FROM finance.payment_allocation pa
          JOIN finance.payment p ON p.id = pa.payment_id
          LEFT JOIN finance.payment_method pm ON pm.id = p.method_id
          LEFT JOIN u_users processor ON processor.id = p.created_by
          WHERE pa.invoice_item_id = ANY($1::bigint[])
            AND p.status = 'paid'
          ORDER BY p.payment_date DESC, p.id DESC
        `,
        [chargeIds],
      );

      for (const item of installmentResult.rows) {
        if (!installmentMap.has(item.charge_id)) {
          installmentMap.set(item.charge_id, []);
        }
        installmentMap.get(item.charge_id).push({
          ...item,
          amount_paid: Number(item.amount_paid || 0),
        });
      }
    }

    const data = result.rows.map((item) => {
      const amountDue = Number(item.amount_due || 0);
      const paidAmount = Number(item.paid_amount || 0);
      const remainingAmount = Math.max(amountDue - paidAmount, 0);
      const derivedStatus = deriveChargeStatus(amountDue, paidAmount);

      return {
        ...item,
        amount_due: amountDue,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        installment_count: (installmentMap.get(item.charge_id) || []).length,
        status: derivedStatus,
        status_label: formatChargeStatus(derivedStatus),
        installments: installmentMap.get(item.charge_id) || [],
      };
    });

    const filtered = status ? data.filter((item) => item.status === status) : data;

    res.json({
      status: "success",
      data: filtered,
      summary: {
        total_records: filtered.length,
        unpaid_count: filtered.filter((item) => item.status === "unpaid").length,
        partial_count: filtered.filter((item) => item.status === "partial").length,
        paid_count: filtered.filter((item) => item.status === "paid").length,
        total_due: filtered.reduce((sum, item) => sum + item.amount_due, 0),
        total_paid: filtered.reduce((sum, item) => sum + item.paid_amount, 0),
        total_remaining: filtered.reduce((sum, item) => sum + item.remaining_amount, 0),
      },
    });
  }),
);

router.post(
  "/others/charges",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const typeId = parseOptionalInt(req.body.type_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const notes = (req.body.notes || "").trim() || null;

    if (!periodeId || !gradeId || !typeId || !studentId) {
      return res.status(400).json({ message: "Data tagihan pembayaran lainnya belum lengkap" });
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

    const type = await getOtherTypeById(client, homebaseId, typeId);
    if (!type) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    const rule = await getOtherRuleForGrade(client, typeId, homebaseId, gradeId);
    if (!rule) {
      return res.status(400).json({
        message: "Jenis pembayaran ini tidak berlaku untuk tingkat yang dipilih",
      });
    }

    const item = await getOrCreateOtherInvoiceItem({
      client,
      homebaseId,
      periodeId,
      studentId,
      componentId: typeId,
      feeRuleId: rule.id,
      amount: Number(rule.amount || 0),
      description: notes || type.name,
      createdBy: userId,
    });

    if (Number(item.paid_amount || 0) >= Number(item.amount || 0)) {
      return res.status(409).json({
        message: "Tagihan untuk siswa dan jenis biaya ini sudah lunas",
      });
    }

    res.status(201).json({
      status: "success",
      message: "Tagihan pembayaran lainnya berhasil ditambahkan",
      data: { id: item.id },
    });
  }),
);

router.put(
  "/others/charges/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const chargeId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const typeId = parseOptionalInt(req.body.type_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const notes = (req.body.notes || "").trim() || null;

    if (!chargeId || !periodeId || !gradeId || !typeId || !studentId) {
      return res.status(400).json({ message: "Data tagihan pembayaran lainnya belum lengkap" });
    }

    const chargeResult = await client.query(
      `
        SELECT
          ii.id,
          ii.invoice_id,
          ii.amount,
          COALESCE(SUM(CASE WHEN p.status = 'paid' THEN pa.allocated_amount ELSE 0 END), 0) AS paid_amount
        FROM finance.invoice_item ii
        JOIN finance.invoice inv ON inv.id = ii.invoice_id
        LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
        LEFT JOIN finance.payment p ON p.id = pa.payment_id
        WHERE ii.id = $1
          AND inv.homebase_id = $2
        GROUP BY ii.id
        LIMIT 1
      `,
      [chargeId, homebaseId],
    );

    if (chargeResult.rowCount === 0) {
      return res.status(404).json({ message: "Tagihan pembayaran lainnya tidak ditemukan" });
    }

    const type = await getOtherTypeById(client, homebaseId, typeId);
    const rule = await getOtherRuleForGrade(client, typeId, homebaseId, gradeId);
    if (!type || !rule) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    const paidAmount = Number(chargeResult.rows[0].paid_amount || 0);
    const amountDue = Number(rule.amount || 0);
    if (amountDue < paidAmount) {
      return res.status(400).json({
        message: "Nominal tagihan tidak boleh lebih kecil dari total pembayaran yang sudah masuk",
      });
    }

    await client.query(
      `
        UPDATE finance.invoice
        SET
          student_id = $1,
          periode_id = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [studentId, periodeId, chargeResult.rows[0].invoice_id],
    );

    await client.query(
      `
        UPDATE finance.invoice_item
        SET
          component_id = $1,
          fee_rule_id = $2,
          description = $3,
          unit_amount = $4
        WHERE id = $5
      `,
      [typeId, rule.id, notes || type.name, amountDue, chargeId],
    );

    res.json({
      status: "success",
      message: "Tagihan pembayaran lainnya berhasil diperbarui",
    });
  }),
);

router.delete(
  "/others/charges/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const chargeId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    const chargeScope = await client.query(
      `
        SELECT ii.id
        FROM finance.invoice_item ii
        JOIN finance.invoice inv ON inv.id = ii.invoice_id
        WHERE ii.id = $1 AND inv.homebase_id = $2
      `,
      [chargeId, homebaseId],
    );

    if (chargeScope.rowCount === 0) {
      return res.status(404).json({ message: "Tagihan pembayaran lainnya tidak ditemukan" });
    }

    const paymentCheck = await client.query(
      `
        SELECT id
        FROM finance.payment_allocation
        WHERE invoice_item_id = $1
        LIMIT 1
      `,
      [chargeId],
    );

    if (paymentCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Tagihan yang sudah memiliki riwayat pembayaran tidak dapat dihapus",
      });
    }

    await client.query(`DELETE FROM finance.invoice_item WHERE id = $1`, [chargeId]);

    res.json({
      status: "success",
      message: "Tagihan pembayaran lainnya berhasil dihapus",
    });
  }),
);

router.post(
  "/others/installments",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const { homebase_id: homebaseId, id: userId } = req.user;
    const chargeId = parseOptionalInt(req.body.charge_id);
    const amountPaid = parseAmount(req.body.amount_paid);
    const paymentDate = req.body.payment_date || new Date().toISOString();
    const paymentMethod = (req.body.payment_method || "").trim() || "Tunai";
    const notes = (req.body.notes || "").trim() || null;
    const bankAccountId = parseOptionalInt(req.body.bank_account_id);

    if (!chargeId || amountPaid === null || amountPaid <= 0) {
      return res.status(400).json({ message: "Data pembayaran belum lengkap" });
    }

    const chargeScope = await client.query(
      `
        SELECT
          ii.id,
          ii.invoice_id,
          ii.amount,
          inv.student_id,
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
      [chargeId, homebaseId],
    );

    if (chargeScope.rowCount === 0) {
      return res.status(404).json({ message: "Tagihan pembayaran lainnya tidak ditemukan" });
    }

    const charge = chargeScope.rows[0];
    const remainingAmount =
      Number(charge.amount || 0) - Number(charge.paid_amount || 0);

    if (amountPaid > remainingAmount) {
      return res.status(400).json({
        message: "Nominal pembayaran melebihi sisa tagihan",
      });
    }

    const payerUserId = await getParentPayerUserId(client, charge.student_id, userId);
    const paymentId = await createManualPayment(client, {
      homebaseId,
      studentId: charge.student_id,
      payerUserId,
      methodType: detectManualMethod(paymentMethod, bankAccountId),
      methodName: paymentMethod,
      bankAccountId,
      paymentChannel: paymentMethod,
      amount: amountPaid,
      paymentDate,
      notes,
      createdBy: userId,
      verifiedBy: userId,
      allocations: [
        {
          invoice_item_id: chargeId,
          invoice_id: charge.invoice_id,
          allocated_amount: amountPaid,
        },
      ],
    });

    res.status(201).json({
      status: "success",
      message: "Pembayaran berhasil ditambahkan",
      data: { id: paymentId },
    });
  }),
);

router.put(
  "/others/installments/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const paymentId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId, id: userId } = req.user;
    const amountPaid = parseAmount(req.body.amount_paid);
    const paymentDate = req.body.payment_date || new Date().toISOString();
    const paymentMethod = (req.body.payment_method || "").trim() || "Tunai";
    const notes = (req.body.notes || "").trim() || null;
    const bankAccountId = parseOptionalInt(req.body.bank_account_id);

    if (!paymentId || amountPaid === null || amountPaid <= 0) {
      return res.status(400).json({ message: "Data pembayaran belum lengkap" });
    }

    const paymentScope = await client.query(
      `
        SELECT
          p.id,
          p.student_id,
          pa.invoice_item_id,
          ii.invoice_id,
          ii.amount AS total_due,
          COALESCE((
            SELECT SUM(pa2.allocated_amount)
            FROM finance.payment_allocation pa2
            JOIN finance.payment p2 ON p2.id = pa2.payment_id
            WHERE pa2.invoice_item_id = pa.invoice_item_id
              AND p2.status = 'paid'
              AND p2.id <> p.id
          ), 0) AS paid_without_current
        FROM finance.payment p
        JOIN finance.payment_allocation pa ON pa.payment_id = p.id
        JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        WHERE p.id = $1
          AND p.homebase_id = $2
        LIMIT 1
      `,
      [paymentId, homebaseId],
    );

    if (paymentScope.rowCount === 0) {
      return res.status(404).json({ message: "Riwayat pembayaran tidak ditemukan" });
    }

    const payment = paymentScope.rows[0];
    const remainingAmount =
      Number(payment.total_due || 0) - Number(payment.paid_without_current || 0);

    if (amountPaid > remainingAmount) {
      return res.status(400).json({
        message: "Nominal pembayaran melebihi sisa tagihan",
      });
    }

    const methodType = detectManualMethod(paymentMethod, bankAccountId);
    let methodId = null;
    const methodResult = await client.query(
      `
        SELECT id
        FROM finance.payment_method
        WHERE homebase_id = $1 AND method_type = $2 AND lower(name) = lower($3)
        LIMIT 1
      `,
      [homebaseId, methodType, paymentMethod],
    );

    if (methodResult.rowCount > 0) {
      methodId = methodResult.rows[0].id;
    } else {
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
      [methodId, bankAccountId, paymentMethod, paymentDate, amountPaid, notes, userId, paymentId],
    );

    await client.query(
      `
        UPDATE finance.payment_allocation
        SET allocated_amount = $1
        WHERE payment_id = $2
      `,
      [amountPaid, paymentId],
    );

    res.json({
      status: "success",
      message: "Riwayat pembayaran berhasil diperbarui",
    });
  }),
);

router.delete(
  "/others/installments/:id",
  authorize("satuan", "keuangan"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const paymentId = parseOptionalInt(req.params.id);
    const { homebase_id: homebaseId } = req.user;

    const result = await client.query(
      `DELETE FROM finance.payment WHERE id = $1 AND homebase_id = $2`,
      [paymentId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Riwayat pembayaran tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Riwayat pembayaran berhasil dihapus",
    });
  }),
);

export default router;
