import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// ==========================================
// LEVEL 1: CATEGORY
// ==========================================
router.get(
  "/category",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const result = await pool.query(
      `SELECT * FROM a_subject_category WHERE homebase_id = $1 ORDER BY id ASC`,
      [homebase_id],
    );
    res.json({ status: "success", data: result.rows });
  }),
);

router.post(
  "/category",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { name } = req.body;
    const { homebase_id } = req.user;
    const result = await client.query(
      `INSERT INTO a_subject_category (homebase_id, name) VALUES ($1, $2) RETURNING *`,
      [homebase_id, name],
    );
    res.json({
      status: "success",
      message: "Kategori dibuat",
      data: result.rows[0],
    });
  }),
);

router.delete(
  "/category/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    await client.query(`DELETE FROM a_subject_category WHERE id = $1`, [id]);
    res.json({ status: "success", message: "Kategori dihapus" });
  }),
);

// ==========================================
// LEVEL 2: BRANCH
// ==========================================
router.get(
  "/branch",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { category_id } = req.query;
    const { homebase_id } = req.user;

    let query = `
        SELECT b.*, c.name as category_name 
        FROM a_subject_branch b
        JOIN a_subject_category c ON b.category_id = c.id
        WHERE b.homebase_id = $1
    `;
    const params = [homebase_id];

    if (category_id) {
      query += ` AND b.category_id = $2`;
      params.push(category_id);
    }

    query += ` ORDER BY c.name ASC, b.name ASC`;

    const result = await pool.query(query, params);
    res.json({ status: "success", data: result.rows });
  }),
);

router.post(
  "/branch",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { category_id, name, description } = req.body;
    const { homebase_id } = req.user;
    const result = await client.query(
      `INSERT INTO a_subject_branch (homebase_id, category_id, name, description) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [homebase_id, category_id, name, description],
    );
    res.json({
      status: "success",
      message: "Cabang dibuat",
      data: result.rows[0],
    });
  }),
);

router.delete(
  "/branch/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    await client.query(`DELETE FROM a_subject_branch WHERE id = $1`, [id]);
    res.json({ status: "success", message: "Cabang dihapus" });
  }),
);

// ==========================================
// LEVEL 3: SUBJECT
// ==========================================
router.get(
  "/subject",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const {
      branch_id,
      category_id,
      page = 1,
      limit = 10,
      search = "",
    } = req.query;
    const { homebase_id } = req.user;
    const offset = (page - 1) * limit;

    // Menggunakan LEFT JOIN agar subject tanpa branch tetap muncul
    let baseQuery = `
        SELECT 
            s.*, 
            b.name as branch_name, 
            c.name as category_name,
            c.id as category_id
        FROM a_subject s
        LEFT JOIN a_subject_branch b ON s.branch_id = b.id
        LEFT JOIN a_subject_category c ON b.category_id = c.id
        WHERE s.homebase_id = $1
    `;

    const params = [homebase_id];
    let paramIndex = 2;

    if (branch_id) {
      baseQuery += ` AND s.branch_id = $${paramIndex}`;
      params.push(branch_id);
      paramIndex++;
    }

    // Jika filter category dipilih
    if (category_id) {
      baseQuery += ` AND c.id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    if (search) {
      baseQuery += ` AND s.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const finalQuery = `${baseQuery} ORDER BY s.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(finalQuery, params);

    // Count query
    // Perlu logic filter yang sama untuk count agar pagination akurat
    let countQuery = `
        SELECT COUNT(*) FROM a_subject s 
        LEFT JOIN a_subject_branch b ON s.branch_id = b.id
        LEFT JOIN a_subject_category c ON b.category_id = c.id
        WHERE s.homebase_id = $1
    `;
    const countParams = [homebase_id];
    let countIdx = 2;

    if (branch_id) {
      countQuery += ` AND s.branch_id = $${countIdx}`;
      countParams.push(branch_id);
      countIdx++;
    }
    if (category_id) {
      countQuery += ` AND c.id = $${countIdx}`;
      countParams.push(category_id);
      countIdx++;
    }
    if (search) {
      countQuery += ` AND s.name ILIKE $${countIdx}`;
      countParams.push(`%${search}%`);
      countIdx++;
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      status: "success",
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }),
);

router.post(
  "/subject",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { branch_id, name, code, kkm } = req.body;
    const { homebase_id } = req.user;

    // branch_id bisa null jika user tidak memilih
    const result = await client.query(
      `INSERT INTO a_subject (homebase_id, branch_id, name, code, kkm) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [homebase_id, branch_id || null, name, code, kkm],
    );

    res.json({
      status: "success",
      message: "Mata pelajaran dibuat",
      data: result.rows[0],
    });
  }),
);

router.put(
  "/subject/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const { branch_id, name, code, kkm } = req.body;

    await client.query(
      `UPDATE a_subject SET branch_id=$1, name=$2, code=$3, kkm=$4 WHERE id=$5`,
      [branch_id || null, name, code, kkm, id],
    );

    res.json({ status: "success", message: "Mata pelajaran diupdate" });
  }),
);

router.delete(
  "/subject/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    await client.query(`DELETE FROM a_subject WHERE id = $1`, [id]);
    res.json({ status: "success", message: "Mata pelajaran dihapus" });
  }),
);

export default router;
