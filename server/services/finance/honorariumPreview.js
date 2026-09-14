/**
 * Honorarium Phase 4 — engine preview jam / hadir / komponen bayar.
 * Belum menyimpan payroll; hanya menghitung dari assignment + LMS + attendance.
 */

const RATE_CODES = {
  TEACHING: "TEACHING_RATE",
  TRANSPORT: "TRANSPORT_DAILY",
  HOMEROOM: "HOMEROOM_ALLOWANCE",
};

const pad2 = (value) => String(value).padStart(2, "0");

export const resolveMonthRange = (year, month) => {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) {
    return null;
  }

  const startDate = `${y}-${pad2(m)}-01`;
  // month m (1-12): day 0 of next month index = last day of m
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${pad2(m)}-${pad2(lastDay)}`;
  return { year: y, month: m, startDate, endDate, label: `${y}-${pad2(m)}` };
};

const tableExists = async (db, schema, table) => {
  const result = await db.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_name = $2
      LIMIT 1
    `,
    [schema, table],
  );
  return result.rowCount > 0;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const uniqueSorted = (values = []) =>
  [...new Set(values.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "id"),
  );

export const resolveActivePeriodeId = async (db, homebaseId, requestedPeriodeId) => {
  if (requestedPeriodeId) {
    const check = await db.query(
      `
        SELECT id
        FROM a_periode
        WHERE id = $1
          AND homebase_id = $2
        LIMIT 1
      `,
      [requestedPeriodeId, homebaseId],
    );
    if (check.rowCount > 0) {
      return Number(check.rows[0].id);
    }
  }

  const active = await db.query(
    `
      SELECT id
      FROM a_periode
      WHERE homebase_id = $1
      ORDER BY is_active DESC, created_at DESC, id DESC
      LIMIT 1
    `,
    [homebaseId],
  );

  return active.rowCount > 0 ? Number(active.rows[0].id) : null;
};

const loadActiveRates = async (db, homebaseId, asOfDate) => {
  const result = await db.query(
    `
      SELECT *
      FROM finance.honor_rate_item
      WHERE homebase_id = $1
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= $2::date)
        AND (valid_to IS NULL OR valid_to >= $2::date)
      ORDER BY sort_order ASC, id ASC
    `,
    [homebaseId, asOfDate],
  );

  const rates = result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    amount: toNumber(row.amount),
  }));

  const byCode = rates.reduce((accumulator, item) => {
    if (item.code) {
      accumulator[String(item.code).toUpperCase()] = item;
    }
    return accumulator;
  }, {});

  return { rates, byCode };
};

const loadActiveAssignments = async (db, homebaseId, asOfDate) => {
  const result = await db.query(
    `
      SELECT
        a.id AS assignment_id,
        a.person_type,
        a.teacher_id,
        a.staff_id,
        a.position_id,
        a.valid_from,
        a.valid_to,
        a.notes AS assignment_notes,
        p.name AS position_name,
        p.allowance_amount,
        p.base_salary,
        u.id AS unit_id,
        u.name AS unit_name,
        u.code AS unit_code,
        u.sort_order AS unit_sort_order,
        p.sort_order AS position_sort_order,
        CASE
          WHEN a.person_type = 'teacher' THEN tu.full_name
          ELSE st.full_name
        END AS person_name,
        CASE
          WHEN a.person_type = 'teacher' THEN t.nip
          ELSE st.nip
        END AS person_nip
      FROM finance.honor_assignment a
      INNER JOIN finance.honor_position p ON p.id = a.position_id
      INNER JOIN finance.honor_unit u ON u.id = p.unit_id
      LEFT JOIN u_teachers t ON t.user_id = a.teacher_id
      LEFT JOIN u_users tu ON tu.id = t.user_id
      LEFT JOIN finance.honor_staff st ON st.id = a.staff_id
      WHERE a.homebase_id = $1
        AND a.is_active = true
        AND p.is_active = true
        AND u.is_active = true
        AND (a.valid_from IS NULL OR a.valid_from <= $2::date)
        AND (a.valid_to IS NULL OR a.valid_to >= $2::date)
      ORDER BY u.sort_order ASC, p.sort_order ASC, person_name ASC, a.id ASC
    `,
    [homebaseId, asOfDate],
  );

  return result.rows.map((row) => ({
    ...row,
    assignment_id: Number(row.assignment_id),
    teacher_id: row.teacher_id ? Number(row.teacher_id) : null,
    staff_id: row.staff_id ? Number(row.staff_id) : null,
    position_id: Number(row.position_id),
    unit_id: Number(row.unit_id),
    allowance_amount: toNumber(row.allowance_amount),
    base_salary: toNumber(row.base_salary),
  }));
};

