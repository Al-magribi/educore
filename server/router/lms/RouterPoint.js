import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import { canManageKesiswaan } from "../../utils/staffAssignment.js";

const router = Router();

const toInt = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePointType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return ["reward", "punishment"].includes(normalized) ? normalized : null;
};

const normalizeOptionalText = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const normalizeRequiredText = (value) => String(value ?? "").trim();

const normalizeIsActive = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "active"].includes(normalized)) return true;
  if (["false", "0", "inactive"].includes(normalized)) return false;
  return null;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const getPeriodeById = async (executor, homebaseId, periodeId) => {
  if (!periodeId) return null;
  const result = await executor.query(
    `SELECT id, name, is_active
     FROM public.a_periode
     WHERE id = $1
       AND homebase_id = $2
     LIMIT 1`,
    [periodeId, homebaseId],
  );
  return result.rows[0] || null;
};

const getActivePeriode = async (executor, homebaseId) => {
  const result = await executor.query(
    `SELECT id, name, is_active
     FROM public.a_periode
     WHERE homebase_id = $1
       AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [homebaseId],
  );
  return result.rows[0] || null;
};

const resolvePeriode = async (executor, homebaseId, requestedPeriodeId) => {
  const parsedPeriodeId = toInt(requestedPeriodeId, null);
  if (parsedPeriodeId) {
    return getPeriodeById(executor, homebaseId, parsedPeriodeId);
  }
  return getActivePeriode(executor, homebaseId);
};

const getRuleStats = async (executor, homebaseId, periodeId) => {
  const result = await executor.query(
    `SELECT
       COUNT(*)::int AS total_rules,
       COUNT(*) FILTER (WHERE point_type = 'reward')::int AS reward_rules,
       COUNT(*) FILTER (WHERE point_type = 'punishment')::int AS punishment_rules,
       COALESCE(SUM(point_value) FILTER (WHERE point_type = 'reward'), 0)::int AS reward_points,
       COALESCE(SUM(point_value) FILTER (WHERE point_type = 'punishment'), 0)::int AS punishment_points,
       COUNT(*) FILTER (WHERE is_active = true)::int AS active_rules,
       COUNT(*) FILTER (WHERE is_active = false)::int AS inactive_rules
     FROM lms.l_point_rule
     WHERE homebase_id = $1
       AND periode_id = $2`,
    [homebaseId, periodeId],
  );

  return (
    result.rows[0] || {
      total_rules: 0,
      reward_rules: 0,
      punishment_rules: 0,
      active_rules: 0,
      inactive_rules: 0,
    }
  );
};

const getDefaultStats = () => ({
  total_rules: 0,
  reward_rules: 0,
  punishment_rules: 0,
  reward_points: 0,
  punishment_points: 0,
  active_rules: 0,
  inactive_rules: 0,
});

const getPointConfig = async (executor, homebaseId, periodeId) => {
  const result = await executor.query(
    `SELECT id, homebase_id, periode_id, show_balance, allow_homeroom_manage
     FROM lms.l_point_config
     WHERE homebase_id = $1
       AND periode_id = $2
     LIMIT 1`,
    [homebaseId, periodeId],
  );

  return (
    result.rows[0] || {
      id: null,
      homebase_id: homebaseId,
      periode_id: periodeId,
      show_balance: false,
      allow_homeroom_manage: true,
    }
  );
};

const getCategoryById = async (executor, homebaseId, categoryId, periodeId = null) => {
  if (!categoryId) return null;

  const params = [categoryId, homebaseId];
  let extra = "";
  if (periodeId) {
    params.push(periodeId);
    extra = " AND periode_id = $3";
  }

  const result = await executor.query(
    `SELECT id, homebase_id, periode_id, point_type, name, sort_order, is_active
     FROM lms.l_point_category
     WHERE id = $1
       AND homebase_id = $2${extra}
     LIMIT 1`,
    params,
  );

  return result.rows[0] || null;
};

const getPointCategories = async (
  executor,
  homebaseId,
  periodeId,
  { pointType, isActive } = {},
) => {
  const params = [homebaseId, periodeId];
  const whereClauses = ["homebase_id = $1", "periode_id = $2"];

  if (pointType) {
    params.push(pointType);
    whereClauses.push(`point_type = $${params.length}`);
  }

  if (typeof isActive === "boolean") {
    params.push(isActive);
    whereClauses.push(`is_active = $${params.length}`);
  }

  const result = await executor.query(
    `SELECT
       id,
       homebase_id,
       periode_id,
       point_type,
       name,
       sort_order,
       is_active,
       created_at,
       updated_at
     FROM lms.l_point_category
     WHERE ${whereClauses.join(" AND ")}
     ORDER BY
       CASE WHEN point_type = 'reward' THEN 1 ELSE 2 END ASC,
       sort_order ASC,
       name ASC`,
    params,
  );

  return result.rows;
};

const getNextCategorySortOrder = async (
  executor,
  homebaseId,
  periodeId,
  pointType,
) => {
  const result = await executor.query(
    `SELECT COALESCE(MAX(sort_order), 0)::int + 1 AS next_order
     FROM lms.l_point_category
     WHERE homebase_id = $1
       AND periode_id = $2
       AND point_type = $3`,
    [homebaseId, periodeId, pointType],
  );

  return Number(result.rows[0]?.next_order || 1);
};

const resolveRuleCategory = async (
  executor,
  { homebaseId, periodeId, categoryId, pointType },
) => {
  const parsedCategoryId = toInt(categoryId, null);
  if (!parsedCategoryId) {
    return { categoryId: null };
  }

  const category = await getCategoryById(
    executor,
    homebaseId,
    parsedCategoryId,
    periodeId,
  );

  if (!category) {
    return {
      error: {
        status: 404,
        message: "Kategori poin tidak ditemukan.",
      },
    };
  }

  if (category.point_type !== pointType) {
    return {
      error: {
        status: 400,
        message: "Kategori tidak sesuai dengan tipe poin.",
      },
    };
  }

  return { categoryId: category.id };
};

const buildCatalog = (categories = [], rules = []) => {
  const groupByType = (type) => {
    const typeCategories = categories.filter((item) => item.point_type === type);
    const typeRules = rules.filter((item) => item.point_type === type);
    const groupedIds = new Set(
      typeCategories.map((category) => Number(category.id)),
    );
    const grouped = typeCategories.map((category) => ({
      ...category,
      rules: typeRules.filter(
        (rule) => Number(rule.category_id) === Number(category.id),
      ),
    }));
    const uncategorized = typeRules.filter(
      (rule) =>
        !rule.category_id || !groupedIds.has(Number(rule.category_id)),
    );

    if (uncategorized.length) {
      grouped.push({
        id: null,
        name: "Tanpa Kategori",
        point_type: type,
        sort_order: 9999,
        is_active: true,
        rules: uncategorized,
      });
    }

    return grouped;
  };

  return {
    reward: groupByType("reward"),
    punishment: groupByType("punishment"),
  };
};

const getPointCatalog = async (
  executor,
  homebaseId,
  periodeId,
  { activeOnly = false } = {},
) => {
  const [categories, rulesResult] = await Promise.all([
    getPointCategories(executor, homebaseId, periodeId, {
      isActive: activeOnly ? true : undefined,
    }),
    executor.query(
      `SELECT
         r.id,
         r.category_id,
         r.name,
         r.point_type,
         r.point_value,
         r.description,
         r.is_active,
         c.name AS category_name,
         c.sort_order AS category_sort_order
       FROM lms.l_point_rule r
       LEFT JOIN lms.l_point_category c
         ON c.id = r.category_id
       WHERE r.homebase_id = $1
         AND r.periode_id = $2
         ${activeOnly ? "AND r.is_active = true" : ""}
       ORDER BY
         CASE WHEN r.point_type = 'reward' THEN 1 ELSE 2 END ASC,
         COALESCE(c.sort_order, 9999) ASC,
         COALESCE(c.name, '') ASC,
         r.point_value DESC,
         r.name ASC`,
      [homebaseId, periodeId],
    ),
  ]);

  return buildCatalog(categories, rulesResult.rows);
};

const getParentLinkedStudents = async (executor, parentUserId) => {
  const result = await executor.query(
    `SELECT
       s.user_id AS student_id,
       su.full_name AS student_name,
       s.nis,
       s.homebase_id,
       ce.class_id,
       c.name AS class_name,
       g.name AS grade_name
     FROM (
       SELECT parent_user_id, student_id
       FROM public.u_parent_students
       WHERE parent_user_id = $1
       UNION
       SELECT user_id AS parent_user_id, student_id
       FROM public.u_parents
       WHERE user_id = $1
         AND student_id IS NOT NULL
     ) links
     JOIN public.u_students s
       ON s.user_id = links.student_id
     JOIN public.u_users su
       ON su.id = s.user_id
     LEFT JOIN public.a_periode ap
       ON ap.homebase_id = s.homebase_id
      AND ap.is_active = true
     LEFT JOIN public.u_class_enrollments ce
       ON ce.student_id = s.user_id
      AND ce.homebase_id = s.homebase_id
      AND ce.periode_id = ap.id
     LEFT JOIN public.a_class c
       ON c.id = ce.class_id
     LEFT JOIN public.a_grade g
       ON g.id = c.grade_id
     WHERE su.is_active IS DISTINCT FROM false
     ORDER BY lower(su.full_name) ASC`,
    [parentUserId],
  );

  return result.rows;
};

const getStudentPointOverview = async (
  executor,
  { homebaseId, studentId, periodeId },
) => {
  const periode = await resolvePeriode(executor, homebaseId, periodeId);
  if (!periode) {
    return {
      periode: null,
      pointConfig: null,
      student: null,
      entries: [],
      catalog: { reward: [], punishment: [] },
    };
  }

  const [pointConfig, catalog, studentResult, entriesResult] = await Promise.all(
    [
      getPointConfig(executor, homebaseId, periode.id),
      getPointCatalog(executor, homebaseId, periode.id, { activeOnly: true }),
      executor.query(
        `SELECT
           e.student_id,
           u.full_name AS student_name,
           st.nis,
           c.id AS class_id,
           c.name AS class_name,
           g.name AS grade_name,
           COALESCE(ps.total_entries, 0)::int AS total_entries,
           COALESCE(ps.reward_entries, 0)::int AS reward_entries,
           COALESCE(ps.punishment_entries, 0)::int AS punishment_entries,
           COALESCE(ps.total_reward, 0)::int AS total_reward,
           COALESCE(ps.total_punishment, 0)::int AS total_punishment,
           COALESCE(ps.balance, 0)::int AS balance
         FROM public.u_class_enrollments e
         JOIN public.u_users u
           ON u.id = e.student_id
         JOIN public.u_students st
           ON st.user_id = e.student_id
         JOIN public.a_class c
           ON c.id = e.class_id
         LEFT JOIN public.a_grade g
           ON g.id = c.grade_id
         LEFT JOIN lms.v_point_student_summary ps
           ON ps.periode_id = e.periode_id
          AND ps.class_id = e.class_id
          AND ps.student_id = e.student_id
         WHERE e.homebase_id = $1
           AND e.periode_id = $2
           AND e.student_id = $3
         LIMIT 1`,
        [homebaseId, periode.id, studentId],
      ),
      executor.query(
        `SELECT
           pe.id,
           pe.rule_id,
           pe.point_type,
           pe.point_value,
           pe.title_snapshot,
           pe.description,
           pe.entry_date,
           pe.created_at,
           r.category_id,
           c.name AS category_name,
           giver.full_name AS given_by_name
         FROM lms.l_point_entry pe
         LEFT JOIN lms.l_point_rule r
           ON r.id = pe.rule_id
         LEFT JOIN lms.l_point_category c
           ON c.id = r.category_id
         LEFT JOIN public.u_users giver
           ON giver.id = pe.given_by
         WHERE pe.homebase_id = $1
           AND pe.periode_id = $2
           AND pe.student_id = $3
         ORDER BY pe.entry_date DESC, pe.created_at DESC, pe.id DESC`,
        [homebaseId, periode.id, studentId],
      ),
    ],
  );

  return {
    periode,
    pointConfig,
    student: studentResult.rows[0] || {
      student_id: studentId,
      total_entries: 0,
      reward_entries: 0,
      punishment_entries: 0,
      total_reward: 0,
      total_punishment: 0,
      balance: 0,
    },
    entries: entriesResult.rows,
    catalog,
  };
};

const getTeacherHomeroomClass = async (executor, teacherId, homebaseId) => {
  const result = await executor.query(
    `SELECT
       c.id,
       c.name,
       c.grade_id,
       g.name AS grade_name
     FROM public.a_class c
     LEFT JOIN public.a_grade g
       ON g.id = c.grade_id
     WHERE c.homeroom_teacher_id = $1
       AND c.homebase_id = $2
     LIMIT 1`,
    [teacherId, homebaseId],
  );

  return result.rows[0] || null;
};

const getHomebaseClasses = async (executor, homebaseId) => {
  const result = await executor.query(
    `SELECT
       c.id,
       c.name,
       c.grade_id,
       g.name AS grade_name
     FROM public.a_class c
     LEFT JOIN public.a_grade g
       ON g.id = c.grade_id
     WHERE c.homebase_id = $1
     ORDER BY c.name ASC`,
    [homebaseId],
  );
  return result.rows;
};

const resolvePointWorkspace = async ({
  executor,
  user,
  teacherId,
  homebaseId,
  requestedPeriodeId,
  requestedClassId,
  requireManage = false,
}) => {
  const periode = await resolvePeriode(executor, homebaseId, requestedPeriodeId);
  if (!periode) {
    return {
      error: {
        status: 400,
        message: "Periode aktif tidak ditemukan.",
      },
    };
  }

  const canManage = canManageKesiswaan(user);
  if (requireManage && !canManage) {
    return {
      error: {
        status: 403,
        message:
          "Hanya admin dan kesiswaan yang dapat menambah atau mengubah poin siswa.",
      },
    };
  }

  if (canManage) {
    const classes = await getHomebaseClasses(executor, homebaseId);
    if (!classes.length) {
      return {
        error: {
          status: 404,
          message: "Belum ada kelas pada satuan ini.",
        },
      };
    }

    const selectedClass =
      classes.find((item) => Number(item.id) === Number(requestedClassId)) ||
      classes[0];
    const pointConfig = await getPointConfig(executor, homebaseId, periode.id);

    return {
      periode,
      homeroomClass: selectedClass,
      pointConfig,
      classes,
      can_pick_class: true,
      can_manage: true,
    };
  }

  const homeroomClass = await getTeacherHomeroomClass(
    executor,
    teacherId,
    homebaseId,
  );
  if (!homeroomClass) {
    return {
      error: {
        status: 403,
        message: "Akses poin hanya tersedia untuk wali kelas.",
      },
    };
  }

  const pointConfig = await getPointConfig(executor, homebaseId, periode.id);

  return {
    periode,
    homeroomClass,
    pointConfig,
    classes: [homeroomClass],
    can_pick_class: false,
    can_manage: false,
  };
};

router.get(
  "/points/admin/meta",
  authorize("admin", "assignment:kesiswaan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const periode = await resolvePeriode(pool, homebaseId, req.query.periode_id);

    if (!periode) {
      return res.json({
        data: {
          active_periode: null,
          point_config: null,
          stats: getDefaultStats(),
        },
      });
    }

    const [configResult, stats] = await Promise.all([
      pool.query(
        `SELECT id, homebase_id, periode_id, show_balance, allow_homeroom_manage
         FROM lms.l_point_config
         WHERE homebase_id = $1
           AND periode_id = $2
         LIMIT 1`,
        [homebaseId, periode.id],
      ),
      getRuleStats(pool, homebaseId, periode.id),
    ]);

    return res.json({
      data: {
        active_periode: periode,
        point_config: configResult.rows[0] || null,
        stats,
      },
    });
  }),
);

router.get(
  "/points/admin/rules",
  authorize("admin", "assignment:kesiswaan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const periode = await resolvePeriode(pool, homebaseId, req.query.periode_id);

    if (!periode) {
      return res.json({
        data: [],
        meta: {
          active_periode: null,
          stats: getDefaultStats(),
        },
      });
    }

    const search = normalizeOptionalText(req.query.search);
    const pointType = normalizePointType(req.query.point_type);
    const isActive = normalizeIsActive(req.query.is_active);
    const categoryId = toInt(req.query.category_id, null);
    const uncategorizedOnly =
      String(req.query.uncategorized || "").trim() === "1";

    const params = [homebaseId, periode.id];
    const whereClauses = ["r.homebase_id = $1", "r.periode_id = $2"];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(r.name ILIKE $${params.length} OR COALESCE(r.description, '') ILIKE $${params.length})`,
      );
    }

    if (pointType) {
      params.push(pointType);
      whereClauses.push(`r.point_type = $${params.length}`);
    }

    if (typeof isActive === "boolean") {
      params.push(isActive);
      whereClauses.push(`r.is_active = $${params.length}`);
    }

    if (uncategorizedOnly) {
      whereClauses.push("r.category_id IS NULL");
    } else if (categoryId) {
      params.push(categoryId);
      whereClauses.push(`r.category_id = $${params.length}`);
    }

    const [rulesResult, stats, categories] = await Promise.all([
      pool.query(
        `SELECT
           r.id,
           r.homebase_id,
           r.periode_id,
           r.category_id,
           r.name,
           r.point_type,
           r.point_value,
           r.description,
           r.is_active,
           r.created_by,
           r.created_at,
           r.updated_at,
           creator.full_name AS created_by_name,
           c.name AS category_name,
           c.sort_order AS category_sort_order,
           COALESCE(rule_usage.usage_count, 0)::int AS usage_count
         FROM lms.l_point_rule r
         LEFT JOIN public.u_users creator
           ON creator.id = r.created_by
         LEFT JOIN lms.l_point_category c
           ON c.id = r.category_id
         LEFT JOIN (
           SELECT rule_id, COUNT(*)::int AS usage_count
           FROM lms.l_point_entry
           GROUP BY rule_id
         ) rule_usage
           ON rule_usage.rule_id = r.id
         WHERE ${whereClauses.join("\n           AND ")}
         ORDER BY
           r.is_active DESC,
           CASE WHEN r.point_type = 'reward' THEN 1 ELSE 2 END ASC,
           COALESCE(c.sort_order, 9999) ASC,
           COALESCE(c.name, '') ASC,
           r.point_value DESC,
           r.name ASC`,
        params,
      ),
      getRuleStats(pool, homebaseId, periode.id),
      getPointCategories(pool, homebaseId, periode.id),
    ]);

    return res.json({
      data: rulesResult.rows,
      meta: {
        active_periode: periode,
        stats,
        categories,
        catalog: buildCatalog(categories, rulesResult.rows),
      },
    });
  }),
);

