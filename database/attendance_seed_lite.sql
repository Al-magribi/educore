-- Seed data LITE untuk fitur presensi RFID
-- Jalankan setelah:
-- 1. database/newtable.sql
-- 2. database/lms_schema.sql
-- 3. database/attendance_schema.sql
--
-- Tujuan seed:
-- - Mengaktifkan fitur absensi per homebase
-- - Membuat policy default siswa dan guru
-- - Membuat assignment policy
-- - Membuat device RFID gerbang dan kelas
-- - Membuat kartu RFID untuk sebanyak mungkin siswa dan guru aktif
-- - Membuat data presensi harian, scan log, event, dan requirement guru berbasis jadwal
--
-- Catatan:
-- - Script ini bersifat idempotent sebisa mungkin.
-- - Script ini menghindari hardcode ID dan memakai data existing.
-- - Script ini sengaja membuat data cukup banyak untuk menghidupkan laporan presensi.

BEGIN;

SET search_path TO attendance, public, lms;

-- =========================================================
-- 0. Sinkronisasi ringan data siswa aktif
-- =========================================================
-- Jika current_class_id/current_periode_id kosong, ambil dari enrollment terbaru.
WITH latest_student_enrollment AS (
    SELECT DISTINCT ON (ce.student_id)
        ce.student_id,
        ce.class_id,
        ce.periode_id
    FROM public.u_class_enrollments ce
    ORDER BY ce.student_id, ce.id DESC
)
UPDATE public.u_students s
SET
    current_class_id = COALESCE(s.current_class_id, lse.class_id),
    current_periode_id = COALESCE(s.current_periode_id, lse.periode_id)
FROM latest_student_enrollment lse
WHERE lse.student_id = s.user_id
  AND (s.current_class_id IS NULL OR s.current_periode_id IS NULL);

-- =========================================================
-- 1. Feature setting
-- =========================================================
WITH homebase_creator AS (
    SELECT
        hb.id AS homebase_id,
        (
            SELECT ua.user_id
            FROM public.u_admin ua
            WHERE ua.homebase_id = hb.id
            ORDER BY ua.user_id ASC
            LIMIT 1
        ) AS created_by
    FROM public.a_homebase hb
)
INSERT INTO attendance.attendance_feature_setting (
    homebase_id,
    feature_code,
    is_enabled,
    notes,
    created_by
)
SELECT
    hc.homebase_id,
    feature.feature_code,
    true,
    'Seed fitur absensi RFID.',
    hc.created_by
FROM homebase_creator hc
CROSS JOIN (
    VALUES
        ('teacher_daily_attendance'),
        ('teacher_class_session_attendance'),
        ('student_daily_attendance'),
        ('student_checkout_logging')
) AS feature(feature_code)
ON CONFLICT (homebase_id, feature_code) DO UPDATE
SET
    is_enabled = EXCLUDED.is_enabled,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- =========================================================
-- 2. Policy default per homebase
-- =========================================================
WITH homebase_creator AS (
    SELECT
        hb.id AS homebase_id,
        (
            SELECT ua.user_id
            FROM public.u_admin ua
            WHERE ua.homebase_id = hb.id
            ORDER BY ua.user_id ASC
            LIMIT 1
        ) AS created_by
    FROM public.a_homebase hb
)
INSERT INTO attendance.attendance_policy (
    homebase_id,
    name,
    code,
    target_role,
    policy_type,
    description,
    is_active,
    created_by
)
SELECT
    hc.homebase_id,
    seed_policy.name,
    seed_policy.code,
    seed_policy.target_role,
    seed_policy.policy_type,
    seed_policy.description,
    true,
    hc.created_by
FROM homebase_creator hc
CROSS JOIN (
    VALUES
        (
            'Policy Siswa Fixed Default',
            'student_fixed_default',
            'student',
            'student_fixed',
            'Policy default siswa untuk absensi harian gerbang RFID.'
        ),
        (
            'Policy Guru Schedule Based Default',
            'teacher_schedule_based_default',
            'teacher',
            'teacher_schedule_based',
            'Policy default guru berbasis jadwal mengajar.'
        ),
        (
            'Policy Guru Fixed Daily Default',
            'teacher_fixed_daily_default',
            'teacher',
            'teacher_fixed_daily',
            'Policy default guru fixed daily untuk guru piket, wali kelas, atau full day.'
        )
) AS seed_policy(name, code, target_role, policy_type, description)
ON CONFLICT (homebase_id, code) DO UPDATE
SET
    name = EXCLUDED.name,
    target_role = EXCLUDED.target_role,
    policy_type = EXCLUDED.policy_type,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = NOW();

-- =========================================================
-- 3. Rule harian policy
-- =========================================================
WITH policy_seed_rule AS (
    SELECT
        p.id AS policy_id,
        p.policy_type,
        day_rule.day_of_week,
        true AS is_active,
        day_rule.checkin_start,
        day_rule.checkin_end,
        day_rule.reference_checkin_time,
        day_rule.late_tolerance_minutes,
        day_rule.checkout_start,
        day_rule.reference_checkout_time,
        day_rule.checkout_is_optional,
        day_rule.min_presence_minutes,
        day_rule.notes
    FROM attendance.attendance_policy p
    JOIN LATERAL (
        SELECT
            d.day_of_week,
            CASE
                WHEN p.policy_type = 'student_fixed' THEN
                    CASE WHEN d.day_of_week = 6 THEN TIME '06:30' ELSE TIME '06:15' END
                ELSE
                    CASE WHEN d.day_of_week = 6 THEN TIME '06:00' ELSE TIME '05:45' END
            END AS checkin_start,
            CASE
                WHEN p.policy_type = 'student_fixed' THEN
                    CASE WHEN d.day_of_week = 6 THEN TIME '07:45' ELSE TIME '08:00' END
                WHEN p.policy_type = 'teacher_schedule_based' THEN
                    CASE WHEN d.day_of_week = 6 THEN TIME '08:00' ELSE TIME '08:30' END
                ELSE
                    CASE WHEN d.day_of_week = 6 THEN TIME '08:30' ELSE TIME '09:00' END
            END AS checkin_end,
            CASE
                WHEN p.policy_type = 'teacher_schedule_based' THEN NULL
                WHEN p.policy_type = 'student_fixed' THEN
                    CASE WHEN d.day_of_week = 6 THEN TIME '07:00' ELSE TIME '06:50' END
                ELSE
                    CASE WHEN d.day_of_week = 6 THEN TIME '07:15' ELSE TIME '07:00' END
            END AS reference_checkin_time,
            CASE
                WHEN p.policy_type = 'teacher_schedule_based' THEN 0
                WHEN p.policy_type = 'student_fixed' THEN 15
                ELSE 20
            END AS late_tolerance_minutes,
            CASE
                WHEN p.policy_type = 'teacher_schedule_based' THEN NULL
                WHEN p.policy_type = 'student_fixed' THEN
                    CASE WHEN d.day_of_week = 6 THEN TIME '11:00' ELSE TIME '13:00' END
                ELSE
                    CASE WHEN d.day_of_week = 6 THEN TIME '12:00' ELSE TIME '14:00' END
            END AS checkout_start,
            CASE
                WHEN p.policy_type = 'teacher_schedule_based' THEN NULL
                WHEN p.policy_type = 'student_fixed' THEN
                    CASE WHEN d.day_of_week = 6 THEN TIME '12:00' ELSE TIME '14:00' END
                ELSE
                    CASE WHEN d.day_of_week = 6 THEN TIME '13:00' ELSE TIME '16:00' END
            END AS reference_checkout_time,
            CASE
                WHEN p.policy_type = 'teacher_fixed_daily' THEN false
                ELSE false
            END AS checkout_is_optional,
            CASE
                WHEN p.policy_type = 'teacher_fixed_daily' THEN
                    CASE WHEN d.day_of_week = 6 THEN 300 ELSE 420 END
                ELSE NULL
            END AS min_presence_minutes,
            CASE
                WHEN p.policy_type = 'student_fixed' THEN 'Seed rule siswa.'
                WHEN p.policy_type = 'teacher_schedule_based' THEN 'Seed rule guru berdasarkan jadwal.'
                ELSE 'Seed rule guru fixed daily.'
            END AS notes
        FROM (
            VALUES (1), (2), (3), (4), (5), (6)
        ) AS d(day_of_week)
    ) AS day_rule ON true
    WHERE p.code IN (
        'student_fixed_default',
        'teacher_schedule_based_default',
        'teacher_fixed_daily_default'
    )
)
INSERT INTO attendance.attendance_policy_day_rule (
    policy_id,
    day_of_week,
    is_active,
    checkin_start,
    checkin_end,
    reference_checkin_time,
    late_tolerance_minutes,
    checkout_start,
    reference_checkout_time,
    checkout_is_optional,
    min_presence_minutes,
    notes
)
SELECT
    policy_id,
    day_of_week,
    is_active,
    checkin_start,
    checkin_end,
    reference_checkin_time,
    late_tolerance_minutes,
    checkout_start,
    reference_checkout_time,
    checkout_is_optional,
    min_presence_minutes,
    notes
