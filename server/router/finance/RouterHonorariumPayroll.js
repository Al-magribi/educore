import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  parseAmount,
  parseOptionalInt,
  resolveScopedHomebaseId,
} from "./financeHelpers.js";
import { prepareHonorHomebase } from "./RouterHonorarium.js";
import {
  calcPayrollLineTotals,
  generateHonorPayroll,
  getPayrollDetail,
  normalizePayrollPeriod,
  recalcHonorPayroll,
  refreshPayrollGrandTotal,
} from "../../services/finance/honorariumPayroll.js";

const router = Router();
const HONOR_ROLES = ["keuangan", "pusat", "finance"];

const assertDraft = (payroll) => {
  if (!payroll) {
    return { error: "Payroll tidak ditemukan", status: 404 };
  }
  if (payroll.status === "locked") {
    return {
      error: "Payroll sudah di-lock dan tidak bisa diubah",
      status: 409,
    };
  }
  return null;
};

router.get(
  "/honorarium/payrolls",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    await prepareHonorHomebase(db, homebaseId, req.user?.id || null);

    const year = parseOptionalInt(req.query.year);
    const status = String(req.query.status || "").trim().toLowerCase();

    const params = [homebaseId];
    let whereClause = `WHERE p.homebase_id = $1`;

    if (year) {
      params.push(year);
      whereClause += ` AND p.year = $${params.length}`;
    }

    if (status === "draft" || status === "locked") {
      params.push(status);
      whereClause += ` AND p.status = $${params.length}`;
    }

    const result = await db.query(
      `
        SELECT
          p.*,
          pe.name AS periode_name,
          COUNT(l.id)::int AS line_count
        FROM finance.honor_payroll_period p
        LEFT JOIN a_periode pe ON pe.id = p.periode_id
        LEFT JOIN finance.honor_payroll_line l ON l.payroll_id = p.id
        ${whereClause}
        GROUP BY p.id, pe.name
        ORDER BY p.year DESC, p.month DESC, p.id DESC
      `,
      params,
    );

    res.json({
      status: "success",
      data: result.rows.map(normalizePayrollPeriod),
    });
  }),
);

router.get(
  "/honorarium/payrolls/:id",
  authorize(...HONOR_ROLES),
  withQuery(async (req, res, db) => {
    const payrollId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!payrollId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    await prepareHonorHomebase(db, homebaseId, req.user?.id || null);

    const detail = await getPayrollDetail(db, payrollId, homebaseId);
    if (!detail) {
      return res.status(404).json({ message: "Payroll tidak ditemukan" });
    }

    res.json({
      status: "success",
      data: detail,
    });
  }),
);

router.post(
  "/honorarium/payrolls/generate",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    await prepareHonorHomebase(client, homebaseId, req.user?.id || null);

    const now = new Date();
    const year = parseOptionalInt(req.body.year) || now.getFullYear();
    const month = parseOptionalInt(req.body.month) || now.getMonth() + 1;
    const jamMode =
      String(req.body.jam_mode || "mati").trim().toLowerCase() === "hidup"
        ? "hidup"
        : "mati";
    const periodeId = parseOptionalInt(req.body.periode_id);
    const replace = Boolean(req.body.replace);

    const result = await generateHonorPayroll({
      db: client,
      homebaseId,
      year,
      month,
      jamMode,
      periodeId,
      userId: req.user.id,
      replace,
    });

    if (result.error) {
      return res.status(result.status || 400).json({
        message: result.error,
        data: result.data || null,
      });
    }

    const detail = await getPayrollDetail(client, result.data.id, homebaseId);

    res.status(201).json({
      status: "success",
      message: replace
        ? "Payroll draft berhasil digenerate ulang"
        : "Payroll draft berhasil digenerate",
      data: detail,
      warnings: result.data.warnings || [],
    });
  }),
);

