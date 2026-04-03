import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const dayLabels = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

const toInt = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseMinute = (timeValue) => {
  if (!timeValue) return null;
  const [hour, minute] = String(timeValue).split(":").map((item) => toInt(item));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

const toTimeString = (minutes) => {
  const safeMinutes = Math.max(0, Math.min(1439, minutes));
  const hour = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
  const minute = String(safeMinutes % 60).padStart(2, "0");
  return `${hour}:${minute}:00`;
};

const splitSessions = (weeklySessions, maxPerMeeting) => {
  const chunks = [];
  let remaining = Math.max(0, toInt(weeklySessions, 0));
  const maxChunk = Math.max(1, toInt(maxPerMeeting, 2));
  while (remaining > 0) {
    const nextChunk = Math.min(maxChunk, remaining);
    chunks.push(nextChunk);
    remaining -= nextChunk;
  }
  return chunks;
};

const ensureActivePeriode = async (executor, homebaseId, requestedPeriodeId) => {
  if (requestedPeriodeId) return requestedPeriodeId;
  const activePeriode = await executor.query(
    `SELECT id
     FROM public.a_periode
     WHERE homebase_id = $1
       AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [homebaseId],
  );
  return activePeriode.rows[0]?.id || null;
};

const overlapTime = (slotStart, slotEnd, blockStart, blockEnd) =>
  slotStart < blockEnd && slotEnd > blockStart;

const gapSatisfied = (
  candidateStart,
  candidateEnd,
  existingStart,
  existingEnd,
  minGap,
) => {
  if (!Number.isFinite(minGap) || minGap <= 0) return true;
  if (candidateStart > existingEnd) return candidateStart - existingEnd >= minGap;
  if (existingStart > candidateEnd) return existingStart - candidateEnd >= minGap;
  return false;
};

const GENERATE_ACTIONS = new Set([
  "generate_new",
  "regenerate_generated",
  "reset_generated",
]);

const FAILURE_LABELS = {
  no_day_slots: "Tidak ada slot tersedia pada hari sekolah aktif.",
  same_day_rule: "Aturan hari yang berbeda untuk mapel yang sama tidak terpenuhi.",
  no_contiguous_segment: "Tidak ditemukan slot berurutan sesuai kebutuhan sesi.",
  gap_rule: "Jarak minimal antarsesi mapel yang sama tidak terpenuhi.",
  class_conflict: "Slot kelas sudah terisi.",
  teacher_conflict: "Slot guru sudah terisi.",
  teacher_unavailability: "Guru tidak tersedia pada slot tersebut.",
  no_available_slot: "Tidak ada kombinasi slot yang dapat dipakai.",
};

const summarizeFailureStats = (stats = {}) =>
  Object.entries(stats)
    .filter(([, count]) => Number(count) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .map(([code, count]) => ({
      code,
      count: Number(count),
      label: FAILURE_LABELS[code] || code,
    }));

const getPrimaryFailureCode = (stats = {}) => {
  const sorted = summarizeFailureStats(stats);
  return sorted[0]?.code || "no_available_slot";
};

const aggregateFailureCodes = (failedItems = []) =>
  failedItems.reduce((acc, item) => {
    const code = item.failure_code || "no_available_slot";
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

const resolveScheduleSegment = async ({
  client,
  homebaseId,
  periodeId,
  dayOfWeek,
  slotStartId,
  slotCount,
}) => {
  const startSlotResult = await client.query(
    `SELECT ts.*, cfg.homebase_id, cfg.periode_id
     FROM lms.l_time_slot ts
     JOIN lms.l_schedule_config cfg ON cfg.id = ts.config_id
     WHERE ts.id = $1
     LIMIT 1`,
    [slotStartId],
  );
  if (startSlotResult.rowCount === 0) {
    return { error: "slot_start_id tidak valid." };
  }

  const startSlot = startSlotResult.rows[0];
  if (
    Number(startSlot.homebase_id) !== Number(homebaseId) ||
    Number(startSlot.periode_id) !== Number(periodeId)
  ) {
    return { error: "Slot mulai tidak cocok dengan homebase/periode aktif." };
  }

  if (Number(startSlot.day_of_week) !== Number(dayOfWeek)) {
    return { error: "Hari tidak sesuai dengan slot mulai yang dipilih." };
  }

  const startSlotNo = toInt(startSlot.slot_no, 0);
  const segmentResult = await client.query(
    `SELECT id, slot_no, start_time, end_time
     FROM lms.l_time_slot
     WHERE config_id = $1
       AND day_of_week = $2
       AND is_break = false
       AND slot_no BETWEEN $3 AND $4
     ORDER BY slot_no`,
    [startSlot.config_id, dayOfWeek, startSlotNo, startSlotNo + slotCount - 1],
  );
  if (segmentResult.rowCount !== slotCount) {
    return { error: "Slot berurutan tidak tersedia sesuai slot_count." };
  }

  return {
    segmentRows: segmentResult.rows,
    startSlotId: Number(segmentResult.rows[0].id),
  };
};

const validateScheduleEntryPlacement = async ({
  client,
  entryId = null,
  periodeId,
  homebaseId,
  teacherId,
  classId,
  dayOfWeek,
  slotIds,
  enforceTeacherUnavailability = true,
}) => {
  const conflictResult = await client.query(
    `SELECT ess.id
     FROM lms.l_schedule_entry_slot ess
     JOIN lms.l_schedule_entry e ON e.id = ess.schedule_entry_id
     WHERE e.periode_id = $1
       AND ($2::int IS NULL OR e.id <> $2)
       AND ess.day_of_week = $3
       AND ess.slot_id = ANY($4::int[])
       AND (ess.class_id = $5 OR ess.teacher_id = $6)
     LIMIT 1`,
    [periodeId, entryId, dayOfWeek, slotIds, classId, teacherId],
  );
  if (conflictResult.rowCount > 0) {
    return { error: "Jadwal bentrok dengan jadwal kelas/guru lain.", status: 409 };
  }

  const activityConflictResult = await client.query(
    `SELECT a.id, a.name
     FROM lms.l_schedule_activity a
     JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
     JOIN lms.l_time_slot ts
       ON ts.config_id = start_slot.config_id
      AND ts.day_of_week = a.day_of_week
      AND ts.is_break = false
      AND ts.slot_no BETWEEN start_slot.slot_no AND start_slot.slot_no + a.slot_count - 1
     LEFT JOIN lms.l_schedule_activity_target t ON t.activity_id = a.id
     WHERE a.homebase_id = $1
       AND a.periode_id = $2
       AND a.is_active = true
       AND a.day_of_week = $3
       AND ts.id = ANY($4::int[])
       AND (
         a.scope_type = 'all_classes'
         OR (a.scope_type = 'teaching_load' AND (t.class_id = $5 OR t.teacher_id = $6))
       )
     LIMIT 1`,
    [homebaseId, periodeId, dayOfWeek, slotIds, classId, teacherId],
  );
  if (activityConflictResult.rowCount > 0) {
    return {
      error: `Jadwal bentrok dengan kegiatan ${activityConflictResult.rows[0].name}.`,
      status: 409,
    };
  }

  if (!enforceTeacherUnavailability) {
    return { ok: true };
  }

  const teacherBlockResult = await client.query(
    `SELECT day_of_week, start_time, end_time
     FROM lms.l_teacher_unavailability
     WHERE teacher_id = $1
       AND periode_id = $2
       AND is_active = true
       AND specific_date IS NULL`,
    [teacherId, periodeId],
  );

  const slotRows = await client.query(
    `SELECT start_time, end_time
     FROM lms.l_time_slot
     WHERE id = ANY($1::int[])
     ORDER BY slot_no`,
    [slotIds],
  );

  const violating = slotRows.rows.some((slot) => {
    const slotStart = parseMinute(slot.start_time);
    const slotEnd = parseMinute(slot.end_time);
    return teacherBlockResult.rows.some((block) => {
      const blockDay = toInt(block.day_of_week, null);
      if (blockDay && blockDay !== dayOfWeek) return false;
      const blockStart = block.start_time ? parseMinute(block.start_time) : null;
      const blockEnd = block.end_time ? parseMinute(block.end_time) : null;
      if (blockStart === null || blockEnd === null) return true;
      return overlapTime(slotStart, slotEnd, blockStart, blockEnd);
    });
  });

  if (violating) {
    return { error: "Perubahan melanggar ketentuan waktu guru.", status: 409 };
  }

  return { ok: true };
};

router.get(
  "/schedule/bootstrap",
  authorize("satuan", "teacher", "student"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id, admin_level } = req.user;
    const requestedPeriodeId = toInt(req.query.periode_id, null);
    const periodeId = await ensureActivePeriode(pool, homebase_id, requestedPeriodeId);

    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const configResult = await pool.query(
      `SELECT *
       FROM lms.l_schedule_config
       WHERE homebase_id = $1
         AND periode_id = $2
       LIMIT 1`,
      [homebase_id, periodeId],
    );
    const config = configResult.rows[0] || null;
    const configId = config?.id || null;

    const [dayTemplateResult, breakResult, slotResult] =
      configId
        ? await Promise.all([
            pool.query(
              `SELECT *
               FROM lms.l_schedule_day_template
               WHERE config_id = $1
               ORDER BY day_of_week`,
              [configId],
            ),
            pool.query(
              `SELECT b.*, d.day_of_week
               FROM lms.l_schedule_break b
               JOIN lms.l_schedule_day_template d ON d.id = b.day_template_id
               WHERE d.config_id = $1
               ORDER BY d.day_of_week, b.break_start`,
              [configId],
            ),
            pool.query(
              `SELECT *
               FROM lms.l_time_slot
               WHERE config_id = $1
               ORDER BY day_of_week, slot_no`,
              [configId],
            ),
          ])
        : [{ rows: [] }, { rows: [] }, { rows: [] }];

    const [loadResult, unavailabilityResult, activityResult, activityTargetResult] =
      await Promise.all([
      pool.query(
        `SELECT
           l.*,
           c.name AS class_name,
           s.name AS subject_name,
           u.full_name AS teacher_name
         FROM lms.l_teaching_load l
         JOIN public.a_class c ON c.id = l.class_id
         JOIN public.a_subject s ON s.id = l.subject_id
         JOIN public.u_users u ON u.id = l.teacher_id
         WHERE l.periode_id = $1
           AND l.homebase_id = $2
         ORDER BY c.name, s.name, u.full_name`,
        [periodeId, homebase_id],
      ),
      pool.query(
        `SELECT
           ua.*,
           u.full_name AS teacher_name
         FROM lms.l_teacher_unavailability ua
         JOIN public.u_users u ON u.id = ua.teacher_id
         WHERE ua.periode_id = $1
           AND u.id IN (
             SELECT user_id
             FROM public.u_teachers
             WHERE homebase_id = $2
           )
         ORDER BY ua.teacher_id, ua.day_of_week, ua.start_time`,
        [periodeId, homebase_id],
      ),
      pool.query(
        `SELECT
           a.*,
           slot_agg.start_time,
           slot_agg.end_time,
           slot_agg.slot_nos,
           slot_agg.slot_ids
         FROM lms.l_schedule_activity a
         LEFT JOIN LATERAL (
           SELECT
             MIN(ts.start_time) AS start_time,
             MAX(ts.end_time) AS end_time,
             ARRAY_AGG(ts.slot_no ORDER BY ts.slot_no) AS slot_nos,
             ARRAY_AGG(ts.id ORDER BY ts.slot_no) AS slot_ids
           FROM lms.l_time_slot ts
           JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
           WHERE ts.config_id = start_slot.config_id
             AND ts.day_of_week = a.day_of_week
             AND ts.slot_no BETWEEN start_slot.slot_no AND start_slot.slot_no + a.slot_count - 1
         ) slot_agg ON true
         WHERE a.periode_id = $1
           AND a.homebase_id = $2
         ORDER BY a.day_of_week, slot_agg.start_time NULLS LAST, a.name`,
        [periodeId, homebase_id],
      ),
      pool.query(
        `SELECT
           t.*,
           a.name AS activity_name,
           u.full_name AS teacher_name,
           s.name AS subject_name,
           c.name AS class_name
         FROM lms.l_schedule_activity_target t
         JOIN lms.l_schedule_activity a ON a.id = t.activity_id
         JOIN public.u_users u ON u.id = t.teacher_id
         JOIN public.a_subject s ON s.id = t.subject_id
         JOIN public.a_class c ON c.id = t.class_id
         WHERE a.periode_id = $1
           AND a.homebase_id = $2
         ORDER BY a.id, u.full_name, s.name, c.name`,
        [periodeId, homebase_id],
      ),
    ]);

    const assignmentResult = await pool.query(
      `WITH base_assignment AS (
         SELECT DISTINCT
           ats.teacher_id,
           ats.subject_id,
           ats.class_id
         FROM public.at_subject ats
         JOIN public.u_teachers t ON t.user_id = ats.teacher_id
         JOIN public.a_subject s ON s.id = ats.subject_id
         WHERE t.homebase_id = $1
           AND s.homebase_id = $1
       )
       SELECT
         b.teacher_id,
         b.subject_id,
         c.id AS class_id,
         c.grade_id,
         u.full_name AS teacher_name,
         s.name AS subject_name,
         COALESCE(NULLIF(s.code, ''), s.name) AS subject_code,
         c.name AS class_name,
         g.name AS grade_name,
         l.id AS teaching_load_id,
         l.weekly_sessions,
         l.max_sessions_per_meeting,
         l.require_different_days,
         l.allow_same_day_with_gap,
         l.minimum_gap_slots,
         l.is_active
       FROM base_assignment b
       JOIN public.a_class c ON c.id = b.class_id
       JOIN public.u_users u ON u.id = b.teacher_id
       JOIN public.a_subject s ON s.id = b.subject_id
       LEFT JOIN public.a_grade g ON g.id = c.grade_id
       LEFT JOIN lms.l_teaching_load l
         ON l.homebase_id = $1
        AND l.periode_id = $2
        AND l.class_id = b.class_id
        AND l.subject_id = b.subject_id
        AND l.teacher_id = b.teacher_id
       WHERE c.homebase_id = $1
         AND COALESCE(c.is_active, true) = true
       ORDER BY u.full_name, s.name, g.name, c.name`,
      [homebase_id, periodeId],
    );

    const teacherFilterClause = role === "teacher" ? "AND e.teacher_id = $3" : "";
    const entryParams =
      role === "teacher" ? [periodeId, homebase_id, userId] : [periodeId, homebase_id];

    const entryResult = await pool.query(
      `SELECT
         e.id,
         e.day_of_week,
         e.slot_count,
         e.meeting_no,
         e.source_type,
         e.is_manual_override,
         e.locked,
         e.status,
         e.teacher_id,
         e.class_id,
         e.subject_id,
         e.slot_start_id,
         c.name AS class_name,
         s.name AS subject_name,
         COALESCE(NULLIF(s.code, ''), s.name) AS subject_code,
         u.full_name AS teacher_name,
         slot_agg.start_time,
         slot_agg.end_time,
         slot_agg.slot_nos
       FROM lms.l_schedule_entry e
       JOIN public.a_class c ON c.id = e.class_id
       JOIN public.a_subject s ON s.id = e.subject_id
       JOIN public.u_users u ON u.id = e.teacher_id
       LEFT JOIN LATERAL (
         SELECT
           MIN(ts.start_time) AS start_time,
           MAX(ts.end_time) AS end_time,
           ARRAY_AGG(ts.slot_no ORDER BY ts.slot_no) AS slot_nos
         FROM lms.l_schedule_entry_slot es
         JOIN lms.l_time_slot ts ON ts.id = es.slot_id
         WHERE es.schedule_entry_id = e.id
       ) slot_agg ON true
       WHERE e.periode_id = $1
         AND e.homebase_id = $2
         AND e.status <> 'archived'
         ${teacherFilterClause}
       ORDER BY e.day_of_week, slot_agg.start_time NULLS LAST, c.name`,
      entryParams,
    );

    const [classResult, subjectResult, teacherResult, gradeResult] = await Promise.all([
      pool.query(
        `SELECT c.id, c.name, c.grade_id, c.is_active, g.name AS grade_name
         FROM public.a_class c
         LEFT JOIN public.a_grade g ON g.id = c.grade_id
         WHERE c.homebase_id = $1
           AND COALESCE(c.is_active, true) = true
         ORDER BY g.name ASC NULLS LAST, c.name ASC`,
        [homebase_id],
      ),
      pool.query(
        `SELECT id, name
         FROM public.a_subject
         WHERE homebase_id = $1
         ORDER BY name ASC`,
        [homebase_id],
      ),
      pool.query(
        `SELECT u.id, u.full_name
         FROM public.u_teachers t
         JOIN public.u_users u ON u.id = t.user_id
         WHERE t.homebase_id = $1
         ORDER BY u.full_name ASC`,
        [homebase_id],
      ),
      pool.query(
        `SELECT id, name
         FROM public.a_grade
         WHERE homebase_id = $1
         ORDER BY id ASC`,
        [homebase_id],
      ),
    ]);

    return res.json({
      status: "success",
      data: {
        periode_id: periodeId,
        config,
        day_templates: dayTemplateResult.rows,
        breaks: breakResult.rows,
        slots: slotResult.rows,
        loads: loadResult.rows,
        teacher_assignments: assignmentResult.rows,
        unavailability: unavailabilityResult.rows,
        activities: activityResult.rows,
        activity_targets: activityTargetResult.rows,
        entries: entryResult.rows,
        classes: classResult.rows,
        subjects: subjectResult.rows,
        teachers: teacherResult.rows,
        grades: gradeResult.rows,
        can_manage: role === "admin" && admin_level === "satuan",
      },
    });
  }),
);

router.put(
  "/schedule/config",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const {
      periode_id,
      session_minutes,
      max_sessions_per_meeting = 2,
      require_different_days_if_over_max = true,
      allow_same_day_multiple_meetings = true,
      minimum_gap_slots = 4,
      days = [],
    } = req.body || {};

    const periodeId = await ensureActivePeriode(client, homebase_id, toInt(periode_id, null));
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const sessionMinutes = toInt(session_minutes, null);
    if (!sessionMinutes || sessionMinutes <= 0) {
      return res.status(400).json({
        status: "error",
        message: "session_minutes wajib lebih dari 0.",
      });
    }

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Template hari wajib diisi minimal 1 hari.",
      });
    }

    const existingEntryResult = await client.query(
      `SELECT 1
       FROM lms.l_schedule_entry
       WHERE homebase_id = $1
         AND periode_id = $2
         AND status <> 'archived'
       LIMIT 1`,
      [homebase_id, periodeId],
    );
    if (existingEntryResult.rowCount > 0) {
      return res.status(409).json({
        status: "error",
        message:
          "Konfigurasi slot tidak dapat diubah karena jadwal sudah dibuat. Kosongkan atau arsipkan jadwal periode ini terlebih dahulu.",
      });
    }

    const upsertConfigResult = await client.query(
      `INSERT INTO lms.l_schedule_config (
         homebase_id,
         periode_id,
         session_minutes,
         max_sessions_per_meeting,
         require_different_days_if_over_max,
         allow_same_day_multiple_meetings,
         minimum_gap_slots,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (homebase_id, periode_id)
       DO UPDATE SET
         session_minutes = EXCLUDED.session_minutes,
         max_sessions_per_meeting = EXCLUDED.max_sessions_per_meeting,
         require_different_days_if_over_max = EXCLUDED.require_different_days_if_over_max,
         allow_same_day_multiple_meetings = EXCLUDED.allow_same_day_multiple_meetings,
         minimum_gap_slots = EXCLUDED.minimum_gap_slots,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        homebase_id,
        periodeId,
        sessionMinutes,
        toInt(max_sessions_per_meeting, 2),
        Boolean(require_different_days_if_over_max),
        Boolean(allow_same_day_multiple_meetings),
        toInt(minimum_gap_slots, 4),
        userId,
      ],
    );
    const config = upsertConfigResult.rows[0];

    await client.query(`DELETE FROM lms.l_schedule_break
      WHERE day_template_id IN (
        SELECT id
        FROM lms.l_schedule_day_template
        WHERE config_id = $1
      )`, [config.id]);

    await client.query(`DELETE FROM lms.l_time_slot WHERE config_id = $1`, [config.id]);

    await client.query(`DELETE FROM lms.l_schedule_day_template WHERE config_id = $1`, [
      config.id,
    ]);

    for (const dayConfig of days) {
      const dayOfWeek = toInt(dayConfig.day_of_week, null);
      const startMinute = parseMinute(dayConfig.start_time);
      const endMinute = parseMinute(dayConfig.end_time);
      if (!dayOfWeek || !Number.isFinite(startMinute) || !Number.isFinite(endMinute)) continue;

      const dayTemplateResult = await client.query(
        `INSERT INTO lms.l_schedule_day_template (
           config_id,
           day_of_week,
           start_time,
           end_time,
           is_school_day
         )
         VALUES ($1, $2, $3::time, $4::time, $5)
         RETURNING *`,
        [
          config.id,
          dayOfWeek,
          toTimeString(startMinute),
          toTimeString(endMinute),
          dayConfig.is_school_day !== false,
        ],
      );
      const dayTemplate = dayTemplateResult.rows[0];

      const breaks = Array.isArray(dayConfig.breaks) ? dayConfig.breaks : [];
      const normalizedBreaks = breaks
        .map((item) => {
          const start = parseMinute(item.break_start);
          const end = parseMinute(item.break_end);
          if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return null;
          return {
            break_start: start,
            break_end: end,
            label: item.label || "Istirahat",
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.break_start - b.break_start);

      for (const restItem of normalizedBreaks) {
        await client.query(
          `INSERT INTO lms.l_schedule_break (day_template_id, break_start, break_end, label)
           VALUES ($1, $2::time, $3::time, $4)`,
          [
            dayTemplate.id,
            toTimeString(restItem.break_start),
            toTimeString(restItem.break_end),
            restItem.label,
          ],
        );
      }

      let cursorMinute = startMinute;
      let slotNo = 1;
      while (cursorMinute < endMinute) {
        const matchingBreak = normalizedBreaks.find(
          (rest) => cursorMinute >= rest.break_start && cursorMinute < rest.break_end,
        );
        if (matchingBreak) {
          cursorMinute = matchingBreak.break_end;
          continue;
        }

        const nextMinute = cursorMinute + sessionMinutes;
        if (nextMinute > endMinute) break;

        const overlapBreak = normalizedBreaks.find((rest) =>
          overlapTime(cursorMinute, nextMinute, rest.break_start, rest.break_end),
        );
        if (overlapBreak) {
          cursorMinute = overlapBreak.break_end;
          continue;
        }

        await client.query(
          `INSERT INTO lms.l_time_slot (
             config_id,
             day_of_week,
             slot_no,
             start_time,
             end_time,
             is_break
           )
           VALUES ($1, $2, $3, $4::time, $5::time, false)`,
          [
            config.id,
            dayOfWeek,
            slotNo,
            toTimeString(cursorMinute),
            toTimeString(nextMinute),
          ],
        );
        slotNo += 1;
        cursorMinute = nextMinute;
      }
    }

    return res.json({
      status: "success",
      message: "Konfigurasi jadwal berhasil disimpan.",
      data: config,
    });
  }),
);

router.post(
  "/schedule/load",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const {
      id,
      periode_id,
      class_id,
      subject_id,
      teacher_id,
      weekly_sessions,
      max_sessions_per_meeting = 2,
      require_different_days = true,
      minimum_gap_slots = 4,
      is_active = true,
    } = req.body || {};

    const periodeId = await ensureActivePeriode(client, homebase_id, toInt(periode_id, null));
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const minimumGapSlots = toInt(minimum_gap_slots, 4);
    const allowSameDayWithGap = minimumGapSlots > 0;

    const payload = [
      homebase_id,
      periodeId,
      toInt(class_id, null),
      toInt(subject_id, null),
      toInt(teacher_id, null),
      toInt(weekly_sessions, null),
      toInt(max_sessions_per_meeting, 2),
      Boolean(require_different_days),
      allowSameDayWithGap,
      minimumGapSlots,
      Boolean(is_active),
      userId,
    ];
    if (payload.slice(2, 6).some((value) => !value)) {
      return res.status(400).json({
        status: "error",
        message: "class_id, subject_id, teacher_id, dan weekly_sessions wajib diisi.",
      });
    }

    const assignmentValidation = await client.query(
      `SELECT 1
       FROM public.at_subject ats
       JOIN public.u_teachers t ON t.user_id = ats.teacher_id
       JOIN public.a_subject s ON s.id = ats.subject_id
       JOIN public.a_class c ON c.id = ats.class_id
       WHERE ats.teacher_id = $1
         AND ats.subject_id = $2
         AND ats.class_id = $3
         AND t.homebase_id = $4
         AND s.homebase_id = $4
         AND c.homebase_id = $4
       LIMIT 1`,
      [payload[4], payload[3], payload[2], homebase_id],
    );
    if (assignmentValidation.rowCount === 0) {
      return res.status(400).json({
        status: "error",
        message: "Kombinasi guru, mapel, dan kelas tidak ditemukan di alokasi mengajar.",
      });
    }

    const isUpdate = Boolean(toInt(id, null));
    const sql = isUpdate
      ? `UPDATE lms.l_teaching_load
         SET class_id = $3,
             subject_id = $4,
             teacher_id = $5,
             weekly_sessions = $6,
             max_sessions_per_meeting = $7,
             require_different_days = $8,
             allow_same_day_with_gap = $9,
             minimum_gap_slots = $10,
             is_active = $11,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $12
           AND homebase_id = $1
           AND periode_id = $2
         RETURNING *`
      : `INSERT INTO lms.l_teaching_load (
           homebase_id,
           periode_id,
           class_id,
           subject_id,
           teacher_id,
           weekly_sessions,
           max_sessions_per_meeting,
           require_different_days,
           allow_same_day_with_gap,
           minimum_gap_slots,
           is_active,
           created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`;

    const result = await client.query(
      sql,
      isUpdate ? [...payload.slice(0, 11), toInt(id, null)] : payload,
    );
    return res.json({
      status: "success",
      message: isUpdate ? "Beban ajar berhasil diperbarui." : "Beban ajar berhasil ditambahkan.",
      data: result.rows[0],
    });
  }),
);