FROM policy_seed_rule
ON CONFLICT (policy_id, day_of_week) DO UPDATE
SET
    is_active = EXCLUDED.is_active,
    checkin_start = EXCLUDED.checkin_start,
    checkin_end = EXCLUDED.checkin_end,
    reference_checkin_time = EXCLUDED.reference_checkin_time,
    late_tolerance_minutes = EXCLUDED.late_tolerance_minutes,
    checkout_start = EXCLUDED.checkout_start,
    reference_checkout_time = EXCLUDED.reference_checkout_time,
    checkout_is_optional = EXCLUDED.checkout_is_optional,
    min_presence_minutes = EXCLUDED.min_presence_minutes,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- =========================================================
-- 4. Assignment policy
-- =========================================================
-- 4a. Semua siswa per homebase memakai student_fixed_default.
INSERT INTO attendance.attendance_policy_assignment (
    policy_id,
    assignment_scope,
    homebase_id,
    effective_start_date,
    effective_end_date,
    is_active,
    created_by
)
SELECT
    p.id,
    'homebase',
    p.homebase_id,
    CURRENT_DATE - INTERVAL '180 days',
    NULL,
    true,
    p.created_by
FROM attendance.attendance_policy p
WHERE p.code = 'student_fixed_default'
  AND NOT EXISTS (
      SELECT 1
      FROM attendance.attendance_policy_assignment a
      WHERE a.policy_id = p.id
        AND a.assignment_scope = 'homebase'
        AND a.homebase_id = p.homebase_id
  );

-- 4b. Semua guru per homebase default ke schedule_based.
INSERT INTO attendance.attendance_policy_assignment (
    policy_id,
    assignment_scope,
    homebase_id,
    effective_start_date,
    effective_end_date,
    is_active,
    created_by
)
SELECT
    p.id,
    'homebase',
    p.homebase_id,
    CURRENT_DATE - INTERVAL '180 days',
    NULL,
    true,
    p.created_by
FROM attendance.attendance_policy p
WHERE p.code = 'teacher_schedule_based_default'
  AND NOT EXISTS (
      SELECT 1
      FROM attendance.attendance_policy_assignment a
      WHERE a.policy_id = p.id
        AND a.assignment_scope = 'homebase'
        AND a.homebase_id = p.homebase_id
  );

-- 4c. Sebagian guru diberi policy fixed_daily di level user
-- agar data laporan guru berisi campuran schedule_based dan fixed_daily.
WITH candidate_teacher AS (
    SELECT
        t.user_id,
        t.homebase_id,
        ROW_NUMBER() OVER (
            PARTITION BY t.homebase_id
            ORDER BY COALESCE(t.is_homeroom, false) DESC, t.user_id ASC
        ) AS rn
    FROM public.u_teachers t
    JOIN public.u_users u
      ON u.id = t.user_id
    WHERE u.is_active = true
      AND t.homebase_id IS NOT NULL
),
selected_teacher AS (
    SELECT *
    FROM candidate_teacher
    WHERE rn <= 2
),
target_policy AS (
    SELECT id, homebase_id, created_by
    FROM attendance.attendance_policy
    WHERE code = 'teacher_fixed_daily_default'
)
INSERT INTO attendance.attendance_policy_assignment (
    policy_id,
    assignment_scope,
    user_id,
    homebase_id,
    effective_start_date,
    effective_end_date,
    is_active,
    created_by
)
SELECT
    tp.id,
    'user',
    st.user_id,
    st.homebase_id,
    CURRENT_DATE - INTERVAL '180 days',
    NULL,
    true,
    tp.created_by
FROM selected_teacher st
JOIN target_policy tp
  ON tp.homebase_id = st.homebase_id
WHERE NOT EXISTS (
    SELECT 1
    FROM attendance.attendance_policy_assignment a
    WHERE a.policy_id = tp.id
      AND a.assignment_scope = 'user'
      AND a.user_id = st.user_id
);

-- =========================================================
-- 4d. Holiday master
-- =========================================================
WITH holiday_seed AS (
    SELECT
        hb.id AS homebase_id,
        seeded.holiday_date::date,
        seeded.name,
        seeded.description,
        seeded.applies_to_role,
        (
            SELECT ua.user_id
            FROM public.u_admin ua
            WHERE ua.homebase_id = hb.id
            ORDER BY ua.user_id ASC
            LIMIT 1
        ) AS created_by
    FROM public.a_homebase hb
    CROSS JOIN (
        VALUES
            (CURRENT_DATE - INTERVAL '28 days', 'Libur Pemeliharaan Gerbang RFID', 'Hari simulasi libur operasional untuk seed presensi.', 'all'),
            (CURRENT_DATE - INTERVAL '14 days', 'Izin Kegiatan Guru', 'Hari simulasi agenda internal guru.', 'teacher'),
            (CURRENT_DATE - INTERVAL '7 days', 'Kegiatan Siswa di Luar Sekolah', 'Hari simulasi kegiatan siswa di luar sekolah.', 'student'),
            (CURRENT_DATE + INTERVAL '5 days', 'Libur Persiapan Ujian', 'Libur terjadwal hasil seed.', 'all')
    ) AS seeded(holiday_date, name, description, applies_to_role)
)
INSERT INTO attendance.attendance_holiday (
    homebase_id,
    holiday_date,
    name,
    description,
    applies_to_role,
    is_active,
    created_by
)
SELECT
    homebase_id,
    holiday_date,
    name,
    description,
    applies_to_role,
    true,
    created_by
FROM holiday_seed
ON CONFLICT (homebase_id, holiday_date, applies_to_role) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = NOW();

-- =========================================================
-- 5. RFID device
-- =========================================================
-- 5a. Gate device per homebase
INSERT INTO attendance.rfid_device (
    homebase_id,
    class_id,
    code,
    name,
    device_type,
    location_group,
    location_detail,
    ip_address,
    mac_address,
    api_token,
    firmware_version,
    is_active,
    installed_at,
    created_by
)
SELECT
    hb.id,
    NULL,
    'RFID-GATE-HB-' || LPAD(hb.id::text, 4, '0'),
    'Gerbang Utama ' || hb.name,
    'gate',
    'Gerbang Utama',
    'Device gerbang utama hasil seed RFID.',
    '192.168.' || (10 + (hb.id % 50))::text || '.' || (10 + (hb.id % 200))::text,
    'AA:BB:CC:' || LPAD((hb.id % 255)::text, 2, '0') || ':11:22',
    md5('RFID-GATE-HB-' || hb.id::text || '-seed'),
    'ESP32-RC522-1.0.0',
    true,
    NOW() - INTERVAL '30 days',
    (
        SELECT ua.user_id
        FROM public.u_admin ua
        WHERE ua.homebase_id = hb.id
        ORDER BY ua.user_id ASC
        LIMIT 1
    )
FROM public.a_homebase hb
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    location_group = EXCLUDED.location_group,
    location_detail = EXCLUDED.location_detail,
    ip_address = EXCLUDED.ip_address,
    mac_address = EXCLUDED.mac_address,
    api_token = EXCLUDED.api_token,
    firmware_version = EXCLUDED.firmware_version,
    is_active = true,
    updated_at = NOW();

-- 5b. Classroom device untuk sebanyak mungkin kelas aktif
INSERT INTO attendance.rfid_device (
    homebase_id,
    class_id,
    code,
    name,
    device_type,
    location_group,
    location_detail,
    ip_address,
    mac_address,
    api_token,
    firmware_version,
    is_active,
    installed_at,
    created_by
)
SELECT
    c.homebase_id,
    c.id,
    'RFID-CLASS-' || LPAD(c.id::text, 5, '0'),
    'RFID Kelas ' || c.name,
    'classroom',
    'Ruang Kelas',
    'Device kelas hasil seed untuk ' || c.name || '.',
    '10.' || (1 + (c.homebase_id % 50))::text || '.' || ((c.id / 200) % 255)::text || '.' || (20 + (c.id % 200))::text,
    'DD:EE:FF:' || LPAD((c.id % 255)::text, 2, '0') || ':33:44',
    md5('RFID-CLASS-' || c.id::text || '-seed'),
    'ESP32-RC522-1.0.0',
    true,
    NOW() - INTERVAL '20 days',
    (
        SELECT ua.user_id
        FROM public.u_admin ua
        WHERE ua.homebase_id = c.homebase_id
        ORDER BY ua.user_id ASC
        LIMIT 1
    )
