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

const syncGradeRulesToTeachingLoad = async (executor, homebaseId, periodeId, userId = null) => {
  const gradeRuleResult = await executor.query(
    `SELECT *
     FROM lms.l_teaching_load_grade_rule
     WHERE homebase_id = $1
       AND periode_id = $2
       AND is_active = true`,
    [homebaseId, periodeId],
  );

  let syncedRows = 0;
  for (const rule of gradeRuleResult.rows) {
    const assignmentResult = await executor.query(
      `SELECT DISTINCT
         COALESCE(ats.class_id, c.id) AS class_id,
         ats.teacher_id
       FROM public.at_subject ats
       JOIN public.u_teachers t ON t.user_id = ats.teacher_id
       JOIN public.a_class c
         ON c.homebase_id = $1
        AND c.grade_id = $2
        AND (ats.class_id IS NULL OR ats.class_id = c.id)
       WHERE t.homebase_id = $1
         AND ats.subject_id = $3
         AND (ats.class_id IS NULL OR c.id = ats.class_id)`,
      [homebaseId, rule.grade_id, rule.subject_id],
    );

    for (const assignment of assignmentResult.rows) {
      await executor.query(
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
          homebaseId,
          periodeId,
          assignment.class_id,
          rule.subject_id,
          assignment.teacher_id,
          rule.weekly_sessions,
          rule.max_sessions_per_meeting,
          rule.require_different_days,
          rule.allow_same_day_with_gap,
          rule.minimum_gap_slots,
          rule.is_active,
          userId || rule.created_by || null,
        ],
      );
      syncedRows += 1;
    }
  }

  return {
    rule_count: gradeRuleResult.rowCount,
    synced_rows: syncedRows,
  };
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

    const [loadResult, unavailabilityResult] = await Promise.all([
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
    ]);

    const assignmentResult = await pool.query(
      `WITH assignment_expanded AS (
         SELECT DISTINCT
           ats.teacher_id,
           ats.subject_id,
           c.id AS class_id,
           c.name AS class_name,
           c.grade_id
         FROM public.at_subject ats
         JOIN public.u_teachers t ON t.user_id = ats.teacher_id
         JOIN public.a_subject s ON s.id = ats.subject_id
         JOIN public.a_class c
           ON c.homebase_id = $1
          AND (ats.class_id IS NULL OR ats.class_id = c.id)
         WHERE t.homebase_id = $1
           AND s.homebase_id = $1
       )
       SELECT
         a.teacher_id,
         a.subject_id,
         a.grade_id,
         u.full_name AS teacher_name,
         s.name AS subject_name,
         g.name AS grade_name,
         ARRAY_AGG(DISTINCT a.class_id ORDER BY a.class_id) AS class_ids,
         ARRAY_AGG(DISTINCT a.class_name ORDER BY a.class_name) AS class_names,
         STRING_AGG(DISTINCT a.class_name, ', ' ORDER BY a.class_name) AS class_name,
         COUNT(DISTINCT a.class_id) AS class_count,
         r.id AS teaching_load_grade_rule_id,
         r.weekly_sessions,
         r.max_sessions_per_meeting,
         r.require_different_days,
         r.allow_same_day_with_gap,
         r.minimum_gap_slots,
         r.is_active
       FROM assignment_expanded a
       JOIN public.u_users u ON u.id = a.teacher_id
       JOIN public.a_subject s ON s.id = a.subject_id
       LEFT JOIN public.a_grade g ON g.id = a.grade_id
       LEFT JOIN lms.l_teaching_load_grade_rule r
         ON r.homebase_id = $1
        AND r.periode_id = $2
        AND r.grade_id = a.grade_id
        AND r.subject_id = a.subject_id
       GROUP BY
         a.teacher_id,
         a.subject_id,
         a.grade_id,
         u.full_name,
         s.name,
         g.name,
         r.id,
         r.weekly_sessions,
         r.max_sessions_per_meeting,
         r.require_different_days,
         r.allow_same_day_with_gap,
         r.minimum_gap_slots,
         r.is_active
       ORDER BY u.full_name, s.name, g.name`,
      [homebase_id, periodeId],
    );

    const gradeRuleResult = await pool.query(
      `SELECT
         r.*,
         g.name AS grade_name,
         s.name AS subject_name
       FROM lms.l_teaching_load_grade_rule r
       JOIN public.a_grade g ON g.id = r.grade_id
       JOIN public.a_subject s ON s.id = r.subject_id
       WHERE r.homebase_id = $1
         AND r.periode_id = $2
       ORDER BY g.name, s.name`,
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
         c.name AS class_name,
         s.name AS subject_name,
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
        `SELECT id, name
         FROM public.a_class
         WHERE homebase_id = $1
         ORDER BY name ASC`,
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
        load_grade_rules: gradeRuleResult.rows,
        teacher_assignments: assignmentResult.rows,
        unavailability: unavailabilityResult.rows,
        entries: entryResult.rows,
        classes: classResult.rows,
        subjects: subjectResult.rows,
        teachers: teacherResult.rows,
        grades: gradeResult.rows,
        can_manage:
          role === "admin" && (admin_level === "satuan" || admin_level === "center"),
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
      scope_type = "class",
      grade_id,
      class_id,
      subject_id,
      teacher_id,
      weekly_sessions,
      max_sessions_per_meeting = 2,
      require_different_days = true,
      allow_same_day_with_gap = true,
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

    const scopeType = String(scope_type || "class").toLowerCase();
    if (scopeType === "grade") {
      const gradeId = toInt(grade_id, null);
      const subjectId = toInt(subject_id, null);
      const weeklySessions = toInt(weekly_sessions, null);
      if (!gradeId || !subjectId || !weeklySessions) {
        return res.status(400).json({
          status: "error",
          message: "grade_id, subject_id, dan weekly_sessions wajib diisi untuk mode tingkat.",
        });
      }

      const rulePayload = [
        homebase_id,
        periodeId,
        gradeId,
        subjectId,
        weeklySessions,
        toInt(max_sessions_per_meeting, 2),
        Boolean(require_different_days),
        Boolean(allow_same_day_with_gap),
        toInt(minimum_gap_slots, 4),
        Boolean(is_active),
        userId,
      ];
      const ruleId = toInt(id, null);
      const gradeRuleResult = ruleId
        ? await client.query(
            `UPDATE lms.l_teaching_load_grade_rule
             SET grade_id = $3,
                 subject_id = $4,
                 weekly_sessions = $5,
                 max_sessions_per_meeting = $6,
                 require_different_days = $7,
                 allow_same_day_with_gap = $8,
                 minimum_gap_slots = $9,
                 is_active = $10,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $12
               AND homebase_id = $1
               AND periode_id = $2
             RETURNING *`,
            [...rulePayload, ruleId],
          )
        : await client.query(
            `INSERT INTO lms.l_teaching_load_grade_rule (
               homebase_id,
               periode_id,
               grade_id,
               subject_id,
               weekly_sessions,
               max_sessions_per_meeting,
               require_different_days,
               allow_same_day_with_gap,
               minimum_gap_slots,
               is_active,
               created_by
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (homebase_id, periode_id, grade_id, subject_id)
             DO UPDATE SET
               weekly_sessions = EXCLUDED.weekly_sessions,
               max_sessions_per_meeting = EXCLUDED.max_sessions_per_meeting,
               require_different_days = EXCLUDED.require_different_days,
               allow_same_day_with_gap = EXCLUDED.allow_same_day_with_gap,
               minimum_gap_slots = EXCLUDED.minimum_gap_slots,
               is_active = EXCLUDED.is_active,
               updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            rulePayload,
          );

      if (ruleId && gradeRuleResult.rowCount === 0) {
        return res.status(404).json({
          status: "error",
          message: "Aturan beban ajar tingkat tidak ditemukan.",
        });
      }

      const syncStats = await syncGradeRulesToTeachingLoad(client, homebase_id, periodeId, userId);
      return res.json({
        status: "success",
        message: "Aturan beban ajar tingkat berhasil disimpan dan diterapkan.",
        data: {
          scope_type: "grade",
          rule: gradeRuleResult.rows[0],
          sync: syncStats,
        },
      });
    }

    const payload = [
      homebase_id,
      periodeId,
      toInt(class_id, null),
      toInt(subject_id, null),
      toInt(teacher_id, null),
      toInt(weekly_sessions, null),
      toInt(max_sessions_per_meeting, 2),
      Boolean(require_different_days),
      Boolean(allow_same_day_with_gap),
      toInt(minimum_gap_slots, 4),
      Boolean(is_active),
      userId,
    ];
    if (payload.slice(2, 6).some((value) => !value)) {
      return res.status(400).json({
        status: "error",
        message: "class_id, subject_id, teacher_id, dan weekly_sessions wajib diisi.",
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

    const result = await client.query(sql, isUpdate ? [...payload, toInt(id, null)] : payload);
    return res.json({
      status: "success",
      message: isUpdate ? "Beban ajar berhasil diperbarui." : "Beban ajar berhasil ditambahkan.",
      data: result.rows[0],
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
    } = req.body || {};

    const periodeId = await ensureActivePeriode(client, homebase_id, toInt(periode_id, null));
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    if (!toInt(teacher_id, null) || (!toInt(day_of_week, null) && !specific_date)) {
      return res.status(400).json({
        status: "error",
        message: "teacher_id dan salah satu day_of_week/specific_date wajib diisi.",
      });
    }

    const params = [
      toInt(teacher_id, null),
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
  "/schedule/generate",
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

    await syncGradeRulesToTeachingLoad(client, homebase_id, periodeId, userId);

    const [loadResult, slotResult, unavailabilityResult] = await Promise.all([
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
    ]);

    const runResult = await client.query(
      `INSERT INTO lms.l_schedule_generation_run (config_id, generated_by, strategy, status)
       VALUES ($1, $2, $3, 'running')
       RETURNING *`,
      [config.id, userId, "greedy-first-fit"],
    );
    const run = runResult.rows[0];

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

    const occupiedClassSlot = new Set();
    const occupiedTeacherSlot = new Set();

    const preservedSlots = await client.query(
      `SELECT ess.day_of_week, ess.slot_id, ess.class_id, ess.teacher_id
       FROM lms.l_schedule_entry_slot ess
       JOIN lms.l_schedule_entry e ON e.id = ess.schedule_entry_id
       WHERE e.homebase_id = $1
         AND e.periode_id = $2
         AND e.status <> 'archived'`,
      [homebase_id, periodeId],
    );

    for (const item of preservedSlots.rows) {
      occupiedClassSlot.add(`${item.day_of_week}:${item.slot_id}:${item.class_id}`);
      occupiedTeacherSlot.add(`${item.day_of_week}:${item.slot_id}:${item.teacher_id}`);
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

        for (let day = 1; day <= 7 && !chosen; day += 1) {
          const daySlots = slotByDay.get(day) || [];
          if (!daySlots.length) continue;

          const existingSameDayMeetings = meetingsPlaced.filter(
            (meeting) => Number(meeting.day_of_week) === day,
          );

          if (
            existingSameDayMeetings.length > 0 &&
            requireDifferentDays &&
            !allowSameDayWithGap
          ) {
            continue;
          }

          for (let startIdx = 0; startIdx <= daySlots.length - chunkSize; startIdx += 1) {
            const segment = daySlots.slice(startIdx, startIdx + chunkSize);
            const contiguous = segment.every((slot, idx) =>
              idx === 0 ? true : Number(slot.slot_no) === Number(segment[idx - 1].slot_no) + 1,
            );
            if (!contiguous) continue;

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
              if (!passGap) continue;
            }

            const isBusy = segment.some((slot) => {
              const classKey = `${day}:${slot.id}:${load.class_id}`;
              const teacherKey = `${day}:${slot.id}:${load.teacher_id}`;
              return occupiedClassSlot.has(classKey) || occupiedTeacherSlot.has(teacherKey);
            });
            if (isBusy) continue;

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
            if (violatingBlock) continue;

            chosen = { day_of_week: day, segment };
            break;
          }
        }

        if (!chosen) {
          failedItems.push({
            class_id: load.class_id,
            subject_id: load.subject_id,
            teacher_id: load.teacher_id,
            weekly_sessions: load.weekly_sessions,
            reason: `Tidak ada slot tersedia untuk pertemuan ke-${chunkIndex + 1}.`,
          });
          break;
        }

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

    await client.query(
      `UPDATE lms.l_schedule_generation_run
       SET status = $2,
           notes = $3
       WHERE id = $1`,
      [
        run.id,
        failedItems.length ? "failed" : "success",
        failedItems.length ? JSON.stringify(failedItems) : `Generated ${insertedCount} entries`,
      ],
    );

    return res.json({
      status: "success",
      message: failedItems.length
        ? "Generate selesai dengan beberapa konflik."
        : "Generate jadwal berhasil.",
      data: {
        generated_entries: insertedCount,
        failed_items: failedItems,
      },
    });
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

    const startSlotResult = await client.query(
      `SELECT *
       FROM lms.l_time_slot
       WHERE id = $1
       LIMIT 1`,
      [nextSlotStartId],
    );
    if (startSlotResult.rowCount === 0) {
      return res.status(400).json({ status: "error", message: "slot_start_id tidak valid." });
    }

    const startSlot = startSlotResult.rows[0];
    const configId = startSlot.config_id;
    const startSlotNo = toInt(startSlot.slot_no, 0);

    const segmentResult = await client.query(
      `SELECT id, slot_no, start_time, end_time
       FROM lms.l_time_slot
       WHERE config_id = $1
         AND day_of_week = $2
         AND is_break = false
         AND slot_no BETWEEN $3 AND $4
       ORDER BY slot_no`,
      [configId, nextDay, startSlotNo, startSlotNo + nextSlotCount - 1],
    );
    if (segmentResult.rowCount !== nextSlotCount) {
      return res.status(400).json({
        status: "error",
        message: "Slot berurutan tidak tersedia sesuai slot_count.",
      });
    }

    const slotIds = segmentResult.rows.map((row) => Number(row.id));
    const conflictResult = await client.query(
      `SELECT ess.id
       FROM lms.l_schedule_entry_slot ess
       JOIN lms.l_schedule_entry e ON e.id = ess.schedule_entry_id
       WHERE e.periode_id = $1
         AND e.id <> $2
         AND ess.day_of_week = $3
         AND ess.slot_id = ANY($4::int[])
         AND (ess.class_id = $5 OR ess.teacher_id = $6)
       LIMIT 1`,
      [
        existing.periode_id,
        entryId,
        nextDay,
        slotIds,
        existing.class_id,
        existing.teacher_id,
      ],
    );
    if (conflictResult.rowCount > 0) {
      return res.status(409).json({
        status: "error",
        message: "Jadwal bentrok dengan jadwal kelas/guru lain.",
      });
    }

    const teacherBlockResult = await client.query(
      `SELECT day_of_week, start_time, end_time
       FROM lms.l_teacher_unavailability
       WHERE teacher_id = $1
         AND periode_id = $2
         AND is_active = true
         AND specific_date IS NULL`,
      [existing.teacher_id, existing.periode_id],
    );

    const violating = segmentResult.rows.some((slot) => {
      const slotStart = parseMinute(slot.start_time);
      const slotEnd = parseMinute(slot.end_time);
      return teacherBlockResult.rows.some((block) => {
        const blockDay = toInt(block.day_of_week, null);
        if (blockDay && blockDay !== nextDay) return false;
        const blockStart = block.start_time ? parseMinute(block.start_time) : null;
        const blockEnd = block.end_time ? parseMinute(block.end_time) : null;
        if (blockStart === null || blockEnd === null) return true;
        return overlapTime(slotStart, slotEnd, blockStart, blockEnd);
      });
    });
    if (violating) {
      return res.status(409).json({
        status: "error",
        message: "Perubahan melanggar ketentuan waktu guru.",
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
      [entryId, nextDay, nextSlotStartId, nextSlotCount],
    );

    await client.query(`DELETE FROM lms.l_schedule_entry_slot WHERE schedule_entry_id = $1`, [
      entryId,
    ]);

    for (const slot of segmentResult.rows) {
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
          slot_start_id: nextSlotStartId,
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
