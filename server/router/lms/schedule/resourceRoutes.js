import { authorize } from "../../../middleware/authorize.js";
import { withTransaction } from "../../../utils/wrapper.js";
import { ensureActivePeriode, getColumnPresence, toInt } from "./shared.js";

export const registerScheduleResourceRoutes = (router) => {
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
         WHERE config_group_id = $1
           AND day_of_week = $2
           AND is_break = false
           AND slot_no BETWEEN $3 AND $4
         ORDER BY slot_no`,
        [startSlot.config_group_id, nextDay, startSlotNo, startSlotNo + nextSlotCount - 1],
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

      const activityColumns = await getColumnPresence(client, "l_schedule_activity", ["config_id"]);
      const hasActivityConfigId = Boolean(activityColumns.config_id);

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
             ${hasActivityConfigId ? "AND config_id = $11" : ""}
           RETURNING *`
        : `INSERT INTO lms.l_schedule_activity (
             homebase_id,
             periode_id,
             ${hasActivityConfigId ? "config_id," : ""}
             name,
             day_of_week,
             slot_start_id,
             slot_count,
             scope_type,
             description,
             is_active,
             created_by
           )
           VALUES ($1, $2, ${hasActivityConfigId ? "$3, " : ""}${
             hasActivityConfigId ? "$4, $5, $6, $7, $8, $9, $10, $11" : "$3, $4, $5, $6, $7, $8, $9, $10"
           })
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
            ...(hasActivityConfigId ? [startSlot.config_id] : []),
          ]
        : [
            homebase_id,
            periodeId,
            ...(hasActivityConfigId ? [startSlot.config_id] : []),
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
};
