import { Router } from "express";
import { poolSource, poolDest } from "../../config/migration.js";

const router = Router();

// Helper untuk reset sequence setelah insert manual ID
const resetSequence = async (client, tableName) => {
  try {
    // Ambil max id
    const res = await client.query(
      `SELECT MAX(id) as max_id FROM ${tableName}`,
    );
    const maxId = res.rows[0].max_id || 1;
    // Set sequence
    await client.query(
      `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), $1)`,
      [maxId],
    );
    console.log(`Sequence ${tableName} reset to ${maxId}`);
  } catch (e) {
    console.log(
      `Skipping sequence reset for ${tableName} (No ID/Serial found)`,
    );
  }
};

/**
 * STEP 1: MIGRASI MASTER DATA (Wilayah, Homebase, Periode, Jurusan, Kelas, Mapel)
 */
router.post("/migrate/step-1-master", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");

    // 1. WILAYAH
    console.log("Migrating Regions...");
    const provinces = await sourceClient.query("SELECT * FROM db_province");
    for (const r of provinces.rows) {
      await destClient.query(
        "INSERT INTO db_province (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
        [r.id, r.name],
      );
    }
    const cities = await sourceClient.query("SELECT * FROM db_city");
    for (const r of cities.rows) {
      await destClient.query(
        "INSERT INTO db_city (id, province_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        [r.id, r.provinceid, r.name],
      );
    }
    const districts = await sourceClient.query("SELECT * FROM db_district");
    for (const r of districts.rows) {
      await destClient.query(
        "INSERT INTO db_district (id, city_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        [r.id, r.cityid, r.name],
      );
    }
    const villages = await sourceClient.query("SELECT * FROM db_village");
    for (const r of villages.rows) {
      await destClient.query(
        "INSERT INTO db_village (id, district_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        [r.id, r.districtid, r.name],
      );
    }

    // 2. ACADEMIC MASTER
    console.log("Migrating Academic Data...");

    // --- A. HOMEBASE ---
    const homebases = await sourceClient.query("SELECT * FROM a_homebase");
    for (const r of homebases.rows) {
      await destClient.query(
        "INSERT INTO a_homebase (id, name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        [r.id, r.name, r.createdat],
      );
    }
    await resetSequence(destClient, "a_homebase");

    // [PENTING] Ambil daftar ID Homebase yang VALID yang baru saja diinsert
    // Ini digunakan untuk validasi FK agar tidak error jika data source kotor
    const validHomebaseRes = await destClient.query(
      "SELECT id FROM a_homebase",
    );
    const validHomebaseIds = validHomebaseRes.rows.map((row) => row.id);

    // --- B. PERIODE ---
    const periodes = await sourceClient.query("SELECT * FROM a_periode");
    for (const r of periodes.rows) {
      // Validasi FK Homebase
      const hbId = validHomebaseIds.includes(r.homebase) ? r.homebase : null;

      await destClient.query(
        "INSERT INTO a_periode (id, homebase_id, name, is_active, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING",
        [r.id, hbId, r.name, r.isactive, r.createdat],
      );
    }
    await resetSequence(destClient, "a_periode");

    // --- C. GRADE (TINGKAT) ---
    const grades = await sourceClient.query("SELECT * FROM a_grade");
    for (const r of grades.rows) {
      const hbId = validHomebaseIds.includes(r.homebase) ? r.homebase : null;

      await destClient.query(
        "INSERT INTO a_grade (id, homebase_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        [r.id, hbId, r.name],
      );
    }
    await resetSequence(destClient, "a_grade");

    // [PENTING] Ambil daftar ID Grade Valid untuk validasi Class nanti
    const validGradeRes = await destClient.query("SELECT id FROM a_grade");
    const validGradeIds = validGradeRes.rows.map((r) => r.id);

    // --- D. MAJOR (JURUSAN) ---
    // (Disini letak error sebelumnya, kita beri validasi hbId)
    const majors = await sourceClient.query("SELECT * FROM a_major");
    for (const r of majors.rows) {
      // Cek apakah homebase ID ada di daftar valid? Jika tidak, set NULL.
      const hbId = validHomebaseIds.includes(r.homebase) ? r.homebase : null;

      if (!hbId && r.homebase) {
        console.warn(
          `[WARNING] Orphaned Major found: ID ${r.id} refers to missing Homebase ${r.homebase}. Setting Homebase to NULL.`,
        );
      }

      await destClient.query(
        "INSERT INTO a_major (id, homebase_id, name, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
        [r.id, hbId, r.name, r.createdat],
      );
    }
    await resetSequence(destClient, "a_major");

    // Ambil daftar Major Valid
    const validMajorRes = await destClient.query("SELECT id FROM a_major");
    const validMajorIds = validMajorRes.rows.map((r) => r.id);

    // --- E. CLASS (KELAS) ---
    const classes = await sourceClient.query("SELECT * FROM a_class");
    for (const r of classes.rows) {
      // Validasi Multi FK
      const hbId = validHomebaseIds.includes(r.homebase) ? r.homebase : null;
      const grId = validGradeIds.includes(r.grade) ? r.grade : null;
      const mjId = validMajorIds.includes(r.major) ? r.major : null;

      await destClient.query(
        `INSERT INTO a_class (id, homebase_id, grade_id, major_id, name, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [r.id, hbId, grId, mjId, r.name, r.createdat],
      );
    }
    await resetSequence(destClient, "a_class");

    // --- F. SUBJECT CATEGORY ---
    const cats = await sourceClient.query("SELECT * FROM a_category");
    for (const r of cats.rows) {
      const hbId = validHomebaseIds.includes(r.homebase) ? r.homebase : null;

      await destClient.query(
        "INSERT INTO a_subject_category (id, homebase_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        [r.id, hbId, r.name],
      );
    }
    await resetSequence(destClient, "a_subject_category");

    // Ambil Valid Category
    const validCatRes = await destClient.query(
      "SELECT id FROM a_subject_category",
    );
    const validCatIds = validCatRes.rows.map((r) => r.id);

    // --- G. SUBJECT (MAPEL) ---
    const subjects = await sourceClient.query("SELECT * FROM a_subject");
    for (const r of subjects.rows) {
      const hbId = validHomebaseIds.includes(r.homebase) ? r.homebase : null;
      const catId = validCatIds.includes(r.categoryid) ? r.categoryid : null;

      await destClient.query(
        `INSERT INTO a_subject (id, homebase_id, category_id, name, cover_image) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [r.id, hbId, catId, r.name, r.cover],
      );
    }
    await resetSequence(destClient, "a_subject");

    await destClient.query("COMMIT");
    res.json({ message: "Step 1: Master Data Migrated Successfully" });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

/**
 * STEP 1-B (FIX): SYNC BRANCHES & LINK SUBJECTS
 * Strategi: UPSERT (Insert atau Update jika ID ada)
 * Fitur: Tidak menghapus data, mencoba memperbaiki relasi yang putus.
 */
router.post("/migrate/step-1-b-branches-fix", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("--- START: Fix Cabang Mapel & Relasi ---");

    // Helper Reset Sequence
    const resetSequence = async (client, tableName) => {
      try {
        const res = await client.query(
          `SELECT MAX(id) as max_id FROM ${tableName}`,
        );
        const maxId = res.rows[0].max_id || 1;
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), $1)`,
          [maxId],
        );
      } catch (e) {
        console.log(`Seq reset skipped for ${tableName}`);
      }
    };

    // =======================================================
    // 1. PINDAHKAN CABANG (a_branch -> a_subject_branch)
    // =======================================================
    console.log("1. Migrating Branches...");

    // Ambil data cabang lama + Homebase dari Kategori induknya
    // (Karena a_branch lama tidak punya homebase, kita pinjam dari a_category)
    const branches = await sourceClient.query(`
        SELECT 
            b.id, 
            b.name, 
            b.categoryid, 
            b.createdat,
            c.homebase
        FROM a_branch b
        LEFT JOIN a_category c ON b.categoryid = c.id
    `);

    let inserted = 0;
    let errors = [];

    for (const r of branches.rows) {
      // Validasi: Pastikan Kategori Induk ada di DB Baru
      const checkParent = await destClient.query(
        "SELECT id FROM a_subject_category WHERE id = $1",
        [r.categoryid],
      );

      if (checkParent.rows.length > 0 && r.homebase) {
        try {
          // QUERY UPSERT (Insert, kalau ID tabrakan -> Update isinya)
          // Ini akan memperbaiki data yang 'nyangkut' atau belum lengkap
          await destClient.query(
            `INSERT INTO a_subject_branch (id, homebase_id, category_id, name, created_at) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (id) DO UPDATE SET 
                    homebase_id = EXCLUDED.homebase_id,
                    category_id = EXCLUDED.category_id,
                    name = EXCLUDED.name`,
            [r.id, r.homebase, r.categoryid, r.name, r.createdat],
          );
          inserted++;
        } catch (err) {
          // Tangkap error per baris agar tidak membatalkan semua proses
          console.error(`Error ID ${r.id}: ${err.message}`);
          errors.push({ id: r.id, msg: err.message });
        }
      } else {
        const reason = !r.homebase
          ? "Homebase NULL di Source"
          : "Parent Category Missing di Dest";
        console.warn(`[SKIP] Branch ID ${r.id} (${r.name}): ${reason}`);
        errors.push({ id: r.id, msg: reason });
      }
    }

    await resetSequence(destClient, "a_subject_branch");
    console.log(
      `   Processed Branches. Success: ${inserted}, Errors: ${errors.length}`,
    );

    // =======================================================
    // 2. SAMBUNGKAN MAPEL KE CABANG (a_subject.branchid)
    // =======================================================
    console.log("2. Linking Subjects to Branches...");

    // Ambil semua mapel di DB LAMA yang punya branchid
    const subjectsOld = await sourceClient.query(
      "SELECT id, branchid FROM a_subject WHERE branchid IS NOT NULL",
    );

    let linkCount = 0;
    for (const r of subjectsOld.rows) {
      // Cek apakah branch target benar-benar ada di DB Baru sekarang?
      const checkBranch = await destClient.query(
        "SELECT id FROM a_subject_branch WHERE id = $1",
        [r.branchid],
      );

      if (checkBranch.rows.length > 0) {
        // Update DB BARU: Set branch_id sesuai data lama
        await destClient.query(
          `UPDATE a_subject SET branch_id = $1 WHERE id = $2`,
          [r.branchid, r.id],
        );
        linkCount++;
      }
    }
    console.log(`   Linked ${linkCount} subjects to their branches.`);

    await destClient.query("COMMIT");

    res.json({
      message: "Branch Migration & Linking Completed",
      stats: {
        total_source_branches: branches.rows.length,
        success_upsert: inserted,
        subjects_relinked: linkCount,
        errors: errors,
      },
    });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error("Migration Fix Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

/**
 * STEP 2: USERS (Sudah ada, dimodifikasi sedikit agar include User ID preservation)
 * PENTING: Jalankan Step 1 dulu agar relasi wilayah aman.
 */
router.post("/migrate/step-2-users", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Migrating Users...");

    // ==========================================
    // 0. CACHE MASTER DATA (Untuk Validasi Wilayah)
    // ==========================================
    console.log("Loading valid Master Data IDs...");

    const getIds = async (table) => {
      const res = await destClient.query(`SELECT id FROM ${table}`);
      return new Set(res.rows.map((r) => r.id));
    };

    const validProvinces = await getIds("db_province");
    const validCities = await getIds("db_city");
    const validDistricts = await getIds("db_district");
    const validVillages = await getIds("db_village");
    const validHomebases = new Set(
      (await destClient.query("SELECT id FROM a_homebase")).rows.map(
        (r) => r.id,
      ),
    );

    // Helper: Validasi ID (ubah string kosong/spasi jadi NULL)
    const validateId = (id, validSet) => {
      if (!id) return null;
      const trimmed = String(id).trim();
      if (trimmed === "") return null;
      if (validSet.has(trimmed)) return trimmed;
      return null; // ID ada teksnya, tapi tidak valid di DB baru -> set NULL
    };

    // ==========================================
    // 1. GURU
    // ==========================================
    // u_teachers punya kolom username, jadi aman
    const teachersOld = await sourceClient.query("SELECT * FROM u_teachers");
    for (const row of teachersOld.rows) {
      const fullName = row.name || row.username || "Guru Tanpa Nama";

      const check = await destClient.query(
        "SELECT id FROM u_users WHERE username = $1",
        [row.username],
      );
      let userId;

      if (check.rows.length === 0) {
        const userRes = await destClient.query(
          `INSERT INTO u_users (username, password, full_name, role, img_url, gender, created_at) 
           VALUES ($1, $2, $3, 'teacher', $4, $5, $6) RETURNING id`,
          [
            row.username,
            row.password,
            fullName,
            row.img,
            row.gender,
            row.createdat,
          ],
        );
        userId = userRes.rows[0].id;
      } else {
        userId = check.rows[0].id;
      }

      const hbId =
        row.homebase && validHomebases.has(row.homebase) ? row.homebase : null;

      await destClient.query(
        `INSERT INTO u_teachers (user_id, phone, email, homebase_id, is_homeroom) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO NOTHING`,
        [userId, row.phone, row.email, hbId, row.homeroom],
      );
    }

    // ==========================================
    // 2. SISWA
    // ==========================================
    // PERBAIKAN: Hapus 's.username' dari query karena tidak ada di oldtable u_students
    const studentsOld = await sourceClient.query(`
      SELECT 
        s.id as real_student_id,
        s.name as login_name,  -- Nama dari tabel akun (Wajib ada)
        s.password, 
        s.gender, 
        s.isactive, 
        s.createdat,
        s.nis as login_nis,    -- NIS dipakai sebagai username
        s.homebase as login_homebase,
        d.* FROM u_students s
      LEFT JOIN db_student d ON s.id = d.userid
    `);

    for (const row of studentsOld.rows) {
      // 1. Tentukan Username (Pakai NIS, kalau kosong generate dummy)
      let username = row.login_nis
        ? row.login_nis.trim()
        : `siswa_${row.real_student_id}`;
      if (username === "") username = `siswa_${row.real_student_id}`;

      // 2. Tentukan Full Name (Prioritas: Biodata(d.name) -> Akun(login_name) -> Username)
      // Note: d.* mereturn kolom 'name' dari db_student yang mungkin null/tertimpa
      let finalName =
        row.name || row.login_name || username || "Siswa Tanpa Nama";

      let userId;
      const check = await destClient.query(
        "SELECT id FROM u_users WHERE username = $1",
        [username],
      );

      if (check.rows.length === 0) {
        const userRes = await destClient.query(
          `INSERT INTO u_users (username, password, full_name, role, gender, is_active, created_at) 
           VALUES ($1, $2, $3, 'student', $4, $5, $6) RETURNING id`,
          [
            username,
            row.password,
            finalName,
            row.gender,
            row.isactive,
            row.createdat,
          ],
        );
        userId = userRes.rows[0].id;
      } else {
        userId = check.rows[0].id;
      }

      // 3. Validasi Wilayah & Homebase
      const provinceId = validateId(row.provinceid, validProvinces);
      const cityId = validateId(row.cityid, validCities);
      const districtId = validateId(row.districtid, validDistricts);
      const villageId = validateId(row.villageid, validVillages);

      const rawHb = row.homebase || row.login_homebase;
      const homebaseId = rawHb && validHomebases.has(rawHb) ? rawHb : null;

      await destClient.query(
        `INSERT INTO u_students (
          user_id, nis, birth_place, birth_date, height, weight, head_circumference, 
          order_number, siblings_count, address, province_id, city_id, district_id, village_id, postal_code,
          homebase_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (user_id) DO NOTHING`,
        [
          userId,
          username, // Gunakan username/NIS yang sudah divalidasi
          row.birth_place,
          row.birth_date,
          row.height,
          row.weight,
          row.head,
          parseInt(row.order_number) || 0,
          parseInt(row.siblings) || 0,
          row.address,
          provinceId,
          cityId,
          districtId,
          villageId,
          row.postal_code,
          homebaseId,
        ],
      );

      // Insert Keluarga
      await destClient.query(
        `INSERT INTO u_student_families (
          student_id, father_nik, father_name, father_job, father_phone,
          mother_nik, mother_name, mother_job, mother_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          row.father_nik,
          row.father_name,
          row.father_job,
          row.father_phone,
          row.mother_nik,
          row.mother_name,
          row.mother_job,
          row.mother_phone,
        ],
      );
    }

    await destClient.query("COMMIT");
    res.json({
      message: "Step 2: Users Migrated Successfully.",
    });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

/**
 * STEP 3: CBT (BANK SOAL & UJIAN)
 * Transformasi Data: c_question columns (a,b,c,d,e) -> c_question_options rows
 */
router.post("/migrate/step-3-cbt", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Migrating CBT Data...");

    // Helper function (pastikan sudah ada di scope file ini, atau definisikan ulang)
    const resetSequence = async (client, tableName) => {
      try {
        const res = await client.query(
          `SELECT MAX(id) as max_id FROM ${tableName}`,
        );
        const maxId = res.rows[0].max_id || 1;
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), $1)`,
          [maxId],
        );
      } catch (e) {
        console.log(`Skipping seq reset for ${tableName}`);
      }
    };

    // ==========================================
    // 1. BANK SOAL
    // ==========================================
    console.log("--- Migrating Banks ---");

    // Mapping Teacher ID lama ke User ID baru
    const banks = await sourceClient.query(
      "SELECT b.*, t.username as teacher_username FROM c_bank b LEFT JOIN u_teachers t ON b.teacher = t.id",
    );

    for (const row of banks.rows) {
      // Cari ID baru guru
      const teacherRes = await destClient.query(
        "SELECT id FROM u_users WHERE username = $1",
        [row.teacher_username],
      );
      const newTeacherId = teacherRes.rows[0] ? teacherRes.rows[0].id : null;

      // Insert Bank
      await destClient.query(
        `INSERT INTO c_bank (id, teacher_id, subject_id, title, type, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [row.id, newTeacherId, row.subject, row.name, row.btype, row.createdat],
      );
    }
    await resetSequence(destClient, "c_bank");

    // [PENTING] Ambil Daftar Bank ID yang VALID (Berhasil Migrasi)
    // Gunakan ini untuk memfilter Soal & Ujian yang "Yatim Piatu" (Orphaned)
    const validBankRes = await destClient.query("SELECT id FROM c_bank");
    const validBankIds = new Set(validBankRes.rows.map((r) => r.id));
    console.log(`Total Valid Banks: ${validBankIds.size}`);

    // ==========================================
    // 2. SOAL & OPSI
    // ==========================================
    console.log("--- Migrating Questions ---");
    const questions = await sourceClient.query("SELECT * FROM c_question");

    let skippedQuestions = 0;
    for (const q of questions.rows) {
      // [VALIDASI] Cek apakah Bank ID ada di DB Baru?
      if (!validBankIds.has(q.bank)) {
        skippedQuestions++;
        continue; // SKIP jika bank tidak ditemukan (Orphaned Question)
      }

      // Insert Soal
      await destClient.query(
        `INSERT INTO c_question (id, bank_id, q_type, content, score_point) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [q.id, q.bank, q.qtype, q.question, q.poin],
      );

      // Insert Opsi (Transformasi Kolom -> Baris)
      if (q.qtype == 1) {
        // Hanya PG
        const options = [
          { label: "A", content: q.a },
          { label: "B", content: q.b },
          { label: "C", content: q.c },
          { label: "D", content: q.d },
          { label: "E", content: q.e },
        ];

        for (const opt of options) {
          if (opt.content) {
            // Cek kunci jawaban (case insensitive)
            const isCorrect =
              q.qkey && q.qkey.trim().toUpperCase() === opt.label;

            await destClient.query(
              `INSERT INTO c_question_options (question_id, label, content, is_correct) 
               VALUES ($1, $2, $3, $4)`,
              [q.id, opt.label, opt.content, isCorrect],
            );
          }
        }
      }
    }
    console.log(`Skipped Questions (Orphaned): ${skippedQuestions}`);
    await resetSequence(destClient, "c_question");

    // ==========================================
    // 3. EXAM (Jadwal Ujian)
    // ==========================================
    console.log("--- Migrating Exams ---");
    const exams = await sourceClient.query("SELECT * FROM c_exam");

    let skippedExams = 0;
    for (const ex of exams.rows) {
      // Cari Bank ID dari tabel relasi lama (c_ebank)
      const bankLink = await sourceClient.query(
        "SELECT bank FROM c_ebank WHERE exam = $1 LIMIT 1",
        [ex.id],
      );
      const sourceBankId =
        bankLink.rows.length > 0 ? bankLink.rows[0].bank : null;

      // [VALIDASI] Cek apakah Bank ID valid?
      // Jika sourceBankId null atau tidak ada di validBankIds, exam ini tidak punya soal -> Skip atau set Null?
      // Idealnya exam butuh bank. Kita skip jika bank tidak valid.

      if (!sourceBankId || !validBankIds.has(sourceBankId)) {
        skippedExams++;
        continue; // Skip Exam tanpa Bank yang valid
      }

      await destClient.query(
        `INSERT INTO c_exam (id, bank_id, name, duration_minutes, is_active, is_shuffle, mc_score_weight, essay_score_weight, token) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [
          ex.id,
          sourceBankId,
          ex.name,
          ex.duration,
          ex.isactive,
          ex.isshuffle,
          ex.mc_score,
          ex.essay_score,
          ex.token,
        ],
      );
    }
    console.log(`Skipped Exams (Invalid Bank): ${skippedExams}`);
    await resetSequence(destClient, "c_exam");

    await destClient.query("COMMIT");
    res.json({
      message: "Step 3: CBT Data Migrated & Transformed Successfully.",
    });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

/**
 * STEP 4: LMS DATA (Materi, Nilai, dll)
 * Transformasi Data: Nilai Formative (Columns -> Rows)
 */
router.post("/migrate/step-4-lms", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Migrating LMS Data...");

    // 1. CHAPTER (BAB)
    const chapters = await sourceClient.query("SELECT * FROM l_chapter");
    for (const r of chapters.rows) {
      await destClient.query(
        `INSERT INTO l_chapter (id, subject_id, title, description, order_number) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.subject, r.title, r.target, r.order_number],
      );
    }
    await resetSequence(destClient, "l_chapter");

    // 2. CONTENT (Materi)
    const contents = await sourceClient.query("SELECT * FROM l_content");
    for (const r of contents.rows) {
      // Cari file attachment dari l_file old table
      const fileRes = await sourceClient.query(
        "SELECT file, video FROM l_file WHERE content = $1 LIMIT 1",
        [r.id],
      );
      const attach = fileRes.rows[0] ? fileRes.rows[0].file : null;
      const video = fileRes.rows[0] ? fileRes.rows[0].video : null;

      await destClient.query(
        `INSERT INTO l_content (id, chapter_id, title, attachment_url, video_url, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.chapter, r.title, attach, video, r.createdat],
      );
    }
    await resetSequence(destClient, "l_content");

    // 3. NILAI FORMATIF (UNPIVOT)
    // Di oldtable: l_formative punya student_id (int) yang merujuk ke u_students(id).
    // Di newtable: student_id merujuk ke u_users(id).
    // KITA PERLU TRANSLATE ID LAGI.

    // Ambil semua data formatif lama + data user mapping
    // Join dengan u_students lama untuk dapat NIS, lalu join ke u_users baru via username
    const formatifOld = await sourceClient.query(`
      SELECT f.*, s.nis 
      FROM l_formative f
      JOIN u_students s ON f.student_id = s.id
    `);

    for (const f of formatifOld.rows) {
      // Cari User ID Baru
      const userCheck = await destClient.query(
        "SELECT id FROM u_users WHERE username = $1",
        [f.nis],
      );
      if (userCheck.rows.length === 0) continue; // Skip jika user tidak ketemu
      const newStudentId = userCheck.rows[0].id;

      // Loop f_1 sampai f_8
      for (let i = 1; i <= 8; i++) {
        const score = f[`f_${i}`];
        if (score !== null && score !== undefined) {
          await destClient.query(
            `INSERT INTO l_score_formative (student_id, subject_id, chapter_id, type, score)
              VALUES ($1, $2, $3, $4, $5)`,
            [newStudentId, f.subject_id, f.chapter_id, `Tugas ${i}`, score],
          );
        }
      }
    }

    // 4. ATTENDANCE (Presensi)
    // Sama, perlu translate Student ID
    const attOld = await sourceClient.query(`
      SELECT a.*, s.nis
      FROM l_attendance a
      JOIN u_students s ON a.studentid = s.id
    `);

    for (const a of attOld.rows) {
      const userCheck = await destClient.query(
        "SELECT id FROM u_users WHERE username = $1",
        [a.nis],
      );
      if (userCheck.rows.length === 0) continue;
      const newStudentId = userCheck.rows[0].id;

      // Cari Teacher ID Baru juga (berdasarkan username yg diambil dr tabel u_teachers old)
      // (Logic disederhanakan: skip teacher mapping jika null, atau set null)

      await destClient.query(
        `INSERT INTO l_attendance (class_id, subject_id, student_id, date, note)
             VALUES ($1, $2, $3, $4, $5)`,
        [a.classid, a.subjectid, newStudentId, a.day_date, a.note],
      );
    }

    await destClient.query("COMMIT");
    res.json({ message: "Step 4: LMS Data Migrated" });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

/**
 * STEP 5: TAHFIZ (Al-Quran & Hafalan)
 */
router.post("/migrate/step-5-tahfiz", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Migrating Tahfiz Data...");

    // 1. SURAH
    const surahs = await sourceClient.query("SELECT * FROM t_surah");
    for (const r of surahs.rows) {
      await destClient.query(
        `INSERT INTO t_surah (id, number, name_latin, total_ayat) VALUES ($1, $1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.name, r.ayat],
      );
    }

    // 2. JUZ
    const juzs = await sourceClient.query("SELECT * FROM t_juz");
    for (const r of juzs.rows) {
      // Parse "Juz 1" -> 1
      const num = parseInt(r.name.replace(/\D/g, "")) || r.id;
      await destClient.query(
        `INSERT INTO t_juz (id, number, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [r.id, num, r.name],
      );
    }

    // 3. JUZ DETAIL (Mapping)
    const items = await sourceClient.query("SELECT * FROM t_juzitems");
    for (const r of items.rows) {
      await destClient.query(
        `INSERT INTO t_juz_detail (juz_id, surah_id, start_ayat, end_ayat) VALUES ($1, $2, $3, $4)`,
        [r.juz_id, r.surah_id, r.from_ayat, r.to_ayat],
      );
    }

    // 4. DAILY RECORD (t_process -> t_daily_record)
    // Perlu translate Student ID lagi
    const processOld = await sourceClient.query(`
        SELECT p.*, s.nis
        FROM t_process p
        JOIN u_students s ON p.userid = s.id
      `);

    for (const r of processOld.rows) {
      const userCheck = await destClient.query(
        "SELECT id FROM u_users WHERE username = $1",
        [r.nis],
      );
      if (userCheck.rows.length === 0) continue;
      const newStudentId = userCheck.rows[0].id;

      // Mapping type
      // Di old: type_id int. Di new: perlu cek t_activity_type.
      // Asumsi kita insert raw ID saja jika cocok, atau default.

      await destClient.query(
        `INSERT INTO t_daily_record (student_id, date, start_surah_id, start_ayat, end_surah_id, end_ayat, lines_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newStudentId,
          r.createdat,
          r.surah_id,
          r.from_count,
          r.surah_id,
          r.to_count,
          r.to_line - r.from_line,
        ],
      );
    }

    await destClient.query("COMMIT");
    res.json({ message: "Step 5: Tahfiz Data Migrated" });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

/**
 * STEP 6: SIBLINGS (SAUDARA KANDUNG)
 * Source: db_family -> Dest: u_student_siblings
 */
router.post("/migrate/step-6-siblings", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Migrating Siblings Data...");

    // 1. Ambil data family dari DB lama JOIN ke siswa untuk dapat NIS
    // Lihat image_020857.png: db_family punya userid, name, gender, birth_date
    const siblingsOld = await sourceClient.query(`
      SELECT 
        f.id, 
        f.name, 
        f.gender, 
        f.birth_date, 
        f.createdat,
        s.nis,
        s.id as old_student_id
      FROM db_family f
      JOIN u_students s ON f.userid = s.id
    `);

    let successCount = 0;
    let skipCount = 0;

    for (const row of siblingsOld.rows) {
      // 2. Logic pencarian ID Baru (sama dengan Step 2)
      // Gunakan NIS sebagai kunci username
      let usernameToFind = row.nis
        ? row.nis.trim()
        : `siswa_${row.old_student_id}`;
      if (usernameToFind === "") usernameToFind = `siswa_${row.old_student_id}`;

      // 3. Cari User ID di New Table
      const userCheck = await destClient.query(
        "SELECT id FROM u_users WHERE username = $1",
        [usernameToFind],
      );

      if (userCheck.rows.length > 0) {
        const newStudentId = userCheck.rows[0].id;

        // 4. Insert ke u_student_siblings
        await destClient.query(
          `INSERT INTO u_student_siblings (student_id, name, gender, birth_date, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [newStudentId, row.name, row.gender, row.birth_date, row.createdat],
        );
        successCount++;
      } else {
        skipCount++;
      }
    }

    await destClient.query("COMMIT");
    console.log(`Step 6 Done. Success: ${successCount}, Skipped: ${skipCount}`);

    res.json({
      message: "Step 6: Siblings Data Migrated Successfully",
      stats: { success: successCount, skipped: skipCount },
    });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error("Migration Step 6 Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

/**
 * STEP 7: CLASS ENROLLMENT (Riwayat Kelas Siswa)
 * Source: cl_students (Old) -> Dest: u_class_enrollments (New) & Update u_students cache
 */
router.post("/migrate/step-7-enrollment", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log(
      "Migrating Class Enrollment (cl_students -> u_class_enrollments)...",
    );

    // 1. Ambil data cl_students lama, JOIN u_students untuk dapat NIS
    const enrollments = await sourceClient.query(`
      SELECT 
        cl.id,
        cl.periode as periode_id,
        cl.classid as class_id,
        cl.createdat,
        cl.homebase as homebase_id,
        s.nis,
        s.id as old_student_id
      FROM cl_students cl
      JOIN u_students s ON cl.student = s.id
    `);

    let successCount = 0;
    let skipCount = 0;

    for (const row of enrollments.rows) {
      // 2. Cari ID Siswa Baru berdasarkan NIS
      let username = row.nis ? row.nis.trim() : `siswa_${row.old_student_id}`;
      if (!username) username = `siswa_${row.old_student_id}`;

      const userCheck = await destClient.query(
        "SELECT id FROM u_users WHERE username = $1",
        [username],
      );

      if (userCheck.rows.length > 0) {
        const newStudentId = userCheck.rows[0].id;

        // 3. Insert ke tabel baru u_class_enrollments
        try {
          await destClient.query(
            `INSERT INTO u_class_enrollments 
             (student_id, class_id, periode_id, homebase_id, enrolled_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (student_id, periode_id) DO NOTHING`,
            [
              newStudentId,
              row.class_id,
              row.periode_id,
              row.homebase_id,
              row.createdat || new Date(),
            ],
          );
          successCount++;
        } catch (errInsert) {
          console.warn(
            `Failed insert enrollment Old ID ${row.id}: ${errInsert.message}`,
          );
          skipCount++;
        }
      } else {
        skipCount++;
      }
    }

    console.log("Syncing u_students current status cache...");

    // 4. UPDATE STATUS TERAKHIR DI u_students
    // Ambil data enrollment terbaru untuk setiap siswa, lalu update u_students
    await destClient.query(`
      UPDATE u_students s
      SET 
        current_class_id = latest_enroll.class_id,
        current_periode_id = latest_enroll.periode_id,
        homebase_id = latest_enroll.homebase_id
      FROM (
        SELECT DISTINCT ON (student_id) student_id, class_id, periode_id, homebase_id
        FROM u_class_enrollments
        ORDER BY student_id, periode_id DESC, id DESC
      ) latest_enroll
      WHERE s.user_id = latest_enroll.student_id
    `);

    await destClient.query("COMMIT");
    console.log(
      `Step 7 Done. Enrollment Created: ${successCount}, Skipped: ${skipCount}`,
    );

    res.json({
      message: "Step 7: Class Enrollments Migrated & Student Status Updated",
      stats: { success: successCount, skipped: skipCount },
    });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error("Migration Step 7 Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

/**
 * STEP 8: TEACHER SUBJECT ASSIGNMENT (Guru Mengampu Mapel)
 * Source: at_subject (Old) -> Dest: at_subject (New)
 * Note: Mapping Teacher ID lama -> New User ID via Username
 */
router.post("/migrate/step-8-teacher-subjects", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Migrating Teacher Subject Assignments...");

    // 1. Ambil data relasi lama + Username Guru
    // Kita butuh username untuk mencocokkan dengan User ID di database baru
    const allocations = await sourceClient.query(`
      SELECT 
        at.id, 
        at.subject as subject_id, 
        at.createdat,
        t.username as teacher_username
      FROM at_subject at
      JOIN u_teachers t ON at.teacher = t.id
    `);

    let successCount = 0;
    let skipCount = 0;

    for (const row of allocations.rows) {
      // 2. Cari New Teacher ID (User ID) berdasarkan Username
      const userRes = await destClient.query(
        "SELECT id FROM u_users WHERE username = $1",
        [row.teacher_username],
      );

      if (userRes.rows.length > 0) {
        const newTeacherId = userRes.rows[0].id;

        // 3. Validasi Subject ID (Pastikan mapelnya ada di DB baru)
        // (Opsional, tapi aman dilakukan untuk mencegah foreign key error)
        const subjectCheck = await destClient.query(
          "SELECT id FROM a_subject WHERE id = $1",
          [row.subject_id],
        );

        if (subjectCheck.rows.length > 0) {
          // 4. Insert ke at_subject
          // class_id dibiarkan NULL karena di oldtable tidak ada infonya
          await destClient.query(
            `INSERT INTO at_subject (teacher_id, subject_id, created_at)
               VALUES ($1, $2, $3)`,
            [newTeacherId, row.subject_id, row.createdat],
          );
          successCount++;
        } else {
          console.warn(
            `Skipped: Subject ID ${row.subject_id} not found in new DB.`,
          );
          skipCount++;
        }
      } else {
        console.warn(
          `Skipped: Teacher ${row.teacher_username} not found in new DB.`,
        );
        skipCount++;
      }
    }

    await destClient.query("COMMIT");
    console.log(
      `Step 8 Done. Assigned: ${successCount}, Skipped: ${skipCount}`,
    );

    res.json({
      message: "Step 8: Teacher Subjects Migrated Successfully",
      stats: { success: successCount, skipped: skipCount },
    });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error("Migration Step 8 Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

export default router;