FROM public.a_class c
WHERE COALESCE(c.is_active, true) = true
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    location_group = EXCLUDED.location_group,
    location_detail = EXCLUDED.location_detail,
    ip_address = EXCLUDED.ip_address,
    mac_address = EXCLUDED.mac_address,
    api_token = EXCLUDED.api_token,
    firmware_version = EXCLUDED.firmware_version,
    is_active = true,
    updated_at = NOW();

-- =========================================================
-- 6. RFID card untuk siswa dan guru aktif
-- =========================================================
INSERT INTO attendance.rfid_card (
    user_id,
    card_uid,
    card_number,
    card_type,
    issued_at,
    expired_at,
    is_primary,
    is_active,
    notes,
    created_by
)
SELECT
    u.id,
    CASE
        WHEN u.role = 'student' THEN 'STU-RFID-' || LPAD(u.id::text, 8, '0')
        ELSE 'TCH-RFID-' || LPAD(u.id::text, 8, '0')
    END AS card_uid,
    CASE
        WHEN u.role = 'student' THEN 'CARD-STU-' || LPAD(u.id::text, 8, '0')
        ELSE 'CARD-TCH-' || LPAD(u.id::text, 8, '0')
    END AS card_number,
    'rfid',
    NOW() - INTERVAL '90 days',
    NOW() + INTERVAL '5 years',
    true,
    true,
    'Seed kartu RFID untuk ' || u.role || '.',
    admin_seed.user_id
FROM public.u_users u
JOIN (
    SELECT s.user_id, s.homebase_id
    FROM public.u_students s
    UNION ALL
    SELECT t.user_id, t.homebase_id
    FROM public.u_teachers t
) AS owner_map
  ON owner_map.user_id = u.id
LEFT JOIN LATERAL (
    SELECT ua.user_id
    FROM public.u_admin ua
    WHERE ua.homebase_id = owner_map.homebase_id
    ORDER BY ua.user_id ASC
    LIMIT 1
) AS admin_seed ON true
WHERE u.role IN ('student', 'teacher')
  AND u.is_active = true
ON CONFLICT (card_uid) DO UPDATE
SET
    card_number = EXCLUDED.card_number,
    expired_at = EXCLUDED.expired_at,
    is_primary = true,
    is_active = true,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- =========================================================
-- 6b. Jadwal minimal guru (fallback jika schedule entry masih kosong)
-- =========================================================
-- Database target saat ini punya teaching_load dan time_slot,
-- tetapi schedule_entry masih bisa kosong. Section ini membuat
-- jadwal minimum untuk guru schedule-based agar laporan sesi guru hidup.
WITH active_config AS (
    SELECT
        cfg.id AS config_id,
        cfg.homebase_id,
        cfg.periode_id
    FROM lms.l_schedule_config cfg
    WHERE cfg.is_active = true
),
default_group AS (
    SELECT
        grp.config_id,
        grp.id AS config_group_id
    FROM lms.l_schedule_config_group grp
    WHERE grp.is_default = true
),
class_group AS (
    SELECT
        c.id AS class_id,
        c.homebase_id,
        COALESCE(gcc.config_group_id, dg.config_group_id) AS config_group_id
    FROM public.a_class c
    JOIN active_config ac
      ON ac.homebase_id = c.homebase_id
    LEFT JOIN lms.l_schedule_config_group_class gcc
      ON gcc.class_id = c.id
    LEFT JOIN default_group dg
      ON dg.config_id = ac.config_id
),
schedule_based_teacher AS (
    SELECT
        t.user_id,
        t.homebase_id
    FROM public.u_teachers t
    JOIN public.u_users u
      ON u.id = t.user_id
    WHERE u.is_active = true
      AND NOT EXISTS (
          SELECT 1
          FROM attendance.attendance_policy_assignment a
          JOIN attendance.attendance_policy ap
            ON ap.id = a.policy_id
          WHERE a.assignment_scope = 'user'
            AND a.user_id = t.user_id
            AND a.is_active = true
            AND ap.policy_type = 'teacher_fixed_daily'
      )
),
teacher_load_pick AS (
    SELECT DISTINCT ON (tl.teacher_id)
        tl.id AS teaching_load_id,
        tl.homebase_id,
        tl.periode_id,
        tl.class_id,
        tl.subject_id,
        tl.teacher_id
    FROM lms.l_teaching_load tl
    JOIN schedule_based_teacher sbt
      ON sbt.user_id = tl.teacher_id
     AND sbt.homebase_id = tl.homebase_id
    WHERE tl.is_active = true
    ORDER BY tl.teacher_id, tl.weekly_sessions DESC, tl.id ASC
),
ranked_load AS (
    SELECT
        tlp.*,
        ROW_NUMBER() OVER (ORDER BY tlp.teacher_id ASC, tlp.class_id ASC) AS teacher_rank
    FROM teacher_load_pick tlp
),
entry_seed AS (
    SELECT
        ac.homebase_id,
        ac.periode_id,
        ac.config_id,
        rl.teaching_load_id,
        rl.class_id,
        rl.subject_id,
        rl.teacher_id,
        (((rl.teacher_rank - 1) % 6) + 1)::smallint AS day_of_week,
        (((rl.teacher_rank - 1) / 6) + 1)::int AS slot_no,
        ts.id AS slot_start_id
    FROM ranked_load rl
    JOIN active_config ac
      ON ac.homebase_id = rl.homebase_id
     AND ac.periode_id = rl.periode_id
    JOIN class_group cg
      ON cg.class_id = rl.class_id
    JOIN lms.l_time_slot ts
      ON ts.config_id = ac.config_id
     AND ts.config_group_id = cg.config_group_id
     AND ts.day_of_week = (((rl.teacher_rank - 1) % 6) + 1)::smallint
     AND ts.slot_no = (((rl.teacher_rank - 1) / 6) + 1)::int
     AND COALESCE(ts.is_break, false) = false
)
INSERT INTO lms.l_schedule_entry (
    homebase_id,
    periode_id,
    config_id,
    teaching_load_id,
    class_id,
    subject_id,
    teacher_id,
    day_of_week,
    slot_start_id,
    slot_count,
    meeting_no,
    source_type,
    is_manual_override,
    locked,
    status,
    generated_run_id,
    created_by
)
SELECT
    es.homebase_id,
    es.periode_id,
    es.config_id,
    es.teaching_load_id,
    es.class_id,
    es.subject_id,
    es.teacher_id,
    es.day_of_week,
    es.slot_start_id,
    1,
    1,
    'manual',
    false,
    false,
    'published',
    NULL,
    (
        SELECT ua.user_id
        FROM public.u_admin ua
        WHERE ua.homebase_id = es.homebase_id
        ORDER BY ua.user_id ASC
        LIMIT 1
    )
FROM entry_seed es
WHERE NOT EXISTS (
    SELECT 1
    FROM lms.l_schedule_entry existing
);

INSERT INTO lms.l_schedule_entry_slot (
    schedule_entry_id,
    periode_id,
    day_of_week,
    slot_id,
    class_id,
    teacher_id
)
SELECT
    se.id,
    se.periode_id,
    se.day_of_week,
    se.slot_start_id,
    se.class_id,
    se.teacher_id
FROM lms.l_schedule_entry se
WHERE NOT EXISTS (
    SELECT 1
    FROM lms.l_schedule_entry_slot ses
    WHERE ses.schedule_entry_id = se.id
)
  AND se.meeting_no = 1;

