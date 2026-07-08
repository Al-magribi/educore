import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import { toJakartaDateString } from "../../services/attendance/rfidDailyAttendance.js";
import {
  isWhatsappClientReady,
  reconnectWhatsappClient,
  sendWhatsappMessage,
  startWhatsappClient,
} from "../../services/whatsapp/whatsappClientManager.js";
import { isValidPhone } from "../../services/whatsapp/phoneUtils.js";
import {
  retryFailedWhatsappBatch,
  runWhatsappNotificationJobForDate,
} from "../../services/whatsapp/runWhatsappBatch.js";
import {
  ensureWhatsappSessionRow,
  formatWhatsappTime,
  getWhatsappNotificationConfig,
  getWhatsappSession,
  upsertWhatsappNotificationConfig,
} from "../../services/whatsapp/whatsappSessionStore.js";

const router = Router();

const mapConfigResponse = (row) => ({
  ...row,
  send_time: formatWhatsappTime(row.send_time),
});

const mapSessionResponse = (row, homebaseId) => ({
  homebase_id: Number(homebaseId),
  session_status: row?.session_status || "disconnected",
  connected_phone: row?.connected_phone || null,
  qr_code: row?.qr_code || null,
  qr_generated_at: row?.qr_generated_at || null,
  last_connected_at: row?.last_connected_at || null,
  last_disconnected_at: row?.last_disconnected_at || null,
  last_error: row?.last_error || null,
  client_ready: isWhatsappClientReady(homebaseId),
});

const startWhatsappClientInBackground = (homebaseId) => {
  startWhatsappClient(homebaseId).catch((error) => {
    console.error(`[whatsapp] background init gagal homebase=${homebaseId}`, error);
  });
};

router.get(
  "/attendance/whatsapp/config",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const config = await getWhatsappNotificationConfig(pool, homebase_id);

    return res.json({
      status: "success",
      data: mapConfigResponse(config),
    });
  }),
);

router.put(
  "/attendance/whatsapp/config",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const body = req.body || {};

    try {
      const saved = await upsertWhatsappNotificationConfig(
        client,
        homebase_id,
        body,
        userId,
      );

      const config = await getWhatsappNotificationConfig(client, homebase_id);

      return res.json({
        status: "success",
        message: "Konfigurasi notifikasi WhatsApp berhasil disimpan.",
        data: mapConfigResponse(config || saved),
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: String(error?.message || "Gagal menyimpan konfigurasi WhatsApp."),
      });
    }
  }),
);

router.get(
  "/attendance/whatsapp/session",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const autoStart = String(req.query.auto_start || "").toLowerCase() === "true";

    await ensureWhatsappSessionRow(pool, homebase_id);
    let session = await getWhatsappSession(pool, homebase_id);

    if (
      autoStart &&
      session?.session_status !== "ready" &&
      session?.session_status !== "initializing" &&
      session?.session_status !== "qr_pending" &&
      session?.session_status !== "authenticated"
    ) {
      startWhatsappClientInBackground(homebase_id);
      session = await getWhatsappSession(pool, homebase_id);
    }

    return res.json({
      status: "success",
      data: mapSessionResponse(session, homebase_id),
    });
  }),
);

router.post(
  "/attendance/whatsapp/session/reconnect",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;

    try {
      await reconnectWhatsappClient(homebase_id);
      await ensureWhatsappSessionRow(pool, homebase_id);

      const session = await getWhatsappSession(pool, homebase_id);

      return res.json({
        status: "success",
        message: "Sesi WhatsApp direset. Scan QR baru jika diminta.",
        data: mapSessionResponse(session, homebase_id),
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: String(error?.message || "Gagal menghubungkan ulang sesi WhatsApp."),
      });
    }
  }),
);

