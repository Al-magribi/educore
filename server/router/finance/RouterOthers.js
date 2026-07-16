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
  ensurePeriode,
  ensureStudentsInPeriode,
  ensureStudentScope,
  ensureFinalFinanceTables,
  getOrCreateComponent,
  slugCode,
  getOrCreateInvoice,
  getParentPayerUserId,
  createManualPayment,
  resolveOtherChargeRule,
} from "./financeHelpers.js";

const router = Router();
const SUCCESS_PAYMENT_STATUSES = ["confirmed", "paid"];
const OTHER_TYPE_SCOPES = new Set(["grade", "student"]);

const normalizeOtherTypeScope = (value) => {
  const scope = String(value || "grade")
    .trim()
    .toLowerCase();
  return OTHER_TYPE_SCOPES.has(scope) ? scope : "grade";
};

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
        fc.description,
        COALESCE(fc.scope, 'grade') AS scope,
        fc.is_active,
        COALESCE(MAX(fr.amount), 0) AS amount,
        COALESCE(MAX(fa.periode_id), MAX(fr.periode_id)) AS periode_id,
        COALESCE(MAX(p_assign.name), MAX(p_rule.name)) AS periode_name,
        COALESCE(ARRAY_AGG(DISTINCT fr.grade_id) FILTER (WHERE fr.grade_id IS NOT NULL), '{}') AS grade_ids,
        COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS grade_names,
        COALESCE(ARRAY_AGG(DISTINCT fa.student_id) FILTER (WHERE fa.student_id IS NOT NULL), '{}') AS student_ids,
        COALESCE(ARRAY_AGG(DISTINCT su.full_name) FILTER (WHERE su.full_name IS NOT NULL), '{}') AS student_names,
        COUNT(DISTINCT fa.student_id) FILTER (WHERE fa.is_active = true)::int AS student_count,
        MAX(fc.created_at) AS created_at,
        MAX(fc.updated_at) AS updated_at
      FROM finance.fee_component fc
      LEFT JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
      LEFT JOIN a_grade g ON g.id = fr.grade_id
      LEFT JOIN a_periode p_rule ON p_rule.id = fr.periode_id
      LEFT JOIN finance.fee_assignment fa
        ON fa.component_id = fc.id
        AND fa.is_active = true
      LEFT JOIN a_periode p_assign ON p_assign.id = fa.periode_id
      LEFT JOIN u_users su ON su.id = fa.student_id
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

const replaceOtherTypeGradeRules = async ({
  client,
  componentId,
  homebaseId,
  periodeId,
  gradeIds,
  amount,
  isActive,
  createdBy = null,
}) => {
  await client.query(`DELETE FROM finance.fee_rule WHERE component_id = $1`, [
    componentId,
  ]);

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
        VALUES ($1, $2, $3, $4, 'once', $5, $6, $7)
      `,
      [componentId, homebaseId, gradeId, periodeId, amount, isActive, createdBy],
    );
  }
};

const replaceOtherTypeStudentRules = async ({
  client,
  componentId,
  homebaseId,
  periodeId,
  studentIds,
  amount,
  isActive,
  createdBy = null,
}) => {
  await client.query(`DELETE FROM finance.fee_rule WHERE component_id = $1`, [
    componentId,
  ]);
  await client.query(`DELETE FROM finance.fee_assignment WHERE component_id = $1`, [
    componentId,
  ]);

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
      VALUES ($1, $2, NULL, $3, 'once', $4, $5, $6)
    `,
    [componentId, homebaseId, periodeId, amount, isActive, createdBy],
  );

  for (const studentId of studentIds) {
    await client.query(
      `
        INSERT INTO finance.fee_assignment (
          component_id,
          homebase_id,
          periode_id,
          student_id,
          amount,
          is_active,
          created_by
        )
        VALUES ($1, $2, $3, $4, NULL, $5, $6)
      `,
      [componentId, homebaseId, periodeId, studentId, isActive, createdBy],
    );
  }
};

