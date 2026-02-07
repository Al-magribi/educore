import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js"; // Menggunakan wrapper yang sudah ada
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// ==================================================================
// ANALISIS SEGMENTASI SAUDARA (SIBLING MARKET ANALYSIS)
// ------------------------------------------------------------------
// Target: Menemukan potensi siswa baru dari saudara kandung siswa existing.
// Filter: Umur Saudara, Gender Saudara, Search Nama (Saudara/Siswa).
// ==================================================================
router.get(
  "/get-student-segment",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const age_target = req.query.age;
    const gender_target = req.query.gender;

    const offset = (page - 1) * limit;

    let ageCondition = "";
    // Default rentang umur potensial (6-18 tahun)
    let defaultAgeRange =
      "AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, sib.birth_date))::integer BETWEEN 6 AND 18";

    if (age_target) {
      ageCondition = `AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, sib.birth_date))::integer = $2`;
    } else {
      ageCondition = defaultAgeRange;
    }

    let genderCondition = "";
    if (gender_target) {
      genderCondition = `AND sib.gender = $${age_target ? "3" : "2"}`;
    }

    // QUERY UTAMA
    // Pastikan u.full_name di-alias menjadi linked_student_name
    const baseJoin = `
      FROM u_student_siblings sib
      JOIN u_students s ON sib.student_id = s.user_id
      JOIN u_users u ON s.user_id = u.id
      LEFT JOIN a_homebase h ON s.homebase_id = h.id
      LEFT JOIN db_city c ON s.city_id = c.id
    `;

    const countQuery = `
      SELECT COUNT(*)
      ${baseJoin}
      WHERE (sib.name ILIKE $1 OR u.full_name ILIKE $1)
      ${ageCondition}
      ${genderCondition}
    `;

    const queryParams = [`%${search}%`];
    if (age_target) queryParams.push(age_target);
    if (gender_target) queryParams.push(gender_target);

    const countResult = await db.query(countQuery, queryParams);
    const totalData = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalData / limit);

    const dataQuery = `
      SELECT 
        sib.id as sibling_id,
        sib.name as full_name, -- Nama Saudara
        sib.gender,
        sib.birth_date,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, sib.birth_date))::integer as age,
        
        -- ALIAS PENTING: Nama Siswa Penghubung
        u.full_name as linked_student_name,
        h.name as homebase_name,
        c.name as city_name
      
      ${baseJoin}
      WHERE (sib.name ILIKE $1 OR u.full_name ILIKE $1)
      ${ageCondition}
      ${genderCondition}
      ORDER BY sib.name ASC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const dataParams = [...queryParams, limit, offset];
    const dataResult = await db.query(dataQuery, dataParams);

    res.status(200).json({
      success: true,
      data: dataResult.rows,
      meta: { page, limit, totalData, totalPages },
    });
  }),
);

/**
 * 2. ANALISIS GEOGRAFIS (Market Mapping)
 * ------------------------------------------------------------------
 * Mengetahui dari Kota/Kabupaten mana mayoritas siswa berasal.
 * Berguna untuk menentukan target lokasi promosi PPDB.
 */
router.get(
  "/get-geo-distribution",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    // Query Aggregation: Hitung jumlah siswa per Kota
    const queryText = `
      SELECT 
        c.name as city_name,
        p.name as province_name,
        COUNT(s.user_id) as student_count,
        ROUND((COUNT(s.user_id)::decimal * 100 / (SELECT COUNT(*) FROM u_students)), 1) as percentage
      FROM u_students s
      JOIN db_city c ON s.city_id = c.id
      JOIN db_province p ON c.province_id = p.id
      GROUP BY c.id, c.name, p.name
      ORDER BY student_count DESC
      LIMIT 10 -- Ambil Top 10 Kota
    `;

    const result = await db.query(queryText);

    res.status(200).json({
      success: true,
      data: result.rows,
      message: "Top 10 asal kota siswa",
    });
  }),
);

/**
 * 3. ANALISIS EKONOMI (Profil Orang Tua)
 * ------------------------------------------------------------------
 * Menganalisa latar belakang pekerjaan Ayah & Ibu.
 * Berguna untuk strategi pricing SPP atau target donatur.
 */
router.get(
  "/get-parent-jobs",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    // Menggabungkan data pekerjaan Ayah dan Ibu
    const queryText = `
      WITH all_jobs AS (
        SELECT father_job as job FROM u_student_families WHERE father_job IS NOT NULL AND father_job != ''
        UNION ALL
        SELECT mother_job as job FROM u_student_families WHERE mother_job IS NOT NULL AND mother_job != ''
      )
      SELECT 
        job, 
        COUNT(*) as total
      FROM all_jobs
      GROUP BY job
      ORDER BY total DESC
      LIMIT 10
    `;

    const result = await db.query(queryText);

    res.status(200).json({
      success: true,
      data: result.rows,
      message: "Statistik profesi orang tua",
    });
  }),
);

export default router;
