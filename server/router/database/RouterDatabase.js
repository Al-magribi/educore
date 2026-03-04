import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const isFilled = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const calculateCompletion = (student) => {
  const requiredFields = [
    student.nis,
    student.full_name,
    student.gender,
    student.birth_place,
    student.birth_date,
    student.father_name,
    student.mother_name,
  ];

  const totalFields = requiredFields.length + 1;
  const filledRequired = requiredFields.filter(isFilled).length;
  const filledSiblings = Array.isArray(student.siblings)
    ? student.siblings.length > 0
      ? 1
      : 0
    : 0;

  const filledFields = filledRequired + filledSiblings;
  const completionPercent = Math.round((filledFields / totalFields) * 100);

  return {
    completionPercent,
    isComplete: completionPercent === 100,
  };
};

const updateStudentProfileData = async (client, studentId, payload) => {
  const {
    full_name,
    gender,
    nis,
    nisn,
    birth_place,
    birth_date,
    height,
    weight,
    head_circumference,
    order_number,
    siblings_count,
    postal_code,
    address,
    father_name,
    father_nik,
    father_birth_place,
    father_birth_date,
    father_phone,
    mother_name,
    mother_nik,
    mother_birth_place,
    mother_birth_date,
    mother_phone,
    siblings = [],
  } = payload;

  await client.query(
    `
      UPDATE u_users
      SET
        full_name = COALESCE($1, full_name),
        gender = COALESCE($2, gender)
      WHERE id = $3
    `,
    [full_name || null, gender || null, studentId],
  );

  await client.query(
    `
      UPDATE u_students
      SET
        nis = COALESCE($1, nis),
        nisn = COALESCE($2, nisn),
        birth_place = $3,
        birth_date = $4,
        height = $5,
        weight = $6,
        head_circumference = $7,
        order_number = $8,
        siblings_count = $9,
        postal_code = $10,
        address = $11
      WHERE user_id = $12
    `,
    [
      nis || null,
      nisn || null,
      birth_place || null,
      birth_date || null,
      height || null,
      weight || null,
      head_circumference || null,
      order_number || null,
      siblings_count || null,
      postal_code || null,
      address || null,
      studentId,
    ],
  );

  const existingFamily = await client.query(
    `SELECT id FROM u_student_families WHERE student_id = $1 ORDER BY id DESC LIMIT 1`,
    [studentId],
  );

  const familyValues = [
    father_nik || null,
    father_name || null,
    father_birth_place || null,
    father_birth_date || null,
    father_phone || null,
    mother_nik || null,
    mother_name || null,
    mother_birth_place || null,
    mother_birth_date || null,
    mother_phone || null,
  ];

  if (existingFamily.rows.length > 0) {
    await client.query(
      `
        UPDATE u_student_families
        SET
          father_nik = $1,
          father_name = $2,
          father_birth_place = $3,
          father_birth_date = $4,
          father_phone = $5,
          mother_nik = $6,
          mother_name = $7,
          mother_birth_place = $8,
          mother_birth_date = $9,
          mother_phone = $10
        WHERE id = $11
      `,
      [...familyValues, existingFamily.rows[0].id],
    );
  } else {
    await client.query(
      `
        INSERT INTO u_student_families (
          student_id,
          father_nik,
          father_name,
          father_birth_place,
          father_birth_date,
          father_phone,
          mother_nik,
          mother_name,
          mother_birth_place,
          mother_birth_date,
          mother_phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [studentId, ...familyValues],
    );
  }

  await client.query(`DELETE FROM u_student_siblings WHERE student_id = $1`, [
    studentId,
  ]);

  const cleanSiblings = Array.isArray(siblings)
    ? siblings.filter((item) => item?.name?.trim())
    : [];

  for (const sibling of cleanSiblings) {
    await client.query(
      `
        INSERT INTO u_student_siblings (student_id, name, gender, birth_date)
        VALUES ($1, $2, $3, $4)
      `,
      [
        studentId,
        sibling.name.trim(),
        sibling.gender || null,
        sibling.birth_date || null,
      ],
    );
  }
};

router.get(
  "/students",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      page = "1",
      limit = "10",
      search = "",
      grade_id: gradeId = "",
      class_id: classId = "",
      scope = "all",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const activePeriodeResult = await pool.query(
      `
          SELECT id, name
          FROM a_periode
          WHERE is_active = true
            AND homebase_id = $1
          LIMIT 1
        `,
      [homebaseId],
    );

    if (activePeriodeResult.rows.length === 0) {
      return res.status(200).json({
        data: [],
        summary: {
          total_students: 0,
          complete_students: 0,
          incomplete_students: 0,
          average_completion: 0,
          complete_students_on_page: 0,
          complete_percentage: 0,
        },
        filters: {
          grades: [],
          classes: [],
        },
        active_periode: null,
        teacher_scope: {
          is_homeroom: false,
          classes: [],
        },
        meta: {
          page: pageNum,
          limit: limitNum,
          total_data: 0,
          total_pages: 0,
        },
      });
    }

    const activePeriodeId = activePeriodeResult.rows[0].id;
    const activePeriodeName = activePeriodeResult.rows[0].name;

    const isHomeroomScope = userRole === "teacher" || scope === "homeroom";
    let homeroomClasses = [];

    if (isHomeroomScope) {
      const homeroomResult = await pool.query(
        `
          SELECT id, name
          FROM a_class
          WHERE homebase_id = $1
            AND homeroom_teacher_id = $2
          ORDER BY name
        `,
        [homebaseId, userId],
      );
      homeroomClasses = homeroomResult.rows.map((item) => ({
        class_id: item.id,
        class_name: item.name,
      }));
    }

    const homeroomClassIds = homeroomClasses.map((item) => item.class_id);
    const isHomeroom = homeroomClassIds.length > 0;

    const classFilterEnabled = !isHomeroomScope || isHomeroom;

    const filtersQuery = isHomeroomScope
      ? `
      SELECT
        (
          SELECT COALESCE(
            json_agg(json_build_object('value', x.id, 'label', x.name) ORDER BY x.name),
            '[]'::json
          )
          FROM (
            SELECT DISTINCT g.id, g.name
            FROM a_class c
            JOIN a_grade g ON g.id = c.grade_id
            WHERE c.homebase_id = $1
              AND c.id = ANY($2::int[])
          ) x
        ) AS grades,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'value', c.id,
                'label', c.name,
                'grade_id', c.grade_id
              )
              ORDER BY c.name
            ),
            '[]'::json
          )
          FROM a_class c
          WHERE c.homebase_id = $1
            AND c.id = ANY($2::int[])
        ) AS classes
    `
      : `
      SELECT
        (
          SELECT COALESCE(json_agg(json_build_object('value', g.id, 'label', g.name) ORDER BY g.name), '[]'::json)
          FROM a_grade g
          WHERE g.homebase_id = $1
        ) AS grades,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'value', c.id,
                'label', c.name,
                'grade_id', c.grade_id
              )
              ORDER BY c.name
            ),
            '[]'::json
          )
          FROM a_class c
          WHERE c.homebase_id = $1
        ) AS classes
    `;

    const filtersResult = await pool.query(
      filtersQuery,
      isHomeroomScope ? [homebaseId, homeroomClassIds] : [homebaseId],
    );

    if (isHomeroomScope && !isHomeroom) {
      return res.status(200).json({
        data: [],
        summary: {
          total_students: 0,
          complete_students: 0,
          incomplete_students: 0,
          average_completion: 0,
          complete_students_on_page: 0,
          complete_percentage: 0,
        },
        filters: filtersResult.rows[0],
        active_periode: {
          id: activePeriodeId,
          name: activePeriodeName,
        },
        teacher_scope: {
          is_homeroom: false,
          classes: [],
        },
        meta: {
          page: pageNum,
          limit: limitNum,
          total_data: 0,
          total_pages: 0,
        },
      });
    }

    const dataQuery = `
      SELECT
        u.id AS student_id,
        u.full_name,
        u.gender,
        s.nis,
        s.nisn,
        s.birth_place,
        s.birth_date,
        s.height,
        s.weight,
        s.head_circumference,
        s.order_number,
        s.siblings_count,
        s.address,
        s.postal_code,

        pr.name AS province,
        ci.name AS city,
        di.name AS district,
        vi.name AS village,

        hb.name AS education_unit,
        pe.name AS academic_year,

        gr.id AS grade_id,
        gr.name AS grade_name,
        cl.id AS class_id,
        cl.name AS class_name,

        fam.father_name,
        fam.father_nik,
        fam.father_birth_place,
        fam.father_birth_date,
        fam.father_phone,
        fam.mother_name,
        fam.mother_nik,
        fam.mother_birth_place,
        fam.mother_birth_date,
        fam.mother_phone,

        COALESCE(sib.siblings, '[]'::json) AS siblings
      FROM u_users u
      JOIN u_students s ON s.user_id = u.id
      LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
      JOIN u_class_enrollments ce ON ce.student_id = u.id
      LEFT JOIN a_class cl ON cl.id = ce.class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      LEFT JOIN a_periode pe ON pe.id = ce.periode_id

      LEFT JOIN db_province pr ON pr.id = s.province_id
      LEFT JOIN db_city ci ON ci.id = s.city_id
      LEFT JOIN db_district di ON di.id = s.district_id
      LEFT JOIN db_village vi ON vi.id = s.village_id

      LEFT JOIN LATERAL (
        SELECT
          sf.father_name,
          sf.father_nik,
          sf.father_birth_place,
          sf.father_birth_date,
          sf.father_phone,
          sf.mother_name,
          sf.mother_nik,
          sf.mother_birth_place,
          sf.mother_birth_date,
          sf.mother_phone
        FROM u_student_families sf
        WHERE sf.student_id = u.id
        ORDER BY sf.id DESC
        LIMIT 1
      ) fam ON true

      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', ss.id,
            'name', ss.name,
            'gender', ss.gender,
            'birth_date', ss.birth_date
          )
          ORDER BY ss.birth_date ASC NULLS LAST, ss.id ASC
        ) AS siblings
        FROM u_student_siblings ss
        WHERE ss.student_id = u.id
      ) sib ON true

      WHERE u.role = 'student'
        AND s.homebase_id = $1
        AND ($2 = '' OR u.full_name ILIKE $3 OR s.nis ILIKE $3 OR s.nisn ILIKE $3)
        AND ($4 = '' OR gr.id = $4::integer)
        AND ($5 = '' OR cl.id = $5::integer)
        AND ce.periode_id = $6
        AND ($9::boolean = false OR cl.id = ANY($10::int[]))
      ORDER BY u.full_name ASC
      LIMIT $7 OFFSET $8
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM u_users u
      JOIN u_students s ON s.user_id = u.id
      JOIN u_class_enrollments ce ON ce.student_id = u.id
      LEFT JOIN a_class cl ON cl.id = ce.class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      WHERE u.role = 'student'
        AND s.homebase_id = $1
        AND ($2 = '' OR u.full_name ILIKE $3 OR s.nis ILIKE $3 OR s.nisn ILIKE $3)
        AND ($4 = '' OR gr.id = $4::integer)
        AND ($5 = '' OR cl.id = $5::integer)
        AND ce.periode_id = $6
        AND ($7::boolean = false OR cl.id = ANY($8::int[]))
    `;

    const summaryQuery = `
      SELECT
        u.id AS student_id,
        u.full_name,
        u.gender,
        s.nis,
        s.nisn,
        s.birth_place,
        s.birth_date,
        s.height,
        s.weight,
        s.head_circumference,
        s.order_number,
        s.siblings_count,
        s.address,
        s.postal_code,
        pr.name AS province,
        ci.name AS city,
        di.name AS district,
        vi.name AS village,
        hb.name AS education_unit,
        pe.name AS academic_year,
        fam.father_name,
        fam.father_nik,
        fam.father_birth_place,
        fam.father_birth_date,
        fam.father_phone,
        fam.mother_name,
        fam.mother_nik,
        fam.mother_birth_place,
        fam.mother_birth_date,
        fam.mother_phone,
        COALESCE(sib.siblings, '[]'::json) AS siblings
      FROM u_users u
      JOIN u_students s ON s.user_id = u.id
      LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
      JOIN u_class_enrollments ce ON ce.student_id = u.id
      LEFT JOIN a_class cl ON cl.id = ce.class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      LEFT JOIN a_periode pe ON pe.id = ce.periode_id
      LEFT JOIN db_province pr ON pr.id = s.province_id
      LEFT JOIN db_city ci ON ci.id = s.city_id
      LEFT JOIN db_district di ON di.id = s.district_id
      LEFT JOIN db_village vi ON vi.id = s.village_id
      LEFT JOIN LATERAL (
        SELECT
          sf.father_name,
          sf.father_nik,
          sf.father_birth_place,
          sf.father_birth_date,
          sf.father_phone,
          sf.mother_name,
          sf.mother_nik,
          sf.mother_birth_place,
          sf.mother_birth_date,
          sf.mother_phone
        FROM u_student_families sf
        WHERE sf.student_id = u.id
        ORDER BY sf.id DESC
        LIMIT 1
      ) fam ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', ss.id,
            'name', ss.name,
            'gender', ss.gender,
            'birth_date', ss.birth_date
          )
          ORDER BY ss.birth_date ASC NULLS LAST, ss.id ASC
        ) AS siblings
        FROM u_student_siblings ss
        WHERE ss.student_id = u.id
      ) sib ON true
      WHERE u.role = 'student'
        AND s.homebase_id = $1
        AND ($2 = '' OR u.full_name ILIKE $3 OR s.nis ILIKE $3 OR s.nisn ILIKE $3)
        AND ($4 = '' OR gr.id = $4::integer)
        AND ($5 = '' OR cl.id = $5::integer)
        AND ce.periode_id = $6
        AND ($7::boolean = false OR cl.id = ANY($8::int[]))
    `;

    const [dataResult, countResult, summaryResult] = await Promise.all([
      pool.query(dataQuery, [
        homebaseId,
        search,
        `%${search}%`,
        gradeId,
        classFilterEnabled ? classId : "",
        activePeriodeId,
        limitNum,
        offset,
        isHomeroomScope,
        homeroomClassIds,
      ]),
      pool.query(countQuery, [
        homebaseId,
        search,
        `%${search}%`,
        gradeId,
        classFilterEnabled ? classId : "",
        activePeriodeId,
        isHomeroomScope,
        homeroomClassIds,
      ]),
      pool.query(summaryQuery, [
        homebaseId,
        search,
        `%${search}%`,
        gradeId,
        classFilterEnabled ? classId : "",
        activePeriodeId,
        isHomeroomScope,
        homeroomClassIds,
      ]),
    ]);

    const rowsWithCompletion = dataResult.rows.map((row) => {
      const completion = calculateCompletion(row);
      return {
        ...row,
        completion_percent: completion.completionPercent,
        completion_status: completion.isComplete ? "Terisi" : "Belum Terisi",
      };
    });

    const summaryRows = summaryResult.rows.map((row) => {
      const completion = calculateCompletion(row);
      return completion.completionPercent;
    });

    const totalStudents = summaryRows.length;
    const completeStudents = summaryRows.filter(
      (item) => item === 100,
    ).length;
    const incompleteStudents = totalStudents - completeStudents;
    const averageCompletion = totalStudents
      ? Math.round(
          summaryRows.reduce((total, item) => total + item, 0) / totalStudents,
        )
      : 0;

    const completeStudentsOnPage = rowsWithCompletion.filter(
      (item) => item.completion_percent === 100,
    ).length;

    const totalData = parseInt(countResult.rows[0]?.total || "0", 10);

    res.status(200).json({
      data: rowsWithCompletion,
      summary: {
        total_students: totalStudents,
        complete_students: completeStudents,
        incomplete_students: incompleteStudents,
        average_completion: averageCompletion,
        complete_students_on_page: completeStudentsOnPage,
        complete_percentage: totalStudents
          ? Math.round((completeStudents / totalStudents) * 100)
          : 0,
      },
      filters: filtersResult.rows[0],
      active_periode: {
        id: activePeriodeId,
        name: activePeriodeName,
      },
      teacher_scope: {
        is_homeroom: isHomeroomScope ? isHomeroom : true,
        classes: homeroomClasses,
      },
      meta: {
        page: pageNum,
        limit: limitNum,
        total_data: totalData,
        total_pages: Math.ceil(totalData / limitNum),
      },
    });
  }),
);

router.put(
  "/students/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;
    const studentId = parseInt(id, 10);

    if (!Number.isInteger(studentId)) {
      return res.status(400).json({ message: "ID siswa tidak valid." });
    }

    let ownershipResult;

    if (userRole === "teacher") {
      const activePeriode = await client.query(
        `SELECT id FROM a_periode WHERE is_active = true AND homebase_id = $1 LIMIT 1`,
        [homebaseId],
      );

      if (activePeriode.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "Tidak ada periode aktif untuk satuan ini." });
      }

      ownershipResult = await client.query(
        `
          SELECT u.id
          FROM u_users u
          JOIN u_students s ON s.user_id = u.id
          JOIN u_class_enrollments ce ON ce.student_id = u.id
          JOIN a_class c ON c.id = ce.class_id
          WHERE u.id = $1
            AND u.role = 'student'
            AND s.homebase_id = $2
            AND ce.periode_id = $3
            AND c.homeroom_teacher_id = $4
        `,
        [studentId, homebaseId, activePeriode.rows[0].id, userId],
      );
    } else {
      ownershipResult = await client.query(
        `
          SELECT u.id
          FROM u_users u
          JOIN u_students s ON s.user_id = u.id
          WHERE u.id = $1
            AND u.role = 'student'
            AND s.homebase_id = $2
        `,
        [studentId, homebaseId],
      );
    }

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ message: "Data siswa tidak ditemukan." });
    }

    await updateStudentProfileData(client, studentId, req.body);

    res.status(200).json({ message: "Data siswa berhasil diperbarui." });
  }),
);

router.get(
  "/student-profile",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const studentId = req.user.id;

    const query = `
      SELECT
        u.id AS student_id,
        u.full_name,
        u.gender,
        s.nis,
        s.nisn,
        s.birth_place,
        s.birth_date,
        s.height,
        s.weight,
        s.head_circumference,
        s.order_number,
        s.siblings_count,
        s.address,
        s.postal_code,
        hb.name AS education_unit,
        pe.name AS academic_year,
        cl.name AS class_name,
        gr.name AS grade_name,
        fam.father_name,
        fam.father_nik,
        fam.father_birth_place,
        fam.father_birth_date,
        fam.father_phone,
        fam.mother_name,
        fam.mother_nik,
        fam.mother_birth_place,
        fam.mother_birth_date,
        fam.mother_phone,
        COALESCE(sib.siblings, '[]'::json) AS siblings
      FROM u_users u
      JOIN u_students s ON s.user_id = u.id
      LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
      LEFT JOIN a_class cl ON cl.id = s.current_class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      LEFT JOIN a_periode pe ON pe.id = s.current_periode_id
      LEFT JOIN LATERAL (
        SELECT
          sf.father_name,
          sf.father_nik,
          sf.father_birth_place,
          sf.father_birth_date,
          sf.father_phone,
          sf.mother_name,
          sf.mother_nik,
          sf.mother_birth_place,
          sf.mother_birth_date,
          sf.mother_phone
        FROM u_student_families sf
        WHERE sf.student_id = u.id
        ORDER BY sf.id DESC
        LIMIT 1
      ) fam ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', ss.id,
            'name', ss.name,
            'gender', ss.gender,
            'birth_date', ss.birth_date
          )
          ORDER BY ss.birth_date ASC NULLS LAST, ss.id ASC
        ) AS siblings
        FROM u_student_siblings ss
        WHERE ss.student_id = u.id
      ) sib ON true
      WHERE u.id = $1
        AND u.role = 'student'
      LIMIT 1
    `;

    const result = await pool.query(query, [studentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Data siswa tidak ditemukan." });
    }

    const row = result.rows[0];
    const completion = calculateCompletion(row);

    res.status(200).json({
      data: {
        ...row,
        completion_percent: completion.completionPercent,
        completion_status: completion.isComplete ? "Terisi" : "Belum Terisi",
      },
    });
  }),
);

router.put(
  "/student-profile",
  authorize("student"),
  withTransaction(async (req, res, client) => {
    const studentId = req.user.id;

    const ownershipResult = await client.query(
      `
        SELECT u.id
        FROM u_users u
        JOIN u_students s ON s.user_id = u.id
        WHERE u.id = $1
          AND u.role = 'student'
      `,
      [studentId],
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ message: "Data siswa tidak ditemukan." });
    }

    await updateStudentProfileData(client, studentId, req.body);
    res.status(200).json({ message: "Profil siswa berhasil diperbarui." });
  }),
);

router.get(
  "/parent/students",
  authorize("parent"),
  withQuery(async (req, res, pool) => {
    const parentUserId = req.user.id;

    const query = `
      SELECT
        u.id AS student_id,
        u.full_name,
        u.gender,
        s.nis,
        s.nisn,
        s.birth_place,
        s.birth_date,
        s.height,
        s.weight,
        s.head_circumference,
        s.order_number,
        s.siblings_count,
        s.address,
        s.postal_code,
        hb.name AS education_unit,
        pe.name AS academic_year,
        cl.name AS class_name,
        gr.name AS grade_name,
        fam.father_name,
        fam.father_nik,
        fam.father_birth_place,
        fam.father_birth_date,
        fam.father_phone,
        fam.mother_name,
        fam.mother_nik,
        fam.mother_birth_place,
        fam.mother_birth_date,
        fam.mother_phone,
        COALESCE(sib.siblings, '[]'::json) AS siblings
      FROM u_parents p
      JOIN u_students s ON s.user_id = p.student_id
      JOIN u_users u ON u.id = s.user_id
      LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
      LEFT JOIN a_class cl ON cl.id = s.current_class_id
      LEFT JOIN a_grade gr ON gr.id = cl.grade_id
      LEFT JOIN a_periode pe ON pe.id = s.current_periode_id
      LEFT JOIN LATERAL (
        SELECT
          sf.father_name,
          sf.father_nik,
          sf.father_birth_place,
          sf.father_birth_date,
          sf.father_phone,
          sf.mother_name,
          sf.mother_nik,
          sf.mother_birth_place,
          sf.mother_birth_date,
          sf.mother_phone
        FROM u_student_families sf
        WHERE sf.student_id = s.user_id
        ORDER BY sf.id DESC
        LIMIT 1
      ) fam ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', ss.id,
            'name', ss.name,
            'gender', ss.gender,
            'birth_date', ss.birth_date
          )
          ORDER BY ss.birth_date ASC NULLS LAST, ss.id ASC
        ) AS siblings
        FROM u_student_siblings ss
        WHERE ss.student_id = s.user_id
      ) sib ON true
      WHERE p.user_id = $1
      ORDER BY u.full_name ASC
    `;

    const result = await pool.query(query, [parentUserId]);
    const data = result.rows.map((row) => {
      const completion = calculateCompletion(row);
      return {
        ...row,
        completion_percent: completion.completionPercent,
        completion_status: completion.isComplete ? "Terisi" : "Belum Terisi",
      };
    });

    res.status(200).json({ data });
  }),
);

router.put(
  "/parent/students/:studentId",
  authorize("parent"),
  withTransaction(async (req, res, client) => {
    const parentUserId = req.user.id;
    const studentId = parseInt(req.params.studentId, 10);

    if (!Number.isInteger(studentId)) {
      return res.status(400).json({ message: "ID siswa tidak valid." });
    }

    const ownership = await client.query(
      `
        SELECT 1
        FROM u_parents p
        WHERE p.user_id = $1
          AND p.student_id = $2
        LIMIT 1
      `,
      [parentUserId, studentId],
    );

    if (ownership.rows.length === 0) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses untuk memperbarui data siswa ini.",
      });
    }

    await updateStudentProfileData(client, studentId, req.body);
    res.status(200).json({ message: "Data siswa berhasil diperbarui." });
  }),
);

export default router;