-- =========================================================
-- 7. Daily attendance siswa
-- =========================================================
WITH school_days AS (
    SELECT gs::date AS attendance_date
    FROM generate_series(
        CURRENT_DATE - INTERVAL '10 days',
        CURRENT_DATE - INTERVAL '1 day',
        INTERVAL '1 day'
    ) AS gs
    WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 6
),
student_scope AS (
    SELECT
        s.user_id,
        s.homebase_id,
        COALESCE(s.current_periode_id, active_period.id, latest_enrollment.periode_id) AS periode_id,
        COALESCE(s.current_class_id, latest_enrollment.class_id) AS class_id
    FROM public.u_students s
    JOIN public.u_users u
      ON u.id = s.user_id
    LEFT JOIN LATERAL (
        SELECT p.id
        FROM public.a_periode p
        WHERE p.homebase_id = s.homebase_id
          AND p.is_active = true
        ORDER BY p.id DESC
        LIMIT 1
    ) AS active_period ON true
    LEFT JOIN LATERAL (
        SELECT ce.class_id, ce.periode_id
        FROM public.u_class_enrollments ce
        WHERE ce.student_id = s.user_id
        ORDER BY ce.id DESC
        LIMIT 1
    ) AS latest_enrollment ON true
    WHERE u.is_active = true
      AND s.homebase_id IS NOT NULL
),
student_policy AS (
    SELECT
        p.id AS policy_id,
        p.homebase_id
    FROM attendance.attendance_policy p
    WHERE p.code = 'student_fixed_default'
),
student_rule AS (
    SELECT
        r.policy_id,
        r.day_of_week,
        r.reference_checkin_time,
        r.reference_checkout_time
    FROM attendance.attendance_policy_day_rule r
),
seed_rows AS (
    SELECT
        ss.homebase_id,
        ss.periode_id,
        ss.user_id,
        sp.policy_id,
        sd.attendance_date,
        'student'::varchar(20) AS target_role,
        'student_fixed'::varchar(30) AS policy_type,
        true AS required_to_attend,
        'policy'::varchar(30) AS requirement_source,
        ((ss.user_id * 17) + (EXTRACT(DOY FROM sd.attendance_date)::int * 5)) AS seed_hash,
        sr.reference_checkin_time,
        sr.reference_checkout_time
    FROM student_scope ss
    JOIN student_policy sp
      ON sp.homebase_id = ss.homebase_id
    JOIN school_days sd
      ON true
    JOIN student_rule sr
      ON sr.policy_id = sp.policy_id
     AND sr.day_of_week = EXTRACT(ISODOW FROM sd.attendance_date)::int
    WHERE ss.periode_id IS NOT NULL
      AND ss.class_id IS NOT NULL
)
INSERT INTO attendance.daily_attendance (
    homebase_id,
    periode_id,
    user_id,
    policy_id,
    attendance_date,
    target_role,
    policy_type,
    required_to_attend,
    requirement_source,
    checkin_at,
    checkout_at,
    attendance_status,
    late_minutes,
    presence_minutes,
    minimum_required_minutes,
    is_checkout_optional,
    is_early_checkout,
    has_midday_exit,
    notes,
    evaluated_at
)
SELECT
    sr.homebase_id,
    sr.periode_id,
    sr.user_id,
    sr.policy_id,
    sr.attendance_date,
    sr.target_role,
    sr.policy_type,
    sr.required_to_attend,
    sr.requirement_source,
    CASE
        WHEN sr.seed_hash % 19 = 0 OR sr.seed_hash % 23 = 0 THEN NULL
        WHEN sr.seed_hash % 5 = 0 THEN sr.attendance_date::timestamp + sr.reference_checkin_time + make_interval(mins => 7 + (sr.seed_hash % 18))
        ELSE sr.attendance_date::timestamp + sr.reference_checkin_time - make_interval(mins => 4 + (sr.seed_hash % 9))
    END AS checkin_at,
    CASE
        WHEN sr.seed_hash % 19 = 0 OR sr.seed_hash % 23 = 0 THEN NULL
        ELSE sr.attendance_date::timestamp + sr.reference_checkout_time + make_interval(mins => (sr.seed_hash % 16) - 5)
    END AS checkout_at,
    CASE
        WHEN sr.seed_hash % 23 = 0 THEN 'excused'
        WHEN sr.seed_hash % 19 = 0 THEN 'absent'
        WHEN sr.seed_hash % 5 = 0 THEN 'late'
        ELSE 'present'
    END AS attendance_status,
    CASE
        WHEN sr.seed_hash % 5 = 0
         AND sr.seed_hash % 19 <> 0
         AND sr.seed_hash % 23 <> 0
            THEN 7 + (sr.seed_hash % 18)
        ELSE 0
    END AS late_minutes,
    CASE
        WHEN sr.seed_hash % 19 = 0 OR sr.seed_hash % 23 = 0 THEN NULL
        ELSE GREATEST(
            0,
            (
                EXTRACT(
                    EPOCH FROM (
                        (sr.attendance_date::timestamp + sr.reference_checkout_time + make_interval(mins => (sr.seed_hash % 16) - 5))
                        -
                        (
                            CASE
                                WHEN sr.seed_hash % 5 = 0
                                    THEN sr.attendance_date::timestamp + sr.reference_checkin_time + make_interval(mins => 7 + (sr.seed_hash % 18))
                                ELSE sr.attendance_date::timestamp + sr.reference_checkin_time - make_interval(mins => 4 + (sr.seed_hash % 9))
                            END
                        )
                    )
                ) / 60
            )::int
        )
    END AS presence_minutes,
    CASE
        WHEN EXTRACT(ISODOW FROM sr.attendance_date) = 6 THEN 300
        ELSE 420
    END AS minimum_required_minutes,
    false,
    false,
    false,
    'Seed daily attendance siswa berbasis RFID.',
    NOW()
FROM seed_rows sr
ON CONFLICT (user_id, attendance_date) DO NOTHING;

-- =========================================================
-- 8. Daily attendance guru
-- =========================================================
WITH school_days AS (
    SELECT gs::date AS attendance_date
    FROM generate_series(
        CURRENT_DATE - INTERVAL '10 days',
        CURRENT_DATE - INTERVAL '1 day',
        INTERVAL '1 day'
    ) AS gs
    WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 6
),
teacher_fixed AS (
    SELECT DISTINCT
        t.user_id,
        t.homebase_id,
        COALESCE(active_period.id, latest_schedule.periode_id) AS periode_id,
        p.id AS policy_id
    FROM public.u_teachers t
    JOIN public.u_users u
      ON u.id = t.user_id
    JOIN attendance.attendance_policy p
      ON p.homebase_id = t.homebase_id
     AND p.code = 'teacher_fixed_daily_default'
    JOIN attendance.attendance_policy_assignment a
      ON a.policy_id = p.id
     AND a.assignment_scope = 'user'
     AND a.user_id = t.user_id
     AND a.is_active = true
    LEFT JOIN LATERAL (
        SELECT ap.id
        FROM public.a_periode ap
        WHERE ap.homebase_id = t.homebase_id
          AND ap.is_active = true
        ORDER BY ap.id DESC
        LIMIT 1
    ) AS active_period ON true
    LEFT JOIN LATERAL (
        SELECT se.periode_id
        FROM lms.l_schedule_entry se
        WHERE se.teacher_id = t.user_id
        ORDER BY se.id DESC
        LIMIT 1
    ) AS latest_schedule ON true
    WHERE u.is_active = true
),
teacher_fixed_rule AS (
    SELECT
        r.policy_id,
        r.day_of_week,
        r.reference_checkin_time,
        r.reference_checkout_time,
        r.min_presence_minutes,
        r.checkout_is_optional
    FROM attendance.attendance_policy_day_rule r
    JOIN attendance.attendance_policy p
      ON p.id = r.policy_id
    WHERE p.code = 'teacher_fixed_daily_default'
),
teacher_fixed_rows AS (
    SELECT
        tf.homebase_id,
        tf.periode_id,
        tf.user_id,
        tf.policy_id,
        sd.attendance_date,
        ((tf.user_id * 13) + (EXTRACT(DOY FROM sd.attendance_date)::int * 7)) AS seed_hash,
        tfr.reference_checkin_time,
        tfr.reference_checkout_time,
        tfr.min_presence_minutes,
        tfr.checkout_is_optional
    FROM teacher_fixed tf
    JOIN school_days sd
      ON true
    JOIN teacher_fixed_rule tfr
      ON tfr.policy_id = tf.policy_id
     AND tfr.day_of_week = EXTRACT(ISODOW FROM sd.attendance_date)::int
    WHERE tf.periode_id IS NOT NULL
),
teacher_schedule_base AS (
    SELECT
        t.user_id,
        t.homebase_id,
        COALESCE(active_period.id, latest_schedule.periode_id) AS periode_id,
        p.id AS policy_id
    FROM public.u_teachers t
    JOIN public.u_users u
      ON u.id = t.user_id
    JOIN attendance.attendance_policy p
      ON p.homebase_id = t.homebase_id
     AND p.code = 'teacher_schedule_based_default'
    LEFT JOIN LATERAL (
        SELECT ap.id
        FROM public.a_periode ap
        WHERE ap.homebase_id = t.homebase_id
          AND ap.is_active = true
        ORDER BY ap.id DESC
        LIMIT 1
    ) AS active_period ON true
    LEFT JOIN LATERAL (
        SELECT se.periode_id
        FROM lms.l_schedule_entry se
        WHERE se.teacher_id = t.user_id
        ORDER BY se.id DESC
        LIMIT 1
    ) AS latest_schedule ON true
    WHERE u.is_active = true
      AND NOT EXISTS (
          SELECT 1
          FROM attendance.attendance_policy_assignment a
          JOIN attendance.attendance_policy ap
            ON ap.id = a.policy_id
          WHERE a.assignment_scope = 'user'
            AND a.user_id = t.user_id
            AND a.is_active = true
            AND ap.policy_type = 'teacher_fixed_daily'
      )
),
teacher_schedule_daily AS (
    SELECT
        tsb.homebase_id,
        tsb.periode_id,
        tsb.user_id,
        tsb.policy_id,
        sd.attendance_date,
        COUNT(se.id)::int AS session_count,
        MIN(start_slot.start_time) AS first_start_time,
        MAX(COALESCE(slot_range.max_end_time, start_slot.end_time)) AS last_end_time,
        ((tsb.user_id * 19) + (EXTRACT(DOY FROM sd.attendance_date)::int * 3)) AS seed_hash
    FROM teacher_schedule_base tsb
    JOIN school_days sd
      ON true
    LEFT JOIN lms.l_schedule_entry se
      ON se.teacher_id = tsb.user_id
     AND se.homebase_id = tsb.homebase_id
     AND se.periode_id = tsb.periode_id
     AND se.day_of_week = EXTRACT(ISODOW FROM sd.attendance_date)::int
     AND COALESCE(se.status, 'draft') <> 'archived'
    LEFT JOIN lms.l_time_slot start_slot
      ON start_slot.id = se.slot_start_id
    LEFT JOIN LATERAL (
        SELECT MAX(ts.end_time) AS max_end_time
        FROM lms.l_schedule_entry_slot ses
        JOIN lms.l_time_slot ts
          ON ts.id = ses.slot_id
        WHERE ses.schedule_entry_id = se.id
    ) AS slot_range ON true
    WHERE tsb.periode_id IS NOT NULL
    GROUP BY
        tsb.homebase_id,
        tsb.periode_id,
        tsb.user_id,
        tsb.policy_id,
        sd.attendance_date
)
INSERT INTO attendance.daily_attendance (
    homebase_id,
    periode_id,
    user_id,
    policy_id,
    attendance_date,
    target_role,
    policy_type,
    required_to_attend,
    requirement_source,
    checkin_at,
    checkout_at,
    attendance_status,
    late_minutes,
    presence_minutes,
    minimum_required_minutes,
    is_checkout_optional,
    is_early_checkout,
    has_midday_exit,
    notes,
    evaluated_at
)
SELECT
    rows.homebase_id,
    rows.periode_id,
    rows.user_id,
    rows.policy_id,
    rows.attendance_date,
    'teacher',
    rows.policy_type,
    rows.required_to_attend,
    rows.requirement_source,
    rows.checkin_at,
    rows.checkout_at,
    rows.attendance_status,
    rows.late_minutes,
    rows.presence_minutes,
    rows.minimum_required_minutes,
    rows.is_checkout_optional,
    false,
    false,
    rows.notes,
    NOW()
