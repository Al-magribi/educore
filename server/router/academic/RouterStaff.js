import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const ensureStaffTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.u_staff (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      full_name VARCHAR(150) NOT NULL,
      nip VARCHAR(50),
      phone VARCHAR(30),
      email VARCHAR(120),
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
      updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT u_staff_name_not_blank CHECK (length(trim(full_name)) > 0)
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_u_staff_homebase_name
    ON public.u_staff (homebase_id, lower(trim(full_name)))
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_u_staff_homebase_active
    ON public.u_staff (homebase_id, is_active)
  `);
};

const validateStaffPayload = (body = {}) => {
  const fullName = String(body.full_name || "").trim();
  const nip = String(body.nip || "").trim() || null;
  const phone = String(body.phone || "").trim() || null;
  const email = String(body.email || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;
  const isActive = body.is_active === undefined ? true : Boolean(body.is_active);

  if (!fullName) return { error: "Nama tendik wajib diisi" };
  if (fullName.length > 150) return { error: "Nama tendik maksimal 150 karakter" };
  if (nip && nip.length > 50) return { error: "NIP maksimal 50 karakter" };
  if (phone && phone.length > 30) return { error: "Telepon maksimal 30 karakter" };
  if (email && email.length > 120) return { error: "Email maksimal 120 karakter" };

  return {
    data: {
      full_name: fullName,
      nip,
      phone,
      email,
      notes,
      is_active: isActive,
    },
  };
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
        )
      `;
    }

    const result = await db.query(
      `
        SELECT s.id, s.full_name, s.nip, s.phone, s.email, s.notes, s.is_active
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

    const result = await client.query(
      `
        INSERT INTO public.u_staff (
          homebase_id, full_name, nip, phone, email, notes, is_active, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        RETURNING id, full_name, nip, phone, email, notes, is_active
      `,
      [
        homebaseId,
        validated.data.full_name,
        validated.data.nip,
        validated.data.phone,
        validated.data.email,
        validated.data.notes,
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

    const result = await client.query(
      `
        UPDATE public.u_staff
        SET
          full_name = $1,
          nip = $2,
          phone = $3,
          email = $4,
          notes = $5,
          is_active = $6,
          updated_by = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8 AND homebase_id = $9
        RETURNING id, full_name, nip, phone, email, notes, is_active
      `,
      [
        validated.data.full_name,
        validated.data.nip,
        validated.data.phone,
        validated.data.email,
        validated.data.notes,
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