router.get(
  "/points/admin/students-summary",
  authorize("admin", "assignment:kesiswaan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const periode = await resolvePeriode(pool, homebaseId, req.query.periode_id);

    if (!periode) {
      return res.json({
        data: [],
        meta: {
          active_periode: null,
          point_config: null,
        },
      });
    }

    const [configResult, studentsResult] = await Promise.all([
      pool.query(
        `SELECT id, homebase_id, periode_id, show_balance, allow_homeroom_manage
         FROM lms.l_point_config
         WHERE homebase_id = $1
           AND periode_id = $2
         LIMIT 1`,
        [homebaseId, periode.id],
      ),
      pool.query(
        `SELECT
           e.student_id,
           u.full_name AS student_name,
           st.nis,
           c.id AS class_id,
           c.name AS class_name,
           g.id AS grade_id,
           g.name AS grade_name,
           COALESCE(ps.total_entries, 0)::int AS total_entries,
           COALESCE(ps.reward_entries, 0)::int AS reward_entries,
           COALESCE(ps.punishment_entries, 0)::int AS punishment_entries,
           COALESCE(ps.total_reward, 0)::int AS total_reward,
           COALESCE(ps.total_punishment, 0)::int AS total_punishment,
           COALESCE(ps.balance, 0)::int AS balance,
           COALESCE(ps.balance, 0)::int AS sort_points,
           COALESCE(
             NULLIF(regexp_replace(COALESCE(g.name, ''), '\\D', '', 'g'), ''),
             '999'
           )::int AS grade_order,
           COALESCE(
             NULLIF(substring(COALESCE(c.name, '') from '^(\\d+)'), ''),
             '999'
           )::int AS class_number_order,
           lower(
             COALESCE(
               NULLIF(substring(COALESCE(c.name, '') from '^\\d+\\s*(.*)$'), ''),
               COALESCE(c.name, '')
             )
           ) AS class_suffix_order
         FROM public.u_class_enrollments e
         JOIN public.u_users u
           ON u.id = e.student_id
         JOIN public.u_students st
           ON st.user_id = e.student_id
         JOIN public.a_class c
           ON c.id = e.class_id
         LEFT JOIN public.a_grade g
           ON g.id = c.grade_id
         LEFT JOIN lms.v_point_student_summary ps
           ON ps.periode_id = e.periode_id
          AND ps.class_id = e.class_id
          AND ps.student_id = e.student_id
         WHERE e.homebase_id = $1
           AND e.periode_id = $2
         ORDER BY
           COALESCE(ps.balance, 0) DESC,
           COALESCE(
             NULLIF(regexp_replace(COALESCE(g.name, ''), '\\D', '', 'g'), ''),
             '999'
           )::int ASC,
           COALESCE(
             NULLIF(substring(COALESCE(c.name, '') from '^(\\d+)'), ''),
             '999'
           )::int ASC,
           lower(
             COALESCE(
               NULLIF(substring(COALESCE(c.name, '') from '^\\d+\\s*(.*)$'), ''),
               COALESCE(c.name, '')
             )
           ) ASC,
           lower(u.full_name) ASC`,
        [homebaseId, periode.id],
      ),
    ]);

    return res.json({
      data: studentsResult.rows,
      meta: {
        active_periode: periode,
        point_config: configResult.rows[0] || null,
      },
    });
  }),
);