router.post(
  "/attendance/whatsapp/test",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const phone = String(req.body?.phone || "").trim();
    const message = String(
      req.body?.message ||
        "Tes koneksi WhatsApp dari sistem absensi LMS. Pesan ini aman diabaikan.",
    ).trim();

    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Nomor telepon wajib diisi.",
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        status: "error",
        message: "Format nomor telepon tidak valid.",
      });
    }

    const session = await getWhatsappSession(pool, homebase_id);
    if (session?.session_status !== "ready" && !isWhatsappClientReady(homebase_id)) {
      return res.status(400).json({
        status: "error",
        message: "Sesi WhatsApp belum siap. Hubungkan dan scan QR terlebih dahulu.",
        data: mapSessionResponse(session, homebase_id),
      });
    }

    try {
      const result = await sendWhatsappMessage({
        homebaseId: homebase_id,
        phone,
        message,
      });

      return res.json({
        status: "success",
        message: "Pesan uji coba berhasil dikirim.",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: String(error?.message || "Gagal mengirim pesan uji coba."),
      });
    }
  }),
);

router.get(
  "/attendance/whatsapp/batches",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);

    const result = await pool.query(
      `SELECT
         b.*,
         p.name AS periode_name
       FROM attendance.whatsapp_notification_batch b
       LEFT JOIN public.a_periode p ON p.id = b.periode_id
       WHERE b.homebase_id = $1
         AND ($2::date IS NULL OR b.attendance_date >= $2::date)
         AND ($3::date IS NULL OR b.attendance_date <= $3::date)
       ORDER BY b.attendance_date DESC, b.id DESC
       LIMIT $4`,
      [homebase_id, startDate, endDate, limit],
    );

    return res.json({
      status: "success",
      data: result.rows,
    });
  }),
);

router.get(
  "/attendance/whatsapp/logs",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const batchId = req.query.batch_id ? Number(req.query.batch_id) : null;
    const attendanceDate = req.query.attendance_date || null;
    const deliveryStatus = req.query.delivery_status || null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

    if (!batchId && !attendanceDate) {
      return res.status(400).json({
        status: "error",
        message: "batch_id atau attendance_date wajib diisi.",
      });
    }

    const result = await pool.query(
      `SELECT
         l.*,
         b.attendance_date,
         b.batch_status
       FROM attendance.whatsapp_notification_log l
       JOIN attendance.whatsapp_notification_batch b ON b.id = l.batch_id
       WHERE l.homebase_id = $1
         AND ($2::bigint IS NULL OR l.batch_id = $2::bigint)
         AND ($3::date IS NULL OR b.attendance_date = $3::date)
         AND ($4::text IS NULL OR l.delivery_status = $4::text)
       ORDER BY l.id DESC
       LIMIT $5`,
      [homebase_id, batchId, attendanceDate, deliveryStatus, limit],
    );

    return res.json({
      status: "success",
      data: result.rows,
    });
  }),
);

router.post(
  "/attendance/whatsapp/batches/:id/retry-failed",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const batchId = Number(req.params.id);

    if (!Number.isFinite(batchId) || batchId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "ID batch tidak valid.",
      });
    }

    const result = await retryFailedWhatsappBatch({
      batchId,
      homebaseId: homebase_id,
      dbPool: pool,
    });

    if (result.status === "error") {
      return res.status(400).json({
        status: "error",
        message: result.message,
        data: result,
      });
    }

    return res.json({
      status: "success",
      message: result.message || "Retry pesan gagal selesai diproses.",
      data: result,
    });
  }),
);

router.post(
  "/attendance/whatsapp/run-now",
  authorize("satuan"),
  withQuery(async (req, res) => {
    const { homebase_id } = req.user;
    const attendanceDate = req.body?.attendance_date || toJakartaDateString();

    try {
      const result = await runWhatsappNotificationJobForDate({
        homebaseId: homebase_id,
        attendanceDate,
      });

      return res.json({
        status: "success",
        message: "Batch notifikasi WhatsApp diproses.",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: String(error?.message || "Gagal menjalankan batch WhatsApp."),
      });
    }
  }),
);

export default router;
