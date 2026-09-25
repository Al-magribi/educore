import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  MONTH_NAMES,
  parseOptionalInt,
  parseIntArray,
  parseAmount,
  resolveScopedHomebaseId,
  buildEnrollmentWhereClause,
  ensurePeriode,
  ensureStudentsInHomebase,
  ensureFinalFinanceTables,
  resolveScholarshipDue,
  syncScholarshipForStudent,
  syncScholarshipForScholarship,
} from "./financeHelpers.js";

const router = Router();

const BENEFIT_TARGETS = new Set(["spp", "other"]);
const BENEFIT_TYPES = new Set(["fixed", "full"]);

const normalizeBenefitTarget = (value) => {
  const target = String(value || "")
    .trim()
    .toLowerCase();
  return BENEFIT_TARGETS.has(target) ? target : null;
};

const normalizeBenefitType = (value) => {
  const type = String(value || "")
    .trim()
    .toLowerCase();
  return BENEFIT_TYPES.has(type) ? type : null;
};

const parseBenefitMonths = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const months = [];
  const seen = new Set();

  for (const item of value) {
    const periodeId = parseOptionalInt(item?.periode_id);
    const monthNum = parseOptionalInt(item?.month_num);

    if (!periodeId || !monthNum || monthNum < 1 || monthNum > 12) {
      continue;
    }

    const key = `${periodeId}:${monthNum}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    months.push({ periode_id: periodeId, month_num: monthNum });
  }

  return months;
};

const validateBenefitPayload = ({
  benefitTarget,
  benefitType,
  amount,
  componentId,
  months,
}) => {
  if (!benefitTarget) {
    return { error: "Target benefit wajib spp atau other" };
  }

  if (!benefitType) {
    return { error: "Tipe benefit wajib fixed atau full" };
  }

  if (benefitType === "fixed" && (amount === null || amount <= 0)) {
    return { error: "Nominal potongan wajib lebih dari 0 untuk tipe fixed" };
  }

  if (benefitTarget === "spp") {
    if (componentId) {
      return { error: "Benefit SPP tidak memakai component_id" };
    }

    if (months.length === 0) {
      return {
        error: "Benefit SPP wajib memilih minimal satu bulan (bisa lintas periode)",
      };
    }
  }

  if (benefitTarget === "other") {
    if (!componentId) {
      return { error: "Benefit pembayaran lainnya wajib memilih jenis biaya" };
    }

    if (months.length > 0) {
      return { error: "Benefit other tidak memakai daftar bulan" };
    }
  }

  return {
    amount: benefitType === "full" ? null : amount,
  };
};

const getScholarshipById = async (db, homebaseId, scholarshipId) => {
  const result = await db.query(
    `
      SELECT
        s.id,
        s.homebase_id,
        s.name,
        s.code,
        s.description,
        s.is_active,
        s.created_by,
        s.created_at,
        s.updated_at,
        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM finance.scholarship_student ss
            WHERE ss.scholarship_id = s.id
              AND ss.is_active = true
          ),
          0
        ) AS student_count,
        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM finance.scholarship_benefit sb
            WHERE sb.scholarship_id = s.id
          ),
          0
        ) AS benefit_count
      FROM finance.scholarship s
      WHERE s.homebase_id = $1
        AND s.id = $2
      LIMIT 1
    `,
    [homebaseId, scholarshipId],
  );

  return result.rows[0] || null;
};

const getScholarshipImpact = async (db, homebaseId, scholarshipId) => {
  const result = await db.query(
    `
      SELECT
        COALESCE(
          SUM(
            CASE WHEN ii.item_type = 'spp' THEN iis.cover_amount ELSE 0 END
          ),
          0
        ) AS spp_cover,
        COALESCE(
          SUM(
            CASE WHEN ii.item_type = 'other' THEN iis.cover_amount ELSE 0 END
          ),
          0
        ) AS other_cover,
        COALESCE(SUM(iis.cover_amount), 0) AS total_cover,
        COUNT(DISTINCT iis.invoice_item_id)::int AS covered_item_count,
        COUNT(DISTINCT inv.student_id)::int AS covered_student_count
      FROM finance.scholarship s
      LEFT JOIN finance.invoice_item_scholarship iis
        ON iis.scholarship_id = s.id
      LEFT JOIN finance.invoice_item ii
        ON ii.id = iis.invoice_item_id
      LEFT JOIN finance.invoice inv
        ON inv.id = ii.invoice_id
      WHERE s.homebase_id = $1
        AND s.id = $2
      GROUP BY s.id
    `,
    [homebaseId, scholarshipId],
  );

  const row = result.rows[0] || {};
  return {
    scholarship_id: scholarshipId,
    spp_cover: Number(row.spp_cover || 0),
    other_cover: Number(row.other_cover || 0),
    total_cover: Number(row.total_cover || 0),
    covered_item_count: Number(row.covered_item_count || 0),
    covered_student_count: Number(row.covered_student_count || 0),
  };
};

const listBenefitsForScholarship = async (db, scholarshipId) => {
  const benefitResult = await db.query(
    `
      SELECT
        sb.id,
        sb.scholarship_id,
        sb.benefit_target,
        sb.benefit_type,
        sb.amount,
        sb.component_id,
        sb.periode_id,
        fc.name AS component_name,
        fc.code AS component_code,
        p.name AS periode_name,
        sb.created_at,
        sb.updated_at
      FROM finance.scholarship_benefit sb
      LEFT JOIN finance.fee_component fc ON fc.id = sb.component_id
      LEFT JOIN a_periode p ON p.id = sb.periode_id
      WHERE sb.scholarship_id = $1
      ORDER BY
        CASE WHEN sb.benefit_target = 'spp' THEN 0 ELSE 1 END,
        sb.id ASC
    `,
    [scholarshipId],
  );

  const benefitIds = benefitResult.rows.map((row) => Number(row.id));
  let monthMap = new Map();

  if (benefitIds.length > 0) {
    const monthResult = await db.query(
      `
        SELECT
          sbm.benefit_id,
          sbm.periode_id,
          sbm.month_num,
          p.name AS periode_name
        FROM finance.scholarship_benefit_month sbm
        JOIN a_periode p ON p.id = sbm.periode_id
        WHERE sbm.benefit_id = ANY($1::bigint[])
        ORDER BY p.name ASC, sbm.month_num ASC
      `,
      [benefitIds],
    );

    monthMap = monthResult.rows.reduce((acc, row) => {
      const key = Number(row.benefit_id);
      const list = acc.get(key) || [];
      list.push({
        periode_id: Number(row.periode_id),
        periode_name: row.periode_name,
        month_num: Number(row.month_num),
        month_label: MONTH_NAMES[Number(row.month_num) - 1] || "-",
      });
      acc.set(key, list);
      return acc;
    }, new Map());
  }

  return benefitResult.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    scholarship_id: Number(row.scholarship_id),
    amount: row.amount === null ? null : Number(row.amount),
    component_id: row.component_id ? Number(row.component_id) : null,
    periode_id: row.periode_id ? Number(row.periode_id) : null,
    months: monthMap.get(Number(row.id)) || [],
  }));
};

const listStudentsForScholarship = async (db, homebaseId, scholarshipId) => {
  const result = await db.query(
    `
      SELECT
        ss.id,
        ss.scholarship_id,
        ss.student_id,
        ss.is_active,
        ss.notes,
        ss.assigned_by,
        ss.assigned_at,
        ss.created_at,
        ss.updated_at,
        u.full_name AS student_name,
        st.nis,
        st.nisn,
        latest.class_id,
        latest.class_name,
        latest.grade_id,
        latest.grade_name,
        latest.periode_id,
        latest.periode_name
      FROM finance.scholarship_student ss
      JOIN u_students st ON st.user_id = ss.student_id
      JOIN u_users u ON u.id = st.user_id
      LEFT JOIN LATERAL (
        SELECT
          c.id AS class_id,
          c.name AS class_name,
          g.id AS grade_id,
          g.name AS grade_name,
          e.periode_id,
          p.name AS periode_name
        FROM u_class_enrollments e
        JOIN a_class c ON c.id = e.class_id
        JOIN a_grade g ON g.id = c.grade_id
        JOIN a_periode p ON p.id = e.periode_id
        WHERE e.student_id = ss.student_id
          AND e.homebase_id = $1
        ORDER BY p.is_active DESC, e.periode_id DESC
        LIMIT 1
      ) latest ON true
      WHERE ss.scholarship_id = $2
      ORDER BY ss.is_active DESC, u.full_name ASC
    `,
    [homebaseId, scholarshipId],
  );

  return result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    scholarship_id: Number(row.scholarship_id),
    student_id: Number(row.student_id),
  }));
};

const ensureOtherComponent = async (db, homebaseId, componentId) => {
  const result = await db.query(
    `
      SELECT id, name, code, category, is_active
      FROM finance.fee_component
      WHERE homebase_id = $1
        AND id = $2
        AND category = 'other'
      LIMIT 1
    `,
    [homebaseId, componentId],
  );

  if (result.rowCount === 0) {
    return { error: "Jenis pembayaran lainnya tidak ditemukan" };
  }

  if (result.rows[0].is_active === false) {
    return { error: "Jenis pembayaran lainnya sudah nonaktif" };
  }

  return { component: result.rows[0] };
};

const ensureBenefitMonthsPeriodes = async (client, homebaseId, months) => {
  const periodeIds = [...new Set(months.map((item) => item.periode_id))];

  for (const periodeId of periodeIds) {
    const check = await ensurePeriode(client, homebaseId, periodeId);
    if (check.error) {
      return check;
    }
  }

  return { ok: true };
};

const replaceBenefitMonths = async (client, benefitId, months) => {
  await client.query(
    `DELETE FROM finance.scholarship_benefit_month WHERE benefit_id = $1`,
    [benefitId],
  );

  for (const month of months) {
    await client.query(
      `
        INSERT INTO finance.scholarship_benefit_month (
          benefit_id,
          periode_id,
          month_num
        )
        VALUES ($1, $2, $3)
      `,
      [benefitId, month.periode_id, month.month_num],
    );
  }
};

router.get(
  "/scholarship/options",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const periodeId = parseOptionalInt(req.query.periode_id);
    const gradeId = parseOptionalInt(req.query.grade_id);
    const classId = parseOptionalInt(req.query.class_id);
    const search = (req.query.search || "").trim();
    const studentLimit = Math.min(
      Math.max(parseOptionalInt(req.query.limit) || 100, 1),
      500,
    );

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    const enrollmentScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId,
      search,
    });

    const classScope = buildEnrollmentWhereClause({
      homebaseId,
      periodeId,
      gradeId,
      classId: null,
      studentId: null,
      search: "",
    });

    const [
      homebaseResult,
      periodeResult,
      gradeResult,
      classResult,
      studentResult,
      otherTypeResult,
    ] = await Promise.all([
      req.user.homebase_id
        ? db.query(`SELECT id, name FROM a_homebase WHERE id = $1`, [homebaseId])
        : db.query(`SELECT id, name FROM a_homebase ORDER BY name ASC`),
      db.query(
        `
          SELECT id, name, is_active
          FROM a_periode
          WHERE homebase_id = $1
          ORDER BY is_active DESC, created_at DESC
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT id, name
          FROM a_grade
          WHERE homebase_id = $1
          ORDER BY name ASC
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT DISTINCT c.id, c.name, g.id AS grade_id, g.name AS grade_name
          FROM u_class_enrollments e
          JOIN a_class c ON c.id = e.class_id
          JOIN a_grade g ON g.id = c.grade_id
          ${classScope.whereClause}
          ORDER BY g.name ASC, c.name ASC
        `,
        classScope.params,
      ),
      db.query(
        `
          SELECT
            s.user_id AS id,
            u.full_name,
            s.nis,
            e.periode_id,
            c.id AS class_id,
            c.name AS class_name,
            g.id AS grade_id,
            g.name AS grade_name
          FROM u_class_enrollments e
          JOIN u_students s ON s.user_id = e.student_id
          JOIN u_users u ON u.id = s.user_id
          JOIN a_class c ON c.id = e.class_id
          JOIN a_grade g ON g.id = c.grade_id
          ${enrollmentScope.whereClause}
          ORDER BY u.full_name ASC
          LIMIT ${studentLimit}
        `,
        enrollmentScope.params,
      ),
      db.query(
        `
          SELECT id, code, name, is_active
          FROM finance.fee_component
          WHERE homebase_id = $1
            AND category = 'other'
            AND is_active = true
          ORDER BY name ASC
        `,
        [homebaseId],
      ),
    ]);

    res.json({
      status: "success",
      data: {
        homebases: homebaseResult.rows,
        selected_homebase_id: homebaseId,
        periodes: periodeResult.rows.map((item) => ({
          ...item,
          is_default: item.is_active,
        })),
        grades: gradeResult.rows,
        classes: classResult.rows,
        students: studentResult.rows,
        other_types: otherTypeResult.rows,
        months: MONTH_NAMES.map((name, index) => ({
          value: index + 1,
          label: name,
        })),
        benefit_targets: [
          { value: "spp", label: "SPP" },
          { value: "other", label: "Pembayaran Lainnya" },
        ],
        benefit_types: [
          { value: "fixed", label: "Nominal" },
          { value: "full", label: "Gratis" },
        ],
      },
    });
  }),
);

router.post(
  "/scholarship/:id/sync",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(
      req.body.homebase_id ?? req.query.homebase_id,
    );
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(client, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const syncResult = await syncScholarshipForScholarship(
      client,
      homebaseId,
      scholarshipId,
    );

    res.json({
      status: "success",
      message: "Sinkronisasi tagihan unpaid berhasil",
      data: syncResult,
    });
  }),
);

router.post(
  "/scholarship/resolve-due",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const studentId = parseOptionalInt(req.body.student_id);
    const itemType = String(req.body.item_type || "")
      .trim()
      .toLowerCase();
    const componentId = parseOptionalInt(req.body.component_id);
    const periodeId = parseOptionalInt(req.body.periode_id);
    const billMonth = parseOptionalInt(req.body.bill_month);
    const brutoAmount = parseAmount(req.body.bruto_amount);

    if (!homebaseId || !studentId) {
      return res.status(400).json({ message: "Satuan dan siswa wajib diisi" });
    }

    if (itemType !== "spp" && itemType !== "other") {
      return res.status(400).json({ message: "item_type wajib spp atau other" });
    }

    if (brutoAmount === null || brutoAmount < 0) {
      return res.status(400).json({ message: "bruto_amount tidak valid" });
    }

    const studentCheck = await ensureStudentsInHomebase(db, homebaseId, [
      studentId,
    ]);
    if (studentCheck.error) {
      return res.status(400).json({ message: studentCheck.error });
    }

    const resolved = await resolveScholarshipDue(db, {
      homebaseId,
      studentId,
      itemType,
      componentId,
      periodeId,
      billMonth,
      brutoAmount,
    });

    res.json({
      status: "success",
      data: resolved,
    });
  }),
);

router.get(
  "/scholarship",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );
    const isActive = req.query.is_active;
    const search = (req.query.search || "").trim();

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    const params = [homebaseId];
    let whereClause = `WHERE s.homebase_id = $1`;

    if (isActive === "true" || isActive === "false") {
      params.push(isActive === "true");
      whereClause += ` AND s.is_active = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (s.name ILIKE $${params.length} OR COALESCE(s.code, '') ILIKE $${params.length})`;
    }

    const result = await db.query(
      `
        SELECT
          s.id,
          s.homebase_id,
          s.name,
          s.code,
          s.description,
          s.is_active,
          s.created_by,
          s.created_at,
          s.updated_at,
          COALESCE(COUNT(DISTINCT ss.id) FILTER (WHERE ss.is_active = true), 0)::int
            AS student_count,
          COALESCE(COUNT(DISTINCT sb.id), 0)::int AS benefit_count,
          COALESCE(MAX(impact.spp_cover), 0) AS spp_cover,
          COALESCE(MAX(impact.other_cover), 0) AS other_cover,
          COALESCE(MAX(impact.total_cover), 0) AS total_cover
        FROM finance.scholarship s
        LEFT JOIN finance.scholarship_student ss ON ss.scholarship_id = s.id
        LEFT JOIN finance.scholarship_benefit sb ON sb.scholarship_id = s.id
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(
              SUM(
                CASE WHEN ii.item_type = 'spp' THEN iis.cover_amount ELSE 0 END
              ),
              0
            ) AS spp_cover,
            COALESCE(
              SUM(
                CASE WHEN ii.item_type = 'other' THEN iis.cover_amount ELSE 0 END
              ),
              0
            ) AS other_cover,
            COALESCE(SUM(iis.cover_amount), 0) AS total_cover
          FROM finance.invoice_item_scholarship iis
          JOIN finance.invoice_item ii ON ii.id = iis.invoice_item_id
          WHERE iis.scholarship_id = s.id
        ) impact ON true
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.is_active DESC, s.updated_at DESC, s.id DESC
      `,
      params,
    );

    const rows = result.rows.map((item) => ({
      ...item,
      spp_cover: Number(item.spp_cover || 0),
      other_cover: Number(item.other_cover || 0),
      total_cover: Number(item.total_cover || 0),
    }));

    res.json({
      status: "success",
      data: rows,
      summary: {
        spp_cover: rows.reduce((sum, item) => sum + item.spp_cover, 0),
        other_cover: rows.reduce((sum, item) => sum + item.other_cover, 0),
        total_cover: rows.reduce((sum, item) => sum + item.total_cover, 0),
      },
    });
  }),
);

router.get(
  "/scholarship/:id/impact",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(db, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const impact = await getScholarshipImpact(db, homebaseId, scholarshipId);

    res.json({
      status: "success",
      data: impact,
    });
  }),
);

router.get(
  "/scholarship/:id",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(db, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const [benefits, students, impact] = await Promise.all([
      listBenefitsForScholarship(db, scholarshipId),
      listStudentsForScholarship(db, homebaseId, scholarshipId),
      getScholarshipImpact(db, homebaseId, scholarshipId),
    ]);

    res.json({
      status: "success",
      data: {
        ...scholarship,
        benefits,
        students,
        impact,
      },
    });
  }),
);

router.post(
  "/scholarship",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const name = String(req.body.name || "").trim();
    const code = String(req.body.code || "").trim() || null;
    const description = String(req.body.description || "").trim() || null;
    const isActive = req.body.is_active !== false;

    if (!homebaseId) {
      return res.status(400).json({ message: "Satuan belum dipilih atau tidak valid" });
    }

    if (!name) {
      return res.status(400).json({ message: "Nama beasiswa wajib diisi" });
    }

    const created = await client.query(
      `
        INSERT INTO finance.scholarship (
          homebase_id,
          name,
          code,
          description,
          is_active,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [homebaseId, name, code, description, isActive, req.user.id],
    );

    res.status(201).json({
      status: "success",
      message: "Beasiswa berhasil dibuat",
      data: created.rows[0],
    });
  }),
);