router.put(
  "/points/admin/config",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const userId = req.user.id;
    const periode = await resolvePeriode(client, homebaseId, req.body?.periode_id);

    if (!periode) {
      return res.status(400).json({
        message: "Periode aktif tidak ditemukan. Aktifkan periode terlebih dahulu.",
      });
    }

    const showBalance = normalizeBoolean(req.body?.show_balance, false);
    const allowHomeroomManage = normalizeBoolean(
      req.body?.allow_homeroom_manage,
      true,
    );

    const upsertResult = await client.query(
      `INSERT INTO lms.l_point_config (
         homebase_id,
         periode_id,
         show_balance,
         allow_homeroom_manage,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (homebase_id, periode_id)
       DO UPDATE SET
         show_balance = EXCLUDED.show_balance,
         allow_homeroom_manage = EXCLUDED.allow_homeroom_manage,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, homebase_id, periode_id, show_balance, allow_homeroom_manage`,
      [homebaseId, periode.id, showBalance, allowHomeroomManage, userId],
    );

    return res.json({
      message: "Pengaturan poin berhasil diperbarui.",
      data: upsertResult.rows[0] || null,
    });
  }),
);

router.get(
  "/points/admin/categories",
  authorize("admin", "assignment:kesiswaan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const periode = await resolvePeriode(pool, homebaseId, req.query.periode_id);

    if (!periode) {
      return res.json({
        data: [],
        meta: { active_periode: null },
      });
    }

    const pointType = normalizePointType(req.query.point_type);
    const categories = await getPointCategories(pool, homebaseId, periode.id, {
      pointType,
    });

    return res.json({
      data: categories,
      meta: { active_periode: periode },
    });
  }),
);