router.post(
  "/honorarium/payrolls/:id/recalc",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    const payrollId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(
      req.body.homebase_id || req.query.homebase_id,
    );
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!payrollId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    await prepareHonorHomebase(client, homebaseId, req.user?.id || null);

    const periodResult = await client.query(
      `
        SELECT *
        FROM finance.honor_payroll_period
        WHERE id = $1
          AND homebase_id = $2
        LIMIT 1
      `,
      [payrollId, homebaseId],
    );

    if (periodResult.rowCount === 0) {
      return res.status(404).json({ message: "Payroll tidak ditemukan" });
    }

    const result = await recalcHonorPayroll({
      db: client,
      payroll: periodResult.rows[0],
      userId: req.user.id,
      keepManualMoney: req.body.keep_manual_money !== false,
    });

    if (result.error) {
      return res.status(result.status || 400).json({ message: result.error });
    }

    const detail = await getPayrollDetail(client, payrollId, homebaseId);

    res.json({
      status: "success",
      message: "Payroll berhasil di-recalc dari LMS/attendance",
      data: detail,
      warnings: result.data.warnings || [],
    });
  }),
);

router.put(
  "/honorarium/payrolls/:id/lines/:lineId",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    const payrollId = parseOptionalInt(req.params.id);
    const lineId = parseOptionalInt(req.params.lineId);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!payrollId || !lineId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    await prepareHonorHomebase(client, homebaseId, req.user?.id || null);

    const periodResult = await client.query(
      `
        SELECT *
        FROM finance.honor_payroll_period
        WHERE id = $1
          AND homebase_id = $2
        LIMIT 1
      `,
      [payrollId, homebaseId],
    );

    const locked = assertDraft(periodResult.rows[0]);
    if (locked) {
      return res.status(locked.status).json({ message: locked.error });
    }

    const lineResult = await client.query(
      `
        SELECT *
        FROM finance.honor_payroll_line
        WHERE id = $1
          AND payroll_id = $2
          AND homebase_id = $3
        LIMIT 1
      `,
      [lineId, payrollId, homebaseId],
    );

    if (lineResult.rowCount === 0) {
      return res.status(404).json({ message: "Baris payroll tidak ditemukan" });
    }

    const current = lineResult.rows[0];
    const body = req.body || {};

    let jamFinal = Number(current.jam_final);
    let jamOverridden = Boolean(current.jam_overridden);
    if (body.jam_final !== undefined && body.jam_final !== null && body.jam_final !== "") {
      const parsed = parseAmount(body.jam_final);
      if (parsed === null || parsed < 0) {
        return res.status(400).json({ message: "Jam final tidak valid" });
      }
      jamFinal = parsed;
      jamOverridden = true;
    }
    if (body.reset_jam === true) {
      jamFinal = Number(current.jam_auto || 0);
      jamOverridden = false;
    }

    let hadirFinal = Number(current.hadir_final);
    let hadirOverridden = Boolean(current.hadir_overridden);
    if (
      body.hadir_final !== undefined &&
      body.hadir_final !== null &&
      body.hadir_final !== ""
    ) {
      const parsed = parseAmount(body.hadir_final);
      if (parsed === null || parsed < 0) {
        return res.status(400).json({ message: "Jumlah hadir tidak valid" });
      }
      hadirFinal = parsed;
      hadirOverridden = true;
    }
    if (body.reset_hadir === true) {
      hadirFinal = Number(current.hadir_auto || 0);
      hadirOverridden = false;
    }

    const rpPerJam =
      body.rp_per_jam !== undefined && body.rp_per_jam !== null && body.rp_per_jam !== ""
        ? parseAmount(body.rp_per_jam)
        : Number(current.rp_per_jam);
    const transportRate =
      body.transport_rate !== undefined &&
      body.transport_rate !== null &&
      body.transport_rate !== ""
        ? parseAmount(body.transport_rate)
        : Number(current.transport_rate);
    const tunjanganWaliKelas =
      body.tunjangan_wali_kelas !== undefined &&
      body.tunjangan_wali_kelas !== null &&
      body.tunjangan_wali_kelas !== ""
        ? parseAmount(body.tunjangan_wali_kelas)
        : Number(current.tunjangan_wali_kelas);
    const tunjanganJabatan =
      body.tunjangan_jabatan !== undefined &&
      body.tunjangan_jabatan !== null &&
      body.tunjangan_jabatan !== ""
        ? parseAmount(body.tunjangan_jabatan)
        : Number(current.tunjangan_jabatan);
    const gapok =
      body.gapok !== undefined && body.gapok !== null && body.gapok !== ""
        ? parseAmount(body.gapok)
        : Number(current.gapok);

    if (
      [rpPerJam, transportRate, tunjanganWaliKelas, tunjanganJabatan, gapok].some(
        (value) => value === null || value < 0,
      )
    ) {
      return res.status(400).json({ message: "Nominal komponen tidak valid" });
    }

    const notes =
      body.notes !== undefined
        ? String(body.notes || "").trim() || null
        : current.notes;

    const totals = calcPayrollLineTotals({
      jamFinal,
      hadirFinal,
      rpPerJam,
      transportRate,
      tunjanganWaliKelas,
      tunjanganJabatan,
      gapok,
    });

    await client.query(
      `
        UPDATE finance.honor_payroll_line
        SET
          jam_final = $1,
          jam_overridden = $2,
          hadir_final = $3,
          hadir_overridden = $4,
          rp_per_jam = $5,
          transport_rate = $6,
          tunjangan_wali_kelas = $7,
          tunjangan_jabatan = $8,
          gapok = $9,
          honor_mengajar = $10,
          jumlah_transport = $11,
          total_penerimaan = $12,
          notes = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $14
      `,
      [
        jamFinal,
        jamOverridden,
        hadirFinal,
        hadirOverridden,
        rpPerJam,
        transportRate,
        tunjanganWaliKelas,
        tunjanganJabatan,
        gapok,
        totals.honor_mengajar,
        totals.jumlah_transport,
        totals.total_penerimaan,
        notes,
        lineId,
      ],
    );

    await client.query(
      `
        UPDATE finance.honor_payroll_period
        SET updated_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [req.user.id, payrollId],
    );

    await refreshPayrollGrandTotal(client, payrollId);
    const detail = await getPayrollDetail(client, payrollId, homebaseId);

    res.json({
      status: "success",
      message: "Baris payroll berhasil diperbarui",
      data: detail,
    });
  }),
);

router.post(
  "/honorarium/payrolls/:id/lock",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    const payrollId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(
      req.body.homebase_id || req.query.homebase_id,
    );
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!payrollId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    await prepareHonorHomebase(client, homebaseId, req.user?.id || null);

    const result = await client.query(
      `
        UPDATE finance.honor_payroll_period
        SET
          status = 'locked',
          locked_at = CURRENT_TIMESTAMP,
          locked_by = $1,
          updated_by = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND homebase_id = $3
          AND status = 'draft'
        RETURNING id
      `,
      [req.user.id, payrollId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Payroll draft tidak ditemukan atau sudah di-lock",
      });
    }

    const detail = await getPayrollDetail(client, payrollId, homebaseId);

    res.json({
      status: "success",
      message: "Payroll berhasil di-lock",
      data: detail,
    });
  }),
);

router.post(
  "/honorarium/payrolls/:id/unlock",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    const payrollId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(
      req.body.homebase_id || req.query.homebase_id,
    );
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!payrollId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    await prepareHonorHomebase(client, homebaseId, req.user?.id || null);

    const result = await client.query(
      `
        UPDATE finance.honor_payroll_period
        SET
          status = 'draft',
          locked_at = NULL,
          locked_by = NULL,
          updated_by = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND homebase_id = $3
          AND status = 'locked'
        RETURNING id
      `,
      [req.user.id, payrollId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Payroll terkunci tidak ditemukan",
      });
    }

    const detail = await getPayrollDetail(client, payrollId, homebaseId);

    res.json({
      status: "success",
      message: "Payroll dibuka kembali ke draft",
      data: detail,
    });
  }),
);

router.delete(
  "/honorarium/payrolls/:id",
  authorize(...HONOR_ROLES),
  withTransaction(async (req, res, client) => {
    const payrollId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!payrollId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    await prepareHonorHomebase(client, homebaseId, req.user?.id || null);

    const current = await client.query(
      `
        SELECT id, status
        FROM finance.honor_payroll_period
        WHERE id = $1
          AND homebase_id = $2
        LIMIT 1
      `,
      [payrollId, homebaseId],
    );

    if (current.rowCount === 0) {
      return res.status(404).json({ message: "Payroll tidak ditemukan" });
    }

    if (current.rows[0].status === "locked") {
      return res.status(409).json({
        message: "Payroll terkunci tidak bisa dihapus. Unlock terlebih dahulu.",
      });
    }

    await client.query(
      `
        DELETE FROM finance.honor_payroll_period
        WHERE id = $1
          AND homebase_id = $2
      `,
      [payrollId, homebaseId],
    );

    res.json({
      status: "success",
      message: "Payroll draft berhasil dihapus",
      data: { id: payrollId },
    });
  }),
);

export default router;
