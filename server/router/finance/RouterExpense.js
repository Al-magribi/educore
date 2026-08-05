import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  parseAmount,
  parseOptionalInt,
  resolveScopedHomebaseId,
} from "./financeHelpers.js";

const router = Router();

const EXPENSE_CATEGORIES = [
  { value: "operational", label: "Operasional" },
  { value: "utilities", label: "Utilitas" },
  { value: "salary", label: "Gaji / Honor" },
  { value: "maintenance", label: "Pemeliharaan" },
  { value: "activity", label: "Kegiatan" },
  { value: "supplies", label: "ATK / Perlengkapan" },
  { value: "other", label: "Lainnya" },
];

const EXPENSE_PAYMENT_METHODS = [
  { value: "cash", label: "Tunai" },
  { value: "transfer", label: "Transfer" },
  { value: "other", label: "Lainnya" },
];

const CATEGORY_VALUES = new Set(EXPENSE_CATEGORIES.map((item) => item.value));
const PAYMENT_METHOD_VALUES = new Set(
  EXPENSE_PAYMENT_METHODS.map((item) => item.value),
);

let expenseSchemaReady = false;
let expenseSchemaReadyPromise = null;

const ensureExpenseTables = async (db) => {
  if (expenseSchemaReady) {
    return;
  }

  if (!expenseSchemaReadyPromise) {
    expenseSchemaReadyPromise = (async () => {
      await db.query(`CREATE SCHEMA IF NOT EXISTS finance`);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.expense (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          periode_id INT REFERENCES public.a_periode(id) ON DELETE SET NULL,
          category VARCHAR(30) NOT NULL
            CHECK (category IN (
              'operational',
              'utilities',
              'salary',
              'maintenance',
              'activity',
              'supplies',
              'other'
            )),
          title VARCHAR(150) NOT NULL,
          description TEXT,
          amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
          expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
          payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
            CHECK (payment_method IN ('cash', 'transfer', 'other')),
          reference_no VARCHAR(120),
          notes TEXT,
          created_by INT REFERENCES public.u_users(id),
          updated_by INT REFERENCES public.u_users(id),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_expense_homebase_date
        ON finance.expense(homebase_id, expense_date DESC)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_expense_periode
        ON finance.expense(homebase_id, periode_id, expense_date DESC)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_expense_category
        ON finance.expense(homebase_id, category, expense_date DESC)
      `);
    })()
      .then(() => {
        expenseSchemaReady = true;
      })
      .catch((error) => {
        expenseSchemaReadyPromise = null;
        throw error;
      });
  }

  await expenseSchemaReadyPromise;
};

const getAvailableHomebases = async (db, user) => {
  if (user.homebase_id) {
    const result = await db.query(
      `
        SELECT id, name, level
        FROM a_homebase
        WHERE id = $1
        LIMIT 1
      `,
      [user.homebase_id],
    );
    return result.rows;
  }

  const result = await db.query(
    `
      SELECT id, name, level
      FROM a_homebase
      ORDER BY name ASC
    `,
  );
  return result.rows;
};

const normalizeExpense = (row = {}) => ({
  ...row,
  id: Number(row.id || 0) || null,
  homebase_id: Number(row.homebase_id || 0) || null,
  periode_id: row.periode_id ? Number(row.periode_id) : null,
  amount: Number(row.amount || 0),
  created_by: row.created_by ? Number(row.created_by) : null,
  updated_by: row.updated_by ? Number(row.updated_by) : null,
});

const parseExpenseDate = (value) => {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return null;
  }

  return raw.slice(0, 10);
};

const validateExpensePayload = (body = {}) => {
  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim().toLowerCase();
  const paymentMethod = String(body.payment_method || "cash")
    .trim()
    .toLowerCase();
  const amount = parseAmount(body.amount);
  const expenseDate = parseExpenseDate(body.expense_date);
  const periodeId = parseOptionalInt(body.periode_id);
  const description = String(body.description || "").trim() || null;
  const referenceNo = String(body.reference_no || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;

  if (!title) {
    return { error: "Judul pengeluaran wajib diisi" };
  }

  if (title.length > 150) {
    return { error: "Judul maksimal 150 karakter" };
  }

  if (!CATEGORY_VALUES.has(category)) {
    return { error: "Kategori pengeluaran tidak valid" };
  }

  if (!PAYMENT_METHOD_VALUES.has(paymentMethod)) {
    return { error: "Metode pembayaran tidak valid" };
  }

  if (amount === null || amount <= 0) {
    return { error: "Nominal pengeluaran harus lebih dari 0" };
  }

  if (!expenseDate) {
    return { error: "Tanggal pengeluaran wajib diisi (YYYY-MM-DD)" };
  }

  return {
    data: {
      title,
      category,
      payment_method: paymentMethod,
      amount,
      expense_date: expenseDate,
      periode_id: periodeId,
      description,
      reference_no: referenceNo,
      notes,
    },
  };
};

router.get(
  "/expense/options",
  authorize("satuan", "keuangan", "pusat", "finance"),
  withQuery(async (req, res, db) => {
    await ensureExpenseTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const homebases = await getAvailableHomebases(db, req.user);

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const periodeResult = await db.query(
      `
        SELECT id, name, is_active
        FROM a_periode
        WHERE homebase_id = $1
        ORDER BY is_active DESC, created_at DESC
      `,
      [homebaseId],
    );

    res.json({
      status: "success",
      data: {
        homebases,
        selected_homebase_id: homebaseId,
        periodes: periodeResult.rows.map((item) => ({
          ...item,
          is_default: item.is_active,
        })),
        categories: EXPENSE_CATEGORIES,
        payment_methods: EXPENSE_PAYMENT_METHODS,
      },
    });
  }),
);

router.get(
  "/expense",
  authorize("satuan", "keuangan", "pusat", "finance"),
  withQuery(async (req, res, db) => {
    await ensureExpenseTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.query.periode_id);
    const category = String(req.query.category || "")
      .trim()
      .toLowerCase();
    const search = String(req.query.search || "").trim();
    const dateFrom = parseExpenseDate(req.query.date_from);
    const dateTo = parseExpenseDate(req.query.date_to);

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const params = [homebaseId];
    let whereClause = `WHERE e.homebase_id = $1`;

    if (periodeId) {
      params.push(periodeId);
      whereClause += ` AND e.periode_id = $${params.length}`;
    }

    if (category && CATEGORY_VALUES.has(category)) {
      params.push(category);
      whereClause += ` AND e.category = $${params.length}`;
    }

    if (dateFrom) {
      params.push(dateFrom);
      whereClause += ` AND e.expense_date >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      whereClause += ` AND e.expense_date <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += `
        AND (
          e.title ILIKE $${params.length}
          OR COALESCE(e.description, '') ILIKE $${params.length}
          OR COALESCE(e.reference_no, '') ILIKE $${params.length}
          OR COALESCE(e.notes, '') ILIKE $${params.length}
        )
      `;
    }

    const [listResult, summaryResult, categoryResult] = await Promise.all([
      db.query(
        `
          SELECT
            e.*,
            p.name AS periode_name,
            creator.full_name AS created_by_name,
            updater.full_name AS updated_by_name
          FROM finance.expense e
          LEFT JOIN a_periode p ON p.id = e.periode_id
          LEFT JOIN u_users creator ON creator.id = e.created_by
          LEFT JOIN u_users updater ON updater.id = e.updated_by
          ${whereClause}
          ORDER BY e.expense_date DESC, e.id DESC
        `,
        params,
      ),
      db.query(
        `
          SELECT
            COUNT(*)::int AS total_count,
            COALESCE(SUM(e.amount), 0)::numeric AS total_amount
          FROM finance.expense e
          ${whereClause}
        `,
        params,
      ),
      db.query(
        `
          SELECT
            e.category,
            COUNT(*)::int AS count,
            COALESCE(SUM(e.amount), 0)::numeric AS amount
          FROM finance.expense e
          ${whereClause}
          GROUP BY e.category
          ORDER BY amount DESC
        `,
        params,
      ),
    ]);

    const summaryRow = summaryResult.rows[0] || {};

    res.json({
      status: "success",
      data: listResult.rows.map(normalizeExpense),
      summary: {
        total_count: Number(summaryRow.total_count || 0),
        total_amount: Number(summaryRow.total_amount || 0),
        by_category: categoryResult.rows.map((item) => ({
          category: item.category,
          count: Number(item.count || 0),
          amount: Number(item.amount || 0),
        })),
      },
    });
  }),
);

router.get(
  "/expense/:id",
  authorize("satuan", "keuangan", "pusat", "finance"),
  withQuery(async (req, res, db) => {
    await ensureExpenseTables(db);

    const expenseId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!expenseId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const result = await db.query(
      `
        SELECT
          e.*,
          p.name AS periode_name,
          creator.full_name AS created_by_name,
          updater.full_name AS updated_by_name
        FROM finance.expense e
        LEFT JOIN a_periode p ON p.id = e.periode_id
        LEFT JOIN u_users creator ON creator.id = e.created_by
        LEFT JOIN u_users updater ON updater.id = e.updated_by
        WHERE e.id = $1
          AND e.homebase_id = $2
        LIMIT 1
      `,
      [expenseId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Pengeluaran tidak ditemukan" });
    }

    res.json({
      status: "success",
      data: normalizeExpense(result.rows[0]),
    });
  }),
);

router.post(
  "/expense",
  authorize("satuan", "keuangan", "pusat", "finance"),
  withTransaction(async (req, res, client) => {
    await ensureExpenseTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan belum dipilih atau tidak valid",
      });
    }

    const validated = validateExpensePayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const payload = validated.data;

    if (payload.periode_id) {
      const periodeCheck = await client.query(
        `
          SELECT id
          FROM a_periode
          WHERE id = $1
            AND homebase_id = $2
          LIMIT 1
        `,
        [payload.periode_id, homebaseId],
      );

      if (periodeCheck.rowCount === 0) {
        return res.status(400).json({
          message: "Periode tidak valid untuk satuan ini",
        });
      }
    }

    const result = await client.query(
      `
        INSERT INTO finance.expense (
          homebase_id,
          periode_id,
          category,
          title,
          description,
          amount,
          expense_date,
          payment_method,
          reference_no,
          notes,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
        RETURNING id
      `,
      [
        homebaseId,
        payload.periode_id,
        payload.category,
        payload.title,
        payload.description,
        payload.amount,
        payload.expense_date,
        payload.payment_method,
        payload.reference_no,
        payload.notes,
        req.user.id,
      ],
    );

    res.status(201).json({
      status: "success",
      message: "Pengeluaran berhasil ditambahkan",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

router.put(
  "/expense/:id",
  authorize("satuan", "keuangan", "pusat", "finance"),
  withTransaction(async (req, res, client) => {
    await ensureExpenseTables(client);

    const expenseId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!expenseId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const validated = validateExpensePayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const payload = validated.data;

    if (payload.periode_id) {
      const periodeCheck = await client.query(
        `
          SELECT id
          FROM a_periode
          WHERE id = $1
            AND homebase_id = $2
          LIMIT 1
        `,
        [payload.periode_id, homebaseId],
      );

      if (periodeCheck.rowCount === 0) {
        return res.status(400).json({
          message: "Periode tidak valid untuk satuan ini",
        });
      }
    }

    const result = await client.query(
      `
        UPDATE finance.expense
        SET
          periode_id = $1,
          category = $2,
          title = $3,
          description = $4,
          amount = $5,
          expense_date = $6,
          payment_method = $7,
          reference_no = $8,
          notes = $9,
          updated_by = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
          AND homebase_id = $12
        RETURNING id
      `,
      [
        payload.periode_id,
        payload.category,
        payload.title,
        payload.description,
        payload.amount,
        payload.expense_date,
        payload.payment_method,
        payload.reference_no,
        payload.notes,
        req.user.id,
        expenseId,
        homebaseId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Pengeluaran tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Pengeluaran berhasil diperbarui",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

router.delete(
  "/expense/:id",
  authorize("satuan", "keuangan", "pusat", "finance"),
  withTransaction(async (req, res, client) => {
    await ensureExpenseTables(client);

    const expenseId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!expenseId || !homebaseId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const result = await client.query(
      `
        DELETE FROM finance.expense
        WHERE id = $1
          AND homebase_id = $2
        RETURNING id
      `,
      [expenseId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Pengeluaran tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Pengeluaran berhasil dihapus",
      data: { id: Number(result.rows[0].id) },
    });
  }),
);

export default router;
