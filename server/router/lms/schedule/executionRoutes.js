import { authorize } from "../../../middleware/authorize.js";
import { withTransaction } from "../../../utils/wrapper.js";
import {
  dayLabels,
  ensureActivePeriode,
  resolveScheduleSegment,
  toInt,
  validateScheduleEntryPlacement,
} from "./shared.js";

export const registerScheduleExecutionRoutes = (router) => {
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
        return res
          .status(400)
          .json({ status: "error", message: "Periode aktif tidak ditemukan." });
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
          message:
            "Jumlah sesi melebihi batas maksimal sesi per pertemuan pada beban ajar.",
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
        return res
          .status(400)
          .json({ status: "error", message: resolvedSegment.error });
      }

      const allocationResult = await client.query(
        `SELECT COALESCE(SUM(slot_count), 0) AS allocated_sessions
         FROM lms.l_schedule_entry
         WHERE config_id = $1
           AND teaching_load_id = $2
           AND status <> 'archived'`,
        [resolvedSegment.configId, teachingLoadId],
      );
      const allocatedSessions = Number(
        allocationResult.rows[0]?.allocated_sessions || 0,
      );
      const requestedSessions = Number(nextSlotCount || 0);

      if (allocatedSessions + requestedSessions > Number(load.weekly_sessions || 0)) {
        return res.status(409).json({
          status: "error",
          message: "Jumlah sesi manual melebihi target beban sesi per minggu.",
        });
      }

      const segmentRows = resolvedSegment.segmentRows;
      const slotIds = segmentRows.map((row) => Number(row.id));
      const placementValidation = await validateScheduleEntryPlacement({
        client,
        configId: resolvedSegment.configId,
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
         WHERE config_id = $1
           AND teaching_load_id = $2`,
        [resolvedSegment.configId, teachingLoadId],
      );
      const meetingNo = Number(meetingNoResult.rows[0]?.next_meeting_no || 1);

      const entryResult = await client.query(
        `INSERT INTO lms.l_schedule_entry (
           homebase_id,
           periode_id,
           config_id,
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'manual', true, 'draft', $12)
         RETURNING *`,
        [
          homebase_id,
          periodeId,
          resolvedSegment.configId,
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
        return res
          .status(400)
          .json({ status: "error", message: "ID jadwal tidak valid." });
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
        return res
          .status(404)
          .json({ status: "error", message: "Data jadwal tidak ditemukan." });
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

      await client.query(
        `DELETE FROM lms.l_schedule_entry_slot WHERE schedule_entry_id = $1`,
        [entryId],
      );

      await client.query(
        `INSERT INTO lms.l_schedule_entry_history (
           schedule_entry_id,
           action_type,
           old_data,
           new_data,
           changed_by
         )
         VALUES ($1, 'delete', $2::jsonb, NULL, $3)`,
        [entryId, JSON.stringify(existing), userId],
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
        return res
          .status(400)
          .json({ status: "error", message: "ID jadwal tidak valid." });
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
        return res
          .status(404)
          .json({ status: "error", message: "Data jadwal tidak ditemukan." });
      }

      const existing = existingResult.rows[0];
      const nextDay = toInt(req.body?.day_of_week, existing.day_of_week);
      const nextSlotStartId = toInt(req.body?.slot_start_id, existing.slot_start_id);
      const nextSlotCount = toInt(req.body?.slot_count, existing.slot_count);

      const allocationResult = await client.query(
        `SELECT COALESCE(SUM(slot_count), 0) AS allocated_sessions
         FROM lms.l_schedule_entry
         WHERE config_id = $1
           AND teaching_load_id = $2
           AND status <> 'archived'
           AND id <> $3`,
        [existing.config_id, existing.teaching_load_id, entryId],
      );
      const maxWeeklyResult = await client.query(
        `SELECT weekly_sessions, max_sessions_per_meeting
         FROM lms.l_teaching_load
         WHERE id = $1
         LIMIT 1`,
        [existing.teaching_load_id],
      );
      const allocatedSessions = Number(
        allocationResult.rows[0]?.allocated_sessions || 0,
      );
      const maxWeeklySessions = Number(
        maxWeeklyResult.rows[0]?.weekly_sessions || 0,
      );
      const maxSessionsPerMeeting = Number(
        maxWeeklyResult.rows[0]?.max_sessions_per_meeting || 1,
      );

      if (Number(nextSlotCount) > maxSessionsPerMeeting) {
        return res.status(409).json({
          status: "error",
          message:
            "Jumlah sesi melebihi batas maksimal sesi per pertemuan pada beban ajar.",
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
        return res
          .status(400)
          .json({ status: "error", message: resolvedSegment.error });
      }

      const segmentRows = resolvedSegment.segmentRows;
      const slotIds = segmentRows.map((row) => Number(row.id));
      const placementValidation = await validateScheduleEntryPlacement({
        client,
        entryId,
        configId: existing.config_id || resolvedSegment.configId,
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
         SET config_id = $2,
             day_of_week = $3,
             slot_start_id = $4,
             slot_count = $5,
             source_type = 'manual',
             is_manual_override = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
          entryId,
          resolvedSegment.configId,
          nextDay,
          resolvedSegment.startSlotId,
          nextSlotCount,
        ],
      );

      await client.query(
        `DELETE FROM lms.l_schedule_entry_slot WHERE schedule_entry_id = $1`,
        [entryId],
      );

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
};