FROM (
    SELECT
        tfr.homebase_id,
        tfr.periode_id,
        tfr.user_id,
        tfr.policy_id,
        tfr.attendance_date,
        'teacher_fixed_daily'::varchar(30) AS policy_type,
        true AS required_to_attend,
        'policy'::varchar(30) AS requirement_source,
        CASE
            WHEN tfr.seed_hash % 17 = 0 THEN NULL
            WHEN tfr.seed_hash % 5 = 0 THEN tfr.attendance_date::timestamp + tfr.reference_checkin_time + make_interval(mins => 8 + (tfr.seed_hash % 17))
            ELSE tfr.attendance_date::timestamp + tfr.reference_checkin_time - make_interval(mins => 5 + (tfr.seed_hash % 8))
        END AS checkin_at,
        CASE
            WHEN tfr.seed_hash % 17 = 0 THEN NULL
            WHEN tfr.seed_hash % 13 = 0 THEN NULL
            WHEN tfr.seed_hash % 11 = 0 THEN
                (
                    CASE
                        WHEN tfr.seed_hash % 5 = 0
                            THEN tfr.attendance_date::timestamp + tfr.reference_checkin_time + make_interval(mins => 8 + (tfr.seed_hash % 17))
                        ELSE tfr.attendance_date::timestamp + tfr.reference_checkin_time - make_interval(mins => 5 + (tfr.seed_hash % 8))
                    END
                ) + make_interval(mins => GREATEST(120, COALESCE(tfr.min_presence_minutes, 420) - 90))
            ELSE tfr.attendance_date::timestamp + tfr.reference_checkout_time + make_interval(mins => (tfr.seed_hash % 21) - 7)
        END AS checkout_at,
        CASE
            WHEN tfr.seed_hash % 17 = 0 THEN 'absent'
            WHEN tfr.seed_hash % 13 = 0 THEN 'incomplete'
            WHEN tfr.seed_hash % 11 = 0 THEN 'insufficient_hours'
            WHEN tfr.seed_hash % 5 = 0 THEN 'late'
            ELSE 'present'
        END AS attendance_status,
        CASE
            WHEN tfr.seed_hash % 5 = 0 AND tfr.seed_hash % 17 <> 0 THEN 8 + (tfr.seed_hash % 17)
            ELSE 0
        END AS late_minutes,
        CASE
            WHEN tfr.seed_hash % 17 = 0 OR tfr.seed_hash % 13 = 0 THEN NULL
            ELSE GREATEST(
                0,
                (
                    EXTRACT(
                        EPOCH FROM (
                            (
                                CASE
                                    WHEN tfr.seed_hash % 11 = 0 THEN
                                        (
                                            CASE
                                                WHEN tfr.seed_hash % 5 = 0
                                                    THEN tfr.attendance_date::timestamp + tfr.reference_checkin_time + make_interval(mins => 8 + (tfr.seed_hash % 17))
                                                ELSE tfr.attendance_date::timestamp + tfr.reference_checkin_time - make_interval(mins => 5 + (tfr.seed_hash % 8))
                                            END
                                        ) + make_interval(mins => GREATEST(120, COALESCE(tfr.min_presence_minutes, 420) - 90))
                                    ELSE tfr.attendance_date::timestamp + tfr.reference_checkout_time + make_interval(mins => (tfr.seed_hash % 21) - 7)
                                END
                            )
                            -
                            (
                                CASE
                                    WHEN tfr.seed_hash % 5 = 0
                                        THEN tfr.attendance_date::timestamp + tfr.reference_checkin_time + make_interval(mins => 8 + (tfr.seed_hash % 17))
                                    ELSE tfr.attendance_date::timestamp + tfr.reference_checkin_time - make_interval(mins => 5 + (tfr.seed_hash % 8))
                                END
                            )
                        )
                    ) / 60
                )::int
            )
        END AS presence_minutes,
        tfr.min_presence_minutes AS minimum_required_minutes,
        COALESCE(tfr.checkout_is_optional, false) AS is_checkout_optional,
        'Seed daily attendance guru fixed daily.' AS notes
    FROM teacher_fixed_rows tfr

    UNION ALL

    SELECT
        tsd.homebase_id,
        tsd.periode_id,
        tsd.user_id,
        tsd.policy_id,
        tsd.attendance_date,
        'teacher_schedule_based'::varchar(30) AS policy_type,
        (tsd.session_count > 0) AS required_to_attend,
        'schedule'::varchar(30) AS requirement_source,
        CASE
            WHEN tsd.session_count = 0 THEN NULL
            WHEN tsd.seed_hash % 19 = 0 THEN NULL
            WHEN tsd.seed_hash % 7 = 0 THEN tsd.attendance_date::timestamp + tsd.first_start_time + make_interval(mins => 8 + (tsd.seed_hash % 10))
            ELSE tsd.attendance_date::timestamp + tsd.first_start_time - make_interval(mins => 6 + (tsd.seed_hash % 6))
        END AS checkin_at,
        CASE
            WHEN tsd.session_count = 0 THEN NULL
            WHEN tsd.seed_hash % 19 = 0 THEN NULL
            WHEN tsd.seed_hash % 13 = 0 THEN NULL
            ELSE tsd.attendance_date::timestamp + tsd.last_end_time + make_interval(mins => (tsd.seed_hash % 12) - 2)
        END AS checkout_at,
        CASE
            WHEN tsd.session_count = 0 THEN 'not_scheduled'
            WHEN tsd.seed_hash % 19 = 0 THEN 'absent'
            WHEN tsd.seed_hash % 13 = 0 THEN 'incomplete'
            WHEN tsd.seed_hash % 7 = 0 THEN 'late'
            ELSE 'present'
        END AS attendance_status,
        CASE
            WHEN tsd.session_count > 0 AND tsd.seed_hash % 7 = 0 AND tsd.seed_hash % 19 <> 0 THEN 8 + (tsd.seed_hash % 10)
            ELSE 0
        END AS late_minutes,
        CASE
            WHEN tsd.session_count = 0 OR tsd.seed_hash % 19 = 0 OR tsd.seed_hash % 13 = 0 THEN NULL
            ELSE GREATEST(
                0,
                (
                    EXTRACT(
                        EPOCH FROM (
                            (tsd.attendance_date::timestamp + tsd.last_end_time + make_interval(mins => (tsd.seed_hash % 12) - 2))
                            -
                            (
                                CASE
                                    WHEN tsd.seed_hash % 7 = 0
                                        THEN tsd.attendance_date::timestamp + tsd.first_start_time + make_interval(mins => 8 + (tsd.seed_hash % 10))
                                    ELSE tsd.attendance_date::timestamp + tsd.first_start_time - make_interval(mins => 6 + (tsd.seed_hash % 6))
                                END
                            )
                        )
                    ) / 60
                )::int
            )
        END AS presence_minutes,
        NULL::integer AS minimum_required_minutes,
        false AS is_checkout_optional,
        'Seed daily attendance guru schedule based.' AS notes
    FROM teacher_schedule_daily tsd
) AS rows
ON CONFLICT (user_id, attendance_date) DO NOTHING;