router.put(
  "/scholarship/:id",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const existing = await getScholarshipById(client, homebaseId, scholarshipId);
    if (!existing) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const name =
      req.body.name !== undefined
        ? String(req.body.name || "").trim()
        : existing.name;
    const code =
      req.body.code !== undefined
        ? String(req.body.code || "").trim() || null
        : existing.code;
    const description =
      req.body.description !== undefined
        ? String(req.body.description || "").trim() || null
        : existing.description;
    const isActive =
      req.body.is_active !== undefined
        ? req.body.is_active !== false
        : existing.is_active;

    if (!name) {
      return res.status(400).json({ message: "Nama beasiswa wajib diisi" });
    }

    const updated = await client.query(
      `
        UPDATE finance.scholarship
        SET
          name = $1,
          code = $2,
          description = $3,
          is_active = $4,
          updated_at = NOW()
        WHERE id = $5
          AND homebase_id = $6
        RETURNING *
      `,
      [name, code, description, isActive, scholarshipId, homebaseId],
    );

    const syncResult = await syncScholarshipForScholarship(
      client,
      homebaseId,
      scholarshipId,
    );

    res.json({
      status: "success",
      message: "Beasiswa berhasil diperbarui",
      data: updated.rows[0],
      sync: {
        student_count: syncResult.student_count,
        synced_count: syncResult.synced_count,
      },
    });
  }),
);

