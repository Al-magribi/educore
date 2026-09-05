import { buildHonorariumPreview } from "./honorariumPreview.js";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Normalize DATE / Date / ISO to YYYY-MM-DD (local calendar). */
export const toDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const matched = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (matched && !value.includes("T")) {
      return matched[1];
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calcPayrollLineTotals = ({
  jamFinal = 0,
  hadirFinal = 0,
  rpPerJam = 0,
  transportRate = 0,
  tunjanganWaliKelas = 0,
  tunjanganJabatan = 0,
  gapok = 0,
}) => {
  const honorMengajar = toNumber(jamFinal) * toNumber(rpPerJam);
  const jumlahTransport = toNumber(hadirFinal) * toNumber(transportRate);
  const total =
    honorMengajar +
    jumlahTransport +
    toNumber(tunjanganWaliKelas) +
    toNumber(tunjanganJabatan) +
    toNumber(gapok);

  return {
    honor_mengajar: honorMengajar,
    jumlah_transport: jumlahTransport,
    total_penerimaan: total,
  };
};

export const normalizePayrollPeriod = (row = {}) => ({
  ...row,
  id: Number(row.id || 0) || null,
  homebase_id: Number(row.homebase_id || 0) || null,
  periode_id: row.periode_id ? Number(row.periode_id) : null,
  year: Number(row.year || 0),
  month: Number(row.month || 0),
  start_date: toDateOnly(row.start_date),
  end_date: toDateOnly(row.end_date),
  teaching_rate: toNumber(row.teaching_rate),
  transport_rate: toNumber(row.transport_rate),
  homeroom_rate: toNumber(row.homeroom_rate),
  grand_total: toNumber(row.grand_total),
  line_count: Number(row.line_count || 0),
  created_by: row.created_by ? Number(row.created_by) : null,
  updated_by: row.updated_by ? Number(row.updated_by) : null,
  locked_by: row.locked_by ? Number(row.locked_by) : null,
});

export const normalizePayrollLine = (row = {}) => ({
  ...row,
  id: Number(row.id || 0) || null,
  payroll_id: Number(row.payroll_id || 0) || null,
  homebase_id: Number(row.homebase_id || 0) || null,
  assignment_id: row.assignment_id ? Number(row.assignment_id) : null,
  unit_id: row.unit_id ? Number(row.unit_id) : null,
  position_id: row.position_id ? Number(row.position_id) : null,
  teacher_id: row.teacher_id ? Number(row.teacher_id) : null,
  staff_id: row.staff_id ? Number(row.staff_id) : null,
  unit_sort_order: Number(row.unit_sort_order || 0),
  jam_mati: toNumber(row.jam_mati),
  jam_hidup: toNumber(row.jam_hidup),
  jam_auto: toNumber(row.jam_auto),
  jam_final: toNumber(row.jam_final),
  jam_overridden: Boolean(row.jam_overridden),
  hadir_auto: toNumber(row.hadir_auto),
  hadir_final: toNumber(row.hadir_final),
  hadir_overridden: Boolean(row.hadir_overridden),
  rp_per_jam: toNumber(row.rp_per_jam),
  transport_rate: toNumber(row.transport_rate),
  is_homeroom: Boolean(row.is_homeroom),
  honor_mengajar: toNumber(row.honor_mengajar),
  jumlah_transport: toNumber(row.jumlah_transport),
  tunjangan_wali_kelas: toNumber(row.tunjangan_wali_kelas),
  tunjangan_jabatan: toNumber(row.tunjangan_jabatan),
  gapok: toNumber(row.gapok),
  total_penerimaan: toNumber(row.total_penerimaan),
  sort_order: Number(row.sort_order || 0),
});

export const groupPayrollLinesByUnit = (lines = []) => {
  const byUnitMap = new Map();

  for (const line of lines) {
    const key = String(line.unit_id || line.unit_name || "other");
    if (!byUnitMap.has(key)) {
      byUnitMap.set(key, {
        unit_id: line.unit_id,
        unit_name: line.unit_name,
        unit_code: line.unit_code,
        unit_sort_order: line.unit_sort_order || 0,
        lines: [],
        subtotal: 0,
      });
    }
    const group = byUnitMap.get(key);
    group.lines.push(line);
    group.subtotal += toNumber(line.total_penerimaan);
  }

  return Array.from(byUnitMap.values())
    .sort((a, b) => a.unit_sort_order - b.unit_sort_order)
    .map((unit) => ({
      ...unit,
      lines: unit.lines.map((line, index) => ({ ...line, no: index + 1 })),
      subtotal: toNumber(unit.subtotal),
    }));
};

const insertPayrollLines = async (db, payrollId, homebaseId, previewLines, jamMode) => {
  let sortOrder = 0;
  for (const line of previewLines) {
    sortOrder += 1;
    await db.query(
      `
        INSERT INTO finance.honor_payroll_line (
          payroll_id,
          homebase_id,
          assignment_id,
          unit_id,
          position_id,
          person_type,
          teacher_id,
          staff_id,
          person_name,
          person_nip,
          unit_name,
          unit_code,
          unit_sort_order,
          position_name,
          subjects_text,
          jam_mode,
          jam_mati,
          jam_hidup,
          jam_auto,
          jam_final,
          jam_overridden,
          hadir_auto,
          hadir_final,
          hadir_overridden,
          rp_per_jam,
          transport_rate,
          is_homeroom,
          honor_mengajar,
          jumlah_transport,
          tunjangan_wali_kelas,
          tunjangan_jabatan,
          gapok,
          total_penerimaan,
          notes,
          sort_order
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          false,$21,$22,false,$23,$24,$25,$26,$27,$28,$29,$30,$31,NULL,$32
        )
      `,
      [
        payrollId,
        homebaseId,
        line.assignment_id,
        line.unit_id,
        line.position_id,
        line.person_type,
        line.teacher_id,
        line.staff_id,
        line.person_name,
        line.person_nip,
        line.unit_name,
        line.unit_code,
        line.unit_sort_order || 0,
        line.position_name,
        line.subjects_text || "",
        jamMode,
        line.jam_mati || 0,
        line.jam_hidup || 0,
        line.jam_auto || 0,
        line.jam_final || 0,
        line.hadir_auto || 0,
        line.hadir_final || 0,
        line.rp_per_jam || 0,
        line.transport_rate || 0,
        Boolean(line.is_homeroom),
        line.honor_mengajar || 0,
        line.jumlah_transport || 0,
        line.tunjangan_wali_kelas || 0,
        line.tunjangan_jabatan || 0,
        line.gapok || 0,
        line.total_penerimaan || 0,
        sortOrder,
      ],
    );
  }
};

export const refreshPayrollGrandTotal = async (db, payrollId) => {
  const result = await db.query(
    `
      UPDATE finance.honor_payroll_period p
      SET
        grand_total = COALESCE((
          SELECT SUM(l.total_penerimaan)
          FROM finance.honor_payroll_line l
          WHERE l.payroll_id = p.id
        ), 0),
        updated_at = CURRENT_TIMESTAMP
      WHERE p.id = $1
      RETURNING grand_total
    `,
    [payrollId],
  );

  return toNumber(result.rows[0]?.grand_total);
};

/**
 * Generate or replace draft payroll for a homebase/month.
 */
export const generateHonorPayroll = async ({
  db,
  homebaseId,
  year,
  month,
  jamMode = "mati",
  periodeId = null,
  userId = null,
  replace = false,
}) => {
  const mode = jamMode === "hidup" ? "hidup" : "mati";

  const existing = await db.query(
    `
      SELECT *
      FROM finance.honor_payroll_period
      WHERE homebase_id = $1
        AND year = $2
        AND month = $3
      LIMIT 1
    `,
    [homebaseId, year, month],
  );

  if (existing.rowCount > 0) {
    const current = existing.rows[0];
    if (current.status === "locked") {
      return {
        error: "Payroll bulan ini sudah di-lock dan tidak bisa digenerate ulang",
        status: 409,
      };
    }
    if (!replace) {
      return {
        error:
          "Payroll draft untuk bulan ini sudah ada. Kirim replace=true untuk menimpa.",
        status: 409,
        data: { id: Number(current.id) },
      };
    }
  }

  const preview = await buildHonorariumPreview({
    db,
    homebaseId,
    year,
    month,
    jamMode: mode,
    periodeId,
  });

  if (preview.error) {
    return { error: preview.error, status: 400 };
  }

  const data = preview.data;
  let payrollId = existing.rowCount > 0 ? Number(existing.rows[0].id) : null;

  if (payrollId) {
    await db.query(`DELETE FROM finance.honor_payroll_line WHERE payroll_id = $1`, [
      payrollId,
    ]);
    await db.query(
      `
        UPDATE finance.honor_payroll_period
        SET
          periode_id = $1,
          jam_mode = $2,
          start_date = $3,
          end_date = $4,
          teaching_rate = $5,
          transport_rate = $6,
          homeroom_rate = $7,
          grand_total = $8,
          status = 'draft',
          generated_at = CURRENT_TIMESTAMP,
          locked_at = NULL,
          locked_by = NULL,
          updated_by = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
      `,
      [
        data.periode_id,
        mode,
        data.start_date,
        data.end_date,
        data.rates.teaching_rate,
        data.rates.transport_daily,
        data.rates.homeroom_allowance,
        data.summary.grand_total,
        userId,
        payrollId,
      ],
    );
  } else {
    const inserted = await db.query(
      `
        INSERT INTO finance.honor_payroll_period (
          homebase_id,
          periode_id,
          year,
          month,
          jam_mode,
          status,
          start_date,
          end_date,
          teaching_rate,
          transport_rate,
          homeroom_rate,
          grand_total,
          generated_at,
          created_by,
          updated_by
        )
        VALUES ($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP,$12,$12)
        RETURNING id
      `,
      [
        homebaseId,
        data.periode_id,
        data.year,
        data.month,
        mode,
        data.start_date,
        data.end_date,
        data.rates.teaching_rate,
        data.rates.transport_daily,
        data.rates.homeroom_allowance,
        data.summary.grand_total,
        userId,
      ],
    );
    payrollId = Number(inserted.rows[0].id);
  }

  await insertPayrollLines(db, payrollId, homebaseId, data.lines || [], mode);
  await refreshPayrollGrandTotal(db, payrollId);

  return {
    data: {
      id: payrollId,
      warnings: data.warnings || [],
    },
  };
};

/**
 * Recalc from engine; preserve jam/hadir overrides and manual money fields
 * when keepManualMoney=true (default).
 */
export const recalcHonorPayroll = async ({
  db,
  payroll,
  userId = null,
  keepManualMoney = true,
}) => {
  if (payroll.status === "locked") {
    return { error: "Payroll terkunci tidak bisa di-recalc", status: 409 };
  }

  const preview = await buildHonorariumPreview({
    db,
    homebaseId: Number(payroll.homebase_id),
    year: Number(payroll.year),
    month: Number(payroll.month),
    jamMode: payroll.jam_mode === "hidup" ? "hidup" : "mati",
    periodeId: payroll.periode_id ? Number(payroll.periode_id) : null,
  });

  if (preview.error) {
    return { error: preview.error, status: 400 };
  }

  const existingLines = await db.query(
    `
      SELECT *
      FROM finance.honor_payroll_line
      WHERE payroll_id = $1
    `,
    [payroll.id],
  );

  const existingByAssignment = new Map(
    existingLines.rows.map((row) => [Number(row.assignment_id), row]),
  );

  await db.query(`DELETE FROM finance.honor_payroll_line WHERE payroll_id = $1`, [
    payroll.id,
  ]);

  const mode = preview.data.jam_mode;
  let sortOrder = 0;

  for (const line of preview.data.lines || []) {
    sortOrder += 1;
    const prev = existingByAssignment.get(Number(line.assignment_id));
    const jamOverridden = Boolean(prev?.jam_overridden);
    const hadirOverridden = Boolean(prev?.hadir_overridden);

    const jamFinal = jamOverridden
      ? toNumber(prev.jam_final)
      : toNumber(line.jam_final);
    const hadirFinal = hadirOverridden
      ? toNumber(prev.hadir_final)
      : toNumber(line.hadir_final);

    const rpPerJam = keepManualMoney && prev
      ? toNumber(prev.rp_per_jam, line.rp_per_jam)
      : toNumber(line.rp_per_jam);
    const transportRate = keepManualMoney && prev
      ? toNumber(prev.transport_rate, line.transport_rate)
      : toNumber(line.transport_rate);
    const tunjanganWaliKelas = keepManualMoney && prev
      ? toNumber(prev.tunjangan_wali_kelas, line.tunjangan_wali_kelas)
      : toNumber(line.tunjangan_wali_kelas);
    const tunjanganJabatan = keepManualMoney && prev
      ? toNumber(prev.tunjangan_jabatan, line.tunjangan_jabatan)
      : toNumber(line.tunjangan_jabatan);
    const gapok = keepManualMoney && prev
      ? toNumber(prev.gapok, line.gapok)
      : toNumber(line.gapok);
    const notes = prev?.notes || null;

    const totals = calcPayrollLineTotals({
      jamFinal,
      hadirFinal,
      rpPerJam,
      transportRate,
      tunjanganWaliKelas,
      tunjanganJabatan,
      gapok,
    });

    await db.query(
      `
        INSERT INTO finance.honor_payroll_line (
          payroll_id, homebase_id, assignment_id, unit_id, position_id,
          person_type, teacher_id, staff_id, person_name, person_nip,
          unit_name, unit_code, unit_sort_order, position_name, subjects_text,
          jam_mode, jam_mati, jam_hidup, jam_auto, jam_final, jam_overridden,
          hadir_auto, hadir_final, hadir_overridden, rp_per_jam, transport_rate,
          is_homeroom, honor_mengajar, jumlah_transport, tunjangan_wali_kelas,
          tunjangan_jabatan, gapok, total_penerimaan, notes, sort_order
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
          $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35
        )
      `,
      [
        payroll.id,
        payroll.homebase_id,
        line.assignment_id,
        line.unit_id,
        line.position_id,
        line.person_type,
        line.teacher_id,
        line.staff_id,
        line.person_name,
        line.person_nip,
        line.unit_name,
        line.unit_code,
        line.unit_sort_order || 0,
        line.position_name,
        line.subjects_text || "",
        mode,
        line.jam_mati || 0,
        line.jam_hidup || 0,
        line.jam_auto || 0,
        jamFinal,
        jamOverridden,
        line.hadir_auto || 0,
        hadirFinal,
        hadirOverridden,
        rpPerJam,
        transportRate,
        Boolean(line.is_homeroom),
        totals.honor_mengajar,
        totals.jumlah_transport,
        tunjanganWaliKelas,
        tunjanganJabatan,
        gapok,
        totals.total_penerimaan,
        notes,
        sortOrder,
      ],
    );
  }

  await db.query(
    `
      UPDATE finance.honor_payroll_period
      SET
        periode_id = $1,
        jam_mode = $2,
        start_date = $3,
        end_date = $4,
        teaching_rate = $5,
        transport_rate = $6,
        homeroom_rate = $7,
        generated_at = CURRENT_TIMESTAMP,
        updated_by = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
    `,
    [
      preview.data.periode_id,
      mode,
      preview.data.start_date,
      preview.data.end_date,
      preview.data.rates.teaching_rate,
      preview.data.rates.transport_daily,
      preview.data.rates.homeroom_allowance,
      userId,
      payroll.id,
    ],
  );

  await refreshPayrollGrandTotal(db, payroll.id);

  return {
    data: {
      id: Number(payroll.id),
      warnings: preview.data.warnings || [],
    },
  };
};

export const getPayrollDetail = async (db, payrollId, homebaseId) => {
  const periodResult = await db.query(
    `
      SELECT
        p.*,
        pe.name AS periode_name,
        h.name AS homebase_name,
        creator.full_name AS created_by_name,
        locker.full_name AS locked_by_name
      FROM finance.honor_payroll_period p
      LEFT JOIN a_periode pe ON pe.id = p.periode_id
      LEFT JOIN a_homebase h ON h.id = p.homebase_id
      LEFT JOIN u_users creator ON creator.id = p.created_by
      LEFT JOIN u_users locker ON locker.id = p.locked_by
      WHERE p.id = $1
        AND p.homebase_id = $2
      LIMIT 1
    `,
    [payrollId, homebaseId],
  );

  if (periodResult.rowCount === 0) {
    return null;
  }

  const linesResult = await db.query(
    `
      SELECT *
      FROM finance.honor_payroll_line
      WHERE payroll_id = $1
      ORDER BY unit_sort_order ASC, sort_order ASC, id ASC
    `,
    [payrollId],
  );

  const lines = linesResult.rows.map(normalizePayrollLine);
  const units = groupPayrollLinesByUnit(lines);

  return {
    ...normalizePayrollPeriod(periodResult.rows[0]),
    lines,
    units,
    summary: {
      line_count: lines.length,
      unit_count: units.length,
      grand_total: toNumber(periodResult.rows[0].grand_total),
    },
  };
};