-- =========================================================
-- 8b. Fallback attendance untuk guru aktif yang belum ter-cover
-- =========================================================
WITH school_days AS (
    SELECT gs::date AS attendance_date
    FROM generate_series(
        CURRENT_DATE - INTERVAL '10 days',
        CURRENT_DATE - INTERVAL '1 day',
        INTERVAL '1 day'
    ) AS gs
    WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 6
),
teacher_resolved_policy AS (
    SELECT
        t.user_id,
        t.homebase_id,
        COALESCE(active_period.id, latest_schedule.periode_id) AS periode_id,
        COALESCE(
            fixed_user_policy.id,
            schedule_policy.id
        ) AS policy_id,
        COALESCE(
            fixed_user_policy.policy_type,
            schedule_policy.policy_type
        ) AS policy_type
    FROM public.u_teachers t
    JOIN public.u_users u
      ON u.id = t.user_id
    LEFT JOIN LATERAL (
        SELECT ap.id, ap.policy_type
        FROM attendance.attendance_policy_assignment a
        JOIN attendance.attendance_policy ap
          ON ap.id = a.policy_id
        WHERE a.user_id = t.user_id
          AND a.assignment_scope = 'user'
          AND a.is_active = true
          AND ap.policy_type = 'teacher_fixed_daily'
        ORDER BY a.id DESC
        LIMIT 1
    ) AS fixed_user_policy ON true
    LEFT JOIN LATERAL (
        SELECT ap.id, ap.policy_type
        FROM attendance.attendance_policy ap
        WHERE ap.homebase_id = t.homebase_id
          AND ap.code = 'teacher_schedule_based_default'
        LIMIT 1
    ) AS schedule_policy ON true
    LEFT JOIN LATERAL (
        SELECT p.id
        FROM public.a_periode p
        WHERE p.homebase_id = t.homebase_id
          AND p.is_active = true
        ORDER BY p.id DESC
        LIMIT 1
    ) AS active_period ON true
    LEFT JOIN LATERAL (
        SELECT se.periode_id
        FROM lms.l_schedule_entry se
        WHERE se.teacher_id = t.user_id
        ORDER BY se.id DESC
        LIMIT 1
    ) AS latest_schedule ON true
    WHERE u.is_active = true
      AND t.homebase_id IS NOT NULL
),
teacher_rule AS (
    SELECT
        r.policy_id,
        r.day_of_week,
        r.reference_checkin_time,
        r.reference_checkout_time,
        r.min_presence_minutes,
        r.checkout_is_optional
    FROM attendance.attendance_policy_day_rule r
),
teacher_fallback_seed AS (
    SELECT
        trp.homebase_id,
        trp.periode_id,
        trp.user_id,
        trp.policy_id,
        trp.policy_type,
        sd.attendance_date,
        ((trp.user_id * 11) + (EXTRACT(DOY FROM sd.attendance_date)::int * 9)) AS seed_hash,
        tr.reference_checkin_time,
        tr.reference_checkout_time,
        tr.min_presence_minutes,
        tr.checkout_is_optional
    FROM teacher_resolved_policy trp
    JOIN school_days sd
      ON true
    LEFT JOIN teacher_rule tr
      ON tr.policy_id = trp.policy_id
     AND tr.day_of_week = EXTRACT(ISODOW FROM sd.attendance_date)::int
    WHERE trp.periode_id IS NOT NULL
      AND trp.policy_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM attendance.daily_attendance da
          WHERE da.user_id = trp.user_id
            AND da.attendance_date = sd.attendance_date
      )
)
INSERT INTO attendance.daily_attendance (
    homebase_id,
    periode_id,
    user_id,
    policy_id,
    attendance_date,
    target_role,
    policy_type,
    required_to_attend,
    requirement_source,
    checkin_at,
    checkout_at,
    attendance_status,
    late_minutes,
    presence_minutes,
    minimum_required_minutes,
    is_checkout_optional,
    is_early_checkout,
    has_midday_exit,
    notes,
    evaluated_at
)
SELECT
    tfs.homebase_id,
    tfs.periode_id,
    tfs.user_id,
    tfs.policy_id,
    tfs.attendance_date,
    'teacher',
    tfs.policy_type,
    CASE
        WHEN tfs.policy_type = 'teacher_schedule_based' THEN false
        ELSE true
    END,
    CASE
        WHEN tfs.policy_type = 'teacher_schedule_based' THEN 'schedule'
        ELSE 'policy'
    END,
    CASE
        WHEN tfs.policy_type = 'teacher_schedule_based' THEN NULL
        WHEN tfs.seed_hash % 17 = 0 THEN NULL
        WHEN tfs.seed_hash % 5 = 0 THEN tfs.attendance_date::timestamp + COALESCE(tfs.reference_checkin_time, TIME '07:00') + make_interval(mins => 8 + (tfs.seed_hash % 14))
        ELSE tfs.attendance_date::timestamp + COALESCE(tfs.reference_checkin_time, TIME '07:00') - make_interval(mins => 4 + (tfs.seed_hash % 7))
    END AS checkin_at,
    CASE
        WHEN tfs.policy_type = 'teacher_schedule_based' THEN NULL
        WHEN tfs.seed_hash % 17 = 0 THEN NULL
        WHEN tfs.seed_hash % 13 = 0 THEN NULL
        ELSE tfs.attendance_date::timestamp + COALESCE(tfs.reference_checkout_time, TIME '15:30') + make_interval(mins => (tfs.seed_hash % 12) - 3)
    END AS checkout_at,
    CASE
        WHEN tfs.policy_type = 'teacher_schedule_based' THEN 'not_scheduled'
        WHEN tfs.seed_hash % 17 = 0 THEN 'absent'
        WHEN tfs.seed_hash % 13 = 0 THEN 'incomplete'
        WHEN tfs.seed_hash % 5 = 0 THEN 'late'
        ELSE 'present'
    END AS attendance_status,
    CASE
        WHEN tfs.policy_type = 'teacher_schedule_based' THEN 0
        WHEN tfs.seed_hash % 5 = 0 AND tfs.seed_hash % 17 <> 0 THEN 8 + (tfs.seed_hash % 14)
        ELSE 0
    END AS late_minutes,
    CASE
        WHEN tfs.policy_type = 'teacher_schedule_based' THEN NULL
        WHEN tfs.seed_hash % 17 = 0 OR tfs.seed_hash % 13 = 0 THEN NULL
        ELSE GREATEST(
            0,
            COALESCE(NULLIF(tfs.min_presence_minutes, 0), 420) + ((tfs.seed_hash % 16) - 8)
        )
    END AS presence_minutes,
    CASE
        WHEN tfs.policy_type = 'teacher_schedule_based' THEN NULL
        ELSE COALESCE(NULLIF(tfs.min_presence_minutes, 0), 420)
    END AS minimum_required_minutes,
    COALESCE(tfs.checkout_is_optional, false),
    false,
    false,
    'Seed fallback guru untuk memastikan semua guru aktif terbaca di laporan.',
    NOW()
