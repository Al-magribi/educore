import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import { ensureStaffTable } from "../../services/academic/staffTable.js";

const router = Router();

const validateStaffPayload = (body = {}) => {
  const fullName = String(body.full_name || "").trim();
  const nip = String(body.nip || "").trim() || null;
  const phone = String(body.phone || "").trim() || null;
  const email = String(body.email || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;
  const rfidNo = String(body.rfid_no || "").trim() || null;
  const isActive = body.is_active === undefined ? true : Boolean(body.is_active);

  if (!fullName) return { error: "Nama tendik wajib diisi" };
  if (fullName.length > 150) return { error: "Nama tendik maksimal 150 karakter" };
  if (nip && nip.length > 50) return { error: "NIP maksimal 50 karakter" };
  if (phone && phone.length > 30) return { error: "Telepon maksimal 30 karakter" };
  if (email && email.length > 120) return { error: "Email maksimal 120 karakter" };
  if (rfidNo && rfidNo.length > 100) return { error: "No RFID maksimal 100 karakter" };

  return {
    data: {
      full_name: fullName,
      nip,
      phone,
      email,
      notes,
      rfid_no: rfidNo,
      is_active: isActive,
    },
  };
};

const assertRfidAvailable = async (db, rfidNo, staffId) => {
  if (!rfidNo) return null;

  const cardTable = await db.query(`SELECT to_regclass('attendance.rfid_card') AS rel`);
  if (cardTable.rows[0]?.rel) {
    const takenByUser = await db.query(
      `
        SELECT 1
        FROM attendance.rfid_card
        WHERE lower(trim(card_uid)) = lower($1)
        LIMIT 1
      `,
      [rfidNo],
    );
    if (takenByUser.rowCount > 0) {
      return "No RFID sudah dipakai user lain.";
    }
  }

  const params = [rfidNo];
  let excludeSql = "";
  if (staffId) {
    params.push(staffId);
    excludeSql = " AND id <> $2";
  }
  const takenByStaff = await db.query(
    `
      SELECT 1
      FROM public.u_staff
      WHERE rfid_no IS NOT NULL
        AND lower(trim(rfid_no)) = lower($1)
        ${excludeSql}
      LIMIT 1
    `,
    params,
  );
  if (takenByStaff.rowCount > 0) {
    return "No RFID sudah dipakai tendik lain.";
  }

  return null;
};

const referenceChecks = [
  ["finance.honor_assignment", "jabatan"],
  ["finance.honor_eskul_assignment", "eskul"],
  ["finance.honor_payroll_line", "slip honor"],
];

const findStaffReferences = async (db, staffId, homebaseId) => {
  const labels = [];
  for (const [tableName, label] of referenceChecks) {
    const exists = await db.query(`SELECT to_regclass($1) AS rel`, [tableName]);
    if (!exists.rows[0]?.rel) continue;
    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM ${tableName} WHERE staff_id = $1 AND homebase_id = $2`,
      [staffId, homebaseId],
    );
    if (Number(count.rows[0]?.total || 0) > 0) labels.push(label);
  }
  return labels;
};

router.get(
  "/staff",
  authorize("satuan"),
  withQuery(async (req, res, db) => {
    await ensureStaffTable(db);
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    const search = String(req.query.search || "").trim();
    const offset = (page - 1) * limit;
    const homebaseId = req.user.homebase_id;

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih" });
    }

    const params = [homebaseId];
    let whereClause = "s.homebase_id = $1";
    if (search) {
      params.push(`%${search}%`);
      whereClause += `
        AND (
          s.full_name ILIKE $${params.length}
          OR COALESCE(s.nip, '') ILIKE $${params.length}
          OR COALESCE(s.phone, '') ILIKE $${params.length}
          OR COALESCE(s.email, '') ILIKE $${params.length}
          OR COALESCE(s.rfid_no, '') ILIKE $${params.length}
        )
      `;
    }

    const result = await db.query(
      `
        SELECT s.id, s.full_name, s.nip, s.phone, s.email, s.notes, s.rfid_no, s.is_active
        FROM public.u_staff s
        WHERE ${whereClause}
        ORDER BY s.full_name ASC, s.id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset],
    );
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM public.u_staff s WHERE ${whereClause}`,
      params,
    );

    res.json({
      status: "success",
      data: result.rows,
      total: countResult.rows[0].total,
      page,
      limit,
    });
  }),
);

router.post(
  "/staff",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    await ensureStaffTable(client);
    const homebaseId = req.user.homebase_id;
    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih" });
    }

    const validated = validateStaffPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const rfidError = await assertRfidAvailable(client, validated.data.rfid_no);
    if (rfidError) {
      return res.status(400).json({ message: rfidError });
    }

    const result = await client.query(
      `
        INSERT INTO public.u_staff (
          homebase_id, full_name, nip, phone, email, notes, rfid_no, is_active, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        RETURNING id, full_name, nip, phone, email, notes, rfid_no, is_active
      `,
      [
        homebaseId,
        validated.data.full_name,
        validated.data.nip,
        validated.data.phone,
        validated.data.email,
        validated.data.notes,
        validated.data.rfid_no,
        validated.data.is_active,
        req.user.id,
      ],
    );

    res.status(201).json({
      status: "success",
      message: "Tendik berhasil ditambahkan",
      data: result.rows[0],
    });
  }),
);

router.put(
  "/staff/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    await ensureStaffTable(client);
    const staffId = Number.parseInt(req.params.id, 10);
    const homebaseId = req.user.homebase_id;
    if (!staffId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const validated = validateStaffPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const rfidError = await assertRfidAvailable(client, validated.data.rfid_no, staffId);
    if (rfidError) {
      return res.status(400).json({ message: rfidError });
    }

    const result = await client.query(
      `
        UPDATE public.u_staff
        SET
          full_name = $1,
          nip = $2,
          phone = $3,
          email = $4,
          notes = $5,
          rfid_no = $6,
          is_active = $7,
          updated_by = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 AND homebase_id = $10
        RETURNING id, full_name, nip, phone, email, notes, rfid_no, is_active
      `,
      [
        validated.data.full_name,
        validated.data.nip,
        validated.data.phone,
        validated.data.email,
        validated.data.notes,
        validated.data.rfid_no,
        validated.data.is_active,
        req.user.id,
        staffId,
        homebaseId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Tendik tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Tendik berhasil diperbarui",
      data: result.rows[0],
    });
  }),
);

router.delete(
  "/staff/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    await ensureStaffTable(client);
    const staffId = Number.parseInt(req.params.id, 10);
    const homebaseId = req.user.homebase_id;
    if (!staffId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const references = await findStaffReferences(client, staffId, homebaseId);
    if (references.length) {
      return res.status(400).json({
        message: `Tendik masih dipakai di ${references.join(", ")}. Nonaktifkan saja, jangan dihapus.`,
      });
    }

    const result = await client.query(
      `
        DELETE FROM public.u_staff
        WHERE id = $1 AND homebase_id = $2
        RETURNING id
      `,
      [staffId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Tendik tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Tendik berhasil dihapus",
      data: { id: staffId },
    });
  }),
);

export default router;
