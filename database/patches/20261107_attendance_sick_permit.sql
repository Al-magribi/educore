-- Pisahkan Sakit/Izin: status `sick` dan `permit` di presensi harian, sesi mengajar, dan tendik.
-- `excused` tetap diterima untuk data lama. Server juga menjalankan ini otomatis saat start.

ALTER TABLE attendance.daily_attendance
    DROP CONSTRAINT IF EXISTS daily_attendance_status_check;
ALTER TABLE attendance.daily_attendance
    ADD CONSTRAINT daily_attendance_status_check
    CHECK (attendance_status IN (
        'pending', 'present', 'late', 'absent', 'sick', 'permit', 'excused',
        'not_scheduled', 'incomplete', 'insufficient_hours'
    ));

ALTER TABLE attendance.teacher_schedule_requirement
    DROP CONSTRAINT IF EXISTS teacher_schedule_requirement_status_check;
ALTER TABLE attendance.teacher_schedule_requirement
    ADD CONSTRAINT teacher_schedule_requirement_status_check
    CHECK (session_status IN (
        'pending', 'present', 'late', 'missed', 'partial', 'sick', 'permit', 'excused'
    ));

ALTER TABLE attendance.staff_daily_attendance
    DROP CONSTRAINT IF EXISTS staff_daily_attendance_status_check;
ALTER TABLE attendance.staff_daily_attendance
    ADD CONSTRAINT staff_daily_attendance_status_check
    CHECK (attendance_status IN (
        'pending', 'present', 'late', 'absent', 'sick', 'permit', 'excused',
        'incomplete', 'insufficient_hours'
    ));

-- Opsional: ubah data lama `excused` menjadi sakit/izin berdasarkan catatan.
-- UPDATE attendance.daily_attendance
--    SET attendance_status = CASE WHEN COALESCE(notes, '') ILIKE '%sakit%' THEN 'sick' ELSE 'permit' END
--  WHERE attendance_status = 'excused';