router.post(
  "/schedule/load/import",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const periodeId = await ensureActivePeriode(client, homebase_id, toInt(req.body?.periode_id, null));

    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({
        status: "error",
        message: "Data import kosong.",
      });
    }

    const assignmentResult = await client.query(
      `SELECT DISTINCT
         ats.teacher_id,
         ats.subject_id,
         ats.class_id
       FROM public.at_subject ats
       JOIN public.u_teachers t ON t.user_id = ats.teacher_id
       JOIN public.a_subject s ON s.id = ats.subject_id
       JOIN public.a_class c ON c.id = ats.class_id
       WHERE t.homebase_id = $1
         AND s.homebase_id = $1
         AND c.homebase_id = $1`,
      [homebase_id],
    );

    const validAssignmentKeys = new Set(
      assignmentResult.rows.map(
        (item) => `${item.teacher_id}:${item.subject_id}:${item.class_id}`,
      ),
    );

    const errors = [];
    let updatedCount = 0;

    for (const row of rows) {
      const rowNo = toInt(row?.row_no, updatedCount + errors.length + 2) || 0;
      const teacherId = toInt(row?.teacher_id, null);
      const subjectId = toInt(row?.subject_id, null);
      const classId = toInt(row?.class_id, null);
      const teachingLoadId = toInt(row?.teaching_load_id, null);
      const weeklySessions = toInt(row?.weekly_sessions, null);

      if (!teacherId || !subjectId || !classId) {
        errors.push({
          row_no: rowNo,
          message: "teacher_id, subject_id, atau class_id tidak valid.",
        });
        continue;
      }

      if (!weeklySessions || weeklySessions <= 0) {
        errors.push({
          row_no: rowNo,
          message: "beban_sesi wajib berupa angka lebih dari 0.",
        });
        continue;
      }

      const assignmentKey = `${teacherId}:${subjectId}:${classId}`;
      if (!validAssignmentKeys.has(assignmentKey)) {
        errors.push({
          row_no: rowNo,
          message: "Kombinasi guru, mapel, dan kelas tidak ditemukan di alokasi mengajar.",
        });
        continue;
      }

      const maxSessionsPerMeeting = toInt(row?.max_sessions_per_meeting, 2);
      const minimumGapSlots = toInt(row?.minimum_gap_slots, 4);
      const requireDifferentDays =
        typeof row?.require_different_days === "boolean"
          ? row.require_different_days
          : true;
      const allowSameDayWithGap = minimumGapSlots > 0;
      const isActive =
        typeof row?.is_active === "boolean" ? row.is_active : true;

      const existingLoad = teachingLoadId
        ? await client.query(
            `SELECT id
             FROM lms.l_teaching_load
             WHERE id = $1
               AND homebase_id = $2
               AND periode_id = $3
             LIMIT 1`,
            [teachingLoadId, homebase_id, periodeId],
          )
        : { rowCount: 0 };

      if (existingLoad.rowCount > 0) {
        await client.query(
          `UPDATE lms.l_teaching_load
           SET teacher_id = $2,
               subject_id = $3,
               class_id = $4,
               weekly_sessions = $5,
               max_sessions_per_meeting = $6,
               require_different_days = $7,
               allow_same_day_with_gap = $8,
               minimum_gap_slots = $9,
               is_active = $10,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            teachingLoadId,
            teacherId,
            subjectId,
            classId,
            weeklySessions,
            maxSessionsPerMeeting,
            requireDifferentDays,
            allowSameDayWithGap,
            minimumGapSlots,
            isActive,
          ],
        );
      } else {
        await client.query(
          `INSERT INTO lms.l_teaching_load (
             homebase_id,
             periode_id,
             class_id,
             subject_id,
             teacher_id,
             weekly_sessions,
             max_sessions_per_meeting,
             require_different_days,
             allow_same_day_with_gap,
             minimum_gap_slots,
             is_active,
             created_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (periode_id, class_id, subject_id, teacher_id)
           DO UPDATE SET
             weekly_sessions = EXCLUDED.weekly_sessions,
             max_sessions_per_meeting = EXCLUDED.max_sessions_per_meeting,
             require_different_days = EXCLUDED.require_different_days,
             allow_same_day_with_gap = EXCLUDED.allow_same_day_with_gap,
             minimum_gap_slots = EXCLUDED.minimum_gap_slots,
             is_active = EXCLUDED.is_active,
             updated_at = CURRENT_TIMESTAMP`,
          [
            homebase_id,
            periodeId,
            classId,
            subjectId,
            teacherId,
            weeklySessions,
            maxSessionsPerMeeting,
            requireDifferentDays,
            allowSameDayWithGap,
            minimumGapSlots,
            isActive,
            userId,
          ],
        );
      }

      updatedCount += 1;
    }

    return res.json({
      status: "success",
      message: "Import beban ajar selesai diproses.",
      data: {
        total_rows: rows.length,
        updated_count: updatedCount,
        error_count: errors.length,
        errors,
      },
    });
  }),
);

router.delete(
  "/schedule/load/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const id = toInt(req.params.id, null);
    if (!id) {
      return res.status(400).json({ status: "error", message: "ID tidak valid." });
    }

    await client.query(
      `DELETE FROM lms.l_teaching_load
       WHERE id = $1
         AND homebase_id = $2`,
      [id, homebase_id],
    );

    return res.json({ status: "success", message: "Beban ajar dihapus." });
  }),
);

router.post(
  "/schedule/unavailability",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const {
      id,
      periode_id,
      teacher_id,
      day_of_week,
      specific_date = null,
      start_time = null,
      end_time = null,
      reason = null,
      is_active = true,
      entries = null,
      replace_ids = [],
    } = req.body || {};

    const periodeId = await ensureActivePeriode(client, homebase_id, toInt(periode_id, null));
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const teacherId = toInt(teacher_id, null);
    if (!teacherId) {
      return res.status(400).json({
        status: "error",
        message: "teacher_id wajib diisi.",
      });
    }

    const normalizedEntries = Array.isArray(entries) && entries.length > 0
      ? entries
          .map((item) => ({
            id: toInt(item?.id, null),
            day_of_week: toInt(item?.day_of_week, null),
            specific_date: item?.specific_date || null,
            start_time: item?.start_time || null,
            end_time: item?.end_time || null,
            reason: item?.reason ?? null,
            is_active: typeof item?.is_active === "boolean" ? item.is_active : Boolean(is_active),
          }))
          .filter((item) => item.day_of_week || item.specific_date)
      : null;

    if (normalizedEntries?.some((item) => item.specific_date)) {
      return res.status(400).json({
        status: "error",
        message:
          "Ketentuan jadwal otomatis hanya mendukung aturan mingguan berbasis hari. specific_date tidak digunakan di modul ini.",
      });
    }

    if (normalizedEntries) {
      if (normalizedEntries.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Minimal satu hari ketidaktersediaan wajib diisi.",
        });
      }

      const replaceIds = [...new Set((replace_ids || []).map((value) => toInt(value, null)).filter(Boolean))];
      const keptIds = normalizedEntries.map((item) => item.id).filter(Boolean);
      const deletedIds = replaceIds.filter((value) => !keptIds.includes(value));

      if (deletedIds.length > 0) {
        await client.query(
          `DELETE FROM lms.l_teacher_unavailability
           WHERE id = ANY($1::int[])
             AND teacher_id = $2
             AND periode_id = $3`,
          [deletedIds, teacherId, periodeId],
        );
      }

      const savedRows = [];
      for (const entry of normalizedEntries) {
        if (!entry.day_of_week && !entry.specific_date) {
          return res.status(400).json({
            status: "error",
            message: "Setiap entri wajib memiliki hari atau tanggal spesifik.",
          });
        }

        const params = [
          teacherId,
          periodeId,
          entry.day_of_week,
          entry.specific_date,
          entry.start_time,
          entry.end_time,
          entry.reason,
          Boolean(entry.is_active),
          userId,
        ];

        const isBatchUpdate = Boolean(entry.id);
        const sql = isBatchUpdate
          ? `UPDATE lms.l_teacher_unavailability
             SET teacher_id = $1,
                 periode_id = $2,
                 day_of_week = $3,
                 specific_date = $4,
                 start_time = $5,
                 end_time = $6,
                 reason = $7,
                 is_active = $8,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $10
               AND teacher_id = $1
               AND periode_id = $2
             RETURNING *`
          : `INSERT INTO lms.l_teacher_unavailability (
               teacher_id,
               periode_id,
               day_of_week,
               specific_date,
               start_time,
               end_time,
               reason,
               is_active,
               created_by
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`;

        const result = await client.query(
          sql,
          isBatchUpdate ? [...params, entry.id] : params,
        );

        if (isBatchUpdate && result.rowCount === 0) {
          return res.status(404).json({
            status: "error",
            message: "Salah satu ketentuan guru tidak ditemukan.",
          });
        }

        savedRows.push(result.rows[0]);
      }

      return res.json({
        status: "success",
        message: "Ketentuan guru berhasil disimpan.",
        data: savedRows,
      });
    }

    if (specific_date) {
      return res.status(400).json({
        status: "error",
        message:
          "Ketentuan jadwal otomatis hanya mendukung aturan mingguan berbasis hari. specific_date tidak digunakan di modul ini.",
      });
    }

    if (!toInt(day_of_week, null)) {
      return res.status(400).json({
        status: "error",
        message: "day_of_week wajib diisi untuk ketentuan jadwal otomatis.",
      });
    }

    const params = [
      teacherId,
      periodeId,
      toInt(day_of_week, null),
      specific_date,
      start_time || null,
      end_time || null,
      reason,
      Boolean(is_active),
      userId,
    ];

    const isUpdate = Boolean(toInt(id, null));
    const sql = isUpdate
      ? `UPDATE lms.l_teacher_unavailability
         SET teacher_id = $1,
             periode_id = $2,
             day_of_week = $3,
             specific_date = $4,
             start_time = $5,
             end_time = $6,
             reason = $7,
             is_active = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10
           AND teacher_id = $1
           AND periode_id = $2
         RETURNING *`
      : `INSERT INTO lms.l_teacher_unavailability (
           teacher_id,
           periode_id,
           day_of_week,
           specific_date,
           start_time,
           end_time,
           reason,
           is_active,
           created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`;

    const result = await client.query(sql, isUpdate ? [...params, toInt(id, null)] : params);
    return res.json({
      status: "success",
      message: isUpdate ? "Ketentuan guru diperbarui." : "Ketentuan guru ditambahkan.",
      data: result.rows[0],
    });
  }),
);

router.delete(
  "/schedule/unavailability/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const id = toInt(req.params.id, null);
    if (!id) {
      return res.status(400).json({ status: "error", message: "ID tidak valid." });
    }
    await client.query(`DELETE FROM lms.l_teacher_unavailability WHERE id = $1`, [id]);
    return res.json({ status: "success", message: "Ketentuan guru dihapus." });
  }),
);

router.post(
  "/schedule/activity",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const {
      id,
      periode_id,
      name,
      day_of_week,
      slot_start_id,
      slot_count,
      scope_type = "all_classes",
      description = null,
      is_active = true,
      teaching_load_ids = [],
    } = req.body || {};

    const periodeId = await ensureActivePeriode(client, homebase_id, toInt(periode_id, null));
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const normalizedName = String(name || "").trim();
    if (!normalizedName) {
      return res.status(400).json({
        status: "error",
        message: "Nama kegiatan wajib diisi.",
      });
    }

    const scopeType = ["all_classes", "teaching_load"].includes(scope_type)
      ? scope_type
      : "all_classes";
    const nextDay = toInt(day_of_week, null);
    const nextSlotStartId = toInt(slot_start_id, null);
    const nextSlotCount = toInt(slot_count, null);

    if (!nextDay || !nextSlotStartId || !nextSlotCount) {
      return res.status(400).json({
        status: "error",
        message: "Hari, slot mulai, dan jumlah slot wajib diisi.",
      });
    }

    const startSlotResult = await client.query(
      `SELECT ts.*, cfg.homebase_id, cfg.periode_id
       FROM lms.l_time_slot ts
       JOIN lms.l_schedule_config cfg ON cfg.id = ts.config_id
       WHERE ts.id = $1
       LIMIT 1`,
      [nextSlotStartId],
    );
    if (startSlotResult.rowCount === 0) {
      return res.status(400).json({
        status: "error",
        message: "slot_start_id tidak valid.",
      });
    }

    const startSlot = startSlotResult.rows[0];
    if (
      Number(startSlot.homebase_id) !== Number(homebase_id) ||
      Number(startSlot.periode_id) !== Number(periodeId)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Slot mulai tidak cocok dengan homebase/periode aktif.",
      });
    }

    if (Number(startSlot.day_of_week) !== Number(nextDay)) {
      return res.status(400).json({
        status: "error",
        message: "Hari tidak sesuai dengan slot mulai yang dipilih.",
      });
    }

    const startSlotNo = toInt(startSlot.slot_no, 0);
    const segmentResult = await client.query(
      `SELECT id, slot_no
       FROM lms.l_time_slot
       WHERE config_id = $1
         AND day_of_week = $2
         AND is_break = false
         AND slot_no BETWEEN $3 AND $4
       ORDER BY slot_no`,
      [startSlot.config_id, nextDay, startSlotNo, startSlotNo + nextSlotCount - 1],
    );
    if (segmentResult.rowCount !== nextSlotCount) {
      return res.status(400).json({
        status: "error",
        message: "Slot kegiatan harus berurutan dan tersedia sesuai jumlah slot.",
      });
    }

    const normalizedTeachingLoadIds = [
      ...new Set((teaching_load_ids || []).map((item) => toInt(item, null)).filter(Boolean)),
    ];

    let targetRows = [];
    if (scopeType === "teaching_load") {
      if (normalizedTeachingLoadIds.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Minimal satu beban ajar wajib dipilih untuk kegiatan berbasis beban ajar.",
        });
      }

      const loadResult = await client.query(
        `SELECT id, teacher_id, subject_id, class_id
         FROM lms.l_teaching_load
         WHERE id = ANY($1::int[])
           AND homebase_id = $2
           AND periode_id = $3
           AND is_active = true`,
        [normalizedTeachingLoadIds, homebase_id, periodeId],
      );
      if (loadResult.rowCount !== normalizedTeachingLoadIds.length) {
        return res.status(400).json({
          status: "error",
          message: "Salah satu beban ajar yang dipilih tidak valid atau tidak aktif.",
        });
      }
      targetRows = loadResult.rows;
    }

    const isUpdate = Boolean(toInt(id, null));
    const sql = isUpdate
      ? `UPDATE lms.l_schedule_activity
         SET name = $3,
             day_of_week = $4,
             slot_start_id = $5,
             slot_count = $6,
             scope_type = $7,
             description = $8,
             is_active = $9,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10
           AND homebase_id = $1
           AND periode_id = $2
         RETURNING *`
      : `INSERT INTO lms.l_schedule_activity (
           homebase_id,
           periode_id,
           name,
           day_of_week,
           slot_start_id,
           slot_count,
           scope_type,
           description,
           is_active,
           created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`;

    const params = isUpdate
      ? [
          homebase_id,
          periodeId,
          normalizedName,
          nextDay,
          nextSlotStartId,
          nextSlotCount,
          scopeType,
          description,
          Boolean(is_active),
          toInt(id, null),
        ]
      : [
          homebase_id,
          periodeId,
          normalizedName,
          nextDay,
          nextSlotStartId,
          nextSlotCount,
          scopeType,
          description,
          Boolean(is_active),
          userId,
        ];

    const activityResult = await client.query(sql, params);

    if (isUpdate && activityResult.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Kegiatan tidak ditemukan.",
      });
    }

    const activity = activityResult.rows[0];

    await client.query(`DELETE FROM lms.l_schedule_activity_target WHERE activity_id = $1`, [
      activity.id,
    ]);

    for (const target of targetRows) {
      await client.query(
        `INSERT INTO lms.l_schedule_activity_target (
           activity_id,
           teaching_load_id,
           teacher_id,
           subject_id,
           class_id
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [activity.id, target.id, target.teacher_id, target.subject_id, target.class_id],
      );
    }

    return res.json({
      status: "success",
      message: isUpdate ? "Kegiatan berhasil diperbarui." : "Kegiatan berhasil ditambahkan.",
      data: {
        ...activity,
        teaching_load_ids: targetRows.map((item) => item.id),
      },
    });
  }),
);

router.delete(
  "/schedule/activity/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const id = toInt(req.params.id, null);
    if (!id) {
      return res.status(400).json({ status: "error", message: "ID kegiatan tidak valid." });
    }

    await client.query(
      `DELETE FROM lms.l_schedule_activity
       WHERE id = $1
         AND homebase_id = $2`,
      [id, homebase_id],
    );

    return res.json({ status: "success", message: "Kegiatan dihapus." });
  }),
);

router.post(
  "/schedule/generate",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const action = GENERATE_ACTIONS.has(req.body?.action)
      ? req.body.action
      : "regenerate_generated";
    const dryRun = Boolean(req.body?.dry_run);
    const periodeId = await ensureActivePeriode(
      client,
      homebase_id,
      toInt(req.body?.periode_id, null),
    );

    if (!periodeId) {
      return res.status(400).json({ status: "error", message: "Periode aktif tidak ditemukan." });
    }

    const configResult = await client.query(
      `SELECT *
       FROM lms.l_schedule_config
       WHERE homebase_id = $1
         AND periode_id = $2
       LIMIT 1`,
      [homebase_id, periodeId],
    );
    const config = configResult.rows[0];
    if (!config) {
      return res.status(400).json({
        status: "error",
        message: "Konfigurasi jadwal belum tersedia.",
      });
    }

    const [
      loadResult,
      slotResult,
      unavailabilityResult,
      existingEntrySummaryResult,
      classResult,
      activityResult,
      activityTargetResult,
    ] =
      await Promise.all([
        client.query(
          `SELECT *
           FROM lms.l_teaching_load
           WHERE homebase_id = $1
             AND periode_id = $2
             AND is_active = true
           ORDER BY class_id, subject_id, teacher_id`,
          [homebase_id, periodeId],
        ),
        client.query(
          `SELECT *
           FROM lms.l_time_slot
           WHERE config_id = $1
             AND is_break = false
           ORDER BY day_of_week, slot_no`,
          [config.id],
        ),
        client.query(
          `SELECT *
           FROM lms.l_teacher_unavailability
           WHERE periode_id = $1
             AND is_active = true
             AND specific_date IS NULL`,
          [periodeId],
        ),
        client.query(
          `SELECT
             COUNT(*) FILTER (WHERE status <> 'archived')::int AS total_entries,
             COUNT(*) FILTER (
               WHERE status <> 'archived'
                 AND source_type = 'generated'
                 AND COALESCE(locked, false) = false
                 AND COALESCE(is_manual_override, false) = false
             )::int AS generated_replaceable_entries,
             COUNT(*) FILTER (
               WHERE status <> 'archived'
                 AND (source_type = 'manual' OR COALESCE(is_manual_override, false) = true)
             )::int AS manual_entries,
             COUNT(*) FILTER (
               WHERE status <> 'archived'
                 AND COALESCE(locked, false) = true
             )::int AS locked_entries
           FROM lms.l_schedule_entry
           WHERE homebase_id = $1
             AND periode_id = $2`,
          [homebase_id, periodeId],
        ),
        client.query(
          `SELECT id
           FROM public.a_class
           WHERE homebase_id = $1
             AND COALESCE(is_active, true) = true`,
          [homebase_id],
        ),
        client.query(
          `SELECT
             a.id,
             a.scope_type,
             a.day_of_week,
             slot_agg.slot_ids
           FROM lms.l_schedule_activity a
           LEFT JOIN LATERAL (
             SELECT ARRAY_AGG(ts.id ORDER BY ts.slot_no) AS slot_ids
             FROM lms.l_time_slot ts
             JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
             WHERE ts.config_id = start_slot.config_id
               AND ts.day_of_week = a.day_of_week
               AND ts.slot_no BETWEEN start_slot.slot_no AND start_slot.slot_no + a.slot_count - 1
           ) slot_agg ON true
           WHERE a.homebase_id = $1
             AND a.periode_id = $2
             AND a.is_active = true`,
          [homebase_id, periodeId],
        ),
        client.query(
          `SELECT t.activity_id, t.class_id, t.teacher_id
           FROM lms.l_schedule_activity_target t
           JOIN lms.l_schedule_activity a ON a.id = t.activity_id
           WHERE a.homebase_id = $1
             AND a.periode_id = $2
             AND a.is_active = true`,
          [homebase_id, periodeId],
        ),
      ]);

    const existingSummary = existingEntrySummaryResult.rows[0] || {
      total_entries: 0,
      generated_replaceable_entries: 0,
      manual_entries: 0,
      locked_entries: 0,
    };

    if (action === "generate_new" && Number(existingSummary.total_entries || 0) > 0) {
      return res.status(409).json({
        status: "error",
        message:
          "Generate baru hanya dapat dijalankan saat periode ini belum memiliki jadwal. Gunakan regenerate atau reset generated schedule.",
        data: {
          action,
          dry_run: dryRun,
          existing_entries: existingSummary,
        },
      });
    }

    const shouldClearGenerated =
      action === "regenerate_generated" || action === "reset_generated";
    const deletableGeneratedCount = Number(existingSummary.generated_replaceable_entries || 0);

    const occupiedClassSlot = new Set();
    const occupiedTeacherSlot = new Set();

    const preservedSlots = await client.query(
      `SELECT ess.day_of_week, ess.slot_id, ess.class_id, ess.teacher_id
       FROM lms.l_schedule_entry_slot ess
       JOIN lms.l_schedule_entry e ON e.id = ess.schedule_entry_id
       WHERE e.homebase_id = $1
         AND e.periode_id = $2
         AND e.status <> 'archived'
         AND NOT (
           $3::boolean = true
           AND e.source_type = 'generated'
           AND COALESCE(e.locked, false) = false
           AND COALESCE(e.is_manual_override, false) = false
         )`,
      [homebase_id, periodeId, shouldClearGenerated],
    );

    for (const item of preservedSlots.rows) {
      occupiedClassSlot.add(`${item.day_of_week}:${item.slot_id}:${item.class_id}`);
      occupiedTeacherSlot.add(`${item.day_of_week}:${item.slot_id}:${item.teacher_id}`);
    }

    const allClassIds = classResult.rows.map((item) => Number(item.id));
    const activityTargetsByActivity = activityTargetResult.rows.reduce((acc, row) => {
      const key = Number(row.activity_id);
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push({
        class_id: Number(row.class_id),
        teacher_id: Number(row.teacher_id),
      });
      return acc;
    }, new Map());

    for (const activity of activityResult.rows) {
      const slotIds = Array.isArray(activity.slot_ids)
        ? activity.slot_ids.map((item) => Number(item))
        : [];
      const day = Number(activity.day_of_week);
      if (!slotIds.length || !day) continue;

      if (activity.scope_type === "all_classes") {
        for (const classId of allClassIds) {
          for (const slotId of slotIds) {
            occupiedClassSlot.add(`${day}:${slotId}:${classId}`);
          }
        }
        continue;
      }

      const targets = activityTargetsByActivity.get(Number(activity.id)) || [];
      for (const target of targets) {
        for (const slotId of slotIds) {
          occupiedClassSlot.add(`${day}:${slotId}:${target.class_id}`);
          occupiedTeacherSlot.add(`${day}:${slotId}:${target.teacher_id}`);
        }
      }
    }

    const slotByDay = slotResult.rows.reduce((acc, slot) => {
      const key = Number(slot.day_of_week);
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push(slot);
      return acc;
    }, new Map());
    for (const daySlots of slotByDay.values()) {
      daySlots.sort((a, b) => Number(a.slot_no) - Number(b.slot_no));
    }

    const blockedByTeacher = unavailabilityResult.rows.reduce((acc, row) => {
      const key = Number(row.teacher_id);
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push({
        day_of_week: row.day_of_week ? Number(row.day_of_week) : null,
        start_minute: row.start_time ? parseMinute(row.start_time) : null,
        end_minute: row.end_time ? parseMinute(row.end_time) : null,
      });
      return acc;
    }, new Map());

    const baseSummary = {
      total_loads: loadResult.rowCount,
      total_slots: slotResult.rowCount,
      weekly_rules: unavailabilityResult.rowCount,
      deleted_generated_entries: shouldClearGenerated ? deletableGeneratedCount : 0,
      existing_entries: {
        total_entries: Number(existingSummary.total_entries || 0),
        generated_replaceable_entries: deletableGeneratedCount,
        manual_entries: Number(existingSummary.manual_entries || 0),
        locked_entries: Number(existingSummary.locked_entries || 0),
      },
      action,
      dry_run: dryRun,
    };

    if (action === "reset_generated") {
      if (!dryRun && deletableGeneratedCount > 0) {
        await client.query(
          `DELETE FROM lms.l_schedule_entry_slot ess
           USING lms.l_schedule_entry e
           WHERE ess.schedule_entry_id = e.id
             AND e.homebase_id = $1
             AND e.periode_id = $2
             AND e.source_type = 'generated'
             AND COALESCE(e.locked, false) = false
             AND COALESCE(e.is_manual_override, false) = false`,
          [homebase_id, periodeId],
        );

        await client.query(
          `DELETE FROM lms.l_schedule_entry
           WHERE homebase_id = $1
             AND periode_id = $2
             AND source_type = 'generated'
             AND COALESCE(locked, false) = false
             AND COALESCE(is_manual_override, false) = false`,
          [homebase_id, periodeId],
        );
      }

      return res.json({
        status: "success",
        message: dryRun
          ? "Simulasi reset jadwal otomatis selesai."
          : "Jadwal otomatis berhasil direset.",
        data: {
          operation: dryRun ? "preview_reset" : "reset_generated",
          action,
          dry_run: dryRun,
          generated_entries: 0,
          failed_items: [],
          failed_summary: [],
          summary: {
            ...baseSummary,
            generated_entries: 0,
            failed_count: 0,
          },
        },
      });
    }

    let run = null;
    if (!dryRun) {
      const runResult = await client.query(
        `INSERT INTO lms.l_schedule_generation_run (config_id, generated_by, strategy, status)
         VALUES ($1, $2, $3, 'running')
         RETURNING *`,
        [config.id, userId, "greedy-first-fit"],
      );
      run = runResult.rows[0];

      if (shouldClearGenerated) {
        await client.query(
          `DELETE FROM lms.l_schedule_entry_slot ess
           USING lms.l_schedule_entry e
           WHERE ess.schedule_entry_id = e.id
             AND e.homebase_id = $1
             AND e.periode_id = $2
             AND e.source_type = 'generated'
             AND COALESCE(e.locked, false) = false
             AND COALESCE(e.is_manual_override, false) = false`,
          [homebase_id, periodeId],
        );

        await client.query(
          `DELETE FROM lms.l_schedule_entry
           WHERE homebase_id = $1
             AND periode_id = $2
             AND source_type = 'generated'
             AND COALESCE(locked, false) = false
             AND COALESCE(is_manual_override, false) = false`,
          [homebase_id, periodeId],
        );
      }
    }

    const failedItems = [];
    let insertedCount = 0;

    for (const load of loadResult.rows) {
      const chunks = splitSessions(load.weekly_sessions, load.max_sessions_per_meeting);
      const meetingsPlaced = [];

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
        const chunkSize = chunks[chunkIndex];
        let chosen = null;

        const requireDifferentDays =
          Boolean(load.require_different_days) &&
          Number(load.weekly_sessions) > Number(load.max_sessions_per_meeting || 2);
        const allowSameDayWithGap = Boolean(load.allow_same_day_with_gap);
        const effectiveGap = toInt(load.minimum_gap_slots, 0);
        const disallowSameSubjectSameDay = effectiveGap === 0;
        const attemptStats = {
          no_day_slots: 0,
          same_day_rule: 0,
          no_contiguous_segment: 0,
          gap_rule: 0,
          class_conflict: 0,
          teacher_conflict: 0,
          teacher_unavailability: 0,
        };

        for (let day = 1; day <= 7 && !chosen; day += 1) {
          const daySlots = slotByDay.get(day) || [];
          if (!daySlots.length) {
            attemptStats.no_day_slots += 1;
            continue;
          }

          const existingSameDayMeetings = meetingsPlaced.filter(
            (meeting) => Number(meeting.day_of_week) === day,
          );

          if (
            existingSameDayMeetings.length > 0 &&
            requireDifferentDays &&
            !allowSameDayWithGap
          ) {
            attemptStats.same_day_rule += 1;
            continue;
          }

          if (existingSameDayMeetings.length > 0 && disallowSameSubjectSameDay) {
            attemptStats.same_day_rule += 1;
            continue;
          }

          for (let startIdx = 0; startIdx <= daySlots.length - chunkSize; startIdx += 1) {
            const segment = daySlots.slice(startIdx, startIdx + chunkSize);
            const contiguous = segment.every((slot, idx) =>
              idx === 0 ? true : Number(slot.slot_no) === Number(segment[idx - 1].slot_no) + 1,
            );
            if (!contiguous) {
              attemptStats.no_contiguous_segment += 1;
              continue;
            }

            const startSlotNo = Number(segment[0].slot_no);
            const endSlotNo = Number(segment[segment.length - 1].slot_no);

            if (existingSameDayMeetings.length > 0) {
              const passGap = existingSameDayMeetings.every((meeting) =>
                gapSatisfied(
                  startSlotNo,
                  endSlotNo,
                  Number(meeting.start_slot_no),
                  Number(meeting.end_slot_no),
                  effectiveGap,
                ),
              );
              if (!passGap) {
                attemptStats.gap_rule += 1;
                continue;
              }
            }

            const hasClassConflict = segment.some((slot) =>
              occupiedClassSlot.has(`${day}:${slot.id}:${load.class_id}`),
            );
            const hasTeacherConflict = segment.some((slot) =>
              occupiedTeacherSlot.has(`${day}:${slot.id}:${load.teacher_id}`),
            );
            if (hasClassConflict || hasTeacherConflict) {
              if (hasClassConflict) attemptStats.class_conflict += 1;
              if (hasTeacherConflict) attemptStats.teacher_conflict += 1;
              continue;
            }

            const teacherBlocks = blockedByTeacher.get(Number(load.teacher_id)) || [];
            const violatingBlock = segment.some((slot) => {
              const startMinute = parseMinute(slot.start_time);
              const endMinute = parseMinute(slot.end_time);
              return teacherBlocks.some((block) => {
                if (block.day_of_week && Number(block.day_of_week) !== day) return false;
                if (block.start_minute === null || block.end_minute === null) return true;
                return overlapTime(
                  startMinute,
                  endMinute,
                  block.start_minute,
                  block.end_minute,
                );
              });
            });
            if (violatingBlock) {
              attemptStats.teacher_unavailability += 1;
              continue;
            }

            chosen = { day_of_week: day, segment };
            break;
          }
        }

        if (!chosen) {
          const failureCode = getPrimaryFailureCode(attemptStats);
          failedItems.push({
            teaching_load_id: load.id,
            class_id: load.class_id,
            subject_id: load.subject_id,
            teacher_id: load.teacher_id,
            weekly_sessions: load.weekly_sessions,
            meeting_no: chunkIndex + 1,
            chunk_size: chunkSize,
            failure_code: failureCode,
            failure_reason: FAILURE_LABELS[failureCode] || FAILURE_LABELS.no_available_slot,
            failure_summary: summarizeFailureStats(attemptStats),
            debug_counts: attemptStats,
            reason: `Tidak ada slot tersedia untuk pertemuan ke-${chunkIndex + 1}.`,
          });
          break;
        }

        if (!dryRun && run) {
          const insertedEntry = await client.query(
            `INSERT INTO lms.l_schedule_entry (
               homebase_id,
               periode_id,
               teaching_load_id,
               class_id,
               subject_id,
               teacher_id,
               day_of_week,
               slot_start_id,
               slot_count,
               meeting_no,
               source_type,
               status,
               generated_run_id,
               created_by
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'generated', 'draft', $11, $12)
             RETURNING *`,
            [
              homebase_id,
              periodeId,
              load.id,
              load.class_id,
              load.subject_id,
              load.teacher_id,
              chosen.day_of_week,
              chosen.segment[0].id,
              chunkSize,
              chunkIndex + 1,
              run.id,
              userId,
            ],
          );
          const entryId = insertedEntry.rows[0].id;

          for (const slot of chosen.segment) {
            await client.query(
              `INSERT INTO lms.l_schedule_entry_slot (
                 schedule_entry_id,
                 periode_id,
                 day_of_week,
                 slot_id,
                 class_id,
                 teacher_id
               )
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [entryId, periodeId, chosen.day_of_week, slot.id, load.class_id, load.teacher_id],
            );
          }
        }

        for (const slot of chosen.segment) {
          occupiedClassSlot.add(`${chosen.day_of_week}:${slot.id}:${load.class_id}`);
          occupiedTeacherSlot.add(`${chosen.day_of_week}:${slot.id}:${load.teacher_id}`);
        }

        meetingsPlaced.push({
          day_of_week: chosen.day_of_week,
          start_slot_no: chosen.segment[0].slot_no,
          end_slot_no: chosen.segment[chosen.segment.length - 1].slot_no,
        });
        insertedCount += 1;
      }
    }

    const failedSummary = Object.entries(aggregateFailureCodes(failedItems)).map(
      ([code, count]) => ({
        code,
        count,
        label: FAILURE_LABELS[code] || code,
      }),
    );

    if (!dryRun && run) {
      await client.query(
        `UPDATE lms.l_schedule_generation_run
         SET status = $2,
             notes = $3
         WHERE id = $1`,
        [
          run.id,
          failedItems.length ? "failed" : "success",
          failedItems.length
            ? JSON.stringify({
                failed_summary: failedSummary,
                failed_items: failedItems,
              })
            : `Generated ${insertedCount} entries`,
        ],
      );
    }

    return res.json({
      status: "success",
      message: dryRun
        ? failedItems.length
          ? "Simulasi generate selesai dengan beberapa konflik."
          : "Simulasi generate berhasil."
        : failedItems.length
          ? "Generate selesai dengan beberapa konflik."
          : "Generate jadwal berhasil.",
      data: {
        operation: dryRun ? "preview_generate" : action,
        action,
        dry_run: dryRun,
        generated_entries: insertedCount,
        failed_items: failedItems,
        failed_summary: failedSummary,
        summary: {
          ...baseSummary,
          generated_entries: insertedCount,
          failed_count: failedItems.length,
        },
      },
    });
  }),
);

router.post(
  "/schedule/entries/manual",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const periodeId = await ensureActivePeriode(
      client,
      homebase_id,
      toInt(req.body?.periode_id, null),
    );

    if (!periodeId) {
      return res.status(400).json({ status: "error", message: "Periode aktif tidak ditemukan." });
    }

    const teachingLoadId = toInt(req.body?.teaching_load_id, null);
    const nextDay = toInt(req.body?.day_of_week, null);
    const nextSlotStartId = toInt(req.body?.slot_start_id, null);
    const nextSlotCount = toInt(req.body?.slot_count, null);

    if (!teachingLoadId || !nextDay || !nextSlotStartId || !nextSlotCount) {
      return res.status(400).json({
        status: "error",
        message: "Beban ajar, hari, slot mulai, dan jumlah sesi wajib diisi.",
      });
    }

    const loadResult = await client.query(
      `SELECT *
       FROM lms.l_teaching_load
       WHERE id = $1
         AND homebase_id = $2
         AND periode_id = $3
         AND is_active = true
       LIMIT 1`,
      [teachingLoadId, homebase_id, periodeId],
    );
    if (loadResult.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Beban ajar tidak ditemukan atau tidak aktif.",
      });
    }

    const load = loadResult.rows[0];
    const maxSessionsPerMeeting = Number(load.max_sessions_per_meeting || 1);
    if (Number(nextSlotCount) > maxSessionsPerMeeting) {
      return res.status(409).json({
        status: "error",
        message: "Jumlah sesi melebihi batas maksimal sesi per pertemuan pada beban ajar.",
      });
    }

    const allocationResult = await client.query(
      `SELECT COALESCE(SUM(slot_count), 0) AS allocated_sessions
       FROM lms.l_schedule_entry
       WHERE teaching_load_id = $1
         AND status <> 'archived'`,
      [teachingLoadId],
    );
    const allocatedSessions = Number(allocationResult.rows[0]?.allocated_sessions || 0);
    const requestedSessions = Number(nextSlotCount || 0);

    if (allocatedSessions + requestedSessions > Number(load.weekly_sessions || 0)) {
      return res.status(409).json({
        status: "error",
        message: "Jumlah sesi manual melebihi target beban sesi per minggu.",
      });
    }

    const resolvedSegment = await resolveScheduleSegment({
      client,
      homebaseId: homebase_id,
      periodeId,
      dayOfWeek: nextDay,
      slotStartId: nextSlotStartId,
      slotCount: nextSlotCount,
    });
    if (resolvedSegment.error) {
      return res.status(400).json({ status: "error", message: resolvedSegment.error });
    }

    const segmentRows = resolvedSegment.segmentRows;
    const slotIds = segmentRows.map((row) => Number(row.id));
    const placementValidation = await validateScheduleEntryPlacement({
      client,
      periodeId,
      homebaseId: homebase_id,
      teacherId: Number(load.teacher_id),
      classId: Number(load.class_id),
      dayOfWeek: nextDay,
      slotIds,
    });
    if (placementValidation.error) {
      return res.status(placementValidation.status || 400).json({
        status: "error",
        message: placementValidation.error,
      });
    }

    const meetingNoResult = await client.query(
      `SELECT COALESCE(MAX(meeting_no), 0) + 1 AS next_meeting_no
       FROM lms.l_schedule_entry
       WHERE teaching_load_id = $1`,
      [teachingLoadId],
    );
    const meetingNo = Number(meetingNoResult.rows[0]?.next_meeting_no || 1);

    const entryResult = await client.query(
      `INSERT INTO lms.l_schedule_entry (
         homebase_id,
         periode_id,
         teaching_load_id,
         class_id,
         subject_id,
         teacher_id,
         day_of_week,
         slot_start_id,
         slot_count,
         meeting_no,
         source_type,
         is_manual_override,
         status,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'manual', true, 'draft', $11)
       RETURNING *`,
      [
        homebase_id,
        periodeId,
        teachingLoadId,
        load.class_id,
        load.subject_id,
        load.teacher_id,
        nextDay,
        resolvedSegment.startSlotId,
        nextSlotCount,
        meetingNo,
        userId,
      ],
    );

    const entry = entryResult.rows[0];

    for (const slot of segmentRows) {
      await client.query(
        `INSERT INTO lms.l_schedule_entry_slot (
           schedule_entry_id,
           periode_id,
           day_of_week,
           slot_id,
           class_id,
           teacher_id
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [entry.id, periodeId, nextDay, slot.id, load.class_id, load.teacher_id],
      );
    }

    await client.query(
      `INSERT INTO lms.l_schedule_entry_history (
         schedule_entry_id,
         action_type,
         old_data,
         new_data,
         changed_by
       )
       VALUES ($1, 'create', NULL, $2::jsonb, $3)`,
      [
        entry.id,
        JSON.stringify({
          teaching_load_id: teachingLoadId,
          day_of_week: nextDay,
          slot_start_id: resolvedSegment.startSlotId,
          slot_count: nextSlotCount,
          meeting_no: meetingNo,
          source_type: "manual",
        }),
        userId,
      ],
    );

    return res.json({
      status: "success",
      message: "Jadwal manual berhasil ditambahkan.",
      data: entry,
    });
  }),
);

router.delete(
  "/schedule/entries/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const entryId = toInt(req.params.id, null);
    if (!entryId) {
      return res.status(400).json({ status: "error", message: "ID jadwal tidak valid." });
    }

    const existingResult = await client.query(
      `SELECT *
       FROM lms.l_schedule_entry
       WHERE id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [entryId, homebase_id],
    );
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Data jadwal tidak ditemukan." });
    }

    const existing = existingResult.rows[0];
    const isManualEntry =
      existing.source_type === "manual" || Boolean(existing.is_manual_override);

    if (!isManualEntry) {
      return res.status(409).json({
        status: "error",
        message: "Hanya jadwal manual yang dapat dihapus langsung.",
      });
    }

    await client.query(`DELETE FROM lms.l_schedule_entry_slot WHERE schedule_entry_id = $1`, [
      entryId,
    ]);

    await client.query(
      `INSERT INTO lms.l_schedule_entry_history (
         schedule_entry_id,
         action_type,
         old_data,
         new_data,
         changed_by
       )
       VALUES ($1, 'delete', $2::jsonb, NULL, $3)`,
      [
        entryId,
        JSON.stringify(existing),
        userId,
      ],
    );

    await client.query(`DELETE FROM lms.l_schedule_entry WHERE id = $1`, [entryId]);

    return res.json({ status: "success", message: "Jadwal manual dihapus." });
  }),
);

router.patch(
  "/schedule/entries/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const entryId = toInt(req.params.id, null);
    if (!entryId) {
      return res.status(400).json({ status: "error", message: "ID jadwal tidak valid." });
    }

    const existingResult = await client.query(
      `SELECT e.*, ts.config_id, ts.slot_no AS start_slot_no
       FROM lms.l_schedule_entry e
       JOIN lms.l_time_slot ts ON ts.id = e.slot_start_id
       WHERE e.id = $1
         AND e.homebase_id = $2
       LIMIT 1`,
      [entryId, homebase_id],
    );
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Data jadwal tidak ditemukan." });
    }

    const existing = existingResult.rows[0];
    const nextDay = toInt(req.body?.day_of_week, existing.day_of_week);
    const nextSlotStartId = toInt(req.body?.slot_start_id, existing.slot_start_id);
    const nextSlotCount = toInt(req.body?.slot_count, existing.slot_count);

    const allocationResult = await client.query(
      `SELECT COALESCE(SUM(slot_count), 0) AS allocated_sessions
       FROM lms.l_schedule_entry
       WHERE teaching_load_id = $1
         AND status <> 'archived'
         AND id <> $2`,
      [existing.teaching_load_id, entryId],
    );
    const maxWeeklyResult = await client.query(
      `SELECT weekly_sessions, max_sessions_per_meeting
       FROM lms.l_teaching_load
       WHERE id = $1
       LIMIT 1`,
      [existing.teaching_load_id],
    );
    const allocatedSessions = Number(allocationResult.rows[0]?.allocated_sessions || 0);
    const maxWeeklySessions = Number(maxWeeklyResult.rows[0]?.weekly_sessions || 0);
    const maxSessionsPerMeeting = Number(
      maxWeeklyResult.rows[0]?.max_sessions_per_meeting || 1,
    );

    if (Number(nextSlotCount) > maxSessionsPerMeeting) {
      return res.status(409).json({
        status: "error",
        message: "Jumlah sesi melebihi batas maksimal sesi per pertemuan pada beban ajar.",
      });
    }

    if (allocatedSessions + Number(nextSlotCount || 0) > maxWeeklySessions) {
      return res.status(409).json({
        status: "error",
        message: "Jumlah sesi melebihi target beban sesi per minggu.",
      });
    }

    const resolvedSegment = await resolveScheduleSegment({
      client,
      homebaseId: homebase_id,
      periodeId: existing.periode_id,
      dayOfWeek: nextDay,
      slotStartId: nextSlotStartId,
      slotCount: nextSlotCount,
    });
    if (resolvedSegment.error) {
      return res.status(400).json({ status: "error", message: resolvedSegment.error });
    }

    const segmentRows = resolvedSegment.segmentRows;
    const slotIds = segmentRows.map((row) => Number(row.id));
    const placementValidation = await validateScheduleEntryPlacement({
      client,
      entryId,
      periodeId: existing.periode_id,
      homebaseId: homebase_id,
      teacherId: Number(existing.teacher_id),
      classId: Number(existing.class_id),
      dayOfWeek: nextDay,
      slotIds,
    });
    if (placementValidation.error) {
      return res.status(placementValidation.status || 400).json({
        status: "error",
        message: placementValidation.error,
      });
    }

    await client.query(
      `UPDATE lms.l_schedule_entry
       SET day_of_week = $2,
           slot_start_id = $3,
           slot_count = $4,
           source_type = 'manual',
           is_manual_override = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [entryId, nextDay, resolvedSegment.startSlotId, nextSlotCount],
    );

    await client.query(`DELETE FROM lms.l_schedule_entry_slot WHERE schedule_entry_id = $1`, [
      entryId,
    ]);

    for (const slot of segmentRows) {
      await client.query(
        `INSERT INTO lms.l_schedule_entry_slot (
           schedule_entry_id,
           periode_id,
           day_of_week,
           slot_id,
           class_id,
           teacher_id
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entryId,
          existing.periode_id,
          nextDay,
          slot.id,
          existing.class_id,
          existing.teacher_id,
        ],
      );
    }

    await client.query(
      `INSERT INTO lms.l_schedule_entry_history (
         schedule_entry_id,
         action_type,
         old_data,
         new_data,
         changed_by
       )
       VALUES ($1, 'update', $2::jsonb, $3::jsonb, $4)`,
      [
        entryId,
        JSON.stringify({
          day_of_week: existing.day_of_week,
          slot_start_id: existing.slot_start_id,
          slot_count: existing.slot_count,
        }),
        JSON.stringify({
          day_of_week: nextDay,
          slot_start_id: resolvedSegment.startSlotId,
          slot_count: nextSlotCount,
        }),
        userId,
      ],
    );

    return res.json({
      status: "success",
      message: "Jadwal berhasil diperbarui.",
      data: {
        id: entryId,
        day_of_week: nextDay,
        day_name: dayLabels[nextDay] || String(nextDay),
      },
    });
  }),
);

export default router;