router.post(
  "/points/admin/categories",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const createdBy = req.user.id;
    const periode = await resolvePeriode(client, homebaseId, req.body?.periode_id);

    if (!periode) {
      return res.status(400).json({
        message: "Periode aktif tidak ditemukan. Aktifkan periode terlebih dahulu.",
      });
    }

    const name = normalizeRequiredText(req.body?.name);
    const pointType = normalizePointType(req.body?.point_type);
    const isActive = req.body?.is_active !== false;
    const sortOrder =
      toInt(req.body?.sort_order, null) ||
      (await getNextCategorySortOrder(client, homebaseId, periode.id, pointType));

    if (!name) {
      return res.status(400).json({ message: "Nama kategori wajib diisi." });
    }

    if (!pointType) {
      return res.status(400).json({
        message: "Tipe kategori wajib berupa reward atau punishment.",
      });
    }

    const duplicate = await client.query(
      `SELECT id
       FROM lms.l_point_category
       WHERE homebase_id = $1
         AND periode_id = $2
         AND point_type = $3
         AND lower(btrim(name)) = lower(btrim($4))
       LIMIT 1`,
      [homebaseId, periode.id, pointType, name],
    );

    if (duplicate.rowCount > 0) {
      return res.status(409).json({
        message: "Nama kategori sudah digunakan pada tipe ini.",
      });
    }

    const insertResult = await client.query(
      `INSERT INTO lms.l_point_category (
         homebase_id,
         periode_id,
         point_type,
         name,
         sort_order,
         is_active,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, homebase_id, periode_id, point_type, name, sort_order, is_active`,
      [homebaseId, periode.id, pointType, name, sortOrder, isActive, createdBy],
    );

    return res.status(201).json({
      message: "Kategori poin berhasil ditambahkan.",
      data: insertResult.rows[0] || null,
    });
  }),
);

