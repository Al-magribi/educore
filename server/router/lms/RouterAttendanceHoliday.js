import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  bulkDeleteAttendanceHolidays,
  createAttendanceHoliday,
  deleteAttendanceHoliday,
  getCalendarConfig,
  listAttendanceHolidays,
  updateAttendanceHoliday,
  upsertCalendarConfig,
} from "../../services/attendance/holidayCalendar.js";

const router = Router();

router.get(
  "/attendance/calendar/config",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const config = await getCalendarConfig(pool, homebase_id);

    return res.json({
      status: "success",
      data: config,
    });
  }),
);

router.put(
  "/attendance/calendar/config",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const body = req.body || {};

    try {
      const saved = await upsertCalendarConfig(client, homebase_id, body, userId);

      return res.json({
        status: "success",
        message: "Pengaturan kalender libur berhasil disimpan.",
        data: saved,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: String(error?.message || "Gagal menyimpan pengaturan kalender."),
      });
    }
  }),
);

router.get(
  "/attendance/calendar/holidays",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const year = req.query.year ? Number(req.query.year) : null;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;

    const rows = await listAttendanceHolidays(pool, homebase_id, {
      year: Number.isFinite(year) ? year : null,
      startDate,
      endDate,
    });

    return res.json({
      status: "success",
      data: rows,
    });
  }),
);

router.post(
  "/attendance/calendar/holidays",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;

    try {
      const row = await createAttendanceHoliday(client, homebase_id, req.body || {}, userId);

      return res.json({
        status: "success",
        message: "Hari libur berhasil ditambahkan.",
        data: row,
      });
    } catch (error) {
      const message = String(error?.message || "Gagal menambahkan hari libur.");
      const statusCode = message.includes("duplicate") ? 409 : 400;

      return res.status(statusCode).json({
        status: "error",
        message: message.includes("duplicate")
          ? "Libur untuk tanggal dan role tersebut sudah ada."
          : message,
      });
    }
  }),
);

router.put(
  "/attendance/calendar/holidays/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const holidayId = Number(req.params.id);

    if (!Number.isFinite(holidayId) || holidayId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "ID libur tidak valid.",
      });
    }

    try {
      const row = await updateAttendanceHoliday(
        client,
        homebase_id,
        holidayId,
        req.body || {},
      );

      return res.json({
        status: "success",
        message: "Hari libur berhasil diperbarui.",
        data: row,
      });
    } catch (error) {
      const message = String(error?.message || "Gagal memperbarui hari libur.");
      const statusCode = message.includes("tidak ditemukan")
        ? 404
        : message.includes("duplicate")
          ? 409
          : 400;

      return res.status(statusCode).json({
        status: "error",
        message: message.includes("duplicate")
          ? "Libur untuk tanggal dan role tersebut sudah ada."
          : message,
      });
    }
  }),
);

router.delete(
  "/attendance/calendar/holidays/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const holidayId = Number(req.params.id);

    if (!Number.isFinite(holidayId) || holidayId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "ID libur tidak valid.",
      });
    }

    const deletedId = await deleteAttendanceHoliday(client, homebase_id, holidayId);

    if (!deletedId) {
      return res.status(404).json({
        status: "error",
        message: "Data libur tidak ditemukan.",
      });
    }

    return res.json({
      status: "success",
      message: "Hari libur berhasil dihapus.",
      data: { id: deletedId },
    });
  }),
);

router.post(
  "/attendance/calendar/holidays/bulk-delete",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

    const deletedCount = await bulkDeleteAttendanceHolidays(client, homebase_id, ids);

    return res.json({
      status: "success",
      message: `${deletedCount} hari libur berhasil dihapus.`,
      data: { deleted_count: deletedCount },
    });
  }),
);

export default router;
