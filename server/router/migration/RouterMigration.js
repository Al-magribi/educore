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

    // Helper: map month name to number (for compact type encoding)
    const monthToNumber = (monthName) => {
      if (!monthName) return null;
      const map = {
        Januari: 1,
        Februari: 2,
        Maret: 3,
        April: 4,
        Mei: 5,
        Juni: 6,
        Juli: 7,
        Agustus: 8,
        September: 9,
        Oktober: 10,
        November: 11,
        Desember: 12,
      };
      return map[monthName] || null;
    };

    const normalizeScore = (value) => {
      if (value === null || value === undefined) return 0;
      const num = Number(value);
      return Number.isNaN(num) ? 0 : Math.round(num);
    };

    const toIdKey = (value) => {
      if (value === null || value === undefined) return null;
      return String(value);
    };

    const BATCH_SIZE = 1000;
    const bulkInsert = async (client, table, columns, rows) => {
      if (!rows.length) return;
      const values = [];
      const placeholders = rows.map((row, rowIndex) => {
        const baseIndex = rowIndex * columns.length;
        row.forEach((value) => values.push(value));
        const cols = columns.map((_, colIndex) => `$${baseIndex + colIndex + 1}`);
        return `(${cols.join(", ")})`;
      });
      await client.query(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(", ")}`,
        values,
      );
    };

    // Cache mapping old student_id -> new user_id (via username/NIS)
    const sourceStudents = await sourceClient.query(
      "SELECT id, nis FROM u_students",
    );
    const sourceTeachers = await sourceClient.query(
      "SELECT id, username FROM u_teachers",
    );
    const destUsers = await destClient.query(
      "SELECT id, username FROM u_users",
    );

    const usernameToUserId = new Map(
      destUsers.rows.map((row) => [String(row.username).trim(), row.id]),
    );

    const oldStudentIdToNewUserId = new Map();
    for (const row of sourceStudents.rows) {
      const nis = row.nis ? String(row.nis).trim() : "";
      const username = nis !== "" ? nis : `siswa_${row.id}`;
      const newUserId = usernameToUserId.get(username);
      if (newUserId) {
        oldStudentIdToNewUserId.set(row.id, newUserId);
      }
    }

    const oldTeacherIdToNewUserId = new Map();
    for (const row of sourceTeachers.rows) {
      const username = row.username ? String(row.username).trim() : "";
      if (!username) continue;
      const newUserId = usernameToUserId.get(username);
      if (newUserId) {
        oldTeacherIdToNewUserId.set(row.id, newUserId);
      }
    }

    // 1. CHAPTER (BAB)
    const validSubjectIds = new Set(
      (await destClient.query("SELECT id FROM a_subject")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );
    const chapters = await sourceClient.query("SELECT * FROM l_chapter");
    let skippedChapters = 0;
    for (const r of chapters.rows) {
      const subjectKey = toIdKey(r.subject);
      const subjectId = subjectKey && validSubjectIds.has(subjectKey)
        ? r.subject
        : null;
      if (!subjectId && r.subject) {
        skippedChapters++;
      }
      await destClient.query(
        `INSERT INTO l_chapter (id, subject_id, title, description, order_number) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [r.id, subjectId, r.title, r.target, r.order_number],
      );
    }
    if (skippedChapters > 0) {
      console.warn(
        `Skipped subject for ${skippedChapters} chapters (subject not found).`,
      );
    }
    await resetSequence(destClient, "l_chapter");

    // 1.b CHAPTER CLASS MAPPING (l_cclass -> l_chapter.class_id/class_ids)
    const chapterClasses = await sourceClient.query(
      "SELECT chapter, classid FROM l_cclass",
    );
    const validClassIds = new Set(
      (await destClient.query("SELECT id FROM a_class")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );
    const chapterToClasses = new Map();
    for (const row of chapterClasses.rows) {
      const classKey = toIdKey(row.classid);
      if (!classKey || !validClassIds.has(classKey)) continue;
      const list = chapterToClasses.get(row.chapter) || [];
      list.push(row.classid);
      chapterToClasses.set(row.chapter, list);
    }
    for (const [chapterId, classIds] of chapterToClasses.entries()) {
      if (!Array.isArray(classIds) || classIds.length === 0) continue;
      const classId = classIds[0];
      await destClient.query(
        `UPDATE l_chapter
         SET class_id = $2, class_ids = $3
         WHERE id = $1`,
        [chapterId, classId, classIds],
      );
    }

    // 2. CONTENT (Materi)
    const validChapterIds = new Set(
      (await destClient.query("SELECT id FROM l_chapter")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );
    const contents = await sourceClient.query("SELECT * FROM l_content");
    for (const r of contents.rows) {
      const chapterKey = toIdKey(r.chapter);
      if (!chapterKey || !validChapterIds.has(chapterKey)) continue;
      // Cari file attachment dari l_file old table
      const fileRes = await sourceClient.query(
        "SELECT title, file, video FROM l_file WHERE content = $1 LIMIT 1",
        [r.id],
      );
      const attach = fileRes.rows[0] ? fileRes.rows[0].file : null;
      const video = fileRes.rows[0] ? fileRes.rows[0].video : null;
      const attachmentName = fileRes.rows[0] ? fileRes.rows[0].title : null;

      await destClient.query(
        `INSERT INTO l_content (
           id,
           chapter_id,
           title,
           body,
           order_number,
           attachment_url,
           attachment_name,
           video_url,
           created_at
         ) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.chapter,
          r.title,
          r.target,
          r.order_number,
          attach,
          attachmentName,
          video,
          r.createdat,
        ],
      );
    }
    await resetSequence(destClient, "l_content");

    // 3. RESET NILAI (Agar tidak dobel jika migrasi diulang)
    await destClient.query(
      "TRUNCATE l_score_attitude, l_score_formative, l_score_summative RESTART IDENTITY",
    );

    // 4. NILAI SIKAP (l_attitude -> l_score_attitude)
    const attitudeOld = await sourceClient.query("SELECT * FROM l_attitude");
    let skippedAttitudeSubjects = 0;

    for (const a of attitudeOld.rows) {
      const newStudentId = oldStudentIdToNewUserId.get(a.student_id);
      if (!newStudentId) continue;
      const subjectKey = toIdKey(a.subject_id);
      const subjectId =
        subjectKey && validSubjectIds.has(subjectKey) ? a.subject_id : null;
      if (!subjectId && a.subject_id) {
        skippedAttitudeSubjects++;
        continue;
      }
      const classKey = toIdKey(a.class_id);
      const classId =
        classKey && validClassIds.has(classKey) ? a.class_id : null;

      await destClient.query(
        `INSERT INTO l_score_attitude (
           student_id,
           subject_id,
           periode_id,
           semester,
           month,
           kinerja,
           kedisiplinan,
           keaktifan,
           percaya_diri,
           teacher_note,
           class_id,
           teacher_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          newStudentId,
          subjectId,
          a.periode_id,
          a.semester,
          a.month,
          normalizeScore(a.kinerja),
          normalizeScore(a.kedisiplinan),
          normalizeScore(a.keaktifan),
          normalizeScore(a.percaya_diri),
          a.catatan_guru || null,
          classId,
          oldTeacherIdToNewUserId.get(a.teacher_id) || null,
        ],
      );
    }
    if (skippedAttitudeSubjects > 0) {
      console.warn(
        `Skipped subject for ${skippedAttitudeSubjects} attitude rows (subject not found).`,
      );
    }

    // 5. NILAI FORMATIF (UNPIVOT)
    // Di oldtable: l_formative punya student_id (int) yang merujuk ke u_students(id).
    // Di newtable: student_id merujuk ke u_users(id).
    const formatifOld = await sourceClient.query(`SELECT * FROM l_formative`);
    let skippedFormativeSubjects = 0;
    let skippedFormativeChapters = 0;
    let formativeBatch = [];
    const formativeColumns = [
      "student_id",
      "subject_id",
      "chapter_id",
      "month",
      "semester",
      "type",
      "score",
      "class_id",
      "teacher_id",
    ];

    for (const f of formatifOld.rows) {
      const newStudentId = oldStudentIdToNewUserId.get(f.student_id);
      if (!newStudentId) continue;
      const subjectKey = toIdKey(f.subject_id);
      const subjectId =
        subjectKey && validSubjectIds.has(subjectKey) ? f.subject_id : null;
      if (!subjectId && f.subject_id) {
        skippedFormativeSubjects++;
        continue;
      }
      const chapterKey = toIdKey(f.chapter_id);
      const chapterId =
        chapterKey && validChapterIds.has(chapterKey) ? f.chapter_id : null;
      if (!chapterId && f.chapter_id) {
        skippedFormativeChapters++;
      }
      const classKey = toIdKey(f.class_id);
      const classId =
        classKey && validClassIds.has(classKey) ? f.class_id : null;

      const monthNumber = monthToNumber(f.month);
      const monthCode = monthNumber
        ? `M${String(monthNumber).padStart(2, "0")}`
        : "M00";
      const chapterCode =
        chapterId !== null && chapterId !== undefined
          ? `B${chapterId}`
          : "B0";

      // Loop f_1 sampai f_8 (Subbab)
      for (let i = 1; i <= 8; i++) {
        const score = f[`f_${i}`];
        if (score !== null && score !== undefined) {
          const type = `${monthCode}-${chapterCode}-S${i}`;
          formativeBatch.push([
            newStudentId,
            subjectId,
            chapterId,
            f.month,
            f.semester,
            type,
            score,
            classId,
            oldTeacherIdToNewUserId.get(f.teacher_id) || null,
          ]);
          if (formativeBatch.length >= BATCH_SIZE) {
            await bulkInsert(
              destClient,
              "l_score_formative",
              formativeColumns,
              formativeBatch,
            );
            formativeBatch = [];
          }
        }
      }
    }
    if (formativeBatch.length > 0) {
      await bulkInsert(
        destClient,
        "l_score_formative",
        formativeColumns,
        formativeBatch,
      );
    }
    if (skippedFormativeSubjects > 0) {
      console.warn(
        `Skipped subject for ${skippedFormativeSubjects} formative rows (subject not found).`,
      );
    }
    if (skippedFormativeChapters > 0) {
      console.warn(
        `Skipped chapter for ${skippedFormativeChapters} formative rows (chapter not found).`,
      );
    }

    // 6. NILAI SUMATIF (l_summative -> l_score_summative)
    const summativeOld = await sourceClient.query(`SELECT * FROM l_summative`);
    let skippedSummativeSubjects = 0;
    let summativeBatch = [];
    const summativeColumns = [
      "student_id",
      "subject_id",
      "periode_id",
      "chapter_id",
      "semester",
      "month",
      "type",
      "score_written",
      "score_skill",
      "final_score",
      "class_id",
      "teacher_id",
    ];

    for (const s of summativeOld.rows) {
      const newStudentId = oldStudentIdToNewUserId.get(s.student_id);
      if (!newStudentId) continue;
      const subjectKey = toIdKey(s.subject_id);
      const subjectId =
        subjectKey && validSubjectIds.has(subjectKey) ? s.subject_id : null;
      if (!subjectId && s.subject_id) {
        skippedSummativeSubjects++;
        continue;
      }
      const chapterKey = toIdKey(s.chapter_id);
      const chapterId =
        chapterKey && validChapterIds.has(chapterKey) ? s.chapter_id : null;
      const classKey = toIdKey(s.class_id);
      const classId =
        classKey && validClassIds.has(classKey) ? s.class_id : null;

      const monthNumber = monthToNumber(s.month);
      const monthCode = monthNumber
        ? `M${String(monthNumber).padStart(2, "0")}`
        : "M00";
      const chapterCode =
        chapterId !== null && chapterId !== undefined ? `B${chapterId}` : "B0";

      const skillScores = [s.oral, s.project, s.performance].filter(
        (value) => value !== null && value !== undefined,
      );
      const skillAverage =
        skillScores.length > 0
          ? Math.round(
              skillScores.reduce((sum, v) => sum + Number(v), 0) /
                skillScores.length,
            )
          : null;

      const allScores = [
        s.written,
        s.oral,
        s.project,
        s.performance,
      ].filter((value) => value !== null && value !== undefined);
      const computedFinal =
        allScores.length > 0
          ? Math.round(
              allScores.reduce((sum, v) => sum + Number(v), 0) /
                allScores.length,
            )
          : null;

      const finalScore =
        s.rata_rata !== null && s.rata_rata !== undefined
          ? Number(s.rata_rata)
          : computedFinal;

      const type = `${monthCode}-${chapterCode}`;

      summativeBatch.push([
        newStudentId,
        subjectId,
        s.periode_id,
        chapterId,
        s.semester,
        s.month,
        type,
        s.written,
        skillAverage,
        finalScore,
        classId,
        oldTeacherIdToNewUserId.get(s.teacher_id) || null,
      ]);
      if (summativeBatch.length >= BATCH_SIZE) {
        await bulkInsert(
          destClient,
          "l_score_summative",
          summativeColumns,
          summativeBatch,
        );
        summativeBatch = [];
      }
    }
    if (summativeBatch.length > 0) {
      await bulkInsert(
        destClient,
        "l_score_summative",
        summativeColumns,
        summativeBatch,
      );
    }
    if (skippedSummativeSubjects > 0) {
      console.warn(
        `Skipped subject for ${skippedSummativeSubjects} summative rows (subject not found).`,
      );
    }

    // 7. ATTENDANCE (Presensi)
    // Sama, perlu translate Student ID
    const attOld = await sourceClient.query(`SELECT * FROM l_attendance`);

    for (const a of attOld.rows) {
      const newStudentId = oldStudentIdToNewUserId.get(a.studentid);
      if (!newStudentId) continue;

      const subjectKey = toIdKey(a.subjectid);
      const subjectId =
        subjectKey && validSubjectIds.has(subjectKey) ? a.subjectid : null;

      const classKey = toIdKey(a.classid);
      const classId =
        classKey && validClassIds.has(classKey) ? a.classid : null;

      // Cari Teacher ID Baru juga (berdasarkan username yg diambil dr tabel u_teachers old)
      // (Logic disederhanakan: skip teacher mapping jika null, atau set null)

      await destClient.query(
        `INSERT INTO l_attendance (class_id, subject_id, student_id, date, note, teacher_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          classId,
          subjectId,
          newStudentId,
          a.day_date,
          a.note,
          oldTeacherIdToNewUserId.get(a.teacher_id) || null,
        ],
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
 * STEP 4.1: SET PERIODE_ID FOR FORMATIF SCORES
 * Source: l_formative.periode_id -> Dest: l_score_formative.periode_id
 */
router.post("/migrate/step-4-1-formative-periode", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Updating Formative periode_id...");

    const toIdKey = (value) => {
      if (value === null || value === undefined) return null;
      return String(value);
    };

    const monthToNumber = (monthName) => {
      if (!monthName) return null;
      const map = {
        Januari: 1,
        Februari: 2,
        Maret: 3,
        April: 4,
        Mei: 5,
        Juni: 6,
        Juli: 7,
        Agustus: 8,
        September: 9,
        Oktober: 10,
        November: 11,
        Desember: 12,
      };
      return map[monthName] || null;
    };

    const validSubjectIds = new Set(
      (await destClient.query("SELECT id FROM a_subject")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );
    const validChapterIds = new Set(
      (await destClient.query("SELECT id FROM l_chapter")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );
    const validClassIds = new Set(
      (await destClient.query("SELECT id FROM a_class")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );

    // Map old student_id -> new user_id
    const sourceStudents = await sourceClient.query(
      "SELECT id, nis FROM u_students",
    );
    const destUsers = await destClient.query(
      "SELECT id, username FROM u_users",
    );
    const usernameToUserId = new Map(
      destUsers.rows.map((row) => [String(row.username).trim(), row.id]),
    );
    const oldStudentIdToNewUserId = new Map();
    for (const row of sourceStudents.rows) {
      const nis = row.nis ? String(row.nis).trim() : "";
      const username = nis !== "" ? nis : `siswa_${row.id}`;
      const newUserId = usernameToUserId.get(username);
      if (newUserId) {
        oldStudentIdToNewUserId.set(row.id, newUserId);
      }
    }

    const BATCH_SIZE = 1000;
    const bulkUpdatePeriode = async (client, rows) => {
      if (!rows.length) return;
      const values = [];
      const placeholders = rows.map((row, rowIndex) => {
        const baseIndex = rowIndex * 7;
        row.forEach((value) => values.push(value));
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`;
      });

      await client.query(
        `
        UPDATE l_score_formative f
        SET periode_id = v.periode_id::int
        FROM (VALUES ${placeholders.join(", ")}) AS v(
          student_id,
          subject_id,
          class_id,
          chapter_id,
          month,
          semester,
          periode_id
        )
        WHERE f.student_id = v.student_id::int
          AND f.subject_id = v.subject_id::int
          AND COALESCE(f.class_id, 0) = COALESCE(v.class_id::int, 0)
          AND COALESCE(f.chapter_id, 0) = COALESCE(v.chapter_id::int, 0)
          AND COALESCE(f.month, '') = COALESCE(v.month::varchar, '')
          AND COALESCE(f.semester, 0) = COALESCE(v.semester::int, 0)
        `,
        values,
      );
    };

    const formatifOld = await sourceClient.query(
      "SELECT * FROM l_formative WHERE periode_id IS NOT NULL",
    );

    let batch = [];
    for (const f of formatifOld.rows) {
      const newStudentId = oldStudentIdToNewUserId.get(f.student_id);
      if (!newStudentId) continue;

      const subjectKey = toIdKey(f.subject_id);
      const subjectId =
        subjectKey && validSubjectIds.has(subjectKey) ? f.subject_id : null;
      if (!subjectId && f.subject_id) continue;

      const chapterKey = toIdKey(f.chapter_id);
      const chapterId =
        chapterKey && validChapterIds.has(chapterKey) ? f.chapter_id : null;

      const classKey = toIdKey(f.class_id);
      const classId =
        classKey && validClassIds.has(classKey) ? f.class_id : null;

      const month = f.month || null;
      const semester = f.semester || null;
      const periodeId = f.periode_id;

      // Update all rows generated from this formative record (f_1..f_8)
      // Using matching keys without type (type derived from same row)
      batch.push([
        newStudentId,
        subjectId,
        classId,
        chapterId,
        month,
        semester,
        periodeId,
      ]);

      if (batch.length >= BATCH_SIZE) {
        await bulkUpdatePeriode(destClient, batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await bulkUpdatePeriode(destClient, batch);
    }

    await destClient.query("COMMIT");
    res.json({ message: "Step 4.1: Formative periode_id updated." });
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
 * STEP 4.2: FINAL SCORE
 * Source: l_finalscore -> Dest: l_score_final
 */
router.post("/migrate/step-4-2-finalscore", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Migrating Final Score...");

    const toIdKey = (value) => {
      if (value === null || value === undefined) return null;
      return String(value);
    };

    const validPeriodeIds = new Set(
      (await destClient.query("SELECT id FROM a_periode")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );
    const validClassIds = new Set(
      (await destClient.query("SELECT id FROM a_class")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );
    const validSubjectIds = new Set(
      (await destClient.query("SELECT id FROM a_subject")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );

    const sourceStudents = await sourceClient.query(
      "SELECT id, nis FROM u_students",
    );
    const sourceTeachers = await sourceClient.query(
      "SELECT id, username FROM u_teachers",
    );
    const destUsers = await destClient.query(
      "SELECT id, username FROM u_users",
    );

    const usernameToUserId = new Map(
      destUsers.rows.map((row) => [String(row.username).trim(), row.id]),
    );

    const oldStudentIdToNewUserId = new Map();
    for (const row of sourceStudents.rows) {
      const nis = row.nis ? String(row.nis).trim() : "";
      const username = nis !== "" ? nis : `siswa_${row.id}`;
      const newUserId = usernameToUserId.get(username);
      if (newUserId) {
        oldStudentIdToNewUserId.set(row.id, newUserId);
      }
    }

    const oldTeacherIdToNewUserId = new Map();
    for (const row of sourceTeachers.rows) {
      const username = row.username ? String(row.username).trim() : "";
      if (!username) continue;
      const newUserId = usernameToUserId.get(username);
      if (newUserId) {
        oldTeacherIdToNewUserId.set(row.id, newUserId);
      }
    }

    // Reset supaya endpoint bisa dijalankan ulang tanpa data dobel
    await destClient.query("TRUNCATE l_score_final RESTART IDENTITY");

    const finalScores = await sourceClient.query("SELECT * FROM l_finalscore");

    let inserted = 0;
    let skippedStudent = 0;
    let skippedTeacher = 0;
    let skippedInvalidRef = 0;

    for (const row of finalScores.rows) {
      const newStudentId = oldStudentIdToNewUserId.get(row.studentid);
      if (!newStudentId) {
        skippedStudent++;
        continue;
      }

      const newTeacherId = oldTeacherIdToNewUserId.get(row.teacherid);
      if (!newTeacherId) {
        skippedTeacher++;
        continue;
      }

      const periodeKey = toIdKey(row.periode);
      const classKey = toIdKey(row.classid);
      const subjectKey = toIdKey(row.subjectid);

      const periodeId =
        periodeKey && validPeriodeIds.has(periodeKey) ? row.periode : null;
      const classId = classKey && validClassIds.has(classKey) ? row.classid : null;
      const subjectId =
        subjectKey && validSubjectIds.has(subjectKey) ? row.subjectid : null;

      if (!periodeId || !classId || !subjectId) {
        skippedInvalidRef++;
        continue;
      }

      await destClient.query(
        `INSERT INTO l_score_final (
          id,
          periode_id,
          semester,
          month,
          class_id,
          student_id,
          teacher_id,
          subject_id,
          final_grade
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          row.id,
          periodeId,
          row.semester,
          null,
          classId,
          newStudentId,
          newTeacherId,
          subjectId,
          row.score,
        ],
      );
      inserted++;
    }

    await resetSequence(destClient, "l_score_final");
    await destClient.query("COMMIT");

    res.json({
      message: "Step 4.2: Final score migrated.",
      stats: {
        source_rows: finalScores.rows.length,
        inserted,
        skipped_student_mapping: skippedStudent,
        skipped_teacher_mapping: skippedTeacher,
        skipped_invalid_reference: skippedInvalidRef,
      },
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

/**
 * STEP 9: ATTENDANCE ONLY (Old l_attendance -> New l_attendance)
 * Rules:
 * - old l_attendance.note -> new l_attendance.status
 * - teacher_id diambil dari old l_chapter + l_cclass sesuai pasangan subject + class
 */
router.post("/migrate/step-9-attendance", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Migrating attendance only...");

    const toIdKey = (value) => {
      if (value === null || value === undefined) return null;
      return String(value);
    };

    const normalizeAttendanceStatus = (value) => {
      if (value === null || value === undefined) return null;
      const raw = String(value).trim();
      if (!raw) return null;

      const lower = raw.toLowerCase();
      if (lower === "hadir") return "Hadir";
      if (lower === "telat") return "Telat";
      if (lower === "izin") return "Izin";
      if (lower === "sakit") return "Sakit";
      if (lower === "alpa") return "Alpa";
      if (lower === "alpha") return "Alpa";
      return null;
    };

    const BATCH_SIZE = 1000;
    const bulkInsertAttendance = async (client, rows) => {
      if (!rows.length) return;
      const values = [];
      const placeholders = rows.map((row, rowIndex) => {
        const baseIndex = rowIndex * 7;
        row.forEach((value) => values.push(value));
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`;
      });

      await client.query(
        `INSERT INTO l_attendance (periode_id, class_id, subject_id, student_id, date, status, teacher_id)
         VALUES ${placeholders.join(", ")}`,
        values,
      );
    };

    const validSubjectIds = new Set(
      (await destClient.query("SELECT id FROM a_subject")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );
    const validClassIds = new Set(
      (await destClient.query("SELECT id FROM a_class")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );
    const validPeriodeIds = new Set(
      (await destClient.query("SELECT id FROM a_periode")).rows.map((row) =>
        toIdKey(row.id),
      ),
    );

    // Map old student_id -> new user_id (username = NIS, fallback siswa_{id})
    const sourceStudents = await sourceClient.query(
      "SELECT id, nis FROM u_students",
    );
    const sourceTeachers = await sourceClient.query(
      "SELECT id, username FROM u_teachers",
    );
    const destUsers = await destClient.query(
      "SELECT id, username FROM u_users",
    );
    const usernameToUserId = new Map(
      destUsers.rows.map((row) => [String(row.username).trim(), row.id]),
    );

    const oldStudentIdToNewUserId = new Map();
    for (const row of sourceStudents.rows) {
      const nis = row.nis ? String(row.nis).trim() : "";
      const username = nis !== "" ? nis : `siswa_${row.id}`;
      const newUserId = usernameToUserId.get(username);
      if (newUserId) oldStudentIdToNewUserId.set(row.id, newUserId);
    }

    const oldTeacherIdToNewUserId = new Map();
    for (const row of sourceTeachers.rows) {
      const username = row.username ? String(row.username).trim() : "";
      if (!username) continue;
      const newUserId = usernameToUserId.get(username);
      if (newUserId) oldTeacherIdToNewUserId.set(row.id, newUserId);
    }

    // Ambil kandidat teacher dari relasi:
    // l_cclass.chapter -> l_chapter (subject, teacher)
    // validasi penugasan mapel guru dari at_subject (teacher, subject)
    // Jika banyak kandidat, pilih teacher dengan chapter terbanyak.
    const teacherCandidates = await sourceClient.query(`
      SELECT
        lc.classid AS class_id,
        ch.subject AS subject_id,
        ch.teacher AS old_teacher_id,
        COUNT(*)::int AS chapter_count
      FROM l_chapter ch
      JOIN l_cclass lc ON lc.chapter = ch.id
      JOIN at_subject ats ON ats.teacher = ch.teacher AND ats.subject = ch.subject
      WHERE ch.teacher IS NOT NULL
      GROUP BY lc.classid, ch.subject, ch.teacher
      ORDER BY lc.classid, ch.subject, chapter_count DESC, ch.teacher ASC
    `);

    const teacherByClassSubject = new Map();
    for (const row of teacherCandidates.rows) {
      const key = `${row.class_id}::${row.subject_id}`;
      if (!teacherByClassSubject.has(key)) {
        teacherByClassSubject.set(key, row.old_teacher_id);
      }
    }

    const totalRes = await sourceClient.query(
      "SELECT COUNT(*)::int AS total FROM l_attendance",
    );
    const sourceRows = totalRes.rows[0]?.total || 0;

    let inserted = 0;
    let processed = 0;
    let skippedStudentMap = 0;
    let skippedInvalidRef = 0;
    let skippedInvalidStatus = 0;
    let missingTeacher = 0;
    let skippedInvalidPeriode = 0;
    let lastId = 0;
    let insertBatch = [];

    const sourceAttendanceColumns = await sourceClient.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'l_attendance'`,
    );
    const sourceColumnSet = new Set(
      sourceAttendanceColumns.rows.map((r) => r.column_name),
    );
    const sourcePeriodeColumn = sourceColumnSet.has("periode_id")
      ? "periode_id"
      : "periode";

    while (true) {
      const attendanceRows = await sourceClient.query(
        `SELECT id, ${sourcePeriodeColumn} AS source_periode_id, classid, subjectid, studentid, day_date, note
         FROM l_attendance
         WHERE id > $1
         ORDER BY id ASC
         LIMIT $2`,
        [lastId, BATCH_SIZE],
      );
      if (attendanceRows.rows.length === 0) break;

      for (const row of attendanceRows.rows) {
        processed++;
        lastId = row.id;

        const newStudentId = oldStudentIdToNewUserId.get(row.studentid);
        if (!newStudentId) {
          skippedStudentMap++;
          continue;
        }

        const subjectKey = toIdKey(row.subjectid);
        const classKey = toIdKey(row.classid);
        const subjectId =
          subjectKey && validSubjectIds.has(subjectKey) ? row.subjectid : null;
        const classId =
          classKey && validClassIds.has(classKey) ? row.classid : null;
        if (!subjectId || !classId) {
          skippedInvalidRef++;
          continue;
        }

        const periodeKey = toIdKey(row.source_periode_id);
        const periodeId =
          periodeKey && validPeriodeIds.has(periodeKey)
            ? row.source_periode_id
            : null;
        if (row.source_periode_id !== null && !periodeId) {
          skippedInvalidPeriode++;
        }

        // old l_attendance.note -> new l_attendance.status
        const status = normalizeAttendanceStatus(row.note);
        if (!status) {
          skippedInvalidStatus++;
          continue;
        }

        const teacherKey = `${classId}::${subjectId}`;
        const oldTeacherId = teacherByClassSubject.get(teacherKey) || null;
        const newTeacherId = oldTeacherId
          ? oldTeacherIdToNewUserId.get(oldTeacherId) || null
          : null;
        if (!newTeacherId) {
          missingTeacher++;
        }

        insertBatch.push([
          periodeId,
          classId,
          subjectId,
          newStudentId,
          row.day_date,
          status,
          newTeacherId,
        ]);
        if (insertBatch.length >= BATCH_SIZE) {
          await bulkInsertAttendance(destClient, insertBatch);
          inserted += insertBatch.length;
          insertBatch = [];
        }
      }
    }

    if (insertBatch.length > 0) {
      await bulkInsertAttendance(destClient, insertBatch);
      inserted += insertBatch.length;
    }

    await destClient.query("COMMIT");
    res.json({
      message: "Step 9: Attendance migrated successfully.",
      stats: {
        source_rows: sourceRows,
        processed_rows: processed,
        inserted,
        skipped_student_mapping: skippedStudentMap,
        skipped_invalid_reference: skippedInvalidRef,
        skipped_invalid_periode: skippedInvalidPeriode,
        skipped_invalid_status: skippedInvalidStatus,
        inserted_without_teacher: missingTeacher,
      },
    });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error("Migration Step 9 Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

/**
 * STEP 10: PARENTS (Akun Orang Tua)
 * Source: u_parents (old) -> Dest: u_users (role=parent) + u_parents (new)
 */
router.post("/migrate/step-10-parents", async (req, res) => {
  const sourceClient = await poolSource.connect();
  const destClient = await poolDest.connect();

  try {
    await destClient.query("BEGIN");
    console.log("Migrating parent accounts...");

    const toKey = (value) => {
      if (value === null || value === undefined) return "";
      return String(value).trim();
    };

    // Mapping old student_id -> new user_id (username = NIS, fallback siswa_{id})
    const sourceStudents = await sourceClient.query(
      "SELECT id, nis FROM u_students",
    );
    const destUsers = await destClient.query(
      "SELECT id, username, role FROM u_users",
    );

    const usernameToUser = new Map(
      destUsers.rows.map((row) => [
        toKey(row.username).toLowerCase(),
        { id: row.id, role: row.role },
      ]),
    );

    const oldStudentIdToNewUserId = new Map();
    for (const row of sourceStudents.rows) {
      const nis = toKey(row.nis);
      const username = nis !== "" ? nis : `siswa_${row.id}`;
      const user = usernameToUser.get(username.toLowerCase());
      if (user) oldStudentIdToNewUserId.set(row.id, user.id);
    }

    const parentsOld = await sourceClient.query(`
      SELECT id, studentid, email, name, password, createdat
      FROM u_parents
      ORDER BY id ASC
    `);

    let processed = 0;
    let createdUsers = 0;
    let reusedUsers = 0;
    let createdProfiles = 0;
    let updatedProfiles = 0;
    let skippedStudentMap = 0;

    for (const row of parentsOld.rows) {
      processed++;

      const newStudentId = oldStudentIdToNewUserId.get(row.studentid);
      if (!newStudentId) {
        skippedStudentMap++;
        continue;
      }

      const email = toKey(row.email).toLowerCase();
      const fullName = toKey(row.name) || `Parent ${row.id}`;
      const baseUsername = email || `parent_${row.id}`;

      let username = baseUsername;
      let userRef = usernameToUser.get(username);
      let suffix = 1;

      while (userRef && userRef.role !== "parent") {
        username = `${baseUsername}_${suffix}`;
        userRef = usernameToUser.get(username);
        suffix++;
      }

      let parentUserId;
      if (userRef && userRef.role === "parent") {
        parentUserId = userRef.id;
        reusedUsers++;
      } else {
        const insertedUser = await destClient.query(
          `INSERT INTO u_users (username, password, full_name, role, is_active, created_at)
           VALUES ($1, $2, $3, 'parent', $4, $5)
           RETURNING id`,
          [username, row.password || "", fullName, true, row.createdat],
        );
        parentUserId = insertedUser.rows[0].id;
        createdUsers++;

        usernameToUser.set(username, { id: parentUserId, role: "parent" });
      }

      const profileRes = await destClient.query(
        "SELECT user_id FROM u_parents WHERE user_id = $1",
        [parentUserId],
      );

      if (profileRes.rows.length > 0) {
        await destClient.query(
          `UPDATE u_parents
           SET student_id = $2, email = $3
           WHERE user_id = $1`,
          [parentUserId, newStudentId, email || null],
        );
        updatedProfiles++;
      } else {
        await destClient.query(
          `INSERT INTO u_parents (user_id, student_id, phone, email)
           VALUES ($1, $2, $3, $4)`,
          [parentUserId, newStudentId, null, email || null],
        );
        createdProfiles++;
      }
    }

    await destClient.query("COMMIT");
    res.json({
      message: "Step 10: Parent accounts migrated successfully.",
      stats: {
        source_rows: parentsOld.rows.length,
        processed_rows: processed,
        created_users: createdUsers,
        reused_users: reusedUsers,
        created_profiles: createdProfiles,
        updated_profiles: updatedProfiles,
        skipped_missing_student_mapping: skippedStudentMap,
      },
    });
  } catch (error) {
    await destClient.query("ROLLBACK");
    console.error("Migration Step 10 Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    sourceClient.release();
    destClient.release();
  }
});

export default router;