const getBilledStudentIdsForType = async (client, typeId) => {
  const result = await client.query(
    `
      SELECT DISTINCT inv.student_id
      FROM finance.invoice_item ii
      JOIN finance.invoice inv ON inv.id = ii.invoice_id
      WHERE ii.component_id = $1
        AND ii.item_type = 'other'
    `,
    [typeId],
  );

  return new Set(result.rows.map((row) => Number(row.student_id)));
};

const getTypeChargePaymentStats = async (client, typeId) => {
  const result = await client.query(
    `
      SELECT
        ii.id AS charge_id,
        inv.student_id,
        COALESCE(
          SUM(
            CASE
              WHEN p.status = ANY($2::text[]) THEN pa.allocated_amount
              ELSE 0
            END
          ),
          0
        ) AS paid_amount
      FROM finance.invoice_item ii
      JOIN finance.invoice inv ON inv.id = ii.invoice_id
      LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
      LEFT JOIN finance.payment p ON p.id = pa.payment_id
      WHERE ii.component_id = $1
        AND ii.item_type = 'other'
      GROUP BY ii.id, inv.student_id
    `,
    [typeId, SUCCESS_PAYMENT_STATUSES],
  );

  const rows = result.rows.map((row) => ({
    charge_id: Number(row.charge_id),
    student_id: Number(row.student_id),
    paid_amount: Number(row.paid_amount || 0),
  }));

  return {
    rows,
    maxPaidAmount: rows.reduce(
      (max, row) => Math.max(max, row.paid_amount),
      0,
    ),
    paidStudentIds: new Set(
      rows.filter((row) => row.paid_amount > 0).map((row) => row.student_id),
    ),
  };
};

const syncUnpaidOtherChargeAmounts = async (client, typeId, amount) => {
  const stats = await getTypeChargePaymentStats(client, typeId);

  for (const row of stats.rows) {
    if (row.paid_amount > amount) {
      continue;
    }

    await client.query(
      `
        UPDATE finance.invoice_item
        SET unit_amount = $1
        WHERE id = $2
          AND item_type = 'other'
      `,
      [amount, row.charge_id],
    );
  }

  return stats;
};

const getOtherRuleForGrade = async (db, componentId, homebaseId, gradeId, periodeId = null) => {
  const result = await db.query(
    `
      SELECT id, amount
      FROM finance.fee_rule
      WHERE component_id = $1
        AND homebase_id = $2
        AND grade_id = $3
        AND is_active = true
        AND ($4::int IS NULL OR periode_id = $4 OR periode_id IS NULL)
      ORDER BY CASE WHEN periode_id = $4 THEN 0 ELSE 1 END, id DESC
      LIMIT 1
    `,
    [componentId, homebaseId, gradeId, periodeId],
  );

  return result.rows[0] || null;
};