router.delete(
  "/scholarship/:id",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const existing = await getScholarshipById(client, homebaseId, scholarshipId);
    if (!existing) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const affectedStudents = await client.query(
      `
        SELECT DISTINCT student_id
        FROM (
          SELECT ss.student_id
          FROM finance.scholarship_student ss
          WHERE ss.scholarship_id = $1
          UNION
          SELECT inv.student_id
          FROM finance.invoice_item_scholarship iis
          JOIN finance.invoice_item ii ON ii.id = iis.invoice_item_id
          JOIN finance.invoice inv ON inv.id = ii.invoice_id
          WHERE iis.scholarship_id = $1
            AND inv.homebase_id = $2
        ) affected
      `,
      [scholarshipId, homebaseId],
    );

    await client.query(
      `
        DELETE FROM finance.scholarship
        WHERE id = $1
          AND homebase_id = $2
      `,
      [scholarshipId, homebaseId],
    );

    let syncedCount = 0;
    for (const row of affectedStudents.rows) {
      const syncResult = await syncScholarshipForStudent(
        client,
        homebaseId,
        row.student_id,
      );
      syncedCount += syncResult.synced_count || 0;
    }

    res.json({
      status: "success",
      message: "Beasiswa berhasil dihapus",
      sync: {
        student_count: affectedStudents.rowCount,
        synced_count: syncedCount,
      },
    });
  }),
);