FROM teacher_fallback_seed tfs
ON CONFLICT (user_id, attendance_date) DO NOTHING;

-- =========================================================
-- 9. Scan log gerbang untuk daily attendance
-- =========================================================
WITH gate_device AS (
    SELECT DISTINCT ON (d.homebase_id)
        d.homebase_id,
        d.id AS device_id
    FROM attendance.rfid_device d
    WHERE d.device_type = 'gate'
      AND d.is_active = true
    ORDER BY d.homebase_id, d.id ASC
),
user_card AS (
    SELECT DISTINCT ON (rc.user_id)
        rc.user_id,
        rc.id AS card_id,
        rc.card_uid
    FROM attendance.rfid_card rc
    WHERE rc.is_active = true
    ORDER BY rc.user_id, rc.is_primary DESC, rc.id DESC
)
INSERT INTO attendance.rfid_scan_log (
    homebase_id,
    periode_id,
    device_id,
    card_id,
    user_id,
    class_id,
    attendance_id,
    scan_source,
    scan_action,
    card_uid,
    scanned_at,
    device_time_at,
    result_status,
    raw_payload
)
SELECT
    da.homebase_id,
    da.periode_id,
    gd.device_id,
    uc.card_id,
    da.user_id,
    CASE
        WHEN da.target_role = 'student' THEN s.current_class_id
        ELSE NULL
    END AS class_id,
    da.id,
    'gate',
    log_seed.scan_action,
    uc.card_uid,
    log_seed.scanned_at,
    log_seed.scanned_at,
    'accepted',
    jsonb_build_object(
        'seed', true,
        'source', 'attendance_seed.sql',
        'attendance_status', da.attendance_status,
        'scan_action', log_seed.scan_action
    )
FROM attendance.daily_attendance da
JOIN gate_device gd
  ON gd.homebase_id = da.homebase_id
JOIN user_card uc
  ON uc.user_id = da.user_id
LEFT JOIN public.u_students s
  ON s.user_id = da.user_id
JOIN LATERAL (
    VALUES
        ('daily_checkin'::varchar(30), da.checkin_at),
        ('daily_checkout'::varchar(30), da.checkout_at)
) AS log_seed(scan_action, scanned_at)
  ON log_seed.scanned_at IS NOT NULL
WHERE da.attendance_date >= CURRENT_DATE - INTERVAL '10 days'
  AND NOT EXISTS (
      SELECT 1
      FROM attendance.rfid_scan_log existing
      WHERE existing.attendance_id = da.id
        AND existing.scan_action = log_seed.scan_action
        AND existing.scan_source = 'gate'
  );

-- Update pointer gate scan di daily_attendance
WITH scan_map AS (
    SELECT
        da.id AS attendance_id,
        MIN(rsl.id) FILTER (WHERE rsl.scan_action = 'daily_checkin') AS first_gate_scan_id,
        MAX(rsl.id) FILTER (WHERE rsl.scan_action = 'daily_checkout') AS last_gate_scan_id
    FROM attendance.daily_attendance da
    LEFT JOIN attendance.rfid_scan_log rsl
      ON rsl.attendance_id = da.id
     AND rsl.scan_source = 'gate'
    WHERE da.attendance_date >= CURRENT_DATE - INTERVAL '10 days'
    GROUP BY da.id
)
UPDATE attendance.daily_attendance da
SET
    first_gate_scan_id = scan_map.first_gate_scan_id,
    last_gate_scan_id = scan_map.last_gate_scan_id,
    updated_at = NOW()
FROM scan_map
WHERE da.id = scan_map.attendance_id;

-- =========================================================
-- 10. Event harian dari scan gerbang
-- =========================================================
INSERT INTO attendance.daily_attendance_event (
    attendance_id,
    scan_log_id,
    event_type,
    event_time,
    event_source,
    event_result,
    notes,
    created_by
)
SELECT
    rsl.attendance_id,
    rsl.id,
    CASE
        WHEN rsl.scan_action = 'daily_checkin' THEN 'checkin'
        ELSE 'checkout'
    END AS event_type,
    rsl.scanned_at,
    'rfid',
    'applied',
    'Seed event dari scan gerbang RFID.',
    NULL
FROM attendance.rfid_scan_log rsl
WHERE rsl.attendance_id IS NOT NULL
  AND rsl.scan_source = 'gate'
  AND rsl.scan_action IN ('daily_checkin', 'daily_checkout')
  AND NOT EXISTS (
      SELECT 1
      FROM attendance.daily_attendance_event dae
      WHERE dae.scan_log_id = rsl.id
  );

-- =========================================================
-- 11. Teacher schedule requirement berbasis jadwal
-- =========================================================
WITH schedule_source AS (
    SELECT
        da.id AS attendance_id,
        da.user_id AS teacher_id,
        da.homebase_id,
        da.periode_id,
        da.attendance_date,
        da.attendance_status,
        da.checkin_at,
        da.checkout_at,
        se.id AS schedule_entry_id,
        se.class_id,
        se.slot_start_id AS first_slot_id,
        slot_last.last_slot_id,
        start_slot.start_time AS planned_start_time,
        COALESCE(slot_last.last_end_time, start_slot.end_time) AS planned_end_time,
        ROW_NUMBER() OVER (
            PARTITION BY da.id
            ORDER BY start_slot.start_time ASC, se.id ASC
        ) AS schedule_order
    FROM attendance.daily_attendance da
    JOIN lms.l_schedule_entry se
      ON se.teacher_id = da.user_id
     AND se.homebase_id = da.homebase_id
     AND se.periode_id = da.periode_id
     AND se.day_of_week = EXTRACT(ISODOW FROM da.attendance_date)::int
     AND COALESCE(se.status, 'draft') <> 'archived'
    JOIN lms.l_time_slot start_slot
      ON start_slot.id = se.slot_start_id
    LEFT JOIN LATERAL (
        SELECT
            ses.slot_id AS last_slot_id,
            ts.end_time AS last_end_time
        FROM lms.l_schedule_entry_slot ses
        JOIN lms.l_time_slot ts
          ON ts.id = ses.slot_id
        WHERE ses.schedule_entry_id = se.id
        ORDER BY ts.end_time DESC, ses.id DESC
        LIMIT 1
    ) AS slot_last ON true
    WHERE da.target_role = 'teacher'
      AND da.policy_type = 'teacher_schedule_based'
      AND da.required_to_attend = true
      AND da.attendance_status <> 'not_scheduled'
      AND da.attendance_date >= CURRENT_DATE - INTERVAL '10 days'
)
INSERT INTO attendance.teacher_schedule_requirement (
    attendance_id,
    teacher_id,
    schedule_entry_id,
    first_slot_id,
    last_slot_id,
    class_id,
    planned_start_at,
    planned_end_at,
    actual_checkin_at,
    actual_checkout_at,
    teacher_session_log_id,
    session_status,
    late_minutes,
    notes
)
SELECT
    ss.attendance_id,
    ss.teacher_id,
    ss.schedule_entry_id,
    ss.first_slot_id,
    ss.last_slot_id,
    ss.class_id,
    ss.attendance_date::timestamp + ss.planned_start_time,
    ss.attendance_date::timestamp + ss.planned_end_time,
    CASE
        WHEN ss.attendance_status = 'absent' THEN NULL
        WHEN ss.attendance_status = 'late' AND ss.schedule_order = 1 THEN ss.checkin_at
        WHEN ss.checkin_at IS NOT NULL THEN GREATEST(
            ss.attendance_date::timestamp + ss.planned_start_time - INTERVAL '3 minutes',
            ss.checkin_at
        )
        ELSE NULL
    END AS actual_checkin_at,
    CASE
        WHEN ss.attendance_status IN ('absent', 'incomplete') THEN NULL
        WHEN ss.checkout_at IS NOT NULL THEN LEAST(
            ss.attendance_date::timestamp + ss.planned_end_time + INTERVAL '5 minutes',
            ss.checkout_at
        )
        ELSE NULL
    END AS actual_checkout_at,
    NULL,
    CASE
        WHEN ss.attendance_status = 'absent' THEN 'missed'
        WHEN ss.attendance_status = 'incomplete' THEN 'partial'
        WHEN ss.attendance_status = 'late' AND ss.schedule_order = 1 THEN 'late'
        ELSE 'present'
    END AS session_status,
    CASE
        WHEN ss.attendance_status = 'late' AND ss.schedule_order = 1
            THEN COALESCE(
                GREATEST(
                    0,
                    (
                        EXTRACT(
                            EPOCH FROM (
                                ss.checkin_at - (ss.attendance_date::timestamp + ss.planned_start_time)
                            )
                        ) / 60
                    )::int
                ),
                0
            )
        ELSE 0
    END AS late_minutes,
    'Seed requirement guru dari jadwal mengajar.'