router.put(
  "/points/admin/categories/:id",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const categoryId = toInt(req.params.id, null);

    if (!categoryId) {
      return res.status(400).json({ message: "ID kategori tidak valid." });
    }

    const existing = await client.query(
      `SELECT id, periode_id, point_type
       FROM lms.l_point_category
       WHERE id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [categoryId, homebaseId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Kategori poin tidak ditemukan." });
    }

    const name = normalizeRequiredText(req.body?.name);
    const pointType =
      normalizePointType(req.body?.point_type) || existing.rows[0].point_type;
    const isActive = req.body?.is_active !== false;
    const sortOrder = toInt(req.body?.sort_order, 1);

    if (!name) {
      return res.status(400).json({ message: "Nama kategori wajib diisi." });
    }

    if (!pointType) {
      return res.status(400).json({
        message: "Tipe kategori wajib berupa reward atau punishment.",
      });
    }

    if (pointType !== existing.rows[0].point_type) {
      const usage = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM lms.l_point_rule
         WHERE category_id = $1`,
        [categoryId],
      );
      if (Number(usage.rows[0]?.total || 0) > 0) {
        return res.status(409).json({
          message:
            "Tipe kategori tidak dapat diubah karena masih dipakai rule poin.",
        });
      }
    }

    const duplicate = await client.query(
      `SELECT id
       FROM lms.l_point_category
       WHERE homebase_id = $1
         AND periode_id = $2
         AND point_type = $3
         AND lower(btrim(name)) = lower(btrim($4))
         AND id <> $5
       LIMIT 1`,
      [homebaseId, existing.rows[0].periode_id, pointType, name, categoryId],
    );

    if (duplicate.rowCount > 0) {
      return res.status(409).json({
        message: "Nama kategori sudah digunakan pada tipe ini.",
      });
    }

    const updateResult = await client.query(
      `UPDATE lms.l_point_category
       SET name = $1,
           point_type = $2,
           sort_order = $3,
           is_active = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
         AND homebase_id = $6
       RETURNING id, homebase_id, periode_id, point_type, name, sort_order, is_active`,
      [name, pointType, Math.max(sortOrder, 1), isActive, categoryId, homebaseId],
    );

    return res.json({
      message: "Kategori poin berhasil diperbarui.",
      data: updateResult.rows[0] || null,
    });
  }),
);