const getOtherBaseRule = async (db, componentId, homebaseId, periodeId) => {
  const result = await db.query(
    `
      SELECT id, amount
      FROM finance.fee_rule
      WHERE component_id = $1
        AND homebase_id = $2
        AND grade_id IS NULL
        AND is_active = true
        AND (periode_id = $3 OR periode_id IS NULL)
      ORDER BY CASE WHEN periode_id = $3 THEN 0 ELSE 1 END, id DESC
      LIMIT 1
    `,
    [componentId, homebaseId, periodeId],
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
        COALESCE(
          SUM(
            CASE
              WHEN p.status = ANY($3::text[]) THEN pa.allocated_amount
              ELSE 0
            END
          ),
          0
        ) AS paid_amount
      FROM finance.invoice_item ii
      LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
      LEFT JOIN finance.payment p ON p.id = pa.payment_id
      WHERE ii.invoice_id = $1
        AND ii.item_type = 'other'
        AND ii.component_id = $2
      GROUP BY ii.id
      LIMIT 1
    `,
    [invoice.id, componentId, SUCCESS_PAYMENT_STATUSES],
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
    const studentLimit = Math.min(
      Math.max(parseOptionalInt(req.query.limit) || 100, 1),
      500,
    );

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
            LIMIT ${studentLimit}
          `,
          enrollmentScope.params,
        ),
        db.query(
          `
            SELECT
              fc.id AS type_id,
              fc.name,
              fc.code,
              fc.description,
              COALESCE(fc.scope, 'grade') AS scope,
              fc.is_active,
              COALESCE(MAX(fr.amount), 0) AS amount,
              COALESCE(MAX(fa.periode_id), MAX(fr.periode_id)) AS periode_id,
              COALESCE(MAX(p_assign.name), MAX(p_rule.name)) AS periode_name,
              COALESCE(ARRAY_AGG(DISTINCT fr.grade_id) FILTER (WHERE fr.grade_id IS NOT NULL), '{}') AS grade_ids,
              COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS grade_names,
              COALESCE(ARRAY_AGG(DISTINCT fa.student_id) FILTER (WHERE fa.student_id IS NOT NULL), '{}') AS student_ids,
              COALESCE(ARRAY_AGG(DISTINCT su.full_name) FILTER (WHERE su.full_name IS NOT NULL), '{}') AS student_names,
              COUNT(DISTINCT fa.student_id) FILTER (WHERE fa.is_active = true)::int AS student_count
            FROM finance.fee_component fc
            LEFT JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
            LEFT JOIN a_grade g ON g.id = fr.grade_id
            LEFT JOIN a_periode p_rule ON p_rule.id = fr.periode_id
            LEFT JOIN finance.fee_assignment fa
              ON fa.component_id = fc.id
              AND fa.is_active = true
            LEFT JOIN a_periode p_assign ON p_assign.id = fa.periode_id
            LEFT JOIN u_users su ON su.id = fa.student_id
            WHERE fc.homebase_id = $1
              AND fc.category = 'other'
              ${
                periodeId
                  ? `AND (
                      EXISTS (
                        SELECT 1 FROM finance.fee_rule frf
                        WHERE frf.component_id = fc.id AND frf.periode_id = $2
                      )
                      OR EXISTS (
                        SELECT 1 FROM finance.fee_assignment faf
                        WHERE faf.component_id = fc.id AND faf.periode_id = $2
                      )
                    )`
                  : ""
              }
            GROUP BY fc.id
            ORDER BY fc.is_active DESC, fc.name ASC
          `,
          periodeId ? [homebaseId, periodeId] : [homebaseId],
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
    const homebaseId = req.user.homebase_id
      ? Number(req.user.homebase_id)
      : requestedHomebaseId
        ? await resolveScopedHomebaseId(db, req.user, requestedHomebaseId)
        : null;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const params = [];
    let whereClause = `WHERE fc.category = 'other'`;

    if (homebaseId) {
      params.push(homebaseId);
      whereClause += ` AND fc.homebase_id = $${params.length}`;
    }

    if (periodeId) {
      params.push(periodeId);
      whereClause += ` AND (
        EXISTS (
          SELECT 1 FROM finance.fee_rule frf
          WHERE frf.component_id = fc.id AND frf.periode_id = $${params.length}
        )
        OR EXISTS (
          SELECT 1 FROM finance.fee_assignment faf
          WHERE faf.component_id = fc.id AND faf.periode_id = $${params.length}
        )
      )`;
    }

    const result = await db.query(
      `
        SELECT
          fc.id AS type_id,
          fc.homebase_id,
          hb.name AS homebase_name,
          fc.name,
          fc.code,
          fc.description,
          COALESCE(fc.scope, 'grade') AS scope,
          fc.is_active,
          fc.created_at,
          fc.updated_at,
          COALESCE(MAX(fr.amount), 0) AS amount,
          COUNT(DISTINCT ii.id)::int AS charge_count,
          COALESCE(MAX(fa.periode_id), MAX(fr.periode_id)) AS periode_id,
          COALESCE(MAX(p_assign.name), MAX(p_rule.name)) AS periode_name,
          COALESCE(ARRAY_AGG(DISTINCT fr.grade_id) FILTER (WHERE fr.grade_id IS NOT NULL), '{}') AS grade_ids,
          COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS grade_names,
          COALESCE(ARRAY_AGG(DISTINCT fa.student_id) FILTER (WHERE fa.student_id IS NOT NULL), '{}') AS student_ids,
          COALESCE(ARRAY_AGG(DISTINCT su.full_name) FILTER (WHERE su.full_name IS NOT NULL), '{}') AS student_names,
          COUNT(DISTINCT fa.student_id) FILTER (WHERE fa.is_active = true)::int AS student_count
        FROM finance.fee_component fc
        LEFT JOIN finance.fee_rule fr ON fr.component_id = fc.id AND fr.is_active = true
        LEFT JOIN a_grade g ON g.id = fr.grade_id
        LEFT JOIN a_periode p_rule ON p_rule.id = fr.periode_id
        LEFT JOIN finance.fee_assignment fa
          ON fa.component_id = fc.id
          AND fa.is_active = true
        LEFT JOIN a_periode p_assign ON p_assign.id = fa.periode_id
        LEFT JOIN u_users su ON su.id = fa.student_id
        LEFT JOIN finance.invoice_item ii ON ii.component_id = fc.id AND ii.item_type = 'other'
        JOIN a_homebase hb ON hb.id = fc.homebase_id
        ${whereClause}
        GROUP BY fc.id, hb.id
        ORDER BY fc.is_active DESC, fc.name ASC
      `,
      params,
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
    const description = (req.body.description || "").trim() || null;
    const amount = Number(req.body.amount);
    const scope = normalizeOtherTypeScope(req.body.scope);
    const gradeIds = parseIntArray(req.body.grade_ids).sort(
      (left, right) => left - right,
    );
    const studentIds = parseIntArray(req.body.student_ids);
    const periodeId = parseOptionalInt(req.body.periode_id);
    const isActive = req.body.is_active !== false;

    if (!name || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Nama jenis pembayaran dan nominal wajib diisi",
      });
    }

    if (!periodeId) {
      return res.status(400).json({
        message: "Periode wajib dipilih untuk jenis pembayaran lainnya",
      });
    }

    const periodeCheck = await ensurePeriode(client, homebaseId, periodeId);
    if (periodeCheck.error) {
      return res.status(400).json({ message: periodeCheck.error });
    }

    let resolvedStudentIds = [];

    if (scope === "grade") {
      if (gradeIds.length === 0) {
        return res.status(400).json({
          message: "Minimal satu tingkat wajib dipilih untuk cakupan tingkat",
        });
      }

      for (const gradeId of gradeIds) {
        const gradeCheck = await client.query(
          `SELECT id FROM a_grade WHERE id = $1 AND homebase_id = $2`,
          [gradeId, homebaseId],
        );
        if (gradeCheck.rowCount === 0) {
          return res.status(400).json({
            message: "Ada tingkat yang tidak valid pada satuan ini",
          });
        }
      }
    } else {
      const studentsCheck = await ensureStudentsInPeriode(
        client,
        homebaseId,
        periodeId,
        studentIds,
      );
      if (studentsCheck.error) {
        return res.status(400).json({ message: studentsCheck.error });
      }

      resolvedStudentIds = studentsCheck.studentIds;
    }

    const duplicateCheck = await client.query(
      `
        SELECT fc.id
        FROM finance.fee_component fc
        WHERE fc.homebase_id = $1
          AND fc.category = 'other'
          AND lower(fc.name) = lower($2)
          AND (
            EXISTS (
              SELECT 1 FROM finance.fee_rule fr
              WHERE fr.component_id = fc.id AND fr.periode_id = $3
            )
            OR EXISTS (
              SELECT 1 FROM finance.fee_assignment fa
              WHERE fa.component_id = fc.id AND fa.periode_id = $3
            )
          )
        LIMIT 1
      `,
      [homebaseId, name, periodeId],
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Jenis pembayaran dengan nama yang sama sudah ada pada periode ini",
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

    await client.query(
      `
        UPDATE finance.fee_component
        SET
          name = $1,
          description = $2,
          scope = $3,
          is_active = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `,
      [name, description, scope, isActive, component.id],
    );

    if (scope === "grade") {
      await client.query(
        `DELETE FROM finance.fee_assignment WHERE component_id = $1`,
        [component.id],
      );
      await replaceOtherTypeGradeRules({
        client,
        componentId: component.id,
        homebaseId,
        periodeId,
        gradeIds,
        amount,
        isActive,
        createdBy: userId,
      });
    } else {
      await replaceOtherTypeStudentRules({
        client,
        componentId: component.id,
        homebaseId,
        periodeId,
        studentIds: resolvedStudentIds,
        amount,
        isActive,
        createdBy: userId,
      });
    }

    res.status(201).json({
      status: "success",
      message: "Jenis pembayaran berhasil ditambahkan",
      data: { id: component.id, scope },
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
    const { id: userId } = req.user;
    const name = (req.body.name || "").trim();
    const description = (req.body.description || "").trim() || null;
    const amount = Number(req.body.amount);
    const scope = normalizeOtherTypeScope(req.body.scope);
    const gradeIds = parseIntArray(req.body.grade_ids).sort(
      (left, right) => left - right,
    );
    const studentIds = parseIntArray(req.body.student_ids);
    const periodeId = parseOptionalInt(req.body.periode_id);
    const isActive = req.body.is_active !== false;

    if (!typeId || !name || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Data jenis pembayaran belum lengkap" });
    }

    if (!periodeId) {
      return res.status(400).json({
        message: "Periode wajib dipilih untuk jenis pembayaran lainnya",
      });
    }

    const periodeCheck = await ensurePeriode(client, homebaseId, periodeId);
    if (periodeCheck.error) {
      return res.status(400).json({ message: periodeCheck.error });
    }

    const current = await getOtherTypeById(client, homebaseId, typeId);
    if (!current) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    const currentScope = normalizeOtherTypeScope(current.scope);
    const billedStudentIds = await getBilledStudentIdsForType(client, typeId);
    const chargeStats = await getTypeChargePaymentStats(client, typeId);
    const hasCharges = billedStudentIds.size > 0;

    if (amount < chargeStats.maxPaidAmount) {
      return res.status(409).json({
        message: `Nominal tidak boleh lebih kecil dari pembayaran yang sudah masuk (maks. Rp ${chargeStats.maxPaidAmount.toLocaleString("id-ID")})`,
      });
    }

    if (scope !== currentScope && hasCharges) {
      return res.status(409).json({
        message:
          "Cakupan jenis pembayaran yang sudah dipakai pada tagihan tidak dapat diubah",
      });
    }

    if (
      Number(current.periode_id) &&
      Number(current.periode_id) !== Number(periodeId) &&
      hasCharges
    ) {
      return res.status(409).json({
        message:
          "Periode jenis pembayaran yang sudah dipakai pada tagihan tidak dapat diubah",
      });
    }

    let resolvedStudentIds = [];

    if (scope === "grade") {
      if (gradeIds.length === 0) {
        return res.status(400).json({
          message: "Minimal satu tingkat wajib dipilih untuk cakupan tingkat",
        });
      }

      for (const gradeId of gradeIds) {
        const gradeCheck = await client.query(
          `SELECT id FROM a_grade WHERE id = $1 AND homebase_id = $2`,
          [gradeId, homebaseId],
        );
        if (gradeCheck.rowCount === 0) {
          return res.status(400).json({
            message: "Ada tingkat yang tidak valid pada satuan ini",
          });
        }
      }

      if (hasCharges) {
        const currentGradeIds = new Set(
          (current.grade_ids || []).map((item) => Number(item)),
        );
        const nextGradeIds = new Set(gradeIds.map((item) => Number(item)));
        const removedGrades = [...currentGradeIds].filter(
          (item) => !nextGradeIds.has(item),
        );

        if (removedGrades.length > 0) {
          return res.status(409).json({
            message:
              "Tingkat yang sudah dipakai pada tagihan tidak dapat dihapus dari jenis biaya",
          });
        }
      }
    } else {
      const studentsCheck = await ensureStudentsInPeriode(
        client,
        homebaseId,
        periodeId,
        studentIds,
      );
      if (studentsCheck.error) {
        return res.status(400).json({ message: studentsCheck.error });
      }

      resolvedStudentIds = studentsCheck.studentIds;
      const nextStudentIds = new Set(resolvedStudentIds);
      const removedBilled = [...billedStudentIds].filter(
        (studentId) => !nextStudentIds.has(studentId),
      );
      if (removedBilled.length > 0) {
        const removedPaid = removedBilled.filter((studentId) =>
          chargeStats.paidStudentIds.has(studentId),
        );
        return res.status(409).json({
          message:
            removedPaid.length > 0
              ? "Siswa yang sudah membayar tidak dapat dihapus dari daftar jenis biaya"
              : "Siswa yang sudah punya tagihan pada jenis ini tidak dapat dihapus dari daftar",
        });
      }
    }

    const duplicateCheck = await client.query(
      `
        SELECT fc.id
        FROM finance.fee_component fc
        WHERE fc.homebase_id = $1
          AND fc.category = 'other'
          AND fc.id <> $2
          AND lower(fc.name) = lower($3)
          AND (
            EXISTS (
              SELECT 1 FROM finance.fee_rule fr
              WHERE fr.component_id = fc.id AND fr.periode_id = $4
            )
            OR EXISTS (
              SELECT 1 FROM finance.fee_assignment fa
              WHERE fa.component_id = fc.id AND fa.periode_id = $4
            )
          )
        LIMIT 1
      `,
      [homebaseId, typeId, name, periodeId],
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        message: "Jenis pembayaran dengan nama yang sama sudah ada pada periode ini",
      });
    }

    await client.query(
      `
        UPDATE finance.fee_component
        SET
          name = $1,
          description = $2,
          scope = $3,
          is_active = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `,
      [name, description, scope, isActive, typeId],
    );

    if (scope === "grade") {
      await client.query(
        `DELETE FROM finance.fee_assignment WHERE component_id = $1`,
        [typeId],
      );
      await replaceOtherTypeGradeRules({
        client,
        componentId: typeId,
        homebaseId,
        periodeId,
        gradeIds,
        amount,
        isActive,
        createdBy: userId,
      });
    } else {
      await replaceOtherTypeStudentRules({
        client,
        componentId: typeId,
        homebaseId,
        periodeId,
        studentIds: resolvedStudentIds,
        amount,
        isActive,
        createdBy: userId,
      });
    }

    await syncUnpaidOtherChargeAmounts(client, typeId, amount);

    res.json({
      status: "success",
      message: "Jenis pembayaran berhasil diperbarui",
      data: { id: typeId, scope },
    });
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
      `
        SELECT
          ii.id,
          COALESCE(
            SUM(
              CASE
                WHEN p.status = ANY($2::text[]) THEN pa.allocated_amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount
        FROM finance.invoice_item ii
        LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
        LEFT JOIN finance.payment p ON p.id = pa.payment_id
        WHERE ii.component_id = $1
          AND ii.item_type = 'other'
        GROUP BY ii.id
        LIMIT 1
      `,
      [typeId, SUCCESS_PAYMENT_STATUSES],
    );

    if (itemCheck.rowCount > 0) {
      const hasPaid = Number(itemCheck.rows[0].paid_amount || 0) > 0;
      return res.status(409).json({
        message: hasPaid
          ? "Jenis pembayaran yang sudah ada pembayaran tidak dapat dihapus"
          : "Jenis pembayaran yang sudah dipakai pada tagihan tidak dapat dihapus",
      });
    }

    await client.query(`DELETE FROM finance.fee_assignment WHERE component_id = $1`, [
      typeId,
    ]);
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
    const homebaseId = req.user.homebase_id
      ? Number(req.user.homebase_id)
      : requestedHomebaseId
        ? await resolveScopedHomebaseId(db, req.user, requestedHomebaseId)
        : null;
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const studentId = parseOptionalInt(req.query.student_id);
    const typeId = parseOptionalInt(req.query.type_id);
    const status = (req.query.status || "").trim();
    const search = (req.query.search || "").trim();

    const scope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      studentId,
      search,
    });
    const typeScopeWhereClause = homebaseId
      ? `WHERE fc.homebase_id = $1
            AND fc.category = 'other'
            AND fc.is_active = true`
      : `WHERE fc.category = 'other'
            AND fc.is_active = true`;
    const typeIdFilter = typeId
      ? ` AND fc.id = $${scope.params.length + 1}`
      : "";
    const itemScopeWhereClause = homebaseId
      ? `WHERE inv.homebase_id = $1`
      : `WHERE 1=1`;
    const successStatusParamIndex = scope.params.length + (typeId ? 2 : 1);

    const result = await db.query(
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
          ${scope.whereClause}
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
          ${typeScopeWhereClause}${typeIdFilter}
            AND COALESCE(fc.scope, 'grade') = 'grade'
            AND fr.grade_id IS NOT NULL
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
          ${typeScopeWhereClause}${typeIdFilter}
            AND COALESCE(fc.scope, 'grade') = 'student'
        ),
        type_scope AS (
          SELECT * FROM grade_type_scope
          UNION ALL
          SELECT * FROM student_type_scope
        ),
        item_scope AS (
          SELECT
            inv.homebase_id,
            inv.student_id,
            inv.periode_id,
            ii.id AS charge_id,
            ii.invoice_id,
            ii.component_id,
            ii.amount AS amount_due,
            ii.description,
            COALESCE(
              SUM(
                CASE
                  WHEN p.status = ANY($${successStatusParamIndex}::text[]) THEN pa.allocated_amount
                  ELSE 0
                END
              ),
              0
            ) AS paid_amount
          FROM finance.invoice inv
          JOIN finance.invoice_item ii ON ii.invoice_id = inv.id AND ii.item_type = 'other'
          LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
          LEFT JOIN finance.payment p ON p.id = pa.payment_id
          ${itemScopeWhereClause}
          GROUP BY inv.homebase_id, inv.student_id, inv.periode_id, ii.id
        )
        SELECT
          item.charge_id,
          COALESCE(item.homebase_id, es.homebase_id) AS homebase_id,
          es.periode_id,
          es.periode_name,
          ts.type_id,
          ts.scope AS type_scope,
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
      typeId
        ? [...scope.params, typeId, SUCCESS_PAYMENT_STATUSES]
        : [...scope.params, SUCCESS_PAYMENT_STATUSES],
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
            AND p.status = ANY($2::text[])
          ORDER BY p.payment_date DESC, p.id DESC
        `,
        [chargeIds, SUCCESS_PAYMENT_STATUSES],
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

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId || req.user.homebase_id,
    );
    const { id: userId } = req.user;
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const typeId = parseOptionalInt(req.body.type_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const notes = (req.body.notes || "").trim() || null;

    if (!periodeId || !typeId || !studentId) {
      return res.status(400).json({ message: "Data tagihan pembayaran lainnya belum lengkap" });
    }

    const type = await getOtherTypeById(client, homebaseId, typeId);
    if (!type) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    const typeScope = normalizeOtherTypeScope(type.scope);
    let resolvedGradeId = gradeId;

    if (typeScope === "student") {
      const studentsCheck = await ensureStudentsInPeriode(
        client,
        homebaseId,
        periodeId,
        [studentId],
      );
      if (studentsCheck.error) {
        return res.status(404).json({ message: studentsCheck.error });
      }

      if (
        Number(type.periode_id) &&
        Number(type.periode_id) !== Number(periodeId)
      ) {
        return res.status(400).json({
          message: "Periode tagihan tidak sesuai dengan periode jenis biaya",
        });
      }
    } else {
      if (!resolvedGradeId) {
        return res.status(400).json({
          message: "Tingkat wajib dipilih untuk jenis biaya berbasis tingkat",
        });
      }

      const scopeCheck = await ensureGradeAndPeriode(
        client,
        homebaseId,
        periodeId,
        resolvedGradeId,
      );
      if (scopeCheck.error) {
        return res.status(404).json({ message: scopeCheck.error });
      }

      const studentCheck = await ensureStudentScope(
        client,
        homebaseId,
        studentId,
        periodeId,
        resolvedGradeId,
      );
      if (studentCheck.error) {
        return res.status(404).json({ message: studentCheck.error });
      }
    }

    const rule = await resolveOtherChargeRule(client, {
      homebaseId,
      periodeId,
      gradeId: resolvedGradeId,
      componentId: typeId,
      studentId,
    });

    if (!rule) {
      return res.status(400).json({
        message:
          typeScope === "student"
            ? "Siswa tidak termasuk dalam daftar jenis pembayaran ini"
            : "Jenis pembayaran ini tidak berlaku untuk tingkat yang dipilih",
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
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId || req.user.homebase_id,
    );
    const periodeId = parseOptionalInt(req.body.periode_id);
    const gradeId = parseOptionalInt(req.body.grade_id);
    const typeId = parseOptionalInt(req.body.type_id);
    const studentId = parseOptionalInt(req.body.student_id);
    const notes = (req.body.notes || "").trim() || null;

    if (!chargeId || !periodeId || !typeId || !studentId) {
      return res.status(400).json({ message: "Data tagihan pembayaran lainnya belum lengkap" });
    }

    const chargeResult = await client.query(
      `
        SELECT
          ii.id,
          ii.invoice_id,
          ii.amount,
          COALESCE(
            SUM(
              CASE
                WHEN p.status = ANY($3::text[]) THEN pa.allocated_amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount
        FROM finance.invoice_item ii
        JOIN finance.invoice inv ON inv.id = ii.invoice_id
        LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
        LEFT JOIN finance.payment p ON p.id = pa.payment_id
        WHERE ii.id = $1
          AND inv.homebase_id = $2
        GROUP BY ii.id
        LIMIT 1
      `,
      [chargeId, homebaseId, SUCCESS_PAYMENT_STATUSES],
    );

    if (chargeResult.rowCount === 0) {
      return res.status(404).json({ message: "Tagihan pembayaran lainnya tidak ditemukan" });
    }

    const type = await getOtherTypeById(client, homebaseId, typeId);
    if (!type) {
      return res.status(404).json({ message: "Jenis pembayaran tidak ditemukan" });
    }

    const typeScope = normalizeOtherTypeScope(type.scope);
    if (typeScope === "grade" && !gradeId) {
      return res.status(400).json({
        message: "Tingkat wajib dipilih untuk jenis biaya berbasis tingkat",
      });
    }

    const rule = await resolveOtherChargeRule(client, {
      homebaseId,
      periodeId,
      gradeId,
      componentId: typeId,
      studentId,
    });

    if (!rule) {
      return res.status(404).json({
        message:
          typeScope === "student"
            ? "Siswa tidak termasuk dalam daftar jenis pembayaran ini"
            : "Jenis pembayaran tidak ditemukan untuk tingkat tersebut",
      });
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
          COALESCE(
            SUM(
              CASE
                WHEN p.status = ANY($3::text[]) THEN pa.allocated_amount
                ELSE 0
              END
            ),
            0
          ) AS paid_amount
        FROM finance.invoice_item ii
        JOIN finance.invoice inv ON inv.id = ii.invoice_id
        LEFT JOIN finance.payment_allocation pa ON pa.invoice_item_id = ii.id
        LEFT JOIN finance.payment p ON p.id = pa.payment_id
        WHERE ii.id = $1
          AND inv.homebase_id = $2
        GROUP BY ii.id, inv.id
        LIMIT 1
      `,
      [chargeId, homebaseId, SUCCESS_PAYMENT_STATUSES],
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
              AND p2.status = ANY($3::text[])
              AND p2.id <> p.id
          ), 0) AS paid_without_current
        FROM finance.payment p
        JOIN finance.payment_allocation pa ON pa.payment_id = p.id
        JOIN finance.invoice_item ii ON ii.id = pa.invoice_item_id
        WHERE p.id = $1
          AND p.homebase_id = $2
        LIMIT 1
      `,
      [paymentId, homebaseId, SUCCESS_PAYMENT_STATUSES],
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
