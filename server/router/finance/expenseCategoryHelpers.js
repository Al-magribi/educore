import { parseOptionalInt } from "./financeHelpers.js";

export const DEFAULT_EXPENSE_CATEGORIES = [
  { code: "operational", label: "Operasional", color: "blue", sort_order: 10 },
  { code: "utilities", label: "Utilitas", color: "cyan", sort_order: 20 },
  { code: "salary", label: "Gaji / Honor", color: "purple", sort_order: 30 },
  {
    code: "maintenance",
    label: "Pemeliharaan",
    color: "orange",
    sort_order: 40,
  },
  { code: "activity", label: "Kegiatan", color: "magenta", sort_order: 50 },
  {
    code: "supplies",
    label: "ATK / Perlengkapan",
    color: "geekblue",
    sort_order: 60,
  },
  { code: "other", label: "Lainnya", color: "default", sort_order: 70 },
];

export const CATEGORY_COLOR_OPTIONS = [
  "blue",
  "cyan",
  "purple",
  "orange",
  "magenta",
  "geekblue",
  "green",
  "gold",
  "red",
  "default",
];

const slugifyCategoryCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

export const normalizeCategoryCode = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (/^[a-z][a-z0-9_]{0,39}$/.test(raw)) return raw;
  return slugifyCategoryCode(raw);
};

export const normalizeExpenseCategoryRow = (row = {}) => ({
  id: Number(row.id || 0) || null,
  homebase_id: Number(row.homebase_id || 0) || null,
  code: row.code,
  value: row.code,
  label: row.label,
  color: row.color || "default",
  sort_order: Number(row.sort_order || 0),
  is_active: row.is_active !== false,
  is_system: Boolean(row.is_system),
  usage_count: Number(row.usage_count || 0),
  created_by: row.created_by ? Number(row.created_by) : null,
  updated_by: row.updated_by ? Number(row.updated_by) : null,
});

let categorySchemaReady = false;
let categorySchemaPromise = null;

export const ensureExpenseCategoryTables = async (db) => {
  if (categorySchemaReady) return;

  if (!categorySchemaPromise) {
    categorySchemaPromise = (async () => {
      await db.query(`CREATE SCHEMA IF NOT EXISTS finance`);

      await db.query(`
        CREATE TABLE IF NOT EXISTS finance.expense_category (
          id BIGSERIAL PRIMARY KEY,
          homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
          code VARCHAR(40) NOT NULL,
          label VARCHAR(100) NOT NULL,
          color VARCHAR(20) NOT NULL DEFAULT 'default',
          sort_order INT NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          is_system BOOLEAN NOT NULL DEFAULT FALSE,
          created_by INT REFERENCES public.u_users(id),
          updated_by INT REFERENCES public.u_users(id),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE (homebase_id, code)
        )
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_expense_category_homebase
        ON finance.expense_category(homebase_id, is_active, sort_order, label)
      `);

      // Lepas CHECK kategori hardcode agar kode kustom bisa dipakai.
      await db.query(`
        DO $$
        DECLARE
          constraint_name text;
        BEGIN
          SELECT con.conname
          INTO constraint_name
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          WHERE nsp.nspname = 'finance'
            AND rel.relname = 'expense'
            AND con.contype = 'c'
            AND pg_get_constraintdef(con.oid) ILIKE '%category%'
          LIMIT 1;

          IF constraint_name IS NOT NULL THEN
            EXECUTE format(
              'ALTER TABLE finance.expense DROP CONSTRAINT %I',
              constraint_name
            );
          END IF;
        END
        $$;
      `);
    })()
      .then(() => {
        categorySchemaReady = true;
      })
      .catch((error) => {
        categorySchemaPromise = null;
        throw error;
      });
  }

  await categorySchemaPromise;
};

export const seedDefaultExpenseCategories = async (
  db,
  homebaseId,
  userId = null,
) => {
  if (!homebaseId) return;

  // Hanya seed sekali saat homebase belum punya kategori sama sekali.
  // Jangan isi ulang kategori yang sudah dihapus user.
  const existing = await db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM finance.expense_category
      WHERE homebase_id = $1
    `,
    [homebaseId],
  );
  if (Number(existing.rows[0]?.total || 0) > 0) {
    return;
  }

  for (const item of DEFAULT_EXPENSE_CATEGORIES) {
    await db.query(
      `
        INSERT INTO finance.expense_category (
          homebase_id, code, label, color, sort_order,
          is_active, is_system, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, $6, $6)
        ON CONFLICT (homebase_id, code) DO NOTHING
      `,
      [
        homebaseId,
        item.code,
        item.label,
        item.color,
        item.sort_order,
        userId,
      ],
    );
  }
};

export const listExpenseCategories = async (
  db,
  homebaseId,
  { includeInactive = false, withUsage = false } = {},
) => {
  await ensureExpenseCategoryTables(db);
  await seedDefaultExpenseCategories(db, homebaseId);

  const params = [homebaseId];
  let where = `WHERE c.homebase_id = $1`;
  if (!includeInactive) {
    where += ` AND c.is_active = TRUE`;
  }

  const usageJoin = withUsage
    ? `
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS usage_count
        FROM finance.expense e
        WHERE e.homebase_id = c.homebase_id
          AND e.category = c.code
      ) usage ON TRUE
    `
    : "";

  const result = await db.query(
    `
      SELECT
        c.*,
        ${withUsage ? "COALESCE(usage.usage_count, 0)" : "0"} AS usage_count
      FROM finance.expense_category c
      ${usageJoin}
      ${where}
      ORDER BY c.sort_order ASC, c.label ASC, c.id ASC
    `,
    params,
  );

  return result.rows.map(normalizeExpenseCategoryRow);
};

export const getExpenseCategoryLabelMap = async (db, homebaseId) => {
  const rows = await listExpenseCategories(db, homebaseId, {
    includeInactive: true,
  });
  const map = {};
  for (const row of rows) {
    map[row.code] = row.label;
  }
  map.honorarium = map.honorarium || "Honorarium";
  return map;
};

export const isActiveExpenseCategory = async (db, homebaseId, code) => {
  const normalized = normalizeCategoryCode(code);
  if (!normalized || !homebaseId) return false;

  await ensureExpenseCategoryTables(db);
  await seedDefaultExpenseCategories(db, homebaseId);

  const result = await db.query(
    `
      SELECT id
      FROM finance.expense_category
      WHERE homebase_id = $1
        AND code = $2
        AND is_active = TRUE
      LIMIT 1
    `,
    [homebaseId, normalized],
  );
  return result.rowCount > 0;
};

export const buildBudgetCatalog = async (db, homebaseId) => {
  const categories = await listExpenseCategories(db, homebaseId, {
    includeInactive: false,
  });

  return [
    { kind: "income", category: "spp", label: "Pendapatan SPP" },
    { kind: "income", category: "other", label: "Pendapatan Lainnya" },
    ...categories.map((item) => ({
      kind: "expense",
      category: item.code,
      label: item.label,
    })),
    { kind: "expense", category: "honorarium", label: "Honorarium" },
  ];
};

export const parseCategoryId = (value) => parseOptionalInt(value);