router.get(
  "/scholarship/:id/benefits",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(db, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const benefits = await listBenefitsForScholarship(db, scholarshipId);

    res.json({
      status: "success",
      data: benefits,
    });
  }),
);

router.post(
  "/scholarship/:id/benefits",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(client, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const benefitTarget = normalizeBenefitTarget(req.body.benefit_target);
    const benefitType = normalizeBenefitType(req.body.benefit_type);
    const amount = parseAmount(req.body.amount);
    const componentId = parseOptionalInt(req.body.component_id);
    const periodeId = parseOptionalInt(req.body.periode_id);
    const months = parseBenefitMonths(req.body.months);

    const validation = validateBenefitPayload({
      benefitTarget,
      benefitType,
      amount,
      componentId,
      months,
    });

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    if (benefitTarget === "other") {
      const componentCheck = await ensureOtherComponent(
        client,
        homebaseId,
        componentId,
      );
      if (componentCheck.error) {
        return res.status(400).json({ message: componentCheck.error });
      }
    }

    if (periodeId) {
      const periodeCheck = await ensurePeriode(client, homebaseId, periodeId);
      if (periodeCheck.error) {
        return res.status(400).json({ message: periodeCheck.error });
      }
    }

    if (benefitTarget === "spp") {
      const monthsCheck = await ensureBenefitMonthsPeriodes(
        client,
        homebaseId,
        months,
      );
      if (monthsCheck.error) {
        return res.status(400).json({ message: monthsCheck.error });
      }
    }

    const created = await client.query(
      `
        INSERT INTO finance.scholarship_benefit (
          scholarship_id,
          benefit_target,
          benefit_type,
          amount,
          component_id,
          periode_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        scholarshipId,
        benefitTarget,
        benefitType,
        validation.amount,
        benefitTarget === "other" ? componentId : null,
        benefitTarget === "other" ? periodeId : null,
      ],
    );

    const benefitId = Number(created.rows[0].id);

    if (benefitTarget === "spp") {
      await replaceBenefitMonths(client, benefitId, months);
    }

    const benefits = await listBenefitsForScholarship(client, scholarshipId);
    const benefit = benefits.find((item) => item.id === benefitId);
    const syncResult = await syncScholarshipForScholarship(
      client,
      homebaseId,
      scholarshipId,
    );

    res.status(201).json({
      status: "success",
      message: "Aturan potongan berhasil ditambahkan",
      data: benefit,
      sync: {
        student_count: syncResult.student_count,
        synced_count: syncResult.synced_count,
      },
    });
  }),
);

router.put(
  "/scholarship/:id/benefits/:benefitId",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const scholarshipId = parseOptionalInt(req.params.id);
    const benefitId = parseOptionalInt(req.params.benefitId);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId || !benefitId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(client, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const existingResult = await client.query(
      `
        SELECT *
        FROM finance.scholarship_benefit
        WHERE id = $1
          AND scholarship_id = $2
        LIMIT 1
      `,
      [benefitId, scholarshipId],
    );

    if (existingResult.rowCount === 0) {
      return res.status(404).json({ message: "Aturan potongan tidak ditemukan" });
    }

    const existing = existingResult.rows[0];
    const benefitTarget =
      req.body.benefit_target !== undefined
        ? normalizeBenefitTarget(req.body.benefit_target)
        : existing.benefit_target;
    const benefitType =
      req.body.benefit_type !== undefined
        ? normalizeBenefitType(req.body.benefit_type)
        : existing.benefit_type;
    const amount =
      req.body.amount !== undefined
        ? parseAmount(req.body.amount)
        : existing.amount === null
          ? null
          : Number(existing.amount);
    const componentId =
      req.body.component_id !== undefined
        ? parseOptionalInt(req.body.component_id)
        : existing.component_id
          ? Number(existing.component_id)
          : null;
    const periodeId =
      req.body.periode_id !== undefined
        ? parseOptionalInt(req.body.periode_id)
        : existing.periode_id
          ? Number(existing.periode_id)
          : null;

    let months = [];
    if (req.body.months !== undefined) {
      months = parseBenefitMonths(req.body.months);
    } else if (benefitTarget === "spp") {
      const monthResult = await client.query(
        `
          SELECT periode_id, month_num
          FROM finance.scholarship_benefit_month
          WHERE benefit_id = $1
        `,
        [benefitId],
      );
      months = monthResult.rows.map((row) => ({
        periode_id: Number(row.periode_id),
        month_num: Number(row.month_num),
      }));
    }

    const validation = validateBenefitPayload({
      benefitTarget,
      benefitType,
      amount,
      componentId,
      months,
    });

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    if (benefitTarget === "other") {
      const componentCheck = await ensureOtherComponent(
        client,
        homebaseId,
        componentId,
      );
      if (componentCheck.error) {
        return res.status(400).json({ message: componentCheck.error });
      }
    }

    if (periodeId) {
      const periodeCheck = await ensurePeriode(client, homebaseId, periodeId);
      if (periodeCheck.error) {
        return res.status(400).json({ message: periodeCheck.error });
      }
    }

    if (benefitTarget === "spp") {
      const monthsCheck = await ensureBenefitMonthsPeriodes(
        client,
        homebaseId,
        months,
      );
      if (monthsCheck.error) {
        return res.status(400).json({ message: monthsCheck.error });
      }
    }

    await client.query(
      `
        UPDATE finance.scholarship_benefit
        SET
          benefit_target = $1,
          benefit_type = $2,
          amount = $3,
          component_id = $4,
          periode_id = $5,
          updated_at = NOW()
        WHERE id = $6
          AND scholarship_id = $7
      `,
      [
        benefitTarget,
        benefitType,
        validation.amount,
        benefitTarget === "other" ? componentId : null,
        benefitTarget === "other" ? periodeId : null,
        benefitId,
        scholarshipId,
      ],
    );

    if (benefitTarget === "spp") {
      await replaceBenefitMonths(client, benefitId, months);
    } else {
      await client.query(
        `DELETE FROM finance.scholarship_benefit_month WHERE benefit_id = $1`,
        [benefitId],
      );
    }

    await client.query(
      `UPDATE finance.scholarship SET updated_at = NOW() WHERE id = $1`,
      [scholarshipId],
    );

    const benefits = await listBenefitsForScholarship(client, scholarshipId);
    const benefit = benefits.find((item) => item.id === benefitId);
    const syncResult = await syncScholarshipForScholarship(
      client,
      homebaseId,
      scholarshipId,
    );

    res.json({
      status: "success",
      message: "Aturan potongan berhasil diperbarui",
      data: benefit,
      sync: {
        student_count: syncResult.student_count,
        synced_count: syncResult.synced_count,
      },
    });
  }),
);

router.delete(
  "/scholarship/:id/benefits/:benefitId",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const scholarshipId = parseOptionalInt(req.params.id);
    const benefitId = parseOptionalInt(req.params.benefitId);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId || !benefitId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(client, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const deleted = await client.query(
      `
        DELETE FROM finance.scholarship_benefit
        WHERE id = $1
          AND scholarship_id = $2
        RETURNING id
      `,
      [benefitId, scholarshipId],
    );

    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: "Aturan potongan tidak ditemukan" });
    }

    await client.query(
      `UPDATE finance.scholarship SET updated_at = NOW() WHERE id = $1`,
      [scholarshipId],
    );

    const syncResult = await syncScholarshipForScholarship(
      client,
      homebaseId,
      scholarshipId,
    );

    res.json({
      status: "success",
      message: "Aturan potongan berhasil dihapus",
      sync: {
        student_count: syncResult.student_count,
        synced_count: syncResult.synced_count,
      },
    });
  }),
);

router.get(
  "/scholarship/:id/students",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      db,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(db, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const students = await listStudentsForScholarship(db, homebaseId, scholarshipId);

    res.json({
      status: "success",
      data: students,
    });
  }),
);

router.post(
  "/scholarship/:id/students",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const studentIds = parseIntArray(req.body.student_ids);
    const notes = String(req.body.notes || "").trim() || null;

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(client, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const studentCheck = await ensureStudentsInHomebase(
      client,
      homebaseId,
      studentIds,
    );
    if (studentCheck.error) {
      return res.status(400).json({ message: studentCheck.error });
    }

    for (const studentId of studentCheck.studentIds) {
      await client.query(
        `
          INSERT INTO finance.scholarship_student (
            scholarship_id,
            student_id,
            is_active,
            notes,
            assigned_by
          )
          VALUES ($1, $2, true, $3, $4)
          ON CONFLICT (scholarship_id, student_id)
          DO UPDATE SET
            is_active = true,
            notes = COALESCE(EXCLUDED.notes, finance.scholarship_student.notes),
            assigned_by = EXCLUDED.assigned_by,
            assigned_at = NOW(),
            updated_at = NOW()
        `,
        [scholarshipId, studentId, notes, req.user.id],
      );
    }

    await client.query(
      `UPDATE finance.scholarship SET updated_at = NOW() WHERE id = $1`,
      [scholarshipId],
    );

    let syncedCount = 0;
    for (const studentId of studentCheck.studentIds) {
      const syncResult = await syncScholarshipForStudent(
        client,
        homebaseId,
        studentId,
      );
      syncedCount += syncResult.synced_count || 0;
    }

    const students = await listStudentsForScholarship(
      client,
      homebaseId,
      scholarshipId,
    );

    res.status(201).json({
      status: "success",
      message: "Penerima beasiswa berhasil ditambahkan",
      data: students,
      sync: {
        student_count: studentCheck.studentIds.length,
        synced_count: syncedCount,
      },
    });
  }),
);

router.put(
  "/scholarship/:id/students/:studentId",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const scholarshipId = parseOptionalInt(req.params.id);
    const studentId = parseOptionalInt(req.params.studentId);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );

    if (!homebaseId || !scholarshipId || !studentId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const scholarship = await getScholarshipById(client, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    const existing = await client.query(
      `
        SELECT id, is_active, notes
        FROM finance.scholarship_student
        WHERE scholarship_id = $1
          AND student_id = $2
        LIMIT 1
      `,
      [scholarshipId, studentId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Penerima beasiswa tidak ditemukan" });
    }

    const isActive =
      req.body.is_active !== undefined
        ? req.body.is_active !== false
        : existing.rows[0].is_active;
    const notes =
      req.body.notes !== undefined
        ? String(req.body.notes || "").trim() || null
        : existing.rows[0].notes;

    const updated = await client.query(
      `
        UPDATE finance.scholarship_student
        SET
          is_active = $1,
          notes = $2,
          updated_at = NOW()
        WHERE scholarship_id = $3
          AND student_id = $4
        RETURNING *
      `,
      [isActive, notes, scholarshipId, studentId],
    );

    const syncResult = await syncScholarshipForStudent(
      client,
      homebaseId,
      studentId,
    );

    res.json({
      status: "success",
      message: "Penerima beasiswa berhasil diperbarui",
      data: updated.rows[0],
      sync: {
        student_count: 1,
        synced_count: syncResult.synced_count,
      },
    });
  }),
);

router.delete(
  "/scholarship/:id/students",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const scholarshipId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(
      req.body.homebase_id ?? req.query.homebase_id,
    );
    const homebaseId = await resolveScopedHomebaseId(
      client,
      req.user,
      requestedHomebaseId,
    );
    const studentIds = parseIntArray(req.body.student_ids ?? req.query.student_ids);
    const softExplicit =
      req.body.soft !== undefined || req.query.soft !== undefined;
    const soft = softExplicit
      ? req.body.soft === true ||
        req.query.soft === "true" ||
        req.body.soft === "true"
      : true;

    if (!homebaseId || !scholarshipId) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    if (studentIds.length === 0) {
      return res.status(400).json({ message: "Minimal satu siswa wajib dipilih" });
    }

    const scholarship = await getScholarshipById(client, homebaseId, scholarshipId);
    if (!scholarship) {
      return res.status(404).json({ message: "Beasiswa tidak ditemukan" });
    }

    if (soft) {
      await client.query(
        `
          UPDATE finance.scholarship_student
          SET is_active = false, updated_at = NOW()
          WHERE scholarship_id = $1
            AND student_id = ANY($2::int[])
        `,
        [scholarshipId, studentIds],
      );
    } else {
      await client.query(
        `
          DELETE FROM finance.scholarship_student
          WHERE scholarship_id = $1
            AND student_id = ANY($2::int[])
        `,
        [scholarshipId, studentIds],
      );
    }

    await client.query(
      `UPDATE finance.scholarship SET updated_at = NOW() WHERE id = $1`,
      [scholarshipId],
    );

    let syncedCount = 0;
    for (const studentId of studentIds) {
      const syncResult = await syncScholarshipForStudent(
        client,
        homebaseId,
        studentId,
      );
      syncedCount += syncResult.synced_count || 0;
    }

    res.json({
      status: "success",
      message: soft
        ? "Penerima beasiswa berhasil dinonaktifkan"
        : "Penerima beasiswa berhasil dihapus",
      sync: {
        student_count: studentIds.length,
        synced_count: syncedCount,
      },
    });
  }),
);

export default router;