const loadTeachingMetrics = async ({
  db,
  homebaseId,
  periodeId,
  teacherIds,
  startDate,
  endDate,
}) => {
  const metrics = new Map();
  const warnings = [];

  if (!teacherIds.length) {
    return { metrics, warnings };
  }

  const hasScheduleEntry = await tableExists(db, "lms", "l_schedule_entry");
  const hasTeachingLoad = await tableExists(db, "lms", "l_teaching_load");
  const hasHoliday = await tableExists(db, "attendance", "attendance_holiday");
  const hasEntrySlot = hasScheduleEntry
    ? await tableExists(db, "lms", "l_schedule_entry_slot")
    : false;

  // Catatan: l_teaching_load.weekly_sessions sering diisi placeholder (99) oleh
  // generator jadwal — BUKAN jam mengajar aktual. Honorarium memakai jadwal published.
  const sessionCountSql = hasEntrySlot
    ? `GREATEST(
        COALESCE(
          NULLIF(se.slot_count, 0),
          NULLIF(
            (
              SELECT COUNT(*)::int
              FROM lms.l_schedule_entry_slot ses
              WHERE ses.schedule_entry_id = se.id
            ),
            0
          ),
          1
        ),
        1
      )`
    : `GREATEST(COALESCE(NULLIF(se.slot_count, 0), 1), 1)`;

  const ensureMetric = (teacherId) => {
    if (!metrics.has(teacherId)) {
      metrics.set(teacherId, {
        jam_mati: 0,
        jam_hidup: 0,
        subjects_text: "",
        subjects: [],
      });
    }
    return metrics.get(teacherId);
  };

  if (hasScheduleEntry && periodeId) {
    try {
      // Jam mati = total slot/sesi dalam 1 minggu dari jadwal published
      const matiResult = await db.query(
        `
          SELECT
            se.teacher_id,
            COALESCE(SUM(${sessionCountSql}), 0)::int AS jam_mati,
            COALESCE(
              string_agg(DISTINCT sub.name, ', ' ORDER BY sub.name),
              ''
            ) AS subjects_text
          FROM lms.l_schedule_entry se
          LEFT JOIN public.a_subject sub ON sub.id = se.subject_id
          WHERE se.homebase_id = $1
            AND se.periode_id = $2
            AND se.teacher_id = ANY($3::int[])
            AND se.status = 'published'
          GROUP BY se.teacher_id
        `,
        [homebaseId, periodeId, teacherIds],
      );

      for (const row of matiResult.rows) {
        const teacherId = Number(row.teacher_id);
        const metric = ensureMetric(teacherId);
        metric.jam_mati = toNumber(row.jam_mati);
        metric.subjects_text = row.subjects_text || "";
        metric.subjects = String(row.subjects_text || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      const holidayJoin = hasHoliday
        ? `
          AND NOT EXISTS (
            SELECT 1
            FROM attendance.attendance_holiday h
            WHERE h.homebase_id = $1
              AND h.holiday_date = md.attendance_date
              AND h.is_active = true
              AND h.applies_to_role IN ('all', 'teacher')
          )
        `
        : "";

      // Jam hidup = ekspansi kalender bulan × jadwal published (− libur)
      const hidupResult = await db.query(
        `
          WITH month_days AS (
            SELECT generate_series($2::date, $3::date, interval '1 day')::date AS attendance_date
          ),
          schedule_entries AS (
            SELECT
              se.teacher_id,
              se.day_of_week,
              ${sessionCountSql} AS session_count
            FROM lms.l_schedule_entry se
            WHERE se.homebase_id = $1
              AND se.periode_id = $4
              AND se.teacher_id = ANY($5::int[])
              AND se.status = 'published'
          )
          SELECT
            se.teacher_id,
            COALESCE(SUM(se.session_count), 0)::int AS jam_hidup
          FROM month_days md
          INNER JOIN schedule_entries se
            ON se.day_of_week = EXTRACT(ISODOW FROM md.attendance_date)::int
          WHERE true
            ${holidayJoin}
          GROUP BY se.teacher_id
        `,
        [homebaseId, startDate, endDate, periodeId, teacherIds],
      );

      for (const row of hidupResult.rows) {
        const metric = ensureMetric(Number(row.teacher_id));
        metric.jam_hidup = toNumber(row.jam_hidup);
      }

      const teachersWithoutPublished = teacherIds.filter((id) => {
        const metric = metrics.get(id);
        return !metric || (metric.jam_mati === 0 && metric.jam_hidup === 0);
      });

      if (teachersWithoutPublished.length > 0) {
        warnings.push(
          `${teachersWithoutPublished.length} guru belum punya jadwal published — jam dihitung 0. Publish jadwal di LMS terlebih dahulu.`,
        );
      }
    } catch (error) {
      warnings.push(`Gagal menghitung jam dari jadwal: ${error.message}`);
    }
  } else if (!hasScheduleEntry) {
    warnings.push("Tabel lms.l_schedule_entry belum tersedia — jam = 0");
  } else if (!periodeId) {
    warnings.push("Periode akademik belum dipilih — jam = 0");
  }

  // Fallback mapel dari teaching load jika jadwal belum published
  if (hasTeachingLoad && periodeId) {
    try {
      const subjectResult = await db.query(
        `
          SELECT
            tl.teacher_id,
            COALESCE(
              string_agg(DISTINCT sub.name, ', ' ORDER BY sub.name),
              ''
            ) AS subjects_text
          FROM lms.l_teaching_load tl
          INNER JOIN public.a_subject sub ON sub.id = tl.subject_id
          WHERE tl.homebase_id = $1
            AND tl.periode_id = $2
            AND tl.is_active = true
            AND tl.teacher_id = ANY($3::int[])
          GROUP BY tl.teacher_id
        `,
        [homebaseId, periodeId, teacherIds],
      );

      for (const row of subjectResult.rows) {
        const teacherId = Number(row.teacher_id);
        const metric = ensureMetric(teacherId);
        if (!metric.subjects_text && row.subjects_text) {
          metric.subjects_text = row.subjects_text;
          metric.subjects = String(row.subjects_text || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      }
    } catch {
      // optional fallback
    }
  }

  return { metrics, warnings };
};

const loadAttendanceDays = async ({
  db,
  homebaseId,
  userIds,
  startDate,
  endDate,
}) => {
  const map = new Map();
  const warnings = [];

  if (!userIds.length) {
    return { map, warnings };
  }

  const hasDaily = await tableExists(db, "attendance", "daily_attendance");
  if (!hasDaily) {
    warnings.push(
      "Tabel attendance.daily_attendance belum tersedia — jumlah hadir = 0",
    );
    return { map, warnings };
  }

  try {
    const result = await db.query(
      `
        SELECT
          da.user_id,
          COUNT(*)::int AS hadir_days
        FROM attendance.daily_attendance da
        WHERE da.homebase_id = $1
          AND da.attendance_date BETWEEN $2::date AND $3::date
          AND da.target_role = 'teacher'
          AND da.attendance_status IN ('present', 'late')
          AND da.user_id = ANY($4::int[])
        GROUP BY da.user_id
      `,
      [homebaseId, startDate, endDate, userIds],
    );

    for (const row of result.rows) {
      map.set(Number(row.user_id), toNumber(row.hadir_days));
    }
  } catch (error) {
    warnings.push(`Gagal menghitung jumlah hadir: ${error.message}`);
  }

  return { map, warnings };
};

const loadHomeroomTeacherIds = async (db, homebaseId, teacherIds) => {
  const set = new Set();
  if (!teacherIds.length) {
    return set;
  }

  try {
    const result = await db.query(
      `
        SELECT DISTINCT homeroom_teacher_id
        FROM a_class
        WHERE homebase_id = $1
          AND homeroom_teacher_id = ANY($2::int[])
      `,
      [homebaseId, teacherIds],
    );

    for (const row of result.rows) {
      if (row.homeroom_teacher_id) {
        set.add(Number(row.homeroom_teacher_id));
      }
    }
  } catch {
    // homeroom optional
  }

  return set;
};

const buildLineTotals = ({
  jamFinal,
  hadirFinal,
  teachingRate,
  transportRate,
  homeroomAmount,
  allowanceAmount,
  baseSalary,
}) => {
  const honorMengajar = jamFinal * teachingRate;
  const jumlahTransport = hadirFinal * transportRate;
  const total =
    honorMengajar +
    jumlahTransport +
    homeroomAmount +
    allowanceAmount +
    baseSalary;

  return {
    honor_mengajar: honorMengajar,
    jumlah_transport: jumlahTransport,
    tunjangan_wali_kelas: homeroomAmount,
    tunjangan_jabatan: allowanceAmount,
    gapok: baseSalary,
    total_penerimaan: total,
  };
};

/**
 * @param {object} params
 * @param {import('pg').Pool|import('pg').PoolClient} params.db
 * @param {number} params.homebaseId
 * @param {number} params.year
 * @param {number} params.month
 * @param {'mati'|'hidup'} [params.jamMode]
 * @param {number|null} [params.periodeId]
 */
export const buildHonorariumPreview = async ({
  db,
  homebaseId,
  year,
  month,
  jamMode = "mati",
  periodeId: requestedPeriodeId = null,
}) => {
  const range = resolveMonthRange(year, month);
  if (!range) {
    return { error: "Bulan/tahun tidak valid" };
  }

  const mode = jamMode === "hidup" ? "hidup" : "mati";
  const periodeId = await resolveActivePeriodeId(
    db,
    homebaseId,
    requestedPeriodeId,
  );
  const asOfDate = range.endDate;

  const assignments = await loadActiveAssignments(db, homebaseId, asOfDate);
  const teacherIds = uniqueSorted(
    assignments
      .filter((item) => item.person_type === "teacher" && item.teacher_id)
      .map((item) => item.teacher_id),
  );

  const [{ rates, byCode }, teaching, attendance, homeroomIds] =
    await Promise.all([
      loadActiveRates(db, homebaseId, asOfDate),
      loadTeachingMetrics({
        db,
        homebaseId,
        periodeId,
        teacherIds,
        startDate: range.startDate,
        endDate: range.endDate,
      }),
      loadAttendanceDays({
        db,
        homebaseId,
        userIds: teacherIds,
        startDate: range.startDate,
        endDate: range.endDate,
      }),
      loadHomeroomTeacherIds(db, homebaseId, teacherIds),
    ]);

  const teachingRate = toNumber(byCode[RATE_CODES.TEACHING]?.amount);
  const transportRate = toNumber(byCode[RATE_CODES.TRANSPORT]?.amount);
  const homeroomRate = toNumber(byCode[RATE_CODES.HOMEROOM]?.amount);

  const engineWarnings = [
    ...teaching.warnings,
    ...attendance.warnings,
  ];

  const JAM_MATI_MAX = 48;
  const JAM_HIDUP_MAX = 220;

  if (!periodeId) {
    engineWarnings.push(
      "Tidak ada periode akademik untuk satuan ini. Jam mengajar akan 0.",
    );
  }

  const lines = assignments.map((assignment, index) => {
    const isTeacher = assignment.person_type === "teacher";
    const teacherMetric = isTeacher
      ? teaching.metrics.get(assignment.teacher_id) || {
          jam_mati: 0,
          jam_hidup: 0,
          subjects_text: "",
          subjects: [],
        }
      : {
          jam_mati: 0,
          jam_hidup: 0,
          subjects_text: "",
          subjects: [],
        };

    const jamMati = toNumber(teacherMetric.jam_mati);
    const jamHidup = toNumber(teacherMetric.jam_hidup);
    const jamAuto = mode === "hidup" ? jamHidup : jamMati;
    const hadirAuto = isTeacher
      ? toNumber(attendance.map.get(assignment.teacher_id))
      : 0;
    const isHomeroom =
      isTeacher && homeroomIds.has(assignment.teacher_id);
    const waliKelasAmount = isHomeroom ? homeroomRate : 0;

    const totals = buildLineTotals({
      jamFinal: jamAuto,
      hadirFinal: hadirAuto,
      teachingRate: isTeacher ? teachingRate : 0,
      transportRate: isTeacher ? transportRate : 0,
      homeroomAmount: waliKelasAmount,
      allowanceAmount: assignment.allowance_amount,
      baseSalary: assignment.base_salary,
    });

    const lineWarnings = [];
    if (isTeacher && jamAuto === 0) {
      lineWarnings.push(
        mode === "hidup"
          ? "Jam hidup 0 (cek jadwal published / libur)"
          : "Jam mati 0 (cek teaching load periode)",
      );
    }

    const jamLimit = mode === "hidup" ? JAM_HIDUP_MAX : JAM_MATI_MAX;
    if (isTeacher && jamAuto > jamLimit) {
      lineWarnings.push(
        `Jam ${jamAuto} di atas ambang wajar ${jamLimit} untuk mode ${mode}. Periksa teaching load / jadwal.`,
      );
    }

    return {
      no: index + 1,
      assignment_id: assignment.assignment_id,
      person_type: assignment.person_type,
      teacher_id: assignment.teacher_id,
      staff_id: assignment.staff_id,
      person_name: assignment.person_name,
      person_nip: assignment.person_nip,
      unit_id: assignment.unit_id,
      unit_name: assignment.unit_name,
      unit_code: assignment.unit_code,
      unit_sort_order: assignment.unit_sort_order,
      position_id: assignment.position_id,
      position_name: assignment.position_name,
      subjects_text: teacherMetric.subjects_text || "",
      subjects: teacherMetric.subjects || [],
      jam_mode: mode,
      jam_mati: jamMati,
      jam_hidup: jamHidup,
      jam_auto: jamAuto,
      jam_final: jamAuto,
      hadir_auto: hadirAuto,
      hadir_final: hadirAuto,
      rp_per_jam: isTeacher ? teachingRate : 0,
      transport_rate: isTeacher ? transportRate : 0,
      is_homeroom: isHomeroom,
      jam_suspicious: isTeacher && jamAuto > jamLimit,
      ...totals,
      source: {
        jam: "auto",
        hadir: "auto",
      },
      warnings: lineWarnings,
    };
  });

  const suspiciousJamLines = lines.filter((line) => line.jam_suspicious);
  if (suspiciousJamLines.length > 0) {
    const sample = suspiciousJamLines
      .slice(0, 5)
      .map((line) => `${line.person_name} (${line.jam_final})`)
      .join(", ");
    engineWarnings.push(
      `Ada ${suspiciousJamLines.length} baris dengan jam di atas ambang wajar: ${sample}${suspiciousJamLines.length > 5 ? ", …" : ""}`,
    );
  }

  // Re-number within each unit for slip-like sections
  const byUnitMap = new Map();
  for (const line of lines) {
    const key = String(line.unit_id);
    if (!byUnitMap.has(key)) {
      byUnitMap.set(key, {
        unit_id: line.unit_id,
        unit_name: line.unit_name,
        unit_code: line.unit_code,
        unit_sort_order: line.unit_sort_order,
        lines: [],
        subtotal: 0,
      });
    }
    const unitGroup = byUnitMap.get(key);
    unitGroup.lines.push(line);
    unitGroup.subtotal += line.total_penerimaan;
  }

  const units = Array.from(byUnitMap.values())
    .sort((a, b) => a.unit_sort_order - b.unit_sort_order)
    .map((unit) => ({
      ...unit,
      lines: unit.lines.map((line, idx) => ({ ...line, no: idx + 1 })),
      subtotal: toNumber(unit.subtotal),
    }));

  const grandTotal = units.reduce((sum, unit) => sum + unit.subtotal, 0);

  let periodeName = null;
  if (periodeId) {
    const periodeResult = await db.query(
      `SELECT id, name, is_active FROM a_periode WHERE id = $1 LIMIT 1`,
      [periodeId],
    );
    periodeName = periodeResult.rows[0]?.name || null;
  }

  return {
    data: {
      homebase_id: homebaseId,
      periode_id: periodeId,
      periode_name: periodeName,
      year: range.year,
      month: range.month,
      month_label: range.label,
      start_date: range.startDate,
      end_date: range.endDate,
      jam_mode: mode,
      rates: {
        teaching_rate: teachingRate,
        transport_daily: transportRate,
        homeroom_allowance: homeroomRate,
        items: rates,
      },
      summary: {
        assignment_count: lines.length,
        teacher_count: teacherIds.length,
        unit_count: units.length,
        grand_total: grandTotal,
      },
      units,
      lines,
      warnings: engineWarnings,
      note: "Preview otomatis — belum tersimpan. Override & lock di tahap payroll berikutnya.",
    },
  };
};