router.delete(
  "/points/admin/categories/:id",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const categoryId = toInt(req.params.id, null);

    if (!categoryId) {
      return res.status(400).json({ message: "ID kategori tidak valid." });
    }

    const existing = await client.query(
      `SELECT id
       FROM lms.l_point_category
       WHERE id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [categoryId, homebaseId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Kategori poin tidak ditemukan." });
    }

    await client.query(
      `UPDATE lms.l_point_rule
       SET category_id = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE category_id = $1
         AND homebase_id = $2`,
      [categoryId, homebaseId],
    );

    await client.query(
      `DELETE FROM lms.l_point_category
       WHERE id = $1
         AND homebase_id = $2`,
      [categoryId, homebaseId],
    );

    return res.json({
      message: "Kategori poin berhasil dihapus. Rule terkait menjadi tanpa kategori.",
    });
  }),
);

router.get(
  "/points/teacher/bootstrap",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const teacherId = req.user.id;

    const access = await resolvePointWorkspace({
      executor: pool,
      user: req.user,
      teacherId,
      homebaseId,
      requestedPeriodeId: req.query.periode_id,
      requestedClassId: req.query.class_id,
    });

    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    const {
      periode,
      homeroomClass,
      pointConfig,
      classes,
      can_pick_class,
      can_manage,
    } = access;

    const [studentsResult, rulesResult, catalog] = await Promise.all([
      pool.query(
        `SELECT
           e.student_id,
           u.full_name AS student_name,
           st.nis,
           st.nisn,
           c.id AS class_id,
           c.name AS class_name,
           g.id AS grade_id,
           g.name AS grade_name,
           COALESCE(ps.total_entries, 0)::int AS total_entries,
           COALESCE(ps.reward_entries, 0)::int AS reward_entries,
           COALESCE(ps.punishment_entries, 0)::int AS punishment_entries,
           COALESCE(ps.total_reward, 0)::int AS total_reward,
           COALESCE(ps.total_punishment, 0)::int AS total_punishment,
           COALESCE(ps.balance, 0)::int AS balance
         FROM public.u_class_enrollments e
         JOIN public.u_users u
           ON u.id = e.student_id
         JOIN public.u_students st
           ON st.user_id = e.student_id
         JOIN public.a_class c
           ON c.id = e.class_id
         LEFT JOIN public.a_grade g
           ON g.id = c.grade_id
         LEFT JOIN lms.v_point_student_summary ps
           ON ps.periode_id = e.periode_id
          AND ps.class_id = e.class_id
          AND ps.student_id = e.student_id
         WHERE e.homebase_id = $1
           AND e.periode_id = $2
           AND e.class_id = $3
         ORDER BY lower(u.full_name) ASC`,
        [homebaseId, periode.id, homeroomClass.id],
      ),
      pool.query(
        `SELECT
           id,
           category_id,
           name,
           point_type,
           point_value,
           description,
           is_active
         FROM lms.l_point_rule
         WHERE homebase_id = $1
           AND periode_id = $2
           AND is_active = true
         ORDER BY
           CASE WHEN point_type = 'reward' THEN 1 ELSE 2 END ASC,
           point_value DESC,
           name ASC`,
        [homebaseId, periode.id],
      ),
      getPointCatalog(pool, homebaseId, periode.id, { activeOnly: true }),
    ]);

    return res.json({
      data: {
        active_periode: periode,
        point_config: pointConfig,
        homeroom_class: homeroomClass,
        classes: classes || [homeroomClass],
        can_pick_class: Boolean(can_pick_class),
        can_manage: Boolean(can_manage),
        students: studentsResult.rows,
        rules: rulesResult.rows,
        catalog,
      },
    });
  }),
);

router.get(
  "/points/teacher/entries",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const teacherId = req.user.id;
    const studentId = toInt(req.query.student_id, null);

    const access = await resolvePointWorkspace({
      executor: pool,
      user: req.user,
      teacherId,
      homebaseId,
      requestedPeriodeId: req.query.periode_id,
      requestedClassId: req.query.class_id,
    });

    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    const { periode, homeroomClass } = access;
    const params = [homebaseId, periode.id, homeroomClass.id];
    const whereClauses = [
      "pe.homebase_id = $1",
      "pe.periode_id = $2",
      "pe.class_id = $3",
    ];

    if (studentId) {
      params.push(studentId);
      whereClauses.push(`pe.student_id = $${params.length}`);
    }

    const result = await pool.query(
      `SELECT
         pe.id,
         pe.homebase_id,
         pe.periode_id,
         pe.student_id,
         pe.class_id,
         pe.rule_id,
         pe.point_type,
         pe.point_value,
         pe.title_snapshot,
         pe.description,
         pe.entry_date,
         pe.given_by,
         pe.updated_by,
         pe.created_at,
         pe.updated_at,
         student_user.full_name AS student_name,
         student_profile.nis,
         class_ref.name AS class_name,
         giver.full_name AS given_by_name,
         updater.full_name AS updated_by_name,
         rule_ref.category_id,
         category_ref.name AS category_name
       FROM lms.l_point_entry pe
       JOIN public.u_users student_user
         ON student_user.id = pe.student_id
       JOIN public.u_students student_profile
         ON student_profile.user_id = pe.student_id
       JOIN public.a_class class_ref
         ON class_ref.id = pe.class_id
       LEFT JOIN public.u_users giver
         ON giver.id = pe.given_by
       LEFT JOIN public.u_users updater
         ON updater.id = pe.updated_by
       LEFT JOIN lms.l_point_rule rule_ref
         ON rule_ref.id = pe.rule_id
       LEFT JOIN lms.l_point_category category_ref
         ON category_ref.id = rule_ref.category_id
       WHERE ${whereClauses.join("\n         AND ")}
       ORDER BY pe.entry_date DESC, pe.created_at DESC, pe.id DESC`,
      params,
    );

    return res.json({
      data: result.rows,
      meta: {
        active_periode: periode,
        homeroom_class: homeroomClass,
      },
    });
  }),
);

router.post(
  "/points/admin/entries",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const teacherId = req.user.id;
    const studentId = toInt(req.body?.student_id, null);
    const ruleId = toInt(req.body?.rule_id, null);
    const entryDate = String(req.body?.entry_date || "").trim();
    const description = normalizeOptionalText(req.body?.description);

    const access = await resolvePointWorkspace({
      executor: client,
      user: req.user,
      teacherId,
      homebaseId,
      requestedPeriodeId: req.body?.periode_id,
      requestedClassId: req.body?.class_id,
      requireManage: true,
    });

    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    if (!studentId || !ruleId || !entryDate) {
      return res.status(400).json({
        message: "student_id, rule_id, dan entry_date wajib diisi.",
      });
    }

    const { periode, homeroomClass } = access;

    const studentResult = await client.query(
      `SELECT e.student_id, e.class_id
       FROM public.u_class_enrollments e
       WHERE e.homebase_id = $1
         AND e.periode_id = $2
         AND e.class_id = $3
         AND e.student_id = $4
       LIMIT 1`,
      [homebaseId, periode.id, homeroomClass.id, studentId],
    );

    if (studentResult.rowCount === 0) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan pada kelas yang dipilih.",
      });
    }

    const ruleResult = await client.query(
      `SELECT id, name, point_type, point_value
       FROM lms.l_point_rule
       WHERE id = $1
         AND homebase_id = $2
         AND periode_id = $3
         AND is_active = true
       LIMIT 1`,
      [ruleId, homebaseId, periode.id],
    );

    if (ruleResult.rowCount === 0) {
      return res.status(404).json({ message: "Rule poin tidak ditemukan." });
    }

    const rule = ruleResult.rows[0];

    const insertResult = await client.query(
      `INSERT INTO lms.l_point_entry (
         homebase_id,
         periode_id,
         student_id,
         class_id,
         rule_id,
         point_type,
         point_value,
         title_snapshot,
         description,
         entry_date,
         given_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        homebaseId,
        periode.id,
        studentId,
        homeroomClass.id,
        rule.id,
        rule.point_type,
        rule.point_value,
        rule.name,
        description,
        entryDate,
        teacherId,
      ],
    );

    return res.status(201).json({
      message: "Poin siswa berhasil ditambahkan.",
      data: { id: insertResult.rows[0]?.id || null },
    });
  }),
);