FROM schedule_source ss
ON CONFLICT (attendance_id, schedule_entry_id) DO NOTHING;

-- =========================================================
-- 12. Scan log kelas untuk teacher session
-- =========================================================
WITH classroom_device AS (
    SELECT DISTINCT ON (d.class_id)
        d.class_id,
        d.id AS device_id
    FROM attendance.rfid_device d
    WHERE d.device_type = 'classroom'
      AND d.class_id IS NOT NULL
      AND d.is_active = true
    ORDER BY d.class_id, d.id ASC
),
teacher_card AS (
    SELECT DISTINCT ON (rc.user_id)
        rc.user_id,
        rc.id AS card_id,
        rc.card_uid
    FROM attendance.rfid_card rc
    JOIN public.u_users u
      ON u.id = rc.user_id
    WHERE rc.is_active = true
      AND u.role = 'teacher'
    ORDER BY rc.user_id, rc.is_primary DESC, rc.id DESC
),
teacher_class_scan AS (
    SELECT
        tsr.id AS requirement_id,
        da.homebase_id,
        da.periode_id,
        tsr.teacher_id AS user_id,
        tsr.class_id,
        tsr.schedule_entry_id,
        tsr.attendance_id,
        tc.card_id,
        tc.card_uid,
        cd.device_id,
        scan_meta.scan_action,
        scan_meta.scanned_at
    FROM attendance.teacher_schedule_requirement tsr
    JOIN attendance.daily_attendance da
      ON da.id = tsr.attendance_id
    JOIN teacher_card tc
      ON tc.user_id = tsr.teacher_id
    JOIN classroom_device cd
      ON cd.class_id = tsr.class_id
    JOIN LATERAL (
        VALUES
            ('teacher_session_checkin'::varchar(30), tsr.actual_checkin_at),
            ('teacher_session_checkout'::varchar(30), tsr.actual_checkout_at)
    ) AS scan_meta(scan_action, scanned_at)
      ON scan_meta.scanned_at IS NOT NULL
)
INSERT INTO attendance.rfid_scan_log (
    homebase_id,
    periode_id,
    device_id,
    card_id,
    user_id,
    class_id,
    schedule_entry_id,
    attendance_id,
    scan_source,
    scan_action,
    card_uid,
    scanned_at,
    device_time_at,
    result_status,
    raw_payload
)
SELECT
    tcs.homebase_id,
    tcs.periode_id,
    tcs.device_id,
    tcs.card_id,
    tcs.user_id,
    tcs.class_id,
    tcs.schedule_entry_id,
    tcs.attendance_id,
    'classroom',
    tcs.scan_action,
    tcs.card_uid,
    tcs.scanned_at,
    tcs.scanned_at,
    'accepted',
    jsonb_build_object(
        'seed', true,
        'source', 'attendance_seed.sql',
        'scope', 'teacher_session'
    )
FROM teacher_class_scan tcs
WHERE NOT EXISTS (
    SELECT 1
    FROM attendance.rfid_scan_log existing
    WHERE existing.attendance_id = tcs.attendance_id
      AND existing.schedule_entry_id = tcs.schedule_entry_id
      AND existing.scan_action = tcs.scan_action
      AND existing.scan_source = 'classroom'
);

-- =========================================================
-- 13. Manual adjustment seed
-- =========================================================
WITH student_adjustment_candidates AS (
    SELECT
        da.id AS attendance_id,
        da.user_id,
        da.attendance_date,
        da.attendance_status,
        ROW_NUMBER() OVER (PARTITION BY da.homebase_id ORDER BY da.attendance_date DESC, da.user_id ASC) AS rn
    FROM attendance.daily_attendance da
    WHERE da.target_role = 'student'
      AND da.attendance_status IN ('absent', 'late', 'excused')
),
teacher_adjustment_candidates AS (
    SELECT
        da.id AS attendance_id,
        da.user_id,
        da.attendance_date,
        da.attendance_status,
        ROW_NUMBER() OVER (PARTITION BY da.homebase_id ORDER BY da.attendance_date DESC, da.user_id ASC) AS rn
    FROM attendance.daily_attendance da
    WHERE da.target_role = 'teacher'
      AND da.attendance_status IN ('incomplete', 'insufficient_hours', 'late')
),
student_adjustments AS (
    SELECT
        attendance_id,
        user_id,
        attendance_date,
        CASE
            WHEN attendance_status = 'absent' THEN 'status_edit'
            ELSE 'checkin_edit'
        END AS adjustment_type,
        CASE
            WHEN attendance_status = 'absent' THEN jsonb_build_object('attendance_status', 'absent')
            WHEN attendance_status = 'late' THEN jsonb_build_object('attendance_status', 'late')
            ELSE jsonb_build_object('attendance_status', attendance_status)
        END AS before_data,
        CASE
            WHEN attendance_status = 'absent' THEN jsonb_build_object('attendance_status', 'excused', 'notes', 'Dikoreksi admin dari seed.')
            WHEN attendance_status = 'late' THEN jsonb_build_object('attendance_status', 'present', 'late_minutes', 0, 'notes', 'Koreksi keterlambatan hasil seed.')
            ELSE jsonb_build_object('attendance_status', attendance_status, 'notes', 'Verifikasi manual hasil seed.')
        END AS after_data,
        CASE
            WHEN attendance_status = 'absent' THEN 'Koreksi izin sakit siswa.'
            WHEN attendance_status = 'late' THEN 'Perbaikan scan masuk siswa.'
            ELSE 'Validasi manual data siswa.'
        END AS reason
    FROM student_adjustment_candidates
    WHERE rn <= 6
),
teacher_adjustments AS (
    SELECT
        attendance_id,
        user_id,
        attendance_date,
        CASE
            WHEN attendance_status = 'late' THEN 'checkin_edit'
            ELSE 'status_edit'
        END AS adjustment_type,
        jsonb_build_object('attendance_status', attendance_status) AS before_data,
        CASE
            WHEN attendance_status = 'incomplete' THEN jsonb_build_object('attendance_status', 'present', 'notes', 'Checkout dikoreksi manual.')
            WHEN attendance_status = 'insufficient_hours' THEN jsonb_build_object('attendance_status', 'present', 'presence_minutes', 420, 'notes', 'Durasi hadir disesuaikan.')
            ELSE jsonb_build_object('attendance_status', 'present', 'late_minutes', 0, 'notes', 'Telat dikoreksi hasil seed.')
        END AS after_data,
        CASE
            WHEN attendance_status = 'incomplete' THEN 'Guru lupa tap checkout.'
            WHEN attendance_status = 'insufficient_hours' THEN 'Validasi lembur guru.'
            ELSE 'Perbaikan scan masuk guru.'
        END AS reason
    FROM teacher_adjustment_candidates
    WHERE rn <= 6
),
all_adjustments AS (
    SELECT * FROM student_adjustments
    UNION ALL
    SELECT * FROM teacher_adjustments
)
INSERT INTO attendance.attendance_manual_adjustment (
    attendance_id,
    teacher_session_log_id,
    target_type,
    adjustment_type,
    before_data,
    after_data,
    reason,
    approved_by,
    created_by
)
SELECT
    aa.attendance_id,
    NULL,
    'daily_attendance',
    aa.adjustment_type,
    aa.before_data,
    aa.after_data,
    aa.reason,
    (
        SELECT ua.user_id
        FROM public.u_admin ua
        JOIN attendance.daily_attendance da
          ON da.homebase_id = ua.homebase_id
        WHERE da.id = aa.attendance_id
        ORDER BY ua.user_id ASC
        LIMIT 1
    ) AS approved_by,
    (
        SELECT ua.user_id
        FROM public.u_admin ua
        JOIN attendance.daily_attendance da
          ON da.homebase_id = ua.homebase_id
        WHERE da.id = aa.attendance_id
        ORDER BY ua.user_id ASC
        LIMIT 1
    ) AS created_by
FROM all_adjustments aa
WHERE NOT EXISTS (
    SELECT 1
    FROM attendance.attendance_manual_adjustment ama
    WHERE ama.attendance_id = aa.attendance_id
      AND ama.adjustment_type = aa.adjustment_type
      AND ama.reason = aa.reason
);

COMMIT;

