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

router.put(
  "/category/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const { name } = req.body;
    const { homebase_id } = req.user;

    const result = await client.query(
      `UPDATE a_subject_category SET name = $1
       WHERE id = $2 AND homebase_id = $3
       RETURNING *`,
      [name, id, homebase_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Kategori tidak ditemukan." });
    }

    res.json({
      status: "success",
      message: "Kategori diupdate",
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
            COALESCE(s.category_id, b.category_id) as category_id
        FROM a_subject s
        LEFT JOIN a_subject_branch b ON s.branch_id = b.id
        LEFT JOIN a_subject_category c ON c.id = COALESCE(s.category_id, b.category_id)
        WHERE s.homebase_id = $1
    `;

    const params = [homebase_id];
    let paramIndex = 2;

    if (req.user.role === "teacher") {
      baseQuery += `
        AND EXISTS (
          SELECT 1
          FROM at_subject ats
          WHERE ats.subject_id = s.id
            AND ats.teacher_id = $${paramIndex}
        )
      `;
      params.push(req.user.id);
      paramIndex++;
    }

    if (branch_id) {
      baseQuery += ` AND s.branch_id = $${paramIndex}`;
      params.push(branch_id);
      paramIndex++;
    }

    // Jika filter category dipilih
    if (category_id) {
      baseQuery += ` AND COALESCE(s.category_id, b.category_id) = $${paramIndex}`;
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
        LEFT JOIN a_subject_category c ON c.id = COALESCE(s.category_id, b.category_id)
        WHERE s.homebase_id = $1
    `;
    const countParams = [homebase_id];
    let countIdx = 2;

    if (req.user.role === "teacher") {
      countQuery += `
        AND EXISTS (
          SELECT 1
          FROM at_subject ats
          WHERE ats.subject_id = s.id
            AND ats.teacher_id = $${countIdx}
        )
      `;
      countParams.push(req.user.id);
      countIdx++;
    }

    if (branch_id) {
      countQuery += ` AND s.branch_id = $${countIdx}`;
      countParams.push(branch_id);
      countIdx++;
    }
    if (category_id) {
      countQuery += ` AND COALESCE(s.category_id, b.category_id) = $${countIdx}`;
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
    const { category_id, branch_id, name, code, kkm } = req.body;
    const { homebase_id } = req.user;

    let resolvedCategoryId = category_id || null;

    if (branch_id) {
      const branchResult = await client.query(
        `SELECT category_id FROM a_subject_branch WHERE id = $1 AND homebase_id = $2 LIMIT 1`,
        [branch_id, homebase_id],
      );

      if (branchResult.rowCount === 0) {
        return res.status(400).json({ message: "Cabang tidak ditemukan." });
      }

      resolvedCategoryId = branchResult.rows[0].category_id;
    }

    if (!resolvedCategoryId) {
      return res.status(400).json({ message: "Kategori wajib dipilih." });
    }

    const result = await client.query(
      `INSERT INTO a_subject (homebase_id, category_id, branch_id, name, code, kkm) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [homebase_id, resolvedCategoryId, branch_id || null, name, code, kkm],
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
    const { category_id, branch_id, name, code, kkm } = req.body;
    const { homebase_id } = req.user;

    let resolvedCategoryId = category_id || null;

    if (branch_id) {
      const branchResult = await client.query(
        `SELECT category_id FROM a_subject_branch WHERE id = $1 AND homebase_id = $2 LIMIT 1`,
        [branch_id, homebase_id],
      );

      if (branchResult.rowCount === 0) {
        return res.status(400).json({ message: "Cabang tidak ditemukan." });
      }

      resolvedCategoryId = branchResult.rows[0].category_id;
    }

    if (!resolvedCategoryId) {
      return res.status(400).json({ message: "Kategori wajib dipilih." });
    }

    await client.query(
      `UPDATE a_subject 
       SET category_id=$1, branch_id=$2, name=$3, code=$4, kkm=$5 
       WHERE id=$6`,
      [resolvedCategoryId, branch_id || null, name, code, kkm, id],
    );

    res.json({ status: "success", message: "Mata pelajaran diupdate" });
  }),
);

router.post(
  "/subject/upload",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const subjects = req.body;
    const { homebase_id } = req.user;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: "Data import tidak valid." });
    }

    const categoriesResult = await client.query(
      `SELECT id, name FROM a_subject_category WHERE homebase_id = $1`,
      [homebase_id],
    );
    const branchesResult = await client.query(
      `SELECT id, category_id, name FROM a_subject_branch WHERE homebase_id = $1`,
      [homebase_id],
    );

    const categoryIds = new Set(categoriesResult.rows.map((item) => item.id));
    const branchMap = new Map(branchesResult.rows.map((item) => [item.id, item]));
    const seenKeys = new Set();

    let imported = 0;
    let skippedInvalid = 0;
    let skippedDuplicate = 0;

    for (const subject of subjects) {
      const name = (subject?.name || "").toString().trim();
      const code = (subject?.code || "").toString().trim();
      const categoryId = subject?.category_id || null;
      const branchId = subject?.branch_id || null;
      const kkm = Number(subject?.kkm);

      if (!name || !categoryId || !Number.isFinite(kkm) || kkm < 0 || kkm > 100) {
        skippedInvalid++;
        continue;
      }

      if (!categoryIds.has(categoryId)) {
        skippedInvalid++;
        continue;
      }

      if (branchId) {
        const branch = branchMap.get(branchId);
        if (!branch || branch.category_id !== categoryId) {
          skippedInvalid++;
          continue;
        }
      }

      const dedupeKey = `${name.toLowerCase()}::${branchId || "null"}::${code.toLowerCase()}`;
      if (seenKeys.has(dedupeKey)) {
        skippedDuplicate++;
        continue;
      }
      seenKeys.add(dedupeKey);

      const duplicateQuery = await client.query(
        `SELECT id
         FROM a_subject
         WHERE homebase_id = $1
           AND (
             (LOWER(name) = LOWER($2) AND branch_id IS NOT DISTINCT FROM $3)
             OR ($4 <> '' AND LOWER(COALESCE(code, '')) = LOWER($4))
           )
         LIMIT 1`,
        [homebase_id, name, branchId, code],
      );

      if (duplicateQuery.rowCount > 0) {
        skippedDuplicate++;
        continue;
      }

      await client.query(
        `INSERT INTO a_subject (homebase_id, category_id, branch_id, name, code, kkm)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [homebase_id, categoryId, branchId, name, code || null, kkm],
      );
      imported++;
    }

    res.status(201).json({
      status: "success",
      message: `Berhasil mengimpor ${imported} dari ${subjects.length} data mata pelajaran.`,
      summary: {
        total: subjects.length,
        imported,
        skipped_invalid: skippedInvalid,
        skipped_duplicate: skippedDuplicate,
      },
    });
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