router.put(
  "/points/admin/entries/:id",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const teacherId = req.user.id;
    const entryId = toInt(req.params.id, null);
    const studentId = toInt(req.body?.student_id, null);
    const ruleId = toInt(req.body?.rule_id, null);
    const entryDate = String(req.body?.entry_date || "").trim();
    const description = normalizeOptionalText(req.body?.description);

    if (!entryId) {
      return res.status(400).json({ message: "ID entry tidak valid." });
    }

    const access = await resolvePointWorkspace({
      executor: client,
      user: req.user,
      teacherId,
      homebaseId,
      requestedPeriodeId: req.body?.periode_id,
      requestedClassId: req.body?.class_id,
      requireManage: true,
    });

    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    if (!studentId || !ruleId || !entryDate) {
      return res.status(400).json({
        message: "student_id, rule_id, dan entry_date wajib diisi.",
      });
    }

    const { periode, homeroomClass } = access;

    const existingEntry = await client.query(
      `SELECT id
       FROM lms.l_point_entry
       WHERE id = $1
         AND homebase_id = $2
         AND periode_id = $3
         AND class_id = $4
       LIMIT 1`,
      [entryId, homebaseId, periode.id, homeroomClass.id],
    );

    if (existingEntry.rowCount === 0) {
      return res.status(404).json({ message: "Entry poin tidak ditemukan." });
    }

    const studentResult = await client.query(
      `SELECT e.student_id
       FROM public.u_class_enrollments e
       WHERE e.homebase_id = $1
         AND e.periode_id = $2
         AND e.class_id = $3
         AND e.student_id = $4
       LIMIT 1`,
      [homebaseId, periode.id, homeroomClass.id, studentId],
    );

    if (studentResult.rowCount === 0) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan pada kelas yang dipilih.",
      });
    }

    const ruleResult = await client.query(
      `SELECT id, name, point_type, point_value
       FROM lms.l_point_rule
       WHERE id = $1
         AND homebase_id = $2
         AND periode_id = $3
         AND is_active = true
       LIMIT 1`,
      [ruleId, homebaseId, periode.id],
    );

    if (ruleResult.rowCount === 0) {
      return res.status(404).json({ message: "Rule poin tidak ditemukan." });
    }

    const rule = ruleResult.rows[0];

    await client.query(
      `UPDATE lms.l_point_entry
       SET student_id = $1,
           rule_id = $2,
           point_type = $3,
           point_value = $4,
           title_snapshot = $5,
           description = $6,
           entry_date = $7,
           updated_by = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
         AND homebase_id = $10
         AND periode_id = $11
         AND class_id = $12`,
      [
        studentId,
        rule.id,
        rule.point_type,
        rule.point_value,
        rule.name,
        description,
        entryDate,
        teacherId,
        entryId,
        homebaseId,
        periode.id,
        homeroomClass.id,
      ],
    );

    return res.json({ message: "Poin siswa berhasil diperbarui." });
  }),
);

router.delete(
  "/points/admin/entries/:id",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const teacherId = req.user.id;
    const entryId = toInt(req.params.id, null);

    if (!entryId) {
      return res.status(400).json({ message: "ID entry tidak valid." });
    }

    const access = await resolvePointWorkspace({
      executor: client,
      user: req.user,
      teacherId,
      homebaseId,
      requestedPeriodeId: req.query.periode_id,
      requestedClassId: req.query.class_id,
      requireManage: true,
    });

    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    const { periode, homeroomClass } = access;

    const deleteResult = await client.query(
      `DELETE FROM lms.l_point_entry
       WHERE id = $1
         AND homebase_id = $2
         AND periode_id = $3
         AND class_id = $4
       RETURNING id`,
      [entryId, homebaseId, periode.id, homeroomClass.id],
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: "Entry poin tidak ditemukan." });
    }

    return res.json({ message: "Poin siswa berhasil dihapus." });
  }),
);

router.post(
  "/points/admin/rules",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const createdBy = req.user.id;
    const periode = await resolvePeriode(client, homebaseId, req.body?.periode_id);

    if (!periode) {
      return res.status(400).json({
        message: "Periode aktif tidak ditemukan. Aktifkan periode terlebih dahulu.",
      });
    }

    const name = normalizeRequiredText(req.body?.name);
    const pointType = normalizePointType(req.body?.point_type);
    const pointValue = toInt(req.body?.point_value, null);
    const description = normalizeOptionalText(req.body?.description);
    const isActive = req.body?.is_active !== false;

    if (!name) {
      return res.status(400).json({ message: "Nama rule wajib diisi." });
    }

    if (!pointType) {
      return res.status(400).json({
        message: "Tipe poin wajib berupa reward atau punishment.",
      });
    }

    if (!pointValue || pointValue < 1 || pointValue > 100) {
      return res.status(400).json({
        message: "Nilai poin wajib diisi antara 1 sampai 100.",
      });
    }

    const categoryResult = await resolveRuleCategory(client, {
      homebaseId,
      periodeId: periode.id,
      categoryId: req.body?.category_id,
      pointType,
    });

    if (categoryResult.error) {
      return res.status(categoryResult.error.status).json({
        message: categoryResult.error.message,
      });
    }

    const existingRule = await client.query(
      `SELECT id
       FROM lms.l_point_rule
       WHERE homebase_id = $1
         AND periode_id = $2
         AND lower(btrim(name)) = lower(btrim($3))
       LIMIT 1`,
      [homebaseId, periode.id, name],
    );

    if (existingRule.rowCount > 0) {
      return res.status(409).json({
        message: "Nama rule sudah digunakan pada periode ini.",
      });
    }

    const insertResult = await client.query(
      `INSERT INTO lms.l_point_rule (
         homebase_id,
         periode_id,
         category_id,
         name,
         point_type,
         point_value,
         description,
         is_active,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        homebaseId,
        periode.id,
        categoryResult.categoryId,
        name,
        pointType,
        pointValue,
        description,
        isActive,
        createdBy,
      ],
    );

    return res.status(201).json({
      message: "Rule poin berhasil ditambahkan.",
      data: {
        id: insertResult.rows[0]?.id || null,
      },
    });
  }),
);

router.put(
  "/points/admin/rules/:id",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const ruleId = toInt(req.params.id, null);

    if (!ruleId) {
      return res.status(400).json({ message: "ID rule tidak valid." });
    }

    const existingRule = await client.query(
      `SELECT id, periode_id
       FROM lms.l_point_rule
       WHERE id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [ruleId, homebaseId],
    );

    if (existingRule.rowCount === 0) {
      return res.status(404).json({ message: "Rule poin tidak ditemukan." });
    }

    const name = normalizeRequiredText(req.body?.name);
    const pointType = normalizePointType(req.body?.point_type);
    const pointValue = toInt(req.body?.point_value, null);
    const description = normalizeOptionalText(req.body?.description);
    const isActive = req.body?.is_active !== false;

    if (!name) {
      return res.status(400).json({ message: "Nama rule wajib diisi." });
    }

    if (!pointType) {
      return res.status(400).json({
        message: "Tipe poin wajib berupa reward atau punishment.",
      });
    }

    if (!pointValue || pointValue < 1 || pointValue > 100) {
      return res.status(400).json({
        message: "Nilai poin wajib diisi antara 1 sampai 100.",
      });
    }

    const categoryResult = await resolveRuleCategory(client, {
      homebaseId,
      periodeId: existingRule.rows[0].periode_id,
      categoryId: req.body?.category_id,
      pointType,
    });

    if (categoryResult.error) {
      return res.status(categoryResult.error.status).json({
        message: categoryResult.error.message,
      });
    }

    const duplicateRule = await client.query(
      `SELECT id
       FROM lms.l_point_rule
       WHERE homebase_id = $1
         AND periode_id = $2
         AND lower(btrim(name)) = lower(btrim($3))
         AND id <> $4
       LIMIT 1`,
      [homebaseId, existingRule.rows[0].periode_id, name, ruleId],
    );

    if (duplicateRule.rowCount > 0) {
      return res.status(409).json({
        message: "Nama rule sudah digunakan pada periode ini.",
      });
    }

    await client.query(
      `UPDATE lms.l_point_rule
       SET name = $1,
           point_type = $2,
           point_value = $3,
           description = $4,
           is_active = $5,
           category_id = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
         AND homebase_id = $8`,
      [
        name,
        pointType,
        pointValue,
        description,
        isActive,
        categoryResult.categoryId,
        ruleId,
        homebaseId,
      ],
    );

    return res.json({ message: "Rule poin berhasil diperbarui." });
  }),
);

router.delete(
  "/points/admin/rules/:id",
  authorize("admin", "assignment:kesiswaan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    const ruleId = toInt(req.params.id, null);

    if (!ruleId) {
      return res.status(400).json({ message: "ID rule tidak valid." });
    }

    const ruleResult = await client.query(
      `SELECT id
       FROM lms.l_point_rule
       WHERE id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [ruleId, homebaseId],
    );

    if (ruleResult.rowCount === 0) {
      return res.status(404).json({ message: "Rule poin tidak ditemukan." });
    }

    const usageResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM lms.l_point_entry
       WHERE rule_id = $1`,
      [ruleId],
    );

    const usageCount = Number(usageResult.rows[0]?.total || 0);
    if (usageCount > 0) {
      return res.status(409).json({
        message:
          "Rule sudah dipakai pada transaksi poin dan tidak dapat dihapus.",
      });
    }

    await client.query(
      `DELETE FROM lms.l_point_rule
       WHERE id = $1
         AND homebase_id = $2`,
      [ruleId, homebaseId],
    );

    return res.json({ message: "Rule poin berhasil dihapus." });
  }),
);

router.get(
  "/points/student/overview",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const studentId = req.user.id;
    const homebaseId = req.user.homebase_id;

    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan pendidikan siswa tidak ditemukan.",
      });
    }

    const overview = await getStudentPointOverview(pool, {
      homebaseId,
      studentId,
      periodeId: req.query.periode_id,
    });

    return res.json({
      data: {
        active_periode: overview.periode,
        point_config: overview.pointConfig,
        student: overview.student,
        entries: overview.entries,
        catalog: overview.catalog,
      },
    });
  }),
);

router.get(
  "/points/parent/overview",
  authorize("parent"),
  withQuery(async (req, res, pool) => {
    const parentUserId = req.user.id;
    const students = await getParentLinkedStudents(pool, parentUserId);

    if (!students.length) {
      return res.json({
        data: {
          students: [],
          selected_student: null,
          active_periode: null,
          point_config: null,
          entries: [],
          catalog: { reward: [], punishment: [] },
        },
      });
    }

    const requestedStudentId = toInt(req.query.student_id, null);
    const selectedStudent =
      students.find(
        (item) => Number(item.student_id) === Number(requestedStudentId),
      ) || students[0];

    const homebaseId = selectedStudent.homebase_id;
    if (!homebaseId) {
      return res.status(400).json({
        message: "Satuan pendidikan siswa tidak ditemukan.",
      });
    }

    const overview = await getStudentPointOverview(pool, {
      homebaseId,
      studentId: selectedStudent.student_id,
      periodeId: req.query.periode_id,
    });

    const studentPayload = {
      ...selectedStudent,
      ...(overview.student || {}),
    };

    return res.json({
      data: {
        students,
        selected_student: studentPayload,
        active_periode: overview.periode,
        point_config: overview.pointConfig,
        entries: overview.entries,
        catalog: overview.catalog,
      },
    });
  }),
);

export default router;
